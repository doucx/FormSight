import type { DomainMeta } from '../config/domains';
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db/schema';
import type { CardAnalyticsPlugin, DomainManifest } from './contracts';

class SystemDomainRegistry {
  private domains = new Map<TrainingDomain, DomainManifest>();
  private cardMap = new Map<string, CardDefinition>();
  private cardPluginMap = new Map<string, AnyTrainingPlugin>();
  private cardAnalyticsMap = new Map<string, CardAnalyticsPlugin>();

  constructor() {
    this.autoDiscoverDomains();
  }

  /**
   * 自动扫描 src/domains/*\/index.ts 零中心注册所有领域模块
   */
  private autoDiscoverDomains(): void {
    const modules = import.meta.glob<{ default: DomainManifest }>('../domains/*/index.ts', {
      eager: true,
    });

    for (const path in modules) {
      const manifest = modules[path]?.default;
      if (manifest?.domain) {
        this.register(manifest);
      }
    }
  }

  public register(manifest: DomainManifest): void {
    this.domains.set(manifest.domain, manifest);

    for (const card of manifest.cards) {
      this.cardMap.set(card.id, card);
      this.cardPluginMap.set(card.id, manifest.trainingPlugin);
    }

    if (manifest.analyticsPlugins) {
      for (const [cardId, plugin] of Object.entries(manifest.analyticsPlugins)) {
        this.cardAnalyticsMap.set(cardId, plugin);
      }
    }
  }

  public getAllDomains(): TrainingDomain[] {
    return Array.from(this.domains.keys());
  }

  public getAllDomainMetas(): DomainMeta[] {
    return Array.from(this.domains.values()).map((d) => d.meta);
  }

  public getDomainManifest(domain: TrainingDomain): DomainManifest | undefined {
    return this.domains.get(domain);
  }

  public getDomainMeta(domain: TrainingDomain): DomainMeta | undefined {
    return this.domains.get(domain)?.meta;
  }

  public getCardsByDomain(domain: TrainingDomain): CardDefinition[] {
    return this.domains.get(domain)?.cards || [];
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
    return this.domains.has(domain as TrainingDomain);
  }
}

export const registry = new SystemDomainRegistry();
