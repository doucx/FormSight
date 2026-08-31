我将为你制定重构计划，创建 `ChoiceCard` UI 原语，利用 `cva` 和 `compoundVariants` 重构 `TagPill`，并将 `Choice2AfcContainer` 与 `ChoiceNafcContainer` 统一接入该标准抽象。

## [WIP] feat(ui): 创建 ChoiceOptionCard 与 TagPill 的 CVA 变体抽象并接入容器

### 用户需求
1. 创建 `ChoiceCard`（及 `choiceCardVariants` + `getChoiceCardState` 状态解析器），收敛 2AFC 与 N-AFC 中冗长的 5 态条件分支。
2. 重构 `TagPill.tsx`，彻底移除手动维护的 `Record` 颜色对象，改用 `cva` 的 `compoundVariants` 管理主题多态。
3. 将 `Choice2AfcContainer.tsx` 和 `ChoiceNafcContainer.tsx` 迁移至新的 `ChoiceCard` 原语。

### 评论
选项卡（2AFC/N-AFC）与标签胶囊（TagPill）是 FormSight 交互最为密集的两类核心视觉构件。通过 `cva` 抽象后，不仅可以消灭大量三元表达式与类名拼接代码，还能确保全站所有答题选项卡在明暗主题、Hover、选中、命中与未命中反馈时的视觉体验 100% 保持一致。

### 目标
1. 新建 `src/components/ui/choice-card.tsx`，定义 `idle | selected | correct | wrong | faded` 5 态及尺寸变体。
2. 更新 `src/components/ui/index.ts` 导出 `choice-card`。
3. 重构 `src/components/common/TagPill.tsx`，定义 `tagPillVariants` 与 `tagPillBadgeVariants`。
4. 重构 `Choice2AfcContainer.tsx` 与 `ChoiceNafcContainer.tsx`，使用 `<ChoiceCard>` 替换裸 `<button>` 及内联样式推导。
5. 运行扫描器复检。

### 基本原理
通过 `class-variance-authority` 将“业务答题状态 (showAnswer, isTarget, isSelected)”映射为清晰的枚举视觉状态（`state: 'idle' | 'selected' | 'correct' | 'wrong' | 'faded'`），并通过复合变体（`compoundVariants`）声明式绑定主题色与激活态，使得容器组件仅需关注布局与数据传递。

### 标签
#intent/build #flow/ready #priority/high #comp/interfaces #concept/ui #scope/dx #ai/instruct #task/domain/ui #task/object/choice-card #task/action/cva-refactor #task/state/begin #task/status/active

---

### Script

#### Acts 1: 创建 `src/components/ui/choice-card.tsx`

~~~~~act
write_file
src/components/ui/choice-card.tsx
~~~~~
~~~~~typescript
import { type VariantProps, cva } from 'class-variance-authority';
import type { ComponentChildren, JSX } from 'preact';
import { cn } from '../../utils/cn';

export const choiceCardVariants = cva(
  'group relative flex flex-col items-center border transition-all duration-200 text-left active:scale-[0.98]',
  {
    variants: {
      state: {
        idle: 'bg-muted/60 hover:bg-accent/30 border-border hover:border-primary/60 hover:shadow-md cursor-pointer',
        selected:
          'border-primary dark:border-indigo-500 bg-accent/30 dark:bg-accent/40 ring-2 ring-indigo-500/20 shadow-md cursor-pointer',
        correct:
          'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-500/20 cursor-default',
        wrong:
          'bg-rose-50/50 dark:bg-rose-950/40 border-rose-400 shadow-sm cursor-default',
        faded: 'bg-muted/40 border-border opacity-50 cursor-default pointer-events-none',
      },
      size: {
        default: 'gap-3 p-4 rounded-3xl',
        sm: 'gap-2.5 p-2.5 sm:p-3 rounded-2xl',
        lg: 'gap-3 p-4 rounded-3xl',
      },
    },
    defaultVariants: {
      state: 'idle',
      size: 'default',
    },
  },
);

export type ChoiceCardState = 'idle' | 'selected' | 'correct' | 'wrong' | 'faded';

/**
 * 辅助解析器：根据答题揭晓状态与命中结果，解析出对应的视觉枚举状态
 */
export function getChoiceCardState({
  showAnswer,
  isTarget,
  isSelected,
}: {
  showAnswer: boolean;
  isTarget: boolean;
  isSelected: boolean;
}): ChoiceCardState {
  if (showAnswer) {
    if (isTarget) return 'correct';
    if (isSelected) return 'wrong';
    return 'faded';
  }
  return isSelected ? 'selected' : 'idle';
}

