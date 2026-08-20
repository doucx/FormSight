好的，我们将按照方案实施画布文字冗余精简与任务指引系统重构。

## [WIP] feat: 精简训练画布文字冗余并支持全局任务指引开关

### 用户需求
1. **去除画布文字冗余**：消除各训练模块（视知觉概括、正负形、相对色感等）中重复且冗长的快捷键指示、原理背景介绍及题干长句，最大化释放视觉空间，进入沉浸式直觉训练（Flow 状态）。
2. **任务目标精炼指引**：为容易产生心智混淆的任务（如阿尔伯斯明度补偿、环境穿透判别等）提供一目了然的极简单行指引，并在 Header 状态栏提供随手可查的「玩法说明」浮层。
3. **全局设置开关**：在全局偏好中提供「显示任务指引 (Show Task Hints)」开关，允许用户在“引导辅助”与“纯粹极简心流”之间自由切换。

### 评论
该改动使 FormSight 的界面体验由“考试问答形态”升级为“专业视知觉/微操训练形态”，大幅降低认知负荷与视觉干扰，同时兼顾了新手的认知门槛。

### 目标
1. 在 `CardDefinition` 元数据中补充精炼的 `instruction` 玩法说明。
2. 在 `GlobalSettings` 中新增 `showCanvasHints` 配置，并在 `GlobalSettingsModal` 中提供开关。
3. 在 `TrainingShell` 顶部状态栏增加玩法说明查看入口。
4. 改造 `AbstractionCanvas`、`NegativeSpaceCanvas`、`RelativeColorCanvas`，剔除冗余文案，根据指引开关自适应渲染单行微提示或完全极简排版。

### 基本原理
通过渐进式呈现（Progressive Disclosure）分层设计：
1. **L0 纯粹画布层**：去除所有“按键盘 1 选 A”、“基于 PCA 统计”等说明，快捷键以自然 UI 徽章 `[1] A` 呈现；
2. **L1 单行微提示层**：开启提示时仅渲染单行动作导向标签，关闭时高度自适应零文本；
3. **L2 状态栏说明层**：在 Header 提供 `?` 帮助入口供随时查阅。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/task-hints-and-flow-mode #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 扩展卡片定义与添加卡片精炼玩法说明

我们在 `CardDefinition` 中添加 `instruction` 属性，并在 `ALL_CARDS` 中为各个训练模式补充简洁明了的玩法目标说明。

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~typescript.old
export interface CardDefinition {
  id: string;
  legacyDomain: TrainingDomain;
  legacyMode: string;
  title: string;
  desc: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  settingsKey?: string; // 兼容
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
}
~~~~~
~~~~~typescript.new
export interface CardDefinition {
  id: string;
  legacyDomain: TrainingDomain;
  legacyMode: string;
  title: string;
  desc: string;
  instruction?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  settingsKey?: string; // 兼容
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
}
~~~~~

