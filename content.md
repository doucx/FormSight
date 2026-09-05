我们现在开始实施重构：将所有 2AFC 卡片标题栏统一简化为极简徽章 `[ 1 ]` / `[ 2 ]`，彻底剔除“区域 A (选项 A)”等冗余同义反复文本，并扁平化移除 ChoiceCard 内部嵌套的多余卡片容器，彻底消除挤压折行与视觉杂质。

## [WIP] fix: 统一 2AFC 卡片极简徽章标题与扁平化画布容器

### 错误分析
1. **文案冗余导致标题折行与布局抖动**：多款 2AFC 卡片在标头同时渲染了 `<Badge>1</Badge>`、`区域 A` 和 `(选项 A)`，导致在窄屏与并排场景下横向空间被完全挤占，揭晓答案时只要插入 Check 或数值标签，标题栏便会立即折行撑大高度，破坏左右等高与对齐。
2. **快捷键与视觉标号认知分裂**：底层逻辑与快捷键监听的是数字键 `1` / `2`，而界面上却混合呈现字母 `A` 与 `B`，增加用户的瞬时认知转换开销。
3. **嵌套容器（套娃）压缩有效画幅**：ChoiceCard 自身已包含卡片内边距与边框，内部又额外套了一层 `bg-card p-2 rounded-2xl border ...`，既侵蚀了画布尺寸，又产生了双层边框的视觉杂质。

### 用户需求
采用统一的“直接简化为徽章 `[ 1 ]` / `[ 2 ]`”方案，清除冗余文字，扁平化消除卡片嵌套容器。

### 评论
这是对卡片体系 UI/UX 的关键性重构。简化后的徽章既清晰地对应了键盘快捷键 `1` 和 `2`，又为揭晓状态保留了充裕的横向空间，彻底消除了由文字换行引起的布局抖动风险。

### 目标
1. 在 `abs_polygon_decimation`、`abs_td_gesture_2afc`、`abs_td_hull_2afc`、`abs_td_notan_2afc`、`neg_shape_match_2afc`、`neg_area_comparison_2afc`、`angle_parallel_2afc`、`persp_gestalt_continuation` 等 8 款卡片中：
   - 彻底移除 `区域 A (选项 A)` / `选项 A` 等冗余字符，保留极简徽章 `[ 1 ]` 与 `[ 2 ]`。
   - 设定标头 `min-h-[1.5rem]` 锁定恒定高度。
   - 移除内部嵌套的 `bg-card p-2 rounded-2xl border ...` 容器，直接居中挂载 Canvas。

### 基本原理
1. **单一信源与键位契合**：单个醒目的数字徽章能够直观指示选项与键盘触发键，不需要额外的文本修饰。
2. **扁平化与 0 换行**：极简徽章宽度仅 20px，即便右侧渲染长达 80px 的误差信息或图标，单行总宽亦稳定保持在 120px 以内，从源头绝缘折行。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/choice-card-refactor #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 重构抽象认知领域的 4 款 2AFC 卡片

扁平化画布容器，并精简 ChoiceCard 标头为仅保留数字徽章。

~~~~~act
patch_file
src/cards/abs_polygon_decimation/AbsPolygonDecimationView.tsx
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
              {`${t('common.areaA')} (${t('common.optionA')})`}
            </span>
            {showAnswer && isTargetA && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.simplifiedOptions[0],
                  size: OPTION_SIZE,
                  fillColor: CANVAS_THEME.status.accent,
                })
              }
              deps={[question.simplifiedOptions]}
            />
          </div>
        </ChoiceCard>

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
              {`${t('common.areaB')} (${t('common.optionB')})`}
            </span>
            {showAnswer && isTargetB && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.simplifiedOptions[1],
                  size: OPTION_SIZE,
                  fillColor: CANVAS_THEME.status.accent,
                })
              }
              deps={[question.simplifiedOptions]}
            />
          </div>
        </ChoiceCard>
