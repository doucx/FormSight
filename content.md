已分析深色模式下的样式缺陷，主要问题及排查出的同类问题如下：
1. **阴影光晕问题**：在暗色模式下，`shadow-indigo-200` 等亮色浅蓝/浅红阴影未添加 `dark:shadow-none`，导致深色背景下泛出白/亮蓝色光晕。
2. **文字对比度不足**：`CardPickerPanel` 等组件在选中高亮状态下使用了硬编码亮色文字类（如 `text-emerald-950`、`text-emerald-700/80`），在暗色背景 `dark:bg-emerald-950/40` 上严重失真或看不清。
3. **缺少暗色类名的徽章与容器**：包括 `PlanHeroCard`、`PlanSummaryModal`、`PlanEditorHeader`、`PlanLibraryDrawer`、`SettingsModal`、`GeneralPreferencesSection`、`CardAnalyticsView`、`CognitiveMasteryGrid` 等中的徽章、Tab与各类卡片背景及边框。

下面是修复计划：

## [WIP] fix(ui): 深度打磨与完善深色模式样式与对比度

### 错误分析
1. **亮色阴影污染**：大量使用 `shadow-indigo-200` / `shadow-rose-200` 的按钮和容器在暗色模式未重置，表现为亮白或刺眼的浅蓝发光边。
2. **深绿文本在深色背景下低对比度**：`CardPickerPanel` 中加入计划的卡片使用 `text-emerald-950` 与 `text-emerald-700/80`，在深色半透明背景 `dark:bg-emerald-950/40` 下对比度过低。
3. **部分二级卡片与徽章缺少 dark 类名**：部分胶囊徽章（如 Lvl 标记、官方预设、试验性标识、训练计划总结等）的背景、边框与文字颜色缺少 dark mode 适配。

### 用户需求
修复深色模式下按钮发光光晕、训练窗口及列表各处背景/边框未适配暗色以及绿色等特定文字在暗色下辨识度低的问题，全面排查并优化类似视觉瑕疵。

### 评论
深色模式下的良好对比度与一致的暗色主题风格直接影响用户长时间视觉感知训练的心流体验，消除刺眼亮色阴影与低对比度文字非常必要。

### 目标
1. 为所有 `shadow-indigo-200` / `shadow-rose-200` 样式统一补充 `dark:shadow-none` 消除暗色光晕。
2. 为 `CardPickerPanel` 补充 `dark:text-emerald-200`、`dark:text-emerald-300/80`、`dark:bg-emerald-800/80` 等适配。
3. 补齐 `PlanHeroCard`、`PlanSummaryModal`、`SessionSummaryModal`、`PlanLibraryDrawer`、`PlanEditorHeader`、`SettingsModal`、`GeneralPreferencesSection`、`CognitiveMasteryGrid`、`CardAnalyticsView` 等多处组件在暗色模式下的背景、边框、文字颜色与对比度。

### 基本原理
通过在 Tailwind 类名中精准补充 `dark:shadow-none`、`dark:bg-*`、`dark:border-*` 以及 `dark:text-*`，确保浅色模式保持清爽的同时，在 `html.dark` 下自然过渡到低视觉刺激、高对比度的深色层级。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/refine #task/domain/ui #task/object/dark-mode-polishing #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `CardPickerPanel.tsx` 选中状态文字及徽章暗色对比度

