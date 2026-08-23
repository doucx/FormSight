import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type {
  CardQueryOptions,
  CognitiveSkillTag,
  InteractionTag,
  SensoryTargetTag,
} from '../types/card';

export type RouteLocation =
  | { type: 'home'; query?: CardQueryOptions }
  | { type: 'train'; cardId: string; sessionType: 'training' | 'benchmark' }
  | { type: 'plan-train' };

function parseHomeQuery(params: URLSearchParams): CardQueryOptions | undefined {
  const packId = params.get('pack') || undefined;
  const targets = params.get('targets')?.split(',').filter(Boolean) as
    | SensoryTargetTag[]
    | undefined;
  const skills = params.get('skills')?.split(',').filter(Boolean) as
    | CognitiveSkillTag[]
    | undefined;
  const interactions = params.get('interactions')?.split(',').filter(Boolean) as
    | InteractionTag[]
    | undefined;
  const expParam = params.get('experimental');
  const isExperimental =
    expParam === 'true' ? true : expParam === 'false' ? false : undefined;
  const searchKeyword = params.get('q') || params.get('search') || undefined;

  if (
    !packId &&
    (!targets || targets.length === 0) &&
    (!skills || skills.length === 0) &&
    (!interactions || interactions.length === 0) &&
    isExperimental === undefined &&
    !searchKeyword
  ) {
    return undefined;
  }

  return {
    packId,
    targets: targets && targets.length > 0 ? targets : undefined,
    skills: skills && skills.length > 0 ? skills : undefined,
    interactions: interactions && interactions.length > 0 ? interactions : undefined,
    isExperimental,
    searchKeyword,
  };
}

function parseHash(hash: string): RouteLocation {
  const cleanHash = hash.replace(/^#\/?/, '').trim();
  if (!cleanHash) return { type: 'home' };

  const [pathPart, queryPart] = cleanHash.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  const queryParams = new URLSearchParams(queryPart || '');

  if (segments[0] === 'plan-train') {
    return { type: 'plan-train' };
  }

  if (segments[0] === 'train' && segments[1]) {
    const cardId = segments[1];
    const sessionType = queryParams.get('type') === 'benchmark' ? 'benchmark' : 'training';
    return { type: 'train', cardId, sessionType };
  }

  const homeQuery = parseHomeQuery(queryParams);
  return { type: 'home', query: homeQuery };
}

function stringifyRoute(route: RouteLocation): string {
  if (route.type === 'home') {
    if (!route.query) return '#/';
    const params = new URLSearchParams();
    if (route.query.packId && route.query.packId !== 'all') {
      params.set('pack', route.query.packId);
    }
    if (route.query.targets && route.query.targets.length > 0) {
      params.set('targets', route.query.targets.join(','));
    }
    if (route.query.skills && route.query.skills.length > 0) {
      params.set('skills', route.query.skills.join(','));
    }
    if (route.query.interactions && route.query.interactions.length > 0) {
      params.set('interactions', route.query.interactions.join(','));
    }
    if (route.query.isExperimental !== undefined) {
      params.set('experimental', String(route.query.isExperimental));
    }
    if (route.query.searchKeyword?.trim()) {
      params.set('q', route.query.searchKeyword.trim());
    }
    const qs = params.toString();
    return qs ? `#/?${qs}` : '#/';
  }
  if (route.type === 'plan-train') return '#/plan-train';
  if (route.type === 'train') return `#/train/${route.cardId}?type=${route.sessionType}`;
  return '#/';
}

export function useHashRoute() {
  const [route, setRoute] = useState<RouteLocation>(() =>
    typeof window !== 'undefined' ? parseHash(window.location.hash) : { type: 'home' },
  );

  const scrollPositionsRef = useRef<Record<string, number>>({});
  const currentHashRef = useRef<string>(
    typeof window !== 'undefined' ? window.location.hash || '#/' : '#/',
  );

  useEffect(() => {
    const handleScroll = () => {
      const currentKey = currentHashRef.current || '#/';
      scrollPositionsRef.current[currentKey] = window.scrollY;
    };

    const handleHashChange = () => {
      const prevHash = currentHashRef.current || '#/';
      scrollPositionsRef.current[prevHash] = window.scrollY;

      const newHash = window.location.hash || '#/';
      currentHashRef.current = newHash;
      setRoute(parseHash(newHash));

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const targetY = scrollPositionsRef.current[newHash] ?? 0;
          window.scrollTo(0, targetY);
        });
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const navigate = useCallback((target: RouteLocation, options?: { replace?: boolean }) => {
    const newHash = stringifyRoute(target);
    if (window.location.hash !== newHash) {
      const prevHash = currentHashRef.current || '#/';
      scrollPositionsRef.current[prevHash] = window.scrollY;
      if (options?.replace) {
        const url = new URL(window.location.href);
        url.hash = newHash;
        window.history.replaceState(null, '', url.toString());
        currentHashRef.current = newHash;
        setRoute(parseHash(newHash));
      } else {
        window.location.hash = newHash;
      }
    }
  }, []);

  return { route, navigate };
}
