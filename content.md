好的，我们正式开始**阶段 3：色彩感知域迁移**。

首先，我们将色彩感知核心的 4 张卡片（`color_hue`、`color_val`、`color_sat`、`color_all`）全面重构成符合 `CardManifest` 契约的标准平铺单卡架构，各自包含自洽的 `locales/{zh-CN,en-US}.json`、独立的 View 视图组件以及专属的 `analytics.tsx` 诊断视图。

## [WIP] feat: 展平重构色彩感知域 4 张单卡为一等公民卡片

### 用户需求
按照 FormSight 卡片一等公民重构路线图的阶段 3 要求：
1. 创建 `src/cards/color_hue/`（色相环感知估测与八向偏转散点分析）。
2. 创建 `src/cards/color_val/`（纯明度梯度估测与阶梯诊断）。
3. 创建 `src/cards/color_sat/`（饱和度梯度估测）。
4. 创建 `src/cards/color_all/`（HSV 三维全色彩融合匹配）。
5. 消除大 `switch` 与全局命名空间硬编码，所有词典使用局部相对 key。
6. 保证文件后缀均为 `.tsx`。

### 评论
色彩三要素卡片从聚合包向单卡平铺迁移，是建立色彩域独立自包含能力的关键一步。通过将 H/S/V 及 Match 的出题、评测、滑块交互与分析视图解耦为 4 个独立原子卡片，能够极大降低单一组件的复杂度，并支持后续单独调优每种色彩训练的容错算法与 UI 呈现。

### 目标
1. 创建 `src/cards/color_hue/` 目录及其 locales、analytics、view 与 `index.tsx`。
2. 创建 `src/cards/color_val/` 目录及其 locales、view 与 `index.tsx`。
3. 创建 `src/cards/color_sat/` 目录及其 locales、view 与 `index.tsx`。
4. 创建 `src/cards/color_all/` 目录及其 locales、view 与 `index.tsx`。
5. 检查并清理旧版 `src/packs/color/`。

### 基本原理
注册中心 `registry.ts` 会自动扫描 `src/cards/*/index.{ts,tsx}` 并将词典挂载至 `cards.<card_id>`，同时自动对 `settingSchemas` 和 `analytics.views` 的相对 key 递归修饰。每个卡片完全自包含，在保留原有色彩数学库（`colorUtils.ts`）复用的同时消除对旧 `PackManifest` 的依赖。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/ui #scope/core #ai/instruct #task/domain/color #task/object/color-cards #task/action/refactor #task/state/begin #task/status/active

---

### Script

#### Acts 1: 创建 `color_hue` 卡片目录与代码

~~~~~act
write_file
src/cards/color_hue/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "色相 (Hue)",
  "desc": "识别颜色在色相环上的具体角度 (0°~360°)",
  "instruction": "定位上方色块在 360° 色相环上的精准角度",
  "settings": {
    "showToleranceBandTitle": "显示滑块容错感应区",
    "showToleranceBandDesc": "在悬停光标两侧实时显示动态容错区间",
    "targetingTitle": "色相弱点专项靶向强化",
    "targetingSubTitle": "选择需要靶向强化的色相扇区："
  },
  "sectors": {
    "red": "红 (0°-30°)",
    "orange": "橙 (30°-60°)",
    "yellow": "黄 (60°-90°)",
    "yellowGreen": "黄绿 (90°-120°)",
    "green": "绿 (120°-150°)",
    "cyanGreen": "青绿 (150°-180°)",
    "cyan": "青 (180°-210°)",
    "blue": "蓝 (210°-240°)",
    "blueViolet": "蓝紫 (240°-270°)",
    "violet": "紫 (270°-300°)",
    "magenta": "品红 (300°-330°)",
    "rose": "紫红 (330°-360°)"
  },
  "analytics": {
    "hueBias": {
      "tabLabel": "色相偏差度",
      "title": "{{title}} · 色相偏差度分析",
      "subTitle": "横轴色相与纵轴偏差分布，揭示系统性偏色倾向",
      "cardTitle": "系统性偏色倾向诊断",
      "avgSignedBias": "全局平均偏转角:",
      "clockwise": "+{{val}}° (顺时针)",
      "counterClockwise": "{{val}}° (逆时针)",
      "maxBiasSector": "最大偏差扇区：",
      "avgBias": "平均偏差:",
      "needMoreTrials": "样本量达到每个扇区至少 3 题后可生成精准扇区偏向诊断。",
      "avgAbsError": "平均绝对角度误差:"
    },
    "hueRing": {
      "tabLabel": "12 色相敏感度",
      "title": "{{title}} · 12 色相敏感度分析",
      "subTitle": "洞察你对 OKLab 色彩空间 12 色相扇区的敏感度与正确率分布",
      "cardTitle": "色相盲区诊断",
      "weakestHint": "你在 {{sector}} 色相上辨识度最低：",
      "accuracyRate": "{{accuracy}}% 正确率",
      "needMoreTrials": "需每个色相扇区完成至少 3 题才能生成弱点诊断。"
    }
  }
}
~~~~~

