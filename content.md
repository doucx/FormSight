已分析代码检查与构建失败的原因。问题主要集中在：
1. `src/app.tsx` 和 `src/components/settings/DynamicDomainSettings.tsx` 中存在未使用的类型引入与未定类型 `any`；
2. `src/config/trainingPlugins.tsx` 中存在 Biome 校验报错的 `any` 泛型声明；
3. `src/utils/__tests__/db.test.ts` 中仍保留了重构前的旧数据库 API 调用。

我将生成一个修复计划并执行相应的代码修正。

## [WIP] fix: 修复 Biome 校验错误、未使用的导入及数据库单元测试 API

### 错误分析
1. **Biome Linter 报错 (`noExplicitAny`)**:
   - `DynamicDomainSettings.tsx` 中 `values` 与 `onChange` 使用了 `Record<string, any>`。
   - `trainingPlugins.tsx` 中 `TRAINING_PLUGINS` 使用了 `any` 泛型参数且未添加 linter 忽略规则。
2. **TypeScript 编译报错 (`TS6133` - 未使用的导入)**:
   - `app.tsx` 引入了未使用的 `NegativeSpaceMode` 与 `RelativeColorMode`。
   - `DynamicDomainSettings.tsx` 引入了未使用的 `ComponentChildren`。
3. **TypeScript 编译报错 (`TS2305`, `TS2724` - DB 模块测试用例过期)**:
   - `src/utils/__tests__/db.test.ts` 中调用了已经被统一架构废弃的老旧 API（如 `getAllColorProfiles`、`saveColorSession` 等）。

### 用户需求
修复 Biome 语法和类型检查报错，修正 TypeScript 编译错误，使 `npm run checkf` 和 `npm run build` 均能顺利通过。

### 评论
该修复对于保证代码质量门禁（CI/CD）正常运行至关重要。随着多训练模块抽象架构的统一，保持类型安全与测试用例的同步更新是项目健康演进的基础。

### 目标
1. 移除 `app.tsx` 与 `DynamicDomainSettings.tsx` 中未使用的导入。
2. 将 `DynamicDomainSettings.tsx` 中的 `any` 替换为安全的 `unknown` 并补充类型断言。
3. 为 `trainingPlugins.tsx` 的泛型映射补充 Biome 规范注释。
4. 重构 `src/utils/__tests__/db.test.ts`，基于新的统一存储层 API 编写完整的单元测试。

### 基本原理
- 遵循 TypeScript 最佳实践，使用 `unknown` 代替 `any`。
- 将测试用例与 `idb` 统一后的 `FormSightDBSchema` 与 queries 接口完全对齐，确保数据读写、聚合与导入导出的测试覆盖率。

### 标签
#intent/fix #flow/ready #priority/high #comp/build #concept/executor #scope/core #ai/instruct #task/domain/build #task/object/typecheck-and-lint #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 清理 `src/app.tsx` 中未使用的导入

我们将移除未使用的 `NegativeSpaceMode` 和 `RelativeColorMode` 类型导入。

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
import {
  type TrainingDomain,
  type UnifiedProfileData,
  getProfilesByDomain,
  getTrainingTimeMs,
} from './utils/db';
import type { NegativeSpaceMode } from './utils/negativeSpaceUtils';
import type { RelativeColorMode } from './utils/relativeColorUtils';
import { type UserSettings, loadSettings } from './utils/settings';
~~~~~
~~~~~typescript.new
import {
  type TrainingDomain,
  type UnifiedProfileData,
  getProfilesByDomain,
  getTrainingTimeMs,
} from './utils/db';
import { type UserSettings, loadSettings } from './utils/settings';
~~~~~

#### Acts 2: 修复 `DynamicDomainSettings.tsx` 的类型声明与导入

移除未使用的 `ComponentChildren`，将 `any` 替换为 `unknown`。

~~~~~act
patch_file
src/components/settings/DynamicDomainSettings.tsx
~~~~~
~~~~~typescript.old
import type { ComponentChildren } from 'preact';
import type { TrainingDomain } from '../../utils/db';
import type { TargetingMode } from '../../utils/settings';
import { SettingToggleItem } from './common/SettingToggleItem';
import { SliderMarginGroup } from './common/SliderMarginGroup';
import { TargetingSection } from './common/TargetingSection';
~~~~~
~~~~~typescript.new
import type { TrainingDomain } from '../../utils/db';
import type { TargetingMode } from '../../utils/settings';
import { SettingToggleItem } from './common/SettingToggleItem';
import { SliderMarginGroup } from './common/SliderMarginGroup';
import { TargetingSection } from './common/TargetingSection';
~~~~~

~~~~~act
patch_file
src/components/settings/DynamicDomainSettings.tsx
~~~~~
~~~~~typescript.old
interface DynamicDomainSettingsProps {
  schemas: SettingFieldSchema[];
  values: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
}

