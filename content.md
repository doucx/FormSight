好的，我们现在进入夜间模式**第二阶段：全局设置主题切换交互与单测适配**。

本阶段我们将：
1. 更新 `GeneralPreferencesSection.tsx`，在全局设置中增加「浅色 / 深色 / 跟随系统」三段式外观模式切换器，附带图标指示与 Toast 状态通知；
2. 更新 `settings.test.ts`，补充覆盖 `theme: 'system'` 默认值及局部合并（Partial Load）的单测断言。

## [WIP] feat: 全局设置中添加外观主题切换器与单测适配

### 用户需求
在全局偏好设置面板中提供直观的外观主题切换组件（浅色、深色、跟随系统），并在切换时触发全局响应与提示，同时确保配置层单元测试完整通过。

### 评论
将外观模式与多语言切换并列放置在系统偏好最上方，符合现代应用的设计习惯。支持「跟随系统 (System)」能让用户在操作系统级别切换明暗外观时获得无缝的视觉体验。

### 目标
1. 在 `GeneralPreferencesSection.tsx` 中集成外观模式三段式选择器与 Toast 提示。
2. 在 `settings.test.ts` 中补充 `theme` 默认值与偏好持久化合并测试用例。

### 基本原理
通过将 `theme` 变更分发至 `onUpdateGlobal({ theme: newTheme })`，`useAppBootstrap` 与 `useTheme` 会同时捕获到偏好变更，即时触发 DOM 树的 `.dark` class 更新和 LocalStorage 持久化存储。

### 标签
#intent/build #flow/ready #priority/high #comp/cli #concept/ui #concept/config #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/dark-mode #task/action/settings-integration #task/state/continue

---

### Script

#### Acts 1: 在全局设置偏好面板中加入外观主题切换器

更新 `src/components/settings/sections/GeneralPreferencesSection.tsx`，加入三段式主题选择按钮组与状态通知。

~~~~~act
patch_file
src/components/settings/sections/GeneralPreferencesSection.tsx
~~~~~
~~~~~typescript
import { Clock, Globe, HelpCircle, Volume2 } from 'lucide-preact';
import { useTranslation } from '../../../core/i18n';
import type { GlobalSettings, UserSettings } from '../../../utils/settings';
import type { ToastType } from '../../common/Toast';
import { SettingToggleItem } from '../common/SettingToggleItem';
import { SliderMarginGroup } from '../common/SliderMarginGroup';
~~~~~
~~~~~typescript
import { Clock, Globe, HelpCircle, Monitor, Moon, Sun, Volume2 } from 'lucide-preact';
import { useTranslation } from '../../../core/i18n';
import type { GlobalSettings, ThemeMode, UserSettings } from '../../../utils/settings';
import type { ToastType } from '../../common/Toast';
import { SettingToggleItem } from '../common/SettingToggleItem';
import { SliderMarginGroup } from '../common/SliderMarginGroup';
~~~~~

