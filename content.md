我们现在开始实施将 FormSight 的全部配置（Settings）与训练计划（Plans）从 LocalStorage 全面收敛并迁移至 IndexedDB 的架构改造，同时保证旧版用户的 LocalStorage 数据在初次启动时无损平滑迁移。

## [WIP] feat: 将系统配置与训练计划全量收敛至 IndexedDB 并支持旧版数据无损迁移

### 用户需求
1. 将原本散落在 `localStorage` 中的用户偏好设置 (`formsight_user_settings`) 与多阶段训练计划 (`formsight_training_plans_store` / `formsight_custom_training_plan`) 完全收敛至 IndexedDB 中进行统一纳管。
2. 在 IndexedDB 版本升级至 v3 时，自动检测并无损迁移旧版用户的 LocalStorage 数据到新表。
3. 全量数据导入（Restore）与备份导出升级为纯粹的 IndexedDB 单事务 ACID 操作，彻底消除伪回滚风险。
4. 提供极简的主题与语言轻量级旁路同步缓存，杜绝首屏加载时的白屏闪烁（FOUT）。

### 评论
将配置与训练计划全量归入 IndexedDB 是打造高可靠 Local-First 应用的关键重构。这不仅解除了浏览器 LocalStorage 的 5MB 紧箍咒，而且使全量备份还原具备了真正的数据库级原子事务保障。通过轻量级的启动旁路缓存机制，既享受了 IDB 的海量与安全性，又保留了毫秒级无感防闪烁的优质 UX。

### 目标
1. **升级数据库模型 (`schema.ts`)**：将 `DB_VERSION` 升级至 `3`，新增 `app_settings`、`training_plans` 与 `app_metadata` 三张 ObjectStore，并在 `upgrade` 逻辑中写入自动迁移旧版 LocalStorage 数据的平滑回填逻辑。
2. **重构设置与计划持久化层 (`settings.ts`, `planStorage.ts`)**：将原有的同步 LocalStorage 访问改为基于 IndexedDB 的异步操作，同时在保存偏好时同步更新轻量防闪缓存。
3. **升级全量导入导出 (`importExport.ts`)**：将设置与计划全部纳入 `db.transaction` 的原子跨表事务中。
4. **统一仓储层与启动引导 (`repository.ts`, `useAppBootstrap.ts`, `main.tsx`)**：收敛所有异步调用，使应用引导流平滑稳定。

### 基本原理
- 在 IndexedDB `openDB` 的 `upgrade` 钩子中，当检测到从版本 1/2 升级到版本 3 时，检查并解析 `localStorage` 中的存量数据，批量写入新 ObjectStore。
- 在 `importExport.ts` 中，使用单一跨 6 张表的 IndexedDB `readwrite` 事务处理全量清空与写入，任何一步失败将由底层自动触发回滚。
- 在 `settings.ts` 保存时，顺带写入轻量的 `theme_mode` 与 `locale_pref` 至 LocalStorage 供 HTML 首屏脚本消费，兼顾异步真理源与极速渲染。

### 标签
#intent/build #flow/ready #priority/high #comp/engine #concept/state #scope/core #scope/dx #ai/instruct #task/domain/storage #task/object/indexeddb-migration #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 升级 IndexedDB Schema (v3) 并实现 LocalStorage 自动迁移

~~~~~act
patch_file
src/storage/db/schema.ts
~~~~~
~~~~~typescript.old
export interface FormSightDBSchema extends DBSchema {
  sessions: {
    key: string;
    value: UnifiedSessionData;
    indexes: {
      'by-card': string;
      'by-domain': string;
      'by-domain-mode': [string, string];
    };
  };
  records: {
    key: string;
    value: UnifiedTrialRecord;
    indexes: {
      'by-card': string;
      'by-session': string;
      'by-domain': string;
      'by-domain-mode': [string, string];
      'by-mode': string;
      'by-card-timestamp': [string, number];
      'by-timestamp': number;
    };
  };
  daily_summaries: {
    key: string;
    value: DailySummaryData;
    indexes: {
      'by-date': string;
      'by-card': string;
      'by-domain': string;
      'by-date-card': [string, string];
      'by-date-domain': [string, string];
    };
  };
  user_profiles: {
    key: string;
    value: UnifiedProfileData;
    indexes: {
      'by-domain': string;
    };
  };
}

export const DB_NAME = 'FormSightDB';
export const DB_VERSION = 2;
~~~~~
~~~~~typescript.new
import type { TrainingPlan } from '../../types/plan';
import type { UserSettings } from '../settings';

export interface FormSightDBSchema extends DBSchema {
  sessions: {
    key: string;
    value: UnifiedSessionData;
    indexes: {
      'by-card': string;
      'by-domain': string;
      'by-domain-mode': [string, string];
    };
  };
  records: {
    key: string;
    value: UnifiedTrialRecord;
    indexes: {
      'by-card': string;
      'by-session': string;
      'by-domain': string;
      'by-domain-mode': [string, string];
      'by-mode': string;
      'by-card-timestamp': [string, number];
      'by-timestamp': number;
    };
  };
  daily_summaries: {
    key: string;
    value: DailySummaryData;
    indexes: {
      'by-date': string;
      'by-card': string;
      'by-domain': string;
      'by-date-card': [string, string];
      'by-date-domain': [string, string];
    };
  };
  user_profiles: {
    key: string;
    value: UnifiedProfileData;
    indexes: {
      'by-domain': string;
    };
  };
  app_settings: {
    key: string;
    value: UserSettings;
  };
  training_plans: {
    key: string;
    value: TrainingPlan;
    indexes: {
      'by-updated': number;
    };
  };
  app_metadata: {
    key: string;
    value: unknown;
  };
}

export const DB_NAME = 'FormSightDB';
export const DB_VERSION = 3;
~~~~~

