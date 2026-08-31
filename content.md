我将为你制定重构计划，创建 `Input`、`Select`、`Switch`、`MetricCard` 四个核心 CVA 原语，并在全站范围内重构表单控件、开关切换器、统计度量卡片以及剩余的硬编码色值。

## [WIP] feat(ui): 创建 Input、Select、Switch 与 MetricCard 抽象并重构表单与统计组件

### 用户需求
1. 在 `src/components/ui/` 下创建 `Input`、`Select`、`Switch` 与 `MetricCard` 的 `cva` 抽象，并统一由 `index.ts` 导出。
2. 重构 `SettingToggleItem.tsx` 与 `SettingsModal.tsx`，使用纯 CSS 驱动的统一 `<Switch>` 原语替换散落的 Lucide 开关图标与裸 `<button>`。
3. 重构 `FilterEngine.tsx`、`PlanEditorHeader.tsx`、`GlobalStatsView.tsx`、`CognitiveMasteryGrid.tsx`，消除裸 `<input>`、裸 `<select>` 以及手写度量容器。
4. 将 `ColorCanvas.tsx`、`AlbersInductionView.tsx` 中的裸提交按钮替换为 `<Button>`，并清洗 `star/analytics.tsx` 与 `color/analytics.tsx` 中遗留的硬编码类名。
5. 运行统一性扫描器验证重构成果。

### 评论
将表单基础控件（输入框、选择器、开关）和数据度量方块收敛为设计系统标准原子组件后，全站的表单聚焦样式（Focus Ring）、明暗模式背景、尺寸规范（Default/Sm/Lg）和微交互动画将实现 100% 统一，并显著降低后续开发新功能时的样式重复定义成本。

### 目标
1. 新建 `src/components/ui/input.tsx`、`src/components/ui/select.tsx`、`src/components/ui/switch.tsx`、`src/components/ui/metric-card.tsx`。
2. 更新 `src/components/ui/index.ts` 导出所有新增组件。
3. 重构 `SettingToggleItem.tsx`、`SettingsModal.tsx`、`FilterEngine.tsx`、`PlanEditorHeader.tsx`、`GlobalStatsView.tsx`、`CognitiveMasteryGrid.tsx`、`ColorCanvas.tsx`、`AlbersInductionView.tsx`、`star/analytics.tsx`、`color/analytics.tsx`。
4. 运行扫描器复检。

### 基本原理
- **`Switch`**: 使用无依赖的标准 HTML `<button role="switch">` 结合 Tailwind `peer` 和 `translate-x` 实现 60fps 平滑物理滑块过渡，彻底摆脱双图标切换的生硬视觉。
- **`Input` & `Select`**: 收敛统一的 `focus:ring-2 focus:ring-primary/20`、`border-border` 和占位符配色。
- **`MetricCard`**: 标准化多维度统计方块的圆角、内边距与明暗主题 Token（`variant: default | subtle | accent | success | warning | danger`）。

### 标签
#intent/build #flow/ready #priority/high #comp/interfaces #concept/ui #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/form-primitives #task/action/cva-refactor #task/state/begin #task/status/active

---

### Script

#### Acts 1: 创建 `Input`、`Select`、`Switch` 与 `MetricCard` UI 原语

~~~~~act
write_file
src/components/ui/input.tsx
~~~~~
~~~~~typescript
import { type VariantProps, cva } from 'class-variance-authority';
import type { JSX } from 'preact';
import { cn } from '../../utils/cn';

export const inputVariants = cva(
  'w-full bg-card hover:bg-muted/50 focus:bg-card text-foreground font-bold border border-border transition-all placeholder:text-muted-foreground placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      inputSize: {
        default: 'px-3.5 py-2.5 text-xs rounded-2xl',
        sm: 'px-2.5 py-1.5 text-xs rounded-xl',
        lg: 'px-4 py-3 text-sm rounded-2xl',
      },
    },
    defaultVariants: {
      inputSize: 'default',
    },
  },
);

export interface InputProps
  extends Omit<JSX.HTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  type?: string;
}

export function Input({ className, inputSize, type = 'text', ...props }: InputProps) {
  return <input type={type} className={cn(inputVariants({ inputSize }), className)} {...props} />;
}
~~~~~

~~~~~act
write_file
src/components/ui/select.tsx
~~~~~
~~~~~typescript
import { type VariantProps, cva } from 'class-variance-authority';
import type { ComponentChildren, JSX } from 'preact';
import { cn } from '../../utils/cn';

export const selectVariants = cva(
  'w-full appearance-none bg-muted hover:bg-accent text-foreground font-bold border border-border transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
  {
    variants: {
      selectSize: {
        default: 'py-2 pl-8 pr-8 text-xs rounded-xl',
        sm: 'py-1.5 pl-6 pr-6 text-xs rounded-lg',
        lg: 'py-2.5 pl-10 pr-10 text-sm rounded-2xl',
      },
    },
    defaultVariants: {
      selectSize: 'default',
    },
  },
);

export interface SelectProps
  extends Omit<JSX.HTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectVariants> {
  children?: ComponentChildren;
}

export function Select({ className, selectSize, children, ...props }: SelectProps) {
  return (
    <select className={cn(selectVariants({ selectSize }), className)} {...props}>
      {children}
    </select>
  );
}
~~~~~

~~~~~act
write_file
src/components/ui/switch.tsx
~~~~~
~~~~~typescript
import { type VariantProps, cva } from 'class-variance-authority';
import type { JSX } from 'preact';
import { cn } from '../../utils/cn';

