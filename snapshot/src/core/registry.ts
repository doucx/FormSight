import { getTrialRecordsByCard } from '../storage/db/queries';
import type {
  CardDefinition,
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../types/card';
import { UNIVERSAL_ANALYTICS_VIEWS } from './analytics/universalViews';
import type { CardManifest, CardAnalyticsView as FlatCardAnalyticsView } from './cardContract';
import type { CardAnalyticsPlugin } from './contracts';
import { getCardDesc, getCardTitle, i18n } from './i18n';

/**
 * 递归补全卡片相对多语言 Key
 */
export function qualifyCardKey(key: string | undefined, cardId: string): string | undefined {
  if (!key) return undefined;
  if (key.startsWith('cards.') || key.startsWith('global.')) {
    return key;
  }
  return `cards.${cardId}.${key.replace(/^\./, '')}`;
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

  public clear(): void {
    this.domainMap.clear();
    this.pathMap.clear();
    this.challengeMap.clear();
    this.interactionMap.clear();
    this.statusMap.clear();
  }

  public indexCard(card: CardDefinition): void {
    const id = card.id;

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
}

class SystemDomainRegistry {
  private cardManifestMap = new Map<string, CardManifest>();
  private cardMap = new Map<string, CardDefinition>();
  private cardAnalyticsMap = new Map<string, CardAnalyticsPlugin>();
  private invertedIndex = new InvertedCardIndex();

  constructor() {
    this.autoDiscover();
  }

  /**
   * 自动扫描所有独立 Flat Cards 清单
   */
  private autoDiscover(): void {
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

    // 2. 构建标准 CardDefinition
    const icon = card.ui?.icon ?? card.icon!;
    const cardDef: CardDefinition = {
      id: card.id,
      domain: card.domain,
      icon,
      tags: card.tags,
      hasWeaknessAnalytics: Boolean(card.analytics?.views?.length),
      defaultSettings: card.defaultSettings,
    };

    this.cardMap.set(card.id, cardDef);
    this.invertedIndex.indexCard(cardDef);

    // 4. 注册卡片专属分析插件
    if (card.analytics?.views) {
      this.cardAnalyticsMap.set(card.id, {
        cardId: card.id,
        fetchRecords: card.analytics.fetchRecords ?? ((id) => getTrialRecordsByCard(id)),
        views: qualifyAnalyticsViews(card.analytics.views, card.id),
      });
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
        results = results.filter((c) => {
          if (c.id.toLowerCase().includes(kw)) return true;

          const title = getCardTitle(c).toLowerCase();
          if (title.includes(kw)) return true;

          const desc = getCardDesc(c).toLowerCase();
          if (desc.includes(kw)) return true;

          const instructionKey = `cards.${c.id}.instruction`;
          const instruction = i18n.t(instructionKey);
          if (instruction !== instructionKey && instruction.toLowerCase().includes(kw)) {
            return true;
          }

          return false;
        });
      }
    }

    return results;
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
