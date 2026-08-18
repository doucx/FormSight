好的，我将为你生成完整的实现计划，为 FormSight 添加“负形占比滑块评估（Negative Space Area Ratio Estimation）”训练模块。

## [WIP] feat: 添加负形空间占比评估训练模块

### 用户需求
在 FormSight 中引入“正负形空间面积判断”训练系统，首先落地核心模式——**负形占比滑块评估 (Area Ratio Estimation)**：
1. 建立正负形计算核心工具库 `negativeSpaceUtils.ts`，提供极坐标凹凸多边形生成、鞋带定理（Shoelace Formula）多边形面积计算、自适应难度容差及命中判定，并编写完整的单元测试。
2. 扩充 IndexedDB 领域定义与存储逻辑，支持 `negative_space` 领域的训练记录、会话与能力画像持久化。
3. 扩展设置管理模块与偏好表单，支持 `negative_space` 的自动切题、延迟与自适应算子配置。
4. 开发 `NegativeSpaceCanvas` 画布交互组件、`NegativeSpaceDashboard` 模块看板与 `NegativeSpaceTrainingView` 训练流程视图。
5. 在主页 `Home.tsx`、全局统计 `GlobalStatsModal.tsx` 与根应用 `app.tsx` 中打通路由、统计与导航。

### 评论
负形观察法（Negative Space Perception）是传统美术与专业造型中突破符号化认知偏见、精准校准轮廓比例的核心基本功。将这一理论通过程序化多边形生成、鞋带公式精确求积与自适应难度阶梯（Level 1~35）工程化落地，能够进一步补全 FormSight 在“形准”维度的训练矩阵。

### 目标
1. **算法与数学模型**：实现精确且保证非自交的多边形生成器与鞋带面积算法，根据 Level 动态调整图形复杂度与 $\pm \Delta\%$ 容错阈值。
2. **核心交互体验**：提供清晰直观的画框负形预览与高精度占比滑块，集成容错感应带指示与结算视觉反馈。
3. **架构无缝集成**：保持与现有 `useTrainingSession`、`AdaptiveEngine`、全局统计及 IndexedDB 的完全兼容。

### 基本原理
1. **多边形生成与面积求解**：
   - 在限定尺寸画框（$400 \times 400\text{px}$）内，按极角单调递增生成 $N$ 个随机扰动顶点构造非自交多边形。
   - 使用鞋带公式 $S_{\text{poly}} = \frac{1}{2} \left| \sum_{i=0}^{n-1} (x_i y_{i+1} - x_{i+1} y_i) \right|$ 计算正形绝对面积。
   - 负形真理占比计算：$Ratio_{\text{neg}} = \frac{S_{\text{canvas}} - S_{\text{poly}}}{S_{\text{canvas}}} \times 100\%$。
2. **感知自适应难度阶梯**：
   - 容错阈值从 Level 1 的 $\pm 10.0\%$ 指数平滑衰减至 Level 35 的 $\pm 1.2\%$。
   - 多边形顶点数随 Level 提升（从简单凸多边形 3~4 边形演进至具有深凹陷的不规则 8~12 边形）。

### 标签
#intent/build #flow/ready #priority/high
#comp/runtime #comp/ui #concept/executor #scope/core #scope/ux
#ai/instruct
#task/domain/feature #task/object/negative-space-module #task/action/build
#task/state/begin #task/status/active

---

### Script

#### Acts 1: 创建正负形算法工具库与单元测试

编写 `src/utils/negativeSpaceUtils.ts` 与对应的单元测试 `src/utils/__tests__/negativeSpaceUtils.test.ts`。

~~~~~act
write_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript
import type { Point } from '../types';

export type NegativeSpaceMode = 'RATIO_ESTIMATION';

export const NEGATIVE_SPACE_CANVAS_SIZE = 400;

export interface NegativeSpaceQuestionData {
  id: string;
  mode: NegativeSpaceMode;
  difficultyLevel: number;
  vertices: Point[]; // 正形多边形顶点序列
  canvasArea: number; // 画布总面积 (400 * 400 = 160000)
  positiveArea: number; // 正形多边形面积
  negativeArea: number; // 负形面积
  targetNegativeRatio: number; // 负形占总面积百分比 (0~100)
  tolerance: number; // 允许的绝对百分比误差 (例如 ±5.0%)
}

export interface NegativeSpaceHitResult {
  isHit: boolean;
  userRatio: number;
  targetRatio: number;
  errorValue: number; // |userRatio - targetRatio|
  tolerance: number;
}

/**
 * 经典鞋带公式 (Shoelace Formula) 计算简单多边形面积
 */
