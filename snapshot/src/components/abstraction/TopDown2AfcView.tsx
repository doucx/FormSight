import { Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawRawGrayscaleNoiseField } from '../../utils/canvas/drawNotanField';
import { drawParticlesCanvas, drawSpinePromptCanvas } from '../../utils/canvas/drawParticles';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';
import { AnswerDiagnosticBar } from '../common/AnswerDiagnosticBar';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';

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

  const canvasMainRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const canvasThumbRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when question changes
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  useEffect(() => {
    if (isPoly && question.detailedPolygon) {
      drawPolygonCanvas({
        canvas: canvasMainRef.current,
        vertices: question.detailedPolygon,
        size: ABSTRACTION_CANVAS_SIZE,
      });
      drawPolygonCanvas({
        canvas: canvasRefA.current,
        vertices: question.simplifiedOptions?.[0],
        size: ABSTRACTION_2AFC_SIZE,
        fillColor: '#4F46E5',
      });
      drawPolygonCanvas({
        canvas: canvasRefB.current,
        vertices: question.simplifiedOptions?.[1],
        size: ABSTRACTION_2AFC_SIZE,
        fillColor: '#4F46E5',
      });
    } else if (mode === 'TD_GESTURE_2AFC') {
      drawSpinePromptCanvas(canvasThumbRef.current, question.promptSpine, ABSTRACTION_THUMB_SIZE);
      drawParticlesCanvas(canvasRefA.current, question.particlesA, ABSTRACTION_2AFC_SIZE);
      drawParticlesCanvas(canvasRefB.current, question.particlesB, ABSTRACTION_2AFC_SIZE);
    } else if (mode === 'TD_HULL_2AFC') {
      drawPolygonCanvas({
        canvas: canvasThumbRef.current,
        vertices: question.promptHull,
        size: ABSTRACTION_THUMB_SIZE,
        fillColor: '#4F46E5',
        strokeColor: '#3730A3',
      });
      drawPolygonCanvas({
        canvas: canvasRefA.current,
        vertices: question.hullDetailedA,
        size: ABSTRACTION_2AFC_SIZE,
      });
      drawPolygonCanvas({
        canvas: canvasRefB.current,
        vertices: question.hullDetailedB,
        size: ABSTRACTION_2AFC_SIZE,
      });
    } else if (mode === 'TD_NOTAN_2AFC') {
      if (question.promptNotanBuffer && question.notanSceneBufferA && question.notanSceneBufferB) {
        drawRawGrayscaleNoiseField(
          canvasThumbRef.current,
          question.promptNotanBuffer,
          question.notanFieldDim ?? 120,
          ABSTRACTION_THUMB_SIZE,
        );
        drawRawGrayscaleNoiseField(
          canvasRefA.current,
          question.notanSceneBufferA,
          question.notanFieldDim ?? 120,
          ABSTRACTION_2AFC_SIZE,
        );
        drawRawGrayscaleNoiseField(
          canvasRefB.current,
          question.notanSceneBufferB,
          question.notanFieldDim ?? 120,
          ABSTRACTION_2AFC_SIZE,
        );
      }
    }
  }, [mode, isPoly, question]);

  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  const isTargetA = isPoly
    ? question.correctPolyChoice === 'A'
    : userAnswer?.correctChoice === 'A' ||
      question.correctParticleChoice === 'A' ||
      question.correctHullChoice === 'A' ||
      question.correctNotanChoice === 'A';
  const isTargetB = !isTargetA;

  return (
    <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Columns className="w-3.5 h-3.5 text-indigo-600" />
          {isPoly ? '选择保留了主要转折大形的精简项' : '判别哪一侧具象细节符合上方骨架'}
        </div>
      )}

      {!isPoly && (
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            概括基准 (Prompt)
          </span>
          <canvas
            ref={canvasThumbRef}
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 rounded-xl border border-slate-200 shadow-sm"
          />
        </div>
      )}

      {isPoly && (
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            多边形原图
          </span>
          <canvas
            ref={canvasMainRef}
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-40 h-40 rounded-xl border border-slate-200 shadow-sm"
          />
        </div>
      )}

      <Choice2AfcContainer
        optionA={{
          key: 'A',
          title: '区域 A (键 1)',
          isCorrect: isTargetA,
          content: (
            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefA}
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
              />
            </div>
          ),
        }}
        optionB={{
          key: 'B',
          title: '区域 B (键 2)',
          isCorrect: isTargetB,
          content: (
            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefB}
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
              />
            </div>
          ),
        }}
        selectedChoice={selectedChoice}
        showAnswer={showAnswer}
        disabled={disabled}
        enableKeyboardShortcuts={true}
        onSelect={handleSelectChoice}
      />

    </div>
  );
}
