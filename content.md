经检查，上层消费方（如 `App.tsx`、`PlanTrainingView.tsx`、`Home.tsx`、`GlobalStatsModal.tsx` 及计划编辑器组件）中仍然存在对 `src/config/cards` 和 `src/config/domains` 的直接静态依赖。

我们将立即实施这一步解耦：让整个前端 Shell 和各级页面完全通过统一的 `registry`（来自 `src/core/registry`）获取领域元数据、卡片定义与训练插件，彻底消除残留的静态配置耦合。

## [WIP] refactor: 全面解耦上层视图与静态配置，接入统一 registry

### 用户需求
将 `App.tsx`、`PlanTrainingView`、`Home`、`GlobalStatsModal` 及 `Plan` 相关组件中的遗留静态引用（`DOMAINS_CONFIG`、`ALL_CARDS`、`CARD_PLUGINS`）彻底替换为从 `src/core/registry` 获取，实现整个应用自顶向下的动态自发现与装配。

### 评论
解除顶层消费方与具体静态配置的直接依赖，是完成插件化架构闭环的关键。改造后，新增领域不需要修改任何页面级代码，系统会在运行时通过 `registry` 自动为新领域渲染看板卡片、路由、练习入口及计划选择器。

### 目标
1. 重构 `src/app.tsx`，统一使用 `registry.getCardById`、`registry.getDomainMeta` 和 `registry.getPluginByCardId`。
2. 重构 `src/views/PlanTrainingView.tsx` 和 `src/views/Home.tsx`。
3. 重构 `src/components/GlobalStatsModal.tsx` 与计划编辑器相关子组件（`PlanEditorModal.tsx`、`CardPickerPanel.tsx`、`PlanStageList.tsx`、`PlanHeroCard.tsx`）。
4. 保证类型安全与全链路无缝衔接。

### 基本原理
利用 `registry` 提供的单例查询方法统一屏蔽底层数据结构的构建细节。所有组件依赖抽象的 `registry` 接口而非静态声明常量。

### 标签
#intent/refine #flow/ready #priority/high #comp/cli #comp/runtime #concept/state #concept/executor #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/view-decoupling #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 重构 `src/app.tsx` 接入统一 `registry`

~~~~~act
write_file
src/app.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useState } from 'preact/hooks';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { GlobalStatsModal } from './components/GlobalStatsModal';
import { SettingsModal } from './components/SettingsModal';
import { WeaknessAnalyticsModal } from './components/WeaknessAnalyticsModal';
import { ToastContainer, type ToastMessage, type ToastType } from './components/common/Toast';
import { GenericDashboard } from './components/dashboard/GenericDashboard';
import { PlanEditorModal } from './components/plan/PlanEditorModal';
import { registry } from './core/registry';
import { useHashRoute } from './hooks/useHashRoute';
import type { TrainingPlan } from './types/plan';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  getProfilesByDomain,
  getTrainingTimeMs,
} from './utils/db';
import {
  loadPlanStorageState,
  loadTrainingPlan,
  saveTrainingPlan,
  setActivePlan,
} from './utils/planStorage';
import { type UserSettings, getCardSettings, loadSettings } from './utils/settings';
import { GenericTrainingView } from './views/GenericTrainingView';
import { Home } from './views/Home';
import { PlanTrainingView } from './views/PlanTrainingView';

