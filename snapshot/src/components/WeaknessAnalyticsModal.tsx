import { BarChart2, CheckCircle, Clock, Info, Target, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { CardAnalyticsView } from '../core/contracts';
import { getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { CardDefinition } from '../types/card';
import type { UnifiedTrialRecord } from '../utils/db/index';

interface WeaknessAnalyticsModalProps {
  card: CardDefinition;
  onClose: () => void;
}

export function WeaknessAnalyticsModal({ card, onClose }: WeaknessAnalyticsModalProps) {
  const { t } = useTranslation();
  const plugin = registry.getAnalyticsPluginByCardId(card.id);
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeViewIndex, setActiveViewIndex] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cardTitle = getCardTitle(card, t);
  const views = plugin?.views ?? [];
  const currentView = views[activeViewIndex] || views[0];

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (plugin) {
      plugin.fetchRecords(card.id).then((data: UnifiedTrialRecord[]) => {
        if (isMounted) {
          setRecords(data);
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [plugin, card.id]);

  useEffect(() => {
    if (loading || !currentView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    currentView.renderVisualizer(canvas, records);
  }, [currentView, loading, records]);

  if (!plugin || views.length === 0) return null;

  const totalTrials = records.length;
  const hitCount = records.filter((r) => r.isHit).length;
  const overallAccuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;
  const avgResponseTimeSec =
    totalTrials > 0
      ? (records.reduce((acc, curr) => acc + (curr.responseTimeMs || 0), 0) / totalTrials / 1000).toFixed(
          1,
        )
      : '0.0';

  const resolveText = (text?: string): string => {
    if (!text) return '';
    const translated = t(text);
    return translated !== text ? translated : text;
  };

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
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-xs">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">{cardTitle}</h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                  {t('stats.cardStatsBadge')}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentView ? resolveText(currentView.title) : t('stats.subTitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 综合统计概览卡片 (总题数、命中率、平均反应时) */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />
              {t('common.todayTrials')}
            </div>
            <div className="text-xl font-black text-slate-800">
              {totalTrials}{' '}
              <span className="text-[11px] font-normal text-slate-400 font-sans">
                {t('common.trialsUnit')}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Target className="w-3.5 h-3.5 text-emerald-500" />
              {t('common.accuracy')}
            </div>
            <div className="text-xl font-black text-slate-800 flex items-baseline gap-1.5">
              <span
                className={
                  totalTrials === 0
                    ? 'text-slate-400'
                    : overallAccuracy >= 80
                      ? 'text-emerald-600'
                      : 'text-slate-800'
                }
              >
                {totalTrials === 0 ? '--' : `${overallAccuracy}%`}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              {t('summary.duration')}
            </div>
            <div className="text-xl font-black text-slate-800 font-mono">
              {avgResponseTimeSec}
              <span className="text-[11px] font-normal text-slate-400 font-sans"> s</span>
            </div>
          </div>
        </div>

        {/* 多 Tab 切换栏 */}
        {views.length > 1 && (
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl overflow-x-auto scrollbar-none">
            {views.map((v: CardAnalyticsView, idx: number) => {
              const Icon = v.icon;
              const isActive = idx === activeViewIndex;
              return (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => setActiveViewIndex(idx)}
                  className={`flex-1 min-w-[120px] py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  <span className="truncate">{resolveText(v.tabLabel)}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* 可视化图表与诊断说明区 */}
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
            {t('analyticsModal.analyzing')}
          </div>
        ) : records.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Info className="w-8 h-8 text-slate-300" />
            {t('analyticsModal.noRecords', { title: cardTitle })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* 左侧 Canvas 视图 */}
            <div className="md:col-span-7 flex justify-center bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shadow-inner relative">
              <canvas
                key={`${card.id}-${currentView?.id}`}
                ref={canvasRef}
                width={320}
                height={320}
                className="w-full max-w-[280px] aspect-square rounded-xl border border-slate-100"
              />
            </div>

            {/* 右侧诊断与建议 */}
            <div className="md:col-span-5 flex flex-col gap-3 min-w-0">
              <div className="text-[11px] text-slate-400 leading-relaxed font-medium">
                {currentView?.subTitle && resolveText(currentView.subTitle)}
              </div>
              {currentView?.renderDiagnostics(records)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}