import { h } from 'preact';
import { useState } from 'preact/hooks';
import { X, Sliders, ToggleLeft, ToggleRight } from 'lucide-preact';
import { UserSettings, saveSettings } from '../utils/settings';

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
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    setCurrent((prev) => ({ ...prev, autoNextDelay: val }));
  };

  const handleGranularityChange = (granularity: 'standard' | 'fine') => {
    setCurrent((prev) => ({ ...prev, stepGranularity: granularity }));
  };

  const handleConfirm = () => {
    saveSettings(current);
    onSave(current);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">训练偏好设置</h2>
          </div>
          <button
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

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            取消
          </button>
          <button
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