export const ACCURACY_COLORS = {
  high: '#10B981', // >= 80% (Emerald)
  medium: '#F59E0B', // >= 60% (Amber)
  low: '#F43F5E', // < 60% (Rose)
} as const;

/**
 * 获取正确率对应的 Canvas 十六进制主题色
 */
export function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 80) return ACCURACY_COLORS.high;
  if (accuracy >= 60) return ACCURACY_COLORS.medium;
  return ACCURACY_COLORS.low;
}

/**
 * 获取正确率对应的 Tailwind 徽章样式类名
 */
export function getAccuracyBadgeClass(accuracy: number, total = 1): string {
  if (total === 0) return 'bg-slate-100 text-slate-400';
  if (accuracy >= 80) return 'bg-emerald-50 text-emerald-700';
  if (accuracy >= 60) return 'bg-amber-50 text-amber-700';
  return 'bg-rose-50 text-rose-700';
}
