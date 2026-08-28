我已定位到问题：
1. **宽度溢出原因**：上方的题目卡片缺少显式的内层内容包裹槽（`w-full flex justify-center bg-white p-2...`），在 Flex 纵向排列中，由于外层缺少确切的最大宽度与盒模型约束，导致 Canvas 的宽度溢出到外部容器之外。
2. **三图尺寸不一致原因**：上方的 Prompt 使用了 `w-36 / w-40`，而下方的两个选项 Canvas 使用了 `w-full max-w-[200px]`，导致题目图与两个选项图尺寸不相等。

我将生成一个修复计划，统一「折线低模大形（`abs_polygon_decimation`）」及「几何大模寻形（`abs_td_hull_2afc`）」中**题目图**与**选项 A/B** 三个 Canvas 的容器排版与 CSS 尺寸约束（`w-full max-w-[200px] sm:max-w-[220px] aspect-square`），确保三者尺寸完全一致且为标准的 1:1 正方形。

## [WIP] fix: 统一折线低模卡片题目与选项三图等大正方形排版

### 错误分析

1. **题目卡片结构与选项不对齐**：选项 A/B 使用了 `w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner` 槽位包裹 `w-full max-w-[200px] aspect-square`，而题目区缺少这一层包装容器且宽度定义不同，导致 Canvas 超出容器且尺寸不统一。
2. **题目 Canvas 尺寸与选项 Canvas 尺寸不一致**：Prompt 画布使用了 `w-36 / w-40`，选项画布使用了 `max-w-[200px]`，两者的最大宽度限制不同。

### 用户需求

1. 解决「折线低模大形」中多边形原图 Canvas 宽度超出外层 div 容器的问题。
2. 确保「折线低模大形」中题目原图、选项 A、选项 B 共三个 Canvas 的显示尺寸完全相同，且均严格保持为 1:1 正方形。

### 评论

在 2AFC 折线大形对比识别中，题目多边形原图与两个候选低模具有相同的尺寸与视口比例，能够极大地减轻由于视口缩放带来的感知干扰，使用户可以专注对比转折点。

### 目标

1. 统一 `TopDown2AfcView.tsx` 中题目区与选项区的内层包裹卡片规范（`w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner`）。
2. 将题目 Canvas 与选项 A/B Canvas 的类名统一为 `w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block`。
3. 题目外层容器设定明确的 `w-full max-w-[250px] sm:max-w-[270px] mx-auto` 约束，彻底杜绝内容溢出。

### 基本原理

通过给题目提示区和选项区应用完全相同的 CSS 盒模型（同尺寸包装、同内边距、同 `aspect-square`），让三个 Canvas 处于完全相同的布局约束下，从而保证在任何设备宽度上渲染出的物理像素和比例均 100% 对齐。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/polygon-decimation-viewport #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 统一 `TopDown2AfcView.tsx` 中三图尺寸与防溢出容器

~~~~~act
patch_file
src/packs/abstraction/components/TopDown2AfcView.tsx
~~~~~
~~~~~typescript.old
  const renderPrompt = () => {
    if (isPoly && question.detailedPolygon) {
      return (
        <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner max-w-xs mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_polygon_decimation.promptTitle')}
          </span>
          <CanvasView
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-36 h-36 sm:w-40 sm:h-40 aspect-square rounded-xl border border-slate-200 shadow-sm block bg-white"
            draw={(canvas) =>
              drawPolygonCanvas({
                canvas,
                vertices: question.detailedPolygon,
                size: ABSTRACTION_CANVAS_SIZE,
              })
            }
            deps={[question.detailedPolygon]}
          />
        </div>
      );
    }

    if (mode === 'TD_GESTURE_2AFC') {
      return (
        <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner max-w-xs mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_gesture_2afc.promptTitle')}
          </span>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 aspect-square rounded-xl border border-slate-200 shadow-sm block bg-white"
            draw={(canvas) =>
              drawSpinePromptCanvas(canvas, question.promptSpine, ABSTRACTION_THUMB_SIZE)
            }
            deps={[question.promptSpine]}
          />
        </div>
      );
    }

    if (mode === 'TD_HULL_2AFC') {
      return (
        <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner max-w-xs mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_hull_2afc.promptTitle')}
          </span>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 aspect-square rounded-xl border border-slate-200 shadow-sm block bg-white"
            draw={(canvas) =>
              drawPolygonCanvas({
                canvas,
                vertices: question.promptHull,
                size: ABSTRACTION_THUMB_SIZE,
                fillColor: '#4F46E5',
                strokeColor: '#3730A3',
              })
            }
            deps={[question.promptHull]}
          />
        </div>
      );
    }

    if (mode === 'TD_NOTAN_2AFC' && question.promptNotanBuffer) {
      return (
        <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner max-w-xs mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_notan_2afc.promptTitle')}
          </span>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 aspect-square rounded-xl border border-slate-200 shadow-sm block bg-white"
            draw={(canvas) =>
              drawRawGrayscaleNoiseField(
                canvas,
                question.promptNotanBuffer,
                question.notanFieldDim ?? 120,
                ABSTRACTION_THUMB_SIZE,
              )
            }
            deps={[question.promptNotanBuffer, question.notanFieldDim]}
          />
        </div>
      );
    }

    return null;
  };

  const renderOptionCanvas = (choice: 'A' | 'B') => {
    if (isPoly && question.simplifiedOptions) {
      const verts = choice === 'A' ? question.simplifiedOptions[0] : question.simplifiedOptions[1];
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
          draw={(canvas) =>
            drawPolygonCanvas({
              canvas,
              vertices: verts,
              size: ABSTRACTION_2AFC_SIZE,
              fillColor: '#4F46E5',
            })
          }
          deps={[verts]}
        />
      );
    }

    if (mode === 'TD_GESTURE_2AFC') {
      const particles = choice === 'A' ? question.particlesA : question.particlesB;
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
          draw={(canvas) => drawParticlesCanvas(canvas, particles, ABSTRACTION_2AFC_SIZE)}
          deps={[particles]}
        />
      );
    }

    if (mode === 'TD_HULL_2AFC') {
      const verts = choice === 'A' ? question.hullDetailedA : question.hullDetailedB;
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
          draw={(canvas) =>
            drawPolygonCanvas({
              canvas,
              vertices: verts,
              size: ABSTRACTION_2AFC_SIZE,
            })
          }
          deps={[verts]}
        />
      );
    }

    if (mode === 'TD_NOTAN_2AFC') {
      const buf = choice === 'A' ? question.notanSceneBufferA : question.notanSceneBufferB;
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
          draw={(canvas) =>
            drawRawGrayscaleNoiseField(
              canvas,
              buf,
              question.notanFieldDim ?? 120,
              ABSTRACTION_2AFC_SIZE,
            )
          }
          deps={[buf, question.notanFieldDim]}
        />
      );
    }

    return null;
  };
