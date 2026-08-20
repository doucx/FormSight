基于需求，我们将**黑白素描骨架**（`TD_NOTAN_2AFC`）重构为与“黑白素描归组”完全一致的**多尺度 FBM 连续灰阶场算法**：题干展示低频宏观大势二值化剪影，双选项展示叠加了微观高频噪波的连续灰阶素描画面，训练者从中逆向透视二值大结构归属。

## [WIP] feat: 重构黑白素描骨架 (TD_NOTAN_2AFC) 为连续灰阶噪声场与二值骨架逆向透视

### 用户需求
将「黑白素描骨架（`TD_NOTAN_2AFC`）」重构为使用类似「黑白素描归组（`NOTAN_THRESHOLD`）」的生成算法与渲染视口：
1. **题干基准（Prompt）**：生成由低频宏观大势场经 Otsu 二值截断决定的清晰黑白 Notan 剪影（无高频噪波）。
2. **选项候选（Option A & B）**：生成两幅富有丰富连续灰阶与微观噪波细节的复杂素描画面（一幅由该 Notan 宏观大场演化，另一幅由不同宏观大场演化）。
3. **训练目的**：训练者在两幅具有丰富光影细节的灰阶素描中逆向透视出匹配题干黑白大结构的画面。

### 评论
将早期简化的矢量图元替换为与 `NOTAN_THRESHOLD` 一致的真实感连续灰阶场，使得视知觉概括（Bottom-Up）与细化寻源（Top-Down）形成了严格对称且高度一致的视觉表征体系，大幅提升了对真实素描大关系与黑白透视的训练效果。

### 目标
1. 在 `src/utils/abstractionUtils.ts` 的 `AbstractionQuestionData` 中扩充 `promptNotanBuffer`, `notanSceneBufferA`, `notanSceneBufferB` 等灰度场字段。
2. 重构 `generateAbstractionQuestion` 中 `TD_NOTAN_2AFC` 的生成逻辑，采用宏观场 Otsu 二值化生成基准 Prompt，并与微观噪波叠加生成两幅连续灰阶素描 Option A/B。
3. 在 `src/components/AbstractionCanvas.tsx` 中使用 `drawRawGrayscaleNoiseField` 渲染题干 Prompt 与 Option A/B 候选画布。

### 基本原理
利用 2D 梯度噪声与 FBM（分形布朗运动）将视觉信息分频为「宏观大势场（低频）」与「微观肌理噪波（高频）」。题干提取真理项宏观场的 Otsu 最佳类间方差分割作为二值剪影，候选区则将宏观场与随等级递增的高频微观噪波叠加渲染为连续灰阶画面，形成严格的逆向认知匹配。

### 标签
#intent/build #flow/ready #priority/high
#comp/runtime #concept/executor #scope/core #scope/ux
#ai/instruct
#task/domain/ui #task/object/td-notan-refinement #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 更新 Abstraction 数据结构与生成算法

在 `src/utils/abstractionUtils.ts` 中扩充字段并重构 `TD_NOTAN_2AFC` 生成逻辑。

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript.old
  promptNotanMask?: NotanShape[]; // 题干 Notan
  notanSceneA?: NotanShape[];
  notanSceneB?: NotanShape[];
  correctNotanChoice?: 'A' | 'B';

  promptPaletteBand?: [number, number, number][]; // 兼容
~~~~~
~~~~~typescript.new
  promptNotanMask?: NotanShape[]; // 题干 Notan (兼容旧版)
  promptNotanBuffer?: number[]; // 题干二值 Notan 剪影场
  notanSceneBufferA?: number[]; // 选项 A 连续灰阶素描场
  notanSceneBufferB?: number[]; // 选项 B 连续灰阶素描场
  notanSceneA?: NotanShape[];
  notanSceneB?: NotanShape[];
  correctNotanChoice?: 'A' | 'B';

  promptPaletteBand?: [number, number, number][]; // 兼容
~~~~~

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript.old
  // 7. TD_NOTAN_2AFC 自顶向下素描骨架匹配 (2AFC)
  if (mode === 'TD_NOTAN_2AFC') {
    const promptNotanMask: NotanShape[] = [
      { type: 'rect', cx: 80, cy: 80, w: 140, h: 140, baseVal: 85 },
      { type: 'circle', cx: 70, cy: 70, r: 35, baseVal: 20 },
      { type: 'rect', cx: 100, cy: 100, w: 50, h: 40, baseVal: 30 },
    ];

    const notanSceneA: NotanShape[] = [
      { type: 'rect', cx: 130, cy: 130, w: 230, h: 230, baseVal: 85 },
      { type: 'circle', cx: 110, cy: 110, r: 55, baseVal: 20 },
      { type: 'rect', cx: 160, cy: 160, w: 80, h: 65, baseVal: 30 },
    ];

    // 干扰项颠倒阴影
    const notanSceneB: NotanShape[] = [
      { type: 'rect', cx: 130, cy: 130, w: 230, h: 230, baseVal: 20 },
      { type: 'circle', cx: 110, cy: 110, r: 55, baseVal: 85 },
      { type: 'rect', cx: 160, cy: 160, w: 80, h: 65, baseVal: 70 },
    ];

    const isA = Math.random() < 0.5;
    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      promptNotanMask,
      notanSceneA: isA ? notanSceneA : notanSceneB,
      notanSceneB: isA ? notanSceneB : notanSceneA,
      correctNotanChoice: isA ? 'A' : 'B',
      tolerance: 0,
    };
  }
