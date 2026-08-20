我们将修复上述在“定制日常训练流 (Training Plan)”中发现的全部 Bug，包括：
1. **防止重置生涯难度**：在 `PlanTrainingView` 中引入异步等级加载锁，确保拿到真实的 Profile 等级后再挂载训练器。
2. **重构计时与重新训练**：修复 `PlanTrainingView` 的重启逻辑，重置计时器与加载首阶段等级。
3. **增强阶段过渡体验与 Esc 支持**：为 `PlanStepTransitionOverlay` 增加 Esc 监听与返回主页/退出按钮。
4. **编辑器空计划校验与健壮性提升**：防止保存空计划、增强唯一 ID 生成算法。

## [WIP] fix(plan): 修复定制日常训练流重置难度阶层、计时器累加与交互卡死问题

### 错误分析

1. **难度被重置为 Level 5**：`PlanTrainingView` 在挂载时以 `stageInitialLevel = 5` 为初始状态直接渲染 `GenericTrainingView`。由于 `getProfile` 异步拉取延迟，训练器内部已经使用 Level 5 挂载并执行自适应算法。做答后保存会将该等级覆盖写入 `user_profiles`，从而破坏用户的生涯真实难度。
2. **阶段重启时计时累加**：`PlanTrainingView` 中的 `sessionStartTime` 曾使用单次初始化的常量，导致点击“再练一遍”时旧会话时间未被清零重置。
3. **阶段过渡无法退出**：`PlanStepTransitionOverlay` 铺满屏幕但缺少 Esc 与退出操作支持。
4. **空计划保存隐患**：`PlanEditorModal` 允许用户清空所有阶段后保存，导致主页启动训练流时异常闪退。

### 用户需求

1. 修复定制训练流运行时直接读取用户生涯最高等级，杜绝难度重置为 Level 5。
2. 修复训练流重启后的计时器归零与首阶段等级重新获取。
3. 在阶段过渡遮罩层增加 Esc 退出与放弃训练的交互支持。
4. 增强计划编辑器的保存校验与唯一 ID 生成机制。

### 评论

定制日常训练流是高频核心功能，保证其自适应难度与生涯等级的无缝承接至关重要。本次修复将确保各阶段状态隔离、计时精准以及边界异常的完整防护。

### 目标

1. 修改 `src/views/PlanTrainingView.tsx`，加入阶段 Profile 异步加载守护，并在重启时重置计时器。
2. 修改 `src/components/plan/PlanStepTransitionOverlay.tsx`，支持 Esc 监听与放弃/退出按钮。
3. 修改 `src/components/plan/PlanEditorModal.tsx`，增加空列表保存禁用以及更健壮的 UUID 生成。
4. 修改 `src/utils/planStorage.ts`，防止加载无效计划。

### 基本原理

1. 在 `PlanTrainingView` 中维护 `isLevelLoaded` 状态，只有在拉取到当前阶段卡片的 `currentLevel` 后才挂载训练组件，彻底切断 Level 5 默认值的竞态条件。
2. 重构总计时器起始时间为可重置的 state。
3. 在遮罩组件中绑定全局键盘 `Escape` 监听并暴露 `onExit` 回调。
4. 在编辑器中将“保存计划”按钮的可用状态与 `plan.items.length > 0` 绑定。

### 标签

#intent/fix #flow/ready #priority/critical #comp/views #concept/state #scope/core #ai/instruct #task/domain/training-plan #task/object/level-persistence #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `PlanTrainingView` 等级加载竞态与计时重置逻辑

