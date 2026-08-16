import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type UserSettings, loadSettings, saveSettings } from '../settings';

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

describe('settings utils (domain-scoped)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadSettings - should return default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.star.autoNext).toBe(true);
    expect(settings.color.autoNext).toBe(true);
    expect(settings.relative_color.autoNext).toBe(true);
  });

  it('saveSettings & loadSettings - should persist and retrieve domain-scoped settings', () => {
    const custom: UserSettings = {
      global: { idleTimeout: 120 },
      star: {
        ...DEFAULT_SETTINGS.star,
        autoNext: false,
        autoNextDelay: 300,
        gridSize: 4,
      },
      color: {
        ...DEFAULT_SETTINGS.color,
        autoNext: true,
        autoNextDelay: 800,
        sliderHitMargin: 20,
      },
      relative_color: {
        ...DEFAULT_SETTINGS.relative_color,
        autoNext: false,
        autoNextDelay: 1000,
      },
    };

    saveSettings(custom);
    const loaded = loadSettings();

    expect(loaded.global.idleTimeout).toBe(120);
    // 验证各领域的隔离性
    expect(loaded.star.autoNext).toBe(false);
    expect(loaded.star.autoNextDelay).toBe(300);
    expect(loaded.star.gridSize).toBe(4);

    expect(loaded.color.autoNext).toBe(true);
    expect(loaded.color.autoNextDelay).toBe(800);
    expect(loaded.color.sliderHitMargin).toBe(20);

    expect(loaded.relative_color.autoNext).toBe(false);
    expect(loaded.relative_color.autoNextDelay).toBe(1000);
  });

  it('loadSettings - should seamlessly migrate legacy flat settings structure', () => {
    const legacyFlat = {
      autoNext: false,
      autoNextDelay: 600,
      starAutoNextDelay: 400,
      colorAutoNextDelay: 900,
      gridSize: 5,
      idleTimeout: 30,
      stepGranularity: 'fine',
      adaptiveMode: 'staircase',
      targetingMode: 'manual',
      manualTargetSectors: [0, 1],
      colorTargetingMode: 'manual',
      colorManualTargetSectors: [3, 4],
      sliderHitMargin: 8,
      showToleranceBand: false,
      enableHoverColorPreview: false,
    };

    localStorage.setItem('star_hopping_user_settings', JSON.stringify(legacyFlat));
    const migrated = loadSettings();

    // 验证全局迁移
    expect(migrated.global.idleTimeout).toBe(30);

    // 验证寻星域迁移
    expect(migrated.star.autoNext).toBe(false);
    expect(migrated.star.autoNextDelay).toBe(400);
    expect(migrated.star.gridSize).toBe(5);
    expect(migrated.star.stepGranularity).toBe('fine');
    expect(migrated.star.adaptiveMode).toBe('staircase');
    expect(migrated.star.targetingMode).toBe('manual');
    expect(migrated.star.manualTargetSectors).toEqual([0, 1]);

    // 验证绝对色感域迁移
    expect(migrated.color.autoNext).toBe(false);
    expect(migrated.color.autoNextDelay).toBe(900);
    expect(migrated.color.targetingMode).toBe('manual');
    expect(migrated.color.manualTargetSectors).toEqual([3, 4]);
    expect(migrated.color.sliderHitMargin).toBe(8);
    expect(migrated.color.showToleranceBand).toBe(false);
    expect(migrated.color.enableHoverColorPreview).toBe(false);

    // 验证相对色感域初始填充
    expect(migrated.relative_color.autoNext).toBe(false);
    expect(migrated.relative_color.autoNextDelay).toBe(900);
    expect(migrated.relative_color.sliderHitMargin).toBe(8);
  });
});