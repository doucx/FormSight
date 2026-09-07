好的，我已全面整理需要清理的卡片。除了此前确认的 3 款卡片外，还包括完全同构的 `angle_estimation`，以及 4 款在 2AFC 选项头部携带次级动态数据的卡片。我们将统一清理这些冗余元素与多语言无用键，并将所有 2AFC 选项反馈统一对齐为仅保留绿色 Check 图标的极简模式。

## [WIP] refactor(cards): 清除揭晓时的冗余文本报告并统一 2AFC 选项打勾反馈

### 用户需求
1. **第一类清理**：彻底移除 `angle_estimation`、`persp_vp_convergence`、`persp_prop_division` 与 `persp_prop_migration` 4 款卡片在作答揭晓时弹出的底部数值文本报告栏及其关联的多语言键，消除视觉干扰与布局抖动风险。
2. **第二类改造**：将 `angle_comparison_2afc`、`angle_parallel_2afc`、`neg_area_comparison_2afc` 与 `rel_decontextual_2afc` 4 款卡片选项卡头部动态展开的数值文本一并剔除，与系统中其余规范的 2AFC 卡片统一，仅保留明确的目标打勾图标（`Check`）。

### 评论
在快节奏的直觉知觉训练中（通常 0.5s~1s 内完成切题反馈），画布上的几何图元对比（目标绿色点/线 vs 错选红色点/线）与滑块刻度区间已足够传达感知误差。底部的长文本和选项卡头部的次级度量数据不仅无法被有效阅读，还会破坏界面的紧凑性并引入不必要的认知噪音。将所有 2AFC 反馈标准化为纯 `Check` 图标显著提升了全站视觉体验的一致性与专业度。

### 目标
1. 移除 `angle_estimation` 与 `persp_vp_convergence` 视图中滑块下方的文字报告 `<div>` 及对应多语言配置。
2. 移除 `persp_prop_division` 与 `persp_prop_migration` 视图传入 `QuestionCardShell` 的 `footer` 插槽及对应多语言配置。
3. 将 `angle_comparison_2afc`、`angle_parallel_2afc`、`neg_area_comparison_2afc` 与 `rel_decontextual_2afc` 选项头部的动态文字移除，仅在命中目标项保留 `Check` 图标，并清理对应多语言配置。

### 基本原理
1. 通过 `patch_file` 精确裁剪 JSX 渲染树中条件展示的文字区块，避免条件渲染引发的 Layout Shift。
2. 同步清理多语言 JSON 文件中的废弃键，保持代码与国际化资源的干净整洁。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/reveal-feedback #task/action/cleanup #task/state/begin

---

### Script

#### Acts 1: 清理第一类（滑块/视口底部冗余文本报告栏）

我们将移除 `angle_estimation`、`persp_vp_convergence`、`persp_prop_division` 和 `persp_prop_migration` 中的底部报告区块及多语言键。

