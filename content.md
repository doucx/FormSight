好的，我们现在开始修复所有 TypeScript 类型推导和 TSX 中的 JSX 表达式解析错误。

下面为您生成 `[WIP]` 修复计划：

## [WIP] fix(build): 修复相对色感与 DB 重构后的 TS 类型与 JSX 编译错误

### 错误分析

1. **JSX 解析错误 (`Uncaught ReferenceError: v is not defined`)**：
   - 发生在 `Home.tsx` 和 `RelativeColorDashboard.tsx` 的纯文本描述中使用了 `$\vec{v}_{AB}$`，被 Preact/JSX 语法解析器误将 `{v}` 和 `{AB}` 识别为 JavaScript 变量求值表达式。
2. **`Home.tsx` 参数未解构**：
   - `HomeProps` 接口虽然新增了 `relativeColorTimeMs` 属性，但在 `Home` 函数的参数解构列表中漏写了该字段。
3. **`db.ts` 别名兼容层与类型约束**：
   - DB 重构为通用实体后，`getAllTrialRecords` 和 `getAllColorTrialRecords` 返回的是包含 `details` 属性的记录，旧视图（如 `AnalyticsModal` 和 `ColorAnalyticsModal`）需要访问摊平后的属性（如 `errorValue`, `targetHSV`, `userClick` 等）。
   - Biome 检查报出了 `noExplicitAny` 的警告。
4. **`ColorDashboard.tsx` 与 `Dashboard.tsx` 动态索引类型**：
   - `r.mode` 从 IndexedDB 取出时类型为 `string`，直接作为 `stats[r.mode]` 索引报错 TS7053。

### 用户需求
修复 `npm run build` 和 `npm run checkf` 报告的所有构建错误与 linter 警告，确保项目零 Error、零 Warning 通过构建与类型检查。

### 评论
这类语法与类型报错属于重大重构后的典型边界问题。通过在 TSX 中将 LaTeX 表达式转义/纯文本化，并在数据库兼容层中自动展开 `details` 对象，既能保持简洁漂亮的代码形态，又能完美向下兼容所有分析图表组件。

### 目标
1. **清理 JSX 文本**：替换 `Home.tsx` 与 `RelativeColorDashboard.tsx` 中的 LaTeX 语法为合法纯文本 `v_AB`，并在 `Home` 参数列表中解构 `relativeColorTimeMs`。
2. **优化 `db.ts` 兼容层与类型定义**：
   - 为 `UnifiedTrialRecord` 增加属性索引扩展，并在 `getAllTrialRecords` / `getAllColorTrialRecords` 中自动摊平 `details` 字段。
   - 替换 `db.ts` 中的 `any` 类型为严格类型，消除 Biome 检查警告。
3. **收紧视图与测试组件中的类型断言**：
   - 修复 `ColorDashboard.tsx` 与 `Dashboard.tsx` 中的模式索引。
   - 清理 `src/app.tsx` 中未使用的 `getProfilesByDomain` 导入。

### 基本原理
在 TSX 文本中使用 `{}` 会被 JSX 编译器看作求值表达式，因此复杂的 LaTeX 必须通过 HTML 实体或纯文本表示。在 DB API 兼容层使用 JavaScript 展开运算符 `{ ...r, ...(r.details || {}) }`，可以使旧分析组件（如 `AnalyticsModal`）不需侵入修改即可无缝兼容全新的通用 DB 数据表结构。

### 标签
#intent/fix #flow/ready #priority/critical #comp/ui #comp/engine #concept/parser #scope/core #ai/instruct #task/domain/build #task/object/typescript-jsx-fix #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `Home.tsx` 与 `RelativeColorDashboard.tsx` 中的 JSX 表达式与参数解构

