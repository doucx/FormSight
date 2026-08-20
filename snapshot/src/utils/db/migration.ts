import { openDB } from 'idb';
import { getCardById, resolveLegacyCardId } from '../../config/cards';
import type {
  FormSightDBSchema,
  TrainingDomain,
  UnifiedProfileData,
  UnifiedSessionData,
  UnifiedTrialRecord,
} from './schema';

const LEGACY_DB_NAME = 'StarHoppingDB';
const LEGACY_SETTINGS_KEY = 'star_hopping_user_settings';
const NEW_SETTINGS_KEY = 'formsight_user_settings';

/**
 * 迁移 LocalStorage 设置
 */
export function migrateLegacySettings(): void {
  try {
    const legacy = localStorage.getItem(LEGACY_SETTINGS_KEY);
    const current = localStorage.getItem(NEW_SETTINGS_KEY);
    if (legacy && !current) {
      localStorage.setItem(NEW_SETTINGS_KEY, legacy);
      localStorage.removeItem(LEGACY_SETTINGS_KEY);
    }
  } catch (e) {
    console.warn('LocalStorage 设置迁移失败:', e);
  }
}

/**
 * 检测并迁移旧版 IndexedDB (StarHoppingDB -> FormSightDB)
 */
export async function migrateLegacyDatabase(
  newDb: import('idb').IDBPDatabase<FormSightDBSchema>,
): Promise<void> {
  if (typeof indexedDB === 'undefined') return;

  try {
    // 检查是否存在旧数据库
    let hasLegacy = false;
    if (typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      hasLegacy = dbs.some((db) => db.name === LEGACY_DB_NAME);
    } else {
      // 兜底探测
      hasLegacy = true;
    }

    if (!hasLegacy) return;

    // 打开旧数据库读取数据
    const legacyDb = await openDB(LEGACY_DB_NAME, 4).catch(() => null);
    if (!legacyDb) return;

    const sessionStoreNames = legacyDb.objectStoreNames;
    if (!sessionStoreNames.contains('sessions') || !sessionStoreNames.contains('records')) {
      legacyDb.close();
      return;
    }

    const oldSessions = (await legacyDb.getAll('sessions')) as unknown as (UnifiedSessionData & {
      domain?: TrainingDomain;
    })[];
    const oldRecords = (await legacyDb.getAll('records')) as unknown as (UnifiedTrialRecord & {
      domain?: TrainingDomain;
    })[];
    const oldProfiles = sessionStoreNames.contains('user_profiles')
      ? ((await legacyDb.getAll('user_profiles')) as unknown as (UnifiedProfileData & {
          totalTrainedCards?: number;
        })[])
      : [];

    legacyDb.close();

    if (oldSessions.length === 0 && oldRecords.length === 0 && oldProfiles.length === 0) {
      indexedDB.deleteDatabase(LEGACY_DB_NAME);
      return;
    }

    // 写入新数据库
    const tx = newDb.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');

    for (const s of oldSessions) {
      const domain = s.domain || 'star';
      const cardId = s.cardId || resolveLegacyCardId(domain, s.mode);
      await tx.objectStore('sessions').put({
        ...s,
        domain,
        cardId,
      });
    }

    for (const r of oldRecords) {
      const domain = r.domain || 'star';
      const cardId = r.cardId || resolveLegacyCardId(domain, r.mode);
      await tx.objectStore('records').put({
        ...r,
        domain,
        cardId,
      });
    }

    for (const p of oldProfiles) {
      const cardId = p.cardId || resolveLegacyCardId(p.domain || 'star', p.mode);
      const card = getCardById(cardId);
      const domain = card ? card.legacyDomain : (p.domain || 'star');
      const totalTrials = p.totalTrials ?? p.totalTrainedCards ?? 0;
      await tx.objectStore('user_profiles').put({
        ...p,
        cardId,
        domain,
        totalTrials,
      });
    }

    await tx.done;

    // 迁移完毕，移除旧数据库
    indexedDB.deleteDatabase(LEGACY_DB_NAME);
    console.info('✅ FormSight: 旧版训练数据库已无缝平滑迁移至 FormSightDB。');
  } catch (e) {
    console.warn('FormSight 自动数据库迁移已跳过或遇到非阻断性异常:', e);
  }
}
