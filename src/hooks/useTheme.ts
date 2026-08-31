import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  type ResolvedTheme,
  type ThemeMode,
  type UserSettings,
  loadSettings,
  saveSettings,
} from '../storage/settings';

export interface UseThemeResult {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (mode: ThemeMode) => void;
}

export function applyThemeToDocument(themeMode: ThemeMode = 'system'): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = themeMode === 'dark' || (themeMode === 'system' && mediaQuery.matches);
  const resolved: ResolvedTheme = isDark ? 'dark' : 'light';

  if (isDark) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  }

  return resolved;
}

export function useTheme(externalSettings?: UserSettings): UseThemeResult {
  const currentMode = externalSettings?.global?.theme || loadSettings().global.theme || 'system';
  const [themeMode, setThemeMode] = useState<ThemeMode>(currentMode);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    applyThemeToDocument(currentMode),
  );

  // 同步外部设置传入的变更并即时应用
  useEffect(() => {
    const nextTheme = externalSettings?.global?.theme ?? 'system';
    setThemeMode(nextTheme);
    const nextResolved = applyThemeToDocument(nextTheme);
    setResolvedTheme(nextResolved);
  }, [externalSettings?.global?.theme]);

  // 监听系统深浅色偏好变更
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleMediaChange = () => {
      const activeMode = externalSettings?.global?.theme || loadSettings().global.theme || 'system';
      if (activeMode === 'system') {
        const nextResolved = applyThemeToDocument('system');
        setResolvedTheme(nextResolved);
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [externalSettings?.global?.theme]);

  const setTheme = useCallback((newMode: ThemeMode) => {
    setThemeMode(newMode);
    const nextResolved = applyThemeToDocument(newMode);
    setResolvedTheme(nextResolved);

    const current = loadSettings();
    const updated: UserSettings = {
      ...current,
      global: {
        ...current.global,
        theme: newMode,
      },
    };
    saveSettings(updated);
  }, []);

  return {
    themeMode,
    resolvedTheme,
    setTheme,
  };
}