~~~~~
~~~~~new
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <Badge
              variant="secondary"
              size="sm"
              className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
            >
              1
            </Badge>
            {showAnswer && isTargetA && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
            )}
          </div>

          <CanvasView
            width={OPTION_SIZE}
            height={OPTION_SIZE}
            className={CANVAS_OPTION_CLASS}
            draw={(canvas) =>
              drawPolygonCanvas({
                canvas,
                vertices: question.simplifiedOptions[0],
                size: OPTION_SIZE,
                fillColor: CANVAS_THEME.status.accent,
              })
            }
            deps={[question.simplifiedOptions]}
          />
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <Badge
              variant="secondary"
              size="sm"
              className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
            >
              2
            </Badge>
            {showAnswer && isTargetB && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
            )}
          </div>

          <CanvasView
            width={OPTION_SIZE}
            height={OPTION_SIZE}
            className={CANVAS_OPTION_CLASS}
            draw={(canvas) =>
              drawPolygonCanvas({
                canvas,
                vertices: question.simplifiedOptions[1],
                size: OPTION_SIZE,
                fillColor: CANVAS_THEME.status.accent,
              })
            }
            deps={[question.simplifiedOptions]}
          />
        </ChoiceCard>
~~~~~

~~~~~act
patch_file
src/cards/abs_td_gesture_2afc/AbsTdGesture2afcView.tsx
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
              {`${t('common.areaA')} (${t('common.optionA')})`}
            </span>
            {showAnswer && isTargetA && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) => drawParticlesCanvas(canvas, question.particlesA, OPTION_SIZE)}
              deps={[question.particlesA]}
            />
          </div>
        </ChoiceCard>

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
              {`${t('common.areaB')} (${t('common.optionB')})`}
            </span>
            {showAnswer && isTargetB && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) => drawParticlesCanvas(canvas, question.particlesB, OPTION_SIZE)}
              deps={[question.particlesB]}
            />
          </div>
        </ChoiceCard>
~~~~~
~~~~~new
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <Badge
              variant="secondary"
              size="sm"
              className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
            >
              1
            </Badge>
            {showAnswer && isTargetA && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
            )}
          </div>

          <CanvasView
            width={OPTION_SIZE}
            height={OPTION_SIZE}
            className={CANVAS_OPTION_CLASS}
            draw={(canvas) => drawParticlesCanvas(canvas, question.particlesA, OPTION_SIZE)}
            deps={[question.particlesA]}
          />
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <Badge
              variant="secondary"
              size="sm"
              className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
            >
              2
            </Badge>
            {showAnswer && isTargetB && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
            )}
          </div>

          <CanvasView
            width={OPTION_SIZE}
            height={OPTION_SIZE}
            className={CANVAS_OPTION_CLASS}
            draw={(canvas) => drawParticlesCanvas(canvas, question.particlesB, OPTION_SIZE)}
            deps={[question.particlesB]}
          />
        </ChoiceCard>
~~~~~

~~~~~act
patch_file
src/cards/abs_td_hull_2afc/AbsTdHull2afcView.tsx
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
              {`${t('common.areaA')} (${t('common.optionA')})`}
            </span>
            {showAnswer && isTargetA && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.hullDetailedA,
                  size: OPTION_SIZE,
                })
              }
              deps={[question.hullDetailedA]}
            />
          </div>
        </ChoiceCard>

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
              {`${t('common.areaB')} (${t('common.optionB')})`}
            </span>
            {showAnswer && isTargetB && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.hullDetailedB,
                  size: OPTION_SIZE,
                })
              }
              deps={[question.hullDetailedB]}
            />
          </div>
        </ChoiceCard>
~~~~~
~~~~~new
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <Badge
              variant="secondary"
              size="sm"
              className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
            >
              1
            </Badge>
            {showAnswer && isTargetA && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
            )}
          </div>

          <CanvasView
            width={OPTION_SIZE}
            height={OPTION_SIZE}
            className={CANVAS_OPTION_CLASS}
            draw={(canvas) =>
              drawPolygonCanvas({
                canvas,
                vertices: question.hullDetailedA,
                size: OPTION_SIZE,
              })
            }
            deps={[question.hullDetailedA]}
          />
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <Badge
              variant="secondary"
              size="sm"
              className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
            >
              2
            </Badge>
            {showAnswer && isTargetB && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
            )}
          </div>

          <CanvasView
            width={OPTION_SIZE}
            height={OPTION_SIZE}
            className={CANVAS_OPTION_CLASS}
            draw={(canvas) =>
              drawPolygonCanvas({
                canvas,
                vertices: question.hullDetailedB,
                size: OPTION_SIZE,
              })
            }
            deps={[question.hullDetailedB]}
          />
        </ChoiceCard>
