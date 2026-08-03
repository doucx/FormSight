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