export function calcPolygonArea(vertices: Point[]): number {
  const n = vertices.length;
  if (n < 3) return 0;

  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * 根据 Level (1..35) 计算允许的占比容错阈值 (百分比 Δ%)
 * Level 1: ±10.0%, Level 35: ±1.2%
 */
export function getNegativeSpaceToleranceForLevel(level: number): number {
  const clamped = Math.max(1, Math.min(35, level));
  const t = (clamped - 1) / 34; // 0..1
  const maxTol = 10.0;
  const minTol = 1.2;
  return Math.round(maxTol * (minTol / maxTol) ** t * 10) / 10;
}

/**
 * 随机生成不自交的不规则正形多边形
 */
export function generateRandomPolygon(level: number): Point[] {
  const clamped = Math.max(1, Math.min(35, level));
  const t = (clamped - 1) / 34;

  // 顶点数量：Level 1 为 3~4，Level 35 为 7~11
  const minVerts = 3 + Math.floor(t * 4);
  const maxVerts = 4 + Math.floor(t * 7);
  const vertexCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

  const cx = NEGATIVE_SPACE_CANVAS_SIZE / 2 + (Math.random() - 0.5) * 40;
  const cy = NEGATIVE_SPACE_CANVAS_SIZE / 2 + (Math.random() - 0.5) * 40;

  // 基础半径与扰动率
  const baseRadius = 80 + Math.random() * 60; // 80..140
  const irregularity = 0.2 + t * 0.55; // 0.2..0.75 凹凸度

  // 极角切分并随机抖动
  const angles: number[] = [];
  const angleStep = (Math.PI * 2) / vertexCount;
  for (let i = 0; i < vertexCount; i++) {
    const rawA = i * angleStep + (Math.random() - 0.5) * angleStep * 0.7;
    angles.push((rawA + Math.PI * 2) % (Math.PI * 2));
  }
  angles.sort((a, b) => a - b);

  const vertices: Point[] = [];
  for (const a of angles) {
    const rJitter = 1 + (Math.random() * 2 - 1) * irregularity;
    const r = Math.max(25, Math.min(185, baseRadius * rJitter));
    const x = Math.round(Math.max(10, Math.min(NEGATIVE_SPACE_CANVAS_SIZE - 10, cx + r * Math.cos(a))));
    const y = Math.round(Math.max(10, Math.min(NEGATIVE_SPACE_CANVAS_SIZE - 10, cy + r * Math.sin(a))));
    vertices.push({ x, y });
  }

  return vertices;
}

/**
 * 生成负形空间练习题目
 */
export function generateNegativeSpaceQuestion(
  mode: NegativeSpaceMode = 'RATIO_ESTIMATION',
  level: number,
): NegativeSpaceQuestionData {
  const id = `nsq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getNegativeSpaceToleranceForLevel(clampedLevel);
  const canvasArea = NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE;

  let vertices = generateRandomPolygon(clampedLevel);
  let posArea = calcPolygonArea(vertices);

  // 保证正形占据一定比例 (20% ~ 80%)，避免极端不可辨识情况
  let attempts = 0;
  while ((posArea / canvasArea < 0.15 || posArea / canvasArea > 0.8) && attempts < 10) {
    attempts++;
    vertices = generateRandomPolygon(clampedLevel);
    posArea = calcPolygonArea(vertices);
  }

  const negArea = canvasArea - posArea;
  const targetNegativeRatio = Math.round((negArea / canvasArea) * 1000) / 10; // 保留一位小数

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    vertices,
    canvasArea,
    positiveArea: Math.round(posArea),
    negativeArea: Math.round(negArea),
    targetNegativeRatio,
    tolerance,
  };
}

/**
 * 答题结果检测与评估
 */
export function checkNegativeSpaceHit(
  userRatio: number,
  question: NegativeSpaceQuestionData,
): NegativeSpaceHitResult {
  const targetRatio = question.targetNegativeRatio;
  const errorValue = Math.round(Math.abs(userRatio - targetRatio) * 10) / 10;
  const isHit = errorValue <= question.tolerance;

  return {
    isHit,
    userRatio,
    targetRatio,
    errorValue,
    tolerance: question.tolerance,
  };
}
~~~~~

~~~~~act
write_file
src/utils/__tests__/negativeSpaceUtils.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import {
  calcPolygonArea,
  checkNegativeSpaceHit,
  generateNegativeSpaceQuestion,
  generateRandomPolygon,
  getNegativeSpaceToleranceForLevel,
  NEGATIVE_SPACE_CANVAS_SIZE,
} from '../negativeSpaceUtils';

describe('negativeSpaceUtils', () => {
  it('calcPolygonArea - should calculate rectangle and triangle area accurately via Shoelace formula', () => {
    // 100x100 正方形 -> 面积 10000
    const rect = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    expect(calcPolygonArea(rect)).toBe(10000);

    // 直角三角形 (底 60, 高 80) -> 面积 2400
    const triangle = [
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 0, y: 80 },
    ];
    expect(calcPolygonArea(triangle)).toBe(2400);

    // 顶点少于 3 个应返回 0
    expect(calcPolygonArea([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBe(0);
  });

  it('getNegativeSpaceToleranceForLevel - should provide decreasing tolerance curve', () => {
    const tolL1 = getNegativeSpaceToleranceForLevel(1);
    const tolL35 = getNegativeSpaceToleranceForLevel(35);

    expect(tolL1).toBe(10.0);
    expect(tolL35).toBe(1.2);
    expect(tolL1).toBeGreaterThan(tolL35);

    const tolL18 = getNegativeSpaceToleranceForLevel(18);
    expect(tolL18).toBeLessThan(tolL1);
    expect(tolL18).toBeGreaterThan(tolL35);
  });

  it('generateRandomPolygon - should generate valid vertex sequences bounded within canvas', () => {
    for (let l = 1; l <= 35; l += 10) {
      const poly = generateRandomPolygon(l);
      expect(poly.length).toBeGreaterThanOrEqual(3);
      for (const p of poly) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(NEGATIVE_SPACE_CANVAS_SIZE);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(NEGATIVE_SPACE_CANVAS_SIZE);
      }
    }
  });

  it('generateNegativeSpaceQuestion - should create question with consistent areas and ratio', () => {
    const q = generateNegativeSpaceQuestion('RATIO_ESTIMATION', 10);
    expect(q.mode).toBe('RATIO_ESTIMATION');
    expect(q.canvasArea).toBe(NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE);
    expect(q.positiveArea + q.negativeArea).toBeCloseTo(q.canvasArea, -1);
    expect(q.targetNegativeRatio).toBeGreaterThan(15);
    expect(q.targetNegativeRatio).toBeLessThan(85);
  });

  it('checkNegativeSpaceHit - should validate hit within dynamic tolerance threshold', () => {
    const q = generateNegativeSpaceQuestion('RATIO_ESTIMATION', 1);
    q.targetNegativeRatio = 60.0;
    q.tolerance = 10.0;

    // 命中
    const hitRes = checkNegativeSpaceHit(65.0, q);
    expect(hitRes.isHit).toBe(true);
    expect(hitRes.errorValue).toBe(5.0);

    // 未命中
    const missRes = checkNegativeSpaceHit(75.0, q);
    expect(missRes.isHit).toBe(false);
    expect(missRes.errorValue).toBe(15.0);
  });
});
~~~~~

---

#### Acts 2: 扩展 DB 存储 Schema 与查询逻辑

将 `negative_space` 加入到 `TrainingDomain` 类型及相关索引操作中。

~~~~~act
patch_file
src/utils/db/schema.ts
~~~~~
~~~~~typescript
export type TrainingDomain = 'star' | 'color' | 'relative_color';
~~~~~
~~~~~typescript
export type TrainingDomain = 'star' | 'color' | 'relative_color' | 'negative_space';
~~~~~

---

#### Acts 3: 扩展设置体系与偏好表单

在 `settings.ts` 中新增 `NegativeSpaceSettings` 接口与默认值，创建设置表单 `NegativeSpaceSettingsForm.tsx`，并更新 `SettingsModal.tsx`。

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
/**
 * 相对色感 (Relative Color) 专属配置
 */
export interface RelativeColorSettings extends BaseModuleSettings {
  sliderHitMargin: number; // 色感滑块极值吸附感应区外延大小 (px)
  showToleranceBand: boolean; // 是否在滑块上显示 ΔE 容错感应指示带
  enableHoverColorPreview: boolean; // 悬停时是否实时联动推移色彩预览
}

/**
 * 全局通用设置
 */
export interface GlobalSettings {
  idleTimeout: number; // 闲置自动暂停计时时长 (秒)，0 表示关闭
  soundEnabled: boolean; // 是否启用答题音效反馈
}

/**
 * 完整结构化用户设置
 */
export interface UserSettings {
  global: GlobalSettings;
  star: StarSettings;
  color: ColorSenseSettings;
  relative_color: RelativeColorSettings;
}
~~~~~
~~~~~typescript
/**
 * 相对色感 (Relative Color) 专属配置
 */
export interface RelativeColorSettings extends BaseModuleSettings {
  sliderHitMargin: number; // 色感滑块极值吸附感应区外延大小 (px)
  showToleranceBand: boolean; // 是否在滑块上显示 ΔE 容错感应指示带
  enableHoverColorPreview: boolean; // 悬停时是否实时联动推移色彩预览
}

/**
 * 正负形空间感知 (Negative Space) 专属配置
 */
export interface NegativeSpaceSettings extends BaseModuleSettings {
  sliderHitMargin: number; // 滑块极值吸附感应区外延大小 (px)
  showToleranceBand: boolean; // 是否在滑块上显示 Δ% 容错区间
}

/**
 * 全局通用设置
 */
export interface GlobalSettings {
  idleTimeout: number; // 闲置自动暂停计时时长 (秒)，0 表示关闭
  soundEnabled: boolean; // 是否启用答题音效反馈
}

/**
 * 完整结构化用户设置
 */
export interface UserSettings {
  global: GlobalSettings;
  star: StarSettings;
  color: ColorSenseSettings;
  relative_color: RelativeColorSettings;
  negative_space: NegativeSpaceSettings;
}
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
  relative_color: {
    ...DEFAULT_BASE_SETTINGS,
    sliderHitMargin: 12,
    showToleranceBand: true,
    enableHoverColorPreview: true,
  },
};

/**
 * 从 LocalStorage 加载用户配置，自动兼容并迁移老版本扁平配置
 */
export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw);

    // 判断是否为新版本分层结构 (包含 star、color 等顶级命名空间)
    if (parsed && typeof parsed === 'object' && parsed.star && parsed.color) {
      return {
        global: {
          ...DEFAULT_SETTINGS.global,
          ...(parsed.global || {}),
        },
        star: {
          ...DEFAULT_SETTINGS.star,
          ...parsed.star,
          targetingMode: parsed.star.targetingMode === 'auto' ? 'off' : parsed.star.targetingMode,
        },
        color: {
          ...DEFAULT_SETTINGS.color,
          ...parsed.color,
          targetingMode: parsed.color.targetingMode === 'auto' ? 'off' : parsed.color.targetingMode,
        },
        relative_color: {
          ...DEFAULT_SETTINGS.relative_color,
          ...(parsed.relative_color || {}),
        },
      };
    }
~~~~~
~~~~~typescript
  relative_color: {
    ...DEFAULT_BASE_SETTINGS,
    sliderHitMargin: 12,
    showToleranceBand: true,
    enableHoverColorPreview: true,
  },
  negative_space: {
    ...DEFAULT_BASE_SETTINGS,
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
};

/**
 * 从 LocalStorage 加载用户配置，自动兼容并迁移老版本扁平配置
 */
export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw);

    // 判断是否为新版本分层结构 (包含 star、color 等顶级命名空间)
    if (parsed && typeof parsed === 'object' && parsed.star && parsed.color) {
      return {
        global: {
          ...DEFAULT_SETTINGS.global,
          ...(parsed.global || {}),
        },
        star: {
          ...DEFAULT_SETTINGS.star,
          ...parsed.star,
          targetingMode: parsed.star.targetingMode === 'auto' ? 'off' : parsed.star.targetingMode,
        },
        color: {
          ...DEFAULT_SETTINGS.color,
          ...parsed.color,
          targetingMode: parsed.color.targetingMode === 'auto' ? 'off' : parsed.color.targetingMode,
        },
        relative_color: {
          ...DEFAULT_SETTINGS.relative_color,
          ...(parsed.relative_color || {}),
        },
        negative_space: {
          ...DEFAULT_SETTINGS.negative_space,
          ...(parsed.negative_space || {}),
        },
      };
    }
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
      relative_color: {
        autoNext: parsed.autoNext ?? DEFAULT_SETTINGS.relative_color.autoNext,
        autoNextDelay:
          parsed.colorAutoNextDelay ??
          parsed.autoNextDelay ??
          DEFAULT_SETTINGS.relative_color.autoNextDelay,
        stepGranularity: parsed.stepGranularity ?? DEFAULT_SETTINGS.relative_color.stepGranularity,
        adaptiveMode: parsed.adaptiveMode ?? DEFAULT_SETTINGS.relative_color.adaptiveMode,
        targetAccuracy: parsed.targetAccuracy ?? DEFAULT_SETTINGS.relative_color.targetAccuracy,
        blockSize: parsed.blockSize ?? DEFAULT_SETTINGS.relative_color.blockSize,
        sliderHitMargin: parsed.sliderHitMargin ?? DEFAULT_SETTINGS.relative_color.sliderHitMargin,
        showToleranceBand:
          parsed.showToleranceBand ?? DEFAULT_SETTINGS.relative_color.showToleranceBand,
        enableHoverColorPreview:
          parsed.enableHoverColorPreview ?? DEFAULT_SETTINGS.relative_color.enableHoverColorPreview,
      },
    };
~~~~~
~~~~~typescript
      relative_color: {
        autoNext: parsed.autoNext ?? DEFAULT_SETTINGS.relative_color.autoNext,
        autoNextDelay:
          parsed.colorAutoNextDelay ??
          parsed.autoNextDelay ??
          DEFAULT_SETTINGS.relative_color.autoNextDelay,
        stepGranularity: parsed.stepGranularity ?? DEFAULT_SETTINGS.relative_color.stepGranularity,
        adaptiveMode: parsed.adaptiveMode ?? DEFAULT_SETTINGS.relative_color.adaptiveMode,
        targetAccuracy: parsed.targetAccuracy ?? DEFAULT_SETTINGS.relative_color.targetAccuracy,
        blockSize: parsed.blockSize ?? DEFAULT_SETTINGS.relative_color.blockSize,
        sliderHitMargin: parsed.sliderHitMargin ?? DEFAULT_SETTINGS.relative_color.sliderHitMargin,
        showToleranceBand:
          parsed.showToleranceBand ?? DEFAULT_SETTINGS.relative_color.showToleranceBand,
        enableHoverColorPreview:
          parsed.enableHoverColorPreview ?? DEFAULT_SETTINGS.relative_color.enableHoverColorPreview,
      },
      negative_space: {
        autoNext: parsed.autoNext ?? DEFAULT_SETTINGS.negative_space.autoNext,
        autoNextDelay:
          parsed.negativeSpaceAutoNextDelay ??
          parsed.autoNextDelay ??
          DEFAULT_SETTINGS.negative_space.autoNextDelay,
        stepGranularity: parsed.stepGranularity ?? DEFAULT_SETTINGS.negative_space.stepGranularity,
        adaptiveMode: parsed.adaptiveMode ?? DEFAULT_SETTINGS.negative_space.adaptiveMode,
        targetAccuracy: parsed.targetAccuracy ?? DEFAULT_SETTINGS.negative_space.targetAccuracy,
        blockSize: parsed.blockSize ?? DEFAULT_SETTINGS.negative_space.blockSize,
        sliderHitMargin: parsed.sliderHitMargin ?? DEFAULT_SETTINGS.negative_space.sliderHitMargin,
        showToleranceBand:
          parsed.showToleranceBand ?? DEFAULT_SETTINGS.negative_space.showToleranceBand,
      },
    };
~~~~~

~~~~~act
write_file
src/components/settings/NegativeSpaceSettingsForm.tsx
~~~~~
~~~~~typescript
import { ToggleLeft, ToggleRight } from 'lucide-preact';
import type { NegativeSpaceSettings } from '../../utils/settings';

interface NegativeSpaceSettingsFormProps {
  settings: NegativeSpaceSettings;
  onChange: (patch: Partial<NegativeSpaceSettings>) => void;
}

export function NegativeSpaceSettingsForm({ settings, onChange }: NegativeSpaceSettingsFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-sm font-semibold text-slate-700">滑块极值吸附外延感应区</div>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: '关闭 (0px)', value: 0 },
            { label: '8px', value: 8 },
            { label: '12px', value: 12 },
            { label: '20px', value: 20 },
          ].map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => onChange({ sliderHitMargin: opt.value })}
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                settings.sliderHitMargin === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-700">显示滑块容错感应区</div>
          <div className="text-xs text-slate-400">在悬停光标两侧实时显示 Δ% 动态容错区间</div>
        </div>
        <button
          type="button"
          onClick={() => onChange({ showToleranceBand: !settings.showToleranceBand })}
          className="text-indigo-600 hover:opacity-80 transition-opacity"
        >
          {settings.showToleranceBand ? (
            <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-slate-300" />
          )}
        </button>
      </div>
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript
import { ColorSettingsForm } from './settings/ColorSettingsForm';
import { RelativeColorSettingsForm } from './settings/RelativeColorSettingsForm';
import { StarSettingsForm } from './settings/StarSettingsForm';

const DOMAIN_TITLE: Record<TrainingDomain, string> = {
  star: '寻星训练偏好设置',
  color: '绝对色感偏好设置',
  relative_color: '相对色感偏好设置',
};
~~~~~
~~~~~typescript
import { ColorSettingsForm } from './settings/ColorSettingsForm';
import { NegativeSpaceSettingsForm } from './settings/NegativeSpaceSettingsForm';
import { RelativeColorSettingsForm } from './settings/RelativeColorSettingsForm';
import { StarSettingsForm } from './settings/StarSettingsForm';

const DOMAIN_TITLE: Record<TrainingDomain, string> = {
  star: '寻星训练偏好设置',
  color: '绝对色感偏好设置',
  relative_color: '相对色感偏好设置',
  negative_space: '正负形感知偏好设置',
};
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript
  const updateDomainSettings = (
    patch:
      | Partial<StarSettings | ColorSenseSettings | RelativeColorSettings>
      | ((
          prev: StarSettings | ColorSenseSettings | RelativeColorSettings,
        ) => Partial<StarSettings | ColorSenseSettings | RelativeColorSettings>),
  ) => {
~~~~~
~~~~~typescript
  const updateDomainSettings = (
    patch:
      | Partial<StarSettings | ColorSenseSettings | RelativeColorSettings | NegativeSpaceSettings>
      | ((
          prev: StarSettings | ColorSenseSettings | RelativeColorSettings | NegativeSpaceSettings,
        ) => Partial<StarSettings | ColorSenseSettings | RelativeColorSettings | NegativeSpaceSettings>),
  ) => {
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript
          {domain === 'relative_color' && (
            <RelativeColorSettingsForm
              settings={domainSettings as RelativeColorSettings}
              onChange={(patch) => updateDomainSettings(patch)}
            />
          )}
        </div>

        <div className="pt-2">
~~~~~
~~~~~typescript
          {domain === 'relative_color' && (
            <RelativeColorSettingsForm
              settings={domainSettings as RelativeColorSettings}
              onChange={(patch) => updateDomainSettings(patch)}
            />
          )}

          {domain === 'negative_space' && (
            <NegativeSpaceSettingsForm
              settings={domainSettings as NegativeSpaceSettings}
              onChange={(patch) => updateDomainSettings(patch)}
            />
          )}
        </div>

        <div className="pt-2">
~~~~~

---

#### Acts 4: 开发负形画布组件与训练看板视图

创建 `src/components/NegativeSpaceCanvas.tsx`、`src/views/NegativeSpaceDashboard.tsx` 与 `src/views/NegativeSpaceTrainingView.tsx`。

~~~~~act
write_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../utils/negativeSpaceUtils';

interface NegativeSpaceCanvasProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (userRatio: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
}

export function NegativeSpaceCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: NegativeSpaceCanvasProps) {
  const { vertices, targetNegativeRatio, tolerance } = question;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const [currentVal, setCurrentVal] = useState<number>(50.0);
  const [hoverVal, setHoverVal] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // 切换题目时重置滑块初始值
  useEffect(() => {
    if (question.id) {
      setCurrentVal(50.0);
      setHoverVal(null);
      setIsDragging(false);
    }
  }, [question.id]);

  // === Canvas 绘图渲染 ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清屏绘制纯白画框（即负形底色）
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, NEGATIVE_SPACE_CANVAS_SIZE, NEGATIVE_SPACE_CANVAS_SIZE);

    // 绘制正形多边形 (正形填充深色)
    if (vertices.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      ctx.closePath();

      ctx.fillStyle = '#0F172A'; // Slate-900 黑色正形
      ctx.fill();

      // 边缘描边
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 揭晓答案时的视觉反馈辅助
      if (showAnswer) {
        ctx.strokeStyle = userAnswer?.isHit ? '#22C55E' : '#EF4444';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }, [vertices, showAnswer, userAnswer]);

  // 计算 ClientX 对应的百分比
  const calcValFromClientX = (clientX: number): number | null => {
    if (!trackRef.current) return null;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = (clickX / rect.width) * 100;
    return Math.round(ratio * 10) / 10;
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (disabled || showAnswer) return;
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const calculated = calcValFromClientX(e.clientX);
    if (calculated !== null) {
      setCurrentVal(calculated);
      setHoverVal(calculated);
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (disabled || showAnswer) return;
    const calculated = calcValFromClientX(e.clientX);
    if (calculated !== null) {
      if (isDragging) {
        setCurrentVal(calculated);
      }
      setHoverVal(calculated);
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (disabled || showAnswer) return;
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      const calculated = calcValFromClientX(e.clientX);
      if (calculated !== null) {
        setCurrentVal(calculated);
      }
    }
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setHoverVal(null);
    }
  };

  const handleSubmit = () => {
    if (disabled || showAnswer) return;
    onAnswer(currentVal);
  };

  // 空格快捷键提交
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        if (!showAnswer && !disabled) {
          e.preventDefault();
          onAnswer(currentVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, disabled, currentVal, onAnswer]);

  const activeVal = hoverVal !== null ? hoverVal : currentVal;

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 提示文案 */}
      <div className="text-center space-y-1">
        <div className="text-sm font-bold text-slate-800">估计白色背景（负形）占整幅画面的面积百分比</div>
        <div className="text-xs text-slate-400">黑色为正形主体，白色空隙为负形</div>
      </div>

      {/* 画布区域 */}
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={NEGATIVE_SPACE_CANVAS_SIZE}
          height={NEGATIVE_SPACE_CANVAS_SIZE}
          className="w-full max-w-[340px] aspect-square rounded-xl border border-slate-300 shadow-sm"
        />
      </div>

      {/* 占比滑块调节区 */}
      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>负形空间占比估计:</span>
          <span className="font-mono text-base font-black text-indigo-600">
            {showAnswer ? `${userAnswer?.userRatio ?? currentVal}%` : `${activeVal}%`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-slate-400 text-xs">0%</span>

          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onMouseLeave={handleMouseLeave}
            style={
              hitMargin > 0
                ? {
                    paddingLeft: `${hitMargin}px`,
                    paddingRight: `${hitMargin}px`,
                    marginLeft: `-${hitMargin}px`,
                    marginRight: `-${hitMargin}px`,
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    marginTop: '-6px',
                    marginBottom: '-6px',
                  }
                : undefined
            }
            className={`relative flex-1 flex items-center select-none touch-none ${
              !showAnswer && !disabled ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div
              ref={trackRef}
              className="relative w-full h-7 rounded-xl bg-slate-200 border border-slate-300/80 shadow-inner flex items-center overflow-hidden"
            >
              {/* 进度底色 */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
                style={{ width: `${activeVal}%` }}
              />

              {/* 当前设定游标线 */}
              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: `${currentVal}%` }}
                />
              )}

              {/* 容错区间指示 */}
              {!showAnswer && showToleranceBand && (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: `${Math.max(0, activeVal - tolerance)}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: `${Math.min(100, activeVal + tolerance)}%` }}
                  />
                </>
              )}

              {/* 揭晓答案标记 */}
              {showAnswer && (
                <>
                  {/* 真理值 (绿色标线) */}
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                    style={{ left: `${targetNegativeRatio}%` }}
                  />
                  {/* 用户提交值 */}
                  {userAnswer && (
                    <div
                      className={`absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10 border-x border-white shadow-md ${
                        userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ left: `${userAnswer.userRatio}%` }}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">100%</span>
        </div>

        {/* 揭晓答案对比条 */}
        {showAnswer && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              真实负形占比: <span className="font-bold text-slate-800 font-mono">{targetNegativeRatio}%</span>
            </span>
            <span className={userAnswer?.isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              误差: {userAnswer?.errorValue}% (容错: ±{tolerance}%)
            </span>
          </div>
        )}
      </div>

      {/* 确认提交按钮 */}
      {!showAnswer && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          确认提交 (Space)
        </button>
      )}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/views/NegativeSpaceDashboard.tsx