~~~~~act
patch_file
src/cards/angle_estimation/AngleEstimationView.tsx
~~~~~
~~~~~typescript
          <span className="font-bold font-mono text-muted-foreground text-xs">180°</span>
        </div>

        <div
          className={`pt-2 border-t border-border flex items-center justify-between text-xs font-semibold min-h-[2rem] transition-opacity duration-150 ${
            showAnswer && userVal !== undefined ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden={!showAnswer}
        >
          <span className="text-muted-foreground">
            {t('trueAngle')}{' '}
            <span className="font-bold text-foreground font-mono">{targetVal}°</span>
          </span>
          <span
            className={
              isHit
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-rose-600 dark:text-rose-400 font-bold'
            }
          >
            {showAnswer && userVal !== undefined
              ? t('errorInfo', {
                  error: Math.round(Math.abs(userVal - targetVal) * 10) / 10,
                  tolerance,
                })
              : ''}
          </span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~
~~~~~typescript
          <span className="font-bold font-mono text-muted-foreground text-xs">180°</span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
patch_file
src/cards/angle_estimation/locales/zh-CN.json
~~~~~
~~~~~json
  "hint": "观察两射线夹角，调制滑块逼近精准度数",
  "label": "夹角估算值:",
  "trueAngle": "真实角度:",
  "errorInfo": "误差: {{error}}° (容错: ±{{tolerance}}°)"
}
~~~~~
~~~~~json
  "hint": "观察两射线夹角，调制滑块逼近精准度数",
  "label": "夹角估算值:"
}
~~~~~

~~~~~act
patch_file
src/cards/angle_estimation/locales/en-US.json
~~~~~
~~~~~json
  "hint": "Observe the angle formed by rays and modulate the slider to match",
  "label": "Angle Estimation Value:",
  "trueAngle": "Ground Truth Value:",
  "errorInfo": "Error: {{error}}° (Tolerance: ±{{tolerance}}°)"
}
~~~~~
~~~~~json
  "hint": "Observe the angle formed by rays and modulate the slider to match",
  "label": "Angle Estimation Value:"
}
~~~~~

~~~~~act
patch_file
src/cards/persp_vp_convergence/PerspVpConvergenceView.tsx
~~~~~
~~~~~typescript
          <span className="font-bold font-mono text-muted-foreground text-xs">360°</span>
        </div>

        <div
          className={`pt-2 border-t border-border flex items-center justify-between text-xs font-semibold min-h-[2rem] transition-opacity duration-150 ${
            showAnswer && userVal !== undefined ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden={!showAnswer}
        >
          <span className="text-muted-foreground">
            {t('vpTrueAngle')}{' '}
            <span className="font-bold text-foreground font-mono">{targetVal}°</span>
          </span>
          <span
            className={
              isHit
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-rose-600 dark:text-rose-400 font-bold'
            }
          >
            {showAnswer && userVal !== undefined
              ? t('vpErrorInfo', {
                  error: userAnswer?.errorValue ?? 0,
                  tolerance,
                })
              : ''}
          </span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~
~~~~~typescript
          <span className="font-bold font-mono text-muted-foreground text-xs">360°</span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
patch_file
src/cards/persp_vp_convergence/locales/zh-CN.json
~~~~~
~~~~~json
  "hint": "观察已有透视基准线，调制滑块旋转第三条射线使其交汇于同一灭点 (0°~360°)",
  "rayAngle": "射线倾角:",
  "vpTrueAngle": "精准交汇角:",
  "vpErrorInfo": "误差: {{error}}° (容错: ±{{tolerance}}°)"
}
~~~~~
~~~~~json
  "hint": "观察已有透视基准线，调制滑块旋转第三条射线使其交汇于同一灭点 (0°~360°)",
  "rayAngle": "射线倾角:"
}
~~~~~

