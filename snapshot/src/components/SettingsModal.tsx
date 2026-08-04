import { Crosshair, Flame, Sliders, Target, ToggleLeft, ToggleRight, X } from 'lucide-preact';
import { h } from 'preact';
import { useState } from 'preact/hooks';
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
}

export function SettingsModal({ settings, onClose, onSave }: SettingsModalProps) {
  const [current, setCurrent] = useState<UserSettings>({ ...settings });

  const handleToggleAutoNext = () => {
    setCurrent((prev) => ({ ...prev, autoNext: !prev.autoNext }));
  };

  const handleDelayChange = (e: Event) => {
    const val = Number.parseInt((e.target as HTMLInputElement).value, 10);
    setCurrent((prev) => ({ ...prev, autoNextDelay: val }));
  };

  const handleGranularityChange = (granularity: 'standard' | 'fine') => {
    setCurrent((prev) => ({ ...prev, stepGranularity: granularity }));
  };

  const handleModeChange = (mode: 'block' | 'staircase') => {
    setCurrent((prev) => ({ ...prev, adaptiveMode: mode }));
  };

  const handleAccuracyChange = (acc: number) => {
    setCurrent((prev) => ({ ...prev, targetAccuracy: acc }));
  };

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

  const handleIdleTimeoutChange = (timeout: number) => {
    setCurrent((prev) => ({ ...prev, idleTimeout: timeout }));
  };

  const handleConfirm = () => {
    saveSettings(current);
    onSave(current);
    onClose();
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
              onClick={handleToggleAutoNext}
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
                onInput={handleDelayChange}
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
                onClick={() => handleModeChange('block')}
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
                onClick={() => handleModeChange('staircase')}
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
                      onClick={() => handleAccuracyChange(acc)}
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
                      onClick={() => handleBlockSizeChange(size)}
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
                type="button"
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
                  onClick={() => handleIdleTimeoutChange(opt.value)}
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
                        type="button"
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

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
