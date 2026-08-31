我们现在开始执行 **Star 领域**的完全解耦与卡片化重构：

1. 在 `src/core/geometry/pointGrid.ts` 中导出 `findNearestGridPoint` 别名，并将 `PointClickCanvas.tsx` 依赖指向核心几何库，解开对 Star 的倒挂依赖。
2. 创建 `src/modules/star/_shared/` 统一提取点阵几何与八向分析共享模块。
3. 创建 3 张高内聚的自包含卡片：
   - `src/modules/star/SingleAnchorCard/` (`star_single`)
   - `src/modules/star/HorizontalDoubleCard/` (`star_double_h`)
   - `src/modules/star/RotatedDoubleCard/` (`star_double_r`)
4. 移除旧的 `src/packs/star/` 目录。

## [WIP] refactor: 将 star 模块全面解耦重构为独立 CardManifest

### 用户需求
1. 解耦 `PointClickCanvas.tsx` 中对 `packs/star` 的倒挂导入，统一使用 `core/geometry/pointGrid`。
2. 将 `star` 领域的三个模式（单锚点、水平双锚点、旋转双锚点）独立拆解为自闭合的 `CardManifest` 目录。
3. 共享几何与罗盘分析逻辑收敛至 `src/modules/star/_shared/`。
4. 彻底消除旧 `star` 包的统一大 switch 分发。

### 评论
Star 领域是纯几何空间定位的代表性模块。将其从原本的单一包解构为 3 张独立的 `CardManifest`，不仅完全解开了 `PointClickCanvas` 历史依赖包的倒挂问题，还跑通了“以卡为核，按域收纳”的新架构范式。

### 目标
1. `PointClickCanvas.tsx` 切换至核心几何库，不再依赖任何具体业务模块。
2. 建立 `src/modules/star/` 及其 `_shared` 和 3 个独立卡片子目录。
3. 删除旧版 `src/packs/star/` 目录。

### 基本原理
1. **解除反向依赖**：通用的 `PointClickCanvas` 交互组件应当依赖 `core/geometry` 中的纯几何算法，而不应依赖具体某个业务 pack。
2. **卡片内聚闭环**：单锚点与双锚点的题干生成与视图逻辑完全独立，各自声明自身的 `CardManifest`，由 Vite 自动注册中心自动装配。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #ai/instruct #task/domain/architecture #task/object/star-module #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 升级 `src/core/geometry/pointGrid.ts` 并更新 `PointClickCanvas.tsx`

在 `pointGrid.ts` 中导出 `findNearestGridPoint` 别名，并精确替换 `PointClickCanvas.tsx` 的导入。

~~~~~act
patch_file
src/core/geometry/pointGrid.ts
~~~~~
~~~~~typescript
  return {
    nearestPoint,
    minDistance,
    isWithinRange: minDistance <= maxRadius,
  };
}

export interface PointHitDetectionResult {
~~~~~
~~~~~typescript
  return {
    nearestPoint,
    minDistance,
    isWithinRange: minDistance <= maxRadius,
  };
}

/** 兼容别名导出 */
export const findNearestGridPoint = findNearestPointInGrid;

export interface PointHitDetectionResult {
~~~~~

~~~~~act
patch_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { renderInteractivePointGrid } from '../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { useTranslation } from '../../core/i18n';
import { findNearestGridPoint } from '../../packs/star/utils/hitDetection';
import type { Point } from '../../types';
import { CANVAS_THEME } from '../../utils/theme';
~~~~~
~~~~~typescript
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { renderInteractivePointGrid } from '../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { findNearestGridPoint } from '../../core/geometry/pointGrid';
import { useTranslation } from '../../core/i18n';
import type { Point } from '../../types';
import { CANVAS_THEME } from '../../utils/theme';
~~~~~

#### Acts 2: 建立 `src/modules/star/_shared/` 公共库

我们将提取几何运算、点阵生成、判定逻辑、配置项、八向分析与多语言到 `_shared`。

~~~~~act
write_file
src/modules/star/_shared/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../../types';

export const CANVAS_SIZE = 500;
export const CX = CANVAS_SIZE / 2;
export const CY = CANVAS_SIZE / 2;
export const DEFAULT_GRID_DIM = 3;

export interface StarHitResult {
  isHit: boolean;
  nearestGridPoint: Point;
  errorDistance: number;
  isWithinRange?: boolean;
}
~~~~~

~~~~~act
write_file
src/modules/star/_shared/pointMath.ts
~~~~~
~~~~~typescript
import type { Point } from '../../../types';

export function rotatePoint(p: Point, center: Point, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;

  return {
    x: Math.round((center.x + dx * cos - dy * sin) * 100) / 100,
    y: Math.round((center.y + dx * sin + dy * cos) * 100) / 100,
  };
}

export function calcDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
}
~~~~~

~~~~~act
write_file
src/modules/star/_shared/gridGenerators.ts
~~~~~
~~~~~typescript
import type { Point } from '../../../types';
import { calcDistance } from './pointMath';
import { DEFAULT_GRID_DIM } from './types';

