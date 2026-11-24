import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { i18n } from '../../core/i18n';
import { clearAllData } from '../../storage/db';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../../storage/settings';
import { initSettingsStore } from '../../stores/settingsStore';

/**
 * 回归来源：2a438a5 "Fix language persistence and IDB state synchronization"
 *
 * 真实故障：语言选择只写 IndexedDB，启动后 i18n 实例仍是默认 zh-CN，
 * 或旧实现依赖已失效的 localStorage 读取。修复后启动必须把持久化 locale 应用到 i18n。
 */

function settingsWithLocale(locale: string) {
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as typeof DEFAULT_SETTINGS;
  settings.global.locale = locale;
  return settings;
}

describe('语言持久化与启动同步 (2a438a5)', () => {
  beforeEach(async () => {
    i18n.setLocale('zh-CN');
    await clearAllData();
    localStorage.clear();
  });

  it('保存 en-US 后重新加载仍为 en-US', async () => {
    await saveSettings(settingsWithLocale('en-US'));

    const loaded = await loadSettings();
    expect(loaded.global.locale).toBe('en-US');
  });

  it('启动初始化把持久化 locale 应用到 i18n 实例', async () => {
    await saveSettings(settingsWithLocale('en-US'));

    await initSettingsStore();

    expect(i18n.getLocale()).toBe('en-US');
  });

  it('切换回 zh-CN 后启动同样同步', async () => {
    await saveSettings(settingsWithLocale('en-US'));
    await initSettingsStore();
    await saveSettings(settingsWithLocale('zh-CN'));

    await initSettingsStore();

    expect(i18n.getLocale()).toBe('zh-CN');
  });

  it('语言属于全局设置，不被卡片级设置覆盖', async () => {
    const settings = settingsWithLocale('en-US');
    settings.cards.star_single.locale = 'zh-CN';
    await saveSettings(settings);

    await initSettingsStore();

    expect(i18n.getLocale()).toBe('en-US');
  });
});
