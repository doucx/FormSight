import { describe, expect, it } from 'vitest';
import {
  computePeakLevel,
  computeStageLevels,
  decideFinishBranch,
  mapKeyToAction,
} from '../sessionDecisions';

/**
 * 会话决策回归（G1-17..19 / ADR 0007）
 *
 * 三条真实修复都只存在于 Hook/视图里，node 测试无法渲染；
 * 抽成纯函数后在此精确断言。
 */

const baseFinish = {
  sessionType: 'training' as const,
  totalTrials: 0,
  hasTargetLimitHandler: false,
  hasEarlyExitHandler: false,
  hasHistory: false,
  showSummaryModal: false,
};

describe('decideFinishBranch：退出分支 (0d2d6d0)', () => {
  it('计划训练（onEarlyExit 存在）优先早退，不弹单卡总结', () => {
    expect(
      decideFinishBranch({
        ...baseFinish,
        hasEarlyExitHandler: true,
        hasHistory: true,
        totalTrials: 3,
      }),
    ).toBe('early-exit');
  });

  it('单卡训练有历史时弹总结', () => {
    expect(decideFinishBranch({ ...baseFinish, hasHistory: true, totalTrials: 3 })).toBe('summary');
  });

  it('无历史且未达目标时直接退出', () => {
    expect(decideFinishBranch(baseFinish)).toBe('exit');
  });

  it('目标题量优先于早退与总结', () => {
    expect(
      decideFinishBranch({
        ...baseFinish,
        targetLimitTrials: 10,
        totalTrials: 10,
        hasTargetLimitHandler: true,
        hasEarlyExitHandler: true,
        hasHistory: true,
      }),
    ).toBe('target-limit');
  });

  it('沙盒始终直接退出', () => {
    expect(
      decideFinishBranch({
        ...baseFinish,
        sessionType: 'sandbox',
        hasHistory: true,
        hasEarlyExitHandler: true,
      }),
    ).toBe('exit');
  });

  it('总结已展示时再次请求退出不重复弹窗', () => {
    expect(decideFinishBranch({ ...baseFinish, hasHistory: true, showSummaryModal: true })).toBe(
      'exit',
    );
  });
});

describe('computeStageLevels：跳过阶段的层阶 (a909848)', () => {
  it('跳过阶段（history 为空）回落该阶段 initialLevel 而不是 5', () => {
    expect(computeStageLevels({ history: [], initialLevel: 12 })).toEqual({
      startLevel: 12,
      endLevel: 12,
    });
  });

  it('缺少 initialLevel 时才回落默认 5', () => {
    expect(computeStageLevels({ history: [] })).toEqual({ startLevel: 5, endLevel: 5 });
  });

  it('有历史时取首条 levelBefore 与末条 levelAfter', () => {
    expect(
      computeStageLevels({
        initialLevel: 8,
        history: [
          { levelBefore: 8, levelAfter: 11 },
          { levelBefore: 11, levelAfter: 14 },
        ],
      }),
    ).toEqual({ startLevel: 8, endLevel: 14 });
  });

  it('峰值取各阶段结束层阶最大值，跳过的阶段也参与', () => {
    expect(
      computePeakLevel([
        { history: [{ levelBefore: 5, levelAfter: 9 }], initialLevel: 5 },
        { history: [], initialLevel: 15 },
      ]),
    ).toBe(15);
  });

  it('空阶段列表回落默认 5', () => {
    expect(computePeakLevel([])).toBe(5);
  });
});

describe('mapKeyToAction：键位映射 (751b186)', () => {
  const baseKey = {
    key: '',
    code: '',
    isIdle: false,
    showAnswer: false,
    isFinished: false,
    isSandbox: false,
  };

  it('Escape 与退出按钮统一走 finish（请求结束）', () => {
    expect(mapKeyToAction({ ...baseKey, key: 'Escape', code: 'Escape' })).toBe('finish');
  });

  it('Space 在揭晓答案后前进', () => {
    expect(mapKeyToAction({ ...baseKey, key: ' ', code: 'Space', showAnswer: true })).toBe('next');
  });

  it('Space 未揭晓答案时不动作', () => {
    expect(mapKeyToAction({ ...baseKey, key: ' ', code: 'Space' })).toBe('none');
  });

  it('已结束时 Space 请求结束', () => {
    expect(
      mapKeyToAction({ ...baseKey, key: ' ', code: 'Space', showAnswer: true, isFinished: true }),
    ).toBe('finish');
  });

  it('闲置时任意键恢复', () => {
    expect(mapKeyToAction({ ...baseKey, key: 'a', code: 'KeyA', isIdle: true })).toBe('resume');
  });

  it('沙盒专属键位', () => {
    expect(mapKeyToAction({ ...baseKey, key: 'r', code: 'KeyR', isSandbox: true })).toBe(
      'regenerate',
    );
    expect(mapKeyToAction({ ...baseKey, key: '[', code: 'BracketLeft', isSandbox: true })).toBe(
      'adjust-down',
    );
    expect(mapKeyToAction({ ...baseKey, key: ']', code: 'BracketRight', isSandbox: true })).toBe(
      'adjust-up',
    );
    expect(mapKeyToAction({ ...baseKey, key: 'i', code: 'KeyI', isSandbox: true })).toBe(
      'inspector',
    );
  });

  it('非沙盒环境下沙盒键位不生效', () => {
    expect(mapKeyToAction({ ...baseKey, key: 'r', code: 'KeyR' })).toBe('none');
  });

  it('其他按键不动作', () => {
    expect(mapKeyToAction({ ...baseKey, key: 'a', code: 'KeyA' })).toBe('none');
  });
});
