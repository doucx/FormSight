我们为您添加一个专用的**会话结算弹窗 (`SessionSummaryModal`)**，在用户完成 20 题基准测试或主动点击退出训练时展示：

1. **练习概览统计**：练习题数、正确率、总耗时、平均每题响应时间。
2. **能力步长演进**：展示从初始步长到最终步长的数值变化（例如 `20px ➔ 13px`）。
3. **能力步长可视化折线图**：通过 Canvas 动态绘制整个练习过程中每一题的网格步长变化曲线，直观展现难度递进及作答结果（击中/未击中）。

以下是具体实施计划：

## [WIP] feat: 添加训练会话结算弹窗及能力步长演进折线图

### 用户需求
缺乏会话结算弹窗。需要添加一个弹窗总结本次练习的题数、时长、正确率，并用曲线图可视化展示整个练习过程中的能力步长变化（例如从 20px 提升到了 13px）。

### 评论
会话结算弹窗是自适应训练闭环中的核心体验。它能及时为用户提供练习反馈与成就感，让用户清晰感知自己在当前模式下的几何感知能力提升和手眼协调进步。

### 目标
1. 新建 `src/components/SessionSummaryModal.tsx` 结算弹窗组件，包含成绩面板与动态 Canvas 步长折线图。
2. 在 `src/views/TrainingView.tsx` 中记录每道题的做答历史（题号、步长、是否击中、响应时间）。
3. 在训练完成（如 20 题基准测试结束）或用户点击“退出训练”时弹出结算弹窗，展示成绩总结并提供“再练一轮”和“返回主页”选项。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/session-summary-modal #task/action/feature-addition #task/state/begin

---

### Script

#### Acts 1: 创建 `SessionSummaryModal.tsx` 结算弹窗组件

新建组件以绘制练习统计卡片和 Canvas 网格步长动态折线图。

~~~~~act
write_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~tsx
import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import {
  Award,
  Clock,
  Target,
  TrendingDown,
  ArrowRight,
  RotateCcw,
  Home,
  Zap,
} from 'lucide-preact';
import { TrainingMode } from '../types';

export interface SessionHistoryItem {
  trialIndex: number;
  step: number;
  isHit: boolean;
  responseTimeMs: number;
}

interface SessionSummaryModalProps {
  mode: TrainingMode;
  sessionType: 'training' | 'benchmark';
  elapsedSeconds: number;
  history: SessionHistoryItem[];
  onClose: () => void;
  onRestart: () => void;
}

const MODE_NAMES: Record<TrainingMode, string> = {
  single: '单锚点模式',
  double_h: '水平双锚点',
  double_r: '旋转双锚点',
};

