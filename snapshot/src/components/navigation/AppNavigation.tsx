import { BarChart2, Compass, Layers, Settings, Sparkles, Target } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import type { RouteLocation } from '../../hooks/useHashRoute';

interface AppNavigationProps {
  currentRoute: RouteLocation;
  onNavigate: (route: RouteLocation) => void;
  onOpenSettings: () => void;
}

export function AppNavigation({
  currentRoute,
  onNavigate,
  onOpenSettings,
}: AppNavigationProps) {
  const { t } = useTranslation();

  const isTabActive = (tab: 'home' | 'discovery' | 'plan-editor' | 'stats'): boolean => {
    return currentRoute.type === tab;
  };

  const navItems = [
    {
      id: 'home' as const,
      label: t('nav.dashboard'),
      icon: Target,
      target: { type: 'home' as const },
    },
    {
      id: 'discovery' as const,
      label: t('nav.discovery'),
      icon: Compass,
      target: { type: 'discovery' as const },
    },
    {
      id: 'plan-editor' as const,
      label: t('nav.plans'),
      icon: Layers,
      target: { type: 'plan-editor' as const },
    },
    {
      id: 'stats' as const,
      label: t('nav.stats'),
      icon: BarChart2,
      target: { type: 'stats' as const },
    },
  ];

  return (
    <nav className="w-full bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl px-3 sm:px-5 py-2 sm:py-2.5 shadow-sm flex items-center justify-between gap-2 flex-shrink-0">
      {/* 品牌标识 */}
      <button
        type="button"
        onClick={() => onNavigate({ type: 'home' })}
        className="flex items-center gap-2.5 text-left cursor-pointer focus:outline-none flex-shrink-0 group"
      >
        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform flex-shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="hidden md:block">
          <div className="font-black text-sm text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
            {t('common.appName')}
            <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100">
              v{__APP_VERSION__}
            </span>
          </div>
        </div>
      </button>

      {/* 核心导航项 */}
      <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100/80 p-1 rounded-2xl flex-1 max-w-xl justify-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isTabActive(item.id);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.target)}
              className={`flex-1 sm:flex-initial py-1.5 sm:py-2 px-2.5 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                active
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 右侧全局设置按钮 */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 sm:px-3 sm:py-2 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          title={t('common.globalSettings')}
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('common.settings')}</span>
        </button>
      </div>
    </nav>
  );
}