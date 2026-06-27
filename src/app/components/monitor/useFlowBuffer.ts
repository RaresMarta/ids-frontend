import { useCallback, useRef, useState } from 'react';
import type { FeedItem, StreamEvent } from './types';

export const MAX_EVENTS = 200;

/**
 * Rolling, bounded buffer of stream events (newest first), shared by both the SSE
 * and Supabase transports so the cap and sequence-keying live in one place.
 */
export function useFlowBuffer() {
  const [events, setEvents] = useState<FeedItem[]>([]);
  const seqRef = useRef(0);

  const push = useCallback((evt: StreamEvent) => {
    setEvents((prev) => [{ seq: seqRef.current++, evt }, ...prev].slice(0, MAX_EVENTS));
  }, []);

  const reset = useCallback(() => {
    setEvents([]);
    seqRef.current = 0;
  }, []);

  return { events, push, reset };
}
