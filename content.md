好的，我将修改 `src/views/Home.tsx`，移除寻星练习卡片右上角的“可练习”标签以及色感训练卡片右上角的“色感核心 (HSV)”标签。

## [WIP] refactor(ui): 移除主页卡片右上角的标签元素

### 用户需求
删除主页“寻星练习”卡片右上角的“可练习”徽章以及“色感训练”卡片右上角的“色感核心 (HSV)”徽章。

### 评论
移除这些冗余徽章可以降低卡片顶部的视觉干扰，使整体界面更加简洁干净。

### 目标
在 `src/views/Home.tsx` 中删除两处 `span` 标签节点。

### 基本原理
直接修改组件中的 JSX 模板结构，去除右上角对应的状态与分类徽章。

### 标签
#intent/refine #flow/ready #priority/low #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/home-card-badges #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 从 `src/views/Home.tsx` 移除卡片右上角徽章

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript.old
        {/* 1. 寻星练习 */}
        <button
          type="button"
          onClick={() => onNavigate('star-hopping')}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                <Compass className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                可练习
              </span>
            </div>
~~~~~
~~~~~typescript.new
        {/* 1. 寻星练习 */}
        <button
          type="button"
          onClick={() => onNavigate('star-hopping')}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                <Compass className="w-8 h-8" />
              </div>
            </div>
~~~~~

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript.old
        {/* 2. 色感练习 */}
        <button
          type="button"
          onClick={() => onNavigate('color-sense')}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                <Palette className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                色感核心 (HSV)
              </span>
            </div>
~~~~~
~~~~~typescript.new
        {/* 2. 色感练习 */}
        <button
          type="button"
          onClick={() => onNavigate('color-sense')}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                <Palette className="w-8 h-8" />
              </div>
            </div>
~~~~~

### 下一步建议
再次查看主页布局，确认两张卡片右上角的徽章已成功删除。
