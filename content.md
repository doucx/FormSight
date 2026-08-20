你的观察非常敏锐！这确实是由于保存时机与参数传递产生的数据同步滞后问题。

### 错误分析

1. **执行顺序问题**：在 `useTrainingSession.ts` 中，`saveTrialRecord` 是在 `adaptiveEngine.recordResult(hit)` 之前执行的。
2. **等级传参偏差**：`saveTrialRecord` 传入的 `difficultyLevel` 是当前这道题被生成时的静态等级（例如第 10 题生成时的 L5）。
3. **数据库更新机制**：`saveTrialRecord` 内部会调用 `updateProfile` 将传入的 `record.difficultyLevel` 写入用户的生涯档案 `user_profiles`。在第 10 题答完后，尽管自适应算子已经计算出通关升阶（如升至 L8），但写入数据库的依然是旧的 L5。只有到了第 11 题生成并答题时，第 11 题的难度 L8 才被写入档案。
4. **中断丢失风险**：如果用户正好在第 10 题做完并升阶后退出，其生涯档案中的等级仍停留在旧等级。

---

## [WIP] fix: 修复自适应升降阶后最新能力等级未即时持久化的问题

### 错误分析
在 `handleAnswer` 中，`saveTrialRecord` 在自适应引擎计算新等级前被调用，且写入 `user_profiles` 的是当前题目的静态难度等级而非自适应引擎结算后的最新等级，导致升降阶结果滞后至下一题才被存盘。

### 用户需求
当用户做完特定题目触发自适应升降阶（例如轮次评估第 10 题通关升阶，或 3U1D 连续 3 题击中升阶）时，最新的能力等级（`currentLevel` 与 `bestLevel`）必须在当前题目判定的瞬间立即同步持久化到数据库中。

### 评论
该修复保证了自适应能力评级数据的即时原子性，杜绝了“界面已升阶、刷新或退出后等级未保存”的数据不一致现象。

### 目标
1. 调整 `src/hooks/useTrainingSession.ts` 中的答题结算流程：先执行 `adaptiveEngine.recordResult(hit)` 计算最新等级，再将最新等级透传至保存逻辑。
2. 更新 `src/views/GenericTrainingView.tsx` 与 `src/utils/db/queries.ts`，区分**单题发生的历史难度**（`record.difficultyLevel`）与**生涯档案最新能力等级**（`profile.currentLevel`），并在每题判定后即时更新档案与 Session。

### 基本原理
- 保持 `records` 表中的 `record.difficultyLevel` 忠实记录该题出现时的真实难度。
- 在 `saveTrialRecord` 回调中额外传入 `currentProfileLevel: adaptiveEngine.getCurrentLevel()`，确保 `updateProfile` 写入的是该题判定完成后自适应引擎产出的最新能力等级。

### 标签
#intent/fix #flow/ready #priority/high #comp/runtime #concept/state #scope/core #ai/instruct #task/domain/adaptive #task/object/level-persistence #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 更新数据库保存接口支持传入最新能力等级

修改 `src/utils/db/queries.ts`，让 `saveTrialRecord` 能够接收并更新自适应引擎最新的 `currentProfileLevel`。

~~~~~act
patch_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript.old
export async function saveTrialRecord(record: UnifiedTrialRecord): Promise<void> {
  const db = await getDB();
  const domain = record.domain || 'star';
  const cardId = record.cardId || record.mode;
  const normalizedRecord: UnifiedTrialRecord = { ...record, domain, cardId };
  await db.put('records', normalizedRecord);
  await updateProfile(cardId, domain, record.mode, record.isHit, record.difficultyLevel);
}
~~~~~
~~~~~typescript.new
export async function saveTrialRecord(
  record: UnifiedTrialRecord,
  currentProfileLevel?: number,
): Promise<void> {
  const db = await getDB();
  const domain = record.domain || 'star';
  const cardId = record.cardId || record.mode;
  const normalizedRecord: UnifiedTrialRecord = { ...record, domain, cardId };
  await db.put('records', normalizedRecord);
  const targetProfileLevel = currentProfileLevel ?? record.difficultyLevel;
  await updateProfile(cardId, domain, record.mode, record.isHit, targetProfileLevel);
}
~~~~~

#### Acts 2: 调整 `useTrainingSession.ts` 答题即时结算与等级传递