修改 `src/views/Home.tsx` 与 `src/views/RelativeColorDashboard.tsx`。

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript
export function Home({
  totalTimeMs,
  starHoppingTimeMs,
  colorTimeMs,
  onNavigate,
  onOpenGlobalSettings,
  onOpenGlobalStats,
}: HomeProps) {
~~~~~
~~~~~typescript
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

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript
              <p className="text-xs text-slate-500 leading-relaxed">
                基于 OKLab 感知均匀色彩空间，通过固有色与环境光的推移矢量 ($\vec{v}_{AB}
                $)，建立客观光影下相对色彩推移与对比关系的硬核艺术敏锐度。
              </p>
~~~~~
~~~~~typescript
              <p className="text-xs text-slate-500 leading-relaxed">
                基于 OKLab 感知均匀色彩空间，通过固有色与环境光的推移矢量 (Vector v_AB)，建立客观光影下相对色彩推移与对比关系的硬核艺术敏锐度。
              </p>
~~~~~

~~~~~act
patch_file
src/views/RelativeColorDashboard.tsx
~~~~~
~~~~~typescript
            <p className="text-xs text-gray-500 mb-6 leading-relaxed h-10">
              保持固有色推移矢量 $\vec{v}_{AB}$ 在全场施加统一推移，建立光影相对偏转直觉。
            </p>
~~~~~
~~~~~typescript
            <p className="text-xs text-gray-500 mb-6 leading-relaxed h-10">
              保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉。
            </p>
~~~~~

#### Acts 2: 重构 `src/utils/db.ts` 消除 `any` 并完善兼容数据展开

修改 `src/utils/db.ts`，彻底消除 `any` 警告，并自动在兼容方法中平铺 `details`。

~~~~~act
write_file
src/utils/db.ts
~~~~~
~~~~~typescript
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import type { TrainingMode } from '../types';
import { loadSettings, saveSettings } from './settings';

// ==========================================
// 1. 统一数据模型类型定义
// ==========================================

export type TrainingDomain = 'star' | 'color' | 'relative_color';

export interface UnifiedSessionData {
  id: string;
  domain?: TrainingDomain;
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
  domain?: TrainingDomain;
  mode: string;
  timestamp: number;
  difficultyLevel: number;
  isHit: boolean;
  responseTimeMs: number;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

// 兼容别名导出
export type SessionData = UnifiedSessionData;
export type UserProfileData = UnifiedProfileData;
export type ColorSessionData = UnifiedSessionData;
export type ColorTrialRecord = UnifiedTrialRecord;
export type ColorProfileData = UnifiedProfileData;

// ==========================================
// 2. IDB Schema 统一表定义
// ==========================================

interface FormSightDBSchema extends DBSchema {
  sessions: {
    key: string;
    value: UnifiedSessionData;
    indexes: {
      'by-domain': TrainingDomain;
      'by-domain-mode': [TrainingDomain, string];
    };
  };
  records: {
    key: string;
    value: UnifiedTrialRecord;
    indexes: {
      'by-session': string;
      'by-domain': TrainingDomain;
      'by-domain-mode': [TrainingDomain, string];
      'by-mode': string;
    };
  };
  user_profiles: {
    key: string;
    value: UnifiedProfileData;
    indexes: {
      'by-domain': TrainingDomain;
    };
  };
}

export interface UnifiedProfileData {
  key: string;
  domain: TrainingDomain;
  mode: string;
  currentLevel: number;
  bestLevel: number;
  totalTrainedCards: number;
  totalHits: number;
  updatedAt: number;
}

const DB_NAME = 'StarHoppingDB';
const DB_VERSION = 4; // v4: 通用实体架构，合并所有领域表为通用 3 表结构

let dbPromise: Promise<IDBPDatabase<FormSightDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<FormSightDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<FormSightDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        let sessionsStore: ReturnType<typeof db.createObjectStore>;
        let recordsStore: ReturnType<typeof db.createObjectStore>;
        let profilesStore: ReturnType<typeof db.createObjectStore>;

        if (!db.objectStoreNames.contains('sessions')) {
          sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
        } else {
          sessionsStore = transaction.objectStore('sessions');
        }

        if (!db.objectStoreNames.contains('records')) {
          recordsStore = db.createObjectStore('records', { keyPath: 'id' });
        } else {
          recordsStore = transaction.objectStore('records');
        }

        if (!db.objectStoreNames.contains('user_profiles')) {
          profilesStore = db.createObjectStore('user_profiles', { keyPath: 'key' });
        } else {
          profilesStore = transaction.objectStore('user_profiles');
        }

        if (!sessionsStore.indexNames.contains('by-domain')) {
          sessionsStore.createIndex('by-domain', 'domain');
        }
        if (!sessionsStore.indexNames.contains('by-domain-mode')) {
          sessionsStore.createIndex('by-domain-mode', ['domain', 'mode']);
        }

        if (!recordsStore.indexNames.contains('by-session')) {
          recordsStore.createIndex('by-session', 'sessionId');
        }
        if (!recordsStore.indexNames.contains('by-domain')) {
          recordsStore.createIndex('by-domain', 'domain');
        }
        if (!recordsStore.indexNames.contains('by-domain-mode')) {
          recordsStore.createIndex('by-domain-mode', ['domain', 'mode']);
        }
        if (!recordsStore.indexNames.contains('by-mode')) {
          recordsStore.createIndex('by-mode', 'mode');
        }

        if (!profilesStore.indexNames.contains('by-domain')) {
          profilesStore.createIndex('by-domain', 'domain');
        }

        // v4 迁移逻辑：平滑无损迁移老版本数据并清理旧专属表
        if (oldVersion < 4) {
          const oldStores = Array.from(db.objectStoreNames);
          if (oldStores.includes('color_sessions' as never)) {
            const colorSessionsStore = transaction.objectStore('color_sessions' as never);
            colorSessionsStore.getAll().then((oldCSessions: UnifiedSessionData[]) => {
              for (const cs of oldCSessions) {
                sessionsStore.put({
                  id: cs.id,
                  domain: 'color',
                  mode: cs.mode,
                  type: cs.type,
                  startTimestamp: cs.startTimestamp,
                  endTimestamp: cs.endTimestamp,
                  totalTrials: cs.totalTrials,
                  hitTrials: cs.hitTrials,
                  startLevel: cs.startLevel,
                  endLevel: cs.endLevel,
                });
              }
            });
            db.deleteObjectStore('color_sessions' as never);
          }

          if (oldStores.includes('color_records' as never)) {
            const colorRecordsStore = transaction.objectStore('color_records' as never);
            colorRecordsStore.getAll().then((oldCRecords: Record<string, unknown>[]) => {
              for (const cr of oldCRecords) {
                recordsStore.put({
                  id: cr.id as string,
                  sessionId: cr.sessionId as string,
                  domain: 'color',
                  mode: cr.mode as string,
                  timestamp: cr.timestamp as number,
                  difficultyLevel: cr.difficultyLevel as number,
                  isHit: cr.isHit as boolean,
                  responseTimeMs: cr.responseTimeMs as number,
                  details: {
                    targetHSV: cr.targetHSV,
                    userHSV: cr.userHSV,
                    errorValue: cr.errorValue,
                  },
                });
              }
            });
            db.deleteObjectStore('color_records' as never);
          }

          if (oldStores.includes('color_profiles' as never)) {
            const colorProfilesStore = transaction.objectStore('color_profiles' as never);
            colorProfilesStore.getAll().then((oldCProfiles: Record<string, unknown>[]) => {
              for (const cp of oldCProfiles) {
                profilesStore.put({
                  key: `color:${cp.mode}`,
                  domain: 'color',
                  mode: cp.mode as string,
                  currentLevel: cp.currentLevel as number,
                  bestLevel: cp.bestLevel as number,
                  totalTrainedCards: cp.totalTrainedCards as number,
                  totalHits: cp.totalHits as number,
                  updatedAt: cp.updatedAt as number,
                });
              }
            });
            db.deleteObjectStore('color_profiles' as never);
          }
        }
      },
    });
  }
  return dbPromise;
}

