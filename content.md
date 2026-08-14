已为你编写纯函数与数据导入导出的测试套件计划。

## [WIP] test: 为纯函数与数据导入导出编写单元测试套件

### 用户需求
1. 为项目中的所有纯函数（几何计算、色彩转化、自适应阶梯算法、偏好加载等）编写单元测试。
2. 为数据表的存储以及全量 JSON 数据的导出与导入（`exportAllData` / `importAllData`）编写单元测试。

### 评论
为底层核心计算逻辑（如 `geometry.ts` 中的点运算、`colorUtils.ts` 中的 HSV 格式转化与环形角度误差判断、`adaptiveEngine.ts` 中的难度升级策略）和 `db.ts` 的 JSON 备份恢复功能提供测试保护，可大幅提升系统的可靠性，确保后续功能迭代时不发生隐蔽回归。

### 目标
1. 在 `package.json` 中引入 `fake-indexeddb`，以在 Node/Vitest 离线环境模拟完整的 IndexedDB。
2. 编写 `src/utils/__tests__/geometry.test.ts` 测试所有空间几何纯函数。
3. 编写 `src/utils/__tests__/colorUtils.test.ts` 测试色彩转换、容错计算与环形角距离判断纯函数。
4. 编写 `src/utils/__tests__/adaptiveEngine.test.ts` 测试自适应升降级引擎的 3U1D 阶梯模式与轮次评估模式。
5. 编写 `src/utils/__tests__/settings.test.ts` 测试用户配置持久化逻辑。
6. 编写 `src/utils/__tests__/db.test.ts` 测试 IndexedDB 的增删查改及全量 JSON 的导出（`exportAllData`）与恢复（`importAllData`）。

### 基本原理
- 纯函数（Pure Functions）不依赖外部状态，非常适合编写无侧效应的单元测试。
- 通过使用 `fake-indexeddb/auto` 自动模拟浏览器的 `indexedDB` 环境，可以让数据库测试和数据导入导出测试在 Vitest 下无缝运行，而无需真实浏览器 DOM 环境。

### 标签
#intent/tooling #flow/ready #priority/high #comp/tests #concept/executor #scope/dx #ai/instruct #task/domain/testing #task/object/unit-and-db-tests #task/action/implementation #task/state/continue

---

### Script

#### Acts 1: 在 package.json 添加 fake-indexeddb 开发依赖

~~~~~act
patch_file
package.json
~~~~~
~~~~~json.old
  "devDependencies": {
    "@biomejs/biome": "1.9.4",
    "@preact/preset-vite": "^2.8.2",
    "@vitest/coverage-v8": "^1.3.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.4",
    "vitest": "^1.3.1"
  }
~~~~~
~~~~~json.new
  "devDependencies": {
    "@biomejs/biome": "1.9.4",
    "@preact/preset-vite": "^2.8.2",
    "@vitest/coverage-v8": "^1.3.1",
    "autoprefixer": "^10.4.18",
    "fake-indexeddb": "^5.0.2",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.4",
    "vitest": "^1.3.1"
  }
~~~~~

#### Acts 2: 创建空间几何纯函数测试 (geometry.test.ts)

~~~~~act
write_file
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
  getDynamicDotRadius,
  rotatePoint,
} from '../geometry';

