好的，我已经对需求进行了分析与设计。为了避免重复编写单独的保存或更新方法（DRY 原则），我们将重构 `SettingsModal` 组件，引入一个统一的设置更新辅助方法 `updateSettings`。任何设置选项发生变化时，该方法会自动更新本地状态、同步写入 `localStorage` 并向父组件推送最新的配置，从而实现修改即实时保存并自动生效。

## [WIP] refactor(settings): 实现设置项自动保存与通用配置更新助手

### 用户需求
1. 用户在修改训练偏好设置时，更改能实时自动保存并生效，无需手动点击“保存配置”按钮。
2. 在实现自动保存前对 `SettingsModal` 组件进行重构，避免为每个设置按钮/输入项重复声明单独的 `handleXxx` Setter 方法，消除 DRY 问题。

### 评论
实时自动保存能显著提升用户体验，消除繁重的手动确认流程。通过封装统一的 `updateSettings` 扩展函数，既保证了每次交互都具有原子级的持久化行为，又将冗余的代码逻辑收敛到一个通用的更新通道中，大幅提升了代码的可维护性。

### 目标
1. 在 `SettingsModal` 中重构并提供一个通用的 `updateSettings` 辅助方法，统一处理 `current` 状态更新、`saveSettings` 持久化以及 `onSave` 父组件通知。
2. 将每个设置控件的 `onClick` / `onInput` 事件处理统一内联绑定到 `updateSettings`，移除多余的单项 Setter 函数。
3. 调整设置弹窗底部的按钮展示，取消原来的“保存配置”与“取消”双按钮结构，替换为单按键“完成”关闭按钮。

### 基本原理
通过在 `SettingsModal` 内构造接收 `Partial<UserSettings>` 或更新函数的 `updateSettings` 辅助方法：
```typescript
const updateSettings = (patch: Partial<UserSettings> | ((prev: UserSettings) => UserSettings)) => {
  setCurrent((prev) => {
    const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
    saveSettings(next);
    onSave(next);
    return next;
  });
};
```
所有 UI 组件在触发状态改变时直接调用 `updateSettings({ [key]: value })` 即可完成状态更改、持久化保存与上报，彻底去除了过去为 `autoNext`, `autoNextDelay`, `adaptiveMode`, `targetAccuracy`, `blockSize`, `stepGranularity`, `idleTimeout`, `gridSize`, `targetingMode` 等各自编写 Setter 方法的冗余代码。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/config #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/settings-modal #task/action/auto-save-refactor #task/state/begin

---

### Script

#### Acts 1: 重构 `SettingsModal.tsx` 实现自动保存与 DRY 辅助函数

我们将使用 `write_file` 重新构建 `src/components/SettingsModal.tsx`，加入 `updateSettings` 辅助方法并替换原有UI绑定与底部控制按钮。

~~~~~act
write_file
src/components/SettingsModal.tsx
~~~~~
~~~~~tsx
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

interface SettingsModalProps {
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => void;
  onDataCleared?: () => void;
}

export function SettingsModal({ settings, onClose, onSave, onDataCleared }: SettingsModalProps) {
  const [current, setCurrent] = useState<UserSettings>({ ...settings });

  // 通用设置更新辅助方法：更新 state 并同步持久化与通知父组件，消除 DRY 冗余方法
  const updateSettings = (
    patch: Partial<UserSettings> | ((prev: UserSettings) => UserSettings),
  ) => {
    setCurrent((prev) => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      saveSettings(next);
      onSave(next);
      return next;
    });
  };

  const handleSectorToggle = (sectorIdx: number) => {
    updateSettings((prev) => {
      const currentSectors = prev.manualTargetSectors || [];
      const exists = currentSectors.includes(sectorIdx);
      const updated = exists
        ? currentSectors.filter((s) => s !== sectorIdx)
        : [...currentSectors, sectorIdx];
      return { ...prev, manualTargetSectors: updated };
    });
  };

  const handleClearData = async () => {
    if (confirm('⚠️ 确定要清空所有训练日志、历史会话和能力看板数据吗？此操作无法撤销！')) {
      await clearAllData();
      alert('所有训练数据已清空。');
      onDataCleared?.();
      onClose();
    }
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
            type="button"
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
              type="button"
              onClick={() => updateSettings({ autoNext: !current.autoNext })}
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
                onInput={(e) =>
                  updateSettings({
                    autoNextDelay: Number.parseInt((e.target as HTMLInputElement).value, 10),
                  })
                }
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          )}

          {/* 训练算子模式 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">自适应算子模式</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateSettings({ adaptiveMode: 'block' })}
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
                type="button"
                onClick={() => updateSettings({ adaptiveMode: 'staircase' })}
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
                      type="button"
                      key={acc}
                      onClick={() => updateSettings({ targetAccuracy: acc })}
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
                      type="button"
                      key={size}
                      onClick={() => updateSettings({ blockSize: size })}
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
                type="button"
                onClick={() => updateSettings({ stepGranularity: 'standard' })}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  current.stepGranularity === 'standard'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                标准阶梯 (大步幅)
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ stepGranularity: 'fine' })}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  current.stepGranularity === 'fine'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                精细阶梯 (小步幅)
              </button>
            </div>
          </div>

          {/* 无操作闲置暂停计时 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">无操作闲置暂停计时</div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '关闭', value: 0 },
                { label: '30秒', value: 30 },
                { label: '1分钟', value: 60 },
                { label: '2分钟', value: 120 },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => updateSettings({ idleTimeout: opt.value })}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    (current.idleTimeout ?? 60) === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 干扰点网格大小 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">干扰点网格大小</div>
            <div className="grid grid-cols-4 gap-1.5">
              {[2, 3, 4, 5].map((size) => (
                <button
                  type="button"
                  key={size}
                  onClick={() => updateSettings({ gridSize: size })}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    (current.gridSize ?? 3) === size
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {size}x{size}
                </button>
              ))}
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
                  type="button"
                  key={m.id}
                  onClick={() => updateSettings({ targetingMode: m.id as TargetingMode })}
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
                        type="button"
                        key={name}
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

### 下一步建议
1. **代码检查与格式化**: 在终端执行 `npm run check` 或 `npx biome check --write .`，确保无未使用的变量或类型不匹配。
2. **验证流程**: 打开应用点击“设置”，随意切换算子模式、步长或自动翻页，关闭弹窗后再重新打开，确认各项配置无缝保持并立即在训练视图中生效。
