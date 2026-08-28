import { BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { CardAnalyticsView } from '../core/contracts';
import { useTranslation } from '../core/i18n';
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

  const cardTitle = t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;

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

  const stats = currentView.getOverallStats
    ? currentView.getOverallStats(records)
    : {
        accuracy:
          records.length > 0
            ? Math.round((records.filter((r) => r.isHit).length / records.length) * 100)
            : 0,
        total: records.length,
      };

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
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{resolveText(currentView.title)}</h2>
              <p className="text-xs text-slate-400">{resolveText(currentView.subTitle)}</p>
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

        {/* 多页 Tab 切换栏 (当有多个视图时展示) */}
        {views.length > 1 && (
          <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl">
            {views.map((v: CardAnalyticsView, idx: number) => {
              const Icon = v.icon;
              const isActive = idx === activeViewIndex;
              return (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => setActiveViewIndex(idx)}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {resolveText(v.tabLabel)}
                </button>
              );
            })}
          </div>
        )}

        {/* 内容展示区 */}
        {loading ? (
          <div className="h-72 flex items-center justify-center text-slate-400 text-xs">
            {t('analyticsModal.analyzing')}
          </div>
        ) : records.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Info className="w-8 h-8 text-slate-300" />
            {t('analyticsModal.noRecords', { title: cardTitle })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* 左侧 Canvas 可视化区 */}
            <div className="md:col-span-7 flex justify-center bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shadow-inner relative">
              <canvas
                key={`${card.id}-${currentView.id}`}
                ref={canvasRef}
                width={320}
                height={320}
                className="w-full max-w-[300px] aspect-square rounded-xl border border-slate-100"
              />
            </div>

            {/* 右侧数据统计面板 */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">
                  {t('analyticsModal.overallEvaluation')}
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black text-slate-800">{stats.accuracy}%</span>
                  <span className="text-xs font-semibold text-slate-400 mb-1">
                    {t('analyticsModal.sampleSize', { count: stats.total })}
                  </span>
                </div>
                {stats.customSummary}
              </div>

              {/* 插件个性化诊断 */}
              {currentView.renderDiagnostics(records)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
