import type { AnyCardManifest, AnyTrainingPlugin, CardAnalyticsPlugin, PackManifest } from '../core/contracts';
import { getTrialRecordsByCard } from '../storage/db/queries';
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
import { UNIVERSAL_ANALYTICS_VIEWS } from './analytics/universalViews';
import { i18n } from './i18n';

class InvertedCardIndex {
  private domainMap = new Map<VisualDomainTag, Set<string>>();
  private pathMap = new Map<CognitivePathTag, Set<string>>();
  private challengeMap = new Map<MentalChallengeTag, Set<string>>();
  private interactionMap = new Map<InteractionTag, Set<string>>();
  private statusMap = new Map<CardStatusTag, Set<string>>();
  private packMap = new Map<string, Set<string>>();

  public clear(): void {
    this.domainMap.clear();
    this.pathMap.clear();
    this.challengeMap.clear();
    this.interactionMap.clear();
    this.statusMap.clear();
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
      for (const d of card.tags.domain || []) {
        let set = this.domainMap.get(d);
        if (!set) {
          set = new Set();
          this.domainMap.set(d, set);
        }
        set.add(id);
      }

      for (const p of card.tags.path || []) {
        let set = this.pathMap.get(p);
        if (!set) {
          set = new Set();
          this.pathMap.set(p, set);
        }
        set.add(id);
      }

      for (const c of card.tags.challenge || []) {
        let set = this.challengeMap.get(c);
        if (!set) {
          set = new Set();
          this.challengeMap.set(c, set);
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

      const status: CardStatusTag = card.tags.status || 'stable';
      let stSet = this.statusMap.get(status);
      if (!stSet) {
        stSet = new Set();
        this.statusMap.set(status, stSet);
      }
      stSet.add(id);
    }
  }

  public getCardIdsByDomain(domain: VisualDomainTag): Set<string> {
    return this.domainMap.get(domain) || new Set();
  }

  public getCardIdsByPath(path: CognitivePathTag): Set<string> {
    return this.pathMap.get(path) || new Set();
  }

  public getCardIdsByChallenge(challenge: MentalChallengeTag): Set<string> {
    return this.challengeMap.get(challenge) || new Set();
  }

  public getCardIdsByInteraction(interaction: InteractionTag): Set<string> {
    return this.interactionMap.get(interaction) || new Set();
  }

  public getCardIdsByStatus(status: CardStatusTag): Set<string> {
    return this.statusMap.get(status) || new Set();
  }

  public getCardIdsByPack(packId: string): Set<string> {
    return this.packMap.get(packId) || new Set();
  }
}

class SystemDomainRegistry {
  private cards = new Map<string, AnyCardManifest>();
  private packs = new Map<string, PackManifest>();
  private cardMap = new Map<string, CardDefinition>();
  private cardPluginMap = new Map<string, AnyTrainingPlugin>();
  private cardAnalyticsMap = new Map<string, CardAnalyticsPlugin>();
  private invertedIndex = new InvertedCardIndex();

  constructor() {
    this.autoDiscover();
  }

  /**
   * 自动扫描：支持新版 `src/modules/**\/index.ts` (CardManifest) 与遗留 `src/packs/*\/index.ts`
   */
  private autoDiscover(): void {
    // 1. 扫描新架构单卡片 Manifest
    const cardModules = import.meta.glob<{ default?: AnyCardManifest | PackManifest }>(
      '../modules/**/index.ts',
      { eager: true },
    );

    for (const path in cardModules) {
      const manifest = cardModules[path]?.default;
      if (manifest && 'training' in manifest && 'id' in manifest) {
        this.registerCard(manifest as AnyCardManifest);
      }
    }

    // 2. 扫描遗留 PackManifest (过渡兼容)
    const packModules = import.meta.glob<{ default?: PackManifest }>(
      '../packs/*/index.ts',
      { eager: true },
    );

    for (const path in packModules) {
      const manifest = packModules[path]?.default;
      if (manifest && manifest.packId && manifest.cards) {
        this.register(manifest);
      }
    }
  }

