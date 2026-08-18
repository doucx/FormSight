import { useCallback, useEffect, useState } from 'preact/hooks';
import { AnalyticsModal } from './components/AnalyticsModal';
import { ColorAnalyticsModal } from './components/ColorAnalyticsModal';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { GlobalStatsModal } from './components/GlobalStatsModal';
import { SettingsModal } from './components/SettingsModal';
import { GenericDashboard } from './components/dashboard/GenericDashboard';
import { DOMAINS_CONFIG } from './config/domains';
import type { TrainingMode } from './types';
import type { ColorMode } from './utils/colorUtils';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  getColorTrainingTimeMs,
  getProfilesByDomain,
  getStarHoppingTrainingTimeMs,
  getTrainingTimeMs,
} from './utils/db';
import type { NegativeSpaceMode } from './utils/negativeSpaceUtils';
import type { RelativeColorMode } from './utils/relativeColorUtils';
import { type UserSettings, loadSettings } from './utils/settings';
import { TRAINING_PLUGINS } from './config/trainingPlugins';
import { GenericTrainingView } from './views/GenericTrainingView';
import { Home } from './views/Home';

type GlobalApp = 'home' | 'star-hopping' | 'color-sense' | 'relative-color' | 'negative-space';

const APP_TO_DOMAIN: Record<Exclude<GlobalApp, 'home'>, TrainingDomain> = {
  'star-hopping': 'star',
  'color-sense': 'color',
  'relative-color': 'relative_color',
  'negative-space': 'negative_space',
};

export function App() {
  const [currentApp, setCurrentApp] = useState<GlobalApp>('home');
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');

  // 当前活跃训练参数
  const [activeMode, setActiveMode] = useState<string>('single');
  const [sessionType, setSessionType] = useState<'training' | 'benchmark'>('training');

  // 弹窗状态
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsDomain, setSettingsDomain] = useState<TrainingDomain>('star');

  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [isColorAnalyticsOpen, setIsColorAnalyticsOpen] = useState<boolean>(false);
  const [analyticsMode, setAnalyticsMode] = useState<TrainingMode | 'all'>('all');
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  // 聚合时长状态
  const [starHoppingTimeMs, setStarHoppingTimeMs] = useState<number>(0);
  const [colorTimeMs, setColorTimeMs] = useState<number>(0);
  const [relativeColorTimeMs, setRelativeColorTimeMs] = useState<number>(0);
  const [negativeSpaceTimeMs, setNegativeSpaceTimeMs] = useState<number>(0);

  // 当前领域的 profiles 缓存 (用于获取当前等级)
  const [currentDomainProfiles, setCurrentDomainProfiles] = useState<
    Record<string, UnifiedProfileData>
  >({});

  // 刷新用户能力看板与总时间
  const refreshProfiles = useCallback(async () => {
    const starMs = await getStarHoppingTrainingTimeMs();
    const colorMs = await getColorTrainingTimeMs();
    const relMs = await getTrainingTimeMs('relative_color');
    const nsMs = await getTrainingTimeMs('negative_space');

    setStarHoppingTimeMs(starMs);
    setColorTimeMs(colorMs);
    setRelativeColorTimeMs(relMs);
    setNegativeSpaceTimeMs(nsMs);
    setSettings(loadSettings());

    if (currentApp !== 'home') {
      const d = APP_TO_DOMAIN[currentApp];
      const pList = await getProfilesByDomain(d);
      const pMap: Record<string, UnifiedProfileData> = {};
      for (const p of pList) {
        pMap[p.mode] = p;
      }
      setCurrentDomainProfiles(pMap);
    }
  }, [currentApp]);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  // 动态同步 Title
  useEffect(() => {
    if (currentApp === 'home') {
      document.title = 'FormSight - 视觉造型构图与色彩感知训练系统';
    } else {
      const d = APP_TO_DOMAIN[currentApp];
      const meta = DOMAINS_CONFIG[d];
      document.title = `${meta.title} (${meta.subTitle}) - FormSight`;
    }
  }, [currentApp]);

  const handleStartSession = (mode: string, type: 'training' | 'benchmark') => {
    setActiveMode(mode);
    setSessionType(type);
    setCurrentView('training');
  };

  const handleExitTraining = () => {
    setCurrentView('dashboard');
    refreshProfiles();
  };

  const currentLevel = currentDomainProfiles[activeMode]?.currentLevel || 5;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {currentApp === 'home' && (
        <Home
          totalTimeMs={starHoppingTimeMs + colorTimeMs + relativeColorTimeMs + negativeSpaceTimeMs}
          starHoppingTimeMs={starHoppingTimeMs}
          colorTimeMs={colorTimeMs}
          relativeColorTimeMs={relativeColorTimeMs}
          negativeSpaceTimeMs={negativeSpaceTimeMs}
          onNavigate={(app) => {
            setCurrentApp(app);
            setCurrentView('dashboard');
          }}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}

      {currentApp !== 'home' &&
        (() => {
          const domain = APP_TO_DOMAIN[currentApp];
          const meta = DOMAINS_CONFIG[domain];

          if (currentView === 'dashboard') {
            return (
              <GenericDashboard
                meta={meta}
                onStart={handleStartSession}
                onBackToHome={() => setCurrentApp('home')}
                onOpenSettings={() => {
                  setSettingsDomain(domain);
                  setIsSettingsOpen(true);
                }}
                onOpenAnalytics={() => {
                  if (domain === 'star') {
                    setAnalyticsMode('all');
                    setIsAnalyticsOpen(true);
                  } else if (domain === 'color') {
                    setIsColorAnalyticsOpen(true);
                  }
                }}
              />
            );
          }

          const plugin = TRAINING_PLUGINS[domain];
          return (
            <GenericTrainingView
              key={`${domain}-${activeMode}-${sessionType}`}
              plugin={plugin}
              mode={activeMode}
              sessionType={sessionType}
              initialLevel={currentLevel}
              settings={settings[domain]}
              onExit={handleExitTraining}
            />
          );
        })()}

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
        />
      )}

      {isGlobalStatsOpen && <GlobalStatsModal onClose={() => setIsGlobalStatsOpen(false)} />}

      {isSettingsOpen && (
        <SettingsModal
          domain={settingsDomain}
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings) => setSettings(newSettings)}
        />
      )}

      {isAnalyticsOpen && (
        <AnalyticsModal initialMode={analyticsMode} onClose={() => setIsAnalyticsOpen(false)} />
      )}

      {isColorAnalyticsOpen && (
        <ColorAnalyticsModal onClose={() => setIsColorAnalyticsOpen(false)} />
      )}
    </div>
  );
}
