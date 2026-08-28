我们继续推进第二批次重构，重点针对 **7 大 Packs 清单（`index.ts` 与 `plugin.tsx`）中的冗余中文字符串、Canvas 辅助文字、以及各视图组件中的细节文本**进行全面净化与查表化。

## [WIP] refactor: 净化 7 大 Packs 清单元数据与基础设施硬编码中文

### 用户需求
彻底消除 7 个 Packs（`star`, `color`, `relative_color`, `negative_space`, `angle`, `perspective`, `abstraction`）清单与插件层残留的中文 `title`/`desc`/`instruction`，并替换 Canvas 图表和私有视图组件中的剩余中文。

### 评论
在 v0.5 架构下，Pack 的多语言定义已完全内聚至各自的 `locales/zh-CN.json` 和 `locales/en-US.json` 中。TypeScript 清单代码中保留硬编码中文属于历史冗余。清除这些冗余后，Pack 清单将变得极度轻量，且完全符合白皮书所规定的“自包含、零内核侵入”原则。

### 目标
1. 净化 7 大 Pack 的 `index.ts` 与 `plugin.tsx`，移除所有硬编码中文。
2. 改造 `drawHueBiasChart.ts` 与 `drawTrendChart.ts`，消除 Canvas 刻度与轴线指示中的硬编码中文。
3. 替换各 Pack 交互视图中的提示文本与提交按钮（如 `ColorCanvas.tsx`、`AlbersInductionView.tsx` 等）。
4. 修复 `ConfirmModal.tsx` 中的默认参数。

### 基本原理
- **微内核单向解析**：UI 表现层统一通过 `t(\`packs.${card.packId}.cards.${card.id}.title\`)` 解析卡片名称与说明，Pack 清单对象不再重复存储静态中文字符串。
- **Canvas 本地化参数化**：将 Canvas 轴线说明（如“最近活跃日演进趋势”、“偏大/偏小”）通过 `t()` 国际化查表或传参注入。

### 标签
#intent/refine #flow/ready #priority/high
#comp/interfaces #comp/runtime #scope/ux #scope/dx
#ai/instruct
#task/domain/i18n #task/object/hardcoded-strings #task/action/cleanup
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 净化 `src/types/card.ts` 与通用组件

将 `CardDefinition` 与 `PackMeta` 中的自然语言属性调整为可选并标记弃用，修复 `ConfirmModal` 默认文案。

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~typescript
export interface CardDefinition {
  id: string;
  packId: string;
  mode: string;
  title: string;
  desc: string;
  instruction?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
}

export interface PackMeta {
  id: string;
  title: string;
  subTitle?: string;
  desc: string;
  version?: string;
  author?: string;
  themeColor?: 'indigo' | 'amber' | 'purple' | 'emerald';
  icon?: (props: { className?: string }) => ComponentChildren;
}
~~~~~
~~~~~typescript
export interface CardDefinition {
  id: string;
  packId: string;
  mode: string;
  title?: string;
  desc?: string;
  instruction?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
}

export interface PackMeta {
  id: string;
  title?: string;
  subTitle?: string;
  desc?: string;
  version?: string;
  author?: string;
  themeColor?: 'indigo' | 'amber' | 'purple' | 'emerald';
  icon?: (props: { className?: string }) => ComponentChildren;
}
~~~~~

~~~~~act
patch_file
src/components/common/ConfirmModal.tsx
~~~~~
~~~~~typescript
import { AlertTriangle } from 'lucide-preact';
import { ModalShell } from './ModalShell';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  isDangerous = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
~~~~~
~~~~~typescript
import { AlertTriangle } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import { ModalShell } from './ModalShell';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  isDangerous = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { t } = useTranslation();
  const effectiveConfirmText = confirmText || t('common.confirm');
  const effectiveCancelText = cancelText || t('common.cancel');
~~~~~

