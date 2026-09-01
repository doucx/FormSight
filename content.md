收到！我们将依据《FormSight 卡片一等公民架构白皮书》，启动**阶段 4：图底与负空间感知域（Negative Space）的 4 张卡片展平迁移**。

我们将把 `src/packs/negative_space/` 解构为 4 个完全自包含的原子化卡片：
1. `src/cards/neg_ratio_estimation/`（负形占比滑块评估）
2. `src/cards/neg_area_comparison_2afc/`（负形面积二分判别）
3. `src/cards/neg_vertex_fitting/`（负形边界反切定点）
4. `src/cards/neg_shape_match_2afc/`（负形轮廓记忆匹配）

迁移完成后，执行绞杀者模式清理，安全移除旧版 `src/packs/negative_space/` 目录。

## [WIP] refactor: 将 negative_space 扩展包解构展平为 4 张独立卡片

### 用户需求
按照卡片一等公民规范，将 `negative_space` 扩展包中的 4 个模式（`neg_ratio_estimation`, `neg_area_comparison_2afc`, `neg_vertex_fitting`, `neg_shape_match_2afc`）独立重构成平铺于 `src/cards/` 下的自包含模块，包含独立的词典、数学库、视图与清单声明，并在迁移后删除旧包。

### 评论
负空间感知是绘画与造型训练的关键支柱，涵盖了连续滑块估算、2AFC 面积二分选择、网格顶点反切盲打以及瞬时记忆匹配 4 种截然不同的交互形态。将它们彻底解耦并平铺为 4 张卡片，不仅消除了跨模式的大 `switch` 逻辑分发，而且使每张卡片的几何生成与打分判定完全自治。

### 目标
1. 创建 `src/cards/neg_ratio_estimation/` 目录及其自包含多语言、数学生成器、专属散点分析与交互视图。
2. 创建 `src/cards/neg_area_comparison_2afc/` 目录及其自包含模块。
3. 创建 `src/cards/neg_vertex_fitting/` 目录及其自包含模块。
4. 创建 `src/cards/neg_shape_match_2afc/` 目录及其自包含模块。
5. 清除 `src/packs/negative_space/` 过渡包目录。

### 基本原理
1. 每张卡片均拥有独立的 `locales/{zh-CN,en-US}.json`，采用纯相对 key 描述词条。
2. 卡片入口 `index.tsx` 导出标准 `CardManifest`，由 `SystemDomainRegistry` 自动发现并挂载。
3. 视图组件使用 `.tsx` 规范命名与导出，避免 JSX 解析错误。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #comp/ui #concept/config #scope/core #ai/instruct #task/domain/geometry #task/object/negative-space-cards #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 构建 `neg_ratio_estimation`（负形占比滑块评估）卡片

创建自包含词典、数学库、专属分析视图、交互视图及导出入口。

~~~~~act
write_file
src/cards/neg_ratio_estimation/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Negative Space Ratio",
  "desc": "Estimate the area percentage of negative space outside the irregular polygon.",
  "instruction": "Estimate the percentage of white negative space relative to the whole canvas.",
  "settings": {
    "showToleranceBandTitle": "Dynamic Tolerance Guide",
    "showToleranceBandDesc": "Show visual indicator lines on slider for dynamic error tolerance."
  },
  "views": {
    "ratioHint": "Estimate the area percentage of white negative space relative to the whole scene",
    "ratioLabel": "Negative Space Ratio Estimation:"
  },
  "analytics": {
    "ratioScatter": {
      "tabLabel": "Ratio Estimation",
      "title": "{{title}} · Ratio Analysis",
      "subTitle": "Insights into your perceptual sensitivity for negative space area",
      "cardTitle": "Space Sensitivity Diagnostics",
      "avgError": "Average Ratio Error:",
      "desc": "The closer points lie to the diagonal, the sharper your spatial area intuition."
    }
  }
}
~~~~~

~~~~~act
write_file
src/cards/neg_ratio_estimation/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "负形占比滑块评估",
  "desc": "估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。",
  "instruction": "估计黑色主体周围的白色留白（负形）占画面总面积的百分比",
  "settings": {
    "showToleranceBandTitle": "动态容错辅助指示线",
    "showToleranceBandDesc": "在滑块上显示实时动态 Δ% 容错感应区间指示线。"
  },
  "views": {
    "ratioHint": "估计白色留白 (负形) 占整幅画面的面积百分比",
    "ratioLabel": "负形空间占比估计:"
  },
  "analytics": {
    "ratioScatter": {
      "tabLabel": "留白占比评估",
      "title": "{{title}} · 留白占比分析",
      "subTitle": "洞察你对留白空间面积占比估算的直觉灵敏度",
      "cardTitle": "空间留白敏感度诊断",
      "avgError": "负形占比平均绝对误差:",
      "desc": "散点越紧贴对角线，代表对负形几何空隙的面积直觉越敏锐精准。"
    }
  }
}
~~~~~

~~~~~act
write_file
src/cards/neg_ratio_estimation/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export const NEGATIVE_SPACE_CANVAS_SIZE = 400;

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  vertices: Point[];
  canvasArea: number;
  positiveArea: number;
  negativeArea: number;
  targetNegativeRatio: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userRatio: number;
  targetRatio: number;
  errorValue: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/neg_ratio_estimation/utils/generator.ts
