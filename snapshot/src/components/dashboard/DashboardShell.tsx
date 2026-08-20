import { ArrowLeft } from 'lucide-preact';
import type { ComponentChildren } from 'preact';

interface DashboardShellProps {
  title: string;
  subTitle: string;
  onBackToHome?: () => void;
  children: ComponentChildren;
}

export function DashboardShell({ title, subTitle, onBackToHome, children }: DashboardShellProps) {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-6 py-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              返回主页
            </button>
          )}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {title} <span className="text-indigo-600 font-light text-xl">{subTitle}</span>
            </h1>
          </div>
        </div>
      </div>

      {/* 模块卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{children}</div>
    </div>
  );
}
