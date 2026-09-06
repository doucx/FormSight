我将按要求对官方计划页面和卡片进行极简化重构，彻底移除“已在计划库”的状态跟踪、官方计划上的各类标签徽章以及顶部的分类筛选按钮栏，并清理中英文语言包中的多余词条。

## [WIP] refactor(plan): 简化官方计划页面与卡片设计并移除分类与徽章

### 用户需求
1. 完全移除官方计划卡片上的“已在计划库”状态及徽章逻辑。
2. 清除所有官方计划卡片上的分类/推荐徽章（如“概括专项”、“推荐”等）。
3. 清除官方计划页面顶部的分类切换按钮栏（“全部 / 晨间热身 / 造型构图 / 色彩光影 / 提炼概括”）。
4. 清理 `zh-CN.json` 与 `en-US.json` 中对应的无用语言包条目。

### 评论
官方计划目前总数精炼（4个核心流），去除分类过滤栏与状态徽章后，页面结构更为直接平铺，避免了跨状态判断（删除计划后状态未同步）带来的心智负担与冗余渲染，视觉也更聚焦于训练流内容本身。

### 目标
1. 重构 `OfficialPlanCard.tsx`：移除 `isAlreadyAdopted`、`badge` 及其渲染与引入的图标（`Check`, `Sparkles`）。
2. 重构 `OfficialPlansView.tsx`：移除 `userPlans`、`adoptedMap`、分类切换状态与过滤栏 DOM，直接平铺展示所有官方预设。
3. 更新 `AppRouter.tsx`，移除对 `userPlans` 的冗余传参。
4. 清理 `src/config/plans/` 中预设文件的 `badge` 声明及类型定义。
5. 清理 `zh-CN.json` 与 `en-US.json` 中的 `adoptedBadge` 和各分类翻译键。

### 基本原理
精简不必要的派生状态，让官方计划模块回归为纯粹的“官方权威预设目录”。不再进行“是否已导入”的比对运算，移除分类过滤，直接平铺展示。

### 标签
#intent/refine #flow/ready #priority/medium
#comp/cli #concept/ui #scope/ux
#ai/refine
#task/domain/plans
#task/object/official-plans-view
#task/action/refactor
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 简化官方计划预设类型与预设配置

移除 `badge` 字段定义与独立预设中的徽章内容。

~~~~~act
patch_file
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
~~~~~typescript
export type OfficialPlanCategory = 'warmup' | 'form' | 'color' | 'abstraction' | 'general';

export interface OfficialPlanPreset {
  id: string;
  category: OfficialPlanCategory;
  locales: {
    'zh-CN': {
      name: string;
      description: string;
    };
    'en-US': {
      name: string;
      description: string;
    };
  };
  items: Array<{
    cardId: string;
    targetTrials: number;
  }>;
}
~~~~~

