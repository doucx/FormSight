import {
  Activity,
  BarChart2,
  Calendar,
  ChevronDown,
  Compass,
  Filter,
  Target,
  TrendingUp,
  X,
} from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { registry } from '../core/registry';
import type { CognitiveSkillTag } from '../types/card';
import { renderTrendChartCanvas } from '../utils/canvas/drawTrendChart';
import { type DailySummaryData, getDailySummaries, getLocalDateString } from '../utils/db/index';
import { SKILL_TAG_LABELS } from './discovery/FilterEngine';

interface GlobalStatsModalProps {
  onClose: () => void;
}

export function GlobalStatsModal({ onClose }: GlobalStatsModalProps) {
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<DailySummaryData[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const packs = registry.getAllPacks();
  const allCards = registry.getAllCards();

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      const data = await getDailySummaries();
      if (isMounted) {
        setSummaries(data);
        setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // 过滤后的汇总记录
  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      if (selectedFilter === 'all') return true;

      if (selectedFilter.startsWith('pack:')) {
        const targetPackId = selectedFilter.replace('pack:', '');
        const pack = registry.getPack(targetPackId);
        const packCardIds = new Set(pack?.cards.map((c) => c.id) || []);
        return packCardIds.has(s.cardId || s.mode);
      }

      if (selectedFilter.startsWith('skill:')) {
        const targetSkill = selectedFilter.replace('skill:', '') as CognitiveSkillTag;
        const matchedCards = registry.queryCards({ skills: [targetSkill] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId || s.mode);
      }

      if (selectedFilter.startsWith('card:')) {
        const targetCardId = selectedFilter.replace('card:', '');
        return s.cardId === targetCardId || s.mode === targetCardId;
      }

      return true;
    });
  }, [summaries, selectedFilter]);

  const getCurrentFilterLabel = () => {
    if (selectedFilter === 'all') return '全部练习项目';
    if (selectedFilter.startsWith('pack:')) {
      const pack = registry.getPack(selectedFilter.replace('pack:', ''));
      return `扩展包 • ${pack?.meta.title || selectedFilter}`;
    }
    if (selectedFilter.startsWith('skill:')) {
      const skill = selectedFilter.replace('skill:', '') as CognitiveSkillTag;
      return `认知技能 • ${SKILL_TAG_LABELS[skill] || skill}`;
    }
    if (selectedFilter.startsWith('card:')) {
      const cardId = selectedFilter.replace('card:', '');
      const card = registry.getCardById(cardId);
      return `训练模块 • ${card?.title || cardId}`;
    }
    return '全部练习项目';
  };

  const now = new Date();
  const todayStr = getLocalDateString(now.getTime());
  const startOfWeekStr = getLocalDateString(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const startOfYearStr = `${now.getFullYear()}-01-01`;

  const { stats, dailyData } = useMemo(() => {
    const statsObj = {
      today: { total: 0, hits: 0 },
      week: { total: 0, hits: 0 },
      year: { total: 0, hits: 0 },
      allTime: { total: 0, hits: 0 },
    };

    const data: Record<string, { total: number; maxLevel: number }> = {};

    for (const s of filteredSummaries) {
      statsObj.allTime.total += s.totalCount;
      statsObj.allTime.hits += s.hitCount;

      if (s.date === todayStr) {
        statsObj.today.total += s.totalCount;
        statsObj.today.hits += s.hitCount;
      }
      if (s.date >= startOfWeekStr) {
        statsObj.week.total += s.totalCount;
        statsObj.week.hits += s.hitCount;
      }
      if (s.date >= startOfYearStr) {
        statsObj.year.total += s.totalCount;
        statsObj.year.hits += s.hitCount;
      }

      if (!data[s.date]) {
        data[s.date] = { total: 0, maxLevel: s.maxLevel };
      }
      data[s.date].total += s.totalCount;
      data[s.date].maxLevel = Math.max(data[s.date].maxLevel, s.maxLevel);
    }

    return { stats: statsObj, dailyData: data };
  }, [filteredSummaries, todayStr, startOfWeekStr, startOfYearStr]);

  const calcAcc = (hits: number, total: number) =>
    total === 0 ? 0 : Math.round((hits / total) * 100);

  const heatmapDays = 84;
  const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const heatmapData = Array.from({ length: heatmapDays }).map((_, i) => {
    const dMs = startOfTodayMs - (heatmapDays - 1 - i) * 24 * 60 * 60 * 1000;
    const dateStr = getLocalDateString(dMs);
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

  // 计算按认知技能聚合的掌握度数据
  const skillMasteryList = useMemo(() => {
    const cardSummaryMap = new Map<string, { total: number; hits: number }>();
    for (const s of summaries) {
      const key = s.cardId || s.mode;
      const prev = cardSummaryMap.get(key) || { total: 0, hits: 0 };
      cardSummaryMap.set(key, {
        total: prev.total + s.totalCount,
        hits: prev.hits + s.hitCount,
      });
    }

    return (Object.keys(SKILL_TAG_LABELS) as CognitiveSkillTag[]).map((skill) => {
      const matchingCards = registry.queryCards({ skills: [skill] });
      let skillTotal = 0;
      let skillHits = 0;

      for (const card of matchingCards) {
        const item = cardSummaryMap.get(card.id);
        if (item) {
          skillTotal += item.total;
          skillHits += item.hits;
        }
      }

      const acc = skillTotal > 0 ? Math.round((skillHits / skillTotal) * 100) : 0;
      return {
        skill,
        label: SKILL_TAG_LABELS[skill],
        total: skillTotal,
        hits: skillHits,
        accuracy: acc,
        cardCount: matchingCards.length,
      };
    });
  }, [summaries]);

  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (canvas) {
      renderTrendChartCanvas(canvas, dailyData);
    }
  }, [loading, dailyData]);

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
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <BarChart2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">全局认知数据统计</h2>
              <p className="text-xs text-slate-400">洞察多维视觉认知成长与训练足迹</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Filter className="w-3.5 h-3.5 text-indigo-500 absolute left-3 pointer-events-none" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter((e.target as HTMLSelectElement).value)}
                className="pl-8 pr-8 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer transition-all shadow-sm max-w-xs truncate"
              >
                <option value="all">全部练习项目</option>

                <optgroup label="—— 扩展包 (Packs) ——">
                  {packs.map((p) => (
                    <option key={`pack:${p.packId}`} value={`pack:${p.packId}`}>
                      {p.meta.title} (扩展包)
                    </option>
                  ))}
                </optgroup>

                <optgroup label="—— 认知技能 (Skills) ——">
                  {(Object.keys(SKILL_TAG_LABELS) as CognitiveSkillTag[]).map((skill) => (
                    <option key={`skill:${skill}`} value={`skill:${skill}`}>
                      {SKILL_TAG_LABELS[skill]}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="—— 具体训练模块 (Cards) ——">
                  {allCards.map((card) => (
                    <option key={`card:${card.id}`} value={`card:${card.id}`}>
                      {card.title}
                    </option>
                  ))}
                </optgroup>
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
            正在统计海量物化数据...
          </div>
        ) : stats.allTime.total === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <Activity className="w-10 h-10 text-slate-300" />【{getCurrentFilterLabel()}
            】下暂无做答记录，先去练习几道题吧！
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* 核心指标卡片 */}
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

            {/* 认知技能掌握度分布矩阵 */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-indigo-600" />
                  认知知觉技能掌握度矩阵 (Cognitive Skills Mastery)
                </div>
                <span className="text-[10px] text-slate-400 font-mono">基于全部历史试炼聚合</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {skillMasteryList.map((sm) => (
                  <div
                    key={sm.skill}
                    className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-sm space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>{sm.label}</span>
                      <span
                        className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                          sm.total === 0
                            ? 'bg-slate-100 text-slate-400'
                            : sm.accuracy >= 80
                              ? 'bg-emerald-50 text-emerald-700 font-black'
                              : sm.accuracy >= 60
                                ? 'bg-amber-50 text-amber-700 font-black'
                                : 'bg-rose-50 text-rose-700 font-black'
                        }`}
                      >
                        {sm.total > 0 ? `${sm.accuracy}%` : '--'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>已练 {sm.total} 题</span>
                      <span>{sm.cardCount} 模块</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 热力图与演进曲线图 */}
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
