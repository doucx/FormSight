export type StepGranularity = 'standard' | 'fine';
export type AdaptiveMode = 'block' | 'staircase';
export type TargetingMode = 'off' | 'manual';

/**
 * 通用模块基类设置 (翻页、延迟与自适应算子参数)
 */
export interface BaseModuleSettings {
  autoNext: boolean; // 点击作答后是否自动翻页
  autoNextDelay: number; // 自动翻页延迟时长 (ms)
  stepGranularity: StepGranularity; // 步长粒度 ('standard': 标准阶梯, 'fine': 精细阶梯)
  adaptiveMode: AdaptiveMode; // 自适应算子模式 ('block': 轮次胜率评估, 'staircase': 经典3U1D)
  targetAccuracy: number; // 目标通关正确率 (0.7, 0.8, 0.85, 0.9)
  blockSize: number; // 每轮评估题数 (10, 15, 20)
}

/**
 * 寻星练习 (Star-Hopping) 专属配置
 */
export interface StarSettings extends BaseModuleSettings {
  gridSize: number; // 干扰点网格维数 (2, 3, 4, 5)
  targetingMode: TargetingMode; // 弱点专项靶向训练模式 ('off': 关闭, 'manual': 手动指定)
  manualTargetSectors: number[]; // 手动锁定的角度扇区索引 [0~7]
}

/**
 * 绝对色感 (Color Sense) 专属配置
 */
export interface ColorSenseSettings extends BaseModuleSettings {
  sliderHitMargin: number; // 色感滑块极值吸附感应区外延大小 (px)
  showToleranceBand: boolean; // 是否在滑块上显示 ΔE 容错感应指示带
  enableHoverColorPreview: boolean; // 综合拾色悬停时是否实时联动色块试探预览
  targetingMode: TargetingMode; // 色相弱点专项靶向训练模式 ('off', 'manual')
  manualTargetSectors: number[]; // 手动锁定的色相扇区索引 [0~11]
}

/**
 * 相对色感 (Relative Color) 专属配置
 */
export interface RelativeColorSettings extends BaseModuleSettings {
  sliderHitMargin: number; // 色感滑块极值吸附感应区外延大小 (px)
  showToleranceBand: boolean; // 是否在滑块上显示 ΔE 容错感应指示带
  enableHoverColorPreview: boolean; // 悬停时是否实时联动推移色彩预览
}

/**
 * 全局通用设置
 */
export interface GlobalSettings {
  idleTimeout: number; // 闲置自动暂停计时时长 (秒)，0 表示关闭
  soundEnabled: boolean; // 是否启用答题音效反馈
  showIdleBlurOverlay: boolean; // 闲置或失焦暂停时是否显示模糊遮罩提示
}

/**
 * 完整结构化用户设置
 */
export interface UserSettings {
  global: GlobalSettings;
  star: StarSettings;
  color: ColorSenseSettings;
  relative_color: RelativeColorSettings;
}

const SETTINGS_KEY = 'star_hopping_user_settings';

