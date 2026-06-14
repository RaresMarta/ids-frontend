import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CircleUserRound, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

/**
 * Logged-in account indicator for the public landing nav — a generic user icon
 * that opens a small menu (jump to dashboard / sign out). Replaces the "Sign in"
 * button once a Supabase session exists.
 */
export default function UserMenu() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate('/');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <CircleUserRound className="w-5 h-5" />
      </button>

      {open && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 mt-2 w-52 z-50 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
            {user?.email && (
              <div className="px-3 py-2 border-b border-border">
                <p className="text-[11px] text-muted-foreground">Signed in as</p>
                <p className="font-mono text-xs text-foreground truncate">{user.email}</p>
              </div>
            )}
            <button
              onClick={() => {
                setOpen(false);
                navigate('/dashboard');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
            >
              <LayoutDashboard className="w-4 h-4 text-muted-foreground shrink-0" />
              Dashboard
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
            >
              <LogOut className="w-4 h-4 text-muted-foreground shrink-0" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
