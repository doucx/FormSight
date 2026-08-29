我们将在桌面端侧边栏底部（以及设置区域下方）加入 GitHub 开源仓库与爱发电（Afdian）支持入口，配备专属矢量图标与外链安全属性。

## [WIP] feat(ui): 在侧边栏底部添加 GitHub 与爱发电外链

### 用户需求
在侧边栏底部放置两个外部链接及其对应图标：
1. **爱发电 (Afdian)**：`https://afdian.com/a/AyeLTesf`
2. **GitHub**：`https://github.com/doucx/FormSight`

### 评论
将项目开源地址与创作者赞助通道固定在侧边栏底部，是开源 Web 工具的标准最佳实践（如 Excalidraw、tldraw、Vue/React 官方文档等）。这不仅增强了开源项目的透明度与社群连接，同时也为用户提供了便捷的反馈和赞助支持途径。

### 目标
1. 在 `src/components/navigation/AppNavigation.tsx` 中集成 GitHub 矢量图标与爱发电专用矢量图标。
2. 在桌面端侧边栏底部的设置项下方，优雅地平铺展示 GitHub 与爱发电的外链按钮组。
3. 确保所有外部链接均带有 `target="_blank"` 与 `rel="noopener noreferrer"` 安全属性。

### 基本原理
在侧边栏底部的通用操作区（设置项同级）划分出一个小型的社区支持与外链区域，使用紧凑的图标胶囊按钮排版，既不抢夺主导航注意力，又清晰易触达。

### 标签
#intent/build #flow/ready #priority/medium #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/sidebar-footer-links #task/action/implementation #task/state/continue

---

### Script

#### Acts 1: 在 `AppNavigation.tsx` 中增加 GitHub 与爱发电图标外链

我们将修改 `src/components/navigation/AppNavigation.tsx`，在桌面端侧栏底部嵌入精美、合规的外链按钮群。

~~~~~act
write_file
src/components/navigation/AppNavigation.tsx
~~~~~
~~~~~typescript
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
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.4 15.6l-1-4.6h3.4l-6.8 7 1.2-5.4H7.2l6.2-7-.6 4.6h3.4l-4.4 5.4z" />
    </svg>
  );
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

        {/* 侧边栏底部：设置与社区外链 */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-all flex items-center gap-2.5 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span className="truncate">{t('common.globalSettings')}</span>
          </button>

          {/* GitHub & 爱发电外链按钮组 */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <a
              href="https://github.com/doucx/FormSight"
              target="_blank"
              rel="noopener noreferrer"
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/60 rounded-xl transition-all flex items-center justify-center gap-1.5 text-[11px] font-semibold"
              title="GitHub 开源仓库"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>

            <a
              href="https://afdian.com/a/AyeLTesf"
              target="_blank"
              rel="noopener noreferrer"
              className="py-1.5 px-2 bg-purple-50/70 hover:bg-purple-100/70 text-purple-700 hover:text-purple-900 border border-purple-200/60 rounded-xl transition-all flex items-center justify-center gap-1.5 text-[11px] font-semibold"
              title="爱发电赞助支持"
            >
              <AfdianIcon className="w-3.5 h-3.5 text-purple-600" />
              <span>爱发电</span>
            </a>
          </div>
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
~~~~~

### 下一步建议
1. **代码检查**：运行 `npm run check` 确保无 TypeScript 或 Biome 格式问题。
2. **链接验证**：在浏览器侧边栏底部点击 GitHub 和爱发电按钮，验证在新标签页中能够正确打开目标页面。