~~~~~
~~~~~typescript.new
  // 7. TD_NOTAN_2AFC 自顶向下素描骨架匹配 (2AFC 多尺度连续灰阶场与二值逆向透视)
  if (mode === 'TD_NOTAN_2AFC') {
    const fieldDim = 120;
    const totalPixels = fieldDim * fieldDim;

    const targetMacroNoise = createNoise2D(Math.random());
    const distractorMacroNoise = createNoise2D(Math.random() + 100);
    const microNoise = createNoise2D(Math.random() + 200);

    // 随机画面基准调性
    const keyType = Math.random();
    const baseKey =
      keyType < 0.35
        ? 24 + Math.random() * 12
        : keyType < 0.7
          ? 64 + Math.random() * 12
          : 45 + Math.random() * 10;

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

    // 计算 targetMacroBuffer 的 Otsu 最佳二值截断分割，生成清晰二值 Notan 剪影 Prompt
    const otsuByte = calculateOtsuThreshold(targetMacroBuffer);
    const promptBuffer = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      promptBuffer[i] = targetMacroBuffer[i] <= otsuByte ? 15 : 248; // #0F172A (暗) vs #F8FAFC (亮)
    }

    const isA = Math.random() < 0.5;
    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      promptNotanBuffer: Array.from(promptBuffer),
      notanSceneBufferA: isA
        ? Array.from(targetSceneBuffer)
        : Array.from(distractorSceneBuffer),
      notanSceneBufferB: isA
        ? Array.from(distractorSceneBuffer)
        : Array.from(targetSceneBuffer),
      notanFieldDim: fieldDim,
      correctNotanChoice: isA ? 'A' : 'B',
      tolerance: 0,
    };
  }
~~~~~

#### Acts 2: 更新 AbstractionCanvas 渲染逻辑

在 `src/components/AbstractionCanvas.tsx` 中更新 `TD_NOTAN_2AFC` 的 Canvas 渲染。

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript.old
    } else if (mode === 'TD_NOTAN_2AFC') {
      drawNotanScene(canvasThumbRef.current, question.promptNotanMask, 50, ABSTRACTION_THUMB_SIZE);
      drawNotanScene(canvasRefA.current, question.notanSceneA, 50, ABSTRACTION_2AFC_SIZE);
      drawNotanScene(canvasRefB.current, question.notanSceneB, 50, ABSTRACTION_2AFC_SIZE);
    } else if (mode === 'TD_PALETTE_2AFC' && question.palettePatternOptions) {
~~~~~
~~~~~typescript.new
    } else if (mode === 'TD_NOTAN_2AFC') {
      if (question.promptNotanBuffer && question.notanSceneBufferA && question.notanSceneBufferB) {
        drawRawGrayscaleNoiseField(
          canvasThumbRef.current,
          question.promptNotanBuffer,
          question.notanFieldDim ?? 120,
          ABSTRACTION_THUMB_SIZE,
        );
        drawRawGrayscaleNoiseField(
          canvasRefA.current,
          question.notanSceneBufferA,
          question.notanFieldDim ?? 120,
          ABSTRACTION_2AFC_SIZE,
        );
        drawRawGrayscaleNoiseField(
          canvasRefB.current,
          question.notanSceneBufferB,
          question.notanFieldDim ?? 120,
          ABSTRACTION_2AFC_SIZE,
        );
      } else {
        drawNotanScene(
          canvasThumbRef.current,
          question.promptNotanMask,
          50,
          ABSTRACTION_THUMB_SIZE,
        );
        drawNotanScene(canvasRefA.current, question.notanSceneA, 50, ABSTRACTION_2AFC_SIZE);
        drawNotanScene(canvasRefB.current, question.notanSceneB, 50, ABSTRACTION_2AFC_SIZE);
      }
    } else if (mode === 'TD_PALETTE_2AFC' && question.palettePatternOptions) {
~~~~~

### 下一步建议
1. 运行测试套件验证题型生成与判定的一致性；
2. 进入训练界面实测「黑白素描骨架」卡片，体验在连续灰阶素描中逆向透视黑白 Notan 大关系的做答体验与手感。
