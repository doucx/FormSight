好的，我将把这 8 张卡片拆分为两个独立的领域体系：
1. **概括感知（Visual Abstraction）**：包含自底向上的 4 张提炼卡片（动态势线提取、折线低模大形、黑白素描归组、主调色群提炼）。
2. **细化感知（Visual Refinement / Concretization）**：包含自顶向下的 4 张逆向匹配卡片（动态势线寻源、几何大模寻形、黑白素描骨架、调性基底归位）。

## [WIP] refactor: 将 8 张卡片拆分为两个独立领域（概括感知 vs 细化感知）

### 用户需求
将现有的 8 张视知觉卡片拆分为两个并列的训练领域：
- **概括感知 (`abstraction`)**：专注“去噪、提炼与抓大放小”（自底向上）。
- **细化感知 (`concretization`)**：专注“骨架透视、结构寻源与细节归位”（自顶向下）。

### 评论
将“概括”与“细化”拆分为两个独立领域，不仅使训练模块的教学认知层级更加清晰（正向提炼 vs 逆向检验），也使主页看板的分类结构更加规整平衡。

### 目标
1. 在 `TrainingDomain` 联合类型与数据库架构中新增 `'concretization'` 领域。
2. 调整 `src/config/domains.ts`，分别定义“概括感知”与“细化感知”的看板元数据。
3. 调整 `src/config/cards.ts`，将 4 张自顶向下 2AFC 卡片的 `legacyDomain` 划归为 `'concretization'`。
4. 在路由守卫、全局统计与插件注册中心完成双领域的完整挂载。

### 基本原理
- 保持卡片已有的底层生成与判定逻辑不变。
- 通过领域元数据（DomainMeta）的 `get cards()` 过滤，自然将 8 张卡片分别归入对应的领域看板中。

### 标签
#intent/refactor #flow/ready #priority/high #comp/runtime #comp/interfaces #concept/ui #concept/config #scope/core #scope/ux #scope/api #ai/delegate #task/domain/ui #task/object/abstraction-and-concretization #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 扩展领域类型与基础路由

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~typescript.old
export type SensoryTargetTag =
  | 'geometry'
  | 'color'
  | 'relative_color'
  | 'negative_space'
  | 'abstraction';
~~~~~
~~~~~typescript.new
export type SensoryTargetTag =
  | 'geometry'
  | 'color'
  | 'relative_color'
  | 'negative_space'
  | 'abstraction'
  | 'concretization';
~~~~~

~~~~~act
patch_file
src/utils/db/schema.ts
~~~~~
~~~~~typescript.old
export type TrainingDomain = 'star' | 'color' | 'relative_color' | 'negative_space' | 'abstraction';
~~~~~
~~~~~typescript.new
export type TrainingDomain =
  | 'star'
  | 'color'
  | 'relative_color'
  | 'negative_space'
  | 'abstraction'
  | 'concretization';
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript.old
    if (['abstraction', 'star', 'color', 'relative_color', 'negative_space'].includes(domain)) {
      return { type: 'dashboard', domain };
    }
~~~~~
~~~~~typescript.new
    if (
      [
        'abstraction',
        'concretization',
        'star',
        'color',
        'relative_color',
        'negative_space',
      ].includes(domain)
    ) {
      return { type: 'dashboard', domain };
    }
~~~~~

#### Acts 2: 更新领域看板与卡片归属配置

~~~~~act
write_file
src/config/domains.ts
~~~~~
~~~~~typescript
import { Compass, Eye, Layers, Maximize2, Palette, Shuffle } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db';
import { getCardsByDomain } from './cards';

export interface DomainMeta {
  domain: TrainingDomain;
  appId:
    | 'star-hopping'
    | 'color-sense'
    | 'relative-color'
    | 'negative-space'
    | 'visual-abstraction'
    | 'visual-refinement';
  title: string;
  subTitle: string;
  homeTitle: string;
  homeDesc: string;
  themeColor: 'indigo' | 'amber' | 'purple' | 'emerald';
  icon: (props: { className?: string }) => ComponentChildren;
  hasWeaknessAnalytics?: boolean;
  get cards(): CardDefinition[];
}

export const DOMAINS_CONFIG: Record<TrainingDomain, DomainMeta> = {
  abstraction: {
    domain: 'abstraction',
    appId: 'visual-abstraction',
    title: '概括感知',
    subTitle: 'Visual Abstraction',
    homeTitle: '概括感知 (Visual Abstraction)',
    homeDesc:
      '自底向上过滤繁琐细节，训练对动态势线、极简低模折线、素描黑白块面与加权主调的本质提炼能力。',
    themeColor: 'indigo',
    icon: Eye,
    hasWeaknessAnalytics: false,
    get cards() {
      return getCardsByDomain('abstraction');
    },
  },
  concretization: {
    domain: 'concretization',
    appId: 'visual-refinement',
    title: '细化感知',
    subTitle: 'Visual Refinement',
    homeTitle: '细化感知 (Visual Refinement)',
    homeDesc:
      '自顶向下透视具象细节，训练基于势线骨架、几何大形、Notan 构图与调性基底在丰富画面中寻源辨识的能力。',
    themeColor: 'purple',
    icon: Layers,
    hasWeaknessAnalytics: false,
    get cards() {
      return getCardsByDomain('concretization');
    },
  },
  star: {
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
      return getCardsByDomain('star');
    },
  },
  color: {
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
      return getCardsByDomain('color');
    },
  },
  relative_color: {
    domain: 'relative_color',
    appId: 'relative-color',
    title: '相对色感',
    subTitle: 'Relative Color',
    homeTitle: '相对色感 (Relative Color Perception)',
    homeDesc:
      '基于 OKLab 感知均匀色彩空间，通过固有色与环境光的推移矢量 (Vector v_AB)，建立客观光影下相对色彩推移与对比关系的硬核艺术敏锐度。',
    themeColor: 'purple',
    icon: Shuffle,
    hasWeaknessAnalytics: true,
    get cards() {
      return getCardsByDomain('relative_color');
    },
  },
  negative_space: {
    domain: 'negative_space',
    appId: 'negative-space',
    title: '正负形感知',
    subTitle: 'Negative Space',
    homeTitle: '正负形空间感知 (Negative Space)',
    homeDesc:
      '切换观察视角，通过对几何剪影周围留白（负形）面积占比的估算与反切定点，打破具象认知偏见，培养专业起形与比例感知力。',
    themeColor: 'emerald',
    icon: Maximize2,
    hasWeaknessAnalytics: true,
    get cards() {
      return getCardsByDomain('negative_space');
    },
  },
};
~~~~~

