import { ArrowRight, Clock, Compass, Layers, Target } from 'lucide-preact';
import { PlanHeroCard } from '../components/plan/PlanHeroCard';
import { getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { TrainingPlan } from '../types/plan';
import { type UnifiedProfileData, formatTotalTime } from '../utils/db/index';

interface HomeProps {
  totalTimeMs: number;
  todayStats: Record<string, { count: number; timeMs: number }>;
  profiles: Record<string, UnifiedProfileData>;
  trainingPlan: TrainingPlan;
  allPlans?: TrainingPlan[];
  onStartPlan: () => void;
  onOpenPlanEditor: () => void;
  onSelectPlan?: (planId: string) => void;
  onNavigateToDiscovery: () => void;
  onNavigateToStats: () => void;
}

export function Home({
  totalTimeMs,
  todayStats,
  profiles,
  trainingPlan,
  allPlans = [],
  onStartPlan,
  onOpenPlanEditor,
  onSelectPlan,
  onNavigateToDiscovery,
  onNavigateToStats,
}: HomeProps) {
  const { t } = useTranslation();

  // 统计今日已练习题数与总题量
  const todayTotalCount = Object.values(todayStats).reduce((acc, c) => acc + c.count, 0);

  // 统计所有模块的平均正确率
  const allProfilesList = Object.values(profiles);
  const allTotalTrials = allProfilesList.reduce((acc, p) => acc + p.totalTrials, 0);
  const allTotalHits = allProfilesList.reduce((acc, p) => acc + p.totalHits, 0);
  const overallAccuracy =
    allTotalTrials > 0 ? Math.round((allTotalHits / allTotalTrials) * 100) : 0;

  // 获取当前计划的所有有效阶段卡片
  const validPlanItems = (trainingPlan.items || []).filter((item) =>
    Boolean(registry.getCardById(item.cardId)),
  );

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-150">
      {/* 顶部状态与问候信息 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t('nav.dashboard')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
            {t('common.appSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>{formatTotalTime(totalTimeMs)}</span>
          </div>
        </div>
      </div>

      {/* 核心主角：今日训练流 Hero 卡片 */}
      <PlanHeroCard
        plan={trainingPlan}
        allPlans={allPlans}
        onStartPlan={onStartPlan}
        onOpenEditor={onOpenPlanEditor}
        onSelectPlan={onSelectPlan}
      />

      {/* 当前计划阶段明细清单 (直观展示今日步骤，无需跳入计划编辑器) */}
      {validPlanItems.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>{t('plan.stageBreakdown')}</span>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {t('plan.stageCount', { count: validPlanItems.length })}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {validPlanItems.map((item, idx) => {
              const card = registry.getCardById(item.cardId);
              if (!card) return null;
              const Icon = card.icon;
              const cardTitle = getCardTitle(card, t);
              const cardProfile = profiles[card.id];
              const currentLvl = cardProfile?.currentLevel || 5;

              return (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl flex items-center justify-between gap-2.5 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-slate-800 dark:bg-slate-700 text-white font-mono text-[11px] font-black flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="p-1.5 rounded-xl bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-slate-200/60 dark:border-slate-700/60 shadow-xs flex-shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{cardTitle}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Lvl {currentLvl}</div>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-lg shadow-xs flex-shrink-0">
                    {item.targetTrials} {t('common.trialsUnit')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 底部概览指标与快捷探索导航 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 指标卡 1: 今日刷题 */}
        <div
          role="presentation"
          onClick={onNavigateToStats}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigateToStats();
            }
          }}
          className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500 transition-all cursor-pointer space-y-1 group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              {t('common.todayTrials')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
            {todayTotalCount}{' '}
            <span className="text-xs font-normal text-slate-400">{t('common.trialsUnit')}</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-0.5">
            {t('common.accuracy')}:{' '}
            <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">{overallAccuracy}%</span>
          </div>
        </div>

        {/* 快捷跳转 2: 探索大盘入口 */}
        <div
          role="presentation"
          onClick={onNavigateToDiscovery}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigateToDiscovery();
            }
          }}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <Compass className="w-3.5 h-3.5" />
              {t('nav.discovery')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-black text-slate-800 dark:text-slate-100">{t('home.allPacks')}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t('home.matchedModules', { count: registry.getAllCards().length })}
            </p>
          </div>
        </div>

        {/* 快捷跳转 3: 计划管理入口 */}
        <div
          role="presentation"
          onClick={onOpenPlanEditor}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenPlanEditor();
            }
          }}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between group sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <Layers className="w-3.5 h-3.5" />
              {t('nav.plans')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-black text-slate-800">{trainingPlan.name}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t('plan.stageAndTrialsSummary', {
                stages: validPlanItems.length,
                trials: validPlanItems.reduce((acc, c) => acc + c.targetTrials, 0),
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
