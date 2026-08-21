import type { ComponentChildren } from 'preact';
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db/schema';
import type { BaseModuleSettings } from '../utils/settings';
import type { CardAnalyticsPlugin } from './analyticsPlugins';
import type { DomainMeta } from './domains';
import type { AnyTrainingPlugin } from './trainingPlugins';

// 引入各领域现有卡片与插件资源
import { CARD_ANALYTICS_PLUGINS } from './analyticsPlugins';
import { ALL_CARDS } from './cards';
import { DOMAINS_CONFIG } from './domains';
import { TRAINING_PLUGINS } from './plugins';

export interface DomainPlugin {
  domain: TrainingDomain;
  meta: DomainMeta;
  cards: CardDefinition[];
  trainingPlugin: AnyTrainingPlugin;
  settingSchemas?: SettingFieldSchema[];
  defaultCardSettings?: Record<string, Partial<BaseModuleSettings>>;
  analyticsPlugins?: Record<string, CardAnalyticsPlugin>;
}

class DomainRegistry {
  private plugins = new Map<TrainingDomain, DomainPlugin>();
  private cardMap = new Map<string, CardDefinition>();
  private cardPluginMap = new Map<string, AnyTrainingPlugin>();
  private cardAnalyticsMap = new Map<string, CardAnalyticsPlugin>();

  public register(plugin: DomainPlugin): void {
    this.plugins.set(plugin.domain, plugin);

    for (const card of plugin.cards) {
      this.cardMap.set(card.id, card);
      this.cardPluginMap.set(card.id, plugin.trainingPlugin);
    }

    if (plugin.analyticsPlugins) {
      for (const [cardId, analyticsPlugin] of Object.entries(plugin.analyticsPlugins)) {
        this.cardAnalyticsMap.set(cardId, analyticsPlugin);
      }
    }
  }

  public getAllDomains(): TrainingDomain[] {
    return Array.from(this.plugins.keys());
  }

  public getAllDomainMetas(): DomainMeta[] {
    return Array.from(this.plugins.values()).map((p) => p.meta);
  }

  public getDomainPlugin(domain: TrainingDomain): DomainPlugin | undefined {
    return this.plugins.get(domain);
  }

  public getDomainMeta(domain: TrainingDomain): DomainMeta | undefined {
    return this.plugins.get(domain)?.meta;
  }

  public getCardsByDomain(domain: TrainingDomain): CardDefinition[] {
    return this.plugins.get(domain)?.cards || [];
  }

  public getAllCards(): CardDefinition[] {
    return Array.from(this.cardMap.values());
  }

  public getCardById(cardId: string): CardDefinition | undefined {
    return this.cardMap.get(cardId);
  }

  public getPluginByCardId(cardId: string): AnyTrainingPlugin | undefined {
    return this.cardPluginMap.get(cardId);
  }

  public getAnalyticsPluginByCardId(cardId: string): CardAnalyticsPlugin | undefined {
    return this.cardAnalyticsMap.get(cardId);
  }

  public isRegisteredDomain(domain: string): domain is TrainingDomain {
    return this.plugins.has(domain as TrainingDomain);
  }
}

export const registry = new DomainRegistry();

// 注册所有预设领域
const REGISTERED_DOMAINS: TrainingDomain[] = [
  'angle',
  'star',
  'color',
  'relative_color',
  'negative_space',
  'abstraction',
  'concretization',
];

for (const domain of REGISTERED_DOMAINS) {
  const meta = DOMAINS_CONFIG[domain];
  const cards = ALL_CARDS.filter((c) => c.domain === domain);
  const trainingPlugin = TRAINING_PLUGINS[domain];
  const analyticsPlugins: Record<string, CardAnalyticsPlugin> = {};

  for (const card of cards) {
    if (CARD_ANALYTICS_PLUGINS[card.id]) {
      analyticsPlugins[card.id] = CARD_ANALYTICS_PLUGINS[card.id];
    }
  }

  if (meta && trainingPlugin) {
    registry.register({
      domain,
      meta,
      cards,
      trainingPlugin,
      analyticsPlugins,
    });
  }
}