~~~~~act
write_file
src/cards/color_hue/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Hue",
  "desc": "Identify the exact angle of a color on the 360° color wheel.",
  "instruction": "Locate the exact degree of the color on the 360° color wheel.",
  "settings": {
    "showToleranceBandTitle": "Show Tolerance Indicator Band",
    "showToleranceBandDesc": "Display live dynamic tolerance bands on either side of the slider thumb",
    "targetingTitle": "Targeted Hue Reinforcement",
    "targetingSubTitle": "Select hue sectors for targeted practice:"
  },
  "sectors": {
    "red": "Red (0°-30°)",
    "orange": "Orange (30°-60°)",
    "yellow": "Yellow (60°-90°)",
    "yellowGreen": "Yellow-Green (90°-120°)",
    "green": "Green (120°-150°)",
    "cyanGreen": "Cyan-Green (150°-180°)",
    "cyan": "Cyan (180°-210°)",
    "blue": "Blue (210°-240°)",
    "blueViolet": "Blue-Violet (240°-270°)",
    "violet": "Violet (270°-300°)",
    "magenta": "Magenta (300°-330°)",
    "rose": "Rose (330°-360°)"
  },
  "analytics": {
    "hueBias": {
      "tabLabel": "Hue Bias",
      "title": "{{title}} · Hue Bias Analysis",
      "subTitle": "Distribution of signed hue offsets across the spectrum",
      "cardTitle": "Systematic Hue Offset Diagnostics",
      "avgSignedBias": "Global Average Hue Deviation:",
      "clockwise": "+{{val}}° (Clockwise)",
      "counterClockwise": "{{val}}° (Counter-Clockwise)",
      "maxBiasSector": "Greatest Bias Sector:",
      "avgBias": "Avg Bias:",
      "needMoreTrials": "Complete at least 3 trials in each sector to generate precise bias diagnostics.",
      "avgAbsError": "Mean Absolute Angular Error:"
    },
    "hueRing": {
      "tabLabel": "12-Hue Sensitivity",
      "title": "{{title}} · 12-Hue Sensitivity",
      "subTitle": "Perceptual accuracy across 12 OKLab hue sectors",
      "cardTitle": "Hue Blindspot Diagnostics",
      "weakestHint": "Lowest accuracy found in sector {{sector}}:",
      "accuracyRate": "{{accuracy}}% accuracy",
      "needMoreTrials": "Complete at least 3 trials in each hue sector to generate blindspot diagnostics."
    }
  }
}
~~~~~

~~~~~act
write_file
src/cards/color_hue/ColorHueView.tsx
~~~~~
~~~~~tsx
import { HsvTrackSlider } from '../../components/common/HsvTrackSlider';
import {
  type ColorHitResult,
  type ColorQuestionData,
  hsvToHex,
} from '../../core/color/colorUtils';
import type { ColorSenseSettings } from '../../storage/settings';
import { HUE_SPECTRUM_GRADIENT } from '../../utils/theme';

export interface ColorHueViewProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
  settings: ColorSenseSettings;
}

export function ColorHueView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  settings,
}: ColorHueViewProps) {
  const { targetH, targetS, targetV, difficultyLevel } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);
  const targetHSV: [number, number, number] = [targetH, targetS, targetV];

  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;

  return (
    <div className="w-full max-w-md bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
      </div>

      <div className="w-full space-y-4 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <HsvTrackSlider
          label="H"
          gradient={HUE_SPECTRUM_GRADIENT}
          val={targetH}
          max={360}
          unit="°"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetH}
          userVal={userAnswer?.userValue}
          isHit={userAnswer?.isHit}
          isInteractiveTarget={true}
          onCommit={(v) => {
            if (!showAnswer && !disabled) onAnswer(v);
          }}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/cards/color_hue/analytics.tsx
