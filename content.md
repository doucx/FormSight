好的，我们将按照**方案一（多尺度双频分形布朗运动 FBM）**进行实施：

1. 新增纯数学过程生成模块 `src/utils/noiseUtils.ts`：实现高性能 2D 梯度噪声、分形布朗运动（FBM）与大津法（Otsu）最大类间方差二值化阈值自适应求解算法。
2. 重构 `src/utils/abstractionUtils.ts` 中的 `NOTAN_THRESHOLD` 题目生成逻辑：由低频宏观大结构场（波长贯穿全局，决定真理阈值）叠加随 Level 递增的高频微观噪波扰动，真理阈值自然分布于 $20 \sim 80$ 区间。
3. 改造 `src/components/AbstractionCanvas.tsx`：实现高效 Canvas ImageData 像素级动态二值化渲染，切题时随机离散化滑块初值，彻底杜绝盲按空格通关的交互缺陷。

## [WIP] refactor(abstraction): 重构黑白素描归组为纯分形噪声双频模型

### 用户需求
1. 去除原先离散几何图元（圆与方块）的生硬堆砌，且**不引入任何预设的外部具象剪影**，保持纯粹的数学抽象与视知觉训练。
2. 解决题目二值化真理阈值永远集中在 50、且滑块初始值固定为 50 导致的“狂按空格即可无脑通关”的严重判定缺陷。

### 评论
采用宏观低频大结构 + 微观高频噪波的双频 FBM 模型，完美契合造型训练中“透过表面细碎高频光影噪波、抓取底层宏观大负形与黑白咬合”的认知本质。通过大津法动态计算全局最强二值截断点，使每次题目的真理值在 $20 \sim 80$ 之间有机离散，既具纯粹数学美感，又提供身临其境的素描曝光调试心流。

### 目标
1. 创建 `src/utils/noiseUtils.ts` 提供轻量无依赖的 2D 梯度噪声、FBM 以及 Otsu 动态阈值计算。
2. 升级 `src/utils/abstractionUtils.ts` 中的数据结构与 `generateAbstractionQuestion`，生成高质感二值素描场。
3. 升级 `src/components/AbstractionCanvas.tsx` 支持像素级二值显影与滑块初始随机化。

### 基本原理
1. **宏观-微观双频分层**：
   $$I(x, y) = \text{FBM}_{\text{macro}}(x, y) + \alpha(\text{level}) \cdot \text{FBM}_{\text{micro}}(x, y) + \text{BaseKey}$$
   其中 $\text{BaseKey} \in [25, 75]$ 随机产生高调/低调/中调基准。
2. **大津法（Otsu Method）**：遍历灰度直方图寻找最大类间方差 $t^* = \arg\max \sigma_B^2(t)$，数学上最严密地确定当前噪波下的最优黑白骨架截断点。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/state #concept/ui #scope/core #scope/ux #ai/instruct #task/domain/canvas #task/object/notan-threshold #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 创建轻量 2D 噪声与 FBM / Otsu 计算工具库

我们将新建 `src/utils/noiseUtils.ts`，提供纯数学的 2D 噪声、多阶 FBM 以及直方图大津法求解算法。

~~~~~act
write_file
src/utils/noiseUtils.ts
~~~~~
~~~~~typescript
/**
 * 轻量 2D 梯度噪声与分形布朗运动 (FBM) 工具集
 * 用于纯过程生成连续灰度场与视知觉噪波
 */

export interface Noise2DFunction {
  (x: number, y: number): number;
}

/**
 * 构造轻量确定性 2D 伪随机梯度噪声
 */
export function createNoise2D(seed = Math.random()): Noise2DFunction {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;

  let s = Math.floor(seed * 2147483647);
  if (s <= 0) s += 2147483646;

  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const n = s % (i + 1);
    const temp = p[i];
    p[i] = p[n];
    p[n] = temp;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const grad = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);

  return (x: number, y: number): number => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = fade(xf);
    const v = fade(yf);

    const g00 = grad[perm[X + perm[Y]] % 8];
    const g10 = grad[perm[X + 1 + perm[Y]] % 8];
    const g01 = grad[perm[X + perm[Y + 1]] % 8];
    const g11 = grad[perm[X + 1 + perm[Y + 1]] % 8];

    const n00 = g00[0] * xf + g00[1] * yf;
    const n10 = g10[0] * (xf - 1) + g10[1] * yf;
    const n01 = g01[0] * xf + g01[1] * (yf - 1);
    const n11 = g11[0] * (xf - 1) + g11[1] * (yf - 1);

    const x1 = lerp(n00, n10, u);
    const x2 = lerp(n01, n11, u);
    return (lerp(x1, x2, v) + 1) / 2; // 归一化到 0..1
  };
}

