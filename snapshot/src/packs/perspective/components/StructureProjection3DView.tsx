import { Box } from 'lucide-preact';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { useTranslation } from '../../../core/i18n';
import type { Point } from '../../../types';
import {
  PERSPECTIVE_CANVAS_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
  draw3DCubeWireframe,
} from '../utils/perspectiveUtils';

interface StructureProjection3DViewProps {
  question: PerspectiveQuestionData;
  showAnswer: boolean;
  userAnswer: PerspectiveHitResult | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function StructureProjection3DView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: StructureProjection3DViewProps) {
  const { t } = useTranslation();
  const isHit = Boolean(userAnswer?.isHit);
  const targetPt3D = question.targetPoint3D;
  const dim = question.gridDim3D ?? 3;

  return (
    <QuestionCardShell
      hintText={t('packs.perspective.views.structureHint')}
      hintIcon={Box}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full items-center">
        {/* 左侧三视图正交切面预览 */}
        <div className="bg-muted/60 p-4 rounded-2xl border border-border flex flex-col gap-3">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">
            {t('common.viewTriAxis')}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-muted-foreground">
            {/* 顶视图 (X-Z) */}
            <div className="flex flex-col items-center gap-1 bg-card p-2 rounded-xl border border-border">
              <span className="text-muted-foreground font-bold">{t('common.topView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 dark:border-indigo-900 rounded grid relative bg-slate-50 dark:bg-slate-950"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.x + 0.5) / dim) * 100}%`,
                      top: `${((targetPt3D.z + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* 正视图 (X-Y) */}
            <div className="flex flex-col items-center gap-1 bg-card p-2 rounded-xl border border-border">
              <span className="text-muted-foreground font-bold">{t('common.frontView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 dark:border-indigo-900 rounded grid relative bg-slate-50 dark:bg-slate-950"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.x + 0.5) / dim) * 100}%`,
                      top: `${((dim - 1 - targetPt3D.y + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* 侧视图 (Z-Y) */}
            <div className="flex flex-col items-center gap-1 bg-card p-2 rounded-xl border border-border">
              <span className="text-muted-foreground font-bold">{t('common.sideView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 dark:border-indigo-900 rounded grid relative bg-slate-50 dark:bg-slate-950"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.z + 0.5) / dim) * 100}%`,
                      top: `${((dim - 1 - targetPt3D.y + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧 3D 立方体透视交互点阵 */}
        <div className="flex justify-center">
          <PointClickCanvas
            canvasSize={PERSPECTIVE_CANVAS_SIZE}
            gridPoints={question.projectedGridPoints || []}
            targetPoint={question.targetProjectedPoint}
            showAnswer={showAnswer}
            isHit={isHit}
            disabled={disabled}
            onCommitPoint={onAnswer}
            customOverlayRender={(ctx) => {
              const center = {
                x: PERSPECTIVE_CANVAS_SIZE / 2,
                y: PERSPECTIVE_CANVAS_SIZE / 2 + 10,
              };
              const scale = dim === 4 ? 42 : 55;
              draw3DCubeWireframe(ctx, center, scale, dim);
            }}
          />
        </div>
      </div>
    </QuestionCardShell>
  );
}