~~~~~
~~~~~tsx
import { AlertCircle, PieChart, Sparkles } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import { renderHueRingCanvas } from '../../core/canvas/charts/drawColorRing';
import type { SectorStat } from '../../core/canvas/charts/drawCompass';
import {
  calcSignedHueBias,
  renderHueBiasChartCanvas,
} from '../../core/canvas/charts/drawHueBiasChart';
import type { CardAnalyticsView } from '../../core/cardContract';
import { hsvToHex } from '../../core/color/colorUtils';
import { calculateBasicOverallStats } from '../../core/contracts';
import { i18n } from '../../core/i18n';

const COLOR_SECTOR_KEYS = [
  'sectors.red',
  'sectors.orange',
  'sectors.yellow',
  'sectors.yellowGreen',
  'sectors.green',
  'sectors.cyanGreen',
  'sectors.cyan',
  'sectors.blue',
  'sectors.blueViolet',
  'sectors.violet',
  'sectors.magenta',
  'sectors.rose',
];

export function createColorHueAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'hue_bias_chart',
      tabLabel: 'analytics.hueBias.tabLabel',
      title: 'analytics.hueBias.title',
      subTitle: 'analytics.hueBias.subTitle',
      icon: Sparkles,
      renderVisualizer: (canvas, records) => {
        renderHueBiasChartCanvas(canvas, records);
      },
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        let sumSignedBias = 0;
        const sectorBuckets = Array.from({ length: 12 }, () => ({ total: 0, hits: 0, sumBias: 0 }));
        for (const r of records) {
          const tHsv = (r.targetHSV as [number, number, number]) || [0, 0, 0];
          const uHsv = (r.userHSV as [number, number, number]) || tHsv;
          const bias = calcSignedHueBias(tHsv[0], uHsv[0]);
          sumSignedBias += bias;

          const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
          sectorBuckets[idx].total += 1;
          if (r.isHit) sectorBuckets[idx].hits += 1;
          sectorBuckets[idx].sumBias += bias;
        }

        const avgSignedBias = Math.round((sumSignedBias / totalCount) * 10) / 10;
        const validSectors = sectorBuckets
          .map((b, i) => ({
            sectorIdx: i,
            label: i18n.t(`cards.color_hue.${COLOR_SECTOR_KEYS[i]}`),
            total: b.total,
            accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
            avgBias: b.total > 0 ? Math.round((b.sumBias / b.total) * 10) / 10 : 0,
          }))
          .filter((s) => s.total >= 3);

        const maxBiasSector =
          validSectors.length > 0
            ? validSectors.reduce((prev, curr) =>
                Math.abs(curr.avgBias) > Math.abs(prev.avgBias) ? curr : prev,
              )
            : null;

        const signedBiasText =
          avgSignedBias > 0
            ? i18n.t('cards.color_hue.analytics.hueBias.clockwise', { val: avgSignedBias })
            : avgSignedBias < 0
              ? i18n.t('cards.color_hue.analytics.hueBias.counterClockwise', { val: avgSignedBias })
              : '0°';

        return (
          <Callout
            variant="warning"
            icon={AlertCircle}
            title={i18n.t('cards.color_hue.analytics.hueBias.cardTitle')}
          >
            <div className="space-y-2 text-xs text-foreground pt-1">
              <div className="flex justify-between bg-card p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 shadow-xs font-mono">
                <span className="text-muted-foreground">
                  {i18n.t('cards.color_hue.analytics.hueBias.avgSignedBias')}
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

              {maxBiasSector ? (
                <div className="space-y-1.5">
                  <p className="text-muted-foreground">
                    {i18n.t('cards.color_hue.analytics.hueBias.maxBiasSector')}
                    <span className="font-bold text-amber-700 dark:text-amber-300 ml-1">
                      {maxBiasSector.label}
                    </span>
                  </p>
                  <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 shadow-xs">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full border border-border"
                        style={{
                          backgroundColor: hsvToHex(maxBiasSector.sectorIdx * 30 + 15, 100, 100),
                        }}
                      />
                      <span className="font-bold text-foreground">
                        {maxBiasSector.label.split(' ')[0]}
                      </span>
                    </div>
                    <span className="font-black text-amber-700 dark:text-amber-300 font-mono text-xs">
                      {i18n.t('cards.color_hue.analytics.hueBias.avgBias')}{' '}
                      {maxBiasSector.avgBias > 0
                        ? `+${maxBiasSector.avgBias}°`
                        : `${maxBiasSector.avgBias}°`}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  {i18n.t('cards.color_hue.analytics.hueBias.needMoreTrials')}
                </p>
              )}
            </div>
          </Callout>
        );
      },
      getOverallStats: (records) => {
        const baseStats = calculateBasicOverallStats(records);
        const sumError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
        const avgError =
          baseStats.total > 0 ? Math.round((sumError / baseStats.total) * 10) / 10 : 0;

        return {
          ...baseStats,
          customSummary: (
            <div className="flex justify-between text-indigo-700 font-bold border-t border-border/60 pt-1 text-xs">
              <span>{i18n.t('cards.color_hue.analytics.hueBias.avgAbsError')}</span>
              <span>{avgError}°</span>
            </div>
          ),
        };
      },
    },
    {
      id: 'hue_ring',
      tabLabel: 'analytics.hueRing.tabLabel',
      title: 'analytics.hueRing.title',
      subTitle: 'analytics.hueRing.subTitle',
      icon: PieChart,
      renderVisualizer: (canvas, records) => {
        const sectorBuckets = Array.from({ length: 12 }, () => ({
          total: 0,
          hits: 0,
          sumError: 0,
        }));
        for (const r of records) {
          const tHsv = (r.targetHSV as [number, number, number]) || [0, 0, 0];
          const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
          sectorBuckets[idx].total += 1;
          if (r.isHit) sectorBuckets[idx].hits += 1;
          sectorBuckets[idx].sumError += Number(r.errorValue ?? 0);
        }
        const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
          sectorIdx: i,
          label: i18n.t(`cards.color_hue.${COLOR_SECTOR_KEYS[i]}`),
          total: b.total,
          accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          avgError: b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0,
        }));
        renderHueRingCanvas(canvas, sectorStats);
      },
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const sectorBuckets = Array.from({ length: 12 }, () => ({
          total: 0,
          hits: 0,
          sumError: 0,
        }));
        for (const r of records) {
          const tHsv = (r.targetHSV as [number, number, number]) || [0, 0, 0];
          const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
          sectorBuckets[idx].total += 1;
          if (r.isHit) sectorBuckets[idx].hits += 1;
          sectorBuckets[idx].sumError += Number(r.errorValue ?? 0);
        }
        const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
          sectorIdx: i,
          label: i18n.t(`cards.color_hue.${COLOR_SECTOR_KEYS[i]}`),
          total: b.total,
          accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          avgError: b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0,
        }));
        const validSectors = sectorStats.filter((s) => s.total >= 3);
        const weakestSector =
          validSectors.length > 0
            ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
            : null;

        return (
          <Callout
            variant="warning"
            icon={AlertCircle}
            title={i18n.t('cards.color_hue.analytics.hueRing.cardTitle')}
          >
            {weakestSector ? (
              <div className="space-y-2 pt-1">
                <p className="text-foreground text-xs">
                  {i18n.t('cards.color_hue.analytics.hueRing.weakestHint', {
                    sector: weakestSector.label,
                  })}
                </p>
                <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full border border-border"
                      style={{
                        backgroundColor: hsvToHex(weakestSector.sectorIdx * 30 + 15, 100, 100),
                      }}
                    />
                    <span className="font-bold text-foreground">
                      {weakestSector.label.split(' ')[0]}
                    </span>
                  </div>
                  <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                    {i18n.t('cards.color_hue.analytics.hueRing.accuracyRate', {
                      accuracy: weakestSector.accuracy,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                {i18n.t('cards.color_hue.analytics.hueRing.needMoreTrials')}
              </p>
            )}
          </Callout>
        );
      },
      getOverallStats: (records) => {
        const baseStats = calculateBasicOverallStats(records);
        const sumError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
        const avgError =
          baseStats.total > 0 ? Math.round((sumError / baseStats.total) * 10) / 10 : 0;

        return {
          ...baseStats,
          customSummary: (
            <div className="flex justify-between text-indigo-700 font-bold border-t border-border/60 pt-1 text-xs">
              <span>{i18n.t('cards.color_hue.analytics.hueBias.avgAbsError')}</span>
              <span>{avgError}°</span>
            </div>
          ),
        };
      },
    },
  ];
}
~~~~~

