为了让色感训练看板中的“明度 (Value)”和“饱和度 (Saturation)”模式拥有更贴切、直观的视觉符号，我们将使用 `lucide-preact` 中更具代表性的图标进行替换：
- **明度 (Value)**：由旋转图标改为 **`Sun` (太阳/明亮)** 或 **`Moon` (明暗层次)**，在此我们采用 **`Sun`** 来直观表现明度与光影。
- **饱和度 (Saturation)**：由旋转图标改为 **`Droplet` (水滴/色彩纯度)** 或 **`Sliders`**，在此采用 **`Droplet`** 来形象地代表色彩的浓郁与纯度。

下面是更新计划：

---

### [WIP] feat(ui): 为明度与饱和度使用更合适的图标

### 用户需求
色感训练看板中，“明度 (Value)”与“饱和度 (Saturation)”目前均沿用了旋转图标 (`RotateCw`)，不够直观。需要分别替换为更能表现光影明暗与色彩纯度的图标 (`Sun` 与 `Droplet`)。

### 评论
通过使用更加语义化的图标，可以显著提升应用界面的辨识度与精致感，优化用户的视觉体验。

### 目标
1. 修改 `src/views/ColorDashboard.tsx`。
2. 引入 `Sun` 和 `Droplet` 图标。
3. 根据色彩子模式（`H`、`V`、`S`）动态渲染对应的图标（色相用 `RotateCw`，明度用 `Sun`，饱和度用 `Droplet`）。

### 基本原理
利用 `lucide-preact` 提供的图标库，并在 `COLOR_MODES_CONFIG` 或组件内部根据模式分发不同的图标组件进行渲染，实现精准匹配。

### 标签
#intent/build #flow/ready #priority/low #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/color-dashboard-icons #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 修改 ColorDashboard.tsx 引入并替换图标

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript.old
import { Award, Play, RotateCw, Sliders, Target, TrendingUp } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import type { ColorMode } from '../utils/colorUtils';
import { type ColorProfileData, getAllColorTrialRecords } from '../utils/db';

interface ColorDashboardProps {
  profiles: Record<ColorMode, ColorProfileData | null>;
  onStart: (mode: ColorMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
}

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
~~~~~typescript.new
import { Award, Droplet, Play, RotateCw, Sliders, Sun, Target, TrendingUp } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import type { ColorMode } from '../utils/colorUtils';
import { type ColorProfileData, getAllColorTrialRecords } from '../utils/db';

interface ColorDashboardProps {
  profiles: Record<ColorMode, ColorProfileData | null>;
  onStart: (mode: ColorMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
}

const COLOR_MODES_CONFIG: Array<{
  id: ColorMode;
  title: string;
  desc: string;
  icon: typeof RotateCw;
}> = [
  {
    id: 'H',
    title: '色相 (Hue)',
    desc: '识别颜色在色相环上的具体角度 (0°~360°)',
    icon: RotateCw,
  },
  {
    id: 'V',
    title: '明度 (Value)',
    desc: '已知色相，评估颜色的素描明暗程度 (0%~100%)',
    icon: Sun,
  },
  {
    id: 'S',
    title: '饱和度 (Sat)',
    desc: '已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)',
    icon: Droplet,
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
                  <div className="text-right">
~~~~~
~~~~~typescript.new
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    <config.icon className="w-6 h-6" />
                  </div>
                  <div className="text-right">
~~~~~

### 下一步建议

我们已经成功将明度与饱和度模式的图标替换为更具视觉直观性的 `Sun` 与 `Droplet`。建议运行项目进行视觉走查，确认图标在各项卡片中的显示效果符合预期。
