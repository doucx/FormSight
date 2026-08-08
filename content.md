好的，我已经为你规划了修改方案：

1. 在用户设置（`UserSettings`）中将自动切换下一题的延迟拆分为寻星（`starAutoNextDelay`）与色感（`colorAutoNextDelay`）独立配置，并在设置弹窗中根据当前上下文分别调整。
2. 在 20 题基准测试中，当最后一题回答完毕后，延迟相对应的切换时间再显示结算弹窗，确保用户有足够时间直观看到最后一题的回答反馈。
3. 从寻星和色感两个模块的偏好设置弹窗（`SettingsModal`）中移除“删除所有数据”按钮（数据清空与备份操作统一保留在全局设置面板中）。

以下是具体的执行计划。

## [WIP] refactor: 隔离模块翻页延迟配置并优化基准测试结算弹窗时机

### 用户需求
1. 偏好设置中，将“自动切换下一题延迟”针对寻星练习与色感训练进行独立配置。
2. 20 题基准测试回答最后一题时，延迟展示总结结算弹窗，使用户能够清晰看到最后一题的对错与落点结果。
3. 移除寻星与色感各自偏好设置弹窗中的“清空所有数据”按键。

### 评论
这些优化提升了训练系统 UX 的细腻度。独立延迟配置符合不同训练模块对视觉留存精细度的不同要求；延迟基准测试结算弹窗解决了最后一题反馈瞬间被覆盖的痛点；收拢清空数据入口至全局设置则减少了误操作风险。

### 目标
1. 扩展 `UserSettings` 数据模型，新增 `starAutoNextDelay` 和 `colorAutoNextDelay` 字段。
2. 在 `SettingsModal` 中根据 `appContext` 关联对应的延迟字段，并移除危险的清空数据按键。
3. 在 `TrainingView` 和 `ColorTrainingView` 中应用独立延迟，并在 20 题基准测试结束时延迟触发结算弹窗。

### 基本原理
通过在设置结构中解耦两个模块的延迟，并由页面组件各自读取相应的 delay 参数；在 `handleAnswer` 函数内部，当触发 20 题基准测试结束阈值时，使用 `setTimeout` 延迟 `delay` 时间再将 `showSummaryModal` 置为 `true`。

### 标签
#intent/refine #flow/ready #priority/medium #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/settings-and-views #task/action/refactor #task/state/begin #task/status/active

---

### Script

#### Acts 1: 扩展设置定义 (`src/utils/settings.ts`)

