import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react';
import { MODELS } from '../data/models';

// ─────────────────────────────────────────────────────────────────────────────
// Scroll-driven walkthrough of one SYN flood, packet → ban. Strict black & white,
// scoped to this page only (hardcoded neutrals, not the app theme tokens).
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  { n: '01', title: 'Calm', caption: 'A handful of flows move between a client and the server. Nothing unusual.' },
  { n: '02', title: 'Flood', caption: 'An attacker opens a torrent of half-open connections — a SYN flood aimed at the server.' },
  { n: '03', title: 'Capture', caption: 'A passive sensor beside the path copies every packet. The server itself is never touched.' },
  { n: '04', title: 'Deconstruct', caption: 'Packets are grouped into a 10-packet window and reduced to 25 numeric features.' },
  { n: '05', title: 'Verdict', caption: 'The two-head model reads the features. The gate is certain: Attack, 0.98 confidence.' },
  { n: '06', title: 'Block', caption: 'The source IP is dropped at the firewall. Its packets never reach the server again.' },
];

const INK = '#111111';

// One traveling packet along the wire (left → right), looping.
function Packet({ x0, x1, y, dur, delay }: { x0: number; x1: number; y: number; dur: number; delay: number }) {
  return (
    <motion.rect
      x={0}
      y={y - 3}
      width={6}
      height={6}
      fill={INK}
      initial={{ x: x0, opacity: 0 }}
      animate={{ x: [x0, x1], opacity: [0, 1, 1, 0] }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: 'linear', times: [0, 0.1, 0.9, 1] }}
    />
  );
}

// Packet diverted down to the sensor.
function TapPacket({ x, y0, y1, dur, delay }: { x: number; y0: number; y1: number; dur: number; delay: number }) {
  return (
    <motion.rect
      x={x - 3}
      y={0}
      width={6}
      height={6}
      fill={INK}
      initial={{ y: y0, opacity: 0 }}
      animate={{ y: [y0, y1], opacity: [0, 1, 1, 0] }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: 'linear', times: [0, 0.15, 0.85, 1] }}
    />
  );
}

function Node({ x, y, w, label }: { x: number; y: number; w: number; label: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={44} rx={2} fill="#fff" stroke={INK} strokeWidth={1.5} />
      <text x={x + w / 2} y={y + 27} textAnchor="middle" fontSize={13} fontFamily="'JetBrains Mono', monospace" fill={INK} letterSpacing={1}>
        {label}
      </text>
    </g>
  );
}

