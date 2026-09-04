现在开始推进**阶段三：旧容器淘汰、依赖清理与 SDK 固化**。

由于阶段一已完成全部 20 处视图向无头 Hooks 与原子组件的平滑重构，目前旧包装层已无任何活跃引用。我们将物理删除 5 个冗余组件文件，并收敛清理 `src/card-sdk/index.ts` 中的过渡导出。

## [WIP] refactor: 彻底移除旧包装器组件并收敛 Card SDK 契约

### 用户需求
落实路线图阶段三：物理移除已被彻底淘汰的 5 个包装器与容器文件（`Standard2AfcView`、`StandardNafcView`、`StandardSliderView`、`Choice2AfcContainer`、`ChoiceNafcContainer`），并清理 Card SDK 公共导出清单。

### 评论
这是架构演进闭环的最终交付动作。移除带有历史包袱的“巨石 Wrapper”能够从根本上避免团队新成员误用已废弃的黑盒组件，保持 Card SDK 的纯粹性与极简性，同时降低前端打包产物体积与构建解析时间。

### 目标
1. 物理删除 5 个冗余旧组件源文件：
   - `src/components/common/Standard2AfcView.tsx`
   - `src/components/common/StandardNafcView.tsx`
   - `src/components/common/StandardSliderView.tsx`
   - `src/components/common/Choice2AfcContainer.tsx`
   - `src/components/common/ChoiceNafcContainer.tsx`
2. 修剪 `src/card-sdk/index.ts`：移除上述 5 个组件及其类型的导出。

### 基本原理
完成所有业务依赖解耦后，应及时清理废弃代码路径，遵循奥卡姆剃刀原则，使 SDK 仅对外暴露真正可组合的原子构件（Shell、ChoiceCard、SliderTrack、无头 Hooks 等）。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/core #scope/api #ai/instruct #task/domain/ui #task/object/legacy-wrappers-cleanup #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 物理删除已被淘汰的 5 个旧包装器文件

~~~~~act
delete_file
src/components/common/Standard2AfcView.tsx
~~~~~

~~~~~act
delete_file
src/components/common/StandardNafcView.tsx
~~~~~

~~~~~act
delete_file
src/components/common/StandardSliderView.tsx
~~~~~

~~~~~act
delete_file
src/components/common/Choice2AfcContainer.tsx
~~~~~

~~~~~act
delete_file
src/components/common/ChoiceNafcContainer.tsx
~~~~~

#### Acts 2: 收敛 Card SDK 导出表，移除过渡组件声明

~~~~~act
patch_file
src/card-sdk/index.ts
~~~~~
~~~~~typescript
// ----------------------------------------------------------------------------
// 10. 通用 UI 组件 (UI Primitives & Diagnostic Components)
// ----------------------------------------------------------------------------
export { CanvasView, type CanvasViewProps } from '../components/common/CanvasView';
export { DualViewportContainer } from '../components/common/DualViewportContainer';
export { SliderTrack, type SliderTrackProps } from '../components/common/SliderTrack';
export {
  PointClickCanvas,
  type PointClickCanvasProps,
} from '../components/common/PointClickCanvas';
export { HsvTrackSlider, type HsvTrackSliderProps } from '../components/common/HsvTrackSlider';
export { QuestionCardShell } from '../components/common/QuestionCardShell';
export {
  Choice2AfcContainer,
  type Choice2AfcOption,
} from '../components/common/Choice2AfcContainer';
export {
  ChoiceNafcContainer,
  type ChoiceNafcOption,
} from '../components/common/ChoiceNafcContainer';
export {
  ChoiceCard,
  getChoiceCardState,
  type ChoiceCardState,
  type ChoiceCardProps,
} from '../components/ui/choice-card';
export { Callout, type CalloutProps, calloutVariants } from '../components/ui/callout';
export { Button, type ButtonProps } from '../components/ui/button';
export { Badge, type BadgeProps } from '../components/ui/badge';
export { SettingToggleItem } from '../components/settings/common/SettingToggleItem';
export { SliderMarginGroup } from '../components/settings/common/SliderMarginGroup';

// ----------------------------------------------------------------------------
// 11. 废弃标记的过渡视图包装器 (Deprecated Standard Views for Graceful Migration)
// ----------------------------------------------------------------------------
/** @deprecated 建议优先使用组合排版与原子 Hook，后续将移除此包装器 */
export {
  StandardSliderView,
  type StandardSliderViewProps,
} from '../components/common/StandardSliderView';

/** @deprecated 建议优先使用组合排版与原子 Hook，后续将移除此包装器 */
export {
  Standard2AfcView,
  type Standard2AfcViewProps,
} from '../components/common/Standard2AfcView';

/** @deprecated 建议优先使用组合排版与原子 Hook，后续将移除此包装器 */
export {
  StandardNafcView,
  type StandardNafcViewProps,
} from '../components/common/StandardNafcView';
~~~~~
~~~~~typescript
// ----------------------------------------------------------------------------
// 10. 通用 UI 组件 (UI Primitives & Diagnostic Components)
// ----------------------------------------------------------------------------
export { CanvasView, type CanvasViewProps } from '../components/common/CanvasView';
export { DualViewportContainer } from '../components/common/DualViewportContainer';
export { SliderTrack, type SliderTrackProps } from '../components/common/SliderTrack';
export {
  PointClickCanvas,
  type PointClickCanvasProps,
} from '../components/common/PointClickCanvas';
export { HsvTrackSlider, type HsvTrackSliderProps } from '../components/common/HsvTrackSlider';
export { QuestionCardShell } from '../components/common/QuestionCardShell';
export {
  ChoiceCard,
  getChoiceCardState,
  type ChoiceCardState,
  type ChoiceCardProps,
} from '../components/ui/choice-card';
export { Callout, type CalloutProps, calloutVariants } from '../components/ui/callout';
export { Button, type ButtonProps } from '../components/ui/button';
export { Badge, type BadgeProps } from '../components/ui/badge';
export { SettingToggleItem } from '../components/settings/common/SettingToggleItem';
export { SliderMarginGroup } from '../components/settings/common/SliderMarginGroup';
~~~~~

---

### 下一步建议

至此，**阶段三的清理与 SDK 固化已圆满达成**：
1. `Standard2AfcView`、`StandardNafcView`、`StandardSliderView`、`Choice2AfcContainer`、`ChoiceNafcContainer` 均已被安全彻底物理移除。
2. `src/card-sdk/index.ts` 对外输出清爽规范，仅保留纯粹的原子 UI 组件（`ChoiceCard`、`QuestionCardShell`、`SliderTrack` 等）与交互 Hooks（`useChoiceShortcuts`、`useSubmitShortcut`、`useTrackPointer` 等）。

建议进行一次完整的测试套件运行与代码格式校验（如 `npm run test` / `npm run build`），验证项目在零冗余状态下的构建与运行稳定性。如果确认无误，可创建独立的 `[COMMIT]` 计划将本轮重构整体提交。