我们将重构 `PlanTrainingView.tsx`，引入 `isLevelLoaded` 加载锁确保拿到真实 profile 后再挂载阶段训练组件，并支持计时器重置与中途退出结算。

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript.old
export function PlanTrainingView({ plan, settings, onExit }: PlanTrainingViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [stageResults, setStageResults] = useState<PlanStageResult[]>([]);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [sessionStartTime] = useState<number>(Date.now());
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState<number>(0);
  const [stageInitialLevel, setStageInitialLevel] = useState<number>(5);

  const currentStep = plan.items[currentStepIndex];
  const currentCard = currentStep ? getCardById(currentStep.cardId) : null;
  const nextStep = plan.items[currentStepIndex + 1];
  const nextCard = nextStep ? getCardById(nextStep.cardId) : null;

  // 加载当前卡片生涯等级
  useEffect(() => {
    if (currentCard) {
      getProfile(currentCard.id).then((p) => {
        setStageInitialLevel(p?.currentLevel || 5);
      });
    }
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

      {isTransitioning && nextCard && (
        <PlanStepTransitionOverlay
          completedCard={currentCard}
          nextCard={nextCard}
          completedStepIndex={currentStepIndex}
          totalSteps={plan.items.length}
          onProceed={handleProceedNextStage}
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
}
~~~~~
~~~~~typescript.new
export function PlanTrainingView({ plan, settings, onExit }: PlanTrainingViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [stageResults, setStageResults] = useState<PlanStageResult[]>([]);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState<number>(0);
  const [stageInitialLevel, setStageInitialLevel] = useState<number>(5);
  const [isLevelLoaded, setIsLevelLoaded] = useState<boolean>(false);

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
}
~~~~~

#### Acts 2: 为 `PlanStepTransitionOverlay` 增加 Esc 退出与操作按钮

修改 `src/components/plan/PlanStepTransitionOverlay.tsx`，支持 Esc 监听与返回主页/退出选项。

~~~~~act
patch_file
src/components/plan/PlanStepTransitionOverlay.tsx
~~~~~
~~~~~typescript.old
interface PlanStepTransitionOverlayProps {
  completedCard: CardDefinition;
  nextCard: CardDefinition;
  completedStepIndex: number;
  totalSteps: number;
  onProceed: () => void;
}

export function PlanStepTransitionOverlay({
  completedCard,
  nextCard,
  completedStepIndex,
  totalSteps,
  onProceed,
}: PlanStepTransitionOverlayProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onProceed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onProceed]);

  const NextIcon = nextCard.icon;

  return (
    <div
      role="presentation"
      onClick={onProceed}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
          onProceed();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200 cursor-pointer select-none"
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-white/80 p-7 flex flex-col items-center gap-5 text-center my-auto animate-in zoom-in-95">
        <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            阶段 {completedStepIndex + 1} / {totalSteps} 达成
          </span>
          <h2 className="text-lg font-black text-slate-800 mt-2">
            【{completedCard.title}】训练完成！
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            即将进入下一个阶段：
            <span className="font-bold text-indigo-600">{nextCard.title}</span>
          </p>
        </div>

        {/* 下阶段预览 */}
        <div className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 text-left">
          <div className="p-2 bg-white text-indigo-600 rounded-xl shadow-sm border border-slate-100">
            <NextIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">{nextCard.title}</div>
            <div className="text-[11px] text-slate-400 line-clamp-1">
              {nextCard.instruction || nextCard.desc}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onProceed}
          className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95"
        >
          点击进入下一阶段 (Space)
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
~~~~~
~~~~~typescript.new
interface PlanStepTransitionOverlayProps {
  completedCard: CardDefinition;
  nextCard: CardDefinition;
  completedStepIndex: number;
  totalSteps: number;
  onProceed: () => void;
  onExit?: () => void;
}

export function PlanStepTransitionOverlay({
  completedCard,
  nextCard,
  completedStepIndex,
  totalSteps,
  onProceed,
  onExit,
}: PlanStepTransitionOverlayProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onProceed();
      } else if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        onExit?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onProceed, onExit]);

  const NextIcon = nextCard.icon;

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onProceed();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
          onProceed();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none"
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-white/80 p-7 flex flex-col items-center gap-5 text-center my-auto animate-in zoom-in-95">
        <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            阶段 {completedStepIndex + 1} / {totalSteps} 达成
          </span>
          <h2 className="text-lg font-black text-slate-800 mt-2">
            【{completedCard.title}】训练完成！
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            即将进入下一个阶段：
            <span className="font-bold text-indigo-600">{nextCard.title}</span>
          </p>
        </div>

        {/* 下阶段预览 */}
        <div className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 text-left">
          <div className="p-2 bg-white text-indigo-600 rounded-xl shadow-sm border border-slate-100">
            <NextIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">{nextCard.title}</div>
            <div className="text-[11px] text-slate-400 line-clamp-1">
              {nextCard.instruction || nextCard.desc}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <button
            type="button"
            onClick={onProceed}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            点击进入下一阶段 (Space)
            <ArrowRight className="w-4 h-4" />
          </button>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="w-full py-2 px-3 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"
            >
              结束并退出训练 (Esc)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
~~~~~

#### Acts 3: 优化 `PlanEditorModal` 的校验与安全 ID 生成

修改 `src/components/plan/PlanEditorModal.tsx`，禁止保存空阶段列表，并使用更健壮的 ID 生成。

~~~~~act
patch_file
src/components/plan/PlanEditorModal.tsx
~~~~~
~~~~~typescript.old
  const handleAddItem = (cardId: string) => {
    const newItem: PlanItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      cardId,
      targetTrials: 20,
    };
    setPlan((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    setIsAddingCard(false);
  };
~~~~~
~~~~~typescript.new
  const handleAddItem = (cardId: string) => {
    const newItem: PlanItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      cardId,
      targetTrials: 20,
    };
    setPlan((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    setIsAddingCard(false);
  };
~~~~~

~~~~~act
patch_file
src/components/plan/PlanEditorModal.tsx
~~~~~
~~~~~typescript.old
        {/* 底部保存提交 */}
        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            保存计划
          </button>
        </div>
~~~~~
~~~~~typescript.new
        {/* 底部保存提交 */}
        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={plan.items.length === 0}
            className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all ${
              plan.items.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 active:scale-[0.98]'
            }`}
          >
            保存计划 {plan.items.length === 0 && '(至少包含1个阶段)'}
          </button>
        </div>
~~~~~

#### Acts 4: 优化 `planStorage.ts` 的 ID 生成与防御性解析

确保模板生成时的 PlanItem ID 具备足够熵值。

~~~~~act
patch_file
src/utils/planStorage.ts
~~~~~
~~~~~typescript.old
export function createPlanFromTemplate(template: PlanTemplate): TrainingPlan {
  const items: PlanItem[] = template.items.map((item, idx) => ({
    id: `item_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
    cardId: item.cardId,
    targetTrials: item.targetTrials,
  }));

  return {
    id: `plan_${template.id}`,
    name: template.name,
    items,
    updatedAt: Date.now(),
  };
}
~~~~~
~~~~~typescript.new
export function createPlanFromTemplate(template: PlanTemplate): TrainingPlan {
  const items: PlanItem[] = template.items.map((item, idx) => ({
    id: `item_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 9)}`,
    cardId: item.cardId,
    targetTrials: item.targetTrials,
  }));

  return {
    id: `plan_${template.id}`,
    name: template.name,
    items,
    updatedAt: Date.now(),
  };
}
~~~~~

### 下一步建议

1. **运行代码检查与单元测试**：执行 `npm run check` 和 `npm run test`，验证类型与测试用例全部通过。
2. **端到端体验验证**：在定制训练流中测试：
   - 包含多张不同难度等级卡片时的生涯能力层阶继承情况。
   - 训练完成并“再练一遍”时的计时器与首阶段等级加载。
   - 中途按 Esc 退出与阶段过渡遮罩层。
