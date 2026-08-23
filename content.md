## [WIP] refactor(packs): 精简比例迁移卡片的顶部与目标提示文案

### 用户需求

1. 移除 `ProportionMigrationView.tsx` 中顶部水平参考面板下方的“基准水平比例 (从左侧紫环起点起算)”这行文字。
2. 将作答目标提示面板中的冗余文字精简（如去除“标出【...】”及括号内的多余说明），仅保留核心的纯数字比例（如 `1/2`、`0.618` 或百分比 `45.2%`）。

### 评论

这两个精简修改使卡片界面去除了繁琐的说明噪音，呈现出极致的极简设计风格，让用户能够把注意力 100% 集中在视觉几何比值的观察和迁移上。

### 目标

1. 修改 `src/packs/perspective/components/ProportionMigrationView.tsx`，移除参考线面板的冗余说明文字。
2. 优化目标显示面板，使其只展示干净的纯比例数值。

### 标签

#intent/refine #flow/ready #priority/medium #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/proportion-migration-ui #task/action/cleanup-ui #task/state/continue

---

### Script

#### Acts 1: 清理 ProportionMigrationView 中的冗余文本与说明

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

      {/* 下方倾斜角度作答画布 */}
      <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex flex-col items-center gap-2">
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label="比例迁移答题画布"
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-none hover:border-indigo-400 hover:shadow-md'
          }`}
        />
        <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-600 bg-indigo-600 inline-block" />
            <span>起点 (0%)</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
            <span>终点 (100%)</span>
          </span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~
~~~~~typescript.new
      {/* 顶部水平参考基准线面板 */}
      <div className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl p-3 flex flex-col items-center shadow-sm">
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

      {/* 下方倾斜角度作答画布 */}
      <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex flex-col items-center gap-2">
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label="比例迁移答题画布"
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-none hover:border-indigo-400 hover:shadow-md'
          }`}
        />
        <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-600 bg-indigo-600 inline-block" />
            <span>起点 (0%)</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
            <span>终点 (100%)</span>
          </span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

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
      <div className="text-xl font-mono font-black text-indigo-600 tracking-tight text-center py-1">
        {question.targetRatioName ?? `${((question.targetRatio ?? 0.5) * 100).toFixed(1)}%`}
      </div>
~~~~~

---

### 下一步建议

1. **界面复查**：重新打开浏览器观察“空间比例角度迁移”卡片，此时顶部参考线面板下方已完全干净，去除了文字标题；目标提示区也仅精简保留了纯数字比例（如 `48.5%` 等）。
2. **确认提交**：交互与界面均符合预期，可随时安排 Git 提交。