// ==========================================
// 3. 泛型通用 API 接口
// ==========================================

export async function saveTrialRecord(record: UnifiedTrialRecord): Promise<void> {
  const db = await getDB();
  const domain = record.domain || 'star';
  const normalizedRecord: UnifiedTrialRecord = { ...record, domain };
  await db.put('records', normalizedRecord);
  await updateProfile(domain, record.mode, record.isHit, record.difficultyLevel);
}

export async function saveSession(session: UnifiedSessionData): Promise<void> {
  const db = await getDB();
  const domain = session.domain || 'star';
  await db.put('sessions', { ...session, domain });
}

export async function getProfile(
  domain: TrainingDomain,
  mode: string,
): Promise<UnifiedProfileData | null> {
  const db = await getDB();
  const profile = await db.get('user_profiles', `${domain}:${mode}`);
  return profile || null;
}

export async function getProfilesByDomain(domain: TrainingDomain): Promise<UnifiedProfileData[]> {
  const db = await getDB();
  return await db.getAllFromIndex('user_profiles', 'by-domain', domain);
}

export async function getTrialRecords(
  domain?: TrainingDomain,
  mode?: string,
): Promise<UnifiedTrialRecord[]> {
  const db = await getDB();
  let rawRecords: UnifiedTrialRecord[] = [];
  if (domain && mode) {
    rawRecords = await db.getAllFromIndex('records', 'by-domain-mode', [domain, mode]);
  } else if (domain) {
    rawRecords = await db.getAllFromIndex('records', 'by-domain', domain);
  } else {
    rawRecords = await db.getAll('records');
  }

  return rawRecords.map((r) => ({
    ...r,
    ...(r.details || {}),
  }));
}

