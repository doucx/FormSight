import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type {
  CardDefinition,
  CardQueryOptions,
  CognitiveSkillTag,
  InteractionTag,
  PackMeta,
  SensoryTargetTag,
} from '../types/card';
import type { CardAnalyticsPlugin, PackManifest } from './contracts';

class InvertedCardIndex {
  private targetMap = new Map<SensoryTargetTag, Set<string>>();
  private skillMap = new Map<CognitiveSkillTag, Set<string>>();
  private interactionMap = new Map<InteractionTag, Set<string>>();
  private packMap = new Map<string, Set<string>>();

  public clear(): void {
    this.targetMap.clear();
    this.skillMap.clear();
    this.interactionMap.clear();
    this.packMap.clear();
  }

  public indexCard(card: CardDefinition): void {
    const id = card.id;

    if (card.packId) {
      let set = this.packMap.get(card.packId);
      if (!set) {
        set = new Set();
        this.packMap.set(card.packId, set);
      }
      set.add(id);
    }

    if (card.tags) {
      for (const t of card.tags.target || []) {
        let set = this.targetMap.get(t);
        if (!set) {
          set = new Set();
          this.targetMap.set(t, set);
        }
        set.add(id);
      }

      for (const s of card.tags.skill || []) {
        let set = this.skillMap.get(s);
        if (!set) {
          set = new Set();
          this.skillMap.set(s, set);
        }
        set.add(id);
      }

      for (const i of card.tags.interaction || []) {
        let set = this.interactionMap.get(i);
        if (!set) {
          set = new Set();
          this.interactionMap.set(i, set);
        }
        set.add(id);
      }
    }
  }

  public getCardIdsByTarget(target: SensoryTargetTag): Set<string> {
    return this.targetMap.get(target) || new Set();
  }

  public getCardIdsBySkill(skill: CognitiveSkillTag): Set<string> {
    return this.skillMap.get(skill) || new Set();
  }

  public getCardIdsByInteraction(interaction: InteractionTag): Set<string> {
    return this.interactionMap.get(interaction) || new Set();
  }

  public getCardIdsByPack(packId: string): Set<string> {
    return this.packMap.get(packId) || new Set();
  }
}

class SystemDomainRegistry {
  private packs = new Map<string, PackManifest>();
  private cardMap = new Map<string, CardDefinition>();
  private cardPluginMap = new Map<string, AnyTrainingPlugin>();
  private cardAnalyticsMap = new Map<string, CardAnalyticsPlugin>();
  private invertedIndex = new InvertedCardIndex();

  constructor() {
    this.autoDiscover();
  }

  /**
   * 自动扫描 src/packs/*\/index.ts 零配置注册
   */
  private autoDiscover(): void {
    const packModules = import.meta.glob<{ default: PackManifest }>('../packs/*/index.ts', {
      eager: true,
    });

    for (const path in packModules) {
      const manifest = packModules[path]?.default;
      if (manifest) this.register(manifest);
    }
  }

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

  /**
   * 基于倒排索引的高性能多维条件卡片查询
   */
  public queryCards(options: CardQueryOptions = {}): CardDefinition[] {
    let candidateIds: Set<string> | null = null;

    const intersect = (set: Set<string>) => {
      if (candidateIds === null) {
        candidateIds = new Set(set);
      } else {
        const next = new Set<string>();
        for (const id of candidateIds) {
          if (set.has(id)) next.add(id);
        }
        candidateIds = next;
      }
    };

    if (options.packId) {
      intersect(this.invertedIndex.getCardIdsByPack(options.packId));
    }

    if (options.targets && options.targets.length > 0) {
      const targetUnion = new Set<string>();
      for (const t of options.targets) {
        for (const id of this.invertedIndex.getCardIdsByTarget(t)) {
          targetUnion.add(id);
        }
      }
      intersect(targetUnion);
    }

    if (options.skills && options.skills.length > 0) {
      const skillUnion = new Set<string>();
      for (const s of options.skills) {
        for (const id of this.invertedIndex.getCardIdsBySkill(s)) {
          skillUnion.add(id);
        }
      }
      intersect(skillUnion);
    }

    if (options.interactions && options.interactions.length > 0) {
      const interactionUnion = new Set<string>();
      for (const i of options.interactions) {
        for (const id of this.invertedIndex.getCardIdsByInteraction(i)) {
          interactionUnion.add(id);
        }
      }
      intersect(interactionUnion);
    }

    const idsToFilter =
      candidateIds === null ? Array.from(this.cardMap.keys()) : Array.from(candidateIds);
    let results = idsToFilter
      .map((id) => this.cardMap.get(id))
      .filter((card): card is CardDefinition => Boolean(card));

    if (!options.includeExperimental) {
      results = results.filter((c) => !c.isExperimental);
    }

    if (options.searchKeyword) {
      const kw = options.searchKeyword.trim().toLowerCase();
      if (kw) {
        results = results.filter(
          (c) =>
            c.title.toLowerCase().includes(kw) ||
            c.desc.toLowerCase().includes(kw) ||
            c.id.toLowerCase().includes(kw),
        );
      }
    }

    return results;
  }

  // === Pack 访问接口 ===
  public getAllPacks(): PackManifest[] {
    return Array.from(this.packs.values());
  }

  public getPack(packId: string): PackManifest | undefined {
    return this.packs.get(packId);
  }

  public getAllPackMetas(): PackMeta[] {
    return Array.from(this.packs.values()).map((p) => p.meta);
  }

  // === 卡片直查接口 ===
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
}

export const registry = new SystemDomainRegistry();