import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllData } from '../../storage/db';
import {
  DEFAULT_BASE_SETTINGS,
  DEFAULT_SETTINGS,
  getCardSettings,
  loadSettings,
  saveSettings,
} from '../../storage/settings';
import { resetAllSettingsAction } from '../../stores/settingsStore';

/**
 * 设置合并契约（G1-22）
 *
 * 局部设置必须与默认值深合并；已删除卡片的偏好保留到「重置全部」，
 * 导入/加载都不得静默删除用户数据。
 */

function cloneSettings() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as typeof DEFAULT_SETTINGS;
}

describe('设置合并与保留策略 (G1-22)', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('局部 global 与默认值合并', async () => {
    await saveSettings({
      global: { ...DEFAULT_SETTINGS.global, theme: 'dark', idleTimeout: 120 },
      cards: {},
    } as typeof DEFAULT_SETTINGS);

    const loaded = await loadSettings();

    expect(loaded.global.theme).toBe('dark');
    expect(loaded.global.idleTimeout).toBe(120);
    expect(loaded.global.soundEnabled).toBe(DEFAULT_SETTINGS.global.soundEnabled);
    expect(loaded.global.locale).toBe(DEFAULT_SETTINGS.global.locale);
  });

  it('局部卡片设置与默认值合并，未覆盖字段保留默认', async () => {
    const settings = cloneSettings();
    settings.cards.star_single = {
      ...settings.cards.star_single,
      gridSize: 5,
    };
    await saveSettings(settings);

    const loaded = await loadSettings();
    const card = loaded.cards.star_single;

    expect(card.gridSize).toBe(5);
    expect(card.autoNext).toBe(DEFAULT_SETTINGS.cards.star_single.autoNext);
    expect(card.adaptiveMode).toBe(DEFAULT_SETTINGS.cards.star_single.adaptiveMode);
  });

  it('已删除卡片的偏好保留，直到重置全部设置', async () => {
    const settings = cloneSettings();
    settings.cards.ghost_card = { ...DEFAULT_BASE_SETTINGS, sliderHitMargin: 99 };
    await saveSettings(settings);

    expect((await loadSettings()).cards.ghost_card.sliderHitMargin).toBe(99);

    await resetAllSettingsAction();

    expect((await loadSettings()).cards.ghost_card).toBeUndefined();
  });

  it('getCardSettings 对未知卡片回落基础默认值', async () => {
    const settings = await loadSettings();

    expect(getCardSettings(settings, 'ghost_card')).toBe(DEFAULT_BASE_SETTINGS);
    expect(getCardSettings(settings, 'star_single').gridSize).toBe(
      DEFAULT_SETTINGS.cards.star_single.gridSize,
    );
  });

  it('保存后可完整读回卡片设置', async () => {
    const settings = cloneSettings();
    settings.cards.color_hue.autoNextDelay = 750;
    settings.cards.color_hue.showToleranceBand = false;
    await saveSettings(settings);

    const loaded = await loadSettings();

    expect(loaded.cards.color_hue.autoNextDelay).toBe(750);
    expect(loaded.cards.color_hue.showToleranceBand).toBe(false);
  });
});
