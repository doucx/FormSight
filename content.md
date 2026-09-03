好的，我将使用 `write_file` 对 `src/cards/color_hue/analytics.tsx` 进行重写，提取统一的安全 HSV 解析辅助函数与扇区统计函数，彻底消除裸露的类型强转和重复计算代码。

## [WIP] refactor: 规范 color_hue 分析层类型守卫并消除重复计算

### 用户需求
使用 `write_file` 彻底重构 `src/cards/color_hue/analytics.tsx`，消除 `(r.targetHSV as [number, number, number])` 的遗留类型强转，统一 HSV 三元组安全解析规则，并消除 `hue_ring` 视图中两处重复的 12 扇区分组统计逻辑。

### 评论
将松散字段提取与扇区分组逻辑收口为专有的纯函数，既提升了代码复用性与可读性，又在分析图表层建立了严密的反序列化守卫屏障，彻底落实类型安全契约。

### 目标
1. 定义统一的 `parseHsvTuple` 运行时数组与数字类型守卫函数。
2. 提取 `calculateHueSectorStats` 纯函数，服务于 `hue_ring` 的可视化绘制与盲区诊断。
3. 彻底清除所有的 `as [number, number, number]` 裸露类型断言。

### 基本原理
通过在模块内部引入结构化解析器，即便历史 IndexedDB 记录中的 `details` 对象存在字段缺失或结构退化，也能安全兜底并保证后续的角度计算（如 `calcSignedHueBias`）与 Canvas 绘制始终接收到合法的数值，杜绝运行时 `NaN` 或未定义属性访问异常。

### 标签
#intent/refine #flow/ready #priority/medium #comp/core #scope/core #scope/dx #ai/instruct #task/domain/analytics #task/object/color-hue-analytics #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 全量重写 `src/cards/color_hue/analytics.tsx`

~~~~~act
write_file
src/cards/color_hue/analytics.tsx
~~~~~
~~~~~typescript
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
import type { UnifiedTrialRecord } from '../../storage/db/schema';

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

/**
 * 运行时安全守卫：将未知的试炼记录字段转换为合法的 HSV 三元组
 */
function parseHsvTuple(
  raw: unknown,
  fallback: [number, number, number] = [0, 0, 0],
): [number, number, number] {
  if (Array.isArray(raw) && raw.length === 3) {
    return [Number(raw[0]) || 0, Number(raw[1]) || 0, Number(raw[2]) || 0];
  }
  return fallback;
}

/**
 * 聚合 12 个色相扇区的样本量、命中数与平均误差统计
 */
function calculateHueSectorStats(records: UnifiedTrialRecord[]): SectorStat[] {
  const sectorBuckets = Array.from({ length: 12 }, () => ({
    total: 0,
    hits: 0,
    sumError: 0,
  }));

  for (const r of records) {
    const tHsv = parseHsvTuple(r.targetHSV);
    const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
    sectorBuckets[idx].total += 1;
    if (r.isHit) sectorBuckets[idx].hits += 1;
    sectorBuckets[idx].sumError += Number(r.errorValue ?? 0);
  }

  return sectorBuckets.map((b, i) => ({
    sectorIdx: i,
    label: i18n.t(`cards.color_hue.${COLOR_SECTOR_KEYS[i]}`),
    total: b.total,
    accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
    avgError: b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0,
  }));
}

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
        const sectorBuckets = Array.from({ length: 12 }, () => ({
          total: 0,
          hits: 0,
          sumBias: 0,
        }));

        for (const r of records) {
          const tHsv = parseHsvTuple(r.targetHSV);
          const uHsv = parseHsvTuple(r.userHSV, tHsv);
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
        const sectorStats = calculateHueSectorStats(records);
        renderHueRingCanvas(canvas, sectorStats);
      },
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const sectorStats = calculateHueSectorStats(records);
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

### 下一步建议
1. **类型检查与构建验证**：运行 `npm run build` 确保重构后的文件通过 TypeScript 编译检查。
2. **Git 状态确认与提交**：在验证无误后，如需将本次改动固化至版本库，可随时请求发起 `[COMMIT]` 计划。
