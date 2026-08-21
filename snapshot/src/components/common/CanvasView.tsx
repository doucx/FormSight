import { useEffect, useRef } from 'preact/hooks';

export interface CanvasViewProps {
  width: number;
  height: number;
  className?: string;
  draw: (canvas: HTMLCanvasElement) => void;
  deps?: unknown[];
}

export function CanvasView({ width, height, className = '', draw, deps = [] }: CanvasViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: dynamic dependencies passed by parent
  useEffect(() => {
    if (canvasRef.current) {
      draw(canvasRef.current);
    }
  }, deps);

  return <canvas ref={canvasRef} width={width} height={height} className={className} />;
}