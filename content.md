我现在将为你实施「折线低模大形」与「动态势线寻源」的高难度算法重构与抗干扰能力升级。

## [WIP] refactor(abstraction): 增强折线低模大形与动态势线寻源的高难度感知辨识度

### 用户需求
「折线低模大形 (`POLYGON_DECIMATION`)」与「动态势线寻源 (`TD_GESTURE_2AFC`)」在最高难度 Level 35 下缺乏感知挑战，需要重构两者的题目生成机制与干扰项算法，使高等级难度真正具备对抗性与视知觉训练价值。

### 评论
当前实现中，`POLYGON_DECIMATION` 的干扰项因独立全随机生成而缺乏拓扑竞争性，`TD_GESTURE_2AFC` 因粒子过于细长且缺乏背景噪点而极易肉眼辨识。通过引入“对抗性低模形变”与“带噪动态弥散流”，能够深度契合造型概括与动势捕捉的认知心理学规律。

### 目标
1. **重构 `POLYGON_DECIMATION`**：
   - 随 Level 阶梯递增基础多边形顶点数（4 到 9 个）。
   - 实现对抗性干扰低模生成器 `generateAdversarialDistractorHull`，基于真理多边形进行局部关键折角抹平或伪转折突变。
2. **重构 `TD_GESTURE_2AFC`**：
   - 实现包含各向同性背景噪波的 `generateFlowParticlesWithClutter` 函数。
   - 将粒子群离心率随 Level 动态扩大（0.18 ~ 0.58），并将高等级角偏差下限由 10.5° 压紧至 3.5°~5.0°。

### 基本原理
1. **对抗性几何干扰**：人类视觉对完全不相干的形状有预注意特征跳出（Pop-out），只有当干扰项保留整体大结构、仅在局部折角或体块转折上出现偏差时，大脑才必须启动精细的“正负形与曲率特征比对”认知机制。
2. **信号与噪声比（SNR）建模**：通过在势线周围混合各向同性杂质粒子并增大横向弥散度，逼近真实速写与动态草图中的杂乱线条环境，训练在强噪声下提取主流动势的稳健感知力。

### 标签
#intent/refine #flow/ready #priority/high
#comp/runtime #concept/state #scope/core
#ai/instruct
#task/domain/abstraction
#task/object/perceptual-difficulty-algorithms
#task/action/refactor
#task/state/begin

---

### Script

#### Acts 1: 重构 `src/utils/abstractionUtils.ts` 中的算法模型

我们在 `src/utils/abstractionUtils.ts` 中实现对抗性低模生成器与带噪粒子流生成器，并更新两个题型的生成流水线。

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript.old
/**
 * 生成带方向性的散点流
 */
function generateFlowParticles(
  angleDeg: number,
  spreadRatio: number,
  size = ABSTRACTION_CANVAS_SIZE,
): Point[] {
  const rad = (angleDeg * Math.PI) / 180;
  const count = 40 + Math.floor(Math.random() * 20);
  const cx = size / 2;
  const cy = size / 2;
  const majorLen = size * 0.38;
  const minorLen = majorLen * spreadRatio;

  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const u = (Math.random() * 2 - 1) * majorLen;
    const v = (Math.random() * 2 - 1) * minorLen;

    const x = Math.round(cx + u * Math.cos(rad) - v * Math.sin(rad));
    const y = Math.round(cy + u * Math.sin(rad) + v * Math.cos(rad));
    points.push({
      x: Math.max(15, Math.min(size - 15, x)),
      y: Math.max(15, Math.min(size - 15, y)),
    });
  }
  return points;
}
~~~~~
~~~~~typescript.new
/**
 * 生成带方向性与背景各向同性噪点的散点流
 */
