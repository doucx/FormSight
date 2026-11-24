/**
 * 会话决策纯函数（ADR 0007）
 *
 * 退出分支、总结层阶与键位映射是对外可观察行为，抽成纯函数后可在 node 环境确定性覆盖；
 * Hook 只负责副作用与状态绑定，禁止在 Hook 内新增未覆盖的分支。
 */

export type SessionType = 'training' | 'benchmark' | 'sandbox';

export type FinishBranch = 'exit' | 'target-limit' | 'early-exit' | 'summary';

export interface FinishDecisionInput {
  sessionType: SessionType;
  targetLimitTrials?: number;
  totalTrials: number;
  hasTargetLimitHandler: boolean;
  hasEarlyExitHandler: boolean;
  hasHistory: boolean;
  showSummaryModal: boolean;
}

/**
 * 返回按钮 / Esc 的退出分支。
 *
 * 优先级：沙盒直退 → 达到目标题量 → 计划训练早退 → 单卡总结 → 直接退出。
 * 计划训练（存在 onEarlyExit）不得走单卡总结分支（0d2d6d0）。
 */
export function decideFinishBranch(input: FinishDecisionInput): FinishBranch {
  if (input.sessionType === 'sandbox') return 'exit';

  if (
    input.targetLimitTrials &&
    input.totalTrials >= input.targetLimitTrials &&
    input.hasTargetLimitHandler
  ) {
    return 'target-limit';
  }

  if (input.hasEarlyExitHandler) return 'early-exit';

  if (input.hasHistory && !input.showSummaryModal) return 'summary';

  return 'exit';
}

export interface StageHistoryItem {
  levelBefore: number;
  levelAfter: number;
}

export interface StageLevelInput {
  history: StageHistoryItem[];
  initialLevel?: number;
}

export interface StageLevels {
  startLevel: number;
  endLevel: number;
}

/**
 * 单个阶段的起止层阶。
 *
 * 跳过阶段（history 为空）必须回落到该阶段加载时的 initialLevel，
 * 而不是写死的 5（a909848）。
 */
export function computeStageLevels(stage: StageLevelInput, fallbackLevel = 5): StageLevels {
  const fallback = stage.initialLevel ?? fallbackLevel;
  if (stage.history.length === 0) {
    return { startLevel: fallback, endLevel: fallback };
  }

  return {
    startLevel: stage.history[0].levelBefore,
    endLevel: stage.history[stage.history.length - 1].levelAfter,
  };
}

/** 总结页的峰值层阶：各阶段结束层阶的最大值。 */
export function computePeakLevel(stages: StageLevelInput[], fallbackLevel = 5): number {
  if (stages.length === 0) return fallbackLevel;
  return Math.max(...stages.map((stage) => computeStageLevels(stage, fallbackLevel).endLevel));
}

export type KeyAction =
  | 'none'
  | 'resume'
  | 'regenerate'
  | 'adjust-down'
  | 'adjust-up'
  | 'inspector'
  | 'next'
  | 'finish';

export interface KeyActionInput {
  key: string;
  code: string;
  isIdle: boolean;
  showAnswer: boolean;
  isFinished: boolean;
  isSandbox: boolean;
}

/**
 * 键位到动作的唯一映射。
 *
 * Escape 与退出按钮必须走同一个 finish（请求结束）动作（751b186）；
 * Space 在揭晓答案后前进，已结束时改为请求结束。
 */
export function mapKeyToAction(input: KeyActionInput): KeyAction {
  if (input.isIdle) return 'resume';

  if (input.isSandbox) {
    if (input.key === 'r' || input.key === 'R') return 'regenerate';
    if (input.key === '[') return 'adjust-down';
    if (input.key === ']') return 'adjust-up';
    if (input.key === 'i' || input.key === 'I') return 'inspector';
  }

  if (input.code === 'Space' || input.key === ' ') {
    if (!input.showAnswer) return 'none';
    return input.isFinished ? 'finish' : 'next';
  }

  if (input.code === 'Escape' || input.key === 'Escape') return 'finish';

  return 'none';
}
