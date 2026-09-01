import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import type { HitResult, QuestionData } from '../types';

export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 140;

/**
 * 确定性伪随机数生成器 (SplitMix32)
 */
function splitmix32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x9e3779b9) | 0;
    let t = s ^ (s >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

/**
 * 中点位移递归生成器 (Midpoint Displacement with Hurst Exponent)
 */
function displace(
  p1: Point,
  p2: Point,
  depth: number,
  displaceAmount: number,
  rnd: () => number,
  H: number,
): Point[] {
  if (depth === 0) return [];

  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const offset = (rnd() - 0.5) * 2 * displaceAmount;
  const newPoint: Point = {
    x: Math.round(midX * 100) / 100,
    y: Math.round((midY + offset) * 100) / 100,
  };

  const nextAmount = displaceAmount * 2 ** -H;

  return [
    ...displace(p1, newPoint, depth - 1, nextAmount, rnd, H),
    newPoint,
    ...displace(newPoint, p2, depth - 1, nextAmount, rnd, H),
  ];
}

/**
 * 根据 Hurst 指数与 Seed 生成完整分形折线坐标数组
 */
export function generateFractalLine(
  H: number,
  seed: number,
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
): Point[] {
  const rnd = splitmix32(seed);
  const start: Point = { x: 24, y: height / 2 };
  const end: Point = { x: width - 24, y: height / 2 };
  const maxDepth = 8; // 256 分段，保证高频细节质感充沛
  const baseDisplacement = height * 0.38;

  const midPoints = displace(start, end, maxDepth, baseDisplacement, rnd, H);
  return [start, ...midPoints, end];
}

/**
 * 根据 Hurst 计算频段索引 (0: 高碎裂, 1: 中度纹理, 2: 平滑流线)
 */
export function getRoughnessSectorIdx(H: number): number {
  if (H < 0.4) return 0;
  if (H < 0.7) return 1;
  return 2;
}

/**
 * 训练题目生成器
 */
export function generateQuestion(difficultyLevel: number): QuestionData {
  const id = `fer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, difficultyLevel));

  // 目标 H 范围 [0.15, 0.90]，保留 2 位小数
  const targetH = Math.round((0.15 + Math.random() * 0.75) * 100) / 100;
  const targetSeed = Math.floor(Math.random() * 100000);
  const userSeed = targetSeed + 107; // 种子完全独立，杜绝大形匹配作弊

  // 容错从 Level 1 的 ±0.15 指数衰减至 Level 35 的 ±0.025
  const tolerance = Math.round(expDecayInterpolate(0.15, 0.025, clampedLevel) * 1000) / 1000;
  const sectorIdx = getRoughnessSectorIdx(targetH);

  return {
    id,
    difficultyLevel: clampedLevel,
    targetH,
    targetSeed,
    userSeed,
    tolerance,
    sectorIdx,
  };
}

/**
 * 答题结果评估
 */
export function evaluateAnswer(userH: number, question: QuestionData): HitResult {
  const errorValue = Math.abs(userH - question.targetH);
  const signedBias = userH - question.targetH;
  const isHit = errorValue <= question.tolerance;

  return {
    isHit,
    userH: Math.round(userH * 100) / 100,
    targetH: question.targetH,
    errorValue: Math.round(errorValue * 1000) / 1000,
    signedBias: Math.round(signedBias * 1000) / 1000,
    tolerance: question.tolerance,
  };
}