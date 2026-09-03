import { useEffect, useRef, useState } from 'preact/hooks';
import { StandardSliderView } from '../../components/common/StandardSliderView';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { useCardTranslation } from '../../core/i18n';
import { CANVAS_THEME } from '../../utils/theme';
import type { HitResult, QuestionData } from './types';
import { CANVAS_HEIGHT, CANVAS_WIDTH, generateFractalLine } from './utils/generator';

export interface FractalEdgeRoughnessViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
}

export function FractalEdgeRoughnessView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: FractalEdgeRoughnessViewProps) {
  const { t } = useCardTranslation('fractal_edge_roughness');
  const [currentH, setCurrentH] = useState(0.5);

  const targetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const userCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. 绘制目标边缘波形
  useEffect(() => {
    const canvas = targetCanvasRef.current;
    if (!canvas) return;
    const ctx = setupHiDpiCanvas(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (!ctx) return;

    ctx.fillStyle = CANVAS_THEME.bg.primary;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const points = generateFractalLine(question.targetH, question.targetSeed);
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = CANVAS_THEME.shape.stroke;
      ctx.lineWidth = 1.75;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }, [question.targetH, question.targetSeed]);

  // 2. 绘制用户当前调节边缘波形
  const activeH = showAnswer && userAnswer ? userAnswer.userH : currentH;
  useEffect(() => {
    const canvas = userCanvasRef.current;
    if (!canvas) return;
    const ctx = setupHiDpiCanvas(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (!ctx) return;

    ctx.fillStyle = CANVAS_THEME.bg.primary;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const points = generateFractalLine(activeH, question.userSeed);
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }

      ctx.strokeStyle = showAnswer
        ? userAnswer?.isHit
          ? CANVAS_THEME.status.hit
          : CANVAS_THEME.status.miss
        : CANVAS_THEME.status.accent;
      ctx.lineWidth = 1.85;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }, [activeH, question.userSeed, showAnswer, userAnswer]);

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('instruction')}
      label={t('hurstExponent')}
      min={0.1}
      max={1.0}
      step={0.01}
      initialValue={0.5}
      targetValue={question.targetH}
      userValue={userAnswer?.userH}
      tolerance={question.tolerance}
      showAnswer={showAnswer}
      isHit={userAnswer?.isHit}
      disabled={disabled}
      onValueChange={(_, val) => setCurrentH(val)}
      onAnswer={onAnswer}
      maxWidth="max-w-2xl"
      preview={
        <div className="w-full space-y-3">
          {/* 上视口：目标边缘 */}
          <div className="relative rounded-2xl border border-border bg-card p-3 shadow-inner">
            <span className="absolute top-2.5 left-3.5 text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
              {t('targetEdge')}
            </span>
            <canvas
              ref={targetCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="w-full h-24 sm:h-28 rounded-xl block"
            />
          </div>

          {/* 下视口：用户实时调制边缘 */}
          <div className="relative rounded-2xl border-2 border-primary/40 bg-card p-3 shadow-inner">
            <span className="absolute top-2.5 left-3.5 text-[10px] font-mono font-bold text-primary uppercase tracking-wider">
              {t('userEdge')}
            </span>
            <canvas
              ref={userCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="w-full h-24 sm:h-28 rounded-xl block"
            />
          </div>
        </div>
      }
    />
  );
}