export interface ChoiceCardProps
  extends JSX.HTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof choiceCardVariants> {
  disabled?: boolean;
  children?: ComponentChildren;
}

export function ChoiceCard({
  className,
  state,
  size,
  disabled,
  children,
  ...props
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(choiceCardVariants({ state, size }), className)}
      {...props}
    >
      {children}
    </button>
  );
}
~~~~~

#### Acts 2: 更新 `src/components/ui/index.ts`

~~~~~act
write_file
src/components/ui/index.ts
~~~~~
~~~~~typescript
export * from './button';
export * from './card';
export * from './badge';
export * from './choice-card';
~~~~~

#### Acts 3: 使用 CVA 重构 `src/components/common/TagPill.tsx`

~~~~~act
write_file
src/components/common/TagPill.tsx
~~~~~
~~~~~typescript
import { type VariantProps, cva } from 'class-variance-authority';
import { Check } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { cn } from '../../utils/cn';

export type TagPillThemeColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'purple';

export const tagPillVariants = cva(
  'inline-flex items-center gap-1 font-bold rounded-xl transition-all cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] whitespace-nowrap flex-shrink-0 border',
  {
    variants: {
      themeColor: {
        indigo: '',
        emerald: '',
        rose: '',
        amber: '',
        purple: '',
      },
      selected: {
        true: 'text-white shadow-xs border-transparent',
        false: 'bg-muted/80 hover:bg-accent text-muted-foreground border-border',
      },
      size: {
        sm: 'px-2 py-0.5 text-[11px]',
        md: 'px-2.5 py-1 text-xs',
      },
    },
    compoundVariants: [
      { themeColor: 'indigo', selected: true, className: 'bg-primary' },
      { themeColor: 'emerald', selected: true, className: 'bg-emerald-600' },
      { themeColor: 'rose', selected: true, className: 'bg-rose-600' },
      { themeColor: 'amber', selected: true, className: 'bg-amber-600' },
      { themeColor: 'purple', selected: true, className: 'bg-purple-600' },
    ],
    defaultVariants: {
      themeColor: 'indigo',
      selected: false,
      size: 'md',
    },
  },
);

export const tagPillBadgeVariants = cva('text-[10px] font-mono px-1 rounded', {
  variants: {
    themeColor: {
      indigo: '',
      emerald: '',
      rose: '',
      amber: '',
      purple: '',
    },
    selected: {
      true: '',
      false: 'bg-border text-muted-foreground',
    },
  },
  compoundVariants: [
    { themeColor: 'indigo', selected: true, className: 'bg-primary/90 text-indigo-100' },
    { themeColor: 'emerald', selected: true, className: 'bg-emerald-700 text-emerald-100' },
    { themeColor: 'rose', selected: true, className: 'bg-rose-700 text-rose-100' },
    { themeColor: 'amber', selected: true, className: 'bg-amber-700 text-amber-100' },
    { themeColor: 'purple', selected: true, className: 'bg-purple-700 text-purple-100' },
  ],
  defaultVariants: {
    themeColor: 'indigo',
    selected: false,
  },
});

export interface TagPillProps extends VariantProps<typeof tagPillVariants> {
  label: string;
  icon?: (props: { className?: string }) => ComponentChildren;
  count?: number | string;
  className?: string;
  onClick?: () => void;
}

export function TagPill({
  label,
  selected = false,
  themeColor = 'indigo',
  icon: Icon,
  count,
  size = 'md',
  className = '',
  onClick,
}: TagPillProps) {
  return (
    <button
      type="button"
      onPointerDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(tagPillVariants({ themeColor, selected, size }), className)}
    >
      {selected && <Check className="w-3 h-3 flex-shrink-0" />}
      {!selected && Icon && <Icon className="w-3 h-3 flex-shrink-0 text-muted-foreground" />}
      <span>{label}</span>
      {count !== undefined && (
        <span className={cn(tagPillBadgeVariants({ themeColor, selected }))}>{count}</span>
      )}
    </button>
  );
}
~~~~~

#### Acts 4: 将 `ChoiceCard` 接入 `Choice2AfcContainer.tsx` 与 `ChoiceNafcContainer.tsx`

~~~~~act
write_file
src/components/common/Choice2AfcContainer.tsx
~~~~~
~~~~~typescript
import { Check } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import { ChoiceCard, getChoiceCardState } from '../ui/choice-card';

export interface Choice2AfcOption {
  key: 'A' | 'B';
  keyLabel?: string;
  title: string;
  isCorrect: boolean;
  badge?: ComponentChildren;
  content: ComponentChildren;
}

