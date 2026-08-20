我已经定位了构建与 Lint 检查失败的具体原因。

主要包含以下几处问题：
1. `src/app.tsx` 中在挂载 `GenericTrainingView` 时，由于传入的插件和配置是异构联合类型，导致泛型类型推导失败。
2. `src/utils/db/schema.ts` 中 `UnifiedSessionData` 和 `UnifiedTrialRecord` 的 `cardId` 字段设为了必填，但在旧逻辑/测试构造中可能缺省（`queries.ts` 内部已具备自动兜底补全逻辑），导致测试用例报错。
3. `src/config/analyticsPlugins.tsx` 存在未使用的 `CheckCircle` 变量以及 `records as any` 断言。
4. `src/utils/canvas/drawHeatmap.ts` 入参类型与 `UnifiedTrialRecord` 不一致。
5. `src/components/WeaknessAnalyticsModal.tsx` 中的 `handleUpdateContext` 未做 `useCallback` 记忆化，导致 `useEffect` 触发 exhaustive-deps 告警。

下面是修复这些问题的计划与具体修改补丁。

## [WIP] fix: 修复 TypeScript 类型推导与 Biome Lint 校验错误

### 错误分析
1. **TS2322 (`src/app.tsx`)**: `GenericTrainingView` 组件的泛型未设置默认类型 `any`，导致在 `app.tsx` 依据动态卡片分发异构 `CARD_PLUGINS` 和 `settings` 时，TypeScript 自动推导为第一个分支类型 (`StarSettings`)，进而引发联合类型不匹配错误。
2. **TS2741 & TS2345 (`src/utils/__tests__/db.test.ts`)**: `UnifiedTrialRecord` 和 `UnifiedSessionData` 接口中将 `cardId` 声明为严格必选，但 `queries.ts` 保存函数内部已有 `record.cardId || resolveLegacyCardId(...)` 的自动补全逻辑，单测在未传 `cardId` 时触发类型校验失败。
3. **TS6133 & noExplicitAny (`src/config/analyticsPlugins.tsx`)**: 未使用的图标引用 `CheckCircle`，以及调用 `renderHeatmapCanvas` 时使用了 `records as any`。
4. **useExhaustiveDependencies (`src/components/WeaknessAnalyticsModal.tsx`)**: `handleUpdateContext` 每次渲染重新生成且未包含在 `useEffect` 的依赖项中。

### 用户需求
修复所有 TypeScript 编译报错（`tsc`）和 Biome Lint 检查告警（`biome check`），使 `npm run build` 和 `npm run checkf` 能够顺利通过。

### 评论
该修复完善了项目类型系统的鲁棒性与一致性，消除了异构训练插件在运行时动态派发时的类型冲突，并消除了不必要的类型强转和 Lint 隐患。

### 目标
1. 在 `GenericTrainingViewProps` 与 `GenericTrainingView` 中增加宽容的泛型默认值，支持异构插件与配置的分发。
2. 将 `UnifiedSessionData` 与 `UnifiedTrialRecord` 的 `cardId` 调整为可选字段 `cardId?: string`。
3. 修正 `drawHeatmap.ts` 的入参类型为 `UnifiedTrialRecord[]`，移除 `analyticsPlugins.tsx` 中的 `as any` 和未使用导入。
4. 使用 `useCallback` 包装 `handleUpdateContext` 并补全 `WeaknessAnalyticsModal.tsx` 中的依赖项。

### 基本原理
通过在组件层与数据契约层合理设置默认类型和可选属性，既保持了各独立训练插件内部严格的强类型约束，又支持顶层视图动态派发多形态组件；同时规范 Hook 依赖以满足 Biome 的静态代码质量检查。

### 标签
#intent/fix #flow/ready #priority/high #comp/build #concept/executor #scope/core #ai/instruct #task/domain/build #task/object/type-and-lint-fixes #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 调整数据库 Schema 兼容可选 cardId

