现在开始执行修复。我们将系统性解决 ChoiceCard 头部冗余文本挤占换行、答案揭晓时动态插入 DOM 导致卡片被突然撑高、以及 4AFC 候选格中的横向与纵向布局抖动问题。

## [WIP] fix: 修复卡片布局抖动与 ChoiceCard 溢出换行问题

### 错误分析
1. **ChoiceCard 头部宽度溢出与折行抖动**：在 `abs_palette_clustering` 等 4AFC 卡片中，同时渲染了 `<Badge>{idx + 1}</Badge>` 与 `{t('common.optionN')}`（“选项 N”），在紧凑网格中占满了横向宽度；当用户作答后条件渲染插入 `<Check />` 图标时，标题栏直接被挤压折行撑高，导致同排卡片高度不一、发生剧烈抖动。
2. **答题揭晓瞬间高度暴增**：`angle_estimation`、`perspVpConvergence`、`persp_prop_division` 和 `persp_prop_migration` 等卡片在未揭晓时没有渲染底部反馈 DOM，答题后突然挂载带边框的文本块，使整个卡片高度突增约 30~40px，引发明显的累积布局偏移 (CLS)。
3. **2AFC 标题栏基线未对齐**：二选一卡片在揭晓答案时动态插入长文本提示，若缺少高度占位与溢出保护，会导致左右选项卡片因行高变化而上下窜动。

### 用户需求
彻底修复 ChoiceCard 及相关训练卡片中的布局抖动问题，清除多余文本占用，确保各状态下尺寸恒定、基线平整。

### 评论
布局抖动不仅直接损害视觉品质与用户操作流畅度，在快速连续训练场景下还会对用户的注意力聚焦产生负面干扰。通过“精简冗余信息 + 预留固定高度占位 + CSS 透明度过渡”，可以在不破坏设计美感的前提下实现 0 CLS 的平滑响应。

### 目标
1. 精简 `abs_palette_clustering`、`abs_td_palette_2afc`、`rel_hue_induction`、`rel_vector_shift` 中 ChoiceCard 标头多余的“选项 N”文本，仅保留角标，并提供 `min-h` 弹性占位，杜绝折行。
2. 为 `angle_estimation` 和 `persp_vp_convergence` 的误差信息面板建立固定占位容器，从未揭晓到揭晓仅切换可见性与透明度，杜绝卡片高度突增。
3. 为 `persp_prop_division` 和 `persp_prop_migration` 的 footer 槽位提供常驻尺寸占位。
4. 为 `rel_decontextual_2afc` 和 `angle_comparison_2afc` 的标题栏加入恒定高度容器与文本截断约束。

### 基本原理
1. **消除冗余视觉噪音**：在 4AFC 窄卡片中，角标 `[ 1 ]` 本身已明确传达了键盘序号与选项标号，再并列渲染“选项 1”属于冗余信息。移除后可释放出 50px 以上横向安全空间。
2. **常驻占位与无缝过渡**：将 `{showAnswer && <Div>}` 改造为始终占据固定垂直尺寸的容器，未揭晓时通过 `opacity-0 pointer-events-none` 保持静默占位，揭晓时平滑淡入，从根本上杜绝 DOM 结构突变对父级高度的冲击。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/layout-shift-prevention #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 4AFC 候选卡片标头宽度溢出与冗余文本

在 4 个多选卡片中移除重复的“选项 N”文本，并为 ChoiceCard 标头设置固定最小高度与弹性收缩保护。

~~~~~act
patch_file
src/cards/abs_palette_clustering/AbsPaletteClusteringView.tsx
~~~~~
~~~~~old
              <div className="flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5 text-xs font-black text-foreground">
                  <Badge
                    variant="secondary"
                    size="sm"
                    className="w-5 h-5 p-0 justify-center font-mono text-xs"
                  >
                    {idx + 1}
                  </Badge>
                  {t('common.optionN', { num: idx + 1 })}
                </span>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
                )}
              </div>
