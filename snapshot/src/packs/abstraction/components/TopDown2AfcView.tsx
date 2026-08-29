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