~~~~~
~~~~~typescript
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type HitResult,
  type QuestionData,
} from '../types';

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

export function getNegativeSpaceToleranceForLevel(level: number): number {
  return Math.round(expDecayInterpolate(10.0, 1.2, level) * 10) / 10;
}

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

export function generateQuestion(difficultyLevel: number): QuestionData {
  const id = `nsq_ratio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, difficultyLevel));
  const tolerance = getNegativeSpaceToleranceForLevel(clampedLevel);
  const canvasArea = NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE;

  let vertices = generateRandomPolygon(clampedLevel);
  let posArea = calcPolygonArea(vertices);

  let attempts = 0;
  while ((posArea / canvasArea < 0.15 || posArea / canvasArea > 0.8) && attempts < 10) {
    attempts++;
    vertices = generateRandomPolygon(clampedLevel);
    posArea = calcPolygonArea(vertices);
  }

  const negArea = canvasArea - posArea;
  const targetNegativeRatio = Math.round((negArea / canvasArea) * 1000) / 10;

  return {
    id,
    difficultyLevel: clampedLevel,
    vertices,
    canvasArea,
    positiveArea: Math.round(posArea),
    negativeArea: Math.round(negArea),
    targetNegativeRatio,
    tolerance,
  };
}

export function evaluateAnswer(userVal: number, question: QuestionData): HitResult {
  const userRatio = typeof userVal === 'number' ? userVal : 50;
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
~~~~~

~~~~~act
write_file
src/cards/neg_ratio_estimation/analytics.tsx
~~~~~
~~~~~typescript
import { Crosshair } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import type { CardAnalyticsView } from '../../core/cardContract';
import { calculateBasicOverallStats } from '../../core/contracts';
import { i18n } from '../../core/i18n';
import { CANVAS_THEME, hexToRgba } from '../../utils/theme';

export function createNegRatioAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'ratio_scatter',
      tabLabel: 'analytics.ratioScatter.tabLabel',
      title: 'analytics.ratioScatter.title',
      subTitle: 'analytics.ratioScatter.subTitle',
      icon: Crosshair,
      renderVisualizer: (canvas, records) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = CANVAS_THEME.shape.stroke;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = CANVAS_THEME.text.secondary;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, h - 30);
        ctx.lineTo(w - 20, 20);
        ctx.stroke();

        for (const r of records) {
          const target = Number(r.targetNegativeRatio ?? 50);
          const user = Number(r.userRatio ?? 50);
          const px = 30 + (target / 100) * (w - 50);
          const py = h - 30 - (user / 100) * (h - 50);

          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = r.isHit
            ? hexToRgba(CANVAS_THEME.status.hit, 0.7)
            : hexToRgba(CANVAS_THEME.status.miss, 0.7);
          ctx.fill();
        }
      },
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const avgRatioErr =
          totalCount > 0
            ? Math.round(
                (records.reduce((acc, c) => acc + Number(c.errorValue || 0), 0) / totalCount) * 10,
              ) / 10
            : 0;

        return (
          <Callout
            variant="success"
            icon={Crosshair}
            title={i18n.t('cards.neg_ratio_estimation.analytics.ratioScatter.cardTitle')}
          >
            <div className="space-y-1.5 text-xs text-foreground pt-1">
              <div className="flex justify-between font-mono bg-card p-2 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
                <span className="text-muted-foreground">
                  {i18n.t('cards.neg_ratio_estimation.analytics.ratioScatter.avgError')}
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  ±{avgRatioErr}%
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {i18n.t('cards.neg_ratio_estimation.analytics.ratioScatter.desc')}
              </p>
            </div>
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
src/cards/neg_ratio_estimation/NegRatioEstimationView.tsx
~~~~~
~~~~~typescript
import { Maximize2 } from 'lucide-preact';
import { CanvasView } from '../../components/common/CanvasView';
import { StandardSliderView } from '../../components/common/StandardSliderView';
import { drawPolygonCanvas } from '../../core/canvas/drawPolygon';
import { useTranslation } from '../../core/i18n';
import { CANVAS_THEME } from '../../utils/theme';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type HitResult,
  type QuestionData,
} from './types';

export interface NegRatioEstimationViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function NegRatioEstimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: NegRatioEstimationViewProps) {
  const { t } = useTranslation();
  const { targetNegativeRatio, tolerance } = question;
  const isHit = Boolean(userAnswer?.isHit);

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('cards.neg_ratio_estimation.views.ratioHint')}
      hintIcon={Maximize2}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label={t('cards.neg_ratio_estimation.views.ratioLabel')}
      max={100}
      step={0.1}
      initialValue={50.0}
      unit="%"
      targetValue={targetNegativeRatio}
      tolerance={tolerance}
      showToleranceBand={showToleranceBand}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userAnswer?.userRatio}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="button"
      submitButtonText={t('common.confirmSpace')}
      onAnswer={onAnswer}
      preview={
        <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center">
          <CanvasView
            width={NEGATIVE_SPACE_CANVAS_SIZE}
            height={NEGATIVE_SPACE_CANVAS_SIZE}
            className="w-full max-w-[340px] aspect-square rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) => {
              if (question.vertices) {
                drawPolygonCanvas({
                  canvas,
                  vertices: question.vertices,
                  size: NEGATIVE_SPACE_CANVAS_SIZE,
                  fillColor: CANVAS_THEME.shape.fill,
                  strokeColor: CANVAS_THEME.shape.stroke,
                  isHighlighted: showAnswer && isHit,
                });
              }
            }}
            deps={[question.vertices, showAnswer, isHit]}
          />
        </div>
      }
    />
  );
}
~~~~~

~~~~~act
write_file
src/cards/neg_ratio_estimation/index.tsx
~~~~~
~~~~~typescript
import { Maximize2 } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { NegativeSpaceSettings } from '../../storage/settings';
import { NegRatioEstimationView } from './NegRatioEstimationView';
import { createNegRatioAnalytics } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { evaluateAnswer, generateQuestion } from './utils/generator';

export const negRatioEstimationCard: CardManifest<
  QuestionData,
  HitResult,
  number,
  NegativeSpaceSettings
> = {
  id: 'neg_ratio_estimation',
  domain: 'form_and_proportion',
  icon: Maximize2,
  tags: {
    domain: ['form_and_proportion'],
    path: ['absolute_estimation'],
    challenge: ['figure_ground_reversal'],
    interaction: ['continuous_mod'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: 'settings.showToleranceBandTitle',
      description: 'settings.showToleranceBandDesc',
    },
  ],
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
  training: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, question) => evaluateAnswer(userVal, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      targetNegativeRatio: q.targetNegativeRatio,
      userRatio: userVal,
      errorValue: hitResult.errorValue,
      positiveArea: q.positiveArea,
      negativeArea: q.negativeArea,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <NegRatioEstimationView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        hitMargin={settings.sliderHitMargin ?? 12}
        showToleranceBand={settings.showToleranceBand ?? true}
      />
    ),
  },
  analytics: {
    views: createNegRatioAnalytics(),
  },
};

export default negRatioEstimationCard;
~~~~~

#### Acts 2: 构建 `neg_area_comparison_2afc`（负形面积二分判别）卡片

创建词典、生成算法、2AFC 视图与入口导出。

~~~~~act
write_file
src/cards/neg_area_comparison_2afc/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Negative Area 2AFC",
  "desc": "Compare two silhouettes and identify which one has greater negative space area.",
  "instruction": "Identify which side contains more negative white space (Keys 1 / 2).",
  "views": {
    "areaHint": "Identify which side contains larger negative white space area (Keys 1 / 2)",
    "whiteSpace": "White Space {{ratio}}%"
  }
}
~~~~~

~~~~~act
write_file
src/cards/neg_area_comparison_2afc/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "负形面积二分判别",
  "desc": "快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。",
  "instruction": "二选一判别哪一侧画面的白色留白（负形）面积更大",
  "views": {
    "areaHint": "判别哪一侧的白色留白 (负形) 面积更大 (键 1 / 2)",
    "whiteSpace": "留白 {{ratio}}%"
  }
}
~~~~~

~~~~~act
write_file
src/cards/neg_area_comparison_2afc/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export const TWO_AFC_CANVAS_SIZE = 280;

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  canvasArea: number;
  verticesA: Point[];
  verticesB: Point[];
  negAreaA: number;
  negAreaB: number;
  negRatioA: number;
  negRatioB: number;
  largerSide: 'A' | 'B';
  areaDeltaPercent: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  negRatioA: number;
  negRatioB: number;
  errorValue: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/neg_area_comparison_2afc/utils/generator.ts
~~~~~
~~~~~typescript
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import {
  TWO_AFC_CANVAS_SIZE,
  type HitResult,
  type QuestionData,
} from '../types';

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

export function calcPolygonCentroid(vertices: Point[]): Point {
  let cx = 0;
  let cy = 0;
  for (const p of vertices) {
    cx += p.x;
    cy += p.y;
  }
  return { x: cx / vertices.length, y: cy / vertices.length };
}

export function generateRandomPolygon(
  level: number,
  canvasSize = TWO_AFC_CANVAS_SIZE,
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

export function get2AfcdeltaForLevel(level: number): number {
  return expDecayInterpolate(0.35, 0.02, level);
}

export function generateQuestion(difficultyLevel: number): QuestionData {
  const id = `nsq_2afc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, difficultyLevel));
  const canvasArea = TWO_AFC_CANVAS_SIZE * TWO_AFC_CANVAS_SIZE;
  const delta = get2AfcdeltaForLevel(clampedLevel);

  const largerSide: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';
  const baseNegRatio = 0.45 + Math.random() * 0.3;
  const halfDelta = delta / 2;

  const negRatioA =
    largerSide === 'A' ? baseNegRatio * (1 + halfDelta) : baseNegRatio * (1 - halfDelta);
  const negRatioB =
    largerSide === 'B' ? baseNegRatio * (1 + halfDelta) : baseNegRatio * (1 - halfDelta);

  const clampedRatioA = Math.max(0.2, Math.min(0.88, negRatioA));
  const clampedRatioB = Math.max(0.2, Math.min(0.88, negRatioB));

  const negAreaA = Math.round(canvasArea * clampedRatioA);
  const negAreaB = Math.round(canvasArea * clampedRatioB);

  const posAreaA = canvasArea - negAreaA;
  const posAreaB = canvasArea - negAreaB;

  const rawPolyA = generateRandomPolygon(clampedLevel);
  const rawPolyB = generateRandomPolygon(clampedLevel);

  const verticesA = scalePolygonToArea(rawPolyA, posAreaA, TWO_AFC_CANVAS_SIZE);
  const verticesB = scalePolygonToArea(rawPolyB, posAreaB, TWO_AFC_CANVAS_SIZE);

  const actualPosA = calcPolygonArea(verticesA);
  const actualPosB = calcPolygonArea(verticesB);
  const actualNegA = canvasArea - actualPosA;
  const actualNegB = canvasArea - actualPosB;

  const finalRatioA = Math.round((actualNegA / canvasArea) * 1000) / 10;
  const finalRatioB = Math.round((actualNegB / canvasArea) * 1000) / 10;
  const finalLarger: 'A' | 'B' = actualNegA >= actualNegB ? 'A' : 'B';
  const actualDeltaPercent =
    Math.round((Math.abs(actualNegA - actualNegB) / ((actualNegA + actualNegB) / 2)) * 1000) / 10;

  return {
    id,
    difficultyLevel: clampedLevel,
    canvasArea,
    verticesA,
    verticesB,
    negAreaA: Math.round(actualNegA),
    negAreaB: Math.round(actualNegB),
    negRatioA: finalRatioA,
    negRatioB: finalRatioB,
    largerSide: finalLarger,
    areaDeltaPercent: actualDeltaPercent,
    tolerance: delta,
  };
}

