我们将为**黑白素描骨架**（`TD_NOTAN_2AFC`）引入**宏观骨架场权重插值与相似度逼近模型**：随着难度等级提升，干扰素描选项的宏观大结构将自适应逼近真理骨架（从 Level 1 的大形迥异，平滑递进至 Level 35 约 68% 骨架拓扑重合度），使高阶训练达到“既有强微观光影噪波干扰，又需精准分辨细微骨架大形转折”的深度心流。

## [WIP] feat: 为黑白素描骨架引入宏观大场随 Level 自适应逼近算法

### 用户需求
升级「黑白素描骨架（`TD_NOTAN_2AFC`）」生成算法，使干扰项选项不仅在微观画风细节上同步，在**宏观大形状/骨架拓扑结构**上也随着 Level 提升逐渐逼近答案项，增强高等级下的辨识难度与挑战深度。

### 评论
通过在低频场（Macro Field）中引入参数化的骨架相似度混合因子 $\alpha(t)$，使得干扰项在低阶时形态各异（快速建立规则认知），在高阶时形成结构高度相似的精细对照项（逼近真实素描中抓准微妙转折与比例的核心能力），完美完成了难度梯度的闭环。

### 目标
1. 在 `src/utils/abstractionUtils.ts` 中改造 `TD_NOTAN_2AFC` 生成逻辑。
2. 引入随等级 $t = \frac{\text{Level} - 1}{34}$ 动态计算的 `macroSimilarityWeight`（$0 \to 0.68$）。
3. 干扰项宏观场由独立随机场与目标宏观场进行连续插值融合，实现宏观大结构随 Level 自适应收敛逼近。

### 基本原理
定义干扰宏观场方程：
$$\text{DistractorMacro}(x, y) = (1 - \alpha(t)) \cdot \text{IndependentMacro}(x, y) + \alpha(t) \cdot \text{TargetMacro}(x, y)$$
其中 $\alpha(t) = 0.68 \cdot t$。
- **Level 1 ($\alpha = 0$)**：干扰项宏观场 100% 独立，黑白大块面与朝向截然不同；
- **Level 35 ($\alpha = 0.68$)**：干扰项宏观场继承 68% 目标大势，整体明暗质心与大块面分布高度形似，仅在局部转折与局部块面比例产生微妙偏离，结合强微观噪波实现高阶硬核辨析。

### 标签
#intent/build #flow/ready #priority/high
#comp/runtime #concept/executor #scope/core
#ai/instruct
#task/domain/ui #task/object/td-notan-refinement #task/action/implementation #task/state/continue

---

### Script

#### Acts 1: 更新 TD_NOTAN_2AFC 宏观骨架相似度逼近算法

在 `src/utils/abstractionUtils.ts` 中更新 `TD_NOTAN_2AFC` 的宏观场生成与插值计算。

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript.old
    const macroScale = 0.012 + Math.random() * 0.008;
    const macroAmp = 42 + Math.random() * 10;
    const microScale = 0.08 + Math.random() * 0.04;
    const microAmp = 10 + t * 38; // 难度随 Level 递增微观干扰

    const targetMacroBuffer = new Uint8Array(totalPixels);
    const targetSceneBuffer = new Uint8Array(totalPixels);
    const distractorSceneBuffer = new Uint8Array(totalPixels);

    for (let y = 0; y < fieldDim; y++) {
      for (let x = 0; x < fieldDim; x++) {
        const idx = y * fieldDim + x;
        const targetMacroVal =
          (fbm2D(x * macroScale, y * macroScale, 2, targetMacroNoise) - 0.5) * 2 * macroAmp;
        const distractorMacroVal =
          (fbm2D(x * macroScale, y * macroScale, 2, distractorMacroNoise) - 0.5) * 2 * macroAmp;
        const microVal =
          (fbm2D(x * microScale, y * microScale, 3, microNoise) - 0.5) * 2 * microAmp;

        // 仅宏观骨架场（用于生成清晰二值 Notan 题干）
        const macroRaw = Math.max(0, Math.min(100, baseKey + targetMacroVal));
        targetMacroBuffer[idx] = Math.round((macroRaw / 100) * 255);

        // 真实素描选项（宏观骨架 + 微观噪波）
        const targetSceneRaw = Math.max(0, Math.min(100, baseKey + targetMacroVal + microVal));
        targetSceneBuffer[idx] = Math.round((targetSceneRaw / 100) * 255);

        // 干扰素描选项（不同宏观骨架 + 相同微观噪波肌理）
        const distractorSceneRaw = Math.max(
          0,
          Math.min(100, baseKey + distractorMacroVal + microVal),
        );
        distractorSceneBuffer[idx] = Math.round((distractorSceneRaw / 100) * 255);
      }
    }
~~~~~
~~~~~typescript.new
    const macroScale = 0.012 + Math.random() * 0.008;
    const macroAmp = 42 + Math.random() * 10;
    const microScale = 0.08 + Math.random() * 0.04;
    const microAmp = 10 + t * 38; // 难度随 Level 递增微观干扰

    // 宏观骨架相似度逼近因子：Level 1 为 0 (完全独立大形)，Level 35 为 0.68 (高相似度大骨架逼近)
    const macroSimilarityWeight = t * 0.68;

    const targetMacroBuffer = new Uint8Array(totalPixels);
    const targetSceneBuffer = new Uint8Array(totalPixels);
    const distractorSceneBuffer = new Uint8Array(totalPixels);

    for (let y = 0; y < fieldDim; y++) {
      for (let x = 0; x < fieldDim; x++) {
        const idx = y * fieldDim + x;
        const targetMacroVal =
          (fbm2D(x * macroScale, y * macroScale, 2, targetMacroNoise) - 0.5) * 2 * macroAmp;
        const rawIndependentDistractorVal =
          (fbm2D(x * macroScale, y * macroScale, 2, distractorMacroNoise) - 0.5) * 2 * macroAmp;

        // 干扰项宏观场：随着 Level 提升，与目标骨架大场线性插值逼近
        const distractorMacroVal =
          (1 - macroSimilarityWeight) * rawIndependentDistractorVal +
          macroSimilarityWeight * targetMacroVal;

        const microVal =
          (fbm2D(x * microScale, y * microScale, 3, microNoise) - 0.5) * 2 * microAmp;

        // 仅宏观骨架场（用于生成清晰二值 Notan 题干）
        const macroRaw = Math.max(0, Math.min(100, baseKey + targetMacroVal));
        targetMacroBuffer[idx] = Math.round((macroRaw / 100) * 255);

        // 真实素描选项（宏观骨架 + 微观噪波）
        const targetSceneRaw = Math.max(0, Math.min(100, baseKey + targetMacroVal + microVal));
        targetSceneBuffer[idx] = Math.round((targetSceneRaw / 100) * 255);

        // 干扰素描选项（逼近宏观骨架 + 相同微观噪波肌理）
        const distractorSceneRaw = Math.max(
          0,
          Math.min(100, baseKey + distractorMacroVal + microVal),
        );
        distractorSceneBuffer[idx] = Math.round((distractorSceneRaw / 100) * 255);
      }
    }
~~~~~

### 下一步建议
1. 在浏览器中打开「细化感知」->「黑白素描骨架」模式；
2. 分别在 Level 1、Level 15 与 Level 35 下进行做答体验，感受低阶时一眼判别与高阶时在大形极度相似下的精细透视挑战。
