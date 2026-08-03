我们将进行 Phase 1 的下一个关键步骤：**实现双 Canvas 交互渲染组件 `src/components/StarCanvas.tsx`** 并更新根组件 `src/app.tsx` 进行测试。

该组件将负责绘制左侧参考图与右侧交互区，精准处理 DPI 缩放下的鼠标/触控点击事件，并在作答后展示绿色深高亮十字线与红色误差指示线。

## [WIP] feat: 实现双 Canvas 渲染与交互组件 StarCanvas

### 用户需求
创建 `src/components/StarCanvas.tsx` 组件，实现左右 500x500 双 Canvas 矢量渲染逻辑：
- **左图（参考）**：绘制纯白底色、锚点（A/C）与真理目标点 B。
- **右图（交互）**：绘制纯白底色、5x5 干扰点阵、锚点（A/C）；支持点击作答，坐标自动换算与自适应 DPI 处理；做答后实时渲染高亮绿色十字线（真理点）和红色误差连线。

### 评论
双 Canvas 组件是整个项目的核心 UI 交互界面。通过原生 Canvas 2D 绘图 API 配合 `useRef` 与 `useEffect`，可以规避 React/Preact 的重绘性能瓶颈，确保点击作答与切换题目的帧率稳定在 60fps。

### 目标
1. 创建 `src/components/StarCanvas.tsx`，支持组件属性传入题目数据 `question`、作答状态 `showAnswer` 和回调函数 `onAnswer`。
2. 实现正确的 Canvas 坐标换算（支持响应式缩放后的点击精确匹配）。
3. 实现作答后的视觉反馈（绿色高亮十字线、红色误差虚线与用户点击落点）。
4. 更新 `src/app.tsx`，加入简单预览，方便在 `npm run dev` 中直接测试双 Canvas 交互。

### 基本原理
按照白皮书 v0.1 规范：画布为纯白 `#FFFFFF` 背景与 `#EEEEEE` 边框，点阵为 `#888888` 中灰点，锚点为 `#000000` 黑点，真理高亮十字线为 `#00AA00` 深绿色（臂长 $12px$，线宽 $2px$），误差指示线为 `#FF0000` 红色。

### 标签
#intent/build #flow/ready #priority/high #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/star-canvas-component #task/action/implementation #task/state/continue #task/status/active

---

### Script

#### Acts 1: 创建 StarCanvas 组件

~~~~~act
write_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript
import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { QuestionData, Point, HitResult } from '../types';
import { checkHit, generateGridPoints, CANVAS_SIZE } from '../utils/geometry';

interface StarCanvasProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: HitResult } | null;
  onAnswer: (clickPoint: Point, hitResult: HitResult) => void;
  disabled?: boolean;
}

export function StarCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarCanvasProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // === 绘图主逻辑 ===
  useEffect(() => {
    // 1. 渲染左侧参考图 (Reference Canvas)
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = leftCanvas.getContext('2d');
      if (ctx) {
        // 清屏与背景
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // 绘制锚点 A
        drawDot(ctx, question.anchorA.x, question.anchorA.y, '#000000', 3.5);

        // 绘制锚点 C (若存在)
        if (question.anchorC) {
          drawDot(ctx, question.anchorC.x, question.anchorC.y, '#000000', 3.5);
        }

        // 绘制真理点 B
        drawDot(ctx, question.targetB.x, question.targetB.y, '#000000', 3.5);
      }
    }

    // 2. 渲染右侧交互区 (Interactive Canvas)
    const rightCanvas = rightCanvasRef.current;
    if (rightCanvas) {
      const ctx = rightCanvas.getContext('2d');
      if (ctx) {
        // 清屏与背景
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // 图层 1: 干扰点阵 (底层)
        const gridPoints = generateGridPoints(
          question.gridStart,
          question.gridDim,
          question.gridStep
        );
        gridPoints.forEach((p) => {
          drawDot(ctx, p.x, p.y, '#888888', 3.5);
        });

        // 图层 2: 锚点 (顶层)
        drawDot(ctx, question.anchorA.x, question.anchorA.y, '#000000', 3.5);
        if (question.anchorC) {
          drawDot(ctx, question.anchorC.x, question.anchorC.y, '#000000', 3.5);
        }

        // 图层 3: 做答后的视觉反馈 (反馈层)
        if (showAnswer) {
          const { x: bx, y: by } = question.targetB;

          // 绘制真理点 B 实体点
          drawDot(ctx, bx, by, '#000000', 3.5);

          // 绘制深绿色十字高亮线
          const chSize = 12;
          ctx.strokeStyle = '#00AA00';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bx - chSize, by);
          ctx.lineTo(bx + chSize, by);
          ctx.moveTo(bx, by - chSize);
          ctx.lineTo(bx, by + chSize);
          ctx.stroke();

          // 如果回答错或有用户点击坐标，绘制误差连线与点击位置
          if (userAnswer) {
            const { clickPoint, hitResult } = userAnswer;

            if (!hitResult.isHit) {
              // 绘制红色虚线误差指示
              ctx.strokeStyle = '#FF0000';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(clickPoint.x, clickPoint.y);
              ctx.lineTo(bx, by);
              ctx.stroke();
              ctx.setLineDash([]); // 恢复实线

              // 用户实点击位置标记 (红点)
              drawDot(ctx, clickPoint.x, clickPoint.y, '#FF0000', 3.5);
            }
          }
        }
      }
    }
  }, [question, showAnswer, userAnswer]);

  // 辅助函数：绘制圆点
  function drawDot(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    radius: number
  ) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // === 交互事件：点击右侧 Canvas 做答 ===
  const handleRightCanvasClick = (e: MouseEvent) => {
    if (disabled || showAnswer) return;

    const canvas = rightCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // 换算 CSS 实际像素到 Canvas 逻辑像素 (500x500)
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const clickPoint: Point = { x: clickX, y: clickY };
    const hitResult = checkHit(
      clickPoint,
      question.targetB,
      question.gridStart,
      question.gridStep,
      question.gridDim
    );

    onAnswer(clickPoint, hitResult);
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-5xl mx-auto">
      {/* 左侧参考 Canvas */}
      <div className="flex flex-col items-center">
        <span className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
          左图: 观察参考
        </span>
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full max-w-[420px] aspect-square rounded-lg border border-gray-200 bg-white shadow-sm"
        />
      </div>

      {/* 右侧交互 Canvas */}
      <div className="flex flex-col items-center">
        <span className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
          右图: 点击答题区
        </span>
        <canvas
          ref={rightCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onClick={handleRightCanvasClick}
          className={`w-full max-w-[420px] aspect-square rounded-lg border border-gray-200 bg-white shadow-sm transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair hover:border-gray-400'
          }`}
        />
      </div>
    </div>
  );
}
~~~~~

