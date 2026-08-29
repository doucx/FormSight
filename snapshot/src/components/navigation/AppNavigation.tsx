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
    <>
      {/* 1. 桌面端垂直侧边栏 (Desktop Left Sidebar) */}
      <aside className="hidden md:flex flex-col justify-between w-56 lg:w-64 border-r border-slate-200/80 bg-white h-screen sticky top-0 p-4 lg:p-5 flex-shrink-0 z-30 shadow-xs">
        <div className="space-y-6">
          {/* 品牌标识 */}
          <button
            type="button"
            onClick={() => onNavigate({ type: 'home' })}
            className="flex items-center gap-3 text-left cursor-pointer focus:outline-none group px-2 py-1 w-full"
          >
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-base text-slate-900 tracking-tight leading-tight flex items-center gap-1.5">
                {t('common.appName')}
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100">
                  v{__APP_VERSION__}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                {t('common.appSubtitle').slice(0, 14)}...
              </div>
            </div>
          </button>

          {/* 导航菜单列表 */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isTabActive(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.target)}
                  className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer select-none text-left ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      active ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate flex-1">{item.label}</span>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 侧边栏底部设置入口 */}
        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full py-2.5 px-3.5 rounded-2xl text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-all flex items-center gap-3 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span className="truncate">{t('common.globalSettings')}</span>
          </button>
        </div>
      </aside>

      {/* 2. 移动端底部便携导航栏 (Mobile Bottom Tab Bar) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isTabActive(item.id);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.target)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                active ? 'text-indigo-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenSettings}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          <span>{t('common.settings')}</span>
        </button>
      </div>
    </>
  );
}