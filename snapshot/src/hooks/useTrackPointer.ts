import { useRef, useState } from 'preact/hooks';

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
    if (disabled) return;
    if (isDragging) {
      setIsDragging(false);
      onDraggingStateChange?.(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      const calculated = calcValFromClientX(e.clientX);
      if (calculated !== null) {
        onValChange?.(calculated);
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
