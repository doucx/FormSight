export type StepGranularity = 'standard' | 'fine';
export type AdaptiveMode = 'block' | 'staircase';
export type TargetingMode = 'off' | 'manual';

/**
 * 通用领域基础自适应与翻页配置
 */
export interface BaseDomainSettings {
  autoNext: boolean; // 点击后是否自动翻页
  autoNextDelay: number; // 自动翻页延迟 (ms)
  stepGranularity: StepGranularity; // 步长粒度
  adaptiveMode: AdaptiveMode; // 自适应算子模式 ('block': 轮次胜率, 'staircase': 3U1D)
  targetAccuracy: number; // 目标通关正确率 (0.7 ~ 0.9)
  blockSize: number; // 每轮评估题数 (10, 15, 20)
}

/**
 * 寻星练习专属设置
 */
export interface StarSettings extends BaseDomainSettings {
  gridSize: number; // 网格维数 (2, 3, 4, 5)
  targetingMode: TargetingMode; // 寻星靶向模式 ('off', 'manual')
  manualTargetSectors: number[]; // 手动锁定的扇区 [0~7]
}

/**
 * 绝对色感训练专属设置
 */
export interface ColorSenseSettings extends BaseDomainSettings {
  sliderHitMargin: number; // 色感滑块极值吸附感应区外延大小 (px)
  showToleranceBand: boolean; // 是否显示滑块容错感应区
  enableHoverColorPreview: boolean; // 综合拾色悬停时是否实时联动颜色预览
  targetingMode: TargetingMode; // 色感靶向模式 ('off', 'manual')
  manualTargetSectors: number[]; // 手动锁定的色相扇区 [0~11]
}

/**
 * 相对色感训练专属设置
 */
export interface RelativeColorSettings extends BaseDomainSettings {
  sliderHitMargin: number; // 色感滑块极值吸附感应区外延大小 (px)
  showToleranceBand: boolean; // 是否显示滑块容错感应区
  enableHoverColorPreview: boolean; // 悬停实时试探预览
}

/**
 * 全局通用偏好
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

const DEFAULT_BASE_DOMAIN_SETTINGS: BaseDomainSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
};

export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60,
  },
  star: {
    ...DEFAULT_BASE_DOMAIN_SETTINGS,
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  color: {
    ...DEFAULT_BASE_DOMAIN_SETTINGS,
    sliderHitMargin: 12,
    showToleranceBand: true,
    enableHoverColorPreview: true,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  relative_color: {
    ...DEFAULT_BASE_DOMAIN_SETTINGS,
    sliderHitMargin: 12,
    showToleranceBand: true,
    enableHoverColorPreview: true,
  },
};

/**
 * 将旧版扁平配置对象平滑升级迁移为领域化结构
 */
function migrateLegacySettings(legacy: Record<string, unknown>): UserSettings {
  const globalIdleTimeout =
    typeof legacy.idleTimeout === 'number' ? legacy.idleTimeout : DEFAULT_SETTINGS.global.idleTimeout;

  const baseAutoNext = typeof legacy.autoNext === 'boolean' ? legacy.autoNext : true;
  const legacyDelay = typeof legacy.autoNextDelay === 'number' ? legacy.autoNextDelay : 500;
  const starDelay = typeof legacy.starAutoNextDelay === 'number' ? legacy.starAutoNextDelay : legacyDelay;
  const colorDelay = typeof legacy.colorAutoNextDelay === 'number' ? legacy.colorAutoNextDelay : legacyDelay;

  const baseStepGranularity =
    legacy.stepGranularity === 'fine' ? 'fine' : DEFAULT_SETTINGS.star.stepGranularity;
  const baseAdaptiveMode =
    legacy.adaptiveMode === 'staircase' ? 'staircase' : DEFAULT_SETTINGS.star.adaptiveMode;
  const baseTargetAccuracy =
    typeof legacy.targetAccuracy === 'number' ? legacy.targetAccuracy : DEFAULT_SETTINGS.star.targetAccuracy;
  const baseBlockSize =
    typeof legacy.blockSize === 'number' ? legacy.blockSize : DEFAULT_SETTINGS.star.blockSize;

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
    typeof legacy.sliderHitMargin === 'number' ? legacy.sliderHitMargin : 12;
  const showToleranceBand =
    typeof legacy.showToleranceBand === 'boolean' ? legacy.showToleranceBand : true;
  const enableHoverColorPreview =
    typeof legacy.enableHoverColorPreview === 'boolean' ? legacy.enableHoverColorPreview : true;

  return {
    global: {
      idleTimeout: globalIdleTimeout,
    },
    star: {
      autoNext: baseAutoNext,
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
      autoNext: baseAutoNext,
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
      autoNext: baseAutoNext,
      autoNextDelay: colorDelay,
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
      // 检查是否为新版分层结构 (同时具备 star 与 color 分区)
      if (parsed && typeof parsed === 'object' && parsed.star && parsed.color) {
        return {
          global: { ...DEFAULT_SETTINGS.global, ...(parsed.global || {}) },
          star: { ...DEFAULT_SETTINGS.star, ...(parsed.star || {}) },
          color: { ...DEFAULT_SETTINGS.color, ...(parsed.color || {}) },
          relative_color: { ...DEFAULT_SETTINGS.relative_color, ...(parsed.relative_color || {}) },
        };
      }
      // 兼容迁移老版扁平配置
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