import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../settings';

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

  it('loadSettings - should merge partial settings with default values', () => {
    const partialSettings = {
      global: {
        idleTimeout: 120,
      },
      star: {
        gridSize: 5,
      },
    };

    localStorage.setItem('star_hopping_user_settings', JSON.stringify(partialSettings));

    const loaded = loadSettings();
    expect(loaded.global.idleTimeout).toBe(120);
    expect(loaded.global.soundEnabled).toBe(DEFAULT_SETTINGS.global.soundEnabled);
    expect(loaded.star.gridSize).toBe(5);
    expect(loaded.star.autoNext).toBe(DEFAULT_SETTINGS.star.autoNext);
    expect(loaded.color).toEqual(DEFAULT_SETTINGS.color);
    expect(loaded.relative_color).toEqual(DEFAULT_SETTINGS.relative_color);
    expect(loaded.negative_space).toEqual(DEFAULT_SETTINGS.negative_space);
  });
});
