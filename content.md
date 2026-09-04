## [WIP] refactor: 重构 SettingsModal 架构，废弃动态 Schema 引擎转为卡片插槽自治

### 用户需求

按照提供的重构路线图执行 Phase 1 到 Phase 4，彻底移除导致抽象污染和过度工程的 `DynamicDomainSettings.tsx` 动态 Schema 解析器，并在各个训练卡片模块内直接提供 `renderSettings` 专属组件实现卡片自治的配置。

### 评论

你对“配置即代码 (Configuration as Code)” 滥用的诊断非常精确。为了区区数十个且具有强业务耦合（如 12 色相靶向圈选、星型网格长宽选择）的设置项，引入一个带有 `type: 'targeting'` 这种硬编码枚举的 JSON Schema 引擎，极大地增加了模块间的耦合度与心智负担。本次重构将其拨乱反正，回归 React / Preact 组件插槽的零抽象直觉设计。

### 目标

1. 清除 `CardManifest` 与 `CardDefinition` 中的 `settingSchemas` 契约定义。
2. 注入 `renderSettings` 插槽作为卡片提供专属配置 UI 的全新契约。
3. 删除 `DynamicDomainSettings.tsx`，精简 `SettingsModal.tsx`。
4. 将 14 张具有私有设置项的 Card 模块重构为基于原生 `SettingToggleItem`、`TargetingSection` 与 `<Button>` 组成的 `renderSettings`。

### 基本原理

通过依赖倒置与插槽 (Slot) 模式，`SettingsModal` 不再需要理解各个 Card 特有的设置选项，它只负责提供基础设置（如自动切换、难度跨度等）和上下文，然后把渲染特定设置的控制权交还给 Card 的 `renderSettings` 函数。各卡片可以毫无顾忌地使用自有的 I18N 与状态，直接向外 Emit 更新补丁，彻底实现模块高内聚。

### 标签

#intent/refine #flow/ready #priority/high #comp/interfaces #concept/config #scope/core #scope/dx #task/domain/core #task/object/settings-engine #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 核心契约与渲染注册表的瘦身

首先，我们修改定义卡片的基础契约文件，剔除 `settingSchemas` 并替换为函数式 `renderSettings` 插槽。同时从注册中心 `registry.ts` 里删除为了兼容 Schema 弄出的脏代码（如 `qualifySchemas`）。

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~typescript.old
import type { ComponentChildren } from 'preact';
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';

/**
~~~~~
~~~~~typescript.new
import type { ComponentChildren } from 'preact';

/**
~~~~~

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~typescript.old
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
  defaultSettings?: Record<string, unknown>;
}
~~~~~
~~~~~typescript.new
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  defaultSettings?: Record<string, unknown>;
}
~~~~~

~~~~~act
patch_file
src/core/cardContract.ts
~~~~~
~~~~~typescript.old
import type { ComponentChildren } from 'preact';
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';
import type { UnifiedTrialRecord } from '../storage/db/schema';
~~~~~
~~~~~typescript.new
import type { ComponentChildren } from 'preact';
import type { UnifiedTrialRecord } from '../storage/db/schema';
~~~~~

~~~~~act
patch_file
src/core/cardContract.ts
~~~~~
~~~~~typescript.old
  icon: (props: { className?: string }) => ComponentChildren;

  /** 2. 个性化设置项定义与默认值 */
  settingSchemas?: SettingFieldSchema[];
  defaultSettings?: Partial<TSettings>;

  /** 3. 自包含多语言词典 */
