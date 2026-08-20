好的，我将为你生成一个计划，修改计划库在切换计划时的交互逻辑，使抽屉面板在切换时保持展开，便于连续对比和挑选计划。

## [WIP] feat: 优化计划库切换交互，在挑选时保留列表以便连续对比

### 用户需求
在计划编排弹窗中，当用户在“计划库”抽屉中点击切换不同的训练计划时，保持计划库抽屉展开而不自动收起，方便用户连续点击查看下方阶段列表的即时变化，确认选定最适合的训练流。

### 评论
当前点击计划项后立即关闭抽屉打断了用户的“浏览与对比”心流。保持展开并配合已有激活高亮样式（蓝色边框与阴影），能够提供更加直观平滑的计划预览与挑选体验。

### 目标
1. 修改 `PlanEditorModal.tsx` 中的 `handleSelectPlanFromList` 函数，移除 `setShowPlanManager(false)` 调用。
2. 在计划库抽屉面板头部增加快捷“收起”操作入口，保留用户自主收起的便利性。

### 基本原理
当用户点击某项计划时，仅更新当前激活的 `currentPlan`、同步 `planNameInput` 并重置编辑状态，保持 `showPlanManager` 为 `true`。下方阶段列表和总题量/总耗时会即时联动更新，用户确认无误后再点击右上角“计划库”按钮或“收起”即可。

### 标签
#intent/tune #flow/ready #priority/medium #comp/ui #scope/ux #ai/instruct #task/domain/plan #task/object/plan-manager-drawer #task/action/tune #task/state/continue

---

### Script

#### Acts 1: 调整计划库切换逻辑并在抽屉头部增加收起按钮

修改 `src/components/plan/PlanEditorModal.tsx`。

~~~~~act
patch_file
src/components/plan/PlanEditorModal.tsx
~~~~~
~~~~~typescript.old
  const handleSelectPlanFromList = (p: TrainingPlan) => {
    setCurrentPlan({ ...p });
    setPlanNameInput(p.name);
    setIsEditingName(false);
    setShowPlanManager(false);
  };
~~~~~
~~~~~typescript.new
  const handleSelectPlanFromList = (p: TrainingPlan) => {
    setCurrentPlan({ ...p });
    setPlanNameInput(p.name);
    setIsEditingName(false);
  };
~~~~~
~~~~~act
patch_file
src/components/plan/PlanEditorModal.tsx
~~~~~
~~~~~typescript.old
        {/* 计划库抽屉管理 */}
        {showPlanManager && (
          <div className="p-3.5 bg-slate-100/80 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">切换正在编辑的训练计划：</span>
              <button
                type="button"
                onClick={handleCreateNewBlankPlan}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                新建空白计划
              </button>
            </div>
~~~~~
~~~~~typescript.new
        {/* 计划库抽屉管理 */}
        {showPlanManager && (
          <div className="p-3.5 bg-slate-100/80 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">切换正在编辑的训练计划：</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCreateNewBlankPlan}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新建空白计划
                </button>
                <button
                  type="button"
                  onClick={() => setShowPlanManager(false)}
                  className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                >
                  收起
                </button>
              </div>
            </div>
~~~~~

### 下一步建议
- **体验测试**：在计划编辑器中点击“计划库 (X)”，连续点击不同的计划卡片，确认抽屉保持展开且下方阶段序列与题量耗时能够实时联动更新。
