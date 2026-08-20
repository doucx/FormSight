我们已经定位并分析了 `biome check` 报告的两个代码质量与可访问性错误。

## [WIP] fix: 修复 Biome 检查中的 Hook 冗余依赖与非语义化按钮元素错误

### 错误分析

1. **`PlanTrainingView.tsx` 中 `useExhaustiveDependencies` 违规**:
   - `useEffect` 的依赖项列表传入了 `[currentCard, currentStepIndex, planSessionKey]`，但 effect 回调函数体内部仅直接使用了 `currentCard`，并未引用 `currentStepIndex` 和 `planSessionKey`。因此 Biome 标记这两个依赖项为冗余依赖。
   - 依赖项调整为 `[currentCard]` 即可保持精确的触发逻辑并消除 linter 告警。

2. **`PlanEditorModal.tsx` 中 `useSemanticElements` 违规**:
   - 计划列表项使用了 `<div role="button" tabIndex={0} onClick=...>` 来模拟按钮行为，触发了无障碍与语义化检查规则。
   - 此外，该容器内部还包含收藏和删除两个子 `<button>`。若直接将整个外层改为 `<button>` 会导致非法嵌套。
   - 正确的重构方式是将外层还原为普通的布局容器 `div`，将左侧点击切换计划的内容区域包装为语义化的 `<button type="button">`，使交互结构更加清晰且符合 a11y 规范。

### 用户需求

修复 `biome check --fix --unsafe .` 运行后报出的 2 个 linter 错误，使整个工程的代码质量检查完全通过（0 错误）。

### 评论

这是一项重要的代码健康度与可访问性修复。消除冗余 hook 依赖可以避免意外的重复执行，而采用标准语义化 `<button>` 元素提升了键盘导航友好性，并杜绝了非标准 DOM 嵌套问题。

### 目标

1. 在 `src/views/PlanTrainingView.tsx` 中将 `useEffect` 依赖项精简为 `[currentCard]`。
2. 在 `src/components/plan/PlanEditorModal.tsx` 中将列表项中的可点击区域重构为标准语义化 `<button>` 元素，移除外层容器上的 `role="button"` 与 `tabIndex`。

### 基本原理

1. 精确的 `useEffect` 依赖项声明可以确保 Hook 仅在真正关联的实体（当前训练卡片定义）变化时触发数据拉取，提升组件执行效率。
2. 分离列表项容器与内部动作按钮，使用原生 `<button>` 处理选择计划操作，不仅满足 WAI-ARIA 与 Biome 规则，还天生支持键盘回车/空格触发，无需额外的键盘事件处理逻辑。

### 标签
#intent/fix #flow/ready #priority/medium #comp/ui #concept/ui #scope/dx #ai/instruct #task/domain/lint #task/object/biome-checks #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 精简 `PlanTrainingView.tsx` 中的 Hook 依赖项

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    let isMounted = true;
    if (currentCard) {
      setIsLevelLoaded(false);
      getProfile(currentCard.id).then((p) => {
        if (!isMounted) return;
        setStageInitialLevel(p?.currentLevel || 5);
        setIsLevelLoaded(true);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [currentCard, currentStepIndex, planSessionKey]);
~~~~~
~~~~~typescript
  useEffect(() => {
    let isMounted = true;
    if (currentCard) {
      setIsLevelLoaded(false);
      getProfile(currentCard.id).then((p) => {
        if (!isMounted) return;
        setStageInitialLevel(p?.currentLevel || 5);
        setIsLevelLoaded(true);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [currentCard]);
~~~~~

#### Acts 2: 将 `PlanEditorModal.tsx` 中的计划条目重构为语义化元素

~~~~~act
patch_file
src/components/plan/PlanEditorModal.tsx
~~~~~
~~~~~tsx
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPlanFromList(p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSelectPlanFromList(p);
                    }}
                    role="button"
                    tabIndex={0}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500/20'
                        : 'bg-white/70 border-slate-200 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 truncate">{p.name}</span>
                        {p.isBuiltin && (
                          <span className="text-[9px] px-1 bg-slate-100 text-slate-500 rounded">
                            官方
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {stageCount} 个阶段 •{' '}
                        {(p.items || []).reduce((acc, c) => acc + c.targetTrials, 0)} 题
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavoriteItem(p.id, e)}
                        className={`p-1 rounded-lg transition-colors ${
                          isFav
                            ? 'text-amber-500 hover:bg-amber-50'
                            : 'text-slate-300 hover:text-slate-500'
                        }`}
                        title={isFav ? '已收藏 (显示在主页快速切换)' : '未收藏'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-500' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeletePlanItem(p.id, e)}
                        className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="删除计划"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
~~~~~
~~~~~tsx
                return (
                  <div
                    key={p.id}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                      isActive
                        ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500/20'
                        : 'bg-white/70 border-slate-200 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectPlanFromList(p)}
                      className="min-w-0 flex-1 text-left cursor-pointer focus:outline-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 truncate">{p.name}</span>
                        {p.isBuiltin && (
                          <span className="text-[9px] px-1 bg-slate-100 text-slate-500 rounded">
                            官方
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {stageCount} 个阶段 •{' '}
                        {(p.items || []).reduce((acc, c) => acc + c.targetTrials, 0)} 题
                      </div>
                    </button>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavoriteItem(p.id, e)}
                        className={`p-1 rounded-lg transition-colors ${
                          isFav
                            ? 'text-amber-500 hover:bg-amber-50'
                            : 'text-slate-300 hover:text-slate-500'
                        }`}
                        title={isFav ? '已收藏 (显示在主页快速切换)' : '未收藏'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-500' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeletePlanItem(p.id, e)}
                        className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="删除计划"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
~~~~~

### 下一步建议

1. 执行修改后，在终端再次运行 `npm run check` 或 `npm run checkf`，确认所有文件均 100% 通过 Biome linter 与格式检查。
2. 运行 `npm run test` 确保无测试回归，验证完毕后即可执行 Git 提交。
