好的，我们将按照上述“透明智能 + 显式覆盖”的设计思路落地 **专项靶向强化训练模式**。

下面是为您生成的代码实现与文件修改指令。

## [WIP] feat: 落地弱点角度专项靶向强化训练模式

### 用户需求
支持针对用户的视觉盲区角度（如 45° 东北角）进行专项靶向强化训练。
1. **概率重采样生成**：在靶向模式下，70% 概率针对弱点扇区倾斜发题，30% 保留全盘随机探索。
2. **多层级控制**：支持“关闭（全随机）”、“智能自动（自动提取历史弱点）”和“手动指定（锁定特定角度）”三种模式。
3. **一键联动**：在“弱点分析弹窗”中可一键将诊断出的弱点扇区设为靶向训练目标。

### 评论
该功能的落地完成了“评估 - 诊断 - 强化”的训练闭环。通过“70% 靶向 + 30% 保留探索”的加权抽样算法，既保证了训练对弱点的高效覆盖，又避免了连续同角度引起的视觉疲劳。

### 目标
1. 扩展 `settings.ts`，增加 `targetingMode`（`off` | `auto` | `manual`）及 `manualTargetSectors` 配置。
2. 升级 `geometry.ts` 中的 `generateQuestion`，支持传入加权靶向配置。
3. 扩展 `SettingsModal.tsx`，添加“专项靶向训练设置”控制界面。
4. 增强 `AnalyticsModal.tsx`，在弱点分析卡片中提供“一键开启该弱点靶向强化”功能。
5. 升级 `TrainingView.tsx`，自动拉取弱点扇区并在顶栏实时显示靶向训练状态勋章。

### 基本原理
- **角度加权抽样**：在选择发题角度时，通过 `selectAngleWithTargeting` 函数判定：当处于靶向状态时，有 70% 的概率选择弱点扇区中心角度并在 $\pm 20^\circ$ 范围内添加平滑随机抖动；其余 30% 的概率进行全盘均匀随机，保证抽样分布的合理性。
- **状态解耦**：设置与算法纯增量扩展，完全保留原有训练和测试模式的兼容性。

### 标签
#intent/build #flow/ready #priority/high 
#comp/interfaces #concept/ui #scope/ux #scope/dx 
#ai/instruct
#task/domain/adaptive-engine
#task/object/targeted-training
#task/action/implementation
#task/state/begin #task/status/active

---

### Script

#### Acts 1: 扩展偏好设置 `settings.ts` 结构

增加 `TargetingMode` 类型定义及默认配置参数。

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
export type StepGranularity = 'standard' | 'fine';
export type AdaptiveMode = 'block' | 'staircase';
export type TargetingMode = 'off' | 'auto' | 'manual';

export interface UserSettings {
  autoNext: boolean;            // 点击后是否自动翻页
  autoNextDelay: number;       // 自动翻页延迟 (ms)
  stepGranularity: StepGranularity; // 步长粒度 ('standard': 默认阶梯, 'fine': 1px逐级)
  adaptiveMode: AdaptiveMode;   // 自适应算子模式 ('block': 轮次胜率评估, 'staircase': 经典3U1D)
  targetAccuracy: number;      // 目标通关正确率 (0.7, 0.8, 0.85, 0.9)
  blockSize: number;           // 每轮评估题数 (10, 15, 20)
  targetingMode: TargetingMode; // 专项靶向训练模式 ('off': 关闭, 'auto': 智能自动, 'manual': 手动指定)
  manualTargetSectors: number[]; // 手动锁定的扇区索引数组 [0~7]
}

const SETTINGS_KEY = 'star_hopping_user_settings';

export const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
  targetingMode: 'off',
  manualTargetSectors: [],
};
~~~~~

#### Acts 2: 升级几何发题算法 `geometry.ts` 支持加权抽样

增加 `QuestionGenerateOptions` 接口与 `selectAngleWithTargeting` 随机抽样逻辑。

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript.old
/**
 * 随机生成算法：根据模式与难度步长生成一道题目数据
 */
