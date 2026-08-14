好的，我将修改刷题界面的顶栏监控指标，移除“总正确率”的显示，仅保留“已练题数”与“当前难度”。

## [WIP] refactor: 移除刷题界面顶栏的总正确率显示

### 用户需求
在寻星练习与色感训练的刷题界面（`TrainingView` 和 `ColorTrainingView`）顶栏监控指标区域中，移除“总正确率”的展示，保留“已练题数”和“当前难度”。

### 评论
在练习过程中，实时总正确率的跳动可能会给练习者造成不必要的心理负担。隐藏该指标能让用户更加专注于当前的题目，提升沉浸式训练效果。

### 目标
1. 从 `src/views/TrainingView.tsx` 的 Header 区域移除总正确率 DOM 结构。
2. 从 `src/views/ColorTrainingView.tsx` 的 Header 区域移除总正确率 DOM 结构。

### 基本原理
通过对 `TrainingView.tsx` 和 `ColorTrainingView.tsx` 两个组件的顶栏结构进行精确补丁修改，删除渲染“总正确率”及其对应数值的 `div` 节点。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/training-header #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 移除 `TrainingView.tsx` 和 `ColorTrainingView.tsx` 中的总正确率显示

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~tsx.old
        {/* 核心监控指标 */}
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              已练题数
            </span>
            <span className="font-black text-gray-800">
              {totalTrials} {sessionType === 'benchmark' ? '/ 20' : ''}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              总正确率
            </span>
            <span className="font-black text-gray-800">{currentAccuracy}%</span>
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              当前难度
            </span>
            <span className="font-black text-indigo-600">Level {question.difficultyLevel}</span>
          </div>
~~~~~
~~~~~tsx.new
        {/* 核心监控指标 */}
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              已练题数
            </span>
            <span className="font-black text-gray-800">
              {totalTrials} {sessionType === 'benchmark' ? '/ 20' : ''}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              当前难度
            </span>
            <span className="font-black text-indigo-600">Level {question.difficultyLevel}</span>
          </div>
~~~~~

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~tsx.old
        {/* 监控指标 */}
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              已练题数
            </span>
            <span className="font-black text-gray-800">
              {totalTrials} {sessionType === 'benchmark' ? '/ 20' : ''}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              总正确率
            </span>
            <span className="font-black text-gray-800">{currentAccuracy}%</span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              当前难度
            </span>
            <span className="font-black text-indigo-600">Level {question.difficultyLevel}</span>
          </div>
~~~~~
~~~~~tsx.new
        {/* 监控指标 */}
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              已练题数
            </span>
            <span className="font-black text-gray-800">
              {totalTrials} {sessionType === 'benchmark' ? '/ 20' : ''}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              当前难度
            </span>
            <span className="font-black text-indigo-600">Level {question.difficultyLevel}</span>
          </div>
~~~~~

### 下一步建议

你可以启动前端应用并进入刷题界面（寻星练习及色感训练），验证顶栏界面效果是否符合预期的简洁度。
