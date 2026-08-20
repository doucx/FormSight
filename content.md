修复构建时遇到的 TypeScript 类型检查错误、未使用的变量声明以及单元测试中的配置结构不匹配问题。

## [WIP] fix: 修复类型定义导出、未使用的声明与设置测试用例

### 错误分析

构建执行 `tsc && vite build` 及运行测试时报错，根本原因包含以下三点：
1. **未使用的导入与变量**: `src/config/analyticsPlugins.tsx` 中导入了未调用的 `renderCompassCanvas`，以及声明了未使用的常量 `STAR_SECTORS`，在 `tsconfig.json` 的 `noUnusedLocals` 严格检查下被拦截。
2. **缺失的模块配置类型导出**: `src/config/trainingPlugins.tsx` 引用了 `StarSettings`、`ColorSenseSettings`、`RelativeColorSettings` 和 `NegativeSpaceSettings` 类型，但在重构至以卡片配置系统为主的 `settings.ts` 时未保留这四个派生接口的显式导出。
3. **设置单元测试断言与模型脱节**: `src/utils/__tests__/settings.test.ts` 仍然假定 `UserSettings` 根级别直接挂载了 `star`、`color`、`relative_color` 等字段，而系统实际已升级为 `cards: Record<string, BaseModuleSettings>` 的卡片级隔离模型，导致测试报错并断言失败。

### 用户需求

解决 `npm run build` 和单元测试执行失败的问题，确保 TypeScript 编译通过且所有单元测试全部 PASS。

### 评论

配置层向卡片级重构后，类型导出与对应单元测试应及时同步更新，以保障构建链的强类型安全与回归校验稳定性。

### 目标

1. 清理 `src/config/analyticsPlugins.tsx` 中未使用的导入与常量。
2. 在 `src/utils/settings.ts` 中补充导出 `StarSettings`、`ColorSenseSettings`、`RelativeColorSettings`、`NegativeSpaceSettings` 接口。
3. 更新 `src/utils/__tests__/settings.test.ts` 使其适配最新的卡片级配置结构与旧版数据迁移兼容逻辑。

### 基本原理

1. 移除未使用声明以满足 TypeScript `noUnusedLocals` 要求。
2. 基于 `BaseModuleSettings` 扩展并导出各个领域卡片所需的强类型定义，在兼容 `trainingPlugins.tsx` 泛型约束的同时提供完备的类型推导。
3. 更新测试用例断言至 `settings.cards.*` 命名空间，并保留对从 LocalStorage 旧版键值向新卡片数据迁移的兼容性测试。

### 标签

#intent/fix #flow/ready #priority/high #comp/build #concept/config #scope/core #ai/instruct #task/domain/build #task/object/typescript-settings-types #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 清理 `analyticsPlugins.tsx` 中的无用声明

~~~~~act
patch_file
src/config/analyticsPlugins.tsx
~~~~~
~~~~~typescript.old
import { type SectorStat, renderCompassCanvas } from '../utils/canvas/drawCompass';
import { renderHeatmapCanvas } from '../utils/canvas/drawHeatmap';
import { hsvToHex } from '../utils/colorUtils';
import { type UnifiedTrialRecord, getTrialRecordsByCard } from '../utils/db';

export interface CardAnalyticsPlugin<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  cardId: string;
  title: string;
  subTitle: string;
  fetchRecords: (cardId: string) => Promise<TRecord[]>;
  renderVisualizer: (canvas: HTMLCanvasElement, records: TRecord[]) => void;
  renderDiagnostics: (records: TRecord[]) => ComponentChildren;
  getOverallStats?: (records: TRecord[]) => {
    accuracy: number;
    total: number;
    customSummary?: ComponentChildren;
  };
}

const STAR_SECTORS = [
  '正东 (0°)',
  '东北 (45°)',
  '正北 (90°)',
  '西北 (135°)',
  '正西 (180°)',
  '西南 (225°)',
  '正南 (270°)',
  '东南 (315°)',
];

const COLOR_SECTORS = [
~~~~~
~~~~~typescript.new
import type { SectorStat } from '../utils/canvas/drawCompass';
import { renderHeatmapCanvas } from '../utils/canvas/drawHeatmap';
import { hsvToHex } from '../utils/colorUtils';
import { type UnifiedTrialRecord, getTrialRecordsByCard } from '../utils/db';

export interface CardAnalyticsPlugin<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  cardId: string;
  title: string;
  subTitle: string;
  fetchRecords: (cardId: string) => Promise<TRecord[]>;
  renderVisualizer: (canvas: HTMLCanvasElement, records: TRecord[]) => void;
  renderDiagnostics: (records: TRecord[]) => ComponentChildren;
  getOverallStats?: (records: TRecord[]) => {
    accuracy: number;
    total: number;
    customSummary?: ComponentChildren;
  };
}

