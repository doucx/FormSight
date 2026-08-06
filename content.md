已接收到需求。由于当前系统已全面重构为基于 **Level 难度层阶** 的自适应架构，UI 中残存的“px”（像素）相关字样容易对用户造成困扰，需要将其清理并统一更正为对应 Level 层阶的表述。

## [WIP] refactor: 清理 UI 中的 px 显式描述并修正为 Level 层阶表达

### 用户需求
清理前端 UI 面板（包括设置弹窗、分析弹窗等）中残留的 `px` 文本与单位标注，将其重构为符合自适应难度系统逻辑的 `Level 层阶` 描述及无单位距离/坐标表述。

### 评论
清理 UI 中遗留的底层实现细节（像素单位 `px`）是保障设计一致性和提升用户认知体验的关键步骤。将“5px梯度 / 1px逐级”修正为“12级标准阶梯 / 35级精细阶梯”，能更好地符合系统的 Level 层阶抽象。

### 目标
1. **设置面板 (`SettingsModal.tsx`)**:
   - 将 `标准阶梯 (5px梯度)` 修改为 `标准阶梯 (12级)`。
   - 将 `精细阶梯 (1px逐级)` 修改为 `精细阶梯 (35级逐级)`。
2. **分析面板 (`AnalyticsModal.tsx`)**:
   - 移除偏差与误差面板中数值后方的 `px` 单位标识，将“平均像素误差”重构为“平均误差距离”。
   - 将中心相对偏差热力图 Canvas 的辅助同心圆刻度由 `5px, 10px...` 简化为无单位数字刻度。
3. **设置类型配置 (`settings.ts`)**:
   - 同步更新类型定义中关于 `stepGranularity` 的注释。

### 基本原理
在前台交互中，用户关注的核心抽象是系统计算的自适应能力 Level 及其空间方向偏差，而非具体的像素级渲染数值。统一收拢为 Level 层阶描述，有助于增强体验的一致性与专业感。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/level-step-granularity #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 修改设置面板与设置配置文件中的步长精细度描述

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~tsx.old
              <button
                type="button"
                onClick={() => handleGranularityChange('standard')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  current.stepGranularity === 'standard'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                标准阶梯 (5px梯度)
              </button>
              <button
                type="button"
                onClick={() => handleGranularityChange('fine')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  current.stepGranularity === 'fine'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                精细阶梯 (1px逐级)
              </button>
~~~~~
~~~~~tsx.new
              <button
                type="button"
                onClick={() => handleGranularityChange('standard')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  current.stepGranularity === 'standard'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                标准阶梯 (12级)
              </button>
              <button
                type="button"
                onClick={() => handleGranularityChange('fine')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  current.stepGranularity === 'fine'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                精细阶梯 (35级逐级)
              </button>
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~ts.old
export interface UserSettings {
  autoNext: boolean; // 点击后是否自动翻页
  autoNextDelay: number; // 自动翻页延迟 (ms)
  stepGranularity: StepGranularity; // 步长粒度 ('standard': 默认阶梯, 'fine': 1px逐级)
  adaptiveMode: AdaptiveMode; // 自适应算子模式 ('block': 轮次胜率评估, 'staircase': 经典3U1D)
~~~~~
~~~~~ts.new
export interface UserSettings {
  autoNext: boolean; // 点击后是否自动翻页
  autoNextDelay: number; // 自动翻页延迟 (ms)
  stepGranularity: StepGranularity; // 步长粒度 ('standard': 标准阶梯 (12级), 'fine': 精细阶梯 (35级))
  adaptiveMode: AdaptiveMode; // 自适应算子模式 ('block': 轮次胜率评估, 'staircase': 经典3U1D)
~~~~~

#### Acts 2: 修改分析面板中遗留的 px 文字与刻度标注

~~~~~act
patch_file
src/components/AnalyticsModal.tsx
~~~~~
~~~~~tsx.old
    // 绘制辅助同心圆 (5px, 10px, 20px, 30px)
    const rings = [5, 10, 20, 30];
    ctx.lineWidth = 1;
    for (const r of rings) {
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = '10px monospace';
      ctx.fillText(`${r}px`, cx + r * scale + 2, cy - 4);
    }
~~~~~
~~~~~tsx.new
    // 绘制辅助同心圆 (5, 10, 20, 30)
    const rings = [5, 10, 20, 30];
    ctx.lineWidth = 1;
    for (const r of rings) {
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = '10px monospace';
      ctx.fillText(`${r}`, cx + r * scale + 2, cy - 4);
    }
~~~~~

~~~~~act
patch_file
src/components/AnalyticsModal.tsx
~~~~~
~~~~~tsx.old
                  <div className="pt-1 space-y-1 font-mono text-slate-700">
                    <div className="flex justify-between">
                      <span>平均 X 轴偏移:</span>
                      <span className="font-bold">
                        {avgDx > 0 ? `右 +${avgDx}` : avgDx < 0 ? `左 ${avgDx}` : '0'} px
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>平均 Y 轴偏移:</span>
                      <span className="font-bold">
                        {avgDy > 0 ? `下 +${avgDy}` : avgDy < 0 ? `上 ${avgDy}` : '0'} px
                      </span>
                    </div>
                    <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-200/60 pt-1">
                      <span>平均像素误差:</span>
                      <span>{avgErrorDist} px</span>
                    </div>
                  </div>
~~~~~
~~~~~tsx.new
                  <div className="pt-1 space-y-1 font-mono text-slate-700">
                    <div className="flex justify-between">
                      <span>平均 X 轴偏移:</span>
                      <span className="font-bold">
                        {avgDx > 0 ? `右 +${avgDx}` : avgDx < 0 ? `左 ${avgDx}` : '0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>平均 Y 轴偏移:</span>
                      <span className="font-bold">
                        {avgDy > 0 ? `下 +${avgDy}` : avgDy < 0 ? `上 ${avgDy}` : '0'}
                      </span>
                    </div>
                    <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-200/60 pt-1">
                      <span>平均误差距离:</span>
                      <span>{avgErrorDist}</span>
                    </div>
                  </div>
~~~~~

### 下一步建议
1. **运行项目格式化及代码检查**: 推荐在命令块执行完毕后运行 `pnpm check` 或 `npx biome check .` 验证格式与 Lint 是否完全畅通。
2. **审查界面呈现**: 在浏览器中打开设置及分析模态框，确认“px”文本已被全面清理，且层阶描述清晰易懂。
