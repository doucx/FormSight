## [WIP] fix: 修复卡片分析总览页认知诊断错误显示样本量不足的问题

### 错误分析

`CardAnalyticsView.tsx` 中的「总体评价与认知建议」区块未调用真实的作答速度与难度分箱算法，而是以 `summaryStats.accuracy >= 80` 作为硬编码分支。当总正确率低于 80% 时，无论做答了几百题都会被错误判定为“样本量较少”；且在大于 80% 时错误地将“绝对舒适区”的文案填入了“直觉黄金甜点区”的卡片中。

### 用户需求

修复总览页面的认知诊断逻辑，基于真实作答反应时间分箱（SAT）与历史难度分阶动态生成“直觉黄金甜点区”与“当前突破区”建议，避免错误显示“样本量较少”。

### 评论

数据总览是用户复盘卡片表现的第一窗口。建立准确的认知指标聚合能让用户直观了解自己在哪个作答耗时区间内直觉最准，以及当前处于哪个难度突破带。

### 目标

1. 在 `universalViews.tsx` 中提取并导出通用的 `getCognitiveOverviewInsights` 认知评估函数。
2. 在 `CardAnalyticsView.tsx` 中接入该评估函数，基于做答反应速度分布和难度层阶数据动态展示真实的认知甜点区与突破区。

### 基本原理

1. 通过 `calculateSpeedBins` 分析各作答耗时区间的正确率，找出样本量充足且胜率最高的区间作为“直觉黄金甜点区”。
2. 当总做答样本量过少（<3题且无有效分箱）时才展示“需要更多样本”的友好提示。

### 标签

#intent/fix #flow/ready #priority/high #comp/core #concept/ui #scope/ux #scope/core #ai/instruct #task/domain/ui #task/object/analytics-overview-diagnosis #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 在 `universalViews.tsx` 中提供总览认知诊断计算函数

我们将导出 `getCognitiveOverviewInsights`，聚合 SAT 速度甜点区与难度抗压演进数据。

~~~~~act
patch_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~typescript.old
export const UNIVERSAL_ANALYTICS_VIEWS: CardAnalyticsView[] = [
  {
    id: 'universal_sat',
    tabLabel: 'analyticsModal.satTabLabel',
    title: 'analyticsModal.satTitle',
    subTitle: 'analyticsModal.satSubtitle',
    icon: Zap,
    renderVisualizer: renderSpeedAccuracyVisualizer,
    renderDiagnostics: diagnoseSpeedAccuracy,
  },
  {
    id: 'universal_plateau',
    tabLabel: 'analyticsModal.plateauTabLabel',
    title: 'analyticsModal.plateauTitle',
    subTitle: 'analyticsModal.plateauSubtitle',
    icon: Gauge,
    renderVisualizer: renderDifficultyPlateauVisualizer,
    renderDiagnostics: diagnoseDifficultyPlateau,
  },
];
~~~~~
~~~~~typescript.new
export function getCognitiveOverviewInsights(records: UnifiedTrialRecord[]): {
  sweetSpotText: string;
  growthZoneText: string;
} {
  if (!records || records.length === 0) {
    return {
      sweetSpotText: i18n.t('analyticsModal.needMoreSamples'),
      growthZoneText: i18n.t('analyticsModal.needMoreSamples'),
    };
  }

  // 1. SAT 作答速度黄金甜点区计算
  const bins = calculateSpeedBins(records);
  const validBins = bins.filter((b) => b.total >= 3);
  let sweetSpotText = '';

  if (validBins.length > 0) {
    const bestBin = [...validBins].sort((a, b) => b.accuracy - a.accuracy || b.total - a.total)[0];
    sweetSpotText = i18n.t('analyticsModal.sweetSpotDesc', {
      range: bestBin.rangeLabel,
      acc: bestBin.accuracy,
    });
  } else if (records.length >= 3) {
    const populatedBins = bins.filter((b) => b.total > 0);
    const bestBin = populatedBins.sort((a, b) => b.accuracy - a.accuracy || b.total - a.total)[0];
    if (bestBin) {
      sweetSpotText = i18n.t('analyticsModal.sweetSpotDesc', {
        range: bestBin.rangeLabel,
        acc: bestBin.accuracy,
      });
    }
  }

  if (!sweetSpotText) {
    sweetSpotText = i18n.t('analyticsModal.needMoreSamples');
  }

  // 2. 难度突破区计算
  const levelStats = calculateLevelStats(records);
  const growthLevels = levelStats.filter(
    (s) => s.accuracy >= 60 && s.accuracy < 80 && s.total >= 2,
  );

  let growthZoneText = '';
  if (growthLevels.length > 0) {
    growthZoneText = growthLevels.map((s) => `Lvl ${s.level}`).join(', ');
  } else {
    const maxLvl = Math.max(...records.map((r) => Number(r.difficultyLevel) || 1));
    growthZoneText = `Lvl ${Math.max(1, maxLvl - 2)} ~ Lvl ${maxLvl}`;
  }

  return {
    sweetSpotText,
    growthZoneText,
  };
}

