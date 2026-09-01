import { beforeEach, describe, expect, it } from 'vitest';
import { loadSettings, saveSettings } from '../../storage/settings';
import { playHitSound, playMissSound } from '../sound';

describe('Web Audio Sound Manager', () => {
  beforeEach(async () => {
    localStorage.clear();
    await loadSettings();
  });

  it('should not throw in non-browser or disabled environments', async () => {
    // 默认启用下调用不抛异常
    expect(() => playHitSound(1)).not.toThrow();
    expect(() => playHitSound(5)).not.toThrow();
    expect(() => playMissSound()).not.toThrow();

    // 禁用声音
    const settings = await loadSettings();
    settings.global.soundEnabled = false;
    await saveSettings(settings);

    expect(() => playHitSound(1)).not.toThrow();
    expect(() => playMissSound()).not.toThrow();
  });
});