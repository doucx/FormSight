import { Target } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';

import {
  CANVAS_THEME,
  type Point,
  PointClickCanvas,
  QuestionCardShell,
  drawDot,
  findNearestPointInGrid,
  getDynamicDotRadius,
  setupHiDpiCanvas,
  useCardTranslation,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE } from './utils/generator';

export interface StarSingleViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function StarSingleView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: StarSingleViewProps) {
  const { t } = useCardTranslation('star_single');
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = setupHiDpiCanvas(leftCanvas, CANVAS_SIZE, CANVAS_SIZE);
      if (ctx) {
        ctx.fillStyle = CANVAS_THEME.bg.primary;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        drawDot(
          ctx,
          question.anchorA.x,
          question.anchorA.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );

        drawDot(
          ctx,
          question.targetB.x,
          question.targetB.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );
      }
    }
  }, [question]);

  const handleCommitPoint = (clickPoint: Point) => {
    const { nearestPoint, isWithinRange } = findNearestPointInGrid(
      clickPoint,
      question.distractorPoints,
    );
    if (!isWithinRange) return;
    onAnswer(nearestPoint);
  };

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Target}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-5xl"
    >
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full mx-auto">
        <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
          <canvas
            ref={leftCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
          />
        </div>

        <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
          <PointClickCanvas
            canvasSize={CANVAS_SIZE}
            gridPoints={question.distractorPoints}
            targetPoint={question.targetB}
            userNearestPoint={userAnswer?.nearestGridPoint}
            anchors={[question.anchorA]}
            showAnswer={showAnswer}
            isHit={userAnswer?.isHit}
            disabled={disabled}
            maxDisplayWidth="w-full h-full aspect-square"
            onCommitPoint={handleCommitPoint}
          />
        </div>
      </div>
    </QuestionCardShell>
  );
}