interface Choice2AfcContainerProps {
  optionA: Choice2AfcOption;
  optionB: Choice2AfcOption;
  selectedChoice: 'A' | 'B' | null;
  showAnswer: boolean;
  disabled?: boolean;
  onSelect: (choice: 'A' | 'B') => void;
  enableKeyboardShortcuts?: boolean;
}

export function Choice2AfcContainer({
  optionA,
  optionB,
  selectedChoice,
  showAnswer,
  disabled = false,
  onSelect,
  enableKeyboardShortcuts = true,
}: Choice2AfcContainerProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!enableKeyboardShortcuts || disabled || showAnswer) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
        e.preventDefault();
        onSelect('A');
      } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault();
        onSelect('B');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, disabled, showAnswer, onSelect]);

  const renderCard = (opt: Choice2AfcOption) => {
    const isSelected = selectedChoice === opt.key;
    const isTarget = opt.isCorrect;
    const state = getChoiceCardState({ showAnswer, isTarget, isSelected });

    return (
      <ChoiceCard
        key={opt.key}
        state={state}
        size="lg"
        disabled={disabled || showAnswer}
        onClick={() => onSelect(opt.key)}
      >
        <div className="flex items-center justify-between w-full px-1">
          <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
            <span className="w-5 h-5 rounded-lg bg-muted text-foreground flex items-center justify-center font-mono text-[11px]">
              {opt.keyLabel || (opt.key === 'A' ? '1' : '2')}
            </span>
            {opt.title}
          </span>

          {showAnswer && isTarget && (
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {opt.badge || t('common.trueMatch')}
            </span>
          )}

          {showAnswer && !isTarget && opt.badge && (
            <span className="text-xs font-semibold text-muted-foreground">{opt.badge}</span>
          )}
        </div>

        {opt.content}
      </ChoiceCard>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
      {renderCard(optionA)}
      {renderCard(optionB)}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/common/ChoiceNafcContainer.tsx
~~~~~
~~~~~typescript
import { Check } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import { ChoiceCard, getChoiceCardState } from '../ui/choice-card';

export interface ChoiceNafcOption<T = unknown> {
  key?: string | number;
  keyLabel?: string;
  title?: string;
  value?: T;
  isCorrect: boolean;
  content: ComponentChildren;
}

interface ChoiceNafcContainerProps<T = unknown> {
  options: ChoiceNafcOption<T>[];
  selectedIndex: number | null;
  showAnswer: boolean;
  disabled?: boolean;
  columns?: 2 | 3 | 4;
  gridClassName?: string;
  enableKeyboardShortcuts?: boolean;
  onSelect: (index: number, option: ChoiceNafcOption<T>) => void;
}

export function ChoiceNafcContainer<T = unknown>({
  options,
  selectedIndex,
  showAnswer,
  disabled = false,
  columns = 4,
  gridClassName,
  enableKeyboardShortcuts = true,
  onSelect,
}: ChoiceNafcContainerProps<T>) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!enableKeyboardShortcuts || disabled || showAnswer) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const num = Number.parseInt(e.key, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= options.length) {
        e.preventDefault();
        const idx = num - 1;
        onSelect(idx, options[idx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, disabled, showAnswer, options, onSelect]);

  const defaultGrid =
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className={`grid ${gridClassName || defaultGrid} gap-3 w-full`}>
      {options.map((opt, idx) => {
        const isSelected = selectedIndex === idx;
        const isTarget = opt.isCorrect;
        const keyLabel = opt.keyLabel || (idx + 1).toString();
        const state = getChoiceCardState({ showAnswer, isTarget, isSelected });

        return (
          <ChoiceCard
            key={opt.key ?? `nafc-opt-${idx}`}
            state={state}
            size="sm"
            disabled={disabled || showAnswer}
            onClick={() => onSelect(idx, opt)}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-foreground">
                <span className="w-5 h-5 rounded-lg bg-muted text-foreground flex items-center justify-center font-mono text-[11px]">
                  {keyLabel}
                </span>
                {opt.title || t('common.optionN', { num: keyLabel })}
              </span>
              {showAnswer && isTarget && (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
              )}
            </div>

            {opt.content}
          </ChoiceCard>
        );
      })}
    </div>
  );
}
~~~~~

### 下一步建议
1. 观察执行后的报告，确认 `Ad-hoc Choice Card Styling` 与 `TagPill Manual Dict` 的待办项已全部清零。
2. 接下来创建 `Input`、`Select` 和 `Switch` 原语，收敛 `PlanEditorHeader`、`FilterEngine` 和 `SettingsModal` 中的表单控件。
