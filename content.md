好的，我们将精简 `ModeCard.tsx` 的底部左侧区域，移除“能力层阶”标题、状态胶囊提示灯以及题数括号，使卡片底部更加纯粹聚焦在核心的 `Lvl` 数字上。

以下是完整的修改计划。

## [WIP] style: 简化 ModeCard 底部视觉并移除冗余层阶提示与题数

### 用户需求
在卡片底部左侧，移除“能力层阶”文字、深水摸索/稳态调优状态胶囊以及 `(760 题)` 的括号题数说明，仅保留醒目的层阶数字。

### 评论
该改动能够进一步消除卡片信息冗余，让卡片底部左侧视觉更加纯粹明晰，避免过多的辅助标签干扰用户的视线。

### 目标
1. 移除 `ModeCard.tsx` 中 `renderConvergenceStatus` 辅助解析函数及其 JSX 调用。
2. 移除 `ModeCard.tsx` 底部左侧的“能力层阶”标题栏与题数显示，直接呈现大字 `Lvl XX`。

### 基本原理
通过直接清理 `ModeCard.tsx` 底部左侧多余的包裹节点和状态指示胶囊，使底部仅保留核心的 `Lvl ${currentLevel}`，与右侧的动作按钮形成干净利落的视觉平衡。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/mode-card-clean-layout #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 精简 ModeCard 底部左侧布局

从 `ModeCard.tsx` 中移除稳态状态指示函数以及底部左侧的标题行与题数标签。

~~~~~act
patch_file
src/components/common/ModeCard.tsx
~~~~~
~~~~~tsx.old
  const effectiveBestLevel = Math.max(currentLevel, bestLevel || currentLevel);

  // 稳态算法指示解析 (5.1)
  const renderConvergenceStatus = () => {
    if (isNeverPracticed || totalTrials < 5) return null;
    if (accuracy >= 70 && accuracy <= 85) {
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md"
          title={`${accuracy}% 正确率：处在心理物理学最佳稳态调优区间`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {t('card.statusOptimal')}
        </span>
      );
    }
    if (accuracy > 85) {
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md"
          title={`${accuracy}% 正确率：表现优异，难度正在快速攀升`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          {t('card.statusAscending')}
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md"
        title={`${accuracy}% 正确率：当前处在深水极限摸索区`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        {t('card.statusExploring')}
      </span>
    );
  };

  return (
~~~~~
~~~~~tsx.new
  const effectiveBestLevel = Math.max(currentLevel, bestLevel || currentLevel);

  return (
~~~~~

~~~~~act
patch_file
src/components/common/ModeCard.tsx
~~~~~
~~~~~tsx.old
        {/* 左侧：当前层阶大字显示与稳态指示 */}
        <div className="space-y-1">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <span>{t('card.skillLevel')}</span>
            {renderConvergenceStatus()}
          </div>
          <div className="text-sm font-black text-foreground font-mono flex items-baseline gap-2">
            <span
              className={
                isNeverPracticed
                  ? 'text-muted-foreground text-base'
                  : 'text-primary font-black text-lg'
              }
            >
              {isNeverPracticed ? '--' : `Lvl ${currentLevel}`}
            </span>
            {!isNeverPracticed && (
              <span className="text-[11px] font-normal text-muted-foreground font-sans">
                ({totalTrials} {t('common.trialsUnit')})
              </span>
            )}
          </div>
        </div>
~~~~~
~~~~~tsx.new
        {/* 左侧：当前层阶纯粹大字展示 */}
        <div className="flex items-baseline">
          <span
            className={
              isNeverPracticed
                ? 'text-muted-foreground font-mono font-black text-lg'
                : 'text-primary font-mono font-black text-lg'
            }
          >
            {isNeverPracticed ? '--' : `Lvl ${currentLevel}`}
          </span>
        </div>
~~~~~

### 下一步建议
1. 观察当前卡片在桌面端与移动端下的视觉清爽度，确认底部左右对称与留白是否符合审美预期。
