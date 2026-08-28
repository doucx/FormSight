你的分析非常切中痛点。

在进行视觉构图与色彩感知的快速试炼时，用户的核心注意力必须无干扰地聚焦在画布与做答区域上。原有的 `TrainingShell` 在顶部导航栏中堆叠了过多的静态元数据标签（如领域徽标、靶向状态徽标、实验性标签、说明长文案等），导致在 768px 以下的平板、移动端或桌面分屏窗口下发生多层折行，将做答主视口严重挤占。

我们将重构 `TrainingShell.tsx`，大幅精简顶部 Header 的信息密度，采用高屏效、响应式自适应布局，确保小屏与分屏下的沉浸式训练体验。

## [WIP] refactor: 精简 TrainingShell 顶部栏结构以优化小屏与分屏适配

### 用户需求
1. 解决 `TrainingShell` 在小屏与分屏窗口下 Header 多层折行挤占核心做答视口的问题。
2. 剔除顶部非关键的冗余静态标签，聚焦于当前题目、练习进度（Trials）、难度（Level）与计时器。
3. 优化小屏与移动端的触控和布局空间利用率。

### 评论
这是一个关键的体验（UX/DX）重构。沉浸式训练需要极简的视觉环境，去除认知过载的静态徽标，能够显著降低视觉噪音，让用户将注意力完全集中在知觉推演本身。

### 目标
1. 重构 `TrainingShell.tsx` 顶部 Header，改为轻量紧凑的 Flex 响应式排版。
2. 保持卡片名称与玩法说明（Tooltip）的易用性，移除折行占位的冗余徽标。
3. 压缩外层垂直间距与内边距，确保核心 Canvas 在任何分屏/小屏视口下居中呈现且不产生垂直滚动穿透。

### 基本原理
通过将 Header 改造为单层自适应布局（`flex-row items-center justify-between`），结合精简的微标签与紧凑的指标统计组（Trials / Level / Timer 并排显示），可以在小至 360px 宽度的移动视口中保持单行或紧凑双层高度，极大释放垂直空间。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/refine #task/domain/ui #task/object/training-shell #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 重构 `TrainingShell.tsx`

~~~~~act
write_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~tsx
import { ArrowLeft, ChevronRight, Clock, HelpCircle } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { getCardDesc, getCardTitle, useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import type { SessionHistoryItem } from '../SessionSummaryModal';
import { SessionSummaryModal } from '../SessionSummaryModal';
import { IdlePauseOverlay } from '../common/IdlePauseOverlay';

export interface TrainingSessionHandle {
  totalTrials: number;
  elapsedSeconds: number;
  isFinished: boolean;
  isIdle: boolean;
  showAnswer: boolean;
  showSummaryModal: boolean;
  sessionHistory: SessionHistoryItem[];
  resumeFromIdle: () => void;
  handleNextQuestion: () => void;
  handleRequestFinish: () => void;
  handleFinishSession: () => void;
  handleRestartSession: () => void;
}

interface TrainingShellProps {
  card: CardDefinition;
  sessionType: 'training' | 'benchmark';
  currentLevel: number;
  isTargeting?: boolean;
  autoNext: boolean;
  session: TrainingSessionHandle;
  showExitButton?: boolean;
  showTimer?: boolean;
  onExit: () => void;
  children: (state: { disabled: boolean; isIdle: boolean }) => ComponentChildren;
}

export function TrainingShell({
  card,
  sessionType,
  currentLevel,
  autoNext,
  session,
  showExitButton = true,
  showTimer = true,
  children,
}: TrainingShellProps) {
  const { t } = useTranslation();
  const cardTitle = getCardTitle(card, t);
  const instruction =
    t(`packs.${card.packId}.cards.${card.id}.instruction`) || card.instruction || '';
  const desc = getCardDesc(card, t);

  const [showHelpTooltip, setShowHelpTooltip] = useState(false);

  const {
    totalTrials,
    elapsedSeconds,
    isFinished,
    isIdle,
    showAnswer,
    showSummaryModal,
    sessionHistory,
    resumeFromIdle,
    handleNextQuestion,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  } = session;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-3 sm:gap-5">
      {/* 极简高屏效 Header 状态栏 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-xs flex items-center justify-between gap-2.5">
        {/* 左侧：返回按钮 + 模块标题 + 玩法提示 */}
        <div className="flex items-center gap-2 min-w-0">
          {showExitButton && (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer active:scale-95"
              title={t('shell.exitTraining')}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t('common.exit')}</span>
            </button>
          )}

          <div className="relative flex items-center min-w-0">
            <span className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-xl flex items-center gap-1.5 truncate">
              <span className="truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">{cardTitle}</span>
              {sessionType === 'benchmark' && (
                <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded">
                  BM
                </span>
              )}
              {(instruction || desc) && (
                <button
                  type="button"
                  onClick={() => setShowHelpTooltip(!showHelpTooltip)}
                  onMouseEnter={() => setShowHelpTooltip(true)}
                  onMouseLeave={() => setShowHelpTooltip(false)}
                  className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5 rounded-md flex-shrink-0"
                  title={t('shell.instructionTitle')}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </span>

            {showHelpTooltip && (instruction || desc) && (
              <div className="absolute left-0 top-full mt-2 z-40 w-72 bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-xs leading-relaxed animate-in fade-in zoom-in-95 duration-150">
                <div className="font-bold text-indigo-300 mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  {t('shell.instructionTitle')}
                </div>
                <p className="text-slate-200 text-[11px] leading-relaxed">{instruction || desc}</p>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：核心指标组 (进度 / Level / 计时) */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-bold flex-shrink-0">
          <div className="flex items-baseline gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">T</span>
            <span className="font-mono text-slate-800 font-black">
              {totalTrials}
              {sessionType === 'benchmark' ? '/20' : ''}
            </span>
          </div>

          <div className="flex items-baseline gap-1 bg-indigo-50/70 px-2.5 py-1 rounded-xl border border-indigo-100">
            <span className="text-[10px] text-indigo-400 font-extrabold uppercase">L</span>
            <span className="font-mono text-indigo-700 font-black">{currentLevel}</span>
          </div>

          {showTimer && (
            <div className="hidden xs:flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-1 rounded-xl border border-slate-100">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="font-mono text-[11px] font-semibold">
                {formatTime(elapsedSeconds)}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* 统一 Canvas 居中容器与休眠遮罩 */}
      <div className="relative w-full flex justify-center">
        {children({ disabled: isFinished || isIdle, isIdle })}
        {isIdle && <IdlePauseOverlay onResume={resumeFromIdle} />}
      </div>

      {/* 统一手动下一题控制栏 */}
      {!autoNext && (
        <div className="flex items-center justify-center pt-1">
          {isFinished ? (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              {t('shell.viewSummary')}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={!showAnswer}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                showAnswer
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {t('common.nextQuestion')}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 统一结课总结弹窗 */}
      {showSummaryModal && (
        <SessionSummaryModal
          card={card}
          sessionType={sessionType}
          elapsedSeconds={elapsedSeconds}
          history={sessionHistory}
          onClose={handleFinishSession}
          onRestart={handleRestartSession}
        />
      )}
    </div>
  );
}
~~~~~

### 下一步建议
1. 检查各模块（如色相调制、点阵盲打、2AFC 对抗）在移动端或窄窗口下的渲染尺寸，确保 `QuestionCardShell` 和 `PointClickCanvas` 拥有良好的最大高度限制。
2. 运行工程检查命令确保语法与类型校验完全通过：`npm run check`。