describe('geometry utils', () => {
  it('rotatePoint - should correctly rotate a point around center', () => {
    const center = { x: 0, y: 0 };
    const p = { x: 10, y: 0 };
    const rotated90 = rotatePoint(p, center, 90);
    expect(rotated90.x).toBeCloseTo(0);
    expect(rotated90.y).toBeCloseTo(10);

    const rotated180 = rotatePoint(p, center, 180);
    expect(rotated180.x).toBeCloseTo(-10);
    expect(rotated180.y).toBeCloseTo(0);
  });

  it('calcDistance - should calculate Euclidean distance correctly', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 3, y: 4 };
    expect(calcDistance(p1, p2)).toBe(5);
  });

  it('generatePolarGridPoints - should generate polar grid points', () => {
    const anchorA = { x: 250, y: 250 };
    const targetB = { x: 300, y: 250 };
    const points = generatePolarGridPoints(anchorA, targetB, 5, 3, 1, 1);
    expect(points.length).toBe(9); // 3x3
  });

  it('generateBipolarGridPoints - should generate bipolar grid points', () => {
    const anchorA = { x: 180, y: 250 };
    const anchorC = { x: 320, y: 250 };
    const targetB = { x: 250, y: 200 };
    const points = generateBipolarGridPoints(anchorA, anchorC, targetB, 5, 3, 1, 1);
    expect(points.length).toBe(9);
  });

  it('findNearestGridPoint - should find closest grid point and range check', () => {
    const grid = [
      { x: 10, y: 10 },
      { x: 50, y: 50 },
    ];
    const click = { x: 11, y: 11 };
    const res = findNearestGridPoint(click, grid);
    expect(res.nearestPoint).toEqual({ x: 10, y: 10 });
    expect(res.minDistance).toBeCloseTo(1.41, 1);
    expect(res.isWithinRange).toBe(true);
  });

  it('checkHit - should detect hit when click is very close to target', () => {
    const targetB = { x: 10, y: 10 };
    const grid = [
      { x: 10, y: 10 },
      { x: 30, y: 30 },
    ];
    const hitResult = checkHit({ x: 10.1, y: 10.1 }, targetB, grid);
    expect(hitResult.isHit).toBe(true);
    expect(hitResult.errorDistance).toBeLessThan(0.5);
  });

  it('getDynamicDotRadius - should dynamically calculate dot radius based on grid spacing', () => {
    const gridDense = [
      { x: 10, y: 10 },
      { x: 12, y: 10 },
    ];
    const gridSparse = [
      { x: 10, y: 10 },
      { x: 100, y: 100 },
    ];
    expect(getDynamicDotRadius(gridDense)).toBeLessThan(getDynamicDotRadius(gridSparse));
  });

  it('generateQuestion - should generate valid question data for single, double_h and double_r', () => {
    const qSingle = generateQuestion('single', 1);
    expect(qSingle.mode).toBe('single');
    expect(qSingle.anchorA).toBeDefined();
    expect(qSingle.targetB).toBeDefined();
    expect(qSingle.distractorPoints.length).toBeGreaterThan(0);

    const qDoubleH = generateQuestion('double_h', 10);
    expect(qDoubleH.mode).toBe('double_h');
    expect(qDoubleH.anchorC).toBeDefined();

    const qDoubleR = generateQuestion('double_r', 15);
    expect(qDoubleR.mode).toBe('double_r');
    expect(qDoubleR.rotationAngle).toBeDefined();
  });
});
~~~~~

#### Acts 3: 创建色彩计算纯函数测试 (colorUtils.test.ts)

~~~~~act
write_file
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

describe('colorUtils', () => {
  it('hsvToHex - should correctly convert HSV to HEX string', () => {
    expect(hsvToHex(0, 100, 100)).toBe('#FF0000'); // Red
    expect(hsvToHex(120, 100, 100)).toBe('#00FF00'); // Green
    expect(hsvToHex(240, 100, 100)).toBe('#0000FF'); // Blue
    expect(hsvToHex(0, 0, 100)).toBe('#FFFFFF'); // White
    expect(hsvToHex(0, 0, 0)).toBe('#000000'); // Black
  });

  it('getToleranceForLevel - should return decreasing tolerance as level increases', () => {
    const tolH1 = getToleranceForLevel('H', 1);
    const tolH35 = getToleranceForLevel('H', 35);
    expect(tolH1).toBe(30);
    expect(tolH35).toBe(4);
    expect(tolH1).toBeGreaterThan(tolH35);

    const tolV1 = getToleranceForLevel('V', 1);
    const tolV35 = getToleranceForLevel('V', 35);
    expect(tolV1).toBe(15);
    expect(tolV35).toBe(2);
  });

  it('generateColorQuestion - should generate valid color question for H, S, V modes', () => {
    const qH = generateColorQuestion('H', 5);
    expect(qH.mode).toBe('H');
    expect(qH.targetH).toBeGreaterThanOrEqual(0);
    expect(qH.targetH).toBeLessThan(360);

    const qS = generateColorQuestion('S', 10);
    expect(qS.mode).toBe('S');
    expect(qS.tolerance).toBeDefined();

    const qV = generateColorQuestion('V', 20);
    expect(qV.mode).toBe('V');
  });

  it('checkColorHit - should correctly calculate error and hit status for cyclic Hue and linear S/V', () => {
    const questionH = generateColorQuestion('H', 1); // tolerance = 30°
    questionH.targetH = 359;

    // Cyclic distance test: 359° and 1° -> 2° difference
    const hitCyclic = checkColorHit('H', 1, questionH);
    expect(hitCyclic.errorValue).toBe(2);
    expect(hitCyclic.isHit).toBe(true);

    // Linear V mode test
    const questionV = generateColorQuestion('V', 35); // tolerance = 2%
    questionV.targetV = 50;
    const hitVSuccess = checkColorHit('V', 51, questionV);
    expect(hitVSuccess.isHit).toBe(true);

    const hitVFail = checkColorHit('V', 55, questionV);
    expect(hitVFail.isHit).toBe(false);
  });
});
~~~~~

