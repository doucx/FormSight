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
      expect(profile?.totalTrials).toBe(1);
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
