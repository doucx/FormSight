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
              <div className="text-sm font-semibold text-slate-700">色感滑块极值吸附外延感应区</div>
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
                      onClick={() => updateDomainSettings({ targetingMode: m.id as TargetingMode })}
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
              {(domainSettings as StarSettings | ColorSenseSettings).targetingMode === 'manual' && (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-500">
                    选择需要靶向强化的 {domain === 'color' ? '色相' : '角度'} 扇区：
                  </div>
                  <div
                    className={`grid gap-1.5 ${domain === 'color' ? 'grid-cols-3' : 'grid-cols-4'}`}
                  >
                    {(domain === 'color' ? COLOR_SECTOR_NAMES : SECTOR_NAMES).map((name, idx) => {
                      const selected = (
                        (domainSettings as StarSettings | ColorSenseSettings).manualTargetSectors ||
                        []
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
                    })}
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
