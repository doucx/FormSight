import { useEffect, useRef, useState } from 'preact/hooks';

import {
  CANVAS_THEME,
  QuestionCardShell,
  SliderTrack,
  setupHiDpiCanvas,
  useCardTranslation,
  useTrackPointer,
} from '@formsight/card-sdk';
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
  const [currentH, setCurrentH] = useState<number>(0.5);

  const targetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const userCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 1.0,
    step: 0.01,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentH(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  useEffect(() => {
    setCurrentH(0.5);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

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
  const activeH = showAnswer && userAnswer ? userAnswer.userH : hoverVal !== null ? hoverVal : currentH;
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
    <QuestionCardShell
      hintText={t('instruction')}
      maxWidth="max-w-2xl"
    >
      {/* 边缘对比视口 */}
      <div className="w-full space-y-3">
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

      {/* Hurst 指数滑块调节区 */}
      <div className="w-full space-y-3 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{t('hurstExponent')}</span>
          <span className="font-mono text-base font-black text-primary">
            {activeH.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-muted-foreground text-xs">0.1</span>
          <SliderTrack
            trackRef={trackRef}
            pointerProps={pointerProps}
            activeVal={activeH}
            max={1.0}
            min={0}
            disabled={disabled}
            showAnswer={showAnswer}
            targetValue={question.targetH}
            userValue={userAnswer?.userH}
            tolerance={question.tolerance}
            showToleranceBand={true}
            isHit={userAnswer?.isHit}
          />
          <span className="font-bold font-mono text-muted-foreground text-xs">1.0</span>
        </div>
      </div>
    </QuestionCardShell>
  );
}