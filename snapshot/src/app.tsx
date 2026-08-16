import { useCallback, useEffect, useState } from 'preact/hooks';
import { AnalyticsModal } from './components/AnalyticsModal';
import { ColorAnalyticsModal } from './components/ColorAnalyticsModal';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { GlobalStatsModal } from './components/GlobalStatsModal';
import { SettingsModal } from './components/SettingsModal';
import type { TrainingMode } from './types';
import type { ColorMode } from './utils/colorUtils';
import {
  type ColorProfileData,
  type TrainingDomain,
  type UnifiedProfileData,
  type UserProfileData,
  getAllColorProfiles,
  getAllUserProfiles,
  getColorTrainingTimeMs,
  getProfilesByDomain,
  getStarHoppingTrainingTimeMs,
  getTrainingTimeMs,
} from './utils/db';
import type { RelativeColorMode } from './utils/relativeColorUtils';
import { type UserSettings, loadSettings } from './utils/settings';
import { ColorDashboard } from './views/ColorDashboard';
import { ColorTrainingView } from './views/ColorTrainingView';
import { Dashboard } from './views/Dashboard';
import { Home } from './views/Home';
import { RelativeColorDashboard } from './views/RelativeColorDashboard';
import { RelativeColorTrainingView } from './views/RelativeColorTrainingView';
import { TrainingView } from './views/TrainingView';

type GlobalApp = 'home' | 'star-hopping' | 'color-sense' | 'relative-color';

