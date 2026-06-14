import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ATTACK_COLORS } from '../../data/models';
import type { ActiveAttacker, ShapFeature } from './types';

export type SignatureKind = 'DDoS' | 'DoS' | 'Mirai' | 'Recon' | 'generic';

const CAPTIONS: Record<SignatureKind, string> = {
  DDoS: 'High-volume flood converging from many sources',
  DoS: 'Sustained flood from a single source',
  Recon: 'Sequential port sweep (time × port)',
  Mirai: 'Botnet fan-in — many compromised sources, one target',
  generic: 'Anomalous traffic detected — gate verdict reliable, family uncertain',
};

// SHAP direction → colour. Red stays reserved for the gate verdict / breach
// shading; the clay accent carries "pushes toward attack" here.
const DIR_ATTACK = 'var(--primary)';
const DIR_BENIGN = 'var(--info)';

const VB = '0 0 400 220';

/** intensity ∈ [0,1] scales animation speed; derived from blocked/s on the page. */
function speed(base: number, intensity: number) {
  return Math.max(0.4, base * (1 - 0.4 * intensity));
}

function DDoSVisual({ intensity }: { intensity: number }) {
  const dots = useMemo(
    () =>
      Array.from({ length: 18 }, () => ({
        y: 14 + Math.random() * 192,
        delay: Math.random() * 1.2,
        dur: 0.8 + Math.random() * 0.6,
      })),
    [],
  );
  return (
    <svg viewBox={VB} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* target wall */}
      <motion.rect
        x={344}
        y={20}
        width={6}
        height={180}
        rx={3}
        fill="var(--threat)"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      <text x={356} y={114} fill="var(--muted-foreground)" fontSize={10} fontFamily="JetBrains Mono, monospace">
        dst
      </text>
      {dots.map((d, i) => (
        <motion.circle
          key={i}
          cy={d.y}
          r={3}
          fill={ATTACK_COLORS.DDoS}
          initial={{ cx: -10, opacity: 0 }}
          animate={{ cx: [-10, 338], opacity: [0, 0.9, 0.9, 0] }}
          transition={{
            duration: speed(d.dur, intensity),
            delay: d.delay,
            repeat: Infinity,
            ease: 'linear',
            times: [0, 0.1, 0.92, 1],
          }}
        />
      ))}
    </svg>
  );
}

function DoSVisual({ intensity }: { intensity: number }) {
  return (
    <svg viewBox={VB} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* single source */}
      <motion.circle
        cx={36}
        cy={110}
        r={8}
        fill={ATTACK_COLORS.DoS}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
      <text x={24} y={134} fill="var(--muted-foreground)" fontSize={10} fontFamily="JetBrains Mono, monospace">
        src
      </text>
      <motion.rect
        x={344}
        y={60}
        width={6}
        height={100}
        rx={3}
        fill="var(--threat)"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
      <text x={356} y={114} fill="var(--muted-foreground)" fontSize={10} fontFamily="JetBrains Mono, monospace">
        dst
      </text>
      {Array.from({ length: 8 }, (_, i) => (
        <motion.circle
          key={i}
          cy={110}
          r={3.5}
          fill={ATTACK_COLORS.DoS}
          initial={{ cx: 48, opacity: 0 }}
          animate={{ cx: [48, 338], opacity: [0, 1, 1, 0] }}
          transition={{
            duration: speed(0.7, intensity),
            delay: i * 0.12,
            repeat: Infinity,
            ease: 'linear',
            times: [0, 0.1, 0.9, 1],
          }}
        />
      ))}
    </svg>
  );
}

function ReconVisual() {
  const cols = 14;
  const rows = 7;
  const cell = 22;
  const x0 = 52;
  const y0 = 14;
  const cycle = cols * 0.22 + 1;
  return (
    <svg viewBox={VB} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {Array.from({ length: cols * rows }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return (
          <motion.rect
            key={i}
            x={x0 + col * cell}
            y={y0 + row * cell}
            width={cell - 3}
            height={cell - 3}
            rx={2}
            fill={ATTACK_COLORS.Recon}
            initial={{ fillOpacity: 0.06 }}
            animate={{ fillOpacity: [0.06, 0.85, 0.15, 0.06] }}
            transition={{
              duration: 1.4,
              times: [0, 0.08, 0.5, 1],
              delay: col * 0.22 + row * 0.025,
              repeat: Infinity,
              repeatDelay: cycle - 1.4,
            }}
          />
        );
      })}
      <text x={x0 + (cols * cell) / 2 - 20} y={y0 + rows * cell + 18} fill="var(--muted-foreground)" fontSize={10} fontFamily="JetBrains Mono, monospace">
        time →
      </text>
      <text
        x={x0 - 14}
        y={y0 + (rows * cell) / 2 + 14}
        fill="var(--muted-foreground)"
        fontSize={10}
        fontFamily="JetBrains Mono, monospace"
        transform={`rotate(-90 ${x0 - 14} ${y0 + (rows * cell) / 2 + 14})`}
      >
        port →
      </text>
    </svg>
  );
}

