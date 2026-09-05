## [WIP] feat(training): Keep confirmation button visible with result color state after submission

### 错误分析

无（此为交互体验优化/功能改进任务，不属于 Bug 修复）。

### 用户需求
用户点击“确认提交”后，按钮不应直接消失导致网页布局改变，而是应该保持在原位，并根据答题情况变为绿色（正确）或红色（错误）。

### 评论
这个改动能够显著改善训练过程中的视觉稳定性（避免由于按钮突然消失导致的视觉抖动和误触风险），符合高品质的心流交互体验。

### 目标
1. 修改 `TrainingShell` 或相关的答题控制交互，使得在显示答案（`showAnswer`）时，确认/下一题按钮保持可见并正确呈现红/绿判定态。
2. 确保在关闭或开启 `autoNext` 时，该按钮的交互行为符合预期。

### 基本原理
我们在答题判定触发后（`showAnswer = true`），将底部主操作按钮的文案和样式动态更新：如果击中则显示绿色“✓ 击中/正确”，如果未击中则显示红色“✕ 未击中/错误”，同时点击该按钮可以直接触发进入下一题。这样既保留了按钮的布局占位，又直观地提供了视觉反馈。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/training-shell #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 修改 `TrainingShell.tsx` 以持久化并染色答题判定按钮

我们将更新 `TrainingShell`，使其在 `showAnswer` 为真时，不隐藏提交/下一题按钮，而是根据 `userAnswer` 的命中结果渲染对应的绿色或红色状态按钮。

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript.old
      {/* 统一手动下一题控制栏 */}
      {!autoNext && (
        <div className="flex items-center justify-center">
          {isFinished ? (
            <Button
              variant="default"
              onClick={handleRequestFinish}
              className="px-5 py-2.5 h-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {t('shell.viewSummary')}
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={handleNextQuestion}
              disabled={!showAnswer}
              className="px-5 py-2.5 h-auto gap-1"
            >
              {t('common.nextQuestion')}
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}
~~~~~
~~~~~typescript.new
      {/* 统一手动/结果确认控制栏：无论是否自动切题，在揭晓答案时常驻展示红/绿判定按钮，杜绝布局跳动 */}
      <div className="flex items-center justify-center">
        {isFinished ? (
          <Button
            variant="default"
            onClick={handleRequestFinish}
            className="px-6 py-3 h-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-md text-sm font-bold rounded-2xl"
          >
            {t('shell.viewSummary')}
          </Button>
        ) : showAnswer ? (
          <Button
            variant="default"
            onClick={handleNextQuestion}
            className={`px-8 py-3 h-auto gap-2 text-sm font-black shadow-md rounded-2xl transition-all ${
              session.userAnswer && (session.userAnswer as { isHit?: boolean }).isHit
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            <span>
              {session.userAnswer && (session.userAnswer as { isHit?: boolean }).isHit
                ? '✓ 击中目标 (Next)'
                : '✕ 未能击中 (Next)'}
            </span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <div className="h-11" /* 占位以彻底防止按钮未出现时的布局高度跳动 */ />
        )}
      </div>
~~~~~

### 下一步建议

我们已经更新了 `TrainingShell.tsx` 中的按钮交互逻辑。你可以进行测试以确认按钮在答题后不会消失，而是正确变为红/绿判定态并支持点击进入下一题。如果你满意，我们可以将此改动提交到 Git。
