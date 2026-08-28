好的，我们将开始执行 **Phase 1: 微内核基础设施与联邦 i18n (Kernel & i18n Infra)** 的建设。

本阶段将落地零知识微内核的核心基建：实现联邦式 i18n 调度引擎（支持核心全局词典与 Pack 私有命名空间隔离）、抽离系统级正交标签注册表、并在 `contracts.ts` 与 `registry.ts` 中升级扩展包清单契约以支持零配置自动挂载语言包与默认配置。

## [WIP] feat: 构建联邦 i18n 调度引擎与全局标签体系

### 用户需求
按照 FormSight v0.5 架构白皮书与重构路线图，启动 Phase 1 改造：
1. 实现平台轻量、无外部依赖的联邦命名空间本地化（Federated Namespaced i18n）调度引擎。
2. 建立内核全局语言包（`zh-CN.json` 与 `en-US.json`），收敛系统通用文案。
3. 提取四大正交维度与发布状态的强类型标签注册表（`src/config/tags.ts`）。
4. 升级扩展包清单规范（`PackManifest`）与核心注册中心（`registry.ts`），赋予扩展包声明私有语言包与默认配置的能力。

### 评论
Phase 1 是整个 v0.5 零知识微内核架构的基石。在不破坏现有业务模块运行的前提下，优先铺设联邦 i18n 管道和配置聚合契约，可以为后续 Phase 2 中 7 大扩展包（Packs）逐个进行物理自治化改造提供完整的协议支撑，确保每个重构步骤均可编译、可渐进式验证。

### 目标
1. 新建 `src/core/i18n.ts`，提供 `I18nManager` 单例、事件响应式 `useTranslation` Hook 及深层路径解析与模板插值能力。
2. 新建 `src/locales/zh-CN.json` 与 `src/locales/en-US.json`，提供核心框架文案。
3. 新建 `src/config/tags.ts`，统一定义各维度 Tag 的元数据与 i18nKey。
4. 升级 `src/core/contracts.ts` 与 `src/core/registry.ts`，支持 `PackManifest.locales` 自动挂载至 `packs.<packId>.*` 命名空间。
5. 更新 `src/core/index.ts` 导出 i18n 核心模块。

### 基本原理
联邦式本地化（Federated i18n）允许平台内核维持纯粹的系统框架字典，而每个领域扩展包（Pack）在被 `import.meta.glob` 自动扫描注册时，由 `SystemDomainRegistry` 将其私有语言包挂载到对应的 `packs.<packId>` 子命名空间。查表函数 `t(key, params)` 通过点号深层路径自动分发解析，并在特定语言项缺失时代偿降级，从而实现扩展包的完全物理自包含。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/config #concept/executor #scope/core #scope/dx #ai/instruct #task/domain/i18n #task/object/federated-i18n-kernel #task/action/build #task/state/begin

---

### Script

#### Acts 1: 创建联邦本地化引擎与全局系统语言包

首先创建 `src/core/i18n.ts` 调度引擎，并创建基础中英文语言包文件。

~~~~~act
write_file
src/core/i18n.ts
~~~~~
~~~~~typescript
import { useEffect, useState } from 'preact/hooks';
import enUSGlobal from '../locales/en-US.json';
import zhCNGlobal from '../locales/zh-CN.json';

export type LocaleDictionary = Record<string, unknown>;

class I18nManager {
  private currentLocale = 'zh-CN';
  private fallbackLocale = 'zh-CN';
  private dictionaries: Record<string, LocaleDictionary> = {};
  private listeners = new Set<(locale: string) => void>();

  constructor() {
    this.registerGlobalLocales({
      'zh-CN': zhCNGlobal as LocaleDictionary,
      'en-US': enUSGlobal as LocaleDictionary,
    });
  }

  public init(initialLocale = 'zh-CN'): void {
    this.currentLocale = initialLocale;
  }

  public setLocale(locale: string): void {
    if (this.currentLocale !== locale) {
      this.currentLocale = locale;
      for (const listener of this.listeners) {
        listener(locale);
      }
    }
  }

  public getLocale(): string {
    return this.currentLocale;
  }

