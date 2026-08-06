没问题，我们将在设置弹窗的最外层背景遮罩上绑定点击关闭事件，同时在设置主体卡片上阻止事件冒泡。这样用户点击设置卡片以外的半透明背景区域时就能直接退出设置界面。

## [WIP] feat(settings): 支持点击背景遮罩区域直接退出设置界面

### 用户需求
在设置界面中，用户无需点击“完成”或右上角的“X”按钮，直接点击设置卡片之外的背景区域即可退出该界面。

### 评论
为 Modal 弹窗提供点击 Backdrop 区域退出的交互符合现代 Web 的主流 UX 规范，能进一步提升快捷操作体验。

### 目标
1. 为 `SettingsModal` 的最外层半透明遮罩 `div` 绑定 `onClick={onClose}`。
2. 为设置卡片容器 `div` 添加 `onClick={(e) => e.stopPropagation()}` 阻止冒泡，避免点击设置卡片内部控件时误触关闭。

### 基本原理
利用 DOM 事件冒泡机制，当用户点击 modal 内部元素时，通过 `e.stopPropagation()` 终止事件向上传播；而当用户直接点击 modal 外部的 backdrop 区域时，事件成功向上冒泡并触发外层 `div` 的 `onClose()` 回调，实现直观便捷的点击外部退出体验。

### 标签
#intent/build #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/settings-modal #task/action/backdrop-click-close #task/state/begin

---

### Script

#### Acts 1: 为 `SettingsModal.tsx` 增加点击背景遮罩退出功能

我们将通过 `patch_file` 给 `SettingsModal.tsx` 的最外层遮罩元素添加 `onClick` 处理器，并在卡片主体容器上阻止冒泡。

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~tsx
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-150 my-auto">
~~~~~
~~~~~tsx
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
~~~~~

### 下一步建议
1. **测试体验**: 启动 `npm run dev`，打开设置界面，尝试点击卡片外部的暗色模糊背景，验证设置界面是否平滑退出。
2. **其它 Modal 统一性**: 检查 `AnalyticsModal` 或 `SessionSummaryModal` 是否也需要同步支持点击背景遮罩退出的交互逻辑。
