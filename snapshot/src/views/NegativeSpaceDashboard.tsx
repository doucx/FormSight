import { Maximize2 } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { ModeCard } from '../components/dashboard/ModeCard';
import { useTodayStats } from '../hooks/useTodayStats';
import { type UnifiedProfileData, getProfilesByDomain } from '../utils/db';
import type { NegativeSpaceMode } from '../utils/negativeSpaceUtils';

interface NegativeSpaceDashboardProps {
  onStart: (mode: NegativeSpaceMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
}

export function NegativeSpaceDashboard({
  onStart,
  onBackToHome,
  onOpenSettings,
}: NegativeSpaceDashboardProps) {
  const [profiles, setProfiles] = useState<Record<string, UnifiedProfileData | null>>({});
  const todayStats = useTodayStats('negative_space');

  useEffect(() => {
    let isMounted = true;
    getProfilesByDomain('negative_space').then((pList) => {
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

  const profile = profiles.RATIO_ESTIMATION;
  const totalCards = profile?.totalTrainedCards || 0;
  const accuracy = totalCards > 0 && profile ? Math.round((profile.totalHits / totalCards) * 100) : 0;
  const currentLevel = profile?.currentLevel || 5;
  const stat = todayStats.RATIO_ESTIMATION || { count: 0, timeMs: 0 };

  return (
    <DashboardShell
      title="正负形感知"
      subTitle="Negative Space"
      onBackToHome={onBackToHome}
      onOpenSettings={onOpenSettings}
    >
      <ModeCard
        title="负形占比滑块评估"
        desc="估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。"
        icon={Maximize2}
        todayCount={stat.count}
        todayTimeMs={stat.timeMs}
        currentLevel={currentLevel}
        accuracy={accuracy}
        onStartTraining={() => onStart('RATIO_ESTIMATION', 'training')}
        onStartBenchmark={() => onStart('RATIO_ESTIMATION', 'benchmark')}
      />
    </DashboardShell>
  );
}