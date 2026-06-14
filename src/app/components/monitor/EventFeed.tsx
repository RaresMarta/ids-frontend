import { motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, ShieldCheck, ShieldX } from 'lucide-react';
import { ATTACK_COLORS } from '../../data/models';
import { MITRE_TAGS, toMs, type FeedItem, type StreamEvent } from './types';

const MAX_ROWS = 60;

/** Malicious events rank above benign flows; insertion order (newest first) is kept within each bucket. */
function bucket(evt: StreamEvent): number {
  if (evt.type === 'flow') return evt.gate === 'block' ? 0 : 1;
  return 0; // alert / recovered are incident-lifecycle events
}

const fmtTime = (ts: number) =>
  new Date(toMs(ts)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function FamilyChip({ family }: { family: string }) {
  const c = ATTACK_COLORS[family] ?? 'var(--muted-foreground)';
  const mitre = MITRE_TAGS[family];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] shrink-0" style={{ color: c }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c }} />
      {family}
      {mitre && <span className="font-mono text-[9px] text-muted-foreground/70">{mitre}</span>}
    </span>
  );
}

function Row({ evt }: { evt: StreamEvent }) {
  switch (evt.type) {
    case 'flow': {
      const blocked = evt.gate === 'block';
      const Icon = blocked ? ShieldX : ShieldCheck;
      return (
        <>
          <Icon className={`w-3.5 h-3.5 shrink-0 ${blocked ? 'text-threat' : 'text-muted-foreground/50'}`} />
          <span className="font-mono text-[11px] text-muted-foreground shrink-0">{fmtTime(evt.ts)}</span>
          <span className="font-mono text-[11px] text-foreground/70 truncate flex-1">
            {evt.src} → {evt.dst}
          </span>
          {blocked ? (
            <FamilyChip family={evt.family} />
          ) : (
            <span className="text-[11px] text-muted-foreground/50 shrink-0">benign</span>
          )}
          <span className="font-mono text-[10px] text-muted-foreground w-9 text-right shrink-0">
            {(evt.gate_confidence * 100).toFixed(0)}%
          </span>
        </>
      );
    }
    case 'alert':
      return (
        <>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-threat" />
          <span className="font-mono text-[11px] text-muted-foreground shrink-0">{fmtTime(evt.ts)}</span>
          <span className="text-[11px] text-foreground truncate flex-1">
            Attack detected from <span className="font-mono">{evt.attacker_ip}</span>
          </span>
          <FamilyChip family={evt.family} />
          <span className="font-mono text-[10px] text-muted-foreground w-9 text-right shrink-0">
            {(evt.confidence * 100).toFixed(0)}%
          </span>
        </>
      );
    case 'recovered':
      return (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-safe" />
          <span className="font-mono text-[11px] text-muted-foreground shrink-0">{fmtTime(evt.ts)}</span>
          <span className="text-[11px] text-foreground/70 truncate flex-1">
            <span className="font-mono">{evt.attacker_ip}</span> recovered — source quiet
          </span>
        </>
      );
  }
}

export default function EventFeed({ items }: { items: FeedItem[] }) {
  const ranked = [...items].sort((a, b) => bucket(a.evt) - bucket(b.evt)).slice(0, MAX_ROWS);

  return (
    <div className="bg-card border border-border rounded-md flex flex-col overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Event feed</p>
        <span className="font-mono text-[10px] text-muted-foreground/60">malicious first · newest on top</span>
      </div>
      <ul className="flex-1 overflow-y-auto max-h-[380px] divide-y divide-border">
        {ranked.length === 0 && (
          <li className="px-5 py-8 text-center text-xs text-muted-foreground">No events yet</li>
        )}
        {ranked.map(({ seq, evt }) => (
          <motion.li
            key={seq}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`px-5 py-2 flex items-center gap-2.5 ${
              evt.type === 'flow' && evt.gate === 'allow' ? 'opacity-70' : ''
            }`}
          >
            <Row evt={evt} />
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
