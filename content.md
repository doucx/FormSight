## [WIP] fix(ui): 将实验性模块 TagPill 的主题色调整为琥珀黄

### 用户需求
在 FormSight 中，实验性模块（experimental）的标签当前使用的是蓝紫色 (`bg-purple-600`)，用户希望将其调整为琥珀黄。

### 评论
这是一个对系统视觉一致性的微调。实验性/警告类的标签在系统多处采用的是琥珀黄色（amber），将其统一可以避免视觉色调突兀。

### 目标
1. 检查 `TagPill.tsx` 中 `purple` 或相关状态的颜色映射。
2. 将对应的样式从 `purple` 调整为 `amber`（琥珀黄）。

### 基本原理
通过直接修改 `TagPill.tsx` 中的 Tailwind 类名映射，将原本的 `purple` 映射替换为 `amber`，或者针对实验性标签在 `AdvancedTagMatrix` 或其他地方使用的配置进行对齐。

### 标签
#intent/fix #flow/ready #priority/medium #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/tag-pill #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 修改 TagPill 组件的配色方案

~~~~~act
patch_file
src/components/common/TagPill.tsx
~~~~~
~~~~~typescript.old
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
        sm: 'px-2 py-0.5 text-xs',
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

export const tagPillBadgeVariants = cva('text-xs font-mono px-1 rounded', {
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
~~~~~
~~~~~typescript.new
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
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs',
      },
    },
    compoundVariants: [
      { themeColor: 'indigo', selected: true, className: 'bg-primary' },
      { themeColor: 'emerald', selected: true, className: 'bg-emerald-600' },
      { themeColor: 'rose', selected: true, className: 'bg-rose-600' },
      { themeColor: 'amber', selected: true, className: 'bg-amber-600' },
      { themeColor: 'purple', selected: true, className: 'bg-amber-600' },
    ],
    defaultVariants: {
      themeColor: 'indigo',
      selected: false,
      size: 'md',
    },
  },
);

export const tagPillBadgeVariants = cva('text-xs font-mono px-1 rounded', {
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
    { themeColor: 'purple', selected: true, className: 'bg-amber-700 text-amber-100' },
  ],
  defaultVariants: {
    themeColor: 'indigo',
    selected: false,
  },
});
~~~~~

#### Acts 2: 同时调整 AdvancedTagMatrix 中 experimental 状态的 themeColor

~~~~~act
patch_file
src/components/discovery/AdvancedTagMatrix.tsx
~~~~~
~~~~~typescript.old
      {/* 5. 特性与发布状态 */}
      <div className="space-y-1">
        <FilterSectionHeader
          icon={FlaskConical}
          title={t('home.statusSection')}
          iconColorClass="text-purple-500"
        />
        <div className="flex flex-wrap gap-1">
          {(['stable', 'experimental'] as CardStatusTag[]).map((st) => (
            <TagPill
              key={st}
              size={tagSize}
              label={t(STATUS_TAGS[st].i18nKey)}
              themeColor={STATUS_TAGS[st].themeColor || (st === 'stable' ? 'indigo' : 'purple')}
              selected={query.statuses?.includes(st) ?? false}
              onClick={() => onToggleStatus(st)}
            />
          ))}
        </div>
      </div>
~~~~~
~~~~~typescript.new
      {/* 5. 特性与发布状态 */}
      <div className="space-y-1">
        <FilterSectionHeader
          icon={FlaskConical}
          title={t('home.statusSection')}
          iconColorClass="text-amber-500"
        />
        <div className="flex flex-wrap gap-1">
          {(['stable', 'experimental'] as CardStatusTag[]).map((st) => (
            <TagPill
              key={st}
              size={tagSize}
              label={t(STATUS_TAGS[st].i18nKey)}
              themeColor={STATUS_TAGS[st].themeColor || (st === 'stable' ? 'indigo' : 'amber')}
              selected={query.statuses?.includes(st) ?? false}
              onClick={() => onToggleStatus(st)}
            />
          ))}
        </div>
      </div>
~~~~~

#### Acts 3: 调整 tags.ts 中 STATUS_TAGS 的主题色元数据

~~~~~act
patch_file
src/config/tags.ts
~~~~~
~~~~~typescript.old
export const STATUS_TAGS: Record<CardStatusTag, TagMeta<CardStatusTag>> = {
  stable: {
    id: 'stable',
    i18nKey: 'tags.statuses.stable',
    themeColor: 'indigo',
  },
  experimental: {
    id: 'experimental',
    i18nKey: 'tags.statuses.experimental',
    themeColor: 'purple',
  },
  deprecated: {
    id: 'deprecated',
    i18nKey: 'tags.statuses.deprecated',
    themeColor: 'rose',
  },
};
~~~~~
~~~~~typescript.new
export const STATUS_TAGS: Record<CardStatusTag, TagMeta<CardStatusTag>> = {
  stable: {
    id: 'stable',
    i18nKey: 'tags.statuses.stable',
    themeColor: 'indigo',
  },
  experimental: {
    id: 'experimental',
    i18nKey: 'tags.statuses.experimental',
    themeColor: 'amber',
  },
  deprecated: {
    id: 'deprecated',
    i18nKey: 'tags.statuses.deprecated',
    themeColor: 'rose',
  },
};
~~~~~

### 下一步建议
- 确认修改后，您可以运行本地预览或测试来验证实验性模块标签是否已正确呈现为琥珀黄色。
