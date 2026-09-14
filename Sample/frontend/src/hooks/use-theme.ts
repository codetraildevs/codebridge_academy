import { useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'qualexas-theme';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

/** Read the stored preference once, apply it immediately (before React mounts). */
export function initTheme() {
  const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'system';
  applyTheme(stored);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'system';
  });

  // Reapply whenever theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  }, []);

  const resolvedTheme: 'light' | 'dark' =
    theme === 'system' ? getSystemTheme() : theme;

  return { theme, resolvedTheme, setTheme };
}