~~~~~
~~~~~typescript.new
  icon: (props: { className?: string }) => ComponentChildren;

  /** 2. 个性化设置项定义与默认值 */
  renderSettings?: (props: {
    settings: TSettings;
    updateSettings: (patch: Partial<TSettings>) => void;
  }) => ComponentChildren;
  defaultSettings?: Partial<TSettings>;

  /** 3. 自包含多语言词典 */
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';
import { getTrialRecordsByCard } from '../storage/db/queries';
import type {
~~~~~
~~~~~typescript.new
import { getTrialRecordsByCard } from '../storage/db/queries';
import type {
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
export function qualifyCardKey(key: string | undefined, cardId: string): string | undefined {
  if (!key) return undefined;
  if (key.startsWith('cards.') || key.startsWith('global.')) {
    return key;
  }
  return `cards.${cardId}.${key.replace(/^\./, '')}`;
}

export function qualifySchemas(
  schemas: SettingFieldSchema[] | undefined,
  cardId: string,
): SettingFieldSchema[] | undefined {
  if (!schemas) return undefined;
  return schemas.map((schema) => {
    if (schema.type === 'sliderMargin') {
      return {
        ...schema,
        title: qualifyCardKey(schema.title, cardId),
      };
    }
    if (schema.type === 'toggle') {
      return {
        ...schema,
        title: qualifyCardKey(schema.title, cardId) ?? schema.title,
        description: qualifyCardKey(schema.description, cardId) ?? schema.description,
      };
    }
    if (schema.type === 'buttonGroup') {
      return {
        ...schema,
        title: qualifyCardKey(schema.title, cardId) ?? schema.title,
        options: schema.options.map((opt) => ({
          ...opt,
          label: qualifyCardKey(opt.label, cardId) ?? opt.label,
        })),
      };
    }
    if (schema.type === 'targeting') {
      return {
        ...schema,
        title: qualifyCardKey(schema.title, cardId) ?? schema.title,
        subTitle: qualifyCardKey(schema.subTitle, cardId) ?? schema.subTitle,
        sectors: schema.sectors.map((sec) => qualifyCardKey(sec, cardId) ?? sec),
      };
    }
    return schema;
  });
}

export function qualifyAnalyticsViews(
~~~~~
~~~~~typescript.new
export function qualifyCardKey(key: string | undefined, cardId: string): string | undefined {
  if (!key) return undefined;
  if (key.startsWith('cards.') || key.startsWith('global.')) {
    return key;
  }
  return `cards.${cardId}.${key.replace(/^\./, '')}`;
}

export function qualifyAnalyticsViews(
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
    // 2. 自动修饰并注册 SettingSchemas 相对 key
    const normalizedSchemas = qualifySchemas(card.settingSchemas, card.id);

    // 3. 构建标准 CardDefinition
    const cardDef: CardDefinition = {
      id: card.id,
      domain: card.domain,
      icon: card.icon,
      tags: card.tags,
      hasWeaknessAnalytics: Boolean(card.analytics?.views?.length),
      settingSchemas: normalizedSchemas,
      defaultSettings: card.defaultSettings,
    };
~~~~~
~~~~~typescript.new
    // 2. 构建标准 CardDefinition
    const cardDef: CardDefinition = {
      id: card.id,
      domain: card.domain,
      icon: card.icon,
      tags: card.tags,
      hasWeaknessAnalytics: Boolean(card.analytics?.views?.length),
      defaultSettings: card.defaultSettings,
    };
~~~~~


#### Acts 2: 淘汰过度工程的组件及其引用

删除 `DynamicDomainSettings.tsx` 文件，并在 `SettingsModal.tsx` 中切换到使用 `registry` 解析新插槽机制。

~~~~~act
delete_file
src/components/settings/DynamicDomainSettings.tsx
~~~~~

~~~~~act
patch_file
src/components/modals/SettingsModal.tsx
~~~~~
~~~~~typescript.old
import { ModalShell } from '../common/ModalShell';
import { DynamicDomainSettings } from '../settings/DynamicDomainSettings';
import { Button } from '../ui/button';
~~~~~
~~~~~typescript.new
import { registry } from '../../core/registry';
import { ModalShell } from '../common/ModalShell';
import { Button } from '../ui/button';
~~~~~

~~~~~act
patch_file
src/components/modals/SettingsModal.tsx
~~~~~
~~~~~tsx.old
        {/* 渲染卡片专属设置 Schemas */}
        {card.settingSchemas && card.settingSchemas.length > 0 && (
          <DynamicDomainSettings
            schemas={card.settingSchemas}
            values={cardConfig}
            onChange={(patch) => updateCardConfig(patch)}
          />
        )}
      </div>
    </ModalShell>
~~~~~
~~~~~tsx.new
        {/* 渲染卡片专属设置组件 */}
        {(() => {
          const manifest = registry.getCardManifest(card.id);
          if (manifest?.renderSettings) {
            return (
              <div className="pt-2 border-t border-border/60">
                {manifest.renderSettings({
                  settings: cardConfig as any,
                  updateSettings: (patch) => updateCardConfig(patch as any)
                })}
              </div>
            );
          }
          return null;
        })()}
      </div>
    </ModalShell>
~~~~~


#### Acts 3: 卡片自治组件插槽迁移（第一组：单开关逻辑模块）

我们将逐个修改包含 Schema 设置的卡片，用直接注入的组件树取代死板的 Schema。

~~~~~act
patch_file
src/cards/abs_gesture_axis/index.tsx
~~~~~
~~~~~typescript.old
import { AbsGestureAxisView } from './AbsGestureAxisView';
import enUS from './locales/en-US.json';
~~~~~
~~~~~typescript.new
import { SettingToggleItem } from '../../components/settings/common/SettingToggleItem';
import { useCardTranslation } from '../../core/i18n';
import { AbsGestureAxisView } from './AbsGestureAxisView';
import enUS from './locales/en-US.json';
~~~~~

~~~~~act
patch_file
src/cards/abs_gesture_axis/index.tsx
~~~~~
~~~~~typescript.old
    locales: {
      'zh-CN': zhCN,
      'en-US': enUS,
    },
    settingSchemas: [
      {
        type: 'toggle',
        key: 'showToleranceBand',
        title: 'settings.showToleranceBandTitle',
        description: 'settings.showToleranceBandDesc',
      },
    ],
    defaultSettings: {
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
~~~~~
~~~~~typescript.new
    locales: {
      'zh-CN': zhCN,
      'en-US': enUS,
    },
    renderSettings: ({ settings, updateSettings }) => {
      const { t } = useCardTranslation('abs_gesture_axis');
      return (
        <div className="space-y-4">
          <SettingToggleItem
            title={t('settings.showToleranceBandTitle')}
            description={t('settings.showToleranceBandDesc')}
            checked={settings.showToleranceBand as boolean ?? true}
            onChange={(val) => updateSettings({ showToleranceBand: val })}
          />
        </div>
      );
    },
    defaultSettings: {
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
~~~~~

~~~~~act
patch_file
src/cards/abs_notan_threshold/index.tsx
~~~~~
~~~~~typescript.old
import { AbsNotanThresholdView } from './AbsNotanThresholdView';
import enUS from './locales/en-US.json';
~~~~~
~~~~~typescript.new
import { SettingToggleItem } from '../../components/settings/common/SettingToggleItem';
import { useCardTranslation } from '../../core/i18n';
import { AbsNotanThresholdView } from './AbsNotanThresholdView';
import enUS from './locales/en-US.json';
~~~~~

~~~~~act
patch_file
src/cards/abs_notan_threshold/index.tsx
~~~~~
~~~~~typescript.old
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: 'settings.showToleranceBandTitle',
      description: 'settings.showToleranceBandDesc',
    },
  ],
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
~~~~~
~~~~~typescript.new
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  renderSettings: ({ settings, updateSettings }) => {
    const { t } = useCardTranslation('abs_notan_threshold');
    return (
      <div className="space-y-4">
        <SettingToggleItem
          title={t('settings.showToleranceBandTitle')}
          description={t('settings.showToleranceBandDesc')}
          checked={settings.showToleranceBand as boolean ?? true}
          onChange={(val) => updateSettings({ showToleranceBand: val })}
        />
      </div>
    );
  },
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
~~~~~

~~~~~act
patch_file
src/cards/angle_estimation/index.tsx
~~~~~
~~~~~typescript.old
import { AngleEstimationView } from './AngleEstimationView';
import enUS from './locales/en-US.json';
~~~~~
~~~~~typescript.new
import { SettingToggleItem } from '../../components/settings/common/SettingToggleItem';
import { useCardTranslation } from '../../core/i18n';
import { AngleEstimationView } from './AngleEstimationView';
import enUS from './locales/en-US.json';
~~~~~

~~~~~act
patch_file
src/cards/angle_estimation/index.tsx
~~~~~
~~~~~typescript.old
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: 'settings.showToleranceBandTitle',
      description: 'settings.showToleranceBandDesc',
    },
  ],
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
~~~~~
~~~~~typescript.new
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  renderSettings: ({ settings, updateSettings }) => {
    const { t } = useCardTranslation('angle_estimation');
    return (
      <div className="space-y-4">
        <SettingToggleItem
          title={t('settings.showToleranceBandTitle')}
          description={t('settings.showToleranceBandDesc')}
          checked={settings.showToleranceBand as boolean ?? true}
          onChange={(val) => updateSettings({ showToleranceBand: val })}
        />
      </div>
    );
  },
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
~~~~~


#### Acts 4: 卡片自治组件插槽迁移（第二组：连续/滑块类感知模块）

颜色相关以及其它负形占比类的感知模块同样依赖了展示容错条等控制状态。

~~~~~act
patch_file
src/cards/color_sat/index.tsx
~~~~~
~~~~~typescript.old
import { ColorSatView } from './ColorSatView';
import enUS from './locales/en-US.json';
~~~~~
~~~~~typescript.new
import { SettingToggleItem } from '../../components/settings/common/SettingToggleItem';
import { useCardTranslation } from '../../core/i18n';
import { ColorSatView } from './ColorSatView';
import enUS from './locales/en-US.json';
~~~~~

~~~~~act
patch_file
src/cards/color_sat/index.tsx
~~~~~
~~~~~typescript.old
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: 'settings.showToleranceBandTitle',
      description: 'settings.showToleranceBandDesc',
    },
  ],
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
~~~~~
~~~~~typescript.new
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  renderSettings: ({ settings, updateSettings }) => {
    const { t } = useCardTranslation('color_sat');
    return (
      <div className="space-y-4">
        <SettingToggleItem
          title={t('settings.showToleranceBandTitle')}
          description={t('settings.showToleranceBandDesc')}
          checked={settings.showToleranceBand as boolean ?? true}
          onChange={(val) => updateSettings({ showToleranceBand: val })}
        />
      </div>
    );
  },
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
~~~~~

