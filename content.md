好的，我们将把分形边缘粗糙度感知原型重构为一张规范的 FormSight 卡片。为了杜绝命名歧义并清晰表达其“通过 Hurst 指数感知边缘轮廓高频分形粗糙度”的训练本质，我们将卡片 ID 明确命名为 **`fractal_edge_roughness`**，分类归入 `rhythm_and_notan`（动态与图底/概括感知）视觉域，并将其状态标记为 `experimental`。

## [WIP] feat: 创建分形边缘粗糙度感知训练卡片 fractal_edge_roughness

### 用户需求
将 `playground/fractal_dimension_prototype.html` 原型提炼并迁移至 FormSight 核心架构体系中，创建名为 `fractal_edge_roughness` 的自包含训练卡片，标记为 `experimental` 状态，具备完整的 1~35 级动态难度自适应、Seed 隔离防作弊机制、多语言支持、双视口高清 Canvas 渲染以及偏置/频段能力诊断。

### 评论
将分形维数（Fractal Dimension / Hurst Exponent）从原型引入卡片库，极大地丰富了“图底与概括感知”维度的训练形态。它训练艺术家克服“宏观起伏”干扰、纯粹量化微观高频噪波与轮廓粗糙质感的抽象直觉，是连接几何结构与笔触质感认知的关键桥梁。

### 目标
1. 在 `src/cards/fractal_edge_roughness/` 下创建卡片完整目录结构。
2. 编写 `types.ts` 定义题目与作答命中数据结构。
3. 编写 `utils/generator.ts` 实现确定性 PRNG、中点位移（Midpoint Displacement）分形线段生成算法以及 1~35 级容错指数衰减逻辑。
4. 编写中英文词典 `locales/zh-CN.json` 与 `locales/en-US.json`。
5. 编写 `FractalEdgeRoughnessView.tsx` 交互视图，支持 HiDPI 高清渲染、明暗主题自适应以及平滑拖拽反馈。
6. 编写 `analytics.tsx` 实现系统性粗糙度感知偏置与三频段敏感度诊断。
7. 编写 `index.tsx` 导出符合规范且标记为 `experimental` 的 `CardManifest`。

### 基本原理
中点位移算法中，垂直位移的衰减因子遵循 $2^{-H}$，其中 $H \in [0.1, 1.0]$ 为 Hurst 指数（分形维数 $D = 2 - H$）。通过生成两组完全不同随机种子的分形折线，用户无法依赖特定的波峰波谷进行视觉记忆对齐，必须完全依赖对边缘高频碎裂感的整体直觉进行连续滑块调制。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #scope/ux #ai/instruct #task/domain/card #task/object/fractal-edge-roughness #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 创建卡片类型定义文件 `types.ts`

~~~~~act
write_file
src/cards/fractal_edge_roughness/types.ts
~~~~~
~~~~~ts
export interface QuestionData {
  id: string;
  difficultyLevel: number;
  targetH: number; // 目标 Hurst 指数 [0.10, 1.00]
  targetSeed: number; // 目标折线随机种子
  userSeed: number; // 用户折线独立随机种子（防作弊）
  tolerance: number; // 当前难度等级下的允许误差 ΔH
  sectorIdx: number; // 粗糙度频段：0: 高碎裂 (0.1~0.4), 1: 中度纹理 (0.4~0.7), 2: 平滑流线 (0.7~1.0)
}

export interface HitResult {
  isHit: boolean;
  userH: number;
  targetH: number;
  errorValue: number; // 绝对误差 |userH - targetH|
  signedBias: number; // 符号偏置 userH - targetH (正为偏平滑/低估粗糙度，负为过度敏感)
  tolerance: number;
}
~~~~~

#### Acts 2: 创建数学生成器与评估算法 `utils/generator.ts`

~~~~~act
write_file
src/cards/fractal_edge_roughness/utils/generator.ts
~~~~~
~~~~~ts
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
~~~~~

#### Acts 3: 创建中英文多语言词典

