import { useState, useEffect } from 'preact/hooks';
import { TrainingMode } from './types';
import { Dashboard } from './views/Dashboard';
import { TrainingView } from './views/TrainingView';
import { getAllUserProfiles, UserProfileData } from './utils/db';

export function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');
  const [activeMode, setActiveMode] = useState<TrainingMode>('single');
  const [sessionType, setSessionType] = useState<'training' | 'benchmark'>('training');

  const [profiles, setProfiles] = useState<Record<TrainingMode, UserProfileData | null>>({
    single: null,
    double_h: null,
    double_r: null,
  });

  // 刷新用户能力度数
  const refreshProfiles = async () => {
    const data = await getAllUserProfiles();
    setProfiles(data);
  };

  useEffect(() => {
    refreshProfiles();
  }, []);

  // 启动训练
  const handleStartTraining = (mode: TrainingMode, type: 'training' | 'benchmark') => {
    setActiveMode(mode);
    setSessionType(type);
    setCurrentView('training');
  };

  // 退出训练返回主页
  const handleExitTraining = () => {
    setCurrentView('dashboard');
    refreshProfiles();
  };

  const activeDegreeStep = profiles[activeMode]?.currentDegreeStep || 20;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {currentView === 'dashboard' ? (
        <Dashboard
          profiles={profiles}
          onStart={handleStartTraining}
          onRefreshProfiles={refreshProfiles}
        />
      ) : (
        <TrainingView
          mode={activeMode}
          sessionType={sessionType}
          initialGridStep={activeDegreeStep}
          onExit={handleExitTraining}
        />
      )}
    </div>
  );
}