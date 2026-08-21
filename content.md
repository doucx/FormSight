收到，我们将立即启动 FormSight 架构重构的第一阶段：**下沉核心通用几何能力、消除跨领域私有依赖，并实现领域配置的完全自治（开闭原则）**。

## [WIP] refactor: 下沉通用几何命中判定并实现领域配置完全自治

### 用户需求
重构 FormSight 核心架构，消除领域间的横向私下依赖与隐式耦合，下沉通用的点阵近邻磁吸与命中判定算法至 Core 层，并将集中式硬编码的配置项下放至各个垂直领域模块，实现真正的领域完全自治与即插即用。

### 评论
当前系统虽然具备微内核形式，但 `negative_space` 跨模块直连 `star`、`DynamicDomainSettings` 强耦合特定领域扇区常量，违反了高内聚低耦合与开闭原则（OCP）。本次重构为系统奠定清晰的单向依赖层次，为后续纯状态机与类型系统升级打下坚实基础。

### 目标
1. 在 `src/core/geometry/` 下建立通用点阵几何与近邻磁吸算法模块 (`pointGrid.ts`)，并在 `src/core/index.ts` 统一导出。
2. 重构 `src/domains/star/` 与 `src/domains/negative_space/`，解除跨领域引用，统一依赖 `src/core`。
3. 将扇区定义常量与字段 Schemas 从 `src/components/settings/DynamicDomainSettings.tsx` 及 `src/config/schemas.ts` 解耦，下沉至各个领域包内自治维护。
4. 保持 `DynamicDomainSettings` 纯组件化，不再包含任何业务领域专有定义。

### 基本原理
1. **依赖倒置与能力下沉**：空间点阵的欧氏距离查找、最近邻吸附、阈值有效范围判定属于通用的几何交互能力，应当位于系统 Core 层，使各交互领域（寻星、负形反切定点等）平级复用。
2. **领域自治与开闭原则 (OCP)**：每个 Domain 决定自己所需要的扇区细分与调节项配置，无需在中央配置表中登记修改，实现新增领域时的零侵入扩展。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/state #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/domain-autonomy #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 在 Core 层创建通用几何点阵近邻判定模块

新建 `src/core/geometry/pointGrid.ts`，下沉通用的点阵近邻查找与击中判定算法。

~~~~~act
write_file
src/core/geometry/pointGrid.ts
~~~~~
~~~~~ts
import type { Point } from '../../types';

/**
 * 计算两点间的欧氏距离
 */
export function calcPointDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
}

export interface NearestGridPointResult {
  nearestPoint: Point;
  minDistance: number;
  isWithinRange: boolean;
}

/**
 * 通用：在离散点阵中寻找距离点击位置最近的网格点，并判定是否落在有效感应范围内
 */
export function findNearestPointInGrid(
  clickPoint: Point,
  gridPoints: Point[],
  fallbackRadius = 20,
): NearestGridPointResult {
  if (!gridPoints || gridPoints.length === 0) {
    return { nearestPoint: clickPoint, minDistance: 0, isWithinRange: false };
  }

  let nearestPoint = gridPoints[0];
  let minDistance = calcPointDistance(clickPoint, nearestPoint);

  for (let i = 1; i < gridPoints.length; i++) {
    const dist = calcPointDistance(clickPoint, gridPoints[i]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestPoint = gridPoints[i];
    }
  }

  let minNeighborDist = Number.MAX_VALUE;
  for (let i = 0; i < Math.min(5, gridPoints.length - 1); i++) {
    const d = calcPointDistance(gridPoints[i], gridPoints[i + 1]);
    if (d > 0 && d < minNeighborDist) minNeighborDist = d;
  }
  const maxRadius = Math.max(fallbackRadius, minNeighborDist * 0.75);

  return {
    nearestPoint,
    minDistance,
    isWithinRange: minDistance <= maxRadius,
  };
}

export interface PointHitDetectionResult {
  isHit: boolean;
  nearestGridPoint: Point;
  errorDistance: number;
  isWithinRange: boolean;
}

/**
 * 通用：基于离散网格的点击定点命中检测
 */
export function evaluatePointGridHit(
  clickPoint: Point,
  targetPoint: Point,
  gridPoints: Point[],
  hitTolerance = 0.5,
): PointHitDetectionResult {
  const { nearestPoint, isWithinRange } = findNearestPointInGrid(clickPoint, gridPoints);
  const errorDistance = calcPointDistance(nearestPoint, targetPoint);
  const isHit = errorDistance <= hitTolerance;

  return {
    isHit,
    nearestGridPoint: nearestPoint,
    errorDistance,
    isWithinRange,
  };
}
~~~~~