~~~~~act
patch_file
src/cards/persp_vp_convergence/locales/en-US.json
~~~~~
~~~~~json
  "hint": "Observe the existing perspective lines and adjust the slider to converge rays at the vanishing point (0°~360°)",
  "rayAngle": "Ray Angle:",
  "vpTrueAngle": "True Convergence Angle:",
  "vpErrorInfo": "Error: {{error}}° (Tolerance: ±{{tolerance}}°)"
}
~~~~~
~~~~~json
  "hint": "Observe the existing perspective lines and adjust the slider to converge rays at the vanishing point (0°~360°)",
  "rayAngle": "Ray Angle:"
}
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_division/PerspPropDivisionView.tsx
~~~~~
~~~~~typescript
  const handleTouchEnd = () => {
    if (disabled || showAnswer) return;
    if (hoverPoint) {
      const finalPt = hoverPoint;
      setUserClickedPoint(finalPt);
      setHoverPoint(null);
      onAnswer(finalPt);
    }
  };

  const isHit = Boolean(userAnswer?.isHit);

  useEffect(() => {
    const canvas = canvasRef.current;
~~~~~
~~~~~typescript
  const handleTouchEnd = () => {
    if (disabled || showAnswer) return;
    if (hoverPoint) {
      const finalPt = hoverPoint;
      setUserClickedPoint(finalPt);
      setHoverPoint(null);
      onAnswer(finalPt);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_division/PerspPropDivisionView.tsx
~~~~~
~~~~~typescript
  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Disc}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      footer={
        <div
          className={`w-full pt-2 border-t border-border/80 flex items-center justify-between text-xs font-semibold min-h-[2rem] transition-opacity duration-150 ${
            showAnswer ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden={!showAnswer}
        >
          <span className="text-muted-foreground">
            {t('targetRatio')}{' '}
            <span className="font-bold text-foreground font-mono">
              {((question.targetRatio ?? 0) * 100).toFixed(1)}%
            </span>
          </span>
          <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
            {showAnswer
              ? t('userPosition', {
                  pos: ((userAnswer?.ratioProgress ?? 0) * 100).toFixed(1),
                  error: ((userAnswer?.errorValue ?? 0) * 100).toFixed(1),
                })
              : ''}
          </span>
        </div>
      }
    >
      <div className="w-full bg-accent/80 border border-border/60 dark:border-border rounded-2xl py-2 px-4 flex items-center justify-center shadow-xs">
~~~~~
~~~~~typescript
  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Disc}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
      <div className="w-full bg-accent/80 border border-border/60 dark:border-border rounded-2xl py-2 px-4 flex items-center justify-center shadow-xs">
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_division/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "平面比例与黄金分割盲切",
  "desc": "观察倾斜线段，单次点击盲切估测 1/2、1/3、1/4 或黄金分割点 (0.618)。",
  "hint": "在倾斜线段上滑动试探，松手确认比例位置（也可直接点击）",
  "targetRatio": "目标比例:",
  "userPosition": "作答位置: {{pos}}% (误差: ±{{error}}%)"
}
~~~~~
~~~~~json
{
  "title": "平面比例与黄金分割盲切",
  "desc": "观察倾斜线段，单次点击盲切估测 1/2、1/3、1/4 或黄金分割点 (0.618)。",
  "hint": "在倾斜线段上滑动试探，松手确认比例位置（也可直接点击）"
}
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_division/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Proportion Division",
  "desc": "Blindly cut lines at 1/2, 1/3, 1/4, or golden ratio (0.618).",
  "hint": "Slide along the tilted segment and release to confirm proportional division (or click directly)",
  "targetRatio": "Target Proportion:",
  "userPosition": "User Position: {{pos}}% (Error: ±{{error}}%)"
}
~~~~~
~~~~~json
{
  "title": "Proportion Division",
  "desc": "Blindly cut lines at 1/2, 1/3, 1/4, or golden ratio (0.618).",
  "hint": "Slide along the tilted segment and release to confirm proportional division (or click directly)"
}
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_migration/PerspPropMigrationView.tsx
~~~~~
~~~~~typescript
  const handleTouchEnd = () => {
    if (disabled || showAnswer) return;
    if (hoverPoint) {
      const finalPt = hoverPoint;
      setUserClickedPoint(finalPt);
      setHoverPoint(null);
      onAnswer(finalPt);
    }
  };

  const isHit = Boolean(userAnswer?.isHit);

  useEffect(() => {
    const canvas = canvasRef.current;
~~~~~
~~~~~typescript
  const handleTouchEnd = () => {
    if (disabled || showAnswer) return;
    if (hoverPoint) {
      const finalPt = hoverPoint;
      setUserClickedPoint(finalPt);
      setHoverPoint(null);
      onAnswer(finalPt);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_migration/PerspPropMigrationView.tsx
~~~~~
~~~~~typescript
  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={ArrowRightLeft}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      footer={
        <div
          className={`w-full pt-2 border-t border-border/80 flex items-center justify-between text-xs font-semibold min-h-[2rem] transition-opacity duration-150 ${
            showAnswer ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden={!showAnswer}
        >
          <span className="text-muted-foreground">
            {t('targetRatio')}{' '}
            <span className="font-bold text-foreground font-mono">
              {((question.targetRatio ?? 0) * 100).toFixed(1)}%
            </span>
          </span>
          <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
            {showAnswer
              ? t('userPosition', {
                  pos: ((userAnswer?.ratioProgress ?? 0) * 100).toFixed(1),
                  error: ((userAnswer?.errorValue ?? 0) * 100).toFixed(1),
                })
              : ''}
          </span>
        </div>
      }
    >
      <div className="w-full bg-muted/60 border border-border rounded-2xl p-2.5 flex justify-center shadow-inner">
~~~~~
~~~~~typescript
  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={ArrowRightLeft}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
      <div className="w-full bg-muted/60 border border-border rounded-2xl p-2.5 flex justify-center shadow-inner">
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_migration/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "空间比例角度迁移",
  "desc": "观察上方水平基准线上的任意比例目标点，在下方随机倾斜角度的线段上准确标出相同比例位置。",
  "hint": "观察上方基准线目标点，在下方倾斜线段滑动试探并松手确认",
  "targetRatio": "目标比例:",
  "userPosition": "作答位置: {{pos}}% (误差: ±{{error}}%)"
}
~~~~~
~~~~~json
{
  "title": "空间比例角度迁移",
  "desc": "观察上方水平基准线上的任意比例目标点，在下方随机倾斜角度的线段上准确标出相同比例位置。",
  "hint": "观察上方基准线目标点，在下方倾斜线段滑动试探并松手确认"
}
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_migration/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Proportion Migration",
  "desc": "Migrate proportional divisions from horizontal references onto randomly tilted lines.",
  "hint": "Observe the horizontal reference above and confirm the corresponding proportion on the tilted segment below",
  "targetRatio": "Target Proportion:",
  "userPosition": "User Position: {{pos}}% (Error: ±{{error}}%)"
}
~~~~~
~~~~~json
{
  "title": "Proportion Migration",
  "desc": "Migrate proportional divisions from horizontal references onto randomly tilted lines.",
  "hint": "Observe the horizontal reference above and confirm the corresponding proportion on the tilted segment below"
}
~~~~~

#### Acts 2: 改造第二类（2AFC 对比选项头部统一改为仅打勾图标）

我们将修改 `angle_comparison_2afc`、`angle_parallel_2afc`、`neg_area_comparison_2afc` 和 `rel_decontextual_2afc`，移除选项头部的数值文本，仅在正解上呈现 `Check` 图标，并清理对应多语言。

~~~~~act
patch_file
src/cards/angle_comparison_2afc/AngleComparison2AfcView.tsx
~~~~~
~~~~~typescript
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase flex-shrink-0">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs"
              >
                1
              </Badge>
              {t('areaA')}
            </span>

            {showAnswer && isAHit && (
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 flex-shrink-0">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {`${question.angleA}°`}
              </span>
            )}
            {showAnswer && !isAHit && (
              <span className="text-xs font-semibold text-muted-foreground flex-shrink-0">{`${question.angleA}°`}</span>
            )}
          </div>
~~~~~
~~~~~typescript
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase flex-shrink-0">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs"
              >
                1
              </Badge>
              {t('areaA')}
            </span>

            {showAnswer && isAHit && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
            )}
          </div>
~~~~~

~~~~~act
patch_file
src/cards/angle_comparison_2afc/AngleComparison2AfcView.tsx
~~~~~
~~~~~typescript
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase flex-shrink-0">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs"
              >
                2
              </Badge>
              {t('areaB')}
            </span>

            {showAnswer && isBHit && (
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 flex-shrink-0">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {`${question.angleB}°`}
              </span>
            )}
            {showAnswer && !isBHit && (
              <span className="text-xs font-semibold text-muted-foreground flex-shrink-0">{`${question.angleB}°`}</span>
            )}
          </div>
~~~~~
~~~~~typescript
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase flex-shrink-0">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs"
              >
                2
              </Badge>
              {t('areaB')}
            </span>

            {showAnswer && isBHit && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
            )}
          </div>
~~~~~

~~~~~act
patch_file
src/cards/angle_parallel_2afc/AngleParallel2AfcView.tsx
~~~~~
~~~~~typescript
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <Badge
              variant="secondary"
              size="sm"
              className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
            >
              1
            </Badge>

            {showAnswer && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 flex-shrink-0 ${
                  isAHit
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-muted-foreground'
                }`}
              >
                {isAHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isAHit
                  ? t('absoluteParallel')
                  : t('deviationBadge', { deg: question.angularDeviation ?? 0 })}
              </span>
            )}
          </div>
~~~~~
~~~~~typescript
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <Badge
              variant="secondary"
              size="sm"
              className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
            >
              1
            </Badge>

            {showAnswer && isAHit && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
            )}
          </div>
~~~~~

~~~~~act
patch_file
src/cards/angle_parallel_2afc/AngleParallel2AfcView.tsx
~~~~~
~~~~~typescript
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <Badge
              variant="secondary"
              size="sm"
              className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
            >
              2
            </Badge>

            {showAnswer && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 flex-shrink-0 ${
                  isBHit
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-muted-foreground'
                }`}
              >
                {isBHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isBHit
                  ? t('absoluteParallel')
                  : t('deviationBadge', { deg: question.angularDeviation ?? 0 })}
              </span>
            )}
          </div>