~~~~~act
patch_file
src/components/plan/editor/CardPickerPanel.tsx
~~~~~
~~~~~old
            const cardBgStyle = isAdded
              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 border-emerald-300 dark:border-emerald-800 hover:border-emerald-400 shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-500';

            const iconBgStyle = isAdded
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs group-hover:scale-105';

            return (
              <button
                type="button"
                key={card.id}
                onClick={() => onAddItem(card.id)}
                className={`p-2.5 rounded-2xl text-left transition-all flex items-center justify-between gap-2 group active:scale-[0.98] border cursor-pointer ${cardBgStyle}`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className={`p-1.5 rounded-xl transition-transform flex-shrink-0 ${iconBgStyle}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold truncate ${
                          isAdded ? 'text-emerald-950' : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {cardTitle}
                      </span>
                      {isAdded && (
                        <span className="font-mono text-[9px] font-black bg-emerald-200/80 text-emerald-800 px-1.5 py-0.2 rounded-md flex-shrink-0 flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" />
                          {addedCount > 1 ? `x${addedCount}` : ''}
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[10px] truncate ${
                        isAdded ? 'text-emerald-700/80' : 'text-slate-400'
                      }`}
                    >
                      {cardDesc}
                    </div>
                  </div>
                </div>

                <div
                  className={`p-1 rounded-lg flex-shrink-0 transition-colors ${
                    isAdded
                      ? 'text-emerald-600 hover:bg-emerald-200/60'
                      : 'text-indigo-400 group-hover:text-indigo-600 hover:bg-indigo-100/50'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </button>
            );
~~~~~
~~~~~new
            const cardBgStyle = isAdded
              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 border-emerald-300 dark:border-emerald-800 hover:border-emerald-400 shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-500';

            const iconBgStyle = isAdded
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs group-hover:scale-105';

            return (
              <button
                type="button"
                key={card.id}
                onClick={() => onAddItem(card.id)}
                className={`p-2.5 rounded-2xl text-left transition-all flex items-center justify-between gap-2 group active:scale-[0.98] border cursor-pointer ${cardBgStyle}`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className={`p-1.5 rounded-xl transition-transform flex-shrink-0 ${iconBgStyle}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold truncate ${
                          isAdded
                            ? 'text-emerald-900 dark:text-emerald-200'
                            : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {cardTitle}
                      </span>
                      {isAdded && (
                        <span className="font-mono text-[9px] font-black bg-emerald-200/80 dark:bg-emerald-800/80 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.2 rounded-md flex-shrink-0 flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" />
                          {addedCount > 1 ? `x${addedCount}` : ''}
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[10px] truncate ${
                        isAdded
                          ? 'text-emerald-700/80 dark:text-emerald-300/80'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {cardDesc}
                    </div>
                  </div>
                </div>

                <div
                  className={`p-1 rounded-lg flex-shrink-0 transition-colors ${
                    isAdded
                      ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60'
                      : 'text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 hover:bg-indigo-100/50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </button>
            );
~~~~~

#### Acts 2: 修复 `PlanHeroCard.tsx` 中的光晕与暗色适配

~~~~~act
patch_file
src/components/plan/PlanHeroCard.tsx
~~~~~
~~~~~old
        <button
          type="button"
          onClick={onOpenEditor}
          className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t('plan.customizeBtn')}
        </button>
      </div>
    );
  }

  return (
    <div className="group w-full bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col gap-5 relative z-10">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-sm shadow-indigo-200">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {favoritePlans.length > 1 && onSelectPlan ? (
                <div ref={dropdownRef} className="relative inline-block text-left">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="group/btn inline-flex items-center gap-1.5 text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none"
                  >
                    <span>{plan.name}</span>
                    <div
                      className={`p-1 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover/btn:bg-indigo-50 dark:group-hover/btn:bg-indigo-950 text-slate-500 group-hover/btn:text-indigo-600 dark:group-hover/btn:text-indigo-400 transition-all duration-200 ${
                        isDropdownOpen ? 'rotate-180 bg-indigo-50 text-indigo-600' : ''
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 z-40 w-72 sm:w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-1.5 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span>{t('plan.switchPlan')}</span>
                        <span className="font-mono">
                          {t('plan.availableCount', { count: favoritePlans.length })}
                        </span>
                      </div>

                      <div className="max-h-60 overflow-y-auto py-1 space-y-1 pr-1">
                        {favoritePlans.map((p) => {
                          const isSelected = p.id === plan.id;
                          const stageCount = (p.items || []).length;
                          const pTrials = (p.items || []).reduce(
                            (acc, c) => acc + c.targetTrials,
                            0,
                          );

                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                onSelectPlan(p.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-2.5 ${
                                isSelected
                                  ? 'bg-indigo-50/80 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 font-bold border border-indigo-200/80 dark:border-indigo-900/80 shadow-sm'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold truncate text-slate-800 dark:text-slate-100">
                                    {p.name}
                                  </span>
                                  {p.isBuiltin && (
                                    <span className="text-[9px] px-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded">
                                      {t('common.official')}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {t('plan.stageCount', { count: stageCount })} •{' '}
                                  {t('plan.totalTrialsSummary', { trials: pTrials })}
                                </div>
                              </div>

                              {isSelected && (
                                <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {plan.name}
                </h2>
              )}

              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full">
                {t('plan.stageCount', { count: plan.items.length })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mt-0.5">
              <span>{t('plan.totalTrialsSummary', { trials: totalTrials })}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {t('plan.estimatedTime', { min: estimatedMin })}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenEditor}
          className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          title={t('plan.editPlan')}
        >
          <Sliders className="w-3.5 h-3.5" />
          {t('plan.editPlan')}
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {plan.items.map((item, idx) => {
          const card = registry.getCardById(item.cardId);
          if (!card) return null;
          const Icon = card.icon;
          const cardTitle = getCardTitle(card, t);

          return (
            <div key={item.id} className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 px-3 py-2 rounded-2xl shadow-inner">
                <div className="w-5 h-5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-[10px] font-black">
                  {idx + 1}
                </div>
                <Icon className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {cardTitle}
                </span>
                <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                  {item.targetTrials}
                  {t('common.trialsUnit')}
                </span>
              </div>
              {idx < plan.items.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
        <div className="text-xs text-slate-400 font-medium">{t('plan.syncNotice')}</div>

        <button
          type="button"
          onClick={onStartPlan}
          className="py-3 px-6 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2 ml-auto"
        >
          <Play className="w-4 h-4 fill-current" />
          {t('plan.startPlan')}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
~~~~~
~~~~~new
        <button
          type="button"
          onClick={onOpenEditor}
          className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t('plan.customizeBtn')}
        </button>
      </div>
    );
  }

  return (
    <div className="group w-full bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col gap-5 relative z-10">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-sm shadow-indigo-200 dark:shadow-none">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {favoritePlans.length > 1 && onSelectPlan ? (
                <div ref={dropdownRef} className="relative inline-block text-left">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="group/btn inline-flex items-center gap-1.5 text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none"
                  >
                    <span>{plan.name}</span>
                    <div
                      className={`p-1 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover/btn:bg-indigo-50 dark:group-hover/btn:bg-indigo-950 text-slate-500 group-hover/btn:text-indigo-600 dark:group-hover/btn:text-indigo-400 transition-all duration-200 ${
                        isDropdownOpen ? 'rotate-180 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' : ''
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 z-40 w-72 sm:w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-1.5 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span>{t('plan.switchPlan')}</span>
                        <span className="font-mono">
                          {t('plan.availableCount', { count: favoritePlans.length })}
                        </span>
                      </div>

                      <div className="max-h-60 overflow-y-auto py-1 space-y-1 pr-1">
                        {favoritePlans.map((p) => {
                          const isSelected = p.id === plan.id;
                          const stageCount = (p.items || []).length;
                          const pTrials = (p.items || []).reduce(
                            (acc, c) => acc + c.targetTrials,
                            0,
                          );

                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                onSelectPlan(p.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-2.5 ${
                                isSelected
                                  ? 'bg-indigo-50/80 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 font-bold border border-indigo-200/80 dark:border-indigo-900/80 shadow-sm'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold truncate text-slate-800 dark:text-slate-100">
                                    {p.name}
                                  </span>
                                  {p.isBuiltin && (
                                    <span className="text-[9px] px-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded">
                                      {t('common.official')}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {t('plan.stageCount', { count: stageCount })} •{' '}
                                  {t('plan.totalTrialsSummary', { trials: pTrials })}
                                </div>
                              </div>

                              {isSelected && (
                                <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {plan.name}
                </h2>
              )}

              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 rounded-full">
                {t('plan.stageCount', { count: plan.items.length })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mt-0.5">
              <span>{t('plan.totalTrialsSummary', { trials: totalTrials })}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {t('plan.estimatedTime', { min: estimatedMin })}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenEditor}
          className="px-3 py-1.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          title={t('plan.editPlan')}
        >
          <Sliders className="w-3.5 h-3.5" />
          {t('plan.editPlan')}
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {plan.items.map((item, idx) => {
          const card = registry.getCardById(item.cardId);
          if (!card) return null;
          const Icon = card.icon;
          const cardTitle = getCardTitle(card, t);

          return (
            <div key={item.id} className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 px-3 py-2 rounded-2xl shadow-inner">
                <div className="w-5 h-5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-[10px] font-black">
                  {idx + 1}
                </div>
                <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {cardTitle}
                </span>
                <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                  {item.targetTrials}
                  {t('common.trialsUnit')}
                </span>
              </div>
              {idx < plan.items.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
        <div className="text-xs text-slate-400 font-medium">{t('plan.syncNotice')}</div>

        <button
          type="button"
          onClick={onStartPlan}
          className="py-3 px-6 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-2 ml-auto"
        >
          <Play className="w-4 h-4 fill-current" />
          {t('plan.startPlan')}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
~~~~~

#### Acts 3: 消除公共 View/Modal 中 `shadow-indigo-200` 等亮色阴影光晕

~~~~~act
patch_file
src/components/common/StandardNafcView.tsx
~~~~~
~~~~~old
      {submitMode === 'button' && !showAnswer && (
        <button
          type="button"
          onClick={handleExplicitSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all cursor-pointer"
        >
          {effectiveSubmitButtonText}
        </button>
      )}
~~~~~
~~~~~new
      {submitMode === 'button' && !showAnswer && (
        <button
          type="button"
          onClick={handleExplicitSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 dark:shadow-none transition-all cursor-pointer"
        >
          {effectiveSubmitButtonText}
        </button>
      )}
~~~~~

~~~~~act
patch_file
src/components/common/StandardSliderView.tsx
~~~~~
~~~~~old
      {isButtonSubmit && !showAnswer && (
        <button
          type="button"
          onClick={() => {
            if (!disabled && !showAnswer) onAnswer(currentVal);
          }}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all cursor-pointer"
        >
          {effectiveSubmitButtonText}
        </button>
      )}
~~~~~
~~~~~new
      {isButtonSubmit && !showAnswer && (
        <button
          type="button"
          onClick={() => {
            if (!disabled && !showAnswer) onAnswer(currentVal);
          }}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 dark:shadow-none transition-all cursor-pointer"
        >
          {effectiveSubmitButtonText}
        </button>
      )}
~~~~~

~~~~~act
patch_file
src/components/common/IdlePauseOverlay.tsx
~~~~~
~~~~~old
        <button
          type="button"
          onClick={onResume}
          className="mt-1 w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
        >
          {t('common.clickToResume')}
        </button>
~~~~~
~~~~~new
        <button
          type="button"
          onClick={onResume}
          className="mt-1 w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
        >
          {t('common.clickToResume')}
        </button>
~~~~~

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~old
      <div className="pt-2">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98] cursor-pointer"
        >
          {t('common.complete')}
        </button>
      </div>
~~~~~
~~~~~new
      <div className="pt-2">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98] cursor-pointer"
        >
          {t('common.complete')}
        </button>
      </div>
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~old
      <div className="pt-2">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
        >
          {t('common.complete')}
        </button>
      </div>
~~~~~
~~~~~new
      <div className="pt-2">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98]"
        >
          {t('common.complete')}
        </button>
      </div>
~~~~~

~~~~~act
patch_file
src/components/plan/PlanSummaryModal.tsx
~~~~~
~~~~~old
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            {t('common.restartPlan')}
          </button>
~~~~~
~~~~~new
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            {t('common.restartPlan')}
          </button>
~~~~~

~~~~~act
patch_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~old
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            {t('summary.trainAgain')}
          </button>
~~~~~
~~~~~new
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            {t('summary.trainAgain')}
          </button>
~~~~~

#### Acts 4: 修复 `PlanEditorHeader.tsx` 与 `PlanLibraryDrawer.tsx` 的暗色微调

~~~~~act
patch_file
src/components/plan/editor/PlanEditorHeader.tsx
~~~~~
~~~~~old
              {isNewPlan ? (
                <span className="hidden sm:inline-flex text-[10px] font-extrabold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 flex-shrink-0 items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {t('common.newPlanBadge')}
                </span>
              ) : currentPlan.isBuiltin ? (
                <span className="hidden sm:inline-flex text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100 flex-shrink-0">
                  {t('common.officialBadge')}
                </span>
              ) : null}
~~~~~
~~~~~new
              {isNewPlan ? (
                <span className="hidden sm:inline-flex text-[10px] font-extrabold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-md border border-emerald-200 dark:border-emerald-800 flex-shrink-0 items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {t('common.newPlanBadge')}
                </span>
              ) : currentPlan.isBuiltin ? (
                <span className="hidden sm:inline-flex text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-100 dark:border-indigo-900 flex-shrink-0">
                  {t('common.officialBadge')}
                </span>
              ) : null}
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanEditorHeader.tsx
~~~~~
~~~~~old
        {/* 统一开始训练主 CTA */}
        <button
          type="button"
          onClick={onSaveAndStart}
          disabled={currentPlan.items.length === 0}
          className="px-3.5 py-2 sm:px-4 sm:py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{t('plan.startPlan')}</span>
        </button>
~~~~~
~~~~~new
        {/* 统一开始训练主 CTA */}
        <button
          type="button"
          onClick={onSaveAndStart}
          disabled={currentPlan.items.length === 0}
          className="px-3.5 py-2 sm:px-4 sm:py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{t('plan.startPlan')}</span>
        </button>
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanLibraryDrawer.tsx
~~~~~
~~~~~old
                  {p.isBuiltin && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md">
                      {t('plan.officialTag')}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {t('plan.stageAndTrialsSummary', { stages: stageCount, trials: totalTrials })}
                </div>
              </button>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => onToggleFavorite(p.id, e)}
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    isFav
                      ? 'text-amber-500 hover:bg-amber-50'
                      : 'text-slate-300 hover:text-slate-500'
                  }`}
                  title={isFav ? t('common.favoritedTooltip') : t('common.unfavoritedTooltip')}
                >
                  <Star className={`w-4 h-4 ${isFav ? 'fill-amber-500' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDeleteClick(p.id, e)}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    isPendingDelete
                      ? 'bg-rose-600 text-white shadow-sm animate-pulse'
                      : 'text-slate-300 hover:text-rose-600 hover:bg-rose-50'
                  }`}
                  title={isPendingDelete ? t('common.confirm') : t('common.deletePlan')}
                >
                  {isPendingDelete ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
~~~~~
~~~~~new
                  {p.isBuiltin && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-100 dark:border-indigo-900">
                      {t('plan.officialTag')}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  {t('plan.stageAndTrialsSummary', { stages: stageCount, trials: totalTrials })}
                </div>
              </button>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => onToggleFavorite(p.id, e)}
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    isFav
                      ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                      : 'text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400'
                  }`}
                  title={isFav ? t('common.favoritedTooltip') : t('common.unfavoritedTooltip')}
                >
                  <Star className={`w-4 h-4 ${isFav ? 'fill-amber-500' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDeleteClick(p.id, e)}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    isPendingDelete
                      ? 'bg-rose-600 text-white shadow-sm animate-pulse'
                      : 'text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                  }`}
                  title={isPendingDelete ? t('common.confirm') : t('common.deletePlan')}
                >
                  {isPendingDelete ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
~~~~~

#### Acts 5: 优化 `CardAnalyticsView.tsx` 与 `PlanEditorView.tsx` 暗色细节

~~~~~act
patch_file
src/views/CardAnalyticsView.tsx
~~~~~
~~~~~old
                {card.tags.status === 'experimental' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                    <FlaskConical className="w-3 h-3 text-amber-600" />
                    {t('card.experimentalBadge')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                {cardDesc || t('analyticsModal.cardStatsTitle', { title: cardTitle })}
              </p>
            </div>
          </div>
        </div>

        {/* 右侧操作按钮组 */}
        <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
          <button
            type="button"
            onClick={() => onOpenSettings(card.id)}
            className="p-2.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-all cursor-pointer shadow-xs"
            title={t('card.settingsTooltip', { title: cardTitle })}
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onStartBenchmark(card.id)}
            className="py-2.5 px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
            title={t('card.startBenchmark')}
          >
            <Target className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('card.startBenchmark')}</span>
          </button>

          <button
            type="button"
            onClick={() => onStartTraining(card.id)}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t('card.startAdaptive')}</span>
          </button>
        </div>
~~~~~
~~~~~new
                {card.tags.status === 'experimental' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 px-2 py-0.5 rounded-md">
                    <FlaskConical className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    {t('card.experimentalBadge')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                {cardDesc || t('analyticsModal.cardStatsTitle', { title: cardTitle })}
              </p>
            </div>
          </div>
        </div>

        {/* 右侧操作按钮组 */}
        <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
          <button
            type="button"
            onClick={() => onOpenSettings(card.id)}
            className="p-2.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-all cursor-pointer shadow-xs"
            title={t('card.settingsTooltip', { title: cardTitle })}
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onStartBenchmark(card.id)}
            className="py-2.5 px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
            title={t('card.startBenchmark')}
          >
            <Target className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('card.startBenchmark')}</span>
          </button>

          <button
            type="button"
            onClick={() => onStartTraining(card.id)}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t('card.startAdaptive')}</span>
          </button>
        </div>
~~~~~

~~~~~act
patch_file
src/views/PlanEditorView.tsx
~~~~~
~~~~~old
      {toastNotice && (
        <div className="w-full text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-2xl animate-in fade-in flex-shrink-0">
          {toastNotice}
        </div>
      )}
~~~~~
~~~~~new
      {toastNotice && (
        <div className="w-full text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 px-4 py-2 rounded-2xl animate-in fade-in flex-shrink-0">
          {toastNotice}
        </div>
      )}
~~~~~

### 下一步建议
1. 运行系统测试套件（如 `pnpm test`），验证界面重构与样式修复后所有单测持续通过。
2. 在深色模式下实际进入各个训练阶段（包括单星、色相、相对色彩等）以及计划编排器，进行视觉验收。
