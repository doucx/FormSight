## [WIP] refactor(packs): 精简比例迁移卡片的提示文案与UI布局

### 用户需求

1. 移除 `ProportionMigrationView.tsx` 中顶部水平参考面板下方的“基准水平比例 (从左侧紫环起点起算)”文字行。
2. 精简下方作答目标提示面板中的冗余文字（如去除“标出【...】”及括号内的长篇说明），仅保留核心的纯数字比例（如 `1/2`、`0.618` 或带 `%` 的精简小数比例）。

### 评论

通过去除冗余的文字说明与长标签，能够进一步减少认知负荷，让训练者将全部注意力集中在视觉几何比例的直接比对与空间迁移上。

### 目标

1. 修改 `ProportionMigrationView.tsx`，删除顶部参考线下方的标题文字。
2. 重构目标提示卡片，直接展示如 `50.0%` 或类似纯比例数值。

### 标签

#intent/refine #flow/ready #priority/medium #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/proportion-migration-card #task/action/cleanup #task/state/continue

---

### Script

#### Acts 1: 精简 ProportionMigrationView.tsx 的文案与提示UI

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
      <div className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl p-3 flex flex-col items-center gap-1 shadow-sm">
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

      {/* 纯数字比例目标指引面板 */}
      <div className="w-full bg-indigo-50/70 border border-indigo-100/90 rounded-2xl p-3 flex flex-col items-center gap-1 text-center">
        <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">
          目标比例
        </div>
        <div className="text-xl font-black text-indigo-900 tracking-tight font-mono">
          {question.targetRatioName ?? `${((question.targetRatio ?? 0.5) * 100).toFixed(1)}%`}
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

---

### 下一步建议

1. **检查渲染效果**：打开“空间比例角度迁移”卡片，确认顶部参考线更干净清爽，下方目标提示仅展示大号粗体的纯数字比例（如 `45.2%`）。
2. **准备提交**：若界面符合您的预期，可进入下一步 Git 提交。
