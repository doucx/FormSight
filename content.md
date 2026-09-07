我将为你执行实施计划，对沙盒模式进行深度优化：
1. **彻底抑制弹窗**：在沙盒模式下，无论用户中途退出、答完题还是按下 `Esc`，均直接退出返回，绝不弹出“训练总结与成果”弹窗。
2. **快捷键系统强化**：在 `useTrainingKeybindings.ts` 中针对 `sandbox` 模式集成全套快捷操作：
   - `R` / `r`：快速重新生成题目（换一题）
   - `[` / `]`：即时无级增减难度 Level（1~35）
   - `I` / `i`：快速展开/折叠题目参数检查器（Inspector）
   - 底部同步展示沙盒快捷键指南。

## [WIP] feat(sandbox): 优化沙盒退出逻辑与增强快捷键支持

### 用户需求
1. 在沙盒模式下，完全屏蔽“训练总结与成果”弹窗（`SessionSummaryModal`），退出时直接返回。
2. 在 `useTrainingKeybindings.ts` 中为沙盒模式注入专属键盘快捷键：
   - `R` 键快速重新生成题目。
   - `[` / `]` 键调节当前难度 Level。
   - `I` 键切换检查器抽屉（Inspector）。

### 评论
沙盒模式本质上是面向调试与免心理负担的演练环境，弹出统计总结反而会中断使用者的心流。同时，添加键盘盲操快捷键让使用者无需反复移动光标点击顶栏微调器，体验将更加高效顺畅。

### 目标
1. 改造 `useTrainingKeybindings.ts`，接收 `isSandbox`、`onRegenerate`、`onAdjustLevel`、`onToggleInspector` 并绑定按键响应。
2. 在 `useTrainingSession.ts` 中管理 `showInspector` 状态与 `adjustLevel` 方法，并在 `handleRequestFinish` 中直接对沙盒模式执行 `onExit()`。
3. 调整 `TrainingShell.tsx`，在沙盒模式下阻止 `SessionSummaryModal` 渲染，并更新底部的键盘提示文本。

### 基本原理
1. **状态升格与生命周期内聚**：将 `showInspector` 状态由 `TrainingShell` 提升至 `useTrainingSession`，使键盘事件监听器能直接闭包访问切换方法，无需在 DOM 树中层层反向派发。
2. **零副作用退出**：沙盒模式无需总结弹窗，在调用 `handleRequestFinish` 或按 `Esc` 时直接跳过 `setShowSummaryModal(true)` 并执行 `onExit`，保证即点即退。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #concept/executor #scope/ux #ai/instruct #task/domain/runtime #task/object/sandbox-mode #task/action/keybindings #task/state/continue

---

### Script

#### Acts 1: 升级 `useTrainingKeybindings.ts` 快捷键逻辑

~~~~~act
patch_file
src/hooks/session/useTrainingKeybindings.ts
~~~~~
~~~~~typescript
export interface UseTrainingKeybindingsOptions {
  isIdle: boolean;
  showAnswer: boolean;
  isFinished: boolean;
  disabled?: boolean;
  onResumeFromIdle: () => void;
  onNextQuestion: () => void;
  onRequestFinish: () => void;
}

export function useTrainingKeybindings({
  isIdle,
  showAnswer,
  isFinished,
  disabled = false,
  onResumeFromIdle,
  onNextQuestion,
  onRequestFinish,
}: UseTrainingKeybindingsOptions) {
~~~~~
~~~~~typescript
export interface UseTrainingKeybindingsOptions {
  isIdle: boolean;
  showAnswer: boolean;
  isFinished: boolean;
  disabled?: boolean;
  isSandbox?: boolean;
  onResumeFromIdle: () => void;
  onNextQuestion: () => void;
  onRequestFinish: () => void;
  onRegenerate?: () => void;
  onAdjustLevel?: (delta: number) => void;
  onToggleInspector?: () => void;
}

export function useTrainingKeybindings({
  isIdle,
  showAnswer,
  isFinished,
  disabled = false,
  isSandbox = false,
  onResumeFromIdle,
  onNextQuestion,
  onRequestFinish,
  onRegenerate,
  onAdjustLevel,
  onToggleInspector,
}: UseTrainingKeybindingsOptions) {
~~~~~

~~~~~act
patch_file
src/hooks/session/useTrainingKeybindings.ts
~~~~~
~~~~~typescript
      if (isIdle) {
        e.preventDefault();
        onResumeFromIdle();
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
~~~~~
~~~~~typescript
      if (isIdle) {
        e.preventDefault();
        onResumeFromIdle();
        return;
      }

      // 沙盒专属快捷键 (R 换题, [ / ] 调级, I 检查器)
      if (isSandbox) {
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          onRegenerate?.();
          return;
        }
        if (e.key === '[') {
          e.preventDefault();
          onAdjustLevel?.(-1);
          return;
        }
        if (e.key === ']') {
          e.preventDefault();
          onAdjustLevel?.(1);
          return;
        }
        if (e.key === 'i' || e.key === 'I') {
          e.preventDefault();
          onToggleInspector?.();
          return;
        }
      }

      if (e.code === 'Space' || e.key === ' ') {
~~~~~

~~~~~act
patch_file
src/hooks/session/useTrainingKeybindings.ts
~~~~~
~~~~~typescript
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, isIdle, showAnswer, isFinished, onResumeFromIdle, onNextQuestion, onRequestFinish]);
}
~~~~~
~~~~~typescript
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    disabled,
    isIdle,
    showAnswer,
    isFinished,
    isSandbox,
    onResumeFromIdle,
    onNextQuestion,
    onRequestFinish,
    onRegenerate,
    onAdjustLevel,
    onToggleInspector,
  ]);
}
~~~~~

