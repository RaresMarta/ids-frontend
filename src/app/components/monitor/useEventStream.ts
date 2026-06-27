import { useEffect, useState } from 'react';
import type { AggPoint, DetectorStats, StreamEvent } from './types';
import { useFlowBuffer } from './useFlowBuffer';

const POLL_INTERVAL_MS = 2_000;
const RECONNECT_DELAY_MS = 2_000;
const MAX_AGG_POINTS = 240;

export type ConnectionState = 'connecting' | 'open' | 'reconnecting';

/**
 * Live monitor feed over the local detector's SSE stream: a bounded rolling event
 * buffer plus a client-side over-time aggregation polled from /api/stats.
 */
export function useEventStream(baseUrl: string) {
  const { events, push } = useFlowBuffer();
  const [stats, setStats] = useState<DetectorStats | null>(null);
  const [aggSeries, setAggSeries] = useState<AggPoint[]>([]);
  const [connection, setConnection] = useState<ConnectionState>('connecting');

  // SSE subscription with auto-reconnect.
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: number | undefined;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      es = new EventSource(`${baseUrl}/api/stream`);
      es.onopen = () => setConnection('open');
      es.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed && typeof parsed.type === 'string') push(parsed as StreamEvent);
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
  }, [baseUrl, push]);

  // Poll /api/stats; accumulate the over-time series client-side (no persisted history over SSE).
  useEffect(() => {
    let disposed = false;

    const poll = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/stats`);
        if (!res.ok) return;
        const v = (await res.json()) as DetectorStats;
        if (disposed) return;
        setStats(v);
        setAggSeries((prev) =>
          [...prev, { t: Date.now(), flows_total: v.flows_total, malicious: v.malicious }].slice(-MAX_AGG_POINTS),
        );
      } catch {
        // transient network error; the next tick retries
      }
    };

    poll();
    const id = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      disposed = true;
      window.clearInterval(id);
    };
  }, [baseUrl]);

  return { events, stats, aggSeries, connection };
}
