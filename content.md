好的！我明白了您的需求：在综合拾色（ALL）模式下，当鼠标在滑块上移动试探时，**当前已经设定的确定值位置**（即当前的 `userH` / `userS` / `userV`）需要保留一根黑色竖条标记，同时**鼠标当前悬停试探的位置**也显示一根黑色准心竖条，两者同时存在。

下面为您生成实施计划：

## [WIP] refactor(color): 在综合拾色模式下滑块试探时保留当前设定值标记与鼠标悬停准心共存

### 用户需求
在综合拾色（ALL）模式下滑块进行悬停试探时：
1. 原先已经确定的当前设定值位置（例如 `userH`）上保持一根黑色竖条标记。
2. 鼠标当前悬停试探的位置也显示一根黑色准心竖条。
3. 两者同时渲染，互不影响。

### 评论
这样用户在试探新色彩时，可以清晰对比“当前已选择的值”和“鼠标当前尝试的值”，极大增强了调色过程中的空间锚定感。

### 目标
1. 修改 `src/components/ColorCanvas.tsx` 中 ALL 模式的滑块渲染逻辑，使得“当前设定值标记”与“鼠标悬停准心”可以独立且同时显示。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color-recognition #task/object/dual-cursor-indicators #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 让 ColorCanvas 同时渲染当前设定值标记与悬停准心

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
            {/* ALL 模式下的当前滑块数值标记 (未悬停时显示当前设定值) */}
            {mode === 'ALL' && !showAnswer && allHoverVals[label] === null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm z-20"
                style={{ left: getPercent(val, max) }}
              />
            )}
~~~~~
~~~~~typescript.new
            {/* ALL 模式下的当前设定值标记 (无论是否悬停均始终显示) */}
            {mode === 'ALL' && !showAnswer && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm z-20"
                style={{ left: getPercent(val, max) }}
              />
            )}
~~~~~

### 下一步建议
- **执行构建与校验**: 运行 `npm run check` 及 `npm run build` 确保修改后编译打包顺利通过。
