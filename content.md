我们针对 Biome Linter 报出的两处语法与规范错误进行精准修复。

## [WIP] fix: 修复 Biome 报出的 hook 依赖检查与 explicit any 类型错误

### 错误分析
1. **`useAppBootstrap.ts`**: Biome 规则 `lint/correctness/useExhaustiveDependencies` 提示在 `useEffect` 的依赖数组中直接写 `$activePlan.value.name` 属于冗余/无法静态优化的表达式，需添加说明注释忽略或规范化处理。
2. **`settingsStore.ts`**: Biome 规则 `lint/suspicious/noExplicitAny` 禁止使用 `as any`，应将其替换为精准的领域类型 `BaseModuleSettings`。

### 用户需求
修复 `src/hooks/useAppBootstrap.ts` 与 `src/stores/settingsStore.ts` 中的 Linter 报错，确保 `npm run check`（或 Biome check）完全通过且无警告或错误。

### 评论
保持代码库完全符合严格的静态分析检查规范是保证代码稳健性与 CI/CD 流程通畅的必要前提。使用强类型 `BaseModuleSettings` 替代 `any` 能够增强类型推导的严密性。

### 目标
1. 在 `useAppBootstrap.ts` 中添加 Biome 针对动态依赖的注释忽略说明。
2. 在 `settingsStore.ts` 中将 `as any` 类型断言替换为 `as BaseModuleSettings`。

### 基本原理
- 对于 Preact Hooks 依赖列表中对 Signal 成员属性的动态追踪，通过 `// biome-ignore lint/correctness/useExhaustiveDependencies: ...` 显式声明意图。
- 引入已定义的 `BaseModuleSettings` 接口进行安全的字典值结构断言，完全消除 `any` 类型警告。

### 标签
#intent/fix #flow/ready #priority/high #comp/runtime #concept/config #scope/dx #ai/instruct #task/domain/state #task/object/linter-fixes #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修复 `settingsStore.ts` 中的 `any` 类型断言

引入 `BaseModuleSettings` 与 `DEFAULT_BASE_SETTINGS`，将 `as any` 替换为强类型 `as BaseModuleSettings`。

~~~~~act
write_file
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

export async function updateCardSettings(
  cardId: string,
  patch: Partial<BaseModuleSettings> | Record<string, unknown>,
): Promise<UserSettings> {
  const currentCard = $settings.value.cards[cardId] || DEFAULT_BASE_SETTINGS;
  const next: UserSettings = {
    ...$settings.value,
    cards: {
      ...$settings.value.cards,
      [cardId]: {
        ...currentCard,
        ...patch,
      } as BaseModuleSettings,
    },
  };
  $settings.value = next;
  await saveSettingsToDB(next);
  return next;
}
~~~~~

#### Acts 2: 修复 `useAppBootstrap.ts` 中的依赖检查警告

在 `useAppBootstrap.ts` 的标题联动 `useEffect` 前添加 Biome 依赖忽略注释。

~~~~~act
write_file
src/hooks/useAppBootstrap.ts
~~~~~
~~~~~typescript
import { useCallback, useEffect, useRef } from 'preact/hooks';
import { getCardTitle, i18n, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import { $activePlan, $allPlans, initPlanStore, setActivePlanAction } from '../stores/planStore';
import {
  $isProfilesLoaded,
  $profiles,
  $todayStatsMap,
  $totalTimeMs,
  refreshAppData,
} from '../stores/profileStore';
import { $settings, initSettingsStore } from '../stores/settingsStore';
import { $toasts, dismissToast, showToast } from '../stores/toastStore';
import type { RouteLocation } from './useHashRoute';

export function useAppBootstrap(route: RouteLocation) {
  const { t } = useTranslation();
  const lastHomeRouteRef = useRef<RouteLocation>({ type: 'home' });

  useEffect(() => {
    i18n.init();
    Promise.all([initSettingsStore(), initPlanStore(), refreshAppData()]);
  }, []);

  // 动态更新页面标题
  // biome-ignore lint/correctness/useExhaustiveDependencies: update document title when plan name or route changes
  useEffect(() => {
    const currentPlanName = $activePlan.value.name;
    if (route.type === 'home') {
      lastHomeRouteRef.current = route;
      document.title = `${t('nav.dashboard')} - ${t('common.appName')}`;
    } else if (route.type === 'discovery') {
      lastHomeRouteRef.current = route;
      document.title = `${t('nav.discovery')} - ${t('common.appName')}`;
    } else if (route.type === 'plan-editor') {
      document.title = `${t('plan.editPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'plan-train') {
      document.title = `${currentPlanName || t('plan.todayPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'stats') {
      document.title = `${t('stats.title')} - ${t('common.appName')}`;
    } else if (route.type === 'analytics') {
      const card = registry.getCardById(route.cardId);
      const cardTitle = card ? getCardTitle(card, t) : t('common.stats');
      document.title = `${cardTitle} - ${t('common.stats')} - ${t('common.appName')}`;
    } else if (route.type === 'train') {
      const card = registry.getCardById(route.cardId);
      const cardTitle = card ? getCardTitle(card, t) : t('shell.training');
      document.title = `${cardTitle} - ${t('common.appName')}`;
    }
  }, [route, $activePlan.value.name, t]);

  const handleSelectPlanOnHome = useCallback(
    async (planId: string) => {
      const target = await setActivePlanAction(planId);
      if (target) {
        showToast(t('common.switchedPlanToast', { name: target.name }), 'info');
      }
    },
    [t],
  );

  return {
    lastHomeRoute: lastHomeRouteRef.current,
    settings: $settings.value,
    trainingPlan: $activePlan.value,
    allPlans: $allPlans.value,
    toasts: $toasts.value,
    profilesLoaded: $isProfilesLoaded.value,
    totalTimeMs: $totalTimeMs.value,
    profiles: $profiles.value,
    todayStats: $todayStatsMap.value,
    showToast,
    handleDismissToast: dismissToast,
    refreshProfiles: refreshAppData,
    handleSelectPlanOnHome,
  };
}
~~~~~

### 下一步建议
1. 重新运行代码检查命令（如 `npx @biomejs/biome check`）确保所有检查项 100% 通过。
2. 运行构建命令（如 `npm run build`）确认 TypeScript 编译与 Vite 打包无任何错误。