~~~~~act
patch_file
src/components/settings/sections/GeneralPreferencesSection.tsx
~~~~~
~~~~~typescript
  const handleLocaleChange = (newLocale: string) => {
    onUpdateGlobal({ locale: newLocale });
    setLocale(newLocale);
    showToast(t('settings.switchedLocaleToast'), 'success');
  };

  return (
    <div className="space-y-4">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        {t('settings.preferences')}
      </div>

      {/* 语言切换器 */}
~~~~~
~~~~~typescript
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

  const currentTheme = settings.global.theme || 'system';

  return (
    <div className="space-y-4">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        {t('settings.preferences')}
      </div>

      {/* 外观模式切换器 */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
            {currentTheme === 'dark' ? (
              <Moon className="w-4 h-4" />
            ) : currentTheme === 'light' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Monitor className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {t('settings.themeTitle')}
            </div>
            <div className="text-[11px] text-slate-400">{t('settings.themeDesc')}</div>
          </div>
        </div>

        <div className="flex items-center bg-slate-200/80 dark:bg-slate-900/80 p-0.5 rounded-xl">
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              currentTheme === 'light'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title={t('settings.themeLight')}
          >
            <Sun className="w-3 h-3" />
            <span className="hidden sm:inline">{t('settings.themeLight')}</span>
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              currentTheme === 'dark'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title={t('settings.themeDark')}
          >
            <Moon className="w-3 h-3" />
            <span className="hidden sm:inline">{t('settings.themeDark')}</span>
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('system')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              currentTheme === 'system'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title={t('settings.themeSystem')}
          >
            <Monitor className="w-3 h-3" />
            <span className="hidden sm:inline">{t('settings.themeSystem')}</span>
          </button>
        </div>
      </div>

      {/* 语言切换器 */}
~~~~~

#### Acts 2: 更新设置配置的单元测试用例

在 `src/utils/__tests__/settings.test.ts` 中补充对 `theme` 默认值以及部分配置合并的测试断言。

~~~~~act
patch_file
src/utils/__tests__/settings.test.ts
~~~~~
~~~~~typescript
  it('loadSettings - should return default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.global.soundEnabled).toBe(true);
    expect(settings.cards.star_single.autoNext).toBe(true);
    expect(settings.cards.color_hue.autoNext).toBe(true);
    expect(settings.cards.rel_vector_shift.autoNext).toBe(true);
    expect(settings.cards.star_single.gridSize).toBe(3);
    expect(settings.cards.color_hue.showToleranceBand).toBe(true);
  });
~~~~~
~~~~~typescript
  it('loadSettings - should return default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.global.soundEnabled).toBe(true);
    expect(settings.global.theme).toBe('system');
    expect(settings.cards.star_single.autoNext).toBe(true);
    expect(settings.cards.color_hue.autoNext).toBe(true);
    expect(settings.cards.rel_vector_shift.autoNext).toBe(true);
    expect(settings.cards.star_single.gridSize).toBe(3);
    expect(settings.cards.color_hue.showToleranceBand).toBe(true);
  });
~~~~~

~~~~~act
patch_file
src/utils/__tests__/settings.test.ts
~~~~~
~~~~~typescript
  it('loadSettings - should merge partial card settings with default values', () => {
    const partialSettings = {
      global: {
        idleTimeout: 120,
      },
      cards: {
        star_single: {
          gridSize: 5,
        },
      },
    };

    localStorage.setItem('formsight_user_settings', JSON.stringify(partialSettings));

    const loaded = loadSettings();
    expect(loaded.global.idleTimeout).toBe(120);
    expect(loaded.global.soundEnabled).toBe(DEFAULT_SETTINGS.global.soundEnabled);
    expect(loaded.cards.star_single.gridSize).toBe(5);
~~~~~
~~~~~typescript
  it('loadSettings - should merge partial card settings with default values', () => {
    const partialSettings = {
      global: {
        idleTimeout: 120,
        theme: 'dark',
      },
      cards: {
        star_single: {
          gridSize: 5,
        },
      },
    };

    localStorage.setItem('formsight_user_settings', JSON.stringify(partialSettings));

    const loaded = loadSettings();
    expect(loaded.global.idleTimeout).toBe(120);
    expect(loaded.global.theme).toBe('dark');
    expect(loaded.global.soundEnabled).toBe(DEFAULT_SETTINGS.global.soundEnabled);
    expect(loaded.cards.star_single.gridSize).toBe(5);
~~~~~

### 下一步建议

我们已经完成了第二阶段（设置交互面板与单测验证）。

建议进入**第三阶段：UI 与通用组件的深色模式适配 (Tailwind dark:* 类名注入)**：
1. **基础骨架与弹窗容器**：适配 `AppNavigation.tsx`、`ModalShell.tsx`、`ConfirmModal.tsx`、`Toast.tsx`、`TagPill.tsx`；
2. **训练与卡片容器**：适配 `ModeCard.tsx`、`QuestionCardShell.tsx`、`Choice2AfcContainer.tsx`、`ChoiceNafcContainer.tsx`、`StandardSliderView.tsx`、`TrainingShell.tsx`。