~~~~~act
patch_file
src/storage/db/schema.ts
~~~~~
~~~~~typescript.old
              for (const summary of summaryMap.values()) {
                await dailyStore.put(summary);
              }
            }
          } catch (e) {
            console.error('Failed to migrate legacy records to daily_summaries:', e);
          }
        }
      },
    });
  }
  return dbPromise;
}
~~~~~
~~~~~typescript.new
              for (const summary of summaryMap.values()) {
                await dailyStore.put(summary);
              }
            }
          } catch (e) {
            console.error('Failed to migrate legacy records to daily_summaries:', e);
          }
        }

        // 6. v3 升级：新增 app_settings, training_plans, app_metadata 并迁移 LocalStorage
        if (!database.objectStoreNames.contains('app_settings')) {
          database.createObjectStore('app_settings');
        }

        if (!database.objectStoreNames.contains('training_plans')) {
          const planStore = database.createObjectStore('training_plans', { keyPath: 'id' });
          planStore.createIndex('by-updated', 'updatedAt');
        }

        if (!database.objectStoreNames.contains('app_metadata')) {
          database.createObjectStore('app_metadata');
        }

        if (oldVersion < 3 && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          try {
            const settingsStore = transaction.objectStore('app_settings');
            const planStore = transaction.objectStore('training_plans');
            const metaStore = transaction.objectStore('app_metadata');

            // 迁移 LocalStorage 中的 settings
            const rawSettings = localStorage.getItem('formsight_user_settings');
            if (rawSettings) {
              const parsedSettings = JSON.parse(rawSettings);
              if (parsedSettings && typeof parsedSettings === 'object') {
                await settingsStore.put(parsedSettings, 'global_settings');
              }
            }

            // 迁移 LocalStorage 中的 plans
            const rawPlans = localStorage.getItem('formsight_training_plans_store');
            let activeId: string | null = null;
            if (rawPlans) {
              const parsed = JSON.parse(rawPlans);
              if (parsed && Array.isArray(parsed.plans)) {
                for (const p of parsed.plans) {
                  await planStore.put(p);
                }
                activeId = parsed.activePlanId || (parsed.plans[0] ? parsed.plans[0].id : null);
              }
            } else {
              // 兼容极早期的 formsight_custom_training_plan
              const legacyRaw = localStorage.getItem('formsight_custom_training_plan');
              if (legacyRaw) {
                const legacyPlan = JSON.parse(legacyRaw);
                if (legacyPlan && legacyPlan.id) {
                  await planStore.put(legacyPlan);
                  activeId = legacyPlan.id;
                }
              }
            }

            if (activeId) {
              await metaStore.put(activeId, 'active_plan_id');
            }
          } catch (migrationErr) {
            console.error('Failed to migrate LocalStorage to IndexedDB in v3 upgrade:', migrationErr);
          }
        }
      },
    });
  }
  return dbPromise;
}
~~~~~

#### Acts 2: 重构设置管理模块 (`src/storage/settings.ts`)

将设置读写重构为基于 IndexedDB 的异步操作，同时向 LocalStorage 写入首屏防白屏旁路缓存。

~~~~~act
write_file
src/storage/settings.ts
~~~~~
~~~~~typescript
import { registry } from '../core/registry';
import { getDB } from './db/schema';

export type StepGranularity = 'standard' | 'fine';
export type AdaptiveMode = 'block' | 'staircase';
export type TargetingMode = 'off' | 'manual';
export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface BaseModuleSettings {
  autoNext: boolean;
  autoNextDelay: number;
  stepGranularity: StepGranularity;
  adaptiveMode: AdaptiveMode;
  targetAccuracy: number;
  blockSize: number;
  [key: string]: unknown;
}

export interface StarSettings extends BaseModuleSettings {
  gridSize?: number;
  targetingMode?: TargetingMode;
  manualTargetSectors?: number[];
}

export interface ColorSenseSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
  targetingMode?: TargetingMode;
  manualTargetSectors?: number[];
}

export interface RelativeColorSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
}

export interface NegativeSpaceSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
}

export interface AbstractionSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
}

export interface GlobalSettings {
  locale: string;
  theme?: ThemeMode;
  idleTimeout: number;
  soundEnabled: boolean;
  sliderHitMargin: number;
  showCanvasHints?: boolean;
}

export interface UserSettings {
  global: GlobalSettings;
  cards: Record<string, BaseModuleSettings>;
}

export const DEFAULT_BASE_SETTINGS: BaseModuleSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
};

/**
 * 纯粹基于 SystemDomainRegistry 中的卡片与 Pack 声明式定义聚合初始默认配置
 */
export function buildDefaultCardSettings(): Record<string, BaseModuleSettings> {
  const cards: Record<string, BaseModuleSettings> = {};
  if (!registry || typeof registry.getAllCards !== 'function') {
    return cards;
  }

  const allCards = registry.getAllCards();

  for (const card of allCards) {
    const manifest = registry.getCardManifest?.(card.id);
    const cardDefaults = manifest?.defaultSettings || card.defaultSettings || {};

    const cardConfig: BaseModuleSettings = {
      ...DEFAULT_BASE_SETTINGS,
      ...cardDefaults,
    };

    if (card.tags?.interaction?.includes('continuous_mod')) {
      if (cardConfig.sliderHitMargin === undefined) {
        cardConfig.sliderHitMargin = 12;
      }
      if (cardConfig.showToleranceBand === undefined) {
        cardConfig.showToleranceBand = true;
      }
    }

    cards[card.id] = cardConfig;
  }

  return cards;
}

