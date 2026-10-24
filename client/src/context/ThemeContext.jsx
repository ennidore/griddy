import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const KEY = 'griddy.theme';
const LEGACY_KEYS = ['lettero.theme', 'slovca.theme'];
const DEFAULTS = { mode: 'system', lightBg: 'borovnica', darkBg: 'noc' };
// Background ids that were renamed; saved preferences are carried over.
const RENAMED = { papir: 'borovnica', menta: 'jabuka' };

function load() {
  try {
    const stored = [KEY, ...LEGACY_KEYS].map((k) => localStorage.getItem(k)).find((v) => v != null);
    const saved = { ...DEFAULTS, ...JSON.parse(stored ?? 'null') };
    return { ...saved, lightBg: RENAMED[saved.lightBg] || saved.lightBg };
  } catch {
    return DEFAULTS;
  }
}

const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

/**
 * Theme = mode (light / dark / system) + one chosen background per mode.
 * Applied as <html data-bg="…">; index.css maps each background to tokens.
 */
export function ThemeProvider({ children }) {
  const [prefs, setPrefs] = useState(load);
  const [osDark, setOsDark] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = (e) => setOsDark(e.matches);
    mq?.addEventListener('change', onChange);
    return () => mq?.removeEventListener('change', onChange);
  }, []);

  const isDark = prefs.mode === 'dark' || (prefs.mode === 'system' && osDark);
  const background = isDark ? prefs.darkBg : prefs.lightBg;

  useEffect(() => {
    document.documentElement.dataset.bg = background;
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [background, isDark, prefs]);

  const update = (patch) => setPrefs((p) => ({ ...p, ...patch }));
  const toggleDark = () => update({ mode: isDark ? 'light' : 'dark' });

  return (
    <ThemeContext.Provider value={{ prefs, isDark, background, update, toggleDark }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
