好的，我将按照代码审核结果，分阶段实施首轮重构与代码清理：清理无用死代码、移除冗余中间转接文件、精简过时配置与无用 Hook 监听。

## [WIP] refactor: 清理死代码、移除冗余转接层并优化组件生命周期

### 用户需求
针对代码审核中发现的死代码、未使用的类型定义、冗余的 `db.ts` 垫片层以及无效 `useEffect` 进行清理与重构，提升代码库的纯净度与可维护性。

### 评论
这次重构清理了历史迭代残留的无用声明与转接文件，消除了潜在的类型歧义与无意义的组件渲染开销，为后续进一步抽象通用交互与 Canvas 渲染容器奠定扎实基础。

### 目标
1. 删除已完全由 `src/utils/db/index.ts` 替代的冗余中转文件 `src/utils/db.ts`。
2. 从 `src/types/index.ts` 中移除已废弃的旧版 `TrialRecord` 接口定义。
3. 从 `src/components/settings/DynamicDomainSettings.tsx` 中清理已被卡片级 Schema 替代的死配置 `DOMAIN_SETTING_SCHEMAS`。
4. 移除 `src/components/common/PointClickCanvas.tsx` 中无意义的初始 `setHoverPoint(null)` Effect。
5. 清理 `src/domains/abstraction/utils/types.ts` 中废弃的未引用字段。

### 基本原理
1. TypeScript + Vite bundler 模式下，直接引入目录 `'../utils/db'` 即可精确解析到 `src/utils/db/index.ts`，删除根级 `db.ts` 可以消除多层代理转接。
2. 全局统一使用 `UnifiedTrialRecord`（由 `src/utils/db/schema.ts` 提供并别名导出为 `TrialRecord`），移除 `src/types/index.ts` 的重复冲突定义。
3. 动态配置已经全面下沉到各个卡片的 `settingSchemas` 属性中，移除全局冗余字典以减小打包体积。

### 标签
#intent/refine #flow/ready #priority/medium
#comp/core #comp/components #scope/core #scope/dx
#ai/instruct
#task/domain/refactoring
#task/object/codebase-hygiene
#task/action/dead-code-elimination
#task/state/begin #task/status/active

---

### Script

#### Acts 1: 删除冗余的 `src/utils/db.ts` 代理文件

直接使用目录内部的 `src/utils/db/index.ts` 作为统一导出入口。

~~~~~act
delete_file
src/utils/db.ts
~~~~~

#### Acts 2: 清理 `src/types/index.ts` 中废弃的 `TrialRecord` 接口

移除冗余的旧版 `TrialRecord`，消除与 `UnifiedTrialRecord` 的类型冲突。

~~~~~act
patch_file
src/types/index.ts
~~~~~
~~~~~typescript.old
export interface HitResult {
  isHit: boolean; // 是否选中正确的网格点
  nearestGridPoint: Point; // 用户点击位置对应的网格点
  errorDistance: number; // 点击位置与真理点的像素误差
  isWithinRange?: boolean; // 是否落在有效点击感应范围内
}

export interface TrialRecord {
  id: string;
  sessionId: string;
  mode: TrainingMode;
  timestamp: number;
  difficultyLevel: number; // 存入 Level 等级
  anchorA: [number, number];
  anchorC?: [number, number];
  targetB: [number, number];
  userClick: [number, number];
  angleDegree: number;
  distanceRatio: number;
  isHit: boolean;
  errorPixelDistance: number;
  responseTimeMs: number;
}
~~~~~
~~~~~typescript.new
export interface HitResult {
  isHit: boolean; // 是否选中正确的网格点
  nearestGridPoint: Point; // 用户点击位置对应的网格点
  errorDistance: number; // 点击位置与真理点的像素误差
  isWithinRange?: boolean; // 是否落在有效点击感应范围内
}
~~~~~

#### Acts 3: 清理 `DynamicDomainSettings.tsx` 中的死配置

移除已被卡片内联 Schema 完全替代的 `DOMAIN_SETTING_SCHEMAS` 常量定义。

~~~~~act
patch_file
src/components/settings/DynamicDomainSettings.tsx
~~~~~
~~~~~typescript.old
export const COLOR_SECTORS = [
  '红 (0°-30°)',
  '橙 (30°-60°)',
  '黄 (60°-90°)',
  '黄绿 (90°-120°)',
  '绿 (120°-150°)',
  '青绿 (150°-180°)',
  '青 (180°-210°)',
  '蓝 (210°-240°)',
  '蓝紫 (240°-270°)',
  '紫 (270°-300°)',
  '品红 (300°-330°)',
  '紫红 (330°-360°)',
];