~~~~~act
write_file
src/cards/fractal_edge_roughness/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "分形边缘粗糙度",
  "desc": "通过调节 Hurst 指数 (H) 匹配边缘分形维数，锻炼对轮廓微观高频噪波与粗糙质感的量化直觉。",
  "instruction": "拖拽滑块调节下方线条的高频噪波感（Hurst 指数），使其粗糙度与上方目标线完全一致",
  "labels": {
    "targetEdge": "目标边缘 (Target Edge)",
    "userEdge": "你的调制 (Your Adjustment)",
    "hurstExponent": "Hurst 指数 (H)",
    "extremeRough": "极度粗糙 (H=0.1)",
    "smooth": "平滑圆润 (H=1.0)"
  },
  "analytics": {
    "roughnessBias": {
      "tabLabel": "粗糙度偏置",
      "title": "{{title}} · 粗糙度感知偏置分析",
      "subTitle": "观察 Hurst 指数系统性偏向，揭示你对微观高频毛刺的感知敏感倾向",
      "cardTitle": "粗糙度感知倾向诊断",
      "avgSignedBias": "全局平均偏转 (ΔH):",
      "overestimateRoughness": "-{{val}} (感知偏粗糙/对毛刺过度敏感)",
      "underestimateRoughness": "+{{val}} (感知偏平滑/低估高频噪波)",
      "neutral": "0 (精准中立)",
      "avgAbsError": "平均绝对误差 (ΔH):",
      "desc": "正偏置代表你倾向于将粗糙线条误判为更平滑；负偏置代表你对微小抖动极其敏感，容易过度估计粗糙度。"
    },
    "bandSensitivity": {
      "tabLabel": "频段敏感度",
      "title": "{{title}} · 粗糙频段敏感度诊断",
      "subTitle": "评估你在高碎裂、中度纹理与平滑流线三大粗糙区间的辨识准确率",
      "cardTitle": "粗糙度敏感盲区诊断",
      "weakestHint": "你在 {{sector}} 区间辨识命中率最低：",
      "accuracyRate": "{{accuracy}}% 准确率",
      "needMoreTrials": "各粗糙度频段需完成至少 3 题才能生成弱点诊断。"
    }
  },
  "sectors": {
    "highFrequency": "高碎裂带 (H 0.10-0.40)",
    "mediumFrequency": "中度纹理带 (H 0.40-0.70)",
    "lowFrequency": "平滑流线带 (H 0.70-1.00)"
  }
}
~~~~~

~~~~~act
write_file
src/cards/fractal_edge_roughness/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Fractal Edge Roughness",
  "desc": "Judge contour roughness and high-frequency noise variance by matching the Hurst exponent (H).",
  "instruction": "Adjust the lower curve's roughness (Hurst H) to match the upper target edge texture.",
  "labels": {
    "targetEdge": "Target Edge",
    "userEdge": "Your Edge Adjustment",
    "hurstExponent": "Hurst Exponent (H)",
    "extremeRough": "Extremely Rough (H=0.1)",
    "smooth": "Smooth (H=1.0)"
  },
  "analytics": {
    "roughnessBias": {
      "tabLabel": "Roughness Bias",
      "title": "{{title}} · Roughness Perception Bias",
      "subTitle": "Systematic perception offset between observed and physical Hurst roughness",
      "cardTitle": "Roughness Perception Diagnostics",
      "avgSignedBias": "Global Average Bias (ΔH):",
      "overestimateRoughness": "-{{val}} (Perceives rougher)",
      "underestimateRoughness": "+{{val}} (Perceives smoother)",
      "neutral": "0 (Accurate)",
      "avgAbsError": "Mean Absolute Error (ΔH):",
      "desc": "A positive bias indicates you tend to perceive edges as smoother than they are, while a negative bias indicates hypersensitivity to high-frequency jitter."
    },
    "bandSensitivity": {
      "tabLabel": "Band Sensitivity",
      "title": "{{title}} · Roughness Band Diagnostics",
      "subTitle": "Perceptual accuracy across high, medium, and low frequency roughness spectrums",
      "cardTitle": "Roughness Sensitivity Breakdown",
      "weakestHint": "Lowest discrimination accuracy in {{sector}}:",
      "accuracyRate": "{{accuracy}}% accuracy",
      "needMoreTrials": "Complete at least 3 trials in each roughness band to generate blindspot diagnostics."
    }
  },
  "sectors": {
    "highFrequency": "High Roughness (H 0.10-0.40)",
    "mediumFrequency": "Medium Roughness (H 0.40-0.70)",
    "lowFrequency": "Smooth Profile (H 0.70-1.00)"
  }
}
~~~~~

#### Acts 4: 创建交互视图组件 `FractalEdgeRoughnessView.tsx`

~~~~~act
write_file
src/cards/fractal_edge_roughness/FractalEdgeRoughnessView.tsx
~~~~~
~~~~~tsx
import { useEffect, useRef, useState } from 'preact/hooks';
import { StandardSliderView } from '../../components/common/StandardSliderView';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { useTranslation } from '../../core/i18n';
import { CANVAS_THEME } from '../../utils/theme';
import type { HitResult, QuestionData } from './types';
import { CANVAS_HEIGHT, CANVAS_WIDTH, generateFractalLine } from './utils/generator';

export interface FractalEdgeRoughnessViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
}

