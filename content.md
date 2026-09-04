我已经定位了问题根源并制定了纯基于 IndexedDB（完全不依赖 `localStorage`）的改造方案：

1. **多语言持久化失效的根因**：`i18n.ts` 过去读取了一个废弃不存在的 key `formsight_user_settings`，且 `settingsStore` 初始化时只向 DOM 同步了主题，漏掉了同步语言包状态。我们将移除所有遗留的 `localStorage` 读取，在应用挂载前从 IndexedDB 读出准确设置后统一设入 `i18n`。
2. **首屏变色动画的根因**：过去在 `main.tsx` 顶部直接调用了同步的 `getCachedBypassTheme()`，在没有缓存时回退为 `system`（深色），导致 `html` 先被贴上了 `.dark` 类；随后异步从 IDB 读出用户的浅色设置，移除 `.dark`，进而触发了根容器上的 `transition-colors duration-200` 渐变变亮动画。我们将改为在 IDB 设置加载完成并应用正确主题类后才挂载 Preact 树，避免初始状态冲突；同时保留根容器的 CSS 平滑过渡动画，使后续在设置中手动切换主题依然享有顺滑动画。

## [WIP] fix: 移除 localStorage，基于 IDB 修复语言持久化与首屏主题直出

### 错误分析

1. **语言持久化读取脱节**：
   `src/core/i18n.ts` 中的 `getSavedLocale()` 尝试从 `localStorage.getItem('formsight_user_settings')` 读取配置，而系统实际的持久化设置完全保存在 IndexedDB 中。每次刷新页面，`i18n` 构造器读不到该 key，被强制重置为默认的 `'zh-CN'`；同时 `src/stores/settingsStore.ts` 的 `initSettingsStore()` 在从 IDB 读取配置后，仅同步了主题 `theme`，并未调用 `i18n.setLocale()`。
2. **首屏深色到浅色的变亮动画**：
   在 `src/main.tsx` 脚本顶层，无条件执行了 `applyThemeToDocument(getCachedBypassTheme())`。在未配置或旁路缓存失效时，默认降级为 `system`（深色模式），导致 `<html>` 在脚本加载阶段先被加上了 `.dark` 类。随后进入异步 `bootstrap()`，从 IndexedDB 加载出用户的实际设置（浅色模式），Preact 挂载并执行 `useTheme` 移除了 `.dark` 类。由于根容器包含 `transition-colors duration-200`，深浅色属性改变直接触发了 200ms 的平滑变亮补间动画。

### 用户需求

1. 彻底移除应用中对 `localStorage` 的所有读写逻辑，所有用户设置全量基于 IndexedDB 存储。
2. 修复中文环境下切换为英文后，刷新页面回退为中文的 Bug。
3. 修复系统为深色而应用设置为浅色时，刷新页面出现“变亮动画”的视觉闪烁，确保打开时直接直出目标颜色。
4. 保留用户在设置弹窗中手动切换深浅色时界面的平滑过渡动画。

### 评论

直接依赖 IndexedDB 保证了单一数据源（Single Source of Truth），避免了 `localStorage` 与 IDB 双写脱节或 key 命名不一致带来的维护陷阱。通过确保在 Preact 组件树挂载到 DOM 之前，先完成 IDB 异步读取并将语言与主题预先应用至 `document.documentElement`，可以杜绝任何由状态后发变更引发的首屏属性跳变与非预期 CSS 过渡，同时完整保留运行时主动切换主题的视觉体验。

### 目标

1. 清理 `src/storage/settings.ts`：移除 `syncBypassCache`、`getCachedBypassTheme`、`getCachedBypassLocale` 及所有 `localStorage` 调用。
2. 清理 `src/core/i18n.ts`：移除 `getSavedLocale` 中对 `localStorage` 的读取。
3. 改造 `src/main.tsx`：移除顶层猜测性主题设置，在 `bootstrap()` 异步读取 IDB 设置后再执行 `applyThemeToDocument` 和 `i18n.setLocale`，随后挂载 `<App />`。
4. 增强 `src/stores/settingsStore.ts`：在初始化和更新全局配置时同步驱动 `i18n.setLocale`。
5. 调整 `src/hooks/useTheme.ts`：移除对 `getCachedBypassTheme` 的引用。

### 基本原理

CSS `transition-colors` 仅在 DOM 元素的计算样式发生**动态改变**时才会触发补间动画。
如果页面在挂载根容器之前，`document.documentElement` 就已经根据 IndexedDB 中的配置打上了正确的 class（如浅色无 `.dark`，深色带 `.dark`），那么根容器渲染时其背景色从初始首帧就是目标颜色，属性从未发生改变，因此绝对不会触发 200ms 的渐变动画，实现“直出”；而当用户在设置里点击切换按钮时，`useTheme` 会动态修改 class，此时属性改变便会如期触发平滑过渡。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/config #concept/ui #scope/core #scope/ux #ai/instruct #task/domain/settings #task/object/idb-theme-locale #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 清理 `settings.ts` 中的 localStorage 旁路缓存代码