export const DEFAULT_BASE_SETTINGS: BaseModuleSettings = {
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
    soundEnabled: true,
    showIdleBlurOverlay: true,
  },
  star: {
    ...DEFAULT_BASE_SETTINGS,
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  color: {
    ...DEFAULT_BASE_SETTINGS,
    sliderHitMargin: 12,
    showToleranceBand: true,
    enableHoverColorPreview: true,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  relative_color: {
    ...DEFAULT_BASE_SETTINGS,
    sliderHitMargin: 12,
    showToleranceBand: true,
    enableHoverColorPreview: true,
  },
};

/**
 * 从 LocalStorage 加载用户配置，自动兼容并迁移老版本扁平配置
 */
export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw);

    // 判断是否为新版本分层结构 (包含 star、color 等顶级命名空间)
    if (parsed && typeof parsed === 'object' && parsed.star && parsed.color) {
      return {
        global: {
          ...DEFAULT_SETTINGS.global,
          ...(parsed.global || {}),
        },
        star: {
          ...DEFAULT_SETTINGS.star,
          ...parsed.star,
          targetingMode: parsed.star.targetingMode === 'auto' ? 'off' : parsed.star.targetingMode,
        },
        color: {
          ...DEFAULT_SETTINGS.color,
          ...parsed.color,
          targetingMode: parsed.color.targetingMode === 'auto' ? 'off' : parsed.color.targetingMode,
        },
        relative_color: {
          ...DEFAULT_SETTINGS.relative_color,
          ...(parsed.relative_color || {}),
        },
      };
    }

    // === 向下兼容迁移：解析老版本扁平结构 ===
    const migrated: UserSettings = {
      global: {
        idleTimeout: parsed.idleTimeout ?? DEFAULT_SETTINGS.global.idleTimeout,
        soundEnabled: parsed.soundEnabled ?? DEFAULT_SETTINGS.global.soundEnabled,
        showIdleBlurOverlay:
          parsed.showIdleBlurOverlay ?? DEFAULT_SETTINGS.global.showIdleBlurOverlay,
      },
      star: {
        autoNext: parsed.autoNext ?? DEFAULT_SETTINGS.star.autoNext,
        autoNextDelay:
          parsed.starAutoNextDelay ?? parsed.autoNextDelay ?? DEFAULT_SETTINGS.star.autoNextDelay,
        stepGranularity: parsed.stepGranularity ?? DEFAULT_SETTINGS.star.stepGranularity,
        adaptiveMode: parsed.adaptiveMode ?? DEFAULT_SETTINGS.star.adaptiveMode,
        targetAccuracy: parsed.targetAccuracy ?? DEFAULT_SETTINGS.star.targetAccuracy,
        blockSize: parsed.blockSize ?? DEFAULT_SETTINGS.star.blockSize,
        gridSize: parsed.gridSize ?? DEFAULT_SETTINGS.star.gridSize,
        targetingMode:
          parsed.targetingMode === 'manual' ? 'manual' : DEFAULT_SETTINGS.star.targetingMode,
        manualTargetSectors: parsed.manualTargetSectors || [],
      },
      color: {
        autoNext: parsed.autoNext ?? DEFAULT_SETTINGS.color.autoNext,
        autoNextDelay:
          parsed.colorAutoNextDelay ?? parsed.autoNextDelay ?? DEFAULT_SETTINGS.color.autoNextDelay,
        stepGranularity: parsed.stepGranularity ?? DEFAULT_SETTINGS.color.stepGranularity,
        adaptiveMode: parsed.adaptiveMode ?? DEFAULT_SETTINGS.color.adaptiveMode,
        targetAccuracy: parsed.targetAccuracy ?? DEFAULT_SETTINGS.color.targetAccuracy,
        blockSize: parsed.blockSize ?? DEFAULT_SETTINGS.color.blockSize,
        sliderHitMargin: parsed.sliderHitMargin ?? DEFAULT_SETTINGS.color.sliderHitMargin,
        showToleranceBand: parsed.showToleranceBand ?? DEFAULT_SETTINGS.color.showToleranceBand,
        enableHoverColorPreview:
          parsed.enableHoverColorPreview ?? DEFAULT_SETTINGS.color.enableHoverColorPreview,
        targetingMode:
          parsed.colorTargetingMode === 'manual' ? 'manual' : DEFAULT_SETTINGS.color.targetingMode,
        manualTargetSectors: parsed.colorManualTargetSectors || [],
      },
      relative_color: {
        autoNext: parsed.autoNext ?? DEFAULT_SETTINGS.relative_color.autoNext,
        autoNextDelay:
          parsed.colorAutoNextDelay ??
          parsed.autoNextDelay ??
          DEFAULT_SETTINGS.relative_color.autoNextDelay,
        stepGranularity: parsed.stepGranularity ?? DEFAULT_SETTINGS.relative_color.stepGranularity,
        adaptiveMode: parsed.adaptiveMode ?? DEFAULT_SETTINGS.relative_color.adaptiveMode,
        targetAccuracy: parsed.targetAccuracy ?? DEFAULT_SETTINGS.relative_color.targetAccuracy,
        blockSize: parsed.blockSize ?? DEFAULT_SETTINGS.relative_color.blockSize,
        sliderHitMargin: parsed.sliderHitMargin ?? DEFAULT_SETTINGS.relative_color.sliderHitMargin,
        showToleranceBand:
          parsed.showToleranceBand ?? DEFAULT_SETTINGS.relative_color.showToleranceBand,
        enableHoverColorPreview:
          parsed.enableHoverColorPreview ?? DEFAULT_SETTINGS.relative_color.enableHoverColorPreview,
      },
    };

    // 自动保存升级后的结构
    saveSettings(migrated);
    return migrated;
  } catch (e) {
    console.error('Failed to load user settings, fallback to default:', e);
    return DEFAULT_SETTINGS;
  }
}

/**
 * 保存结构化设置至 LocalStorage
 */
export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save user settings:', e);
  }
}
