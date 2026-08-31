我已经准备好执行第二轮定向清洗。本次将系统性清除 `src/core/analytics/`、`src/components/stats/` 以及各个 Pack (`abstraction`, `angle`, `negative_space`, `perspective`, `star`) 中残留的 Canvas 背景和硬编码颜色类名（如 `border-slate-300 dark:border-slate-700`、`bg-white dark:bg-slate-950` 等），全面收敛为设计系统语义 Token。

## [WIP] refactor(ui): 执行第二轮定向清洗以彻底收敛各 Pack 画布与分析面板语义类名

### 用户需求
执行第二轮定向正则替换，批量消除核心分析诊断组件与各 Pack 画布容器中残留的 `bg-white dark:bg-slate-950`、`border-slate-300 dark:border-slate-700` 等硬编码类名，统一接入 Design System 语义变量。

### 评论
本次清理是设计系统落地的关键收尾环节。消除散落在具体 Pack 与分析视图中的旧版双模类名后，整个应用的明暗模式切换将更加稳定自然，避免局部色块割裂，同时进一步减小代码体积。

### 目标
1. 清洗 `src/core/analytics/` 下的 `difficultyPlateauView.tsx` 与 `speedAccuracyView.tsx`，将诊断列表背景与文字收敛为 `bg-card`、`border-border`、`text-foreground` 与 `text-muted-foreground`。
2. 清洗 `src/components/stats/ActivityHeatmapCard.tsx` 中的边框硬编码类名。
3. 批量清洗 `abstraction`, `angle`, `negative_space`, `perspective`, `star` 等 Pack 中的 Canvas 容器样式（从 `border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950` 统一收敛为 `border-border bg-card`）。

### 基本原理
通过精确匹配并替换残余的双模类名，直接使用 Tailwind Token 配置的语义别名（如 `bg-card` 映射卡片背景、`border-border` 映射统一分界线、`bg-muted/60` 映射柔和底衬），保证 DOM 容器与 Canvas 绘制区域在明暗模式下的色值完全和谐对齐。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #comp/runtime #concept/ui #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/color-tokens-migration #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 清洗认知分析视图中的硬编码类名

我们将清洗 `difficultyPlateauView.tsx` 与 `speedAccuracyView.tsx` 中的容器与文字类名。

