我已定位所有 Biome Linter 报错以及 `scripts/check_i18n.py` 扫描出的 32 处硬编码中文。现在将生成包含完整修复指令的行动计划。

## [WIP] refactor: 消除所有硬编码中文与修复词典重复键

### 用户需求
1. 修复 `src/locales/en-US.json` 与 `src/locales/zh-CN.json` 中的重复键定义 (`confirm`, `cancel`, `save`)。
2. 消除 `src/app.tsx` 中 `useEffect` 的冗余 `locale` 依赖。
3. 彻底抽离 `src/config/planTemplates.ts`、`src/utils/planStorage.ts`、`src/utils/db/*`、`src/components/GlobalSettingsModal.tsx` 及 Pack 组件中的 32 处硬编码中文字符串，达成 CI 全量合规。

### 评论
该重构将确保所有面向用户的文案均通过语义化 i18n 查表生成，底层数据库与文件导出日志统一使用英文标准输出，避免因编码或终端环境问题引发日志乱码，并使 Biome 与 i18n 自动化检查完全绿灯。

### 目标
1. 清理 `src/locales/en-US.json` 与 `src/locales/zh-CN.json` 中的重复键，新增模板、语言及比对提示词条。
2. 修复 `src/app.tsx` 的依赖项。
3. 将 `src/config/planTemplates.ts` 与 `src/utils/planStorage.ts` 改为使用 `i18n.t()` 动态构建或标准化英文标识。
4. 将 `src/utils/db/queries.ts` 与 `src/utils/db/importExport.ts` 中的中文默认时间单位及 `console.error` 统一为英文。
5. 修复 `GlobalSettingsModal.tsx`、`HueInductionView.tsx`、`VectorShiftView.tsx` 和 `perspectiveUtils.ts` 中的剩余硬编码中文。

### 基本原理
- 在底层数据存储与模板配置中，通过 `i18n.t` 动态桥接或统一 ASCII 规范，防止硬编码中文字符串污染。
- 在视图层充分复用 `common.candidateN` 词条，确保多语言切换时选项文案即时响应。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/dx #ai/instruct #task/domain/i18n #task/object/locale-parity #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 修复国际化词典中的重复键并补齐新词条

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json.old
    "copySuffix": "Copy",
    "importedSuffix": "Imported",
    "importedPlanDesc": "Routine imported from external JSON",
    "confirm": "Confirm",
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "officialBadge": "Official Preset",
    "newPlanBadge": "New Plan",
    "confirmTitle": "Confirmation",
    "deletePlan": "Delete Plan",
    "favoritedTooltip": "Favorited (Quick switch on home)",
    "unfavoritedTooltip": "Not favorited"
  },
~~~~~
~~~~~json.new
    "copySuffix": "Copy",
    "importedSuffix": "Imported",
    "importedPlanDesc": "Routine imported from external JSON",
    "delete": "Delete",
    "officialBadge": "Official Preset",
    "newPlanBadge": "New Plan",
    "confirmTitle": "Confirmation",
    "deletePlan": "Delete Plan",
    "favoritedTooltip": "Favorited (Quick switch on home)",
    "unfavoritedTooltip": "Not favorited"
  },
  "templates": {
    "all_round_warmup": {
      "name": "Morning All-Round Warmup (50 trials)",
      "desc": "Quickly activate spatial geometry, absolute hue, and negative space intuition.",
      "badge": "Recommended"
    },
    "geometry_sculpting": {
      "name": "Structure & Proportion Reinforcement (60 trials)",
      "desc": "Deeply train dual-anchor perspective, negative space vertex fitting, and low-poly decimation.",
      "badge": "Form Special"
    },
    "color_light_mastery": {
      "name": "Color & Light Environment Penetration (65 trials)",
      "desc": "Advance from absolute hue to Albers simultaneous contrast, vector shifts, and full color matching.",
      "badge": "Color Mastery"
    },
    "abstraction_essence": {
      "name": "Perceptual Abstraction & Essence (60 trials)",
      "desc": "Bottom-up training for gesture axis extraction, Notan grouping, and dominant color clustering.",
      "badge": "Abstraction"
    }
  },
