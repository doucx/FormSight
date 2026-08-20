import { Flame, Sliders, Target, ToggleLeft, ToggleRight } from 'lucide-preact';
import { useState } from 'preact/hooks';
import type { CardDefinition } from '../types/card';
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
  saveSettings,
} from '../utils/settings';
import { ModalShell } from './common/ModalShell';
import { DynamicDomainSettings } from './settings/DynamicDomainSettings';

interface SettingsModalProps {
  card: CardDefinition;
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => void;
}

export function SettingsModal({ card, settings, onClose, onSave }: SettingsModalProps) {
  const [current, setCurrent] = useState<UserSettings>({ ...settings });
  const cardConfig = getCardSettings(current, card.id);

  const updateCardConfig = (patch: Partial<BaseModuleSettings>) => {
    setCurrent((prev) => {
      const updatedCard = {
        ...getCardSettings(prev, card.id),
        ...patch,
      };
      const nextSettings: UserSettings = {
        ...prev,
        cards: {
          ...prev.cards,
          [card.id]: updatedCard,
        },
      };
      saveSettings(nextSettings);
      onSave(nextSettings);
      return nextSettings;
    });
  };

  return (
    <ModalShell
      title={`${card.title} 偏好设置`}
      icon={Sliders}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        {/* 通用配置：自动翻页开关 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-700">自动切换下一题</div>
            <div className="text-xs text-slate-400">点击答题后无需手动按空格切题</div>
          </div>
          <button
            type="button"
            onClick={() => updateCardConfig({ autoNext: !cardConfig.autoNext })}
            className="text-indigo-600 hover:opacity-80 transition-opacity"
          >
            {cardConfig.autoNext ? (
              <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-slate-300" />
            )}
          </button>
        </div>

        {/* 通用配置：自动翻页延迟 */}
        {cardConfig.autoNext && (
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
              <span>切换延迟时间</span>
              <span className="font-mono text-indigo-600 font-bold">
                {cardConfig.autoNextDelay} ms
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={cardConfig.autoNextDelay}
              onInput={(e) => {
                const val = Number.parseInt((e.target as HTMLInputElement).value, 10);
                updateCardConfig({ autoNextDelay: val });
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
              onClick={() => updateCardConfig({ adaptiveMode: 'block' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                cardConfig.adaptiveMode === 'block'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              轮次胜率评估 (推荐)
            </button>
            <button
              type="button"
              onClick={() => updateCardConfig({ adaptiveMode: 'staircase' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                cardConfig.adaptiveMode === 'staircase'
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
        {cardConfig.adaptiveMode === 'block' && (
          <div className="space-y-3 bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span>目标通关正确率</span>
                <span className="font-bold text-indigo-600 font-mono">
                  {Math.round(cardConfig.targetAccuracy * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.7, 0.8, 0.85, 0.9].map((acc) => (
                  <button
                    type="button"
                    key={acc}
                    onClick={() => updateCardConfig({ targetAccuracy: acc })}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      cardConfig.targetAccuracy === acc
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
                  {cardConfig.blockSize} 题/轮
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[10, 15, 20].map((size) => (
                  <button
                    type="button"
                    key={size}
                    onClick={() => updateCardConfig({ blockSize: size })}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      cardConfig.blockSize === size
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
              onClick={() => updateCardConfig({ stepGranularity: 'standard' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                cardConfig.stepGranularity === 'standard'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              标准阶梯 (大步幅)
            </button>
            <button
              type="button"
              onClick={() => updateCardConfig({ stepGranularity: 'fine' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                cardConfig.stepGranularity === 'fine'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              精细阶梯 (小步幅)
            </button>
          </div>
        </div>

        {/* 渲染卡片专属设置 Schemas */}
        {card.settingSchemas && card.settingSchemas.length > 0 && (
          <DynamicDomainSettings
            schemas={card.settingSchemas}
            values={cardConfig}
            onChange={(patch) => updateCardConfig(patch)}
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