~~~~~
~~~~~new
              <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
                <Badge
                  variant="secondary"
                  size="sm"
                  className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
                >
                  {idx + 1}
                </Badge>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
                )}
              </div>
~~~~~

~~~~~act
patch_file
src/cards/abs_td_palette_2afc/AbsTdPalette2afcView.tsx
~~~~~
~~~~~old
              <div className="flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5 text-xs font-black text-foreground">
                  <Badge
                    variant="secondary"
                    size="sm"
                    className="w-5 h-5 p-0 justify-center font-mono text-xs"
                  >
                    {idx + 1}
                  </Badge>
                  {t('common.screenN', { num: idx + 1 })}
                </span>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
                )}
              </div>
~~~~~
~~~~~new
              <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
                <Badge
                  variant="secondary"
                  size="sm"
                  className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
                >
                  {idx + 1}
                </Badge>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
                )}
              </div>
~~~~~

~~~~~act
patch_file
src/cards/rel_hue_induction/RelHueInductionView.tsx
~~~~~
~~~~~old
              <div className="flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5 text-xs font-black text-foreground">
                  <Badge
                    variant="secondary"
                    size="sm"
                    className="w-5 h-5 p-0 justify-center font-mono text-xs"
                  >
                    {idx + 1}
                  </Badge>
                  {t('common.candidateN', { num: idx + 1 })}
                </span>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
                )}
              </div>
~~~~~
~~~~~new
              <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
                <Badge
                  variant="secondary"
                  size="sm"
                  className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
                >
                  {idx + 1}
                </Badge>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
                )}
              </div>
~~~~~

~~~~~act
patch_file
src/cards/rel_vector_shift/RelVectorShiftView.tsx
~~~~~
~~~~~old
              <div className="flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5 text-xs font-black text-foreground">
                  <Badge
                    variant="secondary"
                    size="sm"
                    className="w-5 h-5 p-0 justify-center font-mono text-xs"
                  >
                    {idx + 1}
                  </Badge>
                  {t('common.candidateN', { num: idx + 1 })}
                </span>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
                )}
              </div>
~~~~~
~~~~~new
              <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
                <Badge
                  variant="secondary"
                  size="sm"
                  className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
                >
                  {idx + 1}
                </Badge>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
                )}
              </div>
~~~~~

#### Acts 2: 为滑块与透视卡片底部状态区建立常驻高度占位

将条件渲染的底部提示条改为常驻占位容器，仅在答案揭晓时切换透明度与内容，避免作答后卡片高度暴增跳动。

~~~~~act
patch_file
src/cards/angle_estimation/AngleEstimationView.tsx
~~~~~
~~~~~old
        {showAnswer && userVal !== undefined && (
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-semibold">
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
              {t('errorInfo', {
                error: Math.round(Math.abs(userVal - targetVal) * 10) / 10,
                tolerance,
              })}
            </span>
          </div>
        )}
~~~~~
~~~~~new
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
~~~~~

~~~~~act
patch_file
src/cards/persp_vp_convergence/PerspVpConvergenceView.tsx
~~~~~
~~~~~old
        {showAnswer && userVal !== undefined && (
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-semibold">
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
              {t('vpErrorInfo', {
                error: userAnswer?.errorValue ?? 0,
                tolerance,
              })}
            </span>
          </div>
        )}
~~~~~
~~~~~new
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
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_division/PerspPropDivisionView.tsx
~~~~~
~~~~~old
      footer={
        showAnswer ? (
          <div className="w-full pt-2 border-t border-border/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {t('targetRatio')}{' '}
              <span className="font-bold text-foreground font-mono">
                {((question.targetRatio ?? 0) * 100).toFixed(1)}%
              </span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              {t('userPosition', {
                pos: ((userAnswer?.ratioProgress ?? 0) * 100).toFixed(1),
                error: ((userAnswer?.errorValue ?? 0) * 100).toFixed(1),
              })}
            </span>
          </div>
        ) : null
      }