/**
 * 分形布朗运动 (FBM - Fractional Brownian Motion)
 */
export function fbm2D(
  x: number,
  y: number,
  octaves: number,
  noiseFunc: Noise2DFunction,
  gain = 0.5,
  lacunarity = 2.0,
): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1.0;
  let totalAmp = 0;

  for (let i = 0; i < octaves; i++) {
    value += noiseFunc(x * frequency, y * frequency) * amplitude;
    totalAmp += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return totalAmp > 0 ? value / totalAmp : 0;
}

/**
 * 使用大津法 (Otsu's Method) 计算灰度图的最优二值化分割阈值 (0..255)
 */
export function calculateOtsuThreshold(buffer: Uint8Array | number[]): number {
  const histogram = new Int32Array(256);
  const total = buffer.length;

  for (let i = 0; i < total; i++) {
    const val = buffer[i];
    histogram[val]++;
  }

  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let optimalThreshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    // 类间方差
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVariance) {
      maxVariance = variance;
      optimalThreshold = t;
    }
  }

  return optimalThreshold;
}
~~~~~

#### Acts 2: 改造 `src/utils/abstractionUtils.ts` 中的 Notan 生成算法

在 `AbstractionQuestionData` 中引入 `notanBuffer` 与 `notanFieldDim`，并彻底重写 `NOTAN_THRESHOLD` 的生成逻辑。

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript.old
export interface AbstractionQuestionData {
  id: string;
  mode: AbstractionMode;
  difficultyLevel: number;
  tolerance: number;

  // 1. GESTURE_AXIS 势线字段
  particles?: Point[];
  targetAngleDeg?: number; // 0..180 角度

  // 2. POLYGON_DECIMATION 折线大形字段
  detailedPolygon?: Point[];
  simplifiedOptions?: Point[][]; // [polyA, polyB]
  correctPolyIndex?: number;
  correctPolyChoice?: 'A' | 'B';

  // 3. NOTAN_THRESHOLD 黑白素描归组字段
  notanShapes?: NotanShape[];
  idealNotanThreshold?: number; // 0..100 理论最佳二值化阈值

  // 4. PALETTE_CLUSTERING 调色板主调字段
~~~~~
~~~~~typescript.new
export interface AbstractionQuestionData {
  id: string;
  mode: AbstractionMode;
  difficultyLevel: number;
  tolerance: number;

  // 1. GESTURE_AXIS 势线字段
  particles?: Point[];
  targetAngleDeg?: number; // 0..180 角度

  // 2. POLYGON_DECIMATION 折线大形字段
  detailedPolygon?: Point[];
  simplifiedOptions?: Point[][]; // [polyA, polyB]
  correctPolyIndex?: number;
  correctPolyChoice?: 'A' | 'B';

  // 3. NOTAN_THRESHOLD 黑白素描归组字段
  notanShapes?: NotanShape[];
  notanBuffer?: number[]; // 0..255 灰阶连续场数组
  notanFieldDim?: number; // 灰度场分辨率 (如 120x120)
  idealNotanThreshold?: number; // 0..100 理论最佳二值化阈值

