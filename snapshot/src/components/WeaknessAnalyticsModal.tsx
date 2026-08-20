import { BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ANALYTICS_PLUGINS } from '../config/analyticsPlugins';
import type { TrainingDomain, UnifiedTrialRecord } from '../utils/db';

interface WeaknessAnalyticsModalProps {
  domain: TrainingDomain;
  onClose: () => void;
}

export function WeaknessAnalyticsModal({ domain, onClose }: WeaknessAnalyticsModalProps) {
  const plugin = ANALYTICS_PLUGINS[domain];
  const [contextState, setContextState] = useState<Record<string, unknown>>({});
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleUpdateContext = (patch: Record<string, unknown>) => {
    setContextState((prev) => ({ ...prev, ...patch }));
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    plugin.fetchRecords(contextState).then((data) => {
      if (isMounted) {
        setRecords(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [plugin, contextState]);

  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    plugin.renderVisualizer(canvas, records, {
      state: contextState,
      setState: handleUpdateContext,
    });
  }, [plugin, loading, records, contextState]);

  const stats = plugin.getOverallStats
    ? plugin.getOverallStats(records)
    : {
        accuracy:
          records.length > 0
            ? Math.round((records.filter((r) => r.isHit).length / records.length) * 100)
            : 0,
        total: records.length,
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
              <h2 className="text-lg font-bold text-slate-800">{plugin.title}</h2>
              <p className="text-xs text-slate-400">{plugin.subTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 插件自定义筛选控制区 */}
        {plugin.renderControls?.({
          state: contextState,
          setState: handleUpdateContext,
        })}

        {/* 内容展示区 */}
        {loading ? (
          <div className="h-72 flex items-center justify-center text-slate-400 text-xs">
            正在分析历史答题数据...
          </div>
        ) : records.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Info className="w-8 h-8 text-slate-300" />
            暂无当前条件下的练习记录，先去完成几轮练习吧！
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* 左侧 Canvas 可视化区 */}
            <div className="md:col-span-7 flex justify-center bg-slate-900 p-4 rounded-2xl border border-slate-800 relative">
              <canvas
                ref={canvasRef}
                width={320}
                height={320}
                className="w-full max-w-[300px] aspect-square rounded-xl"
              />
            </div>

            {/* 右侧数据统计面板 */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">总体评估</div>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black text-slate-800">{stats.accuracy}%</span>
                  <span className="text-xs font-semibold text-slate-400 mb-1">
                    样本量: {stats.total} 题
                  </span>
                </div>
                {stats.customSummary}
              </div>

              {/* 插件个性化诊断 */}
              {plugin.renderDiagnostics(records, {
                state: contextState,
                setState: handleUpdateContext,
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
