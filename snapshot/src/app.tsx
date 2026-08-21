import { useCallback, useEffect, useState } from 'preact/hooks';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { GlobalStatsModal } from './components/GlobalStatsModal';
import { SettingsModal } from './components/SettingsModal';
import { WeaknessAnalyticsModal } from './components/WeaknessAnalyticsModal';
import { ToastContainer, type ToastMessage, type ToastType } from './components/common/Toast';
import { GenericDashboard } from './components/dashboard/GenericDashboard';
import { PlanEditorModal } from './components/plan/PlanEditorModal';
import { registry } from './core/registry';
import { useHashRoute } from './hooks/useHashRoute';
import type { TrainingPlan } from './types/plan';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  getProfilesByDomain,
  getTrainingTimeMs,
} from './utils/db';
import {
  loadPlanStorageState,
  loadTrainingPlan,
  saveTrainingPlan,
  setActivePlan,
} from './utils/planStorage';
import { type UserSettings, getCardSettings, loadSettings } from './utils/settings';
import { GenericTrainingView } from './views/GenericTrainingView';
import { Home } from './views/Home';
import { PlanTrainingView } from './views/PlanTrainingView';

export function App() {
  const { route, navigate } = useHashRoute();
  const allDomains = registry.getAllDomains();

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [isPlanEditorOpen, setIsPlanEditorOpen] = useState<boolean>(false);
  const [activeSettingsCardId, setActiveSettingsCardId] = useState<string | null>(null);
  const [activeAnalyticsCardId, setActiveAnalyticsCardId] = useState<string | null>(null);

  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan>(loadTrainingPlan);
  const [allPlans, setAllPlans] = useState<TrainingPlan[]>(() => loadPlanStorageState().plans);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState<boolean>(false);

  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>(() => {
    const init: Record<string, number> = {};
    for (const d of allDomains) init[d] = 0;
    return init as Record<TrainingDomain, number>;
  });

  const [currentDomainProfiles, setCurrentDomainProfiles] = useState<
    Record<string, UnifiedProfileData>
  >({});

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshProfiles = useCallback(async () => {
    const domains = registry.getAllDomains();
    const timesEntries = await Promise.all(
      domains.map(async (d) => [d, await getTrainingTimeMs(d)] as const),
    );
    const timesMap = Object.fromEntries(timesEntries) as Record<TrainingDomain, number>;

    const allProfilesList = await Promise.all(domains.map((d) => getProfilesByDomain(d)));
    const pMap: Record<string, UnifiedProfileData> = {};
    for (const list of allProfilesList) {
      for (const p of list) {
        pMap[p.cardId] = p;
      }
    }

    setDomainTimes(timesMap);
    setCurrentDomainProfiles(pMap);
    setSettings(loadSettings());
    const planState = loadPlanStorageState();
    setTrainingPlan(loadTrainingPlan());
    setAllPlans(planState.plans);
    setProfilesLoaded(true);
  }, []);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  useEffect(() => {
    if (route.type === 'home') {
      document.title = 'FormSight - 视觉造型构图与色彩感知训练系统';
    } else if (route.type === 'plan-train') {
      document.title = `${trainingPlan.name || '今日训练流'} - FormSight`;
    } else if (route.type === 'dashboard') {
      const meta = registry.getDomainMeta(route.domain);
      document.title = `${meta?.title || '训练'} (${meta?.subTitle || ''}) - FormSight`;
    } else if (route.type === 'train') {
      const card = registry.getCardById(route.cardId);
      document.title = `${card?.title || '训练'} - FormSight`;
    }
  }, [route, trainingPlan.name]);

  const handleSelectPlanOnHome = useCallback(
    (planId: string) => {
      const target = setActivePlan(planId);
      if (target) {
        setTrainingPlan(target);
        showToast(`已切换至【${target.name}】`, 'info');
      }
    },
    [showToast],
  );

  const totalTimeMs = Object.values(domainTimes).reduce((acc, t) => acc + t, 0);

  const activeSettingsCard = activeSettingsCardId ? registry.getCardById(activeSettingsCardId) : null;
  const activeAnalyticsCard = activeAnalyticsCardId ? registry.getCardById(activeAnalyticsCardId) : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {route.type === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          domainTimes={domainTimes}
          trainingPlan={trainingPlan}
          allPlans={allPlans}
          onNavigateDomain={(domain) => navigate({ type: 'dashboard', domain })}
          onStartPlan={() => navigate({ type: 'plan-train' })}
          onOpenPlanEditor={() => setIsPlanEditorOpen(true)}
          onSelectPlan={handleSelectPlanOnHome}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}

      {route.type === 'plan-train' && (
        <PlanTrainingView
          plan={trainingPlan}
          settings={settings}
          onExit={async () => {
            await refreshProfiles();
            navigate({ type: 'home' });
          }}
        />
      )}

      {route.type === 'dashboard' && (() => {
        const meta = registry.getDomainMeta(route.domain);
        if (!meta) {
          navigate({ type: 'home' });
          return null;
        }
        return (
          <GenericDashboard
            meta={meta}
            onStart={(cardId, sessionType) => navigate({ type: 'train', cardId, sessionType })}
            onBackToHome={() => navigate({ type: 'home' })}
            onOpenCardSettings={(cardId) => setActiveSettingsCardId(cardId)}
            onOpenCardAnalytics={(cardId) => setActiveAnalyticsCardId(cardId)}
          />
        );
      })()}

      {route.type === 'train' &&
        (() => {
          if (!profilesLoaded) {
            return (
              <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold">
                正在同步能力层阶与训练数据...
              </div>
            );
          }
          const activeCard = registry.getCardById(route.cardId);
          if (!activeCard) {
            navigate({ type: 'home' });
            return null;
          }
          const plugin = registry.getPluginByCardId(activeCard.id);
          if (!plugin) {
            navigate({ type: 'home' });
            return null;
          }
          const activeLevel = currentDomainProfiles[activeCard.id]?.currentLevel || 5;

          return (
            <GenericTrainingView
              key={`${activeCard.id}-${route.sessionType}`}
              card={activeCard}
              plugin={plugin}
              sessionType={route.sessionType}
              initialLevel={activeLevel}
              settings={getCardSettings(settings, activeCard.id)}
              globalSettings={settings.global}
              onExit={async () => {
                await refreshProfiles();
                navigate({ type: 'dashboard', domain: activeCard.domain });
              }}
            />
          );
        })()}

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
          showToast={showToast}
        />
      )}

      {isGlobalStatsOpen && <GlobalStatsModal onClose={() => setIsGlobalStatsOpen(false)} />}

      {activeSettingsCard && (
        <SettingsModal
          card={activeSettingsCard}
          settings={settings}
          onClose={() => setActiveSettingsCardId(null)}
          onSave={(newSettings) => setSettings(newSettings)}
        />
      )}

      {activeAnalyticsCard && (
        <WeaknessAnalyticsModal
          card={activeAnalyticsCard}
          onClose={() => setActiveAnalyticsCardId(null)}
        />
      )}

      {isPlanEditorOpen && (
        <PlanEditorModal
          initialPlan={trainingPlan}
          onClose={() => setIsPlanEditorOpen(false)}
          onPlanListChanged={refreshProfiles}
          onSave={(newPlan) => {
            saveTrainingPlan(newPlan);
            setTrainingPlan(newPlan);
            refreshProfiles();
            showToast('训练计划已成功更新', 'success');
          }}
        />
      )}
    </div>
  );
}