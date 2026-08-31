import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, getCardSettings, loadSettings, saveSettings } from '../settings';

describe('settings utils with card-scoped isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadSettings - should return default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.global.soundEnabled).toBe(true);
    expect(settings.global.theme).toBe('system');
    expect(settings.cards.star_single.autoNext).toBe(true);
    expect(settings.cards.color_hue.autoNext).toBe(true);
    expect(settings.cards.rel_vector_shift.autoNext).toBe(true);
    expect(settings.cards.star_single.gridSize).toBe(3);
    expect(settings.cards.color_hue.showToleranceBand).toBe(true);
  });

  it('saveSettings & loadSettings - should persist and retrieve card-scoped settings', () => {
    const custom = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    custom.cards.star_single.autoNext = false;
    custom.cards.star_single.autoNextDelay = 800;
    custom.cards.star_single.gridSize = 4;

    custom.cards.color_hue.autoNext = true;
    custom.cards.color_hue.autoNextDelay = 300;
    custom.cards.color_hue.sliderHitMargin = 20;

    custom.cards.rel_vector_shift.autoNext = false;
    custom.cards.rel_vector_shift.autoNextDelay = 1200;

    saveSettings(custom);

    const loaded = loadSettings();
    expect(loaded.cards.star_single.autoNext).toBe(false);
    expect(loaded.cards.star_single.autoNextDelay).toBe(800);
    expect(loaded.cards.star_single.gridSize).toBe(4);

    expect(loaded.cards.color_hue.autoNext).toBe(true);
    expect(loaded.cards.color_hue.autoNextDelay).toBe(300);
    expect(loaded.cards.color_hue.sliderHitMargin).toBe(20);

    expect(loaded.cards.rel_vector_shift.autoNext).toBe(false);
    expect(loaded.cards.rel_vector_shift.autoNextDelay).toBe(1200);
  });

  it('loadSettings - should merge partial card settings with default values', () => {
    const partialSettings = {
      global: {
        idleTimeout: 120,
        theme: 'dark',
      },
      cards: {
        star_single: {
          gridSize: 5,
        },
      },
    };

    localStorage.setItem('formsight_user_settings', JSON.stringify(partialSettings));

    const loaded = loadSettings();
    expect(loaded.global.idleTimeout).toBe(120);
    expect(loaded.global.theme).toBe('dark');
    expect(loaded.global.soundEnabled).toBe(DEFAULT_SETTINGS.global.soundEnabled);
    expect(loaded.cards.star_single.gridSize).toBe(5);
    expect(loaded.cards.star_single.autoNext).toBe(DEFAULT_SETTINGS.cards.star_single.autoNext);
    expect(loaded.cards.color_hue).toEqual(DEFAULT_SETTINGS.cards.color_hue);
    expect(loaded.cards.rel_vector_shift).toEqual(DEFAULT_SETTINGS.cards.rel_vector_shift);
    expect(loaded.cards.neg_ratio_estimation).toEqual(DEFAULT_SETTINGS.cards.neg_ratio_estimation);
  });

  it('getCardSettings - should return fallback default settings if card is not found', () => {
    const settings = loadSettings();
    const starSingle = getCardSettings(settings, 'star_single');
    expect(starSingle.autoNext).toBe(true);

    const nonExistent = getCardSettings(settings, 'non_existent_card');
    expect(nonExistent.autoNext).toBe(true);
  });
});
