好的，我理解您的需求。因为原生的鼠标指针（如十字光标）会挡住下方极小的圆点，影响视觉判断，因此可以在**鼠标靠近并选中某个网格点感应区时，通过样式自动将系统鼠标指针隐藏（设置为 `cursor-none`）**。

这样页面上就只保留 Canvas 自渲染的蓝紫色高亮指示点（提示），彻底消除光标遮挡问题，提升点击精准度。

下面是为您生成的 Quipu 执行计划：

## [WIP] feat: 鼠标靠近网格点时隐藏系统光标

### 用户需求
鼠标光标会遮挡感应点，导致高难度关卡下难以点击。需要当鼠标靠近网格点时自动透明隐藏原生指针，仅保留 Canvas 内部的高亮提示点。

### 评论
这是一个非常优雅且直观的交互改进。利用 Tailwind 的 `cursor-none` 配合 Canvas 已有的 `hoverPoint` 状态，能够无缝达成“靠近吸附即隐藏指针、移开恢复指针”的效果。

### 目标
在 `src/components/StarCanvas.tsx` 中，根据 `hoverPoint` 状态动态控制右侧 Canvas 的 CSS 样式类：当 `hoverPoint` 存在时切换为 `cursor-none`；远离时恢复 `cursor-crosshair`。

### 基本原理
当鼠标移动到网格点感应范围内时，`hoverPoint` 状态生效，触发 `cursor-none` 样式隐藏系统默认光标。此时 Canvas 图层 1.5 中已绘制的高亮圈为用户提供精确的无遮挡位置视觉反馈。

### 标签
#intent/refine #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/hover-cursor #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 在 `StarCanvas.tsx` 中根据 `hoverPoint` 动态设置 `cursor-none`

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript.old
          className={`w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
          }`}
~~~~~
~~~~~typescript.new
          className={`w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : hoverPoint
                ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
                : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
          }`}
~~~~~

### 下一步建议
1. 刷新应用测试，将鼠标移至右侧做答区域网格点上方，确认鼠标指针在接近点时自动消失，仅显示蓝紫色高亮点。
2. 体验移开网格点时指针恢复显示，以及点击答题时的顺畅体验。
