好的，我们将对**平面比例盲切**与**空间比例角度迁移**两张卡片的提示区域进行精简：移除冗余的说明文字，并将目标提示面板重构成仅呈现纯数字/比例符号（如 `1/2`、`0.618`）的极简高对比度视图。

以下是具体的实施计划。

## [WIP] tune(packs): 精简比例盲切与迁移卡片的提示文案与目标面板

### 用户需求

1. 移除“平面比例盲切”中的 `作答目标 (从紫环起点端起算)` 及“空间比例角度迁移”中的 `基准水平比例 (从左侧紫环起点起算)` 副标题说明。
2. 将作答目标提示面板中的冗余文字精简，仅保留纯数字比例（如 `1/2`、`1/3`、`0.618`），去除“标出【...】”及括号等冗余文字。

### 评论

去掉冗余说明和装饰性文字可以显著降低视觉噪点，使用户将全部认知资源集中在核心数字比例或水平参考线上，界面更具极简感与专业度。

### 目标

1. 在 `perspectiveUtils.ts` 中将 `PROPORTION_PRESETS` 预设名精简为纯数值文本（`1/2`、`1/3`、`2/3`、`1/4`、`0.618`）。
2. 在 `ProportionDivisionView.tsx` 中重构目标面板，只展示醒目的纯数字比例。
3. 在 `ProportionMigrationView.tsx` 中移除顶部冗余说明文字，直接呈现水平参考线。

### 基本原理

通过剥离不必要的自然语言外壳，强化核心几何要素（数字与参考线）。

### 标签

#intent/tune #flow/ready #priority/medium #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/proportion-views #task/action/text-simplification #task/state/continue

---

### Script

#### Acts 1: 精简 `perspectiveUtils.ts` 中的比例名称预设

将比例名称由复合说明文本调整为纯比例数值。

~~~~~act
patch_file
src/packs/perspective/utils/perspectiveUtils.ts
~~~~~
~~~~~typescript.old
const PROPORTION_PRESETS: ProportionTarget[] = [
  { name: '1/2 处 (中心中点)', ratio: 0.5 },
  { name: '1/3 处', ratio: 1 / 3 },
  { name: '2/3 处', ratio: 2 / 3 },
  { name: '1/4 处', ratio: 0.25 },
  { name: '黄金分割点 (0.618)', ratio: 0.618 },
];
~~~~~
~~~~~typescript.new
const PROPORTION_PRESETS: ProportionTarget[] = [
  { name: '1/2', ratio: 0.5 },
  { name: '1/3', ratio: 1 / 3 },
  { name: '2/3', ratio: 2 / 3 },
  { name: '1/4', ratio: 0.25 },
  { name: '0.618', ratio: 0.618 },
];
~~~~~

#### Acts 2: 精简 `ProportionDivisionView.tsx` 的目标指示面板

去除“作答目标 (从紫环起点端起算)”和“标出【...】”，仅保留大字号纯数字显示。

~~~~~act
patch_file
src/packs/perspective/components/ProportionDivisionView.tsx
~~~~~
~~~~~typescript.old
      {/* 醒目的核心目标指引面板 */}
      <div className="w-full bg-indigo-50/70 border border-indigo-100/90 rounded-2xl p-3.5 flex flex-col items-center gap-1.5 text-center">
        <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">
          作答目标 (从紫环起点端起算)
        </div>
        <div className="text-base font-black text-indigo-900 tracking-tight">
          标出【{question.targetRatioName ?? '指定比例'}】
        </div>
      </div>
~~~~~
~~~~~typescript.new
      {/* 极简纯数字目标面板 */}
      <div className="w-full bg-indigo-50/80 border border-indigo-100/90 rounded-2xl py-2 px-4 flex items-center justify-center shadow-xs">
        <span className="text-2xl font-black text-indigo-900 font-mono tracking-widest">
          {question.targetRatioName ?? '1/2'}
        </span>
      </div>
~~~~~

#### Acts 3: 移除 `ProportionMigrationView.tsx` 中的冗余副标题

去除顶部多余的说明文字行，紧凑呈现水平参考基准线。

~~~~~act
patch_file
src/packs/perspective/components/ProportionMigrationView.tsx
~~~~~
~~~~~typescript.old
      {/* 顶部水平参考基准线面板 */}
      <div className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl p-3 flex flex-col items-center gap-1.5 shadow-sm">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
          基准水平比例 (从左侧紫环起点起算)
        </div>
        <div className="w-full flex justify-center py-1">
          <CanvasView
            width={280}
            height={48}
            className="w-full max-w-[280px] h-[48px] bg-white rounded-xl border border-slate-200 shadow-inner"
            draw={(canvas) => {
              drawHorizontalReferenceCanvas(canvas, question.targetRatio ?? 0.5, 280, 48);
            }}
            deps={[question.targetRatio]}
          />
        </div>
      </div>
~~~~~
~~~~~typescript.new
      {/* 顶部水平参考基准线面板 */}
      <div className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5 flex justify-center shadow-inner">
        <CanvasView
          width={280}
          height={48}
          className="w-full max-w-[280px] h-[48px] bg-white rounded-xl border border-slate-200 shadow-sm"
          draw={(canvas) => {
            drawHorizontalReferenceCanvas(canvas, question.targetRatio ?? 0.5, 280, 48);
          }}
          deps={[question.targetRatio]}
        />
      </div>
~~~~~

---

### 下一步建议

1. **界面复查**：
   - 打开 **平面比例与黄金分割盲切** 卡片，确认上方只显示醒目的 `1/2`、`1/3`、`0.618` 等纯数字/分数。
   - 打开 **空间比例角度迁移** 卡片，确认顶部直接呈现干净的水平基准线，无多余文字干扰。
2. **提交 Git 变更**：检查确认无误后可进行代码提交。
