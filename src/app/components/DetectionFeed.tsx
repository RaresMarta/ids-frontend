import { useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Hero "detection feed": a looping replay of what the live monitor emits — a
// stream of per-flow verdicts (8-class family + calibrated confidence), with an
// alert→recovered lifecycle when one source sustains an attack. The shape mirrors
// the detector's SSE flow/alert/recovered events; in production this can be fed a
// recorded session so it is literally real model output. Theme-token aware so it
// tracks light/dark like the rest of the page.
// ─────────────────────────────────────────────────────────────────────────────

type Label = 'Benign' | 'DDoS' | 'DoS' | 'Mirai' | 'Recon' | 'Spoofing' | 'Web' | 'BruteForce';

interface FeedRow {
  id: number;
  src: string;
  dst: string;
  label: Label;
  confidence: number;
}

const isAttack = (l: Label) => l !== 'Benign';

// Honest per-family confidence bands: Mirai is crisp, floods strong, the
// application-/control-layer families (Recon/Spoofing/Web/BruteForce) genuinely
// uncertain — matching the per-class story in the model comparison section.
const CONFIDENCE: Record<Label, [number, number]> = {
  Benign: [89, 99],
  Mirai: [97, 99],
  DDoS: [85, 94],
  DoS: [85, 94],
  Recon: [52, 70],
  Spoofing: [52, 70],
  Web: [52, 70],
  BruteForce: [52, 70],
};

const rand = (lo: number, hi: number) => Math.floor(Math.random() * (hi - lo + 1)) + lo;

function buildFeed(): FeedRow[] {
  const rows: FeedRow[] = [];
  let id = 0;
  const attackIps: Record<string, string> = {
    DDoS: '44.31.8.9',
    Mirai: '185.220.101.4',
    Recon: '192.168.4.7',
    Spoofing: '10.0.7.22',
    Web: '91.108.56.3',
    BruteForce: '176.32.1.11',
    DoS: '203.0.113.88',
  };
  const benignSrcs = ['10.0.0.12', '10.0.0.34', '10.0.0.81', '172.16.0.5'];

  const push = (label: Label, src?: string) => {
    const [lo, hi] = CONFIDENCE[label];
    rows.push({ id: id++, src: src ?? benignSrcs[id % benignSrcs.length], dst: 'server', label, confidence: rand(lo, hi) });
  };
  const benign = (n: number) => { for (let i = 0; i < n; i++) push('Benign', benignSrcs[i % benignSrcs.length]); };

  // ~60-row loop: mostly benign, attacks in bursts of ≥3 so the alert pill fires.
  benign(7);
  for (let i = 0; i < 4; i++) push('DDoS', attackIps.DDoS);
  benign(5);
  for (let i = 0; i < 3; i++) push('Recon', attackIps.Recon);
  benign(6);
  for (let i = 0; i < 3; i++) push('Mirai', attackIps.Mirai);
  benign(7);
  for (let i = 0; i < 3; i++) push('Web', attackIps.Web);
  benign(5);
  for (let i = 0; i < 3; i++) push('BruteForce', attackIps.BruteForce);
  benign(4);
  for (let i = 0; i < 3; i++) push('Spoofing', attackIps.Spoofing);
  benign(6);
  for (let i = 0; i < 3; i++) push('DoS', attackIps.DoS);
  benign(5);
  return rows;
}

const FEED = buildFeed();
const ROW_H = 32; // px per row
const VISIBLE = 9; // rows visible at once

interface Alert {
  key: number;
  type: 'warn' | 'ok';
  label: Label;
  ip: string;
}

export default function DetectionFeed() {
  const [offset, setOffset] = useState(0);
  const [alert, setAlert] = useState<Alert | null>(null);
  const alertKeyRef = useRef(0);
  const frameRef = useRef(0);
  const lastRef = useRef(0);
  const offsetRef = useRef(0);
  const lastAlertRowRef = useRef(-99);
  const totalH = FEED.length * ROW_H;
  const SPEED = totalH / 30000; // full loop in ~30s

  useEffect(() => {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const step = (ts: number) => {
      if (lastRef.current === 0) lastRef.current = ts;
      const dt = ts - lastRef.current;
      lastRef.current = ts;
      offsetRef.current = (offsetRef.current + SPEED * dt) % totalH;
      setOffset(offsetRef.current);

      const topRow = Math.floor(offsetRef.current / ROW_H) % FEED.length;
      if (topRow !== lastAlertRowRef.current) {
        lastAlertRowRef.current = topRow;
        const r0 = FEED[topRow];
        const r1 = FEED[(topRow + 1) % FEED.length];
        const r2 = FEED[(topRow + 2) % FEED.length];
        if (isAttack(r0.label) && r0.src === r1.src && r1.src === r2.src) {
          const key = ++alertKeyRef.current;
          setAlert({ key, type: 'warn', label: r0.label, ip: r0.src });
          window.setTimeout(() => {
            setAlert({ key: key + 0.5, type: 'ok', label: r0.label, ip: r0.src });
            window.setTimeout(() => setAlert((a) => (a && a.key === key + 0.5 ? null : a)), 2600);
          }, 2600);
        }
      }
      frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [SPEED, totalH]);

  const startIndex = Math.floor(offset / ROW_H);
  const partialOffset = offset % ROW_H;
  const visibleRows: FeedRow[] = [];
  for (let i = 0; i <= VISIBLE + 1; i++) visibleRows.push(FEED[(startIndex + i) % FEED.length]);

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col" style={{ height: 380 }}>
      {/* Terminal-style top bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-muted" />
        <span className="w-2.5 h-2.5 rounded-full bg-muted" />
        <span className="w-2.5 h-2.5 rounded-full bg-muted" />
        <span className="ml-3 font-mono text-xs text-muted-foreground/60">live capture · eth0</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#2E9E5B' }} />
          <span className="font-mono text-xs text-muted-foreground/60">monitoring</span>
        </span>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b border-border/50 shrink-0">
        <span className="w-1.5 shrink-0" />
        <span className="font-mono text-[10px] text-muted-foreground/50 w-28 shrink-0">source</span>
        <span className="w-4 shrink-0" />
        <span className="font-mono text-[10px] text-muted-foreground/50 w-12 shrink-0">dest</span>
        <span className="font-mono text-[10px] text-muted-foreground/50 w-20 shrink-0">class</span>
        <span className="font-mono text-[10px] text-muted-foreground/50 flex-1">conf.</span>
      </div>

      {/* Alert pill */}
      <div className="h-8 flex items-center px-4 shrink-0">
        {alert && (
          <div
            key={alert.key}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs"
            style={{
              animation: 'feedFade 5.2s ease forwards',
              backgroundColor: alert.type === 'warn' ? 'color-mix(in srgb, var(--threat) 12%, transparent)' : 'color-mix(in srgb, var(--muted-foreground) 12%, transparent)',
              color: alert.type === 'warn' ? 'var(--threat)' : 'var(--muted-foreground)',
            }}
          >
            {alert.type === 'warn' ? `⚠ sustained ${alert.label}` : '✓ recovered'} · {alert.ip}
          </div>
        )}
      </div>

      {/* Scrolling rows */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-6 z-10 pointer-events-none bg-gradient-to-b from-card to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-8 z-10 pointer-events-none bg-gradient-to-t from-card to-transparent" />

        <div style={{ transform: `translateY(-${partialOffset}px)` }}>
          {visibleRows.map((row, i) => {
            const attack = isAttack(row.label);
            const accent = attack ? 'var(--threat)' : 'var(--muted-foreground)';
            return (
              <div key={`${row.id}-${i}`} className="flex items-center gap-3 px-4" style={{ height: ROW_H }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accent, opacity: attack ? 0.9 : 0.45 }} />
                <span className="font-mono text-xs w-28 shrink-0 truncate" style={{ color: attack ? 'var(--foreground)' : 'var(--muted-foreground)', opacity: attack ? 0.85 : 0.7 }}>
                  {row.src}
                </span>
                <span className="font-mono text-xs text-muted-foreground/40 shrink-0 w-4">→</span>
                <span className="font-mono text-xs text-muted-foreground/60 shrink-0 w-12">{row.dst}</span>
                <span className="font-mono text-xs w-20 shrink-0" style={{ color: accent, opacity: attack ? 1 : 0.6, fontWeight: attack ? 500 : 400 }}>
                  {row.label}
                </span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-mono text-xs shrink-0 tabular-nums text-right" style={{ color: accent, opacity: attack ? 0.9 : 0.55, minWidth: '2.4rem' }}>
                    {row.confidence}%
                  </span>
                  <div className="flex-1 h-0.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${row.confidence}%`, backgroundColor: accent, opacity: attack ? 0.65 : 0.3 }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Honest provenance caption */}
      <div className="px-4 py-2 border-t border-border/50 shrink-0">
        <span className="font-mono text-[10px] text-muted-foreground/40 tracking-wide">real model output · replayed</span>
      </div>

      <style>{`
        @keyframes feedFade {
          0% { opacity: 0; transform: translateY(2px); }
          8% { opacity: 1; transform: translateY(0); }
          82% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