修改 `src/utils/db/schema.ts`，将 `cardId` 设为可选，与 `queries.ts` 中的自动解析逻辑保持一致。

~~~~~act
patch_file
src/utils/db/schema.ts
~~~~~
~~~~~typescript
export interface UnifiedSessionData {
  id: string;
  cardId: string;
  domain: TrainingDomain;
  mode: string;
  type: 'training' | 'benchmark';
  startTimestamp: number;
  endTimestamp?: number;
  totalTrials: number;
  hitTrials: number;
  startLevel: number;
  endLevel: number;
}

export interface UnifiedTrialRecord {
  id: string;
  sessionId: string;
  cardId: string;
  domain: TrainingDomain;
  mode: string;
  timestamp: number;
  difficultyLevel: number;
  isHit: boolean;
  responseTimeMs: number;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}
~~~~~
~~~~~typescript
export interface UnifiedSessionData {
  id: string;
  cardId?: string;
  domain: TrainingDomain;
  mode: string;
  type: 'training' | 'benchmark';
  startTimestamp: number;
  endTimestamp?: number;
  totalTrials: number;
  hitTrials: number;
  startLevel: number;
  endLevel: number;
}

export interface UnifiedTrialRecord {
  id: string;
  sessionId: string;
  cardId?: string;
  domain: TrainingDomain;
  mode: string;
  timestamp: number;
  difficultyLevel: number;
  isHit: boolean;
  responseTimeMs: number;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}
~~~~~

#### Acts 2: 优化 GenericTrainingView 泛型默认值

在 `src/views/GenericTrainingView.tsx` 中为泛型参数指定默认类型，避免异构插件联合派发时的类型推断冲突。

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
interface GenericTrainingViewProps<
  TQuestion,
  THitResult,
  TAnswerVal,
  TSettings extends BaseModuleSettings,
> {
  card: CardDefinition;
  plugin: TrainingPlugin<TQuestion, THitResult, TAnswerVal, TSettings>;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: TSettings;
  onExit: () => void;
}

export function GenericTrainingView<
  TQuestion,
  THitResult,
  TAnswerVal,
  TSettings extends BaseModuleSettings,
