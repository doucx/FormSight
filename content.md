我将生成一个 Quipu 修复计划，针对分析出的训练计划多阶段切换卡死、键盘快捷键双重监听竞态、以及训练会话状态重置不彻底等问题进行精准修复。

## [WIP] fix: 修复训练计划阶段推进卡死与按键状态异常

### 错误分析

1. **同模块多阶段切换卡死**：`PlanTrainingView.tsx` 中用于重新异步读取卡片等级的 `useEffect` 依赖项仅为 `[currentCard]`。当训练计划中包含连续同种卡片或同一卡片重复编排时，`currentCard` 引用未发生改变，导致 `useEffect` 不触发，`isLevelLoaded` 状态永远停留在 `false`，界面永久阻断在加载提示。
2. **快捷键双重监听导致重复提交**：在 `AbstractionCanvas.tsx` 中，外部组件与内部 `Choice2AfcContainer` 均注册了全局 `1`/`2` 键监听，导致在 2AFC 题型下单次按键会触发两次 `onAnswer` 并发调用，出现跳题、双重扣/加分和多次触发音效。
3. **关闭自动切题时无法按空格结束/推进**：`useTrainingSession.ts` 在 `isFinished === true` 时直接忽略空格键，导致用户无法通过纯键盘流进入总结或下一阶段。
4. **再练一轮时自适应引擎状态未完全重置**：`useTrainingSession.ts` 的 `handleRestartSession` 未调用 `AdaptiveEngine.setLevel`，遗留了上一轮未完成的做题历史或连胜计数。
5. **今日数据统计 Key 容错不严**：`useTodayStats.ts` 统计聚合时直接回退到 `r.mode`，与看板使用的标准 `card.id` 存在潜在键名脱节。

### 用户需求

修复训练计划在各种卡片编排与配置下的运行缺陷，确保多阶段无缝流转、快捷键操作幂等且符合预期、会话重置彻底。

### 评论

训练计划（Plan）作为核心串联工作流，对阶段流转和状态复位的确定性要求极高。修复这些边界条件能极大提升训练心流与系统稳健性。

### 目标

1. 修复 `PlanTrainingView.tsx` 中的等级加载依赖，使其在同卡片连续切换时能正确重新加载并解除遮罩。
2. 禁用 `AbstractionCanvas.tsx` 中 `Choice2AfcContainer` 的内置按键监听，由画布统一管理全局快捷键，消除双重触发。
3. 优化 `useTrainingSession.ts` 中的空格键逻辑，在阶段完成时允许按空格进入总结/下一阶段。
4. 在 `useTrainingSession.ts` 的 `handleRestartSession` 中重置 `AdaptiveEngine` 内部状态。
5. 强化 `useTodayStats.ts` 聚合逻辑，确保历史记录精准映射到卡片标准 ID。

### 基本原理

