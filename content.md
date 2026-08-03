经过对代码的审查，**目前基准测试（Benchmark）尚未强制使用 3U1D 阶梯算子**。此前在 `TrainingView.tsx` 中初始化 `AdaptiveEngine` 时，直接透传了用户设置的 `settings.adaptiveMode`（这可能为 `block` 轮次胜率评估模式或 `staircase` 模式）。

我现在将生成 Plan 强制基准测试（`sessionType === 'benchmark'`）使用 `staircase`（经典 3U1D 阶梯）算子。

## [WIP] refactor: 强制基准测试使用 3U1D 阶梯自适应算子

### 用户需求
确定基准测试当前是否使用了 3U1D 阶梯算法；若否，则强制基准测试会话使用 3U1D 阶梯算子。

### 评论
基准测试（20 题测试）旨在快速精细拟合出用户的临界认知阈值，经典 3-Up / 1-Down (3U1D) 心理物理学阶梯法（Staircase Procedure）是此类标准测试的最佳基准算法。将其强制生效能够保障基准测试评估标准的唯一性与严谨性。

### 目标
修改 `src/views/TrainingView.tsx`，在初始化 `AdaptiveEngine` 时增加条件判断：当 `sessionType === 'benchmark'` 时，强制使用 `'staircase'` 算子模式，忽略配置中的 `'block'` 轮次评估模式。

### 基本原理
在 `TrainingView` 中，自适应引擎 `AdaptiveEngine` 在组件挂载时通过 `useRef` 初始化。通过将传给引擎的 `adaptiveMode` 参数设为 `sessionType === 'benchmark' ? 'staircase' : settings.adaptiveMode`，可以在不改动常规自适应训练配置的前提下，确保所有基准测试都统一运行在 3U1D 阶梯算法之下。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/executor #scope/core #ai/instruct #task/domain/algorithm #task/object/benchmark-staircase #task/action/enforce #task/state/begin

---

### Script

#### Acts 1: 修改 `src/views/TrainingView.tsx` 强制基准测试使用 3U1D 阶梯

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~ts.old
export function TrainingView({
  mode,
  sessionType,
  initialGridStep,
  settings,
  onExit,
}: TrainingViewProps) {
  // === 会话状态 ===
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  const startTimeRef = useRef<number>(Date.now());
  const adaptiveEngineRef = useRef<AdaptiveEngine>(
    new AdaptiveEngine(
      initialGridStep,
      settings.stepGranularity === 'fine',
      settings.adaptiveMode,
      settings.targetAccuracy,
      settings.blockSize
    )
  );
~~~~~
~~~~~ts.new
export function TrainingView({
  mode,
  sessionType,
  initialGridStep,
  settings,
  onExit,
}: TrainingViewProps) {
  // === 会话状态 ===
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  const startTimeRef = useRef<number>(Date.now());
  const adaptiveEngineRef = useRef<AdaptiveEngine>(
    new AdaptiveEngine(
      initialGridStep,
      settings.stepGranularity === 'fine',
      sessionType === 'benchmark' ? 'staircase' : settings.adaptiveMode,
      settings.targetAccuracy,
      settings.blockSize
    )
  );
~~~~~

### 下一步建议
1. 进入项目并开启 20 题基准测试，验证在连续答对 3 题或答错 1 题时，难度网格步长是否严格按照 3U1D 规则升降阶梯。
2. 可在基准测试的顶栏或界面说明中加上“(3U1D 阶梯)”的文案提示，使用户明确当前所处的评估算法。
