夹角大小估算模块当前固定生成 15°~165° 的随机夹角，将其细化为支持按象限/角分类（0°~45°、45°~90°、90°~135°、135°~180°）多选并集的机制，并在设置面板中提供分区选择和常用预设（如纯锐角 0°~90°、全范围 0°~180°），能很好地满足专项强化估算精度的训练需求。

我将生成一个方案来实现该角度范围细化选择功能。

## [WIP] feat: 为夹角估算卡片增加可配置的角度生成区间与并集筛选

### 用户需求
在夹角大小估算（`angle_estimation`）卡片的设置中增加目标角度范围配置选项，允许用户按区间（如 0°~45°、45°~90°、90°~135°、135°~180°）进行多选并集筛选，使得训练可以聚焦在特定区间（例如细化到 0°~90° 锐角区间）。

### 评论
该需求切中量角空间认知训练的核心痛点。许多人在钝角（>90°）和锐角（<90°）上的估算心理锚点完全不同，支持将目标夹角细化到 4 个象限区间（0°~45°、45°~90°、90°~135°、135°~180°）并允许自由多选并集，同时提供“全选 / 纯锐角 (0°~90°) / 纯钝角 (90°~180°)”等快速切分操作，能大幅提升模块的训练自由度与易用性。

### 目标
1. **类型定义扩展** (`types.ts`)：定义 `AngleRangePreset`（`'0_45' | '45_90' | '90_135' | '135_180'`）及题目生成参数接口。
2. **生成器算法更新** (`generator.ts`)：重构 `generateQuestion`，使其接受角度范围配置，从用户启用的区间列表中加权/均匀采样并生成角度（设定 5° 最小下限及 175° 上限，防止两条线段重合）。
3. **设置项与配置扩展** (`index.tsx`)：在 `AngleEstimationSettings` 中新增 `angleRanges`，在 `renderSettings` 中提供 4 个区间的切换按钮及常用快捷预设。
4. **国际化支持** (`locales/zh-CN.json` 与 `locales/en-US.json`)：补充角度范围、快捷预设的文本词条。

### 基本原理
1. **角度采样与区间并集**：将 0°~180° 离散化为 4 个 45° 子空间（`[5, 45]`, `[45, 90]`, `[90, 135]`, `[135, 175]`）。当用户勾选多个区间时，算法随机抽取其中一个被选中的区间并在其界限内生成均匀随机整数。若未勾选任何区间，则自动回退到全区间默认状态，保证鲁棒性。
2. **UI 交互一致性**：参考 `star_single` 的网格按钮风格，使用 SDK 提供的 `Button` 组件实现多选 Toggle 体验，并提供“全角度”、“锐角(0~90°)”等预设快捷按钮，方便快速切换训练模式。

### 标签
#intent/build #flow/ready #priority/high #comp/cards #concept/ui #concept/config #scope/ux #ai/delegate #task/domain/card #task/object/angle-estimation-range #task/action/feature-addition #task/state/begin

---

### Script

#### Acts 1: 扩展类型定义与生成配置

在 `types.ts` 中增加角度区间枚举类型 `AngleRangePreset` 及生成选项。

