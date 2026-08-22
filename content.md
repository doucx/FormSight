编译构建时遇到的 TypeScript 类型检查与未声明/未使用引用错误已经定位完毕。我们将逐一修复这些类型兼容性、包导入路径、无用变量声明以及测试用例中的签名断言问题。

## [WIP] fix: 修复 TypeScript 编译与测试用例类型错误

### 错误分析

1. **未使用的导入与变量 (`TS6133`, `TS6196`)**：
   - `GlobalSettingsModal.tsx`、`GlobalStatsModal.tsx`、`FilterEngine.tsx`、`CardPickerPanel.tsx` 与 `repository.ts` 中存在多处未读取的图标组件或实体导入。
2. **组件 Props 签名不一致 (`TS2322`)**：
   - `PlanEditorModal.tsx` 向 `CardPickerPanel` 传递了已被抽离进面板内部的 `selectedDomainFilter` / `availableCards` 属性。
3. **插件通用类型兼容性 (`TS2322`)**：
   - `src/config/trainingPlugins.tsx` 中的 `AnyTrainingPlugin` 定义缺少宽泛泛型逃生舱 (`any`)，导致具体业务包中泛型函数的逆变参数无法安全赋值给通用扩展包清单。
4. **作用域变量缺失与类型推导 (`TS18004`, `TS2345`, `TS2769`)**：
   - `GenericTrainingView.tsx` 中使用了未在作用域内声明的简写属性 `domain`（实际变量名为 `packId`）。
   - `registry.ts` 中 `candidateIds` 的推导类型导致 `map` 回调参数被推导为 `unknown`。
   - `compute.worker.ts` 中 `self.postMessage` 匹配到了 Window 类型重载而非 DedicatedWorkerGlobalScope。
5. **单元测试路径与 Schema 不匹配 (`TS2307`, `TS2305`, `TS2345`, `TS2741`, `TS2554`)**：
   - `geometry.test.ts`、`negativeSpaceUtils.test.ts`、`relativeColorUtils.test.ts` 中引入了迁移前的 `../../domains/*` 路径。
   - `db.test.ts` 使用了旧版数据库 API 和缺少 `cardId` 属性的实体类型。

### 用户需求

修复所有 TypeScript 类型编译错误，使 `npm run build` 和单元测试顺利通过。

### 评论

这次修复全面对齐了 v0.4 插件化架构的类型契约，消除了无用变量对构建打包体积的影响，并确保 Web Worker 和单元测试在严格模式下的类型安全。

### 目标

1. 清理所有组件中未引用的 Lucide 图标与多余变量。
2. 修复 `AnyTrainingPlugin` 泛型别名声明。
3. 修正 `PlanEditorModal` 与 `CardPickerPanel` 的属性对接。
4. 修复 `GenericTrainingView` 中的 `domain: packId` 映射及 `registry.ts`、`compute.worker.ts` 的类型兼容性。
5. 更新测试用例中的旧导入路径与数据库 Schema 字段。

### 基本原理

1. 在 `trainingPlugins.tsx` 中将 `AnyTrainingPlugin` 显式设为 `TrainingPlugin<any, any, any, any>`，使具体卡片插件能够向上转型。
2. 在 `GenericTrainingView` 中显式指定 `domain: packId`。
3. 在 Web Worker 环境下为 `self` 补充 `DedicatedWorkerGlobalScope` 断言或使用标准 Worker postMessage 签名。
4. 修正单元测试中的包路径为 `../../packs/*` 并补充 `cardId`。

### 标签

#intent/fix #flow/ready #priority/high #comp/build #concept/executor #scope/core #ai/instruct #task/domain/build #task/object/typescript-types #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 修复配置与核心契约类型

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript
export type AnyTrainingPlugin = TrainingPlugin;
~~~~~
~~~~~typescript
export type AnyTrainingPlugin = TrainingPlugin<any, any, any, any>;
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
    const idsToFilter =
      candidateIds === null ? Array.from(this.cardMap.keys()) : Array.from(candidateIds);
    let results = idsToFilter
      .map((id) => this.cardMap.get(id))
      .filter((card): card is CardDefinition => Boolean(card));
~~~~~
~~~~~typescript
    const idsToFilter: string[] =
      candidateIds === null ? Array.from(this.cardMap.keys()) : Array.from(candidateIds);
    let results = idsToFilter
      .map((id) => this.cardMap.get(id))
      .filter((card): card is CardDefinition => Boolean(card));
