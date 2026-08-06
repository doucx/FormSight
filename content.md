简要回答

好的，这确实是解决 Level 计算冲突与清理技术债的最优雅方式。我将创建一个计划，采用方案 1 进行动态底数的对数插值，并一并移除残留的 `gridStep`。

## [WIP] fix(training): 修改 Level 衰减机制为对数插值，清理残留网格步长

### 用户需求
使用对数插值替代原有的硬编码指数衰减，使几何引擎能够接收外部设定的 `maxLevel`（12 或 35），使得在这两种粒度下，题目难度都能平滑地推进到同一个“物理极限”。同时彻底清理系统中与“方形网格步长 (gridStep)”相关的无用旧代码。

### 评论
使用对数插值来映射参数能够真正符合韦伯-费希纳定律的感知曲线。同时，允许 12 级和 35 级达到统一的难度上限，保证了训练系统的科学性和一致性。清理技术债则让 `QuestionData` 的心智模型更纯粹——既然使用点阵坐标数组，就不再需要 `gridStep` 这个概念了。

### 目标
1. 修改 `types/index.ts`，从 `QuestionData` 中移除 `gridStep` 字段。
2. 修改 `utils/geometry.ts`，彻底移除无用的 `levelToTempGridStep` 函数。
3. 更新 `generatePolarGridPoints`、`generateBipolarGridPoints` 与 `generateQuestion`，新增 `maxLevel` 参数，并用对数插值公式替代硬编码的指数衰减，使难度步长基于进度比例 `t`。
4. 修改 `views/TrainingView.tsx`，在初始化题目及切换下一题时，读取设置中的跨度（12 或 35），并将其作为 `maxLevel` 传递给题目生成引擎。

### 基本原理
对于参数从起始值 `S` 衰减到终点值 `E` 的对数插值，公式为：`V = S * (E / S)^t`，其中 `t` 为进度比率 `(level - 1) / (maxLevel - 1)`。这确保了在 `level = 1` 时恰好等于 `S`，在 `level = maxLevel` 时恰好等于 `E`，并在中间阶段提供等比例（而非等差）的感知衰减。

### 标签
#intent/fix #flow/ready #priority/high #comp/engine #concept/core #scope/core #ai/delegate #task/domain/geometry #task/object/level-mechanism #task/action/interpolate #task/state/begin #task/status/active

---

### Script

#### Acts 1: 清理类型定义中的废弃字段
从 `QuestionData` 接口中移除 `gridStep` 属性，让实体数据更纯粹。

