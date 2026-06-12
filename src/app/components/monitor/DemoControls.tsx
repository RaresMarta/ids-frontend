import { useEffect, useState } from 'react';
import { Syringe } from 'lucide-react';
import { ATTACK_COLORS } from '../../data/models';

const FALLBACK_FAMILIES = ['DDoS', 'DoS', 'Mirai', 'Recon'];

/** Simulate-mode only: POST /api/inject {family, count} buttons. */
export default function DemoControls({
  baseUrl,
  inject,
}: {
  baseUrl: string;
  inject: (family: string, count?: number) => Promise<void>;
}) {
  const [families, setFamilies] = useState<string[]>(FALLBACK_FAMILIES);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    fetch(`${baseUrl}/api/families`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (disposed) return;
        const list = Array.isArray(d) ? d : (d?.families ?? []);
        if (Array.isArray(list) && list.length) setFamilies(list.filter((f: string) => f !== 'Benign'));
      })
      .catch(() => {
        // keep fallback
      });
    return () => {
      disposed = true;
    };
  }, [baseUrl]);

  const handleInject = async (family: string) => {
    setBusy(family);
    try {
      await inject(family, 30);
    } finally {
      window.setTimeout(() => setBusy(null), 600);
    }
  };

  return (
    <div className="bg-card border border-dashed border-border rounded-md px-5 py-4 flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
        <Syringe className="w-3.5 h-3.5" /> Demo controls
        <span className="font-mono text-[10px] text-muted-foreground/60">simulate mode · inject 30 flows</span>
      </span>
      {families.map((family) => {
        const c = ATTACK_COLORS[family] ?? '#6B6E7A';
        return (
          <button
            key={family}
            onClick={() => handleInject(family)}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs transition-colors disabled:opacity-50 hover:bg-muted/40"
            style={{ borderColor: `${c}55`, color: c }}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c }} />
            {busy === family ? 'injecting…' : family}
          </button>
        );
      })}
    </div>
  );
}