在 `UserSettings` 接口及默认对象中添加 `starAutoNextDelay` 与 `colorAutoNextDelay`。

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
export interface UserSettings {
  autoNext: boolean; // 点击后是否自动翻页
  autoNextDelay: number; // 自动翻页延迟 (ms)
  stepGranularity: StepGranularity; // 步长粒度 ('standard': 标准阶梯 (12级), 'fine': 精细阶梯 (35级))
~~~~~
~~~~~typescript.new
export interface UserSettings {
  autoNext: boolean; // 点击后是否自动翻页
  autoNextDelay: number; // 自动翻页延迟 (ms) (兼容保留)
  starAutoNextDelay: number; // 寻星练习自动翻页延迟 (ms)
  colorAutoNextDelay: number; // 色感训练自动翻页延迟 (ms)
  stepGranularity: StepGranularity; // 步长粒度 ('standard': 标准阶梯 (12级), 'fine': 精细阶梯 (35级))
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
export const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
~~~~~
~~~~~typescript.new
export const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoNextDelay: 500,
  starAutoNextDelay: 500,
  colorAutoNextDelay: 500,
  stepGranularity: 'standard',
~~~~~

#### Acts 2: 更新偏好设置弹窗 (`src/components/SettingsModal.tsx`)

根据 `appContext` 分别读写寻星与色感的延迟设置，并移除顶层偏好设置中的“清空所有数据”模块。

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
import {
  Crosshair,
  Flame,
  Sliders,
  Target,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-preact';
import { useState } from 'preact/hooks';
import { clearAllData } from '../utils/db';
import { type TargetingMode, type UserSettings, saveSettings } from '../utils/settings';
~~~~~
~~~~~typescript.new
import {
  Crosshair,
  Flame,
  Sliders,
  Target,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-preact';
import { useState } from 'preact/hooks';
import { type TargetingMode, type UserSettings, saveSettings } from '../utils/settings';
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
  const handleClearData = async () => {
    if (confirm('⚠️ 确定要清空所有训练日志、历史会话和能力看板数据吗？此操作无法撤销！')) {
      await clearAllData();
      alert('所有训练数据已清空。');
      onDataCleared?.();
      onClose();
    }
  };

  return (
~~~~~
~~~~~typescript.new
  return (
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
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
                onInput={(e) =>
                  updateSettings({
                    autoNextDelay: Number.parseInt((e.target as HTMLInputElement).value, 10),
                  })
                }
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          )}
~~~~~
~~~~~typescript.new
          {/* 自动翻页延迟 */}
          {current.autoNext && (
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                <span>
                  {appContext === 'color-sense' ? '色感训练切换延迟' : '寻星练习切换延迟'}
                </span>
                <span className="font-mono text-indigo-600 font-bold">
                  {appContext === 'color-sense'
                    ? (current.colorAutoNextDelay ?? current.autoNextDelay)
                    : (current.starAutoNextDelay ?? current.autoNextDelay)}{' '}
                  ms
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={
                  appContext === 'color-sense'
                    ? (current.colorAutoNextDelay ?? current.autoNextDelay)
                    : (current.starAutoNextDelay ?? current.autoNextDelay)
                }
                onInput={(e) => {
                  const val = Number.parseInt((e.target as HTMLInputElement).value, 10);
                  if (appContext === 'color-sense') {
                    updateSettings({ colorAutoNextDelay: val });
                  } else {
                    updateSettings({ starAutoNextDelay: val });
                  }
                }}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          )}
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
          {/* 危险操作区：删除数据 */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-rose-600">删除所有数据</div>
              <div className="text-[11px] text-slate-400">清空本地存储的全部练习记录与能力看板</div>
            </div>
            <button
              type="button"
              onClick={handleClearData}
              className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空数据
            </button>
          </div>
        </div>
~~~~~
~~~~~typescript.new
        </div>
~~~~~

#### Acts 3: 优化寻星练习作答与延迟逻辑 (`src/views/TrainingView.tsx`)

在寻星练习中使用 `starAutoNextDelay`，并在 20 题基准测试最后一题完成后延迟显示结算弹窗。

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
    const delay = settings.starAutoNextDelay ?? settings.autoNextDelay;

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
~~~~~

#### Acts 4: 优化色感训练作答与延迟逻辑 (`src/views/ColorTrainingView.tsx`)

在色感训练中使用 `colorAutoNextDelay`，并在 20 题基准测试最后一题完成后延迟显示结算弹窗。

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript.old
    if (sessionType === 'benchmark' && newTotal >= 20) {
      setIsFinished(true);
      await saveCurrentSession(newTotal, newHits, true);
      setShowSummaryModal(true);
    } else if (settings.autoNext) {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        handleNextQuestion();
      }, settings.autoNextDelay);
    }
~~~~~
~~~~~typescript.new
    const delay = settings.colorAutoNextDelay ?? settings.autoNextDelay;

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
~~~~~

### 下一步建议
1. 验证构建与类型检查（如 `npm run build` 或 `npx tsc`），确保补丁代码无语法及类型错误。
2. 进行手动测试：分别进入“寻星练习”和“色感训练”偏好设置，验证延迟配置是否独立生效且移除了数据清空按钮；运行一轮 20 题基准测试，确认最后一题能够看清作答反馈后再弹出总结界面。
