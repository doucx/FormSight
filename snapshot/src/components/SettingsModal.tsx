import { Flame, Sliders, Target, ToggleLeft, ToggleRight } from 'lucide-preact';
import { useState } from 'preact/hooks';
import type { TrainingDomain } from '../utils/db';
import {
  type ColorSenseSettings,
  type NegativeSpaceSettings,
  type RelativeColorSettings,
  type StarSettings,
  type UserSettings,
  saveSettings,
} from '../utils/settings';
import { ModalShell } from './common/ModalShell';
import {
  DOMAIN_SETTING_SCHEMAS,
  DynamicDomainSettings,
} from './settings/DynamicDomainSettings';

const DOMAIN_TITLE: Record<TrainingDomain, string> = {
  star: '寻星训练偏好设置',
  color: '绝对色感偏好设置',
  relative_color: '相对色感偏好设置',
  negative_space: '正负形感知偏好设置',
};

interface SettingsModalProps {
  domain: TrainingDomain;
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => void;
}

export function SettingsModal({ domain, settings, onClose, onSave }: SettingsModalProps) {
  const [current, setCurrent] = useState<UserSettings>({ ...settings });

  const updateDomainSettings = (
    patch:
      | Partial<StarSettings | ColorSenseSettings | RelativeColorSettings | NegativeSpaceSettings>
      | ((
          prev: StarSettings | ColorSenseSettings | RelativeColorSettings | NegativeSpaceSettings,
        ) => Partial<
          StarSettings | ColorSenseSettings | RelativeColorSettings | NegativeSpaceSettings
        >),
  ) => {
    setCurrent((prev) => {
      const prevDomainSettings = prev[domain];
      const updatedPatch = typeof patch === 'function' ? patch(prevDomainSettings) : patch;
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

  return (
    <ModalShell title={DOMAIN_TITLE[domain]} icon={Sliders} onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-5">
        {/* 通用配置：自动翻页开关 */}
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

        {/* 通用配置：自动翻页延迟 */}
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

        {/* 通用配置：自适应算子模式 */}
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

        {/* 轮次评估配置 */}
        {domainSettings.adaptiveMode === 'block' && (
          <div className="space-y-3 bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100">
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

        {/* 难度阶梯精细度 */}
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

        {/* 渲染特定领域的表单 (Schema 驱动) */}
        {DOMAIN_SETTING_SCHEMAS[domain] && (
          <DynamicDomainSettings
            schemas={DOMAIN_SETTING_SCHEMAS[domain]}
            values={domainSettings}
            onChange={(patch) => updateDomainSettings(patch)}
          />
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
    </ModalShell>
  );
}
