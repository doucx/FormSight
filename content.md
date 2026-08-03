我们将进行 Phase 3 的核心 UI 交付：**构建主页 Dashboard 视图 (`src/views/Dashboard.tsx`)** 与 **训练视图 (`src/views/TrainingView.tsx`)**，并将其在 `src/app.tsx` 中完整串构。

这套界面将提供：
1. **主页 Dashboard**：展示三种训练模式卡片、能力度数、正确率、全量数据 JSON 导入与导出。
2. **训练视图 TrainingView**：无缝连接 Canvas 绘图、阶梯算法与数据库静默写入，支持实时计时、已练张数统计、基准测试（固定 20 题）与空格/Esc 快捷键支持。

## [WIP] feat: 实现 Dashboard 看板视图与完整 Training 训练流程界面

### 用户需求
1. 创建 `src/views/Dashboard.tsx`：提供 3 种训练模式的能力度数卡片，包含“开始训练”、“基准测试”触发器及 JSON 全量数据备份与还原功能。
2. 创建 `src/views/TrainingView.tsx`：实现包含顶部数据状态栏、双 Canvas 作答、自适应梯度实时调优、自动会话写入与快捷键 (Space/Esc) 响应的训练引擎界面。
3. 重构 `src/app.tsx`，实现 Dashboard 与 TrainingView 的视图路由切换。

### 评论
至此，白皮书 v0.1 规定的全部核心功能（从双 Canvas 渲染、Hit Testing、自适应 80% 正确率阶梯调优，到完整的 UI 闭环与 IndexedDB 存储）均落地完毕，构建了一个高度可扩展且无缝交互的离线 Web 工具。

### 目标
1. 创建 `src/views/Dashboard.tsx` 组件。
2. 创建 `src/views/TrainingView.tsx` 组件。
3. 更新 `src/app.tsx` 实现多视图无缝路由管理。

### 基本原理
- **基准测试 (Benchmark)**：固定 20 题测试，用于快速评估当前模式的能力极限。
- **动态训练 (Training)**：自适应阶梯算法无限出题，随着答题正确率自动收缩/放大网格间距，精准维持 ~80% 临界正确率。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #concept/ui #concept/state #scope/ux #ai/instruct #task/domain/ui #task/object/dashboard-and-training-views #task/action/implementation #task/state/continue #task/status/active

---

### Script

#### Acts 1: 创建 Dashboard 看板视图组件

~~~~~act
write_file
src/views/Dashboard.tsx
~~~~~
~~~~~typescript
import { h } from 'preact';
import { useRef } from 'preact/hooks';
import { TrainingMode } from '../types';
import { UserProfileData, exportAllData, importAllData } from '../utils/db';

interface DashboardProps {
  profiles: Record<TrainingMode, UserProfileData | null>;
  onStart: (mode: TrainingMode, type: 'training' | 'benchmark') => void;
  onRefreshProfiles: () => void;
}

const MODES_CONFIG: Array<{
  id: TrainingMode;
  title: string;
  subtitle: string;
  desc: string;
}> = [
  {
    id: 'single',
    title: '01_单锚点',
    subtitle: 'Single Anchor',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
  },
  {
    id: 'double_h',
    title: '02_水平双锚点',
    subtitle: 'Double Horiz',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
  },
  {
    id: 'double_r',
    title: '03_旋转双锚点',
    subtitle: 'Double Rotated',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
  },
];