~~~~~act
patch_file
src/config/cards.ts
~~~~~
~~~~~typescript.old
  {
    id: 'abs_td_gesture_2afc',
    legacyDomain: 'abstraction',
    legacyMode: 'TD_GESTURE_2AFC',
    title: '动态势线寻源',
    desc: '给定抽象势线骨架，在两幅复杂点阵中透视判别谁长在该动势中 (2AFC)。',
    icon: Shuffle,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'gesture_flow'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_hull_2afc',
    legacyDomain: 'abstraction',
    legacyMode: 'TD_HULL_2AFC',
    title: '几何大模寻形',
    desc: '给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。',
    icon: Columns,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_notan_2afc',
    legacyDomain: 'abstraction',
    legacyMode: 'TD_NOTAN_2AFC',
    title: '黑白素描骨架',
    desc: '给定二值 Notan 剪影，透视辨识哪幅丰富灰阶素描拥有该黑白大结构 (2AFC)。',
    icon: Droplet,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'notan_grouping'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_palette_2afc',
    legacyDomain: 'abstraction',
    legacyMode: 'TD_PALETTE_2AFC',
    title: '调性基底归位',
    desc: '给定 3 阶基调色谱条，在两张复杂混色拼贴图案中二选一归位 (2AFC)。',
    icon: Sparkles,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'color_fidelity'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
~~~~~
~~~~~typescript.new
  {
    id: 'abs_td_gesture_2afc',
    legacyDomain: 'concretization',
    legacyMode: 'TD_GESTURE_2AFC',
    title: '动态势线寻源',
    desc: '给定抽象势线骨架，在两幅复杂点阵中透视判别谁长在该动势中 (2AFC)。',
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
    legacyDomain: 'concretization',
    legacyMode: 'TD_HULL_2AFC',
    title: '几何大模寻形',
    desc: '给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。',
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
    legacyDomain: 'concretization',
    legacyMode: 'TD_NOTAN_2AFC',
    title: '黑白素描骨架',
    desc: '给定二值 Notan 剪影，透视辨识哪幅丰富灰阶素描拥有该黑白大结构 (2AFC)。',
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
    legacyDomain: 'concretization',
    legacyMode: 'TD_PALETTE_2AFC',
    title: '调性基底归位',
    desc: '给定 3 阶基调色谱条，在两张复杂混色拼贴图案中二选一归位 (2AFC)。',
    icon: Sparkles,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'color_fidelity'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
~~~~~

#### Acts 3: 挂载训练插件与更新全局统计列表

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript.old
export const TRAINING_PLUGINS: Record<TrainingDomain, AnyTrainingPlugin> = {
  abstraction: abstractionPlugin,
  star: starPlugin,
  color: colorPlugin,
  relative_color: relativeColorPlugin,
  negative_space: negativeSpacePlugin,
};
~~~~~
~~~~~typescript.new
export const TRAINING_PLUGINS: Record<TrainingDomain, AnyTrainingPlugin> = {
  abstraction: abstractionPlugin,
  concretization: abstractionPlugin,
  star: starPlugin,
  color: colorPlugin,
  relative_color: relativeColorPlugin,
  negative_space: negativeSpacePlugin,
};
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
const ALL_DOMAINS: TrainingDomain[] = [
  'abstraction',
  'star',
  'color',
  'relative_color',
  'negative_space',
];
~~~~~
~~~~~typescript.new
const ALL_DOMAINS: TrainingDomain[] = [
  'abstraction',
  'concretization',
  'star',
  'color',
  'relative_color',
  'negative_space',
];
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>({
    abstraction: 0,
    star: 0,
    color: 0,
    relative_color: 0,
    negative_space: 0,
  });
~~~~~
~~~~~typescript.new
  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>({
    abstraction: 0,
    concretization: 0,
    star: 0,
    color: 0,
    relative_color: 0,
    negative_space: 0,
  });
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
const ALL_DOMAINS: TrainingDomain[] = [
  'abstraction',
  'star',
  'color',
  'relative_color',
  'negative_space',
];
~~~~~
~~~~~typescript.new
const ALL_DOMAINS: TrainingDomain[] = [
  'abstraction',
  'concretization',
  'star',
  'color',
  'relative_color',
  'negative_space',
];
~~~~~

### 下一步建议
1. **启动测试**：运行 `npm run dev`，检查主页是否清晰呈现 6 个领域卡片（概括感知、细化感知、寻星练习、绝对色感、相对色感、正负形感知）。
2. **各板块验证**：分别进入“概括感知”与“细化感知”的看板，确认两板块各自承载 4 张卡片且训练与结算均正常。
