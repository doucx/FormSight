好的，我们将针对这三点对 `src/utils/settings.ts` 及其单元测试进行精细化调整：
1. **恰当的默认值**：寻星默认延迟设为 500ms，绝对色感设为 600ms，相对色感设为 800ms（留出矢量诊断阅读时间）。
2. **完全独立的自动翻页开关**：各领域不仅 `autoNextDelay` 独立，`autoNext`（自动切换下一题）布尔开关也完全解耦、独立存储与读取。
3. **领域类型严格隔离**：`star` 模式仅包含几何网格与极角相关配置，完全排除 `showToleranceBand` 等滑块色彩容错属性。

## [WIP] refactor(settings): 细化领域隔离配置与默认参数，确保各领域开关与属性完全独立

### 用户需求
1. 为 `global`、`star`、`color`、`relative_color` 各领域赋予针对训练特性量身定制的合理默认值（如延迟阶梯：寻星 500ms、色感 600ms、相对色感 800ms）。
2. 确保 `autoNext`（自动切换下一题）在各个领域中物理独立，允许用户为不同训练模块单独配置是否自动翻页。
3. 严格规范类型与属性边界，确保 `showToleranceBand`（滑块容错感应区）等色感专用属性在 `star` 模式中不复存在。

### 评论
各领域训练的交互节奏与心智负担不同：寻星为即时命中反馈（500ms 足够），色感需要短暂观察真实色相标线（600ms），而相对色感包含感知色差 $\Delta E$、矢量模长与偏角等多维诊断，800ms 的默认延迟更为舒适。同时将 `autoNext` 开关彻底领域化，契合了“不同练习不同心流”的个性化需求。

### 目标
1. 更新 `src/utils/settings.ts` 中的领域默认值与迁移处理。
2. 确保各个领域的 `autoNext` 属性各自独立。
3. 保证 `StarSettings` 结构纯净，不包含任何滑块与色彩容错字段。
4. 更新并扩展 `src/utils/__tests__/settings.test.ts` 中的领域独立性断言。

### 基本原理
在 `BaseDomainSettings` 中保留基础字段 `autoNext` 与 `autoNextDelay`，每个领域各自实例化独立的子对象。在序列化、读取与合并时，严格在领域命名空间下进行，杜绝跨领域属性污染。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/config #scope/core #scope/api #ai/refine #task/domain/config #task/object/settings-domain-isolation #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 更新 `src/utils/settings.ts` 的默认参数与领域独立逻辑

~~~~~act
write_file
src/utils/settings.ts
~~~~~
~~~~~typescript
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
~~~~~

#### Acts 2: 完善 `src/utils/__tests__/settings.test.ts` 隔离性与边界测试

~~~~~act
write_file
src/utils/__tests__/settings.test.ts
~~~~~
~~~~~typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type UserSettings, loadSettings, saveSettings } from '../settings';

const memoryStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    writable: true,
  });
}

describe('settings utils (domain-scoped isolation)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadSettings - should return domain-tuned default settings', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);

    // 验证各领域特定的合理默认延迟
    expect(settings.star.autoNextDelay).toBe(500);
    expect(settings.color.autoNextDelay).toBe(600);
    expect(settings.relative_color.autoNextDelay).toBe(800);

    // 验证 star 域不存在滑块容错相关字段
    expect((settings.star as unknown as Record<string, unknown>).showToleranceBand).toBeUndefined();
    expect((settings.star as unknown as Record<string, unknown>).sliderHitMargin).toBeUndefined();
  });

  it('saveSettings & loadSettings - should maintain strict domain isolation for autoNext switch', () => {
    const custom: UserSettings = {
      ...DEFAULT_SETTINGS,
      star: {
        ...DEFAULT_SETTINGS.star,
        autoNext: false, // 寻星关闭自动翻页
        autoNextDelay: 300,
      },
      color: {
        ...DEFAULT_SETTINGS.color,
        autoNext: true, // 绝对色感开启自动翻页
        autoNextDelay: 700,
      },
      relative_color: {
        ...DEFAULT_SETTINGS.relative_color,
        autoNext: false, // 相对色感关闭自动翻页
        autoNextDelay: 1200,
      },
    };

    saveSettings(custom);
    const loaded = loadSettings();

    // 验证各领域的 autoNext 开关完全独立互不影响
    expect(loaded.star.autoNext).toBe(false);
    expect(loaded.star.autoNextDelay).toBe(300);

    expect(loaded.color.autoNext).toBe(true);
    expect(loaded.color.autoNextDelay).toBe(700);

    expect(loaded.relative_color.autoNext).toBe(false);
    expect(loaded.relative_color.autoNextDelay).toBe(1200);
  });

  it('loadSettings - should seamlessly migrate legacy flat structure into domain settings', () => {
    const legacyFlat = {
      autoNext: false,
      autoNextDelay: 500,
      starAutoNextDelay: 400,
      colorAutoNextDelay: 750,
      gridSize: 4,
      idleTimeout: 45,
      stepGranularity: 'fine',
      adaptiveMode: 'staircase',
      targetingMode: 'manual',
      manualTargetSectors: [2, 3],
      colorTargetingMode: 'manual',
      colorManualTargetSectors: [5, 6],
      sliderHitMargin: 20,
      showToleranceBand: false,
      enableHoverColorPreview: false,
    };

    localStorage.setItem('star_hopping_user_settings', JSON.stringify(legacyFlat));
    const migrated = loadSettings();

    expect(migrated.global.idleTimeout).toBe(45);

    // star
    expect(migrated.star.autoNext).toBe(false);
    expect(migrated.star.autoNextDelay).toBe(400);
    expect(migrated.star.gridSize).toBe(4);
    expect(migrated.star.stepGranularity).toBe('fine');
    expect(migrated.star.adaptiveMode).toBe('staircase');
    expect(migrated.star.targetingMode).toBe('manual');
    expect(migrated.star.manualTargetSectors).toEqual([2, 3]);

    // color
    expect(migrated.color.autoNext).toBe(false);
    expect(migrated.color.autoNextDelay).toBe(750);
    expect(migrated.color.sliderHitMargin).toBe(20);
    expect(migrated.color.showToleranceBand).toBe(false);
    expect(migrated.color.enableHoverColorPreview).toBe(false);

    // relative_color
    expect(migrated.relative_color.autoNext).toBe(false);
    expect(migrated.relative_color.autoNextDelay).toBe(800); // 采用默认 800ms
    expect(migrated.relative_color.sliderHitMargin).toBe(20);
  });
});
~~~~~

### 下一步建议
`src/utils/settings.ts` 已经完全实现了各领域的配置物理隔离与合理的默认参数设置。接下来建议：
1. **抽离公用 `HsvTrackSlider` 组件**（位于 `src/components/HsvTrackSlider.tsx`），封装指针捕获、外延吸附感应、$\Delta E$ 动态容错区间高亮及准心线。
2. **重构 `RelativeColorCanvas.tsx`**：使用 `HsvTrackSlider` 替换 `<input type="range">`，并在答题时展示动态 $\Delta E$ 容错边界。
3. **改造 `SettingsModal.tsx`**：根据传入的领域 (`domain: 'star' | 'color' | 'relative_color'`) 动态渲染其专属的偏好设置项。
