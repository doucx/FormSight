import { useEffect, useRef, useState } from 'preact/hooks';

export interface UseTrackPointerOptions {
  max: number;
  step?: number;
  disabled?: boolean;
  onValChange?: (val: number) => void;
  onCommit?: (val: number) => void;
  onHoverStateChange?: (hoverVal: number | null) => void;
  onDraggingStateChange?: (isDragging: boolean) => void;
}

export function useTrackPointer({
  max,
  step = 1,
  disabled = false,
  onValChange,
  onCommit,
  onHoverStateChange,
  onDraggingStateChange,
}: UseTrackPointerOptions) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [hoverVal, setHoverVal] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // 当 disabled 切换时重置拖拽状态与悬停指示
  useEffect(() => {
    if (disabled) {
      if (isDragging) {
        setIsDragging(false);
        onDraggingStateChange?.(false);
      }
      setHoverVal(null);
      onHoverStateChange?.(null);
    }
  }, [disabled, isDragging, onDraggingStateChange, onHoverStateChange]);

  const calcValFromClientX = (clientX: number): number | null => {
    if (!trackRef.current) return null;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const rawVal = ratio * max;

    if (step >= 1) {
      return Math.round(rawVal / step) * step;
    }
    const factor = Math.round(1 / step);
    return Math.round(rawVal * factor) / factor;
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (disabled) return;
    setIsDragging(true);
    onDraggingStateChange?.(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const calculated = calcValFromClientX(e.clientX);
    if (calculated !== null) {
      setHoverVal(calculated);
      onHoverStateChange?.(calculated);
      onValChange?.(calculated);
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (disabled) return;
    const calculated = calcValFromClientX(e.clientX);
    if (calculated !== null) {
      setHoverVal(calculated);
      onHoverStateChange?.(calculated);
      if (isDragging) {
        onValChange?.(calculated);
      }
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    const wasDragging = isDragging;
    if (wasDragging) {
      setIsDragging(false);
      onDraggingStateChange?.(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
    if (disabled) return;
    const calculated = calcValFromClientX(e.clientX);
    if (calculated !== null) {
      onValChange?.(calculated);
      if (wasDragging) {
        onCommit?.(calculated);
      }
    }
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setHoverVal(null);
      onHoverStateChange?.(null);
    }
  };

  return {
    trackRef,
    hoverVal,
    setHoverVal,
    isDragging,
    pointerProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onMouseLeave: handleMouseLeave,
    },
  };
}