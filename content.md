这里是因为 `cards.ts` 与 `registry.ts` 之间存在双向循环引用（Circular Dependency），导致在模块初始化阶段 `ALL_CARDS` 触发了暂存死区（TDZ）的引用错误；同时包含了 Biome 的 hook 依赖与 TypeScript 未使用导入警告。

我将生成一个修复计划来彻底解除循环依赖并修正 linter 错误。

## [WIP] fix: 解除 registry 循环依赖并修复构建与校验问题

### 错误分析
1. **循环依赖引发的 TDZ 错误**：`registry.ts` 在顶层导入了 `cards.ts` 中的 `ALL_CARDS` 并在模块加载时立即读取；而 `cards.ts` 顶层又导入了 `registry.ts` 的 `registry` 实例，两者形成相互依赖循环，导致 `ALL_CARDS` 初始化之前被调用。
2. **Biome 依赖项告警**：`GlobalStatsModal.tsx` 中 `allDomains` 在组件顶层读取，但在 `useEffect` 中没有加入依赖数组。
3. **TS 编译报错**：`registry.ts` 中存在未使用的 `ComponentChildren` 导入声明。

### 用户需求
消除模块加载时的 ReferenceError，修复 Biome lint 检查与 TypeScript build 构建。

### 评论
解除循环依赖的最佳实践是保持单向依赖流：让数据定义层（Cards, Domains, Plugins）作为底层被 `registry.ts` 单向消费，而上层应用只从 `registry.ts` 或通过纯函数索引卡片，彻底斩断双向引用。

### 目标
1. 重构 `src/config/cards.ts`，使其成为纯数据与纯索引函数模块（单向流向 `registry.ts`），消除循环引用。
2. 清理 `src/config/registry.ts` 中的无用导入。
3. 在 `src/components/GlobalStatsModal.tsx` 内部直接调用 `registry.getAllDomains()`，满足 hooks 依赖完整性。

### 基本原理
1. `cards.ts` 自包含 `CARD_MAP`，提供高效的 `getCardById` 和 `getCardsByDomain`，无需反向依赖 `registry`。
2. `registry.ts` 单向导入 `ALL_CARDS`、`DOMAINS_CONFIG` 等完成集中注册。
3. 清理未使用的类型与修正 hooks 依赖。

### 标签
#intent/fix #flow/ready #priority/critical #comp/engine #comp/build #scope/core #ai/instruct #task/domain/architecture #task/object/plugin-registry #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修复 `src/config/cards.ts`，解除循环依赖

我们将 `cards.ts` 中的卡片查询函数直接基于内部的 `CARD_MAP` 实现，完全移除对 `registry.ts` 的反向导入，使依赖链变成严格的单向流。

~~~~~act
write_file
src/config/cards.ts
~~~~~
~~~~~typescript
import {
  Columns,
  Compass,
  Crosshair,
  Droplet,
  Maximize2,
  Palette,
  RotateCw,
  Shuffle,
  Sparkles,
  Split,
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

export const ALL_CARDS: CardDefinition[] = [
  // 角度感知系列
  {
    id: 'angle_estimation',
    domain: 'angle',
    mode: 'ANGLE_ESTIMATION',
    title: '夹角大小估算',
    desc: '观察由纯黑线段构成的夹角，使用连续滑块精准评估夹角弧度大小 (0°~180°)。',
    instruction: '观察极简两条射线夹角，调制滑块逼近精准度数 (0°~180°)',
    icon: Compass,
    tags: {
      target: ['geometry', 'angle'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'angle_comparison_2afc',
    domain: 'angle',
    mode: 'ANGLE_COMPARISON_2AFC',
    title: '角度二分对比',
    desc: '在消除空间正交基准干扰下，二选一快速判别哪一侧的两射线夹角更大 (2AFC)。',
    instruction: '二选一快速判别哪一侧夹角更大 (键 1 / 2)',
    icon: Columns,
    tags: {
      target: ['geometry', 'angle'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'angle_parallel_2afc',
    domain: 'angle',
    mode: 'PARALLEL_ALIGNMENT_2AFC',
    title: '平行线基准辨识',
    desc: '观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其绝对平行的线段 (2AFC)。',
    instruction: '观察上方基准线，在下方选出与其保持绝对平行的线 (键 1 / 2)',
    icon: Split,
    tags: {
      target: ['geometry', 'angle'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },

  // 视知觉概括系列
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

  // 寻星练习系列
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

  // 绝对色感系列
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

  // 相对色感系列
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
    desc: '在强色相与饱和度背景下，四选一选出逆向补偿后的目标色，训练环境光色感知调和力。',
    instruction: '观察左侧强色相背景下的基准色，选出右侧达成感知一致的补偿色 (键 1-4)',
    icon: Palette,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
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

  // 正负形空间系列
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

#### Acts 2: 修复 `src/config/registry.ts` 未使用的类型声明

移除无用的 `ComponentChildren` 导入。

~~~~~act
patch_file
src/config/registry.ts
~~~~~
~~~~~typescript.old
import type { ComponentChildren } from 'preact';
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';
~~~~~
~~~~~typescript.new
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';
~~~~~

#### Acts 3: 修复 `src/components/GlobalStatsModal.tsx` 的 useEffect 依赖

将 `allDomains` 直接移至 `useEffect` 内部读取，避免产生外部作用域未在 dependency array 声明的问题。

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
export function GlobalStatsModal({ onClose }: GlobalStatsModalProps) {
  const allDomains = registry.getAllDomains();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<UnifiedRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // === 1. 数据加载与聚合 ===
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      const results = await Promise.all(
        allDomains.map(async (domain) => {
          const domainRecords = await getTrialRecords(domain);
          return domainRecords.map((r) => ({
            timestamp: r.timestamp,
            isHit: r.isHit,
            level: r.difficultyLevel,
            module: domain,
            subMode: r.mode,
          }));
        }),
      );
~~~~~
~~~~~typescript.new
export function GlobalStatsModal({ onClose }: GlobalStatsModalProps) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<UnifiedRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // === 1. 数据加载与聚合 ===
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      const domains = registry.getAllDomains();
      const results = await Promise.all(
        domains.map(async (domain) => {
          const domainRecords = await getTrialRecords(domain);
          return domainRecords.map((r) => ({
            timestamp: r.timestamp,
            isHit: r.isHit,
            level: r.difficultyLevel,
            module: domain,
            subMode: r.mode,
          }));
        }),
      );
~~~~~

### 下一步建议
- 重新运行 `npm run checkf` 和 `npm run build`，验证语法检查与 TypeScript 编译是否完全通过。
