已为你制定补齐 `db.ts` 时长与看板聚合测试，以及 `geometry.ts` 和 `colorUtils.ts` 靶向算法测试的计划。

## [WIP] test: 补齐练习时长、看板聚合与弱点靶向生成算法的单元测试

### 用户需求
1. 为 `db.ts` 补齐 `formatTotalTime` 格式化函数、`getStarHoppingTrainingTimeMs` / `getColorTrainingTimeMs` / `getTotalTrainingTimeMs` 会话练习时长聚合，以及 `getAllUserProfiles` / `getAllColorProfiles` 看板提取的单元测试。
2. 为 `geometry.ts` 和 `colorUtils.ts` 补齐弱点专项靶向强化生成算法（手动指定锁定扇区加权生成）的单元测试。

### 评论
通过补齐练习时长计算与看板聚合的逻辑测试，能够保障统计数据的准确性；通过测试弱点靶向生成算法在特定扇区锁定下的概率分布（70% 概率加权集中），能够确保专项强化模式按预期工作。

### 目标
1. 在 `db.test.ts` 中补充 `formatTotalTime` 格式化、会话时长累加、全模式 Profiles 获取及按模式筛选记录的单元测试。
2. 在 `geometry.test.ts` 中补充 `single` 模式下 `targetingMode: 'manual'` 指定扇区的加权极角测试。
3. 在 `colorUtils.test.ts` 中补充 `H` 色相模式下 `colorTargetingMode: 'manual'` 指定扇区的加权色相测试。

### 基本原理
对概率性生成算法通过统计多次调用（如 200 次生成）落域比例是否显著高于普通全随机基线（例如 14% -> >40%），来验证加权靶向逻辑的正确性；对 `db.ts` 使用模拟会话记录验证时长计算与多模式 profile 的空值/非空映射。

### 标签
#intent/tooling #flow/ready #priority/high #comp/tests #concept/executor #scope/dx #ai/instruct #task/domain/testing #task/object/p1-unit-tests #task/action/implementation #task/state/continue

---

### Script

#### Acts 1: 补齐 db.ts 时长格式化、会话累加与 Profiles 聚合测试

~~~~~act
patch_file
src/utils/__tests__/db.test.ts
~~~~~
~~~~~typescript.old
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllData,
  exportAllData,
  getAllColorProfiles,
  getAllTrialRecords,
  getUserProfile,
  importAllData,
  saveColorTrialRecord,
  saveTrialRecord,
} from '../db';

describe('db storage & import/export', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('saveTrialRecord - should save trial record and update profile', async () => {
    await saveTrialRecord({
      id: 'r1',
      sessionId: 's1',
      mode: 'single',
      timestamp: Date.now(),
      difficultyLevel: 5,
      anchorA: [250, 250],
      targetB: [300, 250],
      userClick: [300, 250],
      angleDegree: 0,
      distanceRatio: 50,
      isHit: true,
      errorPixelDistance: 0,
      responseTimeMs: 500,
    });

    const records = await getAllTrialRecords('single');
    expect(records.length).toBe(1);
    expect(records[0].id).toBe('r1');

    const profile = await getUserProfile('single');
    expect(profile).not.toBeNull();
    expect(profile?.totalTrainedCards).toBe(1);
    expect(profile?.totalHits).toBe(1);
  });

  it('exportAllData and importAllData - should correctly export and restore data', async () => {
    // 1. Prepare initial data
    await saveTrialRecord({
      id: 'star_1',
      sessionId: 's1',
      mode: 'single',
      timestamp: 1000,
      difficultyLevel: 10,
      anchorA: [100, 100],
      targetB: [200, 200],
      userClick: [200, 200],
      angleDegree: 45,
      distanceRatio: 100,
      isHit: true,
      errorPixelDistance: 0,
      responseTimeMs: 300,
    });

    await saveColorTrialRecord({
      id: 'color_1',
      sessionId: 'cs1',
      mode: 'H',
      timestamp: 1000,
      difficultyLevel: 8,
      targetHSV: [120, 100, 100],
      userHSV: [120, 100, 100],
      isHit: true,
      errorValue: 0,
      responseTimeMs: 400,
    });

    // 2. Export
    const exportedJson = await exportAllData();
    expect(exportedJson).toContain('star_1');
    expect(exportedJson).toContain('color_1');

    // 3. Clear DB
    await clearAllData();
    const recordsEmpty = await getAllTrialRecords();
    expect(recordsEmpty.length).toBe(0);

    // 4. Import
    const success = await importAllData(exportedJson);
    expect(success).toBe(true);

    // 5. Verify restored data
    const recordsRestored = await getAllTrialRecords('single');
    expect(recordsRestored.length).toBe(1);
    expect(recordsRestored[0].id).toBe('star_1');

    const colorProfiles = await getAllColorProfiles();
    expect(colorProfiles.H?.totalTrainedCards).toBe(1);
  });
});
~~~~~
~~~~~typescript.new
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllData,
  exportAllData,
  formatTotalTime,
  getAllColorProfiles,
  getAllColorTrialRecords,
  getAllTrialRecords,
  getAllUserProfiles,
  getColorTrainingTimeMs,
  getStarHoppingTrainingTimeMs,
  getTotalTrainingTimeMs,
  getUserProfile,
  importAllData,
  saveColorSession,
  saveColorTrialRecord,
  saveSession,
  saveTrialRecord,
} from '../db';