~~~~~

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json.old
    "copySuffix": "副本",
    "importedSuffix": "导入",
    "importedPlanDesc": "从外部 JSON 导入的训练流",
    "confirm": "确认",
    "cancel": "取消",
    "save": "保存",
    "delete": "删除",
    "officialBadge": "官方预设",
    "newPlanBadge": "新计划",
    "confirmTitle": "操作确认",
    "deletePlan": "删除计划",
    "favoritedTooltip": "已收藏 (显示在主页快速切换)",
    "unfavoritedTooltip": "未收藏"
  },
~~~~~
~~~~~json.new
    "copySuffix": "副本",
    "importedSuffix": "导入",
    "importedPlanDesc": "从外部 JSON 导入的训练流",
    "delete": "删除",
    "officialBadge": "官方预设",
    "newPlanBadge": "新计划",
    "confirmTitle": "操作确认",
    "deletePlan": "删除计划",
    "favoritedTooltip": "已收藏 (显示在主页快速切换)",
    "unfavoritedTooltip": "未收藏"
  },
  "templates": {
    "all_round_warmup": {
      "name": "晨间感知全能热身 (50题)",
      "desc": "快速激活空间几何、绝对色相与正负形快判直觉，适合每日开工前热身。",
      "badge": "推荐"
    },
    "geometry_sculpting": {
      "name": "造型起形与比例强化 (60题)",
      "desc": "深入训练双锚点透视构图、负形反切定点与折线低模概括能力。",
      "badge": "造型专项"
    },
    "color_light_mastery": {
      "name": "色彩光影与环境穿透 (65题)",
      "desc": "从绝对色相识别进阶到阿尔伯斯环境色对抗、色彩矢量迁移与综合拾色。",
      "badge": "色彩进阶"
    },
    "abstraction_essence": {
      "name": "视知觉概括提炼 (60题)",
      "desc": "自底向上训练动态势线提取、黑白素描归组与主调色群提炼本质。",
      "badge": "概括专项"
    }
  },
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json.old
    "switchedLocaleToast": "Switched to English",
    "autoNextTitle": "Auto Advance",
~~~~~
~~~~~json.new
    "langZh": "中文",
    "langEn": "English",
    "switchedLocaleToast": "Switched to English",
    "autoNextTitle": "Auto Advance",
~~~~~

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json.old
    "switchedLocaleToast": "已切换至简体中文",
    "autoNextTitle": "自动切换下一题",
~~~~~
~~~~~json.new
    "langZh": "中文",
    "langEn": "English",
    "switchedLocaleToast": "已切换至简体中文",
    "autoNextTitle": "自动切换下一题",
~~~~~

~~~~~act
patch_file
src/packs/relative_color/locales/en-US.json
~~~~~
~~~~~json.old
    "physicallyBrighter": "Physically Brighter (V: {{v}}%)",
    "physicallyDarker": "Physically Darker (V: {{v}}%)"
  }
}
~~~~~
~~~~~json.new
    "physicallyBrighter": "Physically Brighter (V: {{v}}%)",
    "physicallyDarker": "Physically Darker (V: {{v}}%)",
    "splitComparisonTooltip": "Top half is your selection, bottom half is ground truth"
  }
}
~~~~~

~~~~~act
patch_file
src/packs/relative_color/locales/zh-CN.json
~~~~~
~~~~~json.old
    "physicallyBrighter": "物理明度更高 (V: {{v}}%)",
    "physicallyDarker": "物理更暗 (V: {{v}}%)"
  }
}
~~~~~
~~~~~json.new
    "physicallyBrighter": "物理明度更高 (V: {{v}}%)",
    "physicallyDarker": "物理更暗 (V: {{v}}%)",
    "splitComparisonTooltip": "上半部为您的选择，下半部为理论真理色"
  }
}
~~~~~

