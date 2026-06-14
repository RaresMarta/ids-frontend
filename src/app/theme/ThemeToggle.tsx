import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

/**
 * Light ⇄ dark switch. Light is the brand default; dark is the alternate.
 * `variant="bare"` drops the border for use inside denser chrome (sidebar).
 */
export default function ThemeToggle({
  variant = 'outlined',
  className = '',
}: {
  variant?: 'outlined' | 'bare';
  className?: string;
}) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  const base =
    variant === 'outlined'
      ? 'border border-border hover:bg-muted text-muted-foreground hover:text-foreground'
      : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors ${base} ${className}`}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
