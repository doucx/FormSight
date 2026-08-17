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