function generateFlowParticlesWithClutter(
  angleDeg: number,
  spreadRatio: number,
  clutterRatio = 0,
  size = ABSTRACTION_CANVAS_SIZE,
): Point[] {
  const rad = (angleDeg * Math.PI) / 180;
  const count = 45 + Math.floor(Math.random() * 20);
  const cx = size / 2;
  const cy = size / 2;
  const majorLen = size * 0.38;
  const minorLen = majorLen * spreadRatio;

  const points: Point[] = [];
  const clutterCount = Math.floor(count * clutterRatio);
  const flowCount = count - clutterCount;

  // 主流动势粒子
  for (let i = 0; i < flowCount; i++) {
    const u = (Math.random() * 2 - 1) * majorLen;
    const v = (Math.random() * 2 - 1) * minorLen;

    const x = Math.round(cx + u * Math.cos(rad) - v * Math.sin(rad));
    const y = Math.round(cy + u * Math.sin(rad) + v * Math.cos(rad));
    points.push({
      x: Math.max(15, Math.min(size - 15, x)),
      y: Math.max(15, Math.min(size - 15, y)),
    });
  }

  // 背景各向同性杂质噪点 (破除简单外轮廓一眼看穿)
  for (let i = 0; i < clutterCount; i++) {
    const r = Math.sqrt(Math.random()) * majorLen * 0.95;
    const theta = Math.random() * Math.PI * 2;
    const x = Math.round(cx + r * Math.cos(theta));
    const y = Math.round(cy + r * Math.sin(theta));
    points.push({
      x: Math.max(15, Math.min(size - 15, x)),
      y: Math.max(15, Math.min(size - 15, y)),
    });
  }

  return points;
}

/**
 * 兼容包装：生成基础方向性散点流
 */
function generateFlowParticles(
  angleDeg: number,
  spreadRatio: number,
  size = ABSTRACTION_CANVAS_SIZE,
): Point[] {
  return generateFlowParticlesWithClutter(angleDeg, spreadRatio, 0, size);
}
~~~~~

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript.old
/**
 * 生成细碎多边形
 */
function generateDetailedPolygon(verticesCount: number, size = ABSTRACTION_CANVAS_SIZE): Point[] {
  const cx = size / 2;
  const cy = size / 2;
  const baseR = size * 0.32;
  const angles: number[] = [];
  const step = (Math.PI * 2) / verticesCount;

  for (let i = 0; i < verticesCount; i++) {
    angles.push(i * step + (Math.random() - 0.5) * step * 0.65);
  }
  angles.sort((a, b) => a - b);

  return angles.map((a) => {
    const r = baseR * (0.65 + Math.random() * 0.65);
    return {
      x: Math.round(cx + r * Math.cos(a)),
      y: Math.round(cy + r * Math.sin(a)),
    };
  });
}
~~~~~
~~~~~typescript.new
/**
 * 生成大模基础多边形
 */
function generateDetailedPolygon(verticesCount: number, size = ABSTRACTION_CANVAS_SIZE): Point[] {
  const cx = size / 2;
  const cy = size / 2;
  const baseR = size * 0.32;
  const angles: number[] = [];
  const step = (Math.PI * 2) / verticesCount;

  for (let i = 0; i < verticesCount; i++) {
    angles.push(i * step + (Math.random() - 0.5) * step * 0.65);
  }
  angles.sort((a, b) => a - b);

  return angles.map((a) => {
    const r = baseR * (0.65 + Math.random() * 0.65);
    return {
      x: Math.round(cx + r * Math.cos(a)),
      y: Math.round(cy + r * Math.sin(a)),
    };
  });
}

/**
 * 基于真理大模生成高度竞争性的对抗干扰多边形 (Adversarial Distractor)
 */