~~~~~act
write_file
src/cards/color_hue/index.tsx
~~~~~
~~~~~tsx
import { RotateCw } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import {
  type ColorHitResult,
  type ColorQuestionData,
  checkColorHit,
  generateColorQuestion,
} from '../../core/color/colorUtils';
import type { ColorSenseSettings } from '../../storage/settings';
import { ColorHueView } from './ColorHueView';
import { createColorHueAnalytics } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

const COLOR_SECTOR_KEYS = [
  'sectors.red',
  'sectors.orange',
  'sectors.yellow',
  'sectors.yellowGreen',
  'sectors.green',
  'sectors.cyanGreen',
  'sectors.cyan',
  'sectors.blue',
  'sectors.blueViolet',
  'sectors.violet',
  'sectors.magenta',
  'sectors.rose',
];

export const colorHueCard: CardManifest<
  ColorQuestionData,
  ColorHitResult,
  number,
  ColorSenseSettings
> = {
  id: 'color_hue',
  domain: 'color_and_value',
  icon: RotateCw,
  tags: {
    domain: ['color_and_value'],
    path: ['absolute_estimation'],
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
    {
      type: 'targeting',
      modeKey: 'targetingMode',
      sectorsKey: 'manualTargetSectors',
      title: 'settings.targetingTitle',
      subTitle: 'settings.targetingSubTitle',
      sectors: COLOR_SECTOR_KEYS,
      gridCols: 'grid-cols-3',
    },
  ],
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) =>
      generateColorQuestion('H', level, {
        targetingMode: settings.targetingMode,
        targetSectors: settings.manualTargetSectors,
      }),
    evaluateAnswer: (userVal, q) => checkColorHit('H', userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      targetHSV: [q.targetH, q.targetS, q.targetV],
      userHSV: [userVal, q.targetS, q.targetV],
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <ColorHueView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        settings={settings}
      />
    ),
  },
  analytics: {
    views: createColorHueAnalytics(),
  },
};

