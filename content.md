我们将所有透视空间感知卡片标注为实验性卡片。

## [COMMIT] feat(perspective): 将透视扩展包的所有训练卡片标注为实验性卡片

### 用户需求
用户要求将 `perspective` 扩展包中的全部 4 张训练卡片（透视灭点汇聚感、平面比例与黄金分割盲切、断线完形连续性辨识、3D 结构空间翻转）统一标注为实验性卡片（`isExperimental: true`）。

### 评论
将新引入的高级空间几何与透视感知卡片设为实验性卡片，可以在主界面中受控于用户的“显示实验性卡片”开关，便于进行平稳的灰度测试与体验迭代。

### 目标
1. 修改 `src/packs/perspective/index.ts` 中 `perspectiveCards` 的定义，为每张卡片增加 `isExperimental: true` 属性。

### 基本原理
通过在 `CardDefinition` 中配置 `isExperimental = true`，系统会在查询卡片时根据用户的全局设置（`showExperimentalCards`）进行过滤，确保符合实验特性。

### 标签
#intent/tune #flow/ready #priority/medium #comp/cli #concept/config #scope/dx #ai/instruct #task/domain/geometry #task/object/perspective-pack #task/action/refactor #task/state/end

---

### Script

#### Acts 1: 更新透视扩展包清单中的卡片定义为实验性卡片

~~~~~act
patch_file
src/packs/perspective/index.ts
~~~~~
~~~~~typescript
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
      target: ['geometry', 'perspective'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['continuous_slider'],
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
      target: ['geometry', 'perspective'],
      skill: ['proportion', 'spatial_orientation'],
      interaction: ['point_click'],
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
      target: ['geometry', 'perspective'],
      skill: ['illusion_invariance', 'spatial_orientation'],
      interaction: ['choice_2afc'],
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
      target: ['geometry', 'perspective'],
      skill: ['spatial_orientation', 'visual_memory'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: false,
  },
];
~~~~~
~~~~~typescript
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
      target: ['geometry', 'perspective'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
    isExperimental: true,
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
      target: ['geometry', 'perspective'],
      skill: ['proportion', 'spatial_orientation'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: false,
    isExperimental: true,
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
      target: ['geometry', 'perspective'],
      skill: ['illusion_invariance', 'spatial_orientation'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
    isExperimental: true,
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
      target: ['geometry', 'perspective'],
      skill: ['spatial_orientation', 'visual_memory'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: false,
    isExperimental: true,
  },
];
~~~~~

### 下一步建议
我们已经成功将所有透视感知训练卡片标记为实验性卡片。您可以在设置中开启“显示实验性卡片”来在主界面中加载和体验它们。