~~~~~act
patch_file
src/cards/angle_estimation/types.ts
~~~~~
~~~~~typescript
export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface AngleEstimationQuestion {
~~~~~
~~~~~typescript
export type AngleRangePreset = '0_45' | '45_90' | '90_135' | '135_180';

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface AngleEstimationGenerateOptions {
  angleRanges?: AngleRangePreset[];
}

export interface AngleEstimationQuestion {
~~~~~

#### Acts 2: 国际化词条更新

更新中英文语言文件，补充角度区间和快捷模式的翻译文本。

~~~~~act
patch_file
src/cards/angle_estimation/locales/zh-CN.json
~~~~~
~~~~~json
  "settings": {
    "showToleranceBandTitle": "显示动态容错带",
    "showToleranceBandDesc": "在滑块周围显示当前难度下的容错区间指示线"
  },
~~~~~
~~~~~json
  "settings": {
    "showToleranceBandTitle": "显示动态容错带",
    "showToleranceBandDesc": "在滑块周围显示当前难度下的容错区间指示线",
    "angleRangesTitle": "目标角度生成范围",
    "angleRangesDesc": "选择题目生成的夹角区间 (支持多选取并集)",
    "presetAll": "全角度 (0°~180°)",
    "presetAcute": "纯锐角 (0°~90°)",
    "presetObtuse": "纯钝角 (90°~180°)",
    "ranges": {
      "0_45": "0° ~ 45°",
      "45_90": "45° ~ 90°",
      "90_135": "90° ~ 135°",
      "135_180": "135° ~ 180°"
    }
  },
~~~~~

~~~~~act
patch_file
src/cards/angle_estimation/locales/en-US.json
~~~~~
~~~~~json
  "settings": {
    "showToleranceBandTitle": "Show Tolerance Band",
    "showToleranceBandDesc": "Display dynamic tolerance band around current slider position"
  },
~~~~~
~~~~~json
  "settings": {
    "showToleranceBandTitle": "Show Tolerance Band",
    "showToleranceBandDesc": "Display dynamic tolerance band around current slider position",
    "angleRangesTitle": "Target Angle Ranges",
    "angleRangesDesc": "Select target angle ranges for generated questions (multi-select union)",
    "presetAll": "All (0°~180°)",
    "presetAcute": "Acute (0°~90°)",
    "presetObtuse": "Obtuse (90°~180°)",
    "ranges": {
      "0_45": "0° ~ 45°",
      "45_90": "45° ~ 90°",
      "90_135": "90° ~ 135°",
      "135_180": "135° ~ 180°"
    }
  },
~~~~~

#### Acts 3: 更新角度题目生成算法

使 `generateQuestion` 能够根据配置的 `angleRanges` 生成落在选定并集区间的目标角度。

~~~~~act
patch_file
src/cards/angle_estimation/utils/generator.ts
~~~~~
~~~~~typescript
import { CANVAS_THEME, type Point, expDecayInterpolate, setup2DCanvas } from '@formsight/card-sdk';
import type { AngleEstimationHitResult, AngleEstimationQuestion, LineSegment } from '../types';

export const ANGLE_CANVAS_SIZE = 340;
~~~~~
~~~~~typescript
import { CANVAS_THEME, type Point, expDecayInterpolate, setup2DCanvas } from '@formsight/card-sdk';
import type {
  AngleEstimationGenerateOptions,
  AngleEstimationHitResult,
  AngleEstimationQuestion,
  AngleRangePreset,
  LineSegment,
} from '../types';

export const ANGLE_CANVAS_SIZE = 340;

const RANGE_BOUNDS: Record<AngleRangePreset, [number, number]> = {
  '0_45': [5, 45],
  '45_90': [45, 90],
  '90_135': [90, 135],
  '135_180': [135, 175],
};

const ALL_RANGES: AngleRangePreset[] = ['0_45', '45_90', '90_135', '135_180'];
~~~~~

~~~~~act
patch_file
src/cards/angle_estimation/utils/generator.ts
~~~~~
~~~~~typescript
export function generateQuestion(level: number): AngleEstimationQuestion {
  const id = `ang_est_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const targetAngleDeg = Math.floor(Math.random() * 150) + 15;
  const startAngleDeg = Math.floor(Math.random() * 360);
~~~~~
~~~~~typescript
export function generateQuestion(
  level: number,
  options?: AngleEstimationGenerateOptions,
): AngleEstimationQuestion {
  const id = `ang_est_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const activeRanges =
    options?.angleRanges && options.angleRanges.length > 0 ? options.angleRanges : ALL_RANGES;

  const chosenPreset = activeRanges[Math.floor(Math.random() * activeRanges.length)];
  const [minDeg, maxDeg] = RANGE_BOUNDS[chosenPreset] ?? [15, 165];
  const targetAngleDeg = Math.floor(Math.random() * (maxDeg - minDeg + 1)) + minDeg;

  const startAngleDeg = Math.floor(Math.random() * 360);
>>>>>>
~~~~~

#### Acts 4: 更新卡片配置面板与引擎接入

在 `index.tsx` 中向卡片设置注入 `angleRanges`，在 UI 中提供 4 区间按钮组及 3 个常用快捷预设（全角度、纯锐角、纯钝角）。

~~~~~act
patch_file
src/cards/angle_estimation/index.tsx
~~~~~
~~~~~typescript
import { Compass } from 'lucide-preact';

import {
  type BaseModuleSettings,
  type CardManifest,
  SettingToggleItem,
  useCardTranslation,
} from '@formsight/card-sdk';
import { AngleEstimationView } from './AngleEstimationView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { AngleEstimationHitResult, AngleEstimationQuestion } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export interface AngleEstimationSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
}
~~~~~
~~~~~typescript
import { Compass, SlidersHorizontal } from 'lucide-preact';

import {
  type BaseModuleSettings,
  Button,
  type CardManifest,
  SettingToggleItem,
  useCardTranslation,
} from '@formsight/card-sdk';
import { AngleEstimationView } from './AngleEstimationView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type {
  AngleEstimationHitResult,
  AngleEstimationQuestion,
  AngleRangePreset,
} from './types';
import { checkHit, generateQuestion } from './utils/generator';

const ALL_ANGLE_RANGES: AngleRangePreset[] = ['0_45', '45_90', '90_135', '135_180'];

export interface AngleEstimationSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
  angleRanges?: AngleRangePreset[];
}
~~~~~