~~~~~act
patch_file
src/cards/color_val/index.tsx
~~~~~
~~~~~typescript.old
import { ColorValView } from './ColorValView';
import enUS from './locales/en-US.json';
~~~~~
~~~~~typescript.new
import { SettingToggleItem } from '../../components/settings/common/SettingToggleItem';
import { useCardTranslation } from '../../core/i18n';
import { ColorValView } from './ColorValView';
import enUS from './locales/en-US.json';
~~~~~

~~~~~act
patch_file
src/cards/color_val/index.tsx
~~~~~
~~~~~typescript.old
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: 'settings.showToleranceBandTitle',
      description: 'settings.showToleranceBandDesc',
    },
  ],
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
~~~~~
~~~~~typescript.new
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  renderSettings: ({ settings, updateSettings }) => {
    const { t } = useCardTranslation('color_val');
    return (
      <div className="space-y-4">
        <SettingToggleItem
          title={t('settings.showToleranceBandTitle')}
          description={t('settings.showToleranceBandDesc')}
          checked={settings.showToleranceBand as boolean ?? true}
          onChange={(val) => updateSettings({ showToleranceBand: val })}
        />
      </div>
    );
  },
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
~~~~~

~~~~~act
patch_file
src/cards/neg_ratio_estimation/index.tsx
~~~~~
~~~~~typescript.old
import { NegRatioEstimationView } from './NegRatioEstimationView';
import { createNegRatioAnalytics } from './analytics';
~~~~~
~~~~~typescript.new
import { SettingToggleItem } from '../../components/settings/common/SettingToggleItem';
import { useCardTranslation } from '../../core/i18n';
import { NegRatioEstimationView } from './NegRatioEstimationView';
import { createNegRatioAnalytics } from './analytics';
~~~~~