~~~~~
~~~~~typescript.new
  const renderPrompt = () => {
    if (isPoly && question.detailedPolygon) {
      return (
        <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_polygon_decimation.promptTitle')}
          </span>
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ABSTRACTION_CANVAS_SIZE}
              height={ABSTRACTION_CANVAS_SIZE}
              className="w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.detailedPolygon,
                  size: ABSTRACTION_CANVAS_SIZE,
                })
              }
              deps={[question.detailedPolygon]}
            />
          </div>
        </div>
      );
    }

    if (mode === 'TD_GESTURE_2AFC') {
      return (
        <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_gesture_2afc.promptTitle')}
          </span>
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ABSTRACTION_THUMB_SIZE}
              height={ABSTRACTION_THUMB_SIZE}
              className="w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block"
              draw={(canvas) =>
                drawSpinePromptCanvas(canvas, question.promptSpine, ABSTRACTION_THUMB_SIZE)
              }
              deps={[question.promptSpine]}
            />
          </div>
        </div>
      );
    }

    if (mode === 'TD_HULL_2AFC') {
      return (
        <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_hull_2afc.promptTitle')}
          </span>
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ABSTRACTION_THUMB_SIZE}
              height={ABSTRACTION_THUMB_SIZE}
              className="w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.promptHull,
                  size: ABSTRACTION_THUMB_SIZE,
                  fillColor: '#4F46E5',
                  strokeColor: '#3730A3',
                })
              }
              deps={[question.promptHull]}
            />
          </div>
        </div>
      );
    }

    if (mode === 'TD_NOTAN_2AFC' && question.promptNotanBuffer) {
      return (
        <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_notan_2afc.promptTitle')}
          </span>
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ABSTRACTION_THUMB_SIZE}
              height={ABSTRACTION_THUMB_SIZE}
              className="w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block"
              draw={(canvas) =>
                drawRawGrayscaleNoiseField(
                  canvas,
                  question.promptNotanBuffer,
                  question.notanFieldDim ?? 120,
                  ABSTRACTION_THUMB_SIZE,
                )
              }
              deps={[question.promptNotanBuffer, question.notanFieldDim]}
            />
          </div>
        </div>
      );
    }

    return null;
  };

  const renderOptionCanvas = (choice: 'A' | 'B') => {
    if (isPoly && question.simplifiedOptions) {
      const verts = choice === 'A' ? question.simplifiedOptions[0] : question.simplifiedOptions[1];
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block"
          draw={(canvas) =>
            drawPolygonCanvas({
              canvas,
              vertices: verts,
              size: ABSTRACTION_2AFC_SIZE,
              fillColor: '#4F46E5',
            })
          }
          deps={[verts]}
        />
      );
    }

    if (mode === 'TD_GESTURE_2AFC') {
      const particles = choice === 'A' ? question.particlesA : question.particlesB;
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block"
          draw={(canvas) => drawParticlesCanvas(canvas, particles, ABSTRACTION_2AFC_SIZE)}
          deps={[particles]}
        />
      );
    }

    if (mode === 'TD_HULL_2AFC') {
      const verts = choice === 'A' ? question.hullDetailedA : question.hullDetailedB;
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block"
          draw={(canvas) =>
            drawPolygonCanvas({
              canvas,
              vertices: verts,
              size: ABSTRACTION_2AFC_SIZE,
            })
          }
          deps={[verts]}
        />
      );
    }

    if (mode === 'TD_NOTAN_2AFC') {
      const buf = choice === 'A' ? question.notanSceneBufferA : question.notanSceneBufferB;
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block"
          draw={(canvas) =>
            drawRawGrayscaleNoiseField(
              canvas,
              buf,
              question.notanFieldDim ?? 120,
              ABSTRACTION_2AFC_SIZE,
            )
          }
          deps={[buf, question.notanFieldDim]}
        />
      );
    }

    return null;
  };
~~~~~

### 下一步建议

1. **语法与类型校验**：运行 `npm run check` 确保格式和代码合规。
2. **多设备实机效果测试**：
   - 打开「折线低模大形（`abs_polygon_decimation`）」，确认上方的「多边形原图」完整居中于卡片中，没有宽度溢出现象。
   - 确认上方的原图与下方的选项 A、选项 B 三张画布大小完全一致，且均呈现完美的 1:1 正方形。
