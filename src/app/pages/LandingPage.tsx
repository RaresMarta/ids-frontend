import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react';
import { MODELS } from '../data/models';

// ─────────────────────────────────────────────────────────────────────────────
// Scroll-driven, black-&-white illustration of what the Live Monitor does:
// capture → classify → ban, walked phase by phase for a chosen attack type.
// Strict neutrals, scoped to this page only (not the app theme tokens).
// ─────────────────────────────────────────────────────────────────────────────

const INK = '#111111';
const PHASE_LABELS = ['Setup', 'Attack', 'Capture', 'Features', 'Verdict', 'Block'];
const N = PHASE_LABELS.length;

type Attack = {
  id: string;
  name: string;
  family: string;
  features: string[];
  captions: string[]; // one per phase
};

const ATTACKS: Attack[] = [
  {
    id: 'synflood',
    name: 'SYN flood',
    family: 'DoS',
    features: ['syn_flag_number 1.00', 'ack_flag_number 0.00', 'syn_count ▲', 'Rate ▲▲', 'IAT ▼'],
    captions: [
      'A normal TCP connection is a three-way handshake: the client sends SYN, the server replies SYN-ACK, the client confirms with ACK.',
      'The attacker sends a flood of SYNs but never returns the final ACK. Each half-open connection holds a slot in the server’s backlog until it fills — real clients can no longer connect.',
      'A passive sensor beside the path copies every packet. The server is never in the enforcement path.',
      'Ten packets become one window, reduced to 25 features. The signature is stark: all SYN, no ACK.',
      'The two-head model reads the window. The gate is certain: Attack, 0.98.',
      'The source IP is dropped at the firewall via nftables. Its packets never reach the server again.',
    ],
  },
  {
    id: 'portscan',
    name: 'Port scan',
    family: 'Recon',
    features: ['dst-port spread ▲', 'SYN→RST pairs', 'flow length ▼', 'Number ▼', 'Rate ▲'],
    captions: [
      'A normal client talks to one known service — here, HTTPS on port 443.',
      'The attacker probes port after port looking for anything open. Most reply RST (closed); the pattern is a fan of tiny, one-shot flows across many ports.',
      'A passive sensor beside the path copies every packet. The server is never in the enforcement path.',
      'Ten packets become one window, reduced to 25 features. The tell: many destination ports, very short flows.',
      'The two-head model reads the window. The gate flags reconnaissance: Attack.',
      'The source IP is dropped at the firewall via nftables. The scan goes dark.',
    ],
  },
  {
    id: 'mirai',
    name: 'Mirai botnet',
    family: 'Mirai',
    features: ['many src IPs', 'uniform payload', 'Tot sum ▲', 'Rate ▲▲', 'Header_Length ~'],
    captions: [
      'A normal server handles a trickle of independent clients.',
      'A botnet of compromised IoT devices turns on the target at once — many sources, one victim, near-identical traffic.',
      'A passive sensor beside the path copies every packet. The server is never in the enforcement path.',
      'Ten packets become one window, reduced to 25 features. The fingerprint: high volume, uniform shape.',
      'The two-head model reads the window. The gate is certain: Attack.',
      'Offending sources are dropped at the firewall via nftables.',
    ],
  },
];

const FAQ = [
  {
    q: 'Does it sit inline and block traffic?',
    a: 'No. The sensor is beside the path — it copies packets and never carries them. Enforcement is out-of-band via nftables on the host, so the protected server is never a bottleneck or a single point of failure.',
  },
  {
    q: 'Why is macro-F1 around 0.55 and not 99%?',
    a: 'Because of a temporal split: the model trains on the earliest traffic and is tested on the latest, which mirrors deployment. The ~99% numbers in many papers come from random splits that leak future patterns into training. The lower figure is the honest generalization result.',
  },
  {
    q: 'Which attacks does it catch well?',
    a: 'Flooding (DoS/DDoS), Mirai and reconnaissance — they have clear flow-level signatures. Web and brute-force attacks detect poorly, because their signal lives in application-layer payloads the model never sees.',
  },
  {
    q: 'Is it real-time?',
    a: 'Per-flow inference is sub-millisecond, suitable for interactive detection. It is framed as single-request detection, not line-rate gateway protection at millions of flows per second.',
  },
  {
    q: 'What is it trained on?',
    a: 'CIC-IoT-2023, on the 8-class attack-family taxonomy, with three classifiers (MLP, Random Forest, XGBoost) on the same split.',
  },
];