#### Acts 2: 在 Core 层导出几何工具

更新 `src/core/index.ts`，导出 `src/core/geometry/pointGrid`。

~~~~~act
patch_file
src/core/index.ts
~~~~~
~~~~~ts.old
// 导出图形绘制
export * from './canvas/hidpi';
export * from './canvas/drawPointGrid';
export * from './canvas/drawPolygon';
~~~~~
~~~~~ts.new
// 导出图形与几何计算
export * from './canvas/hidpi';
export * from './canvas/drawPointGrid';
export * from './canvas/drawPolygon';
export * from './geometry/pointGrid';
~~~~~

#### Acts 3: 纯化 Star 领域的命中检测模块

重构 `src/domains/star/utils/hitDetection.ts`，让其直接复用 Core 层的通用几何能力。

~~~~~act
write_file
src/domains/star/utils/hitDetection.ts
~~~~~
~~~~~ts
import {
  getDynamicCrosshairMetrics,
  getDynamicDotRadius,
  getGridMinSpacing,
} from '../../../core/canvas/drawPointGrid';
import {
  evaluatePointGridHit,
  findNearestPointInGrid,
} from '../../../core/geometry/pointGrid';
import type { HitResult, Point } from '../../../types';

export { getGridMinSpacing, getDynamicDotRadius, getDynamicCrosshairMetrics };

/**
 * 寻找最近的网格点及感应范围判定 (兼容旧别名)
 */
export function findNearestGridPoint(
  clickPoint: Point,
  gridPoints: Point[],
): { nearestPoint: Point; minDistance: number; isWithinRange: boolean } {
  return findNearestPointInGrid(clickPoint, gridPoints);
}

/**
 * 点击作答 Hit Detection
 */
export function checkHit(clickPoint: Point, targetB: Point, gridPoints: Point[]): HitResult {
  return evaluatePointGridHit(clickPoint, targetB, gridPoints);
}
~~~~~

#### Acts 4: 解除 Negative Space 对 Star 的跨领域依赖

修改 `src/domains/negative_space/utils/hitDetection.ts`，不再跨目录引用 `domains/star`，改为直接使用 `src/core`。

~~~~~act
patch_file
src/domains/negative_space/utils/hitDetection.ts
~~~~~
~~~~~ts.old
import type { Point } from '../../../types';
import { checkHit } from '../../star/utils/index';
import type { NegativeSpaceHitResult, NegativeSpaceQuestionData } from './types';

