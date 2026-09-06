完全可以！将实验性模块的主图标（左上角图标）直接赋予琥珀色（黄色）主题，不仅能一眼识别，还能彻底释放右上角的空间，避免任何布局拥挤或纵向拉伸。

下面我将生成对应的修改计划：

## [WIP] refactor(ui): 将实验性卡片左上角主图标设为琥珀黄色主题，移除右上角徽章

### 用户需求
用户反馈即使将右上角的“实验性”徽章简化为纯图标，仍然可能导致卡片头部空间紧张或布局拉伸。希望直接将卡片自带的主图标颜色改为黄色来标识实验性状态，从而彻底省去右上角的附加徽章。

### 评论
这是一个更符合直觉且极致简洁的设计方案。通过为主图标赋予独特的琥珀色（Amber）主题，用户在浏览卡片大盘时能够瞬间识别实验性模块，同时保证了卡片头部结构的清爽和高度一致性。

### 目标
1. 移除 `ModeCard.tsx` 右上角的 `isExperimental` 渲染逻辑。
2. 为 `ModeCard` 左上角的主图标增加动态变体：当 `isExperimental` 为真时，图标容器呈现优雅的琥珀黄色调（`bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400`）。

### 基本原理
通过条件样式动态修改左上角图标的背景和文字颜色，使得实验性卡片在视觉上具备专属的警告/探索色，同时精简 DOM 结构，彻底解决空间拉伸问题。

### 标签
#intent/refine #flow/ready #priority/medium #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/mode-card #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 修改 ModeCard.tsx 将左上角图标改为琥珀黄色并移除右上角徽章

~~~~~act
patch_file
src/components/common/ModeCard.tsx
~~~~~
~~~~~typescript.old
        {/* 顶部标题、图标与右上角状态徽章 */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 rounded-2xl bg-accent text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105 transition-all shadow-xs flex-shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-foreground group-hover:text-primary transition-colors truncate">
                  {title}
                </h3>
                {isExperimental && (
                  <div
                    className="p-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 flex-shrink-0"
                    title={t('card.experimentalBadge')}
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground font-medium truncate mt-0.5">
~~~~~
~~~~~typescript.new
        {/* 顶部标题、图标与右上角状态徽章 */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-3 rounded-2xl transition-all shadow-xs flex-shrink-0 ${
                isExperimental
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white'
                  : 'bg-accent text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105'
              }`}
              title={isExperimental ? t('card.experimentalBadge') : undefined}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-foreground group-hover:text-primary transition-colors truncate">
                  {title}
                </h3>
              </div>
              <div className="text-xs text-muted-foreground font-medium truncate mt-0.5">
~~~~~

### 下一步建议
如果你对这个方案满意，请执行此修改。修改后，实验性卡片的左上角图标将自动渲染为带有 Tooltip 提示的琥珀黄色，而右上角的附加空间将被完全释放。
