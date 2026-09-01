import { useCallback, useEffect, useRef } from 'preact/hooks';
import { getCardTitle, i18n, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import { $activePlan, $allPlans, initPlanStore, setActivePlanAction } from '../stores/planStore';
import {
  $isProfilesLoaded,
  $profiles,
  $todayStatsMap,
  $totalTimeMs,
  refreshAppData,
} from '../stores/profileStore';
import { $settings, initSettingsStore } from '../stores/settingsStore';
import { $toasts, dismissToast, showToast } from '../stores/toastStore';
import type { RouteLocation } from './useHashRoute';

export function useAppBootstrap(route: RouteLocation) {
  const { t } = useTranslation();
  const lastHomeRouteRef = useRef<RouteLocation>({ type: 'home' });

  useEffect(() => {
    i18n.init();
    Promise.all([initSettingsStore(), initPlanStore(), refreshAppData()]);
  }, []);

  // 动态更新页面标题
  // biome-ignore lint/correctness/useExhaustiveDependencies: update document title when plan name or route changes
  useEffect(() => {
    const currentPlanName = $activePlan.value.name;
    if (route.type === 'home') {
      lastHomeRouteRef.current = route;
      document.title = `${t('nav.dashboard')} - ${t('common.appName')}`;
    } else if (route.type === 'discovery') {
      lastHomeRouteRef.current = route;
      document.title = `${t('nav.discovery')} - ${t('common.appName')}`;
    } else if (route.type === 'plan-editor') {
      document.title = `${t('plan.editPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'plan-train') {
      document.title = `${currentPlanName || t('plan.todayPlan')} - ${t('common.appName')}`;
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
  }, [route, $activePlan.value.name, t]);

  const handleSelectPlanOnHome = useCallback(
    async (planId: string) => {
      const target = await setActivePlanAction(planId);
      if (target) {
        showToast(t('common.switchedPlanToast', { name: target.name }), 'info');
      }
    },
    [t],
  );

  return {
    lastHomeRoute: lastHomeRouteRef.current,
    settings: $settings.value,
    trainingPlan: $activePlan.value,
    allPlans: $allPlans.value,
    toasts: $toasts.value,
    profilesLoaded: $isProfilesLoaded.value,
    totalTimeMs: $totalTimeMs.value,
    profiles: $profiles.value,
    todayStats: $todayStatsMap.value,
    showToast,
    handleDismissToast: dismissToast,
    refreshProfiles: refreshAppData,
    handleSelectPlanOnHome,
  };
}