export default colorHueCard;
~~~~~

#### Acts 2: 创建 `color_val` 卡片目录与代码

~~~~~act
write_file
src/cards/color_val/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "明度 (Value)",
  "desc": "已知色相，评估颜色的素描明暗程度 (0%~100%)",
  "instruction": "评估上方色块的素描明度深浅比例 (0%~100%)",
  "settings": {
    "showToleranceBandTitle": "显示滑块容错感应区",
    "showToleranceBandDesc": "在悬停光标两侧实时显示动态容错区间"
  }
}
~~~~~

~~~~~act
write_file
src/cards/color_val/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Value",
  "desc": "Given hue, estimate the lightness/darkness value (0%~100%).",
  "instruction": "Estimate the value/brightness percentage of the color (0%~100%).",
  "settings": {
    "showToleranceBandTitle": "Show Tolerance Indicator Band",
    "showToleranceBandDesc": "Display live dynamic tolerance bands on either side of the slider thumb"
  }
}
~~~~~

~~~~~act
write_file
src/cards/color_val/ColorValView.tsx
~~~~~
~~~~~tsx
import { HsvTrackSlider } from '../../components/common/HsvTrackSlider';
import {
  type ColorHitResult,
  type ColorQuestionData,
  hsvToHex,
} from '../../core/color/colorUtils';
import type { ColorSenseSettings } from '../../storage/settings';
import { HUE_SPECTRUM_GRADIENT, PALETTE } from '../../utils/theme';

export interface ColorValViewProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
  settings: ColorSenseSettings;
}