export function App() {
  const { route, navigate } = useHashRoute();
  const allDomains = registry.getAllDomains();

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [isPlanEditorOpen, setIsPlanEditorOpen] = useState<boolean>(false);
  const [activeSettingsCardId, setActiveSettingsCardId] = useState<string | null>(null);
  const [activeAnalyticsCardId, setActiveAnalyticsCardId] = useState<string | null>(null);

  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan>(loadTrainingPlan);
  const [allPlans, setAllPlans] = useState<TrainingPlan[]>(() => loadPlanStorageState().plans);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState<boolean>(false);

  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>(() => {
    const init: Record<string, number> = {};
    for (const d of allDomains) init[d] = 0;
    return init as Record<TrainingDomain, number>;
  });

  const [currentDomainProfiles, setCurrentDomainProfiles] = useState<
    Record<string, UnifiedProfileData>
  >({});

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshProfiles = useCallback(async () => {
    const domains = registry.getAllDomains();
    const timesEntries = await Promise.all(
      domains.map(async (d) => [d, await getTrainingTimeMs(d)] as const),
    );
    const timesMap = Object.fromEntries(timesEntries) as Record<TrainingDomain, number>;

    const allProfilesList = await Promise.all(domains.map((d) => getProfilesByDomain(d)));
    const pMap: Record<string, UnifiedProfileData> = {};
    for (const list of allProfilesList) {
      for (const p of list) {
        pMap[p.cardId] = p;
      }
    }

    setDomainTimes(timesMap);
    setCurrentDomainProfiles(pMap);
    setSettings(loadSettings());
    const planState = loadPlanStorageState();
    setTrainingPlan(loadTrainingPlan());
    setAllPlans(planState.plans);
    setProfilesLoaded(true);
  }, []);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  useEffect(() => {
    if (route.type === 'home') {
      document.title = 'FormSight - 视觉造型构图与色彩感知训练系统';
    } else if (route.type === 'plan-train') {
      document.title = `${trainingPlan.name || '今日训练流'} - FormSight`;
    } else if (route.type === 'dashboard') {
      const meta = registry.getDomainMeta(route.domain);
      document.title = `${meta?.title || '训练'} (${meta?.subTitle || ''}) - FormSight`;
    } else if (route.type === 'train') {
      const card = registry.getCardById(route.cardId);
      document.title = `${card?.title || '训练'} - FormSight`;
    }
  }, [route, trainingPlan.name]);

  const handleSelectPlanOnHome = useCallback(
    (planId: string) => {
      const target = setActivePlan(planId);
      if (target) {
        setTrainingPlan(target);
        showToast(`已切换至【${target.name}】`, 'info');
      }
    },
    [showToast],
  );

  const totalTimeMs = Object.values(domainTimes).reduce((acc, t) => acc + t, 0);

  const activeSettingsCard = activeSettingsCardId ? registry.getCardById(activeSettingsCardId) : null;
  const activeAnalyticsCard = activeAnalyticsCardId ? registry.getCardById(activeAnalyticsCardId) : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {route.type === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          domainTimes={domainTimes}
          trainingPlan={trainingPlan}
          allPlans={allPlans}
          onNavigateDomain={(domain) => navigate({ type: 'dashboard', domain })}
          onStartPlan={() => navigate({ type: 'plan-train' })}
          onOpenPlanEditor={() => setIsPlanEditorOpen(true)}
          onSelectPlan={handleSelectPlanOnHome}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}

      {route.type === 'plan-train' && (
        <PlanTrainingView
          plan={trainingPlan}
          settings={settings}
          onExit={async () => {
            await refreshProfiles();
            navigate({ type: 'home' });
          }}
        />
      )}

      {route.type === 'dashboard' && (() => {
        const meta = registry.getDomainMeta(route.domain);
        if (!meta) {
          navigate({ type: 'home' });
          return null;
        }
        return (
          <GenericDashboard
            meta={meta}
            onStart={(cardId, sessionType) => navigate({ type: 'train', cardId, sessionType })}
            onBackToHome={() => navigate({ type: 'home' })}
            onOpenCardSettings={(cardId) => setActiveSettingsCardId(cardId)}
            onOpenCardAnalytics={(cardId) => setActiveAnalyticsCardId(cardId)}
          />
        );
      })()}

      {route.type === 'train' &&
        (() => {
          if (!profilesLoaded) {
            return (
              <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold">
                正在同步能力层阶与训练数据...
              </div>
            );
          }
          const activeCard = registry.getCardById(route.cardId);
          if (!activeCard) {
            navigate({ type: 'home' });
            return null;
          }
          const plugin = registry.getPluginByCardId(activeCard.id);
          if (!plugin) {
            navigate({ type: 'home' });
            return null;
          }
          const activeLevel = currentDomainProfiles[activeCard.id]?.currentLevel || 5;

          return (
            <GenericTrainingView
              key={`${activeCard.id}-${route.sessionType}`}
              card={activeCard}
              plugin={plugin}
              sessionType={route.sessionType}
              initialLevel={activeLevel}
              settings={getCardSettings(settings, activeCard.id)}
              globalSettings={settings.global}
              onExit={async () => {
                await refreshProfiles();
                navigate({ type: 'dashboard', domain: activeCard.domain });
              }}
            />
          );
        })()}

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
          showToast={showToast}
        />
      )}

      {isGlobalStatsOpen && <GlobalStatsModal onClose={() => setIsGlobalStatsOpen(false)} />}

      {activeSettingsCard && (
        <SettingsModal
          card={activeSettingsCard}
          settings={settings}
          onClose={() => setActiveSettingsCardId(null)}
          onSave={(newSettings) => setSettings(newSettings)}
        />
      )}

      {activeAnalyticsCard && (
        <WeaknessAnalyticsModal
          card={activeAnalyticsCard}
          onClose={() => setActiveAnalyticsCardId(null)}
        />
      )}

      {isPlanEditorOpen && (
        <PlanEditorModal
          initialPlan={trainingPlan}
          onClose={() => setIsPlanEditorOpen(false)}
          onPlanListChanged={refreshProfiles}
          onSave={(newPlan) => {
            saveTrainingPlan(newPlan);
            setTrainingPlan(newPlan);
            refreshProfiles();
            showToast('训练计划已成功更新', 'success');
          }}
        />
      )}
    </div>
  );
}
~~~~~

#### Acts 2: 重构 `src/views/PlanTrainingView.tsx` 与 `src/views/Home.tsx`

~~~~~act
write_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, FastForward } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/SessionSummaryModal';
import { type PlanStageResult, PlanSummaryModal } from '../components/plan/PlanSummaryModal';
import { registry } from '../core/registry';
import type { TrainingPlan } from '../types/plan';
import { getProfile } from '../utils/db';
import { type UserSettings, getCardSettings } from '../utils/settings';
import { GenericTrainingView } from './GenericTrainingView';

interface PlanTrainingViewProps {
  plan: TrainingPlan;
  settings: UserSettings;
  onExit: () => void;
}

