import { useMemo, useState } from 'preact/hooks';
import { registry } from '../core/registry';
import type {
  CardDefinition,
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../types/card';

export interface UseCardFilterOptions {
  initialQuery?: CardQueryOptions;
  onQueryChange?: (query: CardQueryOptions) => void;
}

export function useCardFilter(options: UseCardFilterOptions = {}) {
  const [query, setQuery] = useState<CardQueryOptions>(options.initialQuery || {});

  const updateQuery = (nextQuery: CardQueryOptions) => {
    setQuery(nextQuery);
    options.onQueryChange?.(nextQuery);
  };

  const handleSearchChange = (val: string) => {
    updateQuery({
      ...query,
      searchKeyword: val || undefined,
    });
  };

  const toggleDomain = (domain: VisualDomainTag) => {
    const current = query.domains || [];
    const next = current.includes(domain)
      ? current.filter((d) => d !== domain)
      : [...current, domain];
    updateQuery({ ...query, domains: next.length > 0 ? next : undefined });
  };

  const togglePath = (path: CognitivePathTag) => {
    const current = query.paths || [];
    const next = current.includes(path) ? current.filter((p) => p !== path) : [...current, path];
    updateQuery({ ...query, paths: next.length > 0 ? next : undefined });
  };

  const toggleChallenge = (challenge: MentalChallengeTag) => {
    const current = query.challenges || [];
    const next = current.includes(challenge)
      ? current.filter((c) => c !== challenge)
      : [...current, challenge];
    updateQuery({ ...query, challenges: next.length > 0 ? next : undefined });
  };

  const toggleInteraction = (interaction: InteractionTag) => {
    const current = query.interactions || [];
    const next = current.includes(interaction)
      ? current.filter((i) => i !== interaction)
      : [...current, interaction];
    updateQuery({ ...query, interactions: next.length > 0 ? next : undefined });
  };

  const toggleStatus = (status: CardStatusTag) => {
    const current = query.statuses || [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    updateQuery({ ...query, statuses: next.length > 0 ? next : undefined });
  };

  const handleSelectPack = (packId?: string) => {
    updateQuery({
      ...query,
      packId: packId || undefined,
    });
  };

  const toggleAdvancedOpen = () => {
    updateQuery({
      ...query,
      showAdvanced: !query.showAdvanced,
    });
  };

  const handleResetFilters = () => {
    updateQuery(query.showAdvanced ? { showAdvanced: true } : {});
  };

  const hasActiveFilters = Boolean(
    query.searchKeyword ||
      query.packId ||
      (query.domains && query.domains.length > 0) ||
      (query.paths && query.paths.length > 0) ||
      (query.challenges && query.challenges.length > 0) ||
      (query.interactions && query.interactions.length > 0) ||
      (query.statuses && query.statuses.length > 0),
  );

  const matchedCards: CardDefinition[] = useMemo(() => {
    return registry.queryCards(query);
  }, [query]);

  return {
    query,
    setQuery: updateQuery,
    matchedCards,
    totalMatches: matchedCards.length,
    hasActiveFilters,
    isAdvancedOpen: Boolean(query.showAdvanced),
    handleSearchChange,
    toggleDomain,
    togglePath,
    toggleChallenge,
    toggleInteraction,
    toggleStatus,
    handleSelectPack,
    toggleAdvancedOpen,
    handleResetFilters,
  };
}
