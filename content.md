我将为你修复 TypeScript 类型编译错误，并解决主题模式在弹窗内切换时无法实时同步生效的问题。

## [WIP] fix: 修复主题切换实时响应与 Canvas 主题类型编译错误

### 错误分析

1. **主题实时切换未生效的原因**：
   - 当前主题切换的 DOM 状态（`document.documentElement.classList`）更新依赖于多层 React/Preact Effect 调度链条（`GeneralPreferencesSection -> GlobalSettingsModal -> App -> useTheme`）。
   - 在弹窗点击切换时，由于缺乏直接且同步的 DOM 类操作机制，导致用户在弹窗内点击“浅色”、“深色”或“跟随系统”时，无法即时观察到主题模式变更。
2. **TypeScript 编译报错原因**：
   - `src/utils/theme.ts` 中的 `PALETTE.emerald` 与 `PALETTE.rose` 缺失 `300` 阶色阶定义，导致 `DARK_CANVAS_THEME` 索引 `PALETTE.emerald[300]` 和 `PALETTE.rose[300]` 时报 TS7053 错误。
   - `CanvasThemeTokens` 类型直接采用了 `typeof LIGHT_CANVAS_THEME`，而 `LIGHT_CANVAS_THEME` 带有 `as const` 断言，导致所有颜色属性都被推导为唯一的字符串字面量类型（如 `"#FFFFFF"`），使得 `DARK_CANVAS_THEME`（其 `primary` 为 `"#0F172A"`）无法满足该类型，从而产生 TS2322 赋值错误。

### 用户需求

1. 修复 `src/utils/theme.ts` 中的 TS 编译错误（补全调色盘缺少色阶，规范化 `CanvasThemeTokens` 接口类型）。
2. 在设置弹窗中点击“浅色”、“深色”或“跟随系统”时，应用外观必须即时无缝切换。

### 评论

主题切换与 Canvas 绘图系统是应用的基础设施。通过将主题应用逻辑封装为可同步执行的纯函数，不仅可以提升交互响应速度，还能确保在应用初始化、系统深色模式变更以及用户手动切换时保持一致的行为。

### 目标

1. 在 `src/utils/theme.ts` 中补全 `PALETTE` 的 `300` 色阶，并重构 `CanvasThemeTokens` 为结构化接口，彻底解决编译错误。
2. 在 `src/hooks/useTheme.ts` 中导出 `applyThemeToDocument` 工具函数，并强化 DOM 类同步逻辑。
3. 在 `GeneralPreferencesSection.tsx` 中在点击切换时直接同步调用 `applyThemeToDocument`，实现 0 延迟即时切换。
4. 在 `src/main.tsx` 应用启动入口初始化应用已保存的主题。

### 基本原理

- 通过将 `document.documentElement.classList` 的变更直接封装在 `applyThemeToDocument` 中，无论是用户点击还是系统偏好变动，均能同步判定当前系统偏好或用户选定模式，并直接操作 DOM 根节点 class。
- 为 `CanvasThemeTokens` 定义通用的属性类型 `string`，解除字面量约束，使暗色与浅色语义 Token 能够自由互换。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/ui #scope/core #scope/ux #ai/instruct #task/domain/ui #task/object/theme-manager #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `src/utils/theme.ts` 中的调色板缺失与 Canvas 主题类型约束

~~~~~act
patch_file
src/utils/theme.ts
~~~~~
~~~~~typescript.old
  emerald: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#166534',
  },
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },
  rose: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
    700: '#BE123C',
    800: '#9F1239',
  },
~~~~~
~~~~~typescript.new
  emerald: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#166534',
  },
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },
  rose: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    300: '#FDA4AF',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
    700: '#BE123C',
    800: '#9F1239',
  },
~~~~~

~~~~~act
patch_file
src/utils/theme.ts
~~~~~
~~~~~typescript.old
export type CanvasThemeTokens = typeof LIGHT_CANVAS_THEME;

