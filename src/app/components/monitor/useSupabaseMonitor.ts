import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { toMs, type AggPoint, type DetectorStats, type FlowEvent, type ShapFeature } from './types';
import type { ConnectionState } from './useEventStream';
import { useFlowBuffer } from './useFlowBuffer';

const STATS_POLL_MS = 5_000;
const MAX_AGG_POINTS = 240;

/** An incidents-table row, as delivered by Supabase postgres_changes. */
interface IncidentRow {
  attacker_ip: string;
  family: string | null;
  confidence: number | null;
  started_ts: number;
  ended_ts: number | null;
  status: string;
  top_features: ShapFeature[] | null;
}

/**
 * Supabase-backed twin of useEventStream: same return shape, so the monitor is
 * agnostic to the transport. Live flows arrive over Realtime Broadcast (ephemeral,
 * never stored); attack episodes arrive as postgres_changes on the incidents table;
 * aggregate counters are read from the latest stats_snapshots rows.
 */
export function useSupabaseMonitor(monitorId: string) {
  const { events, push, reset } = useFlowBuffer();
  const [stats, setStats] = useState<DetectorStats | null>(null);
  const [aggSeries, setAggSeries] = useState<AggPoint[]>([]);
  const [connection, setConnection] = useState<ConnectionState>('connecting');

  // Reset derived state when switching monitors so feeds never bleed across tenants.
  useEffect(() => {
    reset();
    setStats(null);
    setAggSeries([]);
    setConnection('connecting');
  }, [monitorId, reset]);

  // Live flows over Broadcast.
  useEffect(() => {
    if (!monitorId) return;
    const channel = supabase
      .channel(`flows:${monitorId}`)
      .on('broadcast', { event: 'flow' }, ({ payload }) => {
        const evt = payload as FlowEvent;
        if (!evt || evt.type !== 'flow') return;
        push(evt);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnection('open');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnection('reconnecting');
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [monitorId, push]);

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
          push({
            type: 'alert',
            ts: r.started_ts,
            attacker_ip: r.attacker_ip,
            family: r.family ?? 'attack',
            confidence: r.confidence ?? 0,
            top_features: r.top_features ?? [],
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incidents', filter },
        ({ new: row }) => {
          const r = row as IncidentRow;
          if (r.status !== 'recovered') return;
          push({ type: 'recovered', ts: r.ended_ts ?? r.started_ts, attacker_ip: r.attacker_ip });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [monitorId, push]);

  // Persistent aggregations: a window of stats_snapshots (worker writes every snapshot_s).
  useEffect(() => {
    if (!monitorId) return;
    let disposed = false;
    const poll = async () => {
      // The latest row is the live counter; the whole window (oldest→newest) is the real
      // over-time aggregation that survives reloads.
      const { data } = await supabase
        .from('stats_snapshots')
        .select('ts, flows_total, malicious, by_family, dropped, uptime_s')
        .eq('monitor_id', monitorId)
        .order('ts', { ascending: false })
        .limit(MAX_AGG_POINTS);
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

  return { events, stats, aggSeries, connection };
}
