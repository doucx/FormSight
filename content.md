现在开始执行代码库的兼容性代码清理重构。我们将移除过时的浏览器 API 兜底、废弃的旧版数据映射查找表以及已退役的旧版渲染分支。

## [WIP] refactor(core): 清理过时兼容性代码与历史旧版本映射层

### 用户需求
在确认所有用户均已升级到最新版的基础上，全面清理代码库中的历史兼容性代码，包括：
1. 移除 `AudioContext` 与 `roundRect` 的陈旧浏览器 API 降级分支。
2. 将卡片定义及数据链路中的 `legacyDomain` / `legacyMode` 规范化为统一的 `domain` / `mode`。
3. 删除 `resolveLegacyCardId`、`LEGACY_MAP` 等历史映射表。
4. 清理 `db` 模块中针对旧版无 `cardId` 数据的多层三元兜底及 `getProfile` 旧版双参数重载。
5. 清理 `AbstractionCanvas` 和 `abstractionUtils` 中已废弃的旧版矢量 Notan 渲染与数据结构。

### 评论
这是一次纯净的架构精简与技术债消除重构。通过统一全站卡片标识符与数据模型，降低了代码维护成本与认知负担，并提升了 TypeScript 类型的严谨性。

### 目标
1. 规范 `src/types/card.ts`，将 `legacyDomain` / `legacyMode` 替换为标准的 `domain` / `mode`。
2. 重构 `src/config/cards.ts`，移除历史查找表与转换函数，更新全部卡片定义。
3. 优化 `src/utils/db/queries.ts` 与 `src/utils/db/importExport.ts`，精简旧版数据回退逻辑。
4. 精简 `src/utils/sound.ts` 与 `src/utils/canvas/drawHueBiasChart.ts` 中的现代浏览器原生 API 调用。
5. 清理 `src/utils/abstractionUtils.ts` 与 `src/components/AbstractionCanvas.tsx` 中的旧版矢量 Notan 残留代码。
6. 调整所有引用处（`GenericDashboard`、`GenericTrainingView`、`GlobalStatsModal`、`App.tsx` 等）。

### 基本原理
由于系统运行环境和用户数据已经全面迁移到现代标准，不再需要保留针对 IE/旧版 Safari 的私有前缀及旧版平铺数据格式的降级代码。精简后直接依赖标准 Web API (`window.AudioContext`, `ctx.roundRect`) 与统一的 `cardId` 索引模型。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #comp/runtime #concept/state #scope/core #scope/dx #ai/instruct #task/domain/core #task/object/legacy-cleanup #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 精简 Web API 兼容降级代码 (`sound.ts` & `drawHueBiasChart.ts`)