  // 4. PALETTE_CLUSTERING 调色板主调字段
~~~~~

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript.old
import type { Point } from '../types';
import { expDecayInterpolate } from './mathUtils';
import { generateTetrahedralDistractors, hsvToOkLab } from './oklchUtils';
import { getDistractorDistanceForLevel } from './relativeColorUtils';
~~~~~
~~~~~typescript.new
import type { Point } from '../types';
import { expDecayInterpolate } from './mathUtils';
import { calculateOtsuThreshold, createNoise2D, fbm2D } from './noiseUtils';
import { generateTetrahedralDistractors, hsvToOkLab } from './oklchUtils';
import { getDistractorDistanceForLevel } from './relativeColorUtils';
~~~~~

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript.old
  // 3. NOTAN_THRESHOLD 黑白素描二值归组
  if (mode === 'NOTAN_THRESHOLD') {
    const notanShapes: NotanShape[] = [];

    const isDarkSubject = Math.random() < 0.5;
    const subjectBaseVal = isDarkSubject ? 20 + Math.random() * 20 : 60 + Math.random() * 20;
    const bgBaseVal = isDarkSubject ? 60 + Math.random() * 20 : 20 + Math.random() * 20;

    const idealNotanThreshold = Math.round((subjectBaseVal + bgBaseVal) / 2);

    // 1. 生成杂乱背景块
    for (let i = 0; i < 40; i++) {
      notanShapes.push({
        type: Math.random() > 0.5 ? 'rect' : 'circle',
        cx: Math.random() * ABSTRACTION_CANVAS_SIZE,
        cy: Math.random() * ABSTRACTION_CANVAS_SIZE,
        w: 40 + Math.random() * 80,
        h: 40 + Math.random() * 80,
        r: 20 + Math.random() * 40,
        baseVal: Math.max(0, Math.min(100, bgBaseVal + (Math.random() * 30 - 15))),
      });
    }

    // 2. 生成明确的前景主体图元组
    const subjectCx = ABSTRACTION_CANVAS_SIZE / 2 + (Math.random() * 60 - 30);
    const subjectCy = ABSTRACTION_CANVAS_SIZE / 2 + (Math.random() * 60 - 30);
    for (let i = 0; i < 15; i++) {
      notanShapes.push({
        type: 'circle',
        cx: subjectCx + (Math.random() * 100 - 50),
        cy: subjectCy + (Math.random() * 100 - 50),
        r: 30 + Math.random() * 40,
        baseVal: Math.max(0, Math.min(100, subjectBaseVal + (Math.random() * 20 - 10))),
      });
    }

    const tolerance = Math.round(expDecayInterpolate(15.0, 3.0, clampedLevel) * 10) / 10;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      notanShapes,
      idealNotanThreshold,
      tolerance,
    };
  }
~~~~~
~~~~~typescript.new
  // 3. NOTAN_THRESHOLD 黑白素描二值归组 (多尺度 FBM 双频模型)
  if (mode === 'NOTAN_THRESHOLD') {
    const fieldDim = 120; // 120x120 场分辨率，兼顾极致生成速度与高清插值
    const buffer = new Uint8Array(fieldDim * fieldDim);

    const macroNoise = createNoise2D(Math.random());
    const microNoise = createNoise2D(Math.random());

    // 1. 随机生成画面的基准调性 (高调 High-Key / 低调 Low-Key / 中调 Mid-Key)
    // 使得理论阈值均匀离散在 20 ~ 80 宽幅区间
    const keyType = Math.random();
    const baseKey =
      keyType < 0.35
        ? 22 + Math.random() * 14 // 低调暗夜 (22~36)
        : keyType < 0.7
          ? 64 + Math.random() * 14 // 高调明亮 (64~78)
          : 44 + Math.random() * 12; // 中调 (44~56)

    // 2. 宏观场尺度 (超低频，形成 2~3 块宏观有机黑白大势)
    const macroScale = 0.012 + Math.random() * 0.008;
    const macroAmp = 42 + Math.random() * 10;

    // 3. 微观高频噪波扰动强度随 Level 递增
    const microScale = 0.08 + Math.random() * 0.04;
    const microAmp = 10 + t * 38; // Level 1 几乎无噪波，Level 35 强噪波干扰

    for (let y = 0; y < fieldDim; y++) {
      for (let x = 0; x < fieldDim; x++) {
        const idx = y * fieldDim + x;
        // 低频宏观大形骨架 (2 Octaves)
        const macroVal = (fbm2D(x * macroScale, y * macroScale, 2, macroNoise) - 0.5) * 2 * macroAmp;
        // 高频微观肌理干扰 (3 Octaves)
        const microVal = (fbm2D(x * microScale, y * microScale, 3, microNoise) - 0.5) * 2 * microAmp;

        const raw = baseKey + macroVal + microVal;
        const clamped0to100 = Math.max(0, Math.min(100, raw));
        buffer[idx] = Math.round((clamped0to100 / 100) * 255);
      }
    }

    // 4. 大津法自动寻找最大类间方差的最佳截断分割点
    const otsuByte = calculateOtsuThreshold(buffer);
    const idealNotanThreshold = Math.round((otsuByte / 255) * 100);

    const tolerance = Math.round(expDecayInterpolate(10.0, 2.0, clampedLevel) * 10) / 10;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      notanBuffer: Array.from(buffer),
      notanFieldDim: fieldDim,
      idealNotanThreshold,
      tolerance,
    };
  }
~~~~~

#### Acts 3: 改造 `src/components/AbstractionCanvas.tsx`

