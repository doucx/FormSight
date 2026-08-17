我将为你实施架构重构，提取通用的训练外壳 `<TrainingShell>`、休眠蒙版 `<IdlePauseOverlay>`、通用模式卡片 `<ModeCard>`、看板容器 `<DashboardShell>` 以及通用今日统计 Hook `useTodayStats`，彻底消除三大训练模块中的样板代码。

## [WIP] refactor: 提取通用训练外壳与模式卡片组件以消除样板代码

### 用户需求
消除 `TrainingView`、`ColorTrainingView`、`RelativeColorTrainingView` 以及各大 `Dashboard` 中的大量重复样板代码（如头部 Header、闲置模糊遮罩、翻页控制栏、结课弹窗、卡片布局与今日刷题统计逻辑），建立清晰的“外壳与领域内核分离（Shell & Domain Separation）”组件架构。

### 评论
当前架构下，每新增一个训练领域（如寻星、绝对色感、相对色感），就需要完整复制粘贴一套包含 Header、休眠遮罩、翻页按钮、结算弹窗、状态聚合统计的样板代码，导致代码体积膨胀且全局功能变更（如新增暂停遮罩或调整结算逻辑）需要跨文件多处同步修改。将其重构为壳层（Shell）与内核（Canvas）分离后，新增训练模式仅需编写对应 Canvas，大幅降低维护成本并提升可测性。

### 目标
1. 抽取通用的休眠遮罩原子组件 `<IdlePauseOverlay>` 与训练页容器 `<TrainingShell>`。
2. 抽取统一的今日刷题统计 Hook `useTodayStats`。
3. 抽取通用的模式看板外壳 `<DashboardShell>` 与模式卡片组件 `<ModeCard>`。
4. 重构 3 个 TrainingView（`TrainingView`、`ColorTrainingView`、`RelativeColorTrainingView`）与 3 个 Dashboard（`Dashboard`、`ColorDashboard`、`RelativeColorDashboard`）。

### 基本原理
1. **容器模式 (Container/Shell Pattern)**：通过 `<TrainingShell>` 统一接管顶部状态栏、底栏控制、休眠蒙版以及 `SessionSummaryModal` 弹窗渲染，并通过 render props / children 注入具体领域 Canvas。
2. **组合优于重复 (Composition over Duplication)**：通过 `<ModeCard>` 统一卡片样式、指标徽标及自适应/基准测试入口；通过 `useTodayStats` 统一按日聚合各模块的刷题量与练习时长。

### 标签
#intent/refine #flow/ready #priority/high #comp/ui #comp/runtime #concept/ui #concept/state #scope/dx #ai/instruct #task/domain/ui #task/object/training-shell-refactor #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 新建基础通用组件与 Hook

~~~~~act
write_file
src/components/common/IdlePauseOverlay.tsx
~~~~~
~~~~~typescript
import { Pause } from 'lucide-preact';

interface IdlePauseOverlayProps {
  onResume: () => void;
}

export function IdlePauseOverlay({ onResume }: IdlePauseOverlayProps) {
  return (
    <div
      role="presentation"
      onClick={onResume}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onResume();
      }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md rounded-3xl cursor-pointer select-none animate-in fade-in duration-150"
    >
      <div className="p-5 bg-white/95 text-slate-800 rounded-3xl shadow-2xl border border-white/60 flex flex-col items-center gap-2.5 max-w-xs text-center mx-4">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
          <Pause className="w-6 h-6 animate-pulse" />
        </div>
        <div className="text-base font-bold text-slate-800">训练已自动暂停</div>
        <p className="text-xs text-slate-500 leading-relaxed">
          检测到闲置或窗口切换，已保护您的心流与统计数据
        </p>
        <button
          type="button"
          onClick={onResume}
          className="mt-1 w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
        >
          点击继续训练 (或按任意键)
        </button>
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, ChevronRight, Clock, Crosshair } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import type { SessionHistoryItem } from '../SessionSummaryModal';
import { SessionSummaryModal } from '../SessionSummaryModal';
import { IdlePauseOverlay } from '../common/IdlePauseOverlay';

