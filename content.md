# [WIP] feat: 调整主页模块顺序，将概括感知和细化感知移至最后一排

## [WIP] feat(home): 调整网格中各训练模块的排列顺序

### 用户需求
用户要求调整 FormSight 主页上的模块显示顺序，将“概括感知”和“细化感知”这两个模块放置在最后一排。

### 评论
通过对 `DOMS_CONFIG` 或主页渲染逻辑的调整，可以自定义各个训练板块在 UI 网格中的呈现顺序，从而优化用户的视觉流与操作动线。

### 目标
1. 调整 `src/config/domains.ts` 中 `DOMAINS_CONFIG` 或相关主页渲染时的模块排列顺序，将 `abstraction` 和 `concretization` 移至最后。
2. 验证调整后的主页网格在不同屏幕尺寸下的布局表现是否正常。

### 基本原理
由于 `DOMAINS_CONFIG` 是一个对象字典，JavaScript/TypeScript 中对象的键值遍历顺序在标准中虽然对数字索引有特殊规则，但对字符串键通常保持插入顺序。我们可以通过调整 `DOMAINS_CONFIG` 中属性的定义顺序，或者在 `Home.tsx` 中显式指定排列的数组顺序来精准控制渲染顺序。

### 标签
#intent/build #flow/ready #priority/medium #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/dashboard-order #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 调整领域配置或主页网格顺序

我们将修改 `src/config/domains.ts` 或 `src/views/Home.tsx` 中遍历 domains 的顺序，将 `abstraction`（概括感知）和 `concretization`（细化感知）排在最后。

~~~~~act
patch_file
src/config/domains.ts
~~~~~
~~~~~typescript.old
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
~~~~~typescript.new
export const DOMAINS_CONFIG: Record<TrainingDomain, DomainMeta> = {
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
};
~~~~~

同时更新 `Home.tsx` 中遍历的顺序数组（如果需要显式定义）：

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript.old
export function Home({
  totalTimeMs,
  domainTimes,
  onNavigateDomain,
  onOpenGlobalSettings,
  onOpenGlobalStats,
}: HomeProps) {
  const domains = Object.values(DOMAINS_CONFIG);
~~~~~
~~~~~typescript.new
export function Home({
  totalTimeMs,
  domainTimes,
  onNavigateDomain,
  onOpenGlobalSettings,
  onOpenGlobalStats,
}: HomeProps) {
  const domainOrder: TrainingDomain[] = [
    'star',
    'color',
    'relative_color',
    'negative_space',
    'abstraction',
    'concretization',
  ];
  const domains = domainOrder.map((d) => DOMAINS_CONFIG[d]);
~~~~~

### 下一步建议
我们已经成功调整了主页卡片的渲染顺序，将“寻星练习”、“色感训练”、“相对色感”、“正负形感知”排在前两排，而将“概括感知”和“细化感知”排在了最后一排。接下来您可以运行 `npm run dev` 在浏览器中验证主页的布局效果。
