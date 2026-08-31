好的，我们进入夜间模式**第三阶段：UI 与通用组件的深色模式适配（Tailwind dark:* 类名注入）**。

本阶段我们将全面适配核心导航、基础弹窗、卡片大盘以及答题交互容器，确保在夜间模式下拥有舒适、通透、低眩光的视觉体验。

## [WIP] feat: 适配通用组件与训练交互视图的暗色模式样式

### 用户需求
为系统的侧边栏导航、对话框容器、微标徽章、模式大盘卡片、2AFC/N-AFC 选项卡、滑块视图以及训练 Shell 全面注入 Tailwind `dark:*` 类名，实现暗色模式下的视觉一致性。

### 评论
在夜间模式下，过高的对比度或大面积纯黑都会增加眼部疲劳。我们使用 `slate-900` 作为主容器底色、`slate-800` 作为次级交互区底色、`slate-100`/`slate-300` 作为文字梯度，配合柔和的半透明 Indigo/Emerald/Rose 光晕，能够打造兼顾高可读性与护眼特性的暗色界面。

### 目标
1. 适配基础导航与弹窗容器：`AppNavigation.tsx`、`ModalShell.tsx`、`ConfirmModal.tsx`、`TagPill.tsx`。
2. 适配模块卡片与选项容器：`ModeCard.tsx`、`QuestionCardShell.tsx`、`Choice2AfcContainer.tsx`、`ChoiceNafcContainer.tsx`。
3. 适配滑块、点阵与训练 Shell 容器：`StandardSliderView.tsx`、`PointClickCanvas.tsx`、`TrainingShell.tsx`。

### 基本原理
依托 Tailwind 的 `darkMode: 'class'` 机制，当 HTML 根节点包含 `dark` 类名时，自动激活 `dark:*` 样式变体。我们对背景色（`bg-white` ➔ `dark:bg-slate-900`）、边框（`border-slate-200` ➔ `dark:border-slate-800`）、文字（`text-slate-800` ➔ `dark:text-slate-100`）及微标做系统性色彩映射。

### 标签
#intent/build #flow/ready #priority/high #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/dark-mode #task/action/component-styling #task/state/continue

---

### Script

#### Acts 1: 适配导航与基础弹窗组件

更新 `AppNavigation.tsx`、`ModalShell.tsx`、`ConfirmModal.tsx` 和 `TagPill.tsx`，注入深色模式适配样式。

