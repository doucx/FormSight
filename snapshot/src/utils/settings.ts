export type StepGranularity = 'standard' | 'fine';
export type AdaptiveMode = 'block' | 'staircase';
export type TargetingMode = 'off' | 'manual';

/**
 * 通用领域基础自适应与翻页配置 (每个领域独立持有其实例)
 */
export interface BaseDomainSettings {
  autoNext: boolean; // 点击/提交后是否自动切换下一题 (领域隔离)
  autoNextDelay: number; // 自动翻页延迟 (ms) (领域隔离)
  stepGranularity: StepGranularity; // 步长粒度 ('standard': 12级大步幅, 'fine': 35级小步幅)
  adaptiveMode: AdaptiveMode; // 自适应算子模式 ('block': 轮次胜率, 'staircase': 经典3U1D)
  targetAccuracy: number; // 目标通关正确率 (0.7, 0.8, 0.85, 0.9)
  blockSize: number; // 每轮评估题数 (10, 15, 20)
}

/**
 * 寻星练习专属设置 (纯几何网格配置，无任何滑块容错属性)
 */
export interface StarSettings extends BaseDomainSettings {
  gridSize: number; // 干扰点网格维数 (2, 3, 4, 5)
  targetingMode: TargetingMode; // 寻星弱点靶向模式 ('off', 'manual')
  manualTargetSectors: number[]; // 手动锁定的方位角扇区 [0~7]
}

/**
 * 绝对色感训练专属设置
 */
export interface ColorSenseSettings extends BaseDomainSettings {
  sliderHitMargin: number; // 色感滑块极值吸附感应区外延大小 (px)
  showToleranceBand: boolean; // 是否在滑块上显示 ΔE 动态容错感应区
  enableHoverColorPreview: boolean; // 综合拾色悬停滑块时是否实时联动色块试探预览
  targetingMode: TargetingMode; // 色相靶向模式 ('off', 'manual')
  manualTargetSectors: number[]; // 手动锁定的色相扇区 [0~11]
}

/**
 * 相对色感训练专属设置
 */
export interface RelativeColorSettings extends BaseDomainSettings {
  sliderHitMargin: number; // 色感滑块极值吸附感应区外延大小 (px)
  showToleranceBand: boolean; // 是否在滑块上显示 ΔE 动态容错感应区
  enableHoverColorPreview: boolean; // 悬停滑块时是否实时试探预览推移色 D
}

/**
 * 全局系统偏好
 */
export interface GlobalSettings {
  idleTimeout: number; // 闲置自动暂停计时时长 (秒)，0 表示关闭
}

/**
 * 用户全量设置根结构
 */
export interface UserSettings {
  global: GlobalSettings;
  star: StarSettings;
  color: ColorSenseSettings;
  relative_color: RelativeColorSettings;
}

const SETTINGS_KEY = 'star_hopping_user_settings';

/**
 * 针对不同训练领域的交互节奏设置恰当的默认参数
 */