export function ColorValView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  settings,
}: ColorValViewProps) {
  const { targetH, targetS, targetV, difficultyLevel } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);
  const targetHSV: [number, number, number] = [targetH, targetS, targetV];

  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;

  const hueGradient = HUE_SPECTRUM_GRADIENT;
  const valGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(targetH, 100, 100)})`;

  return (
    <div className="w-full max-w-md bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
      </div>

      <div className="w-full space-y-4 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <HsvTrackSlider
          label="H"
          gradient={hueGradient}
          val={targetH}
          max={360}
          unit="°"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetH}
          disabled={true}
          hitMargin={hitMargin}
          showToleranceBand={false}
        />

        <HsvTrackSlider
          label="V"
          gradient={valGradient}
          val={targetV}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetV}
          userVal={userAnswer?.userValue}
          isHit={userAnswer?.isHit}
          isInteractiveTarget={true}
          onCommit={(v) => {
            if (!showAnswer && !disabled) onAnswer(v);
          }}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/cards/color_val/index.tsx
~~~~~
~~~~~tsx
import { Sun } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import {
  type ColorHitResult,
  type ColorQuestionData,
  checkColorHit,
  generateColorQuestion,
} from '../../core/color/colorUtils';
import type { ColorSenseSettings } from '../../storage/settings';
import { ColorValView } from './ColorValView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

export const colorValCard: CardManifest<
  ColorQuestionData,
  ColorHitResult,
  number,
  ColorSenseSettings
> = {
  id: 'color_val',
  domain: 'color_and_value',
  icon: Sun,
  tags: {
    domain: ['color_and_value'],
    path: ['absolute_estimation'],
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
    generateQuestion: (level) => generateColorQuestion('V', level),
    evaluateAnswer: (userVal, q) => checkColorHit('V', userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      targetHSV: [q.targetH, q.targetS, q.targetV],
      userHSV: [q.targetH, q.targetS, userVal],
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <ColorValView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        settings={settings}
      />
    ),
  },
};

export default colorValCard;
~~~~~

#### Acts 3: 创建 `color_sat` 卡片目录与代码

~~~~~act
write_file
src/cards/color_sat/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "饱和度 (Sat)",
  "desc": "已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)",
  "instruction": "评估上方色块的鲜艳纯度比例 (0%~100%)",
  "settings": {
    "showToleranceBandTitle": "显示滑块容错感应区",
    "showToleranceBandDesc": "在悬停光标两侧实时显示动态容错区间"
  }
}
~~~~~

~~~~~act
write_file
src/cards/color_sat/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Saturation",
  "desc": "Given hue and value, estimate the purity and saturation (0%~100%).",
  "instruction": "Estimate the saturation purity percentage of the color (0%~100%).",
  "settings": {
    "showToleranceBandTitle": "Show Tolerance Indicator Band",
    "showToleranceBandDesc": "Display live dynamic tolerance bands on either side of the slider thumb"
  }
}
~~~~~

~~~~~act
write_file
src/cards/color_sat/ColorSatView.tsx
~~~~~
~~~~~tsx
import { HsvTrackSlider } from '../../components/common/HsvTrackSlider';
import {
  type ColorHitResult,
  type ColorQuestionData,
  hsvToHex,
} from '../../core/color/colorUtils';
import type { ColorSenseSettings } from '../../storage/settings';
import { HUE_SPECTRUM_GRADIENT, PALETTE } from '../../utils/theme';

export interface ColorSatViewProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
  settings: ColorSenseSettings;
}

export function ColorSatView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  settings,
}: ColorSatViewProps) {
  const { targetH, targetS, targetV, difficultyLevel } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);
  const targetHSV: [number, number, number] = [targetH, targetS, targetV];

  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;

  const hueGradient = HUE_SPECTRUM_GRADIENT;
  const satGradient = `linear-gradient(to right, ${hsvToHex(targetH, 0, targetV)}, ${hsvToHex(targetH, 100, targetV)})`;
  const valGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(targetH, 100, 100)})`;

  return (
    <div className="w-full max-w-md bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
      </div>

      <div className="w-full space-y-4 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <HsvTrackSlider
          label="H"
          gradient={hueGradient}
          val={targetH}
          max={360}
          unit="°"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetH}
          disabled={true}
          hitMargin={hitMargin}
          showToleranceBand={false}
        />

        <HsvTrackSlider
          label="S"
          gradient={satGradient}
          val={targetS}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetS}
          userVal={userAnswer?.userValue}
          isHit={userAnswer?.isHit}
          isInteractiveTarget={true}
          onCommit={(v) => {
            if (!showAnswer && !disabled) onAnswer(v);
          }}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />

        <HsvTrackSlider
          label="V"
          gradient={valGradient}
          val={targetV}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetV}
          disabled={true}
          hitMargin={hitMargin}
          showToleranceBand={false}
        />
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/cards/color_sat/index.tsx
~~~~~
~~~~~tsx
import { Droplet } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import {
  type ColorHitResult,
  type ColorQuestionData,
  checkColorHit,
  generateColorQuestion,
} from '../../core/color/colorUtils';
import type { ColorSenseSettings } from '../../storage/settings';
import { ColorSatView } from './ColorSatView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

export const colorSatCard: CardManifest<
  ColorQuestionData,
  ColorHitResult,
  number,
  ColorSenseSettings
> = {
  id: 'color_sat',
  domain: 'color_and_value',
  icon: Droplet,
  tags: {
    domain: ['color_and_value'],
    path: ['absolute_estimation'],
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
    generateQuestion: (level) => generateColorQuestion('S', level),
    evaluateAnswer: (userVal, q) => checkColorHit('S', userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      targetHSV: [q.targetH, q.targetS, q.targetV],
      userHSV: [q.targetH, userVal, q.targetV],
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <ColorSatView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        settings={settings}
      />
    ),
  },
};

export default colorSatCard;
~~~~~

#### Acts 4: 创建 `color_all` 卡片目录与代码

