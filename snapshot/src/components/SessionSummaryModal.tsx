import { ArrowRight, Award, Clock, Home, RotateCcw, Target, Zap } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import { useTranslation } from '../core/i18n';
import type { CardDefinition } from '../types/card';
import { renderSessionTrendChartCanvas } from '../utils/canvas/drawTrendChart';

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

  const cardTitle = t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;

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

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && history.length > 0) {
      renderSessionTrendChartCanvas(canvas, history);
    }
  }, [history]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Escape' || e.key === 'Enter')) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Award className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{t('summary.title')}</h2>
              <p className="text-xs text-slate-400">
                {cardTitle} •{' '}
                {sessionType === 'benchmark'
                  ? t('summary.benchmarkSubtitle')
                  : t('summary.trainingSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* 核心指标统计卡片 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              {t('summary.accuracyCount')}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">{accuracy}%</span>
              <span className="text-xs font-semibold text-slate-400">
                {t('summary.trialsDone', { hits: hitCount, total: totalTrials })}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              {t('summary.duration')}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">
                {formatTime(elapsedSeconds)}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {t('summary.secPerTrial', { sec: avgResponseTimeSec })}
              </span>
            </div>
          </div>
        </div>

        {/* 层阶提升高亮卡片 */}
        <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 text-white rounded-xl">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-900">{t('summary.levelEvolution')}</div>
              <div className="text-[11px] text-indigo-600">
                {levelDiff > 0
                  ? t('summary.levelUp', { diff: levelDiff })
                  : levelDiff < 0
                    ? t('summary.levelDown', { diff: Math.abs(levelDiff) })
                    : t('summary.levelMaintain')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono font-black text-slate-800 text-base">
            <span className="bg-white px-2.5 py-1 rounded-xl border border-indigo-100 shadow-sm">
              Lvl {startLevel}
            </span>
            <ArrowRight className="w-4 h-4 text-indigo-500" />
            <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-xl shadow-sm">
              Lvl {endLevel}
            </span>
          </div>
        </div>

        {/* 折线图 Canvas 区 */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 w-full overflow-hidden">
          <div className="flex justify-between items-center px-1 mb-2">
            <span className="text-[11px] font-bold text-slate-600">{t('summary.curveTitle')}</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{' '}
                {t('summary.hitLegend')}
              </span>
              <span className="flex items-center gap-1 text-rose-500 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />{' '}
                {t('summary.missLegend')}
              </span>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={440}
            height={160}
            className="w-full max-w-full aspect-[11/4] rounded-xl block border border-slate-100 shadow-inner"
          />
        </div>

        {/* 底部操作按钮 */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            {t('summary.backHome')}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            {t('summary.trainAgain')}
          </button>
        </div>
      </div>
    </div>
  );
}