export function generatePolarGridPoints(
  anchorA: Point,
  targetB: Point,
  level: number,
  gridDim = DEFAULT_GRID_DIM,
  targetRow = Math.floor(Math.random() * gridDim),
  targetCol = Math.floor(Math.random() * gridDim),
): Point[] {
  const dx = targetB.x - anchorA.x;
  const dy = targetB.y - anchorA.y;
  const R = Math.sqrt(dx * dx + dy * dy);
  const theta = Math.atan2(dy, dx);

  const S_MAX = 25;
  const S_MIN = 3.5;
  const t = (Math.max(1, Math.min(level, 35)) - 1) / 34;
  const S = S_MAX - t * (S_MAX - S_MIN);

  const maxAngleStepRad = (15 * Math.PI) / 180;
  const angleStepRad = Math.min(S / R, maxAngleStepRad);
  const rStep = S;

  const points: Point[] = [];
  for (let rIdx = 0; rIdx < gridDim; rIdx++) {
    for (let aIdx = 0; aIdx < gridDim; aIdx++) {
      const curR = R + (rIdx - targetRow) * rStep;
      const curTheta = theta + (aIdx - targetCol) * angleStepRad;
      const x = Math.round((anchorA.x + curR * Math.cos(curTheta)) * 100) / 100;
      const y = Math.round((anchorA.y + curR * Math.sin(curTheta)) * 100) / 100;
      points.push({ x, y });
    }
  }
  return points;
}

export function generateBipolarGridPoints(
  anchorA: Point,
  anchorC: Point,
  targetB: Point,
  level: number,
  gridDim = DEFAULT_GRID_DIM,
  targetRow = Math.floor(Math.random() * gridDim),
  targetCol = Math.floor(Math.random() * gridDim),
): Point[] {
  const alpha = Math.atan2(targetB.y - anchorA.y, targetB.x - anchorA.x);
  const beta = Math.atan2(targetB.y - anchorC.y, targetB.x - anchorC.x);

  const Ra = calcDistance(anchorA, targetB);
  const Rc = calcDistance(anchorC, targetB);

  const S_MAX = 20;
  const S_MIN = 3.5;
  const t = (Math.max(1, Math.min(level, 35)) - 1) / 34;
  const S = S_MAX - t * (S_MAX - S_MIN);

  const maxAngleStepRad = (15 * Math.PI) / 180;
  const alphaStepRad = Math.min(S / Ra, maxAngleStepRad);
  const betaStepRad = Math.min(S / Rc, maxAngleStepRad);

  const points: Point[] = [];

  for (let aIdx = 0; aIdx < gridDim; aIdx++) {
    for (let cIdx = 0; cIdx < gridDim; cIdx++) {
      const alphaI = alpha + (aIdx - targetRow) * alphaStepRad;
      const betaJ = beta + (cIdx - targetCol) * betaStepRad;

      const v1x = Math.cos(alphaI);
      const v1y = Math.sin(alphaI);
      const v2x = Math.cos(betaJ);
      const v2y = Math.sin(betaJ);

      const dx = anchorC.x - anchorA.x;
      const dy = anchorC.y - anchorA.y;
      const det = v1x * v2y - v1y * v2x;

      if (Math.abs(det) < 1e-5) {
        points.push({
          x: Math.round((targetB.x + (aIdx - targetRow) * S) * 100) / 100,
          y: Math.round((targetB.y + (cIdx - targetCol) * S) * 100) / 100,
        });
      } else {
        const t1 = (dx * v2y - dy * v2x) / det;
        const x = Math.round((anchorA.x + t1 * v1x) * 100) / 100;
        const y = Math.round((anchorA.y + t1 * v1y) * 100) / 100;
        points.push({ x, y });
      }
    }
  }
  return points;
}
~~~~~

~~~~~act
write_file
src/modules/star/_shared/schemas.ts
~~~~~
~~~~~typescript
import type { SettingFieldSchema } from '../../../components/settings/DynamicDomainSettings';

export const STAR_SECTORS = [
  'cards.star_single.sectors.e',
  'cards.star_single.sectors.ne',
  'cards.star_single.sectors.n',
  'cards.star_single.sectors.nw',
  'cards.star_single.sectors.w',
  'cards.star_single.sectors.sw',
  'cards.star_single.sectors.s',
  'cards.star_single.sectors.se',
];

export const STAR_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'buttonGroup',
    key: 'gridSize',
    title: 'cards.star_single.settings.gridSizeTitle',
    options: [
      { label: '2x2', value: 2 },
      { label: '3x3', value: 3 },
      { label: '4x4', value: 4 },
      { label: '5x5', value: 5 },
    ],
    gridCols: 'grid-cols-4',
  },
  {
    type: 'targeting',
    modeKey: 'targetingMode',
    sectorsKey: 'manualTargetSectors',
    title: 'cards.star_single.settings.targetingTitle',
    subTitle: 'cards.star_single.settings.targetingSubTitle',
    sectors: STAR_SECTORS,
    gridCols: 'grid-cols-4',
  },
];
~~~~~

~~~~~act
write_file
src/modules/star/_shared/analytics.ts
~~~~~
~~~~~typescript
import { Compass, Target } from 'lucide-preact';
import { Callout } from '../../../components/ui/callout';
import { type SectorStat, renderCompassCanvas } from '../../../core/canvas/charts/drawCompass';
import { renderHeatmapCanvas } from '../../../core/canvas/charts/drawHeatmap';
import { type CardAnalyticsView, calculateBasicOverallStats } from '../../../core/contracts';
import { i18n } from '../../../core/i18n';
import { STAR_SECTORS } from './schemas';

