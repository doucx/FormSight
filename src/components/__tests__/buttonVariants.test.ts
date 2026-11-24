import { describe, expect, it } from 'vitest';
import { buttonVariants } from '../ui/button';

/**
 * 回归来源：b614c7c "统一按钮边框盒模型并修复暗色模式下切换闪烁"
 *
 * 真实故障：变体未统一 `border border-transparent` 时，切换变体会回退为
 * currentColor 边框并产生过渡闪烁；`transition-all` 还会插值非颜色属性。
 */

describe('buttonVariants 盒模型契约 (b614c7c)', () => {
  const base = buttonVariants();

  it('基础类包含透明边框占位', () => {
    expect(base).toContain('border border-transparent');
  });

  it('过渡只作用于颜色，不使用 transition-all', () => {
    expect(base).toContain('transition-colors');
    expect(base).not.toContain('transition-all');
  });

  it('焦点外轮廓被显式清除', () => {
    expect(base).toContain('focus:outline-none');
    expect(base).toContain('focus-visible:ring-2');
  });

  it('全部变体都保留边框占位', () => {
    for (const variant of [
      'default',
      'secondary',
      'outline',
      'ghost',
      'accent',
      'danger',
    ] as const) {
      expect(buttonVariants({ variant })).toContain('border');
    }
  });
});