function generateAdversarialDistractorHull(
  targetHull: Point[],
  level: number,
  size = ABSTRACTION_2AFC_SIZE,
): Point[] {
  const t = (Math.max(1, Math.min(35, level)) - 1) / 34;
  const n = targetHull.length;
  const distractor: Point[] = targetHull.map((p) => ({ ...p }));
  const cx = size / 2;
  const cy = size / 2;

  // 策略 A (Level 低时概率稍高): 随机截断/拉平 1 个关键转折点（过度概括）
  // 策略 B (Level 高时主要使用): 关键转折点微小突变欺骗（位移量随 Level 缩小，越难察觉）
  const mutationType = Math.random();

  if (mutationType < 0.35 && n > 4) {
    const idx = Math.floor(Math.random() * n);
    const prev = targetHull[(idx - 1 + n) % n];
    const next = targetHull[(idx + 1) % n];
    distractor[idx] = {
      x: Math.round((prev.x + next.x) / 2),
      y: Math.round((prev.y + next.y) / 2),
    };
  } else {
    // 选取 1~2 个顶点施加微小拓扑欺骗
    const mutateCount = t > 0.6 && Math.random() < 0.5 ? 2 : 1;
    const chosenIndices = new Set<number>();
    while (chosenIndices.size < mutateCount) {
      chosenIndices.add(Math.floor(Math.random() * n));
    }

    // 偏移幅度：Level 1 为 40px (较明显)，Level 35 为 14px (需要极其敏锐的大形眼力)
    const shiftMag = 14 + (1 - t) * 26;

    for (const idx of chosenIndices) {
      const p = targetHull[idx];
      // 沿质心向外或法线方向突变
      const angleFromCenter = Math.atan2(p.y - cy, p.x - cx);
      const angle = angleFromCenter + (Math.random() - 0.5) * (Math.PI * 0.8);

      distractor[idx] = {
        x: Math.max(10, Math.min(size - 10, Math.round(p.x + Math.cos(angle) * shiftMag))),
        y: Math.max(10, Math.min(size - 10, Math.round(p.y + Math.sin(angle) * shiftMag))),
      };
    }
  }

  return distractor;
}
~~~~~

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript.old
  // 2. POLYGON_DECIMATION 折线大形 (2AFC)
  if (mode === 'POLYGON_DECIMATION') {
    // 1. 生成真实的大模基准 (4~6个关键转折点)
    const vertCount = Math.floor(Math.random() * 3) + 4;
    const targetHull = generateDetailedPolygon(vertCount, ABSTRACTION_2AFC_SIZE);

    // 2. 生成干扰大模（改变关键转折与体块比例）
    const distractorHull = generateDetailedPolygon(vertCount, ABSTRACTION_2AFC_SIZE);

    // 3. 基于 targetHull 进行边缘分形细化，生成题干展示的高频细碎多边形
    const scaleToMain = ABSTRACTION_CANVAS_SIZE / ABSTRACTION_2AFC_SIZE;
    const baseForDetailed = targetHull.map((p) => ({
      x: Math.round(p.x * scaleToMain),
      y: Math.round(p.y * scaleToMain),
    }));

    // 难度越高，边缘分形破碎程度越大 (0.4 ~ 1.2)
    const noiseFactor = 0.4 + t * 0.8;
    const detailedPolygon = fractalizePolygon(baseForDetailed, 2, noiseFactor);

    const isA = Math.random() < 0.5;
    const simplifiedOptions = isA ? [targetHull, distractorHull] : [distractorHull, targetHull];

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      detailedPolygon,
      simplifiedOptions,
      correctPolyIndex: isA ? 0 : 1,
      correctPolyChoice: isA ? 'A' : 'B',
      tolerance: 0,
    };
  }
~~~~~
~~~~~typescript.new
  // 2. POLYGON_DECIMATION 折线大形 (2AFC)
  if (mode === 'POLYGON_DECIMATION') {
    // 1. 随 Level 递增顶点数：Level 1 为 4~5 点，Level 35 为 7~9 点
    const minVerts = 4 + Math.floor(t * 3);
    const maxVerts = 5 + Math.floor(t * 4);
    const vertCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

    const targetHull = generateDetailedPolygon(vertCount, ABSTRACTION_2AFC_SIZE);

    // 2. 生成高度对抗性的干扰大模 (仅在 1~2 个关键折角或比例上制造真假欺骗)
    const distractorHull = generateAdversarialDistractorHull(
      targetHull,
      clampedLevel,
      ABSTRACTION_2AFC_SIZE,
    );

    // 3. 基于 targetHull 进行边缘分形细化，生成题干展示的高频细碎多边形
    const scaleToMain = ABSTRACTION_CANVAS_SIZE / ABSTRACTION_2AFC_SIZE;
    const baseForDetailed = targetHull.map((p) => ({
      x: Math.round(p.x * scaleToMain),
      y: Math.round(p.y * scaleToMain),
    }));

    // 难度越高，边缘分形破碎程度与细化递归越深
    const noiseFactor = 0.4 + t * 0.9;
    const detailedPolygon = fractalizePolygon(baseForDetailed, 2, noiseFactor);

    const isA = Math.random() < 0.5;
    const simplifiedOptions = isA ? [targetHull, distractorHull] : [distractorHull, targetHull];

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      detailedPolygon,
      simplifiedOptions,
      correctPolyIndex: isA ? 0 : 1,
      correctPolyChoice: isA ? 'A' : 'B',
      tolerance: 0,
    };
  }