export function Dashboard({ profiles, onStart, onRefreshProfiles }: DashboardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 导出 JSON 数据
  const handleExport = async () => {
    const jsonStr = await exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `star_hopping_data_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导入 JSON 数据
  const handleImportFile = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const file = target.files[0];
      const text = await file.text();
      const success = await importAllData(text);
      if (success) {
        alert('✅ 数据导入成功！');
        onRefreshProfiles();
      } else {
        alert('❌ 导入失败，数据格式不匹配。');
      }
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8">
      {/* 顶部标题与操作栏 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            📐 寻星练习 (Star-Hopping)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            基于自适应梯度的空间造型眼力与几何推演训练系统
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            📤 导出数据
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            📥 导入数据
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </div>

      {/* 3 个训练卡片区 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MODES_CONFIG.map((config) => {
          const profile = profiles[config.id];
          const totalCards = profile?.totalTrainedCards || 0;
          const accuracy =
            totalCards > 0
              ? Math.round((profile!.totalHits / totalCards) * 100)
              : 0;
          const currentDegree = profile?.currentDegreeStep || 20;

          return (
            <div
              key={config.id}
              className="bg-white border border-gray-200 hover:border-indigo-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    {config.title}
                  </h3>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {config.subtitle}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                  {config.desc}
                </p>

                {/* 核心指标统计 */}
                <div className="grid grid-cols-2 gap-3 mb-6 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      能力度数 (80%临界)
                    </span>
                    <span className="text-lg font-extrabold text-gray-800">
                      {currentDegree} <span className="text-xs font-normal text-gray-500">px</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      历史正确率
                    </span>
                    <span className="text-lg font-extrabold text-gray-800">
                      {accuracy}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 动作按钮区 */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onStart(config.id, 'training')}
                  className="w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
                >
                  🚀 开始自适应训练
                </button>
                <button
                  onClick={() => onStart(config.id, 'benchmark')}
                  className="w-full py-2 px-4 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  🎯 20 题基准测试
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
~~~~~

#### Acts 2: 创建 TrainingView 训练视图组件

~~~~~act
write_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript
import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { TrainingMode, QuestionData, Point, HitResult, TrialRecord } from '../types';
import { StarCanvas } from '../components/StarCanvas';
import { generateQuestion } from '../utils/geometry';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import { saveTrialRecord, saveSession, SessionData } from '../utils/db';

interface TrainingViewProps {
  mode: TrainingMode;
  sessionType: 'training' | 'benchmark';
  initialGridStep: number;
  onExit: () => void;
}

export function TrainingView({
  mode,
  sessionType,
  initialGridStep,
  onExit,
}: TrainingViewProps) {
  // === 会话状态 ===
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  const startTimeRef = useRef<number>(Date.now());
  const adaptiveEngineRef = useRef<AdaptiveEngine>(new AdaptiveEngine(initialGridStep));

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
      userClick: [clickPoint.x, clickPoint.y],
      angleDegree: question.angleDegree,
      distanceRatio: question.distanceRatio,
      isHit: hitResult.isHit,
      errorPixelDistance: hitResult.errorDistance,
      responseTimeMs,
    };
    await saveTrialRecord(record);

    // 2. 调优阶梯难度步长
    adaptiveEngineRef.current.recordResult(hitResult.isHit);

    // 3. 检查基准测试是否完成 (20 题)
    if (sessionType === 'benchmark' && newTotal >= 20) {
      setIsFinished(true);
      await saveCurrentSession(newTotal, newHits, true);
    }
  };

  // === 切题 ===
  const handleNextQuestion = () => {
    if (isFinished) return;

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
      <header className="w-full bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleFinishSession}
            className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ← 退出训练 (Esc)
          </button>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md uppercase">
            {mode} | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
        </div>

        {/* 核心监控指标 */}
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase">
              已练张数
            </span>
            <span className="font-extrabold text-gray-800">
              {totalTrials} {sessionType === 'benchmark' ? '/ 20' : ''}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase">
              本次正确率
            </span>
            <span className="font-extrabold text-gray-800">
              {currentAccuracy}%
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase">
              当前网格步长
            </span>
            <span className="font-extrabold text-indigo-600">
              {question.gridStep} px
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase">
              用时
            </span>
            <span className="font-mono font-bold text-gray-800">
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

      {/* 底部提示与操作栏 */}
      <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div>
          {!showAnswer ? (
            <p className="text-xs text-gray-500 font-medium">
              👉 请观察左图，并在右图点击对应位置的目标点
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-bold px-2 py-0.5 rounded ${
                  userAnswer?.hitResult.isHit
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {userAnswer?.hitResult.isHit ? '✅ 击中!' : '❌ 未击中'}
              </span>
              <span className="text-xs text-gray-500">
                偏差距离: {userAnswer?.hitResult.errorDistance} px
              </span>
            </div>
          )}
        </div>

        {isFinished ? (
          <button
            onClick={handleFinishSession}
            className="px-4 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors"
          >
            完成测试并退出
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            disabled={!showAnswer}
            className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition-colors ${
              showAnswer
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            下一题 (Space)
          </button>
        )}
      </div>
    </div>
  );
}
~~~~~

#### Acts 3: 更新 App 根组件实现视图切换

~~~~~act
write_file
src/app.tsx
~~~~~
~~~~~typescript
import { useState, useEffect } from 'preact/hooks';
import { TrainingMode } from './types';
import { Dashboard } from './views/Dashboard';
import { TrainingView } from './views/TrainingView';
import { getAllUserProfiles, UserProfileData } from './utils/db';

export function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');
  const [activeMode, setActiveMode] = useState<TrainingMode>('single');
  const [sessionType, setSessionType] = useState<'training' | 'benchmark'>('training');

  const [profiles, setProfiles] = useState<Record<TrainingMode, UserProfileData | null>>({
    single: null,
    double_h: null,
    double_r: null,
  });

  // 刷新用户能力度数
  const refreshProfiles = async () => {
    const data = await getAllUserProfiles();
    setProfiles(data);
  };

  useEffect(() => {
    refreshProfiles();
  }, []);

  // 启动训练
  const handleStartTraining = (mode: TrainingMode, type: 'training' | 'benchmark') => {
    setActiveMode(mode);
    setSessionType(type);
    setCurrentView('training');
  };

  // 退出训练返回主页
  const handleExitTraining = () => {
    setCurrentView('dashboard');
    refreshProfiles();
  };

  const activeDegreeStep = profiles[activeMode]?.currentDegreeStep || 20;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {currentView === 'dashboard' ? (
        <Dashboard
          profiles={profiles}
          onStart={handleStartTraining}
          onRefreshProfiles={refreshProfiles}
        />
      ) : (
        <TrainingView
          mode={activeMode}
          sessionType={sessionType}
          initialGridStep={activeDegreeStep}
          onExit={handleExitTraining}
        />
      )}
    </div>
  );
}
~~~~~

---

### 下一步建议

🎉 **全套应用搭建已完成！** 

我们已经成功将白皮书 v0.1 规划的全部内容在前端完整落地：
1. **双 Canvas 矢量渲染与精准碰撞检测**。
2. **IndexedDB 本地持久化与 JSON 全量导入导出**。
3. **3-Up / 1-Down 自适应阶梯难度引擎**。
4. **主页 Dashboard 看板与完整 Training 训练流程**。

你可以直接在终端启动项目并进行完整交互体验：
```bash
npm run dev
```

如果你希望提交 Git 变更或对系统有进一步优化要求，请告诉我！