~~~~~

~~~~~act
patch_file
src/utils/db/repository.ts
~~~~~
~~~~~typescript
import { registry } from '../../core/registry';
import type { TrainingPlan } from '../../types/plan';
~~~~~
~~~~~typescript
import type { TrainingPlan } from '../../types/plan';
~~~~~

#### Acts 2: 修复组件与视图中的 TS 错误及无用引用

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
import {
  Clock,
  Download,
  FlaskConical,
  HelpCircle,
  RotateCcw,
  Scissors,
  Sliders,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-preact';
~~~~~
~~~~~typescript
import {
  Clock,
  Download,
  FlaskConical,
  HelpCircle,
  RotateCcw,
  Scissors,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-preact';
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
import {
  Activity,
  Award,
  BarChart2,
  Calendar,
  ChevronDown,
  Compass,
  Filter,
  Layers,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from 'lucide-preact';
~~~~~
~~~~~typescript
import {
  Activity,
  BarChart2,
  Calendar,
  ChevronDown,
  Compass,
  Filter,
  Target,
  TrendingUp,
  X,
} from 'lucide-preact';
~~~~~

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~typescript
import {
  Boxes,
  Check,
  Compass,
  Crosshair,
  Filter,
  Layers,
  MousePointer,
  RotateCcw,
  Search,
  Sliders,
  Sparkles,
  X,
} from 'lucide-preact';
~~~~~
~~~~~typescript
import {
  Boxes,
  Check,
  Compass,
  Crosshair,
  Filter,
  MousePointer,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-preact';
~~~~~

~~~~~act
patch_file
src/components/plan/editor/CardPickerPanel.tsx
~~~~~
~~~~~typescript
import { Filter, Plus, Search, Sparkles, X } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { registry } from '../../../core/registry';
import type { CardDefinition, CardQueryOptions, CognitiveSkillTag } from '../../../types/card';
import { SKILL_TAG_LABELS } from '../../discovery/FilterEngine';
~~~~~
~~~~~typescript
import { Plus, Search, Sparkles, X } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { registry } from '../../../core/registry';
import type { CardQueryOptions, CognitiveSkillTag } from '../../../types/card';
import { SKILL_TAG_LABELS } from '../../discovery/FilterEngine';
~~~~~

~~~~~act
patch_file
src/components/plan/PlanEditorModal.tsx
~~~~~
~~~~~typescript
  const validPlanItems = currentPlan.items.filter((item) =>
    Boolean(registry.getCardById(item.cardId)),
  );
  const totalTrials = validPlanItems.reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  const availableCards = registry.getAllCards().filter((card) => {
    if (selectedDomainFilter === 'all') return true;
    return card.packId === selectedDomainFilter;
  });

  return (
    <ModalShell title="定制日常训练流" icon={Sliders} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-5">
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-2.5">
~~~~~
~~~~~typescript
  const validPlanItems = currentPlan.items.filter((item) =>
    Boolean(registry.getCardById(item.cardId)),
  );
  const totalTrials = validPlanItems.reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  return (
    <ModalShell title="定制日常训练流" icon={Sliders} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-5">
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-2.5">
~~~~~

~~~~~act
patch_file
src/components/plan/PlanEditorModal.tsx
~~~~~
~~~~~typescript
        <CardPickerPanel
          isAddingCard={isAddingCard}
          selectedDomainFilter={selectedDomainFilter}
          availableCards={availableCards}
          onToggleAdding={setIsAddingCard}
          onSelectDomainFilter={setSelectedDomainFilter}
          onAddItem={handleAddItem}
        />
~~~~~
~~~~~typescript
        <CardPickerPanel
          isAddingCard={isAddingCard}
          onToggleAdding={setIsAddingCard}
          onAddItem={handleAddItem}
        />
~~~~~

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sessionId,
          cardId: card.id,
          domain,
          mode,
          timestamp: Date.now(),
~~~~~
~~~~~typescript
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sessionId,
          cardId: card.id,
          domain: packId,
          mode,
          timestamp: Date.now(),
~~~~~

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
      await saveSession({
        id: sessionId,
        cardId: card.id,
        domain,
        mode,
        type: sessionType,
~~~~~
~~~~~typescript
      await saveSession({
        id: sessionId,
        cardId: card.id,
        domain: packId,
        mode,
        type: sessionType,
~~~~~

#### Acts 3: 修复 Compute Worker 与单元测试

~~~~~act
patch_file
src/workers/compute.worker.ts
~~~~~
~~~~~typescript
    } else if (action === 'heatmapBinning') {
      const res = heatmapBinningCompute(payload as HeatmapBinningInput);
      self.postMessage({ id, success: true, data: res } as WorkerResponse, [res.bins.buffer]);
    } else if (action === 'hueBiasAnalysis') {
~~~~~
~~~~~typescript
    } else if (action === 'heatmapBinning') {
      const res = heatmapBinningCompute(payload as HeatmapBinningInput);
      (self as unknown as Worker).postMessage({ id, success: true, data: res } as WorkerResponse, [
        res.bins.buffer,
      ]);
    } else if (action === 'hueBiasAnalysis') {
~~~~~

~~~~~act
patch_file
src/utils/__tests__/geometry.test.ts
~~~~~
~~~~~typescript
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
~~~~~typescript
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
} from '../../packs/star/utils';
~~~~~

~~~~~act
patch_file
src/utils/__tests__/negativeSpaceUtils.test.ts
~~~~~
~~~~~typescript
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  calcPolygonArea,
  checkNegativeSpaceHit,
  generateNegativeSpaceQuestion,
  generateRandomPolygon,
  getNegativeSpaceToleranceForLevel,
} from '../../domains/negative_space/utils';
~~~~~
~~~~~typescript
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  calcPolygonArea,
  checkNegativeSpaceHit,
  generateNegativeSpaceQuestion,
  generateRandomPolygon,
  getNegativeSpaceToleranceForLevel,
} from '../../packs/negative_space/utils';
~~~~~

~~~~~act
patch_file
src/utils/__tests__/relativeColorUtils.test.ts
~~~~~
~~~~~typescript
import {
  checkRelativeColorHit,
  generateRelativeColorQuestion,
  getDistractorDistanceForLevel,
  okLabToHsv,
} from '../../domains/relative_color/utils';
~~~~~
~~~~~typescript
import {
  checkRelativeColorHit,
  generateRelativeColorQuestion,
  getDistractorDistanceForLevel,
  okLabToHsv,
} from '../../packs/relative_color/utils';
~~~~~

~~~~~act
write_file
src/utils/__tests__/db.test.ts
~~~~~
~~~~~typescript
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllData,
  exportAllData,
  formatTotalTime,
  getAllProfiles,
  getDailySummaries,
  getProfile,
  getTodaySummaries,
  getTrainingTimeMs,
  getTrialRecordsByCard,
  importAllData,
  saveSession,
  saveTrialRecord,
} from '../db';
import type { UnifiedSessionData, UnifiedTrialRecord } from '../db/schema';

describe('Unified Database Layer Tests', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  describe('Trial Records and Profiles', () => {
    it('should save trial record and automatically update user profile and daily summaries', async () => {
      const record: UnifiedTrialRecord = {
        id: 'rec_1',
        sessionId: 'sess_1',
        cardId: 'star_single',
        domain: 'star',
        mode: 'single',
        timestamp: Date.now(),
        difficultyLevel: 5,
        isHit: true,
        responseTimeMs: 800,
        details: { angleDegree: 45 },
      };

      await saveTrialRecord(record);

      const records = await getTrialRecordsByCard('star_single');
      expect(records.length).toBe(1);
      expect(records[0].id).toBe('rec_1');
      expect(records[0].isHit).toBe(true);
      expect((records[0] as Record<string, unknown>).angleDegree).toBe(45);

      const profile = await getProfile('star_single');
      expect(profile).not.toBeNull();
      expect(profile?.totalTrials).toBe(1);
      expect(profile?.totalHits).toBe(1);
      expect(profile?.currentLevel).toBe(5);
      expect(profile?.bestLevel).toBe(5);

      const todaySummaries = await getTodaySummaries();
      expect(todaySummaries.length).toBe(1);
      expect(todaySummaries[0].cardId).toBe('star_single');
      expect(todaySummaries[0].totalCount).toBe(1);
    });

    it('should filter records by card correctly', async () => {
      await saveTrialRecord({
        id: 'rec_star',
        sessionId: 'sess_star',
        cardId: 'star_single',
        domain: 'star',
        mode: 'single',
        timestamp: 1000,
        difficultyLevel: 3,
        isHit: true,
        responseTimeMs: 500,
      });

      await saveTrialRecord({
        id: 'rec_color',
        sessionId: 'sess_color',
        cardId: 'color_hue',
        domain: 'color',
        mode: 'H',
        timestamp: 2000,
        difficultyLevel: 4,
        isHit: false,
        responseTimeMs: 600,
      });

      const starRecords = await getTrialRecordsByCard('star_single');
      expect(starRecords.length).toBe(1);
      expect(starRecords[0].id).toBe('rec_star');

      const colorRecords = await getTrialRecordsByCard('color_hue');
      expect(colorRecords.length).toBe(1);
      expect(colorRecords[0].id).toBe('rec_color');
    });

    it('should retrieve all profiles correctly', async () => {
      await saveTrialRecord({
        id: 'rec_h',
        sessionId: 's1',
        cardId: 'color_hue',
        domain: 'color',
        mode: 'H',
        timestamp: 1000,
        difficultyLevel: 5,
        isHit: true,
        responseTimeMs: 400,
      });

      await saveTrialRecord({
        id: 'rec_v',
        sessionId: 's2',
        cardId: 'color_val',
        domain: 'color',
        mode: 'V',
        timestamp: 1000,
        difficultyLevel: 6,
        isHit: true,
        responseTimeMs: 400,
      });

      const profiles = await getAllProfiles();
      expect(profiles.length).toBe(2);
      const cardIds = profiles.map((p) => p.cardId).sort();
      expect(cardIds).toEqual(['color_hue', 'color_val']);
    });
  });

  describe('Sessions and Time Aggregation', () => {
    it('should save session and calculate training time via daily summaries', async () => {
      const session1: UnifiedSessionData = {
        id: 'sess_1',
        cardId: 'star_single',
        domain: 'star',
        mode: 'single',
        type: 'training',
        startTimestamp: 10000,
        endTimestamp: 70000, // 60s = 60000ms
        totalTrials: 10,
        hitTrials: 8,
        startLevel: 5,
        endLevel: 6,
      };

      await saveSession(session1);

      await saveTrialRecord({
        id: 'rec_t1',
        sessionId: 'sess_1',
        cardId: 'star_single',
        domain: 'star',
        mode: 'single',
        timestamp: 15000,
        difficultyLevel: 5,
        isHit: true,
        responseTimeMs: 600,
      });

      await saveTrialRecord({
        id: 'rec_t2',
        sessionId: 'sess_1',
        cardId: 'color_hue',
        domain: 'color',
        mode: 'H',
        timestamp: 25000,
        difficultyLevel: 5,
        isHit: true,
        responseTimeMs: 400,
      });

      const totalTime = await getTrainingTimeMs();
      expect(totalTime).toBe(1000);
    });

    it('should format total time strings properly', () => {
      expect(formatTotalTime(0)).toBe('0天0小时0分钟');
      expect(formatTotalTime(65 * 1000 * 60)).toBe('0天1小时5分钟');
      expect(formatTotalTime((25 * 60 + 30) * 1000 * 60)).toBe('1天1小时30分钟');
    });
  });

  describe('Data Import and Export', () => {
    it('should export, clear and re-import data completely', async () => {
      await saveTrialRecord({
        id: 'rec_exp',
        sessionId: 'sess_exp',
        cardId: 'star_single',
        domain: 'star',
        mode: 'single',
        timestamp: 1000,
        difficultyLevel: 8,
        isHit: true,
        responseTimeMs: 300,
      });

      await saveSession({
        id: 'sess_exp',
        cardId: 'star_single',
        domain: 'star',
        mode: 'single',
        type: 'training',
        startTimestamp: 1000,
        endTimestamp: 5000,
        totalTrials: 1,
        hitTrials: 1,
        startLevel: 8,
        endLevel: 8,
      });

      const json = await exportAllData();
      expect(typeof json).toBe('string');

      await clearAllData();
      const recordsAfterClear = await getTrialRecordsByCard('star_single');
      expect(recordsAfterClear.length).toBe(0);

      const success = await importAllData(json);
      expect(success).toBe(true);

      const restoredRecords = await getTrialRecordsByCard('star_single');
      expect(restoredRecords.length).toBe(1);
      expect(restoredRecords[0].id).toBe('rec_exp');
    });
  });
});
~~~~~

### 下一步建议

1. **执行构建验证**：运行 `npm run build` 和 `npm run test`，验证所有 37 处 TypeScript 类型与测试用例是否已完全通过。
2. **代码格式检查**：运行 `npm run check`，确保 Biome 代码格式与规范一致。
