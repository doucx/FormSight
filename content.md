这个 Bug 的原因非常明确！当色相（Hue）滑块拉到最右端 $100\%$ 时，角度值恰好为 $360^\circ$。在色彩转换函数 `hsvToHex` 和 `hsvToOkLab` 的分支判定中，原代码仅匹配了 $0^\circ \le H < 360^\circ$ 的半开区间，导致 $360^\circ$ 被漏掉，导致 $RGB$ 变量未被赋值并退化为 `#000000`（纯黑）。

因为在色相环中 $360^\circ$ 与 $0^\circ$ 是完全等价的，我们将对输入的色相角度进行取模归一化（`normH = ((h % 360) + 360) % 360`），彻底消除这一边界 Bug。

下面为您生成实施计划：

## [WIP] fix(color): 修复色相值为 360° 时色彩渲染退化为纯黑的边界 Bug

### 错误分析
在 `src/utils/colorUtils.ts` 的 `hsvToHex` 和 `src/utils/oklchUtils.ts` 的 `hsvToOkLab` 中，区间分支写为了：
```typescript
else if (h >= 300 && h < 360) { ... }
```
当用户将色相滑块拖动至最右端 $360^\circ$ 时，不满足任何一个 `if` 条件，导致 $R, G, B$ 三色分量变量未被赋予正确的彩度 $C$ 和 $X$，退化为全 0（纯黑 `#000000`）。

### 用户需求
当色相滑块移动到最右端（$360^\circ$）时，颜色应当正常渲染为与 $0^\circ$ 相同的纯红色（或对应的设定色彩），不能变为黑色。

### 评论
边界值的防御性归一化是数值算法的基础要求。色相是一个周期的角度，通过 `((h % 360) + 360) % 360` 取模，能够永久消除任何负角度或 360 临界值造成的计算异常。

### 目标
1. 修改 `src/utils/colorUtils.ts` 中的 `hsvToHex` 函数，增加色相角度取模归一化处理。
2. 修改 `src/utils/oklchUtils.ts` 中的 `hsvToOkLab` 函数，同步增加角度取模归一化处理。
3. 在 `src/utils/__tests__/colorUtils.test.ts` 中添加对 $360^\circ$ 临界值的单元测试。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color-recognition #task/object/hue-360-boundary-bug #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 colorUtils.ts 与 oklchUtils.ts 中的 360° 色相边界取模逻辑

~~~~~act
patch_file
src/utils/colorUtils.ts
~~~~~
~~~~~typescript.old
export function hsvToHex(h: number, s: number, v: number): string {
  const normS = s / 100;
  const normV = v / 100;
  const c = normV * normS;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = normV - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }
~~~~~
~~~~~typescript.new
export function hsvToHex(h: number, s: number, v: number): string {
  const normH = ((h % 360) + 360) % 360;
  const normS = s / 100;
  const normV = v / 100;
  const c = normV * normS;
  const x = c * (1 - Math.abs(((normH / 60) % 2) - 1));
  const m = normV - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (normH >= 0 && normH < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (normH >= 60 && normH < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (normH >= 120 && normH < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (normH >= 180 && normH < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (normH >= 240 && normH < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
~~~~~

~~~~~act
patch_file
src/utils/oklchUtils.ts
~~~~~
~~~~~typescript.old
export function hsvToOkLab(h: number, s: number, v: number): [number, number, number] {
  // 1. HSV -> sRGB (0..1)
  const normS = s / 100;
  const normV = v / 100;
  const c = normV * normS;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = normV - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
~~~~~
~~~~~typescript.new
export function hsvToOkLab(h: number, s: number, v: number): [number, number, number] {
  // 1. HSV -> sRGB (0..1)
  const normH = ((h % 360) + 360) % 360;
  const normS = s / 100;
  const normV = v / 100;
  const c = normV * normS;
  const x = c * (1 - Math.abs(((normH / 60) % 2) - 1));
  const m = normV - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (normH < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (normH < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (normH < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (normH < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (normH < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
~~~~~

#### Acts 2: 添加 360° 临界边界单元测试

~~~~~act
patch_file
src/utils/__tests__/colorUtils.test.ts
~~~~~
~~~~~typescript.old
  it('hsvToHex - should correctly convert HSV to HEX string', () => {
    expect(hsvToHex(0, 100, 100)).toBe('#FF0000'); // Red
    expect(hsvToHex(120, 100, 100)).toBe('#00FF00'); // Green
    expect(hsvToHex(240, 100, 100)).toBe('#0000FF'); // Blue
    expect(hsvToHex(0, 0, 100)).toBe('#FFFFFF'); // White
    expect(hsvToHex(0, 0, 0)).toBe('#000000'); // Black
  });
~~~~~
~~~~~typescript.new
  it('hsvToHex - should correctly convert HSV to HEX string including 360 boundary', () => {
    expect(hsvToHex(0, 100, 100)).toBe('#FF0000'); // Red
    expect(hsvToHex(360, 100, 100)).toBe('#FF0000'); // Red 360 boundary
    expect(hsvToHex(120, 100, 100)).toBe('#00FF00'); // Green
    expect(hsvToHex(240, 100, 100)).toBe('#0000FF'); // Blue
    expect(hsvToHex(0, 0, 100)).toBe('#FFFFFF'); // White
    expect(hsvToHex(0, 0, 0)).toBe('#000000'); // Black
  });
~~~~~

### 下一步建议
- **自动化测试校验**: 运行 `npm run test` 和 `npm run check` 确保 360° 边界测试及全量单元测试通过。
