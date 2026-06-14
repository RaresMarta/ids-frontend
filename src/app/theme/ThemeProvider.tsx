import { createContext, useContext, useEffect } from 'react';

// Theme switching has been removed: the app renders the single cream/light theme
// everywhere. The context API is kept (theme/setTheme/toggle) as no-ops so existing
// consumers of useTheme keep working without changes; `theme` is always 'light'.

export type Theme = 'light';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t?: Theme) => void;
  toggle: () => void;
}

const VALUE: ThemeContextValue = { theme: 'light', setTheme: () => {}, toggle: () => {} };

const ThemeContext = createContext<ThemeContextValue>(VALUE);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Force light regardless of any previously persisted preference.
    const root = document.documentElement;
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
    try {
      localStorage.removeItem('ids-theme');
    } catch {
      // storage may be unavailable; nothing to clear.
    }
  }, []);

  return <ThemeContext.Provider value={VALUE}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
