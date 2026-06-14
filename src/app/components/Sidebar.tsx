import { useNavigate } from 'react-router';
import { Shield, BarChart3, FileText, Scale, Activity, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  active: 'dashboard' | 'analysis' | 'compare' | 'monitor';
}

export default function Sidebar({ active }: SidebarProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/dashboard' },
    { id: 'analysis', label: 'Analysis', icon: FileText, path: '/analysis' },
    { id: 'compare', label: 'Compare', icon: Scale, path: '/compare' },
    { id: 'monitor', label: 'Live Monitor', icon: Activity, path: '/monitor' },
  ];

  return (
    <aside className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
      <button
        onClick={() => navigate('/')}
        title="Back to home"
        className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border w-full text-left hover:bg-foreground/5 transition-colors"
      >
        <Shield className="w-5 h-5 text-primary shrink-0" />
        <span className="font-display text-sm tracking-wide text-foreground">Neural IDS</span>
      </button>

      <nav className="flex-1 p-3 space-y-0.5">
        {items.map(({ id, label, icon: Icon, path }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => !isActive && navigate(path)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-foreground/5'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-1">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-foreground/5 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