#### Acts 4: 创建自适应引擎策略测试 (adaptiveEngine.test.ts)

~~~~~act
write_file
src/utils/__tests__/adaptiveEngine.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import { AdaptiveEngine } from '../adaptiveEngine';

describe('AdaptiveEngine', () => {
  it('staircase mode - should increase level after 3 consecutive hits', () => {
    const engine = new AdaptiveEngine(5, true, 'staircase');
    expect(engine.recordResult(true).change).toBe('same');
    expect(engine.recordResult(true).change).toBe('same');
    const res3 = engine.recordResult(true);
    expect(res3.change).toBe('up');
    expect(res3.newLevel).toBe(6);
  });

  it('staircase mode - should decrease level immediately on miss', () => {
    const engine = new AdaptiveEngine(5, true, 'staircase');
    engine.recordResult(true);
    const resMiss = engine.recordResult(false);
    expect(resMiss.change).toBe('down');
    expect(resMiss.newLevel).toBe(4);
  });

  it('block mode - should evaluate and change level after full block', () => {
    const engine = new AdaptiveEngine(5, true, 'block', 0.8, 5); // 5 items/block
    for (let i = 0; i < 4; i++) {
      const res = engine.recordResult(true);
      expect(res.isBlockComplete).toBe(false);
      expect(res.change).toBe('same');
    }
    // 5th trial - 100% accuracy >= 80%
    const finalRes = engine.recordResult(true);
    expect(finalRes.isBlockComplete).toBe(true);
    expect(finalRes.change).toBe('up');
    expect(finalRes.newLevel).toBe(6);
  });

  it('setLevel - should constrain level within valid range (1..35)', () => {
    const engine = new AdaptiveEngine(5);
    engine.setLevel(100);
    expect(engine.getCurrentLevel()).toBe(35);

    engine.setLevel(-10);
    expect(engine.getCurrentLevel()).toBe(1);
  });

  it('getBlockProgress - should return correct progress in block mode', () => {
    const engine = new AdaptiveEngine(5, false, 'block', 0.8, 10);
    engine.recordResult(true);
    engine.recordResult(false);
    const progress = engine.getBlockProgress();
    expect(progress).toEqual({ current: 2, total: 10, hits: 1 });
  });
});
~~~~~

#### Acts 5: 创建配置与本地存储测试 (settings.test.ts)

~~~~~act
write_file
src/utils/__tests__/settings.test.ts
~~~~~
~~~~~typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../settings';

describe('settings utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadSettings - should return default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('saveSettings & loadSettings - should persist and retrieve custom settings', () => {
    const custom = { ...DEFAULT_SETTINGS, gridSize: 4, autoNext: false };
    saveSettings(custom);
    const loaded = loadSettings();
    expect(loaded.gridSize).toBe(4);
    expect(loaded.autoNext).toBe(false);
  });
});
~~~~~

#### Acts 6: 创建数据库与数据导入导出测试 (db.test.ts)

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

### 下一步建议
1. 运行 `npm install` 以更新 package.json 添加的 `fake-indexeddb`。
2. 运行 `npm run test` 执行所有的 5 个测试模块。
3. 运行 `npm run test:coverage` 查看覆盖率统计结果。
