export type StepGranularity = 'standard' | 'fine';
export type AdaptiveMode = 'block' | 'staircase';
export type TargetingMode = 'off' | 'manual';

export interface UserSettings {
  autoNext: boolean; // 点击后是否自动翻页
  autoNextDelay: number; // 自动翻页延迟 (ms) (兼容保留)
  starAutoNextDelay: number; // 寻星练习自动翻页延迟 (ms)
  colorAutoNextDelay: number; // 色感训练自动翻页延迟 (ms)
  stepGranularity: StepGranularity; // 步长粒度 ('standard': 标准阶梯 (12级), 'fine': 精细阶梯 (35级))
  adaptiveMode: AdaptiveMode; // 自适应算子模式 ('block': 轮次胜率评估, 'staircase': 经典3U1D)
  targetAccuracy: number; // 目标通关正确率 (0.7, 0.8, 0.85, 0.9)
  blockSize: number; // 每轮评估题数 (10, 15, 20)
  targetingMode: TargetingMode; // 寻星靶向训练模式 ('off': 关闭, 'auto': 智能自动, 'manual': 手动指定)
  manualTargetSectors: number[]; // 寻星手动锁定的扇区 [0~7]
  colorTargetingMode: TargetingMode; // 色感靶向训练模式 ('off', 'auto', 'manual')
  colorManualTargetSectors: number[]; // 色感手动锁定的扇区 [0~11]
  idleTimeout: number; // 闲置自动暂停计时时长 (秒)，0 表示关闭
  gridSize: number; // 网格维数 (2, 3, 4, 5)
  sliderHitMargin: number; // 色感滑块极值吸附感应区外延大小 (px)
  showToleranceBand: boolean; // 是否显示滑块容错感应区
  enableHoverColorPreview: boolean; // 综合拾色悬停时是否实时联动颜色预览
}

const SETTINGS_KEY = 'star_hopping_user_settings';

export const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoNextDelay: 500,
  starAutoNextDelay: 500,
  colorAutoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
  targetingMode: 'off',
  manualTargetSectors: [],
  colorTargetingMode: 'off',
  colorManualTargetSectors: [],
  idleTimeout: 60,
  gridSize: 3,
  sliderHitMargin: 12,
  showToleranceBand: true,
  enableHoverColorPreview: true,
};

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.targetingMode === 'auto') parsed.targetingMode = 'off';
      if (parsed.colorTargetingMode === 'auto') parsed.colorTargetingMode = 'off';
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load user settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save user settings:', e);
  }
}