export function PlanTrainingView({ plan, settings, onExit }: PlanTrainingViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [stageResults, setStageResults] = useState<PlanStageResult[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState<number>(0);
  const [stageInitialLevel, setStageInitialLevel] = useState<number>(5);
  const [isLevelLoaded, setIsLevelLoaded] = useState<boolean>(false);
  const [planSessionKey, setPlanSessionKey] = useState<number>(0);

  const validItems = (plan.items || []).filter((item) => Boolean(registry.getCardById(item.cardId)));

  const currentStep = validItems[currentStepIndex];
  const currentCard = currentStep ? registry.getCardById(currentStep.cardId) : null;

  useEffect(() => {
    let isMounted = true;
    const stepIdx = currentStepIndex;
    const sessionKey = planSessionKey;

    if (currentCard) {
      setIsLevelLoaded(false);
      getProfile(currentCard.id)
        .then((p) => {
          if (!isMounted) return;
          setStageInitialLevel(p?.currentLevel || 5);
          setIsLevelLoaded(true);
        })
        .catch((err) => {
          console.error(
            `Failed to load profile for card ${currentCard.id} at step ${stepIdx} (session ${sessionKey}):`,
            err,
          );
          if (!isMounted) return;
          setStageInitialLevel(5);
          setIsLevelLoaded(true);
        });
    } else {
      setIsLevelLoaded(true);
    }
    return () => {
      isMounted = false;
    };
  }, [currentCard, currentStepIndex, planSessionKey]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!showSummaryModal) {
        setTotalElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime, showSummaryModal]);

  const handleStageReached = useCallback(
    (history: SessionHistoryItem[]) => {
      if (!currentCard) return;

      const stageRes: PlanStageResult = {
        card: currentCard,
        targetTrials: currentStep.targetTrials,
        history,
      };

      const nextResults = [...stageResults, stageRes];
      setStageResults(nextResults);

      if (currentStepIndex + 1 < validItems.length) {
        setIsLevelLoaded(false);
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        setShowSummaryModal(true);
      }
    },
    [currentCard, currentStep, currentStepIndex, stageResults, validItems.length],
  );

  const handleSkipCurrentStage = useCallback(() => {
    if (!currentCard) return;
    const skippedRes: PlanStageResult = {
      card: currentCard,
      targetTrials: currentStep.targetTrials,
      history: [],
    };
    const nextResults = [...stageResults, skippedRes];
    setStageResults(nextResults);

    if (currentStepIndex + 1 < validItems.length) {
      setIsLevelLoaded(false);
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setShowSummaryModal(true);
    }
  }, [currentCard, currentStep, currentStepIndex, stageResults, validItems.length]);

  const handleRequestExit = useCallback(() => {
    if (stageResults.length > 0) {
      setShowSummaryModal(true);
    } else {
      onExit();
    }
  }, [stageResults.length, onExit]);

  const handleRestartPlan = useCallback(() => {
    setIsLevelLoaded(false);
    setShowSummaryModal(false);
    setCurrentStepIndex(0);
    setStageResults([]);
    setTotalElapsedSeconds(0);
    setSessionStartTime(Date.now());
    setPlanSessionKey((prev) => prev + 1);
  }, []);

  if (!currentCard || validItems.length === 0) {
    onExit();
    return null;
  }

  const plugin = registry.getPluginByCardId(currentCard.id);
  if (!plugin) {
    onExit();
    return null;
  }
  const cardConfig = getCardSettings(settings, currentCard.id);

  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto mb-4 bg-white border border-slate-200/80 px-4 sm:px-5 py-3 rounded-2xl shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestExit}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
            title="结束并查看训练流总结"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练流
          </button>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-xl">
              阶段 {currentStepIndex + 1} / {validItems.length}
            </span>
            <span className="text-xs font-bold text-slate-800 tracking-tight">{plan.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-xs text-slate-400 font-mono font-semibold hidden sm:block">
            本阶段目标: <strong className="text-slate-700">{currentStep.targetTrials}</strong> 题
          </div>
          <button
            type="button"
            onClick={handleSkipCurrentStage}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
            title="跳过当前阶段进入下一阶段"
          >
            <FastForward className="w-3.5 h-3.5 text-indigo-500" />
            跳过此阶段
          </button>
        </div>
      </div>

      {!isLevelLoaded ? (
        <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          正在加载【{currentCard.title}】的生涯能力层阶...
        </div>
      ) : (
        <GenericTrainingView
          key={`plan-stage-${planSessionKey}-${currentStepIndex}-${currentCard.id}`}
          card={currentCard}
          plugin={plugin}
          sessionType="training"
          initialLevel={stageInitialLevel}
          settings={cardConfig}
          globalSettings={settings.global}
          targetLimitTrials={currentStep.targetTrials}
          onTargetLimitReached={handleStageReached}
          showExitButton={false}
          onExit={handleRequestExit}
        />
      )}

      {showSummaryModal && (
        <PlanSummaryModal
          planName={plan.name}
          stageResults={stageResults}
          totalElapsedSeconds={totalElapsedSeconds}
          onClose={onExit}
          onRestart={handleRestartPlan}
        />
      )}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/views/Home.tsx
~~~~~
~~~~~typescript
import { ArrowRight, BarChart2, Clock, Sliders, Sparkles } from 'lucide-preact';
import { PlanHeroCard } from '../components/plan/PlanHeroCard';
import { registry } from '../core/registry';
import type { TrainingPlan } from '../types/plan';
import { type TrainingDomain, formatTotalTime } from '../utils/db';

interface HomeProps {
  totalTimeMs: number;
  domainTimes: Record<TrainingDomain, number>;
  trainingPlan: TrainingPlan;
  allPlans?: TrainingPlan[];
  onNavigateDomain: (domain: TrainingDomain) => void;
  onStartPlan: () => void;
  onOpenPlanEditor: () => void;
  onSelectPlan?: (planId: string) => void;
  onOpenGlobalSettings: () => void;
  onOpenGlobalStats: () => void;
}

export function Home({
  totalTimeMs,
  domainTimes,
  trainingPlan,
  allPlans = [],
  onNavigateDomain,
  onStartPlan,
  onOpenPlanEditor,
  onSelectPlan,
  onOpenGlobalSettings,
  onOpenGlobalStats,
}: HomeProps) {
  const domains = registry.getAllDomainMetas();

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8">
      {/* 品牌 Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-8 py-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-200">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              FormSight{' '}
              <span className="text-xs font-extrabold px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                v{__APP_VERSION__}
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">视觉造型构图与色彩感知强化训练系统</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>{formatTotalTime(totalTimeMs)}</span>
          </div>
          <button
            type="button"
            onClick={onOpenGlobalStats}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            title="全局统计"
          >
            <BarChart2 className="w-4 h-4 text-indigo-500" />
            统计
          </button>
          <button
            type="button"
            onClick={onOpenGlobalSettings}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5"
            title="全局设置"
          >
            <Sliders className="w-4 h-4" />
            全局设置
          </button>
        </div>
      </div>

      {/* 计划 Hero 区域 */}
      <PlanHeroCard
        plan={trainingPlan}
        allPlans={allPlans}
        onStartPlan={onStartPlan}
        onOpenEditor={onOpenPlanEditor}
        onSelectPlan={onSelectPlan}
      />

      {/* 模块选择区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {domains.map((meta) => {
          const Icon = meta.icon;
          const timeMs = domainTimes[meta.domain] || 0;

          return (
            <button
              key={meta.domain}
              type="button"
              onClick={() => onNavigateDomain(meta.domain)}
              className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    <Icon className="w-8 h-8" />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{meta.homeTitle}</h2>
                  <p className="text-xs text-slate-500 leading-relaxed">{meta.homeDesc}</p>
                </div>
              </div>

              <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform border-t border-slate-100 mt-4">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>累计练习: {formatTotalTime(timeMs)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>进入练习看板</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
~~~~~

#### Acts 3: 重构 `src/components/GlobalStatsModal.tsx`

~~~~~act
write_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
import {
  Activity,
  BarChart2,
  Calendar,
  ChevronDown,
  Filter,
  Target,
  TrendingUp,
  X,
} from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { registry } from '../core/registry';
import { renderTrendChartCanvas } from '../utils/canvas/drawTrendChart';
import { type TrainingDomain, getTrialRecords } from '../utils/db';

interface GlobalStatsModalProps {
  onClose: () => void;
}

interface UnifiedRecord {
  timestamp: number;
  isHit: boolean;
  level: number;
  module: TrainingDomain;
  subMode: string;
}

export function GlobalStatsModal({ onClose }: GlobalStatsModalProps) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<UnifiedRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      const domains = registry.getAllDomains();
      const results = await Promise.all(
        domains.map(async (domain) => {
          const domainRecords = await getTrialRecords(domain);
          return domainRecords.map((r) => ({
            timestamp: r.timestamp,
            isHit: r.isHit,
            level: r.difficultyLevel,
            module: domain,
            subMode: r.mode,
          }));
        }),
      );

      const combined = results.flat().sort((a, b) => a.timestamp - b.timestamp);

      if (isMounted) {
        setRecords(combined);
        setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredRecords = records.filter((r) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter.endsWith('_all')) {
      const targetDomain = selectedFilter.replace('_all', '');
      return r.module === targetDomain;
    }
    const [domain, mode] = selectedFilter.split(':');
    return r.module === domain && r.subMode === mode;
  });

  const getCurrentFilterLabel = () => {
    if (selectedFilter === 'all') return '全部练习项目';
    if (selectedFilter.endsWith('_all')) {
      const d = selectedFilter.replace('_all', '') as TrainingDomain;
      const meta = registry.getDomainMeta(d);
      return `${meta?.title || d} (全部)`;
    }
    const [domain, mode] = selectedFilter.split(':') as [TrainingDomain, string];
    const meta = registry.getDomainMeta(domain);
    const card = meta?.cards.find((c) => c.mode === mode);
    return `${meta?.title || domain} • ${card?.title || mode}`;
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

  const stats = {
    today: { total: 0, hits: 0 },
    week: { total: 0, hits: 0 },
    year: { total: 0, hits: 0 },
    allTime: { total: filteredRecords.length, hits: filteredRecords.filter((r) => r.isHit).length },
  };

  const dailyData: Record<string, { total: number; maxLevel: number }> = {};

  for (const r of filteredRecords) {
    if (r.timestamp >= startOfToday) {
      stats.today.total++;
      if (r.isHit) stats.today.hits++;
    }
    if (r.timestamp >= startOfWeek) {
      stats.week.total++;
      if (r.isHit) stats.week.hits++;
    }
    if (r.timestamp >= startOfYear) {
      stats.year.total++;
      if (r.isHit) stats.year.hits++;
    }

    const dateStr = new Date(r.timestamp).toISOString().slice(0, 10);
    if (!dailyData[dateStr]) {
      dailyData[dateStr] = { total: 0, maxLevel: r.level };
    }
    dailyData[dateStr].total++;
    dailyData[dateStr].maxLevel = Math.max(dailyData[dateStr].maxLevel, r.level);
  }

  const calcAcc = (hits: number, total: number) =>
    total === 0 ? 0 : Math.round((hits / total) * 100);

  const heatmapDays = 84;
  const heatmapData = Array.from({ length: heatmapDays }).map((_, i) => {
    const d = new Date(startOfToday - (heatmapDays - 1 - i) * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    return {
      date: dateStr,
      count: dailyData[dateStr]?.total || 0,
    };
  });

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-slate-100';
    if (count < 10) return 'bg-indigo-200';
    if (count < 25) return 'bg-indigo-400';
    if (count < 50) return 'bg-indigo-600';
    return 'bg-indigo-800';
  };

  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (canvas) {
      renderTrendChartCanvas(canvas, dailyData);
    }
  }, [loading]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Escape' || e.key === 'Enter')) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <BarChart2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">全局数据统计</h2>
              <p className="text-xs text-slate-400">洞察你的训练足迹与能力成长</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Filter className="w-3.5 h-3.5 text-indigo-500 absolute left-3 pointer-events-none" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter((e.target as HTMLSelectElement).value)}
                className="pl-8 pr-8 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer transition-all shadow-sm"
              >
                <option value="all">全部练习项目</option>
                {registry.getAllDomainMetas().map((meta) => (
                  <optgroup key={meta.domain} label={meta.title}>
                    <option value={`${meta.domain}_all`}>{meta.title} (全部)</option>
                    {meta.cards.map((card) => (
                      <option
                        key={`${meta.domain}:${card.mode}`}
                        value={`${meta.domain}:${card.mode}`}
                      >
                        {card.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            正在统计海量数据...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <Activity className="w-10 h-10 text-slate-300" />【{getCurrentFilterLabel()}
            】下暂无训练数据，先去练习几道题吧！
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  今日刷题
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.today.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-indigo-600 font-semibold mt-1">
                  正确率 {calcAcc(stats.today.hits, stats.today.total)}%
                </div>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Target className="w-3.5 h-3.5 text-emerald-500" />
                  最近 7 天
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.week.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">
                  正确率 {calcAcc(stats.week.hits, stats.week.total)}%
                </div>
              </div>

              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                  本年累计
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.year.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-amber-600 font-semibold mt-1">
                  正确率 {calcAcc(stats.year.hits, stats.year.total)}%
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                  生涯总计
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.allTime.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-1">
                  打卡 {Object.keys(dailyData).length} 天
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-100 shadow-sm p-5 rounded-2xl flex flex-col gap-4">
                <div className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>近 12 周训练热力图</span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-normal">
                    少 <div className="w-2.5 h-2.5 rounded-sm bg-slate-100" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-200" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-400" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-800" /> 多
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-1.5 self-center">
                  {heatmapData.map((day) => (
                    <div
                      key={day.date}
                      title={`${day.date} : 训练了 ${day.count} 题`}
                      className={`w-3.5 h-3.5 rounded-[3px] transition-transform hover:scale-125 cursor-help ${getHeatmapColor(
                        day.count,
                      )}`}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-100 shadow-sm p-5 rounded-2xl flex flex-col gap-2">
                <div className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>能力峰值演进轨迹</span>
                  <span className="text-[10px] font-normal text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                    每日最高 Level
                  </span>
                </div>
                <canvas ref={canvasRef} width={340} height={150} className="w-full mt-2" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~

#### Acts 4: 重构计划编排相关组件接入统一 `registry`

重构 `PlanEditorModal.tsx`、`CardPickerPanel.tsx`、`PlanStageList.tsx` 与 `PlanHeroCard.tsx`。

~~~~~act
write_file
src/components/plan/PlanEditorModal.tsx
~~~~~
~~~~~typescript
import { Check, Copy, Download, Edit3, Layers, Sliders, Sparkles, Upload } from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { registry } from '../../core/registry';
import type { PlanItem, PlanStorageState, TrainingPlan } from '../../types/plan';
import {
  clonePlan,
  deletePlan,
  exportPlanToJson,
  importPlanFromJson,
  loadPlanStorageState,
  savePlanStorageState,
  togglePlanFavorite,
} from '../../utils/planStorage';
import { ModalShell } from '../common/ModalShell';
import { CardPickerPanel } from './editor/CardPickerPanel';
import { PlanLibraryDrawer } from './editor/PlanLibraryDrawer';
import { PlanStageList } from './editor/PlanStageList';

interface PlanEditorModalProps {
  initialPlan: TrainingPlan;
  onClose: () => void;
  onSave: (newPlan: TrainingPlan) => void;
  onPlanListChanged?: () => void;
}

const TRIAL_PRESETS = [10, 15, 20, 30, 50];

export function PlanEditorModal({
  initialPlan,
  onClose,
  onSave,
  onPlanListChanged,
}: PlanEditorModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [storageState, setStorageState] = useState<PlanStorageState>(loadPlanStorageState);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan>({ ...initialPlan });
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('all');
  const [isAddingCard, setIsAddingCard] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [planNameInput, setPlanNameInput] = useState<string>(initialPlan.name);
  const [showPlanManager, setShowPlanManager] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const isNewPlan = !storageState.plans.some((p) => p.id === currentPlan.id);

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 2500);
  };

  const handleSelectPlanFromList = (p: TrainingPlan) => {
    setCurrentPlan({ ...p });
    setPlanNameInput(p.name);
    setIsEditingName(false);
  };

  const handleNameSave = () => {
    const trimmed = planNameInput.trim();
    if (!trimmed) {
      setPlanNameInput(currentPlan.name);
    } else {
      setCurrentPlan((prev) => ({ ...prev, name: trimmed }));
    }
    setIsEditingName(false);
  };

  const handleBatchUpdateTrials = (trials: number) => {
    setCurrentPlan((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({ ...item, targetTrials: trials })),
    }));
    showToast(`已将所有阶段题量统一设为 ${trials} 题`);
  };

  const handleAddItem = (cardId: string) => {
    const newItem: PlanItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      cardId,
      targetTrials: 20,
    };
    setCurrentPlan((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    setIsAddingCard(false);
  };

  const handleRemoveItem = (id: string) => {
    setCurrentPlan((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentPlan.items.length) return;

    const newItems = [...currentPlan.items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    setCurrentPlan((prev) => ({ ...prev, items: newItems }));
  };

  const handleUpdateTrials = (id: string, trials: number) => {
    setCurrentPlan((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, targetTrials: Math.max(5, trials) } : item,
      ),
    }));
  };

  const handleClearAll = () => {
    setCurrentPlan((prev) => ({ ...prev, items: [] }));
  };

  const handleCreateNewBlankPlan = () => {
    const newBlank: TrainingPlan = {
      id: `custom_plan_${Date.now()}`,
      name: '新建训练流',
      description: '自定义多阶段训练流',
      items: [],
      isFavorite: true,
      isBuiltin: false,
      updatedAt: Date.now(),
    };
    setCurrentPlan(newBlank);
    setPlanNameInput(newBlank.name);
    setIsEditingName(true);
    setIsAddingCard(true);
    setShowPlanManager(false);
    showToast('已进入新计划创建模式');
  };

  const handleCloneCurrent = () => {
    const cloned = clonePlan(currentPlan);
    const nextState = loadPlanStorageState();
    setStorageState(nextState);
    setCurrentPlan(cloned);
    setPlanNameInput(cloned.name);
    onPlanListChanged?.();
    showToast(`已复制为新计划【${cloned.name}】`);
  };

  const handleToggleFavoriteItem = (planId: string, e: MouseEvent) => {
    e.stopPropagation();
    const nextState = togglePlanFavorite(planId);
    setStorageState(nextState);
    if (currentPlan.id === planId) {
      setCurrentPlan((prev) => ({ ...prev, isFavorite: !(prev.isFavorite ?? true) }));
    }
    onPlanListChanged?.();
  };

  const handleDeletePlanItem = (planId: string, e: MouseEvent) => {
    e.stopPropagation();
    if (storageState.plans.length <= 1) {
      showToast('至少需保留一个训练计划');
      return;
    }
    const nextState = deletePlan(planId);
    setStorageState(nextState);
    if (currentPlan.id === planId) {
      const fallback = nextState.plans[0];
      setCurrentPlan(fallback);
      setPlanNameInput(fallback.name);
    }
    onPlanListChanged?.();
    showToast('计划已删除');
  };

  const handleExportPlan = () => {
    const jsonStr = exportPlanToJson(currentPlan);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formsight_plan_${currentPlan.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('计划配置已导出为 JSON 文件');
  };

  const handleImportPlan = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      const file = target.files[0];
      file.text().then((text) => {
        const imported = importPlanFromJson(text);
        if (imported) {
          const nextState = loadPlanStorageState();
          setStorageState(nextState);
          setCurrentPlan(imported);
          setPlanNameInput(imported.name);
          setShowPlanManager(false);
          onPlanListChanged?.();
          showToast(`成功导入计划【${imported.name}】`);
        } else {
          showToast('导入失败：无效的训练计划文件');
        }
      });
    }
  };

  const handleSave = () => {
    const sanitizedPlan: TrainingPlan = {
      ...currentPlan,
      name: planNameInput.trim() || currentPlan.name,
      items: currentPlan.items.filter((item) => Boolean(registry.getCardById(item.cardId))),
      updatedAt: Date.now(),
    };

    const updatedPlans = storageState.plans.some((p) => p.id === sanitizedPlan.id)
      ? storageState.plans.map((p) => (p.id === sanitizedPlan.id ? sanitizedPlan : p))
      : [sanitizedPlan, ...storageState.plans];

    savePlanStorageState({
      activePlanId: sanitizedPlan.id,
      plans: updatedPlans,
    });

    onSave(sanitizedPlan);
    onPlanListChanged?.();
    onClose();
  };

  const validPlanItems = currentPlan.items.filter((item) => Boolean(registry.getCardById(item.cardId)));
  const totalTrials = validPlanItems.reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  const availableCards = registry.getAllCards().filter((card) => {
    if (selectedDomainFilter === 'all') return true;
    return card.domain === selectedDomainFilter;
  });

  return (
    <ModalShell title="定制日常训练流" icon={Sliders} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-5">
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-1.5 w-full max-w-sm">
                  <input
                    type="text"
                    value={planNameInput}
                    onInput={(e) => setPlanNameInput((e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNameSave();
                      if (e.key === 'Escape') {
                        setPlanNameInput(currentPlan.name);
                        setIsEditingName(false);
                      }
                    }}
                    maxLength={32}
                    className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 bg-white border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="输入计划名称..."
                  />
                  <button
                    type="button"
                    onClick={handleNameSave}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex-shrink-0"
                    title="确定"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <h3 className="text-sm font-black text-slate-800 truncate tracking-tight">
                    {currentPlan.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0"
                    title="重命名计划"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {isNewPlan ? (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 flex-shrink-0 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      新计划
                    </span>
                  ) : currentPlan.isBuiltin ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100 flex-shrink-0">
                      官方预设
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowPlanManager(!showPlanManager)}
                className={`px-2.5 py-1.5 text-[11px] font-bold rounded-xl border transition-all flex items-center gap-1 ${
                  showPlanManager
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="切换/管理所有计划"
              >
                <Layers className="w-3.5 h-3.5" />
                计划库 ({storageState.plans.length})
              </button>

              <button
                type="button"
                onClick={handleCloneCurrent}
                className="p-1.5 text-slate-500 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                title="复制为新副本"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleExportPlan}
                className="p-1.5 text-slate-500 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                title="导出计划为 JSON"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-slate-500 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                title="导入 JSON 计划"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportPlan}
                className="hidden"
              />
            </div>
          </div>

          {toastNotice && (
            <div className="text-[11px] font-bold text-indigo-600 bg-indigo-50/80 px-2.5 py-1 rounded-lg animate-in fade-in">
              {toastNotice}
            </div>
          )}
        </div>

        {showPlanManager && (
          <PlanLibraryDrawer
            storageState={storageState}
            currentPlan={currentPlan}
            onSelectPlan={handleSelectPlanFromList}
            onCreateNewBlankPlan={handleCreateNewBlankPlan}
            onClose={() => setShowPlanManager(false)}
            onToggleFavorite={handleToggleFavoriteItem}
            onDeletePlan={handleDeletePlanItem}
          />
        )}

        <PlanStageList
          currentPlan={currentPlan}
          totalTrials={totalTrials}
          estimatedMin={estimatedMin}
          trialPresets={TRIAL_PRESETS}
          onBatchUpdateTrials={handleBatchUpdateTrials}
          onClearAll={handleClearAll}
          onUpdateTrials={handleUpdateTrials}
          onMoveItem={handleMoveItem}
          onRemoveItem={handleRemoveItem}
        />

        <CardPickerPanel
          isAddingCard={isAddingCard}
          selectedDomainFilter={selectedDomainFilter}
          availableCards={availableCards}
          onToggleAdding={setIsAddingCard}
          onSelectDomainFilter={setSelectedDomainFilter}
          onAddItem={handleAddItem}
        />

        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={currentPlan.items.length === 0}
            className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all ${
              currentPlan.items.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 active:scale-[0.98]'
            }`}
          >
            {isNewPlan ? '保存为新计划并使用' : '保存修改并使用此计划'}{' '}
            {currentPlan.items.length === 0 && '(至少包含1个阶段)'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
~~~~~

~~~~~act
write_file
src/components/plan/editor/CardPickerPanel.tsx
~~~~~
~~~~~typescript
import { Plus } from 'lucide-preact';
import { registry } from '../../../core/registry';
import type { CardDefinition } from '../../../types/card';

interface CardPickerPanelProps {
  isAddingCard: boolean;
  selectedDomainFilter: string;
  availableCards: CardDefinition[];
  onToggleAdding: (val: boolean) => void;
  onSelectDomainFilter: (domain: string) => void;
  onAddItem: (cardId: string) => void;
}

export function CardPickerPanel({
  isAddingCard,
  selectedDomainFilter,
  availableCards,
  onToggleAdding,
  onSelectDomainFilter,
  onAddItem,
}: CardPickerPanelProps) {
  if (!isAddingCard) {
    return (
      <button
        type="button"
        onClick={() => onToggleAdding(true)}
        className="w-full py-3 bg-slate-50 hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-300 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.99]"
      >
        <Plus className="w-4 h-4" />
        添加训练阶段
      </button>
    );
  }

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">挑选需要添加的训练模块：</span>
        <button
          type="button"
          onClick={() => onToggleAdding(false)}
          className="text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          收起
        </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => onSelectDomainFilter('all')}
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
            selectedDomainFilter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          全部
        </button>
        {registry.getAllDomainMetas().map((d) => (
          <button
            type="button"
            key={d.domain}
            onClick={() => onSelectDomainFilter(d.domain)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${
              selectedDomainFilter === d.domain
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {d.title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
        {availableCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              type="button"
              key={card.id}
              onClick={() => onAddItem(card.id)}
              className="p-2.5 bg-white hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-300 rounded-xl text-left transition-all flex items-center gap-2 group active:scale-95"
            >
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform flex-shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-800 line-clamp-1">{card.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/plan/editor/PlanStageList.tsx
~~~~~
~~~~~typescript
import { ArrowDown, ArrowUp, RotateCcw, Trash2, Zap } from 'lucide-preact';
import { registry } from '../../../core/registry';
import type { TrainingPlan } from '../../../types/plan';

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
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
          <span>已编排阶段序列 ({currentPlan.items.length})</span>
          <span className="text-slate-400 font-normal">
            • 合计 {totalTrials} 题 · 约 {estimatedMin} 分钟
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentPlan.items.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400">批量题量:</span>
              {trialPresets.map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => onBatchUpdateTrials(num)}
                  className="px-1.5 py-0.5 text-[10px] font-bold hover:text-indigo-600 rounded hover:bg-white transition-colors"
                >
                  {num}题
                </button>
              ))}
            </div>
          )}

          {currentPlan.items.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              清空阶段
            </button>
          )}
        </div>
      </div>

      {currentPlan.items.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50/50">
          <Zap className="w-6 h-6 text-slate-300" />
          <span>当前计划为空，请点击下方「添加训练阶段」挑选训练模块</span>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {currentPlan.items.map((item, idx) => {
            const card = registry.getCardById(item.cardId);
            if (!card) return null;
            const Icon = card.icon;

            return (
              <div
                key={item.id}
                className="p-3 bg-white border border-slate-200/90 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 text-white font-mono text-[11px] font-black flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{card.title}</div>
                    <div className="text-[10px] text-slate-400">{card.desc.slice(0, 26)}...</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl">
                    {trialPresets.map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => onUpdateTrials(item.id, preset)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                          item.targetTrials === preset
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMoveItem(idx, 'up')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                      title="上移"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === currentPlan.items.length - 1}
                      onClick={() => onMoveItem(idx, 'down')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                      title="下移"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 ml-1"
                      title="移除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

~~~~~act
write_file
src/components/plan/PlanHeroCard.tsx
~~~~~
~~~~~typescript
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
import { registry } from '../../core/registry';
import type { TrainingPlan } from '../../types/plan';

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
      <div className="w-full bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 border-2 border-dashed border-indigo-200/80 rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-5 transition-all">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-100 text-indigo-600 rounded-2xl">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">今日训练计划</h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                未设置
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              按需编排多模块定制训练流，一站式贯通寻星、色感、相对推移与空间负形。
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenEditor}
          className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          定制我的训练流
        </button>
      </div>
    );
  }

  return (
    <div className="group w-full bg-white border border-indigo-100 hover:border-indigo-300 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col gap-5 relative z-10">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-sm shadow-indigo-200">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {favoritePlans.length > 1 && onSelectPlan ? (
                <div ref={dropdownRef} className="relative inline-block text-left">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="group/btn inline-flex items-center gap-1.5 text-lg font-black text-slate-900 tracking-tight hover:text-indigo-600 transition-colors focus:outline-none"
                  >
                    <span>{plan.name}</span>
                    <div
                      className={`p-1 rounded-lg bg-slate-100 group-hover/btn:bg-indigo-50 text-slate-500 group-hover/btn:text-indigo-600 transition-all duration-200 ${
                        isDropdownOpen ? 'rotate-180 bg-indigo-50 text-indigo-600' : ''
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 z-40 w-72 sm:w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-1.5 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                        <span>快速切换训练流</span>
                        <span className="font-mono">{favoritePlans.length} 个可用</span>
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
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                onSelectPlan(p.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-2.5 ${
                                isSelected
                                  ? 'bg-indigo-50/80 text-indigo-900 font-bold border border-indigo-200/80 shadow-sm'
                                  : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold truncate">{p.name}</span>
                                  {p.isBuiltin && (
                                    <span className="text-[9px] px-1 bg-slate-100 text-slate-500 rounded">
                                      官方
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {stageCount} 个阶段 • {pTrials} 题
                                </div>
                              </div>

                              {isSelected && (
                                <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <h2 className="text-lg font-black text-slate-900 tracking-tight">{plan.name}</h2>
              )}

              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full">
                {plan.items.length} 个训练阶段
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mt-0.5">
              <span>合计 {totalTrials} 题</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                预计约 {estimatedMin} 分钟
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenEditor}
          className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          title="调整阶段或题量"
        >
          <Sliders className="w-3.5 h-3.5" />
          编排计划
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {plan.items.map((item, idx) => {
          const card = registry.getCardById(item.cardId);
          if (!card) return null;
          const Icon = card.icon;

          return (
            <div key={item.id} className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-2xl shadow-inner">
                <div className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-mono text-[10px] font-black">
                  {idx + 1}
                </div>
                <Icon className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-800">{card.title}</span>
                <span className="text-[11px] font-mono font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded-lg border border-slate-100 shadow-sm">
                  {item.targetTrials}题
                </span>
              </div>
              {idx < plan.items.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
        <div className="text-xs text-slate-400 font-medium">
          各阶段自适应难度与答题记录将自动同步至个人生涯档案
        </div>

        <button
          type="button"
          onClick={onStartPlan}
          className="py-3 px-6 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2 ml-auto"
        >
          <Play className="w-4 h-4 fill-current" />
          开始今日训练流
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
~~~~~

### 下一步建议
我们已经成功实施了视图层与静态配置的全面解耦，所有页面现已 100% 接入动态自发现的 `src/core/registry`。

下一步可以生成对应的 `[COMMIT]` 计划，将这次架构重构完整持久化提交至 Git 仓库。