#### Acts 2: 修复 `app.tsx` 的冗余依赖与 `GlobalSettingsModal.tsx` 的语言切换按钮

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
  useEffect(() => {
    if (route.type === 'home') {
      lastHomeRouteRef.current = route;
      document.title = `${t('common.appName')} - ${t('common.appSubtitle')}`;
    } else if (route.type === 'plan-train') {
      document.title = `${trainingPlan.name || t('plan.todayPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'train') {
      const card = registry.getCardById(route.cardId);
      const cardTitle = card
        ? t(`packs.${card.packId}.cards.${card.id}.title`) || card.title
        : t('shell.training');
      document.title = `${cardTitle} - ${t('common.appName')}`;
    }
  }, [route, trainingPlan.name, locale, t]);
~~~~~
~~~~~typescript.new
  useEffect(() => {
    if (route.type === 'home') {
      lastHomeRouteRef.current = route;
      document.title = `${t('common.appName')} - ${t('common.appSubtitle')}`;
    } else if (route.type === 'plan-train') {
      document.title = `${trainingPlan.name || t('plan.todayPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'train') {
      const card = registry.getCardById(route.cardId);
      const cardTitle = card
        ? t(`packs.${card.packId}.cards.${card.id}.title`) || card.title
        : t('shell.training');
      document.title = `${cardTitle} - ${t('common.appName')}`;
    }
  }, [route, trainingPlan.name, t]);
~~~~~

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript.old
              <button
                type="button"
                onClick={() => handleLocaleChange('zh-CN')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  (settings.global.locale || locale) === 'zh-CN'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                中文
              </button>
              <button
                type="button"
                onClick={() => handleLocaleChange('en-US')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  (settings.global.locale || locale) === 'en-US'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English
              </button>
~~~~~
~~~~~typescript.new
              <button
                type="button"
                onClick={() => handleLocaleChange('zh-CN')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  (settings.global.locale || locale) === 'zh-CN'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('settings.langZh')}
              </button>
              <button
                type="button"
                onClick={() => handleLocaleChange('en-US')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  (settings.global.locale || locale) === 'en-US'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('settings.langEn')}
              </button>
~~~~~

#### Acts 3: 优化 `planTemplates.ts` 与 `planStorage.ts` 消除硬编码中文

~~~~~act
write_file
src/config/planTemplates.ts
~~~~~
~~~~~typescript
import type { PlanTemplate } from '../types/plan';

export const DEFAULT_PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'all_round_warmup',
    name: 'Morning All-Round Warmup (50 trials)',
    description: 'Quickly activate spatial geometry, absolute hue, and negative space intuition.',
    badge: 'Recommended',
    items: [
      { cardId: 'star_single', targetTrials: 15 },
      { cardId: 'color_hue', targetTrials: 15 },
      { cardId: 'neg_area_comparison_2afc', targetTrials: 20 },
    ],
  },
  {
    id: 'geometry_sculpting',
    name: 'Structure & Proportion Reinforcement (60 trials)',
    description: 'Deeply train dual-anchor perspective, negative space vertex fitting, and low-poly decimation.',
    badge: 'Form Special',
    items: [
      { cardId: 'star_double_h', targetTrials: 20 },
      { cardId: 'neg_vertex_fitting', targetTrials: 20 },
      { cardId: 'abs_polygon_decimation', targetTrials: 20 },
    ],
  },
  {
    id: 'color_light_mastery',
    name: 'Color & Light Environment Penetration (65 trials)',
    description: 'Advance from absolute hue to Albers simultaneous contrast, vector shifts, and full color matching.',
    badge: 'Color Mastery',
    items: [
      { cardId: 'color_hue', targetTrials: 20 },
      { cardId: 'rel_decontextual_2afc', targetTrials: 15 },
      { cardId: 'rel_vector_shift', targetTrials: 15 },
      { cardId: 'color_all', targetTrials: 15 },
    ],
  },
  {
    id: 'abstraction_essence',
    name: 'Perceptual Abstraction & Essence (60 trials)',
    description: 'Bottom-up training for gesture axis extraction, Notan grouping, and dominant color clustering.',
    badge: 'Abstraction',
    items: [
      { cardId: 'abs_gesture_axis', targetTrials: 20 },
      { cardId: 'abs_notan_threshold', targetTrials: 20 },
      { cardId: 'abs_palette_clustering', targetTrials: 20 },
    ],
  },
];
~~~~~

~~~~~act
patch_file
src/utils/planStorage.ts
~~~~~
~~~~~typescript.old
import { DEFAULT_PLAN_TEMPLATES } from '../config/planTemplates';
import type { PlanItem, PlanStorageState, PlanTemplate, TrainingPlan } from '../types/plan';

const PLANS_STORAGE_KEY = 'formsight_training_plans_store';
const LEGACY_PLAN_STORAGE_KEY = 'formsight_custom_training_plan';

export const EMPTY_TRAINING_PLAN: TrainingPlan = {
  id: 'custom_plan_default',
  name: '我的自选训练流',
  description: '自定义编排的日常多模块训练序列',
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

  return {
    id: `plan_${template.id}`,
    name: template.name,
    description: template.description,
    items,
    isFavorite,
    isBuiltin,
    updatedAt: Date.now(),
  };
}
~~~~~
~~~~~typescript.new
import { DEFAULT_PLAN_TEMPLATES } from '../config/planTemplates';
import { i18n } from '../core/i18n';
import type { PlanItem, PlanStorageState, PlanTemplate, TrainingPlan } from '../types/plan';

const PLANS_STORAGE_KEY = 'formsight_training_plans_store';
const LEGACY_PLAN_STORAGE_KEY = 'formsight_custom_training_plan';

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
~~~~~

~~~~~act
patch_file
src/utils/planStorage.ts
~~~~~
~~~~~typescript.old
        if (legacyParsed && Array.isArray(legacyParsed.items) && legacyParsed.items.length > 0) {
          const customPlan: TrainingPlan = {
            id: legacyParsed.id || `custom_${Date.now()}`,
            name: legacyParsed.name || '我的自选训练流',
            description: '从旧版本迁移的自定义训练流',
            items: legacyParsed.items,
            isFavorite: true,
            isBuiltin: false,
            updatedAt: legacyParsed.updatedAt || Date.now(),
          };
          const state: PlanStorageState = {
            activePlanId: customPlan.id,
            plans: [customPlan, ...defaultPlans],
          };
          savePlanStorageState(state);
          return state;
        }
~~~~~
~~~~~typescript.new
        if (legacyParsed && Array.isArray(legacyParsed.items) && legacyParsed.items.length > 0) {
          const customPlan: TrainingPlan = {
            id: legacyParsed.id || `custom_${Date.now()}`,
            name: legacyParsed.name || i18n.t('common.defaultCustomPlanName'),
            description: i18n.t('common.migratedPlanDesc'),
            items: legacyParsed.items,
            isFavorite: true,
            isBuiltin: false,
            updatedAt: legacyParsed.updatedAt || Date.now(),
          };
          const state: PlanStorageState = {
            activePlanId: customPlan.id,
            plans: [customPlan, ...defaultPlans],
          };
          savePlanStorageState(state);
          return state;
        }
~~~~~

~~~~~act
patch_file
src/utils/planStorage.ts
~~~~~
~~~~~typescript.old
export function clonePlan(plan: TrainingPlan): TrainingPlan {
  const newId = `plan_copy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const cloned: TrainingPlan = {
    ...plan,
    id: newId,
    name: `${plan.name} (副本)`,
    isBuiltin: false,
    isFavorite: true,
    items: plan.items.map((item) => ({
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    })),
    updatedAt: Date.now(),
  };
  saveTrainingPlan(cloned);
  return cloned;
}
~~~~~
~~~~~typescript.new
export function clonePlan(plan: TrainingPlan): TrainingPlan {
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
  saveTrainingPlan(cloned);
  return cloned;
}
~~~~~

~~~~~act
patch_file
src/utils/planStorage.ts
~~~~~
~~~~~typescript.old
    const newId = `plan_imported_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const importedPlan: TrainingPlan = {
      id: newId,
      name: planData.name ? `${planData.name} (导入)` : '导入的训练流',
      description: planData.description || '从外部 JSON 导入的训练流',
      isFavorite: true,
      isBuiltin: false,
      items: planData.items.map((item: { cardId: string; targetTrials?: number }) => ({
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        cardId: item.cardId,
        targetTrials: item.targetTrials || 20,
      })),
      updatedAt: Date.now(),
    };
~~~~~
~~~~~typescript.new
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
~~~~~

#### Acts 4: 规范 `db/queries.ts` 与 `db/importExport.ts` 中的日志与兜底文案

~~~~~act
patch_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript.old
export function formatTotalTime(ms: number, t?: (key: string) => string): string {
  const tr = t || ((k: string) => (k === 'common.zeroTime' ? '0天0小时0分钟' : k));
  if (!ms || Number.isNaN(ms) || ms <= 0) {
    return tr('common.zeroTime');
  }
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const dUnit = t ? t('common.daysUnit') : '天';
  const hUnit = t ? t('common.hoursUnit') : '小时';
  const mUnit = t ? t('common.minutesUnit') : '分钟';

  return `${days}${dUnit}${hours}${hUnit}${minutes}${mUnit}`;
}
~~~~~
~~~~~typescript.new
export function formatTotalTime(ms: number, t?: (key: string) => string): string {
  const tr = t || ((k: string) => (k === 'common.zeroTime' ? '0d 0h 0min' : k));
  if (!ms || Number.isNaN(ms) || ms <= 0) {
    return tr('common.zeroTime');
  }
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const dUnit = t ? t('common.daysUnit') : 'd ';
  const hUnit = t ? t('common.hoursUnit') : 'h ';
  const mUnit = t ? t('common.minutesUnit') : 'min';

  return `${days}${dUnit}${hours}${hUnit}${minutes}${mUnit}`;
}
~~~~~

~~~~~act
patch_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript.old
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    console.error('备份文件不是合法的 JSON 格式:', err);
    return false;
  }

  if (!validateImportBundle(parsed)) {
    console.error('备份文件结构校验失败');
    return false;
  }
~~~~~
~~~~~typescript.new
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
~~~~~

~~~~~act
patch_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript.old
    return true;
  } catch (err) {
    console.error('导入数据失败，回滚快照:', err);
    try {
      saveSettings(previousSettingsSnapshot);
      savePlanStorageState(previousPlanStateSnapshot);
    } catch (rollbackErr) {
      console.error('回滚快照失败:', rollbackErr);
    }
    return false;
  }
}
~~~~~
~~~~~typescript.new
    return true;
  } catch (err) {
    console.error('Failed to import data, rolling back snapshot:', err);
    try {
      saveSettings(previousSettingsSnapshot);
      savePlanStorageState(previousPlanStateSnapshot);
    } catch (rollbackErr) {
      console.error('Failed to rollback snapshot:', rollbackErr);
    }
    return false;
  }
}
~~~~~

