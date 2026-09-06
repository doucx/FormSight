## [WIP] fix: 修复年度热力图 Tooltip 在浅色模式下文字与背景同色不可见的问题

### 用户需求
在年度训练活跃度热力图组件 (`ActivityHeatmapCard.tsx`) 中，鼠标悬停格子的悬浮提示框 (`tooltip`) 使用了 `bg-card/95 text-white`。在浅色模式下，`bg-card` 为纯白色，导致背景和文字均为白色，文字无法识别。需要将其适配为主题自适应的文本颜色。

### 评论
这是一个影响用户体验 (UX) 的 UI 样式 Bug。通过将固定的 `text-white` 改为主题自适应的 `text-foreground`，并将高亮数字颜色从硬编码的 `text-indigo-300` 改为主题的 `text-primary`，可以完美兼顾浅色和深色模式下的高对比度和可读性。

### 目标
1. 定位 `src/components/stats/ActivityHeatmapCard.tsx` 中的悬浮 Tooltip 渲染代码。
2. 将 `text-white` 替换为 `text-foreground`（适应 `bg-card/95` 浅色为白、深色为暗）。
3. 将计数数字的 `text-indigo-300` 替换为主题色 `text-primary`。

### 基本原理
Tailwind CSS 的 `bg-card` 在浅色模式下是白色背景，在深色模式下是深色背景。原代码硬编码了 `text-white`，导致浅色模式下文字隐形。使用 `text-foreground` 和 `text-primary` 可以自动跟随全局主题切换，保持极佳的对比度。

### 标签
#intent/fix #flow/ready #priority/medium #comp/docs #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/heatmap-tooltip #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修改 ActivityHeatmapCard.tsx 中的 Tooltip 文本颜色

~~~~~act
patch_file
src/components/stats/ActivityHeatmapCard.tsx
~~~~~
~~~~~typescript.old
          {/* 即时响应且支持全向避让的悬浮浮窗 */}
          {hoveredDay && (
            <div
              className={`absolute pointer-events-none z-30 px-2.5 py-1 bg-card/95 text-white text-xs font-bold rounded-xl shadow-xl -translate-x-1/2 whitespace-nowrap animate-in fade-in zoom-in-95 duration-75 border border-border/60 ${
                hoveredDay.isFlipped ? 'translate-y-0' : '-translate-y-full'
              }`}
              style={{ left: `${hoveredDay.x}px`, top: `${hoveredDay.y}px` }}
            >
              <span>{hoveredDay.dateStr}</span>
              <span className="text-indigo-300 ml-1.5 font-mono">
                {hoveredDay.count} {t('common.trialsUnit')}
              </span>
            </div>
          )}
~~~~~
~~~~~typescript.new
          {/* 即时响应且支持全向避让的悬浮浮窗 */}
          {hoveredDay && (
            <div
              className={`absolute pointer-events-none z-30 px-2.5 py-1 bg-card/95 text-foreground text-xs font-bold rounded-xl shadow-xl -translate-x-1/2 whitespace-nowrap animate-in fade-in zoom-in-95 duration-75 border border-border/60 ${
                hoveredDay.isFlipped ? 'translate-y-0' : '-translate-y-full'
              }`}
              style={{ left: `${hoveredDay.x}px`, top: `${hoveredDay.y}px` }}
            >
              <span>{hoveredDay.dateStr}</span>
              <span className="text-primary ml-1.5 font-mono">
                {hoveredDay.count} {t('common.trialsUnit')}
              </span>
            </div>
          )}
~~~~~

### 下一步建议
建议在浏览器中切换至浅色模式，打开全局认知数据统计页面，将鼠标悬停在年度热力图的方块上，验证 Tooltip 的日期和题数字体是否清晰可见。