~~~~~act
patch_file
src/components/navigation/AppNavigation.tsx
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
      {/* 1. 桌面端垂直侧边栏 (Desktop Left Sidebar) */}
      <aside className="hidden md:flex flex-col justify-between w-56 lg:w-64 border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 h-screen sticky top-0 p-4 lg:p-5 flex-shrink-0 z-30 shadow-xs transition-colors">
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
              <div className="font-black text-base text-slate-900 dark:text-slate-100 tracking-tight leading-tight flex items-center gap-1.5">
                {t('common.appName')}
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-100 dark:border-indigo-900">
                  v{__APP_VERSION__}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
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
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
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
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all flex items-center gap-2.5 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <span className="truncate">{t('common.globalSettings')}</span>
          </button>

          {/* GitHub & 爱发电外链按钮组 */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <a
              href="https://github.com/doucx/FormSight"
              target="_blank"
              rel="noopener noreferrer"
              className="py-1.5 px-2 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 rounded-xl transition-all flex items-center justify-center gap-1.5 text-[11px] font-semibold"
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-lg transition-colors">
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
                  ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
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
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          <span>{t('common.settings')}</span>
        </button>
      </div>
~~~~~

~~~~~act
patch_file
src/components/common/ModalShell.tsx
~~~~~
~~~~~typescript
export function ModalShell({
  title,
  subTitle,
  icon: Icon,
  maxWidth = 'max-w-md',
  onClose,
  headerAction,
  children,
}: ModalShellProps) {
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')
        ) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full ${maxWidth} bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-slate-800">{title}</h2>
              {subTitle && <p className="text-xs text-slate-400">{subTitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
~~~~~
~~~~~typescript
export function ModalShell({
  title,
  subTitle,
  icon: Icon,
  maxWidth = 'max-w-md',
  onClose,
  headerAction,
  children,
}: ModalShellProps) {
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')
        ) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full ${maxWidth} bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
              {subTitle && <p className="text-xs text-slate-400 dark:text-slate-500">{subTitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/components/common/ConfirmModal.tsx
~~~~~
~~~~~typescript
  return (
    <ModalShell title={title} icon={AlertTriangle} onClose={onCancel} maxWidth="max-w-sm">
      <div className="space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed">{message}</p>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95"
          >
            {effectiveCancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full py-2.5 px-3 text-xs font-bold text-white rounded-xl shadow-sm transition-all active:scale-95 ${
              isDangerous
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            {effectiveConfirmText}
          </button>
        </div>
      </div>
    </ModalShell>
  );
~~~~~
~~~~~typescript
  return (
    <ModalShell title={title} icon={AlertTriangle} onClose={onCancel} maxWidth="max-w-sm">
      <div className="space-y-4">
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all active:scale-95"
          >
            {effectiveCancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full py-2.5 px-3 text-xs font-bold text-white rounded-xl shadow-sm transition-all active:scale-95 ${
              isDangerous
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 dark:shadow-none'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'
            }`}
          >
            {effectiveConfirmText}
          </button>
        </div>
      </div>
    </ModalShell>
  );
~~~~~

~~~~~act
patch_file
src/components/common/TagPill.tsx
~~~~~
~~~~~typescript
  return (
    <button
      type="button"
      onPointerDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex items-center gap-1 font-bold rounded-xl transition-all cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] whitespace-nowrap flex-shrink-0 ${sizeClass} ${
        selected
          ? activeClass
          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
      } ${className}`}
    >
      {selected && <Check className="w-3 h-3 flex-shrink-0" />}
      {!selected && Icon && <Icon className="w-3 h-3 flex-shrink-0 text-slate-400" />}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`text-[10px] font-mono px-1 rounded ${
            selected ? activeBadgeClass : 'bg-slate-200 text-slate-500'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
~~~~~
~~~~~typescript
  return (
    <button
      type="button"
      onPointerDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex items-center gap-1 font-bold rounded-xl transition-all cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] whitespace-nowrap flex-shrink-0 ${sizeClass} ${
        selected
          ? activeClass
          : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60'
      } ${className}`}
    >
      {selected && <Check className="w-3 h-3 flex-shrink-0" />}
      {!selected && Icon && <Icon className="w-3 h-3 flex-shrink-0 text-slate-400 dark:text-slate-500" />}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`text-[10px] font-mono px-1 rounded ${
            selected ? activeBadgeClass : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
~~~~~

#### Acts 2: 适配模块卡片与选项答题容器

更新 `ModeCard.tsx`、`QuestionCardShell.tsx`、`Choice2AfcContainer.tsx` 和 `ChoiceNafcContainer.tsx`。

~~~~~act
patch_file
src/components/common/ModeCard.tsx
~~~~~
~~~~~typescript
    <div
      role="presentation"
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="group bg-white border border-slate-200/90 hover:border-indigo-500 rounded-3xl p-6 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative cursor-pointer select-none"
    >
      <div>
        {/* 顶部标题、图标与右上角状态徽章 */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-105 transition-all shadow-xs flex-shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                  {title}
                </h3>
                {isExperimental && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg flex-shrink-0">
                    <FlaskConical className="w-3 h-3 text-amber-600" />
                    {t('card.experimentalBadge')}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                {todayCount > 0
                  ? `${t('card.todayTrials')}: ${todayCount} ${t('common.trialsUnit')}${
                      todayTimeMs > 0 ? ` (${formatTodayTimeWithT(todayTimeMs, t)})` : ''
                    }`
                  : isNeverPracticed
                    ? t('common.empty')
                    : `${t('card.todayTrials')}: 0 ${t('common.trialsUnit')}`}
              </div>
            </div>
          </div>

          {/* 右上角：等级胶囊与快捷操作 */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs font-mono font-black bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-700 border border-slate-200/80 group-hover:border-indigo-200 px-2.5 py-1 rounded-xl text-slate-700 transition-colors">
              Lvl {currentLevel}
            </span>

            <div
              className="flex items-center opacity-70 group-hover:opacity-100 transition-opacity ml-1"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
              {onOpenAnalytics && (
                <button
                  type="button"
                  onClick={onOpenAnalytics}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                  title={t('card.statsTooltip', { title })}
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                title={t('card.settingsTooltip', { title })}
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 卡片描述 */}
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 min-h-[2.5rem] mb-5">
          {desc}
        </p>
      </div>

      {/* 底部指标栏与浮动操作按钮 */}
      <div
        className="flex items-end justify-between border-t border-slate-100 pt-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        {/* 左侧：正确率综合指示 */}
        <div className="space-y-0.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('card.accuracy')}
          </div>
          <div className="text-sm font-black text-slate-800 font-mono flex items-baseline gap-1.5">
            <span
              className={
                isNeverPracticed
                  ? 'text-slate-400'
                  : accuracy >= 80
                    ? 'text-emerald-600'
                    : 'text-slate-800'
              }
            >
              {isNeverPracticed ? '--' : `${accuracy}%`}
            </span>
            {todayCount > 0 && (
              <span className="text-[11px] font-normal text-slate-400 font-sans">
                ({todayCount} {t('common.trialsUnit')})
              </span>
            )}
          </div>
        </div>

        {/* 右侧：紧凑动作按钮组（根据 isNeverPracticed 动态倒转权重） */}
        <div className="flex items-center gap-2">
          {isNeverPracticed ? (
            <>
              {/* 次级：仅显示三角形 Play 图标的自适应训练按钮 */}
              <button
                type="button"
                onClick={onStartTraining}
                className="p-2.5 text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl transition-all cursor-pointer"
                title={t('card.startAdaptive')}
              >
                <Play className="w-4 h-4 fill-current text-slate-500" />
              </button>

              {/* 主要：高亮文字「基准测试」按钮 */}
              <button
                type="button"
                onClick={onStartBenchmark}
                className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 group-hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Target className="w-3.5 h-3.5" />
                <span>{t('card.startBenchmark')}</span>
              </button>
            </>
          ) : (
            <>
              {/* 次级：仅显示靶心 Target 图标的基准测试按钮 */}
              <button
                type="button"
                onClick={onStartBenchmark}
                className="p-2.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl transition-all cursor-pointer"
                title={t('card.startBenchmark')}
              >
                <Target className="w-4 h-4 text-slate-500" />
              </button>

              {/* 主要：高亮文字「自适应训练」按钮 */}
              <button
                type="button"
                onClick={onStartTraining}
                className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 group-hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t('card.startAdaptive')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
~~~~~
~~~~~typescript
    <div
      role="presentation"
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="group bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-3xl p-6 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative cursor-pointer select-none"
    >
      <div>
        {/* 顶部标题、图标与右上角状态徽章 */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-105 transition-all shadow-xs flex-shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                  {title}
                </h3>
                {isExperimental && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 px-2 py-0.5 rounded-lg flex-shrink-0">
                    <FlaskConical className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    {t('card.experimentalBadge')}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5">
                {todayCount > 0
                  ? `${t('card.todayTrials')}: ${todayCount} ${t('common.trialsUnit')}${
                      todayTimeMs > 0 ? ` (${formatTodayTimeWithT(todayTimeMs, t)})` : ''
                    }`
                  : isNeverPracticed
                    ? t('common.empty')
                    : `${t('card.todayTrials')}: 0 ${t('common.trialsUnit')}`}
              </div>
            </div>
          </div>

          {/* 右上角：等级胶囊与快捷操作 */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs font-mono font-black bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 border border-slate-200/80 dark:border-slate-700 group-hover:border-indigo-200 dark:group-hover:border-indigo-800 px-2.5 py-1 rounded-xl text-slate-700 dark:text-slate-300 transition-colors">
              Lvl {currentLevel}
            </span>

            <div
              className="flex items-center opacity-70 group-hover:opacity-100 transition-opacity ml-1"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
              {onOpenAnalytics && (
                <button
                  type="button"
                  onClick={onOpenAnalytics}
                  className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                  title={t('card.statsTooltip', { title })}
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title={t('card.settingsTooltip', { title })}
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 卡片描述 */}
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 min-h-[2.5rem] mb-5">
          {desc}
        </p>
      </div>

      {/* 底部指标栏与浮动操作按钮 */}
      <div
        className="flex items-end justify-between border-t border-slate-100 dark:border-slate-800 pt-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        {/* 左侧：正确率综合指示 */}
        <div className="space-y-0.5">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {t('card.accuracy')}
          </div>
          <div className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono flex items-baseline gap-1.5">
            <span
              className={
                isNeverPracticed
                  ? 'text-slate-400 dark:text-slate-500'
                  : accuracy >= 80
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-800 dark:text-slate-100'
              }
            >
              {isNeverPracticed ? '--' : `${accuracy}%`}
            </span>
            {todayCount > 0 && (
              <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500 font-sans">
                ({todayCount} {t('common.trialsUnit')})
              </span>
            )}
          </div>
        </div>

        {/* 右侧：紧凑动作按钮组（根据 isNeverPracticed 动态倒转权重） */}
        <div className="flex items-center gap-2">
          {isNeverPracticed ? (
            <>
              {/* 次级：仅显示三角形 Play 图标的自适应训练按钮 */}
              <button
                type="button"
                onClick={onStartTraining}
                className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 rounded-xl transition-all cursor-pointer"
                title={t('card.startAdaptive')}
              >
                <Play className="w-4 h-4 fill-current text-slate-500 dark:text-slate-400" />
              </button>

              {/* 主要：高亮文字「基准测试」按钮 */}
              <button
                type="button"
                onClick={onStartBenchmark}
                className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 dark:shadow-none group-hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Target className="w-3.5 h-3.5" />
                <span>{t('card.startBenchmark')}</span>
              </button>
            </>
          ) : (
            <>
              {/* 次级：仅显示靶心 Target 图标的基准测试按钮 */}
              <button
                type="button"
                onClick={onStartBenchmark}
                className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 rounded-xl transition-all cursor-pointer"
                title={t('card.startBenchmark')}
              >
                <Target className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>

              {/* 主要：高亮文字「自适应训练」按钮 */}
              <button
                type="button"
                onClick={onStartTraining}
                className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 dark:shadow-none group-hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t('card.startAdaptive')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
~~~~~

~~~~~act
patch_file
src/components/common/QuestionCardShell.tsx
~~~~~
~~~~~typescript
export function QuestionCardShell({
  hintText,
  hintIcon: HintIcon,
  showCanvasHints = true,
  maxWidth = 'max-w-lg',
  className = '',
  footer,
  children,
}: QuestionCardShellProps) {
  return (
    <div
      className={`w-full ${maxWidth} bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto ${className}`}
    >
      {showCanvasHints && hintText && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60 text-center">
          {HintIcon && <HintIcon className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />}
          <span>{hintText}</span>
        </div>
      )}

      {children}

      {footer}
    </div>
  );
}
~~~~~
~~~~~typescript
export function QuestionCardShell({
  hintText,
  hintIcon: HintIcon,
  showCanvasHints = true,
  maxWidth = 'max-w-lg',
  className = '',
  footer,
  children,
}: QuestionCardShellProps) {
  return (
    <div
      className={`w-full ${maxWidth} bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto ${className}`}
    >
      {showCanvasHints && hintText && (
        <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3.5 py-1.5 rounded-full border border-slate-200/60 dark:border-slate-700/60 text-center">
          {HintIcon && <HintIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />}
          <span>{hintText}</span>
        </div>
      )}

      {children}

      {footer}
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/components/common/Choice2AfcContainer.tsx
~~~~~
~~~~~typescript
  const renderCard = (opt: Choice2AfcOption) => {
    const isSelected = selectedChoice === opt.key;
    const isTarget = opt.isCorrect;

    let borderStyle =
      'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]';

    if (showAnswer) {
      if (isTarget) {
        borderStyle = 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20';
      } else if (isSelected) {
        borderStyle = 'bg-rose-50/50 border-rose-400 shadow-sm';
      } else {
        borderStyle = 'bg-slate-50/60 border-slate-200 opacity-60';
      }
    } else if (isSelected) {
      borderStyle = 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md';
    }

    return (
      <button
        type="button"
        disabled={disabled || showAnswer}
        onClick={() => onSelect(opt.key)}
        className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${borderStyle}`}
      >
        <div className="flex items-center justify-between w-full px-1">
          <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
            <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
              {opt.keyLabel || (opt.key === 'A' ? '1' : '2')}
            </span>
            {opt.title}
          </span>

          {showAnswer && isTarget && (
            <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-600" />
              {opt.badge || t('common.trueMatch')}
            </span>
          )}

          {showAnswer && !isTarget && opt.badge && (
            <span className="text-xs font-semibold text-slate-400">{opt.badge}</span>
          )}
        </div>

        {opt.content}
      </button>
    );
  };
~~~~~
~~~~~typescript
  const renderCard = (opt: Choice2AfcOption) => {
    const isSelected = selectedChoice === opt.key;
    const isTarget = opt.isCorrect;

    let borderStyle =
      'bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md cursor-pointer active:scale-[0.98]';

    if (showAnswer) {
      if (isTarget) {
        borderStyle =
          'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-500/20';
      } else if (isSelected) {
        borderStyle = 'bg-rose-50/50 dark:bg-rose-950/40 border-rose-400 shadow-sm';
      } else {
        borderStyle = 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-60';
      }
    } else if (isSelected) {
      borderStyle =
        'border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-md';
    }

    return (
      <button
        type="button"
        disabled={disabled || showAnswer}
        onClick={() => onSelect(opt.key)}
        className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${borderStyle}`}
      >
        <div className="flex items-center justify-between w-full px-1">
          <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-200 uppercase">
            <span className="w-5 h-5 rounded-lg bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center font-mono text-[11px]">
              {opt.keyLabel || (opt.key === 'A' ? '1' : '2')}
            </span>
            {opt.title}
          </span>

          {showAnswer && isTarget && (
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {opt.badge || t('common.trueMatch')}
            </span>
          )}

          {showAnswer && !isTarget && opt.badge && (
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{opt.badge}</span>
          )}
        </div>

        {opt.content}
      </button>
    );
  };
~~~~~

~~~~~act
patch_file
src/components/common/ChoiceNafcContainer.tsx
~~~~~
~~~~~typescript
        let border = 'border-slate-200 hover:border-indigo-300 hover:shadow-md bg-slate-50';
        if (showAnswer) {
          if (isTarget) {
            border = 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md';
          } else if (isSelected) {
            border = 'bg-rose-50/50 border-rose-400 shadow-sm';
          } else {
            border = 'bg-slate-50/60 border-slate-200 opacity-50';
          }
        } else if (isSelected) {
          border = 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md';
        }

        return (
          <button
            key={opt.key ?? `nafc-opt-${idx}`}
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => onSelect(idx, opt)}
            className={`group flex flex-col items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 text-left active:scale-[0.98] cursor-pointer ${border}`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  {keyLabel}
                </span>
                {opt.title || t('common.optionN', { num: keyLabel })}
              </span>
              {showAnswer && isTarget && (
                <Check className="w-4 h-4 text-emerald-600 font-extrabold" />
              )}
            </div>

            {opt.content}
          </button>
        );
~~~~~
~~~~~typescript
        let border =
          'border-slate-200 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md bg-slate-50 dark:bg-slate-800/60';
        if (showAnswer) {
          if (isTarget) {
            border =
              'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md';
          } else if (isSelected) {
            border = 'bg-rose-50/50 dark:bg-rose-950/40 border-rose-400 shadow-sm';
          } else {
            border = 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-50';
          }
        } else if (isSelected) {
          border =
            'border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-md';
        }

        return (
          <button
            key={opt.key ?? `nafc-opt-${idx}`}
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => onSelect(idx, opt)}
            className={`group flex flex-col items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 text-left active:scale-[0.98] cursor-pointer ${border}`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-200">
                <span className="w-5 h-5 rounded-lg bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center font-mono text-[11px]">
                  {keyLabel}
                </span>
                {opt.title || t('common.optionN', { num: keyLabel })}
              </span>
              {showAnswer && isTarget && (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
              )}
            </div>

            {opt.content}
          </button>
        );
~~~~~

#### Acts 3: 适配滑块、点阵与训练 Shell 容器

更新 `StandardSliderView.tsx`、`PointClickCanvas.tsx` 和 `TrainingShell.tsx`。

~~~~~act
patch_file
src/components/common/StandardSliderView.tsx
~~~~~
~~~~~typescript
      {preview}

      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>{label}</span>
          <span className="font-mono text-base font-black text-indigo-600">{formattedDisplay}</span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-slate-400 text-xs">
            {min}
            {unit}
          </span>

          <div
            {...pointerProps}
            style={
              hitMargin > 0
                ? {
                    paddingLeft: `${hitMargin}px`,
                    paddingRight: `${hitMargin}px`,
                    marginLeft: `-${hitMargin}px`,
                    marginRight: `-${hitMargin}px`,
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    marginTop: '-6px',
                    marginBottom: '-6px',
                  }
                : undefined
            }
            className={`relative flex-1 flex items-center select-none touch-none ${
              !showAnswer && !disabled ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div
              ref={trackRef}
              className="relative w-full h-7 rounded-xl bg-slate-200 border border-slate-300/80 shadow-inner flex items-center overflow-hidden"
            >
              {/* 当前激活进度条 */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
                style={{ width: valToPercent(activeVal) }}
              />

              {/* 未揭晓状态下的指针 */}
              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: valToPercent(activeVal) }}
                />
              )}

              {/* 动态容错感应区间 */}
              {!showAnswer && showToleranceBand && tolerance !== undefined && tolerance > 0 && (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: valToPercent(activeVal - tolerance) }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: valToPercent(activeVal + tolerance) }}
                  />
                </>
              )}

              {/* 答案揭晓：真理线与用户作答线 */}
              {showAnswer && targetValue !== undefined && (
                <>
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                    style={{ left: valToPercent(targetValue) }}
                  />
                  {userValue !== undefined && (
                    <div
                      className={`absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10 border-x border-white shadow-md ${
                        isHit ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ left: valToPercent(userValue) }}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">
            {max}
            {unit}
          </span>
        </div>

        {footerDetails}
      </div>
~~~~~
~~~~~typescript
      {preview}

      <div className="w-full space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span>{label}</span>
          <span className="font-mono text-base font-black text-indigo-600 dark:text-indigo-400">{formattedDisplay}</span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-slate-400 dark:text-slate-500 text-xs">
            {min}
            {unit}
          </span>

          <div
            {...pointerProps}
            style={
              hitMargin > 0
                ? {
                    paddingLeft: `${hitMargin}px`,
                    paddingRight: `${hitMargin}px`,
                    marginLeft: `-${hitMargin}px`,
                    marginRight: `-${hitMargin}px`,
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    marginTop: '-6px',
                    marginBottom: '-6px',
                  }
                : undefined
            }
            className={`relative flex-1 flex items-center select-none touch-none ${
              !showAnswer && !disabled ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div
              ref={trackRef}
              className="relative w-full h-7 rounded-xl bg-slate-200 dark:bg-slate-700 border border-slate-300/80 dark:border-slate-600/80 shadow-inner flex items-center overflow-hidden"
            >
              {/* 当前激活进度条 */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-500/20 dark:bg-indigo-400/20"
                style={{ width: valToPercent(activeVal) }}
              />

              {/* 未揭晓状态下的指针 */}
              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 dark:bg-indigo-400 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: valToPercent(activeVal) }}
                />
              )}

              {/* 动态容错感应区间 */}
              {!showAnswer && showToleranceBand && tolerance !== undefined && tolerance > 0 && (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 dark:bg-indigo-300/80 -translate-x-1/2"
                    style={{ left: valToPercent(activeVal - tolerance) }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 dark:bg-indigo-300/80 -translate-x-1/2"
                    style={{ left: valToPercent(activeVal + tolerance) }}
                  />
                </>
              )}

              {/* 答案揭晓：真理线与用户作答线 */}
              {showAnswer && targetValue !== undefined && (
                <>
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white dark:border-slate-900 shadow-md"
                    style={{ left: valToPercent(targetValue) }}
                  />
                  {userValue !== undefined && (
                    <div
                      className={`absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10 border-x border-white dark:border-slate-900 shadow-md ${
                        isHit ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ left: valToPercent(userValue) }}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 dark:text-slate-500 text-xs">
            {max}
            {unit}
          </span>
        </div>

        {footerDetails}
      </div>
~~~~~

~~~~~act
patch_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~typescript
  return (
    <div ref={containerRef} className={`relative block ${maxDisplayWidth} select-none`}>
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
        }}
        tabIndex={0}
        role="button"
        aria-label={t('shell.pointGridAria')}
        className={`w-full h-full aspect-square rounded-xl border border-gray-100 bg-white shadow-inner touch-none transition-all block ${
          disabled || showAnswer
            ? 'cursor-default'
            : hoverPoint
              ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
              : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
        }`}
      />

      {/* 触控浮动放大镜 (Loupe) */}
      {isTouching && loupePos && (
        <div
          className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-600 shadow-2xl bg-white ring-4 ring-indigo-500/25 overflow-hidden animate-in zoom-in-75 duration-75"
          style={{
            left: `${loupePos.x}px`,
            top: `${loupePos.y}px`,
            width: `${LOUPE_SIZE}px`,
            height: `${LOUPE_SIZE}px`,
          }}
        >
          <canvas
            ref={loupeCanvasRef}
            width={LOUPE_SIZE}
            height={LOUPE_SIZE}
            className="w-full h-full block"
          />
        </div>
      )}
    </div>
  );
~~~~~
~~~~~typescript
  return (
    <div ref={containerRef} className={`relative block ${maxDisplayWidth} select-none`}>
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
        }}
        tabIndex={0}
        role="button"
        aria-label={t('shell.pointGridAria')}
        className={`w-full h-full aspect-square rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-inner touch-none transition-all block ${
          disabled || showAnswer
            ? 'cursor-default'
            : hoverPoint
              ? 'cursor-none hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-indigo-50/50'
              : 'cursor-crosshair hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-indigo-50/50'
        }`}
      />

      {/* 触控浮动放大镜 (Loupe) */}
      {isTouching && loupePos && (
        <div
          className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-600 dark:border-indigo-500 shadow-2xl bg-white dark:bg-slate-900 ring-4 ring-indigo-500/25 overflow-hidden animate-in zoom-in-75 duration-75"
          style={{
            left: `${loupePos.x}px`,
            top: `${loupePos.y}px`,
            width: `${LOUPE_SIZE}px`,
            height: `${LOUPE_SIZE}px`,
          }}
        >
          <canvas
            ref={loupeCanvasRef}
            width={LOUPE_SIZE}
            height={LOUPE_SIZE}
            className="w-full h-full block"
          />
        </div>
      )}
    </div>
  );
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-4 sm:gap-6">
      {/* 统一 Header 状态栏：极简沉浸式紧凑单行排版 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {showExitButton && (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer active:scale-95"
              title={t('shell.exitTraining')}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('shell.exitTraining')}</span>
            </button>
          )}

          <div className="relative flex items-center min-w-0">
            <div className="text-xs font-black text-slate-800 truncate flex items-center gap-1.5">
              <span className="truncate">{cardTitle}</span>
              {sessionType === 'benchmark' && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-md flex-shrink-0">
                  {t('shell.benchmark')}
                </span>
              )}
              {(instruction || desc) && (
                <button
                  type="button"
                  onClick={() => setShowHelpTooltip(!showHelpTooltip)}
                  onMouseEnter={() => setShowHelpTooltip(true)}
                  onMouseLeave={() => setShowHelpTooltip(false)}
                  className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5 rounded-md flex-shrink-0 cursor-pointer"
                  title={t('shell.instructionTitle')}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {showHelpTooltip && (instruction || desc) && (
              <div className="absolute left-0 top-full mt-2 z-40 w-72 bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-xs leading-relaxed animate-in fade-in zoom-in-95 duration-150">
                <div className="font-bold text-indigo-300 mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  {t('shell.instructionTitle')}
                </div>
                <p className="text-slate-200 text-[11px]">{instruction || desc}</p>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：紧凑型指标胶囊 */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
              {t('shell.trialsCount')}
            </span>
            <span className="font-mono font-black text-slate-800">
              {totalTrials}
              {sessionType === 'benchmark' ? ' / 20' : ` ${t('common.trialsUnit')}`}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-100/80 px-2.5 py-1 rounded-xl">
            <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider hidden sm:inline">
              Lvl
            </span>
            <span className="font-mono font-black text-indigo-700">{currentLevel}</span>
          </div>

          {showTimer && (
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100 text-slate-600">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="font-mono font-bold text-[11px]">
                {formatSecondsToTimer(elapsedSeconds)}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* 统一 Canvas 居中容器与休眠遮罩 */}
      <div className="relative w-full flex justify-center">
        {children({ disabled: isFinished || isIdle, isIdle })}
        {isIdle && <IdlePauseOverlay onResume={resumeFromIdle} />}
      </div>

      {/* 统一手动下一题控制栏 */}
      {!autoNext && (
        <div className="flex items-center justify-center">
          {isFinished ? (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all active:scale-95"
            >
              {t('shell.viewSummary')}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={!showAnswer}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1 ${
                showAnswer
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {t('common.nextQuestion')}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
~~~~~
~~~~~typescript
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-4 sm:gap-6">
      {/* 统一 Header 状态栏：极简沉浸式紧凑单行排版 */}
      <header className="w-full bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-xs flex items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          {showExitButton && (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer active:scale-95"
              title={t('shell.exitTraining')}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('shell.exitTraining')}</span>
            </button>
          )}

          <div className="relative flex items-center min-w-0">
            <div className="text-xs font-black text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
              <span className="truncate">{cardTitle}</span>
              {sessionType === 'benchmark' && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 rounded-md flex-shrink-0">
                  {t('shell.benchmark')}
                </span>
              )}
              {(instruction || desc) && (
                <button
                  type="button"
                  onClick={() => setShowHelpTooltip(!showHelpTooltip)}
                  onMouseEnter={() => setShowHelpTooltip(true)}
                  onMouseLeave={() => setShowHelpTooltip(false)}
                  className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-0.5 rounded-md flex-shrink-0 cursor-pointer"
                  title={t('shell.instructionTitle')}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {showHelpTooltip && (instruction || desc) && (
              <div className="absolute left-0 top-full mt-2 z-40 w-72 bg-slate-900 dark:bg-slate-800 text-white p-3 rounded-2xl shadow-xl border border-slate-800 dark:border-slate-700 text-xs leading-relaxed animate-in fade-in zoom-in-95 duration-150">
                <div className="font-bold text-indigo-300 mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  {t('shell.instructionTitle')}
                </div>
                <p className="text-slate-200 text-[11px]">{instruction || desc}</p>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：紧凑型指标胶囊 */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-2.5 py-1 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:inline">
              {t('shell.trialsCount')}
            </span>
            <span className="font-mono font-black text-slate-800 dark:text-slate-100">
              {totalTrials}
              {sessionType === 'benchmark' ? ' / 20' : ` ${t('common.trialsUnit')}`}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100/80 dark:border-indigo-900 px-2.5 py-1 rounded-xl">
            <span className="text-[10px] font-extrabold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider hidden sm:inline">
              Lvl
            </span>
            <span className="font-mono font-black text-indigo-700 dark:text-indigo-300">{currentLevel}</span>
          </div>

          {showTimer && (
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              <span className="font-mono font-bold text-[11px]">
                {formatSecondsToTimer(elapsedSeconds)}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* 统一 Canvas 居中容器与休眠遮罩 */}
      <div className="relative w-full flex justify-center">
        {children({ disabled: isFinished || isIdle, isIdle })}
        {isIdle && <IdlePauseOverlay onResume={resumeFromIdle} />}
      </div>

      {/* 统一手动下一题控制栏 */}
      {!autoNext && (
        <div className="flex items-center justify-center">
          {isFinished ? (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all active:scale-95"
            >
              {t('shell.viewSummary')}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={!showAnswer}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1 ${
                showAnswer
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md active:scale-95'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              {t('common.nextQuestion')}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
~~~~~

### 下一步建议

第三阶段的通用 UI 与训练容器适配已全部完成。

建议进入**第四阶段：主干视图与复杂卡片暗色适配 (Home / DiscoveryView / GlobalStatsView / CardAnalyticsView / PlanEditorView)**：
1. 适配 `Home.tsx` 中的 Hero 卡片、阶段清单与指标卡；
2. 适配 `DiscoveryView.tsx` 与 `FilterEngine.tsx` 中的五维矩阵筛选器；
3. 适配 `GlobalStatsView.tsx`、`CardAnalyticsView.tsx` 与各统计图表卡；
4. 适配 `PlanEditorView.tsx` 与 `PlanTrainingView.tsx`。