>({
  card,
  plugin,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings>) {
~~~~~
~~~~~typescript
interface GenericTrainingViewProps<
  TQuestion = any,
  THitResult = any,
  TAnswerVal = any,
  TSettings extends BaseModuleSettings = any,
> {
  card: CardDefinition;
  plugin: TrainingPlugin<TQuestion, THitResult, TAnswerVal, TSettings>;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: TSettings;
  onExit: () => void;
}

export function GenericTrainingView<
  TQuestion = any,
  THitResult = any,
  TAnswerVal = any,
  TSettings extends BaseModuleSettings = any,
>({
  card,
  plugin,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings>) {
~~~~~

#### Acts 3: 优化 drawHeatmap 类型签名与数据提取

修改 `src/utils/canvas/drawHeatmap.ts`，使其直接支持 `UnifiedTrialRecord` 类型。

~~~~~act
patch_file
src/utils/canvas/drawHeatmap.ts
~~~~~
~~~~~typescript
import type { TrialRecord } from '../../types';
import { setupHiDpiCanvas } from './hidpi';

export function renderHeatmapCanvas(
  canvas: HTMLCanvasElement,
  records: TrialRecord[],
  avgDx: number,
  avgDy: number,
  totalCount: number,
) {
~~~~~
~~~~~typescript
import type { UnifiedTrialRecord } from '../db';
import { setupHiDpiCanvas } from './hidpi';

export function renderHeatmapCanvas(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
  avgDx: number,
  avgDy: number,
  totalCount: number,
) {
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawHeatmap.ts
~~~~~
~~~~~typescript
  for (const r of records) {
    const dx = r.userClick[0] - r.targetB[0];
    const dy = r.userClick[1] - r.targetB[1];

    const px = cx + dx * scale;
    const py = cy + dy * scale;
~~~~~
~~~~~typescript
  for (const r of records) {
    const uClick = (r.userClick as [number, number]) || [0, 0];
    const tB = (r.targetB as [number, number]) || [0, 0];
    const dx = uClick[0] - tB[0];
    const dy = uClick[1] - tB[1];

    const px = cx + dx * scale;
    const py = cy + dy * scale;
~~~~~

#### Acts 4: 清理 analyticsPlugins 中的未使用导入和 as any

修改 `src/config/analyticsPlugins.tsx`，移除 `CheckCircle` 与 `as any`。

~~~~~act
patch_file
src/config/analyticsPlugins.tsx
~~~~~
~~~~~typescript
import {
  AlertCircle,
  CheckCircle,
  Columns,
  Compass,
  Crosshair,
  Eye,
  Sparkles,
  Sun,
  Target,
} from 'lucide-preact';
~~~~~
~~~~~typescript
import {
  AlertCircle,
  Columns,
  Compass,
  Crosshair,
  Eye,
  Sparkles,
  Sun,
  Target,
} from 'lucide-preact';
~~~~~

~~~~~act
patch_file
src/config/analyticsPlugins.tsx
~~~~~
~~~~~typescript
    if (starTab === 'heatmap') {
      renderHeatmapCanvas(canvas, records as any, avgDx, avgDy, totalCount);
    } else {
~~~~~
~~~~~typescript
    if (starTab === 'heatmap') {
      renderHeatmapCanvas(canvas, records, avgDx, avgDy, totalCount);
    } else {
~~~~~

#### Acts 5: 修复 WeaknessAnalyticsModal 中的 Hook 依赖

修改 `src/components/WeaknessAnalyticsModal.tsx`，使用 `useCallback` 并将 `handleUpdateContext` 补充至依赖数组。

~~~~~act
patch_file
src/components/WeaknessAnalyticsModal.tsx
~~~~~
~~~~~typescript
import { BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ANALYTICS_PLUGINS } from '../config/analyticsPlugins';
import type { TrainingDomain, UnifiedTrialRecord } from '../utils/db';

interface WeaknessAnalyticsModalProps {
  domain: TrainingDomain;
  onClose: () => void;
}

export function WeaknessAnalyticsModal({ domain, onClose }: WeaknessAnalyticsModalProps) {
  const plugin = ANALYTICS_PLUGINS[domain];
  const [contextState, setContextState] = useState<Record<string, unknown>>({});
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleUpdateContext = (patch: Record<string, unknown>) => {
    setContextState((prev) => ({ ...prev, ...patch }));
  };
~~~~~
~~~~~typescript
import { BarChart2, Info, X } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { ANALYTICS_PLUGINS } from '../config/analyticsPlugins';
import type { TrainingDomain, UnifiedTrialRecord } from '../utils/db';

interface WeaknessAnalyticsModalProps {
  domain: TrainingDomain;
  onClose: () => void;
}

export function WeaknessAnalyticsModal({ domain, onClose }: WeaknessAnalyticsModalProps) {
  const plugin = ANALYTICS_PLUGINS[domain];
  const [contextState, setContextState] = useState<Record<string, unknown>>({});
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleUpdateContext = useCallback((patch: Record<string, unknown>) => {
    setContextState((prev) => ({ ...prev, ...patch }));
  }, []);
~~~~~

~~~~~act
patch_file
src/components/WeaknessAnalyticsModal.tsx
~~~~~
~~~~~typescript
    plugin.renderVisualizer(canvas, records, {
      state: contextState,
      setState: handleUpdateContext,
    });
  }, [plugin, loading, records, contextState]);
~~~~~
~~~~~typescript
    plugin.renderVisualizer(canvas, records, {
      state: contextState,
      setState: handleUpdateContext,
    });
  }, [plugin, loading, records, contextState, handleUpdateContext]);
~~~~~

### 下一步建议
1. 执行本计划以应用修改。
2. 运行 `npm run build` 和 `npm test` 验证编译与单测是否全部通过。
3. 验证无误后，可以生成相应的 Git 提交计划。