async function updateProfile(
  domain: TrainingDomain,
  mode: string,
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
  const db = await getDB();
  const key = `${domain}:${mode}`;
  const existing = await db.get('user_profiles', key);

  if (!existing) {
    const newProfile: UnifiedProfileData = {
      key,
      domain,
      mode,
      currentLevel,
      bestLevel: currentLevel,
      totalTrainedCards: 1,
      totalHits: isHit ? 1 : 0,
      updatedAt: Date.now(),
    };
    await db.put('user_profiles', newProfile);
  } else {
    existing.totalTrainedCards += 1;
    if (isHit) existing.totalHits += 1;
    existing.currentLevel = currentLevel;
    if (currentLevel > existing.bestLevel) {
      existing.bestLevel = currentLevel;
    }
    existing.updatedAt = Date.now();
    await db.put('user_profiles', existing);
  }
}

// ==========================================
// 4. 通用导入 / 导出与统计 API
// ==========================================

export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  const records = await db.getAll('records');
  const profiles = await db.getAll('user_profiles');
  const settings = loadSettings();

  const exportObject = {
    version: DB_VERSION,
    exportAt: new Date().toISOString(),
    sessions,
    records,
    profiles,
    settings,
  };

  return JSON.stringify(exportObject, null, 2);
}

export async function importAllData(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    const db = await getDB();
    const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');

    if (data.sessions) {
      for (const s of data.sessions) {
        const domain = s.domain || 'star';
        await tx.objectStore('sessions').put({ ...s, domain });
      }
    }
    if (data.records) {
      for (const r of data.records) {
        const domain = r.domain || 'star';
        await tx.objectStore('records').put({ ...r, domain });
      }
    }
    if (data.profiles) {
      for (const p of data.profiles) {
        const domain = p.domain || 'star';
        const key = p.key || `${domain}:${p.mode}`;
        await tx.objectStore('user_profiles').put({ ...p, key, domain });
      }
    }

    // 兼容导入旧格式 JSON 文件中的 color 数据
    if (data.color_sessions) {
      for (const cs of data.color_sessions) {
        await tx.objectStore('sessions').put({ ...cs, domain: 'color' });
      }
    }
    if (data.color_records) {
      for (const cr of data.color_records) {
        await tx.objectStore('records').put({
          id: cr.id,
          sessionId: cr.sessionId,
          domain: 'color',
          mode: cr.mode,
          timestamp: cr.timestamp,
          difficultyLevel: cr.difficultyLevel,
          isHit: cr.isHit,
          responseTimeMs: cr.responseTimeMs,
          details: {
            targetHSV: cr.targetHSV,
            userHSV: cr.userHSV,
            errorValue: cr.errorValue,
          },
        });
      }
    }
    if (data.color_profiles) {
      for (const cp of data.color_profiles) {
        await tx.objectStore('user_profiles').put({
          key: `color:${cp.mode}`,
          domain: 'color',
          mode: cp.mode,
          currentLevel: cp.currentLevel,
          bestLevel: cp.bestLevel,
          totalTrainedCards: cp.totalTrainedCards,
          totalHits: cp.totalHits,
          updatedAt: cp.updatedAt,
        });
      }
    }

    await tx.done;

    if (data.settings) {
      saveSettings(data.settings);
    }

    return true;
  } catch (err) {
    console.error('导入数据失败:', err);
    return false;
  }
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');
  await tx.objectStore('sessions').clear();
  await tx.objectStore('records').clear();
  await tx.objectStore('user_profiles').clear();
  await tx.done;
}