~~~~~act
write_file
src/cards/color_all/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "综合拾色 (Match)",
  "desc": "同时调整色相、饱和度与明度，逼近真理色彩",
  "instruction": "同时调制色相、饱和度与明度轨，使右侧色块逼近左侧目标色",
  "settings": {
    "showToleranceBandTitle": "显示滑块容错感应区",
    "showToleranceBandDesc": "在悬停光标两侧实时显示动态容错区间",
    "enableHoverColorPreviewTitle": "综合拾色悬停颜色实时联动",
    "enableHoverColorPreviewDesc": "鼠标悬停滑块时右侧色块实时跟随试探预览"
  }
}
~~~~~

~~~~~act
write_file
src/cards/color_all/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Full Color Match",
  "desc": "Simultaneously adjust Hue, Saturation, and Value to match the target color.",
  "instruction": "Modulate H, S, and V tracks to match the target color on the left.",
  "settings": {
    "showToleranceBandTitle": "Show Tolerance Indicator Band",
    "showToleranceBandDesc": "Display live dynamic tolerance bands on either side of the slider thumb",
    "enableHoverColorPreviewTitle": "Realtime Color Preview on Slider Hover",
    "enableHoverColorPreviewDesc": "Follow trial preview swatch when cursor hovers over sliders"
  }
}
~~~~~

~~~~~act
write_file
src/cards/color_all/ColorAllView.tsx
~~~~~
~~~~~tsx
import { useCallback, useEffect, useState } from 'preact/hooks';
import { HsvTrackSlider } from '../../components/common/HsvTrackSlider';
import { Button } from '../../components/ui/button';
import {
  type ColorHitResult,
  type ColorQuestionData,
  hsvToHex,
} from '../../core/color/colorUtils';
import { useTranslation } from '../../core/i18n';
import type { ColorSenseSettings } from '../../storage/settings';
import { HUE_SPECTRUM_GRADIENT, PALETTE } from '../../utils/theme';

export interface ColorAllViewProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: [number, number, number]) => void;
  disabled?: boolean;
  settings: ColorSenseSettings;
}