export function App() {
  const [currentApp, setCurrentApp] = useState<GlobalApp>('home');
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');

  // 寻星状态
  const [activeMode, setActiveMode] = useState<TrainingMode>('single');
  const [sessionType, setSessionType] = useState<'training' | 'benchmark'>('training');

  // 色感状态
  const [activeColorMode, setActiveColorMode] = useState<ColorMode>('H');
  const [colorSessionType, setColorSessionType] = useState<'training' | 'benchmark'>('training');

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsDomain, setSettingsDomain] = useState<TrainingDomain>('star');

  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [isColorAnalyticsOpen, setIsColorAnalyticsOpen] = useState<boolean>(false);
  const [analyticsMode, setAnalyticsMode] = useState<TrainingMode | 'all'>('all');
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  const [profiles, setProfiles] = useState<Record<TrainingMode, UserProfileData | null>>({
    single: null,
    double_h: null,
    double_r: null,
  });
  const [colorProfiles, setColorProfiles] = useState<Record<ColorMode, ColorProfileData | null>>({
    H: null,
    S: null,
    V: null,
    ALL: null,
  });
  const [relativeProfiles, setRelativeProfiles] = useState<
    Record<string, UnifiedProfileData | null>
  >({});
  const [starHoppingTimeMs, setStarHoppingTimeMs] = useState<number>(0);
  const [colorTimeMs, setColorTimeMs] = useState<number>(0);
  const [relativeColorTimeMs, setRelativeColorTimeMs] = useState<number>(0);

  // 相对色感状态
  const [activeRelativeMode, setActiveRelativeMode] = useState<RelativeColorMode>('VECTOR_SHIFT');
  const [relativeSessionType, setRelativeSessionType] = useState<'training' | 'benchmark'>(
    'training',
  );

  // 刷新用户能力看板与总时间
  const refreshProfiles = useCallback(async () => {
    const data = await getAllUserProfiles();
    const cData = await getAllColorProfiles();
    const relList = await getProfilesByDomain('relative_color');
    const relMap: Record<string, UnifiedProfileData | null> = {};
    for (const p of relList) {
      relMap[p.mode] = p;
    }
    const starMs = await getStarHoppingTrainingTimeMs();
    const colorMs = await getColorTrainingTimeMs();
    const relMs = await getTrainingTimeMs('relative_color');
    setProfiles(data);
    setColorProfiles(cData);
    setRelativeProfiles(relMap);
    setStarHoppingTimeMs(starMs);
    setColorTimeMs(colorMs);
    setRelativeColorTimeMs(relMs);
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  // 动态同步 Title
  useEffect(() => {
    if (currentApp === 'home') {
      document.title = 'FormSight - 造型构图与色彩感知训练系统';
    } else if (currentApp === 'star-hopping') {
      document.title = '寻星练习 (Star-Hopping) - FormSight';
    } else if (currentApp === 'color-sense') {
      document.title = '色感训练 (Color Recognition) - FormSight';
    } else if (currentApp === 'relative-color') {
      document.title = '相对色感 (Relative Color) - FormSight';
    }
  }, [currentApp]);

  const handleOpenAnalytics = (mode?: TrainingMode) => {
    setAnalyticsMode(mode || 'all');
    setIsAnalyticsOpen(true);
  };

  const handleStartTraining = (mode: TrainingMode, type: 'training' | 'benchmark') => {
    setActiveMode(mode);
    setSessionType(type);
    setCurrentView('training');
  };

  const handleStartColorTraining = (mode: ColorMode, type: 'training' | 'benchmark') => {
    setActiveColorMode(mode);
    setColorSessionType(type);
    setCurrentView('training');
  };

  const handleExitTraining = () => {
    setCurrentView('dashboard');
    refreshProfiles();
  };

  const activeLevel = profiles[activeMode]?.currentLevel || 5;
  const activeColorLevel = colorProfiles[activeColorMode]?.currentLevel || 5;
  const activeRelativeLevel = relativeProfiles[activeRelativeMode]?.currentLevel || 5;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {currentApp === 'home' && (
        <Home
          totalTimeMs={starHoppingTimeMs + colorTimeMs + relativeColorTimeMs}
          starHoppingTimeMs={starHoppingTimeMs}
          colorTimeMs={colorTimeMs}
          relativeColorTimeMs={relativeColorTimeMs}
          onNavigate={(app) => {
            setCurrentApp(app);
            setCurrentView('dashboard');
          }}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}

      {currentApp === 'star-hopping' &&
        (currentView === 'dashboard' ? (
          <Dashboard
            profiles={profiles}
            onStart={handleStartTraining}
            onRefreshProfiles={refreshProfiles}
            onOpenSettings={() => {
              setSettingsDomain('star');
              setIsSettingsOpen(true);
            }}
            onOpenAnalytics={handleOpenAnalytics}
            onBackToHome={() => setCurrentApp('home')}
          />
        ) : (
          <TrainingView
            mode={activeMode}
            sessionType={sessionType}
            initialLevel={activeLevel}
            settings={settings.star}
            onExit={handleExitTraining}
          />
        ))}

      {currentApp === 'color-sense' &&
        (currentView === 'dashboard' ? (
          <ColorDashboard
            profiles={colorProfiles}
            onStart={handleStartColorTraining}
            onBackToHome={() => setCurrentApp('home')}
            onOpenSettings={() => {
              setSettingsDomain('color');
              setIsSettingsOpen(true);
            }}
            onOpenAnalytics={() => setIsColorAnalyticsOpen(true)}
          />
        ) : (
          <ColorTrainingView
            mode={activeColorMode}
            sessionType={colorSessionType}
            initialLevel={activeColorLevel}
            settings={settings.color}
            onExit={handleExitTraining}
          />
        ))}

      {currentApp === 'relative-color' &&
        (currentView === 'dashboard' ? (
          <RelativeColorDashboard
            onStart={(relMode, type) => {
              setActiveRelativeMode(relMode);
              setRelativeSessionType(type);
              setCurrentView('training');
            }}
            onBackToHome={() => setCurrentApp('home')}
            onOpenSettings={() => {
              setSettingsDomain('relative_color');
              setIsSettingsOpen(true);
            }}
          />
        ) : (
          <RelativeColorTrainingView
            mode={activeRelativeMode}
            sessionType={relativeSessionType}
            initialLevel={activeRelativeLevel}
            settings={settings.relative_color}
            onExit={handleExitTraining}
          />
        ))}

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
