好的！我已经移除了目标色块下方的 16 进制色彩文本显示区域，使视觉界面更加干净纯粹。

## [WIP] fix(color): 移除 16 进制色彩文本显示

### 用户需求
移除色感练习界面中目标色块下方的 16 进制色彩值 (如 `#FF0000` / `???`) 展示。

### 评论
纯粹通过色彩快视觉与 slider 轨道交互能更好地纯化视觉直觉，不受 RGB/Hex 代码等抽象字符的干扰。

### 目标
修改 `src/components/ColorCanvas.tsx`，删除 16 进制 Hex 描述节点。

### 基本原理
直接移除 `<div className="font-mono text-xs font-bold text-slate-400">` 节点。

### 标签
#intent/tune #flow/ready #priority/low #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/color-canvas-remove-hex #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 移除 ColorCanvas.tsx 中的 16 进制展示节点

更新 `src/components/ColorCanvas.tsx`。

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~tsx.old
  return (
    <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 目标色块 */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
        <div className="font-mono text-xs font-bold text-slate-400">
          {showAnswer ? targetHex : '???'}
        </div>
      </div>

      {/* 递进显隐轨道 */}
~~~~~
~~~~~tsx.new
  return (
    <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 目标色块 */}
      <div className="flex flex-col items-center">
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
      </div>

      {/* 递进显隐轨道 */}
~~~~~

### 下一步建议
1. 现在目标色块区域干净极简，只保留纯粹的色彩展示。
2. 整个主页重构与色感练习（HSV 渐变、悬停细长准心、竖条结果标记）已全面就绪！
