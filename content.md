## [WIP] fix: 修复 Pack 标签挤压竖排文字并强化 TagPill 防御样式

### 错误分析
在 `FilterEngine.tsx` 的 `compact` 紧凑模式中，为了实现单行水平横滑，给 Pack 容器添加了 `flex-nowrap`。由于基础组件 `TagPill` 内部缺少 `whitespace-nowrap` 和 `flex-shrink-0` 的保护，导致 Flex 布局在宽度受限时强行将胶囊宽度压缩至汉字字宽极限，形成了文字竖直单字折行的视觉 Bug。

### 用户需求
1. 修复“全部 Packs”中的胶囊文字竖排问题，使其恢复为与其他 Tag 一致的正常水平横向排版。
2. 分析并彻底消除潜在的样式脆弱性与 DRY 问题。

### 评论
这是一个典型的由于基础组件防御性不足引发的跨场景布局破损。通过在 `TagPill` 底层注入不可折行与抗挤压属性，不仅能立刻根治 Pack 横滑栏问题，还能保证后续任何组件（如历史记录、筛选器、编辑器）在横滑或紧凑容器中复用 `TagPill` 时的稳健性。

### 目标
1. 在 `TagPill.tsx` 中为根按钮补充 `whitespace-nowrap flex-shrink-0` 核心样式。
2. 规范 `FilterEngine.tsx` 中各维度标签容器的类名约束，确保水平横滑顺畅且排版整齐。

### 基本原理
CSS Flexbox 规范中，内联文本项在未指定 `white-space: nowrap` 且容器 `flex-shrink > 0` 时，会以单词/字符边界作为最小宽度进行收缩。通过给 `TagPill` 增加 `whitespace-nowrap flex-shrink-0`，锁死胶囊的最小宽度为内容真实宽度，确保其在 `overflow-x-auto` 容器中正常触发横向滚动条，而非自我形变。

### 标签
#intent/fix #flow/ready #priority/high #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/tag-pill #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 强化 `TagPill.tsx` 的防御性布局属性

在 `TagPill.tsx` 的根按钮中加入 `whitespace-nowrap flex-shrink-0`，确保胶囊文字绝不垂直折行。

~~~~~act
patch_file
src/components/common/TagPill.tsx
~~~~~
~~~~~typescript.old
  return (
    <button
      type="button"
      onPointerDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex items-center gap-1 font-bold rounded-xl transition-all cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${sizeClass} ${
        selected
          ? activeClass
          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
      } ${className}`}
    >
~~~~~
~~~~~typescript.new
  return (
    <button
      type="button"
      onPointerDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex items-center gap-1 font-bold rounded-xl transition-all cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] whitespace-nowrap flex-shrink-0 ${sizeClass} ${
        selected
          ? activeClass
          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
      } ${className}`}
    >
~~~~~

#### Acts 2: 规范 `FilterEngine.tsx` 中 Pack 横滑栏排版

确保 Pack 标签横滑栏具备良好的内边距与子项对齐。

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~typescript.old
      {/* 扩展包 (Pack) 快速筛选标签 */}
      {packs.length > 0 && (
        <div className={`space-y-1 border-t border-slate-200/60 ${isCompact ? 'pt-1.5' : 'pt-3'}`}>
          <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Boxes className="w-3 h-3 text-indigo-500" />
            {t('home.allPacks')}
          </div>
          <div
            className={`flex gap-1 ${
              isCompact
                ? 'flex-nowrap overflow-x-auto pb-1 scrollbar-none items-center'
                : 'flex-wrap'
            }`}
          >
            <TagPill
              size={tagSize}
              label={t('home.allPacks')}
              selected={!query.packId}
              onClick={() => handleSelectPack(undefined)}
            />
            {packs.map((p) => (
              <TagPill
                key={p.packId}
                size={tagSize}
                label={getPackTitle(p, t)}
                count={p.cards.length}
                selected={query.packId === p.packId}
                onClick={() => handleSelectPack(query.packId === p.packId ? undefined : p.packId)}
              />
            ))}
          </div>
        </div>
      )}
~~~~~
~~~~~typescript.new
      {/* 扩展包 (Pack) 快速筛选标签 */}
      {packs.length > 0 && (
        <div className={`space-y-1 border-t border-slate-200/60 ${isCompact ? 'pt-1.5' : 'pt-3'}`}>
          <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Boxes className="w-3 h-3 text-indigo-500" />
            {t('home.allPacks')}
          </div>
          <div
            className={`flex gap-1 items-center ${
              isCompact
                ? 'flex-nowrap overflow-x-auto pb-1.5 scrollbar-none'
                : 'flex-wrap'
            }`}
          >
            <TagPill
              size={tagSize}
              label={t('home.allPacks')}
              selected={!query.packId}
              onClick={() => handleSelectPack(undefined)}
            />
            {packs.map((p) => (
              <TagPill
                key={p.packId}
                size={tagSize}
                label={getPackTitle(p, t)}
                count={p.cards.length}
                selected={query.packId === p.packId}
                onClick={() => handleSelectPack(query.packId === p.packId ? undefined : p.packId)}
              />
            ))}
          </div>
        </div>
      )}
~~~~~

### 下一步建议
1. **横向滑动体验测试**：在手机视口下测试 Pack 列表左右拖拽/滑动是否顺畅，确认所有标签均水平单行展现且完整保留外边框与间距。
2. **提交封装**：确认无其他异常后，可以发起 `[COMMIT]` 流程进行 Git 提交。
