我将按照开闭原则 (OCP) 为 FormSight 重构官方训练计划架构，并建立专门的官方计划展示与导入页面。

## [WIP] feat(plan): 重构官方训练计划为 OCP 架构并增加官方计划库页面

### 用户需求
1. 添加一个专门的页面用于展示与浏览官方训练计划，用户通过“复制/导入官方计划到自己的计划库”来使用，而非混在个人计划中直接修改。
2. 新页面需接入完整 i18n 多语言，使用户能以当前激活语言将官方计划实例化导入到个人计划库。
3. 官方计划架构必须遵循开闭原则 (OCP)，开发者只需添加独立预设文件即可被系统自动发现与注册。

### 评论
该重构将“只读的系统官方预设模板”与“用户的私有计划库资产”彻底解耦。遵循 OCP 原则后，后续扩展新的训练计划（如专项抗错觉、透视起形等）只需新建独立文件，无需改动现有注册逻辑与存储引擎，同时多语言按需实例化，大幅提升系统的灵活性与可维护性。

### 目标
1. 在 `src/config/plans/` 中建立遵循 OCP 的官方计划模板契约及基于 `import.meta.glob` 的自动发现注册中心 `officialPlanRegistry`。
2. 将既有官方模版解构迁移为各自独立的预设文件，内嵌自包含中英文词条。
3. 在 `planStorage.ts` 与 `planStore.ts` 中提供 `forkOfficialPlan` / `forkOfficialPlanAction` 能力，按当前语言实例化并写入用户 IndexedDB。
4. 在 Hash 路由与导航中支持 `official-plans` 页面，实现 `OfficialPlansView` 与 `OfficialPlanCard` 组件。
5. 在计划编辑器顶栏及计划抽屉中提供直达官方计划库的导航入口，完善中英文语言包。

### 基本原理
1. **OCP 架构**：通过 `import.meta.glob('./presets/*.ts', { eager: true })` 实现预设自动化发现，各预设独立声明自己的 ID、分类、阶段构成与中英双语词条，新加预设对现有代码完全封闭。
2. **读写分离与实例化克隆**：官方模板只读常驻内存，不占用也不污染用户 IndexedDB。当用户点击“复制到计划库”时，以当前语言环境生成唯一的 `TrainingPlan` 实体（带时间戳与克隆来源标记），从而保证官方计划的不可篡改性与用户自定义计划的完整所有权。
3. **沉浸式预览与交互**：在专门的官方计划库页面中直观展现各阶段包含的训练模块、预计时间、题量配置，并标明是否已存在于个人计划库中。

### 标签
#intent/build #flow/ready #priority/high
#comp/cli #concept/ui #scope/ux #scope/api
#ai/refine
#task/domain/plans
#task/object/official-plan-templates
#task/action/refactor
#task/state/begin #task/status/active

---

### Script

#### Acts 1: 创建官方计划强类型契约与独立预设文件

定义符合开闭原则的官方计划模板规范，并将现有四个官方预设迁移为自包含预设文件。

~~~~~act
write_file
src/config/plans/types.ts
~~~~~
~~~~~typescript
export type OfficialPlanCategory = 'warmup' | 'form' | 'color' | 'abstraction' | 'general';

export interface OfficialPlanPreset {
  id: string;
  category: OfficialPlanCategory;
  badgeI18nKey?: string;
  locales: {
    'zh-CN': {
      name: string;
      description: string;
      badge?: string;
    };
    'en-US': {
      name: string;
      description: string;
      badge?: string;
    };
  };
  items: Array<{
    cardId: string;
    targetTrials: number;
  }>;
}
~~~~~

~~~~~act
write_file
src/config/plans/presets/allRoundWarmup.ts
~~~~~
~~~~~typescript
import type { OfficialPlanPreset } from '../types';

export const allRoundWarmup: OfficialPlanPreset = {
  id: 'all_round_warmup',
  category: 'warmup',
  locales: {
    'zh-CN': {
      name: '晨间感知全能热身 (50题)',
      description: '快速激活空间几何、绝对色相与正负形快判直觉，适合每日开工前热身。',
      badge: '推荐',
    },
    'en-US': {
      name: 'Morning All-Round Warmup (50 trials)',
      description: 'Quickly activate spatial geometry, absolute hue, and negative space intuition.',
      badge: 'Recommended',
    },
  },
  items: [
    { cardId: 'star_single', targetTrials: 15 },
    { cardId: 'color_hue', targetTrials: 15 },
    { cardId: 'neg_area_comparison_2afc', targetTrials: 20 },
  ],
};

export default allRoundWarmup;
~~~~~

~~~~~act
write_file
src/config/plans/presets/geometrySculpting.ts
~~~~~
~~~~~typescript
import type { OfficialPlanPreset } from '../types';

export const geometrySculpting: OfficialPlanPreset = {
  id: 'geometry_sculpting',
  category: 'form',
  locales: {
    'zh-CN': {
      name: '造型起形与比例强化 (60题)',
      description: '深入训练双锚点透视构图、负形反切定点与折线低模概括能力。',
      badge: '造型专项',
    },
    'en-US': {
      name: 'Structure & Proportion Reinforcement (60 trials)',
      description:
        'Deeply train dual-anchor perspective, negative space vertex fitting, and low-poly decimation.',
      badge: 'Form Special',
    },
  },
  items: [
    { cardId: 'star_double_h', targetTrials: 20 },
    { cardId: 'neg_vertex_fitting', targetTrials: 20 },
    { cardId: 'abs_polygon_decimation', targetTrials: 20 },
  ],
};

