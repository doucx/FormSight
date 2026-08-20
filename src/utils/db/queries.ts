import { getCardById, getCardsByDomain, resolveLegacyCardId } from '../../config/cards';
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
  const cardId = record.cardId || resolveLegacyCardId(domain, record.mode);
  const normalizedRecord: UnifiedTrialRecord = { ...record, domain, cardId };
  await db.put('records', normalizedRecord);
  await updateProfile(cardId, domain, record.mode, record.isHit, record.difficultyLevel);
}

export async function saveSession(session: UnifiedSessionData): Promise<void> {
  const db = await getDB();
  const domain = session.domain || 'star';
  const cardId = session.cardId || resolveLegacyCardId(domain, session.mode);
  await db.put('sessions', { ...session, domain, cardId });
}

export async function getProfile(cardId: string): Promise<UnifiedProfileData | null>;
export async function getProfile(
  domain: TrainingDomain,
  mode: string,
): Promise<UnifiedProfileData | null>;
export async function getProfile(
  first: string | TrainingDomain,
  second?: string,
): Promise<UnifiedProfileData | null> {
  const db = await getDB();
  const cardId = second ? resolveLegacyCardId(first as TrainingDomain, second) : first;
  const profile = await db.get('user_profiles', cardId);
  return profile || null;
}

export async function getProfilesByDomain(domain: TrainingDomain): Promise<UnifiedProfileData[]> {
  const db = await getDB();
  const domainCards = getCardsByDomain(domain);
  const indexProfiles = await db.getAllFromIndex('user_profiles', 'by-domain', domain);
  const map = new Map<string, UnifiedProfileData>();

  for (const p of indexProfiles) {
    map.set(p.cardId, p);
  }

  // 兜底补齐因历史 domain 迁移未匹配索引的 Profile 并自愈写入
  for (const card of domainCards) {
    if (!map.has(card.id)) {
      const p = await db.get('user_profiles', card.id);
      if (p) {
        if (p.domain !== domain) {
          p.domain = domain;
          await db.put('user_profiles', p);
        }
        map.set(p.cardId, p);
      }
    }
  }

  return Array.from(map.values());
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

export async function getTrialRecordsByCard(cardId: string): Promise<UnifiedTrialRecord[]> {
  const db = await getDB();
  const rawRecords = await db.getAllFromIndex('records', 'by-card', cardId);
  return rawRecords.map((r) => ({
    ...r,
    ...(r.details || {}),
  }));
}

async function updateProfile(
  cardId: string,
  domain: TrainingDomain,
  mode: string,
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
  const db = await getDB();
  const card = getCardById(cardId);
  const canonicalDomain = card ? card.legacyDomain : domain;
  const existing = await db.get('user_profiles', cardId);

  if (!existing) {
    const newProfile: UnifiedProfileData = {
      cardId,
      domain: canonicalDomain,
      mode,
      currentLevel,
      bestLevel: currentLevel,
      totalTrials: 1,
      totalHits: isHit ? 1 : 0,
      updatedAt: Date.now(),
    };
    await db.put('user_profiles', newProfile);
  } else {
    existing.domain = canonicalDomain;
    existing.mode = mode;
    existing.totalTrials += 1;
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
