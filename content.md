收到，针对分析中确认的几项核心缺陷，我们将按逻辑修复训练计划的生命周期调度、按键冲突以及阶段状态加载时序。

## [WIP] fix: 修复训练计划阶段截断、层阶时序与按键冲突隐患

### 错误分析
1. **最后一题诊断栏强制跳过**: `useTrainingSession` 在达到 `targetLimitTrials` 时，无视 `autoNext` 属性直接调用 `setTimeout` 切换阶段，导致关闭自动切题的用户无法查看最后一题的对错与解析。
2. **多阶段初始难度时序漏洞**: `PlanTrainingView` 切换阶段时未同步重置 `isLevelLoaded`，可能导致短暂沿用上一阶段卡片等级进行初始化的竞态问题。
3. **按键监听与视图冲突**: `PlanStepTransitionOverlay` 弹出时底层 `GenericTrainingView` 仍在接收 Space/Esc 按键事件，容易产生非预期的并发响应。
4. **无效卡片容错缺失**: 计划中若存在失效或已被关闭的 `cardId`，会导致数组索引错位或计划启动直接静默闪退。

### 用户需求
修复训练计划（Training Plan）流转中的上述关键 Bug，确保不同切题偏好下的用户体验平滑、阶段间能力等级准确加载、键盘事件隔离，并具备失效卡片过滤机制。

### 评论
这些修复消除了计划训练主循环中的状态竞态与事件泄露，大幅提升了训练流从启动、过渡到结课的稳定性与鲁棒性。

### 目标
1. 在 `useTrainingSession` 中增加对 `autoNext` 的严格判断，手动切题模式下通过“完成本阶段”显式提交。
2. 在 `PlanTrainingView` 中确保阶段切换时同步锁死 `isLevelLoaded`，并在过渡遮罩激活期间彻底卸载/隐藏底层训练视图。
3. 在 `PlanTrainingView` 与 `PlanEditorModal` 中加入 `validItems` 校验与清洗。

### 基本原理
通过将状态切题与用户意图严格绑定，当 `autoNext` 为 false 时，将阶段完成状态置为 `isFinished`，用户可通过手动点击按钮或按键触发 `handleRequestFinish` -> `onTargetLimitReached`。在过渡状态下进行条件渲染，使 DOM 中同时只存在一个主动按键监听层，避免事件穿透。

### 标签
#intent/fix #flow/ready #priority/high #comp/runtime #concept/state #scope/core #ai/instruct #task/domain/testing #task/object/training-plan-lifecycle #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `useTrainingSession.ts` 中达到题目上限时的自动切题逻辑

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript.old
      if (targetLimitTrials && newTotal >= targetLimitTrials) {
        setIsFinished(true);
        await saveCurrentSession(newTotal, newHits, true);
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = window.setTimeout(() => {
          if (onTargetLimitReached) {
            onTargetLimitReached(updatedHistory);
          } else {
            setShowSummaryModal(true);
          }
        }, autoNextDelay);
      } else if (sessionType === 'benchmark' && newTotal >= 20) {
        setIsFinished(true);
        await saveCurrentSession(newTotal, newHits, true);
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = window.setTimeout(() => {
          setShowSummaryModal(true);
        }, autoNextDelay);
      } else if (autoNext) {
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = window.setTimeout(() => {
          handleNextQuestion();
        }, autoNextDelay);
      }
    },
    [
      questionStartTime,
      evaluateAnswer,
      question,
      isHit,
      totalTrials,
      hitTrials,
      saveTrialRecord,
      getQuestionLevel,
      sessionHistory,
      targetLimitTrials,
      onTargetLimitReached,
      sessionType,
      saveCurrentSession,
      autoNextDelay,
      autoNext,
      handleNextQuestion,
    ],
  );

  const handleRequestFinish = useCallback(async () => {
    if (sessionHistory.length > 0 && !showSummaryModal) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      setShowSummaryModal(true);
    } else {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onExit();
    }
  }, [sessionHistory.length, showSummaryModal, saveCurrentSession, totalTrials, hitTrials, onExit]);