export function FractalEdgeRoughnessView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: FractalEdgeRoughnessViewProps) {
  const { t } = useTranslation();
  const [currentH, setCurrentH] = useState(0.5);

  const targetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const userCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. 绘制目标边缘波形
  useEffect(() => {
    const canvas = targetCanvasRef.current;
    if (!canvas) return;
    const ctx = setupHiDpiCanvas(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (!ctx) return;

    ctx.fillStyle = CANVAS_THEME.bg.primary;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const points = generateFractalLine(question.targetH, question.targetSeed);
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = CANVAS_THEME.shape.stroke;
      ctx.lineWidth = 1.75;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }, [question.targetH, question.targetSeed]);

  // 2. 绘制用户当前调节边缘波形
  const activeH = showAnswer && userAnswer ? userAnswer.userH : currentH;
  useEffect(() => {
    const canvas = userCanvasRef.current;
    if (!canvas) return;
    const ctx = setupHiDpiCanvas(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (!ctx) return;

    ctx.fillStyle = CANVAS_THEME.bg.primary;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const points = generateFractalLine(activeH, question.userSeed);
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }

      ctx.strokeStyle = showAnswer
        ? userAnswer?.isHit
          ? CANVAS_THEME.status.hit
          : CANVAS_THEME.status.miss
        : CANVAS_THEME.status.accent;
      ctx.lineWidth = 1.85;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }, [activeH, question.userSeed, showAnswer, userAnswer]);

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('cards.fractal_edge_roughness.instruction')}
      label={t('cards.fractal_edge_roughness.labels.hurstExponent')}
      min={0.1}
      max={1.0}
      step={0.01}
      initialValue={0.5}
      targetValue={question.targetH}
      userValue={userAnswer?.userH}
      tolerance={question.tolerance}
      showAnswer={showAnswer}
      isHit={userAnswer?.isHit}
      disabled={disabled}
      onValueChange={(_, val) => setCurrentH(val)}
      onAnswer={onAnswer}
      maxWidth="max-w-2xl"
      preview={
        <div className="w-full space-y-3">
          {/* 上视口：目标边缘 */}
          <div className="relative rounded-2xl border border-border bg-card p-3 shadow-inner">
            <span className="absolute top-2.5 left-3.5 text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
              {t('cards.fractal_edge_roughness.labels.targetEdge')}
            </span>
            <canvas
              ref={targetCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="w-full h-24 sm:h-28 rounded-xl block"
            />
          </div>

          {/* 下视口：用户实时调制边缘 */}
          <div className="relative rounded-2xl border-2 border-primary/40 bg-card p-3 shadow-inner">
            <span className="absolute top-2.5 left-3.5 text-[10px] font-mono font-bold text-primary uppercase tracking-wider">
              {t('cards.fractal_edge_roughness.labels.userEdge')}
            </span>
            <canvas
              ref={userCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="w-full h-24 sm:h-28 rounded-xl block"
            />
          </div>
        </div>
      }
    />
  );
}
~~~~~

#### Acts 5: 创建专属能力分析视图 `analytics.tsx`

~~~~~act
write_file
src/cards/fractal_edge_roughness/analytics.tsx
~~~~~
~~~~~tsx
import { AlertCircle, BarChart2, Sparkles } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import type { CardAnalyticsView } from '../../core/cardContract';
import { calculateBasicOverallStats } from '../../core/contracts';
import { i18n } from '../../core/i18n';
import { getRoughnessSectorIdx } from './utils/generator';

const SECTOR_KEYS = [
  'sectors.highFrequency',
  'sectors.mediumFrequency',
  'sectors.lowFrequency',
];

export function createFractalEdgeRoughnessAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'roughness_bias',
      tabLabel: 'analytics.roughnessBias.tabLabel',
      title: 'analytics.roughnessBias.title',
      subTitle: 'analytics.roughnessBias.subTitle',
      icon: Sparkles,
      renderVisualizer: () => {},
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        let sumSignedBias = 0;
        let sumAbsError = 0;

        for (const r of records) {
          const bias = Number(r.signedBias ?? 0);
          const err = Number(r.errorValue ?? 0);
          sumSignedBias += bias;
          sumAbsError += err;
        }

        const avgSignedBias = Math.round((sumSignedBias / totalCount) * 1000) / 1000;
        const avgAbsError = Math.round((sumAbsError / totalCount) * 1000) / 1000;

        const signedBiasText =
          avgSignedBias > 0
            ? i18n.t('cards.fractal_edge_roughness.analytics.roughnessBias.underestimateRoughness', {
                val: avgSignedBias,
              })
            : avgSignedBias < 0
              ? i18n.t('cards.fractal_edge_roughness.analytics.roughnessBias.overestimateRoughness', {
                  val: Math.abs(avgSignedBias),
                })
              : i18n.t('cards.fractal_edge_roughness.analytics.roughnessBias.neutral');

        return (
          <Callout
            variant="info"
            icon={AlertCircle}
            title={i18n.t('cards.fractal_edge_roughness.analytics.roughnessBias.cardTitle')}
          >
            <div className="space-y-2 text-xs text-foreground pt-1">
              <p className="text-muted-foreground leading-relaxed">
                {i18n.t('cards.fractal_edge_roughness.analytics.roughnessBias.desc')}
              </p>

              <div className="flex justify-between bg-card p-2 rounded-xl border border-border/60 font-mono shadow-xs">
                <span className="text-muted-foreground">
                  {i18n.t('cards.fractal_edge_roughness.analytics.roughnessBias.avgSignedBias')}
                </span>
                <span
                  className={`font-bold ${
                    avgSignedBias > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : avgSignedBias < 0
                        ? 'text-primary'
                        : 'text-foreground'
                  }`}
                >
                  {signedBiasText}
                </span>
              </div>
            </div>
          </Callout>
        );
      },
      getOverallStats: (records) => {
        const baseStats = calculateBasicOverallStats(records);
        const sumAbsError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
        const avgAbsError =
          baseStats.total > 0 ? Math.round((sumAbsError / baseStats.total) * 1000) / 1000 : 0;

        return {
          ...baseStats,
          customSummary: (
            <div className="flex justify-between text-indigo-700 font-bold border-t border-border/60 pt-1 text-xs font-mono">
              <span>{i18n.t('cards.fractal_edge_roughness.analytics.roughnessBias.avgAbsError')}</span>
              <span>{avgAbsError}</span>
            </div>
          ),
        };
      },
    },
    {
      id: 'band_sensitivity',
      tabLabel: 'analytics.bandSensitivity.tabLabel',
      title: 'analytics.bandSensitivity.title',
      subTitle: 'analytics.bandSensitivity.subTitle',
      icon: BarChart2,
      renderVisualizer: () => {},
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const sectorBuckets = Array.from({ length: 3 }, () => ({ total: 0, hits: 0 }));
        for (const r of records) {
          const targetH = Number(r.targetH ?? 0.5);
          const sIdx = getRoughnessSectorIdx(targetH);
          sectorBuckets[sIdx].total += 1;
          if (r.isHit) sectorBuckets[sIdx].hits += 1;
        }

        const validSectors = sectorBuckets
          .map((b, i) => ({
            label: i18n.t(`cards.fractal_edge_roughness.${SECTOR_KEYS[i]}`),
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
            variant="warning"
            icon={AlertCircle}
            title={i18n.t('cards.fractal_edge_roughness.analytics.bandSensitivity.cardTitle')}
          >
            {weakest ? (
              <div className="space-y-1.5 text-xs text-foreground pt-1">
                <p>
                  {i18n.t('cards.fractal_edge_roughness.analytics.bandSensitivity.weakestHint', {
                    sector: weakest.label,
                  })}
                </p>
                <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 font-mono shadow-xs">
                  <span>{weakest.label}</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {i18n.t('cards.fractal_edge_roughness.analytics.bandSensitivity.accuracyRate', {
                      accuracy: weakest.accuracy,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                {i18n.t('cards.fractal_edge_roughness.analytics.bandSensitivity.needMoreTrials')}
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

#### Acts 6: 创建卡片主清单 `index.tsx`

~~~~~act
write_file
src/cards/fractal_edge_roughness/index.tsx
~~~~~
~~~~~tsx
import { Sparkles } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { FractalEdgeRoughnessView } from './FractalEdgeRoughnessView';
import { createFractalEdgeRoughnessAnalytics } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { evaluateAnswer, generateQuestion } from './utils/generator';

export const fractalEdgeRoughnessCard: CardManifest<
  QuestionData,
  HitResult,
  number,
  BaseModuleSettings
> = {
  id: 'fractal_edge_roughness',
  domain: 'rhythm_and_notan',
  icon: Sparkles,
  tags: {
    domain: ['rhythm_and_notan'],
    path: ['extraction', 'absolute_estimation'],
    challenge: ['illusion_piercing'],
    interaction: ['continuous_mod'],
    status: 'experimental',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
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
      targetH: q.targetH,
      userH: userVal,
      errorValue: hitResult.errorValue,
      signedBias: hitResult.signedBias,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <FractalEdgeRoughnessView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
  analytics: {
    views: createFractalEdgeRoughnessAnalytics(),
  },
};

export default fractalEdgeRoughnessCard;
~~~~~

### 下一步建议
1. **测试卡片接入**: 在卡片总注册中心（Registry / SystemDomainRegistry）引入并注册 `fractalEdgeRoughnessCard`。
2. **构建与类型验证**: 运行工程的类型检查与测试脚本（如 `npm run check` 或 `npm run test`），验证编译无误。
3. **提交变更**: 当卡片在交互与界面层测试确认达到预期后，创建专用的 `[COMMIT]` 计划。