export function checkNegativeSpaceHit(
  userAnswer: number | 'A' | 'B' | Point,
  question: NegativeSpaceQuestionData,
): NegativeSpaceHitResult {
  if (question.mode === 'NEGATIVE_VERTEX_FITTING') {
    const clickPoint = userAnswer as Point;
    const targetPoint = question.targetPoint ?? { x: 0, y: 0 };
    const distractorPoints = question.distractorPoints ?? [];

    const hitRes = checkHit(clickPoint, targetPoint, distractorPoints);
    return {
      isHit: hitRes.isHit,
      clickPoint,
      nearestGridPoint: hitRes.nearestGridPoint,
      errorValue: hitRes.errorDistance,
      tolerance: question.tolerance,
      isWithinRange: hitRes.isWithinRange,
    };
  }
~~~~~
~~~~~ts.new
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { Point } from '../../../types';
import type { NegativeSpaceHitResult, NegativeSpaceQuestionData } from './types';

export function checkNegativeSpaceHit(
  userAnswer: number | 'A' | 'B' | Point,
  question: NegativeSpaceQuestionData,
): NegativeSpaceHitResult {
  if (question.mode === 'NEGATIVE_VERTEX_FITTING') {
    const clickPoint = userAnswer as Point;
    const targetPoint = question.targetPoint ?? { x: 0, y: 0 };
    const distractorPoints = question.distractorPoints ?? [];

    const hitRes = evaluatePointGridHit(clickPoint, targetPoint, distractorPoints);
    return {
      isHit: hitRes.isHit,
      clickPoint,
      nearestGridPoint: hitRes.nearestGridPoint,
      errorValue: hitRes.errorDistance,
      tolerance: question.tolerance,
      isWithinRange: hitRes.isWithinRange,
    };
  }
~~~~~

#### Acts 5: 净化 DynamicDomainSettings，移除业务硬编码常量

修改 `src/components/settings/DynamicDomainSettings.tsx`，将具体的扇区常量下放到各领域，组件只保留通用 Schema 渲染。

~~~~~act
write_file
src/components/settings/DynamicDomainSettings.tsx
~~~~~
~~~~~tsx
import type { TargetingMode } from '../../utils/settings';
import { SettingToggleItem } from './common/SettingToggleItem';
import { SliderMarginGroup } from './common/SliderMarginGroup';
import { TargetingSection } from './common/TargetingSection';

export type SettingFieldSchema =
  | {
      type: 'sliderMargin';
      key: string;
      title?: string;
    }
  | {
      type: 'toggle';
      key: string;
      title: string;
      description?: string;
    }
  | {
      type: 'buttonGroup';
      key: string;
      title: string;
      options: { label: string; value: unknown }[];
      gridCols?: string;
    }
  | {
      type: 'targeting';
      modeKey: string;
      sectorsKey: string;
      title: string;
      subTitle: string;
      sectors: string[];
      gridCols?: 'grid-cols-3' | 'grid-cols-4';
    };

interface DynamicDomainSettingsProps {
  schemas: SettingFieldSchema[];
  values: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

export function DynamicDomainSettings({ schemas, values, onChange }: DynamicDomainSettingsProps) {
  const handleSectorToggle = (sectorsKey: string, sectorIdx: number) => {
    const currentSectors = (values[sectorsKey] as number[] | undefined) || [];
    const exists = currentSectors.includes(sectorIdx);
    const updated = exists
      ? currentSectors.filter((s) => s !== sectorIdx)
      : [...currentSectors, sectorIdx];

    onChange({ [sectorsKey]: updated });
  };

  return (
    <div className="space-y-4">
      {schemas.map((field) => {
        if (field.type === 'sliderMargin') {
          return (
            <SliderMarginGroup
              key={field.key}
              title={field.title}
              value={(values[field.key] as number | undefined) ?? 12}
              onChange={(val) => onChange({ [field.key]: val })}
            />
          );
        }

        if (field.type === 'toggle') {
          return (
            <SettingToggleItem
              key={field.key}
              title={field.title}
              description={field.description}
              checked={Boolean(values[field.key])}
              onChange={(checked) => onChange({ [field.key]: checked })}
            />
          );
        }

        if (field.type === 'buttonGroup') {
          const currentVal = values[field.key];
          return (
            <div key={field.key} className="space-y-2">
              <div className="text-sm font-semibold text-slate-700">{field.title}</div>
              <div className={`grid ${field.gridCols || 'grid-cols-4'} gap-1.5`}>
                {field.options.map((opt) => (
                  <button
                    type="button"
                    key={String(opt.value)}
                    onClick={() => onChange({ [field.key]: opt.value })}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      currentVal === opt.value
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        }

        if (field.type === 'targeting') {
          const mode = (values[field.modeKey] as TargetingMode | undefined) || 'off';
          const selectedSectors = (values[field.sectorsKey] as number[] | undefined) || [];

          return (
            <TargetingSection
              key={`${field.modeKey}-${field.sectorsKey}`}
              title={field.title}
              subTitle={field.subTitle}
              mode={mode}
              onModeChange={(m) => onChange({ [field.modeKey]: m })}
              sectors={field.sectors}
              selectedSectors={selectedSectors}
              onToggleSector={(idx) => handleSectorToggle(field.sectorsKey, idx)}
              gridCols={field.gridCols}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
~~~~~

#### Acts 6: 在各 Domain 内部自描述各自的配置 Schema

在 `src/domains/star/index.ts` 内部自包含 `STAR_SECTORS` 与 `STAR_SCHEMAS`。

~~~~~act
write_file
src/domains/star/index.ts
~~~~~
~~~~~ts
import { Compass, Crosshair, RotateCw, Target } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { createStarAnalyticsPlugin } from './analytics';
import { starPlugin } from './plugin';

export const STAR_SECTORS = [
  '正东(0°)',
  '东北(45°)',
  '正北(90°)',
  '西北(135°)',
  '正西(180°)',
  '西南(225°)',
  '正南(270°)',
  '东南(315°)',
];

export const STAR_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'buttonGroup',
    key: 'gridSize',
    title: '干扰点网格大小',
    options: [
      { label: '2x2', value: 2 },
      { label: '3x3', value: 3 },
      { label: '4x4', value: 4 },
      { label: '5x5', value: 5 },
    ],
    gridCols: 'grid-cols-4',
  },
  {
    type: 'targeting',
    modeKey: 'targetingMode',
    sectorsKey: 'manualTargetSectors',
    title: '弱点专项靶向强化',
    subTitle: '选择需要靶向强化的角度扇区：',
    sectors: STAR_SECTORS,
    gridCols: 'grid-cols-4',
  },
];

export const starCards: CardDefinition[] = [
  {
    id: 'star_single',
    domain: 'star',
    mode: 'single',
    title: '单锚点模式',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
    instruction: '观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位',
    icon: Target,
    tags: {
      target: ['geometry'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
  {
    id: 'star_double_h',
    domain: 'star',
    mode: 'double_h',
    title: '水平双锚点',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
    instruction: '观察左侧水平双锚点几何关系，在右侧点阵中盲打定位',
    icon: Crosshair,
    tags: {
      target: ['geometry'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
  {
    id: 'star_double_r',
    domain: 'star',
    mode: 'double_r',
    title: '旋转双锚点',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
    instruction: '观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位',
    icon: RotateCw,
    tags: {
      target: ['geometry'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
];

export const starDomain: DomainManifest = {
  domain: 'star',
  meta: {
    domain: 'star',
    appId: 'star-hopping',
    title: '寻星练习',
    subTitle: 'Star-Hopping',
    homeTitle: '寻星练习 (Star-Hopping)',
    homeDesc:
      '基于极坐标与双极透视网格，通过视线搜寻与目标盲打，训练你对空间方位、线段比例及角度旋转的视觉直觉。',
    themeColor: 'indigo',
    icon: Compass,
    hasWeaknessAnalytics: true,
    get cards() {
      return starCards;
    },
  },
  cards: starCards,
  trainingPlugin: starPlugin as unknown as DomainManifest['trainingPlugin'],
  analyticsPlugins: {
    star_single: createStarAnalyticsPlugin('star_single', '单锚点'),
    star_double_h: createStarAnalyticsPlugin('star_double_h', '水平双锚点'),
    star_double_r: createStarAnalyticsPlugin('star_double_r', '旋转双锚点'),
  },
};

export default starDomain;
~~~~~

在 `src/domains/color/index.ts` 内部自包含 `COLOR_SECTORS`, `HUE_SCHEMAS`, `COLOR_ALL_SCHEMAS`。

~~~~~act
write_file
src/domains/color/index.ts
~~~~~
~~~~~ts
import { Droplet, Palette, RotateCw, Sun } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { colorHueAnalyticsPlugin } from './analytics';
import { colorPlugin } from './plugin';

export const COLOR_SECTORS = [
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

export const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const HUE_SCHEMAS: SettingFieldSchema[] = [
  ...SLIDER_COMMON_SCHEMAS,
  {
    type: 'targeting',
    modeKey: 'targetingMode',
    sectorsKey: 'manualTargetSectors',
    title: '色相弱点专项靶向强化',
    subTitle: '选择需要靶向强化的色相扇区：',
    sectors: COLOR_SECTORS,
    gridCols: 'grid-cols-3',
  },
];

export const COLOR_ALL_SCHEMAS: SettingFieldSchema[] = [
  ...SLIDER_COMMON_SCHEMAS,
  {
    type: 'toggle',
    key: 'enableHoverColorPreview',
    title: '综合拾色悬停颜色实时联动',
    description: '鼠标悬停滑块时右侧色块实时跟随试探预览',
  },
];

export const colorCards: CardDefinition[] = [
  {
    id: 'color_hue',
    domain: 'color',
    mode: 'H',
    title: '色相 (Hue)',
    desc: '识别颜色在色相环上的具体角度 (0°~360°)',
    instruction: '定位上方色块在 360° 色相环上的精准角度',
    icon: RotateCw,
    tags: {
      target: ['color'],
      skill: ['color_fidelity'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: HUE_SCHEMAS,
  },
  {
    id: 'color_val',
    domain: 'color',
    mode: 'V',
    title: '明度 (Value)',
    desc: '已知色相，评估颜色的素描明暗程度 (0%~100%)',
    instruction: '评估上方色块的素描明度深浅比例 (0%~100%)',
    icon: Sun,
    tags: {
      target: ['color'],
      skill: ['color_fidelity'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'color_sat',
    domain: 'color',
    mode: 'S',
    title: '饱和度 (Sat)',
    desc: '已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)',
    instruction: '评估上方色块的鲜艳纯度比例 (0%~100%)',
    icon: Droplet,
    tags: {
      target: ['color'],
      skill: ['color_fidelity'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'color_all',
    domain: 'color',
    mode: 'ALL',
    title: '综合拾色 (Match)',
    desc: '同时调整色相、饱和度与明度，逼近真理色彩',
    instruction: '同时调制色相、饱和度与明度轨，使右侧色块逼近左侧目标色',
    icon: Palette,
    tags: {
      target: ['color'],
      skill: ['color_fidelity'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: COLOR_ALL_SCHEMAS,
  },
];

export const colorDomain: DomainManifest = {
  domain: 'color',
  meta: {
    domain: 'color',
    appId: 'color-sense',
    title: '色感训练',
    subTitle: 'Color Recognition',
    homeTitle: '绝对色感 (Color Recognition)',
    homeDesc:
      '拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation) 的分级递进识别，全面建立微小色彩差异感知力。',
    themeColor: 'amber',
    icon: Palette,
    hasWeaknessAnalytics: true,
    get cards() {
      return colorCards;
    },
  },
  cards: colorCards,
  trainingPlugin: colorPlugin as unknown as DomainManifest['trainingPlugin'],
  analyticsPlugins: {
    color_hue: colorHueAnalyticsPlugin,
  },
};

export default colorDomain;
~~~~~

在 `src/domains/angle/index.ts`, `src/domains/negative_space/index.ts`, `src/domains/relative_color/index.ts`, `src/domains/abstraction/index.ts` 中直接使用本地或公共 Schemas。

~~~~~act
patch_file
src/domains/angle/index.ts
~~~~~
~~~~~ts.old
import { Columns, Compass, Split } from 'lucide-preact';
import { SLIDER_COMMON_SCHEMAS } from '../../config/schemas';
import type { DomainManifest } from '../../core/contracts';
~~~~~
~~~~~ts.new
import { Columns, Compass, Split } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { DomainManifest } from '../../core/contracts';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];
~~~~~

~~~~~act
patch_file
src/domains/negative_space/index.ts
~~~~~
~~~~~ts.old
import { Columns, Crosshair, Maximize2, Sparkles } from 'lucide-preact';
import { SLIDER_COMMON_SCHEMAS } from '../../config/schemas';
import type { DomainManifest } from '../../core/contracts';
~~~~~
~~~~~ts.new
import { Columns, Crosshair, Maximize2, Sparkles } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { DomainManifest } from '../../core/contracts';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];
~~~~~

~~~~~act
patch_file
src/domains/relative_color/index.ts
~~~~~
~~~~~ts.old
import { Columns, Palette, Shuffle, Sun } from 'lucide-preact';
import { SLIDER_COMMON_SCHEMAS } from '../../config/schemas';
import type { DomainManifest } from '../../core/contracts';
~~~~~
~~~~~ts.new
import { Columns, Palette, Shuffle, Sun } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { DomainManifest } from '../../core/contracts';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];
~~~~~

~~~~~act
patch_file
src/domains/abstraction/index.ts
~~~~~
~~~~~ts.old
import { Eye, Maximize2, Palette, RotateCw, Sun } from 'lucide-preact';
import { SLIDER_COMMON_SCHEMAS } from '../../config/schemas';
import type { DomainManifest } from '../../core/contracts';
~~~~~
~~~~~ts.new
import { Eye, Maximize2, Palette, RotateCw, Sun } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { DomainManifest } from '../../core/contracts';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];
~~~~~

#### Acts 7: 移除集中硬编码的 `src/config/schemas.ts`

删除已不再需要的冗余中间配置文件 `src/config/schemas.ts`。

~~~~~act
delete_file
src/config/schemas.ts
~~~~~

---

### 下一步建议
1. **统一数据存储事务与原子性**：将 `settings`、`trainingPlans` 迁移或统一由一个聚合 Repository 管理，确保在全量导出导入与重置时拥有严格的原子性保护。
2. **重构 God Hook (`useTrainingSession`)**：将答题反应计时、快捷键监听、音效调度从训练会话核心中分离为纯函数式子模块或微状态机，以便支持完全无头（Headless）的算法单元测试。