export function createStarAnalyticsViews(): CardAnalyticsView[] {
  return [
    {
      id: 'spatial_bias',
      tabLabel: 'cards.star_single.analytics.spatialBias.tabLabel',
      title: 'cards.star_single.analytics.spatialBias.title',
      subTitle: 'cards.star_single.analytics.spatialBias.subTitle',
      icon: Target,
      renderVisualizer: (canvas, records) => {
        const totalCount = records.length;
        let sumDx = 0;
        let sumDy = 0;
        for (const r of records) {
          const uClick = (r.userClick as [number, number]) || [0, 0];
          const tB = (r.targetB as [number, number]) || [0, 0];
          sumDx += uClick[0] - tB[0];
          sumDy += uClick[1] - tB[1];
        }
        const avgDx = totalCount > 0 ? Math.round((sumDx / totalCount) * 10) / 10 : 0;
        const avgDy = totalCount > 0 ? Math.round((sumDy / totalCount) * 10) / 10 : 0;
        renderHeatmapCanvas(canvas, records, avgDx, avgDy, totalCount);
      },
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        let sumDx = 0;
        let sumDy = 0;
        let sumDist = 0;
        for (const r of records) {
          const uClick = (r.userClick as [number, number]) || [0, 0];
          const tB = (r.targetB as [number, number]) || [0, 0];
          sumDx += uClick[0] - tB[0];
          sumDy += uClick[1] - tB[1];
          sumDist += (r.errorPixelDistance as number) || 0;
        }
        const avgDx = Math.round((sumDx / totalCount) * 10) / 10;
        const avgDy = Math.round((sumDy / totalCount) * 10) / 10;
        const avgDist = Math.round((sumDist / totalCount) * 10) / 10;

        const dxText =
          avgDx > 0
            ? i18n.t('cards.star_single.analytics.spatialBias.right', { val: avgDx })
            : avgDx < 0
              ? i18n.t('cards.star_single.analytics.spatialBias.left', { val: avgDx })
              : '0';

        const dyText =
          avgDy > 0
            ? i18n.t('cards.star_single.analytics.spatialBias.down', { val: avgDy })
            : avgDy < 0
              ? i18n.t('cards.star_single.analytics.spatialBias.up', { val: avgDy })
              : '0';

        return (
          <Callout
            variant="info"
            icon={Target}
            title={i18n.t('cards.star_single.analytics.spatialBias.cardTitle')}
          >
            <p className="text-muted-foreground leading-relaxed text-xs">
              {i18n.t('cards.star_single.analytics.spatialBias.desc')}
            </p>
            <div className="pt-1.5 space-y-1 font-mono text-foreground">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {i18n.t('cards.star_single.analytics.spatialBias.avgDx')}
                </span>
                <span className="font-bold">{dxText}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {i18n.t('cards.star_single.analytics.spatialBias.avgDy')}
                </span>
                <span className="font-bold">{dyText}</span>
              </div>
              <div className="flex justify-between text-primary font-bold border-t border-border/60 pt-1">
                <span>{i18n.t('cards.star_single.analytics.spatialBias.avgDist')}</span>
                <span>{avgDist}px</span>
              </div>
            </div>
          </Callout>
        );
      },
      getOverallStats: (records) => calculateBasicOverallStats(records),
    },
    {
      id: 'directional_compass',
      tabLabel: 'cards.star_single.analytics.directionalCompass.tabLabel',
      title: 'cards.star_single.analytics.directionalCompass.title',
      subTitle: 'cards.star_single.analytics.directionalCompass.subTitle',
      icon: Compass,
      renderVisualizer: (canvas, records) => {
        const sectorBuckets = Array.from({ length: 8 }, () => ({
          total: 0,
          hits: 0,
          sumDist: 0,
        }));
        for (const r of records) {
          const angle = Number(r.angleDegree ?? 0);
          const normAngle = ((angle % 360) + 360) % 360;
          const sectorIdx = Math.floor(((normAngle + 22.5) % 360) / 45);
          sectorBuckets[sectorIdx].total += 1;
          if (r.isHit) sectorBuckets[sectorIdx].hits += 1;
          sectorBuckets[sectorIdx].sumDist += Number(r.errorPixelDistance || 0);
        }

        const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
          sectorIdx: i,
          label: i18n.t(STAR_SECTORS[i]),
          total: b.total,
          accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          avgError: b.total > 0 ? Math.round((b.sumDist / b.total) * 10) / 10 : 0,
        }));

        renderCompassCanvas(canvas, sectorStats);
      },
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const sectorBuckets = Array.from({ length: 8 }, () => ({ total: 0, hits: 0 }));
        for (const r of records) {
          const angle = Number(r.angleDegree ?? 0);
          const normAngle = ((angle % 360) + 360) % 360;
          const sectorIdx = Math.floor(((normAngle + 22.5) % 360) / 45);
          sectorBuckets[sectorIdx].total += 1;
          if (r.isHit) sectorBuckets[sectorIdx].hits += 1;
        }

        const validSectors = sectorBuckets
          .map((b, i) => ({
            label: i18n.t(STAR_SECTORS[i]),
            total: b.total,
            accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          }))
          .filter((s) => s.total >= 3);

        const weakest =
          validSectors.length > 0
            ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
            : null;

        return (
          <Callout
            variant="info"
            icon={Compass}
            title={i18n.t('cards.star_single.analytics.directionalCompass.cardTitle')}
          >
            {weakest ? (
              <div className="space-y-1.5 text-xs text-foreground pt-1">
                <p>
                  {i18n.t('cards.star_single.analytics.directionalCompass.weakestHint', {
                    sector: weakest.label,
                  })}
                </p>
                <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-border/60 font-mono shadow-xs">
                  <span>{weakest.label}</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {i18n.t('cards.star_single.analytics.directionalCompass.accuracyRate', {
                      accuracy: weakest.accuracy,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                {i18n.t('cards.star_single.analytics.directionalCompass.needMoreTrials')}
              </p>
            )}
          </Callout>
        );
      },
      getOverallStats: (records) => calculateBasicOverallStats(records),
    },
  ];
}
~~~~~

