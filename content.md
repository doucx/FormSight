我们将 `SliderTrack` 的交互悬停状态由 `cursor-pointer` 修改为 `cursor-none`，与已支持无指针观察的 `HsvTrackSlider` 保持体验一致。这样在连续拖动或悬停滑块进行微观势线与特征观察时，光标不会遮挡画面关键像素。

## [WIP] style: 将 SliderTrack 悬停光标样式修改为 cursor-none

### 用户需求
在滑块交互区域悬停与调节时隐藏系统鼠标指针（应用 `cursor-none` 样式），防止默认指针阻挡用户对图形微小形变、角度与流向的观察。

### 评论
这是一个对感知训练卡片体验至关重要的细节优化。在进行势线判断或微小量值微调时，箭头指针会占据局部视觉中心并造成信息遮挡；通过将滑块交互容器的光标样式设置为 `cursor-none`，配合滑块自带的高亮准心/指示线，可以提供不受遮挡的沉浸式观察环境。

### 目标
1. 修改 `src/components/common/SliderTrack.tsx` 中的外层交互容器样式。
2. 将非禁用且未揭晓答案状态下的光标类名由 `cursor-pointer` 调整为 `cursor-none`。

### 基本原理
`HsvTrackSlider` 已经遵循了该无指针规范（`!showAnswer && !disabled ? 'cursor-none' : 'cursor-default'`）。`SliderTrack` 作为通用连续量调节基元，同样在外层包络容器中接收指针事件，将其调整为 `cursor-none` 可以保持整套卡片组件库在悬停调节行为上的一致性。

### 标签
#intent/tune #flow/ready #priority/medium
#comp/ui #concept/ui #scope/ux
#ai/instruct
#task/domain/ui #task/object/slider-cursor #task/action/tune
#task/state/begin

---

### Script

#### Acts 1: 更新 SliderTrack 的悬停光标样式

将未揭晓且未禁用状态下的指针由 `cursor-pointer` 调整为 `cursor-none`。

~~~~~act
patch_file
src/components/common/SliderTrack.tsx
~~~~~
~~~~~old
      className={`relative flex-1 flex items-center select-none touch-none ${
        !showAnswer && !disabled ? 'cursor-pointer' : 'cursor-default'
      } ${className}`}
~~~~~
~~~~~new
      className={`relative flex-1 flex items-center select-none touch-none ${
        !showAnswer && !disabled ? 'cursor-none' : 'cursor-default'
      } ${className}`}
~~~~~

### 下一步建议
1. 在浏览器中打开包含滑块题型的卡片（如 `abs_gesture_axis`），测试鼠标移入滑块感应区以及拖拽过程中光标是否顺利隐去。
2. 确认在移动端/触屏设备上该样式调整不会影响触摸滑动与跟手体验。