export function evaluateAnswer(userChoice: 'A' | 'B', question: QuestionData): HitResult {
  const isHit = userChoice === question.largerSide;

  return {
    isHit,
    userChoice,
    correctChoice: question.largerSide,
    negRatioA: question.negRatioA,
    negRatioB: question.negRatioB,
    errorValue: isHit ? 0 : question.areaDeltaPercent,
    tolerance: question.tolerance,
  };
}
~~~~~

~~~~~act
write_file
src/cards/neg_area_comparison_2afc/NegAreaComparison2AfcView.tsx
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import { CanvasView } from '../../components/common/CanvasView';
import { Standard2AfcView } from '../../components/common/Standard2AfcView';
import { drawPolygonCanvas } from '../../core/canvas/drawPolygon';
import { useTranslation } from '../../core/i18n';
import { CANVAS_THEME } from '../../utils/theme';
import {
  TWO_AFC_CANVAS_SIZE,
  type HitResult,
  type QuestionData,
} from './types';

export interface NegAreaComparison2AfcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer?: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function NegAreaComparison2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: NegAreaComparison2AfcViewProps) {
  const { t } = useTranslation();
  const largerSide = question.largerSide;
  const isAHit = largerSide === 'A';
  const isBHit = largerSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('cards.neg_area_comparison_2afc.views.areaHint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: t('common.areaA'),
        isCorrect: isAHit,
        badge: t('cards.neg_area_comparison_2afc.views.whiteSpace', {
          ratio: question.negRatioA ?? 50,
        }),
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.verticesA,
                  size: TWO_AFC_CANVAS_SIZE,
                  fillColor: CANVAS_THEME.shape.fill,
                  strokeColor: CANVAS_THEME.shape.stroke,
                })
              }
              deps={[question.verticesA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('common.areaB'),
        isCorrect: isBHit,
        badge: t('cards.neg_area_comparison_2afc.views.whiteSpace', {
          ratio: question.negRatioB ?? 50,
        }),
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.verticesB,
                  size: TWO_AFC_CANVAS_SIZE,
                  fillColor: CANVAS_THEME.shape.fill,
                  strokeColor: CANVAS_THEME.shape.stroke,
                })
              }
              deps={[question.verticesB]}
            />
          </div>
        ),
      }}
    />
  );
}
~~~~~