~~~~~act
patch_file
src/cards/angle_estimation/index.tsx
~~~~~
~~~~~typescript
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
  engine: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, question) => checkHit(userVal, question),
~~~~~
~~~~~typescript
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
    angleRanges: ['0_45', '45_90', '90_135', '135_180'],
  },
  engine: {
    generateQuestion: (level, settings) =>
      generateQuestion(level, {
        angleRanges: settings.angleRanges,
      }),
    evaluateAnswer: (userVal, question) => checkHit(userVal, question),
~~~~~

~~~~~act
patch_file
src/cards/angle_estimation/index.tsx
~~~~~
~~~~~typescript
    renderSettings: ({ settings, updateSettings }) => {
      const { t } = useCardTranslation('angle_estimation');
      return (
        <div className="space-y-4">
          <SettingToggleItem
            title={t('settings.showToleranceBandTitle')}
            description={t('settings.showToleranceBandDesc')}
            checked={(settings.showToleranceBand as boolean) ?? true}
            onChange={(val) => updateSettings({ showToleranceBand: val })}
          />
        </div>
      );
    },
~~~~~
~~~~~typescript
    renderSettings: ({ settings, updateSettings }) => {
      const { t } = useCardTranslation('angle_estimation');
      const currentRanges = settings.angleRanges ?? ALL_ANGLE_RANGES;

      const toggleRange = (range: AngleRangePreset) => {
        const next = currentRanges.includes(range)
          ? currentRanges.filter((r) => r !== range)
          : [...currentRanges, range];
        // 至少保留当前项，避免全部取消导致空区间
        updateSettings({ angleRanges: next.length > 0 ? next : [range] });
      };

      const setPreset = (ranges: AngleRangePreset[]) => {
        updateSettings({ angleRanges: ranges });
      };

      return (
        <div className="space-y-4">
          <SettingToggleItem
            title={t('settings.showToleranceBandTitle')}
            description={t('settings.showToleranceBandDesc')}
            checked={(settings.showToleranceBand as boolean) ?? true}
            onChange={(val) => updateSettings({ showToleranceBand: val })}
          />

          <div className="space-y-2.5 pt-2 border-t border-border/65">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <span>{t('settings.angleRangesTitle')}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('settings.angleRangesDesc')}</p>

            {/* 快速预设按钮 */}
            <div className="grid grid-cols-3 gap-1.5">
              <Button
                variant={currentRanges.length === 4 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreset(ALL_ANGLE_RANGES)}
                className="py-1.5 text-xs h-auto"
              >
                {t('settings.presetAll')}
              </Button>
              <Button
                variant={
                  currentRanges.length === 2 &&
                  currentRanges.includes('0_45') &&
                  currentRanges.includes('45_90')
                    ? 'default'
                    : 'outline'
                }
                size="sm"
                onClick={() => setPreset(['0_45', '45_90'])}
                className="py-1.5 text-xs h-auto"
              >
                {t('settings.presetAcute')}
              </Button>
              <Button
                variant={
                  currentRanges.length === 2 &&
                  currentRanges.includes('90_135') &&
                  currentRanges.includes('135_180')
                    ? 'default'
                    : 'outline'
                }
                size="sm"
                onClick={() => setPreset(['90_135', '135_180'])}
                className="py-1.5 text-xs h-auto"
              >
                {t('settings.presetObtuse')}
              </Button>
            </div>

            {/* 细分区间多选按钮 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
              {ALL_ANGLE_RANGES.map((range) => {
                const isSelected = currentRanges.includes(range);
                return (
                  <Button
                    key={range}
                    variant={isSelected ? 'accent' : 'outline'}
                    size="sm"
                    onClick={() => toggleRange(range)}
                    className="py-2 text-xs font-mono h-auto"
                  >
                    {t(`settings.ranges.${range}`)}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      );
    },
~~~~~

---

### 下一步建议
- **运行测试与构建验证**：建议执行 `pnpm build` 或针对卡片进行渲染测试，验证设置面板中选中区间后新生成的题目角度是否严格受限于所选范围。
- **动态滑块区间适配（可选）**：如果希望在仅选纯锐角（0°~90°）时将滑块最大量程收缩到 90°（以提供双倍微调分辨率），可以在 `AngleEstimationView` 中根据当前所选区间的最大最小值动态调整滑块 `min`/`max`；或保持 0°~180° 以维持统一的空间心理量尺。