1. 通过在 `PlanTrainingView.tsx` 的 `useEffect` 依赖项中追加 `currentStepIndex`，确保即使卡片相同，只要步骤索引变化也会强制触发等级重新读取与状态复位。
2. 为 `AbstractionCanvas.tsx` 中的 `Choice2AfcContainer` 显式设置 `enableKeyboardShortcuts={false}`，使按键事件收敛于单一监听器。
3. 在 `useTrainingSession.ts` 的 keydown 处理函数中，当 `showAnswer === true` 且 `isFinished === true` 时，将空格行为路由至 `handleRequestFinish()`。
4. 在 `handleRestartSession` 中显式调用 `adaptiveEngineRef.current.setLevel(initialLevel)` 清空 `blockHistory` 与 `consecutiveCorrect`。
5. 引入 `ALL_CARDS` 对今日记录的 `cardId` 与 `mode` 进行规范化对齐。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/state #scope/core #ai/instruct #task/domain/runtime #task/object/training-plan-and-session #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `PlanTrainingView.tsx` 中的阶段监听依赖

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript.old
  // 严格加载当前卡片的生涯真实等级后再允许渲染训练器
  useEffect(() => {
    let isMounted = true;
    if (currentCard) {
      setIsLevelLoaded(false);
      getProfile(currentCard.id).then((p) => {
        if (!isMounted) return;
        setStageInitialLevel(p?.currentLevel || 5);
        setIsLevelLoaded(true);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [currentCard]);
~~~~~
~~~~~typescript.new
  // 严格加载当前卡片的生涯真实等级后再允许渲染训练器
  useEffect(() => {
    let isMounted = true;
    if (currentCard) {
      setIsLevelLoaded(false);
      getProfile(currentCard.id).then((p) => {
        if (!isMounted) return;
        setStageInitialLevel(p?.currentLevel || 5);
        setIsLevelLoaded(true);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [currentCard, currentStepIndex]);
~~~~~

#### Acts 2: 修复 `AbstractionCanvas.tsx` 中 2AFC 容器的快捷键冲突

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript.old
        {/* 双卡片候选区 */}
        <Choice2AfcContainer
          optionA={{
            key: 'A',
            title: '区域 A (键 1)',
            isCorrect: isTargetA,
            content: (
              <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                <canvas
                  ref={canvasRefA}
                  width={ABSTRACTION_2AFC_SIZE}
                  height={ABSTRACTION_2AFC_SIZE}
                  className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
                />
              </div>
            ),
          }}
          optionB={{
            key: 'B',
            title: '区域 B (键 2)',
            isCorrect: isTargetB,
            content: (
              <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                <canvas
                  ref={canvasRefB}
                  width={ABSTRACTION_2AFC_SIZE}
                  height={ABSTRACTION_2AFC_SIZE}
                  className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
                />
              </div>
            ),
          }}
          selectedChoice={selectedChoice}
          showAnswer={showAnswer}
          disabled={disabled}
          onSelect={handleSelectChoice}
        />
~~~~~
~~~~~typescript.new
        {/* 双卡片候选区 */}
        <Choice2AfcContainer
          optionA={{
            key: 'A',
            title: '区域 A (键 1)',
            isCorrect: isTargetA,
            content: (
              <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                <canvas
                  ref={canvasRefA}
                  width={ABSTRACTION_2AFC_SIZE}
                  height={ABSTRACTION_2AFC_SIZE}
                  className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
                />
              </div>
            ),
          }}
          optionB={{
            key: 'B',
            title: '区域 B (键 2)',
            isCorrect: isTargetB,
            content: (
              <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                <canvas
                  ref={canvasRefB}
                  width={ABSTRACTION_2AFC_SIZE}
                  height={ABSTRACTION_2AFC_SIZE}
                  className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
                />
              </div>
            ),
          }}
          selectedChoice={selectedChoice}
          showAnswer={showAnswer}
          disabled={disabled}
          enableKeyboardShortcuts={false}
          onSelect={handleSelectChoice}
        />
~~~~~

#### Acts 3: 优化 `useTrainingSession.ts` 快捷键推进与重置逻辑

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
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(nextLevel));
    setQuestionStartTime(Date.now());
  }, [domain, mode, generateQuestion]);
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
    adaptiveEngineRef.current.setLevel(initialLevel);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(nextLevel));
    setQuestionStartTime(Date.now());
  }, [domain, mode, initialLevel, generateQuestion]);
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript.old
      if (e.code === 'Space' || e.key === ' ') {
        if (showAnswer && !isFinished) {
          e.preventDefault();
          handleNextQuestion();
        }
      } else if (e.code === 'Escape' || e.key === 'Escape') {
~~~~~
~~~~~typescript.new
      if (e.code === 'Space' || e.key === ' ') {
        if (showAnswer) {
          e.preventDefault();
          if (!isFinished) {
            handleNextQuestion();
          } else {
            handleRequestFinish();
          }
        }
      } else if (e.code === 'Escape' || e.key === 'Escape') {
~~~~~

#### Acts 4: 强化 `useTodayStats.ts` 统计聚合键名对齐

~~~~~act
patch_file
src/hooks/useTodayStats.ts
~~~~~
~~~~~typescript.old
import { useEffect, useState } from 'preact/hooks';
import { type TrainingDomain, getTrialRecords } from '../utils/db';

export function useTodayStats(domain?: TrainingDomain) {
  const [todayStats, setTodayStats] = useState<Record<string, { count: number; timeMs: number }>>(
    {},
  );

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      const records = await getTrialRecords(domain);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const stats: Record<string, { count: number; timeMs: number }> = {};

      for (const r of records) {
        if (r.timestamp >= startOfToday) {
          const key = r.cardId || r.mode;
          if (!stats[key]) {
            stats[key] = { count: 0, timeMs: 0 };
          }
          stats[key].count += 1;
          stats[key].timeMs += (r.responseTimeMs as number) || 0;
        }
      }
~~~~~
~~~~~typescript.new
import { useEffect, useState } from 'preact/hooks';
import { ALL_CARDS } from '../config/cards';
import { type TrainingDomain, getTrialRecords } from '../utils/db';

export function useTodayStats(domain?: TrainingDomain) {
  const [todayStats, setTodayStats] = useState<Record<string, { count: number; timeMs: number }>>(
    {},
  );

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      const records = await getTrialRecords(domain);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const stats: Record<string, { count: number; timeMs: number }> = {};

      for (const r of records) {
        if (r.timestamp >= startOfToday) {
          const matchedCard = ALL_CARDS.find(
            (c) => c.id === r.cardId || (c.domain === r.domain && c.mode === r.mode),
          );
          const key = matchedCard ? matchedCard.id : r.cardId || r.mode;
          if (!stats[key]) {
            stats[key] = { count: 0, timeMs: 0 };
          }
          stats[key].count += 1;
          stats[key].timeMs += (r.responseTimeMs as number) || 0;
        }
      }
~~~~~

### 下一步建议

- 运行测试套件验证修改：执行 `npm test` 确认各模块与自适应测试通过。
- 视网膜屏幕高清优化：若需进一步增强视觉体验，可将 `drawPolygonCanvas` 的渲染上下文全面升级接入 `setupHiDpiCanvas`。