移除 `syncBypassCache`、`getCachedBypassTheme`、`getCachedBypassLocale` 及相关调用，使设置读写纯粹收敛至 IndexedDB。

~~~~~act
patch_file
src/storage/settings.ts
~~~~~
~~~~~old
/** 内存中的设置单例缓存，保障同步读取性能与响应即时性 */
let cachedSettings: UserSettings = {
  global: { ...DEFAULT_SETTINGS.global },
  cards: buildDefaultCardSettings(),
};

/**
 * 极简启动旁路缓存读写（仅用于 HTML 首屏防白屏闪烁）
 */
function syncBypassCache(settings: UserSettings): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    if (settings.global.theme) {
      localStorage.setItem('formsight_theme_cache', settings.global.theme);
    }
    if (settings.global.locale) {
      localStorage.setItem('formsight_locale_cache', settings.global.locale);
    }
  } catch {}
}

export function getCachedBypassTheme(): ThemeMode {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 'system';
  try {
    const t = localStorage.getItem('formsight_theme_cache');
    if (t === 'light' || t === 'dark' || t === 'system') return t;
  } catch {}
  return 'system';
}

export function getCachedBypassLocale(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 'zh-CN';
  try {
    const l = localStorage.getItem('formsight_locale_cache');
    if (l) return l;
  } catch {}
  return 'zh-CN';
}

/**
 * 从 IndexedDB 异步加载全局设置并更新内存缓存
 */
export async function loadSettings(): Promise<UserSettings> {
  try {
    const db = await getDB();
    const stored = await db.get('app_settings', 'global_settings');
    const defaultCards = buildDefaultCardSettings();

    if (!stored) {
      const initialSettings: UserSettings = {
        global: {
          ...DEFAULT_SETTINGS.global,
          locale: getCachedBypassLocale(),
          theme: getCachedBypassTheme(),
        },
        cards: defaultCards,
      };
      cachedSettings = initialSettings;
      await db.put('app_settings', initialSettings, 'global_settings');
      syncBypassCache(initialSettings);
      return initialSettings;
    }

    const mergedCards: Record<string, BaseModuleSettings> = { ...defaultCards };
    if (stored.cards && typeof stored.cards === 'object') {
      for (const [cardId, val] of Object.entries(stored.cards)) {
        mergedCards[cardId] = {
          ...(mergedCards[cardId] || DEFAULT_BASE_SETTINGS),
          ...(val as Record<string, unknown>),
        };
      }
    }

    const resolvedSettings: UserSettings = {
      global: { ...DEFAULT_SETTINGS.global, ...(stored.global || {}) },
      cards: mergedCards,
    };

    cachedSettings = resolvedSettings;
    syncBypassCache(resolvedSettings);
    return resolvedSettings;
  } catch (e) {
    console.error('Failed to load user settings from IndexedDB, using fallback:', e);
    return cachedSettings;
  }
}

/** 同步读取当前内存已加载的设置 */
export function getSettingsSnapshot(): UserSettings {
  return cachedSettings;
}

/**
 * 异步保存设置到 IndexedDB，同时更新内存与旁路缓存
 */
export async function saveSettings(settings: UserSettings): Promise<void> {
  cachedSettings = settings;
  syncBypassCache(settings);
  try {
    const db = await getDB();
    await db.put('app_settings', settings, 'global_settings');
  } catch (e) {
    console.error('Failed to save user settings to IndexedDB:', e);
  }
}
~~~~~
~~~~~new
/** 内存中的设置单例缓存，保障同步读取性能与响应即时性 */
let cachedSettings: UserSettings = {
  global: { ...DEFAULT_SETTINGS.global },
  cards: buildDefaultCardSettings(),
};

/**
 * 从 IndexedDB 异步加载全局设置并更新内存缓存
 */