~~~~~act
patch_file
src/utils/sound.ts
~~~~~
~~~~~typescript
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}
~~~~~
~~~~~typescript
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx && typeof window.AudioContext !== 'undefined') {
    audioCtx = new window.AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawHueBiasChart.ts
~~~~~
~~~~~typescript
  ctx.fillStyle = barGradient;
  ctx.beginPath();
  ctx.roundRect
    ? ctx.roundRect(padding.left, barY, chartW, barH, 4)
    : ctx.fillRect(padding.left, barY, chartW, barH);
  ctx.fill();
~~~~~
~~~~~typescript
  ctx.fillStyle = barGradient;
  ctx.beginPath();
  ctx.roundRect(padding.left, barY, chartW, barH, 4);
  ctx.fill();
~~~~~

#### Acts 2: 规范卡片类型定义 (`src/types/card.ts`)

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~typescript
export interface CardDefinition {
  id: string;
  legacyDomain: TrainingDomain;
  legacyMode: string;
  title: string;
  desc: string;
  instruction?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
  isExperimental?: boolean;
}
~~~~~
~~~~~typescript
export interface CardDefinition {
  id: string;
  domain: TrainingDomain;
  mode: string;
  title: string;
  desc: string;
  instruction?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
  isExperimental?: boolean;
}
~~~~~

#### Acts 3: 重构卡片配置与移除历史映射表 (`src/config/cards.ts`)

~~~~~act
write_file
src/config/cards.ts
~~~~~
~~~~~typescript
import {
  Columns,
  Crosshair,
  Droplet,
  Maximize2,
  Palette,
  RotateCw,
  Shuffle,
  Sparkles,
  Sun,
  Target,
} from 'lucide-preact';
import {
  COLOR_SECTORS,
  STAR_SECTORS,
  type SettingFieldSchema,
} from '../components/settings/DynamicDomainSettings';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db';

const STAR_SCHEMAS: SettingFieldSchema[] = [
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

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

const HUE_SCHEMAS: SettingFieldSchema[] = [
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

const COLOR_ALL_SCHEMAS: SettingFieldSchema[] = [
  ...SLIDER_COMMON_SCHEMAS,
  {
    type: 'toggle',
    key: 'enableHoverColorPreview',
    title: '综合拾色悬停颜色实时联动',
    description: '鼠标悬停滑块时右侧色块实时跟随试探预览',
  },
];

export const ALL_CARDS: CardDefinition[] = [
  // ==========================================
  // 0. 视知觉概括系列 (Visual Abstraction)
  // ==========================================
  {
    id: 'abs_gesture_axis',
    domain: 'abstraction',
    mode: 'GESTURE_AXIS',
    title: '动态势线提取',
    desc: '从离散散点流向中提取第一主成分 PCA 势线角度，建立画面主导动势感知力。',
    instruction: '旋转调节主轴，对齐粒子群的主动态流向 (0°~180°)',
    icon: RotateCw,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'gesture_flow'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_polygon_decimation',
    domain: 'abstraction',
    mode: 'POLYGON_DECIMATION',
    title: '折线低模大形',
    desc: '从细碎繁复轮廓中穿透高频噪波，识别出其底层的最优关键折线大形框架。',
    instruction: '观察左侧细碎多边形，选择右侧保留了关键折线大形的概括项',
    icon: Maximize2,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_notan_threshold',
    domain: 'abstraction',
    mode: 'NOTAN_THRESHOLD',
    title: '黑白素描归组',
    desc: '调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。',
    instruction: '调节二值化阈值滑块，达成黑白咬合最平衡的 Notan 状态',
    icon: Sun,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'notan_grouping'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_palette_clustering',
    domain: 'abstraction',
    mode: 'PALETTE_CLUSTERING',
    title: '主调色群提炼',
    desc: '穿透多色拼贴马赛克的混色噪点，四选一提炼出面积加权下的加权质心主色。',
    instruction: '在下方 4 个候选项中，选出代表画面全局主调的加权主色',
    icon: Palette,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'color_fidelity'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_gesture_2afc',
    domain: 'concretization',
    mode: 'TD_GESTURE_2AFC',
    title: '动态势线寻源',
    desc: '给定抽象势线骨架，在两幅复杂点阵中透视判别谁长在该动势中 (2AFC)。',
    instruction: '观察上方提炼的势线骨架，判别哪侧复杂点阵符合该动势',
    icon: Shuffle,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'gesture_flow'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_hull_2afc',
    domain: 'concretization',
    mode: 'TD_HULL_2AFC',
    title: '几何大模寻形',
    desc: '给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。',
    instruction: '观察上方极简低模外壳，二选一辨识哪侧剪影符合该大形',
    icon: Columns,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_notan_2afc',
    domain: 'concretization',
    mode: 'TD_NOTAN_2AFC',
    title: '黑白素描骨架',
    desc: '给定二值 Notan 剪影，透视辨识哪幅丰富灰阶素描拥有该黑白大结构 (2AFC)。',
    instruction: '观察上方 Notan 剪影，判别哪侧复杂画面拥有该黑白大结构',
    icon: Droplet,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'notan_grouping'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_palette_2afc',
    domain: 'concretization',
    mode: 'TD_PALETTE_2AFC',
    title: '调性基底归位',
    desc: '给定抽象基准主调色，在四幅复杂混色拼贴图案中选出以此为基调的画面 (4AFC)。',
    instruction: '观察上方基准主调色，选出以此为色彩基底的拼贴画面',
    icon: Sparkles,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'color_fidelity'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
  },

  // ==========================================
  // 1. 寻星练习系列 (Star-Hopping)
  // ==========================================
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

  // ==========================================
  // 2. 绝对色感系列 (Color Recognition)
  // ==========================================
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

  // ==========================================
  // 3. 相对色感系列 (Relative Color)
  // ==========================================
  {
    id: 'rel_vector_shift',
    domain: 'relative_color',
    mode: 'VECTOR_SHIFT',
    title: '色彩矢量迁移',
    desc: '保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉。',
    instruction: '观察上方 A➔B 色彩推移，在下方候选项中找出符合 C➔D 的同向推移色',
    icon: Shuffle,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance', 'color_fidelity'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'rel_lightness_induction',
    domain: 'relative_color',
    mode: 'LIGHTNESS_INDUCTION',
    title: '明度反差补偿',
    desc: '在强明暗对比背景下，微调中心色物理明度以抵消环境视错觉，达成感知一致。',
    instruction: '调节右侧中心色块明度，使左右两块在不同背景下「视觉感知看起来完全一致」',
    icon: Sun,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'rel_hue_induction',
    domain: 'relative_color',
    mode: 'HUE_INDUCTION',
    title: '补色残像调和',
    desc: '在强色相与饱和度背景下，逆向补偿色彩推移，训练环境光色感知调和力。',
    instruction: '调节右侧中心色彩，反向补偿背景诱导偏色，使左右达成感知一致',
    icon: Palette,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'rel_decontextual_2afc',
    domain: 'relative_color',
    mode: 'DECONTEXTUAL_2AFC',
    title: '环境穿透判别',
    desc: '穿透强对比背景的视错觉陷阱，快速二选一判别色块的客观物理明度真理。',
    instruction: '穿透背景视错觉干扰，二选一判别哪一侧中心色块「客观物理明度更高」',
    icon: Columns,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },

  // ==========================================
  // 4. 正负形空间系列 (Negative Space)
  // ==========================================
  {
    id: 'neg_ratio_estimation',
    domain: 'negative_space',
    mode: 'RATIO_ESTIMATION',
    title: '负形占比滑块评估',
    desc: '估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。',
    instruction: '估计黑色主体周围的白色留白（负形）占画面总面积的百分比',
    icon: Maximize2,
    tags: {
      target: ['negative_space'],
      skill: ['proportion'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'neg_area_comparison_2afc',
    domain: 'negative_space',
    mode: 'AREA_COMPARISON_2AFC',
    title: '负形面积二分判别',
    desc: '快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。',
    instruction: '二选一判别哪一侧画面的白色留白（负形）面积更大',
    icon: Columns,
    tags: {
      target: ['negative_space'],
      skill: ['proportion', 'spatial_orientation'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'neg_vertex_fitting',
    domain: 'negative_space',
    mode: 'NEGATIVE_VERTEX_FITTING',
    title: '负形边界反切定点',
    desc: '观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。',
    instruction: '观察左侧完整参考的负形挤压轮廓，在右侧点阵中点击定位被截断的正形顶点',
    icon: Crosshair,
    tags: {
      target: ['negative_space'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'neg_shape_match_2afc',
    domain: 'negative_space',
    mode: 'SHAPE_MATCH_2AFC',
    title: '负形轮廓记忆匹配',
    desc: '瞬时记忆负形空隙轮廓，在两张 1:1 等大形状中二选一辨识目标。',
    instruction: '瞬时记忆负形空隙轮廓特征，在候选区二选一选出完全相同的形状',
    icon: Sparkles,
    tags: {
      target: ['negative_space'],
      skill: ['visual_memory', 'spatial_orientation'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
];

const CARD_MAP = new Map<string, CardDefinition>(ALL_CARDS.map((c) => [c.id, c]));

export function getCardById(id: string): CardDefinition | undefined {
  return CARD_MAP.get(id);
}

export function getCardsByDomain(domain: TrainingDomain): CardDefinition[] {
  return ALL_CARDS.filter((c) => c.domain === domain);
}
~~~~~

#### Acts 4: 精简数据库查询与导入导出逻辑 (`src/utils/db/`)

~~~~~act
patch_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript
import { getCardById, resolveLegacyCardId } from '../../config/cards';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
} from './schema';

export async function saveTrialRecord(record: UnifiedTrialRecord): Promise<void> {
  const db = await getDB();
  const domain = record.domain || 'star';
  const cardId = record.cardId || resolveLegacyCardId(domain, record.mode);
  const normalizedRecord: UnifiedTrialRecord = { ...record, domain, cardId };
  await db.put('records', normalizedRecord);
  await updateProfile(cardId, domain, record.mode, record.isHit, record.difficultyLevel);
}

export async function saveSession(session: UnifiedSessionData): Promise<void> {
  const db = await getDB();
  const domain = session.domain || 'star';
  const cardId = session.cardId || resolveLegacyCardId(domain, session.mode);
  await db.put('sessions', { ...session, domain, cardId });
}

export async function getProfile(cardId: string): Promise<UnifiedProfileData | null>;
export async function getProfile(
  domain: TrainingDomain,
  mode: string,
): Promise<UnifiedProfileData | null>;
export async function getProfile(
  first: string | TrainingDomain,
  second?: string,
): Promise<UnifiedProfileData | null> {
  const db = await getDB();
  const cardId = second ? resolveLegacyCardId(first as TrainingDomain, second) : first;
  const profile = await db.get('user_profiles', cardId);
  return profile || null;
}
~~~~~
~~~~~typescript
import { getCardById } from '../../config/cards';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
} from './schema';

export async function saveTrialRecord(record: UnifiedTrialRecord): Promise<void> {
  const db = await getDB();
  const domain = record.domain || 'star';
  const cardId = record.cardId || record.mode;
  const normalizedRecord: UnifiedTrialRecord = { ...record, domain, cardId };
  await db.put('records', normalizedRecord);
  await updateProfile(cardId, domain, record.mode, record.isHit, record.difficultyLevel);
}

export async function saveSession(session: UnifiedSessionData): Promise<void> {
  const db = await getDB();
  const domain = session.domain || 'star';
  const cardId = session.cardId || session.mode;
  await db.put('sessions', { ...session, domain, cardId });
}

export async function getProfile(cardId: string): Promise<UnifiedProfileData | null> {
  const db = await getDB();
  const profile = await db.get('user_profiles', cardId);
  return profile || null;
}
~~~~~

~~~~~act
patch_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript
async function updateProfile(
  cardId: string,
  domain: TrainingDomain,
  mode: string,
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
  const db = await getDB();
  const card = getCardById(cardId);
  const canonicalDomain = card ? card.legacyDomain : domain;
  const existing = await db.get('user_profiles', cardId);
~~~~~
~~~~~typescript
async function updateProfile(
  cardId: string,
  domain: TrainingDomain,
  mode: string,
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
  const db = await getDB();
  const card = getCardById(cardId);
  const canonicalDomain = card ? card.domain : domain;
  const existing = await db.get('user_profiles', cardId);
~~~~~

~~~~~act
patch_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript
import { getCardById, resolveLegacyCardId } from '../../config/cards';
import { loadSettings, saveSettings } from '../settings';
import { DB_VERSION, type TrainingDomain, getDB } from './schema';
~~~~~
~~~~~typescript
import { getCardById } from '../../config/cards';
import { loadSettings, saveSettings } from '../settings';
import { DB_VERSION, type TrainingDomain, getDB } from './schema';
~~~~~

~~~~~act
patch_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript
    if (data.sessions) {
      for (const s of data.sessions) {
        const domain = (s.domain || 'star') as TrainingDomain;
        const cardId = s.cardId || resolveLegacyCardId(domain, s.mode);
        await tx.objectStore('sessions').put({ ...s, domain, cardId });
      }
    }
    if (data.records) {
      for (const r of data.records) {
        const domain = (r.domain || 'star') as TrainingDomain;
        const cardId = r.cardId || resolveLegacyCardId(domain, r.mode);
        await tx.objectStore('records').put({ ...r, domain, cardId });
      }
    }
    if (data.profiles) {
      for (const p of data.profiles) {
        const cardId = p.cardId || resolveLegacyCardId(p.domain || 'star', p.mode);
        const card = getCardById(cardId);
        const domain = card ? card.legacyDomain : ((p.domain || 'star') as TrainingDomain);
        const totalTrials = p.totalTrials ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
      }
    }
~~~~~
~~~~~typescript
    if (data.sessions) {
      for (const s of data.sessions) {
        const domain = (s.domain || 'star') as TrainingDomain;
        const cardId = s.cardId || s.mode;
        await tx.objectStore('sessions').put({ ...s, domain, cardId });
      }
    }
    if (data.records) {
      for (const r of data.records) {
        const domain = (r.domain || 'star') as TrainingDomain;
        const cardId = r.cardId || r.mode;
        await tx.objectStore('records').put({ ...r, domain, cardId });
      }
    }
    if (data.profiles) {
      for (const p of data.profiles) {
        const cardId = p.cardId || p.mode;
        const card = getCardById(cardId);
        const domain = card ? card.domain : ((p.domain || 'star') as TrainingDomain);
        const totalTrials = p.totalTrials ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
      }
    }
~~~~~

#### Acts 5: 清理 `useTodayStats` 与 `GenericDashboard` 的双 Key 索引

~~~~~act
patch_file
src/hooks/useTodayStats.ts
~~~~~
~~~~~typescript
      for (const r of records) {
        if (r.timestamp >= startOfToday) {
          const m = r.mode;
          if (!stats[m]) {
            stats[m] = { count: 0, timeMs: 0 };
          }
          stats[m].count += 1;
          stats[m].timeMs += (r.responseTimeMs as number) || 0;
        }
      }
~~~~~
~~~~~typescript
      for (const r of records) {
        if (r.timestamp >= startOfToday) {
          const key = r.cardId || r.mode;
          if (!stats[key]) {
            stats[key] = { count: 0, timeMs: 0 };
          }
          stats[key].count += 1;
          stats[key].timeMs += (r.responseTimeMs as number) || 0;
        }
      }
~~~~~

~~~~~act
patch_file
src/components/dashboard/GenericDashboard.tsx
~~~~~
~~~~~typescript
        const currentLevel = profile?.currentLevel || 5;
        const stat = todayStats[card.legacyMode] || todayStats[card.id] || { count: 0, timeMs: 0 };

        return (
~~~~~
~~~~~typescript
        const currentLevel = profile?.currentLevel || 5;
        const stat = todayStats[card.id] || { count: 0, timeMs: 0 };

        return (
~~~~~

#### Acts 6: 清理视知觉概括中的旧版矢量 Notan 残留 (`abstractionUtils.ts` & `AbstractionCanvas.tsx`)

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript
// Notan 几何图元定义
export interface NotanShape {
  type: 'circle' | 'rect' | 'polygon';
  points?: Point[];
  cx?: number;
  cy?: number;
  r?: number;
  w?: number;
  h?: number;
  baseVal: number; // 基础明度 (0..100)
  invertInDistractor?: boolean;
}

// 色彩马赛克单元
export interface PaletteTile {
~~~~~
~~~~~typescript
// 色彩马赛克单元
export interface PaletteTile {
~~~~~

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript
  // 3. NOTAN_THRESHOLD 黑白素描归组字段
  notanShapes?: NotanShape[];
  notanBuffer?: number[]; // 0..255 灰阶连续场数组
  notanFieldDim?: number; // 灰度场分辨率 (如 120x120)
  idealNotanThreshold?: number; // 0..100 理论最佳二值化阈值

  // 4. PALETTE_CLUSTERING 调色板主调字段
  paletteTiles?: PaletteTile[];
  dominantColorHsv?: [number, number, number];
  paletteOptions?: [number, number, number][]; // 4 个候选颜色
  correctPaletteIndex?: number;

  // 5. Top-Down 2AFC 通用题干与候选项
  promptSpine?: Point[]; // 题干势线
  particlesA?: Point[];
  particlesB?: Point[];
  correctParticleChoice?: 'A' | 'B';

  promptHull?: Point[]; // 题干大模外壳
  hullDetailedA?: Point[];
  hullDetailedB?: Point[];
  correctHullChoice?: 'A' | 'B';

  promptNotanMask?: NotanShape[]; // 题干 Notan (兼容旧版)
  promptNotanBuffer?: number[]; // 题干二值 Notan 剪影场
  notanSceneBufferA?: number[]; // 选项 A 连续灰阶素描场
  notanSceneBufferB?: number[]; // 选项 B 连续灰阶素描场
  notanSceneA?: NotanShape[];
  notanSceneB?: NotanShape[];
  correctNotanChoice?: 'A' | 'B';

  promptPaletteBand?: [number, number, number][]; // 兼容
  promptDominantColor?: [number, number, number]; // 题干单基准主色
~~~~~
~~~~~typescript
  // 3. NOTAN_THRESHOLD 黑白素描归组字段
  notanBuffer?: number[]; // 0..255 灰阶连续场数组
  notanFieldDim?: number; // 灰度场分辨率 (如 120x120)
  idealNotanThreshold?: number; // 0..100 理论最佳二值化阈值

  // 4. PALETTE_CLUSTERING 调色板主调字段
  paletteTiles?: PaletteTile[];
  dominantColorHsv?: [number, number, number];
  paletteOptions?: [number, number, number][]; // 4 个候选颜色
  correctPaletteIndex?: number;

  // 5. Top-Down 2AFC 通用题干与候选项
  promptSpine?: Point[]; // 题干势线
  particlesA?: Point[];
  particlesB?: Point[];
  correctParticleChoice?: 'A' | 'B';

  promptHull?: Point[]; // 题干大模外壳
  hullDetailedA?: Point[];
  hullDetailedB?: Point[];
  correctHullChoice?: 'A' | 'B';

  promptNotanBuffer?: number[]; // 题干二值 Notan 剪影场
  notanSceneBufferA?: number[]; // 选项 A 连续灰阶素描场
  notanSceneBufferB?: number[]; // 选项 B 连续灰阶素描场
  correctNotanChoice?: 'A' | 'B';

  promptDominantColor?: [number, number, number]; // 题干单基准主色
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
  type NotanShape,
  type PaletteTile,
} from '../utils/abstractionUtils';
~~~~~
~~~~~typescript
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
  type PaletteTile,
} from '../utils/abstractionUtils';
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
// 辅助绘图：绘制多边形
function drawPolygon(
  canvas: HTMLCanvasElement | null,
  vertices?: Point[],
  size = ABSTRACTION_CANVAS_SIZE,
  fillColor = '#0F172A',
  strokeColor = '#1E293B',
) {
  drawPolygonCanvas({ canvas, vertices, size, fillColor, strokeColor });
}

// 辅助绘图：绘制 Notan 场景 (旧版矢量兼容)
function drawNotanScene(
  canvas: HTMLCanvasElement | null,
  shapes?: NotanShape[],
  threshold = 50,
  size = ABSTRACTION_CANVAS_SIZE,
) {
  if (!canvas || !shapes) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  for (const s of shapes) {
    const isDark = s.baseVal <= threshold;
    ctx.fillStyle = isDark ? '#0F172A' : '#F8FAFC';
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;

    if (s.type === 'rect' && s.cx && s.cy && s.w && s.h) {
      ctx.fillRect(s.cx - s.w / 2, s.cy - s.h / 2, s.w, s.h);
      ctx.strokeRect(s.cx - s.w / 2, s.cy - s.h / 2, s.w, s.h);
    } else if (s.type === 'circle' && s.cx && s.cy && s.r) {
      ctx.beginPath();
      ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

// 辅助绘图：绘制未二值化的连续灰度原图
~~~~~
~~~~~typescript
// 辅助绘图：绘制多边形
function drawPolygon(
  canvas: HTMLCanvasElement | null,
  vertices?: Point[],
  size = ABSTRACTION_CANVAS_SIZE,
  fillColor = '#0F172A',
  strokeColor = '#1E293B',
) {
  drawPolygonCanvas({ canvas, vertices, size, fillColor, strokeColor });
}

// 辅助绘图：绘制未二值化的连续灰度原图
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
    } else if (mode === 'NOTAN_THRESHOLD') {
      // 左侧渲染连续灰阶原图
      if (question.notanBuffer) {
        drawRawGrayscaleNoiseField(
          canvasRefA.current,
          question.notanBuffer,
          question.notanFieldDim ?? 120,
          ABSTRACTION_2AFC_SIZE,
        );
      }
      // 右侧渲染实时二值截断结果
      if (question.notanBuffer) {
        drawNotanNoiseField(
          canvasRefB.current,
          question.notanBuffer,
          question.notanFieldDim ?? 120,
          showAnswer ? question.idealNotanThreshold : activeVal,
          ABSTRACTION_2AFC_SIZE,
        );
      } else {
        drawNotanScene(
          canvasRefB.current,
          question.notanShapes,
          showAnswer ? question.idealNotanThreshold : activeVal,
          ABSTRACTION_2AFC_SIZE,
        );
      }
    } else if (mode === 'PALETTE_CLUSTERING') {
~~~~~
~~~~~typescript
    } else if (mode === 'NOTAN_THRESHOLD') {
      // 左侧渲染连续灰阶原图
      if (question.notanBuffer) {
        drawRawGrayscaleNoiseField(
          canvasRefA.current,
          question.notanBuffer,
          question.notanFieldDim ?? 120,
          ABSTRACTION_2AFC_SIZE,
        );
        // 右侧渲染实时二值截断结果
        drawNotanNoiseField(
          canvasRefB.current,
          question.notanBuffer,
          question.notanFieldDim ?? 120,
          showAnswer ? question.idealNotanThreshold : activeVal,
          ABSTRACTION_2AFC_SIZE,
        );
      }
    } else if (mode === 'PALETTE_CLUSTERING') {
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
    } else if (mode === 'TD_NOTAN_2AFC') {
      if (question.promptNotanBuffer && question.notanSceneBufferA && question.notanSceneBufferB) {
        drawRawGrayscaleNoiseField(
          canvasThumbRef.current,
          question.promptNotanBuffer,
          question.notanFieldDim ?? 120,
          ABSTRACTION_THUMB_SIZE,
        );
        drawRawGrayscaleNoiseField(
          canvasRefA.current,
          question.notanSceneBufferA,
          question.notanFieldDim ?? 120,
          ABSTRACTION_2AFC_SIZE,
        );
        drawRawGrayscaleNoiseField(
          canvasRefB.current,
          question.notanSceneBufferB,
          question.notanFieldDim ?? 120,
          ABSTRACTION_2AFC_SIZE,
        );
      } else {
        drawNotanScene(
          canvasThumbRef.current,
          question.promptNotanMask,
          50,
          ABSTRACTION_THUMB_SIZE,
        );
        drawNotanScene(canvasRefA.current, question.notanSceneA, 50, ABSTRACTION_2AFC_SIZE);
        drawNotanScene(canvasRefB.current, question.notanSceneB, 50, ABSTRACTION_2AFC_SIZE);
      }
    } else if (mode === 'TD_PALETTE_2AFC' && question.palettePatternOptions) {
~~~~~
~~~~~typescript
    } else if (mode === 'TD_NOTAN_2AFC') {
      if (question.promptNotanBuffer && question.notanSceneBufferA && question.notanSceneBufferB) {
        drawRawGrayscaleNoiseField(
          canvasThumbRef.current,
          question.promptNotanBuffer,
          question.notanFieldDim ?? 120,
          ABSTRACTION_THUMB_SIZE,
        );
        drawRawGrayscaleNoiseField(
          canvasRefA.current,
          question.notanSceneBufferA,
          question.notanFieldDim ?? 120,
          ABSTRACTION_2AFC_SIZE,
        );
        drawRawGrayscaleNoiseField(
          canvasRefB.current,
          question.notanSceneBufferB,
          question.notanFieldDim ?? 120,
          ABSTRACTION_2AFC_SIZE,
        );
      }
    } else if (mode === 'TD_PALETTE_2AFC' && question.palettePatternOptions) {
~~~~~

#### Acts 7: 更新业务组件中的字段引用 (`GenericTrainingView`, `GlobalStatsModal`, `app.tsx`)

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
export function GenericTrainingView({
  card,
  plugin,
  sessionType,
  initialLevel,
  settings,
  globalSettings,
  onExit,
}: GenericTrainingViewProps) {
  const domain = card.legacyDomain;
  const mode = card.legacyMode;
  const adapter = plugin as unknown as GenericTrainingPluginAdapter;
~~~~~
~~~~~typescript
export function GenericTrainingView({
  card,
  plugin,
  sessionType,
  initialLevel,
  settings,
  globalSettings,
  onExit,
}: GenericTrainingViewProps) {
  const domain = card.domain;
  const mode = card.mode;
  const adapter = plugin as unknown as GenericTrainingPluginAdapter;
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
    const [domain, mode] = selectedFilter.split(':') as [TrainingDomain, string];
    const meta = DOMAINS_CONFIG[domain];
    const card = meta?.cards.find((c) => c.legacyMode === mode);
    return `${meta?.title || domain} • ${card?.title || mode}`;
~~~~~
~~~~~typescript
    const [domain, mode] = selectedFilter.split(':') as [TrainingDomain, string];
    const meta = DOMAINS_CONFIG[domain];
    const card = meta?.cards.find((c) => c.mode === mode);
    return `${meta?.title || domain} • ${card?.title || mode}`;
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
                {Object.values(DOMAINS_CONFIG).map((meta) => (
                  <optgroup key={meta.domain} label={meta.title}>
                    <option value={`${meta.domain}_all`}>{meta.title} (全部)</option>
                    {meta.cards.map((card) => (
                      <option
                        key={`${meta.domain}:${card.legacyMode}`}
                        value={`${meta.domain}:${card.legacyMode}`}
                      >
                        {card.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
~~~~~
~~~~~typescript
                {Object.values(DOMAINS_CONFIG).map((meta) => (
                  <optgroup key={meta.domain} label={meta.title}>
                    <option value={`${meta.domain}_all`}>{meta.title} (全部)</option>
                    {meta.cards.map((card) => (
                      <option
                        key={`${meta.domain}:${card.mode}`}
                        value={`${meta.domain}:${card.mode}`}
                      >
                        {card.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
              settings={getCardSettings(settings, activeCard.id)}
              globalSettings={settings.global}
              onExit={() => navigate({ type: 'dashboard', domain: activeCard.legacyDomain })}
            />
          );
        })()}
~~~~~
~~~~~typescript
              settings={getCardSettings(settings, activeCard.id)}
              globalSettings={settings.global}
              onExit={() => navigate({ type: 'dashboard', domain: activeCard.domain })}
            />
          );
        })()}
~~~~~

### 下一步建议
1. 执行类型检查与代码检查：运行 `npm run check` 或 `npx tsc --noEmit`，验证所有模块与类型均正常无报错。
2. 运行自动化测试：执行 `npm run test`，确保现有的训练算子、数据导入导出逻辑完整通过。
3. 验证无误后，生成 `[COMMIT]` 计划将此次重构提交至 Git 版本库。
