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
  type UserProfileData,
  getAllColorProfiles,
  getAllUserProfiles,
  getColorTrainingTimeMs,
  getStarHoppingTrainingTimeMs,
} from './utils/db';
import { type UserSettings, loadSettings } from './utils/settings';
import { ColorDashboard } from './views/ColorDashboard';
import { ColorTrainingView } from './views/ColorTrainingView';
import { Dashboard } from './views/Dashboard';
import { Home } from './views/Home';
import { TrainingView } from './views/TrainingView';

type GlobalApp = 'home' | 'star-hopping' | 'color-sense';

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
  const [settingsContext, setSettingsContext] = useState<'star-hopping' | 'color-sense'>(
    'star-hopping',
  );
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
  const [starHoppingTimeMs, setStarHoppingTimeMs] = useState<number>(0);
  const [colorTimeMs, setColorTimeMs] = useState<number>(0);

  // 刷新用户能力看板与总时间
  const refreshProfiles = useCallback(async () => {
    const data = await getAllUserProfiles();
    const cData = await getAllColorProfiles();
    const starMs = await getStarHoppingTrainingTimeMs();
    const colorMs = await getColorTrainingTimeMs();
    setProfiles(data);
    setColorProfiles(cData);
    setStarHoppingTimeMs(starMs);
    setColorTimeMs(colorMs);
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {currentApp === 'home' && (
        <Home
          totalTimeMs={starHoppingTimeMs + colorTimeMs}
          starHoppingTimeMs={starHoppingTimeMs}
          colorTimeMs={colorTimeMs}
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
              setSettingsContext('star-hopping');
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
            settings={settings}
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
              setSettingsContext('color-sense');
              setIsSettingsOpen(true);
            }}
            onOpenAnalytics={() => setIsColorAnalyticsOpen(true)}
          />
        ) : (
          <ColorTrainingView
            mode={activeColorMode}
            sessionType={colorSessionType}
            initialLevel={activeColorLevel}
            settings={settings}
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
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings) => setSettings(newSettings)}
          onDataCleared={refreshProfiles}
          appContext={settingsContext}
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