export function ColorAllView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  settings,
}: ColorAllViewProps) {
  const { t } = useTranslation();
  const { targetH, targetS, targetV, difficultyLevel } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);
  const targetHSV: [number, number, number] = [targetH, targetS, targetV];

  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;
  const enableHoverColorPreview = settings.enableHoverColorPreview ?? true;

  const [userH, setUserH] = useState<number>(180);
  const [userS, setUserS] = useState<number>(50);
  const [userV, setUserV] = useState<number>(50);

  const [allHoverVals, setAllHoverVals] = useState<Record<'H' | 'S' | 'V', number | null>>({
    H: null,
    S: null,
    V: null,
  });
  const [draggingLabel, setDraggingLabel] = useState<'H' | 'S' | 'V' | null>(null);

  const handleHoverH = useCallback(
    (hVal: number | null) =>
      setAllHoverVals((prev) => (prev.H === hVal ? prev : { ...prev, H: hVal })),
    [],
  );
  const handleHoverS = useCallback(
    (sVal: number | null) =>
      setAllHoverVals((prev) => (prev.S === sVal ? prev : { ...prev, S: sVal })),
    [],
  );
  const handleHoverV = useCallback(
    (vVal: number | null) =>
      setAllHoverVals((prev) => (prev.V === vVal ? prev : { ...prev, V: vVal })),
    [],
  );

  const handleDragH = useCallback((isDrag: boolean) => setDraggingLabel(isDrag ? 'H' : null), []);
  const handleDragS = useCallback((isDrag: boolean) => setDraggingLabel(isDrag ? 'S' : null), []);
  const handleDragV = useCallback((isDrag: boolean) => setDraggingLabel(isDrag ? 'V' : null), []);

  useEffect(() => {
    setUserH(180);
    setUserS(50);
    setUserV(50);
    setAllHoverVals({ H: null, S: null, V: null });
    setDraggingLabel(null);
  }, [question.id]);

  const handleSubmitAll = () => {
    if (disabled || showAnswer) return;
    onAnswer([userH, userS, userV]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !showAnswer && !disabled) {
        e.preventDefault();
        onAnswer([userH, userS, userV]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, disabled, userH, userS, userV, onAnswer]);

  const currentH = userH;
  const currentV = userV;

  const hueGradient = HUE_SPECTRUM_GRADIENT;
  const satGradient = `linear-gradient(to right, ${hsvToHex(currentH, 0, currentV)}, ${hsvToHex(currentH, 100, currentV)})`;
  const valGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(currentH, 100, 100)})`;

  return (
    <div className="w-full max-w-md bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="flex items-center justify-center gap-4 w-full">
          <div
            className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-300"
            style={{ backgroundColor: targetHex }}
          />
          <div
            className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-75"
            style={{
              backgroundColor: hsvToHex(
                draggingLabel === 'H' || (enableHoverColorPreview && allHoverVals.H !== null)
                  ? (allHoverVals.H ?? userH)
                  : userH,
                draggingLabel === 'S' || (enableHoverColorPreview && allHoverVals.S !== null)
                  ? (allHoverVals.S ?? userS)
                  : userS,
                draggingLabel === 'V' || (enableHoverColorPreview && allHoverVals.V !== null)
                  ? (allHoverVals.V ?? userV)
                  : userV,
              ),
            }}
          />
        </div>
      </div>

      <div className="w-full space-y-4 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <HsvTrackSlider
          label="H"
          gradient={hueGradient}
          val={userH}
          max={360}
          unit="°"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetH}
          userVal={userAnswer?.userHSV?.[0] ?? userH}
          isHit={userAnswer?.isHit}
          onValChange={setUserH}
          allUserHSV={[userH, userS, userV]}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
          onHoverStateChange={handleHoverH}
          onDraggingStateChange={handleDragH}
        />
        <HsvTrackSlider
          label="S"
          gradient={satGradient}
          val={userS}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetS}
          userVal={userAnswer?.userHSV?.[1] ?? userS}
          isHit={userAnswer?.isHit}
          onValChange={setUserS}
          allUserHSV={[userH, userS, userV]}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
          onHoverStateChange={handleHoverS}
          onDraggingStateChange={handleDragS}
        />
        <HsvTrackSlider
          label="V"
          gradient={valGradient}
          val={userV}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetV}
          userVal={userAnswer?.userHSV?.[2] ?? userV}
          isHit={userAnswer?.isHit}
          onValChange={setUserV}
          allUserHSV={[userH, userS, userV]}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
          onHoverStateChange={handleHoverV}
          onDraggingStateChange={handleDragV}
        />
      </div>

      {!showAnswer && (
        <Button
          variant="default"
          onClick={handleSubmitAll}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold rounded-2xl"
        >
          {t('common.confirmSpace')}
        </Button>
      )}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/cards/color_all/index.tsx
~~~~~
~~~~~tsx
import { Palette } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import {
  type ColorHitResult,
  type ColorQuestionData,
  checkColorHit,
  generateColorQuestion,
} from '../../core/color/colorUtils';
import type { ColorSenseSettings } from '../../storage/settings';
import { ColorAllView } from './ColorAllView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

export const colorAllCard: CardManifest<
  ColorQuestionData,
  ColorHitResult,
  [number, number, number],
  ColorSenseSettings
> = {
  id: 'color_all',
  domain: 'color_and_value',
  icon: Palette,
  tags: {
    domain: ['color_and_value'],
    path: ['absolute_estimation'],
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
    {
      type: 'toggle',
      key: 'enableHoverColorPreview',
      title: 'settings.enableHoverColorPreviewTitle',
      description: 'settings.enableHoverColorPreviewDesc',
    },
  ],
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
    enableHoverColorPreview: true,
  },
  training: {
    generateQuestion: (level) => generateColorQuestion('ALL', level),
    evaluateAnswer: (userVal, q) => checkColorHit('ALL', userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      targetHSV: [q.targetH, q.targetS, q.targetV],
      userHSV: userVal,
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <ColorAllView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        settings={settings}
      />
    ),
  },
};

export default colorAllCard;
~~~~~

#### Acts 5: 绞杀删除已迁移的 `src/packs/color` 目录

~~~~~act
delete_file
src/packs/color/locales/zh-CN.json
~~~~~

~~~~~act
delete_file
src/packs/color/locales/en-US.json
~~~~~

~~~~~act
delete_file
src/packs/color/views/ColorCanvas.tsx
~~~~~

~~~~~act
delete_file
src/packs/color/analytics.tsx
~~~~~

~~~~~act
delete_file
src/packs/color/plugin.tsx
~~~~~

~~~~~act
delete_file
src/packs/color/index.ts
~~~~~

### 下一步建议
1. 检查 `src/packs/relative_color/` 目录中的卡片定义与视图结构，按同样规范重构迁移为 `rel_vector_shift`、`rel_lightness_induction`、`rel_hue_induction` 和 `rel_decontextual_2afc` 4 张自包含单卡。
2. 在迁移完成后运行 TypeScript 类型检查与单元测试，验证双向中英文词条解析与分析图表完整性。