#### Acts 2: 更新 App 预览界面

修改 `src/app.tsx`，将双 Canvas 挂载并在页面上展示试题测试与交互。

~~~~~act
write_file
src/app.tsx
~~~~~
~~~~~typescript
import { useState } from 'preact/hooks';
import { StarCanvas } from './components/StarCanvas';
import { generateQuestion } from './utils/geometry';
import { TrainingMode, QuestionData, Point, HitResult } from './types';

export function App() {
  const [mode, setMode] = useState<TrainingMode>('single');
  const [gridStep, setGridStep] = useState<number>(20);
  const [question, setQuestion] = useState<QuestionData>(() =>
    generateQuestion('single', 20)
  );

  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<{
    clickPoint: Point;
    hitResult: HitResult;
  } | null>(null);

  // 换题
  const handleNextQuestion = (newMode = mode, newStep = gridStep) => {
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateQuestion(newMode, newStep));
  };

  // 答题回调
  const handleAnswer = (clickPoint: Point, hitResult: HitResult) => {
    setUserAnswer({ clickPoint, hitResult });
    setShowAnswer(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-6">
      {/* 标题控制栏 */}
      <header className="w-full max-w-5xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            📐 寻星练习 (Star-Hopping)
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Phase 1 校验：双 Canvas 矢量推演与点击 Hit-Testing
          </p>
        </div>

        {/* 模式与难度切换控制 */}
        <div className="flex items-center gap-3">
          <select
            value={mode}
            onChange={(e) => {
              const m = (e.target as HTMLSelectElement).value as TrainingMode;
              setMode(m);
              handleNextQuestion(m, gridStep);
            }}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="single">01_单锚点 (Single Anchor)</option>
            <option value="double_h">02_双锚点_水平基准 (Double Horiz)</option>
            <option value="double_r">03_双锚点_旋转基准 (Double Rotated)</option>
          </select>

          <select
            value={gridStep}
            onChange={(e) => {
              const step = Number((e.target as HTMLSelectElement).value);
              setGridStep(step);
              handleNextQuestion(mode, step);
            }}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={30}>Grid Step: 30px (简单)</option>
            <option value={20}>Grid Step: 20px (中等)</option>
            <option value={10}>Grid Step: 10px (困难)</option>
            <option value={5}>Grid Step: 5px (极难)</option>
          </select>
        </div>
      </header>

      {/* 核心 Canvas 区 */}
      <main className="w-full max-w-5xl flex flex-col items-center gap-6">
        <StarCanvas
          question={question}
          showAnswer={showAnswer}
          userAnswer={userAnswer}
          onAnswer={handleAnswer}
        />

        {/* 状态反馈面板 */}
        <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            {!showAnswer ? (
              <p className="text-sm text-gray-600 font-medium">
                👉 请观察左图，并在右图点击对应位置的目标点
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={`text-lg font-bold px-2.5 py-0.5 rounded ${
                    userAnswer?.hitResult.isHit
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {userAnswer?.hitResult.isHit ? '✅ 击中目标!' : '❌ 未击中'}
                </span>
                <span className="text-xs text-gray-500">
                  点击偏离距离: {userAnswer?.hitResult.errorDistance} px
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => handleNextQuestion()}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            下一题 (Space)
          </button>
        </div>
      </main>
    </div>
  );
}
~~~~~

---

### 下一步建议

现在点击作答与 Canvas 视觉渲染逻辑已经建立。你可以在开发服务中预览并点击测试。

接下来建议进入 **Phase 2**：**开发 IndexedDB 数据库管理库 `src/utils/db.ts` 与自适应难度阶梯引擎 `src/utils/adaptiveEngine.ts`**：
1. 实现 `db.ts`（支持保存每次试题记录 `TrialRecord` 与训练会话 `Session`，基于 `idb` 库）。
2. 实现 `adaptiveEngine.ts`（根据 3-Up/1-Down 阶梯法自动动态调节 `GridStep`，将正确率维持在 ~80%）。

如果你准备好了，请回复“继续”。