export const DOMAIN_SETTING_SCHEMAS: Record<TrainingDomain, SettingFieldSchema[]> = {
  angle: [],
  abstraction: [],
  concretization: [],
  star: [
    {
      type: 'buttonGroup',
      key: 'gridSize',
      title: '干扰点网格大小',
      options: [
        { label: '2x2', value: 2 },
        { label: '3x3', value: 3 },
        { label: '4x4', value: 4 },
        { label: '5x5', value: 5 },
      ],
      gridCols: 'grid-cols-4',
    },
    {
      type: 'targeting',
      modeKey: 'targetingMode',
      sectorsKey: 'manualTargetSectors',
      title: '弱点专项靶向强化',
      subTitle: '选择需要靶向强化的角度扇区：',
      sectors: STAR_SECTORS,
      gridCols: 'grid-cols-4',
    },
  ],
  color: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: '显示滑块容错感应区',
      description: '在悬停光标两侧实时显示 ΔE 动态容错区间',
    },
    {
      type: 'toggle',
      key: 'enableHoverColorPreview',
      title: '综合拾色悬停颜色实时联动',
      description: '鼠标悬停滑块时右侧色块实时跟随试探预览',
    },
    {
      type: 'targeting',
      modeKey: 'targetingMode',
      sectorsKey: 'manualTargetSectors',
      title: '色相弱点专项靶向强化',
      subTitle: '选择需要靶向强化的色相扇区：',
      sectors: COLOR_SECTORS,
      gridCols: 'grid-cols-3',
    },
  ],
  relative_color: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: '显示滑块容错感应区',
      description: '在悬停光标两侧实时显示 ΔE 动态容错区间',
    },
    {
      type: 'toggle',
      key: 'enableHoverColorPreview',
      title: '悬停推移色彩联动预览',
      description: '鼠标悬停滑块时右侧色块实时跟随试探预览',
    },
  ],
  negative_space: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: '显示滑块容错感应区',
      description: '在悬停光标两侧实时显示 Δ% 动态容错区间',
    },
  ],
};

interface DynamicDomainSettingsProps {
~~~~~
~~~~~typescript.new
export const COLOR_SECTORS = [
  '红 (0°-30°)',
  '橙 (30°-60°)',
  '黄 (60°-90°)',
  '黄绿 (90°-120°)',
  '绿 (120°-150°)',
  '青绿 (150°-180°)',
  '青 (180°-210°)',
  '蓝 (210°-240°)',
  '蓝紫 (240°-270°)',
  '紫 (270°-300°)',
  '品红 (300°-330°)',
  '紫红 (330°-360°)',
];

interface DynamicDomainSettingsProps {
~~~~~

#### Acts 4: 移除 `PointClickCanvas.tsx` 中多余的空挂载 `useEffect`

清理组件挂载时重复设置默认值的无效操作。

~~~~~act
patch_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~typescript.old
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  useEffect(() => {
    setHoverPoint(null);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
~~~~~
~~~~~typescript.new
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
~~~~~

#### Acts 5: 清理 `src/domains/abstraction/utils/types.ts` 中的未引用废弃字段

移除 4AFC 改造前遗留的 `patternA`、`patternB` 和 `correctPatternChoice` 属性。

~~~~~act
patch_file
src/domains/abstraction/utils/types.ts
~~~~~
~~~~~typescript.old
  promptDominantColor?: [number, number, number]; // 题干单基准主色
  palettePatternOptions?: PaletteTile[][]; // 4 组候选图案
  correctPatternIndex?: number; // 0..3
  patternA?: PaletteTile[];
  patternB?: PaletteTile[];
  correctPatternChoice?: 'A' | 'B';
}

export interface AbstractionHitResult {
~~~~~
~~~~~typescript.new
  promptDominantColor?: [number, number, number]; // 题干单基准主色
  palettePatternOptions?: PaletteTile[][]; // 4 组候选图案
  correctPatternIndex?: number; // 0..3
}

export interface AbstractionHitResult {
~~~~~

### 下一步建议
1. **统一 Canvas 渲染容器 (`<CanvasView />`)**：将各卡片组件中重复的 `useRef` + `useEffect` 样板代码抽取为通用 Canvas 组件。
2. **抽象通用 2AFC / N-AFC / Slider 视图壳组件**：合并各 domain 下重复率高达 90% 的视图文件，大幅降低代码量。
3. **测试验证**：执行 `npm run test` 和 `npm run check` 确保重构后所有测试用例与静态检查保持绿灯通过。