在 Canvas 中支持 `drawNotanNoiseField` 实时显影渲染，并在题目切换时对 `NOTAN_THRESHOLD` 随机化滑块初始位置。

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript.old
// 辅助绘图：绘制 Notan 场景
function drawNotanScene(
  canvas: HTMLCanvasElement | null,
  shapes?: NotanShape[],
  threshold = 50,
  size = ABSTRACTION_CANVAS_SIZE,
) {
  if (!canvas || !shapes) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  for (const s of shapes) {
    const isDark = s.baseVal <= threshold;
    ctx.fillStyle = isDark ? '#0F172A' : '#F8FAFC';
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;

    if (s.type === 'rect' && s.cx && s.cy && s.w && s.h) {
      ctx.fillRect(s.cx - s.w / 2, s.cy - s.h / 2, s.w, s.h);
      ctx.strokeRect(s.cx - s.w / 2, s.cy - s.h / 2, s.w, s.h);
    } else if (s.type === 'circle' && s.cx && s.cy && s.r) {
      ctx.beginPath();
      ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}
~~~~~
~~~~~typescript.new
// 辅助绘图：绘制 Notan 场景 (旧版矢量兼容)
function drawNotanScene(
  canvas: HTMLCanvasElement | null,
  shapes?: NotanShape[],
  threshold = 50,
  size = ABSTRACTION_CANVAS_SIZE,
) {
  if (!canvas || !shapes) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  for (const s of shapes) {
    const isDark = s.baseVal <= threshold;
    ctx.fillStyle = isDark ? '#0F172A' : '#F8FAFC';
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;

    if (s.type === 'rect' && s.cx && s.cy && s.w && s.h) {
      ctx.fillRect(s.cx - s.w / 2, s.cy - s.h / 2, s.w, s.h);
      ctx.strokeRect(s.cx - s.w / 2, s.cy - s.h / 2, s.w, s.h);
    } else if (s.type === 'circle' && s.cx && s.cy && s.r) {
      ctx.beginPath();
      ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

// 辅助绘图：根据连续灰阶场进行动态二值截断渲染
function drawNotanNoiseField(
  canvas: HTMLCanvasElement | null,
  buffer?: number[],
  dim = 120,
  thresholdPercent = 50,
  size = ABSTRACTION_CANVAS_SIZE,
) {
  if (!canvas || !buffer) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const thresholdByte = Math.round((thresholdPercent / 100) * 255);

  // 利用离屏 Canvas 进行近邻插值缩放，保持素描颗粒感与极速渲染
  const offscreen = document.createElement('canvas');
  offscreen.width = dim;
  offscreen.height = dim;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  const imgData = offCtx.createImageData(dim, dim);
  const pixels = imgData.data;

  for (let i = 0; i < buffer.length; i++) {
    const isDark = buffer[i] <= thresholdByte;
    const color = isDark ? 15 : 248; // #0F172A vs #F8FAFC
    const pIdx = i * 4;
    pixels[pIdx] = color;
    pixels[pIdx + 1] = color === 15 ? 23 : 250;
    pixels[pIdx + 2] = color === 15 ? 42 : 252;
    pixels[pIdx + 3] = 255;
  }
  offCtx.putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offscreen, 0, 0, size, size);
}
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript.old
  useEffect(() => {
    if (question.id) {
      setSliderVal(mode === 'GESTURE_AXIS' ? 90 : 50);
      setHoverVal(null);
      setSelectedChoice(null);
      setSelected4AfcIdx(null);
      setSelectedTdPatternIdx(null);
    }
  }, [question.id, mode, setHoverVal]);
~~~~~
~~~~~typescript.new
  useEffect(() => {
    if (question.id) {
      // 避免默认值固定在 50 导致空格盲通过，随机生成初始离散探索位置
      const initialVal =
        mode === 'GESTURE_AXIS'
          ? 90
          : mode === 'NOTAN_THRESHOLD'
            ? Math.random() < 0.5
              ? Math.floor(Math.random() * 25) + 10
              : Math.floor(Math.random() * 25) + 65
            : 50;
      setSliderVal(initialVal);
      setHoverVal(null);
      setSelectedChoice(null);
      setSelected4AfcIdx(null);
      setSelectedTdPatternIdx(null);
    }
  }, [question.id, mode, setHoverVal]);
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript.old
    } else if (mode === 'NOTAN_THRESHOLD') {
      drawNotanScene(
        canvasMainRef.current,
        question.notanShapes,
        activeVal,
        ABSTRACTION_CANVAS_SIZE,
      );
    } else if (mode === 'PALETTE_CLUSTERING') {
~~~~~
~~~~~typescript.new
    } else if (mode === 'NOTAN_THRESHOLD') {
      if (question.notanBuffer) {
        drawNotanNoiseField(
          canvasMainRef.current,
          question.notanBuffer,
          question.notanFieldDim ?? 120,
          showAnswer ? question.idealNotanThreshold : activeVal,
          ABSTRACTION_CANVAS_SIZE,
        );
      } else {
        drawNotanScene(
          canvasMainRef.current,
          question.notanShapes,
          showAnswer ? question.idealNotanThreshold : activeVal,
          ABSTRACTION_CANVAS_SIZE,
        );
      }
    } else if (mode === 'PALETTE_CLUSTERING') {
~~~~~

### 下一步建议
1. 建议在本地启动 `npm run dev` 并在浏览器中进入【概括感知】$\rightarrow$【黑白素描归组】卡片，验证分形噪波在不同调性（高调/低调/中调）下的二值化过滤流畅度与视觉质感。
2. 可以运行 `npm run check` 检查代码格式与类型是否全部通过。
