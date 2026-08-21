我已定位所有 19 处构建与类型错误。这些错误主要来源于模块拆分重构后残留的旧路径引用（例如 `../../types` 缺少一层上级路径、已迁移到 `src/core/*` 和各领域 `utils` 的函数路径未同步更新），以及个别类型标注缺失。

## [WIP] fix(types): 修复模块相对导入路径与类型声明错误

### 错误分析

1. **注册表类型缺失**: `src/core/registry.ts` 尝试从不存在的 `../config/analyticsPlugins` 导入 `CardAnalyticsPlugin`，导致类型推断退化为 `any`，引发 `WeaknessAnalyticsModal.tsx` 中的 TS7006 隐式 `any` 参数错误。
2. **点阵组件与核心绘图依赖路径错误**: `src/core/canvas/drawPointGrid.ts` 与 `src/components/common/PointClickCanvas.tsx` 引用了已被重构分散到 `core` 与 `domains/star/utils` 的旧 `utils/geometry` 路径。
3. **领域模块相对深度错误**: `src/domains/star/utils/*` 和 `src/domains/negative_space/utils/types.ts` 等文件在 3 级深度的目录下误用了 2 级相对路径 `../../types`。
4. **色感分析模块导入路径失效**: `src/domains/color/analytics.tsx` 引用了旧 `../../utils/colorUtils`，实际已归拢至 `../../core/color/colorUtils`。
5. **单元测试导入路径滞后**: `src/utils/__tests__/*` 下的各测试文件仍然引用扁平旧 `../xxx` 模块，需修正至对应的 `core` 和 `domains/*/utils`。

### 用户需求
修复 TypeScript 类型检查和 Vite 构建导入解析错误，确保 `npm run build` 和 `npm run test` 顺利通过。

### 评论
该修复是一次标准的重构收尾工作。通过补齐模块重定位后的契约与导入路径，消除孤立引用，恢复系统的可构建性与类型安全。

### 目标
1. 修复 `src/core/registry.ts` 的 `CardAnalyticsPlugin` 导入源，并在 `src/components/WeaknessAnalyticsModal.tsx` 中补全类型声明。
2. 修正 `src/core/canvas/drawPointGrid.ts` 与 `src/components/common/PointClickCanvas.tsx` 的导入路径。
3. 修正 `src/domains/color/analytics.tsx` 的 `hsvToHex` 导入路径。
4. 修正 `src/domains/star/utils/*` 和 `src/domains/negative_space/utils/types.ts` 的三级相对路径 `../../../types`。
5. 修正 `src/utils/__tests__/*` 中全部单元测试的导入路径。

### 基本原理
所有重构后的算法和工具已按关注点分离归入 `core/`、`domains/<domain>/utils/` 或 `utils/`。通过精准修正各模块的相对路径，并在核心契约与视图之间恢复正确的类型流动，彻底解决 TS 编译与打包错误。

### 标签
#intent/fix #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #ai/instruct #task/domain/build #task/object/module-imports #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修正 core 与 UI 组件的导入与类型标注

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
import type { CardAnalyticsPlugin } from '../config/analyticsPlugins';
import type { DomainMeta } from '../config/domains';
~~~~~
~~~~~typescript
import type { DomainMeta } from '../config/domains';
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db/schema';
import type { CardAnalyticsPlugin, DomainManifest } from './contracts';
~~~~~

