/**
 * 基于当前等级 (1..maxLevel) 对最大与最小边界值执行指数衰减插值
 * @param maxVal Level 1 时的初始宽松值
 * @param minVal Level maxLevel 时的极限精细值
 * @param level 当前等级 (1..maxLevel)
 * @param maxLevel 最大等级，默认 35
 */
export function expDecayInterpolate(
  maxVal: number,
  minVal: number,
  level: number,
  maxLevel = 35,
): number {
  const clamped = Math.max(1, Math.min(maxLevel, level));
  const t = (clamped - 1) / (maxLevel - 1);
  return maxVal * (minVal / maxVal) ** t;
}

/**
 * 将真理项与干扰项组合并随机洗牌 (Fisher-Yates)，返回乱序数组与真理项索引
 */
export function createShuffledChoices<T>(
  targetItem: T,
  distractors: T[],
): { options: T[]; correctIndex: number } {
  const rawOptions = [targetItem, ...distractors];
  const indexed = rawOptions.map((opt, i) => ({ opt, isTarget: i === 0 }));

  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }

  return {
    options: indexed.map((item) => item.opt),
    correctIndex: indexed.findIndex((item) => item.isTarget),
  };
}
