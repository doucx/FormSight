经过深入检查，`star` 模块下确实存在与之前 `angle` 模块**完全相同且更为隐蔽的架构隐患**：

1. **硬编码跨卡片依赖（命名空间污染）**: `star_double_h` (水平双锚点) 和 `star_double_r` (旋转双锚点) 均共用了 `createStarAnalyticsViews()`。但在该函数内部，所有分析面板的国际化 Key 全部硬编码写死了 `cards.star_single.analytics.*`。这导致当用户在玩水平或旋转双锚点卡片并点开分析面板时，系统被迫强行跨卡片去读取 `star_single` 的私有词条。
2. **多语言未内聚与未拆分**: `star` 模块的三张卡片（`star_single`, `star_double_h`, `star_double_r`）的多语言文案均直接硬编码在各自的 `index.tsx` 中，未拆分为独立的 JSON 文件。
3. **分析文案缺失**: `star_double_h` 和 `star_double_r` 自身的 `locales` 中完全没有定义分析面板的相关文案。

我将生成一个规范的 Quipu 计划，将 `star` 模块的所有卡片国际化拆分为独立的 JSON 文件，并通过在 `createStarAnalyticsViews(cardId)` 中动态传入卡片 ID，彻底解耦分析视图的硬编码跨卡片引用。

## [WIP] refactor(star): 重构 star 模块多语言结构并解耦分析视图的硬编码跨卡片 Key

### 错误分析

**问题原因**:
1. **硬编码跨卡片引用**: `_shared/analytics.tsx` 中的分析视图 Key 硬编码绑定了 `cards.star_single.*`。当 `star_double_h` 或 `star_double_r` 调用时，属于跨卡片读取私有词典，违背了模块化独立自治原则。
2. **多语言未独立拆分**: 各卡片文案直接写在 TS 文件中，不利于多语言协作。
3. **缺少卡片级分析配置**: 后两张卡片缺少专属的分析文案定义。

**解决方案**:
1. 修改 `_shared/analytics.tsx` 的 `createStarAnalyticsViews(cardId)`，使其支持动态传入当前卡片 ID（如 `'star_single'`, `'star_double_h'`, `'star_double_r'`），生成对应卡片命名空间的 Key。
2. 将 `star` 模块下三张卡片的中文与英文文案（含设置、扇区、分析面板）全部拆分为独立的 `locales/en-US.json` 和 `locales/zh-CN.json` 纯 JSON 文件。
3. 在各卡片的 `index.tsx` 中引入独立的词典，并为 `star_double_h` 和 `star_double_r` 挂载对应的分析视图。

### 用户需求
检查并彻底修复 `star` 模块下卡片多语言未分离、分析面板硬编码跨卡片引用的问题。

### 评论
此项重构彻底消除了 `star` 模块中的隐式强耦合，使每张卡片都具备完全独立、自包含的多语言与分析能力。

### 目标
1. 改造 `src/modules/star/_shared/analytics.tsx` 支持动态 `cardId` 参数。
2. 拆分创建 `star_single`, `star_double_h`, `star_double_r` 的独立 JSON 国际化词典。
3. 更新各卡片 `index.tsx` 的注册逻辑。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #concept/config #scope/core #ai/instruct #task/domain/ui #task/object/star-card-i18n #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 改造 star 模块的分析视图构造函数以支持动态 cardId 传入

~~~~~act
write_file
src/modules/star/_shared/analytics.tsx
~~~~~
~~~~~tsx
import { Compass, Target } from 'lucide-preact';
import { Callout } from '../../../components/ui/callout';
import { type SectorStat, renderCompassCanvas } from '../../../core/canvas/charts/drawCompass';
import { renderHeatmapCanvas } from '../../../core/canvas/charts/drawHeatmap';
import { type CardAnalyticsView, calculateBasicOverallStats } from '../../../core/contracts';
import { i18n } from '../../../core/i18n';
import { STAR_SECTORS } from './schemas';