// ── packet helpers ───────────────────────────────────────────────────────────
function Packet({ x0, x1, y, dur, delay, label }: { x0: number; x1: number; y: number; dur: number; delay: number; label?: string }) {
  return (
    <motion.g
      initial={{ x: x0, opacity: 0 }}
      animate={{ x: [x0, x1], opacity: [0, 1, 1, 0] }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: 'linear', times: [0, 0.1, 0.9, 1] }}
    >
      <rect x={0} y={y - 3} width={6} height={6} fill={INK} />
      {label && <text x={3} y={y - 7} textAnchor="middle" fontSize={8} fontFamily="'JetBrains Mono', monospace" fill={INK}>{label}</text>}
    </motion.g>
  );
}

function Node({ x, y, w, label, h = 44 }: { x: number; y: number; w: number; label: string; h?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2} fill="#fff" stroke={INK} strokeWidth={1.5} />
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize={12} fontFamily="'JetBrains Mono', monospace" fill={INK} letterSpacing={1}>
        {label}
      </text>
    </g>
  );
}

// ── per-attack "Setup"/"Attack" scenes (phases 0–1) ──────────────────────────
function SynScene({ step, attackY }: { step: number; attackY: number }) {
  // step 0: full handshake; step 1: flood + missing ACK + backlog meter
  const lines = step === 0
    ? [{ t: 'SYN →', dir: 1 }, { t: '← SYN-ACK', dir: -1 }, { t: 'ACK →', dir: 1 }]
    : [{ t: 'SYN →', dir: 1 }, { t: '← SYN-ACK', dir: -1 }, { t: 'ACK ✗', dir: 1, dead: true }];
  return (
    <g>
      {lines.map((l, i) => (
        <motion.text
          key={l.t + i}
          x={l.dir === 1 ? 250 : 510}
          y={attackY - 30 + i * 22}
          textAnchor={l.dir === 1 ? 'start' : 'end'}
          fontSize={12}
          fontFamily="'JetBrains Mono', monospace"
          fill={l.dead ? '#bbb' : INK}
          style={l.dead ? { textDecoration: 'line-through' } : undefined}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: step === 0 ? 3 : 1.6, delay: i * (step === 0 ? 0.8 : 0.25), repeat: Infinity }}
        >
          {l.t}
        </motion.text>
      ))}
      {step === 0 && (
        <text x={380} y={attackY + 44} textAnchor="middle" fontSize={11} fontFamily="'JetBrains Mono', monospace" fill="#666">connection established</text>
      )}
      {step === 1 && <BacklogMeter x={508} y={attackY + 24} />}
    </g>
  );
}

function BacklogMeter({ x, y }: { x: number; y: number }) {
  const slots = 8;
  return (
    <g>
      <text x={x} y={y - 6} fontSize={10} fontFamily="'JetBrains Mono', monospace" fill="#666">backlog</text>
      {Array.from({ length: slots }).map((_, i) => (
        <motion.rect
          key={i}
          x={x + i * 12}
          y={y}
          width={9}
          height={14}
          fill={INK}
          initial={{ opacity: 0.12 }}
          animate={{ opacity: [0.12, 1] }}
          transition={{ duration: 0.4, delay: 0.5 + i * 0.25, repeat: Infinity, repeatType: 'reverse', repeatDelay: slots * 0.25 }}
        />
      ))}
      <motion.text
        x={x + slots * 12 + 8} y={y + 11} fontSize={10} fontFamily="'JetBrains Mono', monospace" fill={INK}
        initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1] }} transition={{ duration: 3, repeat: Infinity }}
      >FULL</motion.text>
    </g>
  );
}

function ScanScene({ step, attackY }: { step: number; attackY: number }) {
  const ports = ['22', '23', '80', '443', '3389', '8080'];
  if (step === 0) {
    return <text x={250} y={attackY - 6} fontSize={12} fontFamily="'JetBrains Mono', monospace" fill={INK}>GET :443 → 200 OK</text>;
  }
  return (
    <g>
      {ports.map((p, i) => (
        <g key={p}>
          <motion.text
            x={560} y={attackY - 24 + i * 16} fontSize={11} fontFamily="'JetBrains Mono', monospace"
            fill={p === '443' ? INK : '#999'}
            initial={{ opacity: 0.2 }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.8, delay: i * 0.3, repeat: Infinity }}
          >
            :{p} {p === '443' ? 'open' : 'RST'}
          </motion.text>
        </g>
      ))}
    </g>
  );
}

