# [WIP] feat(ui): 支持点击模糊背景关闭训练总结弹窗并返回主页

### 用户需求
用户希望在完成训练或基准测试后弹出的“训练总结与成果”页面中，点击弹窗四周的模糊背景区域（Overlay）时，能够自动触发关闭弹窗并返回主页的操作，提升交互的便捷性。

### 评论
当前其他模态框（如全局设置、偏好设置、弱点分析等）均已支持点击遮罩层关闭，为“训练总结与成果”弹窗补齐这一交互行为能够保持全应用交互体验的一致性。

### 目标
1. 修改 `src/components/SessionSummaryModal.tsx`。
2. 为外层的固定全屏容器添加点击遮罩层关闭（`onClick` 判断是否点中背景）以及键盘无障碍支持（`Escape` 键）。
3. 确保点击弹窗卡片内容区域时不会误触发关闭。

### 基本原理
参照同类模态框（如 `GlobalSettingsModal.tsx`），通过判断 `e.target === e.currentTarget` 来安全地捕获对背景遮罩层的点击，同时支持 `Escape` 键快捷关闭，增强可用性与无障碍支持。

### 标签
#intent/build #flow/ready #priority/medium #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/session-summary-modal #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 为 SessionSummaryModal 增加遮罩层点击关闭与快捷键支持

~~~~~act
patch_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~typescript.old
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
~~~~~
~~~~~typescript.new
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Escape' || e.key === 'Enter')) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
~~~~~

### 下一步建议

我们已经为 `SessionSummaryModal` 添加了点击模糊背景和按下 `Escape` 键关闭并返回主页的功能。如果你对该实现满意，可以生成一个提交计划来固化此次改进。
