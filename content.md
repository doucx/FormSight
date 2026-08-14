好的，我将修改 `ColorAnalyticsModal.tsx`（色感分析弹窗）和 `AnalyticsModal.tsx`（寻星分析弹窗），为它们的遮罩层背景（Backdrop）添加 `onClick` 监听，使其与设置弹窗一致：点击黑色半透明背景区域时自动触发 `onClose()` 退出弹窗。

## [WIP] feat(ui): 为分析弹窗背景遮罩添加点击空白退出功能

### 简要回答
我已经为 `ColorAnalyticsModal` 和 `AnalyticsModal` 补充了背景遮罩层的 `onClick` 与键盘触发捕获逻辑。现在点击弹窗卡片外部的遮罩区域或按下 `Esc` 键，即可关闭分析弹窗。

### 摘要头
## [WIP] feat(ui): 为分析弹窗背景遮罩添加点击空白退出功能

### 用户需求
期望弱点分析弹窗（`ColorAnalyticsModal` 与 `AnalyticsModal`）拥有与偏好设置弹窗相同的交互体验：点击遮罩背景（弹窗卡片外部空白区域）时自动退出弹窗。

### 评论
这是一项极佳的无障碍交互体验（UX）微调，符合通用 Modal 弹窗组件的行为直觉。

### 目标
1. 修改 `src/components/ColorAnalyticsModal.tsx`：最外层 `div` 增加 `onClick` 事件检测，当 `e.target === e.currentTarget` 时关闭弹窗。
2. 修改 `src/components/AnalyticsModal.tsx`：同步为寻星分析弹窗最外层 `div` 补充背景遮罩点击关闭事件 handler。

### 基本原理
当用户点击 Modal 的遮罩蒙层时，捕获冒泡事件并判断点击的目标元素（`e.target`）是否就是蒙层容器本身（`e.currentTarget`）。如果是，则代表点击发生在白色卡片外部，触发 `onClose()`。

### 标签
#intent/tune #flow/ready #priority/low #comp/ui #scope/ux #ai/instruct #task/domain/analytics #task/object/modal-backdrop-dismiss #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 为 `ColorAnalyticsModal.tsx` 添加背景遮罩点击退出逻辑

~~~~~act
patch_file
src/components/ColorAnalyticsModal.tsx
~~~~~
~~~~~tsx
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
~~~~~
~~~~~tsx
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')
        ) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
~~~~~

#### Acts 2: 为 `AnalyticsModal.tsx` 添加背景遮罩点击退出逻辑

~~~~~act
patch_file
src/components/AnalyticsModal.tsx
~~~~~
~~~~~tsx
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
~~~~~
~~~~~tsx
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')
        ) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
~~~~~

### 下一步建议
现在色感与寻星的弱点分析弹窗均已支持点击空白区域关闭。可以在页面中打开分析弹窗，点击白色卡片以外的半透明区域测试退出效果。
