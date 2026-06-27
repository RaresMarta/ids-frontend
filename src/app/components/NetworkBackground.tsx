import { useEffect, useRef } from 'react';

/**
 * Subtle drifting-topology backdrop for the auth panels. Reads its accent from
 * the theme tokens; the app is single light theme.
 */
export default function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const css = getComputedStyle(document.documentElement);
    const get = (n: string, fb: string) => css.getPropertyValue(n).trim() || fb;
    // node + link colours expressed as rgba so we can fade by distance.
    const nodeRgb = '38, 38, 36';
    const linkBase = get('--primary', '#c15f3c');
    const linkRgb = (() => {
      const m = linkBase.replace('#', '');
      if (m.length < 6) return '193, 95, 60';
      return `${parseInt(m.slice(0, 2), 16)}, ${parseInt(m.slice(2, 4), 16)}, ${parseInt(m.slice(4, 6), 16)}`;
    })();
    const trailRgb = '250, 249, 245';

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const nodes: { x: number; y: number; vx: number; vy: number }[] = [];
    const nodeCount = 35;
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      });
    }

    let frameId: number;
    const animate = () => {
      ctx.fillStyle = `rgba(${trailRgb}, 0.15)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, 1.8, 0, Math.PI * 2);
        // soft clay glow so nodes read on a projector / in screenshots.
        ctx.shadowColor = `rgba(${linkRgb}, 0.5)`;
        ctx.shadowBlur = 6;
        ctx.fillStyle = `rgba(${nodeRgb}, 0.55)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 140) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(${linkRgb}, ${0.32 * (1 - distance / 140)})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      }

      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: 'var(--background)' }}
    />
  );
}
