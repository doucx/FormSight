好的，我将为你生成修改计划，重构「黑白素描归组」与「几何大模寻形」的生成与判别算法，并将其从实验性状态正式转正。

## [WIP] feat: 完善黑白素描归组与几何大模寻形算法并转正

### 用户需求
将 `abs_notan_threshold`（黑白素描归组）与 `abs_td_hull_2afc`（几何大模寻形）两个实验性模块的核心生成与判断算法进行完善，使其具备真正的视觉认知训练价值，并移除实验性标志转为正式训练卡片。

### 评论
当前这两个模块在代码中只是简易占位实现：素描归组的目标阈值硬编码为 50，且缺少复杂场景；大模寻形仅做了简单顶点微移，缺乏真正的复杂细碎边缘提取。完善算法后，能真正提升系统在视知觉抽象与具象细化方面的训练专业度。

### 目标
1. 在 `src/utils/abstractionUtils.ts` 中实现多边形边缘法向细碎化算法（`fractalizePolygon`）。
2. 重构 `NOTAN_THRESHOLD` 题目生成逻辑：生成多层次前景主体与背景杂乱噪斑，并动态计算二值化最佳切分阈值。
3. 重构 `TD_HULL_2AFC` 题目生成逻辑：生成骨架大模与高细节破碎剪影，实现具有挑战性的 2AFC 大形寻源。
4. 在 `src/config/cards.ts` 中移除这两个卡片的 `isExperimental: true` 标记。

### 基本原理
1. **Notan 分离阈值**：通过让前景主体明度聚集在一个区间，背景聚集在另一区间并施加高斯/随机扰动，二者的中位数即为最佳视觉切分阈值。
2. **多边形分形细化**：通过在多边形每条线段间递归插入带有法向扰动的分形中点，将简单凸多边形转化为具有碎形特性的复杂有机剪影，迫使大脑启动顶层知觉过滤机制。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #ai/instruct #task/domain/abstraction #task/object/experimental-cards #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 升级 `abstractionUtils.ts` 中的算法实现

在 `src/utils/abstractionUtils.ts` 中添加多边形分形细碎化函数 `fractalizePolygon`，并重写 `NOTAN_THRESHOLD` 与 `TD_HULL_2AFC` 的题目生成逻辑。

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
 * 将简单的多边形边缘打碎，生成拥有大量顶点的复杂细碎剪影
 */
function fractalizePolygon(basePolygon: Point[], detailLevel: number, noiseFactor: number): Point[] {
  let currentPoints = [...basePolygon];

  for (let iter = 0; iter < detailLevel; iter++) {
    const nextPoints: Point[] = [];
    for (let i = 0; i < currentPoints.length; i++) {
      const p1 = currentPoints[i];
      const p2 = currentPoints[(i + 1) % currentPoints.length];

      nextPoints.push(p1);

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;

      const nx = -dy / len;
      const ny = dx / len;

      const displacement = (Math.random() * 2 - 1) * noiseFactor * (len * 0.3);
      nextPoints.push({
        x: Math.round(midX + nx * displacement),
        y: Math.round(midY + ny * displacement),
      });
    }
    currentPoints = nextPoints;
  }
  return currentPoints;
}

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

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript.old
  // 3. NOTAN_THRESHOLD 黑白素描二值归组
  if (mode === 'NOTAN_THRESHOLD') {
    const notanShapes: NotanShape[] = [
      {
        type: 'rect',
        cx: 200,
        cy: 200,
        w: 360,
        h: 360,
        baseVal: Math.floor(Math.random() * 20) + 75,
      },
      {
        type: 'circle',
        cx: 160 + Math.random() * 80,
        cy: 160 + Math.random() * 80,
        r: 60 + Math.random() * 40,
        baseVal: Math.floor(Math.random() * 20) + 20,
      },
      {
        type: 'rect',
        cx: 140 + Math.random() * 120,
        cy: 220 + Math.random() * 60,
        w: 120 + Math.random() * 60,
        h: 80 + Math.random() * 40,
        baseVal: Math.floor(Math.random() * 30) + 40,
      },
    ];

    const idealNotanThreshold = 50.0;
    const tolerance = Math.round(expDecayInterpolate(14.0, 2.0, clampedLevel) * 10) / 10;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      notanShapes,
      idealNotanThreshold,
      tolerance,
    };
  }