~~~~~act
patch_file
src/config/plans/presets/allRoundWarmup.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
export const allRoundWarmup: OfficialPlanPreset = {
  id: 'all_round_warmup',
  category: 'warmup',
  locales: {
    'zh-CN': {
      name: '晨间感知全能热身 (50题)',
      description: '快速激活空间几何、绝对色相与正负形快判直觉，适合每日开工前热身。',
    },
    'en-US': {
      name: 'Morning All-Round Warmup (50 trials)',
      description: 'Quickly activate spatial geometry, absolute hue, and negative space intuition.',
    },
  },
  items: [
~~~~~

~~~~~act
patch_file
src/config/plans/presets/geometrySculpting.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
export const geometrySculpting: OfficialPlanPreset = {
  id: 'geometry_sculpting',
  category: 'form',
  locales: {
    'zh-CN': {
      name: '造型起形与比例强化 (60题)',
      description: '深入训练双锚点透视构图、负形反切定点与折线低模概括能力。',
    },
    'en-US': {
      name: 'Structure & Proportion Reinforcement (60 trials)',
      description:
        'Deeply train dual-anchor perspective, negative space vertex fitting, and low-poly decimation.',
    },
  },
  items: [
~~~~~

~~~~~act
patch_file
src/config/plans/presets/colorLightMastery.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
export const colorLightMastery: OfficialPlanPreset = {
  id: 'color_light_mastery',
  category: 'color',
  locales: {
    'zh-CN': {
      name: '色彩光影与环境穿透 (65题)',
      description: '从绝对色相识别进阶到阿尔伯斯环境色对抗、色彩矢量迁移与综合拾色。',
    },
    'en-US': {
      name: 'Color & Light Environment Penetration (65 trials)',
      description:
        'Advance from absolute hue to Albers simultaneous contrast, vector shifts, and full color matching.',
    },
  },
  items: [
~~~~~

~~~~~act
patch_file
src/config/plans/presets/abstractionEssence.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
export const abstractionEssence: OfficialPlanPreset = {
  id: 'abstraction_essence',
  category: 'abstraction',
  locales: {
    'zh-CN': {
      name: '视知觉概括提炼 (60题)',
      description: '自底向上训练动态势线提取、黑白素描归组与主调色群提炼本质。',
    },
    'en-US': {
      name: 'Perceptual Abstraction & Essence (60 trials)',
      description:
        'Bottom-up training for gesture axis extraction, Notan grouping, and dominant color clustering.',
    },
  },
  items: [
~~~~~

#### Acts 2: 简化 `OfficialPlanCard` 组件

移除已在计划库徽章、官方标签徽章及多余图标。

~~~~~act
write_file
src/components/plan/official/OfficialPlanCard.tsx
~~~~~
~~~~~typescript
import { ArrowRight, ChevronRight, Clock, Copy, Play } from 'lucide-preact';
import type { OfficialPlanPreset } from '../../../config/plans';
import { getCardTitle, useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

interface OfficialPlanCardProps {
  preset: OfficialPlanPreset;
  onAdoptToLibrary: (preset: OfficialPlanPreset) => void;
  onAdoptAndStart: (preset: OfficialPlanPreset) => void;
}

export function OfficialPlanCard({
  preset,
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

  const validItems = (preset.items || []).filter((item) =>
    Boolean(registry.getCardById(item.cardId)),
  );
  const totalTrials = validItems.reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  return (
    <div className="group bg-card border border-border hover:border-primary/60 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between gap-5 relative select-none">
      <div className="space-y-4">
        {/* 顶栏：纯粹标题与详细阐述 */}
        <div className="space-y-1.5 min-w-0">
          <h3 className="text-base sm:text-lg font-black text-foreground group-hover:text-primary transition-colors tracking-tight">
            {name}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.5rem]">
            {description}
          </p>
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

#### Acts 3: 简化 `OfficialPlansView` 页面与 `AppRouter`

移除分类过滤栏及其状态，直接平铺展示全部官方计划。

~~~~~act
write_file
src/views/OfficialPlansView.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, BookOpen, Layers } from 'lucide-preact';
import { useMemo } from 'preact/hooks';
import { OfficialPlanCard } from '../components/plan/official/OfficialPlanCard';
import { Button } from '../components/ui/button';
import { officialPlanRegistry } from '../config/plans';
import { useTranslation } from '../core/i18n';

interface OfficialPlansViewProps {
  onExit: () => void;
  onNavigateToMyPlans: () => void;
  onAdoptPlan: (preset: import('../config/plans').OfficialPlanPreset, startImmediately?: boolean) => Promise<void>;
}

export function OfficialPlansView({
  onExit,
  onNavigateToMyPlans,
  onAdoptPlan,
}: OfficialPlansViewProps) {
  const { t } = useTranslation();

  const allPresets = useMemo(() => officialPlanRegistry.getAllPresets(), []);

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
                  {allPresets.length}
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

      {/* 官方计划卡片平铺网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {allPresets.map((preset) => (
          <OfficialPlanCard
            key={preset.id}
            preset={preset}
            onAdoptToLibrary={(p) => onAdoptPlan(p, false)}
            onAdoptAndStart={(p) => onAdoptPlan(p, true)}
          />
        ))}
      </div>
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~old
    if (route.type === 'official-plans') {
      const exitTargetRoute: RouteLocation =
        previousRoute && previousRoute.type !== 'official-plans'
          ? previousRoute
          : { type: 'plan-editor' };

      return (
        <OfficialPlansView
          userPlans={allPlansList}
          onExit={() => navigate(exitTargetRoute)}
          onNavigateToMyPlans={() => navigate({ type: 'plan-editor' })}
          onAdoptPlan={async (preset, startImmediately) => {
~~~~~
~~~~~new
    if (route.type === 'official-plans') {
      const exitTargetRoute: RouteLocation =
        previousRoute && previousRoute.type !== 'official-plans'
          ? previousRoute
          : { type: 'plan-editor' };

      return (
        <OfficialPlansView
          onExit={() => navigate(exitTargetRoute)}
          onNavigateToMyPlans={() => navigate({ type: 'plan-editor' })}
          onAdoptPlan={async (preset, startImmediately) => {
~~~~~

#### Acts 4: 清理多语言词典

移除 `adoptedBadge` 以及各分类相关键值。

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~old
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
~~~~~new
  "officialPlans": {
    "title": "官方推荐训练流",
    "subtitle": "针对构图、起形与色彩深度推演调优的官方权威训练序列，可自由复制到个人计划库并进行自定义编排",
    "browseBtn": "官方计划库",
    "myPlansBtn": "我的计划库",
    "adoptToLibrary": "复制到我的计划",
    "adoptAndStart": "复制并立即开练",
    "adoptedToast": "已成功将【{{name}}】导入到您的个人计划库！"
  },
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~old
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
~~~~~new
  "officialPlans": {
    "title": "Official Routine Presets",
    "subtitle": "Authoritative training sequences carefully crafted for perception, form, and color. Adopt them into your personal routine library for personalized customization.",
    "browseBtn": "Official Library",
    "myPlansBtn": "My Routines",
    "adoptToLibrary": "Adopt into My Library",
    "adoptAndStart": "Adopt & Start Now",
    "adoptedToast": "Successfully adopted [{{name}}] into your personal library!"
  },
~~~~~

### 下一步建议
1. **界面验证**：
   - 访问 `http://localhost:5173/#/official-plans`，确认顶部分类按钮栏已完全移除。
   - 确认卡片标题旁无任何额外徽章，卡片右上角无“已在计划库中”的绿色徽章。
   - 测试点击“复制到我的计划”或“复制并立即开练”，确认导入并开练功能依然准确无误。
2. **提交代码**：验证界面与交互无误后，创建 `[COMMIT]` 计划提交更改。
