import { useCallback, useEffect, useRef, useState } from 'react';
import {
  toMs,
  type ActiveAttacker,
  type DetectorHealth,
  type DetectorStats,
  type FeedItem,
  type FlowEvent,
  type RatePoint,
  type StreamEvent,
  type TimelineMarker,
} from './types';

const MAX_EVENTS = 200;
const MAX_MARKERS = 40;
const RATE_WINDOW_MS = 120_000;
const POLL_INTERVAL_MS = 2_000;
const RECONNECT_DELAY_MS = 2_000;

export type ConnectionState = 'connecting' | 'open' | 'reconnecting';

/**
 * Single source of truth for the live monitor page: subscribes to the
 * detector's SSE stream, keeps a rolling event buffer + per-second rate
 * series, and polls /api/stats and /api/health.
 */
export function useEventStream(baseUrl: string) {
  const [events, setEvents] = useState<FeedItem[]>([]);
  const [latestFlow, setLatestFlow] = useState<FlowEvent | null>(null);
  const [latestBlocked, setLatestBlocked] = useState<FlowEvent | null>(null);
  const [rateSeries, setRateSeries] = useState<RatePoint[]>(() => {
    // Seed a flat zero baseline so the timeline renders a full window at mount.
    const now = Date.now();
    return Array.from({ length: 30 }, (_, i) => ({
      t: now - (30 - i) * 1000,
      flows: 0,
      blocked: 0,
    }));
  });
  const [markers, setMarkers] = useState<TimelineMarker[]>([]);
  const [activeAttackers, setActiveAttackers] = useState<ActiveAttacker[]>([]);
  const [stats, setStats] = useState<DetectorStats | null>(null);
  const [health, setHealth] = useState<DetectorHealth | null>(null);
  const [connection, setConnection] = useState<ConnectionState>('connecting');

  const bucketRef = useRef({ flows: 0, blocked: 0 });
  const seqRef = useRef(0);

  // SSE subscription with auto-reconnect.
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: number | undefined;
    let disposed = false;

    const handle = (evt: StreamEvent) => {
      setEvents((prev) => [{ seq: seqRef.current++, evt }, ...prev].slice(0, MAX_EVENTS));

      switch (evt.type) {
        case 'flow':
          bucketRef.current.flows += 1;
          if (evt.gate === 'block') {
            bucketRef.current.blocked += 1;
            setLatestBlocked(evt);
          }
          setLatestFlow(evt);
          break;
        case 'alert':
          setMarkers((prev) =>
            [...prev, { ts: toMs(evt.ts), kind: 'alert' as const, ip: evt.attacker_ip, family: evt.family }].slice(-MAX_MARKERS),
          );
          setActiveAttackers((prev) => [
            ...prev.filter((a) => a.ip !== evt.attacker_ip),
            {
              ip: evt.attacker_ip,
              family: evt.family,
              since: toMs(evt.ts),
              confidence: evt.confidence,
              // Real signed SHAP for the gate verdict, carried on the alert.
              explanation: evt.top_features ?? [],
            },
          ]);
          break;
        case 'recovered':
          setMarkers((prev) =>
            [...prev, { ts: toMs(evt.ts), kind: 'recovered' as const, ip: evt.attacker_ip }].slice(-MAX_MARKERS),
          );
          setActiveAttackers((prev) => prev.filter((a) => a.ip !== evt.attacker_ip));
          break;
      }
    };

    const connect = () => {
      if (disposed) return;
      es = new EventSource(`${baseUrl}/api/stream`);
      es.onopen = () => setConnection('open');
      es.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed && typeof parsed.type === 'string') handle(parsed as StreamEvent);
        } catch {
          // ignore malformed lines
        }
      };
      es.onerror = () => {
        setConnection('reconnecting');
        // EventSource retries on its own while readyState !== CLOSED; only
        // rebuild it when the browser has given up entirely.
        if (es?.readyState === EventSource.CLOSED) {
          es.close();
          retryTimer = window.setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    };

    connect();
    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      es?.close();
    };
  }, [baseUrl]);

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

  // Poll stats / health.
  useEffect(() => {
    let disposed = false;

    const get = async (path: string) => {
      const res = await fetch(`${baseUrl}${path}`);
      if (!res.ok) throw new Error(`${path} → ${res.status}`);
      return res.json();
    };

    const poll = async () => {
      const [s, h] = await Promise.allSettled([
        get('/api/stats'),
        get('/api/health'),
      ]);
      if (disposed) return;
      if (s.status === 'fulfilled') setStats(s.value as DetectorStats);
      if (h.status === 'fulfilled') setHealth(h.value as DetectorHealth);
    };

    poll();
    const id = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      disposed = true;
      window.clearInterval(id);
    };
  }, [baseUrl]);

  /** Demo control — simulate mode only. */
  const inject = useCallback(
    async (family: string, count = 30) => {
      await fetch(`${baseUrl}/api/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family, count }),
      });
    },
    [baseUrl],
  );

  return {
    events,
    latestFlow,
    latestBlocked,
    rateSeries,
    markers,
    activeAttackers,
    stats,
    health,
    connection,
    inject,
  };
}