~~~~~
~~~~~typescript
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <Badge
              variant="secondary"
              size="sm"
              className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
            >
              2
            </Badge>

            {showAnswer && isBHit && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
            )}
          </div>
~~~~~

~~~~~act
patch_file
src/cards/angle_parallel_2afc/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "平行线基准辨识",
  "desc": "观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其平行的线段 (2AFC)。",
  "hint": "观察上方基准线，选出下方与它平行的线 (键 1 / 2)",
  "promptTitle": "平行基准线",
  "optionA": "选项 A",
  "optionB": "选项 B",
  "absoluteParallel": "平行",
  "deviationBadge": "偏转 {{deg}}°"
}
~~~~~
~~~~~json
{
  "title": "平行线基准辨识",
  "desc": "观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其平行的线段 (2AFC)。",
  "hint": "观察上方基准线，选出下方与它平行的线 (键 1 / 2)",
  "promptTitle": "平行基准线",
  "optionA": "选项 A",
  "optionB": "选项 B"
}
~~~~~

~~~~~act
patch_file
src/cards/angle_parallel_2afc/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Parallel Alignment",
  "desc": "Observe the prompt orientation and identify the strictly parallel line below (2AFC).",
  "hint": "Observe the prompt line and select the parallel one below (Keys 1 / 2)",
  "promptTitle": "Parallel Alignment Reference (Prompt)",
  "optionA": "Line A",
  "optionB": "Line B",
  "absoluteParallel": "Strictly Parallel",
  "deviationBadge": "Deviation {{deg}}°"
}
~~~~~
~~~~~json
{
  "title": "Parallel Alignment",
  "desc": "Observe the prompt orientation and identify the strictly parallel line below (2AFC).",
  "hint": "Observe the prompt line and select the parallel one below (Keys 1 / 2)",
  "promptTitle": "Parallel Alignment Reference (Prompt)",
  "optionA": "Line A",
  "optionB": "Line B"
}
~~~~~

