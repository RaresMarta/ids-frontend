import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import Sidebar from './Sidebar';

type ActivePage = 'analysis' | 'monitor';

/**
 * Standard authenticated page frame: fixed-height viewport shell with the sidebar
 * pinned and a single internal scroll region (see PageBody). Pins to `h-screen`
 * (not `min-h-screen`) so the chrome never scrolls away — the same model the live
 * monitor uses.
 */
export function AppShell({ active, children }: { active: ActivePage; children: ReactNode }) {
  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar active={active} />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">{children}</main>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Optional back link rendered to the left of the title. */
  back?: { to: string; label: string };
}

export function PageHeader({ title, subtitle, actions, back }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="flex items-center justify-between gap-4 px-8 py-5 border-b border-border shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        {back && (
          <>
            <button
              onClick={() => navigate(back.to)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {back.label}
            </button>
            <div className="w-px h-4 bg-border shrink-0" />
          </>
        )}
        <div className="min-w-0">
          <h2 className="font-display text-lg text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}

/** The single scroll region inside an AppShell. */
export function PageBody({ children }: { children: ReactNode }) {
  return <div className="flex-1 min-h-0 overflow-y-auto p-8">{children}</div>;
}