#### Acts 2: 升级 `useTrainingSession.ts`（抑制总结弹窗并连接快捷键）

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const streakRef = useRef<number>(0);
~~~~~
~~~~~typescript
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [showInspector, setShowInspector] = useState<boolean>(false);
  const streakRef = useRef<number>(0);
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
  const revealAnswer = useCallback(() => {
    setShowAnswer(true);
  }, []);
~~~~~
~~~~~typescript
  const revealAnswer = useCallback(() => {
    setShowAnswer(true);
  }, []);

  const toggleInspector = useCallback(() => {
    setShowInspector((prev) => !prev);
  }, []);

  const adjustLevel = useCallback(
    (delta: number) => {
      const cur = adaptiveEngineRef.current.getCurrentLevel();
      const next = Math.max(1, Math.min(35, cur + delta));
      if (next !== cur) {
        setCurrentLevel(next);
      }
    },
    [setCurrentLevel],
  );
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
  const handleRequestFinish = useCallback(async () => {
    if (targetLimitTrials && totalTrials >= targetLimitTrials && onTargetLimitReached) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onTargetLimitReached(sessionHistory);
      return;
    }
    if (onEarlyExit) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onEarlyExit(sessionHistory);
      return;
    }
    if (sessionHistory.length > 0 && !showSummaryModal) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      setShowSummaryModal(true);
    } else {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onExit();
    }
  }, [
    targetLimitTrials,
    totalTrials,
    hitTrials,
    onTargetLimitReached,
    onEarlyExit,
    sessionHistory,
    showSummaryModal,
    saveCurrentSession,
    onExit,
  ]);
~~~~~
~~~~~typescript
  const handleRequestFinish = useCallback(async () => {
    if (sessionType === 'sandbox') {
      onExit();
      return;
    }
    if (targetLimitTrials && totalTrials >= targetLimitTrials && onTargetLimitReached) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onTargetLimitReached(sessionHistory);
      return;
    }
    if (onEarlyExit) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onEarlyExit(sessionHistory);
      return;
    }
    if (sessionHistory.length > 0 && !showSummaryModal) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      setShowSummaryModal(true);
    } else {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onExit();
    }
  }, [
    sessionType,
    targetLimitTrials,
    totalTrials,
    hitTrials,
    onTargetLimitReached,
    onEarlyExit,
    sessionHistory,
    showSummaryModal,
    saveCurrentSession,
    onExit,
  ]);
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
  // === 2. 键盘快捷键微 Hook ===
  useTrainingKeybindings({
    isIdle,
    showAnswer,
    isFinished,
    disabled: showSummaryModal,
    onResumeFromIdle: resumeFromIdle,
    onNextQuestion: handleNextQuestion,
    onRequestFinish: handleRequestFinish,
  });
~~~~~
~~~~~typescript
  // === 2. 键盘快捷键微 Hook ===
  useTrainingKeybindings({
    isIdle,
    showAnswer,
    isFinished,
    disabled: showSummaryModal,
    isSandbox: sessionType === 'sandbox',
    onResumeFromIdle: resumeFromIdle,
    onNextQuestion: handleNextQuestion,
    onRequestFinish: handleRequestFinish,
    onRegenerate: regenerateQuestion,
    onAdjustLevel: adjustLevel,
    onToggleInspector: toggleInspector,
  });
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
    setCurrentLevel,
    regenerateQuestion,
    revealAnswer,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  };
}
~~~~~
~~~~~typescript
    setCurrentLevel,
    regenerateQuestion,
    revealAnswer,
    showInspector,
    toggleInspector,
    setShowInspector,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  };
}
~~~~~