export function createStarAnalyticsViews(cardId = 'star_single'): CardAnalyticsView[] {
  return [
    {
      id: 'spatial_bias',
      tabLabel: `cards.${cardId}.analytics.spatialBias.tabLabel`,
      title: `cards.${cardId}.analytics.spatialBias.title`,
      subTitle: `cards.${cardId}.analytics.spatialBias.subTitle`,
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
            ? i18n.t(`cards.${cardId}.analytics.spatialBias.right`, { val: avgDx })
            : avgDx < 0
              ? i18n.t(`cards.${cardId}.analytics.spatialBias.left`, { val: avgDx })
              : '0';

        const dyText =
          avgDy > 0
            ? i18n.t(`cards.${cardId}.analytics.spatialBias.down`, { val: avgDy })
            : avgDy < 0
              ? i18n.t(`cards.${cardId}.analytics.spatialBias.up`, { val: avgDy })
              : '0';

        return (
          <Callout
            variant="info"
            icon={Target}
            title={i18n.t(`cards.${cardId}.analytics.spatialBias.cardTitle`)}
          >
            <p className="text-muted-foreground leading-relaxed text-xs">
              {i18n.t(`cards.${cardId}.analytics.spatialBias.desc`)}
            </p>
            <div className="pt-1.5 space-y-1 font-mono text-foreground">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {i18n.t(`cards.${cardId}.analytics.spatialBias.avgDx`)}
                </span>
                <span className="font-bold">{dxText}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {i18n.t(`cards.${cardId}.analytics.spatialBias.avgDy`)}
                </span>
                <span className="font-bold">{dyText}</span>
              </div>
              <div className="flex justify-between text-primary font-bold border-t border-border/60 pt-1">
                <span>{i18n.t(`cards.${cardId}.analytics.spatialBias.avgDist`)}</span>
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
      tabLabel: `cards.${cardId}.analytics.directionalCompass.tabLabel`,
      title: `cards.${cardId}.analytics.directionalCompass.title`,
      subTitle: `cards.${cardId}.analytics.directionalCompass.subTitle`,
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
            title={i18n.t(`cards.${cardId}.analytics.directionalCompass.cardTitle`)}
          >
            {weakest ? (
              <div className="space-y-1.5 text-xs text-foreground pt-1">
                <p>
                  {i18n.t(`cards.${cardId}.analytics.directionalCompass.weakestHint`, {
                    sector: weakest.label,
                  })}
                </p>
                <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-border/60 font-mono shadow-xs">
                  <span>{weakest.label}</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {i18n.t(`cards.${cardId}.analytics.directionalCompass.accuracyRate`, {
                      accuracy: weakest.accuracy,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                {i18n.t(`cards.${cardId}.analytics.directionalCompass.needMoreTrials`)}
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

#### Acts 2: 创建 SingleAnchorCard 的英文多语言词典

~~~~~act
write_file
src/modules/star/SingleAnchorCard/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Single Anchor",
  "desc": "Single central anchor to evaluate polar angle and distance estimation.",
  "instruction": "Observe the target relative to the central anchor on the left, then locate it in the grid on the right.",
  "badge": "Single Anchor",
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
      "title": "Single Anchor · Spatial Bias Analysis",
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
      "title": "Single Anchor · 8-Directional Sensitivity",
      "subTitle": "Insights into your localization accuracy across 8 polar sectors",
      "cardTitle": "Directional Blindspot",
      "weakestHint": "Lowest accuracy found in sector {{sector}}:",
      "accuracyRate": "{{accuracy}}% accuracy",
      "needMoreTrials": "Complete at least 3 trials in each sector to generate blindspot diagnostics."
    }
  }
}
~~~~~

#### Acts 3: 创建 SingleAnchorCard 的中文多语言词典

~~~~~act
write_file
src/modules/star/SingleAnchorCard/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "单锚点模式",
  "desc": "单一中心锚点，评估基本极坐标方位与距离感知力",
  "instruction": "观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位",
  "badge": "单锚点",
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
      "title": "单锚点 · 空间偏置分析",
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
      "title": "单锚点 · 八向方位敏感度",
      "subTitle": "洞察你在 8 个极坐标视角扇区上的定位准确率分布",
      "cardTitle": "方位盲区诊断",
      "weakestHint": "你在 {{sector}} 方位上命中率最低：",
      "accuracyRate": "{{accuracy}}% 准确率",
      "needMoreTrials": "各方位完成至少 3 题后可生成薄弱扇区诊断。"
    }
  }
}
~~~~~

#### Acts 4: 重构 SingleAnchorCard 的 index.tsx 并引入外部 Locales 与动态 analytics

~~~~~act
write_file
src/modules/star/SingleAnchorCard/index.tsx
~~~~~
~~~~~tsx
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
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

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
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) => generateSingleAnchorQuestion(level, settings),
    evaluateAnswer: (userVal, q) =>
      evaluatePointGridHit(userVal.clickPoint, q.targetB, q.distractorPoints),
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
    views: createStarAnalyticsViews('star_single'),
  },
};

export default starSingleCard;
~~~~~

#### Acts 5: 创建 HorizontalDoubleCard 的英文多语言词典（含 Analytics）