describe('db storage & import/export', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('formatTotalTime - should format milliseconds into days, hours, and minutes', () => {
    expect(formatTotalTime(0)).toBe('0天0小时0分钟');
    expect(formatTotalTime(65 * 1000)).toBe('0天0小时1分钟');
    expect(formatTotalTime((60 * 60 + 120) * 1000)).toBe('0天1小时2分钟');
    expect(formatTotalTime((24 * 3600 + 3600 * 2 + 180) * 1000)).toBe('1天2小时3分钟');
  });

  it('saveTrialRecord - should save trial record and update profile', async () => {
    await saveTrialRecord({
      id: 'r1',
      sessionId: 's1',
      mode: 'single',
      timestamp: Date.now(),
      difficultyLevel: 5,
      anchorA: [250, 250],
      targetB: [300, 250],
      userClick: [300, 250],
      angleDegree: 0,
      distanceRatio: 50,
      isHit: true,
      errorPixelDistance: 0,
      responseTimeMs: 500,
    });

    const records = await getAllTrialRecords('single');
    expect(records.length).toBe(1);
    expect(records[0].id).toBe('r1');

    const profile = await getUserProfile('single');
    expect(profile).not.toBeNull();
    expect(profile?.totalTrainedCards).toBe(1);
    expect(profile?.totalHits).toBe(1);
  });

  it('getAllUserProfiles & getAllColorProfiles - should retrieve all mode profiles', async () => {
    await saveTrialRecord({
      id: 'r1',
      sessionId: 's1',
      mode: 'single',
      timestamp: Date.now(),
      difficultyLevel: 5,
      anchorA: [250, 250],
      targetB: [300, 250],
      userClick: [300, 250],
      angleDegree: 0,
      distanceRatio: 50,
      isHit: true,
      errorPixelDistance: 0,
      responseTimeMs: 500,
    });

    const userProfiles = await getAllUserProfiles();
    expect(userProfiles.single).not.toBeNull();
    expect(userProfiles.double_h).toBeNull();
    expect(userProfiles.double_r).toBeNull();

    await saveColorTrialRecord({
      id: 'cr1',
      sessionId: 'cs1',
      mode: 'H',
      timestamp: Date.now(),
      difficultyLevel: 5,
      targetHSV: [0, 100, 100],
      userHSV: [0, 100, 100],
      isHit: true,
      errorValue: 0,
      responseTimeMs: 500,
    });

    const colorProfiles = await getAllColorProfiles();
    expect(colorProfiles.H).not.toBeNull();
    expect(colorProfiles.S).toBeNull();
    expect(colorProfiles.V).toBeNull();

    const colorRecords = await getAllColorTrialRecords('H');
    expect(colorRecords.length).toBe(1);
  });

  it('training time calculation - should aggregate valid session durations', async () => {
    await saveSession({
      id: 's1',
      mode: 'single',
      type: 'training',
      startTimestamp: 1000,
      endTimestamp: 61000, // +60s
      totalTrials: 5,
      hitTrials: 4,
      startLevel: 5,
      endLevel: 6,
    });

    await saveColorSession({
      id: 'cs1',
      mode: 'H',
      type: 'training',
      startTimestamp: 1000,
      endTimestamp: 31000, // +30s
      totalTrials: 3,
      hitTrials: 3,
      startLevel: 5,
      endLevel: 6,
    });

    const starMs = await getStarHoppingTrainingTimeMs();
    const colorMs = await getColorTrainingTimeMs();
    const totalMs = await getTotalTrainingTimeMs();

    expect(starMs).toBe(60000);
    expect(colorMs).toBe(30000);
    expect(totalMs).toBe(90000);
  });

  it('exportAllData and importAllData - should correctly export and restore data', async () => {
    // 1. Prepare initial data
    await saveTrialRecord({
      id: 'star_1',
      sessionId: 's1',
      mode: 'single',
      timestamp: 1000,
      difficultyLevel: 10,
      anchorA: [100, 100],
      targetB: [200, 200],
      userClick: [200, 200],
      angleDegree: 45,
      distanceRatio: 100,
      isHit: true,
      errorPixelDistance: 0,
      responseTimeMs: 300,
    });

    await saveColorTrialRecord({
      id: 'color_1',
      sessionId: 'cs1',
      mode: 'H',
      timestamp: 1000,
      difficultyLevel: 8,
      targetHSV: [120, 100, 100],
      userHSV: [120, 100, 100],
      isHit: true,
      errorValue: 0,
      responseTimeMs: 400,
    });

    // 2. Export
    const exportedJson = await exportAllData();
    expect(exportedJson).toContain('star_1');
    expect(exportedJson).toContain('color_1');

    // 3. Clear DB
    await clearAllData();
    const recordsEmpty = await getAllTrialRecords();
    expect(recordsEmpty.length).toBe(0);

    // 4. Import
    const success = await importAllData(exportedJson);
    expect(success).toBe(true);

    // 5. Verify restored data
    const recordsRestored = await getAllTrialRecords('single');
    expect(recordsRestored.length).toBe(1);
    expect(recordsRestored[0].id).toBe('star_1');

    const colorProfiles = await getAllColorProfiles();
    expect(colorProfiles.H?.totalTrainedCards).toBe(1);
  });
});
~~~~~