export function isDarkMode(): boolean {
~~~~~
~~~~~typescript.new
export interface CanvasThemeTokens {
  bg: {
    primary: string;
    secondary: string;
    subtle: string;
  };
  axis: {
    line: string;
    grid: string;
    highlight: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    dark: string;
    code: string;
  };
  status: {
    hit: string;
    hitDark: string;
    miss: string;
    missDark: string;
    warning: string;
    accent: string;
    accentHover: string;
    accentDark: string;
  };
  shape: {
    fill: string;
    stroke: string;
    highlight: string;
  };
  pointGrid: {
    dotDefault: string;
    dotAnchor: string;
    dotHover: string;
    dotHit: string;
    dotMiss: string;
    crosshairTarget: string;
  };
}

export function isDarkMode(): boolean {
~~~~~

#### Acts 2: 增强 `src/hooks/useTheme.ts` 导出 `applyThemeToDocument` 并确保同步刷新

~~~~~act
patch_file
src/hooks/useTheme.ts
~~~~~
~~~~~typescript.old
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
    const nextTheme = externalSettings?.global?.theme ?? 'system';
    if (nextTheme !== themeMode) {
      setThemeMode(nextTheme);
    }
  }, [externalSettings?.global?.theme, themeMode]);

  // 监听 themeMode 和系统深浅色偏好变更，动态维护 <html> class="dark"
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const evaluateAndApplyTheme = () => {
      const isDark = themeMode === 'dark' || (themeMode === 'system' && mediaQuery.matches);

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
~~~~~
~~~~~typescript.new
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

export function applyThemeToDocument(themeMode: ThemeMode = 'system'): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = themeMode === 'dark' || (themeMode === 'system' && mediaQuery.matches);
  const resolved: ResolvedTheme = isDark ? 'dark' : 'light';

  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
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
~~~~~

#### Acts 3: 在 `GeneralPreferencesSection.tsx` 与 `main.tsx` 中应用即时主题同步

~~~~~act
patch_file
src/components/settings/sections/GeneralPreferencesSection.tsx
~~~~~
~~~~~typescript.old
import { Clock, Globe, HelpCircle, Monitor, Moon, Sun, Volume2 } from 'lucide-preact';
import { useTranslation } from '../../../core/i18n';
import type { GlobalSettings, ThemeMode, UserSettings } from '../../../utils/settings';
import type { ToastType } from '../../common/Toast';
import { SettingToggleItem } from '../common/SettingToggleItem';
import { SliderMarginGroup } from '../common/SliderMarginGroup';

interface GeneralPreferencesSectionProps {
  settings: UserSettings;
  onUpdateGlobal: (patch: Partial<GlobalSettings>) => void;
  showToast: (msg: string, type?: ToastType) => void;
}

export function GeneralPreferencesSection({
  settings,
  onUpdateGlobal,
  showToast,
}: GeneralPreferencesSectionProps) {
  const { t, locale, setLocale } = useTranslation();

  const handleLocaleChange = (newLocale: string) => {
    onUpdateGlobal({ locale: newLocale });
    setLocale(newLocale);
    showToast(t('settings.switchedLocaleToast'), 'success');
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    onUpdateGlobal({ theme: newTheme });
    const themeLabel =
      newTheme === 'dark'
        ? t('settings.themeDark')
        : newTheme === 'light'
          ? t('settings.themeLight')
          : t('settings.themeSystem');
    showToast(t('settings.switchedThemeToast', { theme: themeLabel }), 'success');
  };
~~~~~
~~~~~typescript.new
import { Clock, Globe, HelpCircle, Monitor, Moon, Sun, Volume2 } from 'lucide-preact';
import { useTranslation } from '../../../core/i18n';
import { applyThemeToDocument } from '../../../hooks/useTheme';
import type { GlobalSettings, ThemeMode, UserSettings } from '../../../utils/settings';
import type { ToastType } from '../../common/Toast';
import { SettingToggleItem } from '../common/SettingToggleItem';
import { SliderMarginGroup } from '../common/SliderMarginGroup';

interface GeneralPreferencesSectionProps {
  settings: UserSettings;
  onUpdateGlobal: (patch: Partial<GlobalSettings>) => void;
  showToast: (msg: string, type?: ToastType) => void;
}

export function GeneralPreferencesSection({
  settings,
  onUpdateGlobal,
  showToast,
}: GeneralPreferencesSectionProps) {
  const { t, locale, setLocale } = useTranslation();

  const handleLocaleChange = (newLocale: string) => {
    onUpdateGlobal({ locale: newLocale });
    setLocale(newLocale);
    showToast(t('settings.switchedLocaleToast'), 'success');
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    applyThemeToDocument(newTheme);
    onUpdateGlobal({ theme: newTheme });
    const themeLabel =
      newTheme === 'dark'
        ? t('settings.themeDark')
        : newTheme === 'light'
          ? t('settings.themeLight')
          : t('settings.themeSystem');
    showToast(t('settings.switchedThemeToast', { theme: themeLabel }), 'success');
  };
~~~~~

~~~~~act
patch_file
src/main.tsx
~~~~~
~~~~~typescript.old
import { render } from 'preact';
import { App } from './app';
import './index.css';

const appElement = document.getElementById('app');
if (appElement) {
  render(<App />, appElement);
}
~~~~~
~~~~~typescript.new
import { render } from 'preact';
import { App } from './app';
import { applyThemeToDocument } from './hooks/useTheme';
import { loadSettings } from './utils/settings';
import './index.css';

// 初始化应用已保存的外观主题
applyThemeToDocument(loadSettings().global.theme);

const appElement = document.getElementById('app');
if (appElement) {
  render(<App />, appElement);
}
~~~~~

### 下一步建议

- 运行 `npm run check` 或 `npx tsc --noEmit` 校验全项目 TypeScript 类型检查，确保无遗留类型错误。
- 打开浏览器进入「全局设置」弹窗，依次点击“浅色”、“深色”与“跟随系统”，确认页面与所有卡片画布的背景及样式均能 0 延迟无缝切换。
