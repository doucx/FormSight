import type { Ref } from 'preact';
import { LOUPE_DIAMETER } from '../../hooks/usePointLoupe';

export interface LoupeOverlayProps {
  visible: boolean;
  position: { x: number; y: number } | null;
  loupeCanvasRef: Ref<HTMLCanvasElement>;
  diameter?: number;
  className?: string;
}

/**
 * 纯视觉放大镜浮层基元组件
 * 独立托管悬浮定位、放大镜边界阴影及放大画布挂载，与具体业务画布绘制解耦
 */
export function LoupeOverlay({
  visible,
  position,
  loupeCanvasRef,
  diameter = LOUPE_DIAMETER,
  className = '',
}: LoupeOverlayProps) {
  if (!visible || !position) return null;

  return (
    <div
      className={`absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-600 dark:border-indigo-500 shadow-2xl bg-card ring-4 ring-indigo-500/25 overflow-hidden animate-in zoom-in-75 duration-75 ${className}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${diameter}px`,
        height: `${diameter}px`,
      }}
    >
      <canvas
        ref={loupeCanvasRef}
        width={diameter}
        height={diameter}
        className="w-full h-full block"
      />
    </div>
  );
}
