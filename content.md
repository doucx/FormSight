我将为你实现“是否显示闲置模糊遮罩”的全局偏好选项，并增强无感唤醒（User Activity Seamless Resume）机制，让关闭遮罩的用户在切回窗口或晃动鼠标/按键时能够无缝继续训练。

## [WIP] feat: 新增全局是否显示闲置模糊遮罩配置与无感唤醒

### 用户需求
1. **暴露全局配置项**：在全局设置中增加“显示闲置模糊遮罩”开关（默认开启），允许希望沉浸无感的用户关闭该遮罩。
2. **无感唤醒与恢复**：当关闭遮罩或用户重新聚焦窗口/晃动鼠标/按键时，系统自动无感唤醒并补偿时间，无需用户额外点击确认弹窗即可继续作答。

### 评论
对于高阶练习者，弹窗或模糊蒙版可能会略微打断心流节奏。提供开关并在活动监听中支持无感唤醒（Seamless Activity Awakening），既保留了防止统计数据污染（闲置时不计入答题时间）的核心价值，又赋予了用户更高的自由度。

### 目标
1. 在 `src/utils/settings.ts` 的 `GlobalSettings` 中增加 `showIdleBlurOverlay: boolean` 字段（默认 `true`），并在 `loadSettings` 中兼容旧配置。
2. 更新 `src/hooks/useTrainingSession.ts`，在用户产生交互动作（鼠标移动、按键、触摸）时自动触发 `resumeFromIdle`，实现平滑无感唤醒。
3. 在 `src/components/GlobalSettingsModal.tsx` 中增加“闲置模糊遮罩”的 Toggle 开关。
4. 在三个训练视图（`TrainingView`, `ColorTrainingView`, `RelativeColorTrainingView`）中结合该选项控制模糊蒙版的渲染。
5. 更新 `settings.test.ts` 确保设置测试全部通过。

### 基本原理
1. **交互事件触发式唤醒**：在 `useTrainingSession` 中，当处于 `isIdle` 状态时，一旦捕获到 `pointermove`、`pointerdown`、`keydown`、`touchstart` 或窗口重新获得焦点（`focus`），立即调用 `resumeFromIdle`，自动顺延校准秒表与反应时间。
2. **条件式视觉渲染**：当 `showIdleBlurOverlay` 为 `false` 时不挂载 Backdrop Blur 遮罩层，用户在切回窗口后即可直接看到画布并无感连贯作答。

### 标签
#intent/build #flow/ready #priority/medium #comp/runtime #concept/ui #concept/config #scope/ux #ai/instruct #task/domain/ui #task/object/idle-overlay-toggle #task/action/implementation #task/state/continue

---

### Script

#### Acts 1: 更新 `settings.ts` 增加 `showIdleBlurOverlay` 全局配置

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
/**
 * 全局通用设置
 */
export interface GlobalSettings {
  idleTimeout: number; // 闲置自动暂停计时时长 (秒)，0 表示关闭
  soundEnabled: boolean; // 是否启用答题音效反馈
}
~~~~~
~~~~~typescript
/**
 * 全局通用设置
 */