~~~~~

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript.old
  // 5. TD_GESTURE_2AFC 自顶向下势线寻源 (2AFC)
  if (mode === 'TD_GESTURE_2AFC') {
    const targetAngle = Math.floor(Math.random() * 180);
    const distractorAngle = (targetAngle + 35 * (1 - t * 0.7) + 180) % 180;

    const rad = (targetAngle * Math.PI) / 180;
    const L = ABSTRACTION_THUMB_SIZE * 0.36;
    const cx = ABSTRACTION_THUMB_SIZE / 2;
    const cy = ABSTRACTION_THUMB_SIZE / 2;
    const promptSpine: Point[] = [
      { x: cx - L * Math.cos(rad), y: cy - L * Math.sin(rad) },
      { x: cx + L * Math.cos(rad), y: cy + L * Math.sin(rad) },
    ];

    const partA = generateFlowParticles(targetAngle, 0.25, ABSTRACTION_2AFC_SIZE);
    const partB = generateFlowParticles(distractorAngle, 0.25, ABSTRACTION_2AFC_SIZE);

    const isA = Math.random() < 0.5;
    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      promptSpine,
      particlesA: isA ? partA : partB,
      particlesB: isA ? partB : partA,
      correctParticleChoice: isA ? 'A' : 'B',
      tolerance: 0,
    };
  }
~~~~~
~~~~~typescript.new
  // 5. TD_GESTURE_2AFC 自顶向下势线寻源 (2AFC)
  if (mode === 'TD_GESTURE_2AFC') {
    const targetAngle = Math.floor(Math.random() * 180);

    // 动态角偏差：Level 1 为 36° (极易区分)，Level 35 逼近 4.0° (精细辨识)
    const angleDelta = expDecayInterpolate(36.0, 4.0, clampedLevel);
    const sign = Math.random() < 0.5 ? 1 : -1;
    const distractorAngle = (targetAngle + sign * angleDelta + 180) % 180;

    const rad = (targetAngle * Math.PI) / 180;
    const L = ABSTRACTION_THUMB_SIZE * 0.36;
    const cx = ABSTRACTION_THUMB_SIZE / 2;
    const cy = ABSTRACTION_THUMB_SIZE / 2;
    const promptSpine: Point[] = [
      { x: cx - L * Math.cos(rad), y: cy - L * Math.sin(rad) },
      { x: cx + L * Math.cos(rad), y: cy + L * Math.sin(rad) },
    ];

    // 动态粒子散布比：Level 1 为 0.18 (极聚拢)，Level 35 为 0.56 (弥散团，考验整体动势提取)
    const spreadRatio = 0.18 + t * 0.38;
    // 背景杂质噪点率：Level 1 为 0%，Level 35 为 28% 各向同性噪点
    const clutterRatio = t * 0.28;

    const partA = generateFlowParticlesWithClutter(
      targetAngle,
      spreadRatio,
      clutterRatio,
      ABSTRACTION_2AFC_SIZE,
    );
    const partB = generateFlowParticlesWithClutter(
      distractorAngle,
      spreadRatio,
      clutterRatio,
      ABSTRACTION_2AFC_SIZE,
    );

    const isA = Math.random() < 0.5;
    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      promptSpine,
      particlesA: isA ? partA : partB,
      particlesB: isA ? partB : partA,
      correctParticleChoice: isA ? 'A' : 'B',
      tolerance: 0,
    };
  }
~~~~~

### 下一步建议
1. **单元测试与构建验证**：运行 `npm test` 或 `npm run check` 确保代码类型与现有测试完全通过。
2. **体验验证**：在看板中启动「折线低模大形」和「动态势线寻源」的高等级（Level 20 ~ Level 35）自适应训练，体验实际手感与感知负荷。