export function generateQuestion(
  mode: TrainingMode,
  gridStep: number
): QuestionData {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  if (mode === 'single') {
    // === 1. 单锚点模式 ===
    const anchorA: Point = { x: CX, y: CY };
    const angle = Math.floor(Math.random() * 360);
~~~~~
~~~~~typescript.new
export interface QuestionGenerateOptions {
  targetingMode?: 'off' | 'auto' | 'manual';
  targetSectors?: number[]; // [0~7]
}

/**
 * 加权随机生成极角：70% 概率落入靶向弱点扇区，30% 概率全盘均匀探索
 */
function selectAngleWithTargeting(options?: QuestionGenerateOptions): number {
  if (
    options &&
    options.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;
      const jitter = (Math.random() - 0.5) * 40; // ±20° 范围加权抖动
      return Math.floor((sectorCenterAngle + jitter + 360) % 360);
    }
  }
  return Math.floor(Math.random() * 360);
}

/**
 * 随机生成算法：根据模式与难度步长生成一道题目数据
 */
export function generateQuestion(
  mode: TrainingMode,
  gridStep: number,
  options?: QuestionGenerateOptions
): QuestionData {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  if (mode === 'single') {
    // === 1. 单锚点模式 ===
    const anchorA: Point = { x: CX, y: CY };
    const angle = selectAngleWithTargeting(options);
~~~~~

#### Acts 3: 扩展设置弹窗 `SettingsModal.tsx` 交互界面

在设置弹窗中添加“专项靶向训练设置”区，支持选择模式及勾选手动锁定扇区。

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
import { X, Sliders, ToggleLeft, ToggleRight, Target, Flame } from 'lucide-preact';
import { UserSettings, saveSettings } from '../utils/settings';
~~~~~
~~~~~typescript.new
import { X, Sliders, ToggleLeft, ToggleRight, Target, Flame, Crosshair } from 'lucide-preact';
import { UserSettings, TargetingMode, saveSettings } from '../utils/settings';

const SECTOR_NAMES = [
  '正东(0°)',
  '东北(45°)',
  '正北(90°)',
  '西北(135°)',
  '正西(180°)',
  '西南(225°)',
  '正南(270°)',
  '东南(315°)',
];
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
  const handleBlockSizeChange = (size: number) => {
    setCurrent((prev) => ({ ...prev, blockSize: size }));
  };

  const handleConfirm = () => {
~~~~~
~~~~~typescript.new
  const handleBlockSizeChange = (size: number) => {
    setCurrent((prev) => ({ ...prev, blockSize: size }));
  };

  const handleTargetingModeChange = (mode: TargetingMode) => {
    setCurrent((prev) => ({ ...prev, targetingMode: mode }));
  };

  const handleSectorToggle = (sectorIdx: number) => {
    setCurrent((prev) => {
      const currentSectors = prev.manualTargetSectors || [];
      const exists = currentSectors.includes(sectorIdx);
      const updated = exists
        ? currentSectors.filter((s) => s !== sectorIdx)
        : [...currentSectors, sectorIdx];
      return { ...prev, manualTargetSectors: updated };
    });
  };

  const handleConfirm = () => {
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
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

          {/* 专项靶向强化训练设置 */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Crosshair className="w-4 h-4 text-indigo-600" />
              弱点专项靶向强化
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'off', label: '关闭 (全随机)' },
                { id: 'auto', label: '智能自动' },
                { id: 'manual', label: '手动指定' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleTargetingModeChange(m.id as TargetingMode)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    current.targetingMode === m.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* 手动勾选扇区 */}
            {current.targetingMode === 'manual' && (
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                <div className="text-[11px] font-semibold text-slate-500">
                  选择需要靶向强化的角度扇区：
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {SECTOR_NAMES.map((name, idx) => {
                    const selected = (current.manualTargetSectors || []).includes(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSectorToggle(idx)}
                        className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all ${
                          selected
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
~~~~~

#### Acts 4: 在 `AnalyticsModal.tsx` 中增加一键靶向强化按钮

在弱点诊断区域增加“一键开启该方向靶向强化”的操作入口。

~~~~~act
patch_file
src/components/AnalyticsModal.tsx
~~~~~
~~~~~typescript.old
import { X, Target, Compass, BarChart2, AlertCircle, Info } from 'lucide-preact';
import { TrialRecord, TrainingMode } from '../types';
import { getAllTrialRecords } from '../utils/db';
~~~~~
~~~~~typescript.new
import { X, Target, Compass, BarChart2, AlertCircle, Info, Crosshair } from 'lucide-preact';
import { TrialRecord, TrainingMode } from '../types';
import { getAllTrialRecords } from '../utils/db';
import { loadSettings, saveSettings } from '../utils/settings';
~~~~~

~~~~~act
patch_file
src/components/AnalyticsModal.tsx
~~~~~
~~~~~typescript.old
  const sectorStats = sectorBuckets.map((b, i) => {
    const acc = b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0;
    const avgErr = b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0;
    return {
      label: SECTOR_LABELS[i],
      total: b.total,
      accuracy: acc,
      avgError: avgErr,
    };
  });
~~~~~
~~~~~typescript.new
  const sectorStats = sectorBuckets.map((b, i) => {
    const acc = b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0;
    const avgErr = b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0;
    return {
      sectorIdx: i,
      label: SECTOR_LABELS[i],
      total: b.total,
      accuracy: acc,
      avgError: avgErr,
    };
  });

  const handleApplyTargeting = (sectorIdx: number) => {
    const settings = loadSettings();
    saveSettings({
      ...settings,
      targetingMode: 'manual',
      manualTargetSectors: [sectorIdx],
    });
    alert(`🎯 已成功设置：将在训练中专项强化【${SECTOR_LABELS[sectorIdx]}】视角！`);
    onClose();
  };
~~~~~

~~~~~act
patch_file
src/components/AnalyticsModal.tsx
~~~~~
~~~~~typescript.old
                  {weakestSector ? (
                    <div className="space-y-1">
                      <p className="text-slate-700 text-[11px]">
                        你在 <span className="font-bold text-amber-700">{weakestSector.label}</span> 方向上正确率最低：
                      </p>
                      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-amber-200/60">
                        <span className="font-bold text-slate-800">{weakestSector.label}</span>
                        <span className="font-black text-rose-600 text-sm">
                          {weakestSector.accuracy}% 正确率
                        </span>
                      </div>
                    </div>
                  ) : (
~~~~~
~~~~~typescript.new
                  {weakestSector ? (
                    <div className="space-y-2">
                      <p className="text-slate-700 text-[11px]">
                        你在 <span className="font-bold text-amber-700">{weakestSector.label}</span> 方向上正确率最低：
                      </p>
                      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-amber-200/60">
                        <span className="font-bold text-slate-800">{weakestSector.label}</span>
                        <span className="font-black text-rose-600 text-sm">
                          {weakestSector.accuracy}% 正确率
                        </span>
                      </div>
                      <button
                        onClick={() => handleApplyTargeting(weakestSector.sectorIdx)}
                        className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                        一键开启该方向专项强化
                      </button>
                    </div>
                  ) : (
~~~~~

#### Acts 5: 在 `TrainingView.tsx` 中应用靶向弱点与状态勋章展示

在训练视图中根据偏好设置或实时计算自动弱点参数，生成靶向题目并在顶栏显示强化勋章。

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
import { ArrowLeft, Clock, ChevronRight } from 'lucide-preact';
import { TrainingMode, QuestionData, Point, HitResult, TrialRecord } from '../types';
import { StarCanvas } from '../components/StarCanvas';
import { generateQuestion } from '../utils/geometry';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import { saveTrialRecord, saveSession, SessionData } from '../utils/db';
~~~~~
~~~~~typescript.new
import { ArrowLeft, Clock, ChevronRight, Crosshair } from 'lucide-preact';
import { TrainingMode, QuestionData, Point, HitResult, TrialRecord } from '../types';
import { StarCanvas } from '../components/StarCanvas';
import { generateQuestion, QuestionGenerateOptions } from '../utils/geometry';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import { saveTrialRecord, saveSession, getAllTrialRecords, SessionData } from '../utils/db';
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
  const autoNextTimerRef = useRef<number | null>(null);

  const [question, setQuestion] = useState<QuestionData>(() =>
    generateQuestion(mode, initialGridStep)
  );
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
~~~~~
~~~~~typescript.new
  const autoNextTimerRef = useRef<number | null>(null);
  const targetSectorsRef = useRef<number[]>(settings.manualTargetSectors || []);

  // 辅助：获取发题配置选项
  const getGenerateOptions = (): QuestionGenerateOptions => {
    return {
      targetingMode: settings.targetingMode,
      targetSectors:
        settings.targetingMode === 'manual'
          ? settings.manualTargetSectors
          : targetSectorsRef.current,
    };
  };

  const [question, setQuestion] = useState<QuestionData>(() =>
    generateQuestion(mode, initialGridStep, {
      targetingMode: settings.targetingMode,
      targetSectors: settings.manualTargetSectors,
    })
  );
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // 自动拉取弱点扇区（若为 auto 模式）
  useEffect(() => {
    if (settings.targetingMode === 'auto') {
      getAllTrialRecords(mode).then((records) => {
        if (records.length >= 3) {
          const buckets = Array.from({ length: 8 }, () => ({ total: 0, hits: 0 }));
          records.forEach((r) => {
            const idx = Math.floor(((r.angleDegree + 22.5) % 360) / 45);
            buckets[idx].total += 1;
            if (r.isHit) buckets[idx].hits += 1;
          });
          let minAcc = 1.0;
          let minIdx = 0;
          buckets.forEach((b, i) => {
            if (b.total >= 1) {
              const acc = b.hits / b.total;
              if (acc < minAcc) {
                minAcc = acc;
                minIdx = i;
              }
            }
          });
          targetSectorsRef.current = [minIdx];
        }
      });
    }
  }, [mode, settings.targetingMode]);
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
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
    setQuestion(generateQuestion(mode, nextStep, getGenerateOptions()));
    setQuestionStartTime(Date.now());
  };
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {mode} | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
        </div>
~~~~~
~~~~~typescript.new
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {mode} | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
          {settings.targetingMode !== 'off' && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              {settings.targetingMode === 'auto' ? '智能靶向强化' : '手动靶向强化'}
            </span>
          )}
        </div>
~~~~~

---

### 下一步建议
1. **测试与验证**：在“偏好设置”中将“弱点专项靶向强化”切换为“智能自动”或“手动指定”（如选择“东北 45°”），启动训练后观察生成的题目极角分布，验证 70% 概率倾斜发题的效果。
2. **效果追踪**：在多轮靶向训练后，再次打开“弱点分析”罗盘，验证弱点扇区的正确率与误差是否有针对性的提升。
