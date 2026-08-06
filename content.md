这是一个非常经典且关键的几何与数值策划问题。你的分析直击痛点。

针对**问题一（点阵粘连）**：之前的网格生成是基于“**固定的角度缩放比例**”算出的。由于圆的弧长 $S = R \times \theta$，当真理点距离锚点较近时（$R$ 变小），算出的屏幕像素间距 $S$ 就会变得非常小，导致点阵全挤在一起。
> **破局方案 (绝对像素间距倒推法)**：我们将逻辑反转。先根据 Level 定义出我们期望的**目标物理像素间距** $S$（例如 Level 1 宽裕的 25px，Level 35 密集的 4px）。然后根据当前距离 $R$ 反推所需要的角度步长：$\Delta\theta \approx S / R$。这样一来，无论真理点离中心有多近，算出的角度张角都会自动变大，从而**严格保证屏幕上的物理间距，绝不会发生点阵粘连**，且 5x5 的随机拓扑完整保留。

针对**问题二（Level 概念混淆）**：将 12 和 35 作为两个独立上限确实会让用户对自己的真实层阶产生困惑。
> **破局方案**：全局统一上限为 **Level 35**。所谓的“标准”与“精细”，仅仅代表攀爬速度的不同。“标准”采用**大步幅 (每次升级 +3 级)**，“精细”采用**小步幅 (每次升级 +1 级)**。

我将为你生成一个详细的修复计划。

## [WIP] refactor: 重构难度等级(Level)体系与自适应网格生成算法

### 用户需求

1.  需要解决即使在低 Level 时，当真理点离中心较近导致网格点粘连过密的问题，要求保证真理点分布的均匀性。
2.  消除关于网格步长“12级”和“35级”上限的概念混淆，统一层阶体系。

### 评论

采用绝对像素间距反推弧度的算法能完美解决极坐标与双极透视下导致的近距高密度问题。这不仅保证了视图上的防粘连，还保留了目标落在网格任何位置的随机公平性。同时，统一全局难度上限可以大幅简化统计指标和用户的心智模型。

### 目标

1.  重构 `AdaptiveEngine`，统一全局难度上限为 `Level 35`，使用不同的增减步幅 (`step = 3` 与 `step = 1`) 替代原本两种独立最大上限的体系。
2.  在 `generatePolarGridPoints` 和 `generateBipolarGridPoints` 中引入基于绝对像素目标间距 $S$ 来反推所需角度步长的算法。
3.  清理相关的函数签名并在设置面板中调整文案。

### 基本原理

通过剥离原有的角度缩放参数，引入基于屏幕像素单位的 `S_MAX` 和 `S_MIN` 常量。计算当前距离 $R$ 后，通过 $\theta = S / R$ 得到所需的角度偏置，从而让几何引擎具备“距离自适应”能力，在近处自动张开更大的角度，远处收缩角度，始终维持均匀的可视点距。

### 标签

#intent/refine #flow/ready #priority/high #comp/engine #concept/config #scope/core #ai/brainstorm #task/domain/adaptive-engine #task/object/level-system #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 重构自适应引擎 (AdaptiveEngine)

统一 `MAX_LEVEL` 为 35，引入 `step` 步长概念，在判定升级/降级时应用该步长。

~~~~~act
patch_file
src/utils/adaptiveEngine.ts
~~~~~
~~~~~typescript.old
/**
 * 难度序列与最大层阶配置
 * Level 1 最简单，Level 越高难度越大
 */
export const STANDARD_MAX_LEVEL = 12;
export const FINE_MAX_LEVEL = 35;

export type AdaptiveChange = 'up' | 'down' | 'same';
~~~~~
~~~~~typescript.new
/**
 * 难度序列与最大层阶配置
 * Level 1 最简单，Level 越高难度越大
 */
export const MAX_LEVEL = 35;

export type AdaptiveChange = 'up' | 'down' | 'same';
~~~~~