export async function getTrainingTimeMs(domain?: TrainingDomain): Promise<number> {
  const db = await getDB();
  const sessions = domain
    ? await db.getAllFromIndex('sessions', 'by-domain', domain)
    : await db.getAll('sessions');

  let totalMs = 0;
  for (const s of sessions) {
    if (s.endTimestamp && s.endTimestamp > s.startTimestamp) {
      totalMs += s.endTimestamp - s.startTimestamp;
    }
  }
  return totalMs;
}

export function formatTotalTime(ms: number): string {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return `${days}天${hours}小时${minutes}分钟`;
}

// ==========================================
// 5. 兼容层别名函数 (对既有页面逻辑完全透明)
// ==========================================

export async function getUserProfile(mode: TrainingMode): Promise<UnifiedProfileData | null> {
  return await getProfile('star', mode);
}

export async function getAllUserProfiles(): Promise<
  Record<TrainingMode, UnifiedProfileData | null>
> {
  const profiles = await getProfilesByDomain('star');
  const result: Record<TrainingMode, UnifiedProfileData | null> = {
    single: null,
    double_h: null,
    double_r: null,
  };
  for (const p of profiles) {
    if (p.mode in result) {
      result[p.mode as TrainingMode] = p;
    }
  }
  return result;
}

export async function getAllTrialRecords(mode?: TrainingMode): Promise<UnifiedTrialRecord[]> {
  return await getTrialRecords('star', mode);
}

export async function saveColorTrialRecord(record: UnifiedTrialRecord): Promise<void> {
  return await saveTrialRecord({
    ...record,
    domain: 'color',
  });
}

export async function saveColorSession(session: UnifiedSessionData): Promise<void> {
  return await saveSession({
    ...session,
    domain: 'color',
  });
}

export async function getAllColorProfiles(): Promise<
  Record<'H' | 'S' | 'V' | 'ALL', UnifiedProfileData | null>
> {
  const profiles = await getProfilesByDomain('color');
  const result: Record<'H' | 'S' | 'V' | 'ALL', UnifiedProfileData | null> = {
    H: null,
    S: null,
    V: null,
    ALL: null,
  };
  for (const p of profiles) {
    if (p.mode in result) {
      result[p.mode as 'H' | 'S' | 'V' | 'ALL'] = p;
    }
  }
  return result;
}

export async function getAllColorTrialRecords(
  mode?: 'H' | 'S' | 'V' | 'ALL',
): Promise<UnifiedTrialRecord[]> {
  return await getTrialRecords('color', mode);
}

