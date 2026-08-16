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

describe('settings utils (domain-scoped isolation)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadSettings - should return domain-tuned default settings', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);

    // 验证各领域特定的合理默认延迟
    expect(settings.star.autoNextDelay).toBe(500);
    expect(settings.color.autoNextDelay).toBe(600);
    expect(settings.relative_color.autoNextDelay).toBe(800);

    // 验证 star 域不存在滑块容错相关字段
    expect((settings.star as unknown as Record<string, unknown>).showToleranceBand).toBeUndefined();
    expect((settings.star as unknown as Record<string, unknown>).sliderHitMargin).toBeUndefined();
  });

  it('saveSettings & loadSettings - should maintain strict domain isolation for autoNext switch', () => {
    const custom: UserSettings = {
      ...DEFAULT_SETTINGS,
      star: {
        ...DEFAULT_SETTINGS.star,
        autoNext: false, // 寻星关闭自动翻页
        autoNextDelay: 300,
      },
      color: {
        ...DEFAULT_SETTINGS.color,
        autoNext: true, // 绝对色感开启自动翻页
        autoNextDelay: 700,
      },
      relative_color: {
        ...DEFAULT_SETTINGS.relative_color,
        autoNext: false, // 相对色感关闭自动翻页
        autoNextDelay: 1200,
      },
    };

    saveSettings(custom);
    const loaded = loadSettings();

    // 验证各领域的 autoNext 开关完全独立互不影响
    expect(loaded.star.autoNext).toBe(false);
    expect(loaded.star.autoNextDelay).toBe(300);

    expect(loaded.color.autoNext).toBe(true);
    expect(loaded.color.autoNextDelay).toBe(700);

    expect(loaded.relative_color.autoNext).toBe(false);
    expect(loaded.relative_color.autoNextDelay).toBe(1200);
  });

  it('loadSettings - should seamlessly migrate legacy flat structure into domain settings', () => {
    const legacyFlat = {
      autoNext: false,
      autoNextDelay: 500,
      starAutoNextDelay: 400,
      colorAutoNextDelay: 750,
      gridSize: 4,
      idleTimeout: 45,
      stepGranularity: 'fine',
      adaptiveMode: 'staircase',
      targetingMode: 'manual',
      manualTargetSectors: [2, 3],
      colorTargetingMode: 'manual',
      colorManualTargetSectors: [5, 6],
      sliderHitMargin: 20,
      showToleranceBand: false,
      enableHoverColorPreview: false,
    };

    localStorage.setItem('star_hopping_user_settings', JSON.stringify(legacyFlat));
    const migrated = loadSettings();

    expect(migrated.global.idleTimeout).toBe(45);

    // star
    expect(migrated.star.autoNext).toBe(false);
    expect(migrated.star.autoNextDelay).toBe(400);
    expect(migrated.star.gridSize).toBe(4);
    expect(migrated.star.stepGranularity).toBe('fine');
    expect(migrated.star.adaptiveMode).toBe('staircase');
    expect(migrated.star.targetingMode).toBe('manual');
    expect(migrated.star.manualTargetSectors).toEqual([2, 3]);

    // color
    expect(migrated.color.autoNext).toBe(false);
    expect(migrated.color.autoNextDelay).toBe(750);
    expect(migrated.color.sliderHitMargin).toBe(20);
    expect(migrated.color.showToleranceBand).toBe(false);
    expect(migrated.color.enableHoverColorPreview).toBe(false);

    // relative_color
    expect(migrated.relative_color.autoNext).toBe(false);
    expect(migrated.relative_color.autoNextDelay).toBe(800); // 采用默认 800ms
    expect(migrated.relative_color.sliderHitMargin).toBe(20);
  });
});