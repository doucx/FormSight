好的，我们将启动夜间模式（Dark Mode）改造的第一阶段：**基础设施与双态主题响应系统搭建**。

本阶段将：
1. 在 `settings.ts` 中定义 `ThemeMode`（`'light' | 'dark' | 'system'`）及全局配置字段；
2. 升级 `theme.ts`，构建明/暗双态 Canvas 色板（`LIGHT_CANVAS_THEME` / `DARK_CANVAS_THEME`），并通过动态代理与 `getCanvasTheme()` 保证现有所有 Canvas 绘图模块无缝兼容；
3. 新建 `useTheme.ts` Hook，实现 DOM `.dark` 样式类与系统 `prefers-color-scheme` 媒体查询的双向监听与持久化同步；
4. 补充中英文 i18n 多语言词条，并在 `app.tsx` 顶层装配主题初始化。

## [WIP] feat: 搭建夜间模式基础设施与双态主题响应系统

### 用户需求
开启夜间模式（Dark Mode）第一阶段，建立系统级明暗主题状态流、双态 Canvas 色彩 Token 解析器以及 DOM 根节点 `.dark` 联动控制。

### 评论
夜间模式对提升暗光环境下的视觉训练舒适度、降低视疲劳具有重要意义。通过在基础设施层使用 Proxy 与动态解析器重构 `CANVAS_THEME`，既能实现现有十余个 Canvas 渲染管线的零侵入升级，又能确保 UI 与 Canvas 色调的一致性与即时响应。

### 目标
1. 在 `src/utils/settings.ts` 中添加 `ThemeMode` 与 `theme` 配置项。
2. 重构 `src/utils/theme.ts`，提供针对暗色环境优化的 `DARK_CANVAS_THEME`，并保持 `CANVAS_THEME` 动态兼容。
3. 创建 `src/hooks/useTheme.ts` 管理主题状态并同步 `<html class="dark">`。
4. 在 `src/locales/` 中补充主题相关的多语言词条。
5. 在 `src/app.tsx` 中挂载主题 Hook 确保启动即时生效。

### 基本原理
- **DOM 层同步**：利用 Web 标准的 `document.documentElement.classList` 增删 `dark` 类，使 Tailwind 的 `dark:*` 变体规则在全应用范围内立即生效；通过 `window.matchMedia('(prefers-color-scheme: dark)')` 实现系统级自适应。
- **Canvas 层透明代理**：通过 `Proxy` 动态劫持 `CANVAS_THEME` 的属性访问，根据当前 DOM 是否包含 `dark` 类实时分发亮色/暗色 Token，使得所有历史 Canvas 绘制逻辑无需修改参数签名即可自动适配夜间模式。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #comp/build #concept/state #concept/ui #scope/core #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/dark-mode #task/action/infrastructure #task/state/begin

---

### Script

#### Acts 1: 扩展全局设置类型定义

我们在 `settings.ts` 中加入主题枚举定义，并为全局偏好设置注入默认值 `'system'`。

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
export type StepGranularity = 'standard' | 'fine';
export type AdaptiveMode = 'block' | 'staircase';
export type TargetingMode = 'off' | 'manual';
~~~~~
~~~~~typescript
export type StepGranularity = 'standard' | 'fine';
export type AdaptiveMode = 'block' | 'staircase';
export type TargetingMode = 'off' | 'manual';
export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
export interface GlobalSettings {
  locale: string;
  idleTimeout: number;
  soundEnabled: boolean;
  sliderHitMargin: number;
  showCanvasHints?: boolean;
}
~~~~~
~~~~~typescript
export interface GlobalSettings {
  locale: string;
  theme?: ThemeMode;
  idleTimeout: number;
  soundEnabled: boolean;
  sliderHitMargin: number;
  showCanvasHints?: boolean;
}
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    locale: 'zh-CN',
    idleTimeout: 60,
    soundEnabled: true,
    sliderHitMargin: 12,
    showCanvasHints: true,
  },
  cards: buildDefaultCardSettings(),
};
~~~~~
~~~~~typescript
export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    locale: 'zh-CN',
    theme: 'system',
    idleTimeout: 60,
    soundEnabled: true,
    sliderHitMargin: 12,
    showCanvasHints: true,
  },
  cards: buildDefaultCardSettings(),
};
~~~~~

#### Acts 2: 升级双态 Canvas 调色盘与动态代理

重构 `src/utils/theme.ts`，导出 `LIGHT_CANVAS_THEME`、`DARK_CANVAS_THEME`、`getCanvasTheme()` 以及透明代理的 `CANVAS_THEME`。

~~~~~act
write_file
src/utils/theme.ts
~~~~~
~~~~~typescript
import type { ResolvedTheme } from './settings';

/**
 * 1. 基础调色盘（与 Tailwind 标准色彩空间 100% 对齐）
 */
