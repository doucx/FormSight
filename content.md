用户指出在小屏幕或窄屏分屏模式下，`TrainingShell` 顶部 Header 堆叠了过多的标签和元数据，导致高度被过度撑开、产生换行并将核心 Canvas 挤出首屏。

我将重构 `TrainingShell.tsx`，精简 Header 的信息层级，移除冗余的静态标签，压缩垂直空间与内边距，打造极简、聚焦与沉浸式的训练状态栏。

## [WIP] refactor: 精简与紧凑化 TrainingShell 顶栏以优化首屏沉浸感

### 用户需求
对 `TrainingShell.tsx` 的顶部 Header 进行响应式与信息密度重构，移除在做答过程中干扰视觉的次级元数据（如冗长的领域徽标、靶向/实验性标签），提升核心指标（题量进度、当前 Level、计时）的紧凑性，确保在平板、移动设备及笔记本分屏下画布不会被挤出首屏。

### 评论
在认知与反应敏捷度训练中，心流与视觉沉浸至关重要。训练界面应遵循“极简专注”原则，将静态元数据移出做答视区，仅保留必要的实时进度与反馈，大幅改善移动端和分屏场景下的操作体验。

### 目标
1. 精简 Header 的垂直尺寸与内边距，从 `p-4 flex-col sm:flex-row` 优化为紧凑单行自适应弹性布局。
2. 精简左侧标题栏信息，去除冗长的大段文字徽标，将玩法说明集成在紧凑的卡片标题与帮助浮层中。
3. 将右侧的做答题量、Level 和计时器转化为紧凑的胶囊行内指标组件。
4. 缩小整体垂直间距，确保主流分辨率及移动端首屏完美呈现 Canvas。

### 基本原理
通过 Tailwind 的响应式类名与弹性胶囊布局，将多行堆叠的 Header 收缩为高辨识度的单行状态栏，并在窄屏下自动隐藏非核心装饰元素，使得核心 Canvas 能始终占据视口垂直黄金中心。

### 标签
#intent/refine #flow/ready #priority/high
#comp/runtime #comp/ui #concept/ui #scope/ux
#ai/instruct
#task/domain/ui #task/object/training-shell-header #task/action/refactor
#task/state/begin #task/status/active

---

### Script

#### Acts 1: 重构 `TrainingShell.tsx` Header 布局与信息密度

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript.old
  const { t } = useTranslation();
  const cardTitle = getCardTitle(card, t);
  const instruction =
    t(`packs.${card.packId}.cards.${card.id}.instruction`) || card.instruction || '';
  const desc = getCardDesc(card, t);
  const badgeKey = card.tags.domain[0] ? `tags.domains.${card.tags.domain[0]}` : '';
  const badge = badgeKey ? t(badgeKey) : '';

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
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* 统一 Header 状态栏 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {showExitButton && (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t('shell.exitTraining')}
            </button>
          )}
          <div className="relative flex items-center">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1.5">
              {cardTitle} {badge ? `· ${badge}` : ''} |{' '}
              {sessionType === 'benchmark' ? t('shell.benchmark') : t('shell.training')}
              {(instruction || desc) && (
                <button
                  type="button"
                  onClick={() => setShowHelpTooltip(!showHelpTooltip)}
                  onMouseEnter={() => setShowHelpTooltip(true)}
                  onMouseLeave={() => setShowHelpTooltip(false)}
                  className="text-indigo-400 hover:text-indigo-700 transition-colors p-0.5 rounded-md"
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
                <p className="text-slate-200 text-[11px]">{instruction || desc}</p>
              </div>
            )}
          </div>

          {isTargeting && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              {t('shell.targeting')}
            </span>
          )}

          {card.tags.status === 'experimental' && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
              {t('shell.experimental')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              {t('shell.trialsCount')}
            </span>
            <span className="font-black text-gray-800">
              {totalTrials} {sessionType === 'benchmark' ? '/ 20' : ''}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              {t('shell.currentLevel')}
            </span>
            <span className="font-black text-indigo-600">Level {currentLevel}</span>
          </div>

          {showTimer && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono font-bold text-slate-700">
                {formatTime(elapsedSeconds)}
              </span>
            </div>
          )}
        </div>
      </header>
~~~~~
~~~~~typescript.new
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
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-4 sm:gap-6">
      {/* 统一 Header 状态栏：极简沉浸式紧凑单行排版 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {showExitButton && (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer active:scale-95"
              title={t('shell.exitTraining')}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('shell.exitTraining')}</span>
            </button>
          )}

          <div className="relative flex items-center min-w-0">
            <div className="text-xs font-black text-slate-800 truncate flex items-center gap-1.5">
              <span className="truncate">{cardTitle}</span>
              {sessionType === 'benchmark' && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-md flex-shrink-0">
                  {t('shell.benchmark')}
                </span>
              )}
              {(instruction || desc) && (
                <button
                  type="button"
                  onClick={() => setShowHelpTooltip(!showHelpTooltip)}
                  onMouseEnter={() => setShowHelpTooltip(true)}
                  onMouseLeave={() => setShowHelpTooltip(false)}
                  className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5 rounded-md flex-shrink-0 cursor-pointer"
                  title={t('shell.instructionTitle')}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {showHelpTooltip && (instruction || desc) && (
              <div className="absolute left-0 top-full mt-2 z-40 w-72 bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-xs leading-relaxed animate-in fade-in zoom-in-95 duration-150">
                <div className="font-bold text-indigo-300 mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  {t('shell.instructionTitle')}
                </div>
                <p className="text-slate-200 text-[11px]">{instruction || desc}</p>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：紧凑型指标胶囊 */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
              {t('shell.trialsCount')}
            </span>
            <span className="font-mono font-black text-slate-800">
              {totalTrials}
              {sessionType === 'benchmark' ? ' / 20' : ` ${t('common.trialsUnit')}`}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-100/80 px-2.5 py-1 rounded-xl">
            <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider hidden sm:inline">
              Lvl
            </span>
            <span className="font-mono font-black text-indigo-700">{currentLevel}</span>
          </div>

          {showTimer && (
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100 text-slate-600">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="font-mono font-bold text-[11px]">
                {formatTime(elapsedSeconds)}
              </span>
            </div>
          )}
        </div>
      </header>
~~~~~

### 下一步建议
1. 在移动设备或浏览器窄屏分屏模式（<= 768px）下验证做答画布是否稳稳保持在首屏正中。
2. 如需进一步优化视觉纯粹感，可检查并微调各卡片中下方“下一题”按钮在自动翻页模式下的高度占用。