export interface TrainingSessionHandle {
  totalTrials: number;
  elapsedSeconds: number;
  isFinished: boolean;
  isIdle: boolean;
  showAnswer: boolean;
  showSummaryModal: boolean;
  sessionHistory: SessionHistoryItem[];
  resumeFromIdle: () => void;
  handleNextQuestion: () => void;
  handleRequestFinish: () => void;
  handleFinishSession: () => void;
  handleRestartSession: () => void;
}

interface TrainingShellProps {
  title: string;
  badge: string;
  sessionType: 'training' | 'benchmark';
  currentLevel: number;
  isTargeting?: boolean;
  autoNext: boolean;
  session: TrainingSessionHandle;
  onExit: () => void;
  children: (state: { disabled: boolean; isIdle: boolean }) => ComponentChildren;
}

export function TrainingShell({
  title,
  badge,
  sessionType,
  currentLevel,
  isTargeting = false,
  autoNext,
  session,
  onExit,
  children,
}: TrainingShellProps) {
  const {
    totalTrials,
    elapsedSeconds,
    isFinished,
    isIdle,
    showAnswer,
    showSummaryModal,
    sessionHistory,
    resumeFromIdle,
    handleNextQuestion,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  } = session;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* 统一 Header 状态栏 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestFinish}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练 (Esc)
          </button>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {badge} | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
          {isTargeting && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              靶向强化训练
            </span>
          )}
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              已练题数
            </span>
            <span className="font-black text-gray-800">
              {totalTrials} {sessionType === 'benchmark' ? '/ 20' : ''}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              当前难度
            </span>
            <span className="font-black text-indigo-600">Level {currentLevel}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-slate-700">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>
      </header>

      {/* 统一 Canvas 居中容器与休眠遮罩 */}
      <div className="relative w-full flex justify-center">
        {children({ disabled: isFinished || isIdle, isIdle })}
        {isIdle && <IdlePauseOverlay onResume={resumeFromIdle} />}
      </div>

      {/* 统一手动下一题控制栏 */}
      {!autoNext && (
        <div className="flex items-center justify-center">
          {isFinished ? (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all active:scale-95"
            >
              完成并查看总结
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={!showAnswer}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1 ${
                showAnswer
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              下一题
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 统一结课总结弹窗 */}
      {showSummaryModal && (
        <SessionSummaryModal
          mode="single"
          sessionType={sessionType}
          elapsedSeconds={elapsedSeconds}
          history={sessionHistory}
          onClose={handleFinishSession}
          onRestart={handleRestartSession}
        />
      )}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/hooks/useTodayStats.ts
~~~~~
~~~~~typescript
import { useEffect, useState } from 'preact/hooks';
import { type TrainingDomain, getTrialRecords } from '../utils/db';

export function useTodayStats(domain?: TrainingDomain) {
  const [todayStats, setTodayStats] = useState<
    Record<string, { count: number; timeMs: number }>
  >({});

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      const records = await getTrialRecords(domain);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const stats: Record<string, { count: number; timeMs: number }> = {};

      for (const r of records) {
        if (r.timestamp >= startOfToday) {
          const m = r.mode;
          if (!stats[m]) {
            stats[m] = { count: 0, timeMs: 0 };
          }
          stats[m].count += 1;
          stats[m].timeMs += (r.responseTimeMs as number) || 0;
        }
      }

      if (isMounted) {
        setTodayStats(stats);
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [domain]);

  return todayStats;
}
~~~~~

~~~~~act
write_file
src/components/dashboard/ModeCard.tsx
~~~~~
~~~~~typescript
import { Award, Play, Target, TrendingUp } from 'lucide-preact';
import type { ComponentType } from 'preact';

export function formatTodayTime(ms: number): string {
  if (ms <= 0) return '0秒';
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec}秒`;
  }
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0 ? `${min}分${sec}秒` : `${min}分钟`;
}

interface ModeCardProps {
  title: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
  todayCount: number;
  todayTimeMs?: number;
  currentLevel: number;
  accuracy: number;
  onStartTraining: () => void;
  onStartBenchmark: () => void;
}

export function ModeCard({
  title,
  desc,
  icon: Icon,
  todayCount,
  todayTimeMs = 0,
  currentLevel,
  accuracy,
  onStartTraining,
  onStartBenchmark,
}: ModeCardProps) {
  return (
    <div className="group bg-white border border-gray-200/80 hover:border-indigo-300 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
            <Icon className="w-6 h-6" />
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold text-slate-400">今日刷题</div>
            <div className="text-xs font-bold text-slate-500 font-mono">
              {todayCount} 题
              {todayCount > 0 && todayTimeMs > 0 && (
                <span className="text-[11px] text-slate-400 font-normal ml-1">
                  ({formatTodayTime(todayTimeMs)})
                </span>
              )}
            </div>
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed h-10">{desc}</p>

        {/* 核心指标 */}
        <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
              <TrendingUp className="w-3 h-3 text-indigo-500" />
              能力层阶
            </div>
            <div className="text-xl font-black text-slate-800">Level {currentLevel}</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
              <Award className="w-3 h-3 text-emerald-500" />
              正确率
            </div>
            <div className="text-xl font-black text-slate-800">{accuracy}%</div>
          </div>
        </div>
      </div>

      {/* 动作按钮区 */}
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onStartTraining}
          className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          开始自适应训练
        </button>
        <button
          type="button"
          onClick={onStartBenchmark}
          className="w-full py-2.5 px-4 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
          <Target className="w-3.5 h-3.5 text-gray-500" />
          20 题基准测试
        </button>
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/dashboard/DashboardShell.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, BarChart2, Sliders } from 'lucide-preact';
import type { ComponentChildren } from 'preact';

interface DashboardShellProps {
  title: string;
  subTitle: string;
  onBackToHome?: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics?: () => void;
  children: ComponentChildren;
}

export function DashboardShell({
  title,
  subTitle,
  onBackToHome,
  onOpenSettings,
  onOpenAnalytics,
  children,
}: DashboardShellProps) {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-6 py-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              返回主页
            </button>
          )}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {title} <span className="text-indigo-600 font-light text-xl">{subTitle}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAnalytics && (
            <button
              type="button"
              onClick={onOpenAnalytics}
              className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
              title="弱点分析"
            >
              <BarChart2 className="w-4 h-4 text-indigo-600" />
              弱点分析
            </button>
          )}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="偏好设置"
          >
            <Sliders className="w-4 h-4" />
            偏好设置
          </button>
        </div>
      </div>

      {/* 模块卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{children}</div>
    </div>
  );
}
~~~~~

#### Acts 2: 重构 3 个 TrainingView

~~~~~act
write_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript
import { useCallback, useRef } from 'preact/hooks';
import { StarCanvas } from '../components/StarCanvas';
import { TrainingShell } from '../components/training/TrainingShell';
import { useTrainingSession } from '../hooks/useTrainingSession';
import type { HitResult, Point, QuestionData, TrainingMode } from '../types';
import { saveSession, saveTrialRecord } from '../utils/db';
import { type QuestionGenerateOptions, checkHit, generateQuestion } from '../utils/geometry';
import type { StarSettings } from '../utils/settings';

interface TrainingViewProps {
  mode: TrainingMode;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: StarSettings;
  onExit: () => void;
}

export function TrainingView({
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: TrainingViewProps) {
  const targetSectorsRef = useRef<number[]>(settings.manualTargetSectors || []);

  const getGenerateOptions = useCallback((): QuestionGenerateOptions => {
    return {
      targetingMode: settings.targetingMode,
      targetSectors:
        settings.targetingMode === 'manual'
          ? settings.manualTargetSectors
          : targetSectorsRef.current,
      gridSize: settings.gridSize,
    };
  }, [settings]);

  const session = useTrainingSession<
    QuestionData,
    HitResult,
    { clickPoint: Point; hitResult: HitResult }
  >({
    domain: 'star',
    mode,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    generateQuestion: (level) => generateQuestion(mode, level, getGenerateOptions()),
    evaluateAnswer: (userVal) => userVal.hitResult,
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    saveTrialRecord: async ({ sessionId, question: q, hitResult, responseTimeMs }) => {
      await saveTrialRecord({
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        domain: 'star',
        mode,
        timestamp: Date.now(),
        difficultyLevel: q.difficultyLevel,
        isHit: hitResult.isHit,
        responseTimeMs,
        details: {
          anchorA: [q.anchorA.x, q.anchorA.y],
          anchorC: q.anchorC ? [q.anchorC.x, q.anchorC.y] : undefined,
          targetB: [q.targetB.x, q.targetB.y],
          userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
          angleDegree: q.angleDegree,
          distanceRatio: q.distanceRatio,
          errorPixelDistance: hitResult.errorDistance,
        },
      });
    },
    saveSession: async ({
      sessionId,
      totalTrials: t,
      hitTrials: h,
      ended,
      startTimestamp,
      endLevel,
    }) => {
      await saveSession({
        id: sessionId,
        domain: 'star',
        mode,
        type: sessionType,
        startTimestamp,
        endTimestamp: ended ? Date.now() : undefined,
        totalTrials: t,
        hitTrials: h,
        startLevel: initialLevel,
        endLevel,
      });
    },
    onExit,
  });

  const canvasUserAnswer = session.userAnswer
    ? { clickPoint: session.userAnswer.nearestGridPoint, hitResult: session.userAnswer }
    : null;

  return (
    <TrainingShell
      title="寻星练习"
      badge={mode}
      sessionType={sessionType}
      currentLevel={session.question.difficultyLevel}
      isTargeting={settings.targetingMode === 'manual'}
      autoNext={settings.autoNext}
      session={session}
      onExit={onExit}
    >
      {({ disabled }) => (
        <StarCanvas
          question={session.question}
          showAnswer={session.showAnswer}
          userAnswer={canvasUserAnswer}
          onAnswer={(clickPoint) => {
            const hitRes = checkHit(
              clickPoint,
              session.question.targetB,
              session.question.distractorPoints,
            );
            if (hitRes.isWithinRange) {
              session.handleAnswer({ clickPoint, hitResult: hitRes });
            }
          }}
          disabled={disabled}
        />
      )}
    </TrainingShell>
  );
}
~~~~~

~~~~~act
write_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript
import { useCallback, useRef } from 'preact/hooks';
import { ColorCanvas } from '../components/ColorCanvas';
import { TrainingShell } from '../components/training/TrainingShell';
import { useTrainingSession } from '../hooks/useTrainingSession';
import {
  type ColorHitResult,
  type ColorMode,
  type ColorQuestionData,
  type ColorQuestionGenerateOptions,
  checkColorHit,
  generateColorQuestion,
} from '../utils/colorUtils';
import { saveColorSession, saveColorTrialRecord } from '../utils/db';
import type { ColorSenseSettings } from '../utils/settings';

interface ColorTrainingViewProps {
  mode: ColorMode;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: ColorSenseSettings;
  onExit: () => void;
}

export function ColorTrainingView({
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: ColorTrainingViewProps) {
  const targetSectorsRef = useRef<number[]>(settings.manualTargetSectors || []);

  const getColorGenerateOptions = useCallback((): ColorQuestionGenerateOptions => {
    return {
      targetingMode: settings.targetingMode,
      targetSectors:
        settings.targetingMode === 'manual'
          ? settings.manualTargetSectors
          : targetSectorsRef.current,
    };
  }, [settings]);

  const session = useTrainingSession<
    ColorQuestionData,
    ColorHitResult,
    number | [number, number, number]
  >({
    domain: 'color',
    mode,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    generateQuestion: (level) => generateColorQuestion(mode, level, getColorGenerateOptions()),
    evaluateAnswer: (userVal, q) => checkColorHit(mode, userVal, q),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    saveTrialRecord: async ({ sessionId, question: q, hitResult, responseTimeMs, userVal }) => {
      const computedUserHSV: [number, number, number] =
        mode === 'ALL' && Array.isArray(userVal)
          ? userVal
          : [
              mode === 'H' ? (userVal as number) : q.targetH,
              mode === 'S' ? (userVal as number) : q.targetS,
              mode === 'V' ? (userVal as number) : q.targetV,
            ];

      await saveColorTrialRecord({
        id: `crec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        domain: 'color',
        mode,
        timestamp: Date.now(),
        difficultyLevel: q.difficultyLevel,
        isHit: hitResult.isHit,
        responseTimeMs,
        details: {
          targetHSV: [q.targetH, q.targetS, q.targetV],
          userHSV: computedUserHSV,
          errorValue: hitResult.errorValue,
        },
      });
    },
    saveSession: async ({
      sessionId,
      totalTrials: t,
      hitTrials: h,
      ended,
      startTimestamp,
      endLevel,
    }) => {
      await saveColorSession({
        id: sessionId,
        domain: 'color',
        mode,
        type: sessionType,
        startTimestamp,
        endTimestamp: ended ? Date.now() : undefined,
        totalTrials: t,
        hitTrials: h,
        startLevel: initialLevel,
        endLevel,
      });
    },
    onExit,
  });

  const modeBadge =
    mode === 'H' ? '色相' : mode === 'V' ? '明度' : mode === 'S' ? '饱和度' : '综合拾色';

  return (
    <TrainingShell
      title="色感训练"
      badge={modeBadge}
      sessionType={sessionType}
      currentLevel={session.question.difficultyLevel}
      isTargeting={settings.targetingMode === 'manual' && mode === 'H'}
      autoNext={settings.autoNext}
      session={session}
      onExit={onExit}
    >
      {({ disabled }) => (
        <ColorCanvas
          question={session.question}
          showAnswer={session.showAnswer}
          userAnswer={session.userAnswer}
          onAnswer={session.handleAnswer}
          disabled={disabled}
          hitMargin={settings.sliderHitMargin ?? 12}
          showToleranceBand={settings.showToleranceBand ?? true}
          enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
        />
      )}
    </TrainingShell>
  );
}
~~~~~

