我们将主页中 `FilterEngine` 的扩展包筛选栏由原先的单行横向滚动容器重构为与其他多维 Tag 统一的自动折行（`flex-wrap`）流式网格样式。这样在小屏手机或窄窗口环境下，所有扩展包标签都能自动换行完整展示，无需横向拖拽滚动条。

## [WIP] refactor(discovery): 将主页扩展包筛选栏调整为折行 Tag 样式

### 用户需求

将主页发现页筛选引擎中的“扩展包”列表样式改造为与多维筛选 Tag 一致的流式折行（Wrap）样式，避免在窗口尺寸变小或移动端视口下需要横向滑动查找扩展包的问题。

### 评论

原有的单行横向滚动模式在扩展包数量增加或视口宽度缩小到手机尺寸时，破坏了视觉概览的一致性并增加了操作步骤。将其改造为 `flex-wrap` 流式 Tag 布局，不仅与下方的目标、技能、状态等维度风格统一，还能确保在任何屏幕宽度下全量标签一览无遗。

### 目标

1. 改造 `src/components/discovery/FilterEngine.tsx` 中的扩展包区块，移除 `overflow-x-auto`，采用 `flex flex-wrap gap-1.5` 自动折行容器。
2. 统一扩展包按钮的尺寸、内边距、悬停状态与选中 Check 图标，与其它 Tag 保持一致。

### 基本原理

通过采用统一的语义化分组标题与 `flex flex-wrap gap-1.5` 布局，使扩展包标签既保留快速直观的筛选能力与模块数量计数徽标，又具备在窄屏环境下的天然响应式折行能力。

### 标签

#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/refine #task/domain/ui #task/object/filter-engine #task/action/tag-style-refactor #task/state/continue

---

### Script

#### Acts 1: 重构 `FilterEngine.tsx` 扩展包栏为流式 Tag 样式

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~typescript
      {/* 扩展包 (Pack) 快速切换横向标签 */}
      {packs.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 pt-3">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1 flex-shrink-0">
            <Boxes className="w-3 h-3 text-indigo-500" />
            扩展包:
          </span>
          <button
            type="button"
            onClick={() => handleSelectPack(undefined)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex-shrink-0 flex items-center gap-1 ${
              !query.packId
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            全部 Packs
          </button>
          {packs.map((p) => {
            const isSelected = query.packId === p.packId;
            return (
              <button
                type="button"
                key={p.packId}
                onClick={() => handleSelectPack(isSelected ? undefined : p.packId)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex-shrink-0 flex items-center gap-1 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                <span>{p.meta.title}</span>
                <span
                  className={`text-[10px] font-mono px-1 rounded ${
                    isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {p.cards.length}
                </span>
              </button>
            );
          })}
        </div>
      )}
~~~~~
~~~~~typescript
      {/* 扩展包 (Pack) 快速筛选标签 */}
      {packs.length > 0 && (
        <div className="space-y-1.5 border-t border-slate-100 pt-3">
          <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Boxes className="w-3 h-3 text-indigo-500" />
            扩展包 (Packs)
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectPack(undefined)}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                !query.packId
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-600 border border-slate-200/80 hover:border-indigo-300'
              }`}
            >
              {!query.packId && <Check className="w-3 h-3" />}
              <span>全部 Packs</span>
            </button>
            {packs.map((p) => {
              const isSelected = query.packId === p.packId;
              return (
                <button
                  type="button"
                  key={p.packId}
                  onClick={() => handleSelectPack(isSelected ? undefined : p.packId)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-600 border border-slate-200/80 hover:border-indigo-300'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  <span>{p.meta.title}</span>
                  <span
                    className={`text-[10px] font-mono px-1 rounded ${
                      isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {p.cards.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
~~~~~

### 下一步建议

1. **多尺寸窗口测试**: 缩放浏览器窗口至各种宽度，确认扩展包标签在 1 列、2 列或多列折行排布时均平整对齐，点击切换顺畅。
2. **计划编排面板审查**: 检查 `PlanHeroCard` 或 `CardPickerPanel` 等辅助面板中是否有需要同样升级为折行流式样式的标签栏。