function MiraiScene({ step, attackY }: { step: number; attackY: number }) {
  const bots = step === 0 ? 2 : 6;
  return (
    <g>
      {Array.from({ length: bots }).map((_, i) => {
        const by = attackY - 40 + i * (80 / bots);
        return (
          <g key={i}>
            <rect x={40} y={by} width={8} height={8} fill={INK} opacity={0.7} />
            {step === 1 && (
              <motion.rect
                x={0} y={by + 1} width={5} height={5} fill={INK}
                initial={{ x: 52, opacity: 0 }}
                animate={{ x: [52, 560], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.1, delay: i * 0.15, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </g>
        );
      })}
      <text x={44} y={attackY + 54} fontSize={10} fontFamily="'JetBrains Mono', monospace" fill="#666">
        {step === 0 ? 'idle devices' : 'botnet · many → one'}
      </text>
    </g>
  );
}

// ── the unified stage ────────────────────────────────────────────────────────
function Stage({ attack, step }: { attack: Attack; step: number }) {
  const WIRE_Y = 150;
  const ATT_X = 60;
  const SRV_X = 590;
  const TAP_X = 410;
  const SENSOR_Y = 290;
  const blocked = step >= 5;
  const attackerLabel = attack.id === 'mirai' ? 'BOTNET' : 'ATTACKER';
  const packetLabel = attack.id === 'synflood' ? 'SYN' : undefined;
  const floodCount = step === 1 ? (attack.id === 'mirai' ? 0 : 10) : step === 0 ? 0 : 8;
  const endX = blocked ? TAP_X - 30 : SRV_X - 14;

  return (
    <svg viewBox="0 0 760 360" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <line x1={ATT_X + 116} y1={WIRE_Y} x2={SRV_X} y2={WIRE_Y} stroke={INK} strokeWidth={1.5} />

      {/* tap to sensor */}
      {step >= 2 && (
        <motion.line x1={TAP_X} y1={WIRE_Y} x2={TAP_X} y2={SENSOR_Y} stroke={INK} strokeWidth={1.5} strokeDasharray="4 4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      )}

      <Node x={ATT_X} y={WIRE_Y - 22} w={116} label={attackerLabel} />
      <Node x={SRV_X} y={WIRE_Y - 22} w={110} label="SERVER" />
      {step >= 2 && (
        <motion.g initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Node x={TAP_X - 55} y={SENSOR_Y} w={110} label="SENSOR" />
        </motion.g>
      )}

      {/* phase 0–1: attack-specific scene */}
      {step <= 1 && attack.id === 'synflood' && <SynScene step={step} attackY={WIRE_Y} />}
      {step <= 1 && attack.id === 'portscan' && <ScanScene step={step} attackY={WIRE_Y} />}
      {step <= 1 && attack.id === 'mirai' && <MiraiScene step={step} attackY={WIRE_Y} />}

      {/* wire packets (phases 1+) */}
      {Array.from({ length: floodCount }).map((_, i) => (
        <Packet key={`p${attack.id}${step}-${i}`} x0={ATT_X + 116} x1={endX} y={WIRE_Y} dur={step === 1 ? 1 : 1.4} delay={(i * (step === 1 ? 1 : 1.4)) / Math.max(floodCount, 1)} label={packetLabel} />
      ))}

      {/* captured packets → sensor (phases 2–4) */}
      {step >= 2 && step <= 4 &&
        Array.from({ length: 6 }).map((_, i) => (
          <motion.rect key={`t${i}`} x={TAP_X - 3} width={6} height={6} fill={INK}
            initial={{ y: WIRE_Y, opacity: 0 }} animate={{ y: [WIRE_Y, SENSOR_Y - 4], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.1, delay: (i * 1.1) / 6, repeat: Infinity, ease: 'linear' }} />
        ))}

      {/* features (phase 3) */}
      {step === 3 && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <text x={TAP_X + 70} y={SENSOR_Y + 2} fontSize={11} fontFamily="'JetBrains Mono', monospace" fill={INK}>window ×10 → 25 features</text>
          {attack.features.map((t, i) => (
            <text key={t} x={TAP_X + 70} y={SENSOR_Y + 20 + i * 15} fontSize={10.5} fontFamily="'JetBrains Mono', monospace" fill="#555">{t}</text>
          ))}
        </motion.g>
      )}

      {/* verdict (phase 4) */}
      {step === 4 && (
        <motion.g initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
          <rect x={TAP_X + 70} y={SENSOR_Y - 12} width={170} height={46} rx={2} fill={INK} />
          <text x={TAP_X + 155} y={SENSOR_Y + 6} textAnchor="middle" fontSize={13} fontFamily="'JetBrains Mono', monospace" fill="#fff" letterSpacing={1}>ATTACK · {attack.family}</text>
          <text x={TAP_X + 155} y={SENSOR_Y + 23} textAnchor="middle" fontSize={10} fontFamily="'JetBrains Mono', monospace" fill="#bbb">gate 0.98</text>
        </motion.g>
      )}

      {/* block (phase 5) */}
      {blocked && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.rect x={TAP_X - 4} y={WIRE_Y - 26} width={8} height={52} fill={INK}
            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4 }} style={{ originY: 0.5 }} />
          <text x={TAP_X} y={WIRE_Y - 34} textAnchor="middle" fontSize={10.5} fontFamily="'JetBrains Mono', monospace" fill={INK} letterSpacing={1}>nftables drop</text>
        </motion.g>
      )}
    </svg>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const journeyRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: journeyRef, offset: ['start start', 'end end'] });
  const [step, setStep] = useState(0);
  const [attackId, setAttackId] = useState(ATTACKS[0].id);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    setStep(Math.min(N - 1, Math.max(0, Math.floor(p * N))));
  });

  const attack = ATTACKS.find((a) => a.id === attackId)!;

  // Scroll the page so a given phase becomes active (keeps arrows + scroll in sync).
  const goTo = (i: number) => {
    const el = journeyRef.current;
    if (!el) return;
    const top = window.scrollY + el.getBoundingClientRect().top;
    const scrollable = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + ((i + 0.5) / N) * scrollable, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/85 backdrop-blur border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-mono text-xs tracking-[0.2em]">NEURAL·IDS</span>
          <button onClick={() => navigate('/login')}
            className="font-mono text-xs tracking-[0.15em] px-4 py-2 border border-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors">
            SIGN IN
          </button>
        </div>
      </header>

      {/* Hero — minimal */}
      <section className="min-h-screen flex flex-col justify-center max-w-5xl mx-auto px-6">
        <p className="font-mono text-xs tracking-[0.25em] text-neutral-500 mb-6">BACHELOR THESIS</p>
        <h1 className="font-mono text-4xl md:text-5xl leading-[1.1] tracking-tight mb-6 max-w-2xl">
          Network intrusion detection for IoT networks.
        </h1>
        <p className="text-lg text-neutral-600 max-w-xl leading-relaxed mb-12">
          A neural model that captures live traffic, classifies every flow, and blocks attackers at
          the firewall.
        </p>
        <div className="font-mono text-xs tracking-[0.2em] text-neutral-400 flex items-center gap-3">
          <span>SCROLL TO SEE IT WORK</span>
          <motion.span animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>↓</motion.span>
        </div>
      </section>

      {/* Animation section framing */}
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-4">
        <p className="font-mono text-xs tracking-[0.25em] text-neutral-500 mb-3">ILLUSTRATED · WHAT THE LIVE MONITOR DOES</p>
        <h2 className="font-mono text-2xl md:text-3xl tracking-tight max-w-2xl">
          One attacker, caught and blocked — step by step.
        </h2>
      </div>

      {/* Journey — pinned, multi-phase */}
      <div ref={journeyRef} style={{ height: `${N * 100}vh` }} className="relative">
        <div className="sticky top-0 h-screen flex flex-col">
          {/* controls: attack selector + progress + arrows */}
          <div className="pt-20 px-6">
            <div className="max-w-3xl mx-auto flex flex-col gap-4">
              {/* attack selector */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-[0.2em] text-neutral-400 mr-1">ATTACK</span>
                {ATTACKS.map((a) => (
                  <button key={a.id} onClick={() => setAttackId(a.id)}
                    className={`font-mono text-xs px-3 py-1.5 border transition-colors ${
                      a.id === attackId ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-300 text-neutral-500 hover:border-neutral-900 hover:text-neutral-900'
                    }`}>
                    {a.name}
                  </button>
                ))}
              </div>

              {/* progress row: arrows + phase label + bar */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => goTo(step - 1)} disabled={step === 0}
                    className="w-7 h-7 border border-neutral-900 font-mono text-sm flex items-center justify-center disabled:opacity-25 hover:bg-neutral-900 hover:text-white transition-colors">◀</button>
                  <button onClick={() => goTo(step + 1)} disabled={step === N - 1}
                    className="w-7 h-7 border border-neutral-900 font-mono text-sm flex items-center justify-center disabled:opacity-25 hover:bg-neutral-900 hover:text-white transition-colors">▶</button>
                </div>
                <span className="font-mono text-xs tracking-widest tabular-nums">
                  PHASE {String(step + 1).padStart(2, '0')}/{String(N).padStart(2, '0')} · {PHASE_LABELS[step].toUpperCase()}
                </span>
                <div className="flex-1 h-px bg-neutral-200 relative">
                  <motion.div className="absolute inset-y-0 left-0 bg-neutral-900" style={{ width: `${((step + 1) / N) * 100}%` }} />
                </div>
              </div>
              {/* phase dots */}
              <div className="flex items-center gap-1.5">
                {PHASE_LABELS.map((l, i) => (
                  <button key={l} onClick={() => goTo(i)}
                    className={`font-mono text-[10px] px-2 py-0.5 transition-colors ${i === step ? 'text-neutral-900' : 'text-neutral-300 hover:text-neutral-500'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* stage */}
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="w-full max-w-3xl"><Stage attack={attack} step={step} /></div>
          </div>

          {/* caption */}
          <div className="pb-16 px-6">
            <div className="max-w-3xl mx-auto min-h-[96px]">
              <AnimatePresence mode="wait">
                <motion.p key={`${attackId}-${step}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}
                  className="text-xl md:text-2xl leading-snug max-w-2xl">
                  {attack.captions[step]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Performance comparison */}
      <section className="max-w-5xl mx-auto px-6 py-28 border-t border-neutral-200">
        <p className="font-mono text-xs tracking-[0.25em] text-neutral-500 mb-3">PERFORMANCE · 8-CLASS · TEMPORAL SPLIT</p>
        <p className="text-neutral-600 max-w-xl mb-10 leading-relaxed">
          Three classifiers on the same deployment-realistic split — trained on the earliest traffic,
          tested on the latest.
        </p>
        <div className="border-t border-neutral-900">
          {MODELS.map((m) => {
            const pct = m.metrics.testMacroF1 * 100;
            return (
              <div key={m.id} className="grid grid-cols-[1fr_auto] gap-4 items-center py-4 border-b border-neutral-200">
                <div>
                  <div className="text-sm mb-2">{m.name}</div>
                  <div className="h-1 bg-neutral-100"><div className="h-full bg-neutral-900" style={{ width: `${pct}%` }} /></div>
                </div>
                <span className="font-mono text-sm tabular-nums whitespace-nowrap">
                  {m.metrics.testMacroF1.toFixed(3)} <span className="text-neutral-400 text-xs">macro F1</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-5xl mx-auto px-6 pb-28">
        <p className="font-mono text-xs tracking-[0.25em] text-neutral-500 mb-8">FAQ</p>
        <div className="border-t border-neutral-900">
          {FAQ.map((f, i) => (
            <div key={f.q} className="border-b border-neutral-200">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 py-5 text-left">
                <span className="text-base md:text-lg">{f.q}</span>
                <span className="font-mono text-lg text-neutral-400">{openFaq === i ? '–' : '+'}</span>
              </button>
              <AnimatePresence initial={false}>
                {openFaq === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                    <p className="text-neutral-600 leading-relaxed pb-5 max-w-2xl">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-10 flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.2em] text-neutral-400">PYTORCH · SCIKIT-LEARN · FASTAPI · NFTABLES</span>
          <span className="font-mono text-[10px] tracking-[0.2em] text-neutral-500">NEURAL·IDS</span>
        </div>
      </footer>
    </div>
  );
}
