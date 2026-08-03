好的，我将开始实现“轮次胜率评估算法”与“目标正确率”设置功能。

我们将修改以下文件：
1. `src/utils/settings.ts`: 扩充用户设置选项（新增 `adaptiveMode`, `targetAccuracy`, `blockSize`）。
2. `src/utils/adaptiveEngine.ts`: 重构自适应引擎，支持 **轮次胜率评估模式 (`block`)** 和 **经典 3U1D 阶梯模式 (`staircase`)**。
3. `src/components/SettingsModal.tsx`: 新增算子模式选择、目标通关正确率与每轮评估题量的 UI 设置。
4. `src/views/TrainingView.tsx`: 传入新设置参数给自适应引擎，并在训练顶栏展示当前轮次的通关进度与实时正确率。

## [WIP] feat: 引入轮次胜率评估自适应算法与目标正确率设置

### 用户需求
1. 解决当前自适应训练中 3U1D 阶梯算法对单次误触过于敏感、导致用户频繁升降级且无法在某一难度深度练习的问题。
2. 在“训练偏好设置”中增加“目标正确率”和“评估题数”设置项。
3. 让用户在自适应训练模式下能在当前难度层停留足够时间以巩固能力。

### 评论
这是一个非常关键的训练体验优化。把“探顶测试（3U1D）”与“技能巩固（轮次胜率评估）”逻辑分离开来，能够极大提升自适应训练的沉浸感与成就感，避免偶然手误带来的挫败感。

### 目标
1. 扩展 `UserSettings` 接口及默认值，增加 `adaptiveMode`（`block` / `staircase`）、`targetAccuracy`（如 `0.8`）、`blockSize`（如 `10`）。
2. 升级 `AdaptiveEngine` 核心类，实现按轮次计算正确率进行升阶/降阶/留在本层巩固的逻辑。
3. 在 `SettingsModal` 中添加直观的配置组件。
4. 在 `TrainingView` 中实时展示当前难度轮次的进度（如 `本轮进度: 7/10 题 | 正确率: 85%`）。

### 基本原理
1. 在 `block` 评估模式下，系统在用户于当前难度层做满 $N$ 题（例如 10 题）后才进行一次升降级评估：
   - 当正确率 $\ge$ 目标正确率（例如 80%）：通关升级，进入下一更难网格步长。
   - 当正确率 $<$ 50%：难度过高，降级回更容易的网格步长。
   - 当 50% $\le$ 正确率 $<$ 目标正确率：留在当前难度层，开启新一轮练习巩固。
2. 保持对原 3U1D (`staircase`) 算法的兼容，用户可在设置中自由切换。

### 标签
#intent/build #flow/ready #priority/high #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/adaptive-engine #task/object/block-mastery-algorithm #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 更新用户偏好设置定义 `src/utils/settings.ts`

在设置模块中添加 `adaptiveMode`、`targetAccuracy` 和 `blockSize` 的类型声明与默认值。

~~~~~act
write_file
src/utils/settings.ts
~~~~~
~~~~~typescript
export type StepGranularity = 'standard' | 'fine';
export type AdaptiveMode = 'block' | 'staircase';

export interface UserSettings {
  autoNext: boolean;            // 点击后是否自动翻页
  autoNextDelay: number;       // 自动翻页延迟 (ms)
  stepGranularity: StepGranularity; // 步长粒度 ('standard': 默认阶梯, 'fine': 1px逐级)
  adaptiveMode: AdaptiveMode;   // 自适应算子模式 ('block': 轮次胜率评估, 'staircase': 经典3U1D)
  targetAccuracy: number;      // 目标通关正确率 (0.7, 0.8, 0.85, 0.9)
  blockSize: number;           // 每轮评估题数 (10, 15, 20)
}

const SETTINGS_KEY = 'star_hopping_user_settings';

export const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
};

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load user settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save user settings:', e);
  }
}
~~~~~

#### Acts 2: 重构自适应计算引擎 `src/utils/adaptiveEngine.ts`

升级 `AdaptiveEngine` 支持 `block` 评估逻辑，包含轮次记录、胜率判断及进退机制。