export async function loadSettings(): Promise<UserSettings> {
  try {
    const db = await getDB();
    const stored = await db.get('app_settings', 'global_settings');
    const defaultCards = buildDefaultCardSettings();

    if (!stored) {
      const initialSettings: UserSettings = {
        global: {
          ...DEFAULT_SETTINGS.global,
        },
        cards: defaultCards,
      };
      cachedSettings = initialSettings;
      await db.put('app_settings', initialSettings, 'global_settings');
      return initialSettings;
    }

    const mergedCards: Record<string, BaseModuleSettings> = { ...defaultCards };
    if (stored.cards && typeof stored.cards === 'object') {
      for (const [cardId, val] of Object.entries(stored.cards)) {
        mergedCards[cardId] = {
          ...(mergedCards[cardId] || DEFAULT_BASE_SETTINGS),
          ...(val as Record<string, unknown>),
        };
      }
    }

    const resolvedSettings: UserSettings = {
      global: { ...DEFAULT_SETTINGS.global, ...(stored.global || {}) },
      cards: mergedCards,
    };

    cachedSettings = resolvedSettings;
    return resolvedSettings;
  } catch (e) {
    console.error('Failed to load user settings from IndexedDB, using fallback:', e);
    return cachedSettings;
  }
}

/** 同步读取当前内存已加载的设置 */
export function getSettingsSnapshot(): UserSettings {
  return cachedSettings;
}

/**
 * 异步保存设置到 IndexedDB，同时更新内存缓存
 */
export async function saveSettings(settings: UserSettings): Promise<void> {
  cachedSettings = settings;
  try {
    const db = await getDB();
    await db.put('app_settings', settings, 'global_settings');
  } catch (e) {
    console.error('Failed to save user settings to IndexedDB:', e);
  }
}
~~~~~

#### Acts 2: 清理 `i18n.ts` 中的 localStorage 读取

移除未使用的 `getSavedLocale` 函数，将默认语言交由应用启动引导阶段通过 IDB 驱动设入。

~~~~~act
patch_file
src/core/i18n.ts
~~~~~
~~~~~old
export type LocaleDictionary = Record<string, unknown>;

function getSavedLocale(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return 'zh-CN';
  }
  try {
    const raw = localStorage.getItem('formsight_user_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.global?.locale) {
        return parsed.global.locale;
      }
    }
  } catch {}
  return 'zh-CN';
}

class I18nManager {
  private currentLocale = 'zh-CN';
  private fallbackLocale = 'zh-CN';
  private dictionaries: Record<string, LocaleDictionary> = {};
  private listeners = new Set<(locale: string) => void>();

  constructor() {
    this.currentLocale = getSavedLocale();
    this.registerGlobalLocales({
      'zh-CN': zhCNGlobal as LocaleDictionary,
      'en-US': enUSGlobal as LocaleDictionary,
    });
  }

  public init(initialLocale?: string): void {
    if (initialLocale) {
      this.setLocale(initialLocale);
    } else {
      const saved = getSavedLocale();
      if (saved && saved !== this.currentLocale) {
        this.setLocale(saved);
      }
    }
  }
~~~~~
~~~~~new
export type LocaleDictionary = Record<string, unknown>;

class I18nManager {
  private currentLocale = 'zh-CN';
  private fallbackLocale = 'zh-CN';
  private dictionaries: Record<string, LocaleDictionary> = {};
  private listeners = new Set<(locale: string) => void>();

  constructor() {
    this.registerGlobalLocales({
      'zh-CN': zhCNGlobal as LocaleDictionary,
      'en-US': enUSGlobal as LocaleDictionary,
    });
  }