const COLOR_SECTORS = [
~~~~~

#### Acts 2: 在 `settings.ts` 中导出领域配置接口类型

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
export interface BaseModuleSettings {
  autoNext: boolean;
  autoNextDelay: number;
  stepGranularity: StepGranularity;
  adaptiveMode: AdaptiveMode;
  targetAccuracy: number;
  blockSize: number;
  [key: string]: unknown;
}

export interface GlobalSettings {
~~~~~
~~~~~typescript.new
export interface BaseModuleSettings {
  autoNext: boolean;
  autoNextDelay: number;
  stepGranularity: StepGranularity;
  adaptiveMode: AdaptiveMode;
  targetAccuracy: number;
  blockSize: number;
  [key: string]: unknown;
}

export interface StarSettings extends BaseModuleSettings {
  gridSize?: number;
  targetingMode?: TargetingMode;
  manualTargetSectors?: number[];
}

export interface ColorSenseSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
  targetingMode?: TargetingMode;
  manualTargetSectors?: number[];
}

export interface RelativeColorSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
}

export interface NegativeSpaceSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
}

export interface GlobalSettings {
~~~~~

#### Acts 3: 更新 `settings.test.ts` 适配卡片级配置结构与兼容测试

~~~~~act
write_file
src/utils/__tests__/settings.test.ts
~~~~~
~~~~~typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, getCardSettings, loadSettings, saveSettings } from '../settings';

describe('settings utils with card-scoped isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadSettings - should return default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.global.soundEnabled).toBe(true);
    expect(settings.cards.star_single.autoNext).toBe(true);
    expect(settings.cards.color_hue.autoNext).toBe(true);
    expect(settings.cards.rel_vector_shift.autoNext).toBe(true);
    expect(settings.cards.star_single.gridSize).toBe(3);
    expect(settings.cards.color_hue.showToleranceBand).toBe(true);
  });

  it('saveSettings & loadSettings - should persist and retrieve card-scoped settings', () => {
    const custom = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    custom.cards.star_single.autoNext = false;
    custom.cards.star_single.autoNextDelay = 800;
    custom.cards.star_single.gridSize = 4;

    custom.cards.color_hue.autoNext = true;
    custom.cards.color_hue.autoNextDelay = 300;
    custom.cards.color_hue.sliderHitMargin = 20;

    custom.cards.rel_vector_shift.autoNext = false;
    custom.cards.rel_vector_shift.autoNextDelay = 1200;

    saveSettings(custom);

    const loaded = loadSettings();
    expect(loaded.cards.star_single.autoNext).toBe(false);
    expect(loaded.cards.star_single.autoNextDelay).toBe(800);
    expect(loaded.cards.star_single.gridSize).toBe(4);

    expect(loaded.cards.color_hue.autoNext).toBe(true);
    expect(loaded.cards.color_hue.autoNextDelay).toBe(300);
    expect(loaded.cards.color_hue.sliderHitMargin).toBe(20);

    expect(loaded.cards.rel_vector_shift.autoNext).toBe(false);
    expect(loaded.cards.rel_vector_shift.autoNextDelay).toBe(1200);
  });

  it('loadSettings - should merge legacy domain settings with default values', () => {
    const legacyPartialSettings = {
      global: {
        idleTimeout: 120,
      },
      star: {
        gridSize: 5,
      },
    };

    localStorage.setItem('formsight_user_settings', JSON.stringify(legacyPartialSettings));

    const loaded = loadSettings();
    expect(loaded.global.idleTimeout).toBe(120);
    expect(loaded.global.soundEnabled).toBe(DEFAULT_SETTINGS.global.soundEnabled);
    expect(loaded.cards.star_single.gridSize).toBe(5);
    expect(loaded.cards.star_single.autoNext).toBe(DEFAULT_SETTINGS.cards.star_single.autoNext);
    expect(loaded.cards.color_hue).toEqual(DEFAULT_SETTINGS.cards.color_hue);
    expect(loaded.cards.rel_vector_shift).toEqual(DEFAULT_SETTINGS.cards.rel_vector_shift);
    expect(loaded.cards.neg_ratio_estimation).toEqual(DEFAULT_SETTINGS.cards.neg_ratio_estimation);
  });

  it('getCardSettings - should return fallback default settings if card is not found', () => {
    const settings = loadSettings();
    const starSingle = getCardSettings(settings, 'star_single');
    expect(starSingle.autoNext).toBe(true);

    const nonExistent = getCardSettings(settings, 'non_existent_card');
    expect(nonExistent.autoNext).toBe(true);
  });
});
~~~~~

### 下一步建议

1. 重新执行 `npm run build` 验证 TypeScript 编译与 Vite 打包。
2. 运行 `npm test` 确认所有 8 个测试套件（含 settings 模块）全量通过。
