import type { AdaptiveMode } from '../../storage/settings';

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
  private step: number;

  private consecutiveCorrect = 0;
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

  public getCurrentLevel(): number {
    return this.currentLevel;
  }

  public getBlockProgress(): AdaptiveProgress | null {
    if (this.mode !== 'block') return null;
    const hits = this.blockHistory.filter(Boolean).length;
    return {
      current: this.blockHistory.length,
      total: this.blockSize,
      hits,
    };
  }

  public recordResult(isHit: boolean): RecordResultOutput {
    if (this.mode === 'staircase') {
      return this.recordStaircase(isHit);
    }
    return this.recordBlock(isHit);
  }

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

  private recordBlock(isHit: boolean): RecordResultOutput {
    this.blockHistory.push(isHit);
    const count = this.blockHistory.length;
    const hits = this.blockHistory.filter(Boolean).length;

    if (count < this.blockSize) {
      return {
        newLevel: this.getCurrentLevel(),
        change: 'same',
        isBlockComplete: false,
        progress: { current: count, total: this.blockSize, hits },
      };
    }

    const accuracy = hits / this.blockSize;
    let change: AdaptiveChange = 'same';

    if (accuracy >= this.targetAccuracy) {
      if (this.currentLevel < this.maxLevel) {
        this.currentLevel = Math.min(this.maxLevel, this.currentLevel + this.step);
        change = 'up';
      }
    } else if (accuracy < 0.5) {
      if (this.currentLevel > 1) {
        this.currentLevel = Math.max(1, this.currentLevel - this.step);
        change = 'down';
      }
    }

    this.blockHistory = [];

    return {
      newLevel: this.getCurrentLevel(),
      change,
      isBlockComplete: true,
      progress: { current: 0, total: this.blockSize, hits: 0 },
    };
  }

  public setLevel(level: number): void {
    this.currentLevel = Math.max(1, Math.min(level, this.maxLevel));
    this.consecutiveCorrect = 0;
    this.blockHistory = [];
  }
}