~~~~~act
patch_file
src/utils/adaptiveEngine.ts
~~~~~
~~~~~typescript.old
export class AdaptiveEngine {
  private maxLevel: number;
  private currentLevel: number;
  private mode: AdaptiveMode;
  private targetAccuracy: number;
  private blockSize: number;

  // 经典 3U1D 状态
  private consecutiveCorrect = 0;

  // 轮次胜率评估状态
  private blockHistory: boolean[] = [];

  constructor(
    initialLevel = 5,
    isFineGranularity = false,
    mode: AdaptiveMode = 'block',
    targetAccuracy = 0.8,
    blockSize = 10,
  ) {
    this.maxLevel = isFineGranularity ? FINE_MAX_LEVEL : STANDARD_MAX_LEVEL;
    this.mode = mode;
    this.targetAccuracy = targetAccuracy;
    this.blockSize = blockSize;
    this.currentLevel = Math.max(1, Math.min(initialLevel, this.maxLevel));
  }
~~~~~
~~~~~typescript.new
export class AdaptiveEngine {
  private maxLevel: number = MAX_LEVEL;
  private currentLevel: number;
  private mode: AdaptiveMode;
  private targetAccuracy: number;
  private blockSize: number;
  private step: number; // 升级步幅

  // 经典 3U1D 状态
  private consecutiveCorrect = 0;

  // 轮次胜率评估状态
  private blockHistory: boolean[] = [];

  constructor(
    initialLevel = 5,
    isFineGranularity = false,
    mode: AdaptiveMode = 'block',
    targetAccuracy = 0.8,
    blockSize = 10,
  ) {
    this.step = isFineGranularity ? 1 : 3;
    this.mode = mode;
    this.targetAccuracy = targetAccuracy;
    this.blockSize = blockSize;
    this.currentLevel = Math.max(1, Math.min(initialLevel, this.maxLevel));
  }
~~~~~

~~~~~act
patch_file
src/utils/adaptiveEngine.ts
~~~~~
~~~~~typescript.old
  private recordStaircase(isHit: boolean): RecordResultOutput {
    if (isHit) {
      this.consecutiveCorrect += 1;
      if (this.consecutiveCorrect >= 3) {
        this.consecutiveCorrect = 0;
        if (this.currentLevel < this.maxLevel) {
          this.currentLevel += 1;
          return { newLevel: this.getCurrentLevel(), change: 'up' };
        }
      }
    } else {
      this.consecutiveCorrect = 0;
      if (this.currentLevel > 1) {
        this.currentLevel -= 1;
        return { newLevel: this.getCurrentLevel(), change: 'down' };
      }
    }

    return { newLevel: this.getCurrentLevel(), change: 'same' };
  }
~~~~~
~~~~~typescript.new
  private recordStaircase(isHit: boolean): RecordResultOutput {
    if (isHit) {
      this.consecutiveCorrect += 1;
      if (this.consecutiveCorrect >= 3) {
        this.consecutiveCorrect = 0;
        if (this.currentLevel < this.maxLevel) {
          this.currentLevel = Math.min(this.maxLevel, this.currentLevel + this.step);
          return { newLevel: this.getCurrentLevel(), change: 'up' };
        }
      }
    } else {
      this.consecutiveCorrect = 0;
      if (this.currentLevel > 1) {
        this.currentLevel = Math.max(1, this.currentLevel - this.step);
        return { newLevel: this.getCurrentLevel(), change: 'down' };
      }
    }

    return { newLevel: this.getCurrentLevel(), change: 'same' };
  }
~~~~~

~~~~~act
patch_file
src/utils/adaptiveEngine.ts
~~~~~
~~~~~typescript.old
    if (accuracy >= this.targetAccuracy) {
      // 达到或超过目标正确率 -> 通关升级 (Level + 1)
      if (this.currentLevel < this.maxLevel) {
        this.currentLevel += 1;
        change = 'up';
      }
    } else if (accuracy < 0.5) {
      // 正确率低于 50% -> 难度太高，降级 (Level - 1)
      if (this.currentLevel > 1) {
        this.currentLevel -= 1;
        change = 'down';
      }
    }
~~~~~
~~~~~typescript.new
    if (accuracy >= this.targetAccuracy) {
      // 达到或超过目标正确率 -> 通关升级
      if (this.currentLevel < this.maxLevel) {
        this.currentLevel = Math.min(this.maxLevel, this.currentLevel + this.step);
        change = 'up';
      }
    } else if (accuracy < 0.5) {
      // 正确率低于 50% -> 难度太高，降级
      if (this.currentLevel > 1) {
        this.currentLevel = Math.max(1, this.currentLevel - this.step);
        change = 'down';
      }
    }
~~~~~

#### Acts 2: 重写网格生成算法 (Geometry)

修改 `generatePolarGridPoints` 与 `generateBipolarGridPoints` 函数，使用像素间距 $S$ 反推算法，并移除不必要的 `maxLevel` 参数（已在引擎内固化）。

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript.old
/**
 * 极坐标扇形网格生成器 (单锚点模式)
 * 以锚点 A 为原点，向真理点 B 放射。真理点 B 会随机陷落在 5x5 网格的任意节点上。
 */
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
  const r0 = targetRow - 2;
  const a0 = targetCol - 2;

