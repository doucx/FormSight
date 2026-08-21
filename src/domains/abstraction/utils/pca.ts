import type { Point } from '../../../types';
import { ABSTRACTION_CANVAS_SIZE } from './types';

/**
 * 计算点集的 PCA 第一主成分角度 (0..180°)
 */
export function calcPCAOrientation(points: Point[]): number {
  const n = points.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  const cx = sumX / n;
  const cy = sumY / n;

  let covXX = 0;
  let covYY = 0;
  let covXY = 0;
  for (const p of points) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    covXX += dx * dx;
    covYY += dy * dy;
    covXY += dx * dy;
  }

  // 求解 2x2 协方差矩阵的最大特征向量方向
  const theta = 0.5 * Math.atan2(2 * covXY, covXX - covYY);
  let deg = (theta * 180) / Math.PI;
  deg = ((deg % 180) + 180) % 180;
  return Math.round(deg * 10) / 10;
}

/**
 * 生成带方向性与背景各向同性噪点的散点流
 */
export function generateFlowParticlesWithClutter(
  angleDeg: number,
  spreadRatio: number,
  clutterRatio = 0,
  size = ABSTRACTION_CANVAS_SIZE,
): Point[] {
  const rad = (angleDeg * Math.PI) / 180;
  const count = 45 + Math.floor(Math.random() * 20);
  const cx = size / 2;
  const cy = size / 2;
  const majorLen = size * 0.38;
  const minorLen = majorLen * spreadRatio;

  const points: Point[] = [];
  const clutterCount = Math.floor(count * clutterRatio);
  const flowCount = count - clutterCount;

  // 主流动势粒子
  for (let i = 0; i < flowCount; i++) {
    const u = (Math.random() * 2 - 1) * majorLen;
    const v = (Math.random() * 2 - 1) * minorLen;

    const x = Math.round(cx + u * Math.cos(rad) - v * Math.sin(rad));
    const y = Math.round(cy + u * Math.sin(rad) + v * Math.cos(rad));
    points.push({
      x: Math.max(15, Math.min(size - 15, x)),
      y: Math.max(15, Math.min(size - 15, y)),
    });
  }

  // 背景各向同性杂质噪点 (破除简单外轮廓一眼看穿)
  for (let i = 0; i < clutterCount; i++) {
    const r = Math.sqrt(Math.random()) * majorLen * 0.95;
    const theta = Math.random() * Math.PI * 2;
    const x = Math.round(cx + r * Math.cos(theta));
    const y = Math.round(cy + r * Math.sin(theta));
    points.push({
      x: Math.max(15, Math.min(size - 15, x)),
      y: Math.max(15, Math.min(size - 15, y)),
    });
  }

  return points;
}

export function generateFlowParticles(
  angleDeg: number,
  spreadRatio: number,
  size = ABSTRACTION_CANVAS_SIZE,
): Point[] {
  return generateFlowParticlesWithClutter(angleDeg, spreadRatio, 0, size);
}
