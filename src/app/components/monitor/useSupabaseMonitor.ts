import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  toMs,
  type ActiveAttacker,
  type AggPoint,
  type DetectorHealth,
  type DetectorStats,
  type FeedItem,
  type FlowEvent,
  type RatePoint,
  type StreamEvent,
  type TimelineMarker,
} from './types';
import type { ConnectionState } from './useEventStream';

const MAX_EVENTS = 200;
const MAX_MARKERS = 40;
const RATE_WINDOW_MS = 120_000;
const STATS_POLL_MS = 5_000;

/** An incidents-table row, as delivered by Supabase postgres_changes. */
interface IncidentRow {
  attacker_ip: string;
  family: string | null;
  confidence: number | null;
  started_ts: number;
  ended_ts: number | null;
  status: string;
  top_features: ActiveAttacker['explanation'] | null;
}

/**
 * Supabase-backed twin of useEventStream: same return shape, so the dashboard is
 * agnostic to the transport. Live flows arrive over Realtime Broadcast (ephemeral,
 * never stored); attack episodes arrive as postgres_changes on the incidents table;
 * aggregate counters are read from the latest stats_snapshots row.
 */
export function useSupabaseMonitor(monitorId: string, monitorName = '') {
  const [events, setEvents] = useState<FeedItem[]>([]);
  const [latestFlow, setLatestFlow] = useState<FlowEvent | null>(null);
  const [latestBlocked, setLatestBlocked] = useState<FlowEvent | null>(null);
  const [rateSeries, setRateSeries] = useState<RatePoint[]>(() => {
    const now = Date.now();
    return Array.from({ length: 30 }, (_, i) => ({ t: now - (30 - i) * 1000, flows: 0, blocked: 0 }));
  });
  const [markers, setMarkers] = useState<TimelineMarker[]>([]);
  const [activeAttackers, setActiveAttackers] = useState<ActiveAttacker[]>([]);
  const [stats, setStats] = useState<DetectorStats | null>(null);
  const [aggSeries, setAggSeries] = useState<AggPoint[]>([]);
  const [health, setHealth] = useState<DetectorHealth | null>(null);
  const [connection, setConnection] = useState<ConnectionState>('connecting');

  const bucketRef = useRef({ flows: 0, blocked: 0 });
  const seqRef = useRef(0);

  const pushEvent = useCallback((evt: StreamEvent) => {
    setEvents((prev) => [{ seq: seqRef.current++, evt }, ...prev].slice(0, MAX_EVENTS));
  }, []);

  // Reset derived state when switching monitors so feeds never bleed across tenants.
  useEffect(() => {
    setEvents([]);
    setLatestFlow(null);
    setLatestBlocked(null);
    setMarkers([]);
    setActiveAttackers([]);
    setStats(null);
    setAggSeries([]);
    setConnection('connecting');
    bucketRef.current = { flows: 0, blocked: 0 };
  }, [monitorId]);

  // Live flows over Broadcast.
  useEffect(() => {
    if (!monitorId) return;
    const channel = supabase
      .channel(`flows:${monitorId}`)
      .on('broadcast', { event: 'flow' }, ({ payload }) => {
        const evt = payload as FlowEvent;
        if (!evt || evt.type !== 'flow') return;
        pushEvent(evt);
        bucketRef.current.flows += 1;
        if (evt.gate === 'block') {
          bucketRef.current.blocked += 1;
          setLatestBlocked(evt);
        }
        setLatestFlow(evt);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnection('open');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnection('reconnecting');
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [monitorId, pushEvent]);

  // Attack episodes via postgres_changes on incidents (INSERT = alert, UPDATE = recovered).
  useEffect(() => {
    if (!monitorId) return;
    const filter = `monitor_id=eq.${monitorId}`;
    const channel = supabase
      .channel(`incidents:${monitorId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents', filter },
        ({ new: row }) => {
          const r = row as IncidentRow;
          const family = r.family ?? 'attack';
          pushEvent({
            type: 'alert',
            ts: r.started_ts,
            attacker_ip: r.attacker_ip,
            family,
            confidence: r.confidence ?? 0,
            top_features: r.top_features ?? [],
          });
          setMarkers((prev) =>
            [...prev, { ts: toMs(r.started_ts), kind: 'alert' as const, ip: r.attacker_ip, family }].slice(-MAX_MARKERS),
          );
          setActiveAttackers((prev) => [
            ...prev.filter((a) => a.ip !== r.attacker_ip),
            { ip: r.attacker_ip, family, since: toMs(r.started_ts), confidence: r.confidence ?? 0, explanation: r.top_features ?? [] },
          ]);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incidents', filter },
        ({ new: row }) => {
          const r = row as IncidentRow;
          if (r.status !== 'recovered') return;
          const ended = r.ended_ts ?? r.started_ts;
          pushEvent({ type: 'recovered', ts: ended, attacker_ip: r.attacker_ip });
          setMarkers((prev) =>
            [...prev, { ts: toMs(ended), kind: 'recovered' as const, ip: r.attacker_ip }].slice(-MAX_MARKERS),
          );
          setActiveAttackers((prev) => prev.filter((a) => a.ip !== r.attacker_ip));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [monitorId, pushEvent]);

  // Flush the per-second rate bucket into the rolling series.
  useEffect(() => {
    const id = window.setInterval(() => {
      const { flows, blocked } = bucketRef.current;
      bucketRef.current = { flows: 0, blocked: 0 };
      const t = Date.now();
      setRateSeries((prev) => [...prev, { t, flows, blocked }].filter((p) => t - p.t <= RATE_WINDOW_MS));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Persistent aggregations: latest stats_snapshots row (worker writes every snapshot_s).
  useEffect(() => {
    if (!monitorId) return;
    let disposed = false;
    const poll = async () => {
      // Pull a window of persisted snapshots: the latest is the live counter, the whole
      // window (oldest→newest) is the real over-time aggregation that survives reloads.
      const { data } = await supabase
        .from('stats_snapshots')
        .select('ts, flows_total, malicious, by_family, dropped, uptime_s')
        .eq('monitor_id', monitorId)
        .order('ts', { ascending: false })
        .limit(240);
      if (disposed) return;
      const rows = (data ?? []).slice().reverse(); // ascending for the chart
      if (!rows.length) return;
      const last = rows[rows.length - 1];
      setStats({
        flows_total: last.flows_total ?? 0,
        malicious: last.malicious ?? 0,
        by_family: (last.by_family ?? {}) as Record<string, number>,
        dropped: last.dropped ?? 0,
        uptime_s: last.uptime_s ?? 0,
      });
      setAggSeries(rows.map((r) => ({ t: toMs(r.ts), flows_total: r.flows_total ?? 0, malicious: r.malicious ?? 0 })));
    };
    poll();
    const id = window.setInterval(poll, STATS_POLL_MS);
    return () => {
      disposed = true;
      window.clearInterval(id);
    };
  }, [monitorId]);

  // Health is synthetic here: there is no live capture mode over the backplane, so the
  // feed always reports 'live' (this also suppresses the simulate-only demo controls).
  useEffect(() => {
    setHealth({ status: 'ok', mode: 'live', model: monitorName });
  }, [monitorName]);

  // inject is SSE/simulate-only; a no-op keeps the feed interface uniform.
  const inject = useCallback(async () => {}, []);

  return {
    events,
    latestFlow,
    latestBlocked,
    rateSeries,
    markers,
    activeAttackers,
    stats,
    aggSeries,
    health,
    connection,
    inject,
  };
}