~~~~~
~~~~~typescript.new
      if (targetLimitTrials && newTotal >= targetLimitTrials) {
        setIsFinished(true);
        await saveCurrentSession(newTotal, newHits, true);
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        if (autoNext) {
          autoNextTimerRef.current = window.setTimeout(() => {
            if (onTargetLimitReached) {
              onTargetLimitReached(updatedHistory);
            } else {
              setShowSummaryModal(true);
            }
          }, autoNextDelay);
        }
      } else if (sessionType === 'benchmark' && newTotal >= 20) {
        setIsFinished(true);
        await saveCurrentSession(newTotal, newHits, true);
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        if (autoNext) {
          autoNextTimerRef.current = window.setTimeout(() => {
            setShowSummaryModal(true);
          }, autoNextDelay);
        }
      } else if (autoNext) {
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = window.setTimeout(() => {
          handleNextQuestion();
        }, autoNextDelay);
      }
    },
    [
      questionStartTime,
      evaluateAnswer,
      question,
      isHit,
      totalTrials,
      hitTrials,
      saveTrialRecord,
      getQuestionLevel,
      sessionHistory,
      targetLimitTrials,
      onTargetLimitReached,
      sessionType,
      saveCurrentSession,
      autoNextDelay,
      autoNext,
      handleNextQuestion,
    ],
  );

  const handleRequestFinish = useCallback(async () => {
    if (targetLimitTrials && totalTrials >= targetLimitTrials && onTargetLimitReached) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onTargetLimitReached(sessionHistory);
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
    sessionHistory,
    showSummaryModal,
    saveCurrentSession,
    onExit,
  ]);
~~~~~

