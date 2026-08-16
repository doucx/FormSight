这是一个非常关键的重构起点。在 MVP 阶段，`autoNext`（自动翻页）与各模块的控制参数被平铺在全局设置中，导致不同训练模块（寻星、绝对色感、相对色感）互相影响。

我们将把 `src/utils/settings.ts` 重构为以领域（Domain）为命名空间的模块化结构，为 `star`、`color`、`relative_color` 提供完全独立的翻页、延迟、自适应参数与特有配置，并在 `loadSettings` 中内置无损向下兼容迁移逻辑。同时更新单元测试 `src/utils/__tests__/settings.test.ts`。

## [WIP] refactor: 重构 settings 配置系统为领域隔离的结构化模型

### 用户需求
1. 将 `autoNext`（自动翻页）与 `autoNextDelay`（翻页延迟）在各个领域（寻星、绝对色感、相对色感）之间完全隔离。
2. 为各领域设置恰当的初始默认值。
3. 容错感应区与滑块专属设置仅在存在滑块的领域（`color` 与 `relative_color`）中生效，从 `star` 模式中彻底剥离。
4. 提供健壮的向下兼容迁移机制，确保老用户的 localStorage 扁平配置能平滑升级到新的领域化结构。

### 评论
将配置模型按领域（Domain）隔离是彻底消除 MVP 技术债的关键步骤。这样不仅能使各模块的自适应与交互行为互不干扰，也为后续组件（`SettingsModal`、`ColorCanvas`、`RelativeColorCanvas`）的重构铺平了道路。

### 目标
1. 在 `src/utils/settings.ts` 中定义 `BaseModuleSettings`、`StarSettings`、`ColorSenseSettings`、`RelativeColorSettings`、`GlobalSettings` 及统一的 `UserSettings` 树状接口。
2. 配置各领域的独立默认值（`DEFAULT_SETTINGS`）。
3. 编写老版本扁平配置对象的平滑迁移逻辑（自动提取并升级老版本的混合字段）。
4. 同步更新 `src/utils/__tests__/settings.test.ts` 验证新结构读取、持久化以及旧配置格式迁移。

### 基本原理
通过定义通用模块基础接口 `BaseModuleSettings`，确保各训练模块共享相同的自适应算子规则（如 `adaptiveMode`, `stepGranularity`, `targetAccuracy`, `blockSize` 以及独立的 `autoNext` / `autoNextDelay`）。领域特有属性（如网格尺寸、滑块外延感应区、动态容错带）则通过继承和特化接口实现。在读取 LocalStorage 时，检测配置对象的结构特征，若命中老版本字段，则自动重构赋值并持久化为新结构。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/config #scope/core #scope/dx #ai/instruct #task/domain/config #task/object/domain-scoped-settings #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 重构 `src/utils/settings.ts` 为领域化结构

我们将重写 `settings.ts`，定义结构化的领域配置体系和兼容迁移逻辑。

~~~~~act
write_file
src/utils/settings.ts
~~~~~
~~~~~typescript
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
          parsed.colorTargetingMode === 'manual'
            ? 'manual'
            : DEFAULT_SETTINGS.color.targetingMode,
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
        sliderHitMargin:
          parsed.sliderHitMargin ?? DEFAULT_SETTINGS.relative_color.sliderHitMargin,
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
~~~~~

#### Acts 2: 更新 `src/utils/__tests__/settings.test.ts` 单元测试

更新单元测试以覆盖分层结构验证与向下兼容迁移逻辑。

~~~~~act
write_file
src/utils/__tests__/settings.test.ts
~~~~~
~~~~~typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../settings';

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

describe('settings utils with domain isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadSettings - should return default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.star.autoNext).toBe(true);
    expect(settings.color.autoNext).toBe(true);
    expect(settings.relative_color.autoNext).toBe(true);
    expect(settings.star.gridSize).toBe(3);
    expect(settings.color.showToleranceBand).toBe(true);
  });

  it('saveSettings & loadSettings - should persist and retrieve domain-scoped settings', () => {
    const custom = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    custom.star.autoNext = false;
    custom.star.autoNextDelay = 800;
    custom.star.gridSize = 4;

    custom.color.autoNext = true;
    custom.color.autoNextDelay = 300;
    custom.color.sliderHitMargin = 20;

    custom.relative_color.autoNext = false;
    custom.relative_color.autoNextDelay = 1200;

    saveSettings(custom);

    const loaded = loadSettings();
    expect(loaded.star.autoNext).toBe(false);
    expect(loaded.star.autoNextDelay).toBe(800);
    expect(loaded.star.gridSize).toBe(4);

    expect(loaded.color.autoNext).toBe(true);
    expect(loaded.color.autoNextDelay).toBe(300);
    expect(loaded.color.sliderHitMargin).toBe(20);

    expect(loaded.relative_color.autoNext).toBe(false);
    expect(loaded.relative_color.autoNextDelay).toBe(1200);
  });

  it('loadSettings - should smoothly migrate legacy flat settings', () => {
    const legacySettings = {
      autoNext: false,
      autoNextDelay: 600,
      starAutoNextDelay: 400,
      colorAutoNextDelay: 700,
      gridSize: 5,
      sliderHitMargin: 8,
      showToleranceBand: false,
      targetingMode: 'manual',
      manualTargetSectors: [0, 1],
      colorTargetingMode: 'manual',
      colorManualTargetSectors: [2, 3],
      idleTimeout: 30,
    };

    localStorage.setItem('star_hopping_user_settings', JSON.stringify(legacySettings));

    const migrated = loadSettings();

    // 验证 global
    expect(migrated.global.idleTimeout).toBe(30);

    // 验证 star 领域隔离
    expect(migrated.star.autoNext).toBe(false);
    expect(migrated.star.autoNextDelay).toBe(400);
    expect(migrated.star.gridSize).toBe(5);
    expect(migrated.star.targetingMode).toBe('manual');
    expect(migrated.star.manualTargetSectors).toEqual([0, 1]);

    // 验证 color 领域隔离
    expect(migrated.color.autoNext).toBe(false);
    expect(migrated.color.autoNextDelay).toBe(700);
    expect(migrated.color.sliderHitMargin).toBe(8);
    expect(migrated.color.showToleranceBand).toBe(false);
    expect(migrated.color.targetingMode).toBe('manual');
    expect(migrated.color.manualTargetSectors).toEqual([2, 3]);

    // 验证 relative_color 独立填充
    expect(migrated.relative_color.autoNext).toBe(false);
    expect(migrated.relative_color.autoNextDelay).toBe(700);
    expect(migrated.relative_color.sliderHitMargin).toBe(8);
  });
});
~~~~~

### 下一步建议
我们已经成功将配置系统升级为分层、领域隔离的模型，并提供了无损迁移机制。接下来建议进行以下步骤：
1. **抽离通用 `HsvTrackSlider` 组件**：将 `ColorCanvas.tsx` 中的 HSV 调制轨道提取为独立组件，支持 `hitMargin`、动态 $\Delta E$ 容错带、手势捕获等。
2. **重构 `RelativeColorCanvas.tsx`**：使用新的 `HsvTrackSlider` 替代原生 range input，使相对色感获得与综合拾色一致的交互质感与容错可视化。
3. **重构 `SettingsModal.tsx` 及视图接入**：改造偏好设置弹窗，使其支持传入 `domain: 'star' | 'color' | 'relative_color'` 并仅渲染对应领域的专属设置。