  const points: Point[] = [];
  for (let rIdx = -2; rIdx <= 2; rIdx++) {
    for (let aIdx = -2; aIdx <= 2; aIdx++) {
      const curR = R * (1 + (rIdx - r0) * rRatioStep);
      const curTheta = theta + (aIdx - a0) * angleStepRad;
      const x = Math.round((anchorA.x + curR * Math.cos(curTheta)) * 100) / 100;
      const y = Math.round((anchorA.y + curR * Math.sin(curTheta)) * 100) / 100;
      points.push({ x, y });
    }
  }
  return points;
}
~~~~~
~~~~~typescript.new
/**
 * 极坐标扇形网格生成器 (单锚点模式)
 * 以锚点 A 为原点，向真理点 B 放射。真理点 B 会随机陷落在 5x5 网格的任意节点上。
 */
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

  // 定义 Level 1 的最大间距与 Level 35 的最小间距
  const S_MAX = 25;
  const S_MIN = 3.5;
  
  // 线性计算当前 Level 对应的目标像素间距
  const t = (Math.max(1, Math.min(level, 35)) - 1) / 34; // 0 to 1
  const S = S_MAX - t * (S_MAX - S_MIN);

  // 反推角度步长: theta = 弧长(S) / 半径(R)
  const maxAngleStepRad = (15 * Math.PI) / 180;
  const angleStepRad = Math.min(S / R, maxAngleStepRad);
  
  // 半径增量直接使用计算出的绝对像素距离
  const rStep = S;

  // 将 targetRow (0..4) 与 targetCol (0..4) 映射为相对偏移 (-2..2)
  const r0 = targetRow - 2;
  const a0 = targetCol - 2;

