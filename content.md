我将为你修复 `TopDown2AfcView.tsx` 中的导出异常，使用 `write_file` 重新写入完整的组件代码。

## [WIP] fix: 修复 TopDown2AfcView 模块导出缺失与语法问题

### 错误分析
在执行上一次对 `TopDown2AfcView.tsx` 的 patch 补丁时，多段重叠的替换逻辑导致文件末尾或主函数签名未能正确闭合，使得 Vite 开发服务器在解析该模块时未找到具名导出 `TopDown2AfcView`，抛出 `Uncaught SyntaxError: The requested module ... does not provide an export named 'TopDown2AfcView'`。

### 用户需求
修复 `src/packs/abstraction/components/TopDown2AfcView.tsx`，确保导出 `TopDown2AfcView` 命名组件且无任何语法错误。

### 评论
对于较长且嵌套较多的 TSX 组件，使用 `write_file` 全量写入可有效避免 patch 错位或重复替换带来的破坏。

### 目标
1. 完整重写 `src/packs/abstraction/components/TopDown2AfcView.tsx`。
2. 确保正确导出 `TopDown2AfcView` 组件并保留 `PromptFrame` 样式提炼优化。

### 基本原理
通过 `write_file` 覆盖写入包含正确 import/export、样式抽取以及完整组件渲染生命周期的源代码，彻底恢复模块解析。

### 标签
#intent/fix #flow/ready #priority/critical #comp/interfaces #concept/ui #scope/core #ai/instruct #task/domain/refactoring #task/object/topdown2afc-export #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 全量写回 `TopDown2AfcView.tsx`

~~~~~act
write_file
src/packs/abstraction/components/TopDown2AfcView.tsx
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import { useTranslation } from '../../../core/i18n';
import { drawRawGrayscaleNoiseField } from '../canvas/drawNotanField';
import { drawParticlesCanvas, drawSpinePromptCanvas } from '../canvas/drawParticles';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';

const CANVAS_OPTION_CLASS =
  'w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block';

function PromptFrame({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {title}
      </span>
      <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
        {children}
      </div>
    </div>
  );
}

interface TopDown2AfcViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function TopDown2AfcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: TopDown2AfcViewProps) {
  const { t } = useTranslation();
  const { mode } = question;
  const isPoly = mode === 'POLYGON_DECIMATION';

  const isTargetA = isPoly
    ? question.correctPolyChoice === 'A'
    : userAnswer?.correctChoice === 'A' ||
      question.correctParticleChoice === 'A' ||
      question.correctHullChoice === 'A' ||
      question.correctNotanChoice === 'A';
  const isTargetB = !isTargetA;

  const renderPrompt = () => {
    if (isPoly && question.detailedPolygon) {
      return (
        <PromptFrame title={t('packs.abstraction.cards.abs_polygon_decimation.promptTitle')}>
          <CanvasView
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className={CANVAS_OPTION_CLASS}
            draw={(canvas) =>
              drawPolygonCanvas({
                canvas,
                vertices: question.detailedPolygon,
                size: ABSTRACTION_CANVAS_SIZE,
              })
            }
            deps={[question.detailedPolygon]}
          />
        </PromptFrame>
      );
    }

    if (mode === 'TD_GESTURE_2AFC') {
      return (
        <PromptFrame title={t('packs.abstraction.cards.abs_td_gesture_2afc.promptTitle')}>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className={CANVAS_OPTION_CLASS}
            draw={(canvas) =>
              drawSpinePromptCanvas(canvas, question.promptSpine, ABSTRACTION_THUMB_SIZE)
            }
            deps={[question.promptSpine]}
          />
        </PromptFrame>
      );
    }

    if (mode === 'TD_HULL_2AFC') {
      return (
        <PromptFrame title={t('packs.abstraction.cards.abs_td_hull_2afc.promptTitle')}>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className={CANVAS_OPTION_CLASS}
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
        </PromptFrame>
      );
    }

    if (mode === 'TD_NOTAN_2AFC' && question.promptNotanBuffer) {
      return (
        <PromptFrame title={t('packs.abstraction.cards.abs_td_notan_2afc.promptTitle')}>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className={CANVAS_OPTION_CLASS}
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
        </PromptFrame>
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
          className={CANVAS_OPTION_CLASS}
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
          className={CANVAS_OPTION_CLASS}
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
          className={CANVAS_OPTION_CLASS}
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
          className={CANVAS_OPTION_CLASS}
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

  const hint = isPoly
    ? t('packs.abstraction.cards.abs_polygon_decimation.hint')
    : t('packs.abstraction.cards.abs_td_gesture_2afc.hint');

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={hint}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      prompt={renderPrompt()}
      optionA={{
        title: `${t('common.areaA')} (${t('common.optionA')})`,
        isCorrect: isTargetA,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            {renderOptionCanvas('A')}
          </div>
        ),
      }}
      optionB={{
        title: `${t('common.areaB')} (${t('common.optionB')})`,
        isCorrect: isTargetB,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            {renderOptionCanvas('B')}
          </div>
        ),
      }}
    />
  );
}
~~~~~

### 下一步建议
1. 刷新前端开发服务器页面，确认 `TopDown2AfcView` 导入错误消除且页面渲染正常。
2. 运行构建与检查命令（如 `npm run build` 或 `python scripts/check_dry.py --include-packs`）验证整体代码库无任何语法与类型异常。
