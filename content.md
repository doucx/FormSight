你的分析非常准确。为了彻底解决训练中途退出、总结弹窗等级不一致以及“再练一轮”重置回初始难度的问题，我们将按照以下方案进行重构：

1. **引擎终态透出**：在 `useTrainingSession` 中显式暴露出引擎计算出的最终等级 `finalLevel`（即扣分或加分后的真实最终难度），并在 `SessionSummaryModal` 中直接使用该终态等级进行结算展示与层阶对比。
2. **平滑重置逻辑**：修改 `handleRestartSession`，使“再练一轮”时默认**继承当前刚练完的水平**（`adaptiveEngineRef.current.getCurrentLevel()`），而不是生硬地回滚到组件挂载时的 `initialLevel`。
3. **状态对齐与闭环**：确保总结弹窗和 Header、外部看板的难度数据保持完全一致。

下面是执行此修复的 Quipu 计划。

---

我们将通过精确修改 `useTrainingSession.ts`、`SessionSummaryModal.tsx` 以及 `TrainingShell.tsx` 来修复训练总结与难度同步的问题。

## [WIP] fix(training): 修复训练总结等级滞后与再练一轮重置逻辑

### 用户需求
用户在完成或中途退出自适应训练时，总结弹窗中显示的结束难度滞后于实际动态调整结果（未计入最后一题答错/答对的即时调整），且点击“再练一轮”时难度被错误地重置为了初始入场难度而非当前最新掌握难度。

### 评论
这是一个对自适应训练闭环体验至关重要的状态同步修复。通过直接由 `AdaptiveEngine` 暴露出最终稳定等级，并优化重置行为，使训练流更加符合直觉。

### 目标
1. 在 `useTrainingSession` 返回值中增加 `finalLevel`。
2. 优化 `handleRestartSession`，使得再练一轮时平滑继承当前等级。
3. 让 `SessionSummaryModal` 接收并展示真实的终态难度，计算正确的层阶演进。

### 基本原理
直接利用状态机（`AdaptiveEngine`）的实时内存状态作为唯一可信源（Source of Truth），避免通过最后一题历史记录反推状态导致的偏差。

### 标签
#intent/fix #flow/ready #priority/medium #comp/runtime #concept/state #scope/core #ai/instruct #task/domain/training #task/object/session-summary #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修改 useTrainingSession 暴露 finalLevel 并优化重置逻辑

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript.old
  const handleRestartSession = useCallback(() => {
    setShowSummaryModal(false);
    setIsFinished(false);
    setIsIdle(false);
    idleStartRef.current = null;
    setTotalTrials(0);
    setHitTrials(0);
    setSessionHistory([]);
    setShowAnswer(false);
    setUserAnswer(null);
    streakRef.current = 0;
    sessionIdRef.current = `${domain}_${mode}_session_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    adaptiveEngineRef.current.setLevel(initialLevel);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(nextLevel));
    setQuestionStartTime(Date.now());
  }, [domain, mode, initialLevel, generateQuestion]);
~~~~~
~~~~~typescript.new
  const handleRestartSession = useCallback(() => {
    setShowSummaryModal(false);
    setIsFinished(false);
    setIsIdle(false);
    idleStartRef.current = null;
    setTotalTrials(0);
    setHitTrials(0);
    setSessionHistory([]);
    setShowAnswer(false);
    setUserAnswer(null);
    streakRef.current = 0;
    sessionIdRef.current = `${domain}_${mode}_session_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    // 保持当前掌握的难度等级连贯性，若需重置可按需调整
    const currentLevel = adaptiveEngineRef.current.getCurrentLevel();
    adaptiveEngineRef.current.setLevel(currentLevel);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(nextLevel));
    setQuestionStartTime(Date.now());
  }, [domain, mode, generateQuestion]);
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript.old
  return {
    question,
    showAnswer,
    userAnswer,
    totalTrials,
    hitTrials,
    elapsedSeconds,
    isFinished,
    isIdle,
    sessionHistory,
    showSummaryModal,
    resumeFromIdle,
    pauseToIdle,
    handleAnswer,
    handleNextQuestion,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  };
}
~~~~~
~~~~~typescript.new
  return {
    question,
    showAnswer,
    userAnswer,
    totalTrials,
    hitTrials,
    elapsedSeconds,
    isFinished,
    isIdle,
    sessionHistory,
    showSummaryModal,
    finalLevel: adaptiveEngineRef.current.getCurrentLevel(),
    resumeFromIdle,
    pauseToIdle,
    handleAnswer,
    handleNextQuestion,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  };
}
~~~~~

#### Acts 2: 更新 SessionSummaryModal 与 TrainingShell 传递真实终态难度

~~~~~act
patch_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~typescript.old
export interface SessionHistoryItem {
  trialIndex: number;
  level: number;
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const totalTrials = history.length;
  const hitCount = history.filter((h) => h.isHit).length;
  const accuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;

  const startLevel = history.length > 0 ? history[0].level : 5;
  const endLevel = history.length > 0 ? history[history.length - 1].level : 5;
  const levelDiff = endLevel - startLevel;
~~~~~
~~~~~typescript.new
export interface SessionHistoryItem {
  trialIndex: number;
  level: number;
  isHit: boolean;
  responseTimeMs: number;
}

interface SessionSummaryModalProps {
  card: CardDefinition;
  sessionType: 'training' | 'benchmark';
  elapsedSeconds: number;
  history: SessionHistoryItem[];
  endLevel?: number;
  onClose: () => void;
  onRestart: () => void;
}

export function SessionSummaryModal({
  card,
  sessionType,
  elapsedSeconds,
  history,
  endLevel: propEndLevel,
  onClose,
  onRestart,
}: SessionSummaryModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const totalTrials = history.length;
  const hitCount = history.filter((h) => h.isHit).length;
  const accuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;

  const startLevel = history.length > 0 ? history[0].level : 5;
  const endLevel = propEndLevel ?? (history.length > 0 ? history[history.length - 1].level : startLevel);
  const levelDiff = endLevel - startLevel;
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
tsx.old
~~~~~typescript.old
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
~~~~~typescript.new
      {/* 统一结课总结弹窗 */}
      {showSummaryModal && (
        <SessionSummaryModal
          card={card}
          sessionType={sessionType}
          elapsedSeconds={elapsedSeconds}
          history={sessionHistory}
          endLevel={session.finalLevel}
          onClose={handleFinishSession}
          onRestart={handleRestartSession}
        />
      )}
    </div>
  );
}
~~~~~

### 下一步建议
我们已经完成了训练总结弹窗的终态难度对齐与再练一轮的连贯性优化。建议执行 `npm run test` 或启动开发服务器进行验证。
