好的，这个改进非常合理。在显示答案反馈时，保留用户当前调制的颜色在上半部分、真理理想补偿色在下半部分呈现分半对比，能够让用户直观地看到自己的调制结果与理想真理色彩之间的微小偏差，而不会因为直接被替换而丢失对比基准。

我将生成一个针对 `RelativeColorCanvas.tsx` 的修改计划。

## [WIP] feat: 在相对色感诱导补偿模式揭晓答案时分半对比展示用户颜色与真理颜色

### 用户需求
在相对色感的诱导补偿模式（明度反差补偿、补色残像调和等）中，揭晓答案时右侧作答颜色节点不应直接被真理颜色完全取代，而是应在上半部分保留用户调制的颜色，在下半部分呈现理想真理颜色，保持直观的分半对比。

### 评论
这是一个重要的视觉反馈交互优化。之前在揭晓答案时直接将背景色替换为 `idealRightHex`，导致用户无法肉眼比对“自己刚刚调出的颜色”和“理论真理补偿色”之间的具体差距。改为分半（Split-view）对比后，与 `VECTOR_SHIFT` 模式的视觉反馈语言保持了高度统一，显著提升了训练诊断价值。

### 目标
1. 修改 `RelativeColorCanvas.tsx` 中阿尔伯斯诱导补偿视图（`LIGHTNESS_INDUCTION` 与 `HUE_INDUCTION`）的右侧中心色块容器。
2. 保持色块背景为 `userRightHex`，并添加 `relative overflow-hidden`。
3. 在 `showAnswer` 为 `true` 时，在节点下半部分渲染绝对定位的真理颜色层（`idealRightHex`）。

### 基本原理
在父级 `div` 保持背景色为 `userRightHex` 的基础上，当 `showAnswer` 触发时，插入一个 `absolute bottom-0 left-0 right-0 h-1/2` 的子 `div` 并填充 `idealRightHex`。结合父级 `overflow-hidden` 与 `rounded-xl`，即可实现平滑、精致且不失真的一半用户色、一半真理色的对比效果。

### 标签
#intent/build #flow/ready #priority/medium #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/relative-color-feedback #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 更新 RelativeColorCanvas 中的揭晓对比视图

我们将修改右侧作答色块节点，使其在答案揭晓时以分半视图同时呈现用户调制值与真理值。

~~~~~act
patch_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~tsx
          {/* 右侧作答与调制 */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              右侧作答 (调制以达成感知一致)
            </span>
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
              style={{ backgroundColor: bgRightHex }}
            >
              <div
                className="w-16 h-16 rounded-xl transition-all"
                style={{ backgroundColor: showAnswer ? idealRightHex : userRightHex }}
              />
            </div>
          </div>
~~~~~
~~~~~tsx
          {/* 右侧作答与调制 */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              右侧作答 (调制以达成感知一致)
            </span>
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
              style={{ backgroundColor: bgRightHex }}
            >
              <div
                className="w-16 h-16 rounded-xl transition-all relative overflow-hidden"
                style={{ backgroundColor: userRightHex }}
              >
                {showAnswer && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1/2"
                    style={{ backgroundColor: idealRightHex }}
                  />
                )}
              </div>
            </div>
          </div>
~~~~~

### 下一步建议
- 可以启动开发服务器验证 `明度反差补偿` 和 `补色残像调和` 模式下做答后的分半对比动画与渲染效果。
- 如确认无误，可继续进行全量测试或创建 Git 提交。
