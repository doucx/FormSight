import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllData,
  exportAllData,
  formatTotalTime,
  getAllProfiles,
  getProfile,
  getTodaySummaries,
  getTrainingTimeMs,
  getTrialRecordsByCard,
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
    it('should save trial record and automatically update user profile and daily summaries', async () => {
      const record: UnifiedTrialRecord = {
        id: 'rec_1',
        sessionId: 'sess_1',
        cardId: 'star_single',
        domain: 'star',
        mode: 'single',
        timestamp: Date.now(),
        difficultyLevel: 5,
        isHit: true,
        responseTimeMs: 800,
        details: { angleDegree: 45 },
      };

      await saveTrialRecord(record);

      const records = await getTrialRecordsByCard('star_single');
      expect(records.length).toBe(1);
      expect(records[0].id).toBe('rec_1');
      expect(records[0].isHit).toBe(true);
      expect((records[0] as Record<string, unknown>).angleDegree).toBe(45);

      const profile = await getProfile('star_single');
      expect(profile).not.toBeNull();
      expect(profile?.totalTrials).toBe(1);
      expect(profile?.totalHits).toBe(1);
      expect(profile?.currentLevel).toBe(5);
      expect(profile?.bestLevel).toBe(5);

      const todaySummaries = await getTodaySummaries();
      expect(todaySummaries.length).toBe(1);
      expect(todaySummaries[0].cardId).toBe('star_single');
      expect(todaySummaries[0].totalCount).toBe(1);
    });

    it('should filter records by card correctly', async () => {
      await saveTrialRecord({
        id: 'rec_star',
        sessionId: 'sess_star',
        cardId: 'star_single',
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
        cardId: 'color_hue',
        domain: 'color',
        mode: 'H',
        timestamp: 2000,
        difficultyLevel: 4,
        isHit: false,
        responseTimeMs: 600,
      });

      const starRecords = await getTrialRecordsByCard('star_single');
      expect(starRecords.length).toBe(1);
      expect(starRecords[0].id).toBe('rec_star');

      const colorRecords = await getTrialRecordsByCard('color_hue');
      expect(colorRecords.length).toBe(1);
      expect(colorRecords[0].id).toBe('rec_color');
    });

    it('should retrieve all profiles correctly', async () => {
      await saveTrialRecord({
        id: 'rec_h',
        sessionId: 's1',
        cardId: 'color_hue',
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
        cardId: 'color_val',
        domain: 'color',
        mode: 'V',
        timestamp: 1000,
        difficultyLevel: 6,
        isHit: true,
        responseTimeMs: 400,
      });

      const profiles = await getAllProfiles();
      expect(profiles.length).toBe(2);
      const cardIds = profiles.map((p) => p.cardId).sort();
      expect(cardIds).toEqual(['color_hue', 'color_val']);
    });
  });

  describe('Sessions and Time Aggregation', () => {
    it('should save session and calculate training time via daily summaries', async () => {
      const session1: UnifiedSessionData = {
        id: 'sess_1',
        cardId: 'star_single',
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

      await saveSession(session1);

      await saveTrialRecord({
        id: 'rec_t1',
        sessionId: 'sess_1',
        cardId: 'star_single',
        domain: 'star',
        mode: 'single',
        timestamp: 15000,
        difficultyLevel: 5,
        isHit: true,
        responseTimeMs: 600,
      });

      await saveTrialRecord({
        id: 'rec_t2',
        sessionId: 'sess_1',
        cardId: 'color_hue',
        domain: 'color',
        mode: 'H',
        timestamp: 25000,
        difficultyLevel: 5,
        isHit: true,
        responseTimeMs: 400,
      });

      const totalTime = await getTrainingTimeMs();
      expect(totalTime).toBe(1000);
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
        cardId: 'star_single',
        domain: 'star',
        mode: 'single',
        timestamp: 1000,
        difficultyLevel: 8,
        isHit: true,
        responseTimeMs: 300,
      });

      await saveSession({
        id: 'sess_exp',
        cardId: 'star_single',
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
      const recordsAfterClear = await getTrialRecordsByCard('star_single');
      expect(recordsAfterClear.length).toBe(0);

      const success = await importAllData(json);
      expect(success).toBe(true);

      const restoredRecords = await getTrialRecordsByCard('star_single');
      expect(restoredRecords.length).toBe(1);
      expect(restoredRecords[0].id).toBe('rec_exp');
    });
  });
});
