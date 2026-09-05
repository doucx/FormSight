import type { ComponentChildren, JSX } from 'preact';

export interface ColorSwatchProps {
  /** 主色彩（HEX/RGB/CSS 格式色值） */
  color: string;
  /** 揭晓答案时的对比真理色（传入时自动以下半区切半展示） */
  compareColor?: string;
  /** 边框变体：
   * - standard: 4px 恒定绝对白边 + 柔和黑环外圈 + 深度内阴影（用于单/多项绝对拾色卡片）
   * - compact: 2px 恒定绝对白边 + 阴影（用于矢量迁移等紧凑对比方块）
   * - container: 4px 恒定绝对白边大背景容器（用于双视口环境诱导对比区）
   * - embedded: 无外白边圆角块（用于嵌入在大背景内部的中心对比块）
   * - option: 1px 绝对亮白边 + 微阴影（用于 ChoiceCard 候选选项中的内嵌色块）
   */
  variant?: 'standard' | 'compact' | 'container' | 'embedded' | 'option';
  /** 预设尺寸等级或通过 className 覆写 */
  size?: 'sm' | 'md' | 'lg' | 'full';
  /** 动态过渡速度：realtime (75ms, 拖拽/悬停实时联动) | smooth (300ms, 题目切换) | none */
  transition?: 'realtime' | 'smooth' | 'none';
  /** 对比层浮层文字提示 */
  compareTooltip?: string;
  children?: ComponentChildren;
  className?: string;
  style?: JSX.CSSProperties;
}

export function ColorSwatch({
  color,
  compareColor,
  variant = 'standard',
  size,
  transition = 'smooth',
  compareTooltip,
  children,
  className = '',
  style,
}: ColorSwatchProps) {
  const variantStyles = {
    standard: 'rounded-2xl border-4 border-white shadow-md ring-1 ring-black/10 shadow-inner',
    compact: 'rounded-2xl border-2 border-white shadow-md',
    container: 'rounded-2xl border-4 border-white shadow-md',
    embedded: 'rounded-xl',
    option: 'rounded-xl border border-white/70 shadow-inner',
  }[variant];

  const sizeStyles =
    {
      sm: 'w-16 h-16',
      md: 'w-20 h-20',
      lg: 'w-32 h-32',
      full: 'w-full h-full',
    }[size || ''] || '';

  const transitionStyles = {
    realtime: 'transition-all duration-75',
    smooth: 'transition-all duration-300',
    none: '',
  }[transition];

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center select-none ${variantStyles} ${sizeStyles} ${transitionStyles} ${className}`}
      style={{ backgroundColor: color, ...style }}
    >
      {/* 揭晓答案切半对比区 */}
      {compareColor && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1/2 pointer-events-none"
          style={{ backgroundColor: compareColor }}
          title={compareTooltip}
        />
      )}

      {children}
    </div>
  );
}