function MiraiVisual({ intensity }: { intensity: number }) {
  const sources = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        x: 28 + Math.random() * 60,
        y: 16 + (i * 188) / 11 + (Math.random() * 10 - 5),
        delay: Math.random() * 1.2,
      })),
    [],
  );
  const tx = 320;
  const ty = 110;
  return (
    <svg viewBox={VB} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {sources.map((s, i) => (
        <line key={`l${i}`} x1={s.x} y1={s.y} x2={tx} y2={ty} stroke={ATTACK_COLORS.Mirai} strokeOpacity={0.14} />
      ))}
      {sources.map((s, i) => (
        <circle key={`s${i}`} cx={s.x} cy={s.y} r={3.5} fill={ATTACK_COLORS.Mirai} fillOpacity={0.7} />
      ))}
      {sources.map((s, i) => (
        <motion.circle
          key={`p${i}`}
          r={2.5}
          fill={ATTACK_COLORS.Mirai}
          initial={{ cx: s.x, cy: s.y, opacity: 0 }}
          animate={{ cx: [s.x, tx], cy: [s.y, ty], opacity: [0, 1, 0] }}
          transition={{
            duration: speed(1.3, intensity),
            delay: s.delay,
            repeat: Infinity,
            ease: 'easeIn',
          }}
        />
      ))}
      <motion.circle
        cx={tx}
        cy={ty}
        r={11}
        fill="var(--threat)"
        animate={{ r: [11, 14, 11], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.1, repeat: Infinity }}
      />
      <text x={tx + 18} y={ty + 4} fill="var(--muted-foreground)" fontSize={10} fontFamily="JetBrains Mono, monospace">
        target
      </text>
    </svg>
  );
}

function GenericPulse() {
  return (
    <svg viewBox={VB} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={200}
          cy={110}
          fill="none"
          stroke="var(--threat)"
          strokeWidth={1.5}
          initial={{ r: 12, opacity: 0 }}
          animate={{ r: [12, 92], opacity: [0.6, 0] }}
          transition={{ duration: 2.2, delay: i * 0.73, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
      <motion.circle
        cx={200}
        cy={110}
        r={8}
        fill="var(--threat)"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      />
    </svg>
  );
}

function CalmState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <motion.span
        className="block w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: 'var(--safe)' }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <p className="text-xs text-muted-foreground">No active threat</p>
      <p className="font-mono text-[10px] text-muted-foreground/60">traffic within normal envelope</p>
    </div>
  );
}

function Scene({ signature, intensity }: { signature: SignatureKind | null; intensity: number }) {
  switch (signature) {
    case 'DDoS':
      return <DDoSVisual intensity={intensity} />;
    case 'DoS':
      return <DoSVisual intensity={intensity} />;
    case 'Recon':
      return <ReconVisual />;
    case 'Mirai':
      return <MiraiVisual intensity={intensity} />;
    case 'generic':
      return <GenericPulse />;
    default:
      return <CalmState />;
  }
}

/** Real signed SHAP for the gate's Attack verdict (per attack episode). */
function WhyPanel({ attacker }: { attacker: ActiveAttacker | null }) {
  const feats: ShapFeature[] = (attacker?.explanation ?? [])
    .slice()
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 6);
  const max = Math.max(...feats.map((f) => Math.abs(f.contribution)), 1e-9);

  const header = (
    <div className="flex items-center justify-between mb-3">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        Why this source was flagged
      </p>
      <span className="font-mono text-[9px] text-muted-foreground/60">SHAP · gate</span>
    </div>
  );

  if (!attacker) {
    return (
      <div className="flex flex-col h-full">
        {header}
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground/70">Nothing to explain — no active threat</p>
        </div>
      </div>
    );
  }

  if (feats.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {header}
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground/70">Attribution unavailable for this episode</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {header}
      <div className="flex items-center gap-4 mb-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DIR_ATTACK }} />
          toward attack
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DIR_BENIGN }} />
          toward benign
        </span>
      </div>
      <div className="space-y-2">
        {feats.map((f) => {
          const dir = f.direction ?? (f.contribution >= 0 ? 'attack' : 'benign');
          const color = dir === 'benign' ? DIR_BENIGN : DIR_ATTACK;
          return (
            <div key={f.feature} className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-foreground/70 w-36 truncate shrink-0">
                {f.feature}
              </span>
              <div className="flex-1 h-1.5 bg-muted rounded-sm overflow-hidden">
                <motion.div
                  className="h-full rounded-sm"
                  style={{ backgroundColor: color }}
                  animate={{ width: `${(Math.abs(f.contribution) / max) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                />
              </div>
              <span className="font-mono text-[10px] text-muted-foreground w-14 text-right shrink-0">
                {f.contribution >= 0 ? '+' : ''}
                {f.contribution.toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Persistent full-width "stage" for the live monitor. The card is always
 * mounted; the scene cross-fades calm ⇄ attack (and family ⇄ family) instead
 * of tearing down, and the real per-episode SHAP rides alongside the visual.
 */
export default function AttackStage({
  signature,
  attacker,
  intensity,
}: {
  signature: SignatureKind | null;
  attacker: ActiveAttacker | null;
  intensity: number;
}) {
  const familyColor = attacker ? (ATTACK_COLORS[attacker.family] ?? 'var(--muted-foreground)') : 'var(--muted-foreground)';
  const sceneKey = signature ?? 'calm';

  return (
    <div className="bg-card border border-border rounded-md p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Attack stage
        </p>
        {attacker && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: familyColor }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: familyColor }} />
              {signature === 'generic' ? `suspected ${attacker.family}` : attacker.family}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{attacker.ip}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* Persistent scene — cross-fades rather than unmounting. */}
        <div className="flex flex-col">
          <div className="relative flex-1 min-h-[220px]">
            <AnimatePresence initial={false}>
              <motion.div
                key={sceneKey}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              >
                <Scene signature={signature} intensity={intensity} />
              </motion.div>
            </AnimatePresence>
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-2 min-h-[16px]">
            {signature ? CAPTIONS[signature] : ''}
          </p>
        </div>

        {/* Real SHAP attribution for the active source. */}
        <div className="border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-5">
          <WhyPanel attacker={attacker} />
        </div>
      </div>
    </div>
  );
}
