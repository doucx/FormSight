import { BarChart2, Clock, Inbox, RotateCcw, Sliders, Sparkles } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { ModeCard } from '../components/dashboard/ModeCard';
import { FilterEngine } from '../components/discovery/FilterEngine';
import { PlanHeroCard } from '../components/plan/PlanHeroCard';
import { registry } from '../core/registry';
import type { CardQueryOptions } from '../types/card';
import type { TrainingPlan } from '../types/plan';
import { type UnifiedProfileData, formatTotalTime } from '../utils/db/index';

interface HomeProps {
  totalTimeMs: number;
  todayStats: Record<string, { count: number; timeMs: number }>;
  profiles: Record<string, UnifiedProfileData>;
  trainingPlan: TrainingPlan;
  allPlans?: TrainingPlan[];
  showExperimental?: boolean;
  onStartCard: (cardId: string, type: 'training' | 'benchmark') => void;
  onOpenCardSettings: (cardId: string) => void;
  onOpenCardAnalytics: (cardId: string) => void;
  onStartPlan: () => void;
  onOpenPlanEditor: () => void;
  onSelectPlan?: (planId: string) => void;
  onOpenGlobalSettings: () => void;
  onOpenGlobalStats: () => void;
}

export function Home({
  totalTimeMs,
  todayStats,
  profiles,
  trainingPlan,
  allPlans = [],
  showExperimental = false,
  onStartCard,
  onOpenCardSettings,
  onOpenCardAnalytics,
  onStartPlan,
  onOpenPlanEditor,
  onSelectPlan,
  onOpenGlobalSettings,
  onOpenGlobalStats,
}: HomeProps) {
  const [query, setQuery] = useState<CardQueryOptions>({
    includeExperimental: showExperimental,
  });

  // 结合全局设置与查询条件获取过滤后的卡片
  const filteredCards = useMemo(() => {
    return registry.queryCards({
      ...query,
      includeExperimental: showExperimental || query.includeExperimental,
    });
  }, [query, showExperimental]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* 品牌 Header 状态栏 */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-7 py-5 sm:px-8 sm:py-6 rounded-3xl shadow-sm flex-wrap gap-4">
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
            <p className="text-xs text-slate-400 font-medium">视觉造型构图与色彩感知自适应强化训练系统</p>
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
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95"
            title="全局统计"
          >
            <BarChart2 className="w-4 h-4 text-indigo-500" />
            统计
          </button>
          <button
            type="button"
            onClick={onOpenGlobalSettings}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 active:scale-95"
            title="全局设置"
          >
            <Sliders className="w-4 h-4" />
            全局设置
          </button>
        </div>
      </div>

      {/* 今日定制训练流 Hero 区域 */}
      <PlanHeroCard
        plan={trainingPlan}
        allPlans={allPlans}
        onStartPlan={onStartPlan}
        onOpenEditor={onOpenPlanEditor}
        onSelectPlan={onSelectPlan}
      />

      {/* 大盘发现库核心筛选引擎 */}
      <FilterEngine
        query={query}
        totalMatches={filteredCards.length}
        onChange={(newQuery) => setQuery(newQuery)}
      />

      {/* 大盘卡片网格流 (Discovery Hub Cards Grid) */}
      {filteredCards.length === 0 ? (
        <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-12 flex flex-col items-center justify-center gap-3 text-center shadow-sm">
          <div className="p-4 bg-slate-50 text-slate-400 rounded-3xl">
            <Inbox className="w-8 h-8" />
          </div>
          <div className="text-base font-bold text-slate-800">未找到符合条件的训练模块</div>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            尝试调整或清空当前的多维筛选标签、搜索关键字，以探索更多训练模块。
          </p>
          <button
            type="button"
            onClick={() => setQuery({ includeExperimental: showExperimental })}
            className="mt-2 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置所有筛选条件
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map((card) => {
            const profile = profiles[card.id];
            const totalTrials = profile?.totalTrials || 0;
            const accuracy =
              totalTrials > 0 && profile ? Math.round((profile.totalHits / totalTrials) * 100) : 0;
            const currentLevel = profile?.currentLevel || 5;
            const stat = todayStats[card.id] || { count: 0, timeMs: 0 };

            return (
              <ModeCard
                key={card.id}
                title={card.title}
                desc={card.desc}
                icon={card.icon}
                todayCount={stat.count}
                todayTimeMs={stat.timeMs}
                currentLevel={currentLevel}
                accuracy={accuracy}
                hasAnalytics={Boolean(card.hasWeaknessAnalytics)}
                isExperimental={Boolean(card.isExperimental)}
                onStartTraining={() => onStartCard(card.id, 'training')}
                onStartBenchmark={() => onStartCard(card.id, 'benchmark')}
                onOpenSettings={() => onOpenCardSettings(card.id)}
                onOpenAnalytics={() => onOpenCardAnalytics(card.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}