好的，我将为你生成完整的 Quipu 计划，将「折线低模大形（`POLYGON_DECIMATION`）」彻底重构为正向分形生成算法，并移除遗留的 RDP 代码。

## [WIP] refactor: 用分形细化正向生成法替代折线低模大形中的 RDP 算法

### 用户需求
将「折线低模大形（`POLYGON_DECIMATION`）」的生成逻辑从原有的 RDP 暴力抽稀点算法改为由简至繁的分形细化正向生成法，使题目既具备严密的几何依凭，又符合绘画与视知觉认知的层次逻辑。

### 评论
RDP 算法属于纯地理轨迹压缩算法，容易产生不自然的锐角和非艺术性折线，且其在生成时需要通过 while 循环反复暴力调参以限制顶点数。改为正向分形生成后，题目天然保证了低模大形与高模细化图形的从属关系，且与 `TD_HULL_2AFC` 形成了完美的正反双向知觉训练体系。

### 目标
1. 在 `src/utils/abstractionUtils.ts` 中移除不再使用的 `perpendicularDistance` 与 `rdpSimplify` 函数。
2. 重写 `generateAbstractionQuestion` 中 `POLYGON_DECIMATION` 分支，改为“生成基准大模 $\rightarrow$ 生成干扰大模 $\rightarrow$ 对基准大模施加分形边缘细化生成题干原图”。
3. 在 `src/config/cards.ts` 中微调卡片描述，去除对 RDP 的技术提及。

### 基本原理
1. **正向层次构建（Forward Hierarchy）**：采用先确定 4~6 顶点的大形结构（作为 Ground Truth 正确答案），再在此大形基础上利用 `fractalizePolygon` 迭代生成高频边缘噪波作为题干展示图。
2. **认知对称性**：使 `POLYGON_DECIMATION`（自底向上抽象概括）与 `TD_HULL_2AFC`（自顶向下具象细化）复用同套分形生成算子，分别训练提取与匹配两种镜像知觉能力。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #ai/instruct #task/domain/abstraction #task/object/polygon-decimation #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 重构 `src/utils/abstractionUtils.ts` 中的大形生成逻辑

移除废弃的 RDP 算法，并将 `POLYGON_DECIMATION` 改造为正向分形生成。

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript.old
/**
 * 经典 Ramer-Douglas-Peucker (RDP) 多边形顶点精简算法
 */
function perpendicularDistance(p: Point, p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return Math.hypot(p.x - p1.x, p.y - p1.y);
  return Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x) / len;
}

export function rdpSimplify(points: Point[], epsilon: number): Point[] {
  if (points.length <= 3) return points;

  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const recResults1 = rdpSimplify(points.slice(0, index + 1), epsilon);
    const recResults2 = rdpSimplify(points.slice(index), epsilon);
    return recResults1.slice(0, -1).concat(recResults2);
  }
  return [points[0], points[end]];
}

/**
 * 生成带方向性的散点流
 */
~~~~~
~~~~~typescript.new
/**
 * 生成带方向性的散点流
 */
~~~~~

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript.old
  // 2. POLYGON_DECIMATION 折线大形 (2AFC)
  if (mode === 'POLYGON_DECIMATION') {
    const vertCount = 18 + Math.floor(t * 12);
    const detailedPolygon = generateDetailedPolygon(vertCount);

    // 计算标准 RDP 简化 (目标保留 4~6 顶点)
    let eps = 25;
    let simplified = rdpSimplify(detailedPolygon, eps);
    let attempts = 0;
    while ((simplified.length < 4 || simplified.length > 7) && attempts < 15) {
      attempts++;
      eps = simplified.length < 4 ? eps * 0.75 : eps * 1.35;
      simplified = rdpSimplify(detailedPolygon, eps);
    }

    // 生成干扰项：随机微调/丢失一个关键大顶点
    const distractor = simplified.map((p) => ({ ...p }));
    const modIdx = Math.floor(Math.random() * distractor.length);
    const perturbDist = 35 * (1 - t * 0.6); // 随 Level 变小
    distractor[modIdx].x += Math.round((Math.random() * 2 - 1) * perturbDist);
    distractor[modIdx].y += Math.round((Math.random() * 2 - 1) * perturbDist);

    const isA = Math.random() < 0.5;
    const scaleTo2Afc = ABSTRACTION_2AFC_SIZE / ABSTRACTION_CANVAS_SIZE;
    const mapTo2Afc = (pts: Point[]) =>
      pts.map((p) => ({
        x: Math.round(p.x * scaleTo2Afc),
        y: Math.round(p.y * scaleTo2Afc),
      }));

    const simplifiedOptions = isA
      ? [mapTo2Afc(simplified), mapTo2Afc(distractor)]
      : [mapTo2Afc(distractor), mapTo2Afc(simplified)];

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
    const simplifiedOptions = isA
      ? [targetHull, distractorHull]
      : [distractorHull, targetHull];

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

#### Acts 2: 更新 `src/config/cards.ts` 中的卡片文案

修改卡片描述，去除对 RDP 的技术实现细节提及。

~~~~~act
patch_file
src/config/cards.ts
~~~~~
~~~~~typescript.old
  {
    id: 'abs_polygon_decimation',
    legacyDomain: 'abstraction',
    legacyMode: 'POLYGON_DECIMATION',
    title: '折线低模大形',
    desc: '从细碎繁复轮廓中识别 RDP 算法精简出的最优关键折线大形框架。',
    instruction: '观察左侧细碎多边形，选择右侧保留了关键折线大形的概括项',
    icon: Maximize2,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
~~~~~
~~~~~typescript.new
  {
    id: 'abs_polygon_decimation',
    legacyDomain: 'abstraction',
    legacyMode: 'POLYGON_DECIMATION',
    title: '折线低模大形',
    desc: '从细碎繁复轮廓中穿透高频噪波，识别出其底层的最优关键折线大形框架。',
    instruction: '观察左侧细碎多边形，选择右侧保留了关键折线大形的概括项',
    icon: Maximize2,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
~~~~~

### 下一步建议
1. 启动项目运行 `npm run dev`，在「概括感知 -> 折线低模大形」模块中进行实机测试，体验细碎多边形与低模骨架的匹配手感。
2. 运行 `npm run check` 确保代码格式和类型通过 Biome 规范校验。
