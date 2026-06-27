// Frozen SSE contract of the live detector service.
// See docs/attack-visualization-plan.md — this file mirrors it 1:1.

/**
 * A single feature attribution. `direction` is only present on the `alert`
 * event's real SHAP (the gate explainer tags each feature as pushing the
 * verdict toward 'attack' or 'benign'); the per-flow `top_features` is the
 * cheap |scaled-value| saliency proxy and carries no direction.
 */
export interface ShapFeature {
  feature: string;
  contribution: number;
  direction?: 'attack' | 'benign';
}

export interface FlowEvent {
  type: 'flow';
  flow_id: string | number;
  ts: number;
  src: string;
  dst: string;
  family: string;
  gate: 'allow' | 'block';
  gate_confidence: number;
  confidence: number;
  probabilities: Record<string, number>;
  top_features: ShapFeature[]; // per-flow saliency proxy (not rendered in the live UI)
  n_packets: number;
}

export interface AlertEvent {
  type: 'alert';
  ts: number;
  attacker_ip: string;
  family: string;
  confidence: number;
  // Real signed SHAP for the gate's Attack verdict, computed once per attack
  // episode by detector._shap_gate. Absent only if the explainer is unavailable
  // (then the detector falls back to the proxy, without `direction`).
  top_features?: ShapFeature[];
}

export interface RecoveredEvent {
  type: 'recovered';
  ts: number;
  attacker_ip: string;
}

export type StreamEvent = FlowEvent | AlertEvent | RecoveredEvent;

/** Stream event wrapped with a client-side sequence number for stable list keys. */
export interface FeedItem {
  seq: number;
  evt: StreamEvent;
}

export interface DetectorStats {
  flows_total: number;
  malicious: number;
  by_family: Record<string, number>;
  dropped: number;
  uptime_s: number;
}

export interface DetectorHealth {
  status: string;
  mode: 'live' | 'replay' | 'simulate';
  model: string;
}

/** One-second rate bucket for the timeline (t in ms epoch). */
export interface RatePoint {
  t: number;
  flows: number;
  blocked: number;
}

/**
 * A point on the aggregation-over-time chart (t in ms epoch). In Supabase mode these
 * are the persisted stats_snapshots rows (real history, survives reloads); in the local
 * SSE path they are accumulated client-side from /api/stats polls.
 */
export interface AggPoint {
  t: number;
  flows_total: number;
  malicious: number;
}

export interface TimelineMarker {
  ts: number; // ms epoch
  kind: 'alert' | 'recovered';
  ip: string;
  family?: string;
}

export interface ActiveAttacker {
  ip: string;
  family: string;
  since: number; // ms epoch
  confidence: number;
  /** Real per-episode SHAP from the source's first alert; [] until/if it arrives. */
  explanation: ShapFeature[];
}

/** Detector timestamps are epoch seconds; normalise to ms. */
export const toMs = (ts: number) => (ts > 1e12 ? ts : ts * 1000);
