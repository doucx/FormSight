import { ArrowRightLeft } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { CanvasView } from '../../../components/common/CanvasView';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { Badge } from '../../../components/ui/badge';
import { useTranslation } from '../../../core/i18n';
import type { Point } from '../../../types';
import {
  PERSPECTIVE_CANVAS_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
  drawHorizontalReferenceCanvas,
  drawProportionCanvas,
} from '../utils/perspectiveUtils';

interface ProportionMigrationViewProps {
  question: PerspectiveQuestionData;
  showAnswer: boolean;
  userAnswer: PerspectiveHitResult | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function ProportionMigrationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: ProportionMigrationViewProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [userClickedPoint, setUserClickedPoint] = useState<Point | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  // 题目切换时重置状态
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setUserClickedPoint(null);
    setHoverPoint(null);
  }, [question.id]);

  /**
   * 将屏幕鼠标或触控坐标垂直正交投影吸附至下方倾斜线段，获得线段上的垂足点与比例参数 t
   */
  const getProjectedPoint = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const canvas = canvasRef.current;
      const line = question.divisionLine;
      if (!canvas || !line) return null;

      const rect = canvas.getBoundingClientRect();
      const scale = PERSPECTIVE_CANVAS_SIZE / rect.width;
      const mouseX = (clientX - rect.left) * scale;
      const mouseY = (clientY - rect.top) * scale;

      const dx = line.p2.x - line.p1.x;
      const dy = line.p2.y - line.p1.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return null;

      // 正交投影公式: t = (M - P1)·(P2 - P1) / |P2 - P1|^2
      const t = ((mouseX - line.p1.x) * dx + (mouseY - line.p1.y) * dy) / lenSq;
      const clampedT = Math.max(0, Math.min(1, t));

      return {
        x: Math.round((line.p1.x + clampedT * dx) * 10) / 10,
        y: Math.round((line.p1.y + clampedT * dy) * 10) / 10,
      };
    },
    [question.divisionLine],
  );

  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer) {
      if (hoverPoint) setHoverPoint(null);
      return;
    }
    const projPt = getProjectedPoint(e.clientX, e.clientY);
    if (projPt) {
      setHoverPoint(projPt);
    }
  };

  const handleMouseLeave = () => {
    if (hoverPoint) setHoverPoint(null);
  };

  const handleClick = (e: MouseEvent) => {
    if (disabled || showAnswer) return;
    const projPt = getProjectedPoint(e.clientX, e.clientY);
    if (!projPt) return;

    setUserClickedPoint(projPt);
    setHoverPoint(null);
    onAnswer(projPt);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || showAnswer || !e.touches[0]) return;
    const touch = e.touches[0];
    const projPt = getProjectedPoint(touch.clientX, touch.clientY);
    if (projPt) {
      setHoverPoint(projPt);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || showAnswer || !e.touches[0]) return;
    if (e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    const projPt = getProjectedPoint(touch.clientX, touch.clientY);
    if (projPt) {
      setHoverPoint(projPt);
    }
  };

  const handleTouchEnd = () => {
    if (disabled || showAnswer) return;
    if (hoverPoint) {
      const finalPt = hoverPoint;
      setUserClickedPoint(finalPt);
      setHoverPoint(null);
      onAnswer(finalPt);
    }
  };

  const isHit = Boolean(userAnswer?.isHit);

  // 触发下方倾斜 Canvas 重绘
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      drawProportionCanvas(
        canvas,
        question.divisionLine,
        question.targetDivisionPoint,
        userClickedPoint,
        hoverPoint,
        showAnswer,
        PERSPECTIVE_CANVAS_SIZE,
      );
    }
  }, [
    question.divisionLine,
    question.targetDivisionPoint,
    userClickedPoint,
    hoverPoint,
    showAnswer,
  ]);

  return (
    <QuestionCardShell
      hintText={t('packs.perspective.views.proportionMigrationHint')}
      hintIcon={ArrowRightLeft}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      footer={
        showAnswer ? (
          <div className="w-full pt-2 border-t border-border/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {t('packs.perspective.views.targetRatio')}{' '}
              <span className="font-bold text-foreground font-mono">
                {((question.targetRatio ?? 0) * 100).toFixed(1)}%
              </span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              {t('packs.perspective.views.userPosition', {
                pos: ((userAnswer?.ratioProgress ?? 0) * 100).toFixed(1),
                error: ((userAnswer?.errorValue ?? 0) * 100).toFixed(1),
              })}
            </span>
          </div>
        ) : null
      }
    >
      {/* 顶部水平参考基准线面板 */}
      <div className="w-full bg-muted/60 border border-border rounded-2xl p-2.5 flex justify-center shadow-inner">
        <CanvasView
          width={280}
          height={48}
          className="w-full max-w-[280px] h-[48px] bg-card rounded-xl border border-border shadow-sm"
          draw={(canvas) => {
            drawHorizontalReferenceCanvas(canvas, question.targetRatio ?? 0.5, 280, 48);
          }}
          deps={[question.targetRatio]}
        />
      </div>

      {/* 下方倾斜角度作答画布 */}
      <div className="w-full bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex flex-col items-center gap-2">
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleMouseLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label={t('packs.perspective.cards.perspective_proportion_migration.title')}
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card touch-none select-none transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair md:cursor-none hover:border-indigo-400 hover:shadow-md'
          }`}
        />
        <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <Badge
              variant="accent"
              size="sm"
              className="w-2.5 h-2.5 p-0 rounded-full border-2 border-indigo-600 bg-indigo-600"
            />
            <span>{t('common.startPercent')}</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <Badge
              variant="secondary"
              size="sm"
              className="w-2 h-2 p-0 rounded-full border-none bg-slate-400"
            />
            <span>{t('common.endPercent')}</span>
          </span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