~~~~~
~~~~~typescript
import { Maximize2 } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { ModeCard } from '../components/dashboard/ModeCard';
import { useTodayStats } from '../hooks/useTodayStats';
import { type UnifiedProfileData, getProfilesByDomain } from '../utils/db';
import type { NegativeSpaceMode } from '../utils/negativeSpaceUtils';

interface NegativeSpaceDashboardProps {
  onStart: (mode: NegativeSpaceMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
}

export function NegativeSpaceDashboard({
  onStart,
  onBackToHome,
  onOpenSettings,
}: NegativeSpaceDashboardProps) {
  const [profiles, setProfiles] = useState<Record<string, UnifiedProfileData | null>>({});
  const todayStats = useTodayStats('negative_space');

  useEffect(() => {
    let isMounted = true;
    getProfilesByDomain('negative_space').then((pList) => {
      if (!isMounted) return;
      const pMap: Record<string, UnifiedProfileData> = {};
      for (const p of pList) {
        pMap[p.mode] = p;
      }
      setProfiles(pMap);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const profile = profiles.RATIO_ESTIMATION;
  const totalCards = profile?.totalTrainedCards || 0;
  const accuracy = totalCards > 0 && profile ? Math.round((profile.totalHits / totalCards) * 100) : 0;
  const currentLevel = profile?.currentLevel || 5;
  const stat = todayStats.RATIO_ESTIMATION || { count: 0, timeMs: 0 };

  return (
    <DashboardShell
      title="正负形感知"
      subTitle="Negative Space"
      onBackToHome={onBackToHome}
      onOpenSettings={onOpenSettings}
    >
      <ModeCard
        title="负形占比滑块评估"
        desc="估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。"
        icon={Maximize2}
        todayCount={stat.count}
        todayTimeMs={stat.timeMs}
        currentLevel={currentLevel}
        accuracy={accuracy}
        onStartTraining={() => onStart('RATIO_ESTIMATION', 'training')}
        onStartBenchmark={() => onStart('RATIO_ESTIMATION', 'benchmark')}
      />
    </DashboardShell>
  );
}
~~~~~

~~~~~act
write_file
src/views/NegativeSpaceTrainingView.tsx
~~~~~
~~~~~typescript
import { NegativeSpaceCanvas } from '../components/NegativeSpaceCanvas';
import { TrainingShell } from '../components/training/TrainingShell';
import { useTrainingSession } from '../hooks/useTrainingSession';
import { saveSession, saveTrialRecord } from '../utils/db';
import {
  type NegativeSpaceHitResult,
  type NegativeSpaceMode,
  type NegativeSpaceQuestionData,
  checkNegativeSpaceHit,
  generateNegativeSpaceQuestion,
} from '../utils/negativeSpaceUtils';
import type { NegativeSpaceSettings } from '../utils/settings';

interface NegativeSpaceTrainingViewProps {
  mode: NegativeSpaceMode;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: NegativeSpaceSettings;
  onExit: () => void;
}

export function NegativeSpaceTrainingView({
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: NegativeSpaceTrainingViewProps) {
  const session = useTrainingSession<
    NegativeSpaceQuestionData,
    NegativeSpaceHitResult,
    number
  >({
    domain: 'negative_space',
    mode,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    generateQuestion: (level) => generateNegativeSpaceQuestion(mode, level),
    evaluateAnswer: (userRatio, q) => checkNegativeSpaceHit(userRatio, q),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    saveTrialRecord: async ({ sessionId, question: q, hitResult, responseTimeMs, userVal }) => {
      await saveTrialRecord({
        id: `nsrec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        domain: 'negative_space',
        mode,
        timestamp: Date.now(),
        difficultyLevel: q.difficultyLevel,
        isHit: hitResult.isHit,
        responseTimeMs,
        details: {
          targetNegativeRatio: q.targetNegativeRatio,
          userRatio: userVal,
          errorValue: hitResult.errorValue,
          positiveArea: q.positiveArea,
          negativeArea: q.negativeArea,
        },
      });
    },
    saveSession: async ({
      sessionId,
      totalTrials: t,
      hitTrials: h,
      ended,
      startTimestamp,
      endLevel,
    }) => {
      await saveSession({
        id: sessionId,
        domain: 'negative_space',
        mode,
        type: sessionType,
        startTimestamp,
        endTimestamp: ended ? Date.now() : undefined,
        totalTrials: t,
        hitTrials: h,
        startLevel: initialLevel,
        endLevel,
      });
    },
    onExit,
  });

  return (
    <TrainingShell
      title="正负形感知"
      badge="负形占比估算"
      sessionType={sessionType}
      currentLevel={session.question.difficultyLevel}
      autoNext={settings.autoNext}
      session={session}
      onExit={onExit}
    >
      {({ disabled }) => (
        <NegativeSpaceCanvas
          question={session.question}
          showAnswer={session.showAnswer}
          userAnswer={session.userAnswer}
          onAnswer={session.handleAnswer}
          disabled={disabled}
          hitMargin={settings.sliderHitMargin ?? 12}
          showToleranceBand={settings.showToleranceBand ?? true}
        />
      )}
    </TrainingShell>
  );
}
~~~~~

---

#### Acts 5: 在主页、全局统计与 App 根组件中集成模块

在 `GlobalStatsModal.tsx`、`Home.tsx` 和 `app.tsx` 中打通路由和全局统计。

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
interface UnifiedRecord {
  timestamp: number;
  isHit: boolean;
  level: number;
  module: 'star' | 'color' | 'relative_color';
  subMode: string;
}

type FilterOption =
  | 'all'
  | 'star_all'
  | 'star_single'
  | 'star_double_h'
  | 'star_double_r'
  | 'color_all'
  | 'color_H'
  | 'color_V'
  | 'color_S'
  | 'color_ALL'
  | 'relative_color_all'
  | 'relative_color_VECTOR_SHIFT';

const FILTER_LABELS: Record<FilterOption, string> = {
  all: '全部练习项目',
  star_all: '寻星练习 (全部模式)',
  star_single: '寻星 • 单锚点',
  star_double_h: '寻星 • 水平双锚点',
  star_double_r: '寻星 • 旋转双锚点',
  color_all: '色感训练 (全部模式)',
  color_H: '色感 • 色相 (Hue)',
  color_V: '色感 • 明度 (Value)',
  color_S: '色感 • 饱和度 (Sat)',
  color_ALL: '色感 • 综合拾色 (Match)',
  relative_color_all: '相对色感 (全部模式)',
  relative_color_VECTOR_SHIFT: '相对色感 • 色彩矢量迁移',
};
~~~~~
~~~~~typescript
interface UnifiedRecord {
  timestamp: number;
  isHit: boolean;
  level: number;
  module: 'star' | 'color' | 'relative_color' | 'negative_space';
  subMode: string;
}

type FilterOption =
  | 'all'
  | 'star_all'
  | 'star_single'
  | 'star_double_h'
  | 'star_double_r'
  | 'color_all'
  | 'color_H'
  | 'color_V'
  | 'color_S'
  | 'color_ALL'
  | 'relative_color_all'
  | 'relative_color_VECTOR_SHIFT'
  | 'negative_space_all'
  | 'negative_space_RATIO_ESTIMATION';

const FILTER_LABELS: Record<FilterOption, string> = {
  all: '全部练习项目',
  star_all: '寻星练习 (全部模式)',
  star_single: '寻星 • 单锚点',
  star_double_h: '寻星 • 水平双锚点',
  star_double_r: '寻星 • 旋转双锚点',
  color_all: '色感训练 (全部模式)',
  color_H: '色感 • 色相 (Hue)',
  color_V: '色感 • 明度 (Value)',
  color_S: '色感 • 饱和度 (Sat)',
  color_ALL: '色感 • 综合拾色 (Match)',
  relative_color_all: '相对色感 (全部模式)',
  relative_color_VECTOR_SHIFT: '相对色感 • 色彩矢量迁移',
  negative_space_all: '正负形感知 (全部模式)',
  negative_space_RATIO_ESTIMATION: '正负形 • 负形占比估算',
};
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
      const starData = await getAllTrialRecords();
      const colorData = await getAllColorTrialRecords();
      const relData = await getTrialRecords('relative_color');

      const combined: UnifiedRecord[] = [
        ...starData.map((r) => ({
          timestamp: r.timestamp,
          isHit: r.isHit,
          level: r.difficultyLevel,
          module: 'star' as const,
          subMode: r.mode,
        })),
        ...colorData.map((r) => ({
          timestamp: r.timestamp,
          isHit: r.isHit,
          level: r.difficultyLevel,
          module: 'color' as const,
          subMode: r.mode,
        })),
        ...relData.map((r) => ({
          timestamp: r.timestamp,
          isHit: r.isHit,
          level: r.difficultyLevel,
          module: 'relative_color' as const,
          subMode: r.mode,
        })),
      ];
~~~~~
~~~~~typescript
      const starData = await getAllTrialRecords();
      const colorData = await getAllColorTrialRecords();
      const relData = await getTrialRecords('relative_color');
      const nsData = await getTrialRecords('negative_space');

      const combined: UnifiedRecord[] = [
        ...starData.map((r) => ({
          timestamp: r.timestamp,
          isHit: r.isHit,
          level: r.difficultyLevel,
          module: 'star' as const,
          subMode: r.mode,
        })),
        ...colorData.map((r) => ({
          timestamp: r.timestamp,
          isHit: r.isHit,
          level: r.difficultyLevel,
          module: 'color' as const,
          subMode: r.mode,
        })),
        ...relData.map((r) => ({
          timestamp: r.timestamp,
          isHit: r.isHit,
          level: r.difficultyLevel,
          module: 'relative_color' as const,
          subMode: r.mode,
        })),
        ...nsData.map((r) => ({
          timestamp: r.timestamp,
          isHit: r.isHit,
          level: r.difficultyLevel,
          module: 'negative_space' as const,
          subMode: r.mode,
        })),
      ];
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
    if (selectedFilter === 'relative_color_all') return r.module === 'relative_color';
    if (selectedFilter.startsWith('star_')) {
      return r.module === 'star' && r.subMode === selectedFilter.replace('star_', '');
    }
    if (selectedFilter.startsWith('color_')) {
      return r.module === 'color' && r.subMode === selectedFilter.replace('color_', '');
    }
    if (selectedFilter.startsWith('relative_color_')) {
      return (
        r.module === 'relative_color' && r.subMode === selectedFilter.replace('relative_color_', '')
      );
    }
    return true;
~~~~~
~~~~~typescript
    if (selectedFilter === 'relative_color_all') return r.module === 'relative_color';
    if (selectedFilter === 'negative_space_all') return r.module === 'negative_space';
    if (selectedFilter.startsWith('star_')) {
      return r.module === 'star' && r.subMode === selectedFilter.replace('star_', '');
    }
    if (selectedFilter.startsWith('color_')) {
      return r.module === 'color' && r.subMode === selectedFilter.replace('color_', '');
    }
    if (selectedFilter.startsWith('relative_color_')) {
      return (
        r.module === 'relative_color' && r.subMode === selectedFilter.replace('relative_color_', '')
      );
    }
    if (selectedFilter.startsWith('negative_space_')) {
      return (
        r.module === 'negative_space' &&
        r.subMode === selectedFilter.replace('negative_space_', '')
      );
    }
    return true;
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
                <optgroup label="相对色感">
                  <option value="relative_color_all">相对色感 (全部)</option>
                  <option value="relative_color_VECTOR_SHIFT">色彩矢量迁移</option>
                </optgroup>
              </select>
~~~~~
~~~~~typescript
                <optgroup label="相对色感">
                  <option value="relative_color_all">相对色感 (全部)</option>
                  <option value="relative_color_VECTOR_SHIFT">色彩矢量迁移</option>
                </optgroup>
                <optgroup label="正负形感知">
                  <option value="negative_space_all">正负形感知 (全部)</option>
                  <option value="negative_space_RATIO_ESTIMATION">负形占比估算</option>
                </optgroup>
              </select>
~~~~~

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript
import {
  ArrowRight,
  BarChart2,
  Clock,
  Compass,
  Palette,
  Shuffle,
  Sliders,
  Sparkles,
} from 'lucide-preact';
import { formatTotalTime } from '../utils/db';

interface HomeProps {
  totalTimeMs: number;
  starHoppingTimeMs: number;
  colorTimeMs: number;
  relativeColorTimeMs: number;
  onNavigate: (app: 'star-hopping' | 'color-sense' | 'relative-color') => void;
  onOpenGlobalSettings: () => void;
  onOpenGlobalStats: () => void;
}

export function Home({
  totalTimeMs,
  starHoppingTimeMs,
  colorTimeMs,
  relativeColorTimeMs,
  onNavigate,
  onOpenGlobalSettings,
  onOpenGlobalStats,
}: HomeProps) {
~~~~~
~~~~~typescript
import {
  ArrowRight,
  BarChart2,
  Clock,
  Compass,
  Maximize2,
  Palette,
  Shuffle,
  Sliders,
  Sparkles,
} from 'lucide-preact';
import { formatTotalTime } from '../utils/db';

interface HomeProps {
  totalTimeMs: number;
  starHoppingTimeMs: number;
  colorTimeMs: number;
  relativeColorTimeMs: number;
  negativeSpaceTimeMs: number;
  onNavigate: (app: 'star-hopping' | 'color-sense' | 'relative-color' | 'negative-space') => void;
  onOpenGlobalSettings: () => void;
  onOpenGlobalStats: () => void;
}

export function Home({
  totalTimeMs,
  starHoppingTimeMs,
  colorTimeMs,
  relativeColorTimeMs,
  negativeSpaceTimeMs,
  onNavigate,
  onOpenGlobalSettings,
  onOpenGlobalStats,
}: HomeProps) {
~~~~~

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript
          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform border-t border-slate-100 mt-4">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              <span>累计练习: {formatTotalTime(relativeColorTimeMs)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>进入相对色感看板</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
~~~~~
~~~~~typescript
          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform border-t border-slate-100 mt-4">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              <span>累计练习: {formatTotalTime(relativeColorTimeMs)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>进入相对色感看板</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* 4. 正负形空间感知 */}
        <button
          type="button"
          onClick={() => onNavigate('negative-space')}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                <Maximize2 className="w-8 h-8" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                正负形空间感知 (Negative Space)
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                切换观察视角，通过对几何剪影周围留白（负形）面积占比的估算，打破具象认知偏见，培养专业起形与比例感知力。
              </p>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform border-t border-slate-100 mt-4">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>累计练习: {formatTotalTime(negativeSpaceTimeMs)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>进入正负形看板</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
import { RelativeColorDashboard } from './views/RelativeColorDashboard';
import { RelativeColorTrainingView } from './views/RelativeColorTrainingView';
import { TrainingView } from './views/TrainingView';

type GlobalApp = 'home' | 'star-hopping' | 'color-sense' | 'relative-color';

export function App() {
  const [currentApp, setCurrentApp] = useState<GlobalApp>('home');
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');
~~~~~
~~~~~typescript
import type { NegativeSpaceMode } from './utils/negativeSpaceUtils';
import { NegativeSpaceDashboard } from './views/NegativeSpaceDashboard';
import { NegativeSpaceTrainingView } from './views/NegativeSpaceTrainingView';
import { RelativeColorDashboard } from './views/RelativeColorDashboard';
import { RelativeColorTrainingView } from './views/RelativeColorTrainingView';
import { TrainingView } from './views/TrainingView';

type GlobalApp = 'home' | 'star-hopping' | 'color-sense' | 'relative-color' | 'negative-space';

export function App() {
  const [currentApp, setCurrentApp] = useState<GlobalApp>('home');
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');
~~~~~
