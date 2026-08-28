import { useEffect, useRef } from 'preact/hooks';

export interface CanvasViewProps {
  width: number;
  height: number;
  className?: string;
  maxDisplayWidth?: string;
  draw: (canvas: HTMLCanvasElement) => void;
  deps?: unknown[];
}

export function CanvasView({
  width,
  height,
  className = '',
  maxDisplayWidth = 'max-w-[380px] lg:max-w-[420px]',
  draw,
  deps = [],
}: CanvasViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: dynamic dependencies passed by parent
  useEffect(() => {
    if (canvasRef.current) {
      draw(canvasRef.current);
    }
  }, deps);

  const canvasAspectClass = width === height ? 'aspect-square' : '';
  const canvasClasses = className
    ? `${className} w-full ${canvasAspectClass}`
    : `w-full ${canvasAspectClass} rounded-xl border border-gray-100 bg-white shadow-inner block`;

  return (
    <div className={`relative inline-block w-full ${maxDisplayWidth} select-none`}>
      <canvas ref={canvasRef} width={width} height={height} className={canvasClasses} />
    </div>
  );
}