~~~~~act
patch_file
src/cards/neg_ratio_estimation/index.tsx
~~~~~
~~~~~typescript.old
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: 'settings.showToleranceBandTitle',
      description: 'settings.showToleranceBandDesc',
    },
  ],
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
~~~~~
~~~~~typescript.new
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  renderSettings: ({ settings, updateSettings }) => {
    const { t } = useCardTranslation('neg_ratio_estimation');
    return (
      <div className="space-y-4">
        <SettingToggleItem
          title={t('settings.showToleranceBandTitle')}
          description={t('settings.showToleranceBandDesc')}
          checked={settings.showToleranceBand as boolean ?? true}
          onChange={(val) => updateSettings({ showToleranceBand: val })}
        />
      </div>
    );
  },
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
~~~~~

~~~~~act
patch_file
src/cards/persp_vp_convergence/index.tsx
~~~~~
~~~~~typescript.old
import { PerspVpConvergenceView } from './PerspVpConvergenceView';
import enUS from './locales/en-US.json';
~~~~~
~~~~~typescript.new
import { SettingToggleItem } from '../../components/settings/common/SettingToggleItem';
import { useCardTranslation } from '../../core/i18n';
import { PerspVpConvergenceView } from './PerspVpConvergenceView';
import enUS from './locales/en-US.json';
~~~~~

