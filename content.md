## [WIP] fix(settings): 修复 Biome 检查中的无障碍键盘事件缺失错误

### 错误分析

在 `SettingsModal.tsx` 中为 backdrop `div` 增加了 `onClick={onClose}` 以及在 modal 主体 `div` 上增加了 `onClick={(e) => e.stopPropagation()}` 后，`npm run check` 触发了 Biome linter 的 `a11y/useKeyWithClickEvents` 规则错误：

```
./src/components/SettingsModal.tsx:69:5 lint/a11y/useKeyWithClickEvents ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✖ Enforce to have the onClick mouse event with the onKeyUp, the onKeyDown, or the onKeyPress keyboard event.
```

1. **原因**: Biome 的无障碍（a11y）规则要求非交互式的 HTML 元素（如 `div`）如果绑定了 `onClick` 鼠标交互事件，则必须同时配备相应的键盘事件处理器（如 `onKeyDown` / `onKeyUp`），以照顾纯键盘导航用户。
2. **解决方案**:
   - 对于外层 backdrop `div`，可以通过添加 `role="dialog"`、`aria-modal="true"` 以及支持 `onKeyDown`（例如按 `Escape` 键关闭）来满足 a11y 规则。
   - 或者给 backdrop 显式添加键盘事件处理：`onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}`。

### 用户需求
支持点击设置界面外侧区域（遮罩层）退出设置弹窗，同时通过 Biome linter 的代码质量与无障碍检查。

### 评论
遵循现代前端项目的静态分析规范非常重要。通过补全 backdrop 的键盘事件监听（支持 Escape 键关闭），既满足了 a11y 的无障碍访问标准，又通过了 Biome 严格的静态检查。

### 目标
1. 为 `SettingsModal` 的外层 backdrop `div` 补充 `onKeyDown` 键盘监听（支持按 `Escape` 键关闭）。
2. 确保代码通过 `npm run check` 校验。

### 基本原理
在非按钮/链接元素上使用 `onClick` 时，配上 `onKeyDown` 处理器可以完美响应键盘辅助导航，消除 Biome 的 `useKeyWithClickEvents` 提示，同时保持语义和交互的健壮性。

### 标签
#intent/fix #flow/ready #priority/medium #comp/ui #concept/ui #scope/dx #ai/instruct #task/domain/ui #task/object/settings-modal #task/action/accessibility-fix #task/state/begin

---

### Script

#### Acts 1: 为 `SettingsModal.tsx` 的 backdrop 补充键盘事件处理器

~~~~~act
patch_file
src/components/SettingsModal.tsx
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
~~~~~tsx
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="button"
      tabIndex={-1}
      aria-label="关闭弹窗"
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
~~~~~

### 下一步建议
1. 执行 `npm run check` 验证 Biome 检查是否已完全通过。
2. 在浏览器中测试点击遮罩和按 Esc 键关闭设置界面的功能。