#### Acts 2: 补齐 geometry.ts 寻星弱点靶向生成算法测试

~~~~~act
patch_file
src/utils/__tests__/geometry.test.ts
~~~~~
~~~~~typescript.old
    const qDoubleR = generateQuestion('double_r', 15);
    expect(qDoubleR.mode).toBe('double_r');
    expect(qDoubleR.rotationAngle).toBeDefined();
  });
});
~~~~~
~~~~~typescript.new
    const qDoubleR = generateQuestion('double_r', 15);
    expect(qDoubleR.mode).toBe('double_r');
    expect(qDoubleR.rotationAngle).toBeDefined();
  });

  it('generateQuestion with manual targeting - should generate targeted angles with higher probability', () => {
    // 锁定扇区 0 (对应 0° 正东，允许加权抖动 ±20°)
    const options = {
      targetingMode: 'manual' as const,
      targetSectors: [0],
    };

    let targetedCount = 0;
    const totalRuns = 200;

    for (let i = 0; i < totalRuns; i++) {
      const q = generateQuestion('single', 5, options);
      // 0° ± 25° 范围 (0~25° 或 335~360°)
      if (q.angleDegree <= 25 || q.angleDegree >= 335) {
        targetedCount++;
      }
    }

    const ratio = targetedCount / totalRuns;
    expect(ratio).toBeGreaterThan(0.4);
  });
});
~~~~~

#### Acts 3: 补齐 colorUtils.ts 色感弱点靶向生成算法测试

~~~~~act
patch_file
src/utils/__tests__/colorUtils.test.ts
~~~~~
~~~~~typescript.old
    const hitVFail = checkColorHit('V', 55, questionV);
    expect(hitVFail.isHit).toBe(false);
  });
});
~~~~~
~~~~~typescript.new
    const hitVFail = checkColorHit('V', 55, questionV);
    expect(hitVFail.isHit).toBe(false);
  });

  it('generateColorQuestion with manual targeting - should generate targeted hues with higher probability', () => {
    // 锁定 0 号扇区 (0°-30°，中心 15°，抖动 ±15°)
    const options = {
      targetingMode: 'manual' as const,
      targetSectors: [0],
    };

    let targetedCount = 0;
    const totalRuns = 200;

    for (let i = 0; i < totalRuns; i++) {
      const q = generateColorQuestion('H', 5, options);
      if (q.targetH >= 0 && q.targetH <= 35) {
        targetedCount++;
      }
    }

    const ratio = targetedCount / totalRuns;
    expect(ratio).toBeGreaterThan(0.4);
  });
});
~~~~~

### 下一步建议
运行 `npm run test:coverage`，检查 `src/utils` 目录下核心算法与数据库模组的覆盖率统计指标。