~~~~~act
write_file
src/cards/neg_area_comparison_2afc/index.tsx
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { NegAreaComparison2AfcView } from './NegAreaComparison2AfcView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { evaluateAnswer, generateQuestion } from './utils/generator';

export const negAreaComparison2AfcCard: CardManifest<
  QuestionData,
  HitResult,
  'A' | 'B',
  BaseModuleSettings
> = {
  id: 'neg_area_comparison_2afc',
  domain: 'form_and_proportion',
  icon: Columns,
  tags: {
    domain: ['form_and_proportion'],
    path: ['relational_mapping'],
    challenge: ['figure_ground_reversal'],
    interaction: ['binary_choice'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  training: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, question) => evaluateAnswer(userVal, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      userChoice: userVal,
      correctChoice: q.largerSide,
      negRatioA: q.negRatioA,
      negRatioB: q.negRatioB,
      areaDeltaPercent: q.areaDeltaPercent,
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <NegAreaComparison2AfcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
};

export default negAreaComparison2AfcCard;
~~~~~

#### Acts 3: 构建 `neg_vertex_fitting`（负形边界反切定点）卡片

创建反切定点自包含词典、点阵生成器、双画布交互视图与导出入口。

~~~~~act
write_file
src/cards/neg_vertex_fitting/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Negative Vertex Fitting",
  "desc": "Observe the negative space contours and locate the truncated vertex on the grid.",
  "instruction": "Click to locate the truncated vertex based on negative space contours.",
  "views": {
    "vertexHint": "Compare negative space and click to locate the truncated vertex on the right"
  }
}
~~~~~

~~~~~act
write_file
src/cards/neg_vertex_fitting/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "负形边界反切定点",
  "desc": "观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。",
  "instruction": "观察左侧完整参考的负形挤压轮廓，在右侧点阵中点击定位被截断的正形顶点",
  "views": {
    "vertexHint": "对比左侧负形空间，在右侧点阵中点击定位被截断的顶点"
  }
}
~~~~~