~~~~~act
patch_file
src/cards/persp_vp_convergence/index.tsx
~~~~~
~~~~~typescript.old
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: 'settings.showToleranceBandTitle',
      description: 'settings.showToleranceBandDesc',
    },
  ],
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
~~~~~
~~~~~typescript.new
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  renderSettings: ({ settings, updateSettings }) => {
    const { t } = useCardTranslation('persp_vp_convergence');
    return (
      <div className="space-y-4">
        <SettingToggleItem
          title={t('settings.showToleranceBandTitle')}
          description={t('settings.showToleranceBandDesc')}
          checked={settings.showToleranceBand as boolean ?? true}
          onChange={(val) => updateSettings({ showToleranceBand: val })}
        />
      </div>
    );
  },
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
~~~~~

~~~~~act
patch_file
src/cards/rel_lightness_induction/index.tsx
~~~~~
~~~~~typescript.old
import { RelLightnessInductionView } from './RelLightnessInductionView';
import enUS from './locales/en-US.json';
~~~~~
~~~~~typescript.new
import { SettingToggleItem } from '../../components/settings/common/SettingToggleItem';
import { useCardTranslation } from '../../core/i18n';
import { RelLightnessInductionView } from './RelLightnessInductionView';
import enUS from './locales/en-US.json';
~~~~~

~~~~~act
patch_file
src/cards/rel_lightness_induction/index.tsx
~~~~~
~~~~~typescript.old
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: 'settings.showToleranceBandTitle',
      description: 'settings.showToleranceBandDesc',
    },
  ],
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
~~~~~
~~~~~typescript.new
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  renderSettings: ({ settings, updateSettings }) => {
    const { t } = useCardTranslation('rel_lightness_induction');
    return (
      <div className="space-y-4">
        <SettingToggleItem
          title={t('settings.showToleranceBandTitle')}
          description={t('settings.showToleranceBandDesc')}
          checked={settings.showToleranceBand as boolean ?? true}
          onChange={(val) => updateSettings({ showToleranceBand: val })}
        />
      </div>
    );
  },
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
~~~~~

~~~~~act
patch_file
src/cards/rel_vector_shift/index.tsx
~~~~~
~~~~~typescript.old
import { RelVectorShiftView } from './RelVectorShiftView';
import enUS from './locales/en-US.json';
~~~~~
~~~~~typescript.new
import { SettingToggleItem } from '../../components/settings/common/SettingToggleItem';
import { useCardTranslation } from '../../core/i18n';
import { RelVectorShiftView } from './RelVectorShiftView';
import enUS from './locales/en-US.json';
~~~~~

~~~~~act
patch_file
src/cards/rel_vector_shift/index.tsx
~~~~~
~~~~~typescript.old
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: 'settings.showToleranceBandTitle',
      description: 'settings.showToleranceBandDesc',
    },
  ],
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
~~~~~
~~~~~typescript.new
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  renderSettings: ({ settings, updateSettings }) => {
    const { t } = useCardTranslation('rel_vector_shift');
    return (
      <div className="space-y-4">
        <SettingToggleItem
          title={t('settings.showToleranceBandTitle')}
          description={t('settings.showToleranceBandDesc')}
          checked={settings.showToleranceBand as boolean ?? true}
          onChange={(val) => updateSettings({ showToleranceBand: val })}
        />
      </div>
    );
  },
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
~~~~~

~~~~~act
patch_file
src/cards/color_all/index.tsx
~~~~~
~~~~~typescript.old
import type { ColorSenseSettings } from '../../storage/settings';
import { ColorAllView } from './ColorAllView';
import enUS from './locales/en-US.json';
~~~~~
~~~~~typescript.new
import { SettingToggleItem } from '../../components/settings/common/SettingToggleItem';
import { useCardTranslation } from '../../core/i18n';
import type { ColorSenseSettings } from '../../storage/settings';
import { ColorAllView } from './ColorAllView';
import enUS from './locales/en-US.json';
~~~~~