export async function getStarHoppingTrainingTimeMs(): Promise<number> {
  return await getTrainingTimeMs('star');
}

export async function getColorTrainingTimeMs(): Promise<number> {
  return await getTrainingTimeMs('color');
}

export async function getTotalTrainingTimeMs(): Promise<number> {
  return await getTrainingTimeMs();
}
~~~~~

#### Acts 3: 修复 `ColorDashboard.tsx` 与 `Dashboard.tsx` 动态索引与 `app.tsx` 导入

修改 `src/views/ColorDashboard.tsx`、`src/views/Dashboard.tsx` 和 `src/app.tsx`。

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript
      for (const r of records) {
        if (r.timestamp >= startOfToday && stats[r.mode]) {
          stats[r.mode].count += 1;
          stats[r.mode].timeMs += r.responseTimeMs || 0;
        }
      }
~~~~~
~~~~~typescript
      for (const r of records) {
        const modeKey = r.mode as ColorMode;
        if (r.timestamp >= startOfToday && stats[modeKey]) {
          stats[modeKey].count += 1;
          stats[modeKey].timeMs += r.responseTimeMs || 0;
        }
      }
~~~~~

~~~~~act
patch_file
src/views/Dashboard.tsx
~~~~~
~~~~~typescript
      for (const r of records) {
        if (r.timestamp >= startOfToday && stats[r.mode]) {
          stats[r.mode].count += 1;
          stats[r.mode].timeMs += r.responseTimeMs || 0;
        }
      }
~~~~~
~~~~~typescript
      for (const r of records) {
        const modeKey = r.mode as TrainingMode;
        if (r.timestamp >= startOfToday && stats[modeKey]) {
          stats[modeKey].count += 1;
          stats[modeKey].timeMs += r.responseTimeMs || 0;
        }
      }
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
import { getProfilesByDomain, getTrainingTimeMs } from './utils/db';
~~~~~
~~~~~typescript
import { getTrainingTimeMs } from './utils/db';
~~~~~

#### Acts 4: 修复 `TrainingView.tsx` 与 `ColorTrainingView.tsx` 存盘对象的 `domain` 类型定义

修改 `src/views/TrainingView.tsx` 与 `src/views/ColorTrainingView.tsx`。

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript
    // 1. 存数据库原子记录
    const record: TrialRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: sessionIdRef.current,
      mode,
      timestamp: Date.now(),
      difficultyLevel: question.difficultyLevel,
      anchorA: [question.anchorA.x, question.anchorA.y],
      anchorC: question.anchorC ? [question.anchorC.x, question.anchorC.y] : undefined,
      targetB: [question.targetB.x, question.targetB.y],
      userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
      angleDegree: question.angleDegree,
      distanceRatio: question.distanceRatio,
      isHit: hitResult.isHit,
      errorPixelDistance: hitResult.errorDistance,
      responseTimeMs,
    };
    await saveTrialRecord(record);
~~~~~
~~~~~typescript
    // 1. 存数据库原子记录
    await saveTrialRecord({
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: sessionIdRef.current,
      domain: 'star',
      mode,
      timestamp: Date.now(),
      difficultyLevel: question.difficultyLevel,
      isHit: hitResult.isHit,
      responseTimeMs,
      details: {
        anchorA: [question.anchorA.x, question.anchorA.y],
        anchorC: question.anchorC ? [question.anchorC.x, question.anchorC.y] : undefined,
        targetB: [question.targetB.x, question.targetB.y],
        userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
        angleDegree: question.angleDegree,
        distanceRatio: question.distanceRatio,
        errorPixelDistance: hitResult.errorDistance,
      },
    });
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript
  const saveCurrentSession = async (trials = totalTrials, hits = hitTrials, ended = false) => {
    const sessionData: SessionData = {
      id: sessionIdRef.current,
      mode,
      type: sessionType,
      startTimestamp: startTimeRef.current,
      endTimestamp: ended ? Date.now() : undefined,
      totalTrials: trials,
      hitTrials: hits,
      startLevel: initialLevel,
      endLevel: adaptiveEngineRef.current.getCurrentLevel(),
    };
    await saveSession(sessionData);
  };
