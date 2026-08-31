我们来推进这一批组件的设计系统统一与语义化重构。

本次重点重构以下 5 个核心组件：
1. `src/components/plan/editor/PlanStageList.tsx`：将原生 `<button>` 与题量选择器全面升级为 `<Button>`，将硬编码 `slate-*` / `indigo-*` 替换为语义化色彩 Token。
2. `src/components/SessionSummaryModal.tsx`：引入 `<Button>` 和 `<Badge>`，统一层阶演进和图例展示，规范暗色及浅色模式。
3. `src/components/plan/PlanSummaryModal.tsx`：替换底部按钮与各阶段成绩卡，收敛色彩到 `bg-accent`, `text-primary`, `text-muted-foreground`。
4. `src/components/common/ModeCard.tsx`：将设置、统计与开始训练按钮重构为 `<Button>`，消除多处硬编码背景与阴影。
5. `src/components/plan/PlanHeroCard.tsx`：收敛下拉选择与阶段气泡，替换原生按钮与硬编码边框颜色。

## [WIP] refactor(ui): 推进设计系统规范化与语义化 Token 改造

### 用户需求
针对系统扫描出的设计不一致问题，重构 `PlanStageList`、`SessionSummaryModal`、`PlanSummaryModal`、`ModeCard` 和 `PlanHeroCard`，统一使用 Design System 的 `<Button>`、`<Badge>` 组件，并替换硬编码的 `slate`、`indigo` 色值类为语义化 Tailwind Token。

### 评论
将孤立的 `<button>` 和硬编码颜色转换为统一的基础 UI 组件与语义颜色（如 `bg-accent`, `text-primary`, `text-muted-foreground`, `border-border`），能够彻底解决明暗模式下的对比度与色调割裂问题，同时大幅提升组件的可维护性。

### 目标
1. 规范 `PlanStageList.tsx`：替换题量预设、阶段排序与移除按钮，统一为 `<Button>`，清理 slate 颜色。
2. 规范 `SessionSummaryModal.tsx`：升级底部控制按钮与顶部/阶段状态指示，使用 `<Button>` 与 `<Badge>`。
3. 规范 `PlanSummaryModal.tsx`：升级完成、重启按钮与层阶标记。
4. 规范 `ModeCard.tsx`：将统计、设置、自适应与基准测试触发器统一为 `<Button>`。
5. 规范 `PlanHeroCard.tsx`：整理计划选择下拉框、步骤卡片与启动按钮。

### 基本原理
直接使用完整内容覆盖重构目标文件，保证所有按钮与徽章结构一致，遵循项目已有 `button.tsx` 和 `badge.tsx` 的 variant / size 规范。

### 标签
#intent/refine #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/design-system-unification #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 重构 `PlanStageList.tsx`

