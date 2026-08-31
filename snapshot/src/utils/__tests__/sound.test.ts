import { beforeEach, describe, expect, it } from 'vitest';
import { loadSettings, saveSettings } from '../../storage/settings';
import { playHitSound, playMissSound } from '../sound';

describe('Web Audio Sound Manager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should not throw in non-browser or disabled environments', () => {
    // 默认启用下调用不抛异常
    expect(() => playHitSound(1)).not.toThrow();
    expect(() => playHitSound(5)).not.toThrow();
    expect(() => playMissSound()).not.toThrow();

    // 禁用声音
    const settings = loadSettings();
    settings.global.soundEnabled = false;
    saveSettings(settings);

    expect(() => playHitSound(1)).not.toThrow();
    expect(() => playMissSound()).not.toThrow();
  });
});
