import { useCallback } from 'preact/hooks';
import { renderInteractivePointGrid } from '../../core/canvas/drawPointGrid';
import type { Point } from '../../types';
import {
  type CanvasDrawContext,
  InteractivePointCanvas,
} from './InteractivePointCanvas';

export interface PointClickCanvasProps {
  canvasSize: number;
  gridPoints: Point[];
  targetPoint?: Point;
  userNearestPoint?: Point;
  anchors?: (Point | null | undefined)[];
  showAnswer: boolean;
  isHit?: boolean;
  disabled?: boolean;
  maxDisplayWidth?: string;
  onCommitPoint: (point: Point) => void;
}

/**
 * 经典标准点阵交互画布
 * 内部基于组合式 InteractivePointCanvas 实现，维持对外 API 100% 稳定向后兼容
 */
export function PointClickCanvas({
  canvasSize,
  gridPoints,
  targetPoint,
  userNearestPoint,
  anchors = [],
  showAnswer,
  isHit = false,
  disabled = false,
  maxDisplayWidth = 'w-full h-full aspect-square',
  onCommitPoint,
}: PointClickCanvasProps) {
  const handleDraw = useCallback(
    ({ ctx, hoverPoint }: CanvasDrawContext) => {
      renderInteractivePointGrid({
        ctx,
        canvasSize,
        gridPoints,
        targetPoint,
        userNearestPoint,
        hoverPoint,
        anchors,
        showAnswer,
        isHit,
        disabled,
      });
    },
    [
      canvasSize,
      gridPoints,
      targetPoint,
      userNearestPoint,
      anchors,
      showAnswer,
      isHit,
      disabled,
    ],
  );

  return (
    <InteractivePointCanvas
      canvasSize={canvasSize}
      gridPoints={gridPoints}
      disabled={disabled}
      showAnswer={showAnswer}
      maxDisplayWidth={maxDisplayWidth}
      onCommitPoint={onCommitPoint}
      onDraw={handleDraw}
    />
  );
}