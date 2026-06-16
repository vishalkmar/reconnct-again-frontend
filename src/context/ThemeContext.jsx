import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

const ThemeContext = createContext();

const DEFAULT_THEME = {
  brand: '224 169 46',
  brandLight: '240 201 105',
  brandDark: '176 130 28',
  wellness: '198 150 40',
  wellnessLight: '235 205 120',
  wellnessDark: '160 118 28',
  accent: '224 169 46',
  ink: '24 24 27',
  inkMuted: '113 113 122',
  surface: '255 255 255',
  surfaceAlt: '247 247 244',
};

const THEME_VAR_MAP = {
  brand: '--brand',
  brandLight: '--brand-light',
  brandDark: '--brand-dark',
  wellness: '--wellness',
  wellnessLight: '--wellness-light',
  wellnessDark: '--wellness-dark',
  accent: '--accent',
  ink: '--ink',
  inkMuted: '--ink-muted',
  surface: '--surface',
  surfaceAlt: '--surface-alt',
};

const applyTheme = (theme) => {
  const root = document.documentElement;
  Object.entries(theme).forEach(([key, value]) => {
    const cssVar = THEME_VAR_MAP[key];
    if (cssVar) root.style.setProperty(cssVar, value);
  });
};

// Bump this whenever the DEFAULT_THEME shape/values change so old cached
// themes in users' browsers don't override the new defaults.
const THEME_VERSION = 'v4-reconnct-gold';
const STORAGE_KEY = 'site_theme';
const VERSION_KEY = 'site_theme_version';

const readCachedTheme = () => {
  try {
    const cachedVersion = localStorage.getItem(VERSION_KEY);
    if (cachedVersion !== THEME_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(VERSION_KEY, THEME_VERSION);
      return DEFAULT_THEME;
    }
    const cached = localStorage.getItem(STORAGE_KEY);
    return cached ? { ...DEFAULT_THEME, ...JSON.parse(cached) } : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

// Apply once at module load so the first paint is already themed (no flash
// of the hard-coded defaults).
applyTheme(readCachedTheme());

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(readCachedTheme);
  const lastSavedRef = useRef(JSON.stringify(theme));

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // NOTE: This dashboards-only build has no admin Theme Management module, so
  // the local DEFAULT_THEME is the single source of truth. We deliberately do
  // NOT fetch /theme from the backend here — doing so would let the sibling
  // project's saved theme override the Reconnct gold palette.

  // Cross-tab sync: keep the palette consistent if it ever changes in one tab.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const next = { ...DEFAULT_THEME, ...JSON.parse(e.newValue) };
        lastSavedRef.current = e.newValue;
        setTheme(next);
      } catch { /* ignore */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const updateTheme = useCallback((partial) => {
    setTheme((prev) => {
      const next = { ...prev, ...partial };
      const s = JSON.stringify(next);
      lastSavedRef.current = s;
      localStorage.setItem(STORAGE_KEY, s);
      return next;
    });
  }, []);

  const replaceTheme = useCallback((next) => {
    const merged = { ...DEFAULT_THEME, ...next };
    const s = JSON.stringify(merged);
    lastSavedRef.current = s;
    setTheme(merged);
    localStorage.setItem(STORAGE_KEY, s);
  }, []);

  // Preview only — does not persist to localStorage. Used by admin theme editor.
  const previewTheme = useCallback((next) => {
    applyTheme({ ...DEFAULT_THEME, ...next });
  }, []);

  const resetTheme = useCallback(() => {
    const s = JSON.stringify(DEFAULT_THEME);
    lastSavedRef.current = s;
    setTheme(DEFAULT_THEME);
    localStorage.setItem(STORAGE_KEY, s);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        updateTheme,
        replaceTheme,
        previewTheme,
        resetTheme,
        defaultTheme: DEFAULT_THEME,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
