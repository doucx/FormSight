import { resolveLegacyCardId } from '../../config/cards';
import { loadSettings, saveSettings } from '../settings';
import { DB_VERSION, type TrainingDomain, getDB } from './schema';

export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  const records = await db.getAll('records');
  const profiles = await db.getAll('user_profiles');
  const settings = loadSettings();

  const exportObject = {
    appName: 'FormSight',
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
        const domain = (s.domain || 'star') as TrainingDomain;
        const cardId = s.cardId || resolveLegacyCardId(domain, s.mode);
        await tx.objectStore('sessions').put({ ...s, domain, cardId });
      }
    }
    if (data.records) {
      for (const r of data.records) {
        const domain = (r.domain || 'star') as TrainingDomain;
        const cardId = r.cardId || resolveLegacyCardId(domain, r.mode);
        await tx.objectStore('records').put({ ...r, domain, cardId });
      }
    }
    if (data.profiles) {
      for (const p of data.profiles) {
        const domain = (p.domain || 'star') as TrainingDomain;
        const cardId = p.cardId || resolveLegacyCardId(domain, p.mode);
        const totalTrials = p.totalTrials ?? p.totalTrainedCards ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
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