export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    locale: 'zh-CN',
    theme: 'system',
    idleTimeout: 60,
    soundEnabled: true,
    sliderHitMargin: 12,
    showCanvasHints: true,
  },
  get cards() {
    return buildDefaultCardSettings();
  },
  set cards(v) {
    Object.defineProperty(this, 'cards', {
      value: v,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  },
};

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
        global: { ...DEFAULT_SETTINGS.global, locale: getCachedBypassLocale(), theme: getCachedBypassTheme() },
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

export function getCardSettings(settings: UserSettings, cardId: string): BaseModuleSettings {
  return settings.cards[cardId] || DEFAULT_SETTINGS.cards[cardId] || DEFAULT_BASE_SETTINGS;
}
~~~~~

#### Acts 3: 重构训练计划管理模块 (`src/storage/planStorage.ts`)

将训练计划存储完全切换为 IndexedDB，并在初次加载为空时自动生成官方默认模板。

~~~~~act
write_file
src/storage/planStorage.ts
~~~~~
~~~~~typescript
import { DEFAULT_PLAN_TEMPLATES } from '../config/planTemplates';
import { i18n } from '../core/i18n';
import type { PlanItem, PlanStorageState, PlanTemplate, TrainingPlan } from '../types/plan';
import { getDB } from './db/schema';

export const EMPTY_TRAINING_PLAN: TrainingPlan = {
  id: 'custom_plan_default',
  name: i18n.t('common.defaultCustomPlanName'),
  description: i18n.t('common.defaultCustomPlanDesc'),
  items: [],
  isFavorite: true,
  isBuiltin: false,
  updatedAt: Date.now(),
};

function createPlanFromTemplateInternal(
  template: PlanTemplate,
  isBuiltin = false,
  isFavorite = true,
): TrainingPlan {
  const items: PlanItem[] = template.items.map((item, idx) => ({
    id: `item_${template.id}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
    cardId: item.cardId,
    targetTrials: item.targetTrials,
  }));

  const templateName = i18n.t(`templates.${template.id}.name`) || template.name;
  const templateDesc = i18n.t(`templates.${template.id}.desc`) || template.description;

  return {
    id: `plan_${template.id}`,
    name: templateName,
    description: templateDesc,
    items,
    isFavorite,
    isBuiltin,
    updatedAt: Date.now(),
  };
}

export function getDefaultPlans(): TrainingPlan[] {
  return DEFAULT_PLAN_TEMPLATES.map((tmpl) => createPlanFromTemplateInternal(tmpl, true, true));
}

let cachedPlanState: PlanStorageState = {
  activePlanId: EMPTY_TRAINING_PLAN.id,
  plans: [EMPTY_TRAINING_PLAN],
};

/**
 * 异步从 IndexedDB 加载全部训练计划与激活计划状态
 */
export async function loadPlanStorageState(): Promise<PlanStorageState> {
  try {
    const db = await getDB();
    const plans = await db.getAll('training_plans');
    let activePlanId = (await db.get('app_metadata', 'active_plan_id')) as string | undefined;

    if (!plans || plans.length === 0) {
      const defaultPlans = getDefaultPlans();
      const tx = db.transaction(['training_plans', 'app_metadata'], 'readwrite');
      const planStore = tx.objectStore('training_plans');
      for (const p of defaultPlans) {
        await planStore.put(p);
      }
      activePlanId = defaultPlans[0]?.id || EMPTY_TRAINING_PLAN.id;
      await tx.objectStore('app_metadata').put(activePlanId, 'active_plan_id');
      await tx.done;

      cachedPlanState = {
        activePlanId,
        plans: defaultPlans,
      };
      return cachedPlanState;
    }

    if (!activePlanId || !plans.some((p) => p.id === activePlanId)) {
      activePlanId = plans[0].id;
      await db.put('app_metadata', activePlanId, 'active_plan_id');
    }

    cachedPlanState = {
      activePlanId,
      plans,
    };
    return cachedPlanState;
  } catch (e) {
    console.error('Failed to load plans from IndexedDB:', e);
    return cachedPlanState;
  }
}

export function getPlanStorageStateSnapshot(): PlanStorageState {
  return cachedPlanState;
}

export async function savePlanStorageState(state: PlanStorageState): Promise<void> {
  cachedPlanState = state;
  try {
    const db = await getDB();
    const tx = db.transaction(['training_plans', 'app_metadata'], 'readwrite');
    const planStore = tx.objectStore('training_plans');
    await planStore.clear();
    for (const p of state.plans) {
      await planStore.put(p);
    }
    await tx.objectStore('app_metadata').put(state.activePlanId, 'active_plan_id');
    await tx.done;
  } catch (e) {
    console.error('Failed to save plan storage state to IndexedDB:', e);
  }
}

export async function loadTrainingPlan(): Promise<TrainingPlan> {
  const state = await loadPlanStorageState();
  const active = state.plans.find((p) => p.id === state.activePlanId);
  return active || state.plans[0] || EMPTY_TRAINING_PLAN;
}

export async function saveTrainingPlan(plan: TrainingPlan): Promise<void> {
  const state = await loadPlanStorageState();
  const index = state.plans.findIndex((p) => p.id === plan.id);
  const updatedPlan: TrainingPlan = {
    ...plan,
    updatedAt: Date.now(),
  };

  let newPlans: TrainingPlan[];
  if (index >= 0) {
    newPlans = [...state.plans];
    newPlans[index] = updatedPlan;
  } else {
    newPlans = [updatedPlan, ...state.plans];
  }

  await savePlanStorageState({
    activePlanId: updatedPlan.id,
    plans: newPlans,
  });
}

export async function setActivePlan(planId: string): Promise<TrainingPlan | null> {
  const state = await loadPlanStorageState();
  const target = state.plans.find((p) => p.id === planId);
  if (!target) return null;

  await savePlanStorageState({
    ...state,
    activePlanId: planId,
  });
  return target;
}

export async function togglePlanFavorite(planId: string): Promise<PlanStorageState> {
  const state = await loadPlanStorageState();
  const newPlans = state.plans.map((p) =>
    p.id === planId ? { ...p, isFavorite: !(p.isFavorite ?? true) } : p,
  );
  const nextState = { ...state, plans: newPlans };
  await savePlanStorageState(nextState);
  return nextState;
}

export async function deletePlan(planId: string): Promise<PlanStorageState> {
  const state = await loadPlanStorageState();
  const newPlans = state.plans.filter((p) => p.id !== planId);
  const safePlans = newPlans.length > 0 ? newPlans : getDefaultPlans();
  const nextActiveId =
    state.activePlanId === planId
      ? safePlans.find((p) => p.isFavorite)?.id || safePlans[0].id
      : state.activePlanId;

  const nextState = { activePlanId: nextActiveId, plans: safePlans };
  await savePlanStorageState(nextState);
  return nextState;
}

export async function resetPlansToDefault(): Promise<PlanStorageState> {
  const defaultPlans = getDefaultPlans();
  const initialState: PlanStorageState = {
    activePlanId: defaultPlans[0]?.id || EMPTY_TRAINING_PLAN.id,
    plans: defaultPlans.length > 0 ? defaultPlans : [EMPTY_TRAINING_PLAN],
  };
  await savePlanStorageState(initialState);
  return initialState;
}

export async function clonePlan(plan: TrainingPlan): Promise<TrainingPlan> {
  const newId = `plan_copy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const cloned: TrainingPlan = {
    ...plan,
    id: newId,
    name: `${plan.name} (${i18n.t('common.copySuffix')})`,
    isBuiltin: false,
    isFavorite: true,
    items: plan.items.map((item) => ({
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    })),
    updatedAt: Date.now(),
  };
  await saveTrainingPlan(cloned);
  return cloned;
}

export function exportPlanToJson(plan: TrainingPlan): string {
  return JSON.stringify(
    {
      appName: 'FormSight',
      type: 'training_plan',
      version: 1,
      exportedAt: new Date().toISOString(),
      plan: {
        name: plan.name,
        description: plan.description,
        items: plan.items.map((item) => ({
          cardId: item.cardId,
          targetTrials: item.targetTrials,
        })),
      },
    },
    null,
    2,
  );
}

export async function importPlanFromJson(jsonStr: string): Promise<TrainingPlan | null> {
  try {
    const data = JSON.parse(jsonStr);
    const planData = data.plan || data;
    if (!planData || !Array.isArray(planData.items) || planData.items.length === 0) {
      return null;
    }

    const newId = `plan_imported_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const importedPlan: TrainingPlan = {
      id: newId,
      name: planData.name
        ? `${planData.name} (${i18n.t('common.importedSuffix')})`
        : i18n.t('common.importedPlanDesc'),
      description: planData.description || i18n.t('common.importedPlanDesc'),
      isFavorite: true,
      isBuiltin: false,
      items: planData.items.map((item: { cardId: string; targetTrials?: number }) => ({
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        cardId: item.cardId,
        targetTrials: item.targetTrials || 20,
      })),
      updatedAt: Date.now(),
    };

    await saveTrainingPlan(importedPlan);
    return importedPlan;
  } catch (e) {
    console.error('Failed to import plan from json:', e);
    return null;
  }
}
~~~~~

#### Acts 4: 升级全量备份与 ACID 事务导入导出 (`src/storage/db/importExport.ts`)

将设置与训练计划全部纳入单一大事务中，实现完全的原子还原与清理。

~~~~~act
write_file
src/storage/db/importExport.ts
~~~~~
~~~~~typescript
import { registry } from '../../core/registry';
import type { PlanStorageState, TrainingPlan } from '../../types/plan';
import {
  getDefaultPlans,
  loadPlanStorageState,
  loadTrainingPlan,
} from '../planStorage';
import {
  DEFAULT_SETTINGS,
  type UserSettings,
  buildDefaultCardSettings,
  loadSettings,
} from '../settings';
import {
  DB_VERSION,
  type DailySummaryData,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
  getLocalDateString,
} from './schema';

export interface FormSightExportBundle {
  appName: string;
  version: number;
  exportAt: string;
  sessions: UnifiedSessionData[];
  records: UnifiedTrialRecord[];
  profiles: UnifiedProfileData[];
  dailySummaries?: DailySummaryData[];
  settings: UserSettings;
  trainingPlan?: TrainingPlan;
  planStorageState?: PlanStorageState;
}

/**
 * 校验备份数据是否符合规范结构
 */
function validateImportBundle(data: unknown): data is FormSightExportBundle {
  if (!data || typeof data !== 'object') return false;
  const bundle = data as Record<string, unknown>;

  if (bundle.appName !== 'FormSight') {
    return false;
  }

  if (bundle.sessions && !Array.isArray(bundle.sessions)) return false;
  if (bundle.records && !Array.isArray(bundle.records)) return false;
  if (bundle.profiles && !Array.isArray(bundle.profiles)) return false;

  return true;
}

/**
 * 流式分块导出 FormSight 全量系统数据为 Blob
 */
export async function exportAllDataStream(): Promise<Blob> {
  const db = await getDB();
  const settings = await loadSettings();
  const trainingPlan = await loadTrainingPlan();
  const planStorageState = await loadPlanStorageState();

  const header = {
    appName: 'FormSight',
    version: DB_VERSION,
    exportAt: new Date().toISOString(),
    settings,
    trainingPlan,
    planStorageState,
  };

  const blobParts: BlobPart[] = [];

  // 1. 写入 Header 元信息
  blobParts.push('{\n');
  blobParts.push(`  "appName": ${JSON.stringify(header.appName)},\n`);
  blobParts.push(`  "version": ${header.version},\n`);
  blobParts.push(`  "exportAt": ${JSON.stringify(header.exportAt)},\n`);
  blobParts.push(`  "settings": ${JSON.stringify(header.settings)},\n`);
  blobParts.push(`  "trainingPlan": ${JSON.stringify(header.trainingPlan)},\n`);
  blobParts.push(`  "planStorageState": ${JSON.stringify(header.planStorageState)},\n`);

  // 2. 分块输出 sessions
  blobParts.push('  "sessions": [\n');
  const sessions = await db.getAll('sessions');
  for (let i = 0; i < sessions.length; i++) {
    blobParts.push(`    ${JSON.stringify(sessions[i])}${i < sessions.length - 1 ? ',' : ''}\n`);
  }
  blobParts.push('  ],\n');

  // 3. 分块输出 user_profiles
  blobParts.push('  "profiles": [\n');
  const profiles = await db.getAll('user_profiles');
  for (let i = 0; i < profiles.length; i++) {
    blobParts.push(`    ${JSON.stringify(profiles[i])}${i < profiles.length - 1 ? ',' : ''}\n`);
  }
  blobParts.push('  ],\n');

  // 4. 分块输出 daily_summaries
  blobParts.push('  "dailySummaries": [\n');
  const dailySummaries = await db.getAll('daily_summaries');
  for (let i = 0; i < dailySummaries.length; i++) {
    blobParts.push(
      `    ${JSON.stringify(dailySummaries[i])}${i < dailySummaries.length - 1 ? ',' : ''}\n`,
    );
  }
  blobParts.push('  ],\n');

  // 5. 分块输出海量 records
  blobParts.push('  "records": [\n');
  const tx = db.transaction('records', 'readonly');
  const store = tx.objectStore('records');
  let cursor = await store.openCursor();
  let isFirst = true;

  while (cursor) {
    if (!isFirst) {
      blobParts.push(',\n');
    }
    blobParts.push(`    ${JSON.stringify(cursor.value)}`);
    isFirst = false;
    cursor = await cursor.continue();
  }

  blobParts.push('\n  ]\n}');

  return new Blob(blobParts, { type: 'application/json' });
}

export async function exportAllData(): Promise<string> {
  const blob = await exportAllDataStream();
  return blob.text();
}

/**
 * 单一 ACID 事务全量还原导入
 */
export async function importAllData(jsonString: string): Promise<boolean> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    console.error('Backup file is not valid JSON:', err);
    return false;
  }

  if (!validateImportBundle(parsed)) {
    console.error('Backup bundle validation failed');
    return false;
  }

  try {
    const db = await getDB();

    // 开启跨所有表的统一原子事务
    const tx = db.transaction(
      [
        'sessions',
        'records',
        'user_profiles',
        'daily_summaries',
        'app_settings',
        'training_plans',
        'app_metadata',
      ],
      'readwrite',
    );

    // 0. 清空现有所有表
    await tx.objectStore('sessions').clear();
    await tx.objectStore('records').clear();
    await tx.objectStore('user_profiles').clear();
    await tx.objectStore('daily_summaries').clear();
    await tx.objectStore('app_settings').clear();
    await tx.objectStore('training_plans').clear();
    await tx.objectStore('app_metadata').clear();

    const cardDomainCache = new Map<string, string>();
    const getCachedDomain = (cardId: string, fallbackDomain?: string): string => {
      const cached = cardDomainCache.get(cardId);
      if (cached !== undefined) return cached;
      const card = registry.getCardById(cardId);
      const domain = card ? card.domain : fallbackDomain || 'core';
      cardDomainCache.set(cardId, domain);
      return domain;
    };

    // 1. 恢复 sessions
    if (parsed.sessions && parsed.sessions.length > 0) {
      const sessionStore = tx.objectStore('sessions');
      for (const s of parsed.sessions) {
        const cardId = s.cardId || s.mode;
        s.cardId = cardId;
        s.domain = getCachedDomain(cardId, s.domain);
        await sessionStore.put(s);
      }
    }

    // 2. 恢复 profiles
    if (parsed.profiles && parsed.profiles.length > 0) {
      const profileStore = tx.objectStore('user_profiles');
      for (const p of parsed.profiles) {
        const cardId = p.cardId || p.mode;
        p.cardId = cardId;
        p.domain = getCachedDomain(cardId, p.domain);
        p.totalTrials = p.totalTrials ?? 0;
        await profileStore.put(p);
      }
    }

    // 3. 恢复 records
    if (parsed.records && parsed.records.length > 0) {
      const recordStore = tx.objectStore('records');
      for (let i = 0; i < parsed.records.length; i++) {
        const r = parsed.records[i];
        const cardId = r.cardId || r.mode;
        r.cardId = cardId;
        r.domain = getCachedDomain(cardId, r.domain);
        await recordStore.put(r);
      }
    }

    // 4. 恢复 daily_summaries
    if (parsed.dailySummaries && parsed.dailySummaries.length > 0) {
      const dailyStore = tx.objectStore('daily_summaries');
      for (const d of parsed.dailySummaries) {
        const cardId = d.cardId || d.mode;
        d.cardId = cardId;
        d.domain = getCachedDomain(cardId, d.domain);
        await dailyStore.put(d);
      }
    } else if (parsed.records && parsed.records.length > 0) {
      const summaryMap = new Map<string, DailySummaryData>();
      let lastTimestamp = -1;
      let lastDateStr = '';

      for (const r of parsed.records) {
        const cardId = r.cardId || r.mode;
        const domain = getCachedDomain(cardId, r.domain);

        let dateStr = lastDateStr;
        if (Math.abs(r.timestamp - lastTimestamp) > 1000 * 60 * 60 * 12 || lastDateStr === '') {
          dateStr = getLocalDateString(r.timestamp);
          lastTimestamp = r.timestamp;
          lastDateStr = dateStr;
        }

        const summaryId = `${dateStr}_${cardId}`;
        const respMs = Number(r.responseTimeMs) || 0;
        const level = Number(r.difficultyLevel) || 1;

        const existing = summaryMap.get(summaryId);
        if (!existing) {
          summaryMap.set(summaryId, {
            id: summaryId,
            date: dateStr,
            cardId,
            domain,
            mode: r.mode,
            totalCount: 1,
            hitCount: r.isHit ? 1 : 0,
            totalTimeMs: respMs,
            maxLevel: level,
            minLevel: level,
            lastLevel: level,
            updatedAt: r.timestamp,
          });
        } else {
          existing.domain = domain;
          existing.totalCount += 1;
          if (r.isHit) existing.hitCount += 1;
          existing.totalTimeMs += respMs;
          existing.maxLevel = Math.max(existing.maxLevel, level);
          existing.minLevel = Math.min(existing.minLevel, level);
          if (r.timestamp >= existing.updatedAt) {
            existing.lastLevel = level;
            existing.updatedAt = r.timestamp;
          }
        }
      }

      const dailyStore = tx.objectStore('daily_summaries');
      for (const summary of summaryMap.values()) {
        await dailyStore.put(summary);
      }
    }

    // 5. 恢复 app_settings
    const settingsStore = tx.objectStore('app_settings');
    const defaultCards = buildDefaultCardSettings();
    const restoredSettings: UserSettings = parsed.settings
      ? {
          global: { ...DEFAULT_SETTINGS.global, ...(parsed.settings.global || {}) },
          cards: { ...defaultCards, ...(parsed.settings.cards || {}) },
        }
      : {
          global: { ...DEFAULT_SETTINGS.global },
          cards: defaultCards,
        };
    await settingsStore.put(restoredSettings, 'global_settings');

    // 6. 恢复 training_plans 与 activePlanId
    const planStore = tx.objectStore('training_plans');
    const metaStore = tx.objectStore('app_metadata');

    if (parsed.planStorageState && Array.isArray(parsed.planStorageState.plans)) {
      for (const p of parsed.planStorageState.plans) {
        await planStore.put(p);
      }
      await metaStore.put(parsed.planStorageState.activePlanId, 'active_plan_id');
    } else if (parsed.trainingPlan) {
      await planStore.put(parsed.trainingPlan);
      await metaStore.put(parsed.trainingPlan.id, 'active_plan_id');
    } else {
      const defaultPlans = getDefaultPlans();
      for (const p of defaultPlans) {
        await planStore.put(p);
      }
      await metaStore.put(defaultPlans[0]?.id, 'active_plan_id');
    }

    await tx.done;
    return true;
  } catch (err) {
    console.error('Failed to import data transactionally:', err);
    return false;
  }
}

/**
 * 清空全量数据
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    [
      'sessions',
      'records',
      'user_profiles',
      'daily_summaries',
      'app_settings',
      'training_plans',
      'app_metadata',
    ],
    'readwrite',
  );
  await tx.objectStore('sessions').clear();
  await tx.objectStore('records').clear();
  await tx.objectStore('user_profiles').clear();
  await tx.objectStore('daily_summaries').clear();
  await tx.objectStore('app_settings').clear();
  await tx.objectStore('training_plans').clear();
  await tx.objectStore('app_metadata').clear();

  const defaultPlans = getDefaultPlans();
  const planStore = tx.objectStore('training_plans');
  for (const p of defaultPlans) {
    await planStore.put(p);
  }
  await tx.objectStore('app_metadata').put(defaultPlans[0]?.id, 'active_plan_id');
  await tx.objectStore('app_settings').put(DEFAULT_SETTINGS, 'global_settings');

  await tx.done;
}
~~~~~

#### Acts 5: 升级仓储层 (`src/storage/repository.ts`)

收敛并统一 repository 中的方法签名与异步调用。

~~~~~act
write_file
src/storage/repository.ts
~~~~~
~~~~~typescript
import type { TrainingPlan } from '../types/plan';
import { clearAllData, exportAllData, exportAllDataStream, importAllData } from './db/importExport';
import { pruneColdRecords } from './db/prune';
import {
  formatTotalTime,
  getAllProfiles,
  getDailySummaries,
  getProfile,
  getTodaySummaries,
  getTrainingTimeMs,
  getTrialRecordsByCard,
  saveSession,
  saveTrialRecord,
} from './db/queries';
import type { UnifiedProfileData } from './db/schema';
import {
  clonePlan,
  deletePlan,
  exportPlanToJson,
  getPlanStorageStateSnapshot,
  importPlanFromJson,
  loadPlanStorageState,
  loadTrainingPlan,
  resetPlansToDefault,
  savePlanStorageState,
  saveTrainingPlan,
  setActivePlan,
  togglePlanFavorite,
} from './planStorage';
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
  getSettingsSnapshot,
  loadSettings,
  saveSettings,
} from './settings';

export interface AppDataSummary {
  totalTimeMs: number;
  profiles: Record<string, UnifiedProfileData>;
  settings: UserSettings;
  trainingPlan: TrainingPlan;
  allPlans: TrainingPlan[];
}

/**
 * 聚合仓储层 (SystemRepository)
 * 统一收敛 IndexedDB 事务与稳态治理操作
 */
export class SystemRepository {
  // === 查询与聚合统计 ===
  public async getAppSummary(): Promise<AppDataSummary> {
    const [totalTimeMs, allProfilesList, settings, planState, trainingPlan] = await Promise.all([
      getTrainingTimeMs(),
      getAllProfiles(),
      loadSettings(),
      loadPlanStorageState(),
      loadTrainingPlan(),
    ]);

    const profiles: Record<string, UnifiedProfileData> = {};
    for (const p of allProfilesList) {
      profiles[p.cardId] = p;
    }

    return {
      totalTimeMs,
      profiles,
      settings,
      trainingPlan,
      allPlans: planState.plans,
    };
  }

  // === 答题与会话持久化 ===
  public saveTrial = saveTrialRecord;
  public saveSession = saveSession;
  public getProfile = getProfile;
  public getAllProfiles = getAllProfiles;
  public getDailySummaries = getDailySummaries;
  public getTodaySummaries = getTodaySummaries;
  public getTrialRecordsByCard = getTrialRecordsByCard;
  public getTrainingTimeMs = getTrainingTimeMs;
  public formatTotalTime = formatTotalTime;

  // === 设置偏好管理 ===
  public getSettings = loadSettings;
  public getSettingsSnapshot = getSettingsSnapshot;
  public saveSettings = saveSettings;
  public getCardSettings(cardId: string): BaseModuleSettings {
    const current = getSettingsSnapshot();
    return getCardSettings(current, cardId);
  }

  // === 训练计划管理 ===
  public getPlanStorageState = loadPlanStorageState;
  public getPlanStorageStateSnapshot = getPlanStorageStateSnapshot;
  public savePlanStorageState = savePlanStorageState;
  public getActivePlan = loadTrainingPlan;
  public savePlan = saveTrainingPlan;
  public setActivePlan = setActivePlan;
  public toggleFavorite = togglePlanFavorite;
  public deletePlan = deletePlan;
  public resetPlans = resetPlansToDefault;
  public clonePlan = clonePlan;
  public exportPlanJson = exportPlanToJson;
  public importPlanJson = importPlanFromJson;

  // === 全局备份恢复与稳态治理 ===
  public exportAllData = exportAllData;
  public exportAllDataStream = exportAllDataStream;
  public importAllData = importAllData;
  public clearAllData = clearAllData;
  public pruneColdRecords = pruneColdRecords;
}

export const repository = new SystemRepository();
~~~~~

#### Acts 6: 适配应用生命周期与 Hook (`useAppBootstrap.ts`, `useTheme.ts`, `usePlanEditorState.ts`, `DataGovernanceSection.tsx`, `SettingsModal.tsx`, `GlobalSettingsModal.tsx`, `main.tsx`)

~~~~~act
patch_file
src/hooks/useAppBootstrap.ts
~~~~~
~~~~~typescript.old
export function useAppBootstrap(route: RouteLocation, refreshTodayStats: () => Promise<void>) {
  const { t } = useTranslation();
  const lastHomeRouteRef = useRef<RouteLocation>({ type: 'home' });

  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan>(loadTrainingPlan);
  const [allPlans, setAllPlans] = useState<TrainingPlan[]>(() => loadPlanStorageState().plans);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState<boolean>(false);
  const [totalTimeMs, setTotalTimeMs] = useState<number>(0);
  const [profiles, setProfiles] = useState<Record<string, UnifiedProfileData>>({});
  const [dataVersion, setDataVersion] = useState<number>(0);
~~~~~
~~~~~typescript.new
import { EMPTY_TRAINING_PLAN, getPlanStorageStateSnapshot } from '../storage/planStorage';
import { DEFAULT_SETTINGS, getSettingsSnapshot } from '../storage/settings';

export function useAppBootstrap(route: RouteLocation, refreshTodayStats: () => Promise<void>) {
  const { t } = useTranslation();
  const lastHomeRouteRef = useRef<RouteLocation>({ type: 'home' });

  const [settings, setSettings] = useState<UserSettings>(getSettingsSnapshot);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan>(EMPTY_TRAINING_PLAN);
  const [allPlans, setAllPlans] = useState<TrainingPlan[]>(() => getPlanStorageStateSnapshot().plans);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState<boolean>(false);
  const [totalTimeMs, setTotalTimeMs] = useState<number>(0);
  const [profiles, setProfiles] = useState<Record<string, UnifiedProfileData>>({});
  const [dataVersion, setDataVersion] = useState<number>(0);
~~~~~

~~~~~act
patch_file
src/hooks/useAppBootstrap.ts
~~~~~
~~~~~typescript.old
  const handleSelectPlanOnHome = useCallback(
    (planId: string) => {
      const target = setActivePlan(planId);
      if (target) {
        setTrainingPlan(target);
        showToast(t('common.switchedPlanToast', { name: target.name }), 'info');
      }
    },
    [showToast, t],
  );
~~~~~
~~~~~typescript.new
  const handleSelectPlanOnHome = useCallback(
    async (planId: string) => {
      const target = await setActivePlan(planId);
      if (target) {
        setTrainingPlan(target);
        showToast(t('common.switchedPlanToast', { name: target.name }), 'info');
      }
    },
    [showToast, t],
  );
~~~~~

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
~~~~~
~~~~~typescript.new
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
      const activeMode =
        externalSettings?.global?.theme || getSettingsSnapshot().global.theme || 'system';
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

    const current = getSettingsSnapshot();
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

~~~~~act
patch_file
src/components/plan/editor/usePlanEditorState.ts
~~~~~
~~~~~typescript.old
import { useMemo, useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import {
  clonePlan,
  deletePlan,
  exportPlanToJson,
  importPlanFromJson,
  loadPlanStorageState,
  savePlanStorageState,
  togglePlanFavorite,
} from '../../../storage/planStorage';
import type { PlanItem, PlanStorageState, TrainingPlan } from '../../../types/plan';
import {
  batchUpdateItemTrials,
  createNewBlankPlan,
  createPlanItem,
  movePlanItem,
  removePlanItem,
  sanitizePlan,
  updatePlanItemTrials,
} from './planItemUtils';

export interface UsePlanEditorStateOptions {
  initialPlan: TrainingPlan;
  onSaveAndExit: (plan: TrainingPlan) => void;
  onStartPlanDirectly: (plan: TrainingPlan) => void;
  onPlanListChanged?: () => void;
}

export function usePlanEditorState({
  initialPlan,
  onSaveAndExit,
  onStartPlanDirectly,
  onPlanListChanged,
}: UsePlanEditorStateOptions) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [storageState, setStorageState] = useState<PlanStorageState>(loadPlanStorageState);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan>({ ...initialPlan });
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [planNameInput, setPlanNameInput] = useState<string>(initialPlan.name);
  const [showPlanManager, setShowPlanManager] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
~~~~~
~~~~~typescript.new
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import {
  clonePlan,
  deletePlan,
  exportPlanToJson,
  getPlanStorageStateSnapshot,
  importPlanFromJson,
  loadPlanStorageState,
  savePlanStorageState,
  togglePlanFavorite,
} from '../../../storage/planStorage';
import type { PlanItem, PlanStorageState, TrainingPlan } from '../../../types/plan';
import {
  batchUpdateItemTrials,
  createNewBlankPlan,
  createPlanItem,
  movePlanItem,
  removePlanItem,
  sanitizePlan,
  updatePlanItemTrials,
} from './planItemUtils';

export interface UsePlanEditorStateOptions {
  initialPlan: TrainingPlan;
  onSaveAndExit: (plan: TrainingPlan) => void;
  onStartPlanDirectly: (plan: TrainingPlan) => void;
  onPlanListChanged?: () => void;
}

export function usePlanEditorState({
  initialPlan,
  onSaveAndExit,
  onStartPlanDirectly,
  onPlanListChanged,
}: UsePlanEditorStateOptions) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [storageState, setStorageState] = useState<PlanStorageState>(getPlanStorageStateSnapshot);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan>({ ...initialPlan });
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [planNameInput, setPlanNameInput] = useState<string>(initialPlan.name);
  const [showPlanManager, setShowPlanManager] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  useEffect(() => {
    loadPlanStorageState().then((state) => {
      setStorageState(state);
    });
  }, []);
~~~~~

~~~~~act
patch_file
src/components/plan/editor/usePlanEditorState.ts
~~~~~
~~~~~typescript.old
  const handleImportPlan = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      target.files[0].text().then((text) => {
        const imported = importPlanFromJson(text);
        if (imported) {
          const nextState = loadPlanStorageState();
          setStorageState(nextState);
          setCurrentPlan(imported);
          setPlanNameInput(imported.name);
          setShowPlanManager(false);
          onPlanListChanged?.();
          showToast(t('plan.importedPlanSuccessToast', { name: imported.name }));
        } else {
          showToast(t('plan.importedPlanFailToast'));
        }
      });
    }
  };

  const persist = (): TrainingPlan => {
    const sanitized = sanitizePlan(currentPlan, planNameInput);
    const updatedPlans = storageState.plans.some((p) => p.id === sanitized.id)
      ? storageState.plans.map((p) => (p.id === sanitized.id ? sanitized : p))
      : [sanitized, ...storageState.plans];

    savePlanStorageState({ activePlanId: sanitized.id, plans: updatedPlans });
    onPlanListChanged?.();
    return sanitized;
  };
~~~~~
~~~~~typescript.new
  const handleImportPlan = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      target.files[0].text().then(async (text) => {
        const imported = await importPlanFromJson(text);
        if (imported) {
          const nextState = await loadPlanStorageState();
          setStorageState(nextState);
          setCurrentPlan(imported);
          setPlanNameInput(imported.name);
          setShowPlanManager(false);
          onPlanListChanged?.();
          showToast(t('plan.importedPlanSuccessToast', { name: imported.name }));
        } else {
          showToast(t('plan.importedPlanFailToast'));
        }
      });
    }
  };

  const persist = async (): Promise<TrainingPlan> => {
    const sanitized = sanitizePlan(currentPlan, planNameInput);
    const updatedPlans = storageState.plans.some((p) => p.id === sanitized.id)
      ? storageState.plans.map((p) => (p.id === sanitized.id ? sanitized : p))
      : [sanitized, ...storageState.plans];

    await savePlanStorageState({ activePlanId: sanitized.id, plans: updatedPlans });
    onPlanListChanged?.();
    return sanitized;
  };
~~~~~

~~~~~act
patch_file
src/components/plan/editor/usePlanEditorState.ts
~~~~~
~~~~~typescript.old
    handleCloneCurrent: () => {
      const cloned = clonePlan(currentPlan);
      const nextState = loadPlanStorageState();
      setStorageState(nextState);
      setCurrentPlan(cloned);
      setPlanNameInput(cloned.name);
      onPlanListChanged?.();
      showToast(t('plan.clonedPlanToast', { name: cloned.name }));
    },
    handleToggleFavoriteItem: (planId: string, e: MouseEvent) => {
      e.stopPropagation();
      const nextState = togglePlanFavorite(planId);
      setStorageState(nextState);
      if (currentPlan.id === planId) {
        setCurrentPlan((prev) => ({ ...prev, isFavorite: !(prev.isFavorite ?? true) }));
      }
      onPlanListChanged?.();
    },
    handleDeletePlanItem: (planId: string, e: MouseEvent) => {
      e.stopPropagation();
      if (storageState.plans.length <= 1) {
        showToast(t('plan.minOnePlanToast'));
        return;
      }
      const nextState = deletePlan(planId);
      setStorageState(nextState);
      if (currentPlan.id === planId) {
        const fallback = nextState.plans[0];
        setCurrentPlan(fallback);
        setPlanNameInput(fallback.name);
      }
      onPlanListChanged?.();
      showToast(t('plan.planDeletedToast'));
    },
    handleExportPlan: () => {
      const jsonStr = exportPlanToJson(currentPlan);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `formsight_plan_${currentPlan.name.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('plan.exportedJsonToast'));
    },
    handleImportPlan,
    handleSaveOnly: () => onSaveAndExit(persist()),
    handleSaveAndStart: () => onStartPlanDirectly(persist()),
  };
}
~~~~~
~~~~~typescript.new
    handleCloneCurrent: async () => {
      const cloned = await clonePlan(currentPlan);
      const nextState = await loadPlanStorageState();
      setStorageState(nextState);
      setCurrentPlan(cloned);
      setPlanNameInput(cloned.name);
      onPlanListChanged?.();
      showToast(t('plan.clonedPlanToast', { name: cloned.name }));
    },
    handleToggleFavoriteItem: async (planId: string, e: MouseEvent) => {
      e.stopPropagation();
      const nextState = await togglePlanFavorite(planId);
      setStorageState(nextState);
      if (currentPlan.id === planId) {
        setCurrentPlan((prev) => ({ ...prev, isFavorite: !(prev.isFavorite ?? true) }));
      }
      onPlanListChanged?.();
    },
    handleDeletePlanItem: async (planId: string, e: MouseEvent) => {
      e.stopPropagation();
      if (storageState.plans.length <= 1) {
        showToast(t('plan.minOnePlanToast'));
        return;
      }
      const nextState = await deletePlan(planId);
      setStorageState(nextState);
      if (currentPlan.id === planId) {
        const fallback = nextState.plans[0];
        setCurrentPlan(fallback);
        setPlanNameInput(fallback.name);
      }
      onPlanListChanged?.();
      showToast(t('plan.planDeletedToast'));
    },
    handleExportPlan: () => {
      const jsonStr = exportPlanToJson(currentPlan);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `formsight_plan_${currentPlan.name.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('plan.exportedJsonToast'));
    },
    handleImportPlan,
    handleSaveOnly: async () => onSaveAndExit(await persist()),
    handleSaveAndStart: async () => onStartPlanDirectly(await persist()),
  };
}
~~~~~

~~~~~act
patch_file
src/components/modals/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript.old
export function GlobalSettingsModal({
  settings: externalSettings,
  onClose,
  onSave,
  onDataChanged,
  showToast,
}: GlobalSettingsModalProps) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<UserSettings>(() => externalSettings || loadSettings());

  useEffect(() => {
    if (externalSettings) {
      setSettings(externalSettings);
    }
  }, [externalSettings]);

  const handleUpdateGlobal = (patch: Partial<GlobalSettings>) => {
    const updated: UserSettings = {
      ...settings,
      global: {
        ...settings.global,
        ...patch,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onSave?.(updated);
    onDataChanged();
  };
~~~~~
~~~~~typescript.new
export function GlobalSettingsModal({
  settings: externalSettings,
  onClose,
  onSave,
  onDataChanged,
  showToast,
}: GlobalSettingsModalProps) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<UserSettings>(
    () => externalSettings || { global: { locale: 'zh-CN', idleTimeout: 60, soundEnabled: true, sliderHitMargin: 12, showCanvasHints: true }, cards: {} },
  );

  useEffect(() => {
    if (externalSettings) {
      setSettings(externalSettings);
    } else {
      loadSettings().then((s) => setSettings(s));
    }
  }, [externalSettings]);

  const handleUpdateGlobal = async (patch: Partial<GlobalSettings>) => {
    const updated: UserSettings = {
      ...settings,
      global: {
        ...settings.global,
        ...patch,
      },
    };
    await saveSettings(updated);
    setSettings(updated);
    onSave?.(updated);
    onDataChanged();
  };
~~~~~

~~~~~act
patch_file
src/components/modals/SettingsModal.tsx
~~~~~
~~~~~typescript.old
  const updateCardConfig = (patch: Partial<BaseModuleSettings>) => {
    setCurrent((prev) => {
      const updatedCard = {
        ...getCardSettings(prev, card.id),
        ...patch,
      };
      const nextSettings: UserSettings = {
        ...prev,
        cards: {
          ...prev.cards,
          [card.id]: updatedCard,
        },
      };
      saveSettings(nextSettings);
      onSave(nextSettings);
      return nextSettings;
    });
  };
~~~~~
~~~~~typescript.new
  const updateCardConfig = (patch: Partial<BaseModuleSettings>) => {
    setCurrent((prev) => {
      const updatedCard = {
        ...getCardSettings(prev, card.id),
        ...patch,
      };
      const nextSettings: UserSettings = {
        ...prev,
        cards: {
          ...prev.cards,
          [card.id]: updatedCard,
        },
      };
      saveSettings(nextSettings).catch((err) => console.error(err));
      onSave(nextSettings);
      return nextSettings;
    });
  };
~~~~~

~~~~~act
patch_file
src/components/settings/sections/DataGovernanceSection.tsx
~~~~~
~~~~~typescript.old
  const handleResetPlansConfirmed = () => {
    setShowResetPlansConfirm(false);
    resetPlansToDefault();
    showToast(t('settings.resetPlansSuccessToast'), 'success');
    onDataChanged();
  };
~~~~~
~~~~~typescript.new
  const handleResetPlansConfirmed = async () => {
    setShowResetPlansConfirm(false);
    await resetPlansToDefault();
    showToast(t('settings.resetPlansSuccessToast'), 'success');
    await onDataChanged();
  };
~~~~~

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~typescript.old
    if (route.type === 'plan-editor') {
      return (
        <PlanEditorView
          key={`plan-editor-${dataVersion}`}
          initialPlan={trainingPlan}
          onExit={() => navigate(lastHomeRoute)}
          onPlanListChanged={onRefreshProfiles}
          onSaveAndExit={(newPlan) => {
            saveTrainingPlan(newPlan);
            onSetTrainingPlan(newPlan);
            onRefreshProfiles();
            showToast(t('common.planUpdatedToast'), 'success');
            navigate(lastHomeRoute);
          }}
          onStartPlanDirectly={(newPlan) => {
            saveTrainingPlan(newPlan);
            onSetTrainingPlan(newPlan);
            onRefreshProfiles();
            navigate({ type: 'plan-train' });
          }}
        />
      );
    }
~~~~~
~~~~~typescript.new
    if (route.type === 'plan-editor') {
      return (
        <PlanEditorView
          key={`plan-editor-${dataVersion}`}
          initialPlan={trainingPlan}
          onExit={() => navigate(lastHomeRoute)}
          onPlanListChanged={onRefreshProfiles}
          onSaveAndExit={async (newPlan) => {
            await saveTrainingPlan(newPlan);
            onSetTrainingPlan(newPlan);
            await onRefreshProfiles();
            showToast(t('common.planUpdatedToast'), 'success');
            navigate(lastHomeRoute);
          }}
          onStartPlanDirectly={async (newPlan) => {
            await saveTrainingPlan(newPlan);
            onSetTrainingPlan(newPlan);
            await onRefreshProfiles();
            navigate({ type: 'plan-train' });
          }}
        />
      );
    }
~~~~~

~~~~~act
patch_file
src/main.tsx
~~~~~
~~~~~typescript.old
import { render } from 'preact';
import { App } from './app';
import { applyThemeToDocument } from './hooks/useTheme';
import { loadSettings } from './storage/settings';
import './index.css';

// 初始化应用已保存的外观主题
applyThemeToDocument(loadSettings().global.theme);

const appElement = document.getElementById('app');
if (appElement) {
  render(<App />, appElement);
}
~~~~~
~~~~~typescript.new
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

### 下一步建议

我们已经完成了将全局设置（Settings）与训练计划（Plans）从 LocalStorage 全量收敛至 IndexedDB 的架构重构，并为旧版存量用户实现了无损自动数据迁移与单事务 ACID 备份还原。

建议接下来执行以下验证与优化：
1. **启动与迁移验证**：在本地浏览器环境测试运行应用，验证 IndexedDB 升级到 v3 后新表与存量 LocalStorage 数据平滑回填是否正常。
2. **备份还原测试**：通过设置弹窗导出全量 JSON 备份，测试数据清空后再次还原时跨 6 张表原子事务的一致性。
