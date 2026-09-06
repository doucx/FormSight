import { i18n } from '../../core/i18n';
import type { OfficialPlanCategory, OfficialPlanPreset } from './types';

class OfficialPlanRegistry {
  private presetMap = new Map<string, OfficialPlanPreset>();

  constructor() {
    this.autoDiscover();
  }

  /**
   * 自动扫描 presets 目录下全部独立预设，实现 OCP
   */
  private autoDiscover(): void {
    const modules = import.meta.glob<{ default: OfficialPlanPreset }>('./presets/*.ts', {
      eager: true,
    });

    for (const path in modules) {
      const preset = modules[path]?.default;
      if (preset?.id) {
        this.registerPreset(preset);
      }
    }
  }

  public registerPreset(preset: OfficialPlanPreset): void {
    this.presetMap.set(preset.id, preset);

    // 动态向 i18n 注入模板多语言
    if (preset.locales) {
      for (const [localeKey, dict] of Object.entries(preset.locales)) {
        i18n.registerGlobalLocales({
          [localeKey]: {
            templates: {
              [preset.id]: dict,
            },
          },
        });
      }
    }
  }

  public getAllPresets(): OfficialPlanPreset[] {
    return Array.from(this.presetMap.values());
  }

  public getPresetById(id: string): OfficialPlanPreset | undefined {
    return this.presetMap.get(id);
  }

  public getPresetsByCategory(category: OfficialPlanCategory): OfficialPlanPreset[] {
    return this.getAllPresets().filter((p) => p.category === category);
  }
}

export const officialPlanRegistry = new OfficialPlanRegistry();