#### Acts 5: 消除 Pack 组件与工具函数中的剩余硬编码中文

~~~~~act
patch_file
src/packs/perspective/utils/perspectiveUtils.ts
~~~~~
~~~~~typescript.old
    if (isMigration) {
      // 连续随机比例 (8% ~ 92% 之间，保留一位小数百分比精度)
      ratio = Math.round((Math.random() * 0.84 + 0.08) * 1000) / 1000;
      ratioName = `${(ratio * 100).toFixed(1)}% 处`;
    } else {
~~~~~
~~~~~typescript.new
    if (isMigration) {
      // 连续随机比例 (8% ~ 92% 之间，保留一位小数百分比精度)
      ratio = Math.round((Math.random() * 0.84 + 0.08) * 1000) / 1000;
      ratioName = `${(ratio * 100).toFixed(1)}%`;
    } else {
~~~~~

~~~~~act
patch_file
src/packs/relative_color/components/HueInductionView.tsx
~~~~~
~~~~~typescript.old
  const nafcOptions = (options || []).map((opt, idx) => {
    const isTarget = idx === targetIdx;
    const hexVal = hsvToHex(...opt);
    return {
      key: `hue-opt-${idx}-${hexVal}`,
      title: `候选 ${idx + 1}`,
      value: opt,
      isCorrect: isTarget,
      content: (
        <div className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60 p-1 flex items-center justify-center bg-white">
          <div
            className="w-full h-full rounded-lg shadow-sm border border-slate-200/50"
            style={{ backgroundColor: hexVal }}
          />
        </div>
      ),
    };
  });
~~~~~
~~~~~typescript.new
  const nafcOptions = (options || []).map((opt, idx) => {
    const isTarget = idx === targetIdx;
    const hexVal = hsvToHex(...opt);
    return {
      key: `hue-opt-${idx}-${hexVal}`,
      title: t('common.candidateN', { num: idx + 1 }),
      value: opt,
      isCorrect: isTarget,
      content: (
        <div className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60 p-1 flex items-center justify-center bg-white">
          <div
            className="w-full h-full rounded-lg shadow-sm border border-slate-200/50"
            style={{ backgroundColor: hexVal }}
          />
        </div>
      ),
    };
  });
~~~~~

~~~~~act
patch_file
src/packs/relative_color/components/HueInductionView.tsx
~~~~~
~~~~~typescript.old
                {showAnswer && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1/2"
                    style={{ backgroundColor: idealRightHex }}
                    title="上半部为您的选择，下半部为理论真理色"
                  />
                )}
~~~~~
~~~~~typescript.new
                {showAnswer && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1/2"
                    style={{ backgroundColor: idealRightHex }}
                    title={t('packs.relative_color.views.splitComparisonTooltip')}
                  />
                )}
