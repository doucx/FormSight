import { useCallback, useEffect, useState } from 'preact/hooks';
import { AnalyticsModal } from './components/AnalyticsModal';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { SettingsModal } from './components/SettingsModal';
import type { TrainingMode } from './types';
import { type UserProfileData, getAllUserProfiles, getTotalTrainingTimeMs } from './utils/db';
import { type UserSettings, loadSettings } from './utils/settings';
import { Dashboard } from './views/Dashboard';
import { Home } from './views/Home';
import { TrainingView } from './views/TrainingView';

type GlobalApp = 'home' | 'star-hopping' | 'color-sense';

export function App() {
  const [currentApp, setCurrentApp] = useState<GlobalApp>('home');
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');
  const [activeMode, setActiveMode] = useState<TrainingMode>('single');
  const [sessionType, setSessionType] = useState<'training' | 'benchmark'>('training');

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [analyticsMode, setAnalyticsMode] = useState<TrainingMode | 'all'>('all');
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  const [profiles, setProfiles] = useState<Record<TrainingMode, UserProfileData | null>>({
    single: null,
    double_h: null,
    double_r: null,
  });
  const [totalTimeMs, setTotalTimeMs] = useState<number>(0);

  // 刷新用户能力度数与总练习时长
  const refreshProfiles = useCallback(async () => {
    const data = await getAllUserProfiles();
    const timeMs = await getTotalTrainingTimeMs();
    setProfiles(data);
    setTotalTimeMs(timeMs);
  }, []);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  // 动态同步页面标题 Document Title
  useEffect(() => {
    if (currentApp === 'home') {
      document.title = 'FormSight - 造型构图与色彩感知训练系统';
    } else if (currentApp === 'star-hopping') {
      document.title = '寻星练习 (Star-Hopping) - FormSight';
    } else if (currentApp === 'color-sense') {
      document.title = '色感训练 (Color Recognition) - FormSight';
    }
  }, [currentApp]);

  // 打开弱点分析
  const handleOpenAnalytics = (mode?: TrainingMode) => {
    setAnalyticsMode(mode || 'all');
    setIsAnalyticsOpen(true);
  };

  // 启动训练
  const handleStartTraining = (mode: TrainingMode, type: 'training' | 'benchmark') => {
    setActiveMode(mode);
    setSessionType(type);
    setCurrentView('training');
  };

  // 退出训练返回寻星 Dashboard
  const handleExitTraining = () => {
    setCurrentView('dashboard');
    refreshProfiles();
  };

  const activeLevel = profiles[activeMode]?.currentLevel || 5;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {currentApp === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          onNavigate={(app) => setCurrentApp(app)}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
        />
      )}

      {currentApp === 'star-hopping' &&
        (currentView === 'dashboard' ? (
          <Dashboard
            profiles={profiles}
            totalTimeMs={totalTimeMs}
            onStart={handleStartTraining}
            onRefreshProfiles={refreshProfiles}
            onOpenSettings={() => setIsSettingsOpen(true)}
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

      {currentApp === 'color-sense' && (
        <div className="w-full max-w-4xl mx-auto bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm flex flex-col items-center gap-6">
          <div className="w-full flex justify-between items-center border-b border-slate-100 pb-4">
            <button
              type="button"
              onClick={() => setCurrentApp('home')}
              className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all"
            >
              ← 返回主页
            </button>
            <h1 className="text-xl font-bold text-slate-800">色感训练 (Color Recognition)</h1>
            <div className="w-20" />
          </div>
          <div className="py-16 text-center space-y-3">
            <div className="text-indigo-600 font-black text-2xl">色感模块开发准备中</div>
            <p className="text-slate-400 text-xs">基础架构与数据库已就绪，即将支持 H/S/V 分级算法与滑块识别！</p>
          </div>
        </div>
      )}

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings) => setSettings(newSettings)}
          onDataCleared={refreshProfiles}
        />
      )}

      {isAnalyticsOpen && (
        <AnalyticsModal initialMode={analyticsMode} onClose={() => setIsAnalyticsOpen(false)} />
      )}
    </div>
  );
}