export default geometrySculpting;
~~~~~

~~~~~act
write_file
src/config/plans/presets/colorLightMastery.ts
~~~~~
~~~~~typescript
import type { OfficialPlanPreset } from '../types';

export const colorLightMastery: OfficialPlanPreset = {
  id: 'color_light_mastery',
  category: 'color',
  locales: {
    'zh-CN': {
      name: '色彩光影与环境穿透 (65题)',
      description: '从绝对色相识别进阶到阿尔伯斯环境色对抗、色彩矢量迁移与综合拾色。',
      badge: '色彩进阶',
    },
    'en-US': {
      name: 'Color & Light Environment Penetration (65 trials)',
      description:
        'Advance from absolute hue to Albers simultaneous contrast, vector shifts, and full color matching.',
      badge: 'Color Mastery',
    },
  },
  items: [
    { cardId: 'color_hue', targetTrials: 20 },
    { cardId: 'rel_decontextual_2afc', targetTrials: 15 },
    { cardId: 'rel_vector_shift', targetTrials: 15 },
    { cardId: 'color_all', targetTrials: 15 },
  ],
};

export default colorLightMastery;
~~~~~

~~~~~act
write_file
src/config/plans/presets/abstractionEssence.ts
~~~~~
~~~~~typescript
import type { OfficialPlanPreset } from '../types';

export const abstractionEssence: OfficialPlanPreset = {
  id: 'abstraction_essence',
  category: 'abstraction',
  locales: {
    'zh-CN': {
      name: '视知觉概括提炼 (60题)',
      description: '自底向上训练动态势线提取、黑白素描归组与主调色群提炼本质。',
      badge: '概括专项',
    },
    'en-US': {
      name: 'Perceptual Abstraction & Essence (60 trials)',
      description:
        'Bottom-up training for gesture axis extraction, Notan grouping, and dominant color clustering.',
      badge: 'Abstraction',
    },
  },
  items: [
    { cardId: 'abs_gesture_axis', targetTrials: 20 },
    { cardId: 'abs_notan_threshold', targetTrials: 20 },
    { cardId: 'abs_palette_clustering', targetTrials: 20 },
  ],
};

export default abstractionEssence;
~~~~~

#### Acts 2: 构建自动发现注册中心与开闭统一接口

通过 Vite 自动化模块扫描机制实现对扩展开放、对修改关闭的注册表。

~~~~~act
write_file
src/config/plans/registry.ts
~~~~~
~~~~~typescript
import { i18n } from '../../core/i18n';
import type { OfficialPlanCategory, OfficialPlanPreset } from './types';

class OfficialPlanRegistry {
  private presetMap = new Map<string, OfficialPlanPreset>();

  constructor() {
    this.autoDiscover();
  }

  /**
   * 自动扫描 presets 目录下全部独立预设，实现 OCP
   */
  private autoDiscover(): void {
    const modules = import.meta.glob<{ default: OfficialPlanPreset }>('./presets/*.ts', {
      eager: true,
    });

    for (const path in modules) {
      const preset = modules[path]?.default;
      if (preset && preset.id) {
        this.registerPreset(preset);
      }
    }
  }

  public registerPreset(preset: OfficialPlanPreset): void {
    this.presetMap.set(preset.id, preset);

    // 动态向 i18n 注入模板多语言
    if (preset.locales) {
      for (const [localeKey, dict] of Object.entries(preset.locales)) {
        i18n.registerGlobalLocales({
          [localeKey]: {
            templates: {
              [preset.id]: dict,
            },
          },
        });
      }
    }
  }

  public getAllPresets(): OfficialPlanPreset[] {
    return Array.from(this.presetMap.values());
  }

  public getPresetById(id: string): OfficialPlanPreset | undefined {
    return this.presetMap.get(id);
  }

  public getPresetsByCategory(category: OfficialPlanCategory): OfficialPlanPreset[] {
    return this.getAllPresets().filter((p) => p.category === category);
  }
}

export const officialPlanRegistry = new OfficialPlanRegistry();
~~~~~

~~~~~act
write_file
src/config/plans/index.ts
~~~~~
~~~~~typescript
export * from './types';
export * from './registry';
~~~~~

#### Acts 3: 扩展存储层支持官方计划克隆与实例化

更新 `planStorage.ts` 与 `planStore.ts`，增加将官方模板以当前语言环境实例化并写入个人计划库的方法 `forkOfficialPlan`，并保持向下兼容。

~~~~~act
patch_file
src/storage/planStorage.ts
~~~~~
~~~~~old
import { DEFAULT_PLAN_TEMPLATES } from '../config/planTemplates';
import { i18n } from '../core/i18n';
import { registry } from '../core/registry';
import type { PlanItem, PlanStorageState, PlanTemplate, TrainingPlan } from '../types/plan';
import { getDB } from './db/schema';

export function createEmptyTrainingPlan(): TrainingPlan {
  return {
    id: 'custom_plan_default',
    name: i18n.t('common.defaultCustomPlanName'),
    description: i18n.t('common.defaultCustomPlanDesc'),
    items: [],
    isFavorite: true,
    isBuiltin: false,
    updatedAt: Date.now(),
  };
}