  public init(initialLocale?: string): void {
    if (initialLocale && initialLocale !== this.currentLocale) {
      this.setLocale(initialLocale);
    }
  }
~~~~~

#### Acts 3: 改造 `main.tsx` 引导时序

移除脚本顶层盲目的主题应用，在 `bootstrap()` 中先从 IDB 读取设置并同步生效主题与多语言，然后再挂载 Preact 应用，从而彻底消除开屏动画闪烁并确保语言准确直出。

~~~~~act
write_file
src/main.tsx
~~~~~
~~~~~tsx
import { render } from 'preact';
import { App } from './app';
import { i18n } from './core/i18n';
import { applyThemeToDocument } from './hooks/useTheme';
import { loadSettings } from './storage/settings';
import './index.css';

// 异步从 IndexedDB 加载设置并完成首屏直出应用，再挂载组件树
async function bootstrap() {
  const settings = await loadSettings();

  // 1. 在 DOM 节点初次渲染前完成主题 class 与色彩空间配置
  applyThemeToDocument(settings.global.theme);

  // 2. 将 IDB 中保存的语言设置给 i18n 实例
  i18n.init(settings.global.locale);

  // 3. 此时所有初始属性均已匹配，挂载不会产生属性突变与补间变色动画
  const appElement = document.getElementById('app');
  if (appElement) {
    render(<App />, appElement);
  }
}

bootstrap();
~~~~~

#### Acts 4: 修复 `settingsStore.ts` 的状态同步

在 `initSettingsStore` 和 `updateGlobalSettings` 时，确保 `$settings` 的修改同步给 `i18n.setLocale()`。

~~~~~act
patch_file
src/stores/settingsStore.ts
~~~~~
~~~~~old
import { computed, signal } from '@preact/signals';
import { applyThemeToDocument } from '../hooks/useTheme';
import {
  type BaseModuleSettings,
  DEFAULT_BASE_SETTINGS,
  DEFAULT_SETTINGS,
  type ThemeMode,
  type UserSettings,
  loadSettings as loadSettingsFromDB,
  saveSettings as saveSettingsToDB,
} from '../storage/settings';

export const $settings = signal<UserSettings>(DEFAULT_SETTINGS);

export const $currentTheme = computed<ThemeMode>(() => $settings.value.global.theme || 'system');
export const $currentLocale = computed<string>(() => $settings.value.global.locale || 'zh-CN');

export async function initSettingsStore(): Promise<UserSettings> {
  const loaded = await loadSettingsFromDB();
  $settings.value = loaded;
  applyThemeToDocument(loaded.global.theme);
  return loaded;
}

export async function updateGlobalSettings(
  patch: Partial<UserSettings['global']>,
): Promise<UserSettings> {
  const next: UserSettings = {
    ...$settings.value,
    global: {
      ...$settings.value.global,
      ...patch,
    },
  };
  $settings.value = next;
  if (patch.theme) {
    applyThemeToDocument(patch.theme);
  }
  await saveSettingsToDB(next);
  return next;
}
~~~~~
~~~~~new
import { computed, signal } from '@preact/signals';
import { i18n } from '../core/i18n';
import { applyThemeToDocument } from '../hooks/useTheme';
import {
  type BaseModuleSettings,
  DEFAULT_BASE_SETTINGS,
  DEFAULT_SETTINGS,
  type ThemeMode,
  type UserSettings,
  loadSettings as loadSettingsFromDB,
  saveSettings as saveSettingsToDB,
} from '../storage/settings';

export const $settings = signal<UserSettings>(DEFAULT_SETTINGS);

export const $currentTheme = computed<ThemeMode>(() => $settings.value.global.theme || 'system');
export const $currentLocale = computed<string>(() => $settings.value.global.locale || 'zh-CN');

export async function initSettingsStore(): Promise<UserSettings> {
  const loaded = await loadSettingsFromDB();
  $settings.value = loaded;
  applyThemeToDocument(loaded.global.theme);
  if (loaded.global.locale) {
    i18n.setLocale(loaded.global.locale);
  }
  return loaded;
}

export async function updateGlobalSettings(
  patch: Partial<UserSettings['global']>,
): Promise<UserSettings> {
  const next: UserSettings = {
    ...$settings.value,
    global: {
      ...$settings.value.global,
      ...patch,
    },
  };
  $settings.value = next;
  if (patch.theme) {
    applyThemeToDocument(patch.theme);
  }
  if (patch.locale) {
    i18n.setLocale(patch.locale);
  }
  await saveSettingsToDB(next);
  return next;
}
~~~~~

#### Acts 5: 移除 `useTheme.ts` 对已删除 bypass 缓存函数的引用

去除 `getCachedBypassTheme` 的引用，纯依赖内存快照。

~~~~~act
patch_file
src/hooks/useTheme.ts
~~~~~
~~~~~old
import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  type ResolvedTheme,
  type ThemeMode,
  type UserSettings,
  getCachedBypassTheme,
  getSettingsSnapshot,
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
  const currentMode =
    externalSettings?.global?.theme || getSettingsSnapshot().global.theme || getCachedBypassTheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>(currentMode);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    applyThemeToDocument(currentMode),
  );
~~~~~
~~~~~new
import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  type ResolvedTheme,
  type ThemeMode,
  type UserSettings,
  getSettingsSnapshot,
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
  const currentMode =
    externalSettings?.global?.theme || getSettingsSnapshot().global.theme || 'system';
  const [themeMode, setThemeMode] = useState<ThemeMode>(currentMode);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    applyThemeToDocument(currentMode),
  );
~~~~~

### 下一步建议

1. **构建与测试验证**：运行 `npm run build` 或 `npm test`，验证所有类型检查与测试用例通过。
2. **场景实测验证**：
   - 在系统偏好为深色模式的环境下，将应用设置为浅色模式后刷新页面，验证是否直接以浅色呈现，且没有从深到浅变亮的补间过渡；
   - 在设置中手动在“浅色 / 深色 / 跟随系统”之间切换，验证是否依然保留顺滑平滑的过渡动画；
   - 切换为英文后刷新页面，验证是否稳定保持英文。
3. 验证通过后，可由用户发起生成对应的 `[COMMIT]` 提交计划。