#### Acts 2: 优化 `PlanTrainingView.tsx` 阶段切换状态、按键隔离与卡片容错

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript.old
  const currentStep = plan.items[currentStepIndex];
  const currentCard = currentStep ? getCardById(currentStep.cardId) : null;
  const nextStep = plan.items[currentStepIndex + 1];
  const nextCard = nextStep ? getCardById(nextStep.cardId) : null;

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

  // 总计时器
  useEffect(() => {
    const timer = setInterval(() => {
      if (!showSummaryModal) {
        setTotalElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime, showSummaryModal]);

  const handleStageReached = useCallback(
    (history: SessionHistoryItem[]) => {
      if (!currentCard) return;

      const stageRes: PlanStageResult = {
        card: currentCard,
        targetTrials: currentStep.targetTrials,
        history,
      };

      setStageResults((prev) => [...prev, stageRes]);

      if (currentStepIndex + 1 < plan.items.length) {
        setIsTransitioning(true);
      } else {
        setShowSummaryModal(true);
      }
    },
    [currentCard, currentStep, currentStepIndex, plan.items.length],
  );

  const handleProceedNextStage = useCallback(() => {
    setIsTransitioning(false);
    setCurrentStepIndex((prev) => prev + 1);
  }, []);

  const handleRestartPlan = useCallback(() => {
    setShowSummaryModal(false);
    setIsTransitioning(false);
    setCurrentStepIndex(0);
    setStageResults([]);
    setTotalElapsedSeconds(0);
    setSessionStartTime(Date.now());
  }, []);

  if (!currentCard || !plan.items || plan.items.length === 0) {
    onExit();
    return null;
  }

  const plugin = CARD_PLUGINS[currentCard.id];
  const cardConfig = getCardSettings(settings, currentCard.id);

  return (
    <div className="w-full">
      {/* 顶部流水线全局进度 */}
      <div className="max-w-5xl mx-auto mb-4 bg-indigo-900 text-white px-5 py-3 rounded-2xl shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-black bg-indigo-600 px-2.5 py-1 rounded-xl">
            阶段 {currentStepIndex + 1} / {plan.items.length}
          </span>
          <span className="text-xs font-bold text-indigo-100">{plan.name}</span>
        </div>

        <div className="text-xs text-indigo-200 font-mono font-bold">
          本阶段目标: {currentStep.targetTrials} 题
        </div>
      </div>

      {!isLevelLoaded ? (
        <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          正在加载【{currentCard.title}】的生涯能力层阶...
        </div>
      ) : (
        <GenericTrainingView
          key={`plan-stage-${currentStepIndex}-${currentCard.id}`}
          card={currentCard}
          plugin={plugin}
          sessionType="training"
          initialLevel={stageInitialLevel}
          settings={cardConfig}
          globalSettings={settings.global}
          targetLimitTrials={currentStep.targetTrials}
          onTargetLimitReached={handleStageReached}
          onExit={onExit}
        />
      )}

      {isTransitioning && nextCard && (
        <PlanStepTransitionOverlay
          completedCard={currentCard}
          nextCard={nextCard}
          completedStepIndex={currentStepIndex}
          totalSteps={plan.items.length}
          onProceed={handleProceedNextStage}
          onExit={onExit}
        />
      )}

      {showSummaryModal && (
        <PlanSummaryModal
          planName={plan.name}
          stageResults={stageResults}
          totalElapsedSeconds={totalElapsedSeconds}
          onClose={onExit}
          onRestart={handleRestartPlan}
        />
      )}
    </div>
  );
~~~~~
~~~~~typescript.new
  // 过滤无效或不存在的卡片，提供安全保障
  const validItems = (plan.items || []).filter((item) => Boolean(getCardById(item.cardId)));

  const currentStep = validItems[currentStepIndex];
  const currentCard = currentStep ? getCardById(currentStep.cardId) : null;
  const nextStep = validItems[currentStepIndex + 1];
  const nextCard = nextStep ? getCardById(nextStep.cardId) : null;

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

  // 总计时器
  useEffect(() => {
    const timer = setInterval(() => {
      if (!showSummaryModal) {
        setTotalElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime, showSummaryModal]);

  const handleStageReached = useCallback(
    (history: SessionHistoryItem[]) => {
      if (!currentCard) return;

      const stageRes: PlanStageResult = {
        card: currentCard,
        targetTrials: currentStep.targetTrials,
        history,
      };

      setStageResults((prev) => [...prev, stageRes]);

      if (currentStepIndex + 1 < validItems.length) {
        setIsTransitioning(true);
      } else {
        setShowSummaryModal(true);
      }
    },
    [currentCard, currentStep, currentStepIndex, validItems.length],
  );

  const handleProceedNextStage = useCallback(() => {
    setIsLevelLoaded(false);
    setIsTransitioning(false);
    setCurrentStepIndex((prev) => prev + 1);
  }, []);

  const handleRestartPlan = useCallback(() => {
    setIsLevelLoaded(false);
    setShowSummaryModal(false);
    setIsTransitioning(false);
    setCurrentStepIndex(0);
    setStageResults([]);
    setTotalElapsedSeconds(0);
    setSessionStartTime(Date.now());
  }, []);

  if (!currentCard || validItems.length === 0) {
    onExit();
    return null;
  }

  const plugin = CARD_PLUGINS[currentCard.id];
  const cardConfig = getCardSettings(settings, currentCard.id);

  return (
    <div className="w-full">
      {/* 顶部流水线全局进度 */}
      <div className="max-w-5xl mx-auto mb-4 bg-indigo-900 text-white px-5 py-3 rounded-2xl shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-black bg-indigo-600 px-2.5 py-1 rounded-xl">
            阶段 {currentStepIndex + 1} / {validItems.length}
          </span>
          <span className="text-xs font-bold text-indigo-100">{plan.name}</span>
        </div>

        <div className="text-xs text-indigo-200 font-mono font-bold">
          本阶段目标: {currentStep.targetTrials} 题
        </div>
      </div>

      {isTransitioning && nextCard ? (
        <PlanStepTransitionOverlay
          completedCard={currentCard}
          nextCard={nextCard}
          completedStepIndex={currentStepIndex}
          totalSteps={validItems.length}
          onProceed={handleProceedNextStage}
          onExit={onExit}
        />
      ) : !isLevelLoaded ? (
        <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          正在加载【{currentCard.title}】的生涯能力层阶...
        </div>
      ) : (
        <GenericTrainingView
          key={`plan-stage-${currentStepIndex}-${currentCard.id}`}
          card={currentCard}
          plugin={plugin}
          sessionType="training"
          initialLevel={stageInitialLevel}
          settings={cardConfig}
          globalSettings={settings.global}
          targetLimitTrials={currentStep.targetTrials}
          onTargetLimitReached={handleStageReached}
          onExit={onExit}
        />
      )}

      {showSummaryModal && (
        <PlanSummaryModal
          planName={plan.name}
          stageResults={stageResults}
          totalElapsedSeconds={totalElapsedSeconds}
          onClose={onExit}
          onRestart={handleRestartPlan}
        />
      )}
    </div>
  );
~~~~~

#### Acts 3: 优化 `PlanEditorModal.tsx` 中无效卡片过滤保护

~~~~~act
patch_file
src/components/plan/PlanEditorModal.tsx
~~~~~
~~~~~typescript.old
  const handleSave = () => {
    onSave(plan);
    onClose();
  };

  const totalTrials = plan.items.reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));
~~~~~
~~~~~typescript.new
  const handleSave = () => {
    // 过滤掉无效引用的卡片阶段后保存
    const sanitizedPlan: TrainingPlan = {
      ...plan,
      items: plan.items.filter((item) => Boolean(getCardById(item.cardId))),
    };
    onSave(sanitizedPlan);
    onClose();
  };

  const validPlanItems = plan.items.filter((item) => Boolean(getCardById(item.cardId)));
  const totalTrials = validPlanItems.reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));
~~~~~

### 下一步建议
1. **运行项目验证**: 启动本地环境或执行单元测试，验证计划阶段切题、过渡弹窗以及手动答题下的状态结算。
2. **测试用例补充**: 针对 `useTrainingSession` 的 `targetLimitTrials` 与 `autoNext: false` 联动行为编写测试用例，确保无回归。
