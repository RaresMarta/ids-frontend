import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ATTACK_COLORS } from '../../data/models';
import type { ActiveAttacker } from './types';

export type SignatureKind = 'DDoS' | 'DoS' | 'Mirai' | 'Recon' | 'generic';

const CAPTIONS: Record<SignatureKind, string> = {
  DDoS: 'High-volume flood converging from many sources',
  DoS: 'Sustained flood from a single source',
  Recon: 'Sequential port sweep (time × port)',
  Mirai: 'Botnet fan-in — many compromised sources, one target',
  generic: 'Anomalous traffic blocked — gate verdict reliable, family uncertain',
};

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
        fill="#DC4C4C"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      <text x={356} y={114} fill="#6B6E7A" fontSize={10} fontFamily="JetBrains Mono, monospace">
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
      <text x={24} y={134} fill="#6B6E7A" fontSize={10} fontFamily="JetBrains Mono, monospace">
        src
      </text>
      <motion.rect
        x={344}
        y={60}
        width={6}
        height={100}
        rx={3}
        fill="#DC4C4C"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
      <text x={356} y={114} fill="#6B6E7A" fontSize={10} fontFamily="JetBrains Mono, monospace">
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
      <text x={x0 + (cols * cell) / 2 - 20} y={y0 + rows * cell + 18} fill="#6B6E7A" fontSize={10} fontFamily="JetBrains Mono, monospace">
        time →
      </text>
      <text
        x={x0 - 14}
        y={y0 + (rows * cell) / 2 + 14}
        fill="#6B6E7A"
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
        fill="#DC4C4C"
        animate={{ r: [11, 14, 11], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.1, repeat: Infinity }}
      />
      <text x={tx + 18} y={ty + 4} fill="#6B6E7A" fontSize={10} fontFamily="JetBrains Mono, monospace">
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
          stroke="#DC4C4C"
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
        fill="#DC4C4C"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      />
    </svg>
  );
}

function CalmState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <div className="relative">
        <motion.span
          className="block w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: '#4ADE80' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>
      <p className="text-xs text-muted-foreground">No active threat</p>
      <p className="font-mono text-[10px] text-muted-foreground/60">traffic within normal envelope</p>
    </div>
  );
}

export default function AttackSignature({
  signature,
  attacker,
  intensity,
}: {
  signature: SignatureKind | null;
  attacker: ActiveAttacker | null;
  intensity: number;
}) {
  const familyColor = attacker ? (ATTACK_COLORS[attacker.family] ?? '#6B6E7A') : '#6B6E7A';

  return (
    <div className="bg-card border border-border rounded-md p-5 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Attack signature
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

      <div className="relative flex-1 min-h-[220px]">
        <AnimatePresence mode="wait">
          {signature === null ? (
            <motion.div
              key="calm"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.5 } }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
            >
              <CalmState />
            </motion.div>
          ) : (
            <motion.div
              key={signature}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.4 } }}
              exit={{ opacity: 0, transition: { duration: 1 } }}
            >
              {signature === 'DDoS' && <DDoSVisual intensity={intensity} />}
              {signature === 'DoS' && <DoSVisual intensity={intensity} />}
              {signature === 'Recon' && <ReconVisual />}
              {signature === 'Mirai' && <MiraiVisual intensity={intensity} />}
              {signature === 'generic' && <GenericPulse />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="text-[11px] text-muted-foreground/70 mt-2 min-h-[16px]">
        {signature ? CAPTIONS[signature] : ''}
      </p>
    </div>
  );
}