export function DynamicDomainSettings({ schemas, values, onChange }: DynamicDomainSettingsProps) {
  const handleSectorToggle = (sectorsKey: string, sectorIdx: number) => {
    const currentSectors: number[] = values[sectorsKey] || [];
    const exists = currentSectors.includes(sectorIdx);
    const updated = exists
      ? currentSectors.filter((s) => s !== sectorIdx)
      : [...currentSectors, sectorIdx];

    onChange({ [sectorsKey]: updated });
  };

  return (
    <div className="space-y-4">
      {schemas.map((field) => {
        if (field.type === 'sliderMargin') {
          return (
            <SliderMarginGroup
              key={field.key}
              title={field.title}
              value={values[field.key] ?? 12}
              onChange={(val) => onChange({ [field.key]: val })}
            />
          );
        }

        if (field.type === 'toggle') {
          return (
            <SettingToggleItem
              key={field.key}
              title={field.title}
              description={field.description}
              checked={Boolean(values[field.key])}
              onChange={(checked) => onChange({ [field.key]: checked })}
            />
          );
        }

        if (field.type === 'buttonGroup') {
          const currentVal = values[field.key];
          return (
            <div key={field.key} className="space-y-2">
              <div className="text-sm font-semibold text-slate-700">{field.title}</div>
              <div className={`grid ${field.gridCols || 'grid-cols-4'} gap-1.5`}>
                {field.options.map((opt) => (
                  <button
                    type="button"
                    key={String(opt.value)}
                    onClick={() => onChange({ [field.key]: opt.value })}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      currentVal === opt.value
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        }

        if (field.type === 'targeting') {
          const mode: TargetingMode = values[field.modeKey] || 'off';
          const selectedSectors: number[] = values[field.sectorsKey] || [];

          return (
            <TargetingSection
              key={`${field.modeKey}-${field.sectorsKey}`}
              title={field.title}
              subTitle={field.subTitle}
              mode={mode}
              onModeChange={(m) => onChange({ [field.modeKey]: m })}
              sectors={field.sectors}
              selectedSectors={selectedSectors}
              onToggleSector={(idx) => handleSectorToggle(field.sectorsKey, idx)}
              gridCols={field.gridCols}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
~~~~~
~~~~~typescript.new
interface DynamicDomainSettingsProps {
  schemas: SettingFieldSchema[];
  values: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

export function DynamicDomainSettings({ schemas, values, onChange }: DynamicDomainSettingsProps) {
  const handleSectorToggle = (sectorsKey: string, sectorIdx: number) => {
    const currentSectors = (values[sectorsKey] as number[] | undefined) || [];
    const exists = currentSectors.includes(sectorIdx);
    const updated = exists
      ? currentSectors.filter((s) => s !== sectorIdx)
      : [...currentSectors, sectorIdx];

    onChange({ [sectorsKey]: updated });
  };

  return (
    <div className="space-y-4">
      {schemas.map((field) => {
        if (field.type === 'sliderMargin') {
          return (
            <SliderMarginGroup
              key={field.key}
              title={field.title}
              value={(values[field.key] as number | undefined) ?? 12}
              onChange={(val) => onChange({ [field.key]: val })}
            />
          );
        }

        if (field.type === 'toggle') {
          return (
            <SettingToggleItem
              key={field.key}
              title={field.title}
              description={field.description}
              checked={Boolean(values[field.key])}
              onChange={(checked) => onChange({ [field.key]: checked })}
            />
          );
        }

        if (field.type === 'buttonGroup') {
          const currentVal = values[field.key];
          return (
            <div key={field.key} className="space-y-2">
              <div className="text-sm font-semibold text-slate-700">{field.title}</div>
              <div className={`grid ${field.gridCols || 'grid-cols-4'} gap-1.5`}>
                {field.options.map((opt) => (
                  <button
                    type="button"
                    key={String(opt.value)}
                    onClick={() => onChange({ [field.key]: opt.value })}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      currentVal === opt.value
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        }

        if (field.type === 'targeting') {
          const mode = (values[field.modeKey] as TargetingMode | undefined) || 'off';
          const selectedSectors = (values[field.sectorsKey] as number[] | undefined) || [];

          return (
            <TargetingSection
              key={`${field.modeKey}-${field.sectorsKey}`}
              title={field.title}
              subTitle={field.subTitle}
              mode={mode}
              onModeChange={(m) => onChange({ [field.modeKey]: m })}
              sectors={field.sectors}
              selectedSectors={selectedSectors}
              onToggleSector={(idx) => handleSectorToggle(field.sectorsKey, idx)}
              gridCols={field.gridCols}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
~~~~~

#### Acts 3: 补充 `trainingPlugins.tsx` 的 Biome 校验规则注释

在异构插件映射表声明处添加 `biome-ignore`。

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript.old
export const TRAINING_PLUGINS: Record<TrainingDomain, TrainingPlugin<any, any, any, any>> = {
  star: starPlugin,
  color: colorPlugin,
  relative_color: relativeColorPlugin,
  negative_space: negativeSpacePlugin,
};
~~~~~
~~~~~typescript.new
// biome-ignore lint/suspicious/noExplicitAny: Plugin map holds heterogeneous plugin instances
export const TRAINING_PLUGINS: Record<TrainingDomain, TrainingPlugin<any, any, any, any>> = {
  star: starPlugin,
  color: colorPlugin,
  relative_color: relativeColorPlugin,
  negative_space: negativeSpacePlugin,
};
~~~~~

#### Acts 4: 重构 `src/utils/__tests__/db.test.ts` 适配统一存储层

为统一后的数据库接口（`saveTrialRecord`, `getTrialRecords`, `saveSession`, `getProfile`, `getTrainingTimeMs`, `importAllData`, `exportAllData`, `clearAllData`）重写单元测试。

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
  getProfile,
  getProfilesByDomain,
  getTrainingTimeMs,
  getTrialRecords,
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
    it('should save trial record and automatically update user profile', async () => {
      const record: UnifiedTrialRecord = {
        id: 'rec_1',
        sessionId: 'sess_1',
        domain: 'star',
        mode: 'single',
        timestamp: Date.now(),
        difficultyLevel: 5,
        isHit: true,
        responseTimeMs: 800,
        details: { angleDegree: 45 },
      };

      await saveTrialRecord(record);

      const records = await getTrialRecords('star', 'single');
      expect(records.length).toBe(1);
      expect(records[0].id).toBe('rec_1');
      expect(records[0].isHit).toBe(true);
      expect((records[0] as Record<string, unknown>).angleDegree).toBe(45);

      const profile = await getProfile('star', 'single');
      expect(profile).not.toBeNull();
      expect(profile?.totalTrainedCards).toBe(1);
      expect(profile?.totalHits).toBe(1);
      expect(profile?.currentLevel).toBe(5);
      expect(profile?.bestLevel).toBe(5);
    });

    it('should filter records by domain correctly', async () => {
      await saveTrialRecord({
        id: 'rec_star',
        sessionId: 'sess_star',
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
        domain: 'color',
        mode: 'H',
        timestamp: 2000,
        difficultyLevel: 4,
        isHit: false,
        responseTimeMs: 600,
      });

      const starRecords = await getTrialRecords('star');
      expect(starRecords.length).toBe(1);
      expect(starRecords[0].id).toBe('rec_star');

      const colorRecords = await getTrialRecords('color');
      expect(colorRecords.length).toBe(1);
      expect(colorRecords[0].id).toBe('rec_color');

      const allRecords = await getTrialRecords();
      expect(allRecords.length).toBe(2);
    });

    it('should retrieve profiles by domain', async () => {
      await saveTrialRecord({
        id: 'rec_h',
        sessionId: 's1',
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
        domain: 'color',
        mode: 'V',
        timestamp: 1000,
        difficultyLevel: 6,
        isHit: true,
        responseTimeMs: 400,
      });

      const profiles = await getProfilesByDomain('color');
      expect(profiles.length).toBe(2);
      const modes = profiles.map((p) => p.mode).sort();
      expect(modes).toEqual(['H', 'V']);
    });
  });

  describe('Sessions and Time Aggregation', () => {
    it('should save session and calculate training time', async () => {
      const session1: UnifiedSessionData = {
        id: 'sess_1',
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

      const session2: UnifiedSessionData = {
        id: 'sess_2',
        domain: 'color',
        mode: 'H',
        type: 'training',
        startTimestamp: 100000,
        endTimestamp: 220000, // 120s = 120000ms
        totalTrials: 20,
        hitTrials: 15,
        startLevel: 5,
        endLevel: 7,
      };

      await saveSession(session1);
      await saveSession(session2);

      const starTime = await getTrainingTimeMs('star');
      expect(starTime).toBe(60000);

      const colorTime = await getTrainingTimeMs('color');
      expect(colorTime).toBe(120000);

      const totalTime = await getTrainingTimeMs();
      expect(totalTime).toBe(180000);
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
        domain: 'star',
        mode: 'single',
        timestamp: 1000,
        difficultyLevel: 8,
        isHit: true,
        responseTimeMs: 300,
      });

      await saveSession({
        id: 'sess_exp',
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
      const recordsAfterClear = await getTrialRecords();
      expect(recordsAfterClear.length).toBe(0);

      const success = await importAllData(json);
      expect(success).toBe(true);

      const restoredRecords = await getTrialRecords('star');
      expect(restoredRecords.length).toBe(1);
      expect(restoredRecords[0].id).toBe('rec_exp');
    });
  });
});
~~~~~

### 下一步建议
1. 执行 `npm run checkf` 校验代码格式与规范；
2. 执行 `npm run build` 和 `npm run test` 确保全量构建与单元测试均 100% 绿灯通过；
3. 测试通过后可发起提交。