~~~~~act
patch_file
src/cards/neg_area_comparison_2afc/NegAreaComparison2AfcView.tsx
~~~~~
~~~~~typescript
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <Badge
              variant="secondary"
              size="sm"
              className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
            >
              1
            </Badge>

            {showAnswer && isAHit && (
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 flex-shrink-0">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {t('whiteSpace', { ratio: question.negRatioA ?? 50 })}
              </span>
            )}
            {showAnswer && !isAHit && (
              <span className="text-xs font-semibold text-muted-foreground flex-shrink-0">
                {t('whiteSpace', { ratio: question.negRatioA ?? 50 })}
              </span>
            )}
          </div>
~~~~~
~~~~~typescript
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <Badge
              variant="secondary"
              size="sm"
              className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
            >
              1
            </Badge>

            {showAnswer && isAHit && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
            )}
          </div>
~~~~~

~~~~~act
patch_file
src/cards/neg_area_comparison_2afc/NegAreaComparison2AfcView.tsx
~~~~~
~~~~~typescript
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <Badge
              variant="secondary"
              size="sm"
              className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
            >
              2
            </Badge>

            {showAnswer && isBHit && (
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 flex-shrink-0">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {t('whiteSpace', { ratio: question.negRatioB ?? 50 })}
              </span>
            )}
            {showAnswer && !isBHit && (
              <span className="text-xs font-semibold text-muted-foreground flex-shrink-0">
                {t('whiteSpace', { ratio: question.negRatioB ?? 50 })}
              </span>
            )}
          </div>
~~~~~
~~~~~typescript
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <Badge
              variant="secondary"
              size="sm"
              className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
            >
              2
            </Badge>

            {showAnswer && isBHit && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
            )}
          </div>
~~~~~

~~~~~act
patch_file
src/cards/neg_area_comparison_2afc/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "负形面积二分判别",
  "desc": "快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。",
  "hint": "判别哪一侧的白色留白 (负形) 面积更大 (键 1 / 2)",
  "whiteSpace": "留白 {{ratio}}%"
}
~~~~~
~~~~~json
{
  "title": "负形面积二分判别",
  "desc": "快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。",
  "hint": "判别哪一侧的白色留白 (负形) 面积更大 (键 1 / 2)"
}
~~~~~