~~~~~act
patch_file
src/cards/color_all/index.tsx
~~~~~
~~~~~typescript.old
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: 'settings.showToleranceBandTitle',
      description: 'settings.showToleranceBandDesc',
    },
    {
      type: 'toggle',
      key: 'enableHoverColorPreview',
      title: 'settings.enableHoverColorPreviewTitle',
      description: 'settings.enableHoverColorPreviewDesc',
    },
  ],
  defaultSettings: {
~~~~~
~~~~~typescript.new
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  renderSettings: ({ settings, updateSettings }) => {
    const { t } = useCardTranslation('color_all');
    return (
      <div className="space-y-4">
        <SettingToggleItem
          title={t('settings.showToleranceBandTitle')}
          description={t('settings.showToleranceBandDesc')}
          checked={settings.showToleranceBand as boolean ?? true}
          onChange={(val) => updateSettings({ showToleranceBand: val })}
        />
        <SettingToggleItem
          title={t('settings.enableHoverColorPreviewTitle')}
          description={t('settings.enableHoverColorPreviewDesc')}
          checked={settings.enableHoverColorPreview as boolean ?? true}
          onChange={(val) => updateSettings({ enableHoverColorPreview: val })}
        />
      </div>
    );
  },
  defaultSettings: {
~~~~~

#### Acts 5: 复杂卡片自治组件插槽迁移（第三组：带有扇区靶向圈选与尺寸切换的模块）

这是本次重构的核心痛点。原来为了兼容这里的业务（如下方多选扇区、多选网格尺寸），底层实现被写死了好几种“组件形态”；现在它们直接在业务自身内部调用基础组件解决，解耦成功。

~~~~~act
patch_file
src/cards/color_hue/index.tsx
~~~~~
~~~~~typescript.old
import type { ColorSenseSettings } from '../../storage/settings';
import { ColorHueView } from './ColorHueView';
import { createColorHueAnalytics } from './analytics';
import enUS from './locales/en-US.json';
~~~~~
~~~~~typescript.new
import { SettingToggleItem } from '../../components/settings/common/SettingToggleItem';
import { TargetingSection } from '../../components/settings/common/TargetingSection';
import { useCardTranslation } from '../../core/i18n';
import type { ColorSenseSettings } from '../../storage/settings';
import { ColorHueView } from './ColorHueView';
import { createColorHueAnalytics } from './analytics';
import enUS from './locales/en-US.json';
~~~~~

~~~~~act
patch_file
src/cards/color_hue/index.tsx
~~~~~
~~~~~typescript.old
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: 'settings.showToleranceBandTitle',
      description: 'settings.showToleranceBandDesc',
    },
    {
      type: 'targeting',
      modeKey: 'targetingMode',
      sectorsKey: 'manualTargetSectors',
      title: 'settings.targetingTitle',
      subTitle: 'settings.targetingSubTitle',
      sectors: COLOR_SECTOR_KEYS,
      gridCols: 'grid-cols-3',
    },
  ],
  defaultSettings: {
~~~~~
~~~~~typescript.new
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  renderSettings: ({ settings, updateSettings }) => {
    const { t } = useCardTranslation('color_hue');
    return (
      <div className="space-y-4">
        <SettingToggleItem
          title={t('settings.showToleranceBandTitle')}
          description={t('settings.showToleranceBandDesc')}
          checked={settings.showToleranceBand as boolean ?? true}
          onChange={(val) => updateSettings({ showToleranceBand: val })}
        />
        <TargetingSection
          title={t('settings.targetingTitle')}
          subTitle={t('settings.targetingSubTitle')}
          mode={settings.targetingMode ?? 'off'}
          onModeChange={(m) => updateSettings({ targetingMode: m })}
          sectors={COLOR_SECTOR_KEYS}
          selectedSectors={settings.manualTargetSectors ?? []}
          onToggleSector={(idx) => {
            const current = settings.manualTargetSectors ?? [];
            const next = current.includes(idx)
              ? current.filter((s) => s !== idx)
              : [...current, idx];
            updateSettings({ manualTargetSectors: next });
          }}
          gridCols="grid-cols-3"
        />
      </div>
    );
  },
  defaultSettings: {
~~~~~

~~~~~act
patch_file
src/cards/star_single/index.tsx
~~~~~
~~~~~typescript.old
import type { StarSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { StarSingleView } from './StarSingleView';
import { createStarSingleAnalytics } from './analytics';
import enUS from './locales/en-US.json';
~~~~~
~~~~~typescript.new
import { TargetingSection } from '../../components/settings/common/TargetingSection';
import { Button } from '../../components/ui/button';
import { useCardTranslation } from '../../core/i18n';
import type { StarSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { StarSingleView } from './StarSingleView';
import { createStarSingleAnalytics } from './analytics';
import enUS from './locales/en-US.json';
~~~~~

~~~~~act
patch_file
src/cards/star_single/index.tsx
~~~~~
~~~~~typescript.old
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'buttonGroup',
      key: 'gridSize',
      title: 'settings.gridSizeTitle',
      options: [
        { label: '2x2', value: 2 },
        { label: '3x3', value: 3 },
        { label: '4x4', value: 4 },
        { label: '5x5', value: 5 },
      ],
      gridCols: 'grid-cols-4',
    },
    {
      type: 'targeting',
      modeKey: 'targetingMode',
      sectorsKey: 'manualTargetSectors',
      title: 'settings.targetingTitle',
      subTitle: 'settings.targetingSubTitle',
      sectors: SECTOR_KEYS,
      gridCols: 'grid-cols-4',
    },
  ],
  defaultSettings: {
~~~~~
~~~~~typescript.new
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  renderSettings: ({ settings, updateSettings }) => {
    const { t } = useCardTranslation('star_single');
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">{t('settings.gridSizeTitle')}</div>
          <div className="grid grid-cols-4 gap-1.5">
            {[2, 3, 4, 5].map((size) => (
              <Button
                key={size}
                variant={settings.gridSize === size ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSettings({ gridSize: size })}
                className="py-2 h-auto"
              >
                {size}x{size}
              </Button>
            ))}
          </div>
        </div>
        <TargetingSection
          title={t('settings.targetingTitle')}
          subTitle={t('settings.targetingSubTitle')}
          mode={settings.targetingMode ?? 'off'}
          onModeChange={(m) => updateSettings({ targetingMode: m })}
          sectors={SECTOR_KEYS}
          selectedSectors={settings.manualTargetSectors ?? []}
          onToggleSector={(idx) => {
            const current = settings.manualTargetSectors ?? [];
            const next = current.includes(idx)
              ? current.filter((s) => s !== idx)
              : [...current, idx];
            updateSettings({ manualTargetSectors: next });
          }}
          gridCols="grid-cols-4"
        />
      </div>
    );
  },
  defaultSettings: {
~~~~~

~~~~~act
patch_file
src/cards/star_double_h/index.tsx
~~~~~
~~~~~typescript.old
import type { StarSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { StarDoubleHView } from './StarDoubleHView';
import { createStarDoubleHAnalytics } from './analytics';
import enUS from './locales/en-US.json';
~~~~~
~~~~~typescript.new
import { TargetingSection } from '../../components/settings/common/TargetingSection';
import { Button } from '../../components/ui/button';
import { useCardTranslation } from '../../core/i18n';
import type { StarSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { StarDoubleHView } from './StarDoubleHView';
import { createStarDoubleHAnalytics } from './analytics';
import enUS from './locales/en-US.json';
~~~~~

~~~~~act
patch_file
src/cards/star_double_h/index.tsx
~~~~~
~~~~~typescript.old
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'buttonGroup',
      key: 'gridSize',
      title: 'settings.gridSizeTitle',
      options: [
        { label: '2x2', value: 2 },
        { label: '3x3', value: 3 },
        { label: '4x4', value: 4 },
        { label: '5x5', value: 5 },
      ],
      gridCols: 'grid-cols-4',
    },
    {
      type: 'targeting',
      modeKey: 'targetingMode',
      sectorsKey: 'manualTargetSectors',
      title: 'settings.targetingTitle',
      subTitle: 'settings.targetingSubTitle',
      sectors: SECTOR_KEYS,
      gridCols: 'grid-cols-4',
    },
  ],
  defaultSettings: {
~~~~~
~~~~~typescript.new
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  renderSettings: ({ settings, updateSettings }) => {
    const { t } = useCardTranslation('star_double_h');
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">{t('settings.gridSizeTitle')}</div>
          <div className="grid grid-cols-4 gap-1.5">
            {[2, 3, 4, 5].map((size) => (
              <Button
                key={size}
                variant={settings.gridSize === size ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSettings({ gridSize: size })}
                className="py-2 h-auto"
              >
                {size}x{size}
              </Button>
            ))}
          </div>
        </div>
        <TargetingSection
          title={t('settings.targetingTitle')}
          subTitle={t('settings.targetingSubTitle')}
          mode={settings.targetingMode ?? 'off'}
          onModeChange={(m) => updateSettings({ targetingMode: m })}
          sectors={SECTOR_KEYS}
          selectedSectors={settings.manualTargetSectors ?? []}
          onToggleSector={(idx) => {
            const current = settings.manualTargetSectors ?? [];
            const next = current.includes(idx)
              ? current.filter((s) => s !== idx)
              : [...current, idx];
            updateSettings({ manualTargetSectors: next });
          }}
          gridCols="grid-cols-4"
        />
      </div>
    );
  },
  defaultSettings: {
~~~~~

~~~~~act
patch_file
src/cards/star_double_r/index.tsx
~~~~~
~~~~~typescript.old
import type { StarSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { StarDoubleRView } from './StarDoubleRView';
import { createStarDoubleRAnalytics } from './analytics';
import enUS from './locales/en-US.json';
~~~~~
~~~~~typescript.new
import { TargetingSection } from '../../components/settings/common/TargetingSection';
import { Button } from '../../components/ui/button';
import { useCardTranslation } from '../../core/i18n';
import type { StarSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { StarDoubleRView } from './StarDoubleRView';
import { createStarDoubleRAnalytics } from './analytics';
import enUS from './locales/en-US.json';
~~~~~

~~~~~act
patch_file
src/cards/star_double_r/index.tsx
~~~~~
~~~~~typescript.old
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'buttonGroup',
      key: 'gridSize',
      title: 'settings.gridSizeTitle',
      options: [
        { label: '2x2', value: 2 },
        { label: '3x3', value: 3 },
        { label: '4x4', value: 4 },
        { label: '5x5', value: 5 },
      ],
      gridCols: 'grid-cols-4',
    },
    {
      type: 'targeting',
      modeKey: 'targetingMode',
      sectorsKey: 'manualTargetSectors',
      title: 'settings.targetingTitle',
      subTitle: 'settings.targetingSubTitle',
      sectors: SECTOR_KEYS,
      gridCols: 'grid-cols-4',
    },
  ],
  defaultSettings: {
~~~~~
~~~~~typescript.new
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  renderSettings: ({ settings, updateSettings }) => {
    const { t } = useCardTranslation('star_double_r');
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">{t('settings.gridSizeTitle')}</div>
          <div className="grid grid-cols-4 gap-1.5">
            {[2, 3, 4, 5].map((size) => (
              <Button
                key={size}
                variant={settings.gridSize === size ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSettings({ gridSize: size })}
                className="py-2 h-auto"
              >
                {size}x{size}
              </Button>
            ))}
          </div>
        </div>
        <TargetingSection
          title={t('settings.targetingTitle')}
          subTitle={t('settings.targetingSubTitle')}
          mode={settings.targetingMode ?? 'off'}
          onModeChange={(m) => updateSettings({ targetingMode: m })}
          sectors={SECTOR_KEYS}
          selectedSectors={settings.manualTargetSectors ?? []}
          onToggleSector={(idx) => {
            const current = settings.manualTargetSectors ?? [];
            const next = current.includes(idx)
              ? current.filter((s) => s !== idx)
              : [...current, idx];
            updateSettings({ manualTargetSectors: next });
          }}
          gridCols="grid-cols-4"
        />
      </div>
    );
  },
  defaultSettings: {
~~~~~

### 下一步建议

我们已经完全成功地完成了阶段一到阶段四的彻底架构清理，消灭了过渡工程：
1. **已删除** `SettingFieldSchema` 和 `DynamicDomainSettings`。
2. **已重构** 14 个卡片的各自配置逻辑为原生 React / Preact 闭包形态，它们现在拥有全权自治的渲染与国际化文案调度。

如果你还有针对重构遗留代码的静态检查与部署构建（即 Phase 5 的内容），我们可以继续执行清理静态构建工具。如果一切准备就绪，可以运行测试用例或者构建看是否有遗漏错误。
