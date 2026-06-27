import { MODELS, ATTACK_COLORS } from '../app/data/models';

/** Backend endpoints. Override per environment via the VITE_* vars; the fallbacks
 *  are local-dev defaults and must not be relied on in production. */
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:7860';
export const DETECTOR_URL: string = import.meta.env.VITE_DETECTOR_URL ?? 'http://localhost:7871';

/** Human-readable classifier name for a model id, falling back to the id itself. */
export const getModelName = (id: string): string => MODELS.find((m) => m.id === id)?.name ?? id;

/** Family colour for an attack/benign label, falling back to a muted neutral. */
export const attackColor = (label: string): string => ATTACK_COLORS[label] ?? 'var(--muted-foreground)';

/** Format a 0–1 probability as a percent string (null-safe), e.g. 0.873 → "87.3%". */
export const formatConfidence = (fraction: number | null | undefined, digits = 1): string =>
  `${((fraction ?? 0) * 100).toFixed(digits)}%`;
