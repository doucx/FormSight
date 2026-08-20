这是一个打字错误（Typo）导致的 Bug。在之前的更新中，生成微观噪波时，无意中将 y 轴的缩放比例从 `microScale` 写成了 `macroScale`，导致 x 轴频率高、y 轴频率低，从而在视觉上形成了垂直条带拉伸的现象。我将生成一个计划来修复这个 Typo。

## [WIP] fix: 修复 TD_NOTAN_2AFC 模式下噪波生成的垂直条带化问题

### 错误分析

在 `TD_NOTAN_2AFC` 的 `fbm2D` 调用中，`microVal` 的计算由于笔误，y 轴使用了 `macroScale` 而非 `microScale`。

```typescript
const microVal = (fbm2D(x * microScale, y * macroScale, 3, microNoise) - 0.5) * 2 * microAmp;
```

由于 `macroScale`（例如 0.015）远小于 `microScale`（例如 0.1），这导致噪波在 y 轴上的变化极慢，而在 x 轴上变化快，最终呈现出明显的竖向拉伸和条带化伪影。

### 用户需求
修复“黑白素描骨架”模式下的画面竖向拉伸和条带化问题，恢复正常的均匀散布噪波。

### 评论
只需修复这个 Typo 即可恢复各向同性（各方向频率一致）的微观肌理，完美还原该训练模式原本的视觉效果。

### 目标
修正 `src/utils/abstractionUtils.ts` 中的 `microVal` 计算逻辑，将 `y * macroScale` 改回 `y * microScale`。

### 基本原理
噪波函数的缩放因子需要保证各向同性，即 x 和 y 轴应当使用相同的频率缩放变量 `microScale`，以确保噪波表现出均匀的颗粒感。

### 标签
#intent/fix #flow/ready #priority/high #comp/engine #scope/core #ai/instruct #task/domain/abstraction #task/object/noise-generator #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 修正微观噪波生成的 y 轴缩放比例

我们将 `src/utils/abstractionUtils.ts` 文件中的 `y * macroScale` 修正为正确的 `y * microScale`。

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript.old
        // 干扰项宏观场：能量守恒归一化插值，对比度与真理项 100% 统计等价
        const distractorMacroVal =
          ((1 - macroSimilarityWeight) * rawIndependentDistractorVal +
            macroSimilarityWeight * targetMacroVal) /
          blendNorm;

        const microVal =
          (fbm2D(x * microScale, y * macroScale, 3, microNoise) - 0.5) * 2 * microAmp;

        // 仅宏观骨架场（用于生成清晰二值 Notan 题干）
~~~~~
~~~~~typescript.new
        // 干扰项宏观场：能量守恒归一化插值，对比度与真理项 100% 统计等价
        const distractorMacroVal =
          ((1 - macroSimilarityWeight) * rawIndependentDistractorVal +
            macroSimilarityWeight * targetMacroVal) /
          blendNorm;

        const microVal =
          (fbm2D(x * microScale, y * microScale, 3, microNoise) - 0.5) * 2 * microAmp;

        // 仅宏观骨架场（用于生成清晰二值 Notan 题干）
~~~~~

### 下一步建议
请在页面中测试“黑白素描骨架”题目，验证画面是否已恢复为正常的素描颗粒质感，并且没有垂直拉伸的现象。如果确认修复无误，我们可以生成一条 `[COMMIT]` 计划提交更改。
