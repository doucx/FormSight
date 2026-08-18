import { useEffect, useState } from 'preact/hooks';
import type { DomainMeta } from '../../config/domains';
import { useTodayStats } from '../../hooks/useTodayStats';
import { type UnifiedProfileData, getProfilesByDomain } from '../../utils/db';
import { DashboardShell } from './DashboardShell';
import { ModeCard } from './ModeCard';

interface GenericDashboardProps {
  meta: DomainMeta;
  onStart: (mode: string, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics?: () => void;
}

export function GenericDashboard({
  meta,
  onStart,
  onBackToHome,
  onOpenSettings,
  onOpenAnalytics,
}: GenericDashboardProps) {
  const todayStats = useTodayStats(meta.domain);
  const [profiles, setProfiles] = useState<Record<string, UnifiedProfileData>>({});

  useEffect(() => {
    let isMounted = true;
    getProfilesByDomain(meta.domain).then((list) => {
      if (!isMounted) return;
      const map: Record<string, UnifiedProfileData> = {};
      for (const p of list) {
        map[p.mode] = p;
      }
      setProfiles(map);
    });
    return () => {
      isMounted = false;
    };
  }, [meta.domain]);

  return (
    <DashboardShell
      title={meta.title}
      subTitle={meta.subTitle}
      onBackToHome={onBackToHome}
      onOpenSettings={onOpenSettings}
      onOpenAnalytics={meta.hasWeaknessAnalytics ? onOpenAnalytics : undefined}
    >
      {meta.modes.map((config) => {
        const profile = profiles[config.id];
        const totalCards = profile?.totalTrainedCards || 0;
        const accuracy =
          totalCards > 0 && profile ? Math.round((profile.totalHits / totalCards) * 100) : 0;
        const currentLevel = profile?.currentLevel || 5;
        const stat = todayStats[config.id] || { count: 0, timeMs: 0 };

        return (
          <ModeCard
            key={config.id}
            title={config.title}
            desc={config.desc}
            icon={config.icon}
            todayCount={stat.count}
            todayTimeMs={stat.timeMs}
            currentLevel={currentLevel}
            accuracy={accuracy}
            onStartTraining={() => onStart(config.id, 'training')}
            onStartBenchmark={() => onStart(config.id, 'benchmark')}
          />
        );
      })}
    </DashboardShell>
  );
}