~~~~~
~~~~~new
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
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_migration/PerspPropMigrationView.tsx
~~~~~
~~~~~old
      footer={
        showAnswer ? (
          <div className="w-full pt-2 border-t border-border/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {t('targetRatio')}{' '}
              <span className="font-bold text-foreground font-mono">
                {((question.targetRatio ?? 0) * 100).toFixed(1)}%
              </span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              {t('userPosition', {
                pos: ((userAnswer?.ratioProgress ?? 0) * 100).toFixed(1),
                error: ((userAnswer?.errorValue ?? 0) * 100).toFixed(1),
              })}
            </span>
          </div>
        ) : null
      }
~~~~~
~~~~~new
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
~~~~~

#### Acts 3: 优化 2AFC 卡片标头折行保护与基线高度锁定

为 `rel_decontextual_2afc` 与 `angle_comparison_2afc` 加入基线高度锁定与横向文本截断保护。

~~~~~act
patch_file
src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx
~~~~~
~~~~~old
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
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
                className={`text-xs font-semibold flex items-center gap-1 ${
                  isAHit
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-muted-foreground'
                }`}
              >
                {isAHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isAHit
                  ? t('physicallyBrighter', { v: question.centerColorA[2] })
                  : t('physicallyDarker', { v: question.centerColorA[2] })}
              </span>
            )}
          </div>
~~~~~
~~~~~new
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
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
                {isAHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />}
                <span className="truncate">
                  {isAHit
                    ? t('physicallyBrighter', { v: question.centerColorA[2] })
                    : t('physicallyDarker', { v: question.centerColorA[2] })}
                </span>
              </span>
            )}
          </div>
~~~~~

~~~~~act
patch_file
src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx
~~~~~
~~~~~old
        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
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
                className={`text-xs font-semibold flex items-center gap-1 ${
                  isBHit
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-muted-foreground'
                }`}
              >
                {isBHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isBHit
                  ? t('physicallyBrighter', { v: question.centerColorB[2] })
                  : t('physicallyDarker', { v: question.centerColorB[2] })}
              </span>
            )}
          </div>
~~~~~
~~~~~new
        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
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
                {isBHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />}
                <span className="truncate">
                  {isBHit
                    ? t('physicallyBrighter', { v: question.centerColorB[2] })
                    : t('physicallyDarker', { v: question.centerColorB[2] })}
                </span>
              </span>
            )}
          </div>
~~~~~

~~~~~act
patch_file
src/cards/angle_comparison_2afc/AngleComparison2AfcView.tsx
~~~~~
~~~~~old
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
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
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {`${question.angleA}°`}
              </span>
            )}
            {showAnswer && !isAHit && (
              <span className="text-xs font-semibold text-muted-foreground">{`${question.angleA}°`}</span>
            )}
          </div>
~~~~~
~~~~~new
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
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

~~~~~act
patch_file
src/cards/angle_comparison_2afc/AngleComparison2AfcView.tsx
~~~~~
~~~~~old
        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
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
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {`${question.angleB}°`}
              </span>
            )}
            {showAnswer && !isBHit && (
              <span className="text-xs font-semibold text-muted-foreground">{`${question.angleB}°`}</span>
            )}
          </div>
~~~~~
~~~~~new
        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
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

### 下一步建议
1. **自动化测试验证**：运行 `pnpm test`（或对应测试命令），确认所有语言包 key 与卡片逻辑测试均正常通过。
2. **移动端窄屏回归校验**：在移动端视口（如 375px 宽度）下体验 `abs_palette_clustering` 与 `rel_decontextual_2afc`，验证连续答题揭晓时卡片高度是否完全稳定。
3. **提交代码**：验证完成后，可生成独立的 `[COMMIT]` 计划将此次布局抖动修复正式提交到版本库。