  /**
   * 注册独立卡片 (一等公民架构)
   */
  public registerCard(manifest: AnyCardManifest): void {
    this.cards.set(manifest.id, manifest);

    // 挂载卡片私有字典
    if (manifest.locales) {
      i18n.registerCardLocales(manifest.id, manifest.locales);
    }

    const normalizedCard: CardDefinition = {
      id: manifest.id,
      packId: manifest.groupId || manifest.domain,
      mode: manifest.id,
      icon: manifest.icon,
      tags: manifest.tags,
      hasWeaknessAnalytics: Boolean(manifest.analytics && manifest.analytics.views.length > 0),
      settingSchemas: manifest.settingSchemas,
    };

    this.cardMap.set(manifest.id, normalizedCard);

    // 适配旧 TrainingPlugin 调用代理
    const trainingAdapter: AnyTrainingPlugin = {
      title: manifest.id,
      getModeBadge: () => manifest.id,
      isTargeting: (_mode, settings) =>
        manifest.training.isTargeting ? manifest.training.isTargeting(settings) : false,
      generateQuestion: (_mode, level, settings) =>
        manifest.training.generateQuestion(level, settings),
      evaluateAnswer: (userVal, q) => manifest.training.evaluateAnswer(userVal, q),
      isHit: (res) => manifest.training.isHit(res),
      getQuestionLevel: (q) =>
        manifest.training.getQuestionLevel ? manifest.training.getQuestionLevel(q) : 5,
      extractRecordDetails: (q, hitResult, userVal) =>
        manifest.training.extractRecordDetails
          ? manifest.training.extractRecordDetails(q, hitResult, userVal)
          : {},
      renderCanvas: (props) => manifest.training.renderCanvas(props),
    };

    this.cardPluginMap.set(manifest.id, trainingAdapter);

    if (manifest.analytics) {
      this.cardAnalyticsMap.set(manifest.id, {
        cardId: manifest.id,
        fetchRecords: manifest.analytics.fetchRecords ?? ((id) => getTrialRecordsByCard(id)),
        views: manifest.analytics.views,
      });
    }

    this.invertedIndex.indexCard(normalizedCard);
  }

  /**
   * 遗留兼容：注册整包 (PackManifest)
   */
  public register(manifest: PackManifest): void {
    this.packs.set(manifest.packId, manifest);

    if (manifest.locales) {
      i18n.registerPackLocales(manifest.packId, manifest.locales);
    }

    for (const card of manifest.cards) {
      // 若单卡已经独立注册过，则跳过旧包内重复注册
      if (this.cards.has(card.id)) continue;

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
        if (!this.cardAnalyticsMap.has(cardId)) {
          this.cardAnalyticsMap.set(cardId, plugin);
        }
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

    if (options.domains && options.domains.length > 0) {
      const domainUnion = new Set<string>();
      for (const d of options.domains) {
        for (const id of this.invertedIndex.getCardIdsByDomain(d)) {
          domainUnion.add(id);
        }
      }
      intersect(domainUnion);
    }

    if (options.paths && options.paths.length > 0) {
      const pathUnion = new Set<string>();
      for (const p of options.paths) {
        for (const id of this.invertedIndex.getCardIdsByPath(p)) {
          pathUnion.add(id);
        }
      }
      intersect(pathUnion);
    }

    if (options.challenges && options.challenges.length > 0) {
      const challengeUnion = new Set<string>();
      for (const c of options.challenges) {
        for (const id of this.invertedIndex.getCardIdsByChallenge(c)) {
          challengeUnion.add(id);
        }
      }
      intersect(challengeUnion);
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

    if (options.statuses && options.statuses.length > 0) {
      const statusUnion = new Set<string>();
      for (const st of options.statuses) {
        for (const id of this.invertedIndex.getCardIdsByStatus(st)) {
          statusUnion.add(id);
        }
      }
      intersect(statusUnion);
    }

    const idsToFilter: string[] =
      candidateIds === null ? Array.from(this.cardMap.keys()) : Array.from(candidateIds);
    let results = idsToFilter
      .map((id) => this.cardMap.get(id))
      .filter((card): card is CardDefinition => Boolean(card));

    if (options.searchKeyword) {
      const kw = options.searchKeyword.trim().toLowerCase();
      if (kw) {
        results = results.filter(
          (c) =>
            c.title?.toLowerCase().includes(kw) ||
            c.desc?.toLowerCase().includes(kw) ||
            c.id.toLowerCase().includes(kw),
        );
      }
    }

    return results;
  }

  // === 卡片访问接口 ===
  public getCardManifest(cardId: string): AnyCardManifest | undefined {
    return this.cards.get(cardId);
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
    const card = this.cardMap.get(cardId);
    if (!card) return undefined;

    const domainPlugin = this.cardAnalyticsMap.get(cardId);
    const domainViews = domainPlugin?.views ?? [];

    return {
      cardId,
      fetchRecords: domainPlugin?.fetchRecords ?? ((id) => getTrialRecordsByCard(id)),
      views: [...domainViews, ...UNIVERSAL_ANALYTICS_VIEWS],
    };
  }

  // === 遗留 Pack 兼容接口 ===
  public getAllPacks(): PackManifest[] {
    return Array.from(this.packs.values());
  }

  public getPack(packId: string): PackManifest | undefined {
    return this.packs.get(packId);
  }

  public getAllPackMetas(): PackMeta[] {
    return Array.from(this.packs.values()).map((p) => p.meta);
  }
}

export const registry = new SystemDomainRegistry();