export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60, // 默认 60 秒无操作自动暂停计时
  },
  star: {
    autoNext: true,
    autoNextDelay: 500, // 寻星：半秒快速反馈，适合高频盲打
    stepGranularity: 'standard',
    adaptiveMode: 'block',
    targetAccuracy: 0.8,
    blockSize: 10,
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  color: {
    autoNext: true,
    autoNextDelay: 600, // 绝对色感：600ms 稍留视觉余光对比真理绿线
    stepGranularity: 'standard',
    adaptiveMode: 'block',
    targetAccuracy: 0.8,
    blockSize: 10,
    sliderHitMargin: 12,
    showToleranceBand: true,
    enableHoverColorPreview: true,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  relative_color: {
    autoNext: true,
    autoNextDelay: 800, // 相对色感：800ms 留出查看矢量模长与色温偏角诊断的时间
    stepGranularity: 'standard',
    adaptiveMode: 'block',
    targetAccuracy: 0.8,
    blockSize: 10,
    sliderHitMargin: 12,
    showToleranceBand: true,
    enableHoverColorPreview: true,
  },
};

/**
 * 平滑迁移旧版扁平配置，各领域 autoNext / delay 独立解耦初始化
 */
function migrateLegacySettings(legacy: Record<string, unknown>): UserSettings {
  const globalIdleTimeout =
    typeof legacy.idleTimeout === 'number'
      ? legacy.idleTimeout
      : DEFAULT_SETTINGS.global.idleTimeout;

  const legacyAutoNext =
    typeof legacy.autoNext === 'boolean' ? legacy.autoNext : true;
  const legacyDelay =
    typeof legacy.autoNextDelay === 'number' ? legacy.autoNextDelay : 500;

  const starDelay =
    typeof legacy.starAutoNextDelay === 'number'
      ? legacy.starAutoNextDelay
      : legacyDelay;
  const colorDelay =
    typeof legacy.colorAutoNextDelay === 'number'
      ? legacy.colorAutoNextDelay
      : DEFAULT_SETTINGS.color.autoNextDelay;

  const baseStepGranularity =
    legacy.stepGranularity === 'fine' ? 'fine' : DEFAULT_SETTINGS.star.stepGranularity;
  const baseAdaptiveMode =
    legacy.adaptiveMode === 'staircase' ? 'staircase' : DEFAULT_SETTINGS.star.adaptiveMode;
  const baseTargetAccuracy =
    typeof legacy.targetAccuracy === 'number'
      ? legacy.targetAccuracy
      : DEFAULT_SETTINGS.star.targetAccuracy;
  const baseBlockSize =
    typeof legacy.blockSize === 'number'
      ? legacy.blockSize
      : DEFAULT_SETTINGS.star.blockSize;

  const starTargetingMode: TargetingMode =
    legacy.targetingMode === 'manual' ? 'manual' : 'off';
  const starManualSectors = Array.isArray(legacy.manualTargetSectors)
    ? (legacy.manualTargetSectors as number[])
    : [];
  const gridSize = typeof legacy.gridSize === 'number' ? legacy.gridSize : 3;

  const colorTargetingMode: TargetingMode =
    legacy.colorTargetingMode === 'manual' ? 'manual' : 'off';
  const colorManualSectors = Array.isArray(legacy.colorManualTargetSectors)
    ? (legacy.colorManualTargetSectors as number[])
    : [];
  const sliderHitMargin =
    typeof legacy.sliderHitMargin === 'number'
      ? legacy.sliderHitMargin
      : DEFAULT_SETTINGS.color.sliderHitMargin;
  const showToleranceBand =
    typeof legacy.showToleranceBand === 'boolean'
      ? legacy.showToleranceBand
      : DEFAULT_SETTINGS.color.showToleranceBand;
  const enableHoverColorPreview =
    typeof legacy.enableHoverColorPreview === 'boolean'
      ? legacy.enableHoverColorPreview
      : DEFAULT_SETTINGS.color.enableHoverColorPreview;

  return {
    global: {
      idleTimeout: globalIdleTimeout,
    },
    star: {
      autoNext: legacyAutoNext,
      autoNextDelay: starDelay,
      stepGranularity: baseStepGranularity,
      adaptiveMode: baseAdaptiveMode,
      targetAccuracy: baseTargetAccuracy,
      blockSize: baseBlockSize,
      gridSize,
      targetingMode: starTargetingMode,
      manualTargetSectors: starManualSectors,
    },
    color: {
      autoNext: legacyAutoNext,
      autoNextDelay: colorDelay,
      stepGranularity: baseStepGranularity,
      adaptiveMode: baseAdaptiveMode,
      targetAccuracy: baseTargetAccuracy,
      blockSize: baseBlockSize,
      sliderHitMargin,
      showToleranceBand,
      enableHoverColorPreview,
      targetingMode: colorTargetingMode,
      manualTargetSectors: colorManualSectors,
    },
    relative_color: {
      autoNext: legacyAutoNext,
      autoNextDelay: DEFAULT_SETTINGS.relative_color.autoNextDelay,
      stepGranularity: baseStepGranularity,
      adaptiveMode: baseAdaptiveMode,
      targetAccuracy: baseTargetAccuracy,
      blockSize: baseBlockSize,
      sliderHitMargin,
      showToleranceBand,
      enableHoverColorPreview,
    },
  };
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // 检查是否已是新版领域隔离结构
      if (parsed && typeof parsed === 'object' && parsed.star && parsed.color && parsed.relative_color) {
        return {
          global: { ...DEFAULT_SETTINGS.global, ...(parsed.global || {}) },
          star: { ...DEFAULT_SETTINGS.star, ...(parsed.star || {}) },
          color: { ...DEFAULT_SETTINGS.color, ...(parsed.color || {}) },
          relative_color: { ...DEFAULT_SETTINGS.relative_color, ...(parsed.relative_color || {}) },
        };
      }
      // 迁移老旧配置并持久化更新
      const migrated = migrateLegacySettings(parsed);
      saveSettings(migrated);
      return migrated;
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