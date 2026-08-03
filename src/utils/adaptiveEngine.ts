/**
 * 标准网格步长难度序列（单位：px）
 */
export const STANDARD_STEP_SEQUENCE = [35, 30, 25, 20, 16, 13, 10, 8, 6, 5, 4, 3];

/**
 * 1px 精细步长难度序列 (35px -> 1px)
 */
export const FINE_STEP_SEQUENCE = Array.from({ length: 35 }, (_, i) => 35 - i);

export type AdaptiveChange = 'up' | 'down' | 'same';

export class AdaptiveEngine {
  private stepSequence: number[];
  private currentStepIndex: number;
  private consecutiveCorrect: number = 0;

  constructor(initialGridStep: number = 20, isFineGranularity: boolean = false) {
    this.stepSequence = isFineGranularity ? FINE_STEP_SEQUENCE : STANDARD_STEP_SEQUENCE;
    
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
   * 核心 3-Up / 1-Down 阶梯算子
   * @param isHit 本题是否击中目标
   * @returns 新步长与变化状态 ('up': 难度提升, 'down': 难度降低, 'same': 难度不变)
   */
  public recordResult(isHit: boolean): { newStep: number; change: AdaptiveChange } {
    if (isHit) {
      this.consecutiveCorrect += 1;
      // 连续答对 3 题 -> 增加难度 (降低 GridStep 步长)
      if (this.consecutiveCorrect >= 3) {
        this.consecutiveCorrect = 0;
        if (this.currentStepIndex < this.stepSequence.length - 1) {
          this.currentStepIndex += 1;
          return { newStep: this.getCurrentStep(), change: 'up' };
        }
      }
    } else {
      // 答错 1 题 -> 重置计数并立刻降低难度 (增大 GridStep 步长)
      this.consecutiveCorrect = 0;
      if (this.currentStepIndex > 0) {
        this.currentStepIndex -= 1;
        return { newStep: this.getCurrentStep(), change: 'down' };
      }
    }

    return { newStep: this.getCurrentStep(), change: 'same' };
  }

  /**
   * 强制重置难度索引
   */
  public setGridStep(step: number): void {
    const idx = this.stepSequence.indexOf(step);
    if (idx !== -1) {
      this.currentStepIndex = idx;
      this.consecutiveCorrect = 0;
    }
  }
}