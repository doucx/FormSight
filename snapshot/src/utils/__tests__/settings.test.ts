import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../settings';

const memoryStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    writable: true,
  });
}

describe('settings utils with domain isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadSettings - should return default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.global.soundEnabled).toBe(true);
    expect(settings.star.autoNext).toBe(true);
    expect(settings.color.autoNext).toBe(true);
    expect(settings.relative_color.autoNext).toBe(true);
    expect(settings.star.gridSize).toBe(3);
    expect(settings.color.showToleranceBand).toBe(true);
  });

  it('saveSettings & loadSettings - should persist and retrieve domain-scoped settings', () => {
    const custom = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    custom.star.autoNext = false;
    custom.star.autoNextDelay = 800;
    custom.star.gridSize = 4;

    custom.color.autoNext = true;
    custom.color.autoNextDelay = 300;
    custom.color.sliderHitMargin = 20;

    custom.relative_color.autoNext = false;
    custom.relative_color.autoNextDelay = 1200;

    saveSettings(custom);

    const loaded = loadSettings();
    expect(loaded.star.autoNext).toBe(false);
    expect(loaded.star.autoNextDelay).toBe(800);
    expect(loaded.star.gridSize).toBe(4);

    expect(loaded.color.autoNext).toBe(true);
    expect(loaded.color.autoNextDelay).toBe(300);
    expect(loaded.color.sliderHitMargin).toBe(20);

    expect(loaded.relative_color.autoNext).toBe(false);
    expect(loaded.relative_color.autoNextDelay).toBe(1200);
  });

  it('loadSettings - should smoothly migrate legacy flat settings', () => {
    const legacySettings = {
      autoNext: false,
      autoNextDelay: 600,
      starAutoNextDelay: 400,
      colorAutoNextDelay: 700,
      gridSize: 5,
      sliderHitMargin: 8,
      showToleranceBand: false,
      targetingMode: 'manual',
      manualTargetSectors: [0, 1],
      colorTargetingMode: 'manual',
      colorManualTargetSectors: [2, 3],
      idleTimeout: 30,
    };

    localStorage.setItem('star_hopping_user_settings', JSON.stringify(legacySettings));

    const migrated = loadSettings();

    // 验证 global
    expect(migrated.global.idleTimeout).toBe(30);

    // 验证 star 领域隔离
    expect(migrated.star.autoNext).toBe(false);
    expect(migrated.star.autoNextDelay).toBe(400);
    expect(migrated.star.gridSize).toBe(5);
    expect(migrated.star.targetingMode).toBe('manual');
    expect(migrated.star.manualTargetSectors).toEqual([0, 1]);

    // 验证 color 领域隔离
    expect(migrated.color.autoNext).toBe(false);
    expect(migrated.color.autoNextDelay).toBe(700);
    expect(migrated.color.sliderHitMargin).toBe(8);
    expect(migrated.color.showToleranceBand).toBe(false);
    expect(migrated.color.targetingMode).toBe('manual');
    expect(migrated.color.manualTargetSectors).toEqual([2, 3]);

    // 验证 relative_color 独立填充
    expect(migrated.relative_color.autoNext).toBe(false);
    expect(migrated.relative_color.autoNextDelay).toBe(700);
    expect(migrated.relative_color.sliderHitMargin).toBe(8);
  });
});
