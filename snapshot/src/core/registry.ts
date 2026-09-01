import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';
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
import type { CardAnalyticsView as FlatCardAnalyticsView, CardManifest } from './cardContract';
import type { CardAnalyticsPlugin, PackManifest } from './contracts';
import { i18n } from './i18n';

/**
 * 递归补全卡片相对多语言 Key
 */
export function qualifyCardKey(key: string | undefined, cardId: string): string | undefined {
  if (!key) return undefined;
  if (key.startsWith('cards.') || key.startsWith('global.') || key.startsWith('packs.')) {
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
    const s = { ...schema };
    if (s.title) s.title = qualifyCardKey(s.title, cardId) ?? s.title;
    if (s.subTitle) s.subTitle = qualifyCardKey(s.subTitle, cardId);
    if (s.type === 'targeting' && Array.isArray(s.sectors)) {
      s.sectors = s.sectors.map((sec) => qualifyCardKey(sec, cardId) ?? sec);
    }
    if (s.options) {
      s.options = s.options.map((opt) => ({
        ...opt,
        label: qualifyCardKey(opt.label, cardId) ?? opt.label,
      }));
    }
    return s;
  });
}

export function qualifyAnalyticsViews(
  views: FlatCardAnalyticsView[] | undefined,
  cardId: string,
): FlatCardAnalyticsView[] {
  if (!views) return [];
  return views.map((v) => ({
    ...v,
    tabLabel: qualifyCardKey(v.tabLabel, cardId) ?? v.tabLabel,
    title: qualifyCardKey(v.title, cardId) ?? v.title,
    subTitle: qualifyCardKey(v.subTitle, cardId) ?? v.subTitle,
  }));
}

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
  private cardManifestMap = new Map<string, CardManifest>();
  private cardMap = new Map<string, CardDefinition>();
  private cardPluginMap = new Map<string, AnyTrainingPlugin>();
  private cardAnalyticsMap = new Map<string, CardAnalyticsPlugin>();
  private invertedIndex = new InvertedCardIndex();

  constructor() {
    this.autoDiscover();
  }

  /**
   * 自动扫描：双轨兼容旧 packs 与新 flat cards
   */
  private autoDiscover(): void {
    // 1. 扫描旧版 packs (绞杀期兼容)
    const packModules = import.meta.glob<{ default: PackManifest }>('../packs/*/index.ts', {
      eager: true,
    });

    for (const path in packModules) {
      const manifest = packModules[path]?.default;
      if (manifest) this.register(manifest);
    }

    // 2. 扫描新版 flat cards (具有更高覆盖优先级)
    const cardModules = import.meta.glob<{ default: CardManifest }>(
      ['../cards/*/index.ts', '../cards/*/index.tsx'],
      { eager: true },
    );

    for (const path in cardModules) {
      const manifest = cardModules[path]?.default;
      if (manifest?.id) this.registerCard(manifest);
    }
  }

  public registerCard(card: CardManifest): void {
    this.cardManifestMap.set(card.id, card);

    // 1. 挂载卡片专属语言包
    if (card.locales) {
      i18n.registerCardLocales(card.id, card.locales);
    }

    // 2. 自动修饰并注册 SettingSchemas 相对 key
    const normalizedSchemas = qualifySchemas(card.settingSchemas, card.id);

    // 3. 构建标准 CardDefinition
    const cardDef: CardDefinition = {
      id: card.id,
      packId: card.domain,
      mode: card.id,
      icon: card.icon,
      tags: card.tags,
      hasWeaknessAnalytics: Boolean(card.analytics?.views?.length),
      settingSchemas: normalizedSchemas,
    };

    // 4. 适配 AnyTrainingPlugin 运行时
    const pluginAdapter: AnyTrainingPlugin = {
      title: card.id,
      getModeBadge: () => card.id,
      isTargeting: (_m, s) => card.training.isTargeting?.(s) ?? false,
      generateQuestion: (_m, lvl, s) => card.training.generateQuestion(lvl, s),
      evaluateAnswer: (u, q) => card.training.evaluateAnswer(u, q),
      isHit: (res) => card.training.isHit(res),
      getQuestionLevel: (q) =>
        card.training.getQuestionLevel?.(q) ??
        (q as { difficultyLevel?: number })?.difficultyLevel ??
        5,
      extractRecordDetails: (q, h, u) =>
        card.training.extractRecordDetails?.(q, h, u) ?? {},
      renderCanvas: (props) => card.training.renderCanvas(props),
    };

    this.cardMap.set(card.id, cardDef);
    this.cardPluginMap.set(card.id, pluginAdapter);
    this.invertedIndex.indexCard(cardDef);

    // 5. 注册卡片专属分析插件
    if (card.analytics?.views) {
      this.cardAnalyticsMap.set(card.id, {
        cardId: card.id,
        fetchRecords: card.analytics.fetchRecords ?? ((id) => getTrialRecordsByCard(id)),
        views: qualifyAnalyticsViews(card.analytics.views, card.id),
      });
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

  public getCardManifest(cardId: string): CardManifest | undefined {
    return this.cardManifestMap.get(cardId);
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
