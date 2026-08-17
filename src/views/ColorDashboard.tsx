import { Droplet, Palette, RotateCw, Sun } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { ModeCard } from '../components/dashboard/ModeCard';
import { useTodayStats } from '../hooks/useTodayStats';
import type { ColorMode } from '../utils/colorUtils';
import type { ColorProfileData } from '../utils/db';

interface ColorDashboardProps {
  profiles: Record<ColorMode, ColorProfileData | null>;
  onStart: (mode: ColorMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: () => void;
}

const COLOR_MODES_CONFIG: Array<{
  id: ColorMode;
  title: string;
  desc: string;
  icon: (props: { className?: string }) => ComponentChildren;
}> = [
  {
    id: 'H',
    title: '色相 (Hue)',
    desc: '识别颜色在色相环上的具体角度 (0°~360°)',
    icon: RotateCw,
  },
  {
    id: 'V',
    title: '明度 (Value)',
    desc: '已知色相，评估颜色的素描明暗程度 (0%~100%)',
    icon: Sun,
  },
  {
    id: 'S',
    title: '饱和度 (Sat)',
    desc: '已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)',
    icon: Droplet,
  },
  {
    id: 'ALL',
    title: '综合拾色 (Match)',
    desc: '同时调整色相、饱和度与明度，逼近真理色彩',
    icon: Palette,
  },
];

export function ColorDashboard({
  profiles,
  onStart,
  onBackToHome,
  onOpenSettings,
  onOpenAnalytics,
}: ColorDashboardProps) {
  const todayStats = useTodayStats('color');

  return (
    <DashboardShell
      title="色感训练"
      subTitle="Color Recognition"
      onBackToHome={onBackToHome}
      onOpenSettings={onOpenSettings}
      onOpenAnalytics={onOpenAnalytics}
    >
      {COLOR_MODES_CONFIG.map((config) => {
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