~~~~~act
write_file
src/utils/adaptiveEngine.ts
~~~~~
~~~~~typescript
import { AdaptiveMode } from './settings';

/**
 * 标准网格步长难度序列（单位：px）
 */
export const STANDARD_STEP_SEQUENCE = [35, 30, 25, 20, 16, 13, 10, 8, 6, 5, 4, 3];

/**
 * 1px 精细步长难度序列 (35px -> 1px)
 */
export const FINE_STEP_SEQUENCE = Array.from({ length: 35 }, (_, i) => 35 - i);

export type AdaptiveChange = 'up' | 'down' | 'same';

export interface AdaptiveProgress {
  current: number;
  total: number;
  hits: number;
}

export interface RecordResultOutput {
  newStep: number;
  change: AdaptiveChange;
  isBlockComplete?: boolean;
  progress?: AdaptiveProgress;
}

export class AdaptiveEngine {
  private stepSequence: number[];
  private currentStepIndex: number;
  private mode: AdaptiveMode;
  private targetAccuracy: number;
  private blockSize: number;

  // 经典 3U1D 状态
  private consecutiveCorrect: number = 0;

  // 轮次胜率评估状态
  private blockHistory: boolean[] = [];

  constructor(
    initialGridStep: number = 20,
    isFineGranularity: boolean = false,
    mode: AdaptiveMode = 'block',
    targetAccuracy: number = 0.8,
    blockSize: number = 10
  ) {
    this.stepSequence = isFineGranularity ? FINE_STEP_SEQUENCE : STANDARD_STEP_SEQUENCE;
    this.mode = mode;
    this.targetAccuracy = targetAccuracy;
    this.blockSize = blockSize;

    // 找到与 initialGridStep 最接近的索引
    let closestIdx = 0;
    let minDiff = Math.abs(this.stepSequence[0] - initialGridStep);
    for (let i = 1; i < this.stepSequence.length; i++) {
      const diff = Math.abs(this.stepSequence[i] - initialGridStep);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    this.currentStepIndex = closestIdx;
  }

  /**
   * 获取当前难度的 GridStep 像素值
   */
  public getCurrentStep(): number {
    return this.stepSequence[this.currentStepIndex];
  }

  /**
   * 获取当前轮次进度（仅在 block 模式下有效）
   */
  public getBlockProgress(): AdaptiveProgress | null {
    if (this.mode !== 'block') return null;
    const hits = this.blockHistory.filter(Boolean).length;
    return {
      current: this.blockHistory.length,
      total: this.blockSize,
      hits,
    };
  }

  /**
   * 记录做答结果并计算下一题难度
   * @param isHit 本题是否击中目标
   */
  public recordResult(isHit: boolean): RecordResultOutput {
    if (this.mode === 'staircase') {
      return this.recordStaircase(isHit);
    } else {
      return this.recordBlock(isHit);
    }
  }

  /**
   * 经典 3-Up / 1-Down 算子
   */
  private recordStaircase(isHit: boolean): RecordResultOutput {
    if (isHit) {
      this.consecutiveCorrect += 1;
      if (this.consecutiveCorrect >= 3) {
        this.consecutiveCorrect = 0;
        if (this.currentStepIndex < this.stepSequence.length - 1) {
          this.currentStepIndex += 1;
          return { newStep: this.getCurrentStep(), change: 'up' };
        }
      }
    } else {
      this.consecutiveCorrect = 0;
      if (this.currentStepIndex > 0) {
        this.currentStepIndex -= 1;
        return { newStep: this.getCurrentStep(), change: 'down' };
      }
    }

    return { newStep: this.getCurrentStep(), change: 'same' };
  }

  /**
   * 轮次胜率评估算子 (Block Master Engine)
   */
  private recordBlock(isHit: boolean): RecordResultOutput {
    this.blockHistory.push(isHit);
    const count = this.blockHistory.length;
    const hits = this.blockHistory.filter(Boolean).length;

    // 尚未做满一个评估轮次
    if (count < this.blockSize) {
      return {
        newStep: this.getCurrentStep(),
        change: 'same',
        isBlockComplete: false,
        progress: { current: count, total: this.blockSize, hits },
      };
    }

    // 做满了一轮，计算胜率
    const accuracy = hits / this.blockSize;
    let change: AdaptiveChange = 'same';

    if (accuracy >= this.targetAccuracy) {
      // 达到或超过目标正确率 -> 通关升级
      if (this.currentStepIndex < this.stepSequence.length - 1) {
        this.currentStepIndex += 1;
        change = 'up';
      }
    } else if (accuracy < 0.5) {
      // 正确率低于 50% -> 难度太高，降级
      if (this.currentStepIndex > 0) {
        this.currentStepIndex -= 1;
        change = 'down';
      }
    }
    // 正确率在 [50%, targetAccuracy) 之间 -> 保持本层，巩固练习

    // 清空轮次历史，开始下一轮
    this.blockHistory = [];

    return {
      newStep: this.getCurrentStep(),
      change,
      isBlockComplete: true,
      progress: { current: 0, total: this.blockSize, hits: 0 },
    };
  }

  /**
   * 强制重置难度索引
   */
  public setGridStep(step: number): void {
    const idx = this.stepSequence.indexOf(step);
    if (idx !== -1) {
      this.currentStepIndex = idx;
      this.consecutiveCorrect = 0;
      this.blockHistory = [];
    }
  }
}
~~~~~

#### Acts 3: 更新偏好设置模态框 `src/components/SettingsModal.tsx`

添加自适应算子模式、目标正确率、评估题数的交互设置视图。

~~~~~act
write_file
src/components/SettingsModal.tsx
~~~~~
~~~~~tsx
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { X, Sliders, ToggleLeft, ToggleRight, Target, Flame } from 'lucide-preact';
import { UserSettings, saveSettings } from '../utils/settings';

interface SettingsModalProps {
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => void;
}

export function SettingsModal({ settings, onClose, onSave }: SettingsModalProps) {
  const [current, setCurrent] = useState<UserSettings>({ ...settings });

  const handleToggleAutoNext = () => {
    setCurrent((prev) => ({ ...prev, autoNext: !prev.autoNext }));
  };

  const handleDelayChange = (e: Event) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    setCurrent((prev) => ({ ...prev, autoNextDelay: val }));
  };