~~~~~

~~~~~act
patch_file
src/cards/abs_td_notan_2afc/AbsTdNotan2afcView.tsx
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
              {`${t('common.areaA')} (${t('common.optionA')})`}
            </span>
            {showAnswer && isTargetA && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawRawGrayscaleNoiseField(
                  canvas,
                  question.notanSceneBufferA,
                  question.notanFieldDim ?? 120,
                  OPTION_SIZE,
                )
              }
              deps={[question.notanSceneBufferA, question.notanFieldDim]}
            />
          </div>
        </ChoiceCard>

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
              {`${t('common.areaB')} (${t('common.optionB')})`}
            </span>
            {showAnswer && isTargetB && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawRawGrayscaleNoiseField(
                  canvas,
                  question.notanSceneBufferB,
                  question.notanFieldDim ?? 120,
                  OPTION_SIZE,
                )
              }
              deps={[question.notanSceneBufferB, question.notanFieldDim]}
            />
          </div>
        </ChoiceCard>
~~~~~
~~~~~new
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <Badge
              variant="secondary"
              size="sm"
              className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
            >
              1
            </Badge>
            {showAnswer && isTargetA && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
            )}
          </div>

          <CanvasView
            width={OPTION_SIZE}
            height={OPTION_SIZE}
            className={CANVAS_OPTION_CLASS}
            draw={(canvas) =>
              drawRawGrayscaleNoiseField(
                canvas,
                question.notanSceneBufferA,
                question.notanFieldDim ?? 120,
                OPTION_SIZE,
              )
            }
            deps={[question.notanSceneBufferA, question.notanFieldDim]}
          />
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
            <Badge
              variant="secondary"
              size="sm"
              className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
            >
              2
            </Badge>
            {showAnswer && isTargetB && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
            )}
          </div>

          <CanvasView
            width={OPTION_SIZE}
            height={OPTION_SIZE}
            className={CANVAS_OPTION_CLASS}
            draw={(canvas) =>
              drawRawGrayscaleNoiseField(
                canvas,
                question.notanSceneBufferB,
                question.notanFieldDim ?? 120,
                OPTION_SIZE,
              )
            }
            deps={[question.notanSceneBufferB, question.notanFieldDim]}
          />
        </ChoiceCard>
~~~~~

#### Acts 2: 重构负形与透视领域的 4 款 2AFC 卡片

完成 `neg_shape_match_2afc`、`neg_area_comparison_2afc`、`angle_parallel_2afc` 以及 `persp_gestalt_continuation` 的极简徽章与扁平化改造。

~~~~~act
patch_file
src/cards/neg_shape_match_2afc/NegShapeMatch2AfcView.tsx
~~~~~
~~~~~old
          <ChoiceCard
            state={stateA}
            size="lg"
            disabled={disabled || matchPhase !== 'recall' || showAnswer}
            onClick={() => handleSelectChoice('A')}
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
              {showAnswer && isTargetA && (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
              )}
            </div>

            <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
              <canvas
                ref={matchOptionRefA}
                width={NEGATIVE_SPACE_CANVAS_SIZE}
                height={NEGATIVE_SPACE_CANVAS_SIZE}
                className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm bg-card"
              />
            </div>
          </ChoiceCard>

          <ChoiceCard
            state={stateB}
            size="lg"
            disabled={disabled || matchPhase !== 'recall' || showAnswer}
            onClick={() => handleSelectChoice('B')}
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
              {showAnswer && isTargetB && (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
              )}
            </div>

            <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
              <canvas
                ref={matchOptionRefB}
                width={NEGATIVE_SPACE_CANVAS_SIZE}
                height={NEGATIVE_SPACE_CANVAS_SIZE}
                className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm bg-card"
              />
            </div>
          </ChoiceCard>
