我们将重构 `SettingsModal.tsx` 并将其深度接入各个训练视图，使偏好设置弹窗彻底由 `TrainingDomain`（`star` | `color` | `relative_color`）驱动，精准分发并控制各个训练模块的专属配置。同时更新关联的测试用例。

## [WIP] refactor(ui): 改造 SettingsModal 为领域驱动并接入各视图设置

### 用户需求
1. 重构 `SettingsModal.tsx`，接受 `domain: TrainingDomain` 属性，依据所属领域动态读写并渲染专属设置。
2. 将自动翻页、延迟、阶梯算法精细度等通用选项隔离在当前 `domain` 的命名空间下。
3. 更新 `src/app.tsx`，向 `TrainingView`（寻星）、`ColorTrainingView`（绝对色感）、`RelativeColorTrainingView`（相对色感）精准分发 `settings.star`、`settings.color`、`settings.relative_color` 强类型配置对象。
4. 更新 `src/utils/__tests__/db.test.ts` 中的 `saveSettings` 调用方式，使其符合最新的领域化 `UserSettings` 规范。

### 评论
通过领域化驱动 `SettingsModal`，彻底打破了以往使用 `appContext` 和分支三元表达式进行强行拼接的架构缺陷。这使得各个训练模块的配置修改、存储与分发具备高度的扩展性与强类型保护。

### 目标
1. 完成 `src/components/SettingsModal.tsx` 领域化渲染与读写重构。
2. 重构 `TrainingView.tsx`、`ColorTrainingView.tsx` 和 `RelativeColorTrainingView.tsx` 的 Props 接口，使其解耦并分别接收 `StarSettings`、`ColorSenseSettings` 和 `RelativeColorSettings`。
3. 在 `src/app.tsx` 中分发精确领域设置。
4. 更新 `src/utils/__tests__/db.test.ts` 确保测试完全通过。

### 基本原理
各视图仅依赖其所隶属领域的专门类型（如 `StarSettings`），不再接触全局不相关的其他模块设置；`SettingsModal` 借助通用更新工具函数 `updateDomainSettings` 根据传入的 `domain` 动态打补丁并持久化至 `UserSettings` 中，保持修改的单向数据流与类型安全性。

### 标签
#intent/refine #flow/ready #priority/high #comp/ui #concept/config #scope/ux #ai/instruct #task/domain/ui #task/object/domain-scoped-settings-modal #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 重构 `src/components/SettingsModal.tsx` 为领域驱动

~~~~~act
write_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript
import { Crosshair, Flame, Sliders, Target, ToggleLeft, ToggleRight, X } from 'lucide-preact';
import { useState } from 'preact/hooks';
import type { TrainingDomain } from '../utils/db';
import {
  type ColorSenseSettings,
  type RelativeColorSettings,
  type StarSettings,
  type TargetingMode,
  type UserSettings,
  saveSettings,
} from '../utils/settings';

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

const COLOR_SECTOR_NAMES = [
  '红 (0°-30°)',
  '橙 (30°-60°)',
  '黄 (60°-90°)',
  '黄绿 (90°-120°)',
  '绿 (120°-150°)',
  '青绿 (150°-180°)',
  '青 (180°-210°)',
  '蓝 (210°-240°)',
  '蓝紫 (240°-270°)',
  '紫 (270°-300°)',
  '品红 (300°-330°)',
  '紫红 (330°-360°)',
];

const DOMAIN_TITLE: Record<TrainingDomain, string> = {
  star: '寻星训练偏好设置',
  color: '绝对色感偏好设置',
  relative_color: '相对色感偏好设置',
};

interface SettingsModalProps {
  domain: TrainingDomain;
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => void;
}

