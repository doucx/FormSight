import { Shuffle } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { ModeCard } from '../components/dashboard/ModeCard';
import { useTodayStats } from '../hooks/useTodayStats';
import { type UnifiedProfileData, getProfilesByDomain } from '../utils/db';
import type { RelativeColorMode } from '../utils/relativeColorUtils';

interface RelativeColorDashboardProps {
  onStart: (mode: RelativeColorMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
}

export function RelativeColorDashboard({
  onStart,
  onBackToHome,
  onOpenSettings,
}: RelativeColorDashboardProps) {
  const [profiles, setProfiles] = useState<Record<string, UnifiedProfileData | null>>({});
  const todayStats = useTodayStats('relative_color');

  useEffect(() => {
    let isMounted = true;
    getProfilesByDomain('relative_color').then((pList) => {
      if (!isMounted) return;
      const pMap: Record<string, UnifiedProfileData> = {};
      for (const p of pList) {
        pMap[p.mode] = p;
      }
      setProfiles(pMap);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const profile = profiles.VECTOR_SHIFT;
  const totalCards = profile?.totalTrainedCards || 0;
  const accuracy =
    totalCards > 0 && profile ? Math.round((profile.totalHits / totalCards) * 100) : 0;
  const currentLevel = profile?.currentLevel || 5;
  const stat = todayStats.VECTOR_SHIFT || { count: 0, timeMs: 0 };

  return (
    <DashboardShell
      title="相对色感"
      subTitle="Relative Color"
      onBackToHome={onBackToHome}
      onOpenSettings={onOpenSettings}
    >
      <ModeCard
        title="色彩矢量迁移"
        desc="保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉。"
        icon={Shuffle}
        todayCount={stat.count}
        todayTimeMs={stat.timeMs}
        currentLevel={currentLevel}
        accuracy={accuracy}
        onStartTraining={() => onStart('VECTOR_SHIFT', 'training')}
        onStartBenchmark={() => onStart('VECTOR_SHIFT', 'benchmark')}
      />
    </DashboardShell>
  );
}