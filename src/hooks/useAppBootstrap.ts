import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { ToastMessage, ToastType } from '../components/common/Toast';
import { getCardTitle, i18n, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import { type UnifiedProfileData, repository } from '../storage/index';
import {
  EMPTY_TRAINING_PLAN,
  getPlanStorageStateSnapshot,
  setActivePlan,
} from '../storage/planStorage';
import { type UserSettings, getSettingsSnapshot } from '../storage/settings';
import type { TrainingPlan } from '../types/plan';
import type { RouteLocation } from './useHashRoute';

export function useAppBootstrap(route: RouteLocation, refreshTodayStats: () => Promise<void>) {
  const { t } = useTranslation();
  const lastHomeRouteRef = useRef<RouteLocation>({ type: 'home' });

  const [settings, setSettings] = useState<UserSettings>(getSettingsSnapshot);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan>(EMPTY_TRAINING_PLAN);
  const [allPlans, setAllPlans] = useState<TrainingPlan[]>(
    () => getPlanStorageStateSnapshot().plans,
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState<boolean>(false);
  const [totalTimeMs, setTotalTimeMs] = useState<number>(0);
  const [profiles, setProfiles] = useState<Record<string, UnifiedProfileData>>({});
  const [dataVersion, setDataVersion] = useState<number>(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshProfiles = useCallback(async () => {
    const [summary] = await Promise.all([repository.getAppSummary(), refreshTodayStats()]);

    setTotalTimeMs(summary.totalTimeMs);
    setProfiles(summary.profiles);
    setSettings(summary.settings);
    setTrainingPlan(summary.trainingPlan);
    setAllPlans(summary.allPlans);
    setProfilesLoaded(true);
    setDataVersion((v) => v + 1);
  }, [refreshTodayStats]);

  useEffect(() => {
    i18n.init();
    refreshProfiles();
  }, [refreshProfiles]);

  // 动态更新页面标题
  useEffect(() => {
    if (route.type === 'home') {
      lastHomeRouteRef.current = route;
      document.title = `${t('nav.dashboard')} - ${t('common.appName')}`;
    } else if (route.type === 'discovery') {
      lastHomeRouteRef.current = route;
      document.title = `${t('nav.discovery')} - ${t('common.appName')}`;
    } else if (route.type === 'plan-editor') {
      document.title = `${t('plan.editPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'plan-train') {
      document.title = `${trainingPlan.name || t('plan.todayPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'stats') {
      document.title = `${t('stats.title')} - ${t('common.appName')}`;
    } else if (route.type === 'analytics') {
      const card = registry.getCardById(route.cardId);
      const cardTitle = card ? getCardTitle(card, t) : t('common.stats');
      document.title = `${cardTitle} - ${t('common.stats')} - ${t('common.appName')}`;
    } else if (route.type === 'train') {
      const card = registry.getCardById(route.cardId);
      const cardTitle = card ? getCardTitle(card, t) : t('shell.training');
      document.title = `${cardTitle} - ${t('common.appName')}`;
    }
  }, [route, trainingPlan.name, t]);

  const handleSelectPlanOnHome = useCallback(
    async (planId: string) => {
      const target = await setActivePlan(planId);
      if (target) {
        setTrainingPlan(target);
        showToast(t('common.switchedPlanToast', { name: target.name }), 'info');
      }
    },
    [showToast, t],
  );

  return {
    lastHomeRoute: lastHomeRouteRef.current,
    settings,
    setSettings,
    trainingPlan,
    setTrainingPlan,
    allPlans,
    toasts,
    profilesLoaded,
    totalTimeMs,
    profiles,
    dataVersion,
    showToast,
    handleDismissToast,
    refreshProfiles,
    handleSelectPlanOnHome,
  };
}
