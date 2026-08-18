你的指出非常关键且专业。在色彩心理学和阿尔伯斯同时对比实验中，中心色块必须与背景色直接交界接触。任何白边或外发光阴影都会在视网膜上形成高频反差隔离带，大幅削弱甚至阻断背景的侧抑制诱导效果。

## [WIP] fix(relative-color): 移除阿尔伯斯同时对比中心色块的边框与阴影干扰

### 错误分析
在 `RelativeColorCanvas.tsx` 的阿尔伯斯视错觉组件中，中心色块（Central Swatches）使用了 `border-2 border-white/60` 和 `shadow-md` 样式。
1. **白边干扰**：白色属于高明度无彩色边缘，会优先对中心色块产生明度侧抑制，破坏了外层背景色对中心色块的诱导作用。
2. **阴影干扰**：阴影在色块周围产生了暗渐变过渡环，模糊了两种颜色的直接接触边界，导致用户无法体验到纯粹的视错觉对比。

### 用户需求
去除阿尔伯斯同时对比三种模式（`DECONTEXTUAL_2AFC`、`LIGHTNESS_INDUCTION`、`HUE_INDUCTION`）中中央色块外部的白色边框和阴影，保证中心颜色与背景颜色无缝直接贴合。

### 评论
这是一个极具专业性的视错觉实验优化。去除边框与阴影后，背景对中心色块的 OKLab 诱导力能够 100% 作用于视网膜感受野，完全符合约瑟夫·阿尔伯斯经典色彩实验的标准环境。

### 目标
在 `RelativeColorCanvas.tsx` 中：
1. 移除 2AFC 模式中卡片 A、B 中央色块的 `border-2 border-white/60` 与 `shadow-md`。
2. 移除明度补偿与补色残像模式中左侧参考色块与右侧作答色块的 `border-2 border-white/60` 与 `shadow-md`。

### 基本原理
直接移除中心色块的 `border-*` 与 `shadow-*` 类名，保留柔和圆角（`rounded-xl`）或直接纯平贴合，使中心色块边缘与背景色直接交界，最大化诱导对比效应。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color #task/object/albers-border-cleanup #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 移除 `RelativeColorCanvas.tsx` 中中心色块的边框与阴影

~~~~~act
patch_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript
            {/* 视口展示 */}
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
              style={{ backgroundColor: showAnswer ? '#808080' : hexBgA }}
            >
              <div
                className="w-16 h-16 rounded-xl shadow-md border-2 border-white/60"
                style={{ backgroundColor: hexCenterA }}
              />
            </div>
          </button>

          {/* 卡片 B */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelect2Afc('B')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isBHit
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selected2AfcChoice === 'B'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selected2AfcChoice === 'B'
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  B
                </span>
                区域 B (键 2)
              </span>
              {showAnswer && (
                <span
                  className={`text-xs font-extrabold flex items-center gap-1 ${
                    isBHit ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {isBHit ? '物理明度更高' : '物理更暗'} (V: {question.centerColorB?.[2]}%)
                </span>
              )}
            </div>

            {/* 视口展示 */}
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
              style={{ backgroundColor: showAnswer ? '#808080' : hexBgB }}
            >
              <div
                className="w-16 h-16 rounded-xl shadow-md border-2 border-white/60"
                style={{ backgroundColor: hexCenterB }}
              />
            </div>
~~~~~
~~~~~typescript
            {/* 视口展示 */}
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
              style={{ backgroundColor: showAnswer ? '#808080' : hexBgA }}
            >
              <div
                className="w-16 h-16 rounded-xl"
                style={{ backgroundColor: hexCenterA }}
              />
            </div>
          </button>

          {/* 卡片 B */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelect2Afc('B')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isBHit
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selected2AfcChoice === 'B'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selected2AfcChoice === 'B'
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  B
                </span>
                区域 B (键 2)
              </span>
              {showAnswer && (
                <span
                  className={`text-xs font-extrabold flex items-center gap-1 ${
                    isBHit ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {isBHit ? '物理明度更高' : '物理更暗'} (V: {question.centerColorB?.[2]}%)
                </span>
              )}
            </div>

            {/* 视口展示 */}
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
              style={{ backgroundColor: showAnswer ? '#808080' : hexBgB }}
            >
              <div
                className="w-16 h-16 rounded-xl"
                style={{ backgroundColor: hexCenterB }}
              />
            </div>
~~~~~

~~~~~act
patch_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript
        {/* 左右双背景对照视口 (带中间安全隔离带) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          {/* 左侧固定参考 */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              左侧参考 (固定基准)
            </span>
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
              style={{ backgroundColor: bgLeftHex }}
            >
              <div
                className="w-16 h-16 rounded-xl shadow-md border-2 border-white/60 transition-all"
                style={{ backgroundColor: centerLeftHex }}
              />
            </div>
          </div>

          {/* 右侧作答与调制 */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              右侧作答 (调制以达成感知一致)
            </span>
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
              style={{ backgroundColor: bgRightHex }}
            >
              <div
                className="w-16 h-16 rounded-xl shadow-md border-2 border-white/60 transition-all"
                style={{ backgroundColor: showAnswer ? idealRightHex : userRightHex }}
              />
            </div>
          </div>
        </div>
~~~~~
~~~~~typescript
        {/* 左右双背景对照视口 (带中间安全隔离带) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          {/* 左侧固定参考 */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              左侧参考 (固定基准)
            </span>
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
              style={{ backgroundColor: bgLeftHex }}
            >
              <div
                className="w-16 h-16 rounded-xl transition-all"
                style={{ backgroundColor: centerLeftHex }}
              />
            </div>
          </div>

          {/* 右侧作答与调制 */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              右侧作答 (调制以达成感知一致)
            </span>
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
              style={{ backgroundColor: bgRightHex }}
            >
              <div
                className="w-16 h-16 rounded-xl transition-all"
                style={{ backgroundColor: showAnswer ? idealRightHex : userRightHex }}
              />
            </div>
          </div>
        </div>
~~~~~

### 下一步建议
- 可以在浏览器中启动开发环境（`npm run dev`）体验去除边框后的直接色彩交界对比，感受纯正的阿尔伯斯同时对比感知反馈。
- 如果确认无误，可进行代码提交。
