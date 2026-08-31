import { BarChart2, Compass, Github, Layers, Settings, Sparkles, Target } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import type { RouteLocation } from '../../hooks/useHashRoute';

interface AppNavigationProps {
  currentRoute: RouteLocation;
  onNavigate: (route: RouteLocation) => void;
  onOpenSettings: () => void;
}

/** 爱发电 (Afdian) 专属矢量图标 */
function AfdianIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <title>Afdian</title>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.4 15.6l-1-4.6h3.4l-6.8 7 1.2-5.4H7.2l6.2-7-.6 4.6h3.4l-4.4 5.4z" />
    </svg>
  );
}

export function AppNavigation({ currentRoute, onNavigate, onOpenSettings }: AppNavigationProps) {
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
      <aside className="hidden md:flex flex-col justify-between w-56 lg:w-64 border-r border-border bg-card h-screen sticky top-0 p-4 lg:p-5 flex-shrink-0 z-30 shadow-xs transition-colors">
        <div className="space-y-6">
          {/* 品牌标识 */}
          <button
            type="button"
            onClick={() => onNavigate({ type: 'home' })}
            className="flex items-center gap-3 text-left cursor-pointer focus:outline-none group px-2 py-1 w-full"
          >
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 dark:shadow-none group-hover:scale-105 transition-transform flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-base text-foreground tracking-tight leading-tight flex items-center gap-1.5">
                {t('common.appName')}
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-accent text-primary rounded-md border border-indigo-100 dark:border-indigo-900">
                  v{__APP_VERSION__}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
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
                      ? 'bg-accent text-primary shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      active ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                  <span className="truncate flex-1">{item.label}</span>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 侧边栏底部：设置与社区外链 */}
        <div className="pt-4 border-t border-border/60 space-y-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-accent/60 transition-all flex items-center gap-2.5 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="truncate">{t('common.globalSettings')}</span>
          </button>

          {/* GitHub & 爱发电外链按钮组 */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <a
              href="https://github.com/doucx/FormSight"
              target="_blank"
              rel="noopener noreferrer"
              className="py-1.5 px-2 bg-muted/60 hover:bg-accent text-muted-foreground hover:text-foreground border border-border/60 rounded-xl transition-all flex items-center justify-center gap-1.5 text-[11px] font-semibold"
              title="GitHub 开源仓库"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>

            <a
              href="https://afdian.com/a/AyeLTesf"
              target="_blank"
              rel="noopener noreferrer"
              className="py-1.5 px-2 bg-purple-50/70 dark:bg-purple-950/40 hover:bg-purple-100/70 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 border border-purple-200/60 dark:border-purple-800/60 rounded-xl transition-all flex items-center justify-center gap-1.5 text-[11px] font-semibold"
              title="爱发电赞助支持"
            >
              <AfdianIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>爱发电</span>
            </a>
          </div>
        </div>
      </aside>

      {/* 2. 移动端底部便携导航栏 (Mobile Bottom Tab Bar) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border px-2 py-1.5 flex items-center justify-around shadow-lg transition-colors">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isTabActive(item.id);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.target)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                active
                  ? 'text-primary font-extrabold'
                  : 'text-muted-foreground hover:text-slate-600 dark:hover:text-slate-300'
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
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold text-muted-foreground hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          <span>{t('common.settings')}</span>
        </button>
      </div>
    </>
  );
}