  const handleGranularityChange = (granularity: 'standard' | 'fine') => {
    setCurrent((prev) => ({ ...prev, stepGranularity: granularity }));
  };

  const handleModeChange = (mode: 'block' | 'staircase') => {
    setCurrent((prev) => ({ ...prev, adaptiveMode: mode }));
  };

  const handleAccuracyChange = (acc: number) => {
    setCurrent((prev) => ({ ...prev, targetAccuracy: acc }));
  };

  const handleBlockSizeChange = (size: number) => {
    setCurrent((prev) => ({ ...prev, blockSize: size }));
  };

  const handleConfirm = () => {
    saveSettings(current);
    onSave(current);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">训练偏好设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* 自动翻页 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-700">自动切换下一题</div>
              <div className="text-xs text-slate-400">点击答题后无需手动按空格</div>
            </div>
            <button
              onClick={handleToggleAutoNext}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {current.autoNext ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          {/* 自动翻页延迟 */}
          {current.autoNext && (
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                <span>切换延迟</span>
                <span className="font-mono text-indigo-600 font-bold">
                  {current.autoNextDelay} ms
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={current.autoNextDelay}
                onInput={handleDelayChange}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          )}

          {/* 训练算子模式 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">自适应算子模式</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleModeChange('block')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                  current.adaptiveMode === 'block'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-indigo-600" />
                轮次胜率评估 (推荐)
              </button>
              <button
                onClick={() => handleModeChange('staircase')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                  current.adaptiveMode === 'staircase'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                经典 3U1D 阶梯
              </button>
            </div>
          </div>

          {/* 轮次评估配置项 */}
          {current.adaptiveMode === 'block' && (
            <div className="space-y-3 bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100">
              {/* 目标通关正确率 */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                  <span>目标通关正确率</span>
                  <span className="font-bold text-indigo-600 font-mono">
                    {Math.round(current.targetAccuracy * 100)}%
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0.7, 0.8, 0.85, 0.9].map((acc) => (
                    <button
                      key={acc}
                      onClick={() => handleAccuracyChange(acc)}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        current.targetAccuracy === acc
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {Math.round(acc * 100)}%
                    </button>
                  ))}
                </div>
              </div>

              {/* 每轮评估题量 */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                  <span>每轮评估题量</span>
                  <span className="font-bold text-indigo-600 font-mono">
                    {current.blockSize} 题/轮
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[10, 15, 20].map((size) => (
                    <button
                      key={size}
                      onClick={() => handleBlockSizeChange(size)}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        current.blockSize === size
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {size} 题
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 难度步长粒度 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">网格步长精细度</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleGranularityChange('standard')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  current.stepGranularity === 'standard'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                标准阶梯 (5px梯度)
              </button>
              <button
                onClick={() => handleGranularityChange('fine')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  current.stepGranularity === 'fine'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                精细阶梯 (1px逐级)
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
~~~~~

#### Acts 4: 更新训练视图集成与顶栏状态 `src/views/TrainingView.tsx`

在 `TrainingView` 中实例化包含配置项的 `AdaptiveEngine`，并在自适应训练模式下显示实时轮次通关进度。

~~~~~act
write_file
src/views/TrainingView.tsx
~~~~~
~~~~~tsx
import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { ArrowLeft, Clock, ChevronRight, Target } from 'lucide-preact';
import { TrainingMode, QuestionData, Point, HitResult, TrialRecord } from '../types';
import { StarCanvas } from '../components/StarCanvas';
import { generateQuestion } from '../utils/geometry';
import { AdaptiveEngine, AdaptiveProgress } from '../utils/adaptiveEngine';
import { saveTrialRecord, saveSession, SessionData } from '../utils/db';
import { UserSettings } from '../utils/settings';

interface TrainingViewProps {
  mode: TrainingMode;
  sessionType: 'training' | 'benchmark';
  initialGridStep: number;
  settings: UserSettings;
  onExit: () => void;
}

export function TrainingView({
  mode,
  sessionType,
  initialGridStep,
  settings,
  onExit,
}: TrainingViewProps) {
  // === 会话状态 ===
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  const startTimeRef = useRef<number>(Date.now());
  const adaptiveEngineRef = useRef<AdaptiveEngine>(
    new AdaptiveEngine(
      initialGridStep,
      settings.stepGranularity === 'fine',
      settings.adaptiveMode,
      settings.targetAccuracy,
      settings.blockSize
    )
  );
  const autoNextTimerRef = useRef<number | null>(null);

  const [question, setQuestion] = useState<QuestionData>(() =>
    generateQuestion(mode, initialGridStep)
  );
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<{
    clickPoint: Point;
    hitResult: HitResult;
  } | null>(null);

  // 统计指标
  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [hitTrials, setHitTrials] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // 轮次进度（仅在 block 模式下有效）
  const [blockProgress, setBlockProgress] = useState<AdaptiveProgress | null>(
    adaptiveEngineRef.current.getBlockProgress()
  );

  // === 计时器 ===
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // === 键盘监听 (Space / Esc) ===
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (showAnswer && !isFinished) {
          handleNextQuestion();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleFinishSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, isFinished]);

  // === 作答处理 ===
  const handleAnswer = async (clickPoint: Point, hitResult: HitResult) => {
    const responseTimeMs = Date.now() - questionStartTime;
    setUserAnswer({ clickPoint, hitResult });
    setShowAnswer(true);

    const newTotal = totalTrials + 1;
    const newHits = hitTrials + (hitResult.isHit ? 1 : 0);
    setTotalTrials(newTotal);
    setHitTrials(newHits);

    // 1. 存数据库原子记录
    const record: TrialRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: sessionIdRef.current,
      mode,
      timestamp: Date.now(),
      gridStep: question.gridStep,
      anchorA: [question.anchorA.x, question.anchorA.y],
      anchorC: question.anchorC ? [question.anchorC.x, question.anchorC.y] : undefined,
      targetB: [question.targetB.x, question.targetB.y],
      userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
      angleDegree: question.angleDegree,
      distanceRatio: question.distanceRatio,
      isHit: hitResult.isHit,
      errorPixelDistance: hitResult.errorDistance,
      responseTimeMs,
    };
    await saveTrialRecord(record);

    // 2. 调优阶梯难度步长
    const output = adaptiveEngineRef.current.recordResult(hitResult.isHit);
    if (output.progress) {
      setBlockProgress(output.progress);
    }

    // 3. 检查基准测试是否完成 (20 题)
    if (sessionType === 'benchmark' && newTotal >= 20) {
      setIsFinished(true);
      await saveCurrentSession(newTotal, newHits, true);
    } else if (settings.autoNext) {
      // 自动翻页延时
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        handleNextQuestion();
      }, settings.autoNextDelay);
    }
  };

  // === 切题 ===
  const handleNextQuestion = () => {
    if (isFinished) return;
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }

    const nextStep = adaptiveEngineRef.current.getCurrentStep();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateQuestion(mode, nextStep));
    setQuestionStartTime(Date.now());
  };

  // === 保存会话数据 ===
  const saveCurrentSession = async (
    trials = totalTrials,
    hits = hitTrials,
    ended = false
  ) => {
    const sessionData: SessionData = {
      id: sessionIdRef.current,
      mode,
      type: sessionType,
      startTimestamp: startTimeRef.current,
      endTimestamp: ended ? Date.now() : undefined,
      totalTrials: trials,
      hitTrials: hits,
      startGridStep: initialGridStep,
      endGridStep: adaptiveEngineRef.current.getCurrentStep(),
    };
    await saveSession(sessionData);
  };

  // === 退出结算 ===
  const handleFinishSession = async () => {
    await saveCurrentSession(totalTrials, hitTrials, true);
    onExit();
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const currentAccuracy =
    totalTrials > 0 ? Math.round((hitTrials / totalTrials) * 100) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* 顶栏控制面板 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleFinishSession}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练 (Esc)
          </button>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {mode} | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
        </div>

        {/* 核心监控指标 */}
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              已练题数
            </span>
            <span className="font-black text-gray-800">
              {totalTrials} {sessionType === 'benchmark' ? '/ 20' : ''}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              总正确率
            </span>
            <span className="font-black text-gray-800">
              {currentAccuracy}%
            </span>
          </div>

          {sessionType === 'training' && settings.adaptiveMode === 'block' && blockProgress && (
            <div className="flex items-center gap-1.5 bg-indigo-50/80 border border-indigo-100 px-3 py-1 rounded-xl">
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              <div>
                <span className="text-[10px] font-extrabold text-indigo-400 block uppercase tracking-wider">
                  本层进度 ({Math.round(settings.targetAccuracy * 100)}%通关)
                </span>
                <span className="font-black text-indigo-700">
                  {blockProgress.current} / {blockProgress.total} 题
                  <span className="ml-1 text-xs font-semibold text-indigo-500">
                    ({blockProgress.hits} 胜)
                  </span>
                </span>
              </div>
            </div>
          )}

          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              当前网格步长
            </span>
            <span className="font-black text-indigo-600">
              {question.gridStep} px
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-slate-700">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>
      </header>

      {/* 核心双 Canvas 交互区 */}
      <StarCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
      />

      {/* 底部操作面板（仅在未开启自动翻页时显示） */}
      {!settings.autoNext && (
        <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl p-3 shadow-sm flex items-center justify-end min-h-[56px]">
          {isFinished ? (
            <button
              onClick={handleFinishSession}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all"
            >
              完成并退出
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              disabled={!showAnswer}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1 ${
                showAnswer
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              下一题
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
~~~~~

---

### 下一步建议

修改已全部应用完成。建议步骤：
1. 打开浏览器验证训练模式，检查在“设置”里选择“轮次胜率评估 (推荐)”并配置不同的目标通关正确率（如 80%）和轮次题数（如 10 题）后的体验。
2. 验证顶栏中的“本层进度”是否随作答实时增长，并在做满 10 题后根据达标情况升阶或留在本层。
3. 如果测试效果满意，可以生成单独的 Git 提交计划（`[COMMIT]`）将本次改动提交入库。