~~~~~
~~~~~new
          <ChoiceCard
            state={stateA}
            size="lg"
            disabled={disabled || matchPhase !== 'recall' || showAnswer}
            onClick={() => handleSelectChoice('A')}
          >
            <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
              >
                1
              </Badge>
              {showAnswer && isTargetA && (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
              )}
            </div>

            <canvas
              ref={matchOptionRefA}
              width={NEGATIVE_SPACE_CANVAS_SIZE}
              height={NEGATIVE_SPACE_CANVAS_SIZE}
              className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm bg-card block"
            />
          </ChoiceCard>

          <ChoiceCard
            state={stateB}
            size="lg"
            disabled={disabled || matchPhase !== 'recall' || showAnswer}
            onClick={() => handleSelectChoice('B')}
          >
            <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
              >
                2
              </Badge>
              {showAnswer && isTargetB && (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
              )}
            </div>

            <canvas
              ref={matchOptionRefB}
              width={NEGATIVE_SPACE_CANVAS_SIZE}
              height={NEGATIVE_SPACE_CANVAS_SIZE}
              className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm bg-card block"
            />
          </ChoiceCard>
~~~~~

~~~~~act
patch_file
src/cards/neg_area_comparison_2afc/NegAreaComparison2AfcView.tsx
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

            {showAnswer && isAHit && (
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {t('whiteSpace', { ratio: question.negRatioA ?? 50 })}
              </span>
            )}
            {showAnswer && !isAHit && (
              <span className="text-xs font-semibold text-muted-foreground">
                {t('whiteSpace', { ratio: question.negRatioA ?? 50 })}
              </span>
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
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
        </ChoiceCard>

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

            {showAnswer && isBHit && (
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {t('whiteSpace', { ratio: question.negRatioB ?? 50 })}
              </span>
            )}
            {showAnswer && !isBHit && (
              <span className="text-xs font-semibold text-muted-foreground">
                {t('whiteSpace', { ratio: question.negRatioB ?? 50 })}
              </span>
            )}
          </div>

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
          </div>
        </ChoiceCard>
~~~~~
~~~~~new
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
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

          <CanvasView
            width={TWO_AFC_CANVAS_SIZE}
            height={TWO_AFC_CANVAS_SIZE}
            className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card block"
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
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
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

          <CanvasView
            width={TWO_AFC_CANVAS_SIZE}
            height={TWO_AFC_CANVAS_SIZE}
            className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card block"
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
        </ChoiceCard>
~~~~~

~~~~~act
patch_file
src/cards/angle_parallel_2afc/AngleParallel2AfcView.tsx
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
              {t('optionA')}
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
                  ? t('absoluteParallel')
                  : t('deviationBadge', { deg: question.angularDeviation ?? 0 })}
              </span>
            )}
          </div>

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
        </ChoiceCard>

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
              {t('optionB')}
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
                  ? t('absoluteParallel')
                  : t('deviationBadge', { deg: question.angularDeviation ?? 0 })}
              </span>
            )}
          </div>

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
          </div>
        </ChoiceCard>
~~~~~
~~~~~new
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
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

          <CanvasView
            width={ANGLE_2AFC_SIZE}
            height={ANGLE_2AFC_SIZE}
            className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card block"
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
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
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

          <CanvasView
            width={ANGLE_2AFC_SIZE}
            height={ANGLE_2AFC_SIZE}
            className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card block"
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
        </ChoiceCard>
~~~~~

~~~~~act
patch_file
src/cards/persp_gestalt_continuation/PerspGestaltContinuationView.tsx
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
              {t('optionA')}
            </span>

            {showAnswer && isAHit && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

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
                  question.lineOptionA,
                  PERSPECTIVE_2AFC_SIZE,
                )
              }
              deps={[question.incomingLine, question.lineOptionA]}
            />
          </div>
        </ChoiceCard>

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
              {t('optionB')}
            </span>

            {showAnswer && isBHit && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

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
          </div>
        </ChoiceCard>
~~~~~
~~~~~new
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
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

          <CanvasView
            width={PERSPECTIVE_2AFC_SIZE}
            height={PERSPECTIVE_2AFC_SIZE}
            className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card block"
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
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
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

          <CanvasView
            width={PERSPECTIVE_2AFC_SIZE}
            height={PERSPECTIVE_2AFC_SIZE}
            className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card block"
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
        </ChoiceCard>
~~~~~

### 下一步建议
1. **测试用例与构建验证**：运行全量单元测试与类型校验，验证修改后的卡片组件无任何破坏性影响。
2. **界面视觉巡检**：在双栏或移动端窄屏模式下连续做题体验 2AFC 模块，确认选项标头不仅高度平整恒定，且 Canvas 画幅展示更饱满、无多余内边距挤压。
3. **正式提交**：验证通过后可生成 `[COMMIT]` 计划正式提交变更。