export function SessionSummaryModal({
  mode,
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

  const startStep = history.length > 0 ? history[0].step : 20;
  const endStep = history.length > 0 ? history[history.length - 1].step : 20;
  const stepDiff = startStep - endStep;

  const avgResponseTimeSec =
    totalTrials > 0
      ? (history.reduce((acc, curr) => acc + curr.responseTimeMs, 0) / totalTrials / 1000).toFixed(
          1
        )
      : '0.0';

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 绘制步长折线图
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 30, right: 30, bottom: 35, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // 清屏
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, width, height);

    const steps = history.map((h) => h.step);
    const maxStep = Math.max(...steps, 35);
    const minStep = Math.min(...steps, 1);

    // Y 轴转换函数 (步长越小代表难度越高，显示在越靠上的位置)
    const getY = (val: number) => {
      const ratio = (val - minStep) / (maxStep - minStep || 1);
      return padding.top + ratio * chartH;
    };

    // X 轴转换函数
    const getX = (index: number) => {
      if (history.length === 1) return padding.left + chartW / 2;
      return padding.left + (index / (history.length - 1)) * chartW;
    };

    // 1. 绘制网格线与 Y 轴刻度
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#334155';
    ctx.fillStyle = '#64748B';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const yTicks = [maxStep, Math.round((maxStep + minStep) / 2), minStep];
    const uniqueYTicks = Array.from(new Set(yTicks));

    uniqueYTicks.forEach((tickVal) => {
      const y = getY(tickVal);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText(`${tickVal}px`, padding.left - 8, y);
    });

    // 2. 绘制渐变填充区域
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(history[0].step));
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(getX(i), getY(history[i].step));
    }
    ctx.lineTo(getX(history.length - 1), height - padding.bottom);
    ctx.lineTo(getX(0), height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // 3. 绘制折线
    ctx.beginPath();
    ctx.strokeStyle = '#818CF8';
    ctx.lineWidth = 2.5;
    ctx.moveTo(getX(0), getY(history[0].step));
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(getX(i), getY(history[i].step));
    }
    ctx.stroke();

    // 4. 绘制数据点与作答标记
    history.forEach((h, i) => {
      const x = getX(i);
      const y = getY(h.step);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = h.isHit ? '#22C55E' : '#EF4444';
      ctx.fill();
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 在主要节点标数字
      if (
        history.length <= 10 ||
        i === 0 ||
        i === history.length - 1 ||
        h.step !== history[i - 1]?.step
      ) {
        ctx.fillStyle = '#CBD5E1';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${h.step}`, x, y - 8);
      }
    });

    // X 轴底线
    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('题目做答序列 ➔', width / 2, height - 10);
  }, [history]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Award className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">训练总结与成果</h2>
              <p className="text-xs text-slate-400">
                {MODE_NAMES[mode]} • {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
              </p>
            </div>
          </div>
        </div>

        {/* 核心指标统计卡片 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              正确率 / 题数
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">{accuracy}%</span>
              <span className="text-xs font-semibold text-slate-400">
                ({hitCount}/{totalTrials} 题)
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              训练时长
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">
                {formatTime(elapsedSeconds)}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                ({avgResponseTimeSec}秒/题)
              </span>
            </div>
          </div>
        </div>

        {/* 步长提升高亮卡片 */}
        <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 text-white rounded-xl">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-900">能力步长演进</div>
              <div className="text-[11px] text-indigo-600">
                {stepDiff > 0
                  ? `难度精细度提升了 ${stepDiff}px ！`
                  : stepDiff < 0
                  ? `网格步长调整了 ${Math.abs(stepDiff)}px`
                  : '稳健维持当前难度层阶'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono font-black text-slate-800 text-base">
            <span className="bg-white px-2.5 py-1 rounded-xl border border-indigo-100 shadow-sm">
              {startStep}px
            </span>
            <ArrowRight className="w-4 h-4 text-indigo-500" />
            <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-xl shadow-sm">
              {endStep}px
            </span>
          </div>
        </div>

        {/* 折线图 Canvas 区 */}
        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-center px-1 mb-2">
            <span className="text-[11px] font-bold text-slate-400">步长变化曲线 (较小更精细)</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 击中
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> 未击中
              </span>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={440}
            height={160}
            className="w-full aspect-[11/4] rounded-xl"
          />
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Home className="w-4 h-4" />
            返回主页
          </button>
          <button
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            再练一轮
          </button>
        </div>
      </div>
    </div>
  );
}
~~~~~

#### Acts 2: 在 `TrainingView.tsx` 中集成结算弹窗与历史步长追踪

在 `TrainingView.tsx` 中记录每题步长演进历史，并在训练结束或触发退出时弹出结算弹窗。

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
import { TrainingMode, QuestionData, Point, HitResult, TrialRecord } from '../types';
import { StarCanvas } from '../components/StarCanvas';
import { generateQuestion, QuestionGenerateOptions } from '../utils/geometry';
~~~~~
~~~~~typescript.new
import { TrainingMode, QuestionData, Point, HitResult, TrialRecord } from '../types';
import { StarCanvas } from '../components/StarCanvas';
import { SessionSummaryModal, SessionHistoryItem } from '../components/SessionSummaryModal';
import { generateQuestion, QuestionGenerateOptions } from '../utils/geometry';
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<{
    clickPoint: Point;
    hitResult: HitResult;
  } | null>(null);

  // 统计指标与结算弹窗
  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [hitTrials, setHitTrials] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
    // 2. 调优阶梯难度步长
    adaptiveEngineRef.current.recordResult(hitResult.isHit);

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
~~~~~
~~~~~typescript.new
    // 2. 记录做答步长历史
    setSessionHistory((prev) => [
      ...prev,
      {
        trialIndex: newTotal,
        step: question.gridStep,
        isHit: hitResult.isHit,
        responseTimeMs,
      },
    ]);

    // 3. 调优阶梯难度步长
    adaptiveEngineRef.current.recordResult(hitResult.isHit);

    // 4. 检查基准测试是否完成 (20 题)
    if (sessionType === 'benchmark' && newTotal >= 20) {
      setIsFinished(true);
      await saveCurrentSession(newTotal, newHits, true);
      setShowSummaryModal(true);
    } else if (settings.autoNext) {
      // 自动翻页延时
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        handleNextQuestion();
      }, settings.autoNextDelay);
    }
  };
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
  // === 退出结算 ===
  const handleFinishSession = async () => {
    await saveCurrentSession(totalTrials, hitTrials, true);
    onExit();
  };
~~~~~
~~~~~typescript.new
  // === 触发退出/完成请求 ===
  const handleRequestFinish = async () => {
    if (sessionHistory.length > 0 && !showSummaryModal) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      setShowSummaryModal(true);
    } else {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onExit();
    }
  };

  // === 彻底退出 ===
  const handleFinishSession = async () => {
    await saveCurrentSession(totalTrials, hitTrials, true);
    onExit();
  };

  // === 再练一轮 ===
  const handleRestartSession = () => {
    setShowSummaryModal(false);
    setIsFinished(false);
    setTotalTrials(0);
    setHitTrials(0);
    setSessionHistory([]);
    setShowAnswer(false);
    setUserAnswer(null);
    sessionIdRef.current = `session_${Date.now()}`;
    startTimeRef.current = Date.now();
    lastActivityTimeRef.current = Date.now();
    accumulatedMsRef.current = 0;
    setElapsedSeconds(0);
    const nextStep = adaptiveEngineRef.current.getCurrentStep();
    setQuestion(generateQuestion(mode, nextStep, getGenerateOptions()));
    setQuestionStartTime(Date.now());
  };
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
      {/* 顶栏控制面板 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleRequestFinish}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练 (Esc)
          </button>
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
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
~~~~~typescript.new
      {/* 底部操作面板（仅在未开启自动翻页时显示） */}
      {!settings.autoNext && (
        <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl p-3 shadow-sm flex items-center justify-end min-h-[56px]">
          {isFinished ? (
            <button
              onClick={handleRequestFinish}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all"
            >
              完成并查看总结
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

      {/* 练习结算弹窗 */}
      {showSummaryModal && (
        <SessionSummaryModal
          mode={mode}
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

### 下一步建议
- 在应用中运行练习，完成若干题后点击“退出训练”或完成 20 题测试，验证“训练总结与成果”弹窗是否正确展示。
- 检查折线图的网格步长变化，以及“再练一轮”和“返回主页”按钮的功能是否符合预期。