修改 `src/hooks/useTrainingSession.ts`，在答题时先计算自适应最新状态，再将最新等级同步存盘。

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript.old
export interface UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal> {
  domain: string;
  mode: string;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  autoNext: boolean;
  autoNextDelay: number;
  stepGranularity?: StepGranularity;
  adaptiveMode?: AdaptiveMode;
  targetAccuracy?: number;
  blockSize?: number;
  idleTimeoutSec?: number;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  generateQuestion: (level: number) => TQuestion;
  evaluateAnswer: (userVal: TAnswerVal, question: TQuestion) => THitResult;
  isHit: (hitResult: THitResult) => boolean;
  getQuestionLevel: (question: TQuestion) => number;
  saveTrialRecord: (params: {
    sessionId: string;
    question: TQuestion;
    hitResult: THitResult;
    responseTimeMs: number;
    userVal: TAnswerVal;
  }) => Promise<void>;
  saveSession: (params: {
    sessionId: string;
    totalTrials: number;
    hitTrials: number;
    ended: boolean;
    startTimestamp: number;
    endLevel: number;
  }) => Promise<void>;
  onExit: () => void;
}
~~~~~
~~~~~typescript.new
export interface UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal> {
  domain: string;
  mode: string;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  autoNext: boolean;
  autoNextDelay: number;
  stepGranularity?: StepGranularity;
  adaptiveMode?: AdaptiveMode;
  targetAccuracy?: number;
  blockSize?: number;
  idleTimeoutSec?: number;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  generateQuestion: (level: number) => TQuestion;
  evaluateAnswer: (userVal: TAnswerVal, question: TQuestion) => THitResult;
  isHit: (hitResult: THitResult) => boolean;
  getQuestionLevel: (question: TQuestion) => number;
  saveTrialRecord: (params: {
    sessionId: string;
    question: TQuestion;
    hitResult: THitResult;
    responseTimeMs: number;
    userVal: TAnswerVal;
    currentProfileLevel: number;
  }) => Promise<void>;
  saveSession: (params: {
    sessionId: string;
    totalTrials: number;
    hitTrials: number;
    ended: boolean;
    startTimestamp: number;
    endLevel: number;
  }) => Promise<void>;
  onExit: () => void;
}
~~~~~
~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript.old
      const newTotal = totalTrials + 1;
      const newHits = hitTrials + (hit ? 1 : 0);
      setTotalTrials(newTotal);
      setHitTrials(newHits);

      await saveTrialRecord({
        sessionId: sessionIdRef.current,
        question,
        hitResult,
        responseTimeMs,
        userVal,
      });

      const nextHistoryItem: SessionHistoryItem = {
        trialIndex: newTotal,
        level: getQuestionLevel(question),
        isHit: hit,
        responseTimeMs,
      };

      const updatedHistory = [...sessionHistory, nextHistoryItem];
      setSessionHistory(updatedHistory);

      adaptiveEngineRef.current.recordResult(hit);

      if (targetLimitTrials && newTotal >= targetLimitTrials) {
        setIsFinished(true);
        await saveCurrentSession(newTotal, newHits, true);
~~~~~
~~~~~typescript.new
      const newTotal = totalTrials + 1;
      const newHits = hitTrials + (hit ? 1 : 0);
      setTotalTrials(newTotal);
      setHitTrials(newHits);

      // 先执行自适应算子，获取答完该题后的最新能力等级
      adaptiveEngineRef.current.recordResult(hit);
      const latestLevel = adaptiveEngineRef.current.getCurrentLevel();

      await saveTrialRecord({
        sessionId: sessionIdRef.current,
        question,
        hitResult,
        responseTimeMs,
        userVal,
        currentProfileLevel: latestLevel,
      });

      const nextHistoryItem: SessionHistoryItem = {
        trialIndex: newTotal,
        level: getQuestionLevel(question),
        isHit: hit,
        responseTimeMs,
      };

      const updatedHistory = [...sessionHistory, nextHistoryItem];
      setSessionHistory(updatedHistory);

      if (targetLimitTrials && newTotal >= targetLimitTrials) {
        setIsFinished(true);
        await saveCurrentSession(newTotal, newHits, true);
~~~~~

#### Acts 3: 更新 `GenericTrainingView.tsx` 适配新参数

修改 `src/views/GenericTrainingView.tsx`，将 `currentProfileLevel` 传递给持久化层。

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript.old
    saveTrialRecord: async ({ sessionId, question: q, hitResult, responseTimeMs, userVal }) => {
      await saveTrialRecord({
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        cardId: card.id,
        domain,
        mode,
        timestamp: Date.now(),
        difficultyLevel: adapter.getQuestionLevel(q),
        isHit: adapter.isHit(hitResult),
        responseTimeMs,
        details: adapter.extractRecordDetails(q, hitResult, userVal, mode),
      });
    },
~~~~~
~~~~~typescript.new
    saveTrialRecord: async ({
      sessionId,
      question: q,
      hitResult,
      responseTimeMs,
      userVal,
      currentProfileLevel,
    }) => {
      await saveTrialRecord(
        {
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sessionId,
          cardId: card.id,
          domain,
          mode,
          timestamp: Date.now(),
          difficultyLevel: adapter.getQuestionLevel(q),
          isHit: adapter.isHit(hitResult),
          responseTimeMs,
          details: adapter.extractRecordDetails(q, hitResult, userVal, mode),
        },
        currentProfileLevel,
      );
    },
~~~~~

### 下一步建议
- **测试验证**：
  1. 开启任意自适应训练（默认 10 题/轮评估模式）。
  2. 连续做完第 10 题并观察升阶后，立即按 `Esc` 退出到主页或直接刷新页面。
  3. 检查卡片上的“能力层阶 Level”是否已实时更新为第 10 题升阶后的最新等级，确认数据已实时入库。
