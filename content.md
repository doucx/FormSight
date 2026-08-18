我现在为你生成重构实施计划，清理 `src/utils/db/queries.ts` 和 `index.ts` 中的历史兼容别名与冗余函数，统一整个项目的底层数据访问 API。

## [WIP] refactor(db): 清理数据层历史冗余别名与收敛统一查询 API

### 用户需求
移除 `queries.ts` 和 `db/index.ts` 中多余的历史领域专有包装函数（如 `getAllColorTrialRecords`、`getStarHoppingTrainingTimeMs`、`saveColorTrialRecord` 等），将所有消费方统一重构为使用通用的 `getTrialRecords(domain, mode?)`、`getTrainingTimeMs(domain?)` 等标准 API。

### 评论
随着之前 `GenericTrainingView` 和插件化架构的落地，各领域的存取逻辑已经完全泛型化。继续保留历史遗留的 10 余个领域专属 Wrapper 会造成 API 冗余、增加认知负担并在导出模块中留下死代码。彻底收敛后，数据层接口将保持极简与纯净。

### 目标
1. 精简 `src/utils/db/queries.ts`，仅保留核心通用 CRUD 及统计函数。
2. 精简 `src/utils/db/index.ts`，清理过期类型别名。
3. 更新 `src/app.tsx`、`src/components/GlobalStatsModal.tsx`、`src/components/WeaknessAnalyticsModal.tsx` 接入统一 API。

### 基本原理
所有训练记录在底层 IndexedDB 中均统一保存在 `records`、`sessions` 和 `user_profiles` 表，并使用 `domain` 与 `mode` 复合索引进行查询。直接使用通用查询函数能够完全覆盖业务需求，无需任何中间包装。

### 标签
#intent/refine #flow/ready #priority/medium #comp/engine #concept/state #scope/api #scope/dx #ai/instruct #task/domain/database #task/object/api-consolidation #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 重构 `src/utils/db/queries.ts` 消除历史别名

移除所有特定领域的包装函数（`getUserProfile`、`getAllColorTrialRecords` 等），保留纯净的统一查询 API。

~~~~~act
write_file
src/utils/db/queries.ts
~~~~~
~~~~~ts
import {
  type TrainingDomain,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
} from './schema';

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
  if (!ms || Number.isNaN(ms) || ms <= 0) {
    return '0天0小时0分钟';
  }
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return `${days}天${hours}小时${minutes}分钟`;
}
~~~~~

#### Acts 2: 整理 `src/utils/db/index.ts` 类型导出

~~~~~act
write_file
src/utils/db/index.ts
~~~~~
~~~~~ts
export * from './schema';
export * from './queries';
export * from './importExport';

// 类型别名导出
import type { UnifiedProfileData, UnifiedSessionData, UnifiedTrialRecord } from './schema';
export type SessionData = UnifiedSessionData;
export type UserProfileData = UnifiedProfileData;
export type TrialRecord = UnifiedTrialRecord;
~~~~~

#### Acts 3: 更新调用方接入统一 API

更新 `app.tsx`、`GlobalStatsModal.tsx` 和 `WeaknessAnalyticsModal.tsx`。

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx.old
import {
  type TrainingDomain,
  type UnifiedProfileData,
  getColorTrainingTimeMs,
  getProfilesByDomain,
  getStarHoppingTrainingTimeMs,
  getTrainingTimeMs,
} from './utils/db';
~~~~~
~~~~~tsx.new
import {
  type TrainingDomain,
  type UnifiedProfileData,
  getProfilesByDomain,
  getTrainingTimeMs,
} from './utils/db';
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx.old
  const refreshProfiles = useCallback(async () => {
    const starMs = await getStarHoppingTrainingTimeMs();
    const colorMs = await getColorTrainingTimeMs();
    const relMs = await getTrainingTimeMs('relative_color');
    const nsMs = await getTrainingTimeMs('negative_space');

    setStarHoppingTimeMs(starMs);
    setColorTimeMs(colorMs);
    setRelativeColorTimeMs(relMs);
    setNegativeSpaceTimeMs(nsMs);
    setSettings(loadSettings());
~~~~~
~~~~~tsx.new
  const refreshProfiles = useCallback(async () => {
    const starMs = await getTrainingTimeMs('star');
    const colorMs = await getTrainingTimeMs('color');
    const relMs = await getTrainingTimeMs('relative_color');
    const nsMs = await getTrainingTimeMs('negative_space');

    setStarHoppingTimeMs(starMs);
    setColorTimeMs(colorMs);
    setRelativeColorTimeMs(relMs);
    setNegativeSpaceTimeMs(nsMs);
    setSettings(loadSettings());
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~tsx.old
import { renderTrendChartCanvas } from '../utils/canvas/drawTrendChart';
import { getAllColorTrialRecords, getAllTrialRecords, getTrialRecords } from '../utils/db';
~~~~~
~~~~~tsx.new
import { renderTrendChartCanvas } from '../utils/canvas/drawTrendChart';
import { getTrialRecords } from '../utils/db';
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~tsx.old
    const loadData = async () => {
      setLoading(true);
      const starData = await getAllTrialRecords();
      const colorData = await getAllColorTrialRecords();
      const relData = await getTrialRecords('relative_color');
      const nsData = await getTrialRecords('negative_space');
~~~~~
~~~~~tsx.new
    const loadData = async () => {
      setLoading(true);
      const starData = await getTrialRecords('star');
      const colorData = await getTrialRecords('color');
      const relData = await getTrialRecords('relative_color');
      const nsData = await getTrialRecords('negative_space');
~~~~~

~~~~~act
patch_file
src/components/WeaknessAnalyticsModal.tsx
~~~~~
~~~~~tsx.old
import { type ColorTrialRecord, getAllColorTrialRecords, getAllTrialRecords } from '../utils/db';
~~~~~
~~~~~tsx.new
import { type UnifiedTrialRecord, getTrialRecords } from '../utils/db';
~~~~~

~~~~~act
patch_file
src/components/WeaknessAnalyticsModal.tsx
~~~~~
~~~~~tsx.old
  const [starRecords, setStarRecords] = useState<TrialRecord[]>([]);
  const [colorRecords, setColorRecords] = useState<ColorTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 数据加载
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      if (domain === 'star') {
        const data = await getAllTrialRecords(selectedStarMode === 'all' ? undefined : selectedStarMode);
        if (isMounted) {
          setStarRecords(data as unknown as TrialRecord[]);
          setLoading(false);
        }
      } else {
        const data = await getAllColorTrialRecords('H');
        if (isMounted) {
          setColorRecords(data);
          setLoading(false);
        }
      }
    };
~~~~~
~~~~~tsx.new
  const [starRecords, setStarRecords] = useState<TrialRecord[]>([]);
  const [colorRecords, setColorRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 数据加载
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      if (domain === 'star') {
        const data = await getTrialRecords('star', selectedStarMode === 'all' ? undefined : selectedStarMode);
        if (isMounted) {
          setStarRecords(data as unknown as TrialRecord[]);
          setLoading(false);
        }
      } else {
        const data = await getTrialRecords('color', 'H');
        if (isMounted) {
          setColorRecords(data);
          setLoading(false);
        }
      }
    };
~~~~~

### 下一步建议
1. 运行 `npm run check` 及 `npm run test` 确保所有代码通过 Biome 与 TypeScript 检查。
2. 整个架构精简重构计划已全部完成（通用视图插件化、弱点分析弹窗聚合、Schema 设置表单驱动、统一数据层 API），项目总代码行数已显著减少，架构更加清晰健壮。