~~~~~
~~~~~typescript.new
  // 3. NOTAN_THRESHOLD 黑白素描二值归组
  if (mode === 'NOTAN_THRESHOLD') {
    const notanShapes: NotanShape[] = [];

    const isDarkSubject = Math.random() < 0.5;
    const subjectBaseVal = isDarkSubject
      ? 20 + Math.random() * 20
      : 60 + Math.random() * 20;
    const bgBaseVal = isDarkSubject
      ? 60 + Math.random() * 20
      : 20 + Math.random() * 20;

    const idealNotanThreshold = Math.round((subjectBaseVal + bgBaseVal) / 2);

    // 1. 生成杂乱背景块
    for (let i = 0; i < 40; i++) {
      notanShapes.push({
        type: Math.random() > 0.5 ? 'rect' : 'circle',
        cx: Math.random() * ABSTRACTION_CANVAS_SIZE,
        cy: Math.random() * ABSTRACTION_CANVAS_SIZE,
        w: 40 + Math.random() * 80,
        h: 40 + Math.random() * 80,
        r: 20 + Math.random() * 40,
        baseVal: Math.max(0, Math.min(100, bgBaseVal + (Math.random() * 30 - 15))),
      });
    }

    // 2. 生成明确的前景主体图元组
    const subjectCx = ABSTRACTION_CANVAS_SIZE / 2 + (Math.random() * 60 - 30);
    const subjectCy = ABSTRACTION_CANVAS_SIZE / 2 + (Math.random() * 60 - 30);
    for (let i = 0; i < 15; i++) {
      notanShapes.push({
        type: 'circle',
        cx: subjectCx + (Math.random() * 100 - 50),
        cy: subjectCy + (Math.random() * 100 - 50),
        r: 30 + Math.random() * 40,
        baseVal: Math.max(0, Math.min(100, subjectBaseVal + (Math.random() * 20 - 10))),
      });
    }

    const tolerance = Math.round(expDecayInterpolate(15.0, 3.0, clampedLevel) * 10) / 10;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      notanShapes,
      idealNotanThreshold,
      tolerance,
    };
  }
~~~~~

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript.old
  // 6. TD_HULL_2AFC 自顶向下大模寻形 (2AFC)
  if (mode === 'TD_HULL_2AFC') {
    const promptHull = generateDetailedPolygon(5, ABSTRACTION_THUMB_SIZE);
    const scale = ABSTRACTION_2AFC_SIZE / ABSTRACTION_THUMB_SIZE;
    const targetDetailed = promptHull.map((p) => ({
      x: p.x * scale + (Math.random() * 10 - 5),
      y: p.y * scale + (Math.random() * 10 - 5),
    }));

    const distractorDetailed = generateDetailedPolygon(5, ABSTRACTION_2AFC_SIZE);
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

#### Acts 2: 在 `cards.ts` 中移除实验性标记

移除 `abs_notan_threshold` 和 `abs_td_hull_2afc` 的 `isExperimental: true` 标记。

~~~~~act
patch_file
src/config/cards.ts
~~~~~
~~~~~typescript.old
  {
    id: 'abs_notan_threshold',
    legacyDomain: 'abstraction',
    legacyMode: 'NOTAN_THRESHOLD',
    title: '黑白素描归组',
    desc: '调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。',
    instruction: '调节二值化阈值滑块，达成黑白咬合最平衡的 Notan 状态',
    icon: Sun,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'notan_grouping'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
    isExperimental: true,
  },
~~~~~
~~~~~typescript.new
  {
    id: 'abs_notan_threshold',
    legacyDomain: 'abstraction',
    legacyMode: 'NOTAN_THRESHOLD',
    title: '黑白素描归组',
    desc: '调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。',
    instruction: '调节二值化阈值滑块，达成黑白咬合最平衡的 Notan 状态',
    icon: Sun,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'notan_grouping'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
~~~~~

~~~~~act
patch_file
src/config/cards.ts
~~~~~
~~~~~typescript.old
  {
    id: 'abs_td_hull_2afc',
    legacyDomain: 'concretization',
    legacyMode: 'TD_HULL_2AFC',
    title: '几何大模寻形',
    desc: '给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。',
    instruction: '观察上方极简低模外壳，二选一辨识哪侧剪影符合该大形',
    icon: Columns,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
    isExperimental: true,
  },
~~~~~
~~~~~typescript.new
  {
    id: 'abs_td_hull_2afc',
    legacyDomain: 'concretization',
    legacyMode: 'TD_HULL_2AFC',
    title: '几何大模寻形',
    desc: '给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。',
    instruction: '观察上方极简低模外壳，二选一辨识哪侧剪影符合该大形',
    icon: Columns,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
~~~~~

### 下一步建议
1. 启动项目运行 `pnpm dev` 或 `npm run dev` 并在浏览器中体验「黑白素描归组」与「几何大模寻形」的训练流程。
2. 验证 Biome 语法与格式化检查：运行 `npm run check` 确保代码符合规范。