~~~~~act
patch_file
src/cards/neg_area_comparison_2afc/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Negative Area 2AFC",
  "desc": "Compare two silhouettes and identify which one has greater negative space area.",
  "hint": "Identify which side contains larger negative white space area (Keys 1 / 2)",
  "whiteSpace": "White Space {{ratio}}%"
}
~~~~~
~~~~~json
{
  "title": "Negative Area 2AFC",
  "desc": "Compare two silhouettes and identify which one has greater negative space area.",
  "hint": "Identify which side contains larger negative white space area (Keys 1 / 2)"
}
~~~~~

~~~~~act
patch_file
src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx
~~~~~
~~~~~typescript
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem] gap-2">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase flex-shrink-0">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs"
              >
                1
              </Badge>
              {t('common.areaA')}
            </span>

            {showAnswer && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 truncate ${
                  isAHit
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-muted-foreground'
                }`}
              >
                {isAHit && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                )}
                <span className="truncate">
                  {isAHit
                    ? t('physicallyBrighter', { v: question.centerColorA[2] })
                    : t('physicallyDarker', { v: question.centerColorA[2] })}
                </span>
              </span>
            )}
          </div>
~~~~~
~~~~~typescript
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem] gap-2">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase flex-shrink-0">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs"
              >
                1
              </Badge>
              {t('common.areaA')}
            </span>

            {showAnswer && isAHit && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            )}
          </div>
~~~~~

~~~~~act
patch_file
src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx
~~~~~
~~~~~typescript
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem] gap-2">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase flex-shrink-0">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs"
              >
                2
              </Badge>
              {t('common.areaB')}
            </span>

            {showAnswer && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 truncate ${
                  isBHit
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-muted-foreground'
                }`}
              >
                {isBHit && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                )}
                <span className="truncate">
                  {isBHit
                    ? t('physicallyBrighter', { v: question.centerColorB[2] })
                    : t('physicallyDarker', { v: question.centerColorB[2] })}
                </span>
              </span>
            )}
          </div>
~~~~~
~~~~~typescript
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem] gap-2">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase flex-shrink-0">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs"
              >
                2
              </Badge>
              {t('common.areaB')}
            </span>

            {showAnswer && isBHit && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            )}
          </div>
~~~~~

~~~~~act
patch_file
src/cards/rel_decontextual_2afc/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "环境穿透判别",
  "desc": "穿透强对比背景的视错觉陷阱，快速二选一判别色块的真实物理明度",
  "hint": "穿透背景视错觉，判别哪一侧中心色块「客观物理明度更高」",
  "physicallyBrighter": "物理明度更高 (V: {{v}}%)",
  "physicallyDarker": "物理更暗 (V: {{v}}%)"
}
~~~~~
~~~~~json
{
  "title": "环境穿透判别",
  "desc": "穿透强对比背景的视错觉陷阱，快速二选一判别色块的真实物理明度",
  "hint": "穿透背景视错觉，判别哪一侧中心色块「客观物理明度更高」"
}
~~~~~

~~~~~act
patch_file
src/cards/rel_decontextual_2afc/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Decontextualized 2AFC",
  "desc": "Pierce through simultaneous contrast illusions to identify the objectively brighter color.",
  "hint": "Pierce background illusion and identify the objectively brighter center square",
  "physicallyBrighter": "Physically Brighter (V: {{v}}%)",
  "physicallyDarker": "Physically Darker (V: {{v}}%)"
}
~~~~~
~~~~~json
{
  "title": "Decontextualized 2AFC",
  "desc": "Pierce through simultaneous contrast illusions to identify the objectively brighter color.",
  "hint": "Pierce background illusion and identify the objectively brighter center square"
}
~~~~~

### 下一步建议
1. **本地构建与测试**：执行 `pnpm test` 或 `pnpm build`，确保所有组件在移除废弃属性与国际化文案后类型检查完全通过。
2. **提交改动**：在确认变更效果无误后，指示我创建 `[COMMIT]` 计划以将这一批精简成果持久化提交。
