import { describe, expect, it } from 'vitest';
import { drawProportionCanvas } from '../../cards/persp_prop_division/utils/generator';
import { CANVAS_THEME } from '../../utils/theme';

/**
 * 回归来源：68fcfbf "修复两张卡片答对时仍显示红点的缺陷"
 *
 * 真实故障：揭晓答案后，用户点无论命中与否都用 miss 色绘制，
 * 视觉上永远显示为「答错」。修复后由 isHit 选择 hit/miss 色。
 */

interface RecordedContext {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  lineCap: string;
  beginPath: () => void;
  moveTo: () => void;
  lineTo: () => void;
  stroke: () => void;
  arc: () => void;
  fill: () => void;
  fillRect: () => void;
}

function createCanvasRecorder() {
  const fills: string[] = [];
  const ctx: RecordedContext = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    beginPath: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    stroke: () => undefined,
    arc: () => undefined,
    fill: () => {
      fills.push(ctx.fillStyle);
    },
    fillRect: () => undefined,
  };

  const canvas = {
    getContext: () => ctx,
  };

  return { canvas, fills };
}

const LINE = { p1: { x: 10, y: 10 }, p2: { x: 300, y: 300 } };
const TARGET = { x: 155, y: 155 };
const USER = { x: 160, y: 160 };

describe('揭晓答案的命中/未命中颜色 (68fcfbf)', () => {
  it('命中时用户点使用 hit 色', () => {
    const { canvas, fills } = createCanvasRecorder();

    drawProportionCanvas(canvas as never, LINE, TARGET, USER, null, true, true, 340);

    expect(fills[fills.length - 1]).toBe(CANVAS_THEME.status.hit);
  });

  it('未命中时用户点使用 miss 色', () => {
    const { canvas, fills } = createCanvasRecorder();

    drawProportionCanvas(canvas as never, LINE, TARGET, USER, null, true, false, 340);

    expect(fills[fills.length - 1]).toBe(CANVAS_THEME.status.miss);
  });

  it('未揭晓时不绘制用户点', () => {
    const { canvas, fills } = createCanvasRecorder();

    drawProportionCanvas(canvas as never, LINE, TARGET, USER, null, false, true, 340);

    expect(fills).not.toContain(CANVAS_THEME.status.hit);
    expect(fills).not.toContain(CANVAS_THEME.status.miss);
  });
});
