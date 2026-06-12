import { useEffect, useState } from 'react';
import { ArrowDown, Ban, Eye } from 'lucide-react';
import { ATTACK_COLORS } from '../../data/models';
import { toMs, type ActiveAttacker, type BannedEntry } from './types';

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

const fmtCountdown = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function FamilyDot({ family }: { family: string }) {
  const c = ATTACK_COLORS[family] ?? '#6B6E7A';
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: c }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c }} />
      {family}
    </span>
  );
}

export default function BlocklistPanel({
  banned,
  detected,
}: {
  banned: BannedEntry[];
  detected: ActiveAttacker[];
}) {
  const now = useNow();
  const bannedIps = new Set(banned.map((b) => b.ip));
  // Detected = under attack but not (yet) on the enforcer's blocklist.
  const pending = detected.filter((a) => !bannedIps.has(a.ip));

  return (
    <div className="bg-card border border-border rounded-md flex flex-col overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Detected → Blocked
        </p>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[380px] p-4 space-y-4">
        {/* Detected */}
        <div>
          <p className="flex items-center gap-1.5 text-[11px] text-[#FBBF24] mb-2">
            <Eye className="w-3 h-3" /> Detected{' '}
            <span className="font-mono text-muted-foreground">({pending.length})</span>
          </p>
          {pending.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/60 pl-4">none</p>
          ) : (
            <ul className="space-y-1.5">
              {pending.map((a) => (
                <li
                  key={a.ip}
                  className="flex items-center justify-between rounded-md border border-[#FBBF24]/20 bg-[#FBBF24]/5 px-3 py-2"
                >
                  <span className="font-mono text-xs text-foreground">{a.ip}</span>
                  <FamilyDot family={a.family} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-center">
          <ArrowDown className="w-3.5 h-3.5 text-muted-foreground/40" />
        </div>

        {/* Blocked */}
        <div>
          <p className="flex items-center gap-1.5 text-[11px] text-[#DC4C4C] mb-2">
            <Ban className="w-3 h-3" /> Blocked{' '}
            <span className="font-mono text-muted-foreground">({banned.length})</span>
          </p>
          {banned.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/60 pl-4">blocklist empty</p>
          ) : (
            <ul className="space-y-1.5">
              {banned.map((b) => {
                const expiresMs = toMs(b.expires_at);
                const bannedMs = toMs(b.banned_at);
                const remaining = expiresMs - now;
                const fraction = Math.min(1, Math.max(0, remaining / Math.max(1, expiresMs - bannedMs)));
                return (
                  <li
                    key={b.ip}
                    className="rounded-md border border-[#DC4C4C]/20 bg-[#DC4C4C]/5 px-3 py-2 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-foreground">{b.ip}</span>
                      <FamilyDot family={b.family} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-muted rounded-sm overflow-hidden">
                        <div
                          className="h-full rounded-sm bg-[#DC4C4C]/70 transition-[width] duration-1000 ease-linear"
                          style={{ width: `${fraction * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                        {fmtCountdown(remaining)}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground/60 shrink-0">
                        {b.hit_count} hits
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
