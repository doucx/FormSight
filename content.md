你的考虑非常细腻且符合认知心理学原理！无感、无压力的训练能帮助用户更好地专注于视觉感知本身，而不是被“还差几题通关”的指标分散注意力。

我将从训练顶栏中移除“本层进度”的实时高亮面板，让自适应难度在后台静默评估并平滑调整。

## [WIP] style: 移除训练视图顶栏的“本层进度”高亮显示

### 用户需求
移除训练顶栏中显示的“本层进度（如 3/10 题）”高亮面板，避免给用户带来额外的做答心理压力。

### 评论
完全同意。在认知视觉训练中，过多的即时指标提示容易引发焦虑感和绩效导向，干扰原本需要的直觉沉浸体验。把轮次计算放在后台静默进行是更好的设计选择。

### 目标
1. 从 `TrainingView.tsx` 顶栏中移除“本层进度”这一 UI 组件。
2. 保持后台 `AdaptiveEngine` 的轮次评估逻辑不变，实现无感、无压力的自适应训练体验。

### 基本原理
移除界面上的实时题数与胜率统计指示，让用户在纯粹的图形感知中自然答题。后台引擎依然会严格按照用户设置的目标正确率（如 80%）在每轮 10 题后自动静默调控难度。

### 标签
#intent/tune #flow/ready #priority/low #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/training-view-header #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 移除 `TrainingView.tsx` 中的本层进度显示

删除顶栏中的“本层进度”节点及未使用的状态与图标引用。

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
import { ArrowLeft, Clock, ChevronRight, Target } from 'lucide-preact';
import { TrainingMode, QuestionData, Point, HitResult, TrialRecord } from '../types';
import { StarCanvas } from '../components/StarCanvas';
import { generateQuestion } from '../utils/geometry';
import { AdaptiveEngine, AdaptiveProgress } from '../utils/adaptiveEngine';
import { saveTrialRecord, saveSession, SessionData } from '../utils/db';
import { UserSettings } from '../utils/settings';
~~~~~
~~~~~typescript.new
import { ArrowLeft, Clock, ChevronRight } from 'lucide-preact';
import { TrainingMode, QuestionData, Point, HitResult, TrialRecord } from '../types';
import { StarCanvas } from '../components/StarCanvas';
import { generateQuestion } from '../utils/geometry';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import { saveTrialRecord, saveSession, SessionData } from '../utils/db';
import { UserSettings } from '../utils/settings';
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
  // 统计指标
  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [hitTrials, setHitTrials] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // 轮次进度（仅在 block 模式下有效）
  const [blockProgress, setBlockProgress] = useState<AdaptiveProgress | null>(
    adaptiveEngineRef.current.getBlockProgress()
  );
~~~~~
~~~~~typescript.new
  // 统计指标
  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [hitTrials, setHitTrials] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
    // 2. 调优阶梯难度步长
    const output = adaptiveEngineRef.current.recordResult(hitResult.isHit);
    if (output.progress) {
      setBlockProgress(output.progress);
    }
~~~~~
~~~~~typescript.new
    // 2. 调优阶梯难度步长
    adaptiveEngineRef.current.recordResult(hitResult.isHit);
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              总正确率
            </span>
            <span className="font-black text-gray-800">
              {currentAccuracy}%
            </span>
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              当前网格步长
            </span>
            <span className="font-black text-indigo-600">
              {question.gridStep} px
            </span>
          </div>
~~~~~

---

### 下一步建议

修改已应用完成。顶栏界面现在更加洁净、无压。

你可以试运行并体验一下，如果一切正常，告诉我即可为你生成完整的 Git 提交计划。