export const PALETTE = {
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
  indigo: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
    950: '#1E1B4B',
  },
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
  spectrum: {
    red: '#FF0000',
    yellow: '#FFFF00',
    green: '#00FF00',
    cyan: '#00FFFF',
    blue: '#0000FF',
    magenta: '#FF00FF',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;

/**
 * 360° 全色相光谱线性渐变标准定义
 */
export const HUE_SPECTRUM_GRADIENT = `linear-gradient(to right, ${PALETTE.spectrum.red} 0%, ${PALETTE.spectrum.yellow} 17%, ${PALETTE.spectrum.green} 33%, ${PALETTE.spectrum.cyan} 50%, ${PALETTE.spectrum.blue} 67%, ${PALETTE.spectrum.magenta} 83%, ${PALETTE.spectrum.red} 100%)`;

/**
 * 2. Canvas 亮色语义化 Token
 */
export const LIGHT_CANVAS_THEME = {
  bg: {
    primary: PALETTE.white,
    secondary: PALETTE.slate[50],
    subtle: PALETTE.slate[100],
  },
  axis: {
    line: PALETTE.slate[200],
    grid: PALETTE.slate[300],
    highlight: PALETTE.slate[700],
  },
  text: {
    primary: PALETTE.slate[800],
    secondary: PALETTE.slate[600],
    muted: PALETTE.slate[400],
    dark: PALETTE.slate[900],
    code: PALETTE.slate[600],
  },
  status: {
    hit: PALETTE.emerald[500],
    hitDark: PALETTE.emerald[700],
    miss: PALETTE.rose[500],
    missDark: PALETTE.rose[700],
    warning: PALETTE.amber[500],
    accent: PALETTE.indigo[600],
    accentHover: PALETTE.indigo[500],
    accentDark: PALETTE.indigo[800],
  },
  shape: {
    fill: PALETTE.slate[900],
    stroke: PALETTE.slate[800],
    highlight: PALETTE.emerald[500],
  },
  pointGrid: {
    dotDefault: PALETTE.slate[400],
    dotAnchor: PALETTE.black,
    dotHover: PALETTE.indigo[600],
    dotHit: PALETTE.emerald[500],
    dotMiss: PALETTE.rose[500],
    crosshairTarget: PALETTE.emerald[500],
  },
} as const;

/**
 * 3. Canvas 暗色语义化 Token（针对暗光环境高对比度与视疲劳优化）
 */
export const DARK_CANVAS_THEME = {
  bg: {
    primary: PALETTE.slate[900],
    secondary: PALETTE.slate[950],
    subtle: PALETTE.slate[800],
  },
  axis: {
    line: PALETTE.slate[800],
    grid: PALETTE.slate[700],
    highlight: PALETTE.slate[300],
  },
  text: {
    primary: PALETTE.slate[100],
    secondary: PALETTE.slate[400],
    muted: PALETTE.slate[500],
    dark: PALETTE.white,
    code: PALETTE.slate[400],
  },
  status: {
    hit: PALETTE.emerald[400],
    hitDark: PALETTE.emerald[300],
    miss: PALETTE.rose[400],
    missDark: PALETTE.rose[300],
    warning: PALETTE.amber[400],
    accent: PALETTE.indigo[400],
    accentHover: PALETTE.indigo[300],
    accentDark: PALETTE.indigo[600],
  },
  shape: {
    fill: PALETTE.slate[100],
    stroke: PALETTE.slate[300],
    highlight: PALETTE.emerald[400],
  },
  pointGrid: {
    dotDefault: PALETTE.slate[600],
    dotAnchor: PALETTE.white,
    dotHover: PALETTE.indigo[400],
    dotHit: PALETTE.emerald[400],
    dotMiss: PALETTE.rose[400],
    crosshairTarget: PALETTE.emerald[400],
  },
} as const;

export type CanvasThemeTokens = typeof LIGHT_CANVAS_THEME;

export function isDarkMode(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

export function getCurrentResolvedTheme(): ResolvedTheme {
  return isDarkMode() ? 'dark' : 'light';
}

export function getCanvasTheme(theme: ResolvedTheme = getCurrentResolvedTheme()): CanvasThemeTokens {
  return theme === 'dark' ? DARK_CANVAS_THEME : LIGHT_CANVAS_THEME;
}

/**
 * 动态代理：让既有直接引用 CANVAS_THEME.* 的绘制代码无缝自适应当前明暗主题
 */
export const CANVAS_THEME: CanvasThemeTokens = new Proxy({} as CanvasThemeTokens, {
  get(_target, prop) {
    const active = getCanvasTheme();
    return active[prop as keyof CanvasThemeTokens];
  },
});

/**
 * 4. 颜色工具函数：Hex 转指定透明度的 RGBA 字符串
 */
export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  let r = 0;
  let g = 0;
  let b = 0;

  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6 || cleanHex.length === 8) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const ACCURACY_COLORS = {
  high: PALETTE.emerald[500],
  medium: PALETTE.amber[500],
  low: PALETTE.rose[500],
} as const;

/**
 * 获取正确率对应的 Canvas 十六进制主题色
 */
export function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 80) return ACCURACY_COLORS.high;
  if (accuracy >= 60) return ACCURACY_COLORS.medium;
  return ACCURACY_COLORS.low;
}