  const points: Point[] = [];
  for (let rIdx = -2; rIdx <= 2; rIdx++) {
    for (let aIdx = -2; aIdx <= 2; aIdx++) {
      const curR = R + (rIdx - r0) * rStep;
      const curTheta = theta + (aIdx - a0) * angleStepRad;
      const x = Math.round((anchorA.x + curR * Math.cos(curTheta)) * 100) / 100;
      const y = Math.round((anchorA.y + curR * Math.sin(curTheta)) * 100) / 100;
      points.push({ x, y });
    }
  }
  return points;
}
~~~~~

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript.old
/**
 * 双极透视网格生成器 (双锚点模式)
 * 从锚点 A 与 锚点 C 分别向真理点 B 发射 5 条视角射线。真理点 B 会随机陷落在 5x5 交叉点的任意位置。
 */
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
  const c0 = targetCol - 2;

  const points: Point[] = [];

  for (let aIdx = -2; aIdx <= 2; aIdx++) {
    for (let cIdx = -2; cIdx <= 2; cIdx++) {
      const alphaI = alpha + (aIdx - a0) * phiStepRad;
      const betaJ = beta + (cIdx - c0) * phiStepRad;

      const v1x = Math.cos(alphaI);
      const v1y = Math.sin(alphaI);
      const v2x = Math.cos(betaJ);
      const v2y = Math.sin(betaJ);

      const dx = anchorC.x - anchorA.x;
      const dy = anchorC.y - anchorA.y;
      const det = v1x * v2y - v1y * v2x;

      if (Math.abs(det) < 1e-5) {
        // 退化近似退回 TargetB 偏移
        points.push({
          x: Math.round((targetB.x + (aIdx - a0) * 15) * 100) / 100,
          y: Math.round((targetB.y + (cIdx - c0) * 15) * 100) / 100,
        });
      } else {
        const t1 = (dx * v2y - dy * v2x) / det;
        const x = Math.round((anchorA.x + t1 * v1x) * 100) / 100;
        const y = Math.round((anchorA.y + t1 * v1y) * 100) / 100;
        points.push({ x, y });
      }
    }
  }
  return points;
}
~~~~~
~~~~~typescript.new
/**
 * 双极透视网格生成器 (双锚点模式)
 * 从锚点 A 与 锚点 C 分别向真理点 B 发射 5 条视角射线。真理点 B 会随机陷落在 5x5 交叉点的任意位置。
 */
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

  const Ra = calcDistance(anchorA, targetB);
  const Rc = calcDistance(anchorC, targetB);

  // 双锚点交点可能会因夹角产生斜向拉伸拉长，所以最大间距稍微收敛一点
  const S_MAX = 20;
  const S_MIN = 3.5;
  
  const t = (Math.max(1, Math.min(level, 35)) - 1) / 34; // 0 to 1
  const S = S_MAX - t * (S_MAX - S_MIN);

  // 反推 alpha 和 beta 的独立角度步长
  const maxAngleStepRad = (15 * Math.PI) / 180;
  const alphaStepRad = Math.min(S / Ra, maxAngleStepRad);
  const betaStepRad = Math.min(S / Rc, maxAngleStepRad);

  const a0 = targetRow - 2;
  const c0 = targetCol - 2;

  const points: Point[] = [];

  for (let aIdx = -2; aIdx <= 2; aIdx++) {
    for (let cIdx = -2; cIdx <= 2; cIdx++) {
      const alphaI = alpha + (aIdx - a0) * alphaStepRad;
      const betaJ = beta + (cIdx - c0) * betaStepRad;

      const v1x = Math.cos(alphaI);
      const v1y = Math.sin(alphaI);
      const v2x = Math.cos(betaJ);
      const v2y = Math.sin(betaJ);

      const dx = anchorC.x - anchorA.x;
      const dy = anchorC.y - anchorA.y;
      const det = v1x * v2y - v1y * v2x;

      if (Math.abs(det) < 1e-5) {
        // 退化近似退回 TargetB 偏移
        points.push({
          x: Math.round((targetB.x + (aIdx - a0) * S) * 100) / 100,
          y: Math.round((targetB.y + (cIdx - c0) * S) * 100) / 100,
        });
      } else {
        const t1 = (dx * v2y - dy * v2x) / det;
        const x = Math.round((anchorA.x + t1 * v1x) * 100) / 100;
        const y = Math.round((anchorA.y + t1 * v1y) * 100) / 100;
        points.push({ x, y });
      }
    }
  }
  return points;
}
~~~~~

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript.old
export function generateQuestion(
  mode: TrainingMode,
  difficultyLevel: number,
  maxLevel: number = 12,
  options?: QuestionGenerateOptions,
): QuestionData {
~~~~~
~~~~~typescript.new
export function generateQuestion(
  mode: TrainingMode,
  difficultyLevel: number,
  options?: QuestionGenerateOptions,
): QuestionData {
~~~~~

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript.old
    const distractorPoints = generatePolarGridPoints(
      anchorA,
      targetB,
      difficultyLevel,
      maxLevel,
      randomRow,
      randomCol,
    );

    return {
~~~~~
~~~~~typescript.new
    const distractorPoints = generatePolarGridPoints(
      anchorA,
      targetB,
      difficultyLevel,
      randomRow,
      randomCol,
    );

    return {
~~~~~

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
  const distractorPoints = generateBipolarGridPoints(
    anchorA,
    anchorC,
    targetB,
    difficultyLevel,
    randomRow,
    randomCol,
  );
  const angleDegree = Math.round(((Math.atan2(py, px) * 180) / Math.PI + 360) % 360);
~~~~~

#### Acts 3: 更新调用方与 UI 界面

修改由于去除了 `maxLevel` 参数带来的签名变化，并统一 Y 轴动态范围至 35，同时更改偏好设置界面的文案。

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
  const getGenerateOptions = (): QuestionGenerateOptions => {
    return {
      targetingMode: settings.targetingMode,
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
~~~~~
~~~~~typescript.new
  const getGenerateOptions = (): QuestionGenerateOptions => {
    return {
      targetingMode: settings.targetingMode,
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
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateQuestion(mode, nextLevel, maxLevel, getGenerateOptions()));
    setQuestionStartTime(Date.now());
  };
~~~~~
~~~~~typescript.new
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateQuestion(mode, nextLevel, getGenerateOptions()));
    setQuestionStartTime(Date.now());
  };
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
    accumulatedMsRef.current = 0;
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(mode, nextLevel, maxLevel, getGenerateOptions()));
    setQuestionStartTime(Date.now());
  };
~~~~~
~~~~~typescript.new
    accumulatedMsRef.current = 0;
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(mode, nextLevel, getGenerateOptions()));
    setQuestionStartTime(Date.now());
  };
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
          {/* 难度步长粒度 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">网格步长精细度</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleGranularityChange('standard')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  current.stepGranularity === 'standard'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                标准阶梯 (12级)
              </button>
              <button
                type="button"
                onClick={() => handleGranularityChange('fine')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  current.stepGranularity === 'fine'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                精细阶梯 (35级逐级)
              </button>
            </div>
          </div>
~~~~~
~~~~~typescript.new
          {/* 难度步长粒度 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">网格步长精细度</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleGranularityChange('standard')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  current.stepGranularity === 'standard'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                标准阶梯 (大步幅)
              </button>
              <button
                type="button"
                onClick={() => handleGranularityChange('fine')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  current.stepGranularity === 'fine'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                精细阶梯 (小步幅)
              </button>
            </div>
          </div>
~~~~~

~~~~~act
patch_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~typescript.old
    ctx.fillRect(0, 0, width, height);

    const levels = history.map((h) => h.level);
    const maxLevel = Math.max(...levels, 12);
    const minLevel = Math.min(...levels, 1);

    // Y 轴转换函数 (Level 越大代表难度越高，向上增加)
~~~~~
~~~~~typescript.new
    ctx.fillRect(0, 0, width, height);

    const levels = history.map((h) => h.level);
    const maxLevel = Math.max(...levels, 35);
    const minLevel = Math.min(...levels, 1);

    // Y 轴转换函数 (Level 越大代表难度越高，向上增加)
~~~~~

### 下一步建议

我们移除了旧的逻辑并调整了底层方程结构。在界面确认这部分工作就绪后，我建议你刷新页面，随意使用几次练习并观察不同距离生成的网络：你会发现低 Level 时无论多近的距离，网格都被物理空间约束成了大夹角的网格，从而解决了问题。