export const switchVariants = cva(
  'inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 select-none',
  {
    variants: {
      checked: {
        true: 'bg-primary',
        false: 'bg-muted border-border',
      },
      size: {
        default: 'h-6 w-11',
        sm: 'h-5 w-9',
      },
    },
    defaultVariants: {
      checked: false,
      size: 'default',
    },
  },
);

const switchThumbVariants = cva(
  'pointer-events-none block rounded-full bg-white shadow-md ring-0 transition-transform duration-200',
  {
    variants: {
      checked: {
        true: 'translate-x-5',
        false: 'translate-x-0 bg-muted-foreground/80 dark:bg-muted-foreground',
      },
      size: {
        default: 'h-5 w-5',
        sm: 'h-4 w-4',
      },
    },
    compoundVariants: [{ size: 'sm', checked: true, className: 'translate-x-4' }],
    defaultVariants: {
      checked: false,
      size: 'default',
    },
  },
);

export interface SwitchProps
  extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'size'>,
    VariantProps<typeof switchVariants> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function Switch({
  className,
  checked,
  size,
  disabled,
  onCheckedChange,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(switchVariants({ checked, size }), className)}
      {...props}
    >
      <span className={cn(switchThumbVariants({ checked, size }))} />
    </button>
  );
}
~~~~~

~~~~~act
write_file
src/components/ui/metric-card.tsx
~~~~~
~~~~~typescript
import { type VariantProps, cva } from 'class-variance-authority';
import type { ComponentChildren, JSX } from 'preact';
import { cn } from '../../utils/cn';