/**
 * 获取正确率对应的半透明背景色
 */
export function getAccuracyFillColor(accuracy: number, alpha = 0.35): string {
  if (accuracy >= 80) return hexToRgba(ACCURACY_COLORS.high, alpha);
  if (accuracy >= 60) return hexToRgba(ACCURACY_COLORS.medium, alpha);
  return hexToRgba(ACCURACY_COLORS.low, alpha);
}

/**
 * 获取正确率对应的 Tailwind 徽章样式类名（支持暗色模式）
 */
export function getAccuracyBadgeClass(accuracy: number, total = 1): string {
  if (total === 0) return 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500';
  if (accuracy >= 80) return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300';
  if (accuracy >= 60) return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300';
  return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300';
}
~~~~~

#### Acts 3: 创建 `useTheme` 响应式 Hook

创建 `src/hooks/useTheme.ts`，统一响应用户偏好、系统偏好并自动切换 `document.documentElement` 的 `.dark` 类名。

~~~~~act
write_file
src/hooks/useTheme.ts
~~~~~
~~~~~typescript
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
~~~~~

#### Acts 4: 注册多语言主题词条

在 `zh-CN.json` 和 `en-US.json` 的 `settings` 模块中加入主题配置词条。

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json
    "languageTitle": "系统界面语言",
    "languageDesc": "切换应用全局显示语言 (Language)",
~~~~~
~~~~~json
    "themeTitle": "外观主题模式",
    "themeDesc": "切换浅色明亮、深色夜间或跟随系统外观",
    "themeLight": "浅色",
    "themeDark": "深色",
    "themeSystem": "跟随系统",
    "switchedThemeToast": "外观已切换为{{theme}}",
    "languageTitle": "系统界面语言",
    "languageDesc": "切换应用全局显示语言 (Language)",
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json
    "languageTitle": "Display Language",
    "languageDesc": "Switch application global language (界面语言)",
~~~~~
~~~~~json
    "themeTitle": "Theme Appearance",
    "themeDesc": "Switch between Light, Dark, or System mode",
    "themeLight": "Light",
    "themeDark": "Dark",
    "themeSystem": "System",
    "switchedThemeToast": "Switched theme to {{theme}}",
    "languageTitle": "Display Language",
    "languageDesc": "Switch application global language (界面语言)",
~~~~~

#### Acts 5: 在应用入口挂载主题监听

在 `src/app.tsx` 中接入 `useTheme(settings)` 并为页面根节点提供 `dark:bg-slate-950` 底色支持。

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
import { useAppBootstrap } from './hooks/useAppBootstrap';
import { useHashRoute } from './hooks/useHashRoute';
import { useTodayStats } from './hooks/useTodayStats';

export function App() {
~~~~~
~~~~~typescript
import { useAppBootstrap } from './hooks/useAppBootstrap';
import { useHashRoute } from './hooks/useHashRoute';
import { useTheme } from './hooks/useTheme';
import { useTodayStats } from './hooks/useTodayStats';

export function App() {
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
  const {
    lastHomeRoute,
    settings,
    setSettings,
    trainingPlan,
    setTrainingPlan,
    allPlans,
    toasts,
    profilesLoaded,
    totalTimeMs,
    profiles,
    showToast,
    handleDismissToast,
    refreshProfiles,
    handleSelectPlanOnHome,
  } = useAppBootstrap(route, refreshTodayStats);

  const activeSettingsCard = activeSettingsCardId
    ? registry.getCardById(activeSettingsCardId)
    : null;

  return (
    <div className="min-h-screen bg-slate-50/70 antialiased">
~~~~~
~~~~~typescript
  const {
    lastHomeRoute,
    settings,
    setSettings,
    trainingPlan,
    setTrainingPlan,
    allPlans,
    toasts,
    profilesLoaded,
    totalTimeMs,
    profiles,
    showToast,
    handleDismissToast,
    refreshProfiles,
    handleSelectPlanOnHome,
  } = useAppBootstrap(route, refreshTodayStats);

  // 挂载夜间模式全局响应与监听
  useTheme(settings);

  const activeSettingsCard = activeSettingsCardId
    ? registry.getCardById(activeSettingsCardId)
    : null;

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased transition-colors duration-200">
~~~~~

### 下一步建议

我们已经完成了夜间模式第一阶段（基础设施、双态 Canvas 代理、`useTheme` Hook 与 i18n 词条）。

建议进入**第二阶段**：
1. 更新 `GeneralPreferencesSection.tsx`，在全局设置弹窗中添加「浅色 / 深色 / 跟随系统」三段式切换 UI；
2. 运行测试套件验证 `theme.ts` 和 `settings.ts` 的既有单元测试是否全部畅通。
