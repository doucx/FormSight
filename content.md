我们现在开始执行“阶段 1: 试点试验 (Pilot: Star 寻星模块)”，将原 `star` 包解构成 3 个完全平铺、自闭环的独立卡片（`star_single`、`star_double_h`、`star_double_r`），并安全绞杀移除旧包。

## [WIP] feat: 完成阶段 1 试点试验：展平 Star 寻星 3 张卡片并绞杀旧包

### 用户需求
按照《FormSight 卡片化架构重构路线图》实施阶段 1：
1. 在 `src/cards/` 目录下创建平铺的 3 张单卡：
   - `src/cards/star_single/`（单锚点模式）
   - `src/cards/star_double_h/`（水平双锚点）
   - `src/cards/star_double_r/`（旋转双锚点）
2. 每张卡片包含局部纯相对多语言词典（`locales/{zh-CN,en-US}.json`）、私有出题与打分几何算法（`utils/`）、独立交互画布视图、专属分析插件（`analytics.tsx`）以及统一导出的 `index.tsx`。
3. 验证平铺卡片接管后，安全物理移除旧包 `src/packs/star/`。

### 评论
试点试验是验证“卡片一等公民”与“相对 Key 自动修饰”架构设计的关键里程碑。通过将原 `star` 模块中耦合在单一插件和大型 switch 中的模式拆解为 3 个物理隔离的卡片，能够极大降低认知负载与维护成本，并证明绞杀者模式的无缝平滑过渡能力。

### 目标
1. 构建 `src/cards/star_single/` 的全量自包含资源与 `CardManifest`。
2. 构建 `src/cards/star_double_h/` 的全量自包含资源与 `CardManifest`。
3. 构建 `src/cards/star_double_r/` 的全量自包含资源与 `CardManifest`。
4. 物理删除 `src/packs/star/` 目录及其所有旧文件。

### 基本原理
1. 每张卡片通过 `locales/` 自包含纯相对键值，由注册中心的 `qualifySchemas` 与 `qualifyAnalyticsViews` 自动补全为 `cards.<card_id>.*`。
2. 卡片内部的 Canvas 渲染与几何计算完全内聚在各自卡片目录下，对外仅暴露符合 `CardManifest` 标准契约的入口。
3. 移除 `src/packs/star/` 后，系统注册中心将通过 glob 自动扫描直接挂载新卡片，实现零缝隙热插拔。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #scope/api #ai/instruct #task/domain/architecture #task/object/star-cards-flatten #task/action/pilot-migration #task/state/continue #task/status/active

---

### Script

#### Acts 1: 创建 `star_single` 独立卡片

编写 `star_single` 的类型、出题算法、多语言词典、专属分析、视图组件及入口契约。

~~~~~act
write_file
src/cards/star_single/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "单锚点模式",
  "desc": "单一中心锚点，评估基本极坐标方位与距离感知力",
  "instruction": "观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位",
  "settings": {
    "gridSizeTitle": "干扰点网格大小",
    "targetingTitle": "弱点专项靶向强化",
    "targetingSubTitle": "选择需要靶向强化的角度扇区："
  },
  "sectors": {
    "e": "正东 (0°)",
    "ne": "东北 (45°)",
    "n": "正北 (90°)",
    "nw": "西北 (135°)",
    "w": "正西 (180°)",
    "sw": "西南 (225°)",
    "s": "正南 (270°)",
    "se": "东南 (315°)"
  },
  "analytics": {
    "spatialBias": {
      "tabLabel": "空间偏置散点",
      "title": "{{title}} · 空间偏置分析",
      "subTitle": "中心绿点为绝对真理点，散点分布揭示手眼定位偏移",
      "cardTitle": "系统空间偏置 (Systematic Bias)",
      "desc": "中心为绝对真理点。散点越收敛代表空间直觉越敏锐。",
      "avgDx": "平均 X 轴偏移:",
      "avgDy": "平均 Y 轴偏移:",
      "avgDist": "平均像素误差:",
      "right": "右 +{{val}}",
      "left": "左 {{val}}",
      "down": "下 +{{val}}",
      "up": "上 {{val}}"
    },
    "directionalCompass": {
      "tabLabel": "八向方位罗盘",
      "title": "{{title}} · 八向方位敏感度",
      "subTitle": "洞察你在 8 个极坐标视角扇区上的定位准确率分布",
      "cardTitle": "方位盲区诊断",
      "weakestHint": "你在 {{sector}} 方位上命中率最低：",
      "accuracyRate": "{{accuracy}}% 准确率",
      "needMoreTrials": "各方位完成至少 3 题后可生成薄弱扇区诊断。"
    }
  }
}
~~~~~

