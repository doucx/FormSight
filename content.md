## [WIP] refactor(ui): 调整主页相对色感卡片布局为标准网格单列

### 错误分析

无错误，本次为纯 UI 布局优化。

### 用户需求

主页里，相对色感 (Relative Color Perception) 单独占据了一整行，需要让它调整为与其他模块卡片一致的单列标准大小（不再独占整行）。

### 评论

通过移除 `Home.tsx` 中相对色感卡片上的 `md:col-span-2` 样式类，可以让三个训练模块（寻星练习、绝对色感、相对色感）在大屏幕下整齐地以网格形式并排排列。

### 目标
1. 修改 `src/views/Home.tsx` 中相对色感卡片的 Tailwind CSS 类，移除 `md:col-span-2`。
2. 运行测试套件确保一切正常。

### 基本原理

主页采用的是 Tailwind 的 `grid-cols-1 md:grid-cols-2` 布局（如果总共有3个卡片，通常会排列为 2 列：第一行放寻星和色感，第二行放相对色感并居左，或者需要适配 3 列。查看 `Home.tsx` 的网格定义发现父容器是 `grid-cols-1 md:grid-cols-2`，因此去掉 `md:col-span-2` 后，相对色感将作为第三个子元素自动排列在第二行的左侧，符合“左下角四分之一/半宽”的网格布局）。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/home-dashboard #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 调整相对色感卡片宽度并运行测试

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~tsx.old
        {/* 3. 相对色感训练 */}
        <button
          type="button"
          onClick={() => onNavigate('relative-color')}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left md:col-span-2"
        >
~~~~~
~~~~~tsx.new
        {/* 3. 相对色感训练 */}
        <button
          type="button"
          onClick={() => onNavigate('relative-color')}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left"
        >
~~~~~

### 下一步建议

- 确认修改后，主页将以两列网格展示三个训练模块，视觉排版更加均衡。
- 可以继续启动开发服务器（`npm run dev`）在浏览器中实际预览效果。
