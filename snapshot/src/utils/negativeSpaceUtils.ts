import type { Point } from '../types';

export type NegativeSpaceMode = 'RATIO_ESTIMATION';

export const NEGATIVE_SPACE_CANVAS_SIZE = 400;

export interface NegativeSpaceQuestionData {
  id: string;
  mode: NegativeSpaceMode;
  difficultyLevel: number;
  vertices: Point[]; // 正形多边形顶点序列
  canvasArea: number; // 画布总面积 (400 * 400 = 160000)
  positiveArea: number; // 正形多边形面积
  negativeArea: number; // 负形面积
  targetNegativeRatio: number; // 负形占总面积百分比 (0~100)
  tolerance: number; // 允许的绝对百分比误差 (例如 ±5.0%)
}

export interface NegativeSpaceHitResult {
  isHit: boolean;
  userRatio: number;
  targetRatio: number;
  errorValue: number; // |userRatio - targetRatio|
  tolerance: number;
}

/**
 * 经典鞋带公式 (Shoelace Formula) 计算简单多边形面积
 */
export function calcPolygonArea(vertices: Point[]): number {
  const n = vertices.length;
  if (n < 3) return 0;

  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * 根据 Level (1..35) 计算允许的占比容错阈值 (百分比 Δ%)
 * Level 1: ±10.0%, Level 35: ±1.2%
 */
export function getNegativeSpaceToleranceForLevel(level: number): number {
  const clamped = Math.max(1, Math.min(35, level));
  const t = (clamped - 1) / 34; // 0..1
  const maxTol = 10.0;
  const minTol = 1.2;
  return Math.round(maxTol * (minTol / maxTol) ** t * 10) / 10;
}

/**
 * 随机生成不自交的不规则正形多边形
 */
export function generateRandomPolygon(level: number): Point[] {
  const clamped = Math.max(1, Math.min(35, level));
  const t = (clamped - 1) / 34;

  // 顶点数量：Level 1 为 3~4，Level 35 为 7~11
  const minVerts = 3 + Math.floor(t * 4);
  const maxVerts = 4 + Math.floor(t * 7);
  const vertexCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

  const cx = NEGATIVE_SPACE_CANVAS_SIZE / 2 + (Math.random() - 0.5) * 40;
  const cy = NEGATIVE_SPACE_CANVAS_SIZE / 2 + (Math.random() - 0.5) * 40;

  // 基础半径与扰动率
  const baseRadius = 80 + Math.random() * 60; // 80..140
  const irregularity = 0.2 + t * 0.55; // 0.2..0.75 凹凸度

  // 极角切分并随机抖动
  const angles: number[] = [];
  const angleStep = (Math.PI * 2) / vertexCount;
  for (let i = 0; i < vertexCount; i++) {
    const rawA = i * angleStep + (Math.random() - 0.5) * angleStep * 0.7;
    angles.push((rawA + Math.PI * 2) % (Math.PI * 2));
  }
  angles.sort((a, b) => a - b);

  const vertices: Point[] = [];
  for (const a of angles) {
    const rJitter = 1 + (Math.random() * 2 - 1) * irregularity;
    const r = Math.max(25, Math.min(185, baseRadius * rJitter));
    const x = Math.round(Math.max(10, Math.min(NEGATIVE_SPACE_CANVAS_SIZE - 10, cx + r * Math.cos(a))));
    const y = Math.round(Math.max(10, Math.min(NEGATIVE_SPACE_CANVAS_SIZE - 10, cy + r * Math.sin(a))));
    vertices.push({ x, y });
  }

  return vertices;
}

/**
 * 生成负形空间练习题目
 */
export function generateNegativeSpaceQuestion(
  mode: NegativeSpaceMode = 'RATIO_ESTIMATION',
  level: number,
): NegativeSpaceQuestionData {
  const id = `nsq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getNegativeSpaceToleranceForLevel(clampedLevel);
  const canvasArea = NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE;

  let vertices = generateRandomPolygon(clampedLevel);
  let posArea = calcPolygonArea(vertices);

  // 保证正形占据一定比例 (20% ~ 80%)，避免极端不可辨识情况
  let attempts = 0;
  while ((posArea / canvasArea < 0.15 || posArea / canvasArea > 0.8) && attempts < 10) {
    attempts++;
    vertices = generateRandomPolygon(clampedLevel);
    posArea = calcPolygonArea(vertices);
  }

  const negArea = canvasArea - posArea;
  const targetNegativeRatio = Math.round((negArea / canvasArea) * 1000) / 10; // 保留一位小数

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    vertices,
    canvasArea,
    positiveArea: Math.round(posArea),
    negativeArea: Math.round(negArea),
    targetNegativeRatio,
    tolerance,
  };
}

/**
 * 答题结果检测与评估
 */
export function checkNegativeSpaceHit(
  userRatio: number,
  question: NegativeSpaceQuestionData,
): NegativeSpaceHitResult {
  const targetRatio = question.targetNegativeRatio;
  const errorValue = Math.round(Math.abs(userRatio - targetRatio) * 10) / 10;
  const isHit = errorValue <= question.tolerance;

  return {
    isHit,
    userRatio,
    targetRatio,
    errorValue,
    tolerance: question.tolerance,
  };
}