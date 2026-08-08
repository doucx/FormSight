没问题，我将删除色感识别看板（`ColorDashboard.tsx`）和寻星练习看板（`Dashboard.tsx`）中所有训练模式卡片右上角的英文标签（如 `Hue Sensing`、`Single Anchor` 等）。

## [WIP] refactor: 移除寻星与色感卡片右上角的英文标签

### 用户需求

删除所有卡片（包括色感识别和寻星练习）右上角的英文内容（如 Hue Sensing）。

### 评论

卡片右上角原有的英文 Badge 元素主要是装饰性质。移除后能够减少页面中的杂余文本，使界面更加简洁统一，提升用户的视觉体验。

### 目标

1. 从 `ColorDashboard.tsx` 的卡片配置数据中清理 `subtitle` 与 `badgeColor` 字段，并在渲染部分移除对应的右上角英文 Badge 标签。
2. 从 `Dashboard.tsx` 的卡片配置数据中清理 `subtitle` 与 `badgeColor` 字段，并在渲染部分移除对应的右上角英文 Badge 标签。

### 基本原理

通过精简 `COLOR_MODES_CONFIG` 和 `MODES_CONFIG` 配置对象结构，直接切除无用的 Badge 属性并修改 DOM 节点渲染结构，避免无用代码留存。

### 标签

#intent/refine #flow/ready #priority/low #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/card-badges #task/action/cleanup #task/state/begin

---

### Script

#### Acts 1: 清理 `ColorDashboard.tsx` 中的卡片英文标签

从 `COLOR_MODES_CONFIG` 移除 `subtitle` 与 `badgeColor` 字段，并更新 JSX 结构。

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript.old
const COLOR_MODES_CONFIG: Array<{
  id: ColorMode;
  title: string;
  subtitle: string;
  desc: string;
  badgeColor: string;
}> = [
  {
    id: 'H',
    title: '色相 (Hue)',
    subtitle: 'Hue Sensing',
    desc: '识别颜色在色相环上的具体角度 (0°~360°)',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    id: 'V',
    title: '明度 (Value)',
    subtitle: 'Value Contrast',
    desc: '已知色相，评估颜色的素描明暗程度 (0%~100%)',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    id: 'S',
    title: '饱和度 (Sat)',
    subtitle: 'Saturation Perception',
    desc: '已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
];
~~~~~
~~~~~typescript.new
const COLOR_MODES_CONFIG: Array<{
  id: ColorMode;
  title: string;
  desc: string;
}> = [
  {
    id: 'H',
    title: '色相 (Hue)',
    desc: '识别颜色在色相环上的具体角度 (0°~360°)',
  },
  {
    id: 'V',
    title: '明度 (Value)',
    desc: '已知色相，评估颜色的素描明暗程度 (0%~100%)',
  },
  {
    id: 'S',
    title: '饱和度 (Sat)',
    desc: '已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)',
  },
];
~~~~~

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript.old
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    <RotateCw className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${config.badgeColor}`}
                  >
                    {config.subtitle}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{config.title}</h3>
~~~~~
~~~~~typescript.new
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    <RotateCw className="w-6 h-6" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{config.title}</h3>
~~~~~

#### Acts 2: 清理 `Dashboard.tsx` 中的卡片英文标签

从 `MODES_CONFIG` 移除 `subtitle` 与 `badgeColor` 字段，并更新 JSX 结构。

~~~~~act
patch_file
src/views/Dashboard.tsx
~~~~~
~~~~~typescript.old
const MODES_CONFIG: Array<{
  id: TrainingMode;
  title: string;
  subtitle: string;
  desc: string;
  icon: typeof Compass;
  badgeColor: string;
}> = [
  {
    id: 'single',
    title: '单锚点模式',
    subtitle: 'Single Anchor',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
    icon: Target,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'double_h',
    title: '水平双锚点',
    subtitle: 'Double Horiz',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
    icon: Crosshair,
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: 'double_r',
    title: '旋转双锚点',
    subtitle: 'Double Rotated',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
    icon: RotateCw,
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
];
~~~~~
~~~~~typescript.new
const MODES_CONFIG: Array<{
  id: TrainingMode;
  title: string;
  desc: string;
  icon: typeof Compass;
}> = [
  {
    id: 'single',
    title: '单锚点模式',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
    icon: Target,
  },
  {
    id: 'double_h',
    title: '水平双锚点',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
    icon: Crosshair,
  },
  {
    id: 'double_r',
    title: '旋转双锚点',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
    icon: RotateCw,
  },
];
~~~~~

~~~~~act
patch_file
src/views/Dashboard.tsx
~~~~~
~~~~~typescript.old
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${config.badgeColor}`}
                  >
                    {config.subtitle}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{config.title}</h3>
~~~~~
~~~~~typescript.new
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-6 h-6" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{config.title}</h3>
~~~~~

### 下一步建议

- 可在终端执行 `npm run check`，确保重构后代码符合 TypeScript 类型审查与 Biome 格式约束。