export const EMPTY_TRAINING_PLAN: TrainingPlan = {
  id: 'custom_plan_default',
  get name() {
    return i18n.t('common.defaultCustomPlanName');
  },
  get description() {
    return i18n.t('common.defaultCustomPlanDesc');
  },
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
  const items: PlanItem[] = template.items
    .filter((item) => Boolean(registry.getCardById(item.cardId)))
    .map((item, idx) => ({
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
~~~~~
~~~~~new
import { type OfficialPlanPreset, officialPlanRegistry } from '../config/plans';
import { i18n } from '../core/i18n';
import { registry } from '../core/registry';
import type { PlanItem, PlanStorageState, TrainingPlan } from '../types/plan';
import { getDB } from './db/schema';

export function createEmptyTrainingPlan(): TrainingPlan {
  return {
    id: 'custom_plan_default',
    name: i18n.t('common.defaultCustomPlanName'),
    description: i18n.t('common.defaultCustomPlanDesc'),
    items: [],
    isFavorite: true,
    isBuiltin: false,
    updatedAt: Date.now(),
  };
}

export const EMPTY_TRAINING_PLAN: TrainingPlan = {
  id: 'custom_plan_default',
  get name() {
    return i18n.t('common.defaultCustomPlanName');
  },
  get description() {
    return i18n.t('common.defaultCustomPlanDesc');
  },
  items: [],
  isFavorite: true,
  isBuiltin: false,
  updatedAt: Date.now(),
};

/**
 * 以指定语言将官方预设模板实例化为用户的个人计划 (Fork 机制)
 */
export function forkOfficialPlan(
  preset: OfficialPlanPreset,
  locale: string = i18n.getLocale(),
): TrainingPlan {
  const dict =
    preset.locales[locale as 'zh-CN' | 'en-US'] ||
    preset.locales['zh-CN'] ||
    preset.locales['en-US'];

  const items: PlanItem[] = preset.items
    .filter((item) => Boolean(registry.getCardById(item.cardId)))
    .map((item, idx) => ({
      id: `item_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      cardId: item.cardId,
      targetTrials: item.targetTrials,
    }));

  return {
    id: `plan_forked_${preset.id}_${Date.now()}`,
    name: dict?.name || preset.id,
    description: dict?.description || '',
    items,
    isFavorite: true,
    isBuiltin: false,
    updatedAt: Date.now(),
  };
}

export function getDefaultPlans(): TrainingPlan[] {
  const presets = officialPlanRegistry.getAllPresets();
  const currentLocale = i18n.getLocale();
  if (presets.length > 0) {
    return presets.map((p) => forkOfficialPlan(p, currentLocale));
  }
  return [createEmptyTrainingPlan()];
}
~~~~~

~~~~~act
patch_file
src/stores/planStore.ts
~~~~~
~~~~~old
import {
  EMPTY_TRAINING_PLAN,
  clonePlan as clonePlanFromStorage,
  deletePlan as deletePlanFromStorage,
  loadPlanStorageState,
  resetPlansToDefault as resetPlansFromStorage,
  savePlanStorageState,
  togglePlanFavorite as toggleFavoriteFromStorage,
} from '../storage/planStorage';
import type { PlanStorageState, TrainingPlan } from '../types/plan';
~~~~~
~~~~~new
import { type OfficialPlanPreset, officialPlanRegistry } from '../config/plans';
import {
  EMPTY_TRAINING_PLAN,
  clonePlan as clonePlanFromStorage,
  deletePlan as deletePlanFromStorage,
  forkOfficialPlan as forkOfficialPlanFromStorage,
  loadPlanStorageState,
  resetPlansToDefault as resetPlansFromStorage,
  savePlanStorageState,
  togglePlanFavorite as toggleFavoriteFromStorage,
} from '../storage/planStorage';
import type { PlanStorageState, TrainingPlan } from '../types/plan';
~~~~~

~~~~~act
patch_file
src/stores/planStore.ts
~~~~~
~~~~~old
export async function clonePlanAction(plan: TrainingPlan): Promise<TrainingPlan> {
  const cloned = await clonePlanFromStorage(plan);
  const nextState = await loadPlanStorageState();
  $allPlans.value = nextState.plans;
  $activePlanId.value = cloned.id;
  return cloned;
}
~~~~~
~~~~~new
export async function clonePlanAction(plan: TrainingPlan): Promise<TrainingPlan> {
  const cloned = await clonePlanFromStorage(plan);
  const nextState = await loadPlanStorageState();
  $allPlans.value = nextState.plans;
  $activePlanId.value = cloned.id;
  return cloned;
}

export async function forkOfficialPlanAction(
  preset: OfficialPlanPreset,
  activateImmediately = true,
): Promise<TrainingPlan> {
  const newPlan = forkOfficialPlanFromStorage(preset);
  const nextPlans = [newPlan, ...$allPlans.value];
  const nextActiveId = activateImmediately ? newPlan.id : $activePlanId.value;

  $allPlans.value = nextPlans;
  if (activateImmediately) {
    $activePlanId.value = newPlan.id;
  }

  await savePlanStorageState({
    activePlanId: nextActiveId,
    plans: nextPlans,
  });

  return newPlan;
}
~~~~~

#### Acts 4: 路由系统升级与导航扩充

在 `useHashRoute.ts` 中引入官方计划库路由 `#/official-plans`，并支持页面标题和动态路由同步。

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~old
export type RouteLocation =
  | { type: 'home' }
  | { type: 'discovery'; query?: CardQueryOptions }
  | { type: 'train'; cardId: string; sessionType: 'training' | 'benchmark' }
  | { type: 'plan-train' }
  | { type: 'plan-editor' }
  | { type: 'stats' }
  | { type: 'analytics'; cardId: string; tab?: string };
~~~~~
~~~~~new
export type RouteLocation =
  | { type: 'home' }
  | { type: 'discovery'; query?: CardQueryOptions }
  | { type: 'train'; cardId: string; sessionType: 'training' | 'benchmark' }
  | { type: 'plan-train' }
  | { type: 'plan-editor' }
  | { type: 'official-plans' }
  | { type: 'stats' }
  | { type: 'analytics'; cardId: string; tab?: string };
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~old
  if (segments[0] === 'plan-editor' || segments[0] === 'plans') {
    return { type: 'plan-editor' };
  }

  if (segments[0] === 'stats') {
    return { type: 'stats' };
  }
~~~~~
~~~~~new
  if (segments[0] === 'official-plans' || (segments[0] === 'plans' && segments[1] === 'official')) {
    return { type: 'official-plans' };
  }

  if (segments[0] === 'plan-editor' || segments[0] === 'plans') {
    return { type: 'plan-editor' };
  }

  if (segments[0] === 'stats') {
    return { type: 'stats' };
  }
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~old
  if (route.type === 'plan-train') return '#/plan-train';
  if (route.type === 'plan-editor') return '#/plan-editor';
  if (route.type === 'stats') return '#/stats';
~~~~~
~~~~~new
  if (route.type === 'plan-train') return '#/plan-train';
  if (route.type === 'plan-editor') return '#/plan-editor';
  if (route.type === 'official-plans') return '#/official-plans';
  if (route.type === 'stats') return '#/stats';
~~~~~

~~~~~act
patch_file
src/hooks/useAppBootstrap.ts
~~~~~
~~~~~old
    } else if (route.type === 'plan-editor') {
      document.title = `${t('plan.editPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'plan-train') {
~~~~~
~~~~~new
    } else if (route.type === 'plan-editor') {
      document.title = `${t('plan.editPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'official-plans') {
      document.title = `${t('officialPlans.title')} - ${t('common.appName')}`;
    } else if (route.type === 'plan-train') {
~~~~~

#### Acts 5: 构建官方计划卡片组件与专属浏览页面

实现 `OfficialPlanCard.tsx` 与 `OfficialPlansView.tsx`，提供分类过滤、多阶段全景视效、时长测算与按当前语言 Fork 机制。

~~~~~act
write_file
src/components/plan/official/OfficialPlanCard.tsx
~~~~~
~~~~~typescript
import { ArrowRight, Check, ChevronRight, Clock, Copy, Play, Sparkles } from 'lucide-preact';
import type { OfficialPlanPreset } from '../../../config/plans';
import { getCardTitle, useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

interface OfficialPlanCardProps {
  preset: OfficialPlanPreset;
  isAlreadyAdopted?: boolean;
  onAdoptToLibrary: (preset: OfficialPlanPreset) => void;
  onAdoptAndStart: (preset: OfficialPlanPreset) => void;
}

export function OfficialPlanCard({
  preset,
  isAlreadyAdopted = false,
  onAdoptToLibrary,
  onAdoptAndStart,
}: OfficialPlanCardProps) {
  const { t, locale } = useTranslation();

  const dict =
    preset.locales[locale as 'zh-CN' | 'en-US'] ||
    preset.locales['zh-CN'] ||
    preset.locales['en-US'];

  const name = dict?.name || preset.id;
  const description = dict?.description || '';
  const badgeText = dict?.badge;

  const validItems = (preset.items || []).filter((item) =>
    Boolean(registry.getCardById(item.cardId)),
  );
  const totalTrials = validItems.reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  return (
    <div className="group bg-card border border-border hover:border-primary/60 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between gap-5 relative select-none">
      <div className="space-y-4">
        {/* 顶栏：标题、徽章与阶段概览 */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-foreground group-hover:text-primary transition-colors tracking-tight">
                {name}
              </h3>
              {badgeText && (
                <Badge variant="accent" size="sm">
                  <Sparkles className="w-3 h-3" />
                  <span>{badgeText}</span>
                </Badge>
              )}
              {isAlreadyAdopted && (
                <Badge variant="success" size="sm" className="gap-1 font-semibold">
                  <Check className="w-3 h-3" />
                  <span>{t('officialPlans.adoptedBadge')}</span>
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.5rem]">
              {description}
            </p>
          </div>
        </div>

        {/* 阶段管线可视化预览 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>{t('plan.stageCount', { count: validItems.length })}</span>
            <div className="flex items-center gap-2">
              <span>{t('plan.totalTrialsSummary', { trials: totalTrials })}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                {t('plan.estimatedTime', { min: estimatedMin })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {validItems.map((item, idx) => {
              const card = registry.getCardById(item.cardId);
              if (!card) return null;
              const Icon = card.icon;
              const cardTitle = getCardTitle(card, t);

              return (
                <div key={`${preset.id}_${item.cardId}_${idx}`} className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="flex items-center gap-2 bg-muted/60 border border-border px-3 py-1.5 rounded-2xl shadow-inner">
                    <div className="w-4 h-4 rounded-md bg-accent text-primary flex items-center justify-center font-mono text-[10px] font-black">
                      {idx + 1}
                    </div>
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-bold text-foreground">{cardTitle}</span>
                    <Badge variant="secondary" size="sm" className="font-mono font-bold text-[10px]">
                      {item.targetTrials}
                      {t('common.trialsUnit')}
                    </Badge>
                  </div>
                  {idx < validItems.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 底部操作按钮组 */}
      <div className="flex items-center justify-between gap-2.5 pt-4 border-t border-border/60 flex-wrap">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onAdoptToLibrary(preset)}
          className="gap-1.5 border border-border"
          title={t('officialPlans.adoptToLibrary')}
        >
          <Copy className="w-3.5 h-3.5" />
          <span>{t('officialPlans.adoptToLibrary')}</span>
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={() => onAdoptAndStart(preset)}
          className="gap-1.5 ml-auto"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{t('officialPlans.adoptAndStart')}</span>
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/views/OfficialPlansView.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, BookOpen, Layers, Sparkles } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { OfficialPlanCard } from '../components/plan/official/OfficialPlanCard';
import { Button } from '../components/ui/button';
import { type OfficialPlanCategory, officialPlanRegistry } from '../config/plans';
import { useTranslation } from '../core/i18n';
import type { TrainingPlan } from '../types/plan';

interface OfficialPlansViewProps {
  userPlans: TrainingPlan[];
  onExit: () => void;
  onNavigateToMyPlans: () => void;
  onAdoptPlan: (preset: import('../config/plans').OfficialPlanPreset, startImmediately?: boolean) => Promise<void>;
}

export function OfficialPlansView({
  userPlans,
  onExit,
  onNavigateToMyPlans,
  onAdoptPlan,
}: OfficialPlansViewProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<OfficialPlanCategory | 'all'>('all');

  const allPresets = useMemo(() => officialPlanRegistry.getAllPresets(), []);

  const filteredPresets = useMemo(() => {
    if (selectedCategory === 'all') return allPresets;
    return allPresets.filter((p) => p.category === selectedCategory);
  }, [allPresets, selectedCategory]);

  const adoptedMap = useMemo(() => {
    const map = new Set<string>();
    for (const plan of userPlans) {
      for (const preset of allPresets) {
        if (plan.id.includes(preset.id)) {
          map.add(preset.id);
        }
      }
    }
    return map;
  }, [userPlans, allPresets]);

  const categories: Array<{ id: OfficialPlanCategory | 'all'; labelKey: string }> = [
    { id: 'all', labelKey: 'common.all' },
    { id: 'warmup', labelKey: 'officialPlans.categoryWarmup' },
    { id: 'form', labelKey: 'officialPlans.categoryForm' },
    { id: 'color', labelKey: 'officialPlans.categoryColor' },
    { id: 'abstraction', labelKey: 'officialPlans.categoryAbstraction' },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-150">
      {/* 顶部标题与导航栏 */}
      <header className="w-full bg-card border border-border rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onExit} className="gap-1.5 flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span>{t('common.exit')}</span>
          </Button>
          <div className="h-5 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-accent text-primary rounded-2xl shadow-xs flex-shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                  {t('officialPlans.title')}
                </h1>
                <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">
                  {filteredPresets.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                {t('officialPlans.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onNavigateToMyPlans}
          className="gap-1.5 border border-border self-end sm:self-auto"
        >
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span>{t('officialPlans.myPlansBtn')}</span>
        </Button>
      </header>

      {/* 分类切换滤镜 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
            className="rounded-xl h-auto py-2 px-3.5 text-xs font-bold whitespace-nowrap"
          >
            {t(cat.labelKey)}
          </Button>
        ))}
      </div>

      {/* 官方计划卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPresets.map((preset) => (
          <OfficialPlanCard
            key={preset.id}
            preset={preset}
            isAlreadyAdopted={adoptedMap.has(preset.id)}
            onAdoptToLibrary={(p) => onAdoptPlan(p, false)}
            onAdoptAndStart={(p) => onAdoptPlan(p, true)}
          />
        ))}
      </div>
    </div>
  );
}
~~~~~

#### Acts 6: 集成全局路由、主导航入口与编辑抽屉

在 `AppRouter.tsx` 中挂载官方计划页面，并在 `PlanEditorHeader.tsx` 及计划抽屉中加入明显入口。

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~old
import { CardAnalyticsView } from '../../views/CardAnalyticsView';
import { DiscoveryView } from '../../views/DiscoveryView';
import { GenericTrainingView } from '../../views/GenericTrainingView';
import { GlobalStatsView } from '../../views/GlobalStatsView';
import { HomeView } from '../../views/HomeView';
import { PlanEditorView } from '../../views/PlanEditorView';
import { PlanTrainingView } from '../../views/PlanTrainingView';
import { AppNavigation } from '../navigation/AppNavigation';
~~~~~
~~~~~new
import { forkOfficialPlanAction } from '../../stores/planStore';
import { CardAnalyticsView } from '../../views/CardAnalyticsView';
import { DiscoveryView } from '../../views/DiscoveryView';
import { GenericTrainingView } from '../../views/GenericTrainingView';
import { GlobalStatsView } from '../../views/GlobalStatsView';
import { HomeView } from '../../views/HomeView';
import { OfficialPlansView } from '../../views/OfficialPlansView';
import { PlanEditorView } from '../../views/PlanEditorView';
import { PlanTrainingView } from '../../views/PlanTrainingView';
import { AppNavigation } from '../navigation/AppNavigation';
~~~~~

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~old
  const isMainShellPage =
    route.type === 'home' ||
    route.type === 'discovery' ||
    route.type === 'plan-editor' ||
    route.type === 'stats';
~~~~~
~~~~~new
  const isMainShellPage =
    route.type === 'home' ||
    route.type === 'discovery' ||
    route.type === 'plan-editor' ||
    route.type === 'official-plans' ||
    route.type === 'stats';
~~~~~

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~old
    if (route.type === 'plan-editor') {
      return (
        <PlanEditorView
          initialPlan={currentPlan}
          onExit={() => navigate(lastHomeRoute)}
          onPlanListChanged={refreshAppData}
          onSaveAndExit={async (newPlan) => {
            await savePlanAction(newPlan);
            await refreshAppData();
            showToast(t('common.planUpdatedToast'), 'success');
            navigate(lastHomeRoute);
          }}
          onStartPlanDirectly={async (newPlan) => {
            await savePlanAction(newPlan);
            await refreshAppData();
            navigate({ type: 'plan-train' });
          }}
        />
      );
    }

    return null;
  };
~~~~~
~~~~~new
    if (route.type === 'plan-editor') {
      return (
        <PlanEditorView
          initialPlan={currentPlan}
          onExit={() => navigate(lastHomeRoute)}
          onNavigateToOfficialPlans={() => navigate({ type: 'official-plans' })}
          onPlanListChanged={refreshAppData}
          onSaveAndExit={async (newPlan) => {
            await savePlanAction(newPlan);
            await refreshAppData();
            showToast(t('common.planUpdatedToast'), 'success');
            navigate(lastHomeRoute);
          }}
          onStartPlanDirectly={async (newPlan) => {
            await savePlanAction(newPlan);
            await refreshAppData();
            navigate({ type: 'plan-train' });
          }}
        />
      );
    }

    if (route.type === 'official-plans') {
      return (
        <OfficialPlansView
          userPlans={allPlansList}
          onExit={() => navigate(lastHomeRoute)}
          onNavigateToMyPlans={() => navigate({ type: 'plan-editor' })}
          onAdoptPlan={async (preset, startImmediately) => {
            const adopted = await forkOfficialPlanAction(preset, startImmediately);
            await refreshAppData();
            showToast(t('officialPlans.adoptedToast', { name: adopted.name }), 'success');
            if (startImmediately) {
              navigate({ type: 'plan-train' });
            } else {
              navigate({ type: 'plan-editor' });
            }
          }}
        />
      );
    }

    return null;
  };
~~~~~

~~~~~act
patch_file
src/views/PlanEditorView.tsx
~~~~~
~~~~~old
interface PlanEditorViewProps {
  initialPlan: TrainingPlan;
  onExit: () => void;
  onSaveAndExit: (plan: TrainingPlan) => void;
  onStartPlanDirectly: (plan: TrainingPlan) => void;
  onPlanListChanged?: () => void;
}
~~~~~
~~~~~new
interface PlanEditorViewProps {
  initialPlan: TrainingPlan;
  onExit: () => void;
  onNavigateToOfficialPlans?: () => void;
  onSaveAndExit: (plan: TrainingPlan) => void;
  onStartPlanDirectly: (plan: TrainingPlan) => void;
  onPlanListChanged?: () => void;
}
~~~~~

~~~~~act
patch_file
src/views/PlanEditorView.tsx
~~~~~
~~~~~old
export function PlanEditorView({
  initialPlan,
  onSaveAndExit,
  onStartPlanDirectly,
  onPlanListChanged,
}: PlanEditorViewProps) {
~~~~~
~~~~~new
export function PlanEditorView({
  initialPlan,
  onExit: _onExit,
  onNavigateToOfficialPlans,
  onSaveAndExit,
  onStartPlanDirectly,
  onPlanListChanged,
}: PlanEditorViewProps) {
~~~~~

~~~~~act
patch_file
src/views/PlanEditorView.tsx
~~~~~
~~~~~old
      <PlanEditorHeader
        currentPlan={currentPlan}
        isNewPlan={isNewPlan}
        isEditingName={isEditingName}
        planNameInput={planNameInput}
        showPlanManager={showPlanManager}
        plansCount={storageState.plans.length}
        fileInputRef={fileInputRef}
        onStartEditingName={() => setIsEditingName(true)}
        onCancelEditingName={() => {
          setPlanNameInput(currentPlan.name);
          setIsEditingName(false);
        }}
        onPlanNameChange={setPlanNameInput}
        onNameSave={handleNameSave}
        onTogglePlanManager={() => setShowPlanManager(!showPlanManager)}
        onClonePlan={handleCloneCurrent}
        onExportPlan={handleExportPlan}
        onImportPlan={handleImportPlan}
        onSaveOnly={handleSaveOnly}
        onSaveAndStart={handleSaveAndStart}
      />
~~~~~
~~~~~new
      <PlanEditorHeader
        currentPlan={currentPlan}
        isNewPlan={isNewPlan}
        isEditingName={isEditingName}
        planNameInput={planNameInput}
        showPlanManager={showPlanManager}
        plansCount={storageState.plans.length}
        fileInputRef={fileInputRef}
        onStartEditingName={() => setIsEditingName(true)}
        onCancelEditingName={() => {
          setPlanNameInput(currentPlan.name);
          setIsEditingName(false);
        }}
        onPlanNameChange={setPlanNameInput}
        onNameSave={handleNameSave}
        onTogglePlanManager={() => setShowPlanManager(!showPlanManager)}
        onNavigateToOfficialPlans={onNavigateToOfficialPlans}
        onClonePlan={handleCloneCurrent}
        onExportPlan={handleExportPlan}
        onImportPlan={handleImportPlan}
        onSaveOnly={handleSaveOnly}
        onSaveAndStart={handleSaveAndStart}
      />
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanEditorHeader.tsx
~~~~~
~~~~~old
export interface PlanEditorHeaderProps {
  currentPlan: TrainingPlan;
  isNewPlan: boolean;
  isEditingName: boolean;
  planNameInput: string;
  showPlanManager: boolean;
  plansCount: number;
  fileInputRef: RefObject<HTMLInputElement>;
  onStartEditingName: () => void;
  onCancelEditingName: () => void;
  onPlanNameChange: (name: string) => void;
  onNameSave: () => void;
  onTogglePlanManager: () => void;
  onClonePlan: () => void;
  onExportPlan: () => void;
  onImportPlan: (e: Event) => void;
  onSaveOnly: () => void;
  onSaveAndStart: () => void;
}
~~~~~
~~~~~new
export interface PlanEditorHeaderProps {
  currentPlan: TrainingPlan;
  isNewPlan: boolean;
  isEditingName: boolean;
  planNameInput: string;
  showPlanManager: boolean;
  plansCount: number;
  fileInputRef: RefObject<HTMLInputElement>;
  onStartEditingName: () => void;
  onCancelEditingName: () => void;
  onPlanNameChange: (name: string) => void;
  onNameSave: () => void;
  onTogglePlanManager: () => void;
  onNavigateToOfficialPlans?: () => void;
  onClonePlan: () => void;
  onExportPlan: () => void;
  onImportPlan: (e: Event) => void;
  onSaveOnly: () => void;
  onSaveAndStart: () => void;
}
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanEditorHeader.tsx
~~~~~
~~~~~old
import {
  Check,
  Copy,
  Download,
  Edit3,
  Layers,
  MoreHorizontal,
  Play,
  Save,
  Sparkles,
  Upload,
} from 'lucide-preact';
~~~~~
~~~~~new
import {
  BookOpen,
  Check,
  Copy,
  Download,
  Edit3,
  Layers,
  MoreHorizontal,
  Play,
  Save,
  Sparkles,
  Upload,
} from 'lucide-preact';
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanEditorHeader.tsx
~~~~~
~~~~~old
export function PlanEditorHeader({
  currentPlan,
  isNewPlan,
  isEditingName,
  planNameInput,
  showPlanManager,
  plansCount,
  fileInputRef,
  onStartEditingName,
  onCancelEditingName,
  onPlanNameChange,
  onNameSave,
  onTogglePlanManager,
  onClonePlan,
  onExportPlan,
  onImportPlan,
  onSaveOnly,
  onSaveAndStart,
}: PlanEditorHeaderProps) {
~~~~~
~~~~~new
export function PlanEditorHeader({
  currentPlan,
  isNewPlan,
  isEditingName,
  planNameInput,
  showPlanManager,
  plansCount,
  fileInputRef,
  onStartEditingName,
  onCancelEditingName,
  onPlanNameChange,
  onNameSave,
  onTogglePlanManager,
  onNavigateToOfficialPlans,
  onClonePlan,
  onExportPlan,
  onImportPlan,
  onSaveOnly,
  onSaveAndStart,
}: PlanEditorHeaderProps) {
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanEditorHeader.tsx
~~~~~
~~~~~old
          <Button
            variant={showPlanManager ? 'default' : 'secondary'}
            size="sm"
            onClick={onTogglePlanManager}
            className={`gap-1.5 border ${showPlanManager ? 'border-primary' : 'border-border'}`}
            title={t('plan.switchAndManageTitle')}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('plan.planLibraryTitle', { count: plansCount })}</span>
          </Button>
~~~~~
~~~~~new
          <Button
            variant={showPlanManager ? 'default' : 'secondary'}
            size="sm"
            onClick={onTogglePlanManager}
            className={`gap-1.5 border ${showPlanManager ? 'border-primary' : 'border-border'}`}
            title={t('plan.switchAndManageTitle')}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('plan.planLibraryTitle', { count: plansCount })}</span>
          </Button>

          {onNavigateToOfficialPlans && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onNavigateToOfficialPlans}
              className="gap-1.5 border border-border text-primary hover:text-primary"
              title={t('officialPlans.title')}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t('officialPlans.browseBtn')}</span>
            </Button>
          )}
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanLibraryDrawer.tsx
~~~~~
~~~~~old
import { Check, Plus, Star, Trash2 } from 'lucide-preact';
~~~~~
~~~~~new
import { BookOpen, Check, Plus, Star, Trash2 } from 'lucide-preact';
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanLibraryDrawer.tsx
~~~~~
~~~~~old
interface PlanLibraryDrawerProps {
  storageState: PlanStorageState;
  currentPlan: TrainingPlan;
  onSelectPlan: (p: TrainingPlan) => void;
  onCreateNewBlankPlan: () => void;
  onClose: () => void;
  onToggleFavorite: (planId: string, e: MouseEvent) => void;
  onDeletePlan: (planId: string, e: MouseEvent) => void;
}
~~~~~
~~~~~new
interface PlanLibraryDrawerProps {
  storageState: PlanStorageState;
  currentPlan: TrainingPlan;
  onSelectPlan: (p: TrainingPlan) => void;
  onCreateNewBlankPlan: () => void;
  onNavigateToOfficialPlans?: () => void;
  onClose: () => void;
  onToggleFavorite: (planId: string, e: MouseEvent) => void;
  onDeletePlan: (planId: string, e: MouseEvent) => void;
}
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanLibraryDrawer.tsx
~~~~~
~~~~~old
export function PlanLibraryDrawer({
  storageState,
  currentPlan,
  onSelectPlan,
  onCreateNewBlankPlan,
  onClose,
  onToggleFavorite,
  onDeletePlan,
}: PlanLibraryDrawerProps) {
~~~~~
~~~~~new
export function PlanLibraryDrawer({
  storageState,
  currentPlan,
  onSelectPlan,
  onCreateNewBlankPlan,
  onNavigateToOfficialPlans,
  onClose,
  onToggleFavorite,
  onDeletePlan,
}: PlanLibraryDrawerProps) {
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanLibraryDrawer.tsx
~~~~~
~~~~~old
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateNewBlankPlan}
            className="text-primary hover:text-primary gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('plan.createNewBlankPlan')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            {t('plan.collapse')}
          </Button>
        </div>
~~~~~
~~~~~new
        <div className="flex items-center gap-2">
          {onNavigateToOfficialPlans && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateToOfficialPlans}
              className="text-primary hover:text-primary gap-1"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t('officialPlans.browseBtn')}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateNewBlankPlan}
            className="text-primary hover:text-primary gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('plan.createNewBlankPlan')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            {t('plan.collapse')}
          </Button>
        </div>
~~~~~

~~~~~act
patch_file
src/views/PlanEditorView.tsx
~~~~~
~~~~~old
      {/* 展开的计划库总览抽屉 */}
      {showPlanManager && (
        <div className="flex-shrink-0">
          <PlanLibraryDrawer
            storageState={storageState}
            currentPlan={currentPlan}
            onSelectPlan={handleSelectPlanFromList}
            onCreateNewBlankPlan={() => {
              handleCreateNewBlankPlan();
              setMobileTab('picker');
            }}
            onClose={() => setShowPlanManager(false)}
            onToggleFavorite={handleToggleFavoriteItem}
            onDeletePlan={handleDeletePlanItem}
          />
        </div>
      )}
~~~~~
~~~~~new
      {/* 展开的计划库总览抽屉 */}
      {showPlanManager && (
        <div className="flex-shrink-0">
          <PlanLibraryDrawer
            storageState={storageState}
            currentPlan={currentPlan}
            onSelectPlan={handleSelectPlanFromList}
            onCreateNewBlankPlan={() => {
              handleCreateNewBlankPlan();
              setMobileTab('picker');
            }}
            onNavigateToOfficialPlans={onNavigateToOfficialPlans}
            onClose={() => setShowPlanManager(false)}
            onToggleFavorite={handleToggleFavoriteItem}
            onDeletePlan={handleDeletePlanItem}
          />
        </div>
      )}
~~~~~

#### Acts 7: 补齐中英文词典中官方计划库条目

更新 `src/locales/zh-CN.json` 和 `src/locales/en-US.json`，补充官方计划库及其交互的翻译键。

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~old
    "officialBadge": "官方预设",
    "newPlanBadge": "新计划",
    "confirmTitle": "操作确认",
    "deletePlan": "删除计划",
    "favoritedTooltip": "已收藏 (显示在主页快速切换)",
    "unfavoritedTooltip": "未收藏"
  },
~~~~~
~~~~~new
    "officialBadge": "官方预设",
    "newPlanBadge": "新计划",
    "confirmTitle": "操作确认",
    "deletePlan": "删除计划",
    "favoritedTooltip": "已收藏 (显示在主页快速切换)",
    "unfavoritedTooltip": "未收藏"
  },
  "officialPlans": {
    "title": "官方推荐训练流",
    "subtitle": "针对构图、起形与色彩深度推演调优的官方权威训练序列，可自由复制到个人计划库并进行自定义编排",
    "browseBtn": "官方计划库",
    "myPlansBtn": "我的计划库",
    "adoptToLibrary": "复制到我的计划",
    "adoptAndStart": "复制并立即开练",
    "adoptedBadge": "已在计划库中",
    "adoptedToast": "已成功将【{{name}}】导入到您的个人计划库！",
    "categoryWarmup": "晨间热身",
    "categoryForm": "造型构图",
    "categoryColor": "色彩光影",
    "categoryAbstraction": "提炼概括"
  },
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~old
    "officialBadge": "Official Preset",
    "newPlanBadge": "New Plan",
    "confirmTitle": "Confirmation",
    "deletePlan": "Delete Plan",
    "favoritedTooltip": "Favorited (Quick switch on home)",
    "unfavoritedTooltip": "Not favorited"
  },
~~~~~
~~~~~new
    "officialBadge": "Official Preset",
    "newPlanBadge": "New Plan",
    "confirmTitle": "Confirmation",
    "deletePlan": "Delete Plan",
    "favoritedTooltip": "Favorited (Quick switch on home)",
    "unfavoritedTooltip": "Not favorited"
  },
  "officialPlans": {
    "title": "Official Routine Presets",
    "subtitle": "Authoritative training sequences carefully crafted for perception, form, and color. Adopt them into your personal routine library for personalized customization.",
    "browseBtn": "Official Library",
    "myPlansBtn": "My Routines",
    "adoptToLibrary": "Adopt into My Library",
    "adoptAndStart": "Adopt & Start Now",
    "adoptedBadge": "In Library",
    "adoptedToast": "Successfully adopted [{{name}}] into your personal library!",
    "categoryWarmup": "Warmup",
    "categoryForm": "Form & Proportion",
    "categoryColor": "Color & Light",
    "categoryAbstraction": "Abstraction & Rhythm"
  },
~~~~~

### 下一步建议
1. **构建与功能验证**：可在终端执行 `pnpm build` 或 `npm run test` 确保无任何语法与类型错误。
2. **进一步丰富预设**：可根据后续卡片（如视平线、网格构图等）在 `src/config/plans/presets/` 下直接新增预设文件，验证 OCP 的无缝扩充能力。
3. **提交代码**：验证无误后，创建 `[COMMIT]` 计划将该系列修改提交至 Git 仓库。