~~~~~act
patch_file
src/types/index.ts
~~~~~
~~~~~typescript
export interface QuestionData {
  id: string;
  mode: TrainingMode;
  anchorA: Point;
  anchorC: Point | null;
  targetB: Point;
  gridStart: Point;
  gridStep: number; // 仅作为 Step 1/渲染兼容使用
  difficultyLevel: number; // 统一抽象难度等级 (1..N)
  gridDim: number; // 默认 5 (5x5 网格)
~~~~~
~~~~~typescript
export interface QuestionData {
  id: string;
  mode: TrainingMode;
  anchorA: Point;
  anchorC: Point | null;
  targetB: Point;
  gridStart: Point;
  difficultyLevel: number; // 统一抽象难度等级 (1..N)
  gridDim: number; // 默认 5 (5x5 网格)
~~~~~

#### Acts 2: 几何引擎数学模型重构
移除旧有阶梯映射，修改干扰点生成函数，采用对数插值映射 1 级至 `maxLevel` 的衰减过程，并去掉生成对象里的 `gridStep`。

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript
export const CY = CANVAS_SIZE / 2; // 250
export const DEFAULT_GRID_DIM = 5; // 5x5 网格

/**
 * 映射 Level 到临时网格步长 px (兼容使用)
 */
export function levelToTempGridStep(level: number): number {
  const steps = [35, 30, 25, 20, 16, 13, 10, 8, 6, 5, 4, 3];
  const idx = Math.max(0, Math.min(level - 1, steps.length - 1));
  return steps[idx];
}

/**
 * 将点绕指定中心旋转指定角度 (角度制)
 */
~~~~~
~~~~~typescript
export const CY = CANVAS_SIZE / 2; // 250
export const DEFAULT_GRID_DIM = 5; // 5x5 网格

/**
 * 将点绕指定中心旋转指定角度 (角度制)
 */
~~~~~

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript
export function generatePolarGridPoints(
  anchorA: Point,
  targetB: Point,
  level: number,
  targetRow = Math.floor(Math.random() * 5),
  targetCol = Math.floor(Math.random() * 5),
): Point[] {
  const dx = targetB.x - anchorA.x;
  const dy = targetB.y - anchorA.y;
  const R = Math.sqrt(dx * dx + dy * dy);
  const theta = Math.atan2(dy, dx);

  // 角度步长：从 Level 1 的 8.0° 逐渐缩小至 高 Level 的 ~0.5°
  const angleStepDeg = Math.max(0.5, 8.0 * 0.82 ** (level - 1));
  const angleStepRad = (angleStepDeg * Math.PI) / 180;
  // 径向比例步长：从 Level 1 的 15% 逐渐缩小至 高 Level 的 ~1.5%
  const rRatioStep = Math.max(0.015, 0.15 * 0.82 ** (level - 1));

  // 将 targetRow (0..4) 与 targetCol (0..4) 映射为相对偏移 (-2..2)
~~~~~
~~~~~typescript
export function generatePolarGridPoints(
  anchorA: Point,
  targetB: Point,
  level: number,
  maxLevel: number = 12,
  targetRow = Math.floor(Math.random() * 5),
  targetCol = Math.floor(Math.random() * 5),
): Point[] {
  const dx = targetB.x - anchorA.x;
  const dy = targetB.y - anchorA.y;
  const R = Math.sqrt(dx * dx + dy * dy);
  const theta = Math.atan2(dy, dx);

  // 根据当前难度占比进行对数插值，保证 1级~maxLevel 之间的难度均匀衰减
  const t = maxLevel > 1 ? (level - 1) / (maxLevel - 1) : 0;
  const angleStepDeg = 8.0 * Math.pow(0.5 / 8.0, t);
  const angleStepRad = (angleStepDeg * Math.PI) / 180;
  const rRatioStep = 0.15 * Math.pow(0.015 / 0.15, t);

  // 将 targetRow (0..4) 与 targetCol (0..4) 映射为相对偏移 (-2..2)
~~~~~

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript
export function generateBipolarGridPoints(
  anchorA: Point,
  anchorC: Point,
  targetB: Point,
  level: number,
  targetRow = Math.floor(Math.random() * 5),
  targetCol = Math.floor(Math.random() * 5),
): Point[] {
  const alpha = Math.atan2(targetB.y - anchorA.y, targetB.x - anchorA.x);
  const beta = Math.atan2(targetB.y - anchorC.y, targetB.x - anchorC.x);

  // 视线偏角步长：从 Level 1 的 6.0° 缩小至 高 Level 的 ~0.4°
  const phiStepDeg = Math.max(0.4, 6.0 * 0.82 ** (level - 1));
  const phiStepRad = (phiStepDeg * Math.PI) / 180;

  const a0 = targetRow - 2;
~~~~~
~~~~~typescript
export function generateBipolarGridPoints(
  anchorA: Point,
  anchorC: Point,
  targetB: Point,
  level: number,
  maxLevel: number = 12,
  targetRow = Math.floor(Math.random() * 5),
  targetCol = Math.floor(Math.random() * 5),
): Point[] {
  const alpha = Math.atan2(targetB.y - anchorA.y, targetB.x - anchorA.x);
  const beta = Math.atan2(targetB.y - anchorC.y, targetB.x - anchorC.x);

  // 根据当前难度占比进行对数插值，保证 1级~maxLevel 之间的难度均匀衰减
  const t = maxLevel > 1 ? (level - 1) / (maxLevel - 1) : 0;
  const phiStepDeg = 6.0 * Math.pow(0.4 / 6.0, t);
  const phiStepRad = (phiStepDeg * Math.PI) / 180;

  const a0 = targetRow - 2;
~~~~~

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript
export function generateQuestion(
  mode: TrainingMode,
  difficultyLevel: number,
  options?: QuestionGenerateOptions,
): QuestionData {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = DEFAULT_GRID_DIM;
  const gridStep = levelToTempGridStep(difficultyLevel);
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);
~~~~~
~~~~~typescript
export function generateQuestion(
  mode: TrainingMode,
  difficultyLevel: number,
  maxLevel: number = 12,
  options?: QuestionGenerateOptions,
): QuestionData {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);
~~~~~

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript
    const distractorPoints = generatePolarGridPoints(
      anchorA,
      targetB,
      difficultyLevel,
      randomRow,
      randomCol,
    );

    return {
      id,
      mode,
      anchorA,
      anchorC: null,
      targetB,
      gridStart: distractorPoints[0],
      gridStep,
      difficultyLevel,
      gridDim,
      distractorPoints,
      angleDegree: angle,
      distanceRatio: dist,
    };
~~~~~
~~~~~typescript
    const distractorPoints = generatePolarGridPoints(
      anchorA,
      targetB,
      difficultyLevel,
      maxLevel,
      randomRow,
      randomCol,
    );

    return {
      id,
      mode,
      anchorA,
      anchorC: null,
      targetB,
      gridStart: distractorPoints[0],
      difficultyLevel,
      gridDim,
      distractorPoints,
      angleDegree: angle,
      distanceRatio: dist,
    };
~~~~~

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript
  const distractorPoints = generateBipolarGridPoints(
    anchorA,
    anchorC,
    targetB,
    difficultyLevel,
    randomRow,
    randomCol,
  );
  const angleDegree = Math.round(((Math.atan2(py, px) * 180) / Math.PI + 360) % 360);

  return {
    id,
    mode,
    anchorA,
    anchorC,
    targetB,
    gridStart: distractorPoints[0],
    gridStep,
    difficultyLevel,
    gridDim,
    distractorPoints,
    angleDegree,
    distanceRatio: Math.round(Math.sqrt(px * px + py * py)),
    rotationAngle: rotAngle,
  };
~~~~~
~~~~~typescript
  const distractorPoints = generateBipolarGridPoints(
    anchorA,
    anchorC,
    targetB,
    difficultyLevel,
    maxLevel,
    randomRow,
    randomCol,
  );
  const angleDegree = Math.round(((Math.atan2(py, px) * 180) / Math.PI + 360) % 360);

  return {
    id,
    mode,
    anchorA,
    anchorC,
    targetB,
    gridStart: distractorPoints[0],
    difficultyLevel,
    gridDim,
    distractorPoints,
    angleDegree,
    distanceRatio: Math.round(Math.sqrt(px * px + py * py)),
    rotationAngle: rotAngle,
  };
~~~~~

#### Acts 3: 调整 TrainingView 中对于发题方法的调用
将界面的 `maxLevel` 配置计算并直接传入题目的生成逻辑中。

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript
      targetSectors:
        settings.targetingMode === 'manual'
          ? settings.manualTargetSectors
          : targetSectorsRef.current,
    };
  };

  const [question, setQuestion] = useState<QuestionData>(() =>
    generateQuestion(mode, initialLevel, {
      targetingMode: settings.targetingMode,
      targetSectors: settings.manualTargetSectors,
    }),
  );
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
~~~~~
~~~~~typescript
      targetSectors:
        settings.targetingMode === 'manual'
          ? settings.manualTargetSectors
          : targetSectorsRef.current,
    };
  };