~~~~~act
write_file
src/cards/neg_vertex_fitting/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export const FITTING_CANVAS_SIZE = 340;

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  canvasArea: number;
  vertices: Point[];
  targetVertexIndex: number;
  targetPoint: Point;
  truncatedVertices: Point[];
  distractorPoints: Point[];
  gridDim: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  clickPoint: Point;
  nearestGridPoint: Point;
  errorDistance: number;
  tolerance: number;
  isWithinRange?: boolean;
}
~~~~~

~~~~~act
write_file
src/cards/neg_vertex_fitting/utils/generator.ts
~~~~~
~~~~~typescript
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { Point } from '../../../types';
import {
  FITTING_CANVAS_SIZE,
  type HitResult,
  type QuestionData,
} from '../types';

export function generateRandomPolygon(
  level: number,
  canvasSize = FITTING_CANVAS_SIZE,
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

export function generateQuestion(difficultyLevel: number): QuestionData {
  const id = `nsq_fit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, difficultyLevel));
  const canvasArea = FITTING_CANVAS_SIZE * FITTING_CANVAS_SIZE;
  const vertices = generateRandomPolygon(clampedLevel, FITTING_CANVAS_SIZE);
  const n = vertices.length;

  const targetVertexIndex = Math.floor(Math.random() * n);
  const targetPoint = vertices[targetVertexIndex];

  const prevIdx = (targetVertexIndex - 1 + n) % n;
  const nextIdx = (targetVertexIndex + 1) % n;
  const prevPoint = vertices[prevIdx];
  const nextPoint = vertices[nextIdx];

  const cutRatio = 0.45;
  const cutPrev: Point = {
    x: Math.round(prevPoint.x + (targetPoint.x - prevPoint.x) * (1 - cutRatio)),
    y: Math.round(prevPoint.y + (targetPoint.y - prevPoint.y) * (1 - cutRatio)),
  };
  const cutNext: Point = {
    x: Math.round(nextPoint.x + (targetPoint.x - nextPoint.x) * (1 - cutRatio)),
    y: Math.round(nextPoint.y + (targetPoint.y - nextPoint.y) * (1 - cutRatio)),
  };

  const truncatedVertices: Point[] = [];
  for (let i = 0; i < n; i++) {
    if (i === targetVertexIndex) {
      truncatedVertices.push(cutPrev);
      truncatedVertices.push(cutNext);
    } else {
      truncatedVertices.push(vertices[i]);
    }
  }

  const gridDim = 3;
  const S_MAX = 24;
  const S_MIN = 3.5;
  const t = (clampedLevel - 1) / 34;
  const S = S_MAX * (S_MIN / S_MAX) ** t;

  const targetRow = Math.floor(Math.random() * gridDim);
  const targetCol = Math.floor(Math.random() * gridDim);
  const distractorPoints: Point[] = [];

  for (let r = 0; r < gridDim; r++) {
    for (let c = 0; c < gridDim; c++) {
      const x = Math.round((targetPoint.x + (c - targetCol) * S) * 100) / 100;
      const y = Math.round((targetPoint.y + (r - targetRow) * S) * 100) / 100;
      distractorPoints.push({ x, y });
    }
  }

  return {
    id,
    difficultyLevel: clampedLevel,
    canvasArea,
    vertices,
    targetVertexIndex,
    targetPoint,
    truncatedVertices,
    distractorPoints,
    gridDim,
    tolerance: S / 2,
  };
}

export function evaluateAnswer(clickPoint: Point, question: QuestionData): HitResult {
  const targetPoint = question.targetPoint ?? { x: 0, y: 0 };
  const distractorPoints = question.distractorPoints ?? [];

  const hitRes = evaluatePointGridHit(clickPoint, targetPoint, distractorPoints);
  return {
    isHit: hitRes.isHit,
    clickPoint,
    nearestGridPoint: hitRes.nearestGridPoint,
    errorDistance: hitRes.errorDistance,
    tolerance: question.tolerance,
    isWithinRange: hitRes.isWithinRange,
  };
}
~~~~~

~~~~~act
write_file
src/cards/neg_vertex_fitting/NegVertexFittingView.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../components/common/PointClickCanvas';
import { drawPolygonCanvas } from '../../core/canvas/drawPolygon';
import type { Point } from '../../types';
import { CANVAS_THEME, hexToRgba } from '../../utils/theme';
import {
  FITTING_CANVAS_SIZE,
  type HitResult,
  type QuestionData,
} from './types';

export interface NegVertexFittingViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: { clickPoint: Point; hitResult: HitResult }) => void;
  disabled?: boolean;
}

export function NegVertexFittingView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: NegVertexFittingViewProps) {
  const leftFittingRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!question.vertices) return;
    drawPolygonCanvas({
      canvas: leftFittingRef.current,
      vertices: question.vertices,
      size: FITTING_CANVAS_SIZE,
      fillColor: CANVAS_THEME.shape.fill,
      strokeColor: CANVAS_THEME.shape.stroke,
    });
  }, [question.vertices]);

  const handleCustomOverlayRender = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (question.truncatedVertices && question.truncatedVertices.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(question.truncatedVertices[0].x, question.truncatedVertices[0].y);
        for (let i = 1; i < question.truncatedVertices.length; i++) {
          ctx.lineTo(question.truncatedVertices[i].x, question.truncatedVertices[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = CANVAS_THEME.shape.fill;
        ctx.fill();
        ctx.strokeStyle = CANVAS_THEME.shape.stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (showAnswer && question.vertices) {
        ctx.beginPath();
        ctx.moveTo(question.vertices[0].x, question.vertices[0].y);
        for (let i = 1; i < question.vertices.length; i++) {
          ctx.lineTo(question.vertices[i].x, question.vertices[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = hexToRgba(CANVAS_THEME.status.hit, 0.7);
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },
    [question.truncatedVertices, question.vertices, showAnswer],
  );

  const handleCommitPoint = (clickPoint: Point) => {
    // 采用自身 evaluateAnswer 判定
    const { evaluateAnswer } = require('./utils/generator');
    const hitResult: HitResult = evaluateAnswer(clickPoint, question);
    if (!hitResult.isWithinRange) return;
    onAnswer({ clickPoint, hitResult });
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftFittingRef}
          width={FITTING_CANVAS_SIZE}
          height={FITTING_CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
        />
      </div>

      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <PointClickCanvas
          canvasSize={FITTING_CANVAS_SIZE}
          gridPoints={question.distractorPoints || []}
          targetPoint={question.targetPoint}
          userNearestPoint={userAnswer?.nearestGridPoint}
          showAnswer={showAnswer}
          isHit={userAnswer?.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          customOverlayRender={handleCustomOverlayRender}
          onCommitPoint={(pt) => {
            const hitResult = require('./utils/generator').evaluateAnswer(pt, question);
            if (!hitResult.isWithinRange) return;
            onAnswer({ clickPoint: pt, hitResult });
          }}
        />
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/cards/neg_vertex_fitting/index.tsx
~~~~~
~~~~~typescript
import { Crosshair } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { NegVertexFittingView } from './NegVertexFittingView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { evaluateAnswer, generateQuestion } from './utils/generator';

export const negVertexFittingCard: CardManifest<
  QuestionData,
  HitResult,
  { clickPoint: Point; hitResult: HitResult },
  BaseModuleSettings
> = {
  id: 'neg_vertex_fitting',
  domain: 'form_and_proportion',
  icon: Crosshair,
  tags: {
    domain: ['form_and_proportion', 'spatial_structure'],
    path: ['absolute_estimation'],
    challenge: ['figure_ground_reversal'],
    interaction: ['spatial_locate'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  training: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal) => userVal.hitResult,
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult) => ({
      targetVertexIndex: q.targetVertexIndex,
      targetPoint: q.targetPoint ? [q.targetPoint.x, q.targetPoint.y] : undefined,
      userClick: hitResult.nearestGridPoint
        ? [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y]
        : undefined,
      errorPixelDistance: hitResult.errorDistance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <NegVertexFittingView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
};

export default negVertexFittingCard;
~~~~~

#### Acts 4: 构建 `neg_shape_match_2afc`（负形轮廓记忆匹配）卡片

创建记忆刺激/回忆双阶段视图、生成器及出口导出。

~~~~~act
write_file
src/cards/neg_shape_match_2afc/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Negative Shape Match",
  "desc": "Memorize negative space contours and match the identical silhouette (2AFC).",
  "instruction": "Memorize the shape and select the identical one (Keys 1 / 2).",
  "views": {
    "memoryStimulusHint": "Memorize the negative space contour ({{ms}}ms)",
    "memoryRecallHint": "Recall Match: Which side matches the shape just shown? (Keys 1 / 2)"
  }
}
~~~~~

~~~~~act
write_file
src/cards/neg_shape_match_2afc/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "负形轮廓记忆匹配",
  "desc": "瞬时记忆负形空隙轮廓，在两张 1:1 等大形状中二选一辨识目标。",
  "instruction": "瞬时记忆负形空隙轮廓特征，在候选区二选一选出完全相同的形状",
  "views": {
    "memoryStimulusHint": "瞬时记忆负形轮廓特征 ({{ms}}ms)",
    "memoryRecallHint": "匹配回忆：哪一侧与刚才展示完全相同？(键 1 / 2)"
  }
}
~~~~~

~~~~~act
write_file
src/cards/neg_shape_match_2afc/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export const NEGATIVE_SPACE_CANVAS_SIZE = 400;

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  canvasArea: number;
  targetPolygon: Point[];
  optionsPolygons: Point[][];
  correctOptionIndex: number;
  correctChoice: 'A' | 'B';
  displayTimeMs: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  userChoiceIndex: number;
  correctChoice: 'A' | 'B';
  correctOptionIndex: number;
  errorValue: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/neg_shape_match_2afc/utils/generator.ts
~~~~~
~~~~~typescript
import type { Point } from '../../../types';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type HitResult,
  type QuestionData,
} from '../types';

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

export function generateQuestion(difficultyLevel: number): QuestionData {
  const id = `nsq_match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, difficultyLevel));
  const canvasArea = NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE;
  const targetPolygon = generateRandomPolygon(clampedLevel, NEGATIVE_SPACE_CANVAS_SIZE);
  const distractorPolygon = perturbPolygon(
    targetPolygon,
    clampedLevel,
    NEGATIVE_SPACE_CANVAS_SIZE,
  );

  const isTargetA = Math.random() < 0.5;
  const optionsPolygons = isTargetA
    ? [targetPolygon, distractorPolygon]
    : [distractorPolygon, targetPolygon];
  const correctOptionIndex = isTargetA ? 0 : 1;
  const correctChoice: 'A' | 'B' = isTargetA ? 'A' : 'B';

  const t = (clampedLevel - 1) / 34;
  const maxDisplayMs = 2400;
  const minDisplayMs = 450;
  const displayTimeMs = Math.round(maxDisplayMs * (minDisplayMs / maxDisplayMs) ** t);

  return {
    id,
    difficultyLevel: clampedLevel,
    canvasArea,
    targetPolygon,
    optionsPolygons,
    correctOptionIndex,
    correctChoice,
    displayTimeMs,
    tolerance: 0,
  };
}

