好的！当鼠标在综合拾色（ALL）模式的滑块上悬停试探时，不仅游标和 $\Delta E$ 容错区间会同步更新，右侧对比色块所渲染的“用户当前调制颜色”也已经与实时悬停试探值（`userH`, `userS`, `userV`）进行了联动（因为 `userH/userS/userV` 是状态驱动，点击滑块时直接更新状态，且悬停时对应的数值 Label 也会实时变动）。

下面为您生成实施计划：

## [WIP] refactor(color): 确保综合拾色悬停试探时颜色预览与色值状态实时联动

### 用户需求
在综合拾色（ALL）模式中，当鼠标悬停在滑块上试探时，渲染的用户当前调制颜色（右侧对比色块）实时跟随鼠标位置同步更新。

### 评论
实时颜色预览能够让用户在拖拽或悬停试探时获得即时视觉反馈，使“眼睛观察”与“数值调节”达到完美闭环。

### 目标
1. 检查 `ColorCanvas.tsx` 中右侧用户色块的背景色计算逻辑，确保其在悬停时采用当前的 `currentHoverVal`（或悬停状态下的试探 HSV）进行实时渲染预览。

### 标签
#intent/refine #flow/ready #priority/low #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color-recognition #task/object/comprehensive-color-preview-sync #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 让 ALL 模式右侧颜色预览在鼠标悬停时实时响应试探色值

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
          <div className="flex items-center justify-center gap-4 w-full">
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
              style={{ backgroundColor: targetHex }}
            />
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-150"
              style={{ backgroundColor: hsvToHex(userH, userS, userV) }}
            />
          </div>
~~~~~
~~~~~typescript.new
          <div className="flex items-center justify-center gap-4 w-full">
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
              style={{ backgroundColor: targetHex }}
            />
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-75"
              style={{
                backgroundColor: hsvToHex(
                  allHoverVals.H !== null ? allHoverVals.H : userH,
                  allHoverVals.S !== null ? allHoverVals.S : userS,
                  allHoverVals.V !== null ? allHoverVals.V : userV,
                ),
              }}
            />
          </div>
~~~~~

### 下一步建议
- **执行构建与校验**: 运行 `npm run check` 及 `npm run build` 确保类型与打包顺利完成。
