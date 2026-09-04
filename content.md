好的，我将为你修复语言设置在页面刷新后回退为中文的问题，并将语言状态完全收敛同步至 IndexedDB，消除对 `localStorage` 的无效依赖。

## [WIP] fix: 修复语言持久化与 IndexedDB 状态同步问题

### 错误分析

1. **缓存 Key 失配与脱节**：`src/core/i18n.ts` 的 `getSavedLocale` 读取的是早期遗留的不存在的 key `formsight_user_settings`，导致初始化时始终被降级回退至默认值 `'zh-CN'`。
2. **异步初始化未同步 i18n 实例**：应用启动时 `main.tsx` 和 `initSettingsStore` 仅从 IndexedDB 加载了设置并同步了暗色主题，但未将读取到的 `settings.global.locale` 同步调用 `i18n.setLocale()`，导致应用层 Signal 状态与底层 i18n 翻译实例脱节。
3. **渲染时序颠倒**：主应用渲染挂载先于或未等待语言实例注入，使得组件首帧按照默认的中文词典完成初始渲染。

### 用户需求

彻底修复在中文系统环境中切换至英文后刷新页面变回中文的问题；将语言配置的持久化与读取完全基于 IndexedDB，弃用并移除多余的 `localStorage` 语言旁路缓存。

### 评论

这是一个典型的客户端多状态源不一致问题。语言配置应当遵从“单一真实数据源（SSOT）”原则。通过在主入口挂载渲染前等待 IndexedDB 加载并统一派发 `i18n.setLocale()`，可以确保应用在第一帧挂载时即可正确显示用户指定的语言。

### 目标

1. 修复 `src/core/i18n.ts`，移除失效的 `localStorage` 读取代码，确立纯内存单例初始化。
2. 在 `src/main.tsx` 挂载 DOM 前，使用从 IndexedDB 读取的 `settings.global.locale` 初始化 `i18n` 语言实例。
3. 在 `src/stores/settingsStore.ts` 的 `initSettingsStore` 和 `updateGlobalSettings` 中联动 `i18n.setLocale()`，保证 Signal 与 i18n 实例强一致。
4. 清理 `src/storage/settings.ts` 中关于 locale 的 `localStorage` 冗余代码。

### 基本原理

在入口函数 `bootstrap` 中，`await loadSettings()` 获取到 IndexedDB 中的 `UserSettings` 后，优先调用 `i18n.setLocale(settings.global.locale)`，然后再调用 `render(<App />, appElement)`。这样 Preact 在挂载首帧虚拟 DOM 时，所有 `useTranslation()` 组件都直接以数据库中已保存的目标语言进行渲染，彻底解决页面刷新回退中文的问题。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/state #scope/core #ai/instruct #task/domain/storage #task/object/locale-persistence #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 移除 `i18n.ts` 中失效的 `localStorage` 读取代码

~~~~~act
patch_file
src/core/i18n.ts
~~~~~
~~~~~typescript
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
~~~~~typescript
export type LocaleDictionary = Record<string, unknown>;

function getSavedLocale(): string {
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
    }
  }
~~~~~

#### Acts 2: 清理 `settings.ts` 中 locale 相关的 `localStorage` 缓存

~~~~~act
patch_file
src/storage/settings.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
function syncBypassCache(settings: UserSettings): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    if (settings.global.theme) {
      localStorage.setItem('formsight_theme_cache', settings.global.theme);
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
          theme: getCachedBypassTheme(),
        },
        cards: defaultCards,
      };
      cachedSettings = initialSettings;
      await db.put('app_settings', initialSettings, 'global_settings');
      syncBypassCache(initialSettings);
      return initialSettings;
    }
~~~~~

#### Acts 3: 在 `settingsStore.ts` 初始化与更新时同步 `i18n` 语言实例

~~~~~act
patch_file
src/stores/settingsStore.ts
~~~~~
~~~~~typescript
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
~~~~~typescript
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

#### Acts 4: 在 `main.tsx` 挂载应用前，从 IndexedDB 取回配置并同步 `i18n`

~~~~~act
patch_file
src/main.tsx
~~~~~
~~~~~typescript
import { render } from 'preact';
import { App } from './app';
import { applyThemeToDocument } from './hooks/useTheme';
import { getCachedBypassTheme, loadSettings } from './storage/settings';
import './index.css';

// 使用旁路缓存极速应用外观主题，避免首屏渲染闪烁
applyThemeToDocument(getCachedBypassTheme());

// 异步引导 IndexedDB 并渲染主应用
async function bootstrap() {
  await loadSettings();
  const appElement = document.getElementById('app');
  if (appElement) {
    render(<App />, appElement);
  }
}

bootstrap();
~~~~~
~~~~~typescript
import { render } from 'preact';
import { App } from './app';
import { i18n } from './core/i18n';
import { applyThemeToDocument } from './hooks/useTheme';
import { getCachedBypassTheme, loadSettings } from './storage/settings';
import './index.css';

// 使用旁路缓存极速应用外观主题，避免首屏渲染闪烁
applyThemeToDocument(getCachedBypassTheme());

// 异步引导 IndexedDB 并渲染主应用
async function bootstrap() {
  const settings = await loadSettings();
  if (settings.global.locale) {
    i18n.setLocale(settings.global.locale);
  }
  const appElement = document.getElementById('app');
  if (appElement) {
    render(<App />, appElement);
  }
}

bootstrap();
~~~~~

### 下一步建议

1. **测试验证**：在开发服务器上测试语言切换流程：在设置中切换为 English，刷新浏览器页面，确认界面仍稳定显示为英文。
2. **主题首屏变亮动画优化**：接下来可以继续处理第 2 个问题——移除最外层容器 `src/app.tsx` 中的 `transition-colors duration-200`，并统一通过 IDB/挂载前状态消除浅色/深色模式下的过渡闪烁。