export function evaluateAnswer(userChoiceInput: 0 | 1 | 'A' | 'B', question: QuestionData): HitResult {
  let userChoiceIndex: number;
  if (typeof userChoiceInput === 'number') {
    userChoiceIndex = userChoiceInput;
  } else if (userChoiceInput === 'A') {
    userChoiceIndex = 0;
  } else {
    userChoiceIndex = 1;
  }

  const isHit = userChoiceIndex === question.correctOptionIndex;
  const userChoice: 'A' | 'B' = userChoiceIndex === 0 ? 'A' : 'B';

  return {
    isHit,
    userChoice,
    userChoiceIndex,
    correctChoice: question.correctChoice,
    correctOptionIndex: question.correctOptionIndex,
    errorValue: isHit ? 0 : 1,
    tolerance: 0,
  };
}
~~~~~

~~~~~act
write_file
src/cards/neg_shape_match_2afc/NegShapeMatch2AfcView.tsx
~~~~~
~~~~~typescript
import { Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Choice2AfcContainer } from '../../components/common/Choice2AfcContainer';
import { QuestionCardShell } from '../../components/common/QuestionCardShell';
import { drawPolygonCanvas } from '../../core/canvas/drawPolygon';
import { useTranslation } from '../../core/i18n';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type HitResult,
  type QuestionData,
} from './types';