~~~~~act
write_file
src/views/RelativeColorTrainingView.tsx
~~~~~
~~~~~typescript
import { RelativeColorCanvas } from '../components/RelativeColorCanvas';
import { TrainingShell } from '../components/training/TrainingShell';
import { useTrainingSession } from '../hooks/useTrainingSession';
import { saveSession, saveTrialRecord } from '../utils/db';
import {
  type RelativeColorHitResult,
  type RelativeColorMode,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateRelativeColorQuestion,
} from '../utils/relativeColorUtils';
import type { RelativeColorSettings } from '../utils/settings';

interface RelativeColorTrainingViewProps {
  mode: RelativeColorMode;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: RelativeColorSettings;
  onExit: () => void;
}

export function RelativeColorTrainingView({
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: RelativeColorTrainingViewProps) {
  const session = useTrainingSession<
    RelativeColorQuestionData,
    RelativeColorHitResult,
    [number, number, number]
  >({
    domain: 'relative_color',
    mode,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    generateQuestion: (level) => generateRelativeColorQuestion(mode, level),
    evaluateAnswer: (userD, q) => checkRelativeColorHit(mode, userD, q),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    saveTrialRecord: async ({ sessionId, question: q, hitResult, responseTimeMs, userVal }) => {
      await saveTrialRecord({
        id: `rcrec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        domain: 'relative_color',
        mode,
        timestamp: Date.now(),
        difficultyLevel: q.difficultyLevel,
        isHit: hitResult.isHit,
        responseTimeMs,
        details: {
          colorA: q.colorA,
          colorB: q.colorB,
          colorC: q.colorC,
          targetD: q.targetD,
          userD: userVal,
          deltaEError: hitResult.deltaEError,
        },
      });
    },
    saveSession: async ({
      sessionId,
      totalTrials: t,
      hitTrials: h,
      ended,
      startTimestamp,
      endLevel,
    }) => {
      await saveSession({
        id: sessionId,
        domain: 'relative_color',
        mode,
        type: sessionType,
        startTimestamp,
        endTimestamp: ended ? Date.now() : undefined,
        totalTrials: t,
        hitTrials: h,
        startLevel: initialLevel,
        endLevel,
      });
    },
    onExit,
  });

  return (
    <TrainingShell
      title="相对色感"
      badge="色彩矢量迁移"
      sessionType={sessionType}
      currentLevel={session.question.difficultyLevel}
      autoNext={settings.autoNext}
      session={session}
      onExit={onExit}
    >
      {({ disabled }) => (
        <RelativeColorCanvas
          question={session.question}
          showAnswer={session.showAnswer}
          userAnswer={session.userAnswer}
          onAnswer={session.handleAnswer}
          disabled={disabled}
          hitMargin={settings.sliderHitMargin ?? 12}
          showToleranceBand={settings.showToleranceBand ?? true}
          enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
        />
      )}
    </TrainingShell>
  );
}
~~~~~

#### Acts 3: 重构 3 个 Dashboard

~~~~~act
write_file
src/views/Dashboard.tsx
~~~~~
~~~~~typescript
import { Crosshair, RotateCw, Target } from 'lucide-preact';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { ModeCard } from '../components/dashboard/ModeCard';
import { useTodayStats } from '../hooks/useTodayStats';
import type { TrainingMode } from '../types';
import type { UserProfileData } from '../utils/db';

const MODES_CONFIG: Array<{
  id: TrainingMode;
  title: string;
  desc: string;
  icon: typeof Target;
}> = [
  {
    id: 'single',
    title: '单锚点模式',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
    icon: Target,
  },
  {
    id: 'double_h',
    title: '水平双锚点',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
    icon: Crosshair,
  },
  {
    id: 'double_r',
    title: '旋转双锚点',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
    icon: RotateCw,
  },
];

interface DashboardProps {
  profiles: Record<TrainingMode, UserProfileData | null>;
  onStart: (mode: TrainingMode, type: 'training' | 'benchmark') => void;
  onRefreshProfiles: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: (mode?: TrainingMode) => void;
  onBackToHome?: () => void;
}

export function Dashboard({
  profiles,
  onStart,
  onOpenSettings,
  onOpenAnalytics,
  onBackToHome,
}: DashboardProps) {
  const todayStats = useTodayStats('star');

  return (
    <DashboardShell
      title="寻星练习"
      subTitle="Star-Hopping"
      onBackToHome={onBackToHome}
      onOpenSettings={onOpenSettings}
      onOpenAnalytics={() => onOpenAnalytics()}
    >
      {MODES_CONFIG.map((config) => {
        const profile = profiles[config.id];
        const totalCards = profile?.totalTrainedCards || 0;
        const accuracy =
          totalCards > 0 && profile ? Math.round((profile.totalHits / totalCards) * 100) : 0;
        const currentLevel = profile?.currentLevel || 5;
        const stat = todayStats[config.id] || { count: 0, timeMs: 0 };

        return (
          <ModeCard
            key={config.id}
            title={config.title}
            desc={config.desc}
            icon={config.icon}
            todayCount={stat.count}
            todayTimeMs={stat.timeMs}
            currentLevel={currentLevel}
            accuracy={accuracy}
            onStartTraining={() => onStart(config.id, 'training')}
            onStartBenchmark={() => onStart(config.id, 'benchmark')}
          />
        );
      })}
    </DashboardShell>
  );
}
~~~~~

~~~~~act
write_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript
import { Droplet, Palette, RotateCw, Sun } from 'lucide-preact';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { ModeCard } from '../components/dashboard/ModeCard';
import { useTodayStats } from '../hooks/useTodayStats';
import type { ColorMode } from '../utils/colorUtils';
import type { ColorProfileData } from '../utils/db';

interface ColorDashboardProps {
  profiles: Record<ColorMode, ColorProfileData | null>;
  onStart: (mode: ColorMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: () => void;
}

const COLOR_MODES_CONFIG: Array<{
  id: ColorMode;
  title: string;
  desc: string;
  icon: typeof RotateCw;
}> = [
  {
    id: 'H',
    title: '色相 (Hue)',
    desc: '识别颜色在色相环上的具体角度 (0°~360°)',
    icon: RotateCw,
  },
  {
    id: 'V',
    title: '明度 (Value)',
    desc: '已知色相，评估颜色的素描明暗程度 (0%~100%)',
    icon: Sun,
  },
  {
    id: 'S',
    title: '饱和度 (Sat)',
    desc: '已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)',
    icon: Droplet,
  },
  {
    id: 'ALL',
    title: '综合拾色 (Match)',
    desc: '同时调整色相、饱和度与明度，逼近真理色彩',
    icon: Palette,
  },
];

export function ColorDashboard({
  profiles,
  onStart,
  onBackToHome,
  onOpenSettings,
  onOpenAnalytics,
}: ColorDashboardProps) {
  const todayStats = useTodayStats('color');

  return (
    <DashboardShell
      title="色感训练"
      subTitle="Color Recognition"
      onBackToHome={onBackToHome}
      onOpenSettings={onOpenSettings}
      onOpenAnalytics={onOpenAnalytics}
    >
      {COLOR_MODES_CONFIG.map((config) => {
        const profile = profiles[config.id];
        const totalCards = profile?.totalTrainedCards || 0;
        const accuracy =
          totalCards > 0 && profile ? Math.round((profile.totalHits / totalCards) * 100) : 0;
        const currentLevel = profile?.currentLevel || 5;
        const stat = todayStats[config.id] || { count: 0, timeMs: 0 };

        return (
          <ModeCard
            key={config.id}
            title={config.title}
            desc={config.desc}
            icon={config.icon}
            todayCount={stat.count}
            todayTimeMs={stat.timeMs}
            currentLevel={currentLevel}
            accuracy={accuracy}
            onStartTraining={() => onStart(config.id, 'training')}
            onStartBenchmark={() => onStart(config.id, 'benchmark')}
          />
        );
      })}
    </DashboardShell>
  );
}
~~~~~

~~~~~act
write_file
src/views/RelativeColorDashboard.tsx
~~~~~
~~~~~typescript
import { Shuffle } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { ModeCard } from '../components/dashboard/ModeCard';
import { useTodayStats } from '../hooks/useTodayStats';
import { type UnifiedProfileData, getProfilesByDomain } from '../utils/db';
import type { RelativeColorMode } from '../utils/relativeColorUtils';

interface RelativeColorDashboardProps {
  onStart: (mode: RelativeColorMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
}

export function RelativeColorDashboard({
  onStart,
  onBackToHome,
  onOpenSettings,
}: RelativeColorDashboardProps) {
  const [profiles, setProfiles] = useState<Record<string, UnifiedProfileData | null>>({});
  const todayStats = useTodayStats('relative_color');

  useEffect(() => {
    let isMounted = true;
    getProfilesByDomain('relative_color').then((pList) => {
      if (!isMounted) return;
      const pMap: Record<string, UnifiedProfileData> = {};
      for (const p of pList) {
        pMap[p.mode] = p;
      }
      setProfiles(pMap);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const profile = profiles.VECTOR_SHIFT;
  const totalCards = profile?.totalTrainedCards || 0;
  const accuracy =
    totalCards > 0 && profile ? Math.round((profile.totalHits / totalCards) * 100) : 0;
  const currentLevel = profile?.currentLevel || 5;
  const stat = todayStats.VECTOR_SHIFT || { count: 0, timeMs: 0 };

  return (
    <DashboardShell
      title="相对色感"
      subTitle="Relative Color"
      onBackToHome={onBackToHome}
      onOpenSettings={onOpenSettings}
    >
      <ModeCard
        title="色彩矢量迁移"
        desc="保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉。"
        icon={Shuffle}
        todayCount={stat.count}
        todayTimeMs={stat.timeMs}
        currentLevel={currentLevel}
        accuracy={accuracy}
        onStartTraining={() => onStart('VECTOR_SHIFT', 'training')}
        onStartBenchmark={() => onStart('VECTOR_SHIFT', 'benchmark')}
      />
    </DashboardShell>
  );
}
~~~~~

### 下一步建议
- **执行自动化测试**: 运行 `npm test` 确认所有单元测试正常。
- **验证页面交互**: 启动开发服务器，检查 3 个训练视图与看板渲染是否一致且响应流畅。
- **准备提交**: 若验证无误，可继续生成 Git Commit。
