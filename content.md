我现在将为「几何大模寻形 (`TD_HULL_2AFC`)」实施算法重构，引入基于真理大模的对抗性变异干扰与动态顶点复杂度机制。

## [WIP] refactor(abstraction): 增强几何大模寻形的对抗性干扰与几何复杂度

### 用户需求
「几何大模寻形 (`TD_HULL_2AFC` / `abs_td_hull_2afc`)」在高难度下因干扰项多边形全随机生成而缺乏辨识难度，需要重构其多边形生成机制与对抗变异算法。

### 评论
该模块是视知觉自顶向下逆向透视的关键训练项。当干扰项与真理项拥有高度相似的全局包络、仅在关键体块转折与比例上存在微小欺骗时，才能真正促使学习者在脑中进行结构网格对齐，达到高阶造型眼力训练的目的。

### 目标
1. **动态顶点数扩展**：将题干大模顶点数随 Level 由 4~5 个阶梯递增至 6~9 个。
2. **对抗性干扰生成**：干扰项不再全随机生成，而是使用 `generateAdversarialDistractorHull` 基于真理大模进行局部转折位移与体块微调。
3. **分形细节自适应**：高等级下增加分形噪声强度，制造更具欺骗性的边缘高频噪波。

### 基本原理
通过继承并扰动真理项的几何拓扑，消除初级视觉系统（低空间频率通道）依靠整体长宽比或质心直接秒杀的可能，强制大脑调动高空间频率注意力逐点检验几何特征的一致性。

### 标签
#intent/refine #flow/ready #priority/high
#comp/runtime #concept/state #scope/core
#ai/instruct
#task/domain/abstraction
#task/object/perceptual-difficulty-algorithms
#task/action/refactor
#task/state/continue

---

### Script

#### Acts 1: 重构 `src/utils/abstractionUtils.ts` 中的 `TD_HULL_2AFC` 生成逻辑

我们将修改 `generateAbstractionQuestion` 中 `TD_HULL_2AFC` 的生成逻辑，采用阶梯顶点数和对抗性干扰派生。

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript.old
  // 6. TD_HULL_2AFC 自顶向下大模寻形 (2AFC)
  if (mode === 'TD_HULL_2AFC') {
    const promptHull = generateDetailedPolygon(
      Math.floor(Math.random() * 2) + 4,
      ABSTRACTION_THUMB_SIZE,
    );
    const scale = ABSTRACTION_2AFC_SIZE / ABSTRACTION_THUMB_SIZE;

    const targetBase = promptHull.map((p) => ({
      x: p.x * scale,
      y: p.y * scale,
    }));

    const distractorBase = generateDetailedPolygon(
      Math.floor(Math.random() * 2) + 4,
      ABSTRACTION_2AFC_SIZE,
    );

    const noiseFactor = 0.5 + t * 0.8;
    const targetDetailed = fractalizePolygon(targetBase, 2, noiseFactor);
    const distractorDetailed = fractalizePolygon(distractorBase, 2, noiseFactor);

    const isA = Math.random() < 0.5;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      promptHull,
      hullDetailedA: isA ? targetDetailed : distractorDetailed,
      hullDetailedB: isA ? distractorDetailed : targetDetailed,
      correctHullChoice: isA ? 'A' : 'B',
      tolerance: 0,
    };
  }
~~~~~
~~~~~typescript.new
  // 6. TD_HULL_2AFC 自顶向下大模寻形 (2AFC)
  if (mode === 'TD_HULL_2AFC') {
    // 1. 随 Level 递增顶点数：Level 1 为 4~5 点，Level 35 为 6~9 点
    const minVerts = 4 + Math.floor(t * 2);
    const maxVerts = 5 + Math.floor(t * 4);
    const vertCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

    const promptHull = generateDetailedPolygon(vertCount, ABSTRACTION_THUMB_SIZE);
    const scale = ABSTRACTION_2AFC_SIZE / ABSTRACTION_THUMB_SIZE;

    const targetBase = promptHull.map((p) => ({
      x: Math.round(p.x * scale),
      y: Math.round(p.y * scale),
    }));

    // 2. 基于 targetBase 生成高度对抗性干扰项 (大轮廓 85%+ 相似，仅关键转角或局部比例失真)
    const distractorBase = generateAdversarialDistractorHull(
      targetBase,
      clampedLevel,
      ABSTRACTION_2AFC_SIZE,
    );

    // 3. 多尺度分形细化：难度越高，边缘高频噪波与破碎度越强
    const noiseFactor = 0.45 + t * 0.85;
    const targetDetailed = fractalizePolygon(targetBase, 2, noiseFactor);
    const distractorDetailed = fractalizePolygon(distractorBase, 2, noiseFactor);

    const isA = Math.random() < 0.5;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      promptHull,
      hullDetailedA: isA ? targetDetailed : distractorDetailed,
      hullDetailedB: isA ? distractorDetailed : targetDetailed,
      correctHullChoice: isA ? 'A' : 'B',
      tolerance: 0,
    };
  }
~~~~~

### 下一步建议
1. **类型与代码检查**：运行 `npm run check` 验证代码格式与静态类型。
2. **完整体验验证**：在看板中进入「细化感知」看板，分别进行「动态势线寻源」与「几何大模寻形」的自适应训练，测试高等级（Level 20 ~ Level 35）下的辨识手感与认知负荷。
