好的，我将生成一份重构方案，将「概括感知（Visual Abstraction）」与「细化感知（Visual Refinement）」统一收敛至 `abstraction` 扩展包中，形成包含 8 个双向对偶训练维度的核心卡包，并清理掉冗余的独立卡包文件。

## [WIP] feat(packs): 合并概括感知与细化感知为统一视知觉卡包

### 用户需求
将分散在 `src/packs/abstraction` 与 `src/packs/concretization` 中的概括提炼与具象寻源两组训练卡片合并为一个统一的完整视知觉卡包，消除架构冗余，形成双向知觉训练闭环。

### 评论
合并后消除了 `concretization` 作为代理包（Dummy Wrapper）的代码耦合，8 张卡片在「势线、大形、光影、色彩」4 个维度上构成了完美的自底向上（Bottom-Up 提炼）与自顶向下（Top-Down 寻源）对称体系，大幅提升了系统的教学专业度与模块内聚力。

### 目标
1. 将 `concretizationCards` 中的 4 张卡片（势线寻源、几何寻形、素描骨架、调性归位）合并到 `src/packs/abstraction/index.ts` 中，统一其 `packId` 为 `'abstraction'`。
2. 更新 `abstractionPack` 的元数据与描述，体现自底向上概括与自顶向下具象的双向认知训练。
3. 删除已无独立存在必要的 `src/packs/concretization/index.ts`。

### 基本原理
由于 `concretization` 完全复用了 `abstraction` 的生成器、算法库（PCA、多边形打碎、Notan噪声场、Oklab混色）以及画布渲染组件，将其在清单层面合并不仅降低了维护成本，也让系统自动发现（Auto-Discovery）更加精简高效。

### 标签
#intent/refine #flow/ready #priority/high #comp/interfaces #concept/config #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/abstraction-pack #task/action/merge #task/state/begin

---

### Script

#### Acts 1: 合并卡片定义并删除冗余卡包

我们将更新 `src/packs/abstraction/index.ts` 导出全量 8 张卡片，并移除 `src/packs/concretization/index.ts`。

~~~~~act
write_file
src/packs/abstraction/index.ts
~~~~~
~~~~~typescript
import {
  Columns,
  Droplet,
  Eye,
  Maximize2,
  Palette,
  RotateCw,
  Shuffle,
  Sparkles,
  Sun,
} from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { abstractionPlugin } from './plugin';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const abstractionCards: CardDefinition[] = [
  // === 自底向上：概括提炼 (Bottom-Up Abstraction) ===
  {
    id: 'abs_gesture_axis',
    packId: 'abstraction',
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
    packId: 'abstraction',
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
    packId: 'abstraction',
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
    packId: 'abstraction',
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
      target: ['concretization', 'abstraction'],
      skill: ['abstraction', 'gesture_flow'],
      interaction: ['choice_2afc'],
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
      target: ['concretization', 'abstraction'],
      skill: ['abstraction', 'proportion'],
      interaction: ['choice_2afc'],
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
      target: ['concretization', 'abstraction'],
      skill: ['abstraction', 'notan_grouping'],
      interaction: ['choice_2afc'],
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
      target: ['concretization', 'abstraction'],
      skill: ['abstraction', 'color_fidelity'],
      interaction: ['choice_nafc'],
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
};

export default abstractionPack;
~~~~~

~~~~~act
delete_file
src/packs/concretization/index.ts
~~~~~

### 下一步建议
1. **测试构建与类型检查**：运行 `npm run build` 或 `tsc` 确认卡包自动扫描注册正常，无未找到模块或类型错误。
2. **训练流模板适配**：如需将具象寻源模块纳入日常训练推荐流，可在 `src/config/planTemplates.ts` 中增加结合自顶向下维度的预设训练流。
