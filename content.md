我已经定位到了导致 Biome linter 报错的原因：在 `src/components/AbstractionCanvas.tsx` 中渲染 `palettePatternOptions` 候选拼贴图案卡片时，`key` 属性直接引用了数组遍历索引 `idx`（`key={`td-pattern-card-${idx}`}`），违反了 Biome 的 `noArrayIndexKey` 规则。

以下是修复该问题的计划：

## [WIP] fix: 修复 AbstractionCanvas 中因数组索引作为 key 导致的 Biome linter 报错

### 错误分析

在运行 `npm run checkf` (Biome linter) 时触发了 `lint/suspicious/noArrayIndexKey` 错误：
1. **触发原因**：`AbstractionCanvas.tsx` 第 411 行在遍历 `question.palettePatternOptions` 生成拼贴图案候选项按钮时，将 `idx` 拼接进了 `key` 属性（`key={`td-pattern-card-${idx}`}`）。
2. **潜在风险**：在选项渲染与重新洗牌时，使用数组索引作为 `key` 会干扰虚拟 DOM Diffing 机制，可能引起卡片复用异常或组件状态残留。
3. **修复方案**：将 `key` 改为基于题目 ID 与图案色彩特征数据组合生成的唯一字符串，彻底解耦数组下标。

### 用户需求

消除 `npm run checkf` 时报告的 `lint/suspicious/noArrayIndexKey` 错误，确保代码符合规范并通过 Biome 检查。

### 评论

这是符合现代 React/Preact 最佳实践的代码质量修复，避免因索引作为 key 产生非预期的 DOM 复用副作用。

### 目标

1. 修改 `src/components/AbstractionCanvas.tsx` 中 `palettePatternOptions` 渲染的 `key`，使用图案内部特征数据生成唯一键。
2. 确保 Biome 检查能够顺利通过。

### 基本原理

通过结合 `question.id` 与各个色块 Tile 的坐标与 HSV 数据生成唯一特征标识 `patternKey`，完全避免在 `key` 中使用循环变量 `idx`。

### 标签

#intent/fix #flow/ready #priority/medium #comp/docs #comp/interfaces #concept/ui #scope/dx #ai/instruct #task/domain/ui #task/object/linter-keys #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `AbstractionCanvas.tsx` 中的 key 属性

我们将更新 `AbstractionCanvas.tsx` 中 `palettePatternOptions.map` 的 `key` 生成逻辑。

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript.old
        {/* 4 候选拼贴图案网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
          {question.palettePatternOptions?.map((_pat, idx) => {
            const isSelected = chosenIdx === idx;
            const isTarget = idx === targetIdx;
            const keyLabel = (idx + 1).toString();

            let border = 'border-slate-200/90 hover:border-indigo-300 hover:shadow-md bg-slate-50';
            if (showAnswer) {
              if (isTarget) {
                border = 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md';
              } else if (isSelected) {
                border = 'bg-rose-50/50 border-rose-400 shadow-sm';
              } else {
                border = 'bg-slate-50/60 border-slate-200 opacity-50';
              }
            } else if (isSelected) {
              border = 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md';
            }

            return (
              <button
                key={`td-pattern-card-${idx}`}
                type="button"
                disabled={disabled || showAnswer}
~~~~~
~~~~~typescript.new
        {/* 4 候选拼贴图案网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
          {question.palettePatternOptions?.map((pat, idx) => {
            const isSelected = chosenIdx === idx;
            const isTarget = idx === targetIdx;
            const keyLabel = (idx + 1).toString();
            const patternKey = `td-pattern-card-${question.id}-${pat.map((t) => `${t.x}_${t.y}_${t.hsv.join('_')}`).join('-')}`;

            let border = 'border-slate-200/90 hover:border-indigo-300 hover:shadow-md bg-slate-50';
            if (showAnswer) {
              if (isTarget) {
                border = 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md';
              } else if (isSelected) {
                border = 'bg-rose-50/50 border-rose-400 shadow-sm';
              } else {
                border = 'bg-slate-50/60 border-slate-200 opacity-50';
              }
            } else if (isSelected) {
              border = 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md';
            }

            return (
              <button
                key={patternKey}
                type="button"
                disabled={disabled || showAnswer}
~~~~~

### 下一步建议

- 执行变更后重新运行 `npm run checkf` 或 `npm run check` 验证代码规范检查是否完全通过。
- 运行 `npm run test` 确保所有测试用例正常通过。
