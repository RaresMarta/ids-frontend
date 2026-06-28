import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Play } from 'lucide-react';
import { MODELS } from '../data/models';
import { API_URL } from '../../lib/classifiers';
import PRESETS from '../data/flow_presets.json';

/** The 25 model features, in X_COLUMNS_SELECTED order, grouped for scanability.
 *  Keys MUST match the backend exactly — they are sent verbatim to /api/classify-flow. */
const GROUPS: { title: string; fields: { key: string; label: string }[] }[] = [
  {
    title: 'Rate & timing',
    fields: [
      { key: 'Rate', label: 'Rate (pkts/s)' },
      { key: 'IAT', label: 'IAT (inter-arrival)' },
      { key: 'Number', label: 'Number (window size)' },
    ],
  },
  {
    title: 'Packet sizes',
    fields: [
      { key: 'Header_Length', label: 'Header length' },
      { key: 'Tot sum', label: 'Total size sum' },
      { key: 'Min', label: 'Min size' },
      { key: 'Max', label: 'Max size' },
      { key: 'AVG', label: 'Avg size' },
      { key: 'Std', label: 'Std size' },
    ],
  },
  {
    title: 'TCP flags (fraction of packets)',
    fields: [
      { key: 'fin_flag_number', label: 'FIN' },
      { key: 'syn_flag_number', label: 'SYN' },
      { key: 'rst_flag_number', label: 'RST' },
      { key: 'psh_flag_number', label: 'PSH' },
      { key: 'ack_flag_number', label: 'ACK' },
    ],
  },
  {
    title: 'Flag counts',
    fields: [
      { key: 'ack_count', label: 'ACK count' },
      { key: 'syn_count', label: 'SYN count' },
      { key: 'fin_count', label: 'FIN count' },
      { key: 'rst_count', label: 'RST count' },
    ],
  },
  {
    title: 'Protocol',
    fields: [
      { key: 'Protocol Type', label: 'Protocol type' },
      { key: 'Time_To_Live', label: 'TTL' },
      { key: 'TCP', label: 'TCP' },
      { key: 'UDP', label: 'UDP' },
      { key: 'HTTP', label: 'HTTP' },
      { key: 'HTTPS', label: 'HTTPS' },
      { key: 'DNS', label: 'DNS' },
    ],
  },
];

const ALL_KEYS = GROUPS.flatMap((g) => g.fields.map((f) => f.key));
const EMPTY = Object.fromEntries(ALL_KEYS.map((k) => [k, ''])) as Record<string, string>;
const FAMILIES = Object.keys(PRESETS);

type Mode = '2' | '8';

/** Manual single-flow entry: fill the 25 features (or load a real example), pick the
 *  classifier + granularity, and POST to /api/classify-flow. Shares the ResultsPage. */
export default function FlowForm({ modelId, mode }: { modelId: string; mode: Mode }) {
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, string>>(EMPTY);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const loadPreset = (family: string) => {
    const row = (PRESETS as Record<string, Record<string, number>>)[family];
    setValues(Object.fromEntries(ALL_KEYS.map((k) => [k, String(row[k] ?? 0)])));
    setActivePreset(family);
    setError('');
  };

  const clear = () => {
    setValues(EMPTY);
    setActivePreset(null);
    setError('');
  };

  const setField = (key: string, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setActivePreset(null);
  };

  const classify = async () => {
    if (isProcessing) return;
    const missing = ALL_KEYS.filter((k) => values[k].trim() === '' || isNaN(Number(values[k])));
    if (missing.length) {
      setError(`Fill all 25 features with numbers. Missing or invalid: ${missing.join(', ')}.`);
      return;
    }
    setIsProcessing(true);
    setError('');
    try {
      const features = Object.fromEntries(ALL_KEYS.map((k) => [k, Number(values[k])]));
      const t0 = performance.now();
      const res = await fetch(`${API_URL}/api/classify-flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features, model_type: modelId, mode, split: 'random' }),
      });
      const data = await res.json();
      const clientRoundTripMs = Math.round(performance.now() - t0);
      if (!res.ok || data.error) throw new Error(data.error ?? `Server error (${res.status})`);
      data.client_round_trip_ms = clientRoundTripMs;
      navigate('/analysis/results', { state: { result: data }, replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Classification failed. Is the model server running?');
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Preset loaders */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Load a real flow
        </p>
        <div className="flex flex-wrap gap-2">
          {FAMILIES.map((fam) => (
            <button
              key={fam}
              type="button"
              onClick={() => loadPreset(fam)}
              disabled={isProcessing}
              className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all disabled:opacity-60 ${
                activePreset === fam
                  ? 'border-primary/40 bg-primary/5 text-primary ring-1 ring-primary/15'
                  : 'border-border bg-card text-foreground/70 hover:border-border/60'
              }`}
            >
              {fam}
            </button>
          ))}
          <button
            type="button"
            onClick={clear}
            disabled={isProcessing}
            className="px-3 py-1.5 rounded-md border border-border bg-card text-xs font-medium text-muted-foreground hover:border-border/60 transition-all disabled:opacity-60"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Feature groups */}
      <div className="space-y-5">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {group.title}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {group.fields.map((f) => (
                <div key={f.key}>
                  <label
                    htmlFor={`flow-${f.key}`}
                    className="block text-[11px] text-muted-foreground mb-1 truncate"
                    title={f.label}
                  >
                    {f.label}
                  </label>
                  <input
                    id={`flow-${f.key}`}
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={values[f.key]}
                    onChange={(e) => setField(f.key, e.target.value)}
                    disabled={isProcessing}
                    className="w-full px-2.5 py-2 bg-input border border-border rounded-md text-foreground text-sm font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-60"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="px-4 py-3 bg-destructive/8 border border-destructive/25 rounded-md text-xs text-destructive" role="alert">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={classify}
        disabled={isProcessing}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            Classifying…
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Classify flow
          </>
        )}
      </button>
    </div>
  );
}
