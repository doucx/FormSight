import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  type ResolvedTheme,
  type ThemeMode,
  type UserSettings,
  loadSettings,
  saveSettings,
} from '../utils/settings';

export interface UseThemeResult {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (mode: ThemeMode) => void;
}

export function useTheme(externalSettings?: UserSettings): UseThemeResult {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return externalSettings?.global?.theme || loadSettings().global.theme || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (typeof window === 'undefined') return 'light';
    const initialMode = externalSettings?.global?.theme || loadSettings().global.theme || 'system';
    if (initialMode === 'dark') return 'dark';
    if (initialMode === 'light') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // 同步外部设置传入的变更
  useEffect(() => {
    if (externalSettings?.global?.theme && externalSettings.global.theme !== themeMode) {
      setThemeMode(externalSettings.global.theme);
    }
  }, [externalSettings?.global?.theme, themeMode]);

  // 监听 themeMode 和系统深浅色偏好变更，动态维护 <html> class="dark"
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const evaluateAndApplyTheme = () => {
      const isDark =
        themeMode === 'dark' ||
        (themeMode === 'system' && mediaQuery.matches);

      const nextResolved: ResolvedTheme = isDark ? 'dark' : 'light';
      setResolvedTheme(nextResolved);

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    evaluateAndApplyTheme();

    const handleMediaChange = () => {
      if (themeMode === 'system') {
        evaluateAndApplyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [themeMode]);

  const setTheme = useCallback((newMode: ThemeMode) => {
    setThemeMode(newMode);
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