function Stage({ step }: { step: number }) {
  const WIRE_Y = 150;
  const ATT_X = 70;
  const SRV_X = 620;
  const TAP_X = 410;
  const SENSOR_Y = 300;
  const flood = step >= 1 && step <= 4;
  const blocked = step >= 5;
  const tapped = step >= 2 && step <= 4;

  // Packet stream tuned per step: calm = sparse/slow, flood = dense/fast.
  const count = step === 0 ? 3 : flood ? 12 : 4;
  const dur = step === 0 ? 3.4 : 1.1;
  const endX = blocked ? TAP_X - 30 : SRV_X - 20;

  return (
    <svg viewBox="0 0 760 380" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* wire */}
      <line x1={ATT_X + 110} y1={WIRE_Y} x2={SRV_X} y2={WIRE_Y} stroke={INK} strokeWidth={1.5} />

      {/* tap line to sensor */}
      <AnimatePresence>
        {step >= 2 && (
          <motion.line
            x1={TAP_X} y1={WIRE_Y} x2={TAP_X} y2={SENSOR_Y}
            stroke={INK} strokeWidth={1.5} strokeDasharray="4 4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* nodes */}
      <Node x={ATT_X} y={WIRE_Y - 22} w={110} label="ATTACKER" />
      <Node x={SRV_X} y={WIRE_Y - 22} w={110} label="SERVER" />
      <AnimatePresence>
        {step >= 2 && (
          <motion.g initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Node x={TAP_X - 55} y={SENSOR_Y} w={110} label="SENSOR" />
          </motion.g>
        )}
      </AnimatePresence>

      {/* wire packets */}
      {Array.from({ length: count }).map((_, i) => (
        <Packet key={`p${step}-${i}`} x0={ATT_X + 110} x1={endX} y={WIRE_Y} dur={dur} delay={(i * dur) / count} />
      ))}

      {/* diverted (captured) packets */}
      {tapped &&
        Array.from({ length: 6 }).map((_, i) => (
          <TapPacket key={`t${i}`} x={TAP_X} y0={WIRE_Y} y1={SENSOR_Y - 4} dur={1.1} delay={(i * 1.1) / 6} />
        ))}

      {/* deconstruct: window + features */}
      <AnimatePresence>
        {step === 3 && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <text x={TAP_X + 75} y={SENSOR_Y + 6} fontSize={11} fontFamily="'JetBrains Mono', monospace" fill={INK}>window ×10</text>
            {['syn_flag_number 1.00', 'Rate ▲', 'IAT ▼', 'ack_count 0', '+21 more'].map((t, i) => (
              <text key={t} x={TAP_X + 75} y={SENSOR_Y + 24 + i * 15} fontSize={10.5} fontFamily="'JetBrains Mono', monospace" fill="#555">
                {t}
              </text>
            ))}
          </motion.g>
        )}
      </AnimatePresence>

      {/* verdict */}
      <AnimatePresence>
        {step === 4 && (
          <motion.g initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <rect x={TAP_X + 70} y={SENSOR_Y - 14} width={150} height={44} rx={2} fill={INK} />
            <text x={TAP_X + 145} y={SENSOR_Y + 4} textAnchor="middle" fontSize={13} fontFamily="'JetBrains Mono', monospace" fill="#fff" letterSpacing={1}>ATTACK</text>
            <text x={TAP_X + 145} y={SENSOR_Y + 21} textAnchor="middle" fontSize={10.5} fontFamily="'JetBrains Mono', monospace" fill="#bbb">gate 0.98</text>
          </motion.g>
        )}
      </AnimatePresence>

      {/* block: a bar slams across the wire */}
      <AnimatePresence>
        {blocked && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.rect
              x={TAP_X - 4} y={WIRE_Y - 26} width={8} height={52} fill={INK}
              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4 }} style={{ originY: 0.5 }}
            />
            <text x={TAP_X} y={WIRE_Y - 36} textAnchor="middle" fontSize={10.5} fontFamily="'JetBrains Mono', monospace" fill={INK} letterSpacing={1}>
              nftables drop
            </text>
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const journeyRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: journeyRef, offset: ['start start', 'end end'] });
  const [step, setStep] = useState(0);

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    setStep(Math.min(STEPS.length - 1, Math.max(0, Math.floor(p * STEPS.length))));
  });

  const active = STEPS[step];

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/85 backdrop-blur border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-mono text-xs tracking-[0.2em]">NEURAL·IDS</span>
          <button
            onClick={() => navigate('/login')}
            className="font-mono text-xs tracking-[0.15em] px-4 py-2 border border-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors"
          >
            SIGN IN
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="min-h-screen flex flex-col justify-center max-w-5xl mx-auto px-6">
        <p className="font-mono text-xs tracking-[0.25em] text-neutral-500 mb-6">INTRUSION DETECTION · BACHELOR THESIS</p>
        <h1 className="font-mono text-5xl md:text-6xl leading-[1.05] tracking-tight mb-6">
          From packet<br />to ban.
        </h1>
        <p className="text-lg text-neutral-600 max-w-xl leading-relaxed mb-10">
          A neural intrusion detection system that captures live traffic, classifies every flow, and blocks
          attackers in real time. Scroll to watch it happen — one attack, start to finish.
        </p>
        <div className="font-mono text-xs tracking-[0.2em] text-neutral-400 flex items-center gap-3">
          <span>SCROLL</span>
          <motion.span animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>↓</motion.span>
        </div>
      </section>

      {/* Journey — 6 sticky beats */}
      <div ref={journeyRef} style={{ height: `${STEPS.length * 100}vh` }} className="relative">
        <div className="sticky top-0 h-screen flex flex-col">
          {/* step rail */}
          <div className="absolute top-20 left-6 md:left-1/2 md:-translate-x-[420px] flex md:flex-col gap-2 z-10">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex items-center gap-2">
                <span className={`font-mono text-[10px] tracking-widest ${i === step ? 'text-neutral-900' : 'text-neutral-300'}`}>{s.n}</span>
                <span className={`block h-px transition-all duration-300 ${i === step ? 'w-6 bg-neutral-900' : 'w-3 bg-neutral-300'}`} />
              </div>
            ))}
          </div>

          {/* stage */}
          <div className="flex-1 flex items-center justify-center px-6 pt-10">
            <div className="w-full max-w-3xl">
              <Stage step={step} />
            </div>
          </div>

          {/* caption */}
          <div className="pb-20 px-6">
            <div className="max-w-3xl mx-auto min-h-[120px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.4 }}
                >
                  <p className="font-mono text-xs tracking-[0.25em] text-neutral-400 mb-3">
                    {active.n} / {active.title.toUpperCase()}
                  </p>
                  <p className="text-2xl md:text-3xl leading-snug max-w-2xl">{active.caption}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics — minimal, real numbers */}
      <section className="max-w-5xl mx-auto px-6 py-28 border-t border-neutral-200">
        <p className="font-mono text-xs tracking-[0.25em] text-neutral-500 mb-3">MEASURED · 8-CLASS · TEMPORAL SPLIT</p>
        <p className="text-neutral-600 max-w-xl mb-10 leading-relaxed">
          Trained on the earliest traffic, tested on the latest — the deployment-realistic split, which reads
          lower than the random-split numbers most papers report. That gap is the honest result.
        </p>
        <div className="border-t border-neutral-900">
          {MODELS.map((m) => (
            <div key={m.id} className="flex items-baseline justify-between py-4 border-b border-neutral-200">
              <span className="text-sm">{m.name}</span>
              <span className="font-mono text-sm tabular-nums">
                {m.metrics.testMacroF1.toFixed(3)}
                <span className="text-neutral-400 text-xs ml-2">macro F1</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-10 flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.2em] text-neutral-400">PYTORCH · SCIKIT-LEARN · FASTAPI · NFTABLES</span>
          <span className="font-mono text-[10px] tracking-[0.2em] text-neutral-500">NEURAL·IDS</span>
        </div>
      </footer>
    </div>
  );
}
