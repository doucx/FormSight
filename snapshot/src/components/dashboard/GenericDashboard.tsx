import { useEffect, useState } from 'preact/hooks';
import type { DomainMeta } from '../../config/domains';
import { useTodayStats } from '../../hooks/useTodayStats';
import { type UnifiedProfileData, getProfilesByDomain } from '../../utils/db/index';
import { loadSettings } from '../../utils/settings';
import { DashboardShell } from './DashboardShell';
import { ModeCard } from './ModeCard';

interface GenericDashboardProps {
  meta: DomainMeta;
  onStart: (cardId: string, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenCardSettings: (cardId: string) => void;
  onOpenCardAnalytics: (cardId: string) => void;
}

export function GenericDashboard({
  meta,
  onStart,
  onBackToHome,
  onOpenCardSettings,
  onOpenCardAnalytics,
}: GenericDashboardProps) {
  const todayStats = useTodayStats(meta.domain);
  const [profiles, setProfiles] = useState<Record<string, UnifiedProfileData>>({});

  useEffect(() => {
    let isMounted = true;
    getProfilesByDomain(meta.domain).then((list) => {
      if (!isMounted) return;
      const map: Record<string, UnifiedProfileData> = {};
      for (const p of list) {
        map[p.cardId] = p;
      }
      setProfiles(map);
    });
    return () => {
      isMounted = false;
    };
  }, [meta.domain]);

  const showExperimental = loadSettings().global.showExperimentalCards ?? false;
  const visibleCards = meta.cards.filter((card) => showExperimental || !card.isExperimental);

  return (
    <DashboardShell title={meta.title} subTitle={meta.subTitle} onBackToHome={onBackToHome}>
      {visibleCards.map((card) => {
        const profile = profiles[card.id];
        const totalTrials = profile?.totalTrials || 0;
        const accuracy =
          totalTrials > 0 && profile ? Math.round((profile.totalHits / totalTrials) * 100) : 0;
        const currentLevel = profile?.currentLevel || 5;
        const stat = todayStats[card.id] || { count: 0, timeMs: 0 };

        return (
          <ModeCard
            key={card.id}
            title={card.title}
            desc={card.desc}
            icon={card.icon}
            todayCount={stat.count}
            todayTimeMs={stat.timeMs}
            currentLevel={currentLevel}
            accuracy={accuracy}
            hasAnalytics={Boolean(card.hasWeaknessAnalytics)}
            isExperimental={Boolean(card.isExperimental)}
            onStartTraining={() => onStart(card.id, 'training')}
            onStartBenchmark={() => onStart(card.id, 'benchmark')}
            onOpenSettings={() => onOpenCardSettings(card.id)}
            onOpenAnalytics={() => onOpenCardAnalytics(card.id)}
          />
        );
      })}
    </DashboardShell>
  );
}