  public subscribe(listener: (locale: string) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** 注册全局系统级词典 */
  public registerGlobalLocales(locales: Record<string, LocaleDictionary>): void {
    for (const [lang, dict] of Object.entries(locales)) {
      if (!this.dictionaries[lang]) {
        this.dictionaries[lang] = {};
      }
      Object.assign(this.dictionaries[lang], dict);
    }
  }

  /** 由 Registry 在自动扫描 Pack 时调用，将 Pack 私有词典挂载至 `packs.<packId>` 命名空间 */
  public registerPackLocales(packId: string, locales: Record<string, LocaleDictionary>): void {
    for (const [lang, dict] of Object.entries(locales)) {
      if (!this.dictionaries[lang]) {
        this.dictionaries[lang] = {};
      }
      const root = this.dictionaries[lang];
      if (!root.packs || typeof root.packs !== 'object') {
        root.packs = {};
      }
      (root.packs as Record<string, unknown>)[packId] = dict;
    }
  }

  /** 核心翻译查表方法，支持深层路径解析与模板插值 */
  public t = (key: string, params?: Record<string, string | number>): string => {
    const activeDict =
      this.dictionaries[this.currentLocale] || this.dictionaries[this.fallbackLocale] || {};
    const text =
      this.resolvePath(activeDict, key) ??
      this.resolvePath(this.dictionaries[this.fallbackLocale], key);

    if (typeof text !== 'string') {
      return key;
    }

    if (!params) return text;
    return text.replace(/\{\{(\w+)\}\}/g, (_, match) => String(params[match] ?? `{{${match}}}`));
  };

  private resolvePath(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') return undefined;
    return path.split('.').reduce((acc, part) => {
      if (acc && typeof acc === 'object' && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  }
}

export const i18n = new I18nManager();

export function useTranslation() {
  const [currentLocale, setCurrentLocale] = useState<string>(() => i18n.getLocale());

  useEffect(() => {
    return i18n.subscribe((newLocale) => {
      setCurrentLocale(newLocale);
    });
  }, []);

  return {
    t: i18n.t,
    locale: currentLocale,
    setLocale: (locale: string) => i18n.setLocale(locale),
  };
}
~~~~~

~~~~~act
write_file
src/locales/zh-CN.json
~~~~~
~~~~~json
{
  "common": {
    "appName": "FormSight",
    "appSubtitle": "视觉造型构图与色彩感知自适应强化训练系统",
    "confirm": "确认",
    "cancel": "取消",
    "complete": "完成",
    "exit": "退出",
    "nextQuestion": "下一题",
    "skip": "跳过",
    "reset": "重置",
    "save": "保存",
    "all": "全部",
    "search": "搜索",
    "stats": "统计",
    "settings": "设置",
    "globalSettings": "全局设置",
    "globalStats": "全局认知数据统计",
    "globalStatsSubtitle": "洞察多维视觉认知成长与训练足迹",
    "todayTrials": "今日刷题",
    "totalTime": "累计用时",
    "accuracy": "正确率",
    "level": "能力层阶"
  },
  "shell": {
    "exitTraining": "退出训练 (Esc)",
    "benchmark": "基准测试",
    "training": "自适应训练",
    "targeting": "靶向强化训练",
    "experimental": "实验性模块",
    "trialsCount": "已练题数",
    "currentLevel": "当前难度",
    "viewSummary": "完成并查看总结",
    "instructionTitle": "玩法要领",
    "idlePausedTitle": "训练已自动暂停",
    "idlePausedDesc": "检测到闲置或窗口切换，已保护您的心流与统计数据",
    "clickToResume": "点击继续训练 (或按任意键)"
  },
  "tags": {
    "domains": {
      "form_and_proportion": "形体与比例",
      "spatial_structure": "空间与结构",
      "color_and_value": "色彩与明度",
      "rhythm_and_notan": "动态与图底"
    },
    "paths": {
      "extraction": "自底向上：提炼概括",
      "concretization": "自顶向下：具象寻源",
      "absolute_estimation": "绝对估测度量",
      "relational_mapping": "相对推移映射"
    },
    "challenges": {
      "illusion_piercing": "错觉剥离 (抗同化/环境光)",
      "figure_ground_reversal": "图底反转 (关注负空间)",
      "working_memory": "瞬时记忆 (抗视觉遗忘)",
      "dimensional_translation": "维次转译 (3D/2D展开)"
    },
    "interactions": {
      "continuous_mod": "连续调制 (滑块)",
      "spatial_locate": "空间定位 (点阵点击)",
      "binary_choice": "二分对抗 (2AFC)",
      "multi_choice": "多维检索 (N-AFC)"
    },
    "statuses": {
      "stable": "稳定模块",
      "experimental": "实验性模块",
      "deprecated": "已废弃"
    }
  }
}
~~~~~

~~~~~act
write_file
src/locales/en-US.json
~~~~~
~~~~~json
{
  "common": {
    "appName": "FormSight",
    "appSubtitle": "Visual Form & Color Perception Adaptive Training System",
    "confirm": "Confirm",
    "cancel": "Cancel",
    "complete": "Complete",
    "exit": "Exit",
    "nextQuestion": "Next",
    "skip": "Skip",
    "reset": "Reset",
    "save": "Save",
    "all": "All",
    "search": "Search",
    "stats": "Stats",
    "settings": "Settings",
    "globalSettings": "Global Settings",
    "globalStats": "Cognitive Statistics",
    "globalStatsSubtitle": "Insights into multi-dimensional visual perceptual growth",
    "todayTrials": "Today's Trials",
    "totalTime": "Total Time",
    "accuracy": "Accuracy",
    "level": "Skill Level"
  },
  "shell": {
    "exitTraining": "Exit Training (Esc)",
    "benchmark": "Benchmark",
    "training": "Adaptive Training",
    "targeting": "Targeted Training",
    "experimental": "Experimental",
    "trialsCount": "Trials Done",
    "currentLevel": "Current Level",
    "viewSummary": "Finish & View Summary",
    "instructionTitle": "Instructions",
    "idlePausedTitle": "Training Paused",
    "idlePausedDesc": "Inactivity or tab switch detected. Session state protected.",
    "clickToResume": "Click to Resume (or press any key)"
  },
  "tags": {
    "domains": {
      "form_and_proportion": "Form & Proportion",
      "spatial_structure": "Space & Structure",
      "color_and_value": "Color & Value",
      "rhythm_and_notan": "Rhythm & Notan"
    },
    "paths": {
      "extraction": "Bottom-Up: Extraction",
      "concretization": "Top-Down: Concretization",
      "absolute_estimation": "Absolute Estimation",
      "relational_mapping": "Relational Mapping"
    },
    "challenges": {
      "illusion_piercing": "Illusion Piercing (Anti-Assimilation)",
      "figure_ground_reversal": "Figure-Ground Reversal",
      "working_memory": "Working Memory",
      "dimensional_translation": "Dimensional Translation (3D/2D)"
    },
    "interactions": {
      "continuous_mod": "Continuous Modulation (Slider)",
      "spatial_locate": "Spatial Localization (Grid Click)",
      "binary_choice": "Binary Choice (2AFC)",
      "multi_choice": "Multi-Choice (N-AFC)"
    },
    "statuses": {
      "stable": "Stable Module",
      "experimental": "Experimental",
      "deprecated": "Deprecated"
    }
  }
}
~~~~~

#### Acts 2: 建立统一标签注册表

创建 `src/config/tags.ts`，定义四正交维度与发布状态的强类型标签注册表。

~~~~~act
write_file
src/config/tags.ts
~~~~~
~~~~~typescript
import type {
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../types/card';

export interface TagMeta<T extends string> {
  id: T;
  i18nKey: string;
  themeColor?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'purple';
}

export const DOMAIN_TAGS: Record<VisualDomainTag, TagMeta<VisualDomainTag>> = {
  form_and_proportion: {
    id: 'form_and_proportion',
    i18nKey: 'tags.domains.form_and_proportion',
    themeColor: 'indigo',
  },
  spatial_structure: {
    id: 'spatial_structure',
    i18nKey: 'tags.domains.spatial_structure',
    themeColor: 'indigo',
  },
  color_and_value: {
    id: 'color_and_value',
    i18nKey: 'tags.domains.color_and_value',
    themeColor: 'amber',
  },
  rhythm_and_notan: {
    id: 'rhythm_and_notan',
    i18nKey: 'tags.domains.rhythm_and_notan',
    themeColor: 'emerald',
  },
};

export const PATH_TAGS: Record<CognitivePathTag, TagMeta<CognitivePathTag>> = {
  extraction: {
    id: 'extraction',
    i18nKey: 'tags.paths.extraction',
    themeColor: 'emerald',
  },
  concretization: {
    id: 'concretization',
    i18nKey: 'tags.paths.concretization',
    themeColor: 'emerald',
  },
  absolute_estimation: {
    id: 'absolute_estimation',
    i18nKey: 'tags.paths.absolute_estimation',
    themeColor: 'indigo',
  },
  relational_mapping: {
    id: 'relational_mapping',
    i18nKey: 'tags.paths.relational_mapping',
    themeColor: 'indigo',
  },
};

export const CHALLENGE_TAGS: Record<MentalChallengeTag, TagMeta<MentalChallengeTag>> = {
  illusion_piercing: {
    id: 'illusion_piercing',
    i18nKey: 'tags.challenges.illusion_piercing',
    themeColor: 'rose',
  },
  figure_ground_reversal: {
    id: 'figure_ground_reversal',
    i18nKey: 'tags.challenges.figure_ground_reversal',
    themeColor: 'rose',
  },
  working_memory: {
    id: 'working_memory',
    i18nKey: 'tags.challenges.working_memory',
    themeColor: 'rose',
  },
  dimensional_translation: {
    id: 'dimensional_translation',
    i18nKey: 'tags.challenges.dimensional_translation',
    themeColor: 'purple',
  },
};

export const INTERACTION_TAGS: Record<InteractionTag, TagMeta<InteractionTag>> = {
  continuous_mod: {
    id: 'continuous_mod',
    i18nKey: 'tags.interactions.continuous_mod',
    themeColor: 'amber',
  },
  spatial_locate: {
    id: 'spatial_locate',
    i18nKey: 'tags.interactions.spatial_locate',
    themeColor: 'indigo',
  },
  binary_choice: {
    id: 'binary_choice',
    i18nKey: 'tags.interactions.binary_choice',
    themeColor: 'emerald',
  },
  multi_choice: {
    id: 'multi_choice',
    i18nKey: 'tags.interactions.multi_choice',
    themeColor: 'amber',
  },
};

export const STATUS_TAGS: Record<CardStatusTag, TagMeta<CardStatusTag>> = {
  stable: {
    id: 'stable',
    i18nKey: 'tags.statuses.stable',
    themeColor: 'indigo',
  },
  experimental: {
    id: 'experimental',
    i18nKey: 'tags.statuses.experimental',
    themeColor: 'purple',
  },
  deprecated: {
    id: 'deprecated',
    i18nKey: 'tags.statuses.deprecated',
    themeColor: 'rose',
  },
};
~~~~~

#### Acts 3: 升级契约与注册中心以支持联邦词典及配置池

更新 `src/core/contracts.ts`、`src/core/registry.ts` 与 `src/core/index.ts`。

~~~~~act
patch_file
src/core/contracts.ts
~~~~~
~~~~~old
export interface PackManifest {
  packId: string;
  meta: PackMeta;
  cards: CardDefinition[];
  trainingPlugin: AnyTrainingPlugin;
  analyticsPlugins?: Record<string, CardAnalyticsPlugin>;
  defaultCardSettings?: Record<string, Partial<BaseModuleSettings>>;
}
~~~~~
~~~~~new
export interface PackManifest {
  packId: string;
  meta: PackMeta;
  cards: CardDefinition[];
  trainingPlugin: AnyTrainingPlugin;
  analyticsPlugins?: Record<string, CardAnalyticsPlugin>;
  defaultCardSettings?: Record<string, Partial<BaseModuleSettings>>;
  locales?: Record<string, Record<string, unknown>>;
}
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~old
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type {
  CardDefinition,
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  PackMeta,
  VisualDomainTag,
} from '../types/card';
import type { CardAnalyticsPlugin, PackManifest } from './contracts';
~~~~~
~~~~~new
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type {
  CardDefinition,
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  PackMeta,
  VisualDomainTag,
} from '../types/card';
import type { CardAnalyticsPlugin, PackManifest } from './contracts';
import { i18n } from './i18n';
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~old
  public register(manifest: PackManifest): void {
    this.packs.set(manifest.packId, manifest);

    for (const card of manifest.cards) {
      const normalizedCard: CardDefinition = {
        ...card,
        packId: manifest.packId,
      };

      this.cardMap.set(card.id, normalizedCard);
      this.cardPluginMap.set(card.id, manifest.trainingPlugin);
      this.invertedIndex.indexCard(normalizedCard);
    }

    if (manifest.analyticsPlugins) {
      for (const [cardId, plugin] of Object.entries(manifest.analyticsPlugins)) {
        this.cardAnalyticsMap.set(cardId, plugin);
      }
    }
  }
~~~~~
~~~~~new
  public register(manifest: PackManifest): void {
    this.packs.set(manifest.packId, manifest);

    // 自动挂载 Pack 私有语言包至 `packs.<packId>` 命名空间
    if (manifest.locales) {
      i18n.registerPackLocales(manifest.packId, manifest.locales);
    }

    for (const card of manifest.cards) {
      const normalizedCard: CardDefinition = {
        ...card,
        packId: manifest.packId,
      };

      this.cardMap.set(card.id, normalizedCard);
      this.cardPluginMap.set(card.id, manifest.trainingPlugin);
      this.invertedIndex.indexCard(normalizedCard);
    }

    if (manifest.analyticsPlugins) {
      for (const [cardId, plugin] of Object.entries(manifest.analyticsPlugins)) {
        this.cardAnalyticsMap.set(cardId, plugin);
      }
    }
  }
~~~~~

~~~~~act
patch_file
src/core/index.ts
~~~~~
~~~~~old
// 导出契约与注册器
export * from './contracts';
export * from './registry';
~~~~~
~~~~~new
// 导出契约、注册器与国际化引擎
export * from './contracts';
export * from './registry';
export * from './i18n';
~~~~~

### 下一步建议
Phase 1 基建改造已全部生成完成。下一步建议推进 **Phase 2: 7 大扩展包逐个自治化改造**：
1. 从模范包 `src/packs/angle/` 开始，创建私有 `locales/zh-CN.json` 和 `locales/en-US.json`，并迁移包内绘图算子与默认配置声明。
2. 依次推进 `star`, `color`, `relative_color`, `negative_space`, `perspective`, `abstraction` 各包的自治重构。