~~~~~act
write_file
src/cards/star_single/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Single Anchor",
  "desc": "Single central anchor to evaluate polar angle and distance estimation.",
  "instruction": "Observe the target relative to the central anchor on the left, then locate it in the grid on the right.",
  "settings": {
    "gridSizeTitle": "Distractor Grid Dimensions",
    "targetingTitle": "Targeted Weakness Reinforcement",
    "targetingSubTitle": "Select angle sectors for targeted training:"
  },
  "sectors": {
    "e": "East (0°)",
    "ne": "NE (45°)",
    "n": "North (90°)",
    "nw": "NW (135°)",
    "w": "West (180°)",
    "sw": "SW (225°)",
    "s": "South (270°)",
    "se": "SE (315°)"
  },
  "analytics": {
    "spatialBias": {
      "tabLabel": "Spatial Bias",
      "title": "{{title}} · Spatial Bias Analysis",
      "subTitle": "Center point represents ground truth. Point spread reveals systematic hand-eye offset.",
      "cardTitle": "Systematic Bias",
      "desc": "Center is the ground truth. Tighter cluster indicates sharper spatial intuition.",
      "avgDx": "Avg X Offset:",
      "avgDy": "Avg Y Offset:",
      "avgDist": "Avg Pixel Error:",
      "right": "Right +{{val}}",
      "left": "Left {{val}}",
      "down": "Down +{{val}}",
      "up": "Up {{val}}"
    },
    "directionalCompass": {
      "tabLabel": "8-Way Compass",
      "title": "{{title}} · 8-Directional Sensitivity",
      "subTitle": "Insights into your localization accuracy across 8 polar sectors",
      "cardTitle": "Directional Blindspot",
      "weakestHint": "Lowest accuracy found in sector {{sector}}:",
      "accuracyRate": "{{accuracy}}% accuracy",
      "needMoreTrials": "Complete at least 3 trials in each sector to generate blindspot diagnostics."
    }
  }
}
~~~~~

~~~~~act
write_file
src/cards/star_single/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface QuestionData {
  id: string;
  anchorA: Point;
  targetB: Point;
  gridStart: Point;
  difficultyLevel: number;
  gridDim: number;
  distractorPoints: Point[];
  angleDegree: number;
  distanceRatio: number;
}

export interface HitResult {
  isHit: boolean;
  nearestGridPoint: Point;
  errorDistance: number;
  isWithinRange?: boolean;
}
~~~~~

~~~~~act
write_file
src/cards/star_single/utils/generator.ts
~~~~~
~~~~~typescript
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { Point } from '../../../types';
import type { HitResult, QuestionData } from '../types';

export const CANVAS_SIZE = 500;
export const CX = CANVAS_SIZE / 2;
export const CY = CANVAS_SIZE / 2;
export const DEFAULT_GRID_DIM = 3;

export interface QuestionGenerateOptions {
  targetingMode?: 'off' | 'manual';
  targetSectors?: number[];
  gridSize?: number;
}

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

function selectAngleWithTargeting(options?: QuestionGenerateOptions): number {
  if (
    options?.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;
      const jitter = (Math.random() - 0.5) * 40;
      return Math.floor((sectorCenterAngle + jitter + 360) % 360);
    }
  }
  return Math.floor(Math.random() * 360);
}

export function generateQuestion(
  difficultyLevel: number,
  options?: QuestionGenerateOptions,
): QuestionData {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = options?.gridSize ?? DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  const anchorA: Point = { x: CX, y: CY };
  const angle = selectAngleWithTargeting(options);
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
    difficultyLevel,
    gridDim,
    randomRow,
    randomCol,
  );

  return {
    id,
    anchorA,
    targetB,
    gridStart: distractorPoints[0],
    difficultyLevel,
    gridDim,
    distractorPoints,
    angleDegree: angle,
    distanceRatio: dist,
  };
}

export function checkHit(clickPoint: Point, targetB: Point, gridPoints: Point[]): HitResult {
  return evaluatePointGridHit(clickPoint, targetB, gridPoints);
}
~~~~~

~~~~~act
write_file
src/cards/star_single/StarSingleView.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../components/common/PointClickCanvas';
import { drawDot, getDynamicDotRadius } from '../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import type { Point } from '../../types';
import { CANVAS_THEME } from '../../utils/theme';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE, checkHit } from './utils/generator';

export interface StarSingleViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: HitResult } | null;
  onAnswer: (userVal: { clickPoint: Point; hitResult: HitResult }) => void;
  disabled?: boolean;
}

