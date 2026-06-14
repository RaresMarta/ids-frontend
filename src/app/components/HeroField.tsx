import { useEffect, useRef } from 'react';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Ambient, self-animating hero motif — symbolic, not a labelled diagram.
 * A constellation of nodes with packets flowing along the links between them
 * (traffic). Every few seconds a silent "detection" wave ripples out from one
 * node: as the front sweeps past, nodes, links and the packets riding them
 * flare clay → red, then settle back to calm. Elements interact with each
 * other; nothing is labelled. Palette is read from theme tokens.
 */
export default function HeroField() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let disposed = false;
    let raf = 0;

    const css = getComputedStyle(document.documentElement);
    const rgb = (name: string, fb: [number, number, number]): [number, number, number] => {
      const v = css.getPropertyValue(name).trim().replace('#', '');
      if (v.length >= 6) return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
      return fb;
    };
    const INK = rgb('--foreground', [38, 38, 36]);
    const CLAY = rgb('--primary', [193, 95, 60]);
    const RED = rgb('--threat', [192, 57, 43]);
    const GREEN = rgb('--safe', [46, 158, 91]);
    const rgba = (c: number[], a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
    const mix = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

    let W = 0;
    let H = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.max(1, (W * dpr) | 0);
      canvas.height = Math.max(1, (H * dpr) | 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Nodes live in normalized [0,1] space; drift gently and bounce at the edges.
    const NCOUNT = 26;
    const nodes = Array.from({ length: NCOUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00016,
      vy: (Math.random() - 0.5) * 0.00016,
      ph: Math.random() * 6.28,
    }));
    const DIST = 0.24; // normalized link distance

    type Pk = { a: number; b: number; t: number; sp: number };
    const packets: Pk[] = [];
    let lastSpawn = 0;

    // Detection wave.
    const WAVE_MS = 2100;
    const WAVE_REACH = 0.78; // fraction of the diagonal the front travels
    let anomaly: { x: number; y: number; start: number } | null = null;
    let nextAnomaly = performance.now() + 2200 + Math.random() * 1500;

    const draw = (t: number) => {
      if (disposed) return;
      ctx.clearRect(0, 0, W, H);

      const diag = Math.hypot(W, H);
      const BAND = 0.13 * diag;

      // wave lifecycle
      if (!anomaly && t > nextAnomaly) {
        const n = nodes[(Math.random() * nodes.length) | 0];
        anomaly = { x: n.x, y: n.y, start: t };
        nextAnomaly = t + 5200 + Math.random() * 3800;
      }
      let frontPx = -1;
      let waveA = 0;
      if (anomaly) {
        const e = (t - anomaly.start) / WAVE_MS;
        if (e >= 1) anomaly = null;
        else {
          frontPx = e * WAVE_REACH * diag;
          waveA = 1 - e;
        }
      }
      const ax = anomaly ? anomaly.x * W : 0;
      const ay = anomaly ? anomaly.y * H : 0;
      const chargeAt = (px: number, py: number) =>
        anomaly ? Math.max(0, 1 - Math.abs(Math.hypot(px - ax, py - ay) - frontPx) / BAND) * waveA : 0;

      // update node positions
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0.03 || n.x > 0.97) n.vx *= -1;
        if (n.y < 0.05 || n.y > 0.95) n.vy *= -1;
      }
      const PX = (n: { x: number }) => n.x * W;
      const PY = (n: { y: number }) => n.y * H;

      // links
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d >= DIST) continue;
          const prox = 1 - d / DIST;
          const mx = ((a.x + b.x) / 2) * W;
          const my = ((a.y + b.y) / 2) * H;
          const ch = chargeAt(mx, my);
          if (ch > 0.02) {
            ctx.strokeStyle = rgba(mix(CLAY, RED, ch), 0.12 + ch * 0.55);
            ctx.lineWidth = 0.7 + ch * 0.9;
          } else {
            ctx.strokeStyle = rgba(INK, 0.04 + prox * 0.06);
            ctx.lineWidth = 0.7;
          }
          ctx.beginPath();
          ctx.moveTo(PX(a), PY(a));
          ctx.lineTo(PX(b), PY(b));
          ctx.stroke();
        }
      }

      // spawn a packet on a random existing link
      if (t - lastSpawn > 220 && packets.length < 38) {
        const i = (Math.random() * nodes.length) | 0;
        const cand: number[] = [];
        for (let j = 0; j < nodes.length; j++) {
          if (j !== i && Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y) < DIST) cand.push(j);
        }
        if (cand.length) {
          packets.push({ a: i, b: cand[(Math.random() * cand.length) | 0], t: 0, sp: 0.005 + Math.random() * 0.006 });
        }
        lastSpawn = t;
      }
      // packets
      for (let k = packets.length - 1; k >= 0; k--) {
        const p = packets[k];
        p.t += p.sp;
        if (p.t >= 1) {
          packets.splice(k, 1);
          continue;
        }
        const a = nodes[p.a];
        const b = nodes[p.b];
        const px = (a.x + (b.x - a.x) * p.t) * W;
        const py = (a.y + (b.y - a.y) * p.t) * H;
        const ch = chargeAt(px, py);
        const c = ch > 0.18 ? RED : CLAY;
        if (ch > 0.18) {
          ctx.shadowColor = rgba(RED, 0.8);
          ctx.shadowBlur = 9;
        }
        ctx.fillStyle = rgba(c, 0.85);
        ctx.beginPath();
        ctx.arc(px, py, ch > 0.18 ? 2.9 : 2.0, 0, 6.2832);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // nodes
      for (const n of nodes) {
        const px = PX(n);
        const py = PY(n);
        const ch = chargeAt(px, py);
        const r = 1.9 + ch * 2.4 + Math.sin(t * 0.0018 + n.ph) * 0.35;
        if (ch > 0.02) {
          if (ch > 0.4) {
            ctx.shadowColor = rgba(RED, 0.7);
            ctx.shadowBlur = 11;
          }
          ctx.fillStyle = rgba(mix(CLAY, RED, ch), 0.55 + ch * 0.45);
        } else {
          ctx.fillStyle = rgba(INK, 0.28);
        }
        ctx.beginPath();
        ctx.arc(px, py, r, 0, 6.2832);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // expanding shockwave + a calm green pulse at the epicentre once it passes
      if (anomaly && frontPx > 0) {
        ctx.strokeStyle = rgba(RED, 0.3 * waveA);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ax, ay, frontPx, 0, 6.2832);
        ctx.stroke();
        ctx.fillStyle = rgba(waveA > 0.5 ? RED : GREEN, 0.5 * waveA);
        ctx.beginPath();
        ctx.arc(ax, ay, 3, 0, 6.2832);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [theme]);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}