  const maxLevel = settings.stepGranularity === 'fine' ? 35 : 12;

  const [question, setQuestion] = useState<QuestionData>(() =>
    generateQuestion(mode, initialLevel, maxLevel, {
      targetingMode: settings.targetingMode,
      targetSectors: settings.manualTargetSectors,
    }),
  );
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateQuestion(mode, nextLevel, getGenerateOptions()));
    setQuestionStartTime(Date.now());
  };
~~~~~
~~~~~typescript
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateQuestion(mode, nextLevel, maxLevel, getGenerateOptions()));
    setQuestionStartTime(Date.now());
  };
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript
    lastActivityTimeRef.current = Date.now();
    accumulatedMsRef.current = 0;
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(mode, nextLevel, getGenerateOptions()));
    setQuestionStartTime(Date.now());
  };
~~~~~
~~~~~typescript
    lastActivityTimeRef.current = Date.now();
    accumulatedMsRef.current = 0;
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(mode, nextLevel, maxLevel, getGenerateOptions()));
    setQuestionStartTime(Date.now());
  };
~~~~~

### 下一步建议
通过上述修改，核心逻辑在 12 级与 35 级下能得到绝对一致、连续而平滑的对数阻尼体验了。
你建议方案 3：“在面板或结算处显示实际物理视角偏差度，增加科技感”。要实现这一点，我们需要在 `QuestionData` 类型中回传 `angleStepDeg` 和 `rRatioStep` 等指标，之后在 `TrainingView` 渲染即可。如果你认为这具有附加价值，我可以在下一个任务中为其起草实现计划。
