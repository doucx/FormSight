import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllData,
  exportAllData,
  getAllColorProfiles,
  getAllTrialRecords,
  getUserProfile,
  importAllData,
  saveColorTrialRecord,
  saveTrialRecord,
} from '../db';

describe('db storage & import/export', () => {
  beforeEach(async () => {
    await clearAllData();
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