~~~~~act
patch_file
src/core/analytics/difficultyPlateauView.tsx
~~~~~
~~~~~typescript.old
  if (totalTrials === 0) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-500">
        {i18n.t('analyticsModal.needMoreSamples')}
      </div>
    );
  }

  const mainLevel = [...levelStats].sort((a, b) => b.total - a.total)[0];
  const maxLevel = Math.max(...levelStats.map((s) => s.level));

  return (
    <div className="space-y-2">
      {mainLevel && (
        <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs text-indigo-900 leading-relaxed">
          <span className="font-bold">{i18n.t('analyticsModal.levelFocusSummaryTitle')}: </span>
          {i18n.t('analyticsModal.levelFocusSummaryDesc', {
            max: maxLevel,
            focus: mainLevel.level,
            count: mainLevel.total,
            acc: mainLevel.accuracy,
          })}
        </div>
      )}

      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 pt-1">
        {i18n.t('analyticsModal.levelDistributionTitle')}
      </div>

      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
        {levelStats.map((stat) => {
          const ratio = Math.round((stat.total / totalTrials) * 100);
          return (
            <div
              key={stat.level}
              className="p-2.5 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs font-black text-slate-800 min-w-[45px]">
                  Lvl {stat.level}
                </span>
                <span className="text-[11px] text-slate-400">
                  {stat.total} {i18n.t('common.trialsUnit')} ({ratio}%)
                </span>
              </div>
~~~~~
~~~~~typescript.new
  if (totalTrials === 0) {
    return (
      <div className="p-3 bg-muted/60 border border-border rounded-2xl text-xs text-muted-foreground">
        {i18n.t('analyticsModal.needMoreSamples')}
      </div>
    );
  }

  const mainLevel = [...levelStats].sort((a, b) => b.total - a.total)[0];
  const maxLevel = Math.max(...levelStats.map((s) => s.level));

  return (
    <div className="space-y-2">
      {mainLevel && (
        <div className="p-3 bg-accent border border-indigo-100 dark:border-indigo-900/60 rounded-2xl text-xs text-foreground leading-relaxed">
          <span className="font-bold">{i18n.t('analyticsModal.levelFocusSummaryTitle')}: </span>
          {i18n.t('analyticsModal.levelFocusSummaryDesc', {
            max: maxLevel,
            focus: mainLevel.level,
            count: mainLevel.total,
            acc: mainLevel.accuracy,
          })}
        </div>
      )}

      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 pt-1">
        {i18n.t('analyticsModal.levelDistributionTitle')}
      </div>

      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
        {levelStats.map((stat) => {
          const ratio = Math.round((stat.total / totalTrials) * 100);
          return (
            <div
              key={stat.level}
              className="p-2.5 bg-card border border-border rounded-xl flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs font-black text-foreground min-w-[45px]">
                  Lvl {stat.level}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {stat.total} {i18n.t('common.trialsUnit')} ({ratio}%)
                </span>
              </div>
~~~~~

~~~~~act
patch_file
src/core/analytics/speedAccuracyView.tsx
~~~~~
~~~~~typescript.old
  if (totalTrials === 0) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-500">
        {i18n.t('analyticsModal.needMoreSamples')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
        {i18n.t('analyticsModal.satDistributionTitle')}
      </div>
      <div className="space-y-1.5">
        {bins.map((bin) => {
          const ratio = totalTrials > 0 ? Math.round((bin.total / totalTrials) * 100) : 0;
          return (
            <div
              key={bin.rangeLabel}
              className="p-2.5 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs font-bold text-slate-700 min-w-[70px]">
                  {bin.rangeLabel}
                </span>
                <span className="text-[11px] text-slate-400">
                  {bin.total} {i18n.t('common.trialsUnit')} ({ratio}%)
                </span>
              </div>
~~~~~
~~~~~typescript.new
  if (totalTrials === 0) {
    return (
      <div className="p-3 bg-muted/60 border border-border rounded-2xl text-xs text-muted-foreground">
        {i18n.t('analyticsModal.needMoreSamples')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
        {i18n.t('analyticsModal.satDistributionTitle')}
      </div>
      <div className="space-y-1.5">
        {bins.map((bin) => {
          const ratio = totalTrials > 0 ? Math.round((bin.total / totalTrials) * 100) : 0;
          return (
            <div
              key={bin.rangeLabel}
              className="p-2.5 bg-card border border-border rounded-xl flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs font-bold text-foreground min-w-[70px]">
                  {bin.rangeLabel}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {bin.total} {i18n.t('common.trialsUnit')} ({ratio}%)
                </span>
              </div>
~~~~~

#### Acts 2: 清洗统计组件中的边框样式

我们将清洗 `ActivityHeatmapCard.tsx` 中的热力图单元格无记录边框。

~~~~~act
patch_file
src/components/stats/ActivityHeatmapCard.tsx
~~~~~
~~~~~typescript.old
  const getHeatmapColor = (count: number, isFuture: boolean) => {
    if (isFuture) return 'bg-transparent border border-transparent';
    if (count === 0) return 'bg-muted border border-slate-200/40 dark:border-slate-700/40';
    if (count < 10) return 'bg-indigo-200 border border-indigo-300/60';
~~~~~
~~~~~typescript.new
  const getHeatmapColor = (count: number, isFuture: boolean) => {
    if (isFuture) return 'bg-transparent border border-transparent';
    if (count === 0) return 'bg-muted border border-border/60';
    if (count < 10) return 'bg-indigo-200 border border-indigo-300/60';
~~~~~

#### Acts 3: 清洗 Abstraction Pack 中的 Canvas 容器类名

清洗 `GestureAxisView.tsx`、`NotanThresholdView.tsx`、`PaletteClusteringView.tsx`。

~~~~~act
patch_file
src/packs/abstraction/components/GestureAxisView.tsx
~~~~~
~~~~~typescript.old
          <CanvasView
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-950"
            draw={(canvas) => {
~~~~~
~~~~~typescript.new
          <CanvasView
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) => {
~~~~~

~~~~~act
patch_file
src/packs/abstraction/components/NotanThresholdView.tsx
~~~~~
~~~~~typescript.old
              <CanvasView
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-border bg-white dark:bg-slate-950"
                draw={(canvas) => {
                  if (question.notanBuffer) {
                    drawRawGrayscaleNoiseField(
                      canvas,
                      question.notanBuffer,
                      question.notanFieldDim ?? 120,
                      ABSTRACTION_2AFC_SIZE,
                    );
                  }
                }}
                deps={[question.notanBuffer, question.notanFieldDim]}
              />
            </div>
          }
          rightContent={
            <div className="w-full flex justify-center bg-muted/60 p-2.5 rounded-2xl border border-border shadow-inner">
              <CanvasView
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-border bg-white dark:bg-slate-950"
                draw={(canvas) => {
~~~~~
~~~~~typescript.new
              <CanvasView
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-border bg-card"
                draw={(canvas) => {
                  if (question.notanBuffer) {
                    drawRawGrayscaleNoiseField(
                      canvas,
                      question.notanBuffer,
                      question.notanFieldDim ?? 120,
                      ABSTRACTION_2AFC_SIZE,
                    );
                  }
                }}
                deps={[question.notanBuffer, question.notanFieldDim]}
              />
            </div>
          }
          rightContent={
            <div className="w-full flex justify-center bg-muted/60 p-2.5 rounded-2xl border border-border shadow-inner">
              <CanvasView
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-border bg-card"
                draw={(canvas) => {
~~~~~

~~~~~act
patch_file
src/packs/abstraction/components/PaletteClusteringView.tsx
~~~~~
~~~~~typescript.old
          <CanvasView
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-950"
            draw={(canvas) =>
~~~~~
~~~~~typescript.new
          <CanvasView
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) =>
~~~~~

#### Acts 4: 清洗 Angle Pack 中的 Canvas 容器类名

清洗 `AngleEstimationView.tsx`、`AngleComparison2AfcView.tsx`、`AngleParallel2AfcView.tsx`。

~~~~~act
patch_file
src/packs/angle/components/AngleEstimationView.tsx
~~~~~
~~~~~typescript.old
          <CanvasView
            width={ANGLE_CANVAS_SIZE}
            height={ANGLE_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-950"
            draw={(canvas) => {
~~~~~
~~~~~typescript.new
          <CanvasView
            width={ANGLE_CANVAS_SIZE}
            height={ANGLE_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) => {
~~~~~

~~~~~act
patch_file
src/packs/angle/components/AngleComparison2AfcView.tsx
~~~~~
~~~~~typescript.old
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white dark:bg-slate-950"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesA, ANGLE_2AFC_SIZE)}
              deps={[question.linesA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('common.areaB'),
        isCorrect: isBHit,
        badge: showAnswer ? `${question.angleB}°` : undefined,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white dark:bg-slate-950"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesB, ANGLE_2AFC_SIZE)}
              deps={[question.linesB]}
            />
~~~~~
~~~~~typescript.new
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesA, ANGLE_2AFC_SIZE)}
              deps={[question.linesA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('common.areaB'),
        isCorrect: isBHit,
        badge: showAnswer ? `${question.angleB}°` : undefined,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesB, ANGLE_2AFC_SIZE)}
              deps={[question.linesB]}
            />
~~~~~

~~~~~act
patch_file
src/packs/angle/components/AngleParallel2AfcView.tsx
~~~~~
~~~~~typescript.old
          <CanvasView
            width={ANGLE_PROMPT_SIZE}
            height={ANGLE_PROMPT_SIZE}
            className="w-28 h-28 rounded-xl border border-border shadow-sm bg-white dark:bg-slate-950"
            draw={(canvas) =>
              drawSingleLineCanvas(
                canvas,
                question.promptLine,
                ANGLE_PROMPT_SIZE,
                CANVAS_THEME.status.accent,
                3.0,
              )
            }
            deps={[question.promptLine]}
          />
        </div>
      }
      optionA={{
        title: t('common.optionA'),
        isCorrect: isAHit,
        badge: showAnswer
          ? isAHit
            ? t('packs.angle.views.absoluteParallel')
            : t('packs.angle.views.deviationBadge', { deg: question.angularDeviation ?? 0 })
          : undefined,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white dark:bg-slate-950"
              draw={(canvas) =>
                drawSingleLineCanvas(
                  canvas,
                  question.lineOptionA,
                  ANGLE_2AFC_SIZE,
                  CANVAS_THEME.shape.fill,
                  2.5,
                )
              }
              deps={[question.lineOptionA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('common.optionB'),
        isCorrect: isBHit,
        badge: showAnswer
          ? isBHit
            ? t('packs.angle.views.absoluteParallel')
            : t('packs.angle.views.deviationBadge', { deg: question.angularDeviation ?? 0 })
          : undefined,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white dark:bg-slate-950"
              draw={(canvas) =>
                drawSingleLineCanvas(
                  canvas,
                  question.lineOptionB,
                  ANGLE_2AFC_SIZE,
                  CANVAS_THEME.shape.fill,
                  2.5,
                )
              }
              deps={[question.lineOptionB]}
            />
~~~~~
~~~~~typescript.new
          <CanvasView
            width={ANGLE_PROMPT_SIZE}
            height={ANGLE_PROMPT_SIZE}
            className="w-28 h-28 rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) =>
              drawSingleLineCanvas(
                canvas,
                question.promptLine,
                ANGLE_PROMPT_SIZE,
                CANVAS_THEME.status.accent,
                3.0,
              )
            }
            deps={[question.promptLine]}
          />
        </div>
      }
      optionA={{
        title: t('common.optionA'),
        isCorrect: isAHit,
        badge: showAnswer
          ? isAHit
            ? t('packs.angle.views.absoluteParallel')
            : t('packs.angle.views.deviationBadge', { deg: question.angularDeviation ?? 0 })
          : undefined,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawSingleLineCanvas(
                  canvas,
                  question.lineOptionA,
                  ANGLE_2AFC_SIZE,
                  CANVAS_THEME.shape.fill,
                  2.5,
                )
              }
              deps={[question.lineOptionA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('common.optionB'),
        isCorrect: isBHit,
        badge: showAnswer
          ? isBHit
            ? t('packs.angle.views.absoluteParallel')
            : t('packs.angle.views.deviationBadge', { deg: question.angularDeviation ?? 0 })
          : undefined,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawSingleLineCanvas(
                  canvas,
                  question.lineOptionB,
                  ANGLE_2AFC_SIZE,
                  CANVAS_THEME.shape.fill,
                  2.5,
                )
              }
              deps={[question.lineOptionB]}
            />
~~~~~

#### Acts 5: 清洗 Negative Space Pack 中的 Canvas 容器类名

清洗 `RatioEstimationView.tsx`、`AreaComparison2AfcView.tsx`、`ShapeMemory2AfcView.tsx` 与 `VertexFittingView.tsx`。

~~~~~act
patch_file
src/packs/negative_space/components/RatioEstimationView.tsx
~~~~~
~~~~~typescript.old
          <CanvasView
            width={NEGATIVE_SPACE_CANVAS_SIZE}
            height={NEGATIVE_SPACE_CANVAS_SIZE}
            className="w-full max-w-[340px] aspect-square rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-950"
            draw={(canvas) => {
~~~~~
~~~~~typescript.new
          <CanvasView
            width={NEGATIVE_SPACE_CANVAS_SIZE}
            height={NEGATIVE_SPACE_CANVAS_SIZE}
            className="w-full max-w-[340px] aspect-square rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) => {
~~~~~

~~~~~act
patch_file
src/packs/negative_space/components/AreaComparison2AfcView.tsx
~~~~~
~~~~~typescript.old
            <CanvasView
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white dark:bg-slate-950"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.verticesA,
                  size: TWO_AFC_CANVAS_SIZE,
                  fillColor: CANVAS_THEME.shape.fill,
                  strokeColor: CANVAS_THEME.shape.stroke,
                })
              }
              deps={[question.verticesA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('common.areaB'),
        isCorrect: isBHit,
        badge: t('packs.negative_space.views.whiteSpace', { ratio: question.negRatioB ?? 50 }),
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white dark:bg-slate-950"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.verticesB,
                  size: TWO_AFC_CANVAS_SIZE,
                  fillColor: CANVAS_THEME.shape.fill,
                  strokeColor: CANVAS_THEME.shape.stroke,
                })
              }
              deps={[question.verticesB]}
            />
~~~~~
~~~~~typescript.new
            <CanvasView
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.verticesA,
                  size: TWO_AFC_CANVAS_SIZE,
                  fillColor: CANVAS_THEME.shape.fill,
                  strokeColor: CANVAS_THEME.shape.stroke,
                })
              }
              deps={[question.verticesA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('common.areaB'),
        isCorrect: isBHit,
        badge: t('packs.negative_space.views.whiteSpace', { ratio: question.negRatioB ?? 50 }),
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.verticesB,
                  size: TWO_AFC_CANVAS_SIZE,
                  fillColor: CANVAS_THEME.shape.fill,
                  strokeColor: CANVAS_THEME.shape.stroke,
                })
              }
              deps={[question.verticesB]}
            />
~~~~~

~~~~~act
patch_file
src/packs/negative_space/components/ShapeMemory2AfcView.tsx
~~~~~
~~~~~typescript.old
          <canvas
            ref={canvasRef}
            width={NEGATIVE_SPACE_CANVAS_SIZE}
            height={NEGATIVE_SPACE_CANVAS_SIZE}
            className="w-full aspect-square rounded-2xl border border-border shadow-sm bg-white dark:bg-slate-950"
          />
          <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
            <div
              key={`${question.id}-${matchPhase}`}
              className="bg-indigo-600 h-full"
              style={{
                width: '100%',
                animation: `shrinkWidth ${question.displayTimeMs}ms linear forwards`,
              }}
            />
          </div>
        </div>
      ) : (
        <Choice2AfcContainer
          optionA={{
            key: 'A',
            title: t('common.areaA'),
            isCorrect: isTargetA,
            content: (
              <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
                <canvas
                  ref={matchOptionRefA}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm bg-white dark:bg-slate-950"
                />
              </div>
            ),
          }}
          optionB={{
            key: 'B',
            title: t('common.areaB'),
            isCorrect: isTargetB,
            content: (
              <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
                <canvas
                  ref={matchOptionRefB}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm bg-white dark:bg-slate-950"
                />
              </div>
            ),
          }}
~~~~~
~~~~~typescript.new
          <canvas
            ref={canvasRef}
            width={NEGATIVE_SPACE_CANVAS_SIZE}
            height={NEGATIVE_SPACE_CANVAS_SIZE}
            className="w-full aspect-square rounded-2xl border border-border shadow-sm bg-card"
          />
          <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
            <div
              key={`${question.id}-${matchPhase}`}
              className="bg-indigo-600 h-full"
              style={{
                width: '100%',
                animation: `shrinkWidth ${question.displayTimeMs}ms linear forwards`,
              }}
            />
          </div>
        </div>
      ) : (
        <Choice2AfcContainer
          optionA={{
            key: 'A',
            title: t('common.areaA'),
            isCorrect: isTargetA,
            content: (
              <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
                <canvas
                  ref={matchOptionRefA}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm bg-card"
                />
              </div>
            ),
          }}
          optionB={{
            key: 'B',
            title: t('common.areaB'),
            isCorrect: isTargetB,
            content: (
              <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
                <canvas
                  ref={matchOptionRefB}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm bg-card"
                />
              </div>
            ),
          }}
~~~~~

~~~~~act
patch_file
src/packs/negative_space/components/VertexFittingView.tsx
~~~~~
~~~~~typescript.old
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftFittingRef}
          width={FITTING_CANVAS_SIZE}
          height={FITTING_CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-white dark:bg-slate-950 shadow-inner block"
        />
      </div>
~~~~~
~~~~~typescript.new
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftFittingRef}
          width={FITTING_CANVAS_SIZE}
          height={FITTING_CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
        />
      </div>
~~~~~

#### Acts 6: 清洗 Perspective Pack 中的 Canvas 容器类名

清洗 `PerspectiveVpView.tsx`、`GestaltContinuation2AfcView.tsx`、`ProportionDivisionView.tsx` 与 `ProportionMigrationView.tsx`。

~~~~~act
patch_file
src/packs/perspective/components/PerspectiveVpView.tsx
~~~~~
~~~~~typescript.old
          <CanvasView
            width={PERSPECTIVE_CANVAS_SIZE}
            height={PERSPECTIVE_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-950"
            draw={(canvas) => {
~~~~~
~~~~~typescript.new
          <CanvasView
            width={PERSPECTIVE_CANVAS_SIZE}
            height={PERSPECTIVE_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) => {
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/GestaltContinuation2AfcView.tsx
~~~~~
~~~~~typescript.old
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white dark:bg-slate-950"
              draw={(canvas) =>
                drawGestaltCanvas(
                  canvas,
                  question.obstacle,
                  question.incomingLine,
                  question.lineOptionA,
                  PERSPECTIVE_2AFC_SIZE,
                )
              }
              deps={[question.incomingLine, question.lineOptionA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('common.optionB'),
        isCorrect: isBHit,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white dark:bg-slate-950"
              draw={(canvas) =>
                drawGestaltCanvas(
                  canvas,
                  question.obstacle,
                  question.incomingLine,
                  question.lineOptionB,
                  PERSPECTIVE_2AFC_SIZE,
                )
              }
              deps={[question.incomingLine, question.lineOptionB]}
            />
~~~~~
~~~~~typescript.new
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawGestaltCanvas(
                  canvas,
                  question.obstacle,
                  question.incomingLine,
                  question.lineOptionA,
                  PERSPECTIVE_2AFC_SIZE,
                )
              }
              deps={[question.incomingLine, question.lineOptionA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('common.optionB'),
        isCorrect: isBHit,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawGestaltCanvas(
                  canvas,
                  question.obstacle,
                  question.incomingLine,
                  question.lineOptionB,
                  PERSPECTIVE_2AFC_SIZE,
                )
              }
              deps={[question.incomingLine, question.lineOptionB]}
            />
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/ProportionDivisionView.tsx
~~~~~
~~~~~typescript.old
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleMouseLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label={t('packs.perspective.cards.perspective_proportion_division.title')}
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-950 touch-none select-none transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair md:cursor-none hover:border-indigo-400 hover:shadow-md'
          }`}
        />
~~~~~
~~~~~typescript.new
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleMouseLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label={t('packs.perspective.cards.perspective_proportion_division.title')}
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card touch-none select-none transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair md:cursor-none hover:border-indigo-400 hover:shadow-md'
          }`}
        />
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/ProportionMigrationView.tsx
~~~~~
~~~~~typescript.old
      {/* 顶部水平参考基准线面板 */}
      <div className="w-full bg-muted/60 border border-border rounded-2xl p-2.5 flex justify-center shadow-inner">
        <CanvasView
          width={280}
          height={48}
          className="w-full max-w-[280px] h-[48px] bg-white dark:bg-slate-950 rounded-xl border border-border shadow-sm"
          draw={(canvas) => {
            drawHorizontalReferenceCanvas(canvas, question.targetRatio ?? 0.5, 280, 48);
          }}
          deps={[question.targetRatio]}
        />
      </div>

      {/* 下方倾斜角度作答画布 */}
      <div className="w-full bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex flex-col items-center gap-2">
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleMouseLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label={t('packs.perspective.cards.perspective_proportion_migration.title')}
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-950 touch-none select-none transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair md:cursor-none hover:border-indigo-400 hover:shadow-md'
          }`}
        />
~~~~~
~~~~~typescript.new
      {/* 顶部水平参考基准线面板 */}
      <div className="w-full bg-muted/60 border border-border rounded-2xl p-2.5 flex justify-center shadow-inner">
        <CanvasView
          width={280}
          height={48}
          className="w-full max-w-[280px] h-[48px] bg-card rounded-xl border border-border shadow-sm"
          draw={(canvas) => {
            drawHorizontalReferenceCanvas(canvas, question.targetRatio ?? 0.5, 280, 48);
          }}
          deps={[question.targetRatio]}
        />
      </div>

      {/* 下方倾斜角度作答画布 */}
      <div className="w-full bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex flex-col items-center gap-2">
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleMouseLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label={t('packs.perspective.cards.perspective_proportion_migration.title')}
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card touch-none select-none transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair md:cursor-none hover:border-indigo-400 hover:shadow-md'
          }`}
        />
~~~~~

#### Acts 7: 清洗 Star Pack 中的 Canvas 容器类名

清洗 `StarCanvas.tsx`。

~~~~~act
patch_file
src/packs/star/views/StarCanvas.tsx
~~~~~
~~~~~typescript.old
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-white dark:bg-slate-950 shadow-inner block"
        />
      </div>
~~~~~
~~~~~typescript.new
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
        />
      </div>
~~~~~

### 下一步建议
1. **启动本地开发服务与构建校验**：运行 `npm run build` 或 `npx vitest run`，确认没有语法中断或类型断言问题。
2. **提交 Git 变更**：若各模块外观在浅色和深色主题下表现一致，可通过独立的 `[COMMIT]` 计划创建 Git 提交。
3. **推进阶段四**：逐步将 `PlanEditorHeader`、`Home` 等主干视图中的原生 `<button>` 替换为 `<Button variant="...">` 原语。