~~~~~act
patch_file
src/config/cards.ts
~~~~~
~~~~~typescript.old
  // ==========================================
  // 0. 视知觉概括系列 (Visual Abstraction)
  // ==========================================
  {
    id: 'abs_gesture_axis',
    legacyDomain: 'abstraction',
    legacyMode: 'GESTURE_AXIS',
    title: '动态势线提取',
    desc: '从离散散点流向中提取第一主成分 PCA 势线角度，建立画面主导动势感知力。',
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
    legacyDomain: 'abstraction',
    legacyMode: 'POLYGON_DECIMATION',
    title: '折线低模大形',
    desc: '从细碎繁复轮廓中识别 RDP 算法精简出的最优关键折线大形框架。',
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
    legacyDomain: 'abstraction',
    legacyMode: 'NOTAN_THRESHOLD',
    title: '黑白素描归组',
    desc: '调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。',
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
    legacyDomain: 'abstraction',
    legacyMode: 'PALETTE_CLUSTERING',
    title: '主调色群提炼',
    desc: '穿透多色拼贴马赛克的混色噪点，四选一提炼出面积加权下的加权质心主色。',
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
    desc: '给定抽象基准主调色，在四幅复杂混色拼贴图案中选出以此为基调的画面 (4AFC)。',
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
    legacyDomain: 'star',
    legacyMode: 'single',
    title: '单锚点模式',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
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
    legacyDomain: 'star',
    legacyMode: 'double_h',
    title: '水平双锚点',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
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
    legacyDomain: 'star',
    legacyMode: 'double_r',
    title: '旋转双锚点',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
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
    legacyDomain: 'color',
    legacyMode: 'H',
    title: '色相 (Hue)',
    desc: '识别颜色在色相环上的具体角度 (0°~360°)',
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
    legacyDomain: 'color',
    legacyMode: 'V',
    title: '明度 (Value)',
    desc: '已知色相，评估颜色的素描明暗程度 (0%~100%)',
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
    legacyDomain: 'color',
    legacyMode: 'S',
    title: '饱和度 (Sat)',
    desc: '已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)',
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
    legacyDomain: 'color',
    legacyMode: 'ALL',
    title: '综合拾色 (Match)',
    desc: '同时调整色相、饱和度与明度，逼近真理色彩',
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
    legacyDomain: 'relative_color',
    legacyMode: 'VECTOR_SHIFT',
    title: '色彩矢量迁移',
    desc: '保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉。',
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
    legacyDomain: 'relative_color',
    legacyMode: 'LIGHTNESS_INDUCTION',
    title: '明度反差补偿',
    desc: '在强明暗对比背景下，微调中心色物理明度以抵消环境视错觉，达成感知一致。',
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
    legacyDomain: 'relative_color',
    legacyMode: 'HUE_INDUCTION',
    title: '补色残像调和',
    desc: '在强色相与饱和度背景下，逆向补偿色彩推移，训练环境光色感知调和力。',
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
    legacyDomain: 'relative_color',
    legacyMode: 'DECONTEXTUAL_2AFC',
    title: '环境穿透判别',
    desc: '穿透强对比背景的视错觉陷阱，快速二选一判别色块的客观物理明度真理。',
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
    legacyDomain: 'negative_space',
    legacyMode: 'RATIO_ESTIMATION',
    title: '负形占比滑块评估',
    desc: '估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。',
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
    legacyDomain: 'negative_space',
    legacyMode: 'AREA_COMPARISON_2AFC',
    title: '负形面积二分判别',
    desc: '快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。',
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
    legacyDomain: 'negative_space',
    legacyMode: 'NEGATIVE_VERTEX_FITTING',
    title: '负形边界反切定点',
    desc: '观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。',
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
    legacyDomain: 'negative_space',
    legacyMode: 'SHAPE_MATCH_2AFC',
    title: '负形轮廓记忆匹配',
    desc: '瞬时记忆负形空隙轮廓，在两张 1:1 等大形状中二选一辨识目标。',
    icon: Sparkles,
    tags: {
      target: ['negative_space'],
      skill: ['visual_memory', 'spatial_orientation'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
~~~~~
~~~~~typescript.new
  // ==========================================
  // 0. 视知觉概括系列 (Visual Abstraction)
  // ==========================================
  {
    id: 'abs_gesture_axis',
    legacyDomain: 'abstraction',
    legacyMode: 'GESTURE_AXIS',
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
    legacyDomain: 'abstraction',
    legacyMode: 'POLYGON_DECIMATION',
    title: '折线低模大形',
    desc: '从细碎繁复轮廓中识别 RDP 算法精简出的最优关键折线大形框架。',
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
    legacyDomain: 'abstraction',
    legacyMode: 'NOTAN_THRESHOLD',
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
    legacyDomain: 'abstraction',
    legacyMode: 'PALETTE_CLUSTERING',
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
    legacyDomain: 'concretization',
    legacyMode: 'TD_GESTURE_2AFC',
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
    legacyDomain: 'concretization',
    legacyMode: 'TD_HULL_2AFC',
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
    legacyDomain: 'concretization',
    legacyMode: 'TD_NOTAN_2AFC',
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
    legacyDomain: 'concretization',
    legacyMode: 'TD_PALETTE_2AFC',
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
    legacyDomain: 'star',
    legacyMode: 'single',
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
    legacyDomain: 'star',
    legacyMode: 'double_h',
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
    legacyDomain: 'star',
    legacyMode: 'double_r',
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
    legacyDomain: 'color',
    legacyMode: 'H',
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
    legacyDomain: 'color',
    legacyMode: 'V',
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
    legacyDomain: 'color',
    legacyMode: 'S',
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
    legacyDomain: 'color',
    legacyMode: 'ALL',
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
    legacyDomain: 'relative_color',
    legacyMode: 'VECTOR_SHIFT',
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
    legacyDomain: 'relative_color',
    legacyMode: 'LIGHTNESS_INDUCTION',
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
    legacyDomain: 'relative_color',
    legacyMode: 'HUE_INDUCTION',
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
    legacyDomain: 'relative_color',
    legacyMode: 'DECONTEXTUAL_2AFC',
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
    legacyDomain: 'negative_space',
    legacyMode: 'RATIO_ESTIMATION',
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
    legacyDomain: 'negative_space',
    legacyMode: 'AREA_COMPARISON_2AFC',
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
    legacyDomain: 'negative_space',
    legacyMode: 'NEGATIVE_VERTEX_FITTING',
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
    legacyDomain: 'negative_space',
    legacyMode: 'SHAPE_MATCH_2AFC',
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
~~~~~

#### Acts 2: 更新设置数据模型与全局设置弹窗

在 `GlobalSettings` 中加入 `showCanvasHints` 开关，并在 `GlobalSettingsModal` 中提供 UI 交互。

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
export interface GlobalSettings {
  idleTimeout: number;
  soundEnabled: boolean;
  sliderHitMargin: number;
}

export interface UserSettings {
  global: GlobalSettings;
  cards: Record<string, BaseModuleSettings>;
}

const SETTINGS_KEY = 'formsight_user_settings';

export const DEFAULT_BASE_SETTINGS: BaseModuleSettings = {
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
    soundEnabled: true,
    sliderHitMargin: 12,
  },
~~~~~
~~~~~typescript.new
export interface GlobalSettings {
  idleTimeout: number;
  soundEnabled: boolean;
  sliderHitMargin: number;
  showCanvasHints?: boolean;
}

export interface UserSettings {
  global: GlobalSettings;
  cards: Record<string, BaseModuleSettings>;
}

const SETTINGS_KEY = 'formsight_user_settings';

export const DEFAULT_BASE_SETTINGS: BaseModuleSettings = {
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
    soundEnabled: true,
    sliderHitMargin: 12,
    showCanvasHints: true,
  },
~~~~~

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript.old
import {
  Clock,
  Download,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { clearAllData, exportAllData, importAllData } from '../utils/db';
import { loadSettings, saveSettings } from '../utils/settings';
import { ConfirmModal } from './common/ConfirmModal';
import { ModalShell } from './common/ModalShell';
import type { ToastType } from './common/Toast';
import { SliderMarginGroup } from './settings/common/SliderMarginGroup';

interface GlobalSettingsModalProps {
  onClose: () => void;
  onDataChanged: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}

export function GlobalSettingsModal({
  onClose,
  onDataChanged,
  showToast,
}: GlobalSettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [settings, setSettings] = useState(loadSettings);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleToggleSound = () => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        soundEnabled: !settings.global.soundEnabled,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };
~~~~~
~~~~~typescript.new
import {
  Clock,
  Download,
  HelpCircle,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { clearAllData, exportAllData, importAllData } from '../utils/db';
import { loadSettings, saveSettings } from '../utils/settings';
import { ConfirmModal } from './common/ConfirmModal';
import { ModalShell } from './common/ModalShell';
import type { ToastType } from './common/Toast';
import { SliderMarginGroup } from './settings/common/SliderMarginGroup';

interface GlobalSettingsModalProps {
  onClose: () => void;
  onDataChanged: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}

export function GlobalSettingsModal({
  onClose,
  onDataChanged,
  showToast,
}: GlobalSettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [settings, setSettings] = useState(loadSettings);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleToggleSound = () => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        soundEnabled: !settings.global.soundEnabled,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleToggleHints = () => {
    const current = settings.global.showCanvasHints ?? true;
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        showCanvasHints: !current,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };
~~~~~

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript.old
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">训练音效反馈</div>
                <div className="text-[11px] text-slate-400">答对清脆升调提示，答错低沉提示</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleSound}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {settings.global.soundEnabled ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>
~~~~~
~~~~~typescript.new
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">训练音效反馈</div>
                <div className="text-[11px] text-slate-400">答对清脆升调提示，答错低沉提示</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleSound}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {settings.global.soundEnabled ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">显示任务文字指引</div>
                <div className="text-[11px] text-slate-400">在画布上方展示极简提示，关闭进入全沉浸模式</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleHints}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {(settings.global.showCanvasHints ?? true) ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>
~~~~~

#### Acts 3: 在 `TrainingShell` 增加玩法说明浮层支持

在训练容器顶部 Header 增加一个 `?` 按钮/浮层，方便随时查看当前任务玩法。

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript.old
import { ArrowLeft, ChevronRight, Clock, Crosshair } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import type { CardDefinition } from '../../types/card';
import type { SessionHistoryItem } from '../SessionSummaryModal';
import { SessionSummaryModal } from '../SessionSummaryModal';
import { IdlePauseOverlay } from '../common/IdlePauseOverlay';

export interface TrainingSessionHandle {
~~~~~
~~~~~typescript.new
import { ArrowLeft, ChevronRight, Clock, Crosshair, HelpCircle } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { CardDefinition } from '../../types/card';
import type { SessionHistoryItem } from '../SessionSummaryModal';
import { SessionSummaryModal } from '../SessionSummaryModal';
import { IdlePauseOverlay } from '../common/IdlePauseOverlay';

export interface TrainingSessionHandle {
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript.old
export function TrainingShell({
  card,
  sessionType,
  currentLevel,
  isTargeting = false,
  autoNext,
  session,
  children,
}: TrainingShellProps) {
  const { title } = card;
  const badge = card.tags.target[0];
  const {
    totalTrials,
    elapsedSeconds,
    isFinished,
    isIdle,
    showAnswer,
    showSummaryModal,
    sessionHistory,
    resumeFromIdle,
    handleNextQuestion,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  } = session;
~~~~~
~~~~~typescript.new
export function TrainingShell({
  card,
  sessionType,
  currentLevel,
  isTargeting = false,
  autoNext,
  session,
  children,
}: TrainingShellProps) {
  const { title, instruction, desc } = card;
  const badge = card.tags.target[0];
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);

  const {
    totalTrials,
    elapsedSeconds,
    isFinished,
    isIdle,
    showAnswer,
    showSummaryModal,
    sessionHistory,
    resumeFromIdle,
    handleNextQuestion,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  } = session;
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript.old
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestFinish}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练 (Esc)
          </button>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {title} · {badge} | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
          {isTargeting && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              靶向强化训练
            </span>
          )}
        </div>
~~~~~
~~~~~typescript.new
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestFinish}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练 (Esc)
          </button>
          <div className="relative flex items-center">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1.5">
              {title} · {badge} | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
              {(instruction || desc) && (
                <button
                  type="button"
                  onClick={() => setShowHelpTooltip(!showHelpTooltip)}
                  onMouseEnter={() => setShowHelpTooltip(true)}
                  onMouseLeave={() => setShowHelpTooltip(false)}
                  className="text-indigo-400 hover:text-indigo-700 transition-colors p-0.5 rounded-md"
                  title="玩法说明"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </span>

            {showHelpTooltip && (instruction || desc) && (
              <div className="absolute left-0 top-full mt-2 z-40 w-72 bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-xs leading-relaxed animate-in fade-in zoom-in-95 duration-150">
                <div className="font-bold text-indigo-300 mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  玩法要领
                </div>
                <p className="text-slate-200 text-[11px]">{instruction || desc}</p>
              </div>
            )}
          </div>

          {isTargeting && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              靶向强化训练
            </span>
          )}
        </div>
~~~~~

#### Acts 4: 将 `showCanvasHints` 传递至 TrainingPlugins 与 GenericTrainingView

让训练插件体系与视图层能够自如向画布注入 `showCanvasHints` 配置。

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript.old
  return (
    <TrainingShell
      card={card}
      sessionType={sessionType}
      currentLevel={session.question ? adapter.getQuestionLevel(session.question) : initialLevel}
      isTargeting={isTargeting}
      autoNext={settings.autoNext}
      session={session}
      onExit={onExit}
    >
      {({ disabled, isIdle }) =>
        adapter.renderCanvas({
          question: session.question,
          showAnswer: session.showAnswer,
          userAnswer: session.userAnswer,
          onAnswer: session.handleAnswer,
          disabled,
          isIdle,
          settings: {
            ...settings,
            sliderHitMargin:
              globalSettings?.sliderHitMargin ?? (settings.sliderHitMargin as number) ?? 12,
          },
        })
      }
    </TrainingShell>
  );
~~~~~
~~~~~typescript.new
  return (
    <TrainingShell
      card={card}
      sessionType={sessionType}
      currentLevel={session.question ? adapter.getQuestionLevel(session.question) : initialLevel}
      isTargeting={isTargeting}
      autoNext={settings.autoNext}
      session={session}
      onExit={onExit}
    >
      {({ disabled, isIdle }) =>
        adapter.renderCanvas({
          question: session.question,
          showAnswer: session.showAnswer,
          userAnswer: session.userAnswer,
          onAnswer: session.handleAnswer,
          disabled,
          isIdle,
          settings: {
            ...settings,
            sliderHitMargin:
              globalSettings?.sliderHitMargin ?? (settings.sliderHitMargin as number) ?? 12,
            showCanvasHints:
              globalSettings?.showCanvasHints ?? (settings.showCanvasHints as boolean) ?? true,
          },
        })
      }
    </TrainingShell>
  );
~~~~~

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript.old
// 3. 相对色感插件
export const relativeColorPlugin: TrainingPlugin<
  RelativeColorQuestionData,
  RelativeColorHitResult,
  [number, number, number] | 'A' | 'B',
  RelativeColorSettings
> = {
  domain: 'relative_color',
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
    generateRelativeColorQuestion(mode as RelativeColorMode, level),
  evaluateAnswer: (userVal, q, mode) =>
    checkRelativeColorHit(mode as RelativeColorMode, userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    if (mode === 'DECONTEXTUAL_2AFC') {
      return {
        mode,
        userChoice: userVal,
        correctChoice: q.largerPhysicalSide,
        physicalValueDiff: q.physicalValueDiff,
      };
    }
    if (mode === 'LIGHTNESS_INDUCTION' || mode === 'HUE_INDUCTION') {
      return {
        mode,
        bgLeft: q.bgLeft,
        bgRight: q.bgRight,
        targetLeftCenter: q.targetLeftCenter,
        idealRightCenter: q.idealRightCenter,
        userRightColor: userVal,
        deltaEError: hitResult.deltaEError,
      };
    }
    return {
      mode: 'VECTOR_SHIFT',
      colorA: q.colorA,
      colorB: q.colorB,
      colorC: q.colorC,
      targetD: q.targetD,
      userD: userVal,
      deltaEError: hitResult.deltaEError,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <RelativeColorCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
      enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
    />
  ),
};
~~~~~
~~~~~typescript.new
// 3. 相对色感插件
export const relativeColorPlugin: TrainingPlugin<
  RelativeColorQuestionData,
  RelativeColorHitResult,
  [number, number, number] | 'A' | 'B',
  RelativeColorSettings
> = {
  domain: 'relative_color',
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
    generateRelativeColorQuestion(mode as RelativeColorMode, level),
  evaluateAnswer: (userVal, q, mode) =>
    checkRelativeColorHit(mode as RelativeColorMode, userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    if (mode === 'DECONTEXTUAL_2AFC') {
      return {
        mode,
        userChoice: userVal,
        correctChoice: q.largerPhysicalSide,
        physicalValueDiff: q.physicalValueDiff,
      };
    }
    if (mode === 'LIGHTNESS_INDUCTION' || mode === 'HUE_INDUCTION') {
      return {
        mode,
        bgLeft: q.bgLeft,
        bgRight: q.bgRight,
        targetLeftCenter: q.targetLeftCenter,
        idealRightCenter: q.idealRightCenter,
        userRightColor: userVal,
        deltaEError: hitResult.deltaEError,
      };
    }
    return {
      mode: 'VECTOR_SHIFT',
      colorA: q.colorA,
      colorB: q.colorB,
      colorC: q.colorC,
      targetD: q.targetD,
      userD: userVal,
      deltaEError: hitResult.deltaEError,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <RelativeColorCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
      enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
      showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
    />
  ),
};
~~~~~

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript.old
// 4. 正负形感知插件
export const negativeSpacePlugin: TrainingPlugin<
  NegativeSpaceQuestionData,
  NegativeSpaceHitResult,
  number | 'A' | 'B' | Point,
  NegativeSpaceSettings
> = {
  domain: 'negative_space',
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
    generateNegativeSpaceQuestion(mode as NegativeSpaceMode, level),
  evaluateAnswer: (userVal, q) => checkNegativeSpaceHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    if (mode === 'NEGATIVE_VERTEX_FITTING') {
      return {
        mode: 'NEGATIVE_VERTEX_FITTING',
        targetVertexIndex: q.targetVertexIndex,
        targetPoint: q.targetPoint ? [q.targetPoint.x, q.targetPoint.y] : undefined,
        userClick: hitResult.nearestGridPoint
          ? [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y]
          : undefined,
        errorPixelDistance: hitResult.errorValue,
      };
    }
    if (mode === 'AREA_COMPARISON_2AFC') {
      return {
        mode: 'AREA_COMPARISON_2AFC',
        userChoice: userVal,
        correctChoice: q.largerSide,
        negRatioA: q.negRatioA,
        negRatioB: q.negRatioB,
        areaDeltaPercent: q.areaDeltaPercent,
        errorValue: hitResult.errorValue,
      };
    }
    if (mode === 'SHAPE_MATCH_2AFC') {
      return {
        mode: 'SHAPE_MATCH_2AFC',
        userChoice: userVal === 0 || userVal === 'A' ? 'A' : 'B',
        correctChoice: q.correctChoice,
        displayTimeMs: q.displayTimeMs,
        errorValue: hitResult.errorValue,
      };
    }
    return {
      targetNegativeRatio: q.targetNegativeRatio,
      userRatio: userVal,
      errorValue: hitResult.errorValue,
      positiveArea: q.positiveArea,
      negativeArea: q.negativeArea,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <NegativeSpaceCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
    />
  ),
};

// 5. 视知觉概括插件
export const abstractionPlugin: TrainingPlugin<
  AbstractionQuestionData,
  AbstractionHitResult,
  number | 'A' | 'B',
  BaseModuleSettings
> = {
  domain: 'abstraction',
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
  evaluateAnswer: (userVal, q) => checkAbstractionHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (_q, hitResult, userVal, mode) => ({
    mode,
    userAnswer: userVal,
    errorValue: hitResult.errorValue,
  }),
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <AbstractionCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={(settings.sliderHitMargin as number) ?? 12}
      showToleranceBand={(settings.showToleranceBand as boolean) ?? true}
    />
  ),
};
~~~~~
~~~~~typescript.new
// 4. 正负形感知插件
export const negativeSpacePlugin: TrainingPlugin<
  NegativeSpaceQuestionData,
  NegativeSpaceHitResult,
  number | 'A' | 'B' | Point,
  NegativeSpaceSettings
> = {
  domain: 'negative_space',
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
    generateNegativeSpaceQuestion(mode as NegativeSpaceMode, level),
  evaluateAnswer: (userVal, q) => checkNegativeSpaceHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    if (mode === 'NEGATIVE_VERTEX_FITTING') {
      return {
        mode: 'NEGATIVE_VERTEX_FITTING',
        targetVertexIndex: q.targetVertexIndex,
        targetPoint: q.targetPoint ? [q.targetPoint.x, q.targetPoint.y] : undefined,
        userClick: hitResult.nearestGridPoint
          ? [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y]
          : undefined,
        errorPixelDistance: hitResult.errorValue,
      };
    }
    if (mode === 'AREA_COMPARISON_2AFC') {
      return {
        mode: 'AREA_COMPARISON_2AFC',
        userChoice: userVal,
        correctChoice: q.largerSide,
        negRatioA: q.negRatioA,
        negRatioB: q.negRatioB,
        areaDeltaPercent: q.areaDeltaPercent,
        errorValue: hitResult.errorValue,
      };
    }
    if (mode === 'SHAPE_MATCH_2AFC') {
      return {
        mode: 'SHAPE_MATCH_2AFC',
        userChoice: userVal === 0 || userVal === 'A' ? 'A' : 'B',
        correctChoice: q.correctChoice,
        displayTimeMs: q.displayTimeMs,
        errorValue: hitResult.errorValue,
      };
    }
    return {
      targetNegativeRatio: q.targetNegativeRatio,
      userRatio: userVal,
      errorValue: hitResult.errorValue,
      positiveArea: q.positiveArea,
      negativeArea: q.negativeArea,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <NegativeSpaceCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
      showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
    />
  ),
};

// 5. 视知觉概括插件
export const abstractionPlugin: TrainingPlugin<
  AbstractionQuestionData,
  AbstractionHitResult,
  number | 'A' | 'B',
  BaseModuleSettings
> = {
  domain: 'abstraction',
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
  evaluateAnswer: (userVal, q) => checkAbstractionHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (_q, hitResult, userVal, mode) => ({
    mode,
    userAnswer: userVal,
    errorValue: hitResult.errorValue,
  }),
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <AbstractionCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={(settings.sliderHitMargin as number) ?? 12}
      showToleranceBand={(settings.showToleranceBand as boolean) ?? true}
      showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
    />
  ),
};
~~~~~

#### Acts 5: 重构 `AbstractionCanvas`、`NegativeSpaceCanvas` 与 `RelativeColorCanvas` 的文字布局

移除大段说明与冗余快捷键文本，支持 `showCanvasHints` 自适应单行极简胶囊或零文字纯粹心流模式。

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript.old
interface AbstractionCanvasProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (val: number | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
}
~~~~~
~~~~~typescript.new
interface AbstractionCanvasProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (val: number | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript.old
export function AbstractionCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
}: AbstractionCanvasProps) {
~~~~~
~~~~~typescript.new
export function AbstractionCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showCanvasHints = true,
}: AbstractionCanvasProps) {
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript.old
  // =========================================================================
  // 视图 A-1：TD_PALETTE_2AFC (4AFC) 调性基底归位视图
  // =========================================================================
  if (mode === 'TD_PALETTE_2AFC') {
    const promptHex = question.promptDominantColor
      ? hsvToHex(...question.promptDominantColor)
      : '#6366F1';
    const targetIdx = question.correctPatternIndex ?? 0;
    const chosenIdx = userAnswer?.userChoiceIndex ?? selectedTdPatternIdx;
    const patternCanvasRefs = [
      patternCanvasRef0,
      patternCanvasRef1,
      patternCanvasRef2,
      patternCanvasRef3,
    ];

    return (
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            观察上方基准主调色，在下方 4 个复杂画面中选出以此为基调的拼贴图案
          </div>
          <p className="text-xs text-slate-400">
            按快捷键{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">
              1
            </kbd>{' '}
            ~{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">
              4
            </kbd>{' '}
            或直接点击卡片
          </p>
        </div>

        {/* 顶部单色基准展示 */}
        <div className="flex flex-col items-center gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            提炼出的基准主调色 (Prompt)
          </span>
          <div
            className="w-20 h-20 rounded-2xl border-4 border-white shadow-md ring-1 ring-slate-200"
            style={{ backgroundColor: promptHex }}
          />
        </div>
~~~~~
~~~~~typescript.new
  // =========================================================================
  // 视图 A-1：TD_PALETTE_2AFC (4AFC) 调性基底归位视图
  // =========================================================================
  if (mode === 'TD_PALETTE_2AFC') {
    const promptHex = question.promptDominantColor
      ? hsvToHex(...question.promptDominantColor)
      : '#6366F1';
    const targetIdx = question.correctPatternIndex ?? 0;
    const chosenIdx = userAnswer?.userChoiceIndex ?? selectedTdPatternIdx;
    const patternCanvasRefs = [
      patternCanvasRef0,
      patternCanvasRef1,
      patternCanvasRef2,
      patternCanvasRef3,
    ];

    return (
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
        {showCanvasHints && (
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            观察上方基准主色，选出以此为基调的拼贴画面
          </div>
        )}

        {/* 顶部单色基准展示 */}
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            基准主调色
          </span>
          <div
            className="w-16 h-16 rounded-2xl border-4 border-white shadow-md ring-1 ring-slate-200"
            style={{ backgroundColor: promptHex }}
          />
        </div>
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript.old
  // =========================================================================
  // 视图 A-2：Top-Down 2AFC 逆向匹配系列 (GESTURE / HULL / NOTAN)
  // =========================================================================
  if (mode.startsWith('TD_') || mode === 'POLYGON_DECIMATION') {
    const isPoly = mode === 'POLYGON_DECIMATION';
    const isTargetA = isPoly
      ? question.correctPolyChoice === 'A'
      : userAnswer?.correctChoice === 'A' ||
        question.correctParticleChoice === 'A' ||
        question.correctHullChoice === 'A' ||
        question.correctNotanChoice === 'A';
    const isTargetB = !isTargetA;

    return (
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            <Columns className="w-5 h-5 text-indigo-600" />
            {isPoly
              ? '观察左侧细碎多边形，选择右侧保留了主要转折大形的概括项'
              : '观察上方提炼的本质基准，快速判别哪一侧具象细节符合该骨架'}
          </div>
          <p className="text-xs text-slate-400">
            按快捷键{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">
              1
            </kbd>{' '}
            选择 A，按{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">
              2
            </kbd>{' '}
            选择 B
          </p>
        </div>

        {/* 顶部题干或基准展示 */}
        {!isPoly && (
          <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              提炼出的概括基准 (Prompt)
            </span>
            <canvas
              ref={canvasThumbRef}
              width={ABSTRACTION_THUMB_SIZE}
              height={ABSTRACTION_THUMB_SIZE}
              className="w-28 h-28 rounded-xl border border-slate-200 shadow-sm"
            />
          </div>
        )}

        {isPoly && (
          <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              细碎多边形原图
            </span>
            <canvas
              ref={canvasMainRef}
              width={ABSTRACTION_CANVAS_SIZE}
              height={ABSTRACTION_CANVAS_SIZE}
              className="w-48 h-48 rounded-xl border border-slate-200 shadow-sm"
            />
          </div>
        )}
~~~~~
~~~~~typescript.new
  // =========================================================================
  // 视图 A-2：Top-Down 2AFC 逆向匹配系列 (GESTURE / HULL / NOTAN)
  // =========================================================================
  if (mode.startsWith('TD_') || mode === 'POLYGON_DECIMATION') {
    const isPoly = mode === 'POLYGON_DECIMATION';
    const isTargetA = isPoly
      ? question.correctPolyChoice === 'A'
      : userAnswer?.correctChoice === 'A' ||
        question.correctParticleChoice === 'A' ||
        question.correctHullChoice === 'A' ||
        question.correctNotanChoice === 'A';
    const isTargetB = !isTargetA;

    return (
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
        {showCanvasHints && (
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            <Columns className="w-3.5 h-3.5 text-indigo-600" />
            {isPoly
              ? '选择保留了主要转折大形的精简项'
              : '判别哪一侧具象细节符合上方骨架'}
          </div>
        )}

        {/* 顶部题干或基准展示 */}
        {!isPoly && (
          <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              概括基准 (Prompt)
            </span>
            <canvas
              ref={canvasThumbRef}
              width={ABSTRACTION_THUMB_SIZE}
              height={ABSTRACTION_THUMB_SIZE}
              className="w-24 h-24 rounded-xl border border-slate-200 shadow-sm"
            />
          </div>
        )}

        {isPoly && (
          <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              多边形原图
            </span>
            <canvas
              ref={canvasMainRef}
              width={ABSTRACTION_CANVAS_SIZE}
              height={ABSTRACTION_CANVAS_SIZE}
              className="w-40 h-40 rounded-xl border border-slate-200 shadow-sm"
            />
          </div>
        )}
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript.old
  // =========================================================================
  // 视图 B：PALETTE_CLUSTERING 4AFC 调色板提炼视图
  // =========================================================================
  if (mode === 'PALETTE_CLUSTERING') {
    return (
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        <div className="text-center space-y-1">
          <div className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            在下方 4 个候选项中，选出最能代表整幅画面主调的加权主色
          </div>
          <div className="text-xs text-slate-400">穿透细碎微小混色，提炼全局面积加权调性</div>
        </div>

        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <canvas
            ref={canvasMainRef}
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
          />
        </div>
~~~~~
~~~~~typescript.new
  // =========================================================================
  // 视图 B：PALETTE_CLUSTERING 4AFC 调色板提炼视图
  // =========================================================================
  if (mode === 'PALETTE_CLUSTERING') {
    return (
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
        {showCanvasHints && (
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            选出最能代表全局主调的加权主色
          </div>
        )}

        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <canvas
            ref={canvasMainRef}
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
          />
        </div>
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript.old
  // =========================================================================
  // 视图 C：滑块/旋转连续调节视图 (GESTURE_AXIS / NOTAN_THRESHOLD)
  // =========================================================================
  const isGesture = mode === 'GESTURE_AXIS';
  const unit = isGesture ? '°' : '%';

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      <div className="text-center space-y-1">
        <div className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1.5">
          <Eye className="w-4 h-4 text-indigo-600" />
          {isGesture
            ? '旋转调节绿色主轴，对齐粒子群的主动态流向 (0°~180°)'
            : '拖动滑块调节二值化剪切线，达成黑白咬合最平衡的 Notan 状态'}
        </div>
        <div className="text-xs text-slate-400">
          {isGesture ? '基于 PCA 统计第一主成分真理线' : '基于黑白块面骨架二值化分割'}
        </div>
      </div>

      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasMainRef}
          width={ABSTRACTION_CANVAS_SIZE}
          height={ABSTRACTION_CANVAS_SIZE}
          className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
        />
      </div>
~~~~~
~~~~~typescript.new
  // =========================================================================
  // 视图 C：滑块/旋转连续调节视图 (GESTURE_AXIS / NOTAN_THRESHOLD)
  // =========================================================================
  const isGesture = mode === 'GESTURE_AXIS';
  const unit = isGesture ? '°' : '%';

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Eye className="w-3.5 h-3.5 text-indigo-600" />
          {isGesture
            ? '旋转主轴对齐粒子群动态流向 (0°~180°)'
            : '调节二值化剪切线，达成黑白最平衡的 Notan 状态'}
        </div>
      )}

      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasMainRef}
          width={ABSTRACTION_CANVAS_SIZE}
          height={ABSTRACTION_CANVAS_SIZE}
          className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
        />
      </div>
~~~~~

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
interface NegativeSpaceCanvasProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (val: number | 'A' | 'B' | Point) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
}
~~~~~
~~~~~typescript.new
interface NegativeSpaceCanvasProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (val: number | 'A' | 'B' | Point) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}
~~~~~

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
export function NegativeSpaceCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: NegativeSpaceCanvasProps) {
~~~~~
~~~~~typescript.new
export function NegativeSpaceCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: NegativeSpaceCanvasProps) {
~~~~~

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
  // =========================================================================
  // 模式 C：NEGATIVE_VERTEX_FITTING 负形反向还原顶点视图
  // =========================================================================
  if (isFitting) {
    return (
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            <Columns className="w-5 h-5 text-indigo-600" />
            观察负形留白被挤压的轮廓，点击确定右侧被隐藏的正形顶点
          </div>
          <p className="text-xs text-slate-400">
            左侧为完整剪影参考，右侧正形关键拐角被截断。请对比两侧负形空间形态，在右侧点阵中精准定位顶点。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full">
          {/* 左侧参考 Canvas */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              完整剪影参考
            </span>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={leftFittingRef}
                width={FITTING_CANVAS_SIZE}
                height={FITTING_CANVAS_SIZE}
                className="w-full max-w-[300px] aspect-square rounded-xl border border-slate-100 shadow-sm"
              />
            </div>
          </div>

          {/* 右侧互动做答 Canvas */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
              交互定点画布 (点击做答)
            </span>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={rightFittingRef}
                width={FITTING_CANVAS_SIZE}
                height={FITTING_CANVAS_SIZE}
                onClick={handleFittingClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label="右侧定点做答画布"
                onMouseMove={handleFittingMouseMove}
                onMouseLeave={() => setFittingHoverPoint(null)}
                className={`w-full max-w-[300px] aspect-square rounded-xl border border-slate-100 shadow-sm transition-all ${
                  disabled || showAnswer
                    ? 'cursor-default'
                    : fittingHoverPoint
                      ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
                      : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
                }`}
              />
            </div>
          </div>
        </div>
~~~~~
~~~~~typescript.new
  // =========================================================================
  // 模式 C：NEGATIVE_VERTEX_FITTING 负形反向还原顶点视图
  // =========================================================================
  if (isFitting) {
    return (
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
        {showCanvasHints && (
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            <Columns className="w-3.5 h-3.5 text-indigo-600" />
            对比左侧负形空间，在右侧点阵中点击定位被截断的顶点
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full">
          {/* 左侧参考 Canvas */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              完整剪影参考
            </span>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={leftFittingRef}
                width={FITTING_CANVAS_SIZE}
                height={FITTING_CANVAS_SIZE}
                className="w-full max-w-[300px] aspect-square rounded-xl border border-slate-100 shadow-sm"
              />
            </div>
          </div>

          {/* 右侧互动做答 Canvas */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
              交互定点画布 (点击定位)
            </span>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={rightFittingRef}
                width={FITTING_CANVAS_SIZE}
                height={FITTING_CANVAS_SIZE}
                onClick={handleFittingClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label="右侧定点做答画布"
                onMouseMove={handleFittingMouseMove}
                onMouseLeave={() => setFittingHoverPoint(null)}
                className={`w-full max-w-[300px] aspect-square rounded-xl border border-slate-100 shadow-sm transition-all ${
                  disabled || showAnswer
                    ? 'cursor-default'
                    : fittingHoverPoint
                      ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
                      : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
                }`}
              />
            </div>
          </div>
        </div>
~~~~~

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
  // =========================================================================
  // 模式 A：2AFC 负形面积二分判别视图
  // =========================================================================
  if (is2AFC) {
    const largerSide = question.largerSide;
    const isAHit = largerSide === 'A';
    const isBHit = largerSide === 'B';

    return (
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        {/* 提示文案 */}
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            <Columns className="w-5 h-5 text-indigo-600" />
            判别哪一侧的白色留白 (负形) 面积更大？
          </div>
          <p className="text-xs text-slate-400">
            按快捷键{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">
              1
            </kbd>{' '}
            选择 A，按{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">
              2
            </kbd>{' '}
            选择 B，或直接点击卡片
          </p>
        </div>

        {/* 左右双卡片对比区 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          {/* 卡片 A */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelectChoice('A')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isAHit
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selectedChoice === 'A'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selectedChoice === 'A'
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  A
                </span>
                区域 A (键 1)
              </span>
~~~~~
~~~~~typescript.new
  // =========================================================================
  // 模式 A：2AFC 负形面积二分判别视图
  // =========================================================================
  if (is2AFC) {
    const largerSide = question.largerSide;
    const isAHit = largerSide === 'A';
    const isBHit = largerSide === 'B';

    return (
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
        {showCanvasHints && (
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            <Columns className="w-3.5 h-3.5 text-indigo-600" />
            判别哪一侧的白色留白 (负形) 面积更大
          </div>
        )}

        {/* 左右双卡片对比区 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          {/* 卡片 A */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelectChoice('A')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isAHit
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selectedChoice === 'A'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selectedChoice === 'A'
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  1
                </span>
                区域 A
              </span>
~~~~~

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
          {/* 卡片 B */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelectChoice('B')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isBHit
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selectedChoice === 'B'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selectedChoice === 'B'
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  B
                </span>
                区域 B (键 2)
              </span>
~~~~~
~~~~~typescript.new
          {/* 卡片 B */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelectChoice('B')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isBHit
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selectedChoice === 'B'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selectedChoice === 'B'
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  2
                </span>
                区域 B
              </span>
~~~~~

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
  // =========================================================================
  // 模式 D：SHAPE_MATCH_2AFC 负形轮廓记忆匹配视图 (1:1 等大)
  // =========================================================================
  if (is2AfcMatch) {
    const isRevealed = showAnswer;
    const isTargetA = question.correctOptionIndex === 0;
    const isTargetB = question.correctOptionIndex === 1;

    const isSelectedA =
      selectedMatchChoice === 'A' ||
      userAnswer?.userChoice === 'A' ||
      userAnswer?.userChoiceIndex === 0;
    const isSelectedB =
      selectedMatchChoice === 'B' ||
      userAnswer?.userChoice === 'B' ||
      userAnswer?.userChoiceIndex === 1;

    return (
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            {matchPhase === 'stimulus' && !isRevealed
              ? '观察并瞬时记忆负形轮廓特征'
              : '匹配回忆：哪一侧与刚才展示完全相同？'}
          </div>
          <p className="text-xs text-slate-400">
            {matchPhase === 'stimulus' && !isRevealed
              ? `曝光记忆倒计时中 (${question.displayTimeMs}ms)`
              : '按快捷键 1 选择 A，按 2 选择 B，或直接点击卡片'}
          </p>
        </div>
~~~~~
~~~~~typescript.new
  // =========================================================================
  // 模式 D：SHAPE_MATCH_2AFC 负形轮廓记忆匹配视图 (1:1 等大)
  // =========================================================================
  if (is2AfcMatch) {
    const isRevealed = showAnswer;
    const isTargetA = question.correctOptionIndex === 0;
    const isTargetB = question.correctOptionIndex === 1;

    const isSelectedA =
      selectedMatchChoice === 'A' ||
      userAnswer?.userChoice === 'A' ||
      userAnswer?.userChoiceIndex === 0;
    const isSelectedB =
      selectedMatchChoice === 'B' ||
      userAnswer?.userChoice === 'B' ||
      userAnswer?.userChoiceIndex === 1;

    return (
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
        {showCanvasHints && (
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            {matchPhase === 'stimulus' && !isRevealed
              ? `瞬时记忆负形轮廓特征 (${question.displayTimeMs}ms)`
              : '匹配回忆：哪一侧与刚才展示完全相同？'}
          </div>
        )}
~~~~~

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
  // =========================================================================
  // 模式 B：单图滑块评估视图 (RATIO_ESTIMATION)
  // =========================================================================
  const { targetNegativeRatio, tolerance } = question;
  const activeVal = hoverVal !== null ? hoverVal : currentVal;

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 提示文案 */}
      <div className="text-center space-y-1">
        <div className="text-sm font-bold text-slate-800">
          估计白色背景（负形）占整幅画面的面积百分比
        </div>
        <div className="text-xs text-slate-400">黑色为正形主体，白色空隙为负形</div>
      </div>

      {/* 画布区域 */}
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={NEGATIVE_SPACE_CANVAS_SIZE}
          height={NEGATIVE_SPACE_CANVAS_SIZE}
          className="w-full max-w-[340px] aspect-square rounded-xl border border-slate-300 shadow-sm"
        />
      </div>
~~~~~
~~~~~typescript.new
  // =========================================================================
  // 模式 B：单图滑块评估视图 (RATIO_ESTIMATION)
  // =========================================================================
  const { targetNegativeRatio, tolerance } = question;
  const activeVal = hoverVal !== null ? hoverVal : currentVal;

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          估计白色留白 (负形) 占整幅画面的面积百分比
        </div>
      )}

      {/* 画布区域 */}
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={NEGATIVE_SPACE_CANVAS_SIZE}
          height={NEGATIVE_SPACE_CANVAS_SIZE}
          className="w-full max-w-[340px] aspect-square rounded-xl border border-slate-300 shadow-sm"
        />
      </div>
~~~~~

~~~~~act
patch_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript.old
interface RelativeColorCanvasProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  onAnswer: (userD: [number, number, number] | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
}

export function RelativeColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: RelativeColorCanvasProps) {
~~~~~
~~~~~typescript.new
interface RelativeColorCanvasProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  onAnswer: (userD: [number, number, number] | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
  showCanvasHints?: boolean;
}

export function RelativeColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: RelativeColorCanvasProps) {
~~~~~

~~~~~act
patch_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript.old
  // =========================================================================
  // 视图 A：DECONTEXTUAL_2AFC 环境穿透判别
  // =========================================================================
  if (mode === 'DECONTEXTUAL_2AFC') {
    const isAHit = question.largerPhysicalSide === 'A';
    const isBHit = question.largerPhysicalSide === 'B';

    const hexBgA = hsvToHex(...(question.bgLeft ?? [0, 0, 90]));
    const hexBgB = hsvToHex(...(question.bgRight ?? [0, 0, 10]));
    const hexCenterA = hsvToHex(...(question.centerColorA ?? [0, 0, 50]));
    const hexCenterB = hsvToHex(...(question.centerColorB ?? [0, 0, 50]));

    return (
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            <Eye className="w-5 h-5 text-indigo-600" />
            穿透背景视错觉：哪一侧的中心色块【物理明度更高】？
          </div>
          <p className="text-xs text-slate-400">
            按快捷键{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">
              1
            </kbd>{' '}
            选择 A，按{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">
              2
            </kbd>{' '}
            选择 B
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          {/* 卡片 A */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelect2Afc('A')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isAHit
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selected2AfcChoice === 'A'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selected2AfcChoice === 'A'
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  A
                </span>
                区域 A (键 1)
              </span>
              {showAnswer && (
                <span
                  className={`text-xs font-extrabold flex items-center gap-1 ${
                    isAHit ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {isAHit ? '物理明度更高' : '物理更暗'} (V: {question.centerColorA?.[2]}%)
                </span>
              )}
            </div>

            {/* 视口展示 */}
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
              style={{ backgroundColor: showAnswer ? '#808080' : hexBgA }}
            >
              <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterA }} />
            </div>
          </button>

          {/* 卡片 B */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelect2Afc('B')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isBHit
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selected2AfcChoice === 'B'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selected2AfcChoice === 'B'
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  B
                </span>
                区域 B (键 2)
              </span>
              {showAnswer && (
                <span
                  className={`text-xs font-extrabold flex items-center gap-1 ${
                    isBHit ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {isBHit ? '物理明度更高' : '物理更暗'} (V: {question.centerColorB?.[2]}%)
                </span>
              )}
            </div>

            {/* 视口展示 */}
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
              style={{ backgroundColor: showAnswer ? '#808080' : hexBgB }}
            >
              <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterB }} />
            </div>
          </button>
        </div>
~~~~~
~~~~~typescript.new
  // =========================================================================
  // 视图 A：DECONTEXTUAL_2AFC 环境穿透判别
  // =========================================================================
  if (mode === 'DECONTEXTUAL_2AFC') {
    const isAHit = question.largerPhysicalSide === 'A';
    const isBHit = question.largerPhysicalSide === 'B';

    const hexBgA = hsvToHex(...(question.bgLeft ?? [0, 0, 90]));
    const hexBgB = hsvToHex(...(question.bgRight ?? [0, 0, 10]));
    const hexCenterA = hsvToHex(...(question.centerColorA ?? [0, 0, 50]));
    const hexCenterB = hsvToHex(...(question.centerColorB ?? [0, 0, 50]));

    return (
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
        {showCanvasHints && (
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            穿透背景视错觉，判别哪一侧中心色块「客观物理明度更高」
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          {/* 卡片 A */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelect2Afc('A')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isAHit
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selected2AfcChoice === 'A'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selected2AfcChoice === 'A'
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  1
                </span>
                区域 A
              </span>
              {showAnswer && (
                <span
                  className={`text-xs font-extrabold flex items-center gap-1 ${
                    isAHit ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {isAHit ? '物理明度更高' : '物理更暗'} (V: {question.centerColorA?.[2]}%)
                </span>
              )}
            </div>

            {/* 视口展示 */}
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
              style={{ backgroundColor: showAnswer ? '#808080' : hexBgA }}
            >
              <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterA }} />
            </div>
          </button>

          {/* 卡片 B */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelect2Afc('B')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isBHit
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selected2AfcChoice === 'B'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selected2AfcChoice === 'B'
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  2
                </span>
                区域 B
              </span>
              {showAnswer && (
                <span
                  className={`text-xs font-extrabold flex items-center gap-1 ${
                    isBHit ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {isBHit ? '物理明度更高' : '物理更暗'} (V: {question.centerColorB?.[2]}%)
                </span>
              )}
            </div>

            {/* 视口展示 */}
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
              style={{ backgroundColor: showAnswer ? '#808080' : hexBgB }}
            >
              <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterB }} />
            </div>
          </button>
        </div>
~~~~~

~~~~~act
patch_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript.old
  // =========================================================================
  // 视图 B：阿尔伯斯诱导补偿模式 (LIGHTNESS_INDUCTION / HUE_INDUCTION)
  // =========================================================================
  if (mode === 'LIGHTNESS_INDUCTION' || mode === 'HUE_INDUCTION') {
    const isLightnessMode = mode === 'LIGHTNESS_INDUCTION';

    const bgLeftHex = hsvToHex(...(question.bgLeft ?? [0, 0, 100]));
    const bgRightHex = hsvToHex(...(question.bgRight ?? [0, 0, 0]));
    const centerLeftHex = hsvToHex(...(question.targetLeftCenter ?? [0, 0, 50]));

    const userRightHex = hsvToHex(userRightH, userRightS, userRightV);
    const idealRightHex = hsvToHex(...(question.idealRightCenter ?? question.targetD));

    const rightSatGradient = `linear-gradient(to right, ${hsvToHex(userRightH, 0, userRightV)}, ${hsvToHex(userRightH, 100, userRightV)})`;
    const rightValGradient = `linear-gradient(to right, #000000, ${hsvToHex(userRightH, 100, 100)})`;
    const hueGradient =
      'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';

    return (
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            {isLightnessMode ? '阿尔伯斯明度反差补偿' : '阿尔伯斯补色残像调和'}
          </div>
          <p className="text-xs text-slate-400">
            {isLightnessMode
              ? '调整右侧中心色块的物理明度，使得左右两块在不同背景下【感知明度看起来完全一致】。'
              : '调整右侧中心色块的色相与饱和度，反向补偿背景诱导，达成视觉感知色差调和。'}
          </p>
        </div>

        {/* 左右双背景对照视口 (带中间安全隔离带) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          {/* 左侧固定参考 */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              左侧参考 (固定基准)
            </span>
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
              style={{ backgroundColor: bgLeftHex }}
            >
              <div
                className="w-16 h-16 rounded-xl transition-all"
                style={{ backgroundColor: centerLeftHex }}
              />
            </div>
          </div>

          {/* 右侧作答与调制 */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              右侧作答 (调制以达成感知一致)
            </span>
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
              style={{ backgroundColor: bgRightHex }}
            >
              <div
                className="w-16 h-16 rounded-xl transition-all relative overflow-hidden"
                style={{ backgroundColor: userRightHex }}
              >
                {showAnswer && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1/2"
                    style={{ backgroundColor: idealRightHex }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
~~~~~
~~~~~typescript.new
  // =========================================================================
  // 视图 B：阿尔伯斯诱导补偿模式 (LIGHTNESS_INDUCTION / HUE_INDUCTION)
  // =========================================================================
  if (mode === 'LIGHTNESS_INDUCTION' || mode === 'HUE_INDUCTION') {
    const isLightnessMode = mode === 'LIGHTNESS_INDUCTION';

    const bgLeftHex = hsvToHex(...(question.bgLeft ?? [0, 0, 100]));
    const bgRightHex = hsvToHex(...(question.bgRight ?? [0, 0, 0]));
    const centerLeftHex = hsvToHex(...(question.targetLeftCenter ?? [0, 0, 50]));

    const userRightHex = hsvToHex(userRightH, userRightS, userRightV);
    const idealRightHex = hsvToHex(...(question.idealRightCenter ?? question.targetD));

    const rightSatGradient = `linear-gradient(to right, ${hsvToHex(userRightH, 0, userRightV)}, ${hsvToHex(userRightH, 100, userRightV)})`;
    const rightValGradient = `linear-gradient(to right, #000000, ${hsvToHex(userRightH, 100, 100)})`;
    const hueGradient =
      'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';

    return (
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
        {showCanvasHints && (
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            {isLightnessMode ? (
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-purple-600" />
            )}
            {isLightnessMode
              ? '调节右侧中心明度，使左右两块视觉感知看起来完全一致'
              : '调节右侧中心色彩，反向补偿背景诱导达成视觉感知一致'}
          </div>
        )}

        {/* 左右双背景对照视口 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          {/* 左侧固定参考 */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              左侧固定基准
            </span>
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
              style={{ backgroundColor: bgLeftHex }}
            >
              <div
                className="w-16 h-16 rounded-xl transition-all"
                style={{ backgroundColor: centerLeftHex }}
              />
            </div>
          </div>

          {/* 右侧作答与调制 */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
              右侧调制区 (达成感知一致)
            </span>
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
              style={{ backgroundColor: bgRightHex }}
            >
              <div
                className="w-16 h-16 rounded-xl transition-all relative overflow-hidden"
                style={{ backgroundColor: userRightHex }}
              >
                {showAnswer && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1/2"
                    style={{ backgroundColor: idealRightHex }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
~~~~~

~~~~~act
patch_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript.old
  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 对比展示区 (2x2 网格: 上 A -> B，下 C -> D) */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 w-full flex flex-col items-center gap-4">
        {/* 上排: 基准推移组 (A -> B) */}
        <div className="flex items-center justify-center gap-4">
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexA }}
          />
          <ArrowRight className="w-5 h-5 text-indigo-400" />
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexB }}
          />
        </div>

        {/* 下排: 目标推移组 (C -> D) */}
        <div className="flex items-center justify-center gap-4">
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexC }}
          />
          <ArrowRight className="w-5 h-5 text-indigo-400" />
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md transition-all duration-150 relative overflow-hidden"
            style={{ backgroundColor: hexSelectedD }}
          >
            {showAnswer && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1/2"
                style={{ backgroundColor: hexTargetD }}
              />
            )}
          </div>
        </div>
      </div>
~~~~~
~~~~~typescript.new
  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          观察上方 A➔B 色彩推移，在候选区选出符合 C➔D 的同向推移色
        </div>
      )}

      {/* 对比展示区 (2x2 网格: 上 A -> B，下 C -> D) */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 w-full flex flex-col items-center gap-3">
        {/* 上排: 基准推移组 (A -> B) */}
        <div className="flex items-center justify-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexA }}
          />
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexB }}
          />
        </div>

        {/* 下排: 目标推移组 (C -> D) */}
        <div className="flex items-center justify-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexC }}
          />
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md transition-all duration-150 relative overflow-hidden"
            style={{ backgroundColor: hexSelectedD }}
          >
            {showAnswer && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1/2"
                style={{ backgroundColor: hexTargetD }}
              />
            )}
          </div>
        </div>
      </div>
~~~~~

### 下一步建议
1. 执行本计划以完成画布文字极简重构与指引开关。
2. 验证各模块在开启与关闭指引两种模式下的沉浸体验与流畅度。
