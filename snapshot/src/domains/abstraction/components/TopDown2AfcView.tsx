import { Columns } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import { drawRawGrayscaleNoiseField } from '../../../utils/canvas/drawNotanField';
import { drawParticlesCanvas, drawSpinePromptCanvas } from '../../../utils/canvas/drawParticles';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';

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
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            多边形原图
          </span>
          <CanvasView
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-40 h-40 rounded-xl border border-slate-200 shadow-sm"
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
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            概括基准 (Prompt)
          </span>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 rounded-xl border border-slate-200 shadow-sm"
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
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            概括基准 (Prompt)
          </span>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 rounded-xl border border-slate-200 shadow-sm"
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
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            概括基准 (Prompt)
          </span>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 rounded-xl border border-slate-200 shadow-sm"
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

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={isPoly ? '选择保留了主要转折大形的精简项' : '判别哪一侧具象细节符合上方骨架'}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      prompt={renderPrompt()}
      optionA={{
        title: '区域 A (键 1)',
        isCorrect: isTargetA,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            {renderOptionCanvas('A')}
          </div>
        ),
      }}
      optionB={{
        title: '区域 B (键 2)',
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
