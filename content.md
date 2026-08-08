为了解决 Biome 报出的 `useSemanticElements` 警告，我们将 `Home.tsx` 中的卡片元素直接重构成原生的 `<button type="button">` 标签。HTML 原生 `<button>` 元素开箱即用自带无障碍导航、键盘焦点和按键触发支持，能够完美解决此检查规则。

## [WIP] fix: 将 Home.tsx 卡片元素重构为语义化 button 标签

### 错误分析

Biome 的 `useSemanticElements` 规则检测到 `Home.tsx` 中的两个卡片使用了带有 `role="button"` 的 `div` 元素。linter 建议直接使用语义化的原生 `<button>` 标签，以替代通过 `role="button"` 和手动绑定键盘事件模拟按钮的行为。

### 用户需求

将 `Home.tsx` 中用于模块跳转的两个卡片根元素由 `<div role="button">` 修改为原生的 `<button type="button">` 语义化标签，并补充 `text-left` 保持布局对齐。

### 评论

使用原生的 HTML 语义化标签（如 `<button>`）比在通用 `<div>` 上增加 ARIA 属性更为标准和简洁。浏览器原生提供了可聚焦性、键盘回车/空格点击绑定以及对屏幕阅读器的完整支持。

### 目标

将 `Home.tsx` 中的两个入口卡片标签替换为 `<button type="button">`，移除冗余的 `role="button"`、`tabIndex={0}` 与 `onKeyDown` 手动处理器，并加上 `text-left` 确保文本左对齐。

### 基本原理

原生 `<button type="button">` 自带默认的键盘 `Enter` / `Space` 触发和 focus 管理逻辑。移除模拟属性并改用语义标签后，既能通过 Biome 的 `useSemanticElements` 校验，又能简化代码。

### 标签

#intent/fix #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/semantic-elements #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 重构 Home.tsx 使用语义化 button 标签

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~tsx.old
      {/* 模块选择区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 1. 寻星练习 */}
        <div
          onClick={() => onNavigate('star-hopping')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onNavigate('star-hopping');
            }
          }}
          role="button"
          tabIndex={0}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
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

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">寻星练习 (Star-Hopping)</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                基于极坐标与双极透视网格，通过视线搜寻与目标盲打，训练你对空间方位、线段比例及角度旋转的视觉直觉。
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                单锚点
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                水平双锚点
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                旋转双锚点
              </span>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
            <span>进入寻星练习看板</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* 2. 色感练习 */}
        <div
          onClick={() => onNavigate('color-sense')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onNavigate('color-sense');
            }
          }}
          role="button"
          tabIndex={0}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
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

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                色感训练 (Color Recognition)
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation)
                的分级递进识别，全面建立微小色彩差异感知力。
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                1-色相 (Hue)
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                2-明度 (Val)
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                3-饱和度 (Sat)
              </span>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
            <span>进入色感练习看板</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
~~~~~
~~~~~tsx.new
      {/* 模块选择区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">寻星练习 (Star-Hopping)</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                基于极坐标与双极透视网格，通过视线搜寻与目标盲打，训练你对空间方位、线段比例及角度旋转的视觉直觉。
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                单锚点
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                水平双锚点
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                旋转双锚点
              </span>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
            <span>进入寻星练习看板</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>

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

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                色感训练 (Color Recognition)
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation)
                的分级递进识别，全面建立微小色彩差异感知力。
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                1-色相 (Hue)
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                2-明度 (Val)
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                3-饱和度 (Sat)
              </span>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
            <span>进入色感练习看板</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>
~~~~~

### 下一步建议

再次在终端运行静态代码校验：

```bash
npm run checkf
```

确认代码库所有文件均无报错。