~~~~~

~~~~~act
patch_file
src/packs/relative_color/components/VectorShiftView.tsx
~~~~~
~~~~~typescript.old
  const nafcOptions = (options || []).map((opt, idx) => {
    const isTarget = idx === correctIndex;
    const hexVal = hsvToHex(...opt);
    return {
      key: `vector-shift-opt-${idx}-${hexVal}`,
      title: `候选 ${idx + 1}`,
      value: opt,
      isCorrect: isTarget,
      content: (
        <div
          className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60"
          style={{ backgroundColor: hexVal }}
        />
      ),
    };
  });
~~~~~
~~~~~typescript.new
  const nafcOptions = (options || []).map((opt, idx) => {
    const isTarget = idx === correctIndex;
    const hexVal = hsvToHex(...opt);
    return {
      key: `vector-shift-opt-${idx}-${hexVal}`,
      title: t('common.candidateN', { num: idx + 1 }),
      value: opt,
      isCorrect: isTarget,
      content: (
        <div
          className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60"
          style={{ backgroundColor: hexVal }}
        />
      ),
    };
  });
~~~~~

### 下一步建议
1. 运行 `npm run checkf` 以及 `python scripts/check_i18n.py` 验证 TypeScript 编译、Biome 静态检查与国际化对齐合规性。
2. 运行 `npm run test` 确保各算法模块与单元测试均稳定通过。
