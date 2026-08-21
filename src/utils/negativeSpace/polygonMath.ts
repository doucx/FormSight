import type { Point } from '../../types';
import { expDecayInterpolate } from '../mathUtils';
import { NEGATIVE_SPACE_CANVAS_SIZE, TWO_AFC_CANVAS_SIZE } from './types';

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
 */
export function getNegativeSpaceToleranceForLevel(level: number): number {
  return Math.round(expDecayInterpolate(10.0, 1.2, level) * 10) / 10;
}

/**
 * 根据 Level (1..35) 计算 2AFC 负形面积相对差异率 delta
 */
export function get2AfcdeltaForLevel(level: number): number {
  return expDecayInterpolate(0.35, 0.02, level);
}

/**
 * 计算多边形质心
 */
export function calcPolygonCentroid(vertices: Point[]): Point {
  let cx = 0;
  let cy = 0;
  for (const p of vertices) {
    cx += p.x;
    cy += p.y;
  }
  return { x: cx / vertices.length, y: cy / vertices.length };
}

/**
 * 随机生成不自交的不规则正形多边形
 */
export function generateRandomPolygon(
  level: number,
  canvasSize = NEGATIVE_SPACE_CANVAS_SIZE,
): Point[] {
  const clamped = Math.max(1, Math.min(35, level));
  const t = (clamped - 1) / 34;

  const minVerts = 4 + Math.floor(t * 2);
  const maxVerts = 4 + Math.floor(t * 4);
  const vertexCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

  const cx = canvasSize / 2 + (Math.random() - 0.5) * (canvasSize * 0.1);
  const cy = canvasSize / 2 + (Math.random() - 0.5) * (canvasSize * 0.1);

  const baseRadius = canvasSize * 0.28 + Math.random() * (canvasSize * 0.1);
  const irregularity = 0.2 + t * 0.45;

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
    const r = Math.max(canvasSize * 0.1, Math.min(canvasSize * 0.42, baseRadius * rJitter));
    const x = Math.round(Math.max(15, Math.min(canvasSize - 15, cx + r * Math.cos(a))));
    const y = Math.round(Math.max(15, Math.min(canvasSize - 15, cy + r * Math.sin(a))));
    vertices.push({ x, y });
  }

  return vertices;
}

/**
 * 将任意多边形围绕质心缩放，使其面积精准等于 targetArea
 */
export function scalePolygonToArea(
  vertices: Point[],
  targetArea: number,
  canvasSize = TWO_AFC_CANVAS_SIZE,
): Point[] {
  const currentArea = calcPolygonArea(vertices);
  if (currentArea <= 0) return vertices;

  const k = Math.sqrt(targetArea / currentArea);
  const centroid = calcPolygonCentroid(vertices);
  const canvasCenter = canvasSize / 2;

  return vertices.map((p) => {
    const scaledX = centroid.x + (p.x - centroid.x) * k;
    const scaledY = centroid.y + (p.y - centroid.y) * k;
    const centeredX = scaledX - centroid.x + canvasCenter;
    const centeredY = scaledY - centroid.y + canvasCenter;
    return {
      x: Math.round(Math.max(6, Math.min(canvasSize - 6, centeredX))),
      y: Math.round(Math.max(6, Math.min(canvasSize - 6, centeredY))),
    };
  });
}

/**
 * 对多边形顶点施加微小扰动生成高相似干扰项
 */
export function perturbPolygon(
  baseVertices: Point[],
  level: number,
  canvasSize = NEGATIVE_SPACE_CANVAS_SIZE,
): Point[] {
  const clamped = Math.max(1, Math.min(35, level));
  const t = (clamped - 1) / 34;
  const maxPerturb = 36;
  const minPerturb = 6;
  const perturbAmount = maxPerturb * (minPerturb / maxPerturb) ** t;

  return baseVertices.map((p) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * perturbAmount + 2;
    const x = Math.max(15, Math.min(canvasSize - 15, Math.round(p.x + Math.cos(angle) * dist)));
    const y = Math.max(15, Math.min(canvasSize - 15, Math.round(p.y + Math.sin(angle) * dist)));
    return { x, y };
  });
}
