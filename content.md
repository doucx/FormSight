好的，我将移除非 ALL 模式下单维度训练（色相/明度/饱和度）中鼠标悬停时产生的蓝色外边框（`hover:ring-2 ring-indigo-400/60`），让条带在悬停时保持简洁干净的默认外观。

下面为您生成实施计划：

## [WIP] refactor(color): 移除色相、明度、饱和度条带鼠标悬停时的蓝色外边框

### 用户需求
去除单维度训练模式（色相、明度、饱和度）中鼠标悬停在滑块条带上时显示的蓝色外边框（`hover:ring-2`），使其在交互时更加简洁纯净。

### 评论
通过移除悬停聚焦的 `ring` 效果，可以消除视觉干扰，让用户注意力更集中于色彩本身的渐变和黑色游标上。

### 目标
1. 修改 `src/components/ColorCanvas.tsx` 中 Inner Track 上的 `hover:ring-2 ring-indigo-400/60` 样式。

### 标签
#intent/refine #flow/ready #priority/low #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color-recognition #task/object/color-canvas-hover-ring #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 移除条带悬停时的 ring 蓝色外边框

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
          {/* Inner Track */}
          <div
            ref={isTargetActiveMode && mode !== 'ALL' ? activeTrackRef : null}
            className={`relative w-full h-7 rounded-xl border border-slate-200/80 shadow-inner flex items-center ${
              isTargetActiveMode && mode !== 'ALL' && !showAnswer && !disabled
                ? 'hover:ring-2 ring-indigo-400/60'
                : ''
            }`}
            style={{ background: gradient }}
          >
~~~~~
~~~~~typescript.new
          {/* Inner Track */}
          <div
            ref={isTargetActiveMode && mode !== 'ALL' ? activeTrackRef : null}
            className="relative w-full h-7 rounded-xl border border-slate-200/80 shadow-inner flex items-center"
            style={{ background: gradient }}
          >
~~~~~

### 下一步建议
- **执行构建与校验**: 运行 `npm run check` 及 `npm run build` 验证构建与类型无误。