export function StarSingleView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarSingleViewProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = setupHiDpiCanvas(leftCanvas, CANVAS_SIZE, CANVAS_SIZE);
      if (ctx) {
        ctx.fillStyle = CANVAS_THEME.bg.primary;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        drawDot(
          ctx,
          question.anchorA.x,
          question.anchorA.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );

        drawDot(
          ctx,
          question.targetB.x,
          question.targetB.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );
      }
    }
  }, [question]);

  const handleCommitPoint = (clickPoint: Point) => {
    const hitResult = checkHit(clickPoint, question.targetB, question.distractorPoints);
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
src/cards/star_single/analytics.tsx
~~~~~
~~~~~typescript
import { Compass, Target } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import { type SectorStat, renderCompassCanvas } from '../../core/canvas/charts/drawCompass';
import { renderHeatmapCanvas } from '../../core/canvas/charts/drawHeatmap';
import type { CardAnalyticsView } from '../../core/cardContract';
import { calculateBasicOverallStats } from '../../core/contracts';
import { i18n } from '../../core/i18n';

const SECTOR_KEYS = [
  'sectors.e',
  'sectors.ne',
  'sectors.n',
  'sectors.nw',
  'sectors.w',
  'sectors.sw',
  'sectors.s',
  'sectors.se',
];

export function createStarSingleAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'spatial_bias',
      tabLabel: 'analytics.spatialBias.tabLabel',
      title: 'analytics.spatialBias.title',
      subTitle: 'analytics.spatialBias.subTitle',
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
      tabLabel: 'analytics.directionalCompass.tabLabel',
      title: 'analytics.directionalCompass.title',
      subTitle: 'analytics.directionalCompass.subTitle',
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
          label: i18n.t(`cards.star_single.${SECTOR_KEYS[i]}`),
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
            label: i18n.t(`cards.star_single.${SECTOR_KEYS[i]}`),
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

~~~~~act
write_file
src/cards/star_single/index.tsx
~~~~~
~~~~~typescript
import { Target } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { StarSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { StarSingleView } from './StarSingleView';
import { createStarSingleAnalytics } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

const SECTOR_KEYS = [
  'sectors.e',
  'sectors.ne',
  'sectors.n',
  'sectors.nw',
  'sectors.w',
  'sectors.sw',
  'sectors.s',
  'sectors.se',
];

export const starSingleCard: CardManifest<
  QuestionData,
  HitResult,
  { clickPoint: Point; hitResult: HitResult },
  StarSettings
> = {
  id: 'star_single',
  domain: 'spatial_structure',
  icon: Target,
  tags: {
    domain: ['spatial_structure'],
    path: ['absolute_estimation'],
    interaction: ['spatial_locate'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'buttonGroup',
      key: 'gridSize',
      title: 'settings.gridSizeTitle',
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
      title: 'settings.targetingTitle',
      subTitle: 'settings.targetingSubTitle',
      sectors: SECTOR_KEYS,
      gridCols: 'grid-cols-4',
    },
  ],
  defaultSettings: {
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) =>
      generateQuestion(level, {
        gridSize: settings.gridSize,
        targetingMode: settings.targetingMode,
        targetSectors: settings.manualTargetSectors,
      }),
    evaluateAnswer: (userVal) => userVal.hitResult,
    isHit: (res) => res.isHit,
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
      <StarSingleView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
  analytics: {
    views: createStarSingleAnalytics(),
  },
};

export default starSingleCard;
~~~~~

#### Acts 2: 创建 `star_double_h` 独立卡片

编写 `star_double_h` 的多语言、水平双锚点透视几何算法、视图与卡片入口契约。

~~~~~act
write_file
src/cards/star_double_h/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "水平双锚点",
  "desc": "水平线段两端锚点，评估两点比例与正交投影判定力",
  "instruction": "观察左侧水平双锚点几何关系，在右侧点阵中盲打定位",
  "settings": {
    "gridSizeTitle": "干扰点网格大小",
    "targetingTitle": "弱点专项靶向强化",
    "targetingSubTitle": "选择需要靶向强化的角度扇区："
  },
  "sectors": {
    "e": "正东 (0°)",
    "ne": "东北 (45°)",
    "n": "正北 (90°)",
    "nw": "西北 (135°)",
    "w": "正西 (180°)",
    "sw": "西南 (225°)",
    "s": "正南 (270°)",
    "se": "东南 (315°)"
  },
  "analytics": {
    "spatialBias": {
      "tabLabel": "空间偏置散点",
      "title": "{{title}} · 空间偏置分析",
      "subTitle": "中心绿点为绝对真理点，散点分布揭示手眼定位偏移",
      "cardTitle": "系统空间偏置 (Systematic Bias)",
      "desc": "中心为绝对真理点。散点越收敛代表空间直觉越敏锐。",
      "avgDx": "平均 X 轴偏移:",
      "avgDy": "平均 Y 轴偏移:",
      "avgDist": "平均像素误差:",
      "right": "右 +{{val}}",
      "left": "左 {{val}}",
      "down": "下 +{{val}}",
      "up": "上 {{val}}"
    },
    "directionalCompass": {
      "tabLabel": "八向方位罗盘",
      "title": "{{title}} · 八向方位敏感度",
      "subTitle": "洞察你在 8 个极坐标视角扇区上的定位准确率分布",
      "cardTitle": "方位盲区诊断",
      "weakestHint": "你在 {{sector}} 方位上命中率最低：",
      "accuracyRate": "{{accuracy}}% 准确率",
      "needMoreTrials": "各方位完成至少 3 题后可生成薄弱扇区诊断。"
    }
  }
}
~~~~~

~~~~~act
write_file
src/cards/star_double_h/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Horizontal Double Anchors",
  "desc": "Horizontal dual anchors to train proportion and orthogonal projection intuition.",
  "instruction": "Observe the relationship between horizontal dual anchors on the left, then locate the target on the right.",
  "settings": {
    "gridSizeTitle": "Distractor Grid Dimensions",
    "targetingTitle": "Targeted Weakness Reinforcement",
    "targetingSubTitle": "Select angle sectors for targeted training:"
  },
  "sectors": {
    "e": "East (0°)",
    "ne": "NE (45°)",
    "n": "North (90°)",
    "nw": "NW (135°)",
    "w": "West (180°)",
    "sw": "SW (225°)",
    "s": "South (270°)",
    "se": "SE (315°)"
  },
  "analytics": {
    "spatialBias": {
      "tabLabel": "Spatial Bias",
      "title": "{{title}} · Spatial Bias Analysis",
      "subTitle": "Center point represents ground truth. Point spread reveals systematic hand-eye offset.",
      "cardTitle": "Systematic Bias",
      "desc": "Center is the ground truth. Tighter cluster indicates sharper spatial intuition.",
      "avgDx": "Avg X Offset:",
      "avgDy": "Avg Y Offset:",
      "avgDist": "Avg Pixel Error:",
      "right": "Right +{{val}}",
      "left": "Left {{val}}",
      "down": "Down +{{val}}",
      "up": "Up {{val}}"
    },
    "directionalCompass": {
      "tabLabel": "8-Way Compass",
      "title": "{{title}} · 8-Directional Sensitivity",
      "subTitle": "Insights into your localization accuracy across 8 polar sectors",
      "cardTitle": "Directional Blindspot",
      "weakestHint": "Lowest accuracy found in sector {{sector}}:",
      "accuracyRate": "{{accuracy}}% accuracy",
      "needMoreTrials": "Complete at least 3 trials in each sector to generate blindspot diagnostics."
    }
  }
}
~~~~~

