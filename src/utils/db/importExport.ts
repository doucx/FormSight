import { registry } from '../../core/registry';
import {
  loadPlanStorageState,
  loadTrainingPlan,
  resetPlansToDefault,
  savePlanStorageState,
  saveTrainingPlan,
} from '../planStorage';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../settings';
import { DB_VERSION, type TrainingDomain, getDB } from './schema';

export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  const records = await db.getAll('records');
  const profiles = await db.getAll('user_profiles');
  const settings = loadSettings();
  const trainingPlan = loadTrainingPlan();
  const planStorageState = loadPlanStorageState();

  const exportObject = {
    appName: 'FormSight',
    version: DB_VERSION,
    exportAt: new Date().toISOString(),
    sessions,
    records,
    profiles,
    settings,
    trainingPlan,
    planStorageState,
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
        const cardId = s.cardId || s.mode;
        await tx.objectStore('sessions').put({ ...s, domain, cardId });
      }
    }
    if (data.records) {
      for (const r of data.records) {
        const domain = (r.domain || 'star') as TrainingDomain;
        const cardId = r.cardId || r.mode;
        await tx.objectStore('records').put({ ...r, domain, cardId });
      }
    }
    if (data.profiles) {
      for (const p of data.profiles) {
        const cardId = p.cardId || p.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : ((p.domain || 'star') as TrainingDomain);
        const totalTrials = p.totalTrials ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
      }
    }

    await tx.done;

    if (data.settings) {
      saveSettings(data.settings);
    }

    if (data.planStorageState) {
      savePlanStorageState(data.planStorageState);
    } else if (data.trainingPlan) {
      saveTrainingPlan(data.trainingPlan);
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

  resetPlansToDefault();
  saveSettings(DEFAULT_SETTINGS);
}
