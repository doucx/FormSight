import type { AdaptiveMode } from './settings';

/**
 * 标准网格步长难度序列（单位：px）
 */
export const STANDARD_STEP_SEQUENCE = [35, 30, 25, 20, 16, 13, 10, 8, 6, 5, 4, 3];

/**
 * 1px 精细步长难度序列 (35px -> 1px)
 */
export const FINE_STEP_SEQUENCE = Array.from({ length: 35 }, (_, i) => 35 - i);

export type AdaptiveChange = 'up' | 'down' | 'same';

export interface AdaptiveProgress {
  current: number;
  total: number;
  hits: number;
}

export interface RecordResultOutput {
  newStep: number;
  change: AdaptiveChange;
  isBlockComplete?: boolean;
  progress?: AdaptiveProgress;
}

export class AdaptiveEngine {
  private stepSequence: number[];
  private currentStepIndex: number;
  private mode: AdaptiveMode;
  private targetAccuracy: number;
  private blockSize: number;

  // 经典 3U1D 状态
  private consecutiveCorrect = 0;

  // 轮次胜率评估状态
  private blockHistory: boolean[] = [];

  constructor(
    initialGridStep = 20,
    isFineGranularity = false,
    mode: AdaptiveMode = 'block',
    targetAccuracy = 0.8,
    blockSize = 10,
  ) {
    this.stepSequence = isFineGranularity ? FINE_STEP_SEQUENCE : STANDARD_STEP_SEQUENCE;
    this.mode = mode;
    this.targetAccuracy = targetAccuracy;
    this.blockSize = blockSize;

    // 找到与 initialGridStep 最接近的索引
    let closestIdx = 0;
    let minDiff = Math.abs(this.stepSequence[0] - initialGridStep);
    for (let i = 1; i < this.stepSequence.length; i++) {
      const diff = Math.abs(this.stepSequence[i] - initialGridStep);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    this.currentStepIndex = closestIdx;
  }

  /**
   * 获取当前难度的 GridStep 像素值
   */
  public getCurrentStep(): number {
    return this.stepSequence[this.currentStepIndex];
  }

  /**
   * 获取当前轮次进度（仅在 block 模式下有效）
   */
  public getBlockProgress(): AdaptiveProgress | null {
    if (this.mode !== 'block') return null;
    const hits = this.blockHistory.filter(Boolean).length;
    return {
      current: this.blockHistory.length,
      total: this.blockSize,
      hits,
    };
  }

  /**
   * 记录做答结果并计算下一题难度
   * @param isHit 本题是否击中目标
   */
  public recordResult(isHit: boolean): RecordResultOutput {
    if (this.mode === 'staircase') {
      return this.recordStaircase(isHit);
    }
    return this.recordBlock(isHit);
  }

  /**
   * 经典 3-Up / 1-Down 算子
   */
  private recordStaircase(isHit: boolean): RecordResultOutput {
    if (isHit) {
      this.consecutiveCorrect += 1;
      if (this.consecutiveCorrect >= 3) {
        this.consecutiveCorrect = 0;
        if (this.currentStepIndex < this.stepSequence.length - 1) {
          this.currentStepIndex += 1;
          return { newStep: this.getCurrentStep(), change: 'up' };
        }
      }
    } else {
      this.consecutiveCorrect = 0;
      if (this.currentStepIndex > 0) {
        this.currentStepIndex -= 1;
        return { newStep: this.getCurrentStep(), change: 'down' };
      }
    }

    return { newStep: this.getCurrentStep(), change: 'same' };
  }

  /**
   * 轮次胜率评估算子 (Block Master Engine)
   */
  private recordBlock(isHit: boolean): RecordResultOutput {
    this.blockHistory.push(isHit);
    const count = this.blockHistory.length;
    const hits = this.blockHistory.filter(Boolean).length;

    // 尚未做满一个评估轮次
    if (count < this.blockSize) {
      return {
        newStep: this.getCurrentStep(),
        change: 'same',
        isBlockComplete: false,
        progress: { current: count, total: this.blockSize, hits },
      };
    }

    // 做满了一轮，计算胜率
    const accuracy = hits / this.blockSize;
    let change: AdaptiveChange = 'same';

    if (accuracy >= this.targetAccuracy) {
      // 达到或超过目标正确率 -> 通关升级
      if (this.currentStepIndex < this.stepSequence.length - 1) {
        this.currentStepIndex += 1;
        change = 'up';
      }
    } else if (accuracy < 0.5) {
      // 正确率低于 50% -> 难度太高，降级
      if (this.currentStepIndex > 0) {
        this.currentStepIndex -= 1;
        change = 'down';
      }
    }
    // 正确率在 [50%, targetAccuracy) 之间 -> 保持本层，巩固练习

    // 清空轮次历史，开始下一轮
    this.blockHistory = [];

    return {
      newStep: this.getCurrentStep(),
      change,
      isBlockComplete: true,
      progress: { current: 0, total: this.blockSize, hits: 0 },
    };
  }

  /**
   * 强制重置难度索引
   */
  public setGridStep(step: number): void {
    const idx = this.stepSequence.indexOf(step);
    if (idx !== -1) {
      this.currentStepIndex = idx;
      this.consecutiveCorrect = 0;
      this.blockHistory = [];
    }
  }
}