~~~~~act
write_file
src/cards/star_double_h/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface QuestionData {
  id: string;
  anchorA: Point;
  anchorC: Point;
  targetB: Point;
  gridStart: Point;
  difficultyLevel: number;
  gridDim: number;
  distractorPoints: Point[];
  angleDegree: number;
  distanceRatio: number;
  rotationAngle?: number;
}

export interface HitResult {
  isHit: boolean;
  nearestGridPoint: Point;
  errorDistance: number;
  isWithinRange?: boolean;
}
~~~~~

~~~~~act
write_file
src/cards/star_double_h/utils/generator.ts
~~~~~
~~~~~typescript
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { Point } from '../../../types';
import type { HitResult, QuestionData } from '../types';

export const CANVAS_SIZE = 500;
export const CX = CANVAS_SIZE / 2;
export const CY = CANVAS_SIZE / 2;
export const DEFAULT_GRID_DIM = 3;

export interface QuestionGenerateOptions {
  targetingMode?: 'off' | 'manual';
  targetSectors?: number[];
  gridSize?: number;
}

function calcDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
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

export function generateQuestion(
  difficultyLevel: number,
  options?: QuestionGenerateOptions,
): QuestionData {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = options?.gridSize ?? DEFAULT_GRID_DIM;
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
    options?.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
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
    difficultyLevel,
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
    gridStart: distractorPoints[0],
    difficultyLevel,
    gridDim,
    distractorPoints,
    angleDegree,
    distanceRatio: Math.round(Math.sqrt(px * px + py * py)),
    rotationAngle: 0,
  };
}

export function checkHit(clickPoint: Point, targetB: Point, gridPoints: Point[]): HitResult {
  return evaluatePointGridHit(clickPoint, targetB, gridPoints);
}
~~~~~

~~~~~act
write_file
src/cards/star_double_h/StarDoubleHView.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../components/common/PointClickCanvas';
import { drawDot, getDynamicDotRadius } from '../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import type { Point } from '../../types';
import { CANVAS_THEME } from '../../utils/theme';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE, checkHit } from './utils/generator';

export interface StarDoubleHViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: HitResult } | null;
  onAnswer: (userVal: { clickPoint: Point; hitResult: HitResult }) => void;
  disabled?: boolean;
}

