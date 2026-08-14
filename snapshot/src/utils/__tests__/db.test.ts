import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllData,
  exportAllData,
  formatTotalTime,
  getAllColorProfiles,
  getAllColorTrialRecords,
  getAllTrialRecords,
  getAllUserProfiles,
  getColorTrainingTimeMs,
  getStarHoppingTrainingTimeMs,
  getTotalTrainingTimeMs,
  getUserProfile,
  importAllData,
  saveColorSession,
  saveColorTrialRecord,
  saveSession,
  saveTrialRecord,
} from '../db';

describe('db storage & import/export', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('formatTotalTime - should format milliseconds into days, hours, and minutes', () => {
    expect(formatTotalTime(0)).toBe('0天0小时0分钟');
    expect(formatTotalTime(65 * 1000)).toBe('0天0小时1分钟');
    expect(formatTotalTime((60 * 60 + 120) * 1000)).toBe('0天1小时2分钟');
    expect(formatTotalTime((24 * 3600 + 3600 * 2 + 180) * 1000)).toBe('1天2小时3分钟');
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

  it('getAllUserProfiles & getAllColorProfiles - should retrieve all mode profiles', async () => {
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

    const userProfiles = await getAllUserProfiles();
    expect(userProfiles.single).not.toBeNull();
    expect(userProfiles.double_h).toBeNull();
    expect(userProfiles.double_r).toBeNull();

    await saveColorTrialRecord({
      id: 'cr1',
      sessionId: 'cs1',
      mode: 'H',
      timestamp: Date.now(),
      difficultyLevel: 5,
      targetHSV: [0, 100, 100],
      userHSV: [0, 100, 100],
      isHit: true,
      errorValue: 0,
      responseTimeMs: 500,
    });

    const colorProfiles = await getAllColorProfiles();
    expect(colorProfiles.H).not.toBeNull();
    expect(colorProfiles.S).toBeNull();
    expect(colorProfiles.V).toBeNull();

    const colorRecords = await getAllColorTrialRecords('H');
    expect(colorRecords.length).toBe(1);
  });

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

    await saveColorSession({
      id: 'cs1',
      mode: 'H',
      type: 'training',
      startTimestamp: 1000,
      endTimestamp: 31000, // +30s
      totalTrials: 3,
      hitTrials: 3,
      startLevel: 5,
      endLevel: 6,
    });

    const starMs = await getStarHoppingTrainingTimeMs();
    const colorMs = await getColorTrainingTimeMs();
    const totalMs = await getTotalTrainingTimeMs();

    expect(starMs).toBe(60000);
    expect(colorMs).toBe(30000);
    expect(totalMs).toBe(90000);
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