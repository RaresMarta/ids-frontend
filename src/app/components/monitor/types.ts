// Frozen SSE contract of the live detector service.
// See docs/attack-visualization-plan.md — this file mirrors it 1:1.

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
  top_features: { feature: string; contribution: number }[];
  n_packets: number;
}

export interface AlertEvent {
  type: 'alert';
  ts: number;
  attacker_ip: string;
  family: string;
  confidence: number;
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
}

/** Detector timestamps are epoch seconds; normalise to ms. */
export const toMs = (ts: number) => (ts > 1e12 ? ts : ts * 1000);

/** Families with a dedicated AttackSignature visual; everything else uses the generic pulse. */
export const RICH_SIGNATURE_FAMILIES = new Set(['DDoS', 'DoS', 'Mirai', 'Recon']);

/**
 * Below this 8-class family confidence the per-type signature falls back to the
 * generic pulse. In live mode the family head mislabels real attack tools
 * ("Spoofing"); only the 2-class gate is trusted there.
 */
export const FAMILY_CONFIDENCE_FLOOR = 0.85;

export const MITRE_TAGS: Record<string, string> = {
  DDoS: 'T1498',
  DoS: 'T1499',
  Recon: 'T1595',
  Mirai: 'T1584.005',
  Spoofing: 'T1557',
  Web: 'T1190',
  BruteForce: 'T1110',
};