#### Acts 3: 更新 `TrainingShell.tsx`（屏蔽沙盒弹窗与底栏指引优化）

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
  setCurrentLevel?: (level: number) => void;
  regenerateQuestion?: () => void;
  revealAnswer?: () => void;
  handleRequestFinish: () => void;
~~~~~
~~~~~typescript
  setCurrentLevel?: (level: number) => void;
  regenerateQuestion?: () => void;
  revealAnswer?: () => void;
  showInspector?: boolean;
  toggleInspector?: () => void;
  setShowInspector?: (val: boolean) => void;
  handleRequestFinish: () => void;
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const [showInspector, setShowInspector] = useState(false);

  const isSandbox = sessionType === 'sandbox';

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
    setCurrentLevel,
    regenerateQuestion,
    revealAnswer,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  } = session;
~~~~~
~~~~~typescript
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);

  const isSandbox = sessionType === 'sandbox';

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
    setCurrentLevel,
    regenerateQuestion,
    revealAnswer,
    showInspector = false,
    toggleInspector,
    setShowInspector,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  } = session;
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
              <Button
                variant={showInspector ? 'default' : 'ghost'}
                size="iconSm"
                onClick={() => setShowInspector(!showInspector)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground border border-border/40"
                title={t('shell.inspector')}
              >
                <Code className="w-3.5 h-3.5" />
              </Button>
~~~~~
~~~~~typescript
              <Button
                variant={showInspector ? 'default' : 'ghost'}
                size="iconSm"
                onClick={() => toggleInspector?.()}
                className="h-7 w-7 text-muted-foreground hover:text-foreground border border-border/40"
                title={`${t('shell.inspector')} (I)`}
              >
                <Code className="w-3.5 h-3.5" />
              </Button>
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => setShowInspector(false)}
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <pre className="text-foreground/90 p-2 bg-muted/60 rounded-xl overflow-x-auto text-[11px] leading-relaxed select-text">
            {JSON.stringify(session ? (session as unknown as { question?: unknown }).question : null, null, 2)}
          </pre>
        </div>
      )}
~~~~~
~~~~~typescript
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => setShowInspector?.(false)}
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <pre className="text-foreground/90 p-2 bg-muted/60 rounded-xl overflow-x-auto text-[11px] leading-relaxed select-text">
            {JSON.stringify(currentQuestion ?? null, null, 2)}
          </pre>
        </div>
      )}
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
        <div className="text-[10px] text-muted-foreground/40 font-mono tracking-wider">
          Space 提交/下一题 · Esc 退出
        </div>
      </footer>

      {/* 统一结课总结弹窗 (在训练计划流中禁用单卡片弹窗，由外层 PlanSummaryModal 统一承接) */}
      {showSummaryModal && !planContext && (
        <SessionSummaryModal
          card={card}
          sessionType={sessionType}
          elapsedSeconds={elapsedSeconds}
          history={sessionHistory}
          onClose={handleFinishSession}
          onRestart={handleRestartSession}
        />
      )}
~~~~~
~~~~~typescript
        <div className="text-[10px] text-muted-foreground/40 font-mono tracking-wider">
          {isSandbox
            ? 'Space 提交/下一题 · R 换题 · [ / ] 调级 · I 检查器 · Esc 退出'
            : 'Space 提交/下一题 · Esc 退出'}
        </div>
      </footer>

      {/* 统一结课总结弹窗 (在训练计划流或沙盒演练模式中禁用单卡片弹窗) */}
      {showSummaryModal && !planContext && !isSandbox && (
        <SessionSummaryModal
          card={card}
          sessionType={sessionType}
          elapsedSeconds={elapsedSeconds}
          history={sessionHistory}
          onClose={handleFinishSession}
          onRestart={handleRestartSession}
        />
      )}
~~~~~

---

### 下一步建议
1. **沙盒多轨道验证**：可直接在浏览器测试如 `#/train/star_single?type=sandbox` 或 `#/train/color_hue?type=sandbox`，验证在沙盒模式下按 `[` / `]` 调节等级、按 `R` 即时重置题目、按 `I` 开关检查器以及按 `Esc` 退出时不弹出总结弹窗的连贯体验。
2. **复制题目数据快捷操作**：未来可考虑在 Inspector 顶栏增加一键将当前 `currentQuestion` 复制到剪贴板的快捷按钮，便于将特定题目作为测试用例导出。
