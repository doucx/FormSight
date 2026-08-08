import { ArrowRight, Award, Clock, Home, RotateCcw, Target, Zap } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import type { TrainingMode } from '../types';

export interface SessionHistoryItem {
  trialIndex: number;
  level: number;
  isHit: boolean;
  responseTimeMs: number;
}

interface SessionSummaryModalProps {
  mode: TrainingMode;
  sessionType: 'training' | 'benchmark';
  elapsedSeconds: number;
  history: SessionHistoryItem[];
  onClose: () => void;
  onRestart: () => void;
}

const MODE_NAMES: Record<TrainingMode, string> = {
  single: '单锚点模式',
  double_h: '水平双锚点',
  double_r: '旋转双锚点',
};

export function SessionSummaryModal({
  mode,
  sessionType,
  elapsedSeconds,
  history,
  onClose,
  onRestart,
}: SessionSummaryModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const totalTrials = history.length;
  const hitCount = history.filter((h) => h.isHit).length;
  const accuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;

  const startLevel = history.length > 0 ? history[0].level : 5;
  const endLevel = history.length > 0 ? history[history.length - 1].level : 5;
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

  // 绘制 Level 演进折线图
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 30, right: 30, bottom: 35, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // 清屏
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, width, height);

    const levels = history.map((h) => h.level);
    const maxLevel = Math.max(...levels, 35);
    const minLevel = Math.min(...levels, 1);

    // Y 轴转换函数 (Level 越大代表难度越高，向上增加)
    const getY = (val: number) => {
      const ratio = (val - minLevel) / (maxLevel - minLevel || 1);
      return padding.top + (1 - ratio) * chartH;
    };

    // X 轴转换函数
    const getX = (index: number) => {
      if (history.length === 1) return padding.left + chartW / 2;
      return padding.left + (index / (history.length - 1)) * chartW;
    };

    // 1. 绘制网格线与 Y 轴刻度
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#334155';
    ctx.fillStyle = '#64748B';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const yTicks = [maxLevel, Math.round((maxLevel + minLevel) / 2), minLevel];
    const uniqueYTicks = Array.from(new Set(yTicks));

    for (const tickVal of uniqueYTicks) {
      const y = getY(tickVal);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText(`Lvl ${tickVal}`, padding.left - 8, y);
    }

    // 2. 绘制渐变填充区域
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(history[0].level));
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(getX(i), getY(history[i].level));
    }
    ctx.lineTo(getX(history.length - 1), height - padding.bottom);
    ctx.lineTo(getX(0), height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // 3. 绘制折线
    ctx.beginPath();
    ctx.strokeStyle = '#818CF8';
    ctx.lineWidth = 2.5;
    ctx.moveTo(getX(0), getY(history[0].level));
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(getX(i), getY(history[i].level));
    }
    ctx.stroke();

    // 4. 绘制数据点与作答标记
    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      const x = getX(i);
      const y = getY(h.level);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = h.isHit ? '#22C55E' : '#EF4444';
      ctx.fill();
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 在主要节点标 Level 数字
      if (
        history.length <= 10 ||
        i === 0 ||
        i === history.length - 1 ||
        h.level !== history[i - 1]?.level
      ) {
        ctx.fillStyle = '#CBD5E1';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`L${h.level}`, x, y - 8);
      }
    }

    // X 轴底线
    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('题目做答序列 ➔', width / 2, height - 10);
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
              <h2 className="text-lg font-bold text-slate-800">训练总结与成果</h2>
              <p className="text-xs text-slate-400">
                {MODE_NAMES[mode]} • {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
              </p>
            </div>
          </div>
        </div>

        {/* 核心指标统计卡片 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              正确率 / 题数
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">{accuracy}%</span>
              <span className="text-xs font-semibold text-slate-400">
                ({hitCount}/{totalTrials} 题)
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              训练时长
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">
                {formatTime(elapsedSeconds)}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                ({avgResponseTimeSec}秒/题)
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
              <div className="text-xs font-bold text-indigo-900">能力层阶演进</div>
              <div className="text-[11px] text-indigo-600">
                {levelDiff > 0
                  ? `难度层阶提升了 ${levelDiff} 级！`
                  : levelDiff < 0
                    ? `难度层阶回调了 ${Math.abs(levelDiff)} 级`
                    : '稳健维持当前难度层阶'}
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
        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-center px-1 mb-2">
            <span className="text-[11px] font-bold text-slate-400">难度层阶变化曲线</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 击中
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> 未击中
              </span>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={440}
            height={160}
            className="w-full aspect-[11/4] rounded-xl"
          />
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Home className="w-4 h-4" />
            返回主页
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            再练一轮
          </button>
        </div>
      </div>
    </div>
  );
}