~~~~~act
write_file
src/components/plan/editor/PlanStageList.tsx
~~~~~
~~~~~tsx
import { ArrowDown, ArrowUp, RotateCcw, Trash2, Zap } from 'lucide-preact';
import { getCardDesc, getCardTitle, useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import type { TrainingPlan } from '../../../types/plan';
import { Button } from '../../ui/button';

interface PlanStageListProps {
  currentPlan: TrainingPlan;
  totalTrials: number;
  estimatedMin: number;
  trialPresets: number[];
  onBatchUpdateTrials: (trials: number) => void;
  onClearAll: () => void;
  onUpdateTrials: (id: string, trials: number) => void;
  onMoveItem: (index: number, direction: 'up' | 'down') => void;
  onRemoveItem: (id: string) => void;
}

export function PlanStageList({
  currentPlan,
  totalTrials,
  estimatedMin,
  trialPresets,
  onBatchUpdateTrials,
  onClearAll,
  onUpdateTrials,
  onMoveItem,
  onRemoveItem,
}: PlanStageListProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full space-y-3 min-h-0">
      <div className="flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
        <div className="text-xs font-bold text-foreground flex items-center gap-2">
          <span>{t('plan.stageCount', { count: currentPlan.items.length })}</span>
          <span className="text-muted-foreground font-normal">
            • {t('plan.totalTrialsSummary', { trials: totalTrials })} ·{' '}
            {t('plan.estimatedTime', { min: estimatedMin })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentPlan.items.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] bg-muted px-2 py-0.5 rounded-xl border border-border/60">
              <span className="text-[10px] font-bold text-muted-foreground">
                {t('plan.batchTrials')}
              </span>
              {trialPresets.map((num) => (
                <Button
                  key={num}
                  variant="ghost"
                  size="sm"
                  onClick={() => onBatchUpdateTrials(num)}
                  className="h-6 px-1.5 py-0 text-[10px] font-bold rounded-lg text-muted-foreground hover:text-foreground"
                >
                  {num}
                  {t('common.trialsUnit')}
                </Button>
              ))}
            </div>
          )}

          {currentPlan.items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-7 text-[11px] font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('plan.clearStages')}</span>
            </Button>
          )}
        </div>
      </div>

      {currentPlan.items.length === 0 ? (
        <div className="flex-1 min-h-[220px] border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs bg-muted/40">
          <Zap className="w-6 h-6 text-muted-foreground/60" />
          <span>{t('plan.emptyPlanTip')}</span>
        </div>
      ) : (
        <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 min-h-0">
          {currentPlan.items.map((item, idx) => {
            const card = registry.getCardById(item.cardId);
            if (!card) return null;
            const Icon = card.icon;
            const cardTitle = getCardTitle(card, t);
            const cardDesc = getCardDesc(card, t);

            return (
              <div
                key={item.id}
                className="p-3 bg-card border border-border rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3"
              >
                {/* 模块信息区 */}
                <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto sm:flex-1">
                  <div className="w-6 h-6 rounded-lg bg-foreground text-background font-mono text-[11px] font-black flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="p-1.5 rounded-xl bg-accent text-primary flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-foreground truncate">{cardTitle}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{cardDesc}</div>
                  </div>
                </div>

                {/* 题量选择与操作控制区 */}
                <div className="flex items-center justify-between sm:justify-end gap-1.5 flex-shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/60">
                  <div className="flex items-center bg-muted p-0.5 rounded-xl border border-border/40">
                    {trialPresets.map((preset) => (
                      <Button
                        key={preset}
                        variant={item.targetTrials === preset ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => onUpdateTrials(item.id, preset)}
                        className={`h-6 px-2 py-0 text-[10px] font-bold rounded-lg ${
                          item.targetTrials === preset
                            ? 'shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 border-l border-border pl-1.5 ml-1">
                    <Button
                      variant="ghost"
                      size="iconSm"
                      disabled={idx === 0}
                      onClick={() => onMoveItem(idx, 'up')}
                      className="text-muted-foreground hover:text-foreground"
                      title={t('plan.moveUpTitle')}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      disabled={idx === currentPlan.items.length - 1}
                      onClick={() => onMoveItem(idx, 'down')}
                      className="text-muted-foreground hover:text-foreground"
                      title={t('plan.moveDownTitle')}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={() => onRemoveItem(item.id)}
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 ml-0.5"
                      title={t('plan.removeTitle')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
~~~~~

#### Acts 2: 重构 `SessionSummaryModal.tsx`

~~~~~act
write_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~tsx
import { ArrowRight, Award, Clock, Home, RotateCcw, Target, Zap } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import { getCardTitle, useTranslation } from '../core/i18n';
import type { CardDefinition } from '../types/card';
import { renderSessionTrendChartCanvas } from '../utils/canvas/drawTrendChart';
import { formatSecondsToTimer } from '../utils/time';
import { ModalShell } from './common/ModalShell';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

export interface SessionHistoryItem {
  trialIndex: number;
  levelBefore: number;
  levelAfter: number;
  isHit: boolean;
  responseTimeMs: number;
}

interface SessionSummaryModalProps {
  card: CardDefinition;
  sessionType: 'training' | 'benchmark';
  elapsedSeconds: number;
  history: SessionHistoryItem[];
  onClose: () => void;
  onRestart: () => void;
}

export function SessionSummaryModal({
  card,
  sessionType,
  elapsedSeconds,
  history,
  onClose,
  onRestart,
}: SessionSummaryModalProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cardTitle = getCardTitle(card, t);

  const totalTrials = history.length;
  const hitCount = history.filter((h) => h.isHit).length;
  const accuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;

  const startLevel = history.length > 0 ? history[0].levelBefore : 5;
  const endLevel = history.length > 0 ? history[history.length - 1].levelAfter : startLevel;
  const levelDiff = endLevel - startLevel;

  const avgResponseTimeSec =
    totalTrials > 0
      ? (history.reduce((acc, curr) => acc + curr.responseTimeMs, 0) / totalTrials / 1000).toFixed(
          1,
        )
      : '0.0';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && history.length > 0) {
      renderSessionTrendChartCanvas(canvas, history);
    }
  }, [history]);

  const subTitle = `${cardTitle} • ${
    sessionType === 'benchmark' ? t('summary.benchmarkSubtitle') : t('summary.trainingSubtitle')
  }`;

  return (
    <ModalShell
      title={t('summary.title')}
      subTitle={subTitle}
      icon={Award}
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <div className="flex flex-col gap-4">
        {/* 核心指标统计卡片 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/60 p-3.5 rounded-2xl border border-border/60 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground">
              <Target className="w-3.5 h-3.5 text-primary" />
              {t('summary.accuracyCount')}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-foreground">{accuracy}%</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {t('summary.trialsDone', { hits: hitCount, total: totalTrials })}
              </span>
            </div>
          </div>

          <div className="bg-muted/60 p-3.5 rounded-2xl border border-border/60 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {t('summary.duration')}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-foreground">
                {formatSecondsToTimer(elapsedSeconds)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                {t('summary.secPerTrial', { sec: avgResponseTimeSec })}
              </span>
            </div>
          </div>
        </div>

        {/* 层阶提升高亮卡片 */}
        <div className="bg-accent border border-indigo-100 dark:border-indigo-900/60 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary text-primary-foreground rounded-xl shadow-xs">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">
                {t('summary.levelEvolution')}
              </div>
              <div className="text-[11px] text-primary font-medium">
                {levelDiff > 0
                  ? t('summary.levelUp', { diff: levelDiff })
                  : levelDiff < 0
                    ? t('summary.levelDown', { diff: Math.abs(levelDiff) })
                    : t('summary.levelMaintain')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono font-black text-foreground text-sm">
            <Badge variant="secondary" size="default" className="font-mono">
              Lvl {startLevel}
            </Badge>
            <ArrowRight className="w-4 h-4 text-primary" />
            <Badge variant="default" size="default" className="font-mono">
              Lvl {endLevel}
            </Badge>
          </div>
        </div>

        {/* 折线图 Canvas 区 */}
        <div className="bg-muted/60 p-3.5 rounded-2xl border border-border w-full overflow-hidden">
          <div className="flex justify-between items-center px-1 mb-2">
            <span className="text-[11px] font-bold text-muted-foreground">
              {t('summary.curveTitle')}
            </span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{' '}
                {t('summary.hitLegend')}
              </span>
              <span className="flex items-center gap-1 text-rose-500 dark:text-rose-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />{' '}
                {t('summary.missLegend')}
              </span>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={440}
            height={160}
            className="w-full max-w-full aspect-[11/4] rounded-xl block border border-border/60 shadow-inner"
          />
        </div>

        {/* 底部操作按钮 */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button
            variant="secondary"
            onClick={onClose}
            className="h-11 gap-1.5"
          >
            <Home className="w-4 h-4" />
            <span>{t('summary.backHome')}</span>
          </Button>
          <Button
            variant="default"
            onClick={onRestart}
            className="h-11 gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('summary.trainAgain')}</span>
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
~~~~~

#### Acts 3: 重构 `PlanSummaryModal.tsx`

~~~~~act
write_file
src/components/plan/PlanSummaryModal.tsx
~~~~~
~~~~~tsx
import { ArrowRight, Award, CheckCircle, Clock, Home, RotateCcw, Target } from 'lucide-preact';
import { getCardTitle, useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import { formatSecondsToTimer } from '../../utils/time';
import type { SessionHistoryItem } from '../SessionSummaryModal';
import { ModalShell } from '../common/ModalShell';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export interface PlanStageResult {
  card: CardDefinition;
  targetTrials: number;
  history: SessionHistoryItem[];
}

interface PlanSummaryModalProps {
  planName: string;
  stageResults: PlanStageResult[];
  totalElapsedSeconds: number;
  onClose: () => void;
  onRestart: () => void;
}

export function PlanSummaryModal({
  planName,
  stageResults,
  totalElapsedSeconds,
  onClose,
  onRestart,
}: PlanSummaryModalProps) {
  const { t } = useTranslation();
  const allHistory = stageResults.flatMap((s) => s.history);
  const totalTrials = allHistory.length;
  const hitCount = allHistory.filter((h) => h.isHit).length;
  const accuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;

  const subTitle = t('common.planSummaryCompleted', {
    name: planName,
    count: stageResults.length,
  });

  return (
    <ModalShell
      title={t('common.planSummaryTitle')}
      subTitle={subTitle}
      icon={Award}
      onClose={onClose}
      maxWidth="max-w-xl"
    >
      <div className="flex flex-col gap-5">
        {/* 核心综合大盘卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-accent p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground">
              <Target className="w-3.5 h-3.5 text-primary" />
              {t('common.overallAccuracy')}
            </div>
            <div className="text-2xl font-black text-foreground">{accuracy}%</div>
          </div>

          <div className="bg-emerald-50/60 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              {t('common.totalHits')}
            </div>
            <div className="text-2xl font-black text-foreground">
              {hitCount} <span className="text-xs font-normal text-muted-foreground">/ {totalTrials}</span>
            </div>
          </div>

          <div className="bg-muted/60 p-3.5 rounded-2xl border border-border/60 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {t('common.totalTimeSpent')}
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {formatSecondsToTimer(totalElapsedSeconds)}
            </div>
          </div>
        </div>

        {/* 分阶段明细成果 */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('common.stageBreakdown')}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {stageResults.map((stage, idx) => {
              const stageHits = stage.history.filter((h) => h.isHit).length;
              const stageAcc =
                stage.history.length > 0 ? Math.round((stageHits / stage.history.length) * 100) : 0;
              const startLvl = stage.history.length > 0 ? stage.history[0].levelBefore : 5;
              const endLvl =
                stage.history.length > 0
                  ? stage.history[stage.history.length - 1].levelAfter
                  : startLvl;
              const Icon = stage.card.icon;
              const cardTitle = getCardTitle(stage.card, t);

              return (
                <div
                  key={`${stage.card.id}-${idx}`}
                  className="p-3 bg-muted/60 border border-border rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-foreground text-background font-mono text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <div className="p-1.5 rounded-xl bg-card text-primary border border-border/60 shadow-xs">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">{cardTitle}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {t('common.trialsCorrect', {
                          hits: stageHits,
                          total: stage.history.length,
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 font-mono text-xs font-bold text-muted-foreground bg-card px-2 py-1 rounded-xl border border-border/60">
                      <span>L{startLvl}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground/60" />
                      <span className="text-primary font-black">L{endLvl}</span>
                    </div>

                    <Badge
                      variant={
                        stageAcc >= 80
                          ? 'success'
                          : stageAcc >= 60
                            ? 'warning'
                            : 'destructive'
                      }
                      size="default"
                      className="font-mono text-xs"
                    >
                      {stageAcc}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部动作按钮 */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button
            variant="secondary"
            onClick={onClose}
            className="h-11 gap-1.5"
          >
            <Home className="w-4 h-4" />
            <span>{t('common.completeAndReturnHome')}</span>
          </Button>
          <Button
            variant="default"
            onClick={onRestart}
            className="h-11 gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('common.restartPlan')}</span>
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
~~~~~

#### Acts 4: 重构 `ModeCard.tsx`

~~~~~act
write_file
src/components/common/ModeCard.tsx
~~~~~
~~~~~tsx
import { BarChart2, FlaskConical, Play, Sliders, Target } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useTranslation } from '../../core/i18n';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export function formatTodayTimeWithT(ms: number, t: (key: string) => string): string {
  if (ms <= 0) return `0${t('common.sec')}`;
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec}${t('common.sec')}`;
  }
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0
    ? `${min}${t('common.min')}${sec}${t('common.sec')}`
    : `${min}${t('common.minFull')}`;
}

interface ModeCardProps {
  title: string;
  desc: string;
  icon: (props: { className?: string }) => ComponentChildren;
  todayCount: number;
  todayTimeMs?: number;
  currentLevel: number;
  accuracy: number;
  totalTrials?: number;
  hasAnalytics?: boolean;
  isExperimental?: boolean;
  onStartTraining: () => void;
  onStartBenchmark: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics?: () => void;
}

export function ModeCard({
  title,
  desc,
  icon: Icon,
  todayCount,
  todayTimeMs = 0,
  currentLevel,
  accuracy,
  totalTrials = 0,
  isExperimental = false,
  onStartTraining,
  onStartBenchmark,
  onOpenSettings,
  onOpenAnalytics,
}: ModeCardProps) {
  const { t } = useTranslation();
  const isNeverPracticed = totalTrials === 0;

  // 未练习过的卡片默认进入基准测试，已有做答记录的默认进入自适应强化
  const handleCardClick = isNeverPracticed ? onStartBenchmark : onStartTraining;

  return (
    <div
      role="presentation"
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="group bg-card border border-border hover:border-primary/60 rounded-3xl p-6 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative cursor-pointer select-none"
    >
      <div>
        {/* 顶部标题、图标与右上角状态徽章 */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 rounded-2xl bg-accent text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105 transition-all shadow-xs flex-shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-foreground group-hover:text-primary transition-colors truncate">
                  {title}
                </h3>
                {isExperimental && (
                  <Badge variant="warning" size="sm">
                    <FlaskConical className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    {t('card.experimentalBadge')}
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">
                {todayCount > 0
                  ? `${t('card.todayTrials')}: ${todayCount} ${t('common.trialsUnit')}${
                      todayTimeMs > 0 ? ` (${formatTodayTimeWithT(todayTimeMs, t)})` : ''
                    }`
                  : isNeverPracticed
                    ? t('common.empty')
                    : `${t('card.todayTrials')}: 0 ${t('common.trialsUnit')}`}
              </div>
            </div>
          </div>

          {/* 右上角：等级胶囊与快捷操作 */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge variant="secondary" size="default" className="font-mono font-black">
              Lvl {currentLevel}
            </Badge>

            <div
              className="flex items-center opacity-70 group-hover:opacity-100 transition-opacity ml-1 gap-0.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
              {onOpenAnalytics && (
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={onOpenAnalytics}
                  title={t('card.statsTooltip', { title })}
                >
                  <BarChart2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="iconSm"
                onClick={onOpenSettings}
                title={t('card.settingsTooltip', { title })}
              >
                <Sliders className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 卡片描述 */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.5rem] mb-5">
          {desc}
        </p>
      </div>

      {/* 底部指标栏与浮动操作按钮 */}
      <div
        className="flex items-end justify-between border-t border-border/60 pt-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        {/* 左侧：正确率综合指示 */}
        <div className="space-y-0.5">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {t('card.accuracy')}
          </div>
          <div className="text-sm font-black text-foreground font-mono flex items-baseline gap-1.5">
            <span
              className={
                isNeverPracticed
                  ? 'text-muted-foreground'
                  : accuracy >= 80
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-foreground'
              }
            >
              {isNeverPracticed ? '--' : `${accuracy}%`}
            </span>
            {todayCount > 0 && (
              <span className="text-[11px] font-normal text-muted-foreground font-sans">
                ({todayCount} {t('common.trialsUnit')})
              </span>
            )}
          </div>
        </div>

        {/* 右侧：紧凑动作按钮组（根据 isNeverPracticed 动态倒转权重） */}
        <div className="flex items-center gap-2">
          {isNeverPracticed ? (
            <>
              {/* 次级：仅显示三角形 Play 图标的自适应训练按钮 */}
              <Button
                variant="secondary"
                size="icon"
                onClick={onStartTraining}
                title={t('card.startAdaptive')}
              >
                <Play className="w-4 h-4 fill-current text-muted-foreground" />
              </Button>

              {/* 主要：高亮文字「基准测试」按钮 */}
              <Button
                variant="default"
                size="sm"
                onClick={onStartBenchmark}
                className="gap-1.5 font-bold"
              >
                <Target className="w-3.5 h-3.5" />
                <span>{t('card.startBenchmark')}</span>
              </Button>
            </>
          ) : (
            <>
              {/* 次级：仅显示靶心 Target 图标的基准测试按钮 */}
              <Button
                variant="secondary"
                size="icon"
                onClick={onStartBenchmark}
                title={t('card.startBenchmark')}
              >
                <Target className="w-4 h-4 text-muted-foreground" />
              </Button>

              {/* 主要：高亮文字「自适应训练」按钮 */}
              <Button
                variant="default"
                size="sm"
                onClick={onStartTraining}
                className="gap-1.5 font-bold"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t('card.startAdaptive')}</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
~~~~~

#### Acts 5: 重构 `PlanHeroCard.tsx`

~~~~~act
write_file
src/components/plan/PlanHeroCard.tsx
~~~~~
~~~~~tsx
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Play,
  Plus,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { getCardTitle, useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type { TrainingPlan } from '../../types/plan';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface PlanHeroCardProps {
  plan: TrainingPlan;
  allPlans?: TrainingPlan[];
  onStartPlan: () => void;
  onOpenEditor: () => void;
  onSelectPlan?: (planId: string) => void;
}

export function PlanHeroCard({
  plan,
  allPlans = [],
  onStartPlan,
  onOpenEditor,
  onSelectPlan,
}: PlanHeroCardProps) {
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const hasItems = plan.items && plan.items.length > 0;
  const totalTrials = (plan.items || []).reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  const favoritePlans = allPlans.filter((p) => p.isFavorite ?? true);

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  if (!hasItems) {
    return (
      <div className="w-full bg-accent/40 border-2 border-dashed border-border rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-5 transition-all">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-accent text-primary rounded-2xl">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">{t('plan.todayPlan')}</h2>
              <Badge variant="secondary" size="sm">
                {t('common.empty')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('plan.emptyHeroDesc')}</p>
          </div>
        </div>

        <Button
          variant="default"
          onClick={onOpenEditor}
          className="w-full sm:w-auto gap-2 flex-shrink-0 rounded-2xl"
        >
          <Plus className="w-4 h-4" />
          <span>{t('plan.customizeBtn')}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="group w-full bg-card border border-border hover:border-primary/60 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col gap-5 relative z-10">
      <div className="flex items-center justify-between border-b border-border/60 pb-3.5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary text-primary-foreground rounded-2xl shadow-xs">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {favoritePlans.length > 1 && onSelectPlan ? (
                <div ref={dropdownRef} className="relative inline-block text-left">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="h-auto p-0 hover:bg-transparent text-lg font-black text-foreground tracking-tight hover:text-primary gap-1.5"
                  >
                    <span>{plan.name}</span>
                    <div
                      className={`p-1 rounded-lg bg-muted text-muted-foreground group-hover:text-primary transition-all duration-200 ${
                        isDropdownOpen ? 'rotate-180 bg-accent text-primary' : ''
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </Button>

                  {isDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 z-40 w-72 sm:w-80 bg-card/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border p-1.5 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 flex items-center justify-between">
                        <span>{t('plan.switchPlan')}</span>
                        <span className="font-mono">
                          {t('plan.availableCount', { count: favoritePlans.length })}
                        </span>
                      </div>

                      <div className="max-h-60 overflow-y-auto py-1 space-y-1 pr-1">
                        {favoritePlans.map((p) => {
                          const isSelected = p.id === plan.id;
                          const stageCount = (p.items || []).length;
                          const pTrials = (p.items || []).reduce(
                            (acc, c) => acc + c.targetTrials,
                            0,
                          );

                          return (
                            <Button
                              key={p.id}
                              variant={isSelected ? 'accent' : 'ghost'}
                              size="sm"
                              onClick={() => {
                                onSelectPlan(p.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full h-auto p-2.5 rounded-xl text-left justify-between items-center gap-2.5 ${
                                isSelected
                                  ? 'shadow-xs border border-indigo-200 dark:border-indigo-900'
                                  : 'text-foreground'
                              }`}
                            >
                              <div className="min-w-0 flex-1 text-left">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold truncate text-foreground">
                                    {p.name}
                                  </span>
                                  {p.isBuiltin && (
                                    <Badge variant="secondary" size="sm">
                                      {t('common.official')}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  {t('plan.stageCount', { count: stageCount })} •{' '}
                                  {t('plan.totalTrialsSummary', { trials: pTrials })}
                                </div>
                              </div>

                              {isSelected && (
                                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <h2 className="text-lg font-black text-foreground tracking-tight">{plan.name}</h2>
              )}

              <Badge variant="accent" size="sm" className="rounded-full">
                {t('plan.stageCount', { count: plan.items.length })}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium mt-0.5">
              <span>{t('plan.totalTrialsSummary', { trials: totalTrials })}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                {t('plan.estimatedTime', { min: estimatedMin })}
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenEditor}
          className="gap-1.5 shadow-xs border border-border"
          title={t('plan.editPlan')}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{t('plan.editPlan')}</span>
        </Button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {plan.items.map((item, idx) => {
          const card = registry.getCardById(item.cardId);
          if (!card) return null;
          const Icon = card.icon;
          const cardTitle = getCardTitle(card, t);

          return (
            <div key={item.id} className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-muted/60 border border-border px-3 py-2 rounded-2xl shadow-inner">
                <div className="w-5 h-5 rounded-lg bg-accent text-primary flex items-center justify-center font-mono text-[10px] font-black">
                  {idx + 1}
                </div>
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold text-foreground">{cardTitle}</span>
                <Badge variant="accent" size="sm" className="font-mono font-bold">
                  {item.targetTrials}
                  {t('common.trialsUnit')}
                </Badge>
              </div>
              {idx < plan.items.length - 1 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
        <div className="text-xs text-muted-foreground font-medium">{t('plan.syncNotice')}</div>

        <Button
          variant="default"
          onClick={onStartPlan}
          className="py-3 px-6 gap-2 ml-auto rounded-2xl"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{t('plan.startPlan')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
~~~~~

### 下一步建议
1. 运行测试套件与类型检查，确保所有 `<Button>`、`<Badge>` 迁移后的组件无 TS 类型报错或事件传递受阻问题。
2. 针对下一个扫描批次中涉及的扩展包组件（例如 `packs/color` 与 `packs/perspective` 的定制 View）推进语义化重构。