~~~~~act
write_file
src/modules/star/HorizontalDoubleCard/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Horizontal Double Anchors",
  "desc": "Horizontal dual anchors to train proportion and orthogonal projection intuition.",
  "instruction": "Observe the relationship between horizontal dual anchors on the left, then locate the target on the right.",
  "badge": "Horizontal Dual",
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
      "title": "Horizontal Double · Spatial Bias Analysis",
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
      "title": "Horizontal Double · 8-Directional Sensitivity",
      "subTitle": "Insights into your localization accuracy across 8 polar sectors",
      "cardTitle": "Directional Blindspot",
      "weakestHint": "Lowest accuracy found in sector {{sector}}:",
      "accuracyRate": "{{accuracy}}% accuracy",
      "needMoreTrials": "Complete at least 3 trials in each sector to generate blindspot diagnostics."
    }
  }
}
~~~~~

#### Acts 6: 创建 HorizontalDoubleCard 的中文多语言词典（含 Analytics）

~~~~~act
write_file
src/modules/star/HorizontalDoubleCard/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "水平双锚点",
  "desc": "水平线段两端锚点，评估两点比例与正交投影判定力",
  "instruction": "观察左侧水平双锚点几何关系，在右侧点阵中盲打定位",
  "badge": "水平双锚点",
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
      "title": "水平双锚点 · 空间偏置分析",
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
      "title": "水平双锚点 · 八向方位敏感度",
      "subTitle": "洞察你在 8 个极坐标视角扇区上的定位准确率分布",
      "cardTitle": "方位盲区诊断",
      "weakestHint": "你在 {{sector}} 方位上命中率最低：",
      "accuracyRate": "{{accuracy}}% 准确率",
      "needMoreTrials": "各方位完成至少 3 题后可生成薄弱扇区诊断。"
    }
  }
}
~~~~~

#### Acts 7: 重构 HorizontalDoubleCard 的 index.tsx 并引入 Locales 与动态 analytics

~~~~~act
write_file
src/modules/star/HorizontalDoubleCard/index.tsx
~~~~~
~~~~~tsx
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
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

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
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) => generateHorizontalDoubleQuestion(level, settings),
    evaluateAnswer: (userVal, q) =>
      evaluatePointGridHit(userVal.clickPoint, q.targetB, q.distractorPoints),
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
    views: createStarAnalyticsViews('star_double_h'),
  },
};

export default starDoubleHCard;
~~~~~

#### Acts 8: 创建 RotatedDoubleCard 的英文多语言词典（含 Analytics）

~~~~~act
write_file
src/modules/star/RotatedDoubleCard/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Rotated Double Anchors",
  "desc": "Tilted dual anchors to master complex rotated coordinate mapping.",
  "instruction": "Observe the rotated dual anchors on the left, then locate the target on the right.",
  "badge": "Rotated Dual",
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
      "title": "Rotated Double · Spatial Bias Analysis",
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
      "title": "Rotated Double · 8-Directional Sensitivity",
      "subTitle": "Insights into your localization accuracy across 8 polar sectors",
      "cardTitle": "Directional Blindspot",
      "weakestHint": "Lowest accuracy found in sector {{sector}}:",
      "accuracyRate": "{{accuracy}}% accuracy",
      "needMoreTrials": "Complete at least 3 trials in each sector to generate blindspot diagnostics."
    }
  }
}
~~~~~

#### Acts 9: 创建 RotatedDoubleCard 的中文多语言词典（含 Analytics）

~~~~~act
write_file
src/modules/star/RotatedDoubleCard/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "旋转双锚点",
  "desc": "带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力",
  "instruction": "观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位",
  "badge": "旋转双锚点",
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
      "title": "旋转双锚点 · 空间偏置分析",
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
      "title": "旋转双锚点 · 八向方位敏感度",
      "subTitle": "洞察你在 8 个极坐标视角扇区上的定位准确率分布",
      "cardTitle": "方位盲区诊断",
      "weakestHint": "你在 {{sector}} 方位上命中率最低：",
      "accuracyRate": "{{accuracy}}% 准确率",
      "needMoreTrials": "各方位完成至少 3 题后可生成薄弱扇区诊断。"
    }
  }
}
~~~~~

#### Acts 10: 重构 RotatedDoubleCard 的 index.tsx 并引入 Locales 与动态 analytics

~~~~~act
write_file
src/modules/star/RotatedDoubleCard/index.tsx
~~~~~
~~~~~tsx
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
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

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
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) => generateRotatedDoubleQuestion(level, settings),
    evaluateAnswer: (userVal, q) =>
      evaluatePointGridHit(userVal.clickPoint, q.targetB, q.distractorPoints),
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
    views: createStarAnalyticsViews('star_double_r'),
  },
};

export default starDoubleRCard;
~~~~~

### 下一步建议

`star` 模块下所有三张卡片（单锚点、水平双锚点、旋转双锚点）的国际化资源已经成功下沉独立，并且通过重构 `createStarAnalyticsViews(cardId)` 彻底消除了硬编码跨卡片引用的隐患。建议运行测试以验证所有卡片的分析面板和多语言渲染在各语言环境下均表现正常。