export interface NegShapeMatch2AfcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer?: HitResult | null;
  onAnswer: (choice: 0 | 1) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function NegShapeMatch2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: NegShapeMatch2AfcViewProps) {
  const { t } = useTranslation();
  const [matchPhase, setMatchPhase] = useState<'stimulus' | 'recall'>('stimulus');
  const [selectedMatchChoice, setSelectedMatchChoice] = useState<'A' | 'B' | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const matchOptionRefA = useRef<HTMLCanvasElement | null>(null);
  const matchOptionRefB = useRef<HTMLCanvasElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset phase and selection when question changes
  useEffect(() => {
    setMatchPhase('stimulus');
    setSelectedMatchChoice(null);
  }, [question.id]);

  useEffect(() => {
    if (matchPhase === 'stimulus' && !showAnswer) {
      const timer = setTimeout(() => {
        setMatchPhase('recall');
      }, question.displayTimeMs || 1500);
      return () => clearTimeout(timer);
    }
  }, [matchPhase, question.displayTimeMs, showAnswer]);

  useEffect(() => {
    if (matchPhase === 'stimulus' && question.targetPolygon) {
      drawPolygonCanvas({
        canvas: canvasRef.current,
        vertices: question.targetPolygon,
        size: NEGATIVE_SPACE_CANVAS_SIZE,
      });
    }
  }, [matchPhase, question.targetPolygon]);

  useEffect(() => {
    if ((matchPhase === 'recall' || showAnswer) && question.optionsPolygons) {
      drawPolygonCanvas({
        canvas: matchOptionRefA.current,
        vertices: question.optionsPolygons[0],
        size: NEGATIVE_SPACE_CANVAS_SIZE,
      });
      drawPolygonCanvas({
        canvas: matchOptionRefB.current,
        vertices: question.optionsPolygons[1],
        size: NEGATIVE_SPACE_CANVAS_SIZE,
      });
    }
  }, [matchPhase, showAnswer, question.optionsPolygons]);

  const handleSelectMatchChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer || matchPhase !== 'recall') return;
      setSelectedMatchChoice(choice);
      onAnswer(choice === 'A' ? 0 : 1);
    },
    [disabled, showAnswer, matchPhase, onAnswer],
  );

  const isRevealed = showAnswer;
  const isTargetA = question.correctOptionIndex === 0;
  const isTargetB = question.correctOptionIndex === 1;

  return (
    <QuestionCardShell
      hintText={
        matchPhase === 'stimulus' && !isRevealed
          ? t('cards.neg_shape_match_2afc.views.memoryStimulusHint', {
              ms: question.displayTimeMs ?? 1500,
            })
          : t('cards.neg_shape_match_2afc.views.memoryRecallHint')
      }
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      {matchPhase === 'stimulus' && !isRevealed ? (
        <div className="bg-muted/60 p-4 rounded-3xl border border-border shadow-inner flex flex-col items-center gap-3 w-full max-w-sm">
          <canvas
            ref={canvasRef}
            width={NEGATIVE_SPACE_CANVAS_SIZE}
            height={NEGATIVE_SPACE_CANVAS_SIZE}
            className="w-full aspect-square rounded-2xl border border-border shadow-sm bg-card"
          />
          <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
            <div
              key={`${question.id}-${matchPhase}`}
              className="bg-indigo-600 h-full"
              style={{
                width: '100%',
                animation: `shrinkWidth ${question.displayTimeMs}ms linear forwards`,
              }}
            />
          </div>
        </div>
      ) : (
        <Choice2AfcContainer
          optionA={{
            key: 'A',
            title: t('common.areaA'),
            isCorrect: isTargetA,
            content: (
              <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
                <canvas
                  ref={matchOptionRefA}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm bg-card"
                />
              </div>
            ),
          }}
          optionB={{
            key: 'B',
            title: t('common.areaB'),
            isCorrect: isTargetB,
            content: (
              <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
                <canvas
                  ref={matchOptionRefB}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm bg-card"
                />
              </div>
            ),
          }}
          selectedChoice={selectedMatchChoice}
          showAnswer={showAnswer}
          disabled={disabled || matchPhase !== 'recall'}
          enableKeyboardShortcuts={true}
          onSelect={handleSelectMatchChoice}
        />
      )}
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/cards/neg_shape_match_2afc/index.tsx
~~~~~
~~~~~typescript
import { Sparkles } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { NegShapeMatch2AfcView } from './NegShapeMatch2AfcView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { evaluateAnswer, generateQuestion } from './utils/generator';

export const negShapeMatch2AfcCard: CardManifest<
  QuestionData,
  HitResult,
  0 | 1,
  BaseModuleSettings
> = {
  id: 'neg_shape_match_2afc',
  domain: 'form_and_proportion',
  icon: Sparkles,
  tags: {
    domain: ['form_and_proportion'],
    path: ['relational_mapping'],
    challenge: ['working_memory', 'figure_ground_reversal'],
    interaction: ['binary_choice'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  training: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, question) => evaluateAnswer(userVal, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      userChoice: userVal === 0 ? 'A' : 'B',
      correctChoice: q.correctChoice,
      displayTimeMs: q.displayTimeMs,
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <NegShapeMatch2AfcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
};

export default negShapeMatch2AfcCard;
~~~~~

#### Acts 5: 安全清理旧版 `src/packs/negative_space/` 目录

执行绞杀者清理，彻底移除旧的 `negative_space` pack 目录及其中间文件。

~~~~~act
delete_file
src/packs/negative_space/components/AreaComparison2AfcView.tsx
~~~~~

~~~~~act
delete_file
src/packs/negative_space/components/RatioEstimationView.tsx
~~~~~

~~~~~act
delete_file
src/packs/negative_space/components/ShapeMemory2AfcView.tsx
~~~~~

~~~~~act
delete_file
src/packs/negative_space/components/VertexFittingView.tsx
~~~~~

~~~~~act
delete_file
src/packs/negative_space/locales/en-US.json
~~~~~

~~~~~act
delete_file
src/packs/negative_space/locales/zh-CN.json
~~~~~

~~~~~act
delete_file
src/packs/negative_space/utils/hitDetection.ts
~~~~~

~~~~~act
delete_file
src/packs/negative_space/utils/polygonMath.ts
~~~~~

~~~~~act
delete_file
src/packs/negative_space/utils/questionGenerator.ts
~~~~~

~~~~~act
delete_file
src/packs/negative_space/utils/types.ts
~~~~~

~~~~~act
delete_file
src/packs/negative_space/utils/index.ts
~~~~~

~~~~~act
delete_file
src/packs/negative_space/views/NegativeSpaceCanvas.tsx
~~~~~

~~~~~act
delete_file
src/packs/negative_space/analytics.tsx
~~~~~

~~~~~act
delete_file
src/packs/negative_space/plugin.tsx
~~~~~

~~~~~act
delete_file
src/packs/negative_space/index.ts
~~~~~

### 下一步建议
- 执行构建或启动开发服务器（`pnpm build` / `pnpm dev`），验证 4 张负空间卡片是否被自动扫描发现并在探索大盘中正常渲染。
- 进入自适应训练与基准测试，验证滑块提交、2AFC 键盘选择、顶点定点与瞬时记忆匹配交互是否完全正常。
- 确认无误后可继续推进下一批卡片的展平迁移或生成 Git 提交。
