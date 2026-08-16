import { loadSettings, saveSettings } from '../settings';
import { DB_VERSION, getDB } from './schema';

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