export function SettingsModal({ domain, settings, onClose, onSave }: SettingsModalProps) {
  const [current, setCurrent] = useState<UserSettings>({ ...settings });

  // 泛型通用方法：更新当前 domain 的配置，同步更新 state、localStorage 并通知父组件
  const updateDomainSettings = (
    patch:
      | Partial<StarSettings | ColorSenseSettings | RelativeColorSettings>
      | ((
          prev: StarSettings | ColorSenseSettings | RelativeColorSettings,
        ) => Partial<StarSettings | ColorSenseSettings | RelativeColorSettings>),
  ) => {
    setCurrent((prev) => {
      const prevDomainSettings = prev[domain];
      const updatedPatch =
        typeof patch === 'function' ? patch(prevDomainSettings) : patch;
      const nextDomainSettings = { ...prevDomainSettings, ...updatedPatch };
      const nextSettings = {
        ...prev,
        [domain]: nextDomainSettings,
      };
      saveSettings(nextSettings);
      onSave(nextSettings);
      return nextSettings;
    });
  };

  const domainSettings = current[domain];

  const handleSectorToggle = (sectorIdx: number) => {
    if (domain !== 'star' && domain !== 'color') return;
    const currentSectors = domainSettings.manualTargetSectors || [];
    const exists = currentSectors.includes(sectorIdx);
    const updated = exists
      ? currentSectors.filter((s) => s !== sectorIdx)
      : [...currentSectors, sectorIdx];

    updateDomainSettings({ manualTargetSectors: updated });
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')
        ) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">{DOMAIN_TITLE[domain]}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* 1. 自动翻页开关 (领域隔离) */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-700">自动切换下一题</div>
              <div className="text-xs text-slate-400">点击答题后无需手动按空格切题</div>
            </div>
            <button
              type="button"
              onClick={() => updateDomainSettings({ autoNext: !domainSettings.autoNext })}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {domainSettings.autoNext ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          {/* 2. 自动翻页延迟 (领域隔离) */}
          {domainSettings.autoNext && (
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                <span>切换延迟时间</span>
                <span className="font-mono text-indigo-600 font-bold">
                  {domainSettings.autoNextDelay} ms
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={domainSettings.autoNextDelay}
                onInput={(e) => {
                  const val = Number.parseInt((e.target as HTMLInputElement).value, 10);
                  updateDomainSettings({ autoNextDelay: val });
                }}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          )}

          {/* 3. 训练算子模式 (领域隔离) */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">自适应算子模式</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateDomainSettings({ adaptiveMode: 'block' })}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                  domainSettings.adaptiveMode === 'block'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-indigo-600" />
                轮次胜率评估 (推荐)
              </button>
              <button
                type="button"
                onClick={() => updateDomainSettings({ adaptiveMode: 'staircase' })}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                  domainSettings.adaptiveMode === 'staircase'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                经典 3U1D 阶梯
              </button>
            </div>
          </div>

          {/* 4. 轮次评估配置项 (领域隔离) */}
          {domainSettings.adaptiveMode === 'block' && (
            <div className="space-y-3 bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100">
              {/* 目标通关正确率 */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                  <span>目标通关正确率</span>
                  <span className="font-bold text-indigo-600 font-mono">
                    {Math.round(domainSettings.targetAccuracy * 100)}%
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0.7, 0.8, 0.85, 0.9].map((acc) => (
                    <button
                      type="button"
                      key={acc}
                      onClick={() => updateDomainSettings({ targetAccuracy: acc })}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        domainSettings.targetAccuracy === acc
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
                    {domainSettings.blockSize} 题/轮
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[10, 15, 20].map((size) => (
                    <button
                      type="button"
                      key={size}
                      onClick={() => updateDomainSettings({ blockSize: size })}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        domainSettings.blockSize === size
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

          {/* 5. 难度步长粒度 (领域隔离) */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">难度阶梯精细度</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateDomainSettings({ stepGranularity: 'standard' })}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  domainSettings.stepGranularity === 'standard'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                标准阶梯 (大步幅)
              </button>
              <button
                type="button"
                onClick={() => updateDomainSettings({ stepGranularity: 'fine' })}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  domainSettings.stepGranularity === 'fine'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                精细阶梯 (小步幅)
              </button>
            </div>
          </div>

          {/* 6. 寻星专属 - 干扰点网格大小 */}
          {domain === 'star' && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-700">干扰点网格大小</div>
              <div className="grid grid-cols-4 gap-1.5">
                {[2, 3, 4, 5].map((size) => (
                  <button
                    type="button"
                    key={size}
                    onClick={() => updateDomainSettings({ gridSize: size })}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      (domainSettings as StarSettings).gridSize === size
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {size}x{size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 7. 色彩类型专属 (color / relative_color) - 滑块外延吸附感应区 */}
          {(domain === 'color' || domain === 'relative_color') && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-700">
                色感滑块极值吸附外延感应区
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '关闭 (0px)', value: 0 },
                  { label: '8px', value: 8 },
                  { label: '12px', value: 12 },
                  { label: '20px', value: 20 },
                ].map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => updateDomainSettings({ sliderHitMargin: opt.value })}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      (domainSettings as ColorSenseSettings | RelativeColorSettings)
                        .sliderHitMargin === opt.value
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 8. 色彩类型专属 (color / relative_color) - 显示滑块容错感应区 */}
          {(domain === 'color' || domain === 'relative_color') && (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-700">显示滑块容错感应区</div>
                <div className="text-xs text-slate-400">在悬停光标两侧实时显示 ΔE 动态容错区间</div>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateDomainSettings({
                    showToleranceBand: !(
                      domainSettings as ColorSenseSettings | RelativeColorSettings
                    ).showToleranceBand,
                  })
                }
                className="text-indigo-600 hover:opacity-80 transition-opacity"
              >
                {(domainSettings as ColorSenseSettings | RelativeColorSettings)
                  .showToleranceBand ? (
                  <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-300" />
                )}
              </button>
            </div>
          )}

          {/* 9. 色彩类型专属 (color / relative_color) - 悬停颜色实时联动 */}
          {(domain === 'color' || domain === 'relative_color') && (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-700">
                  {domain === 'color' ? '综合拾色悬停颜色实时联动' : '悬停推移色彩联动预览'}
                </div>
                <div className="text-xs text-slate-400">鼠标悬停滑块时右侧色块实时跟随试探预览</div>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateDomainSettings({
                    enableHoverColorPreview: !(
                      domainSettings as ColorSenseSettings | RelativeColorSettings
                    ).enableHoverColorPreview,
                  })
                }
                className="text-indigo-600 hover:opacity-80 transition-opacity"
              >
                {(domainSettings as ColorSenseSettings | RelativeColorSettings)
                  .enableHoverColorPreview ? (
                  <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-300" />
                )}
              </button>
            </div>
          )}

          {/* 10. 专项靶向强化训练设置 (仅 star / color 模式有效) */}
          {(domain === 'star' || domain === 'color') && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Crosshair className="w-4 h-4 text-indigo-600" />
                弱点专项靶向强化
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'off', label: '关闭 (全随机)' },
                  { id: 'manual', label: '手动指定' },
                ].map((m) => {
                  const isActive =
                    (domainSettings as StarSettings | ColorSenseSettings).targetingMode === m.id;

                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() =>
                        updateDomainSettings({ targetingMode: m.id as TargetingMode })
                      }
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>

              {/* 手动勾选扇区 */}
              {(domainSettings as StarSettings | ColorSenseSettings).targetingMode ===
                'manual' && (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-500">
                    选择需要靶向强化的 {domain === 'color' ? '色相' : '角度'} 扇区：
                  </div>
                  <div
                    className={`grid gap-1.5 ${domain === 'color' ? 'grid-cols-3' : 'grid-cols-4'}`}
                  >
                    {(domain === 'color' ? COLOR_SECTOR_NAMES : SECTOR_NAMES).map(
                      (name, idx) => {
                        const selected = (
                          (domainSettings as StarSettings | ColorSenseSettings)
                            .manualTargetSectors || []
                        ).includes(idx);

                        return (
                          <button
                            type="button"
                            key={name}
                            onClick={() => handleSectorToggle(idx)}
                            className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all ${
                              selected
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {name}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
~~~~~

#### Acts 2: 更新 `TrainingView.tsx` 交互接口为 `StarSettings`

~~~~~act
write_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, ChevronRight, Clock, Crosshair } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { type SessionHistoryItem, SessionSummaryModal } from '../components/SessionSummaryModal';
import { StarCanvas } from '../components/StarCanvas';
import type { HitResult, Point, QuestionData, TrainingMode } from '../types';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import { type SessionData, saveSession, saveTrialRecord } from '../utils/db';
import { type QuestionGenerateOptions, generateQuestion } from '../utils/geometry';
import type { StarSettings } from '../utils/settings';

interface TrainingViewProps {
  mode: TrainingMode;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: StarSettings;
  onExit: () => void;
}

export function TrainingView({
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: TrainingViewProps) {
  // === 会话状态 ===
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  const startTimeRef = useRef<number>(Date.now());
  const adaptiveEngineRef = useRef<AdaptiveEngine>(
    new AdaptiveEngine(
      initialLevel,
      settings.stepGranularity === 'fine',
      sessionType === 'benchmark' ? 'staircase' : settings.adaptiveMode,
      settings.targetAccuracy,
      settings.blockSize,
    ),
  );
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
      gridSize: settings.gridSize,
    };
  };

  const [question, setQuestion] = useState<QuestionData>(() =>
    generateQuestion(mode, initialLevel, getGenerateOptions()),
  );
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

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

  // === 计时器 ===
  useEffect(() => {
    const timer = setInterval(() => {
      if (showSummaryModal || isFinished) return;
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [showSummaryModal, isFinished]);

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
    await saveTrialRecord({
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: sessionIdRef.current,
      domain: 'star',
      mode,
      timestamp: Date.now(),
      difficultyLevel: question.difficultyLevel,
      isHit: hitResult.isHit,
      responseTimeMs,
      details: {
        anchorA: [question.anchorA.x, question.anchorA.y],
        anchorC: question.anchorC ? [question.anchorC.x, question.anchorC.y] : undefined,
        targetB: [question.targetB.x, question.targetB.y],
        userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
        angleDegree: question.angleDegree,
        distanceRatio: question.distanceRatio,
        errorPixelDistance: hitResult.errorDistance,
      },
    });

    // 2. 记录做答 Level 历史
    setSessionHistory((prev) => [
      ...prev,
      {
        trialIndex: newTotal,
        level: question.difficultyLevel,
        isHit: hitResult.isHit,
        responseTimeMs,
      },
    ]);

    // 3. 调优阶梯难度 Level
    adaptiveEngineRef.current.recordResult(hitResult.isHit);

    const delay = settings.autoNextDelay;

    // 4. 检查基准测试是否完成 (20 题)
    if (sessionType === 'benchmark' && newTotal >= 20) {
      setIsFinished(true);
      await saveCurrentSession(newTotal, newHits, true);
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        setShowSummaryModal(true);
      }, delay);
    } else if (settings.autoNext) {
      // 自动翻页延时
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        handleNextQuestion();
      }, delay);
    }
  };

  // === 切题 ===
  const handleNextQuestion = () => {
    if (isFinished) return;
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }

    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateQuestion(mode, nextLevel, getGenerateOptions()));
    setQuestionStartTime(Date.now());
  };

  // === 保存会话数据 ===
  const saveCurrentSession = async (trials = totalTrials, hits = hitTrials, ended = false) => {
    const sessionData: SessionData = {
      id: sessionIdRef.current,
      domain: 'star',
      mode,
      type: sessionType,
      startTimestamp: startTimeRef.current,
      endTimestamp: ended ? Date.now() : undefined,
      totalTrials: trials,
      hitTrials: hits,
      startLevel: initialLevel,
      endLevel: adaptiveEngineRef.current.getCurrentLevel(),
    };
    await saveSession(sessionData);
  };

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
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(mode, nextLevel, getGenerateOptions()));
    setQuestionStartTime(Date.now());
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* 顶栏控制面板 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestFinish}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练 (Esc)
          </button>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {mode} | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
          {settings.targetingMode === 'manual' && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              靶向强化训练
            </span>
          )}
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
              当前难度
            </span>
            <span className="font-black text-indigo-600">Level {question.difficultyLevel}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-slate-700">{formatTime(elapsedSeconds)}</span>
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
              type="button"
              onClick={handleRequestFinish}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all"
            >
              完成并查看总结
            </button>
          ) : (
            <button
              type="button"
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

#### Acts 3: 更新 `ColorTrainingView.tsx` 交互接口为 `ColorSenseSettings`

~~~~~act
write_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, ChevronRight, Clock, Crosshair } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ColorCanvas } from '../components/ColorCanvas';
import { type SessionHistoryItem, SessionSummaryModal } from '../components/SessionSummaryModal';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import {
  type ColorHitResult,
  type ColorMode,
  type ColorQuestionData,
  type ColorQuestionGenerateOptions,
  checkColorHit,
  generateColorQuestion,
} from '../utils/colorUtils';
import { type ColorSessionData, saveColorSession, saveColorTrialRecord } from '../utils/db';
import type { ColorSenseSettings } from '../utils/settings';

interface ColorTrainingViewProps {
  mode: ColorMode;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: ColorSenseSettings;
  onExit: () => void;
}

export function ColorTrainingView({
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: ColorTrainingViewProps) {
  const sessionIdRef = useRef<string>(`csession_${Date.now()}`);
  const startTimeRef = useRef<number>(Date.now());
  const adaptiveEngineRef = useRef<AdaptiveEngine>(
    new AdaptiveEngine(
      initialLevel,
      settings.stepGranularity === 'fine',
      sessionType === 'benchmark' ? 'staircase' : settings.adaptiveMode,
      settings.targetAccuracy,
      settings.blockSize,
    ),
  );
  const autoNextTimerRef = useRef<number | null>(null);
  const targetSectorsRef = useRef<number[]>(settings.manualTargetSectors || []);

  const getColorGenerateOptions = (): ColorQuestionGenerateOptions => {
    return {
      targetingMode: settings.targetingMode,
      targetSectors:
        settings.targetingMode === 'manual'
          ? settings.manualTargetSectors
          : targetSectorsRef.current,
    };
  };

  const [question, setQuestion] = useState<ColorQuestionData>(() =>
    generateColorQuestion(mode, initialLevel, getColorGenerateOptions()),
  );
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<ColorHitResult | null>(null);

  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [hitTrials, setHitTrials] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

  // 计时器逻辑
  useEffect(() => {
    const timer = setInterval(() => {
      if (showSummaryModal || isFinished) return;
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [showSummaryModal, isFinished]);

  // 键盘响应 (Space 揭晓答案后切题 / Esc 退出)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (showAnswer && !isFinished) {
          e.preventDefault();
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

  // 作答响应
  const handleAnswer = async (userVal: number | [number, number, number]) => {
    const responseTimeMs = Date.now() - questionStartTime;
    const hitResult = checkColorHit(mode, userVal, question);

    setUserAnswer(hitResult);
    setShowAnswer(true);

    const newTotal = totalTrials + 1;
    const newHits = hitTrials + (hitResult.isHit ? 1 : 0);
    setTotalTrials(newTotal);
    setHitTrials(newHits);

    const computedUserHSV: [number, number, number] =
      mode === 'ALL' && Array.isArray(userVal)
        ? userVal
        : [
            mode === 'H' ? (userVal as number) : question.targetH,
            mode === 'S' ? (userVal as number) : question.targetS,
            mode === 'V' ? (userVal as number) : question.targetV,
          ];

    // 数据库存盘
    await saveColorTrialRecord({
      id: `crec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: sessionIdRef.current,
      domain: 'color',
      mode,
      timestamp: Date.now(),
      difficultyLevel: question.difficultyLevel,
      isHit: hitResult.isHit,
      responseTimeMs,
      details: {
        targetHSV: [question.targetH, question.targetS, question.targetV],
        userHSV: computedUserHSV,
        errorValue: hitResult.errorValue,
      },
    });

    setSessionHistory((prev) => [
      ...prev,
      {
        trialIndex: newTotal,
        level: question.difficultyLevel,
        isHit: hitResult.isHit,
        responseTimeMs,
      },
    ]);

    adaptiveEngineRef.current.recordResult(hitResult.isHit);

    const delay = settings.autoNextDelay;

    if (sessionType === 'benchmark' && newTotal >= 20) {
      setIsFinished(true);
      await saveCurrentSession(newTotal, newHits, true);
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        setShowSummaryModal(true);
      }, delay);
    } else if (settings.autoNext) {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        handleNextQuestion();
      }, delay);
    }
  };

  const handleNextQuestion = () => {
    if (isFinished) return;
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }

    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateColorQuestion(mode, nextLevel, getColorGenerateOptions()));
    setQuestionStartTime(Date.now());
  };

  const saveCurrentSession = async (trials = totalTrials, hits = hitTrials, ended = false) => {
    const sessionData: ColorSessionData = {
      id: sessionIdRef.current,
      domain: 'color',
      mode,
      type: sessionType,
      startTimestamp: startTimeRef.current,
      endTimestamp: ended ? Date.now() : undefined,
      totalTrials: trials,
      hitTrials: hits,
      startLevel: initialLevel,
      endLevel: adaptiveEngineRef.current.getCurrentLevel(),
    };
    await saveColorSession(sessionData);
  };

  const handleRequestFinish = async () => {
    if (sessionHistory.length > 0 && !showSummaryModal) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      setShowSummaryModal(true);
    } else {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onExit();
    }
  };

  const handleFinishSession = async () => {
    await saveCurrentSession(totalTrials, hitTrials, true);
    onExit();
  };

  const handleRestartSession = () => {
    setShowSummaryModal(false);
    setIsFinished(false);
    setTotalTrials(0);
    setHitTrials(0);
    setSessionHistory([]);
    setShowAnswer(false);
    setUserAnswer(null);
    sessionIdRef.current = `csession_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateColorQuestion(mode, nextLevel, getColorGenerateOptions()));
    setQuestionStartTime(Date.now());
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* 顶栏 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestFinish}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练 (Esc)
          </button>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {mode === 'H' ? '色相' : mode === 'V' ? '明度' : mode === 'S' ? '饱和度' : '综合拾色'} |{' '}
            {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
          {settings.targetingMode === 'manual' && mode === 'H' && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              靶向强化训练
            </span>
          )}
        </div>

        {/* 监控指标 */}
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
              当前难度
            </span>
            <span className="font-black text-indigo-600">Level {question.difficultyLevel}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-slate-700">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>
      </header>

      {/* 色彩交互 Canvas */}
      <ColorCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
        hitMargin={settings.sliderHitMargin ?? 12}
        showToleranceBand={settings.showToleranceBand ?? true}
        enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
      />

      {/* 底部控制栏 */}
      {!settings.autoNext && (
        <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl p-3 shadow-sm flex items-center justify-end min-h-[56px]">
          {isFinished ? (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all"
            >
              完成并查看总结
            </button>
          ) : (
            <button
              type="button"
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
          mode="single"
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

#### Acts 4: 更新 `RelativeColorTrainingView.tsx` 交互接口为 `RelativeColorSettings`

~~~~~act
write_file
src/views/RelativeColorTrainingView.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, ChevronRight, Clock } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { RelativeColorCanvas } from '../components/RelativeColorCanvas';
import { type SessionHistoryItem, SessionSummaryModal } from '../components/SessionSummaryModal';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import { saveSession, saveTrialRecord } from '../utils/db';
import {
  type RelativeColorHitResult,
  type RelativeColorMode,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateRelativeColorQuestion,
} from '../utils/relativeColorUtils';
import type { RelativeColorSettings } from '../utils/settings';

interface RelativeColorTrainingViewProps {
  mode: RelativeColorMode;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: RelativeColorSettings;
  onExit: () => void;
}

export function RelativeColorTrainingView({
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: RelativeColorTrainingViewProps) {
  const sessionIdRef = useRef<string>(`rcsession_${Date.now()}`);
  const startTimeRef = useRef<number>(Date.now());
  const adaptiveEngineRef = useRef<AdaptiveEngine>(
    new AdaptiveEngine(
      initialLevel,
      settings.stepGranularity === 'fine',
      sessionType === 'benchmark' ? 'staircase' : settings.adaptiveMode,
      settings.targetAccuracy,
      settings.blockSize,
    ),
  );
  const autoNextTimerRef = useRef<number | null>(null);

  const [question, setQuestion] = useState<RelativeColorQuestionData>(() =>
    generateRelativeColorQuestion(mode, initialLevel),
  );
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<RelativeColorHitResult | null>(null);

  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [hitTrials, setHitTrials] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (showSummaryModal || isFinished) return;
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [showSummaryModal, isFinished]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (showAnswer && !isFinished) {
          e.preventDefault();
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

  const handleAnswer = async (userD: [number, number, number]) => {
    const responseTimeMs = Date.now() - questionStartTime;
    const hitResult = checkRelativeColorHit(mode, userD, question);

    setUserAnswer(hitResult);
    setShowAnswer(true);

    const newTotal = totalTrials + 1;
    const newHits = hitTrials + (hitResult.isHit ? 1 : 0);
    setTotalTrials(newTotal);
    setHitTrials(newHits);

    // 通用 DB API 提交
    await saveTrialRecord({
      id: `rcrec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: sessionIdRef.current,
      domain: 'relative_color',
      mode,
      timestamp: Date.now(),
      difficultyLevel: question.difficultyLevel,
      isHit: hitResult.isHit,
      responseTimeMs,
      details: {
        colorA: question.colorA,
        colorB: question.colorB,
        colorC: question.colorC,
        targetD: question.targetD,
        userD,
        deltaEError: hitResult.deltaEError,
      },
    });

    setSessionHistory((prev) => [
      ...prev,
      {
        trialIndex: newTotal,
        level: question.difficultyLevel,
        isHit: hitResult.isHit,
        responseTimeMs,
      },
    ]);

    adaptiveEngineRef.current.recordResult(hitResult.isHit);

    const delay = settings.autoNextDelay;

    if (sessionType === 'benchmark' && newTotal >= 20) {
      setIsFinished(true);
      await saveCurrentSession(newTotal, newHits, true);
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        setShowSummaryModal(true);
      }, delay);
    } else if (settings.autoNext) {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        handleNextQuestion();
      }, delay);
    }
  };

  const handleNextQuestion = () => {
    if (isFinished) return;
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }

    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateRelativeColorQuestion(mode, nextLevel));
    setQuestionStartTime(Date.now());
  };

  const saveCurrentSession = async (trials = totalTrials, hits = hitTrials, ended = false) => {
    await saveSession({
      id: sessionIdRef.current,
      domain: 'relative_color',
      mode,
      type: sessionType,
      startTimestamp: startTimeRef.current,
      endTimestamp: ended ? Date.now() : undefined,
      totalTrials: trials,
      hitTrials: hits,
      startLevel: initialLevel,
      endLevel: adaptiveEngineRef.current.getCurrentLevel(),
    });
  };

  const handleRequestFinish = async () => {
    if (sessionHistory.length > 0 && !showSummaryModal) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      setShowSummaryModal(true);
    } else {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onExit();
    }
  };

  const handleFinishSession = async () => {
    await saveCurrentSession(totalTrials, hitTrials, true);
    onExit();
  };

  const handleRestartSession = () => {
    setShowSummaryModal(false);
    setIsFinished(false);
    setTotalTrials(0);
    setHitTrials(0);
    setSessionHistory([]);
    setShowAnswer(false);
    setUserAnswer(null);
    sessionIdRef.current = `rcsession_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateRelativeColorQuestion(mode, nextLevel));
    setQuestionStartTime(Date.now());
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* 顶栏 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestFinish}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练 (Esc)
          </button>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            色彩矢量迁移 | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
        </div>

        {/* 监控指标 */}
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
              当前难度
            </span>
            <span className="font-black text-indigo-600">Level {question.difficultyLevel}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-slate-700">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>
      </header>

      {/* 相对色彩矢量 Canvas */}
      <RelativeColorCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
      />

      {/* 底部控制栏 */}
      {!settings.autoNext && (
        <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl p-3 shadow-sm flex items-center justify-end min-h-[56px]">
          {isFinished ? (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all"
            >
              完成并查看总结
            </button>
          ) : (
            <button
              type="button"
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

      {/* 结算弹窗 */}
      {showSummaryModal && (
        <SessionSummaryModal
          mode="single"
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

#### Acts 5: 更新 `src/app.tsx` 进行领域隔离的精确配置分发

~~~~~act
write_file
src/app.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useState } from 'preact/hooks';
import { AnalyticsModal } from './components/AnalyticsModal';
import { ColorAnalyticsModal } from './components/ColorAnalyticsModal';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { GlobalStatsModal } from './components/GlobalStatsModal';
import { SettingsModal } from './components/SettingsModal';
import type { TrainingMode } from './types';
import type { ColorMode } from './utils/colorUtils';
import {
  type ColorProfileData,
  type TrainingDomain,
  type UserProfileData,
  getAllColorProfiles,
  getAllUserProfiles,
  getColorTrainingTimeMs,
  getStarHoppingTrainingTimeMs,
  getTrainingTimeMs,
} from './utils/db';
import type { RelativeColorMode } from './utils/relativeColorUtils';
import { type UserSettings, loadSettings } from './utils/settings';
import { ColorDashboard } from './views/ColorDashboard';
import { ColorTrainingView } from './views/ColorTrainingView';
import { Dashboard } from './views/Dashboard';
import { Home } from './views/Home';
import { RelativeColorDashboard } from './views/RelativeColorDashboard';
import { RelativeColorTrainingView } from './views/RelativeColorTrainingView';
import { TrainingView } from './views/TrainingView';

type GlobalApp = 'home' | 'star-hopping' | 'color-sense' | 'relative-color';

export function App() {
  const [currentApp, setCurrentApp] = useState<GlobalApp>('home');
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');

  // 寻星状态
  const [activeMode, setActiveMode] = useState<TrainingMode>('single');
  const [sessionType, setSessionType] = useState<'training' | 'benchmark'>('training');

  // 色感状态
  const [activeColorMode, setActiveColorMode] = useState<ColorMode>('H');
  const [colorSessionType, setColorSessionType] = useState<'training' | 'benchmark'>('training');

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsDomain, setSettingsDomain] = useState<TrainingDomain>('star');

  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [isColorAnalyticsOpen, setIsColorAnalyticsOpen] = useState<boolean>(false);
  const [analyticsMode, setAnalyticsMode] = useState<TrainingMode | 'all'>('all');
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  const [profiles, setProfiles] = useState<Record<TrainingMode, UserProfileData | null>>({
    single: null,
    double_h: null,
    double_r: null,
  });
  const [colorProfiles, setColorProfiles] = useState<Record<ColorMode, ColorProfileData | null>>({
    H: null,
    S: null,
    V: null,
    ALL: null,
  });
  const [starHoppingTimeMs, setStarHoppingTimeMs] = useState<number>(0);
  const [colorTimeMs, setColorTimeMs] = useState<number>(0);
  const [relativeColorTimeMs, setRelativeColorTimeMs] = useState<number>(0);

  // 相对色感状态
  const [activeRelativeMode, setActiveRelativeMode] = useState<RelativeColorMode>('VECTOR_SHIFT');
  const [relativeSessionType, setRelativeSessionType] = useState<'training' | 'benchmark'>(
    'training',
  );

  // 刷新用户能力看板与总时间
  const refreshProfiles = useCallback(async () => {
    const data = await getAllUserProfiles();
    const cData = await getAllColorProfiles();
    const starMs = await getStarHoppingTrainingTimeMs();
    const colorMs = await getColorTrainingTimeMs();
    const relMs = await getTrainingTimeMs('relative_color');
    setProfiles(data);
    setColorProfiles(cData);
    setStarHoppingTimeMs(starMs);
    setColorTimeMs(colorMs);
    setRelativeColorTimeMs(relMs);
  }, []);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  // 动态同步 Title
  useEffect(() => {
    if (currentApp === 'home') {
      document.title = 'FormSight - 造型构图与色彩感知训练系统';
    } else if (currentApp === 'star-hopping') {
      document.title = '寻星练习 (Star-Hopping) - FormSight';
    } else if (currentApp === 'color-sense') {
      document.title = '色感训练 (Color Recognition) - FormSight';
    } else if (currentApp === 'relative-color') {
      document.title = '相对色感 (Relative Color) - FormSight';
    }
  }, [currentApp]);

  const handleOpenAnalytics = (mode?: TrainingMode) => {
    setAnalyticsMode(mode || 'all');
    setIsAnalyticsOpen(true);
  };

  const handleStartTraining = (mode: TrainingMode, type: 'training' | 'benchmark') => {
    setActiveMode(mode);
    setSessionType(type);
    setCurrentView('training');
  };

  const handleStartColorTraining = (mode: ColorMode, type: 'training' | 'benchmark') => {
    setActiveColorMode(mode);
    setColorSessionType(type);
    setCurrentView('training');
  };

  const handleExitTraining = () => {
    setCurrentView('dashboard');
    refreshProfiles();
  };

  const activeLevel = profiles[activeMode]?.currentLevel || 5;
  const activeColorLevel = colorProfiles[activeColorMode]?.currentLevel || 5;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {currentApp === 'home' && (
        <Home
          totalTimeMs={starHoppingTimeMs + colorTimeMs + relativeColorTimeMs}
          starHoppingTimeMs={starHoppingTimeMs}
          colorTimeMs={colorTimeMs}
          relativeColorTimeMs={relativeColorTimeMs}
          onNavigate={(app) => {
            setCurrentApp(app);
            setCurrentView('dashboard');
          }}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}

      {currentApp === 'star-hopping' &&
        (currentView === 'dashboard' ? (
          <Dashboard
            profiles={profiles}
            onStart={handleStartTraining}
            onRefreshProfiles={refreshProfiles}
            onOpenSettings={() => {
              setSettingsDomain('star');
              setIsSettingsOpen(true);
            }}
            onOpenAnalytics={handleOpenAnalytics}
            onBackToHome={() => setCurrentApp('home')}
          />
        ) : (
          <TrainingView
            mode={activeMode}
            sessionType={sessionType}
            initialLevel={activeLevel}
            settings={settings.star}
            onExit={handleExitTraining}
          />
        ))}

      {currentApp === 'color-sense' &&
        (currentView === 'dashboard' ? (
          <ColorDashboard
            profiles={colorProfiles}
            onStart={handleStartColorTraining}
            onBackToHome={() => setCurrentApp('home')}
            onOpenSettings={() => {
              setSettingsDomain('color');
              setIsSettingsOpen(true);
            }}
            onOpenAnalytics={() => setIsColorAnalyticsOpen(true)}
          />
        ) : (
          <ColorTrainingView
            mode={activeColorMode}
            sessionType={colorSessionType}
            initialLevel={activeColorLevel}
            settings={settings.color}
            onExit={handleExitTraining}
          />
        ))}

      {currentApp === 'relative-color' &&
        (currentView === 'dashboard' ? (
          <RelativeColorDashboard
            onStart={(relMode, type) => {
              setActiveRelativeMode(relMode);
              setRelativeSessionType(type);
              setCurrentView('training');
            }}
            onBackToHome={() => setCurrentApp('home')}
            onOpenSettings={() => {
              setSettingsDomain('relative_color');
              setIsSettingsOpen(true);
            }}
          />
        ) : (
          <RelativeColorTrainingView
            mode={activeRelativeMode}
            sessionType={relativeSessionType}
            initialLevel={5}
            settings={settings.relative_color}
            onExit={handleExitTraining}
          />
        ))}

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
        />
      )}

      {isGlobalStatsOpen && <GlobalStatsModal onClose={() => setIsGlobalStatsOpen(false)} />}

      {isSettingsOpen && (
        <SettingsModal
          domain={settingsDomain}
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings) => setSettings(newSettings)}
        />
      )}

      {isAnalyticsOpen && (
        <AnalyticsModal initialMode={analyticsMode} onClose={() => setIsAnalyticsOpen(false)} />
      )}

      {isColorAnalyticsOpen && (
        <ColorAnalyticsModal onClose={() => setIsColorAnalyticsOpen(false)} />
      )}
    </div>
  );
}
~~~~~

#### Acts 6: 更新 `src/utils/__tests__/db.test.ts` 中的 `saveSettings` 调用方式

~~~~~act
write_file
src/utils/__tests__/db.test.ts
~~~~~
~~~~~typescript
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllData,
  exportAllData,
  formatTotalTime,
  getAllColorProfiles,
  getAllColorTrialRecords,
  getAllTrialRecords,
  getAllUserProfiles,
  getColorTrainingTimeMs,
  getStarHoppingTrainingTimeMs,
  getTotalTrainingTimeMs,
  getUserProfile,
  importAllData,
  saveColorSession,
  saveColorTrialRecord,
  saveSession,
  saveTrialRecord,
} from '../db';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../settings';

const memoryStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    writable: true,
  });
}

describe('db storage & import/export', () => {
  beforeEach(async () => {
    await clearAllData();
    localStorage.clear();
  });

  it('formatTotalTime - should format milliseconds into days, hours, and minutes', () => {
    expect(formatTotalTime(0)).toBe('0天0小时0分钟');
    expect(formatTotalTime(65 * 1000)).toBe('0天0小时1分钟');
    expect(formatTotalTime((60 * 60 + 120) * 1000)).toBe('0天1小时2分钟');
    expect(formatTotalTime((24 * 3600 + 3600 * 2 + 180) * 1000)).toBe('1天2小时3分钟');
  });

  it('saveTrialRecord - should save trial record and update profile', async () => {
    await saveTrialRecord({
      id: 'r1',
      sessionId: 's1',
      domain: 'star',
      mode: 'single',
      timestamp: Date.now(),
      difficultyLevel: 5,
      isHit: true,
      responseTimeMs: 500,
    });

    const records = await getAllTrialRecords('single');
    expect(records.length).toBe(1);
    expect(records[0].id).toBe('r1');

    const profile = await getUserProfile('single');
    expect(profile).not.toBeNull();
    expect(profile?.totalTrainedCards).toBe(1);
    expect(profile?.totalHits).toBe(1);
  });

  it('getAllUserProfiles & getAllColorProfiles - should retrieve all mode profiles', async () => {
    await saveTrialRecord({
      id: 'r1',
      sessionId: 's1',
      mode: 'single',
      timestamp: Date.now(),
      difficultyLevel: 5,
      anchorA: [250, 250],
      targetB: [300, 250],
      userClick: [300, 250],
      angleDegree: 0,
      distanceRatio: 50,
      isHit: true,
      errorPixelDistance: 0,
      responseTimeMs: 500,
    });

    const userProfiles = await getAllUserProfiles();
    expect(userProfiles.single).not.toBeNull();
    expect(userProfiles.double_h).toBeNull();
    expect(userProfiles.double_r).toBeNull();

    await saveColorTrialRecord({
      id: 'cr1',
      sessionId: 'cs1',
      mode: 'H',
      timestamp: Date.now(),
      difficultyLevel: 5,
      targetHSV: [0, 100, 100],
      userHSV: [0, 100, 100],
      isHit: true,
      errorValue: 0,
      responseTimeMs: 500,
    });

    const colorProfiles = await getAllColorProfiles();
    expect(colorProfiles.H).not.toBeNull();
    expect(colorProfiles.S).toBeNull();
    expect(colorProfiles.V).toBeNull();
    expect(colorProfiles.ALL).toBeNull();

    const colorRecords = await getAllColorTrialRecords('H');
    expect(colorRecords.length).toBe(1);
  });

  it('training time calculation - should aggregate valid session durations', async () => {
    await saveSession({
      id: 's1',
      domain: 'star',
      mode: 'single',
      type: 'training',
      startTimestamp: 1000,
      endTimestamp: 61000, // +60s
      totalTrials: 5,
      hitTrials: 4,
      startLevel: 5,
      endLevel: 6,
    });

    await saveColorSession({
      id: 'cs1',
      mode: 'H',
      type: 'training',
      startTimestamp: 1000,
      endTimestamp: 31000, // +30s
      totalTrials: 3,
      hitTrials: 3,
      startLevel: 5,
      endLevel: 6,
    });

    const starMs = await getStarHoppingTrainingTimeMs();
    const colorMs = await getColorTrainingTimeMs();
    const totalMs = await getTotalTrainingTimeMs();

    expect(starMs).toBe(60000);
    expect(colorMs).toBe(30000);
    expect(totalMs).toBe(90000);
  });

  it('exportAllData and importAllData - should correctly export and restore data', async () => {
    // 1. Prepare initial data
    await saveTrialRecord({
      id: 'star_1',
      sessionId: 's1',
      mode: 'single',
      timestamp: 1000,
      difficultyLevel: 10,
      anchorA: [100, 100],
      targetB: [200, 200],
      userClick: [200, 200],
      angleDegree: 45,
      distanceRatio: 100,
      isHit: true,
      errorPixelDistance: 0,
      responseTimeMs: 300,
    });

    await saveColorTrialRecord({
      id: 'color_1',
      sessionId: 'cs1',
      mode: 'H',
      timestamp: 1000,
      difficultyLevel: 8,
      targetHSV: [120, 100, 100],
      userHSV: [120, 100, 100],
      isHit: true,
      errorValue: 0,
      responseTimeMs: 400,
    });

    const customSettings: typeof DEFAULT_SETTINGS = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    customSettings.star.gridSize = 5;
    customSettings.star.autoNext = false;
    saveSettings(customSettings);

    // 2. Export
    const exportedJson = await exportAllData();
    expect(exportedJson).toContain('star_1');
    expect(exportedJson).toContain('color_1');
    expect(exportedJson).toContain('"gridSize": 5');

    // 3. Clear DB & localStorage
    await clearAllData();
    localStorage.clear();
    const recordsEmpty = await getAllTrialRecords();
    expect(recordsEmpty.length).toBe(0);
    expect(loadSettings().star.gridSize).toBe(DEFAULT_SETTINGS.star.gridSize);

    // 4. Import
    const success = await importAllData(exportedJson);
    expect(success).toBe(true);

    // 5. Verify restored data and settings
    const recordsRestored = await getAllTrialRecords('single');
    expect(recordsRestored.length).toBe(1);
    expect(recordsRestored[0].id).toBe('star_1');

    const colorProfiles = await getAllColorProfiles();
    expect(colorProfiles.H?.totalTrainedCards).toBe(1);

    const restoredSettings = loadSettings();
    expect(restoredSettings.star.gridSize).toBe(5);
    expect(restoredSettings.star.autoNext).toBe(false);
  });
});
~~~~~

### 下一步建议
`SettingsModal.tsx` 及全流向的视图设置接入重构已经完成。现在偏好设置由 `TrainingDomain` 强类型驱动，并且各个训练模块享有了独立的 `autoNext` / `autoNextDelay` 隔离配置。下一步建议：
1. **重构 HSV 滑块轨道组件 (`HsvTrackSlider`)**：从 `ColorCanvas.tsx` 中解耦 `AllMatchSlider` 为独立导出的通用滑块组件，补充 `hitMargin` 外延手势感应与 OKLab 动态 $\Delta E$ 容错可视化线段。
2. **重构 `RelativeColorCanvas.tsx`**：使用 `HsvTrackSlider` 替代原有的原生 range input，使相对色感拥有与综合拾色一致的顶级交互手感与容错指示。
