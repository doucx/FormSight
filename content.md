好的，我们开始重构 `src/utils/settings.ts`，将用户偏好设置按训练领域（`global`、`star`、`color`、`relative_color`）进行分层建模，使自动翻页开关及延迟等各项配置在各个领域间完全独立，并内置旧数据无损升级迁移逻辑。

## [WIP] refactor(settings): 重构用户设置模型为领域隔离结构并支持无损迁移

### 用户需求
1. 将 `autoNext`（自动翻页）与 `autoNextDelay`（翻页延迟）以及其他自适应配置进行领域化物理隔离，避免跨领域互相污染。
2. 重构 `src/utils/settings.ts` 为模块化分层配置结构，便于后续平滑扩展新模块。
3. 提供向下兼容的旧版扁平 localStorage 自动迁移升级逻辑。
4. 同步更新单元测试 `src/utils/__tests__/settings.test.ts`。

### 评论
将配置领域化是解决 MVP 阶段技术债的关键一步。将通用基础行为抽象为 `BaseDomainSettings`，各领域按需继承并扩展专属字段（如寻星的 `gridSize`、色感的 `sliderHitMargin` / `showToleranceBand`），既保证了类型安全与可维护性，又为后续 Settings 弹窗与训练视图的解耦打下了坚实基础。

### 目标
1. 在 `src/utils/settings.ts` 中定义 `BaseDomainSettings`、`StarSettings`、`ColorSenseSettings`、`RelativeColorSettings`、`GlobalSettings` 与根配置 `UserSettings`。
2. 实现旧版本扁平结构（包含 `starAutoNextDelay`、`colorTargetingMode` 等遗留属性）向新版领域化结构的自动迁移算法。
3. 更新 `DEFAULT_SETTINGS`、`loadSettings`、`saveSettings`。
4. 重写并扩充 `src/utils/__tests__/settings.test.ts`，全面覆盖默认加载、持久化以及旧格式升级迁移。

### 基本原理
- 采用领域驱动划分配置，每个 domain 维护独立的自适应算法参数和自动切题延迟。
- 在 `loadSettings()` 解析 JSON 时检查数据结构特征，若检测到顶级缺少 `star` / `color` / `relative_color` 分区，则自动触发字段映射与补全，确保现有用户的历史配置不会丢失或回退。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/config #scope/core #scope/api #ai/refine #task/domain/config #task/object/settings-domain-isolation #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 重构 `src/utils/settings.ts` 为领域隔离架构

~~~~~act
write_file
src/utils/settings.ts
~~~~~
~~~~~typescript
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
~~~~~

#### Acts 2: 更新 `src/utils/__tests__/settings.test.ts` 单元测试

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

describe('settings utils (domain-scoped)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadSettings - should return default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.star.autoNext).toBe(true);
    expect(settings.color.autoNext).toBe(true);
    expect(settings.relative_color.autoNext).toBe(true);
  });

  it('saveSettings & loadSettings - should persist and retrieve domain-scoped settings', () => {
    const custom: UserSettings = {
      global: { idleTimeout: 120 },
      star: {
        ...DEFAULT_SETTINGS.star,
        autoNext: false,
        autoNextDelay: 300,
        gridSize: 4,
      },
      color: {
        ...DEFAULT_SETTINGS.color,
        autoNext: true,
        autoNextDelay: 800,
        sliderHitMargin: 20,
      },
      relative_color: {
        ...DEFAULT_SETTINGS.relative_color,
        autoNext: false,
        autoNextDelay: 1000,
      },
    };

    saveSettings(custom);
    const loaded = loadSettings();

    expect(loaded.global.idleTimeout).toBe(120);
    // 验证各领域的隔离性
    expect(loaded.star.autoNext).toBe(false);
    expect(loaded.star.autoNextDelay).toBe(300);
    expect(loaded.star.gridSize).toBe(4);

    expect(loaded.color.autoNext).toBe(true);
    expect(loaded.color.autoNextDelay).toBe(800);
    expect(loaded.color.sliderHitMargin).toBe(20);

    expect(loaded.relative_color.autoNext).toBe(false);
    expect(loaded.relative_color.autoNextDelay).toBe(1000);
  });

  it('loadSettings - should seamlessly migrate legacy flat settings structure', () => {
    const legacyFlat = {
      autoNext: false,
      autoNextDelay: 600,
      starAutoNextDelay: 400,
      colorAutoNextDelay: 900,
      gridSize: 5,
      idleTimeout: 30,
      stepGranularity: 'fine',
      adaptiveMode: 'staircase',
      targetingMode: 'manual',
      manualTargetSectors: [0, 1],
      colorTargetingMode: 'manual',
      colorManualTargetSectors: [3, 4],
      sliderHitMargin: 8,
      showToleranceBand: false,
      enableHoverColorPreview: false,
    };

    localStorage.setItem('star_hopping_user_settings', JSON.stringify(legacyFlat));
    const migrated = loadSettings();

    // 验证全局迁移
    expect(migrated.global.idleTimeout).toBe(30);

    // 验证寻星域迁移
    expect(migrated.star.autoNext).toBe(false);
    expect(migrated.star.autoNextDelay).toBe(400);
    expect(migrated.star.gridSize).toBe(5);
    expect(migrated.star.stepGranularity).toBe('fine');
    expect(migrated.star.adaptiveMode).toBe('staircase');
    expect(migrated.star.targetingMode).toBe('manual');
    expect(migrated.star.manualTargetSectors).toEqual([0, 1]);

    // 验证绝对色感域迁移
    expect(migrated.color.autoNext).toBe(false);
    expect(migrated.color.autoNextDelay).toBe(900);
    expect(migrated.color.targetingMode).toBe('manual');
    expect(migrated.color.manualTargetSectors).toEqual([3, 4]);
    expect(migrated.color.sliderHitMargin).toBe(8);
    expect(migrated.color.showToleranceBand).toBe(false);
    expect(migrated.color.enableHoverColorPreview).toBe(false);

    // 验证相对色感域初始填充
    expect(migrated.relative_color.autoNext).toBe(false);
    expect(migrated.relative_color.autoNextDelay).toBe(900);
    expect(migrated.relative_color.sliderHitMargin).toBe(8);
  });
});
~~~~~

### 下一步建议
我们已经完成了核心设置底层模型 `src/utils/settings.ts` 及其单元测试的领域化重构与数据迁移。接下来建议：
1. **抽离通用 `HsvTrackSlider` 组件**：将 `ColorCanvas.tsx` 中的滑动条抽离出来，支持吸附感应、准心与 OKLab $\Delta E$ 容错边界指示线。
2. **重构 `RelativeColorCanvas.tsx`**：接入通用 `HsvTrackSlider`，替换原生的 `<input type="range">`。
3. **适配 `SettingsModal.tsx` 与相关 View**：让各个训练板块在打开偏好设置时只传入和修改自身领域配置。