export const metricCardVariants = cva('rounded-2xl border transition-colors shadow-xs', {
  variants: {
    variant: {
      default: 'bg-card border-border',
      subtle: 'bg-muted/60 border-border',
      accent: 'bg-accent border-border/60 text-primary',
      success:
        'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60',
      warning: 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60',
      danger: 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/60',
    },
    padding: {
      default: 'p-4 sm:p-5',
      compact: 'p-3.5 sm:p-4',
      dense: 'p-3',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'default',
  },
});

export interface MetricCardProps
  extends JSX.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof metricCardVariants> {
  children?: ComponentChildren;
}

export function MetricCard({ className, variant, padding, children, ...props }: MetricCardProps) {
  return (
    <div className={cn(metricCardVariants({ variant, padding }), className)} {...props}>
      {children}
    </div>
  );
}
~~~~~

#### Acts 2: 更新 `src/components/ui/index.ts` 导出列表

~~~~~act
write_file
src/components/ui/index.ts
~~~~~
~~~~~typescript
export * from './button';
export * from './card';
export * from './badge';
export * from './choice-card';
export * from './input';
export * from './select';
export * from './switch';
export * from './metric-card';
~~~~~

#### Acts 3: 重构 `SettingToggleItem.tsx` 与 `SettingsModal.tsx`

~~~~~act
write_file
src/components/settings/common/SettingToggleItem.tsx
~~~~~
~~~~~typescript
import { Switch } from '../../ui/switch';

interface SettingToggleItemProps {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SettingToggleItem({
  title,
  description,
  checked,
  onChange,
}: SettingToggleItemProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript
import { Flame, Sliders, Target } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { getCardTitle, useTranslation } from '../core/i18n';
import type { CardDefinition } from '../types/card';
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
  saveSettings,
} from '../utils/settings';
import { ModalShell } from './common/ModalShell';
import { DynamicDomainSettings } from './settings/DynamicDomainSettings';
import { Button } from './ui/button';
import { Switch } from './ui/switch';

interface SettingsModalProps {
  card: CardDefinition;
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => void;
}

export function SettingsModal({ card, settings, onClose, onSave }: SettingsModalProps) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<UserSettings>({ ...settings });
  const cardConfig = getCardSettings(current, card.id);

  const cardTitle = getCardTitle(card, t);

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

  return (
    <ModalShell
      title={t('settingsModal.title', { title: cardTitle })}
      icon={Sliders}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        {/* 通用配置：自动翻页开关 */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-foreground">
              {t('settingsModal.autoNext')}
            </div>
            <div className="text-xs text-muted-foreground">{t('settingsModal.autoNextDesc')}</div>
          </div>
          <Switch
            checked={cardConfig.autoNext}
            onCheckedChange={(val) => updateCardConfig({ autoNext: val })}
            aria-label={t('settingsModal.autoNext')}
          />
        </div>

        {/* 通用配置：自动翻页延迟 */}
        {cardConfig.autoNext && (
          <div className="space-y-2 bg-muted/60 p-3.5 rounded-2xl border border-border/60">
            <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
              <span>{t('settingsModal.delay')}</span>
              <span className="font-mono text-primary font-bold">
                {cardConfig.autoNextDelay} ms
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={cardConfig.autoNextDelay}
              onInput={(e) => {
                const val = Number.parseInt((e.target as HTMLInputElement).value, 10);
                updateCardConfig({ autoNextDelay: val });
              }}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
        )}

        {/* 通用配置：自适应算子模式 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">
            {t('settingsModal.adaptiveMode')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={cardConfig.adaptiveMode === 'block' ? 'default' : 'outline'}
              onClick={() => updateCardConfig({ adaptiveMode: 'block' })}
              className="gap-1.5 h-auto py-2.5"
            >
              <Target className="w-3.5 h-3.5 text-inherit" />
              {t('settingsModal.modeBlock')}
            </Button>
            <Button
              variant={cardConfig.adaptiveMode === 'staircase' ? 'default' : 'outline'}
              onClick={() => updateCardConfig({ adaptiveMode: 'staircase' })}
              className="gap-1.5 h-auto py-2.5"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              {t('settingsModal.modeStaircase')}
            </Button>
          </div>
        </div>

        {/* 轮次评估配置 */}
        {cardConfig.adaptiveMode === 'block' && (
          <div className="space-y-3 bg-accent p-3.5 rounded-2xl border border-border/60">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                <span>{t('settingsModal.targetAcc')}</span>
                <span className="font-bold text-primary font-mono">
                  {Math.round(cardConfig.targetAccuracy * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.7, 0.8, 0.85, 0.9].map((acc) => (
                  <Button
                    key={acc}
                    variant={cardConfig.targetAccuracy === acc ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateCardConfig({ targetAccuracy: acc })}
                    className="h-auto py-1.5"
                  >
                    {Math.round(acc * 100)}%
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                <span>{t('settingsModal.blockSize')}</span>
                <span className="font-bold text-primary font-mono">
                  {t('settingsModal.trialsPerBlock', { size: cardConfig.blockSize })}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[10, 15, 20].map((size) => (
                  <Button
                    key={size}
                    variant={cardConfig.blockSize === size ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateCardConfig({ blockSize: size })}
                    className="h-auto py-1.5"
                  >
                    {t('settingsModal.trialsUnit', { size })}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 难度阶梯精细度 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">
            {t('settingsModal.stepGranularity')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={cardConfig.stepGranularity === 'standard' ? 'default' : 'outline'}
              onClick={() => updateCardConfig({ stepGranularity: 'standard' })}
              className="h-auto py-2.5"
            >
              {t('settingsModal.stepStandard')}
            </Button>
            <Button
              variant={cardConfig.stepGranularity === 'fine' ? 'default' : 'outline'}
              onClick={() => updateCardConfig({ stepGranularity: 'fine' })}
              className="h-auto py-2.5"
            >
              {t('settingsModal.stepFine')}
            </Button>
          </div>
        </div>

        {/* 渲染卡片专属设置 Schemas */}
        {card.settingSchemas && card.settingSchemas.length > 0 && (
          <DynamicDomainSettings
            schemas={card.settingSchemas}
            values={cardConfig}
            onChange={(patch) => updateCardConfig(patch)}
          />
        )}
      </div>

      <div className="pt-2">
        <Button variant="default" onClick={onClose} className="w-full py-2.5 h-auto">
          {t('common.complete')}
        </Button>
      </div>
    </ModalShell>
  );
}
~~~~~

#### Acts 4: 重构 `FilterEngine.tsx`、`PlanEditorHeader.tsx`、`GlobalStatsView.tsx` 与 `CognitiveMasteryGrid.tsx`

~~~~~act
write_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~typescript
import { Boxes, Filter, RotateCcw, Search, Sparkles, X } from 'lucide-preact';
import { getPackTitle, useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type { CardQueryOptions } from '../../types/card';
import { TagPill } from '../common/TagPill';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { AdvancedTagMatrix, FilterSectionHeader } from './AdvancedTagMatrix';

interface FilterEngineProps {
  query: CardQueryOptions;
  totalMatches: number;
  variant?: 'default' | 'compact';
  className?: string;
  onChange: (newQuery: CardQueryOptions) => void;
}

export function FilterEngine({
  query,
  totalMatches,
  variant = 'default',
  className = '',
  onChange,
}: FilterEngineProps) {
  const { t } = useTranslation();
  const isCompact = variant === 'compact';
  const isAdvancedOpen = Boolean(query.showAdvanced);
  const packs = registry.getAllPacks();

  const toggleDimension = <T extends string>(key: keyof CardQueryOptions, value: T) => {
    const current = (query[key] as T[] | undefined) || [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChange({ ...query, [key]: next.length > 0 ? next : undefined });
  };

  const hasActiveFilters = Boolean(
    query.searchKeyword ||
      query.packId ||
      (query.domains && query.domains.length > 0) ||
      (query.paths && query.paths.length > 0) ||
      (query.challenges && query.challenges.length > 0) ||
      (query.interactions && query.interactions.length > 0) ||
      (query.statuses && query.statuses.length > 0),
  );

  const containerClasses = isCompact
    ? `w-full bg-muted/80 border border-border rounded-2xl p-3 space-y-2.5 flex-shrink-0 ${className}`
    : `w-full bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 ${className}`;

  const tagSize = isCompact ? 'sm' : 'md';

  return (
    <div className={containerClasses}>
      {/* 顶栏：搜索框与操作控制 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search
            className={`${
              isCompact ? 'w-3.5 h-3.5 left-3' : 'w-4 h-4 left-3.5'
            } text-muted-foreground absolute top-1/2 -translate-y-1/2 pointer-events-none z-10`}
          />
          <Input
            inputSize={isCompact ? 'sm' : 'default'}
            value={query.searchKeyword || ''}
            onInput={(e) =>
              onChange({
                ...query,
                searchKeyword: (e.target as HTMLInputElement).value || undefined,
              })
            }
            placeholder={t('home.searchPlaceholder')}
            className={isCompact ? 'pl-8 pr-8' : 'pl-10 pr-10'}
          />
          {query.searchKeyword && (
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => onChange({ ...query, searchKeyword: undefined })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground h-6 w-6 z-10"
              title={t('common.clear')}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-1.5 flex-shrink-0">
          {!isCompact && (
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 px-3 py-2 bg-muted border border-border/60 rounded-xl text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>{t('home.matchedModules', { count: totalMatches })}</span>
            </div>
          )}

          <Button
            variant={isAdvancedOpen ? 'accent' : 'outline'}
            size={isCompact ? 'sm' : 'default'}
            onClick={() => onChange({ ...query, showAdvanced: !isAdvancedOpen })}
            className="gap-1.5 h-auto py-2"
          >
            <Filter className="w-3 h-3 text-primary" />
            <span>
              {isAdvancedOpen ? t('home.collapseAdvancedFilter') : t('home.advancedFilter')}
            </span>
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size={isCompact ? 'sm' : 'default'}
              onClick={() => onChange(isAdvancedOpen ? { showAdvanced: true } : {})}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200/60 dark:border-rose-900/60 gap-1 h-auto py-2"
              title={t('common.clear')}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('common.clear')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* 扩展包 (Pack) 快速筛选标签 */}
      {packs.length > 0 && (
        <div
          className={`space-y-1 border-t border-border/60 dark:border-border ${isCompact ? 'pt-1.5' : 'pt-3'}`}
        >
          <FilterSectionHeader icon={Boxes} title={t('home.allPacks')} />
          <div
            className={`flex gap-1 items-center ${
              isCompact ? 'flex-nowrap overflow-x-auto pb-1.5 scrollbar-none' : 'flex-wrap'
            }`}
          >
            <TagPill
              size={tagSize}
              label={t('home.allPacks')}
              selected={!query.packId}
              onClick={() => onChange({ ...query, packId: undefined })}
            />
            {packs.map((p) => (
              <TagPill
                key={p.packId}
                size={tagSize}
                label={getPackTitle(p, t)}
                count={p.cards.length}
                selected={query.packId === p.packId}
                onClick={() =>
                  onChange({ ...query, packId: query.packId === p.packId ? undefined : p.packId })
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* 高级五维标签矩阵折叠区 */}
      {isAdvancedOpen && (
        <AdvancedTagMatrix
          query={query}
          tagSize={tagSize}
          isCompact={isCompact}
          onToggleDomain={(d) => toggleDimension('domains', d)}
          onTogglePath={(p) => toggleDimension('paths', p)}
          onToggleChallenge={(c) => toggleDimension('challenges', c)}
          onToggleInteraction={(i) => toggleDimension('interactions', i)}
          onToggleStatus={(st) => toggleDimension('statuses', st)}
        />
      )}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/plan/editor/PlanEditorHeader.tsx
~~~~~
~~~~~typescript
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
import type { RefObject } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import type { TrainingPlan } from '../../../types/plan';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

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
  const { t } = useTranslation();
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState<boolean>(false);

  useEffect(() => {
    if (!showMobileMoreMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMobileMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileMoreMenu]);

  return (
    <header className="w-full bg-card border border-border rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm flex items-center justify-between gap-2.5 flex-shrink-0">
      {/* 左侧：计划名与重命名 */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-1 w-full max-w-xs">
              <Input
                inputSize="sm"
                value={planNameInput}
                onInput={(e) => onPlanNameChange((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onNameSave();
                  if (e.key === 'Escape') onCancelEditingName();
                }}
                maxLength={32}
                placeholder={t('plan.nameInputPlaceholder')}
              />
              <Button
                variant="ghost"
                size="iconSm"
                onClick={onNameSave}
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex-shrink-0"
                title={t('common.confirm')}
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-sm sm:text-lg font-black text-foreground truncate tracking-tight">
                {currentPlan.name}
              </h1>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={onStartEditingName}
                className="flex-shrink-0 text-muted-foreground hover:text-primary"
                title={t('plan.renameTitle')}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </Button>

              {isNewPlan ? (
                <Badge variant="success" size="sm" className="hidden sm:inline-flex flex-shrink-0">
                  <Sparkles className="w-2.5 h-2.5" />
                  {t('common.newPlanBadge')}
                </Badge>
              ) : currentPlan.isBuiltin ? (
                <Badge variant="accent" size="sm" className="hidden sm:inline-flex flex-shrink-0">
                  {t('common.officialBadge')}
                </Badge>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* 右侧：桌面端平铺操作 & 移动端收纳操作 */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* 桌面端平铺操作区 */}
        <div className="hidden sm:flex items-center gap-2">
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

          <Button
            variant="secondary"
            size="icon"
            onClick={onClonePlan}
            className="border border-border"
            title={t('plan.cloneCopyTitle')}
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            onClick={onExportPlan}
            className="border border-border"
            title={t('plan.exportJsonTitle')}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="border border-border"
            title={t('plan.importJsonTitle')}
          >
            <Upload className="w-3.5 h-3.5" />
          </Button>

          <div className="h-5 w-px bg-border mx-1" />

          <Button
            variant="secondary"
            size="sm"
            onClick={onSaveOnly}
            disabled={currentPlan.items.length === 0}
            className="gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t('common.save')}</span>
          </Button>
        </div>

        {/* 移动端更多操作弹层菜单 */}
        <div ref={moreMenuRef} className="relative sm:hidden">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setShowMobileMoreMenu(!showMobileMoreMenu)}
            className="border border-border"
            title={t('common.settings')}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>

          {showMobileMoreMenu && (
            <div className="absolute right-0 top-full mt-2 z-50 w-48 bg-card rounded-2xl shadow-xl border border-border p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  onTogglePlanManager();
                }}
                className="w-full justify-start gap-2 h-auto py-2"
              >
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>{t('plan.libraryBtn')}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  onClonePlan();
                }}
                className="w-full justify-start gap-2 h-auto py-2"
              >
                <Copy className="w-3.5 h-3.5 text-primary" />
                <span>{t('plan.cloneBtn')}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  onExportPlan();
                }}
                className="w-full justify-start gap-2 h-auto py-2"
              >
                <Download className="w-3.5 h-3.5 text-primary" />
                <span>{t('plan.exportBtn')}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  fileInputRef.current?.click();
                }}
                className="w-full justify-start gap-2 h-auto py-2"
              >
                <Upload className="w-3.5 h-3.5 text-primary" />
                <span>{t('plan.importBtn')}</span>
              </Button>
              <div className="my-1 border-t border-border/60" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  onSaveOnly();
                }}
                disabled={currentPlan.items.length === 0}
                className="w-full justify-start gap-2 h-auto py-2 text-primary hover:text-primary disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t('common.save')}</span>
              </Button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={onImportPlan}
          className="hidden"
        />

        {/* 统一开始训练主 CTA */}
        <Button
          variant="default"
          size="sm"
          onClick={onSaveAndStart}
          disabled={currentPlan.items.length === 0}
          className="gap-1.5 px-3.5 sm:px-4"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{t('plan.startPlan')}</span>
        </Button>
      </div>
    </header>
  );
}
~~~~~

~~~~~act
write_file
src/views/GlobalStatsView.tsx
~~~~~
~~~~~typescript
import { Activity, BarChart2, ChevronDown, Filter } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import { ActivityHeatmapCard } from '../components/stats/ActivityHeatmapCard';
import { CognitiveMasteryGrid } from '../components/stats/CognitiveMasteryGrid';
import { StatsMetricCards } from '../components/stats/StatsMetricCards';
import { Select } from '../components/ui/select';
import { CHALLENGE_TAGS, DOMAIN_TAGS, PATH_TAGS } from '../config/tags';
import { getCardTitle, getPackTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import { useGlobalStatsData } from '../hooks/useGlobalStatsData';
import type { CognitivePathTag, MentalChallengeTag, VisualDomainTag } from '../types/card';
import { renderTrendChartCanvas } from '../utils/canvas/drawTrendChart';

interface GlobalStatsViewProps {
  onExit?: () => void;
}

export function GlobalStatsView(_props: GlobalStatsViewProps = {}) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    loading,
    selectedFilter,
    setSelectedFilter,
    getCurrentFilterLabel,
    stats,
    dailyData,
    heatmapData,
    pathMasteryList,
    challengeMasteryList,
  } = useGlobalStatsData();

  const packs = registry.getAllPacks();
  const allCards = registry.getAllCards();

  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (canvas) {
      renderTrendChartCanvas(canvas, dailyData);
    }
  }, [loading, dailyData]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 顶部主操作栏 */}
      <header className="w-full bg-card border border-border rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-accent text-primary rounded-2xl shadow-xs">
            <BarChart2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">
              {t('stats.title')}
            </h1>
            <p className="text-xs text-muted-foreground font-medium">{t('stats.subTitle')}</p>
          </div>
        </div>

        {/* 筛选选择器 */}
        <div className="relative flex items-center self-end sm:self-center w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-primary absolute left-3 pointer-events-none z-10" />
          <Select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter((e.target as HTMLSelectElement).value)}
            className="w-full sm:w-auto max-w-xs truncate"
          >
            <option value="all">{t('stats.allModules')}</option>

            <optgroup label={t('stats.optgroupPacks')}>
              {packs.map((p) => (
                <option key={`pack:${p.packId}`} value={`pack:${p.packId}`}>
                  {getPackTitle(p, t)}
                </option>
              ))}
            </optgroup>

            <optgroup label={t('stats.optgroupDomains')}>
              {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((domain) => (
                <option key={`domain:${domain}`} value={`domain:${domain}`}>
                  {t(DOMAIN_TAGS[domain].i18nKey)}
                </option>
              ))}
            </optgroup>

            <optgroup label={t('stats.optgroupPaths')}>
              {(Object.keys(PATH_TAGS) as CognitivePathTag[]).map((path) => (
                <option key={`path:${path}`} value={`path:${path}`}>
                  {t(PATH_TAGS[path].i18nKey)}
                </option>
              ))}
            </optgroup>

            <optgroup label={t('stats.optgroupChallenges')}>
              {(Object.keys(CHALLENGE_TAGS) as MentalChallengeTag[]).map((ch) => (
                <option key={`challenge:${ch}`} value={`challenge:${ch}`}>
                  {t(CHALLENGE_TAGS[ch].i18nKey)}
                </option>
              ))}
            </optgroup>

            <optgroup label={t('stats.optgroupCards')}>
              {allCards.map((card) => (
                <option key={`card:${card.id}`} value={`card:${card.id}`}>
                  {getCardTitle(card, t)}
                </option>
              ))}
            </optgroup>
          </Select>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 pointer-events-none z-10" />
        </div>
      </header>

      {/* 主体展示区 */}
      {loading ? (
        <div className="h-96 bg-card rounded-3xl border border-border p-6 flex items-center justify-center text-muted-foreground text-sm shadow-sm">
          {t('stats.loading')}
        </div>
      ) : stats.allTime.total === 0 ? (
        <div className="h-96 bg-card rounded-3xl border border-border p-6 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2 shadow-sm">
          <Activity className="w-10 h-10 text-muted-foreground" />
          {t('stats.noRecords', { filter: getCurrentFilterLabel() })}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <StatsMetricCards stats={stats} streakDays={Object.keys(dailyData).length} />

          <CognitiveMasteryGrid
            pathMasteryList={pathMasteryList}
            challengeMasteryList={challengeMasteryList}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActivityHeatmapCard heatmapData={heatmapData} />

            <div className="bg-card border border-border shadow-sm p-6 rounded-3xl flex flex-col gap-2">
              <div className="text-sm font-bold text-foreground flex items-center justify-between">
                <span>{t('stats.trendTitle')}</span>
                <span className="text-xs font-medium text-muted-foreground bg-muted text-muted-foreground px-2.5 py-0.5 rounded-lg">
                  {t('stats.dailyMaxLevel')}
                </span>
              </div>
              <canvas ref={canvasRef} width={480} height={160} className="w-full mt-2" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/stats/CognitiveMasteryGrid.tsx
~~~~~
~~~~~typescript
import { Brain, Compass } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import { MetricCard } from '../ui/metric-card';

export interface MasteryItem {
  label: string;
  total: number;
  hits: number;
  accuracy: number;
  cardCount: number;
}

interface CognitiveMasteryGridProps {
  pathMasteryList: MasteryItem[];
  challengeMasteryList: MasteryItem[];
}

export function CognitiveMasteryGrid({
  pathMasteryList,
  challengeMasteryList,
}: CognitiveMasteryGridProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* 认知路径推演能力矩阵 */}
      <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-600" />
            {t('stats.pathMasteryTitle')}
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {t('stats.pathMasterySubtitle')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {pathMasteryList.map((pm) => (
            <MetricCard
              key={pm.label}
              variant="subtle"
              padding="compact"
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="truncate">{pm.label}</span>
                <span
                  className={`font-mono text-xs px-2 py-0.5 rounded-lg ${
                    pm.total === 0
                      ? 'bg-muted text-muted-foreground'
                      : pm.accuracy >= 80
                        ? 'bg-emerald-50 text-emerald-700 font-black'
                        : pm.accuracy >= 60
                          ? 'bg-amber-50 text-amber-700 font-black'
                          : 'bg-rose-50 text-rose-700 font-black'
                  }`}
                >
                  {pm.total > 0 ? `${pm.accuracy}%` : '--'}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>{t('stats.practicedTrials', { count: pm.total })}</span>
                <span>{t('stats.modulesCount', { count: pm.cardCount })}</span>
              </div>
            </MetricCard>
          ))}
        </div>
      </div>

      {/* 核心心智抗性矩阵 */}
      <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            <Brain className="w-4 h-4 text-rose-500" />
            {t('stats.challengeMasteryTitle')}
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {t('stats.challengeMasterySubtitle')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {challengeMasteryList.map((cm) => (
            <MetricCard
              key={cm.label}
              variant="subtle"
              padding="compact"
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="truncate">{cm.label.split(' ')[0]}</span>
                <span
                  className={`font-mono text-xs px-2 py-0.5 rounded-lg ${
                    cm.total === 0
                      ? 'bg-muted text-muted-foreground'
                      : cm.accuracy >= 80
                        ? 'bg-rose-50 text-rose-700 font-black'
                        : cm.accuracy >= 60
                          ? 'bg-amber-50 text-amber-700 font-black'
                          : 'bg-muted text-muted-foreground font-black'
                  }`}
                >
                  {cm.total > 0 ? `${cm.accuracy}%` : '--'}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>{t('stats.practicedTrials', { count: cm.total })}</span>
                <span>{t('stats.modulesCount', { count: cm.cardCount })}</span>
              </div>
            </MetricCard>
          ))}
        </div>
      </div>
    </>
  );
}
~~~~~

#### Acts 5: 重构 `ColorCanvas.tsx`、`AlbersInductionView.tsx` 与相关分析模块

~~~~~act
write_file
src/packs/color/views/ColorCanvas.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useState } from 'preact/hooks';
import { HsvTrackSlider } from '../../../components/HsvTrackSlider';
import { Button } from '../../../components/ui/button';
import {
  type ColorHitResult,
  type ColorQuestionData,
  hsvToHex,
} from '../../../core/color/colorUtils';
import { useTranslation } from '../../../core/i18n';
import { HUE_SPECTRUM_GRADIENT, PALETTE } from '../../../utils/theme';

export interface ColorCanvasProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number | [number, number, number]) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
}

export function ColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  enableHoverColorPreview = true,
}: ColorCanvasProps) {
  const { t } = useTranslation();
  const { mode, targetH, targetS, targetV, difficultyLevel } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);
  const targetHSV: [number, number, number] = [targetH, targetS, targetV];

  const [userH, setUserH] = useState<number>(180);
  const [userS, setUserS] = useState<number>(50);
  const [userV, setUserV] = useState<number>(50);

  const [allHoverVals, setAllHoverVals] = useState<Record<'H' | 'S' | 'V', number | null>>({
    H: null,
    S: null,
    V: null,
  });
  const [draggingLabel, setDraggingLabel] = useState<'H' | 'S' | 'V' | null>(null);

  const handleHoverH = useCallback(
    (hVal: number | null) =>
      setAllHoverVals((prev) => (prev.H === hVal ? prev : { ...prev, H: hVal })),
    [],
  );
  const handleHoverS = useCallback(
    (sVal: number | null) =>
      setAllHoverVals((prev) => (prev.S === sVal ? prev : { ...prev, S: sVal })),
    [],
  );
  const handleHoverV = useCallback(
    (vVal: number | null) =>
      setAllHoverVals((prev) => (prev.V === vVal ? prev : { ...prev, V: vVal })),
    [],
  );

  const handleDragH = useCallback((isDrag: boolean) => setDraggingLabel(isDrag ? 'H' : null), []);
  const handleDragS = useCallback((isDrag: boolean) => setDraggingLabel(isDrag ? 'S' : null), []);
  const handleDragV = useCallback((isDrag: boolean) => setDraggingLabel(isDrag ? 'V' : null), []);

  useEffect(() => {
    if (mode === 'ALL') {
      setUserH(180);
      setUserS(50);
      setUserV(50);
      setAllHoverVals({ H: null, S: null, V: null });
      setDraggingLabel(null);
    }
  }, [mode]);

  const handleSubmitAll = () => {
    if (disabled || showAnswer) return;
    onAnswer([userH, userS, userV]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && mode === 'ALL' && !showAnswer && !disabled) {
        e.preventDefault();
        onAnswer([userH, userS, userV]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, showAnswer, disabled, userH, userS, userV, onAnswer]);

  const currentH = mode === 'ALL' ? userH : targetH;
  const currentV = mode === 'ALL' ? userV : targetV;

  const hueGradient = HUE_SPECTRUM_GRADIENT;
  const satGradient = `linear-gradient(to right, ${hsvToHex(currentH, 0, currentV)}, ${hsvToHex(currentH, 100, currentV)})`;
  const valGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(currentH, 100, 100)})`;

  return (
    <div className="w-full max-w-md bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      <div className="flex flex-col items-center gap-2 w-full">
        {mode === 'ALL' ? (
          <div className="flex items-center justify-center gap-4 w-full">
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-300"
              style={{ backgroundColor: targetHex }}
            />
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-75"
              style={{
                backgroundColor: hsvToHex(
                  draggingLabel === 'H' || (enableHoverColorPreview && allHoverVals.H !== null)
                    ? (allHoverVals.H ?? userH)
                    : userH,
                  draggingLabel === 'S' || (enableHoverColorPreview && allHoverVals.S !== null)
                    ? (allHoverVals.S ?? userS)
                    : userS,
                  draggingLabel === 'V' || (enableHoverColorPreview && allHoverVals.V !== null)
                    ? (allHoverVals.V ?? userV)
                    : userV,
                ),
              }}
            />
          </div>
        ) : (
          <div
            className="w-32 h-32 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-300"
            style={{ backgroundColor: targetHex }}
          />
        )}
      </div>

      <div className="w-full space-y-4 bg-muted/60 p-4 rounded-2xl border border-border/60">
        {mode === 'ALL' ? (
          <>
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={userH}
              max={360}
              unit="°"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetH}
              userVal={userAnswer?.userHSV?.[0] ?? userH}
              isHit={userAnswer?.isHit}
              onValChange={setUserH}
              allUserHSV={[userH, userS, userV]}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
              onHoverStateChange={handleHoverH}
              onDraggingStateChange={handleDragH}
            />
            <HsvTrackSlider
              label="S"
              gradient={satGradient}
              val={userS}
              max={100}
              unit="%"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetS}
              userVal={userAnswer?.userHSV?.[1] ?? userS}
              isHit={userAnswer?.isHit}
              onValChange={setUserS}
              allUserHSV={[userH, userS, userV]}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
              onHoverStateChange={handleHoverS}
              onDraggingStateChange={handleDragS}
            />
            <HsvTrackSlider
              label="V"
              gradient={valGradient}
              val={userV}
              max={100}
              unit="%"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetV}
              userVal={userAnswer?.userHSV?.[2] ?? userV}
              isHit={userAnswer?.isHit}
              onValChange={setUserV}
              allUserHSV={[userH, userS, userV]}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
              onHoverStateChange={handleHoverV}
              onDraggingStateChange={handleDragV}
            />
          </>
        ) : (
          <>
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={targetH}
              max={360}
              unit="°"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetH}
              userVal={mode === 'H' ? userAnswer?.userValue : undefined}
              isHit={mode === 'H' ? userAnswer?.isHit : undefined}
              isInteractiveTarget={mode === 'H'}
              onCommit={(v) => {
                if (mode === 'H' && !showAnswer && !disabled) onAnswer(v);
              }}
              disabled={disabled || mode !== 'H'}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand && mode === 'H'}
            />

            {mode === 'S' && (
              <HsvTrackSlider
                label="S"
                gradient={satGradient}
                val={targetS}
                max={100}
                unit="%"
                targetHSV={targetHSV}
                difficultyLevel={difficultyLevel}
                showAnswer={showAnswer}
                targetVal={targetS}
                userVal={mode === 'S' ? userAnswer?.userValue : undefined}
                isHit={mode === 'S' ? userAnswer?.isHit : undefined}
                isInteractiveTarget={true}
                onCommit={(v) => {
                  if (!showAnswer && !disabled) onAnswer(v);
                }}
                disabled={disabled}
                hitMargin={hitMargin}
                showToleranceBand={showToleranceBand}
              />
            )}

            {(mode === 'V' || mode === 'S') && (
              <HsvTrackSlider
                label="V"
                gradient={valGradient}
                val={targetV}
                max={100}
                unit="%"
                targetHSV={targetHSV}
                difficultyLevel={difficultyLevel}
                showAnswer={showAnswer}
                targetVal={targetV}
                userVal={mode === 'V' ? userAnswer?.userValue : undefined}
                isHit={mode === 'V' ? userAnswer?.isHit : undefined}
                isInteractiveTarget={mode === 'V'}
                onCommit={(v) => {
                  if (mode === 'V' && !showAnswer && !disabled) onAnswer(v);
                }}
                disabled={disabled || mode !== 'V'}
                hitMargin={hitMargin}
                showToleranceBand={showToleranceBand && mode === 'V'}
              />
            )}
          </>
        )}
      </div>

      {mode === 'ALL' && !showAnswer && (
        <Button
          variant="default"
          onClick={handleSubmitAll}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold rounded-2xl"
        >
          {t('common.confirmSpace')}
        </Button>
      )}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/packs/relative_color/components/AlbersInductionView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { HsvTrackSlider } from '../../../components/HsvTrackSlider';
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { Button } from '../../../components/ui/button';
import { hsvToHex } from '../../../core/color/colorUtils';
import { useTranslation } from '../../../core/i18n';
import { HUE_SPECTRUM_GRADIENT, PALETTE } from '../../../utils/theme';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';

interface AlbersInductionViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  userRightH: number;
  userRightS: number;
  userRightV: number;
  onUserRightHChange: (val: number) => void;
  onUserRightSChange: (val: number) => void;
  onUserRightVChange: (val: number) => void;
  onSubmit: () => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function AlbersInductionView({
  question,
  showAnswer,
  userAnswer,
  userRightH,
  userRightS,
  userRightV,
  onUserRightHChange,
  onUserRightSChange,
  onUserRightVChange,
  onSubmit,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: AlbersInductionViewProps) {
  const { t } = useTranslation();
  const isLightnessMode = question.mode === 'LIGHTNESS_INDUCTION';

  const bgLeftHex = hsvToHex(...(question.bgLeft ?? [0, 0, 100]));
  const bgRightHex = hsvToHex(...(question.bgRight ?? [0, 0, 0]));
  const centerLeftHex = hsvToHex(...(question.targetLeftCenter ?? [0, 0, 50]));

  const userRightHex = hsvToHex(userRightH, userRightS, userRightV);
  const idealRightHex = hsvToHex(...(question.idealRightCenter ?? question.targetD));

  const rightSatGradient = `linear-gradient(to right, ${hsvToHex(userRightH, 0, userRightV)}, ${hsvToHex(userRightH, 100, userRightV)})`;
  const rightValGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(userRightH, 100, 100)})`;
  const hueGradient = HUE_SPECTRUM_GRADIENT;

  return (
    <QuestionCardShell
      hintText={
        isLightnessMode
          ? t('packs.relative_color.views.lightnessHint')
          : t('packs.relative_color.views.inductionHint')
      }
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <DualViewportContainer
        leftTitle={t('packs.relative_color.views.leftBase')}
        rightTitle={t('packs.relative_color.views.rightModulate')}
        leftContent={
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-card dark:border-border shadow-md relative"
            style={{ backgroundColor: bgLeftHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all"
              style={{ backgroundColor: centerLeftHex }}
            />
          </div>
        }
        rightContent={
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-card dark:border-border shadow-md relative"
            style={{ backgroundColor: bgRightHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all relative overflow-hidden"
              style={{ backgroundColor: userRightHex }}
            >
              {showAnswer && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1/2"
                  style={{ backgroundColor: idealRightHex }}
                />
              )}
            </div>
          </div>
        }
      />

      <div className="w-full space-y-3 bg-muted/60 p-4 rounded-2xl border border-border/60">
        {!isLightnessMode && (
          <HsvTrackSlider
            label="H"
            gradient={hueGradient}
            val={userRightH}
            max={360}
            unit="°"
            targetHSV={question.targetD}
            difficultyLevel={question.difficultyLevel}
            showAnswer={showAnswer}
            targetVal={question.idealRightCenter?.[0] ?? question.targetD[0]}
            userVal={userRightH}
            isHit={userAnswer?.isHit}
            onValChange={onUserRightHChange}
            disabled={disabled}
            hitMargin={hitMargin}
            showToleranceBand={showToleranceBand}
          />
        )}

        {!isLightnessMode && (
          <HsvTrackSlider
            label="S"
            gradient={rightSatGradient}
            val={userRightS}
            max={100}
            unit="%"
            targetHSV={question.targetD}
            difficultyLevel={question.difficultyLevel}
            showAnswer={showAnswer}
            targetVal={question.idealRightCenter?.[1] ?? question.targetD[1]}
            userVal={userRightS}
            isHit={userAnswer?.isHit}
            onValChange={onUserRightSChange}
            disabled={disabled}
            hitMargin={hitMargin}
            showToleranceBand={showToleranceBand}
          />
        )}

        <HsvTrackSlider
          label="V"
          gradient={rightValGradient}
          val={userRightV}
          max={100}
          unit="%"
          targetHSV={question.targetD}
          difficultyLevel={question.difficultyLevel}
          showAnswer={showAnswer}
          targetVal={question.idealRightCenter?.[2] ?? question.targetD[2]}
          userVal={userRightV}
          isHit={userAnswer?.isHit}
          onValChange={onUserRightVChange}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />
      </div>

      {!showAnswer && (
        <Button
          variant="default"
          onClick={onSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold rounded-2xl"
        >
          {t('common.confirmSpace')}
        </Button>
      )}
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
patch_file
src/packs/star/analytics.tsx
~~~~~
~~~~~typescript
              <div className="font-bold text-primary font-black flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-indigo-600" />
                {i18n.t('packs.star.analytics.spatialBias.cardTitle')}
              </div>
~~~~~
~~~~~typescript
              <div className="font-bold text-primary font-black flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-primary" />
                {i18n.t('packs.star.analytics.spatialBias.cardTitle')}
              </div>
~~~~~

~~~~~act
patch_file
src/packs/star/analytics.tsx
~~~~~
~~~~~typescript
              <div className="font-bold text-primary font-black flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                {i18n.t('packs.star.analytics.directionalCompass.cardTitle')}
              </div>
~~~~~
~~~~~typescript
              <div className="font-bold text-primary font-black flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-primary" />
                {i18n.t('packs.star.analytics.directionalCompass.cardTitle')}
              </div>
~~~~~

~~~~~act
patch_file
src/packs/color/analytics.tsx
~~~~~
~~~~~typescript
                    avgSignedBias > 0
                      ? 'text-amber-600'
                      : avgSignedBias < 0
                        ? 'text-indigo-600'
                        : 'text-foreground'
~~~~~
~~~~~typescript
                    avgSignedBias > 0
                      ? 'text-amber-600'
                      : avgSignedBias < 0
                        ? 'text-primary'
                        : 'text-foreground'
~~~~~

### 下一步建议
1. 观察执行后的统计数据，检查 `Raw Form Input`、`Raw Form Select`、`Raw Switch Toggle Icon`、`Ad-hoc Metric Card` 是否已全量清零。
2. 处理 `AppNavigation.tsx` 和 `PlanLibraryDrawer.tsx` 等剩余导航与抽屉处的 `<button>` 替换。