~~~~~
~~~~~typescript
  const saveCurrentSession = async (trials = totalTrials, hits = hitTrials, ended = false) => {
    const sessionData: SessionData = {
      id: sessionIdRef.current,
      domain: 'star',
      mode,
      type: sessionType,
      startTimestamp: startTimeRef.current,
      endTimestamp: ended ? Date.now() : undefined,
      totalTrials: trials,
      hitTrials: hits,
      startLevel: initialLevel,
      endLevel: adaptiveEngineRef.current.getCurrentLevel(),
    };
    await saveSession(sessionData);
  };
~~~~~

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript
    // 数据库存盘
    const record: ColorTrialRecord = {
      id: `crec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: sessionIdRef.current,
      mode,
      timestamp: Date.now(),
      difficultyLevel: question.difficultyLevel,
      targetHSV: [question.targetH, question.targetS, question.targetV],
      userHSV: computedUserHSV,
      isHit: hitResult.isHit,
      errorValue: hitResult.errorValue,
      responseTimeMs,
    };
    await saveColorTrialRecord(record);
~~~~~
~~~~~typescript
    // 数据库存盘
    await saveColorTrialRecord({
      id: `crec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: sessionIdRef.current,
      domain: 'color',
      mode,
      timestamp: Date.now(),
      difficultyLevel: question.difficultyLevel,
      isHit: hitResult.isHit,
      responseTimeMs,
      details: {
        targetHSV: [question.targetH, question.targetS, question.targetV],
        userHSV: computedUserHSV,
        errorValue: hitResult.errorValue,
      },
    });
~~~~~

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript
  const saveCurrentSession = async (trials = totalTrials, hits = hitTrials, ended = false) => {
    const sessionData: ColorSessionData = {
      id: sessionIdRef.current,
      mode,
      type: sessionType,
      startTimestamp: startTimeRef.current,
      endTimestamp: ended ? Date.now() : undefined,
      totalTrials: trials,
      hitTrials: hits,
      startLevel: initialLevel,
      endLevel: adaptiveEngineRef.current.getCurrentLevel(),
    };
    await saveColorSession(sessionData);
  };
~~~~~
~~~~~typescript
  const saveCurrentSession = async (trials = totalTrials, hits = hitTrials, ended = false) => {
    const sessionData: ColorSessionData = {
      id: sessionIdRef.current,
      domain: 'color',
      mode,
      type: sessionType,
      startTimestamp: startTimeRef.current,
      endTimestamp: ended ? Date.now() : undefined,
      totalTrials: trials,
      hitTrials: hits,
      startLevel: initialLevel,
      endLevel: adaptiveEngineRef.current.getCurrentLevel(),
    };
    await saveColorSession(sessionData);
  };
~~~~~

#### Acts 5: 更新数据库单元测试中的测试用例断言

修改 `src/utils/__tests__/db.test.ts` 匹配最新的 `UnifiedSessionData` 接口。

~~~~~act
patch_file
src/utils/__tests__/db.test.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
  it('training time calculation - should aggregate valid session durations', async () => {
    await saveSession({
      id: 's1',
      domain: 'star',
      mode: 'single',
      type: 'training',
      startTimestamp: 1000,
      endTimestamp: 61000, // +60s
      totalTrials: 5,
      hitTrials: 4,
      startLevel: 5,
      endLevel: 6,
    });
~~~~~

### 下一步建议
- **进行自动化验证**: 运行 `npm run checkf` 和 `npm run build` 确保类型检查与产物构建 100% 成功。
- **单元测试套件**: 运行 `npm run test` 确保所有 6 个单元测试文件全部绿灯通过！
