import type { AnyTrainingPlugin } from '../core/contracts';
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
import type { AnyCardManifest, CardAnalyticsPlugin, PackManifest } from './contracts';
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
  private packs = new Map<string, PackManifest>();
  private cardMap = new Map<string, CardDefinition>();
  private cardPluginMap = new Map<string, AnyTrainingPlugin>();
  private cardAnalyticsMap = new Map<string, CardAnalyticsPlugin>();
  private cardDefaultsMap = new Map<string, Record<string, unknown>>();
  private invertedIndex = new InvertedCardIndex();

  constructor() {
    this.autoDiscover();
  }

  /**
   * 自动扫描模块：
   * 1. 扫描新架构 src/modules/**\/index.ts 注册单卡片 CardManifest
   * 2. 兼容扫描存量 src/packs/**\/index.ts 注册 PackManifest
   */
  private autoDiscover(): void {
    // 1. 扫描新版独立 CardManifest (支持 .ts 与 .tsx)
    const cardModules = import.meta.glob<{
      default?: AnyCardManifest | AnyCardManifest[];
      [key: string]: unknown;
    }>('../modules/**/index.{ts,tsx}', {
      eager: true,
    });

    for (const path in cardModules) {
      const mod = cardModules[path];
      if (!mod) continue;

      if (mod.default) {
        if (Array.isArray(mod.default)) {
          for (const card of mod.default) {
            if (card?.id && card.training) this.registerCard(card);
          }
        } else if (
          typeof mod.default === 'object' &&
          'id' in mod.default &&
          'training' in mod.default
        ) {
          this.registerCard(mod.default as AnyCardManifest);
        }
      }

      // 支持具名导出 CardManifest
      for (const [key, value] of Object.entries(mod)) {
        if (
          key !== 'default' &&
          value &&
          typeof value === 'object' &&
          'id' in value &&
          'training' in value
        ) {
          this.registerCard(value as AnyCardManifest);
        }
      }
    }

    // 2. 兼容扫描存量 PackManifest
    const packModules = import.meta.glob<{ default: PackManifest }>('../packs/*/index.ts', {
      eager: true,
    });

    for (const path in packModules) {
      const manifest = packModules[path]?.default;
      if (manifest) this.register(manifest);
    }
  }

  /**
   * 注册独立卡片 (CardManifest 一等公民注册入口)
   */
  public registerCard(manifest: AnyCardManifest): void {
    const groupId = manifest.groupId || 'core';
    const cardMode = manifest.mode || manifest.id;

    // 1. 挂载私有多语言
    if (manifest.locales) {
      i18n.registerCardLocales(manifest.id, manifest.locales);
    }

    // 2. 归一化为 CardDefinition 视图层描述
    const normalizedCard: CardDefinition = {
      id: manifest.id,
      packId: groupId,
      mode: cardMode,
      icon: manifest.icon,
      tags: manifest.tags,
      hasWeaknessAnalytics: manifest.hasWeaknessAnalytics,
      settingSchemas: manifest.settingSchemas,
    };

    this.cardMap.set(manifest.id, normalizedCard);
    this.invertedIndex.indexCard(normalizedCard);

    // 3. 记录卡片默认设置项
    if (manifest.defaultSettings) {
      this.cardDefaultsMap.set(manifest.id, manifest.defaultSettings);
    }

    // 4. 将卡片独立 training 逻辑封装为兼容的 TrainingPlugin
    const cardPlugin: AnyTrainingPlugin = {
      packId: groupId,
      title: manifest.id,
      getModeBadge: (m) => m,
      isTargeting: manifest.training.isTargeting
        ? (_m, settings) => Boolean(manifest.training.isTargeting?.(settings))
        : undefined,
      generateQuestion: (_m, level, settings) =>
        manifest.training.generateQuestion(level, settings),
      evaluateAnswer: (userVal, q) => manifest.training.evaluateAnswer(userVal, q),
      isHit: (hitResult) => manifest.training.isHit(hitResult),
      getQuestionLevel: manifest.training.getQuestionLevel
        ? (q) =>
            manifest.training.getQuestionLevel?.(q) ??
            (q as { difficultyLevel: number })?.difficultyLevel ??
            1
        : (q) => (q as { difficultyLevel: number })?.difficultyLevel ?? 1,
      extractRecordDetails: manifest.training.extractRecordDetails
        ? (q, hitResult, userVal, mode) => ({
            mode,
            ...(manifest.training.extractRecordDetails?.(q, hitResult, userVal) || {}),
          })
        : (_q, _hitResult, userVal, mode) => ({ mode, userAnswer: userVal }),
      renderCanvas: manifest.training.renderCanvas,
    };

    this.cardPluginMap.set(manifest.id, cardPlugin);

    // 5. 注册分析视图插件
    if (manifest.analytics) {
      const analyticsPlugin: CardAnalyticsPlugin = {
        cardId: manifest.id,
        fetchRecords: manifest.analytics.fetchRecords || ((id) => getTrialRecordsByCard(id)),
        views: manifest.analytics.views || [],
      };
      this.cardAnalyticsMap.set(manifest.id, analyticsPlugin);
    }
  }

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

  public getCardDefaultSettings(cardId: string): Record<string, unknown> | undefined {
    return this.cardDefaultsMap.get(cardId);
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
}

export const registry = new SystemDomainRegistry();
