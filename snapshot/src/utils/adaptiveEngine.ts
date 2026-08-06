import type { AdaptiveMode } from './settings';

/**
 * 难度序列与最大层阶配置
 * Level 1 最简单，Level 越高难度越大
 */
export const MAX_LEVEL = 35;

export type AdaptiveChange = 'up' | 'down' | 'same';

export interface AdaptiveProgress {
  current: number;
  total: number;
  hits: number;
}

export interface RecordResultOutput {
  newLevel: number;
  change: AdaptiveChange;
  isBlockComplete?: boolean;
  progress?: AdaptiveProgress;
}

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

  /**
   * 获取当前难度等级 Level (1..maxLevel)
   */
  public getCurrentLevel(): number {
    return this.currentLevel;
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
   * 记录做答结果并计算下一题难度 Level
   * @param isHit 本题是否击中目标
   */
  public recordResult(isHit: boolean): RecordResultOutput {
    if (this.mode === 'staircase') {
      return this.recordStaircase(isHit);
    }
    return this.recordBlock(isHit);
  }

  /**
   * 经典 3-Up / 1-Down 算子 (升级 = Level + 1)
   */
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
        newLevel: this.getCurrentLevel(),
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

    // 清空轮次历史，开始下一轮
    this.blockHistory = [];

    return {
      newLevel: this.getCurrentLevel(),
      change,
      isBlockComplete: true,
      progress: { current: 0, total: this.blockSize, hits: 0 },
    };
  }

  /**
   * 强制重置难度等级
   */
  public setLevel(level: number): void {
    this.currentLevel = Math.max(1, Math.min(level, this.maxLevel));
    this.consecutiveCorrect = 0;
    this.blockHistory = [];
  }
}
