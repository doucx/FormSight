/**
 * 1. 基础调色盘（与 Tailwind 标准色彩空间 100% 对齐）
 */
export const PALETTE = {
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
  indigo: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
  },
  emerald: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#166534',
  },
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },
  rose: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
    700: '#BE123C',
    800: '#9F1239',
  },
  spectrum: {
    red: '#FF0000',
    yellow: '#FFFF00',
    green: '#00FF00',
    cyan: '#00FFFF',
    blue: '#0000FF',
    magenta: '#FF00FF',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;

/**
 * 360° 全色相光谱线性渐变标准定义
 */
export const HUE_SPECTRUM_GRADIENT = `linear-gradient(to right, ${PALETTE.spectrum.red} 0%, ${PALETTE.spectrum.yellow} 17%, ${PALETTE.spectrum.green} 33%, ${PALETTE.spectrum.cyan} 50%, ${PALETTE.spectrum.blue} 67%, ${PALETTE.spectrum.magenta} 83%, ${PALETTE.spectrum.red} 100%)`;

/**
 * 2. Canvas 语义化 Token (Semantic Canvas Theme Tokens)
 */
export const CANVAS_THEME = {
  // 画布背景
  bg: {
    primary: PALETTE.white,
    secondary: PALETTE.slate[50],
    subtle: PALETTE.slate[100],
  },
  // 轴线、刻度、参考网格
  axis: {
    line: PALETTE.slate[200],
    grid: PALETTE.slate[300],
    highlight: PALETTE.slate[700],
  },
  // 图表文字
  text: {
    primary: PALETTE.slate[800],
    secondary: PALETTE.slate[600],
    muted: PALETTE.slate[400],
    dark: PALETTE.slate[900],
    code: PALETTE.slate[600],
  },
  // 状态与指示色
  status: {
    hit: PALETTE.emerald[500],
    hitDark: PALETTE.emerald[700],
    miss: PALETTE.rose[500],
    missDark: PALETTE.rose[700],
    warning: PALETTE.amber[500],
    accent: PALETTE.indigo[600],
    accentHover: PALETTE.indigo[500],
    accentDark: PALETTE.indigo[800],
  },
  // 形状与多边形
  shape: {
    fill: PALETTE.slate[900],
    stroke: PALETTE.slate[800],
    highlight: PALETTE.emerald[500],
  },
  // 点阵专用
  pointGrid: {
    dotDefault: PALETTE.slate[400],
    dotAnchor: PALETTE.black,
    dotHover: PALETTE.indigo[600],
    dotHit: PALETTE.emerald[500],
    dotMiss: PALETTE.rose[500],
    crosshairTarget: PALETTE.emerald[500],
  },
} as const;

/**
 * 3. 颜色工具函数：Hex 转指定透明度的 RGBA 字符串
 */
export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  let r = 0;
  let g = 0;
  let b = 0;

  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6 || cleanHex.length === 8) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const ACCURACY_COLORS = {
  high: CANVAS_THEME.status.hit,
  medium: CANVAS_THEME.status.warning,
  low: CANVAS_THEME.status.miss,
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
 * 获取正确率对应的半透明背景色
 */
export function getAccuracyFillColor(accuracy: number, alpha = 0.35): string {
  if (accuracy >= 80) return hexToRgba(CANVAS_THEME.status.hit, alpha);
  if (accuracy >= 60) return hexToRgba(CANVAS_THEME.status.warning, alpha);
  return hexToRgba(CANVAS_THEME.status.miss, alpha);
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