~~~~~act
patch_file
src/components/WeaknessAnalyticsModal.tsx
~~~~~
~~~~~typescript
import { BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { registry } from '../core/registry';
import type { CardDefinition } from '../types/card';
import type { UnifiedTrialRecord } from '../utils/db';

interface WeaknessAnalyticsModalProps {
  card: CardDefinition;
  onClose: () => void;
}

export function WeaknessAnalyticsModal({ card, onClose }: WeaknessAnalyticsModalProps) {
  const plugin = registry.getAnalyticsPluginByCardId(card.id);
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeViewIndex, setActiveViewIndex] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const views = plugin?.views ?? [];
  const currentView = views[activeViewIndex] || views[0];

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (plugin) {
      plugin.fetchRecords(card.id).then((data) => {
        if (isMounted) {
          setRecords(data);
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }
~~~~~
~~~~~typescript
import { BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { CardAnalyticsView } from '../core/contracts';
import { registry } from '../core/registry';
import type { CardDefinition } from '../types/card';
import type { UnifiedTrialRecord } from '../utils/db';

interface WeaknessAnalyticsModalProps {
  card: CardDefinition;
  onClose: () => void;
}

export function WeaknessAnalyticsModal({ card, onClose }: WeaknessAnalyticsModalProps) {
  const plugin = registry.getAnalyticsPluginByCardId(card.id);
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeViewIndex, setActiveViewIndex] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const views = plugin?.views ?? [];
  const currentView = views[activeViewIndex] || views[0];

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (plugin) {
      plugin.fetchRecords(card.id).then((data: UnifiedTrialRecord[]) => {
        if (isMounted) {
          setRecords(data);
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }
~~~~~

~~~~~act
patch_file
src/components/WeaknessAnalyticsModal.tsx
~~~~~
~~~~~typescript
        {/* 多页 Tab 切换栏 (当有多个视图时展示) */}
        {views.length > 1 && (
          <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl">
            {views.map((v, idx) => {
              const Icon = v.icon;
              const isActive = idx === activeViewIndex;
              return (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => setActiveViewIndex(idx)}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {v.tabLabel}
                </button>
              );
            })}
          </div>
        )}
~~~~~
~~~~~typescript
        {/* 多页 Tab 切换栏 (当有多个视图时展示) */}
        {views.length > 1 && (
          <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl">
            {views.map((v: CardAnalyticsView, idx: number) => {
              const Icon = v.icon;
              const isActive = idx === activeViewIndex;
              return (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => setActiveViewIndex(idx)}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {v.tabLabel}
                </button>
              );
            })}
          </div>
        )}
~~~~~

~~~~~act
patch_file
src/core/canvas/drawPointGrid.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';
import { getDynamicCrosshairMetrics, getDynamicDotRadius } from '../../utils/geometry';
~~~~~
~~~~~typescript
import {
  getDynamicCrosshairMetrics,
  getDynamicDotRadius,
} from '../../domains/star/utils/hitDetection';
import type { Point } from '../../types';
~~~~~

~~~~~act
patch_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Point } from '../../types';
import { renderInteractivePointGrid } from '../../utils/canvas/drawPointGrid';
import { findNearestGridPoint } from '../../utils/geometry';
~~~~~
~~~~~typescript
import { useEffect, useRef, useState } from 'preact/hooks';
import { renderInteractivePointGrid } from '../../core/canvas/drawPointGrid';
import { findNearestGridPoint } from '../../domains/star/utils/hitDetection';
import type { Point } from '../../types';
~~~~~

#### Acts 2: 修正各领域模块内部的相对导入路径

~~~~~act
patch_file
src/domains/color/analytics.tsx
~~~~~
~~~~~typescript
import { AlertCircle, PieChart, Sparkles } from 'lucide-preact';
import type { CardAnalyticsPlugin } from '../../core/contracts';
import { renderHueRingCanvas } from '../../utils/canvas/drawColorRing';
import type { SectorStat } from '../../utils/canvas/drawCompass';
import { calcSignedHueBias, renderHueBiasChartCanvas } from '../../utils/canvas/drawHueBiasChart';
import { hsvToHex } from '../../utils/colorUtils';
import { getTrialRecordsByCard } from '../../utils/db';
~~~~~
~~~~~typescript
import { AlertCircle, PieChart, Sparkles } from 'lucide-preact';
import { hsvToHex } from '../../core/color/colorUtils';
import type { CardAnalyticsPlugin } from '../../core/contracts';
import { renderHueRingCanvas } from '../../utils/canvas/drawColorRing';
import type { SectorStat } from '../../utils/canvas/drawCompass';
import { calcSignedHueBias, renderHueBiasChartCanvas } from '../../utils/canvas/drawHueBiasChart';
import { getTrialRecordsByCard } from '../../utils/db';
~~~~~

~~~~~act
patch_file
src/domains/negative_space/utils/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';
~~~~~
~~~~~typescript
import type { Point } from '../../../types';
~~~~~

~~~~~act
patch_file
src/domains/star/utils/gridGenerators.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';
import { DEFAULT_GRID_DIM, calcDistance } from './pointMath';
~~~~~
~~~~~typescript
import type { Point } from '../../../types';
import { DEFAULT_GRID_DIM, calcDistance } from './pointMath';
~~~~~

~~~~~act
patch_file
src/domains/star/utils/hitDetection.ts
~~~~~
~~~~~typescript
import type { HitResult, Point } from '../../types';
import { calcDistance } from './pointMath';
~~~~~
~~~~~typescript
import type { HitResult, Point } from '../../../types';
import { calcDistance } from './pointMath';
~~~~~

~~~~~act
patch_file
src/domains/star/utils/pointMath.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';
~~~~~
~~~~~typescript
import type { Point } from '../../../types';
~~~~~

~~~~~act
patch_file
src/domains/star/utils/questionGenerator.ts
~~~~~
~~~~~typescript
import type { Point, QuestionData, TrainingMode } from '../../types';
import { generateBipolarGridPoints, generatePolarGridPoints } from './gridGenerators';
~~~~~
~~~~~typescript
import type { Point, QuestionData, TrainingMode } from '../../../types';
import { generateBipolarGridPoints, generatePolarGridPoints } from './gridGenerators';
~~~~~

#### Acts 3: 修正单元测试中的模块导入路径

~~~~~act
patch_file
src/utils/__tests__/adaptiveEngine.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import { AdaptiveEngine } from '../adaptiveEngine';
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import { AdaptiveEngine } from '../../core/engine/adaptiveEngine';
~~~~~

~~~~~act
patch_file
src/utils/__tests__/colorUtils.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import {
  checkColorHit,
  generateColorQuestion,
  getToleranceForLevel,
  hsvToHex,
} from '../colorUtils';
import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from '../oklchUtils';
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import {
  checkColorHit,
  generateColorQuestion,
  getToleranceForLevel,
  hsvToHex,
} from '../../core/color/colorUtils';
import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from '../../core/color/oklchUtils';
~~~~~

~~~~~act
patch_file
src/utils/__tests__/geometry.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import {
  calcDistance,
  checkHit,
  findNearestGridPoint,
  generateBipolarGridPoints,
  generatePolarGridPoints,
  generateQuestion,
  getDynamicCrosshairMetrics,
  getDynamicDotRadius,
  getGridMinSpacing,
  rotatePoint,
} from '../geometry';
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import {
  calcDistance,
  checkHit,
  findNearestGridPoint,
  generateBipolarGridPoints,
  generatePolarGridPoints,
  generateQuestion,
  getDynamicCrosshairMetrics,
  getDynamicDotRadius,
  getGridMinSpacing,
  rotatePoint,
} from '../../domains/star/utils';
~~~~~

~~~~~act
patch_file
src/utils/__tests__/negativeSpaceUtils.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  calcPolygonArea,
  checkNegativeSpaceHit,
  generateNegativeSpaceQuestion,
  generateRandomPolygon,
  getNegativeSpaceToleranceForLevel,
} from '../negativeSpaceUtils';
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  calcPolygonArea,
  checkNegativeSpaceHit,
  generateNegativeSpaceQuestion,
  generateRandomPolygon,
  getNegativeSpaceToleranceForLevel,
} from '../../domains/negative_space/utils';
~~~~~

~~~~~act
patch_file
src/utils/__tests__/relativeColorUtils.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import {
  checkRelativeColorHit,
  generateRelativeColorQuestion,
  getDistractorDistanceForLevel,
  okLabToHsv,
} from '../relativeColorUtils';
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import {
  checkRelativeColorHit,
  generateRelativeColorQuestion,
  getDistractorDistanceForLevel,
  okLabToHsv,
} from '../../domains/relative_color/utils';
~~~~~

### 下一步建议
1. 执行 `npm run build` 和 `npm test` 确认类型检查与所有单元测试均通过。
2. 验证通过后，可生成独立的 `[COMMIT]` 计划将这些路径与类型修复提交到版本库。
