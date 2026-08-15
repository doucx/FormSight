好的，我将把 `ColorCanvas.tsx` 中答题揭晓时显示的真理目标与用户选择标记，从原来的 10px 粗方块（`w-2.5`）替换为带白色边框的 4px 精细竖线（`w-1`），彻底避免遮挡滑块轨道与渐变颜色。

下面生成具体的实施计划。

## [WIP] style(color): 将答题揭晓的红绿标记方块调整为细竖线

### 用户需求
用户需要将答题后揭晓答案时显示的绿色（真理目标）与红色/绿色（用户选择）宽方块调整为细竖线，避免遮挡滑块轨道上的色彩渐变与距离关系。

### 评论
将揭晓标记收窄为精细的 `w-1`（4px）带白边竖线后，不仅能清晰标出像素级准确位置，还能让用户在答题揭晓后清楚对比“真理目标与用户点击位”之间所夹色彩的微妙渐变，大幅改善答题后的复盘体验。

### 目标
在 `src/components/ColorCanvas.tsx` 中：
1. 将真理目标的标记样式从 `w-2.5 h-8 bg-emerald-500 border-2 border-white rounded-sm shadow-md` 替换为 `w-1 h-8 bg-emerald-500 border-x border-white shadow-md`。
2. 将用户选择的标记样式从 `w-2.5 h-8 border-2 border-white ...` 替换为 `w-1 h-8 border-x border-white ...`。

### 基本原理
使用带有左右两侧白色边框（`border-x border-white`）的 4px 细竖线（`w-1`），不仅保证了标记在深色和浅色色彩背景上均具有极高的对比度与辨识度，同时将水平占位减少了 60%，彻底消除了遮挡问题。

### 标签
#intent/tune #flow/ready #priority/low #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color-recognition #task/object/answer-line-refinement #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 修改 `ColorCanvas.tsx` 答题揭晓标记样式

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
            {/* 待测维度答题揭晓：真理目标与用户选择 (竖条标记) */}
            {isTargetActiveMode && showAnswer && (
              <>
                {/* 真理目标位 (绿色竖条) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-8 bg-emerald-500 border-2 border-white rounded-sm shadow-md z-10"
                  style={{ left: getPercent(val, max) }}
                />

                {/* 用户点击位 (红色或绿色竖条) */}
                {userAnswer && (
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-8 border-2 border-white ${
                      userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                    } rounded-sm shadow-md z-20`}
                    style={{ left: getPercent(userAnswer.userValue, max) }}
                  />
                )}
              </>
            )}
~~~~~
~~~~~typescript.new
            {/* 待测维度答题揭晓：真理目标与用户选择 (细竖线标记) */}
            {isTargetActiveMode && showAnswer && (
              <>
                {/* 真理目标位 (绿色细竖线) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-8 bg-emerald-500 border-x border-white shadow-md z-10"
                  style={{ left: getPercent(val, max) }}
                />

                {/* 用户点击位 (红色或绿色细竖线) */}
                {userAnswer && (
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-8 border-x border-white ${
                      userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                    } shadow-md z-20`}
                    style={{ left: getPercent(userAnswer.userValue, max) }}
                  />
                )}
              </>
            )}
~~~~~

### 下一步建议
- **测试验证**: 运行 `npm run dev` 做几道色感练习题，观察点击后揭晓答案时的红绿精细竖线效果。
- **阶段提交**: 若无需更多界面微调，可以随时通知我发起 Git 提交计划（`[COMMIT]` 状态），将本阶段的视觉容错可视化及界面精细化成果提交至仓库。
