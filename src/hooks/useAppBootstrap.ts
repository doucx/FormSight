import { useCallback, useEffect, useRef } from 'preact/hooks';
import { getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import { $activePlan, $allPlans, setActivePlanAction } from '../stores/planStore';
import {
  $isProfilesLoaded,
  $profiles,
  $todayStatsMap,
  $totalTimeMs,
  refreshAppData,
} from '../stores/profileStore';
import { $settings } from '../stores/settingsStore';
import { $toasts, dismissToast, showToast } from '../stores/toastStore';
import type { RouteLocation } from './useHashRoute';

export function useAppBootstrap(route: RouteLocation) {
  const { t } = useTranslation();
  const lastHomeRouteRef = useRef<RouteLocation>({ type: 'home' });

  const activePlanName = $activePlan.value.name;

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
      document.title = `${activePlanName || t('plan.todayPlan')} - ${t('common.appName')}`;
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
  }, [route, activePlanName, t]);

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