export function StarDoubleHView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarDoubleHViewProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = setupHiDpiCanvas(leftCanvas, CANVAS_SIZE, CANVAS_SIZE);
      if (ctx) {
        ctx.fillStyle = CANVAS_THEME.bg.primary;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        drawDot(
          ctx,
          question.anchorA.x,
          question.anchorA.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );

        drawDot(
          ctx,
          question.anchorC.x,
          question.anchorC.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );

        drawDot(
          ctx,
          question.targetB.x,
          question.targetB.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );
      }
    }
  }, [question]);

  const handleCommitPoint = (clickPoint: Point) => {
    const hitResult = checkHit(clickPoint, question.targetB, question.distractorPoints);
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
src/cards/star_double_h/analytics.tsx
~~~~~
~~~~~typescript
import { Compass, Target } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import { type SectorStat, renderCompassCanvas } from '../../core/canvas/charts/drawCompass';
import { renderHeatmapCanvas } from '../../core/canvas/charts/drawHeatmap';
import type { CardAnalyticsView } from '../../core/cardContract';
import { calculateBasicOverallStats } from '../../core/contracts';
import { i18n } from '../../core/i18n';

const SECTOR_KEYS = [
  'sectors.e',
  'sectors.ne',
  'sectors.n',
  'sectors.nw',
  'sectors.w',
  'sectors.sw',
  'sectors.s',
  'sectors.se',
];

export function createStarDoubleHAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'spatial_bias',
      tabLabel: 'analytics.spatialBias.tabLabel',
      title: 'analytics.spatialBias.title',
      subTitle: 'analytics.spatialBias.subTitle',
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
            ? i18n.t('cards.star_double_h.analytics.spatialBias.right', { val: avgDx })
            : avgDx < 0
              ? i18n.t('cards.star_double_h.analytics.spatialBias.left', { val: avgDx })
              : '0';

        const dyText =
          avgDy > 0
            ? i18n.t('cards.star_double_h.analytics.spatialBias.down', { val: avgDy })
            : avgDy < 0
              ? i18n.t('cards.star_double_h.analytics.spatialBias.up', { val: avgDy })
              : '0';

        return (
          <Callout
            variant="info"
            icon={Target}
            title={i18n.t('cards.star_double_h.analytics.spatialBias.cardTitle')}
          >
            <p className="text-muted-foreground leading-relaxed text-xs">
              {i18n.t('cards.star_double_h.analytics.spatialBias.desc')}
            </p>
            <div className="pt-1.5 space-y-1 font-mono text-foreground">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {i18n.t('cards.star_double_h.analytics.spatialBias.avgDx')}
                </span>
                <span className="font-bold">{dxText}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {i18n.t('cards.star_double_h.analytics.spatialBias.avgDy')}
                </span>
                <span className="font-bold">{dyText}</span>
              </div>
              <div className="flex justify-between text-primary font-bold border-t border-border/60 pt-1">
                <span>{i18n.t('cards.star_double_h.analytics.spatialBias.avgDist')}</span>
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
      tabLabel: 'analytics.directionalCompass.tabLabel',
      title: 'analytics.directionalCompass.title',
      subTitle: 'analytics.directionalCompass.subTitle',
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
          label: i18n.t(`cards.star_double_h.${SECTOR_KEYS[i]}`),
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
            label: i18n.t(`cards.star_double_h.${SECTOR_KEYS[i]}`),
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
            title={i18n.t('cards.star_double_h.analytics.directionalCompass.cardTitle')}
          >
            {weakest ? (
              <div className="space-y-1.5 text-xs text-foreground pt-1">
                <p>
                  {i18n.t('cards.star_double_h.analytics.directionalCompass.weakestHint', {
                    sector: weakest.label,
                  })}
                </p>
                <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-border/60 font-mono shadow-xs">
                  <span>{weakest.label}</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {i18n.t('cards.star_double_h.analytics.directionalCompass.accuracyRate', {
                      accuracy: weakest.accuracy,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                {i18n.t('cards.star_double_h.analytics.directionalCompass.needMoreTrials')}
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

~~~~~act
write_file
src/cards/star_double_h/index.tsx
~~~~~
~~~~~typescript
import { Crosshair } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { StarSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { StarDoubleHView } from './StarDoubleHView';
import { createStarDoubleHAnalytics } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

const SECTOR_KEYS = [
  'sectors.e',
  'sectors.ne',
  'sectors.n',
  'sectors.nw',
  'sectors.w',
  'sectors.sw',
  'sectors.s',
  'sectors.se',
];

export const starDoubleHCard: CardManifest<
  QuestionData,
  HitResult,
  { clickPoint: Point; hitResult: HitResult },
  StarSettings
> = {
  id: 'star_double_h',
  domain: 'spatial_structure',
  icon: Crosshair,
  tags: {
    domain: ['spatial_structure', 'form_and_proportion'],
    path: ['absolute_estimation', 'relational_mapping'],
    interaction: ['spatial_locate'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'buttonGroup',
      key: 'gridSize',
      title: 'settings.gridSizeTitle',
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
      title: 'settings.targetingTitle',
      subTitle: 'settings.targetingSubTitle',
      sectors: SECTOR_KEYS,
      gridCols: 'grid-cols-4',
    },
  ],
  defaultSettings: {
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) =>
      generateQuestion(level, {
        gridSize: settings.gridSize,
        targetingMode: settings.targetingMode,
        targetSectors: settings.manualTargetSectors,
      }),
    evaluateAnswer: (userVal) => userVal.hitResult,
    isHit: (res) => res.isHit,
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
      <StarDoubleHView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
  analytics: {
    views: createStarDoubleHAnalytics(),
  },
};

export default starDoubleHCard;
~~~~~

#### Acts 3: 创建 `star_double_r` 独立卡片

编写 `star_double_r` 的多语言、旋转双锚点透视几何算法、视图与卡片入口契约。

~~~~~act
write_file
src/cards/star_double_r/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "旋转双锚点",
  "desc": "带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力",
  "instruction": "观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位",
  "settings": {
    "gridSizeTitle": "干扰点网格大小",
    "targetingTitle": "弱点专项靶向强化",
    "targetingSubTitle": "选择需要靶向强化的角度扇区："
  },
  "sectors": {
    "e": "正东 (0°)",
    "ne": "东北 (45°)",
    "n": "正北 (90°)",
    "nw": "西北 (135°)",
    "w": "正西 (180°)",
    "sw": "西南 (225°)",
    "s": "正南 (270°)",
    "se": "东南 (315°)"
  },
  "analytics": {
    "spatialBias": {
      "tabLabel": "空间偏置散点",
      "title": "{{title}} · 空间偏置分析",
      "subTitle": "中心绿点为绝对真理点，散点分布揭示手眼定位偏移",
      "cardTitle": "系统空间偏置 (Systematic Bias)",
      "desc": "中心为绝对真理点。散点越收敛代表空间直觉越敏锐。",
      "avgDx": "平均 X 轴偏移:",
      "avgDy": "平均 Y 轴偏移:",
      "avgDist": "平均像素误差:",
      "right": "右 +{{val}}",
      "left": "左 {{val}}",
      "down": "下 +{{val}}",
      "up": "上 {{val}}"
    },
    "directionalCompass": {
      "tabLabel": "八向方位罗盘",
      "title": "{{title}} · 八向方位敏感度",
      "subTitle": "洞察你在 8 个极坐标视角扇区上的定位准确率分布",
      "cardTitle": "方位盲区诊断",
      "weakestHint": "你在 {{sector}} 方位上命中率最低：",
      "accuracyRate": "{{accuracy}}% 准确率",
      "needMoreTrials": "各方位完成至少 3 题后可生成薄弱扇区诊断。"
    }
  }
}
~~~~~

~~~~~act
write_file
src/cards/star_double_r/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Rotated Double Anchors",
  "desc": "Tilted dual anchors to master complex rotated coordinate mapping.",
  "instruction": "Observe the rotated dual anchors on the left, then locate the target on the right.",
  "settings": {
    "gridSizeTitle": "Distractor Grid Dimensions",
    "targetingTitle": "Targeted Weakness Reinforcement",
    "targetingSubTitle": "Select angle sectors for targeted training:"
  },
  "sectors": {
    "e": "East (0°)",
    "ne": "NE (45°)",
    "n": "North (90°)",
    "nw": "NW (135°)",
    "w": "West (180°)",
    "sw": "SW (225°)",
    "s": "South (270°)",
    "se": "SE (315°)"
  },
  "analytics": {
    "spatialBias": {
      "tabLabel": "Spatial Bias",
      "title": "{{title}} · Spatial Bias Analysis",
      "subTitle": "Center point represents ground truth. Point spread reveals systematic hand-eye offset.",
      "cardTitle": "Systematic Bias",
      "desc": "Center is the ground truth. Tighter cluster indicates sharper spatial intuition.",
      "avgDx": "Avg X Offset:",
      "avgDy": "Avg Y Offset:",
      "avgDist": "Avg Pixel Error:",
      "right": "Right +{{val}}",
      "left": "Left {{val}}",
      "down": "Down +{{val}}",
      "up": "Up {{val}}"
    },
    "directionalCompass": {
      "tabLabel": "8-Way Compass",
      "title": "{{title}} · 8-Directional Sensitivity",
      "subTitle": "Insights into your localization accuracy across 8 polar sectors",
      "cardTitle": "Directional Blindspot",
      "weakestHint": "Lowest accuracy found in sector {{sector}}:",
      "accuracyRate": "{{accuracy}}% accuracy",
      "needMoreTrials": "Complete at least 3 trials in each sector to generate blindspot diagnostics."
    }
  }
}
~~~~~

~~~~~act
write_file
src/cards/star_double_r/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface QuestionData {
  id: string;
  anchorA: Point;
  anchorC: Point;
  targetB: Point;
  gridStart: Point;
  difficultyLevel: number;
  gridDim: number;
  distractorPoints: Point[];
  angleDegree: number;
  distanceRatio: number;
  rotationAngle?: number;
}

export interface HitResult {
  isHit: boolean;
  nearestGridPoint: Point;
  errorDistance: number;
  isWithinRange?: boolean;
}
~~~~~

~~~~~act
write_file
src/cards/star_double_r/utils/generator.ts
~~~~~
~~~~~typescript
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { Point } from '../../../types';
import type { HitResult, QuestionData } from '../types';

export const CANVAS_SIZE = 500;
export const CX = CANVAS_SIZE / 2;
export const CY = CANVAS_SIZE / 2;
export const DEFAULT_GRID_DIM = 3;

export interface QuestionGenerateOptions {
  targetingMode?: 'off' | 'manual';
  targetSectors?: number[];
  gridSize?: number;
}

function rotatePoint(p: Point, center: Point, angleDeg: number): Point {
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

function calcDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
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

export function generateQuestion(
  difficultyLevel: number,
  options?: QuestionGenerateOptions,
): QuestionData {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = options?.gridSize ?? DEFAULT_GRID_DIM;
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
    options?.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
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
    difficultyLevel,
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
    gridStart: distractorPoints[0],
    difficultyLevel,
    gridDim,
    distractorPoints,
    angleDegree,
    distanceRatio: Math.round(Math.sqrt(px * px + py * py)),
    rotationAngle: rotAngle,
  };
}

export function checkHit(clickPoint: Point, targetB: Point, gridPoints: Point[]): HitResult {
  return evaluatePointGridHit(clickPoint, targetB, gridPoints);
}
~~~~~

~~~~~act
write_file
src/cards/star_double_r/StarDoubleRView.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../components/common/PointClickCanvas';
import { drawDot, getDynamicDotRadius } from '../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import type { Point } from '../../types';
import { CANVAS_THEME } from '../../utils/theme';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE, checkHit } from './utils/generator';

export interface StarDoubleRViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: HitResult } | null;
  onAnswer: (userVal: { clickPoint: Point; hitResult: HitResult }) => void;
  disabled?: boolean;
}

export function StarDoubleRView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarDoubleRViewProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = setupHiDpiCanvas(leftCanvas, CANVAS_SIZE, CANVAS_SIZE);
      if (ctx) {
        ctx.fillStyle = CANVAS_THEME.bg.primary;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        drawDot(
          ctx,
          question.anchorA.x,
          question.anchorA.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );

        drawDot(
          ctx,
          question.anchorC.x,
          question.anchorC.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );

        drawDot(
          ctx,
          question.targetB.x,
          question.targetB.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );
      }
    }
  }, [question]);

  const handleCommitPoint = (clickPoint: Point) => {
    const hitResult = checkHit(clickPoint, question.targetB, question.distractorPoints);
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
src/cards/star_double_r/analytics.tsx
~~~~~
~~~~~typescript
import { Compass, Target } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import { type SectorStat, renderCompassCanvas } from '../../core/canvas/charts/drawCompass';
import { renderHeatmapCanvas } from '../../core/canvas/charts/drawHeatmap';
import type { CardAnalyticsView } from '../../core/cardContract';
import { calculateBasicOverallStats } from '../../core/contracts';
import { i18n } from '../../core/i18n';

const SECTOR_KEYS = [
  'sectors.e',
  'sectors.ne',
  'sectors.n',
  'sectors.nw',
  'sectors.w',
  'sectors.sw',
  'sectors.s',
  'sectors.se',
];

export function createStarDoubleRAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'spatial_bias',
      tabLabel: 'analytics.spatialBias.tabLabel',
      title: 'analytics.spatialBias.title',
      subTitle: 'analytics.spatialBias.subTitle',
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
            ? i18n.t('cards.star_double_r.analytics.spatialBias.right', { val: avgDx })
            : avgDx < 0
              ? i18n.t('cards.star_double_r.analytics.spatialBias.left', { val: avgDx })
              : '0';

        const dyText =
          avgDy > 0
            ? i18n.t('cards.star_double_r.analytics.spatialBias.down', { val: avgDy })
            : avgDy < 0
              ? i18n.t('cards.star_double_r.analytics.spatialBias.up', { val: avgDy })
              : '0';

        return (
          <Callout
            variant="info"
            icon={Target}
            title={i18n.t('cards.star_double_r.analytics.spatialBias.cardTitle')}
          >
            <p className="text-muted-foreground leading-relaxed text-xs">
              {i18n.t('cards.star_double_r.analytics.spatialBias.desc')}
            </p>
            <div className="pt-1.5 space-y-1 font-mono text-foreground">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {i18n.t('cards.star_double_r.analytics.spatialBias.avgDx')}
                </span>
                <span className="font-bold">{dxText}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {i18n.t('cards.star_double_r.analytics.spatialBias.avgDy')}
                </span>
                <span className="font-bold">{dyText}</span>
              </div>
              <div className="flex justify-between text-primary font-bold border-t border-border/60 pt-1">
                <span>{i18n.t('cards.star_double_r.analytics.spatialBias.avgDist')}</span>
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
      tabLabel: 'analytics.directionalCompass.tabLabel',
      title: 'analytics.directionalCompass.title',
      subTitle: 'analytics.directionalCompass.subTitle',
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
          label: i18n.t(`cards.star_double_r.${SECTOR_KEYS[i]}`),
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
            label: i18n.t(`cards.star_double_r.${SECTOR_KEYS[i]}`),
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
            title={i18n.t('cards.star_double_r.analytics.directionalCompass.cardTitle')}
          >
            {weakest ? (
              <div className="space-y-1.5 text-xs text-foreground pt-1">
                <p>
                  {i18n.t('cards.star_double_r.analytics.directionalCompass.weakestHint', {
                    sector: weakest.label,
                  })}
                </p>
                <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-border/60 font-mono shadow-xs">
                  <span>{weakest.label}</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {i18n.t('cards.star_double_r.analytics.directionalCompass.accuracyRate', {
                      accuracy: weakest.accuracy,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                {i18n.t('cards.star_double_r.analytics.directionalCompass.needMoreTrials')}
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

~~~~~act
write_file
src/cards/star_double_r/index.tsx
~~~~~
~~~~~typescript
import { RotateCw } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { StarSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { StarDoubleRView } from './StarDoubleRView';
import { createStarDoubleRAnalytics } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

const SECTOR_KEYS = [
  'sectors.e',
  'sectors.ne',
  'sectors.n',
  'sectors.nw',
  'sectors.w',
  'sectors.sw',
  'sectors.s',
  'sectors.se',
];

export const starDoubleRCard: CardManifest<
  QuestionData,
  HitResult,
  { clickPoint: Point; hitResult: HitResult },
  StarSettings
> = {
  id: 'star_double_r',
  domain: 'spatial_structure',
  icon: RotateCw,
  tags: {
    domain: ['spatial_structure', 'form_and_proportion'],
    path: ['absolute_estimation', 'relational_mapping'],
    challenge: ['dimensional_translation'],
    interaction: ['spatial_locate'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'buttonGroup',
      key: 'gridSize',
      title: 'settings.gridSizeTitle',
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
      title: 'settings.targetingTitle',
      subTitle: 'settings.targetingSubTitle',
      sectors: SECTOR_KEYS,
      gridCols: 'grid-cols-4',
    },
  ],
  defaultSettings: {
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) =>
      generateQuestion(level, {
        gridSize: settings.gridSize,
        targetingMode: settings.targetingMode,
        targetSectors: settings.manualTargetSectors,
      }),
    evaluateAnswer: (userVal) => userVal.hitResult,
    isHit: (res) => res.isHit,
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
      <StarDoubleRView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
  analytics: {
    views: createStarDoubleRAnalytics(),
  },
};

export default starDoubleRCard;
~~~~~

#### Acts 4: 绞杀移除旧包 `src/packs/star/`

删除已被平铺卡片取代的原 `src/packs/star/` 目录下全部文件。

~~~~~act
delete_file
src/packs/star/locales/en-US.json
~~~~~
~~~~~act
delete_file
src/packs/star/locales/zh-CN.json
~~~~~
~~~~~act
delete_file
src/packs/star/utils/gridGenerators.ts
~~~~~
~~~~~act
delete_file
src/packs/star/utils/hitDetection.ts
~~~~~
~~~~~act
delete_file
src/packs/star/utils/index.ts
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
src/packs/star/views/StarCanvas.tsx
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
src/packs/star/index.ts
~~~~~

### 下一步建议
阶段 1 的试点试验已圆满完成，3 张星图卡片已完全独立自治。接下来建议进入**阶段 2: 几何与结构域迁移 (Angle 3 张 & Perspective 5 张)**：
1. 展平 `angle_estimation`、`angle_comparison_2afc`、`angle_parallel_2afc` 3 张角度卡片至 `src/cards/`。
2. 展平 `persp_vp_convergence`、`persp_prop_division`、`persp_prop_migration`、`persp_gestalt_continuation`、`persp_structure_3d` 5 张透视卡片至 `src/cards/`。
3. 绞杀并删除 `src/packs/angle/` 与 `src/packs/perspective/`。