export interface GlobalSettings {
  idleTimeout: number; // 闲置自动暂停计时时长 (秒)，0 表示关闭
  soundEnabled: boolean; // 是否启用答题音效反馈
  showIdleBlurOverlay: boolean; // 闲置或失焦暂停时是否显示模糊遮罩提示
}
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60,
    soundEnabled: true,
  },
  star: {
~~~~~
~~~~~typescript
export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60,
    soundEnabled: true,
    showIdleBlurOverlay: true,
  },
  star: {
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
    // === 向下兼容迁移：解析老版本扁平结构 ===
    const migrated: UserSettings = {
      global: {
        idleTimeout: parsed.idleTimeout ?? DEFAULT_SETTINGS.global.idleTimeout,
        soundEnabled: parsed.soundEnabled ?? DEFAULT_SETTINGS.global.soundEnabled,
      },
      star: {
~~~~~
~~~~~typescript
    // === 向下兼容迁移：解析老版本扁平结构 ===
    const migrated: UserSettings = {
      global: {
        idleTimeout: parsed.idleTimeout ?? DEFAULT_SETTINGS.global.idleTimeout,
        soundEnabled: parsed.soundEnabled ?? DEFAULT_SETTINGS.global.soundEnabled,
        showIdleBlurOverlay:
          parsed.showIdleBlurOverlay ?? DEFAULT_SETTINGS.global.showIdleBlurOverlay,
      },
      star: {
~~~~~

#### Acts 2: 在 `useTrainingSession.ts` 中增强活动触发无感恢复逻辑

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
  // === 闲置与失焦监听 ===
  useEffect(() => {
    if (isFinished || showSummaryModal) return;

    const resetIdleTimer = () => {
      if (isIdle) return;
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      if (effectiveIdleTimeout > 0) {
        idleTimerRef.current = window.setTimeout(() => {
          pauseToIdle();
        }, effectiveIdleTimeout * 1000);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseToIdle();
      }
    };

    const handleWindowBlur = () => {
      pauseToIdle();
    };

    const userActivityEvents = ['pointerdown', 'pointermove', 'keydown', 'touchstart'];
    for (const evt of userActivityEvents) {
      window.addEventListener(evt, resetIdleTimer, { passive: true });
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      for (const evt of userActivityEvents) {
        window.removeEventListener(evt, resetIdleTimer);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isFinished, showSummaryModal, isIdle, effectiveIdleTimeout, pauseToIdle]);
~~~~~
~~~~~typescript
  // === 闲置与失焦监听 ===
  useEffect(() => {
    if (isFinished || showSummaryModal) return;

    const handleUserActivity = () => {
      if (isIdle) {
        resumeFromIdle();
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      if (effectiveIdleTimeout > 0) {
        idleTimerRef.current = window.setTimeout(() => {
          pauseToIdle();
        }, effectiveIdleTimeout * 1000);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseToIdle();
      }
    };

    const handleWindowBlur = () => {
      pauseToIdle();
    };

    const userActivityEvents = ['pointerdown', 'pointermove', 'keydown', 'touchstart'];
    for (const evt of userActivityEvents) {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    handleUserActivity();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      for (const evt of userActivityEvents) {
        window.removeEventListener(evt, handleUserActivity);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isFinished, showSummaryModal, isIdle, effectiveIdleTimeout, pauseToIdle, resumeFromIdle]);
~~~~~

#### Acts 3: 在 `GlobalSettingsModal.tsx` 中增加“显示模糊遮罩”开关

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
import {
  Clock,
  Download,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Volume2,
  X,
} from 'lucide-preact';
~~~~~
~~~~~typescript
import {
  Clock,
  Download,
  Eye,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Volume2,
  X,
} from 'lucide-preact';
~~~~~

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
  const handleIdleTimeoutChange = (sec: number) => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        idleTimeout: sec,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };
~~~~~
~~~~~typescript
  const handleIdleTimeoutChange = (sec: number) => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        idleTimeout: sec,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleToggleBlurOverlay = () => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        showIdleBlurOverlay: !settings.global.showIdleBlurOverlay,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };
~~~~~

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">闲置休眠保护</div>
                <div className="text-[11px] text-slate-400">无操作或切出窗口时暂停计时与模糊遮罩</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { label: '关闭', value: 0 },
                { label: '30 秒', value: 30 },
                { label: '60 秒', value: 60 },
                { label: '120 秒', value: 120 },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => handleIdleTimeoutChange(opt.value)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    settings.global.idleTimeout === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
~~~~~
~~~~~typescript
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">闲置休眠保护</div>
                <div className="text-[11px] text-slate-400">无操作或切出窗口时自动暂停训练计时</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { label: '关闭', value: 0 },
                { label: '30 秒', value: 30 },
                { label: '60 秒', value: 60 },
                { label: '120 秒', value: 120 },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => handleIdleTimeoutChange(opt.value)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    settings.global.idleTimeout === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">暂停时显示模糊遮罩</div>
                <div className="text-[11px] text-slate-400">
                  {settings.global.showIdleBlurOverlay
                    ? '已开启毛玻璃遮罩提示'
                    : '已关闭遮罩，切回时无感直接作答'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleBlurOverlay}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {settings.global.showIdleBlurOverlay ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>
        </div>
~~~~~

#### Acts 4: 在训练视图中根据配置条件渲染模糊蒙版

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript
import type { HitResult, Point, QuestionData, TrainingMode } from '../types';
import { saveSession, saveTrialRecord } from '../utils/db';
import { type QuestionGenerateOptions, checkHit, generateQuestion } from '../utils/geometry';
import type { StarSettings } from '../utils/settings';
~~~~~
~~~~~typescript
import type { HitResult, Point, QuestionData, TrainingMode } from '../types';
import { saveSession, saveTrialRecord } from '../utils/db';
import { type QuestionGenerateOptions, checkHit, generateQuestion } from '../utils/geometry';
import { type StarSettings, loadSettings } from '../utils/settings';
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript
  const canvasUserAnswer = userAnswer
    ? { clickPoint: userAnswer.nearestGridPoint, hitResult: userAnswer }
    : null;

  return (
~~~~~
~~~~~typescript
  const canvasUserAnswer = userAnswer
    ? { clickPoint: userAnswer.nearestGridPoint, hitResult: userAnswer }
    : null;

  const showBlurOverlay = loadSettings().global.showIdleBlurOverlay ?? true;

  return (
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript
        <StarCanvas
          question={question}
          showAnswer={showAnswer}
          userAnswer={canvasUserAnswer}
          onAnswer={(clickPoint) => {
            const hitRes = checkHit(clickPoint, question.targetB, question.distractorPoints);
            if (hitRes.isWithinRange) {
              handleAnswer({ clickPoint, hitResult: hitRes });
            }
          }}
          disabled={isFinished || isIdle}
        />

        {isIdle && (
          <div
            role="presentation"
            onClick={resumeFromIdle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') resumeFromIdle();
            }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md rounded-3xl cursor-pointer select-none animate-in fade-in duration-150"
          >
            <div className="p-5 bg-white/95 text-slate-800 rounded-3xl shadow-2xl border border-white/60 flex flex-col items-center gap-2.5 max-w-xs text-center mx-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Pause className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-base font-bold text-slate-800">训练已自动暂停</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                检测到闲置或窗口切换，已保护您的心流与统计数据
              </p>
              <button
                type="button"
                onClick={resumeFromIdle}
                className="mt-1 w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
              >
                点击继续训练 (或按任意键)
              </button>
            </div>
          </div>
        )}
~~~~~
~~~~~typescript
        <StarCanvas
          question={question}
          showAnswer={showAnswer}
          userAnswer={canvasUserAnswer}
          onAnswer={(clickPoint) => {
            if (isIdle) resumeFromIdle();
            const hitRes = checkHit(clickPoint, question.targetB, question.distractorPoints);
            if (hitRes.isWithinRange) {
              handleAnswer({ clickPoint, hitResult: hitRes });
            }
          }}
          disabled={isFinished || (isIdle && showBlurOverlay)}
        />

        {isIdle && showBlurOverlay && (
          <div
            role="presentation"
            onClick={resumeFromIdle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') resumeFromIdle();
            }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md rounded-3xl cursor-pointer select-none animate-in fade-in duration-150"
          >
            <div className="p-5 bg-white/95 text-slate-800 rounded-3xl shadow-2xl border border-white/60 flex flex-col items-center gap-2.5 max-w-xs text-center mx-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Pause className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-base font-bold text-slate-800">训练已自动暂停</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                检测到闲置或窗口切换，已保护您的心流与统计数据
              </p>
              <button
                type="button"
                onClick={resumeFromIdle}
                className="mt-1 w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
              >
                点击继续训练 (或按任意键)
              </button>
            </div>
          </div>
        )}
~~~~~

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript
import { saveColorSession, saveColorTrialRecord } from '../utils/db';
import type { ColorSenseSettings } from '../utils/settings';
~~~~~
~~~~~typescript
import { saveColorSession, saveColorTrialRecord } from '../utils/db';
import { type ColorSenseSettings, loadSettings } from '../utils/settings';
~~~~~

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
~~~~~
~~~~~typescript
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const showBlurOverlay = loadSettings().global.showIdleBlurOverlay ?? true;

  return (
~~~~~

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript
        <ColorCanvas
          question={question}
          showAnswer={showAnswer}
          userAnswer={userAnswer}
          onAnswer={handleAnswer}
          disabled={isFinished || isIdle}
          hitMargin={settings.sliderHitMargin ?? 12}
          showToleranceBand={settings.showToleranceBand ?? true}
          enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
        />

        {isIdle && (
          <div
            role="presentation"
            onClick={resumeFromIdle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') resumeFromIdle();
            }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md rounded-3xl cursor-pointer select-none animate-in fade-in duration-150"
          >
            <div className="p-5 bg-white/95 text-slate-800 rounded-3xl shadow-2xl border border-white/60 flex flex-col items-center gap-2.5 max-w-xs text-center mx-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Pause className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-base font-bold text-slate-800">训练已自动暂停</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                检测到闲置或窗口切换，已保护您的心流与统计数据
              </p>
              <button
                type="button"
                onClick={resumeFromIdle}
                className="mt-1 w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
              >
                点击继续训练 (或按任意键)
              </button>
            </div>
          </div>
        )}
~~~~~
~~~~~typescript
        <ColorCanvas
          question={question}
          showAnswer={showAnswer}
          userAnswer={userAnswer}
          onAnswer={(val) => {
            if (isIdle) resumeFromIdle();
            handleAnswer(val);
          }}
          disabled={isFinished || (isIdle && showBlurOverlay)}
          hitMargin={settings.sliderHitMargin ?? 12}
          showToleranceBand={settings.showToleranceBand ?? true}
          enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
        />

        {isIdle && showBlurOverlay && (
          <div
            role="presentation"
            onClick={resumeFromIdle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') resumeFromIdle();
            }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md rounded-3xl cursor-pointer select-none animate-in fade-in duration-150"
          >
            <div className="p-5 bg-white/95 text-slate-800 rounded-3xl shadow-2xl border border-white/60 flex flex-col items-center gap-2.5 max-w-xs text-center mx-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Pause className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-base font-bold text-slate-800">训练已自动暂停</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                检测到闲置或窗口切换，已保护您的心流与统计数据
              </p>
              <button
                type="button"
                onClick={resumeFromIdle}
                className="mt-1 w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
              >
                点击继续训练 (或按任意键)
              </button>
            </div>
          </div>
        )}
~~~~~

~~~~~act
patch_file
src/views/RelativeColorTrainingView.tsx
~~~~~
~~~~~typescript
import { saveSession, saveTrialRecord } from '../utils/db';
import {
  type RelativeColorHitResult,
  type RelativeColorMode,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateRelativeColorQuestion,
} from '../utils/relativeColorUtils';
import type { RelativeColorSettings } from '../utils/settings';
~~~~~
~~~~~typescript
import { saveSession, saveTrialRecord } from '../utils/db';
import {
  type RelativeColorHitResult,
  type RelativeColorMode,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateRelativeColorQuestion,
} from '../utils/relativeColorUtils';
import { type RelativeColorSettings, loadSettings } from '../utils/settings';
~~~~~

~~~~~act
patch_file
src/views/RelativeColorTrainingView.tsx
~~~~~
~~~~~typescript
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
~~~~~
~~~~~typescript
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const showBlurOverlay = loadSettings().global.showIdleBlurOverlay ?? true;

  return (
~~~~~

~~~~~act
patch_file
src/views/RelativeColorTrainingView.tsx
~~~~~
~~~~~typescript
        <RelativeColorCanvas
          question={question}
          showAnswer={showAnswer}
          userAnswer={userAnswer}
          onAnswer={handleAnswer}
          disabled={isFinished || isIdle}
          hitMargin={settings.sliderHitMargin ?? 12}
          showToleranceBand={settings.showToleranceBand ?? true}
          enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
        />

        {isIdle && (
          <div
            role="presentation"
            onClick={resumeFromIdle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') resumeFromIdle();
            }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md rounded-3xl cursor-pointer select-none animate-in fade-in duration-150"
          >
            <div className="p-5 bg-white/95 text-slate-800 rounded-3xl shadow-2xl border border-white/60 flex flex-col items-center gap-2.5 max-w-xs text-center mx-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Pause className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-base font-bold text-slate-800">训练已自动暂停</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                检测到闲置或窗口切换，已保护您的心流与统计数据
              </p>
              <button
                type="button"
                onClick={resumeFromIdle}
                className="mt-1 w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
              >
                点击继续训练 (或按任意键)
              </button>
            </div>
          </div>
        )}
~~~~~
~~~~~typescript
        <RelativeColorCanvas
          question={question}
          showAnswer={showAnswer}
          userAnswer={userAnswer}
          onAnswer={(userD) => {
            if (isIdle) resumeFromIdle();
            handleAnswer(userD);
          }}
          disabled={isFinished || (isIdle && showBlurOverlay)}
          hitMargin={settings.sliderHitMargin ?? 12}
          showToleranceBand={settings.showToleranceBand ?? true}
          enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
        />

        {isIdle && showBlurOverlay && (
          <div
            role="presentation"
            onClick={resumeFromIdle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') resumeFromIdle();
            }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md rounded-3xl cursor-pointer select-none animate-in fade-in duration-150"
          >
            <div className="p-5 bg-white/95 text-slate-800 rounded-3xl shadow-2xl border border-white/60 flex flex-col items-center gap-2.5 max-w-xs text-center mx-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Pause className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-base font-bold text-slate-800">训练已自动暂停</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                检测到闲置或窗口切换，已保护您的心流与统计数据
              </p>
              <button
                type="button"
                onClick={resumeFromIdle}
                className="mt-1 w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
              >
                点击继续训练 (或按任意键)
              </button>
            </div>
          </div>
        )}
~~~~~

#### Acts 5: 更新 `settings.test.ts` 确保单元测试覆盖新配置

~~~~~act
patch_file
src/utils/__tests__/settings.test.ts
~~~~~
~~~~~typescript
  it('loadSettings - should return default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.global.soundEnabled).toBe(true);
    expect(settings.star.autoNext).toBe(true);
    expect(settings.color.autoNext).toBe(true);
    expect(settings.relative_color.autoNext).toBe(true);
    expect(settings.star.gridSize).toBe(3);
    expect(settings.color.showToleranceBand).toBe(true);
  });
~~~~~
~~~~~typescript
  it('loadSettings - should return default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.global.soundEnabled).toBe(true);
    expect(settings.global.showIdleBlurOverlay).toBe(true);
    expect(settings.star.autoNext).toBe(true);
    expect(settings.color.autoNext).toBe(true);
    expect(settings.relative_color.autoNext).toBe(true);
    expect(settings.star.gridSize).toBe(3);
    expect(settings.color.showToleranceBand).toBe(true);
  });
~~~~~

~~~~~act
patch_file
src/utils/__tests__/settings.test.ts
~~~~~
~~~~~typescript
  it('saveSettings & loadSettings - should persist and retrieve domain-scoped settings', () => {
    const custom = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    custom.star.autoNext = false;
    custom.star.autoNextDelay = 800;
    custom.star.gridSize = 4;
~~~~~
~~~~~typescript
  it('saveSettings & loadSettings - should persist and retrieve domain-scoped settings', () => {
    const custom = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    custom.global.showIdleBlurOverlay = false;
    custom.star.autoNext = false;
    custom.star.autoNextDelay = 800;
    custom.star.gridSize = 4;
~~~~~

~~~~~act
patch_file
src/utils/__tests__/settings.test.ts
~~~~~
~~~~~typescript
    saveSettings(custom);

    const loaded = loadSettings();
    expect(loaded.star.autoNext).toBe(false);
    expect(loaded.star.autoNextDelay).toBe(800);
~~~~~
~~~~~typescript
    saveSettings(custom);

    const loaded = loadSettings();
    expect(loaded.global.showIdleBlurOverlay).toBe(false);
    expect(loaded.star.autoNext).toBe(false);
    expect(loaded.star.autoNextDelay).toBe(800);
~~~~~


### 下一步建议
1. **体验与验证**：打开全局设置面板，尝试关闭“暂停时显示模糊遮罩”，在训练中切换窗口或静置片刻，切回或移动鼠标即可直接无感继续作答。
2. **提交准备**：若体验符合预期，可告知我生成包含 `git add` 与 `git commit` 的 `[COMMIT]` 计划以完成提交。