~~~~~act
patch_file
src/components/common/ConfirmModal.tsx
~~~~~
~~~~~typescript
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full py-2.5 px-3 text-xs font-bold text-white rounded-xl shadow-sm transition-all active:scale-95 ${
              isDangerous
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            {confirmText}
          </button>
~~~~~
~~~~~typescript
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95"
          >
            {effectiveCancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full py-2.5 px-3 text-xs font-bold text-white rounded-xl shadow-sm transition-all active:scale-95 ${
              isDangerous
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            {effectiveConfirmText}
          </button>
~~~~~

#### Acts 2: 净化 7 大 Packs 清单 `index.ts` 与 `plugin.tsx`

~~~~~act
patch_file
src/packs/angle/index.ts
~~~~~
~~~~~typescript
const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const angleCards: CardDefinition[] = [
  {
    id: 'angle_estimation',
    packId: 'angle',
    mode: 'ANGLE_ESTIMATION',
    title: '夹角大小估算',
    desc: '观察由纯黑线段构成的夹角，使用连续滑块精准评估夹角弧度大小 (0°~180°)。',
    instruction: '观察极简两条射线夹角，调制滑块逼近精准度数 (0°~180°)',
    icon: Compass,
    tags: {
      domain: ['form_and_proportion'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'angle_comparison_2afc',
    packId: 'angle',
    mode: 'ANGLE_COMPARISON_2AFC',
    title: '角度二分对比',
    desc: '在消除空间正交基准干扰下，二选一快速判别哪一侧的两射线夹角更大 (2AFC)。',
    instruction: '二选一快速判别哪一侧夹角更大 (键 1 / 2)',
    icon: Columns,
    tags: {
      domain: ['form_and_proportion'],
      path: ['relational_mapping'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'angle_parallel_2afc',
    packId: 'angle',
    mode: 'PARALLEL_ALIGNMENT_2AFC',
    title: '平行线基准辨识',
    desc: '观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其绝对平行的线段 (2AFC)。',
    instruction: '观察上方基准线，在下方选出与其保持绝对平行的线 (键 1 / 2)',
    icon: Split,
    tags: {
      domain: ['form_and_proportion'],
      path: ['relational_mapping'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const anglePack: PackManifest = {
  packId: 'angle',
  meta: {
    id: 'angle',
    title: '角度感知',
    subTitle: 'Angle Perception',
    desc: '以极简白底黑线剥离干扰，通过夹角大小估算、微小角度二分对比与平行线对偶辨识，构建坚实的正负形起形与角度感知直觉。',
    themeColor: 'indigo',
    icon: Compass,
  },
  cards: angleCards,
  trainingPlugin: anglePlugin,
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  defaultCardSettings: {
    angle_estimation: {
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
  },
};
~~~~~
~~~~~typescript
const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: 'packs.angle.settings.showToleranceBandTitle',
    description: 'packs.angle.settings.showToleranceBandDesc',
  },
];

export const angleCards: CardDefinition[] = [
  {
    id: 'angle_estimation',
    packId: 'angle',
    mode: 'ANGLE_ESTIMATION',
    icon: Compass,
    tags: {
      domain: ['form_and_proportion'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'angle_comparison_2afc',
    packId: 'angle',
    mode: 'ANGLE_COMPARISON_2AFC',
    icon: Columns,
    tags: {
      domain: ['form_and_proportion'],
      path: ['relational_mapping'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'angle_parallel_2afc',
    packId: 'angle',
    mode: 'PARALLEL_ALIGNMENT_2AFC',
    icon: Split,
    tags: {
      domain: ['form_and_proportion'],
      path: ['relational_mapping'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const anglePack: PackManifest = {
  packId: 'angle',
  meta: {
    id: 'angle',
    themeColor: 'indigo',
    icon: Compass,
  },
  cards: angleCards,
  trainingPlugin: anglePlugin,
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  defaultCardSettings: {
    angle_estimation: {
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
  },
};
~~~~~

~~~~~act
patch_file
src/packs/angle/plugin.tsx
~~~~~
~~~~~typescript
export const anglePlugin: TrainingPlugin<
  AngleQuestionData,
  AngleHitResult,
  number | 'A' | 'B',
  BaseModuleSettings
> = {
  packId: 'angle',
  title: '角度感知',
  getModeBadge: (mode) => {
    const map: Record<string, string> = {
      ANGLE_ESTIMATION: '夹角大小估算',
      ANGLE_COMPARISON_2AFC: '角度二分对比',
      PARALLEL_ALIGNMENT_2AFC: '平行线基准辨识',
    };
    return map[mode] || mode;
  },
  generateQuestion: (mode, level) => generateAngleQuestion(mode as AngleMode, level),
~~~~~
~~~~~typescript
export const anglePlugin: TrainingPlugin<
  AngleQuestionData,
  AngleHitResult,
  number | 'A' | 'B',
  BaseModuleSettings
> = {
  packId: 'angle',
  title: 'angle',
  getModeBadge: (mode) => mode,
  generateQuestion: (mode, level) => generateAngleQuestion(mode as AngleMode, level),
~~~~~

~~~~~act
patch_file
src/packs/star/index.ts
~~~~~
~~~~~typescript
export const starCards: CardDefinition[] = [
  {
    id: 'star_single',
    packId: 'star',
    mode: 'single',
    title: '单锚点模式',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
    instruction: '观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位',
    icon: Target,
    tags: {
      domain: ['spatial_structure'],
      path: ['absolute_estimation'],
      interaction: ['spatial_locate'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
  {
    id: 'star_double_h',
    packId: 'star',
    mode: 'double_h',
    title: '水平双锚点',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
    instruction: '观察左侧水平双锚点几何关系，在右侧点阵中盲打定位',
    icon: Crosshair,
    tags: {
      domain: ['spatial_structure', 'form_and_proportion'],
      path: ['absolute_estimation', 'relational_mapping'],
      interaction: ['spatial_locate'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
  {
    id: 'star_double_r',
    packId: 'star',
    mode: 'double_r',
    title: '旋转双锚点',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
    instruction: '观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位',
    icon: RotateCw,
    tags: {
      domain: ['spatial_structure', 'form_and_proportion'],
      path: ['absolute_estimation', 'relational_mapping'],
      challenge: ['dimensional_translation'],
      interaction: ['spatial_locate'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
];

export const starPack: PackManifest = {
  packId: 'star',
  meta: {
    id: 'star',
    title: '寻星练习',
    subTitle: 'Star-Hopping',
    desc: '基于极坐标与双极透视网格，通过视线搜寻与目标盲打，训练你对空间方位、线段比例及角度旋转的视觉直觉。',
    themeColor: 'indigo',
    icon: Compass,
  },
  cards: starCards,
  trainingPlugin: starPlugin,
  analyticsPlugins: {
    star_single: createStarAnalyticsPlugin('star_single', '单锚点'),
    star_double_h: createStarAnalyticsPlugin('star_double_h', '水平双锚点'),
    star_double_r: createStarAnalyticsPlugin('star_double_r', '旋转双锚点'),
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
~~~~~
~~~~~typescript
export const starCards: CardDefinition[] = [
  {
    id: 'star_single',
    packId: 'star',
    mode: 'single',
    icon: Target,
    tags: {
      domain: ['spatial_structure'],
      path: ['absolute_estimation'],
      interaction: ['spatial_locate'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
  {
    id: 'star_double_h',
    packId: 'star',
    mode: 'double_h',
    icon: Crosshair,
    tags: {
      domain: ['spatial_structure', 'form_and_proportion'],
      path: ['absolute_estimation', 'relational_mapping'],
      interaction: ['spatial_locate'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
  {
    id: 'star_double_r',
    packId: 'star',
    mode: 'double_r',
    icon: RotateCw,
    tags: {
      domain: ['spatial_structure', 'form_and_proportion'],
      path: ['absolute_estimation', 'relational_mapping'],
      challenge: ['dimensional_translation'],
      interaction: ['spatial_locate'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
];

export const starPack: PackManifest = {
  packId: 'star',
  meta: {
    id: 'star',
    themeColor: 'indigo',
    icon: Compass,
  },
  cards: starCards,
  trainingPlugin: starPlugin,
  analyticsPlugins: {
    star_single: createStarAnalyticsPlugin('star_single', 'star_single'),
    star_double_h: createStarAnalyticsPlugin('star_double_h', 'star_double_h'),
    star_double_r: createStarAnalyticsPlugin('star_double_r', 'star_double_r'),
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
~~~~~

~~~~~act
patch_file
src/packs/star/plugin.tsx
~~~~~
~~~~~typescript
export const starPlugin: TrainingPlugin<
  QuestionData,
  HitResult,
  { clickPoint: Point; hitResult: HitResult },
  StarSettings
> = {
  packId: 'star',
  title: '寻星练习',
  getModeBadge: (mode) => mode,
~~~~~
~~~~~typescript
export const starPlugin: TrainingPlugin<
  QuestionData,
  HitResult,
  { clickPoint: Point; hitResult: HitResult },
  StarSettings
> = {
  packId: 'star',
  title: 'star',
  getModeBadge: (mode) => mode,
~~~~~

~~~~~act
patch_file
src/packs/color/index.ts
~~~~~
~~~~~typescript
export const colorCards: CardDefinition[] = [
  {
    id: 'color_hue',
    packId: 'color',
    mode: 'H',
    title: '色相 (Hue)',
    desc: '识别颜色在色相环上的具体角度 (0°~360°)',
    instruction: '定位上方色块在 360° 色相环上的精准角度',
    icon: RotateCw,
    tags: {
      domain: ['color_and_value'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: HUE_SCHEMAS,
  },
  {
    id: 'color_val',
    packId: 'color',
    mode: 'V',
    title: '明度 (Value)',
    desc: '已知色相，评估颜色的素描明暗程度 (0%~100%)',
    instruction: '评估上方色块的素描明度深浅比例 (0%~100%)',
    icon: Sun,
    tags: {
      domain: ['color_and_value'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'color_sat',
    packId: 'color',
    mode: 'S',
    title: '饱和度 (Sat)',
    desc: '已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)',
    instruction: '评估上方色块的鲜艳纯度比例 (0%~100%)',
    icon: Droplet,
    tags: {
      domain: ['color_and_value'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'color_all',
    packId: 'color',
    mode: 'ALL',
    title: '综合拾色 (Match)',
    desc: '同时调整色相、饱和度与明度，逼近真理色彩',
    instruction: '同时调制色相、饱和度与明度轨，使右侧色块逼近左侧目标色',
    icon: Palette,
    tags: {
      domain: ['color_and_value'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: COLOR_ALL_SCHEMAS,
  },
];

export const colorPack: PackManifest = {
  packId: 'color',
  meta: {
    id: 'color',
    title: '绝对色感',
    subTitle: 'Color Recognition',
    desc: '拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation) 的分级递进识别，全面建立微小色彩差异感知力。',
    themeColor: 'amber',
    icon: Palette,
  },
  cards: colorCards,
  trainingPlugin: colorPlugin,
~~~~~
~~~~~typescript
export const colorCards: CardDefinition[] = [
  {
    id: 'color_hue',
    packId: 'color',
    mode: 'H',
    icon: RotateCw,
    tags: {
      domain: ['color_and_value'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: HUE_SCHEMAS,
  },
  {
    id: 'color_val',
    packId: 'color',
    mode: 'V',
    icon: Sun,
    tags: {
      domain: ['color_and_value'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'color_sat',
    packId: 'color',
    mode: 'S',
    icon: Droplet,
    tags: {
      domain: ['color_and_value'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'color_all',
    packId: 'color',
    mode: 'ALL',
    icon: Palette,
    tags: {
      domain: ['color_and_value'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: COLOR_ALL_SCHEMAS,
  },
];

export const colorPack: PackManifest = {
  packId: 'color',
  meta: {
    id: 'color',
    themeColor: 'amber',
    icon: Palette,
  },
  cards: colorCards,
  trainingPlugin: colorPlugin,
~~~~~

~~~~~act
patch_file
src/packs/color/plugin.tsx
~~~~~
~~~~~typescript
export const colorPlugin: TrainingPlugin<
  ColorQuestionData,
  ColorHitResult,
  number | [number, number, number],
  ColorSenseSettings
> = {
  packId: 'color',
  title: '色感训练',
  getModeBadge: (mode) =>
    mode === 'H' ? '色相' : mode === 'V' ? '明度' : mode === 'S' ? '饱和度' : '综合拾色',
  isTargeting: (mode, settings) => settings.targetingMode === 'manual' && mode === 'H',
~~~~~
~~~~~typescript
export const colorPlugin: TrainingPlugin<
  ColorQuestionData,
  ColorHitResult,
  number | [number, number, number],
  ColorSenseSettings
> = {
  packId: 'color',
  title: 'color',
  getModeBadge: (mode) => mode,
  isTargeting: (mode, settings) => settings.targetingMode === 'manual' && mode === 'H',
~~~~~

~~~~~act
patch_file
src/packs/relative_color/index.ts
~~~~~
~~~~~typescript
const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const relativeColorCards: CardDefinition[] = [
  {
    id: 'rel_vector_shift',
    packId: 'relative_color',
    mode: 'VECTOR_SHIFT',
    title: '色彩矢量迁移',
    desc: '保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉。',
    instruction: '观察上方 A➔B 色彩推移，在下方候选项中找出符合 C➔D 的同向推移色',
    icon: Shuffle,
    tags: {
      domain: ['color_and_value'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['multi_choice'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'rel_lightness_induction',
    packId: 'relative_color',
    mode: 'LIGHTNESS_INDUCTION',
    title: '明度反差补偿',
    desc: '在强明暗对比背景下，微调中心色物理明度以抵消环境视错觉，达成感知一致。',
    instruction: '调节右侧中心色块明度，使左右两块在不同背景下「视觉感知看起来完全一致」',
    icon: Sun,
    tags: {
      domain: ['color_and_value'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'rel_hue_induction',
    packId: 'relative_color',
    mode: 'HUE_INDUCTION',
    title: '补色残像调和',
    desc: '在强色相与饱和度背景下，四选一选出逆向补偿后的目标色，训练环境光色感知调和力。',
    instruction: '观察左侧强色相背景下的基准色，选出右侧达成感知一致的补偿色 (键 1-4)',
    icon: Palette,
    tags: {
      domain: ['color_and_value'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['multi_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'rel_decontextual_2afc',
    packId: 'relative_color',
    mode: 'DECONTEXTUAL_2AFC',
    title: '环境穿透判别',
    desc: '穿透强对比背景的视错觉陷阱，快速二选一判别色块的客观物理明度真理。',
    instruction: '穿透背景视错觉干扰，二选一判别哪一侧中心色块「客观物理明度更高」',
    icon: Columns,
    tags: {
      domain: ['color_and_value'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const relativeColorPack: PackManifest = {
  packId: 'relative_color',
  meta: {
    id: 'relative_color',
    title: '相对色感',
    subTitle: 'Relative Color Perception',
    desc: '基于 OKLab 感知均匀色彩空间，通过固有色与环境光的推移矢量 (Vector v_AB)，建立客观光影下相对色彩推移与对比关系的硬核艺术敏锐度。',
    themeColor: 'purple',
    icon: Shuffle,
  },
  cards: relativeColorCards,
  trainingPlugin: relativeColorPlugin,
~~~~~
~~~~~typescript
const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: 'packs.relative_color.settings.showToleranceBandTitle',
    description: 'packs.relative_color.settings.showToleranceBandDesc',
  },
];

export const relativeColorCards: CardDefinition[] = [
  {
    id: 'rel_vector_shift',
    packId: 'relative_color',
    mode: 'VECTOR_SHIFT',
    icon: Shuffle,
    tags: {
      domain: ['color_and_value'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['multi_choice'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'rel_lightness_induction',
    packId: 'relative_color',
    mode: 'LIGHTNESS_INDUCTION',
    icon: Sun,
    tags: {
      domain: ['color_and_value'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'rel_hue_induction',
    packId: 'relative_color',
    mode: 'HUE_INDUCTION',
    icon: Palette,
    tags: {
      domain: ['color_and_value'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['multi_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'rel_decontextual_2afc',
    packId: 'relative_color',
    mode: 'DECONTEXTUAL_2AFC',
    icon: Columns,
    tags: {
      domain: ['color_and_value'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const relativeColorPack: PackManifest = {
  packId: 'relative_color',
  meta: {
    id: 'relative_color',
    themeColor: 'purple',
    icon: Shuffle,
  },
  cards: relativeColorCards,
  trainingPlugin: relativeColorPlugin,
~~~~~

~~~~~act
patch_file
src/packs/relative_color/plugin.tsx
~~~~~
~~~~~typescript
export const relativeColorPlugin: TrainingPlugin<
  RelativeColorQuestionData,
  RelativeColorHitResult,
  [number, number, number] | 'A' | 'B',
  RelativeColorSettings
> = {
  packId: 'relative_color',
  title: '相对色感',
  getModeBadge: (mode) =>
    mode === 'LIGHTNESS_INDUCTION'
      ? '明度反差补偿'
      : mode === 'HUE_INDUCTION'
        ? '补色残像调和'
        : mode === 'DECONTEXTUAL_2AFC'
          ? '环境穿透判别'
          : '色彩矢量迁移',
  generateQuestion: (mode, level) =>
~~~~~
~~~~~typescript
export const relativeColorPlugin: TrainingPlugin<
  RelativeColorQuestionData,
  RelativeColorHitResult,
  [number, number, number] | 'A' | 'B',
  RelativeColorSettings
> = {
  packId: 'relative_color',
  title: 'relative_color',
  getModeBadge: (mode) => mode,
  generateQuestion: (mode, level) =>
~~~~~

~~~~~act
patch_file
src/packs/negative_space/index.ts
~~~~~
~~~~~typescript
const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const negativeSpaceCards: CardDefinition[] = [
  {
    id: 'neg_ratio_estimation',
    packId: 'negative_space',
    mode: 'RATIO_ESTIMATION',
    title: '负形占比滑块评估',
    desc: '估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。',
    instruction: '估计黑色主体周围的白色留白（负形）占画面总面积的百分比',
    icon: Maximize2,
    tags: {
      domain: ['form_and_proportion'],
      path: ['absolute_estimation'],
      challenge: ['figure_ground_reversal'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'neg_area_comparison_2afc',
    packId: 'negative_space',
    mode: 'AREA_COMPARISON_2AFC',
    title: '负形面积二分判别',
    desc: '快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。',
    instruction: '二选一判别哪一侧画面的白色留白（负形）面积更大',
    icon: Columns,
    tags: {
      domain: ['form_and_proportion'],
      path: ['relational_mapping'],
      challenge: ['figure_ground_reversal'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'neg_vertex_fitting',
    packId: 'negative_space',
    mode: 'NEGATIVE_VERTEX_FITTING',
    title: '负形边界反切定点',
    desc: '观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。',
    instruction: '观察左侧完整参考的负形挤压轮廓，在右侧点阵中点击定位被截断的正形顶点',
    icon: Crosshair,
    tags: {
      domain: ['form_and_proportion', 'spatial_structure'],
      path: ['absolute_estimation'],
      challenge: ['figure_ground_reversal'],
      interaction: ['spatial_locate'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'neg_shape_match_2afc',
    packId: 'negative_space',
    mode: 'SHAPE_MATCH_2AFC',
    title: '负形轮廓记忆匹配',
    desc: '瞬时记忆负形空隙轮廓，在两张 1:1 等大形状中二选一辨识目标。',
    instruction: '瞬时记忆负形空隙轮廓特征，在候选区二选一选出完全相同的形状',
    icon: Sparkles,
    tags: {
      domain: ['form_and_proportion'],
      path: ['relational_mapping'],
      challenge: ['working_memory', 'figure_ground_reversal'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const negativeSpacePack: PackManifest = {
  packId: 'negative_space',
  meta: {
    id: 'negative_space',
    title: '正负形空间感知',
    subTitle: 'Negative Space',
    desc: '切换观察视角，通过对几何剪影周围留白（负形）面积占比的估算与反切定点，打破具象认知偏见，培养专业起形与比例感知力。',
    themeColor: 'emerald',
    icon: Maximize2,
  },
  cards: negativeSpaceCards,
  trainingPlugin: negativeSpacePlugin,
~~~~~
~~~~~typescript
const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: 'packs.negative_space.settings.showToleranceBandTitle',
    description: 'packs.negative_space.settings.showToleranceBandDesc',
  },
];

export const negativeSpaceCards: CardDefinition[] = [
  {
    id: 'neg_ratio_estimation',
    packId: 'negative_space',
    mode: 'RATIO_ESTIMATION',
    icon: Maximize2,
    tags: {
      domain: ['form_and_proportion'],
      path: ['absolute_estimation'],
      challenge: ['figure_ground_reversal'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'neg_area_comparison_2afc',
    packId: 'negative_space',
    mode: 'AREA_COMPARISON_2AFC',
    icon: Columns,
    tags: {
      domain: ['form_and_proportion'],
      path: ['relational_mapping'],
      challenge: ['figure_ground_reversal'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'neg_vertex_fitting',
    packId: 'negative_space',
    mode: 'NEGATIVE_VERTEX_FITTING',
    icon: Crosshair,
    tags: {
      domain: ['form_and_proportion', 'spatial_structure'],
      path: ['absolute_estimation'],
      challenge: ['figure_ground_reversal'],
      interaction: ['spatial_locate'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'neg_shape_match_2afc',
    packId: 'negative_space',
    mode: 'SHAPE_MATCH_2AFC',
    icon: Sparkles,
    tags: {
      domain: ['form_and_proportion'],
      path: ['relational_mapping'],
      challenge: ['working_memory', 'figure_ground_reversal'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const negativeSpacePack: PackManifest = {
  packId: 'negative_space',
  meta: {
    id: 'negative_space',
    themeColor: 'emerald',
    icon: Maximize2,
  },
  cards: negativeSpaceCards,
  trainingPlugin: negativeSpacePlugin,
~~~~~

~~~~~act
patch_file
src/packs/negative_space/plugin.tsx
~~~~~
~~~~~typescript
export const negativeSpacePlugin: TrainingPlugin<
  NegativeSpaceQuestionData,
  NegativeSpaceHitResult,
  number | 'A' | 'B' | Point,
  NegativeSpaceSettings
> = {
  packId: 'negative_space',
  title: '正负形感知',
  getModeBadge: (mode) =>
    mode === 'AREA_COMPARISON_2AFC'
      ? '负形面积二分判别'
      : mode === 'NEGATIVE_VERTEX_FITTING'
        ? '负形边界反切定点'
        : mode === 'SHAPE_MATCH_2AFC'
          ? '负形轮廓记忆匹配'
          : '负形占比估算',
  generateQuestion: (mode, level) =>
~~~~~
~~~~~typescript
export const negativeSpacePlugin: TrainingPlugin<
  NegativeSpaceQuestionData,
  NegativeSpaceHitResult,
  number | 'A' | 'B' | Point,
  NegativeSpaceSettings
> = {
  packId: 'negative_space',
  title: 'negative_space',
  getModeBadge: (mode) => mode,
  generateQuestion: (mode, level) =>
~~~~~

~~~~~act
patch_file
src/packs/perspective/index.ts
~~~~~
~~~~~typescript
const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const perspectiveCards: CardDefinition[] = [
  {
    id: 'perspective_vp_convergence',
    packId: 'perspective',
    mode: 'VP_CONVERGENCE',
    title: '透视灭点汇聚感',
    desc: '观察已有倾角透视线，通过滑块调制第三条线段倾斜度，使其精准延长交汇于同一灭点 (VP)。',
    instruction: '观察已有透视线，调制滑块旋转第三条线使其交汇于同一灭点',
    icon: Sliders,
    tags: {
      domain: ['spatial_structure'],
      path: ['relational_mapping'],
      interaction: ['continuous_mod'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'perspective_proportion_division',
    packId: 'perspective',
    mode: 'PROPORTION_DIVISION',
    title: '平面比例与黄金分割盲切',
    desc: '观察倾斜线段，单次点击盲切估测 1/2、1/3、1/4 或黄金分割点 (0.618)。',
    instruction: '观察线段并在指定比例位置单次点击',
    icon: Layers,
    tags: {
      domain: ['form_and_proportion'],
      path: ['absolute_estimation'],
      interaction: ['spatial_locate'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_proportion_migration',
    packId: 'perspective',
    mode: 'PROPORTION_MIGRATION',
    title: '空间比例角度迁移',
    desc: '观察上方水平基准线上的任意比例目标点，在下方随机倾斜角度的线段上准确标出相同比例位置。',
    instruction: '观察上方基准线目标点，在下方倾斜线段上点选相同比例位置',
    icon: ArrowRightLeft,
    tags: {
      domain: ['form_and_proportion', 'spatial_structure'],
      path: ['relational_mapping'],
      challenge: ['working_memory', 'dimensional_translation'],
      interaction: ['spatial_locate'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_gestalt_continuation_2afc',
    packId: 'perspective',
    mode: 'GESTALT_CONTINUATION_2AFC',
    title: '断线完形连续性辨识',
    desc: '基于格式塔完形心理学，二选一快速辨识穿透中间障碍物的真实延续线段 (2AFC)。',
    instruction: '二选一选出保持绝对连续贯穿的延伸线 (键 1 / 2)',
    icon: Eye,
    tags: {
      domain: ['spatial_structure'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['binary_choice'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_structure_3d',
    packId: 'perspective',
    mode: 'STRUCTURE_PROJECTION_3D',
    title: '3D 结构空间翻转',
    desc: '观察正交三视图标点，在 3D 透视立方体点阵中定位对应的三维空间坐标点。',
    instruction: '结合三视图坐标，在 3D 立方体点阵中点选对应点',
    icon: Box,
    tags: {
      domain: ['spatial_structure'],
      path: ['absolute_estimation'],
      challenge: ['dimensional_translation'],
      interaction: ['spatial_locate'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
];

export const perspectivePack: PackManifest = {
  packId: 'perspective',
  meta: {
    id: 'perspective',
    title: '透视空间感知',
    subTitle: 'Perspective & Spatial Perception',
    desc: '涵盖灭点统一感、比例黄金分割盲切、格式塔穿透遮挡完形延续与 3D 轴测结构空间翻转，全方位锤炼硬核空间素描起形直觉。',
    themeColor: 'purple',
    icon: Box,
  },
  cards: perspectiveCards,
  trainingPlugin: perspectivePlugin,
~~~~~
~~~~~typescript
const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: 'packs.perspective.settings.showToleranceBandTitle',
    description: 'packs.perspective.settings.showToleranceBandDesc',
  },
];

export const perspectiveCards: CardDefinition[] = [
  {
    id: 'perspective_vp_convergence',
    packId: 'perspective',
    mode: 'VP_CONVERGENCE',
    icon: Sliders,
    tags: {
      domain: ['spatial_structure'],
      path: ['relational_mapping'],
      interaction: ['continuous_mod'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'perspective_proportion_division',
    packId: 'perspective',
    mode: 'PROPORTION_DIVISION',
    icon: Layers,
    tags: {
      domain: ['form_and_proportion'],
      path: ['absolute_estimation'],
      interaction: ['spatial_locate'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_proportion_migration',
    packId: 'perspective',
    mode: 'PROPORTION_MIGRATION',
    icon: ArrowRightLeft,
    tags: {
      domain: ['form_and_proportion', 'spatial_structure'],
      path: ['relational_mapping'],
      challenge: ['working_memory', 'dimensional_translation'],
      interaction: ['spatial_locate'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_gestalt_continuation_2afc',
    packId: 'perspective',
    mode: 'GESTALT_CONTINUATION_2AFC',
    icon: Eye,
    tags: {
      domain: ['spatial_structure'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['binary_choice'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_structure_3d',
    packId: 'perspective',
    mode: 'STRUCTURE_PROJECTION_3D',
    icon: Box,
    tags: {
      domain: ['spatial_structure'],
      path: ['absolute_estimation'],
      challenge: ['dimensional_translation'],
      interaction: ['spatial_locate'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
];

export const perspectivePack: PackManifest = {
  packId: 'perspective',
  meta: {
    id: 'perspective',
    themeColor: 'purple',
    icon: Box,
  },
  cards: perspectiveCards,
  trainingPlugin: perspectivePlugin,
~~~~~

~~~~~act
patch_file
src/packs/perspective/plugin.tsx
~~~~~
~~~~~typescript
export const perspectivePlugin: TrainingPlugin<
  PerspectiveQuestionData,
  PerspectiveHitResult,
  number | 'A' | 'B' | Point,
  BaseModuleSettings
> = {
  packId: 'perspective',
  title: '透视空间感知',
  getModeBadge: (mode) => {
    const map: Record<string, string> = {
      VP_CONVERGENCE: '透视灭点汇聚',
      PROPORTION_DIVISION: '比例盲切划分',
      PROPORTION_MIGRATION: '空间比例角度迁移',
      GESTALT_CONTINUATION_2AFC: '格式塔完形断线',
      STRUCTURE_PROJECTION_3D: '3D 结构空间翻转',
    };
    return map[mode] || mode;
  },
  generateQuestion: (mode, level) => generatePerspectiveQuestion(mode as PerspectiveMode, level),
~~~~~
~~~~~typescript
export const perspectivePlugin: TrainingPlugin<
  PerspectiveQuestionData,
  PerspectiveHitResult,
  number | 'A' | 'B' | Point,
  BaseModuleSettings
> = {
  packId: 'perspective',
  title: 'perspective',
  getModeBadge: (mode) => mode,
  generateQuestion: (mode, level) => generatePerspectiveQuestion(mode as PerspectiveMode, level),
~~~~~

~~~~~act
patch_file
src/packs/abstraction/index.ts
~~~~~
~~~~~typescript
export const abstractionCards: CardDefinition[] = [
  // === 自底向上：提炼概括 (Bottom-Up Extraction) ===
  {
    id: 'abs_gesture_axis',
    packId: 'abstraction',
    mode: 'GESTURE_AXIS',
    title: '动态势线提取',
    desc: '从离散散点流向中提取第一主成分 PCA 势线角度，建立画面主导动势感知力。',
    instruction: '旋转调节主轴，对齐粒子群的主动态流向 (0°~180°)',
    icon: RotateCw,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['extraction'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_polygon_decimation',
    packId: 'abstraction',
    mode: 'POLYGON_DECIMATION',
    title: '折线低模大形',
    desc: '从细碎繁复轮廓中穿透高频噪波，识别出其底层的最优关键折线大形框架。',
    instruction: '观察左侧细碎多边形，选择右侧保留了关键折线大形的概括项',
    icon: Maximize2,
    tags: {
      domain: ['form_and_proportion'],
      path: ['extraction'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_notan_threshold',
    packId: 'abstraction',
    mode: 'NOTAN_THRESHOLD',
    title: '黑白素描归组',
    desc: '调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。',
    instruction: '调节二值化阈值滑块，达成黑白咬合最平衡的 Notan 状态',
    icon: Sun,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['extraction'],
      challenge: ['figure_ground_reversal'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_palette_clustering',
    packId: 'abstraction',
    mode: 'PALETTE_CLUSTERING',
    title: '主调色群提炼',
    desc: '穿透多色拼贴马赛克的混色噪点，四选一提炼出面积加权下的加权质心主色。',
    instruction: '在下方 4 个候选项中，选出代表画面全局主调的加权主色',
    icon: Palette,
    tags: {
      domain: ['color_and_value'],
      path: ['extraction'],
      interaction: ['multi_choice'],
    },
    hasWeaknessAnalytics: false,
  },

  // === 自顶向下：具象寻源 (Top-Down Concretization) ===
  {
    id: 'abs_td_gesture_2afc',
    packId: 'abstraction',
    mode: 'TD_GESTURE_2AFC',
    title: '动态势线寻源',
    desc: '给定抽象势线骨架，在两幅复杂点阵中透视判别谁长在该动势中 (2AFC)。',
    instruction: '观察上方提炼的势线骨架，判别哪侧复杂点阵符合该动势',
    icon: Shuffle,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['concretization'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_hull_2afc',
    packId: 'abstraction',
    mode: 'TD_HULL_2AFC',
    title: '几何大模寻形',
    desc: '给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。',
    instruction: '观察上方极简低模外壳，二选一辨识哪侧剪影符合该大形',
    icon: Columns,
    tags: {
      domain: ['form_and_proportion'],
      path: ['concretization'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_notan_2afc',
    packId: 'abstraction',
    mode: 'TD_NOTAN_2AFC',
    title: '黑白素描骨架',
    desc: '给定二值 Notan 剪影，透视辨识哪幅丰富灰阶素描拥有该黑白大结构 (2AFC)。',
    instruction: '观察上方 Notan 剪影，判别哪侧复杂画面拥有该黑白大结构',
    icon: Droplet,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['concretization'],
      challenge: ['figure_ground_reversal'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_palette_2afc',
    packId: 'abstraction',
    mode: 'TD_PALETTE_2AFC',
    title: '调性基底归位',
    desc: '给定抽象基准主调色，在四幅复杂混色拼贴图案中选出以此为基调的画面 (4AFC)。',
    instruction: '观察上方基准主调色，选出以此为色彩基底的拼贴画面',
    icon: Sparkles,
    tags: {
      domain: ['color_and_value'],
      path: ['concretization'],
      interaction: ['multi_choice'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const abstractionPack: PackManifest = {
  packId: 'abstraction',
  meta: {
    id: 'abstraction',
    title: '形式与抽象感知',
    subTitle: 'Visual Abstraction & Refinement',
    desc: '贯通「自底向上提炼」与「自顶向下寻源」双向视知觉闭环，训练对动态势线、极简低模、黑白Notan与色彩基调的穿透与具象推演能力。',
    themeColor: 'indigo',
    icon: Eye,
  },
  cards: abstractionCards,
  trainingPlugin: abstractionPlugin,
~~~~~
~~~~~typescript
export const abstractionCards: CardDefinition[] = [
  // === 自底向上：提炼概括 (Bottom-Up Extraction) ===
  {
    id: 'abs_gesture_axis',
    packId: 'abstraction',
    mode: 'GESTURE_AXIS',
    icon: RotateCw,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['extraction'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_polygon_decimation',
    packId: 'abstraction',
    mode: 'POLYGON_DECIMATION',
    icon: Maximize2,
    tags: {
      domain: ['form_and_proportion'],
      path: ['extraction'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_notan_threshold',
    packId: 'abstraction',
    mode: 'NOTAN_THRESHOLD',
    icon: Sun,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['extraction'],
      challenge: ['figure_ground_reversal'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_palette_clustering',
    packId: 'abstraction',
    mode: 'PALETTE_CLUSTERING',
    icon: Palette,
    tags: {
      domain: ['color_and_value'],
      path: ['extraction'],
      interaction: ['multi_choice'],
    },
    hasWeaknessAnalytics: false,
  },

  // === 自顶向下：具象寻源 (Top-Down Concretization) ===
  {
    id: 'abs_td_gesture_2afc',
    packId: 'abstraction',
    mode: 'TD_GESTURE_2AFC',
    icon: Shuffle,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['concretization'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_hull_2afc',
    packId: 'abstraction',
    mode: 'TD_HULL_2AFC',
    icon: Columns,
    tags: {
      domain: ['form_and_proportion'],
      path: ['concretization'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_notan_2afc',
    packId: 'abstraction',
    mode: 'TD_NOTAN_2AFC',
    icon: Droplet,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['concretization'],
      challenge: ['figure_ground_reversal'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_palette_2afc',
    packId: 'abstraction',
    mode: 'TD_PALETTE_2AFC',
    icon: Sparkles,
    tags: {
      domain: ['color_and_value'],
      path: ['concretization'],
      interaction: ['multi_choice'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const abstractionPack: PackManifest = {
  packId: 'abstraction',
  meta: {
    id: 'abstraction',
    themeColor: 'indigo',
    icon: Eye,
  },
  cards: abstractionCards,
  trainingPlugin: abstractionPlugin,
~~~~~

~~~~~act
patch_file
src/packs/abstraction/plugin.tsx
~~~~~
~~~~~typescript
export const abstractionPlugin: TrainingPlugin<
  AbstractionQuestionData,
  AbstractionHitResult,
  number | 'A' | 'B',
  BaseModuleSettings
> = {
  packId: 'abstraction',
  title: '视知觉概括',
  getModeBadge: (mode) => {
    const map: Record<string, string> = {
      GESTURE_AXIS: '动态势线提取',
      POLYGON_DECIMATION: '折线低模大形',
      NOTAN_THRESHOLD: '黑白素描归组',
      PALETTE_CLUSTERING: '主调色群提炼',
      TD_GESTURE_2AFC: '动态势线寻源',
      TD_HULL_2AFC: '几何大模寻形',
      TD_NOTAN_2AFC: '黑白素描骨架',
      TD_PALETTE_2AFC: '调性基底归位',
    };
    return map[mode] || mode;
  },
  generateQuestion: (mode, level) => generateAbstractionQuestion(mode as AbstractionMode, level),
~~~~~
~~~~~typescript
export const abstractionPlugin: TrainingPlugin<
  AbstractionQuestionData,
  AbstractionHitResult,
  number | 'A' | 'B',
  BaseModuleSettings
> = {
  packId: 'abstraction',
  title: 'abstraction',
  getModeBadge: (mode) => mode,
  generateQuestion: (mode, level) => generateAbstractionQuestion(mode as AbstractionMode, level),
~~~~~

#### Acts 3: 改造 Canvas 图表绘制函数中的轴线说明与视图细节

~~~~~act
patch_file
src/utils/canvas/drawHueBiasChart.ts
~~~~~
~~~~~typescript
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import type { UnifiedTrialRecord } from '../db/index';
~~~~~
~~~~~typescript
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { i18n } from '../../core/i18n';
import type { UnifiedTrialRecord } from '../db/index';
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawHueBiasChart.ts
~~~~~
~~~~~typescript
  // 顶部标题提示
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('偏大(+)', padding.left, padding.top - 10);
  ctx.textAlign = 'right';
  ctx.fillText('偏小(-)', width - padding.right, height - padding.bottom - 4);
}
~~~~~
~~~~~typescript
  // 顶部标题提示
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(i18n.t('stats.biasPositive'), padding.left, padding.top - 10);
  ctx.textAlign = 'right';
  ctx.fillText(i18n.t('stats.biasNegative'), width - padding.right, height - padding.bottom - 4);
}
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawTrendChart.ts
~~~~~
~~~~~typescript
import type { SessionHistoryItem } from '../../components/SessionSummaryModal';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { lttbDownsample } from '../../core/math/downsample';
~~~~~
~~~~~typescript
import type { SessionHistoryItem } from '../../components/SessionSummaryModal';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { i18n } from '../../core/i18n';
import { lttbDownsample } from '../../core/math/downsample';
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawTrendChart.ts
~~~~~
~~~~~typescript
  if (recentDates.length === 0) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('当前筛选条件下暂无做答轨迹', width / 2, height / 2);
    return;
  }
~~~~~
~~~~~typescript
  if (recentDates.length === 0) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i18n.t('stats.noTrace'), width / 2, height / 2);
    return;
  }
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawTrendChart.ts
~~~~~
~~~~~typescript
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const l of [minLevel, maxLevel]) {
    ctx.fillText(`L${l}`, padding.left - 5, getY(l));
  }
  ctx.textAlign = 'center';
  ctx.fillText('最近活跃日演进趋势 ➔', width / 2, height - 5);
}
~~~~~
~~~~~typescript
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const l of [minLevel, maxLevel]) {
    ctx.fillText(`L${l}`, padding.left - 5, getY(l));
  }
  ctx.textAlign = 'center';
  ctx.fillText(i18n.t('stats.trendAxisNotice'), width / 2, height - 5);
}
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawTrendChart.ts
~~~~~
~~~~~typescript
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('题目做答序列 ➔', width / 2, height - 10);
}
~~~~~
~~~~~typescript
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(i18n.t('stats.sessionSeqNotice'), width / 2, height - 10);
}
~~~~~

~~~~~act
patch_file
src/packs/color/views/ColorCanvas.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useState } from 'preact/hooks';
import { HsvTrackSlider } from '../../../components/HsvTrackSlider';
import {
  type ColorHitResult,
  type ColorQuestionData,
  hsvToHex,
} from '../../../core/color/colorUtils';
~~~~~
~~~~~typescript
import { useCallback, useEffect, useState } from 'preact/hooks';
import { HsvTrackSlider } from '../../../components/HsvTrackSlider';
import {
  type ColorHitResult,
  type ColorQuestionData,
  hsvToHex,
} from '../../../core/color/colorUtils';
import { useTranslation } from '../../../core/i18n';
~~~~~

~~~~~act
patch_file
src/packs/color/views/ColorCanvas.tsx
~~~~~
~~~~~typescript
export function ColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  enableHoverColorPreview = true,
}: ColorCanvasProps) {
  const { mode, targetH, targetS, targetV, difficultyLevel } = question;
~~~~~
~~~~~typescript
export function ColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  enableHoverColorPreview = true,
}: ColorCanvasProps) {
  const { t } = useTranslation();
  const { mode, targetH, targetS, targetV, difficultyLevel } = question;
~~~~~

~~~~~act
patch_file
src/packs/color/views/ColorCanvas.tsx
~~~~~
~~~~~typescript
      {mode === 'ALL' && !showAnswer && (
        <button
          type="button"
          onClick={handleSubmitAll}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          确认提交 (Space)
        </button>
      )}
~~~~~
~~~~~typescript
      {mode === 'ALL' && !showAnswer && (
        <button
          type="button"
          onClick={handleSubmitAll}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          {t('common.confirmSpace')}
        </button>
      )}
~~~~~

~~~~~act
patch_file
src/packs/relative_color/components/AlbersInductionView.tsx
~~~~~
~~~~~typescript
      {!showAnswer && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          确认提交 (Space)
        </button>
      )}
~~~~~
~~~~~typescript
      {!showAnswer && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          {t('common.confirmSpace')}
        </button>
      )}
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/ProportionDivisionView.tsx
~~~~~
~~~~~typescript
          tabIndex={0}
          role="button"
          aria-label="比例盲切答题画布"
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white touch-none select-none transition-all ${
~~~~~
~~~~~typescript
          tabIndex={0}
          role="button"
          aria-label={t('packs.perspective.cards.perspective_proportion_division.title')}
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white touch-none select-none transition-all ${
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/ProportionMigrationView.tsx
~~~~~
~~~~~typescript
          tabIndex={0}
          role="button"
          aria-label="比例迁移答题画布"
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white touch-none select-none transition-all ${
~~~~~
~~~~~typescript
          tabIndex={0}
          role="button"
          aria-label={t('packs.perspective.cards.perspective_proportion_migration.title')}
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white touch-none select-none transition-all ${
~~~~~

### 下一步建议
我们已经完成了 7 大 Pack 清单元数据的瘦身、Canvas 图表刻度说明与交互视图文本的 i18n 替换。

建议在终端再次执行：
```bash
python scripts/check_i18n.py
```
验证硬编码中文的减少情况并对剩余极少数文件（如 `planTemplates.ts`、`planStorage.ts`）进行最终收敛校验。