export const UNIVERSAL_ANALYTICS_VIEWS: CardAnalyticsView[] = [
  {
    id: 'universal_sat',
    tabLabel: 'analyticsModal.satTabLabel',
    title: 'analyticsModal.satTitle',
    subTitle: 'analyticsModal.satSubtitle',
    icon: Zap,
    renderVisualizer: renderSpeedAccuracyVisualizer,
    renderDiagnostics: diagnoseSpeedAccuracy,
  },
  {
    id: 'universal_plateau',
    tabLabel: 'analyticsModal.plateauTabLabel',
    title: 'analyticsModal.plateauTitle',
    subTitle: 'analyticsModal.plateauSubtitle',
    icon: Gauge,
    renderVisualizer: renderDifficultyPlateauVisualizer,
    renderDiagnostics: diagnoseDifficultyPlateau,
  },
];
~~~~~

#### Acts 2: 在 `CardAnalyticsView.tsx` 中接入真实诊断数据

重构 `CardAnalyticsView.tsx` 中的总览面板，使用 `getCognitiveOverviewInsights` 动态生成的诊断文案。

~~~~~act
patch_file
src/views/CardAnalyticsView.tsx
~~~~~
~~~~~typescript.old
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { CardAnalyticsView as CardAnalyticsViewContract } from '../core/contracts';
import { getCardDesc, getCardTitle, getPackTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { UnifiedTrialRecord } from '../utils/db/index';
~~~~~
~~~~~typescript.new
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { getCognitiveOverviewInsights } from '../core/analytics/universalViews';
import type { CardAnalyticsView as CardAnalyticsViewContract } from '../core/contracts';
import { getCardDesc, getCardTitle, getPackTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { UnifiedTrialRecord } from '../utils/db/index';
~~~~~

~~~~~act
patch_file
src/views/CardAnalyticsView.tsx
~~~~~
~~~~~typescript.old
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl flex-shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                  <div className="font-bold text-slate-900">
                    {t('analyticsModal.sweetSpotTitle')}
                  </div>
                  <p className="text-slate-600">
                    {summaryStats.accuracy >= 80
                      ? t('analyticsModal.comfortZoneDesc', { maxLevel: summaryStats.maxLevel })
                      : t('analyticsModal.needMoreSamples')}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl flex-shrink-0">
                  <Gauge className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                  <div className="font-bold text-slate-900">
                    {t('analyticsModal.growthZoneTitle')}
                  </div>
                  <p className="text-slate-600">
                    Lvl {Math.max(1, summaryStats.maxLevel - 2)} ~ Lvl {summaryStats.maxLevel}
                  </p>
                </div>
              </div>
            </div>
~~~~~
~~~~~typescript.new
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {(() => {
                const insights = getCognitiveOverviewInsights(records);
                return (
                  <>
                    <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                      <div className="p-2 bg-amber-100 text-amber-600 rounded-xl flex-shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                        <div className="font-bold text-slate-900">
                          {t('analyticsModal.sweetSpotTitle')}
                        </div>
                        <p className="text-slate-600">{insights.sweetSpotText}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl flex-shrink-0">
                        <Gauge className="w-4 h-4" />
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                        <div className="font-bold text-slate-900">
                          {t('analyticsModal.growthZoneTitle')}
                        </div>
                        <p className="text-slate-600">{insights.growthZoneText}</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
~~~~~

---

### 下一步建议

1. **类型检查与验证**：执行 `npm run check` 确保所有 TypeScript 类型及代码规范检查无报错。
2. **多卡片页面验证**：访问 `http://localhost:5173/#/analytics/abs_gesture_axis` 以及其他已有做答记录的模块，验证总览页中的“直觉黄金甜点区”是否已正确显示速度区间（如 `在 1.0~1.8s 区间内表现最稳健，胜率高达 xx%`）及对应的突破层级。