#### Acts 3: 实现 `SingleAnchorCard` (`star_single`)

创建单锚点卡片的独立目录、题干生成、视图与 `CardManifest`。

~~~~~act
write_file
src/modules/star/SingleAnchorCard/generator.ts
~~~~~
~~~~~typescript
import type { StarSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import { generatePolarGridPoints } from '../_shared/gridGenerators';
import { CX, CY, DEFAULT_GRID_DIM } from '../_shared/types';

export interface SingleAnchorQuestion {
  id: string;
  anchorA: Point;
  targetB: Point;
  difficultyLevel: number;
  gridDim: number;
  distractorPoints: Point[];
  angleDegree: number;
  distanceRatio: number;
}

export function generateSingleAnchorQuestion(
  level: number,
  settings: StarSettings,
): SingleAnchorQuestion {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = settings.gridSize ?? DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  const anchorA: Point = { x: CX, y: CY };

  let angle = Math.floor(Math.random() * 360);
  if (
    settings.targetingMode === 'manual' &&
    settings.manualTargetSectors &&
    settings.manualTargetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        settings.manualTargetSectors[Math.floor(Math.random() * settings.manualTargetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;
      const jitter = (Math.random() - 0.5) * 40;
      angle = Math.floor((sectorCenterAngle + jitter + 360) % 360);
    }
  }

  const distChoices = [60, 90, 120, 150, 180];
  const dist = distChoices[Math.floor(Math.random() * distChoices.length)];

  const rad = (angle * Math.PI) / 180;
  const targetB: Point = {
    x: Math.round((CX + dist * Math.cos(rad)) * 100) / 100,
    y: Math.round((CY + dist * Math.sin(rad)) * 100) / 100,
  };

  const distractorPoints = generatePolarGridPoints(
    anchorA,
    targetB,
    level,
    gridDim,
    randomRow,
    randomCol,
  );

  return {
    id,
    anchorA,
    targetB,
    difficultyLevel: level,
    gridDim,
    distractorPoints,
    angleDegree: angle,
    distanceRatio: dist,
  };
}
~~~~~

~~~~~act
write_file
src/modules/star/SingleAnchorCard/SingleAnchorView.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import { drawDot, getDynamicDotRadius } from '../../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../../core/canvas/hidpi';
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import { CANVAS_SIZE, type StarHitResult } from '../_shared/types';
import type { SingleAnchorQuestion } from './generator';

export interface SingleAnchorViewProps {
  question: SingleAnchorQuestion;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: StarHitResult } | null;
  onAnswer: (val: { clickPoint: Point; hitResult: StarHitResult }) => void;
  disabled?: boolean;
}

export function SingleAnchorView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: SingleAnchorViewProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = setupHiDpiCanvas(leftCanvas, CANVAS_SIZE, CANVAS_SIZE);
      if (ctx) {
        ctx.fillStyle = CANVAS_THEME.bg.primary;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        drawDot(ctx, question.anchorA.x, question.anchorA.y, CANVAS_THEME.pointGrid.dotAnchor, dotRadius);
        drawDot(ctx, question.targetB.x, question.targetB.y, CANVAS_THEME.pointGrid.dotAnchor, dotRadius);
      }
    }
  }, [question]);

  const handleCommitPoint = (clickPoint: Point) => {
    const hitResult = evaluatePointGridHit(clickPoint, question.targetB, question.distractorPoints);
    if (!hitResult.isWithinRange) return;
    onAnswer({ clickPoint, hitResult });
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
        />
      </div>

      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.hitResult.nearestGridPoint}
          anchors={[question.anchorA]}
          showAnswer={showAnswer}
          isHit={userAnswer?.hitResult.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/modules/star/SingleAnchorCard/index.ts
~~~~~
~~~~~typescript
import { Target } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { StarSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import { createStarAnalyticsViews } from '../_shared/analytics';
import { STAR_SCHEMAS } from '../_shared/schemas';
import type { StarHitResult } from '../_shared/types';
import { SingleAnchorView } from './SingleAnchorView';
import { type SingleAnchorQuestion, generateSingleAnchorQuestion } from './generator';

export const starSingleCard: CardManifest<
  SingleAnchorQuestion,
  StarHitResult,
  { clickPoint: Point; hitResult: StarHitResult },
  StarSettings
> = {
  id: 'star_single',
  groupId: 'star',
  icon: Target,
  tags: {
    domain: ['spatial_structure'],
    path: ['absolute_estimation'],
    interaction: ['spatial_locate'],
  },
  hasWeaknessAnalytics: true,
  settingSchemas: STAR_SCHEMAS,
  defaultSettings: {
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  locales: {
    'zh-CN': {
      title: '单锚点模式',
      desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
      instruction: '观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位',
      badge: '单锚点',
      settings: {
        gridSizeTitle: '干扰点网格大小',
        targetingTitle: '弱点专项靶向强化',
        targetingSubTitle: '选择需要靶向强化的角度扇区：',
      },
      sectors: {
        e: '正东 (0°)',
        ne: '东北 (45°)',
        n: '正北 (90°)',
        nw: '西北 (135°)',
        w: '正西 (180°)',
        sw: '西南 (225°)',
        s: '正南 (270°)',
        se: '东南 (315°)',
      },
      analytics: {
        spatialBias: {
          tabLabel: '空间偏置散点',
          title: '单锚点 · 空间偏置分析',
          subTitle: '中心绿点为绝对真理点，散点分布揭示手眼定位偏移',
          cardTitle: '系统空间偏置 (Systematic Bias)',
          desc: '中心为绝对真理点。散点越收敛代表空间直觉越敏锐。',
          avgDx: '平均 X 轴偏移:',
          avgDy: '平均 Y 轴偏移:',
          avgDist: '平均像素误差:',
          right: '右 +{{val}}',
          left: '左 {{val}}',
          down: '下 +{{val}}',
          up: '上 {{val}}',
        },
        directionalCompass: {
          tabLabel: '八向方位罗盘',
          title: '单锚点 · 八向方位敏感度',
          subTitle: '洞察你在 8 个极坐标视角扇区上的定位准确率分布',
          cardTitle: '方位盲区诊断',
          weakestHint: '你在 {{sector}} 方位上命中率最低：',
          accuracyRate: '{{accuracy}}% 准确率',
          needMoreTrials: '各方位完成至少 3 题后可生成薄弱扇区诊断。',
        },
      },
    },
    'en-US': {
      title: 'Single Anchor',
      desc: 'Single central anchor to evaluate polar angle and distance estimation.',
      instruction: 'Observe the target relative to the central anchor on the left, then locate it in the grid on the right.',
      badge: 'Single Anchor',
      settings: {
        gridSizeTitle: 'Distractor Grid Dimensions',
        targetingTitle: 'Targeted Weakness Reinforcement',
        targetingSubTitle: 'Select angle sectors for targeted training:',
      },
      sectors: {
        e: 'East (0°)',
        ne: 'NE (45°)',
        n: 'North (90°)',
        nw: 'NW (135°)',
        w: 'West (180°)',
        sw: 'SW (225°)',
        s: 'South (270°)',
        se: 'SE (315°)',
      },
      analytics: {
        spatialBias: {
          tabLabel: 'Spatial Bias',
          title: 'Single Anchor · Spatial Bias Analysis',
          subTitle: 'Center point represents ground truth. Point spread reveals systematic hand-eye offset.',
          cardTitle: 'Systematic Bias',
          desc: 'Center is the ground truth. Tighter cluster indicates sharper spatial intuition.',
          avgDx: 'Avg X Offset:',
          avgDy: 'Avg Y Offset:',
          avgDist: 'Avg Pixel Error:',
          right: 'Right +{{val}}',
          left: 'Left {{val}}',
          down: 'Down +{{val}}',
          up: 'Up {{val}}',
        },
        directionalCompass: {
          tabLabel: '8-Way Compass',
          title: 'Single Anchor · 8-Directional Sensitivity',
          subTitle: 'Insights into your localization accuracy across 8 polar sectors',
          cardTitle: 'Directional Blindspot',
          weakestHint: 'Lowest accuracy found in sector {{sector}}:',
          accuracyRate: '{{accuracy}}% accuracy',
          needMoreTrials: 'Complete at least 3 trials in each sector to generate blindspot diagnostics.',
        },
      },
    },
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) => generateSingleAnchorQuestion(level, settings),
    evaluateAnswer: (userVal, q) => evaluatePointGridHit(userVal.clickPoint, q.targetB, q.distractorPoints),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult) => ({
      anchorA: [q.anchorA.x, q.anchorA.y],
      targetB: [q.targetB.x, q.targetB.y],
      userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
      angleDegree: q.angleDegree,
      distanceRatio: q.distanceRatio,
      errorPixelDistance: hitResult.errorDistance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <SingleAnchorView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
  analytics: {
    views: createStarAnalyticsViews(),
  },
};

export default starSingleCard;
~~~~~

#### Acts 4: 实现 `HorizontalDoubleCard` (`star_double_h`) 与 `RotatedDoubleCard` (`star_double_r`)

创建水平双锚点与旋转双锚点卡片的独立目录、题干生成、视图与 `CardManifest`。

~~~~~act
write_file
src/modules/star/HorizontalDoubleCard/generator.ts
~~~~~
~~~~~typescript
import type { StarSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import { generateBipolarGridPoints } from '../_shared/gridGenerators';
import { CX, CY, DEFAULT_GRID_DIM } from '../_shared/types';

export interface HorizontalDoubleQuestion {
  id: string;
  anchorA: Point;
  anchorC: Point;
  targetB: Point;
  difficultyLevel: number;
  gridDim: number;
  distractorPoints: Point[];
  angleDegree: number;
  distanceRatio: number;
}

export function generateHorizontalDoubleQuestion(
  level: number,
  settings: StarSettings,
): HorizontalDoubleQuestion {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = settings.gridSize ?? DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  const baseAx = -70;
  const baseAy = 0;
  const baseCx = 70;
  const baseCy = 0;

  const projChoices = [-90, -45, 0, 45, 90];
  const hgtChoices = [-90, -45, 45, 90];

  const validPairs: { px: number; py: number; angle: number }[] = [];
  for (const x of projChoices) {
    for (const y of hgtChoices) {
      const angle = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
      validPairs.push({ px: x, py: y, angle });
    }
  }

  let chosenPair = validPairs[Math.floor(Math.random() * validPairs.length)];

  if (
    settings.targetingMode === 'manual' &&
    settings.manualTargetSectors &&
    settings.manualTargetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        settings.manualTargetSectors[Math.floor(Math.random() * settings.manualTargetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;

      const targetedPairs = validPairs.filter((p) => {
        const diff = Math.abs(p.angle - sectorCenterAngle);
        const minDiff = Math.min(diff, 360 - diff);
        return minDiff <= 22.5;
      });

      if (targetedPairs.length > 0) {
        chosenPair = targetedPairs[Math.floor(Math.random() * targetedPairs.length)];
      }
    }
  }

  const px = chosenPair.px;
  const py = chosenPair.py;

  const anchorA: Point = {
    x: Math.round((baseAx + CX) * 100) / 100,
    y: Math.round((baseAy + CY) * 100) / 100,
  };
  const anchorC: Point = {
    x: Math.round((baseCx + CX) * 100) / 100,
    y: Math.round((baseCy + CY) * 100) / 100,
  };
  const targetB: Point = {
    x: Math.round((px + CX) * 100) / 100,
    y: Math.round((py + CY) * 100) / 100,
  };

  const distractorPoints = generateBipolarGridPoints(
    anchorA,
    anchorC,
    targetB,
    level,
    gridDim,
    randomRow,
    randomCol,
  );
  const angleDegree = Math.round(((Math.atan2(py, px) * 180) / Math.PI + 360) % 360);

  return {
    id,
    anchorA,
    anchorC,
    targetB,
    difficultyLevel: level,
    gridDim,
    distractorPoints,
    angleDegree,
    distanceRatio: Math.round(Math.sqrt(px * px + py * py)),
  };
}
~~~~~

~~~~~act
write_file
src/modules/star/HorizontalDoubleCard/HorizontalDoubleView.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import { drawDot, getDynamicDotRadius } from '../../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../../core/canvas/hidpi';
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import { CANVAS_SIZE, type StarHitResult } from '../_shared/types';
import type { HorizontalDoubleQuestion } from './generator';

export interface HorizontalDoubleViewProps {
  question: HorizontalDoubleQuestion;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: StarHitResult } | null;
  onAnswer: (val: { clickPoint: Point; hitResult: StarHitResult }) => void;
  disabled?: boolean;
}

export function HorizontalDoubleView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: HorizontalDoubleViewProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = setupHiDpiCanvas(leftCanvas, CANVAS_SIZE, CANVAS_SIZE);
      if (ctx) {
        ctx.fillStyle = CANVAS_THEME.bg.primary;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        drawDot(ctx, question.anchorA.x, question.anchorA.y, CANVAS_THEME.pointGrid.dotAnchor, dotRadius);
        drawDot(ctx, question.anchorC.x, question.anchorC.y, CANVAS_THEME.pointGrid.dotAnchor, dotRadius);
        drawDot(ctx, question.targetB.x, question.targetB.y, CANVAS_THEME.pointGrid.dotAnchor, dotRadius);
      }
    }
  }, [question]);

  const handleCommitPoint = (clickPoint: Point) => {
    const hitResult = evaluatePointGridHit(clickPoint, question.targetB, question.distractorPoints);
    if (!hitResult.isWithinRange) return;
    onAnswer({ clickPoint, hitResult });
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
        />
      </div>

      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.hitResult.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.hitResult.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/modules/star/HorizontalDoubleCard/index.ts
~~~~~
~~~~~typescript
import { Crosshair } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { StarSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import { createStarAnalyticsViews } from '../_shared/analytics';
import { STAR_SCHEMAS } from '../_shared/schemas';
import type { StarHitResult } from '../_shared/types';
import { HorizontalDoubleView } from './HorizontalDoubleView';
import { type HorizontalDoubleQuestion, generateHorizontalDoubleQuestion } from './generator';

export const starDoubleHCard: CardManifest<
  HorizontalDoubleQuestion,
  StarHitResult,
  { clickPoint: Point; hitResult: StarHitResult },
  StarSettings
> = {
  id: 'star_double_h',
  groupId: 'star',
  icon: Crosshair,
  tags: {
    domain: ['spatial_structure', 'form_and_proportion'],
    path: ['absolute_estimation', 'relational_mapping'],
    interaction: ['spatial_locate'],
  },
  hasWeaknessAnalytics: true,
  settingSchemas: STAR_SCHEMAS,
  defaultSettings: {
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  locales: {
    'zh-CN': {
      title: '水平双锚点',
      desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
      instruction: '观察左侧水平双锚点几何关系，在右侧点阵中盲打定位',
      badge: '水平双锚点',
    },
    'en-US': {
      title: 'Horizontal Double Anchors',
      desc: 'Horizontal dual anchors to train proportion and orthogonal projection intuition.',
      instruction: 'Observe the relationship between horizontal dual anchors on the left, then locate the target on the right.',
      badge: 'Horizontal Dual',
    },
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) => generateHorizontalDoubleQuestion(level, settings),
    evaluateAnswer: (userVal, q) => evaluatePointGridHit(userVal.clickPoint, q.targetB, q.distractorPoints),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult) => ({
      anchorA: [q.anchorA.x, q.anchorA.y],
      anchorC: [q.anchorC.x, q.anchorC.y],
      targetB: [q.targetB.x, q.targetB.y],
      userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
      angleDegree: q.angleDegree,
      distanceRatio: q.distanceRatio,
      errorPixelDistance: hitResult.errorDistance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <HorizontalDoubleView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
  analytics: {
    views: createStarAnalyticsViews(),
  },
};

export default starDoubleHCard;
~~~~~

~~~~~act
write_file
src/modules/star/RotatedDoubleCard/generator.ts
~~~~~
~~~~~typescript
import type { StarSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import { generateBipolarGridPoints } from '../_shared/gridGenerators';
import { rotatePoint } from '../_shared/pointMath';
import { CX, CY, DEFAULT_GRID_DIM } from '../_shared/types';

export interface RotatedDoubleQuestion {
  id: string;
  anchorA: Point;
  anchorC: Point;
  targetB: Point;
  difficultyLevel: number;
  gridDim: number;
  distractorPoints: Point[];
  angleDegree: number;
  distanceRatio: number;
  rotationAngle: number;
}

export function generateRotatedDoubleQuestion(
  level: number,
  settings: StarSettings,
): RotatedDoubleQuestion {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = settings.gridSize ?? DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  const baseAx = -70;
  const baseAy = 0;
  const baseCx = 70;
  const baseCy = 0;

  const projChoices = [-90, -45, 0, 45, 90];
  const hgtChoices = [-90, -45, 45, 90];

  const validPairs: { px: number; py: number; angle: number }[] = [];
  for (const x of projChoices) {
    for (const y of hgtChoices) {
      const angle = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
      validPairs.push({ px: x, py: y, angle });
    }
  }

  let chosenPair = validPairs[Math.floor(Math.random() * validPairs.length)];

  if (
    settings.targetingMode === 'manual' &&
    settings.manualTargetSectors &&
    settings.manualTargetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        settings.manualTargetSectors[Math.floor(Math.random() * settings.manualTargetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;

      const targetedPairs = validPairs.filter((p) => {
        const diff = Math.abs(p.angle - sectorCenterAngle);
        const minDiff = Math.min(diff, 360 - diff);
        return minDiff <= 22.5;
      });

      if (targetedPairs.length > 0) {
        chosenPair = targetedPairs[Math.floor(Math.random() * targetedPairs.length)];
      }
    }
  }

  const px = chosenPair.px;
  const py = chosenPair.py;
  const rotAngle = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150][Math.floor(Math.random() * 10)];

  const center: Point = { x: 0, y: 0 };
  const rotatedA = rotatePoint({ x: baseAx, y: baseAy }, center, rotAngle);
  const rotatedC = rotatePoint({ x: baseCx, y: baseCy }, center, rotAngle);
  const rotatedB = rotatePoint({ x: px, y: py }, center, rotAngle);

  const anchorA: Point = {
    x: Math.round((rotatedA.x + CX) * 100) / 100,
    y: Math.round((rotatedA.y + CY) * 100) / 100,
  };
  const anchorC: Point = {
    x: Math.round((rotatedC.x + CX) * 100) / 100,
    y: Math.round((rotatedC.y + CY) * 100) / 100,
  };
  const targetB: Point = {
    x: Math.round((rotatedB.x + CX) * 100) / 100,
    y: Math.round((rotatedB.y + CY) * 100) / 100,
  };

  const distractorPoints = generateBipolarGridPoints(
    anchorA,
    anchorC,
    targetB,
    level,
    gridDim,
    randomRow,
    randomCol,
  );
  const angleDegree = Math.round(((Math.atan2(py, px) * 180) / Math.PI + 360) % 360);

  return {
    id,
    anchorA,
    anchorC,
    targetB,
    difficultyLevel: level,
    gridDim,
    distractorPoints,
    angleDegree,
    distanceRatio: Math.round(Math.sqrt(px * px + py * py)),
    rotationAngle: rotAngle,
  };
}
~~~~~

~~~~~act
write_file
src/modules/star/RotatedDoubleCard/RotatedDoubleView.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import { drawDot, getDynamicDotRadius } from '../../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../../core/canvas/hidpi';
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import { CANVAS_SIZE, type StarHitResult } from '../_shared/types';
import type { RotatedDoubleQuestion } from './generator';

export interface RotatedDoubleViewProps {
  question: RotatedDoubleQuestion;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: StarHitResult } | null;
  onAnswer: (val: { clickPoint: Point; hitResult: StarHitResult }) => void;
  disabled?: boolean;
}

export function RotatedDoubleView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: RotatedDoubleViewProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = setupHiDpiCanvas(leftCanvas, CANVAS_SIZE, CANVAS_SIZE);
      if (ctx) {
        ctx.fillStyle = CANVAS_THEME.bg.primary;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        drawDot(ctx, question.anchorA.x, question.anchorA.y, CANVAS_THEME.pointGrid.dotAnchor, dotRadius);
        drawDot(ctx, question.anchorC.x, question.anchorC.y, CANVAS_THEME.pointGrid.dotAnchor, dotRadius);
        drawDot(ctx, question.targetB.x, question.targetB.y, CANVAS_THEME.pointGrid.dotAnchor, dotRadius);
      }
    }
  }, [question]);

  const handleCommitPoint = (clickPoint: Point) => {
    const hitResult = evaluatePointGridHit(clickPoint, question.targetB, question.distractorPoints);
    if (!hitResult.isWithinRange) return;
    onAnswer({ clickPoint, hitResult });
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
        />
      </div>

      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.hitResult.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.hitResult.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/modules/star/RotatedDoubleCard/index.ts
~~~~~
~~~~~typescript
import { RotateCw } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { StarSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import { createStarAnalyticsViews } from '../_shared/analytics';
import { STAR_SCHEMAS } from '../_shared/schemas';
import type { StarHitResult } from '../_shared/types';
import { RotatedDoubleView } from './RotatedDoubleView';
import { type RotatedDoubleQuestion, generateRotatedDoubleQuestion } from './generator';

export const starDoubleRCard: CardManifest<
  RotatedDoubleQuestion,
  StarHitResult,
  { clickPoint: Point; hitResult: StarHitResult },
  StarSettings
> = {
  id: 'star_double_r',
  groupId: 'star',
  icon: RotateCw,
  tags: {
    domain: ['spatial_structure', 'form_and_proportion'],
    path: ['absolute_estimation', 'relational_mapping'],
    challenge: ['dimensional_translation'],
    interaction: ['spatial_locate'],
  },
  hasWeaknessAnalytics: true,
  settingSchemas: STAR_SCHEMAS,
  defaultSettings: {
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  locales: {
    'zh-CN': {
      title: '旋转双锚点',
      desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
      instruction: '观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位',
      badge: '旋转双锚点',
    },
    'en-US': {
      title: 'Rotated Double Anchors',
      desc: 'Tilted dual anchors to master complex rotated coordinate mapping.',
      instruction: 'Observe the rotated dual anchors on the left, then locate the target on the right.',
      badge: 'Rotated Dual',
    },
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) => generateRotatedDoubleQuestion(level, settings),
    evaluateAnswer: (userVal, q) => evaluatePointGridHit(userVal.clickPoint, q.targetB, q.distractorPoints),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult) => ({
      anchorA: [q.anchorA.x, q.anchorA.y],
      anchorC: [q.anchorC.x, q.anchorC.y],
      targetB: [q.targetB.x, q.targetB.y],
      userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
      angleDegree: q.angleDegree,
      distanceRatio: q.distanceRatio,
      rotationAngle: q.rotationAngle,
      errorPixelDistance: hitResult.errorDistance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <RotatedDoubleView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
  analytics: {
    views: createStarAnalyticsViews(),
  },
};

export default starDoubleRCard;
~~~~~

#### Acts 5: 导出 `src/modules/star/index.ts` 并安全清理旧版 `src/packs/star`

~~~~~act
write_file
src/modules/star/index.ts
~~~~~
~~~~~typescript
import { starDoubleHCard } from './HorizontalDoubleCard';
import { starDoubleRCard } from './RotatedDoubleCard';
import { starSingleCard } from './SingleAnchorCard';

export * from './SingleAnchorCard';
export * from './HorizontalDoubleCard';
export * from './RotatedDoubleCard';

export const starCards = [starSingleCard, starDoubleHCard, starDoubleRCard];
export default starCards;
~~~~~

~~~~~act
delete_file
src/packs/star/utils/hitDetection.ts
~~~~~

~~~~~act
delete_file
src/packs/star/utils/gridGenerators.ts
~~~~~

~~~~~act
delete_file
src/packs/star/utils/pointMath.ts
~~~~~

~~~~~act
delete_file
src/packs/star/utils/questionGenerator.ts
~~~~~

~~~~~act
delete_file
src/packs/star/utils/types.ts
~~~~~

~~~~~act
delete_file
src/packs/star/utils/index.ts
~~~~~

~~~~~act
delete_file
src/packs/star/analytics.tsx
~~~~~

~~~~~act
delete_file
src/packs/star/plugin.tsx
~~~~~

~~~~~act
delete_file
src/packs/star/views/StarCanvas.tsx
~~~~~

~~~~~act
delete_file
src/packs/star/locales/zh-CN.json
~~~~~

~~~~~act
delete_file
src/packs/star/locales/en-US.json
~~~~~

~~~~~act
delete_file
src/packs/star/index.ts
~~~~~

### 下一步建议
我们已经顺利完成了 **Star 领域**的完全卡片化迁移：
1. `star_single`、`star_double_h`、`star_double_r` 现在是 3 个完全自包含的独立模块，不再有任何 mode 大 switch。
2. `PointClickCanvas.tsx` 已完全解耦。
3. 接下来建议继续推进 **Angle 领域**（`angle_estimation`, `angle_comparison_2afc`, `angle_parallel_2afc`）的卡片化迁移。
