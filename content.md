好的，我将为你修复阶段卡片文本溢出挤压按钮的问题，并将阶段列表与卡片挑选区自适应拉伸占满视口高度，消除底部空白。

## [WIP] fix(plan): 修复阶段列表文本溢出并实现编排视图高度自适应撑满视口

### 用户需求
1. **防止横向溢出**：阶段列表在长标题/长描述场景下，不能挤压右侧题量设置与操作按钮，杜绝水平滚动条。
2. **拉伸撑满视口**：使“训练阶段列表”和“模块挑选面板”双栏自适应延伸占满屏幕高度，移除页面底部多余空白，提升大屏下的信息展示效率。

### 错误分析
1. **水平溢出原因**：`PlanStageList.tsx` 中条目的左侧文本容器与右侧操作容器在 flex 布局下缺少 `min-w-0` 与 `flex-shrink-0` 严格约束，导致长文本撑破弹性盒默认最小内容宽度（`min-width: auto`）。
2. **底部空白原因**：`PlanEditorView.tsx` 及其内部子组件（`PlanStageList`、`CardPickerPanel`）使用了硬编码的矮固定高度（如 `max-h-72`、`max-h-52`），没有启用父子 Flex 链式 `flex-1` / `h-full` 伸展。

### 目标
1. 优化 `PlanStageList.tsx` 条目布局，左侧赋予 `min-w-0 flex-1`，右侧操作栏赋予 `flex-shrink-0`，使文本超长时平滑截断，右侧按钮始终对齐不被挤压。
2. 改造 `PlanEditorView.tsx`、`PlanStageList.tsx` 和 `CardPickerPanel.tsx`，将内部固定高度改为 `flex-1 overflow-y-auto`，双栏卡片高度撑满视口。

### 基本原理
- 遵循 CSS Flexbox 规范：在 Flex 容器内的子级文本块设置 `min-w-0`，阻断内容宽度向外无限扩散，确保 `truncate` 真正生效。
- 采用 `h-[calc(100vh-2rem)] sm:h-[calc(100vh-4rem)] flex flex-col` 布局，把中间网格设置为 `flex-1 min-h-0`，内部列表随视口自适应滚动，既整洁又消除多余留白。

### 标签
#intent/fix #flow/ready #priority/high #comp/plan #concept/ui #scope/ux #ai/instruct #task/domain/plan #task/object/plan-layout #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修复 `PlanStageList` 布局并支持高度自适应

~~~~~act
patch_file
src/components/plan/editor/PlanStageList.tsx
~~~~~
~~~~~tsx.old
export function PlanStageList({
  currentPlan,
  totalTrials,
  estimatedMin,
  trialPresets,
  onBatchUpdateTrials,
  onClearAll,
  onUpdateTrials,
  onMoveItem,
  onRemoveItem,
}: PlanStageListProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
          <span>{t('plan.stageCount', { count: currentPlan.items.length })}</span>
          <span className="text-slate-400 font-normal">
            • {t('plan.totalTrialsSummary', { trials: totalTrials })} ·{' '}
            {t('plan.estimatedTime', { min: estimatedMin })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentPlan.items.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400">{t('plan.batchTrials')}</span>
              {trialPresets.map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => onBatchUpdateTrials(num)}
                  className="px-1.5 py-0.5 text-[10px] font-bold hover:text-indigo-600 rounded hover:bg-white transition-colors"
                >
                  {num}
                  {t('common.trialsUnit')}
                </button>
              ))}
            </div>
          )}

          {currentPlan.items.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              {t('plan.clearStages')}
            </button>
          )}
        </div>
      </div>

      {currentPlan.items.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50/50">
          <Zap className="w-6 h-6 text-slate-300" />
          <span>{t('plan.emptyPlanTip')}</span>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {currentPlan.items.map((item, idx) => {
            const card = registry.getCardById(item.cardId);
            if (!card) return null;
            const Icon = card.icon;
            const cardTitle =
              t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;
            const cardDesc = t(`packs.${card.packId}.cards.${card.id}.desc`) || card.desc || '';

            return (
              <div
                key={item.id}
                className="p-3 bg-white border border-slate-200/90 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 text-white font-mono text-[11px] font-black flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">{cardTitle}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[180px] sm:max-w-xs">{cardDesc}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl">
                    {trialPresets.map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => onUpdateTrials(item.id, preset)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                          item.targetTrials === preset
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMoveItem(idx, 'up')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                      title={t('plan.moveUpTitle')}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === currentPlan.items.length - 1}
                      onClick={() => onMoveItem(idx, 'down')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                      title={t('plan.moveDownTitle')}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 ml-1"
                      title={t('plan.removeTitle')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
~~~~~
~~~~~tsx.new
export function PlanStageList({
  currentPlan,
  totalTrials,
  estimatedMin,
  trialPresets,
  onBatchUpdateTrials,
  onClearAll,
  onUpdateTrials,
  onMoveItem,
  onRemoveItem,
}: PlanStageListProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full space-y-3 min-h-0">
      <div className="flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
        <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
          <span>{t('plan.stageCount', { count: currentPlan.items.length })}</span>
          <span className="text-slate-400 font-normal">
            • {t('plan.totalTrialsSummary', { trials: totalTrials })} ·{' '}
            {t('plan.estimatedTime', { min: estimatedMin })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentPlan.items.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400">{t('plan.batchTrials')}</span>
              {trialPresets.map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => onBatchUpdateTrials(num)}
                  className="px-1.5 py-0.5 text-[10px] font-bold hover:text-indigo-600 rounded hover:bg-white transition-colors cursor-pointer"
                >
                  {num}
                  {t('common.trialsUnit')}
                </button>
              ))}
            </div>
          )}

          {currentPlan.items.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              {t('plan.clearStages')}
            </button>
          )}
        </div>
      </div>

      {currentPlan.items.length === 0 ? (
        <div className="flex-1 min-h-[220px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50/50">
          <Zap className="w-6 h-6 text-slate-300" />
          <span>{t('plan.emptyPlanTip')}</span>
        </div>
      ) : (
        <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 min-h-0">
          {currentPlan.items.map((item, idx) => {
            const card = registry.getCardById(item.cardId);
            if (!card) return null;
            const Icon = card.icon;
            const cardTitle =
              t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;
            const cardDesc = t(`packs.${card.packId}.cards.${card.id}.desc`) || card.desc || '';

            return (
              <div
                key={item.id}
                className="p-3 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex items-center justify-between gap-3"
              >
                {/* 左侧：严格 min-w-0 弹性约束，保证超长文本必然被截断，绝不撑开容器 */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 text-white font-mono text-[11px] font-black flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">{cardTitle}</div>
                    <div className="text-[10px] text-slate-400 truncate">{cardDesc}</div>
                  </div>
                </div>

                {/* 右侧：严格 flex-shrink-0 防挤压 */}
                <div className="flex items-center gap-1.5 flex-shrink-0 justify-end">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl">
                    {trialPresets.map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => onUpdateTrials(item.id, preset)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                          item.targetTrials === preset
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMoveItem(idx, 'up')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100 cursor-pointer"
                      title={t('plan.moveUpTitle')}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === currentPlan.items.length - 1}
                      onClick={() => onMoveItem(idx, 'down')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100 cursor-pointer"
                      title={t('plan.moveDownTitle')}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 ml-1 cursor-pointer"
                      title={t('plan.removeTitle')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
~~~~~

#### Acts 2: 改造 `CardPickerPanel` 支持自适应满高

~~~~~act
patch_file
src/components/plan/editor/CardPickerPanel.tsx
~~~~~
~~~~~tsx.old
  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-xs font-bold text-slate-700">{t('plan.selectCardPrompt')}</span>
        </div>
        <button
          type="button"
          onClick={() => onToggleAdding(false)}
          className="text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          {t('home.collapseFilter')}
        </button>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchKeyword}
          onInput={(e) => setSearchKeyword((e.target as HTMLInputElement).value)}
          placeholder={t('home.searchPlaceholder')}
          className="w-full pl-8 pr-8 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        {searchKeyword && (
          <button
            type="button"
            onClick={() => setSearchKeyword('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Pack 与视觉域快速筛选行 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => {
            setSelectedDomain('all');
            setSelectedPackId('all');
          }}
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${
            selectedDomain === 'all' && selectedPackId === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          {t('common.all')} ({registry.getAllCards().length})
        </button>

        {packs.map((p) => {
          const packTitle = t(`packs.${p.packId}.meta.title`) || p.meta.title || p.packId;
          return (
            <button
              type="button"
              key={p.packId}
              onClick={() => {
                setSelectedPackId(selectedPackId === p.packId ? 'all' : p.packId);
                setSelectedDomain('all');
              }}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${
                selectedPackId === p.packId
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {packTitle}
            </button>
          );
        })}

        {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((domain) => (
          <button
            type="button"
            key={domain}
            onClick={() => {
              setSelectedDomain(selectedDomain === domain ? 'all' : domain);
              setSelectedPackId('all');
            }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${
              selectedDomain === domain
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {t(DOMAIN_TAGS[domain].i18nKey)}
          </button>
        ))}
      </div>

      {/* 模块列表 */}
      {availableCards.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
          {t('plan.noCardMatched')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
          {availableCards.map((card) => {
            const Icon = card.icon;
            const cardTitle =
              t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;
            const cardDesc = t(`packs.${card.packId}.cards.${card.id}.desc`) || card.desc || '';
            return (
              <button
                type="button"
                key={card.id}
                onClick={() => onAddItem(card.id)}
                className="p-2.5 bg-white hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-300 rounded-xl text-left transition-all flex items-center justify-between gap-2 group active:scale-95 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform flex-shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{cardTitle}</div>
                    <div className="text-[10px] text-slate-400 truncate">{cardDesc}</div>
                  </div>
                </div>
                <Plus className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-600 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
~~~~~
~~~~~tsx.new
  return (
    <div className="flex flex-col h-full space-y-3 min-h-0">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-xs font-extrabold text-slate-700">{t('plan.selectCardPrompt')}</span>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="relative flex-shrink-0">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchKeyword}
          onInput={(e) => setSearchKeyword((e.target as HTMLInputElement).value)}
          placeholder={t('home.searchPlaceholder')}
          className="w-full pl-8 pr-8 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        {searchKeyword && (
          <button
            type="button"
            onClick={() => setSearchKeyword('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Pack 与视觉域快速筛选行 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            setSelectedDomain('all');
            setSelectedPackId('all');
          }}
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 cursor-pointer ${
            selectedDomain === 'all' && selectedPackId === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          {t('common.all')} ({registry.getAllCards().length})
        </button>

        {packs.map((p) => {
          const packTitle = t(`packs.${p.packId}.meta.title`) || p.meta.title || p.packId;
          return (
            <button
              type="button"
              key={p.packId}
              onClick={() => {
                setSelectedPackId(selectedPackId === p.packId ? 'all' : p.packId);
                setSelectedDomain('all');
              }}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 cursor-pointer ${
                selectedPackId === p.packId
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {packTitle}
            </button>
          );
        })}

        {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((domain) => (
          <button
            type="button"
            key={domain}
            onClick={() => {
              setSelectedDomain(selectedDomain === domain ? 'all' : domain);
              setSelectedPackId('all');
            }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 cursor-pointer ${
              selectedDomain === domain
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {t(DOMAIN_TAGS[domain].i18nKey)}
          </button>
        ))}
      </div>

      {/* 模块列表：自适应拉伸并滚动 */}
      {availableCards.length === 0 ? (
        <div className="flex-1 min-h-[220px] flex items-center justify-center p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          {t('plan.noCardMatched')}
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto pr-1 min-h-0 content-start">
          {availableCards.map((card) => {
            const Icon = card.icon;
            const cardTitle =
              t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;
            const cardDesc = t(`packs.${card.packId}.cards.${card.id}.desc`) || card.desc || '';
            return (
              <button
                type="button"
                key={card.id}
                onClick={() => onAddItem(card.id)}
                className="p-2.5 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-300 rounded-2xl text-left transition-all flex items-center justify-between gap-2 group active:scale-98 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="p-1.5 rounded-xl bg-white text-indigo-600 shadow-xs group-hover:scale-105 transition-transform flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">{cardTitle}</div>
                    <div className="text-[10px] text-slate-400 truncate">{cardDesc}</div>
                  </div>
                </div>
                <Plus className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-600 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
~~~~~

#### Acts 3: 优化 `PlanEditorView` 页面布局，撑满屏幕高度

~~~~~act
patch_file
src/views/PlanEditorView.tsx
~~~~~
~~~~~tsx.old
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 顶部主操作栏 */}
      <header className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onExit}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.exit')}
          </button>
          <div className="h-5 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-1.5 w-full max-w-sm">
                <input
                  type="text"
                  value={planNameInput}
                  onInput={(e) => setPlanNameInput((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave();
                    if (e.key === 'Escape') {
                      setPlanNameInput(currentPlan.name);
                      setIsEditingName(false);
                    }
                  }}
                  maxLength={32}
                  className="w-full px-3 py-1.5 text-sm font-black text-slate-800 bg-slate-50 border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder={t('plan.nameInputPlaceholder')}
                />
                <button
                  type="button"
                  onClick={handleNameSave}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                  title={t('common.confirm')}
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <h1 className="text-xl font-black text-slate-900 truncate tracking-tight">
                  {currentPlan.name}
                </h1>
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                  title={t('plan.renameTitle')}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                {isNewPlan ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 flex-shrink-0 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {t('common.newPlanBadge')}
                  </span>
                ) : currentPlan.isBuiltin ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 flex-shrink-0">
                    {t('common.officialBadge')}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* 右侧全局操作区 */}
        <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowPlanManager(!showPlanManager)}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              showPlanManager
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title={t('plan.switchAndManageTitle')}
          >
            <Layers className="w-3.5 h-3.5" />
            {t('plan.planLibraryTitle', { count: storageState.plans.length })}
          </button>

          <button
            type="button"
            onClick={handleCloneCurrent}
            className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
            title={t('plan.cloneCopyTitle')}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleExportPlan}
            className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
            title={t('plan.exportJsonTitle')}
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
            title={t('plan.importJsonTitle')}
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportPlan}
            className="hidden"
          />

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={handleSaveOnly}
            disabled={currentPlan.items.length === 0}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {t('common.save')}
          </button>

          <button
            type="button"
            onClick={handleSaveAndStart}
            disabled={currentPlan.items.length === 0}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {t('plan.startPlan')}
          </button>
        </div>
      </header>

      {toastNotice && (
        <div className="w-full text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-4 py-2.5 rounded-2xl animate-in fade-in">
          {toastNotice}
        </div>
      )}

      {/* 展开的计划库总览抽屉 */}
      {showPlanManager && (
        <PlanLibraryDrawer
          storageState={storageState}
          currentPlan={currentPlan}
          onSelectPlan={handleSelectPlanFromList}
          onCreateNewBlankPlan={handleCreateNewBlankPlan}
          onClose={() => setShowPlanManager(false)}
          onToggleFavorite={handleToggleFavoriteItem}
          onDeletePlan={handleDeletePlanItem}
        />
      )}

      {/* 核心双列/响应式编排区 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 左侧/上半部：已编排的阶段序列与调序 */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <PlanStageList
            currentPlan={currentPlan}
            totalTrials={totalTrials}
            estimatedMin={estimatedMin}
            trialPresets={TRIAL_PRESETS}
            onBatchUpdateTrials={handleBatchUpdateTrials}
            onClearAll={handleClearAll}
            onUpdateTrials={handleUpdateTrials}
            onMoveItem={handleMoveItem}
            onRemoveItem={handleRemoveItem}
          />
        </div>

        {/* 右侧/下半部：模块添加与搜索挑选区 */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <CardPickerPanel
            isAddingCard={isAddingCard || currentPlan.items.length === 0}
            onToggleAdding={setIsAddingCard}
            onAddItem={handleAddItem}
          />
        </div>
      </div>
    </div>
  );
}
~~~~~
~~~~~tsx.new
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col h-[calc(100vh-2rem)] sm:h-[calc(100vh-4rem)] gap-4 sm:gap-5 animate-in fade-in duration-200">
      {/* 顶部主操作栏 */}
      <header className="w-full bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onExit}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.exit')}
          </button>
          <div className="h-5 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-1.5 w-full max-w-sm">
                <input
                  type="text"
                  value={planNameInput}
                  onInput={(e) => setPlanNameInput((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave();
                    if (e.key === 'Escape') {
                      setPlanNameInput(currentPlan.name);
                      setIsEditingName(false);
                    }
                  }}
                  maxLength={32}
                  className="w-full px-3 py-1.5 text-sm font-black text-slate-800 bg-slate-50 border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder={t('plan.nameInputPlaceholder')}
                />
                <button
                  type="button"
                  onClick={handleNameSave}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                  title={t('common.confirm')}
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 truncate tracking-tight">
                  {currentPlan.name}
                </h1>
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                  title={t('plan.renameTitle')}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                {isNewPlan ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 flex-shrink-0 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {t('common.newPlanBadge')}
                  </span>
                ) : currentPlan.isBuiltin ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 flex-shrink-0">
                    {t('common.officialBadge')}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* 右侧全局操作区 */}
        <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowPlanManager(!showPlanManager)}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              showPlanManager
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title={t('plan.switchAndManageTitle')}
          >
            <Layers className="w-3.5 h-3.5" />
            {t('plan.planLibraryTitle', { count: storageState.plans.length })}
          </button>

          <button
            type="button"
            onClick={handleCloneCurrent}
            className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
            title={t('plan.cloneCopyTitle')}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleExportPlan}
            className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
            title={t('plan.exportJsonTitle')}
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
            title={t('plan.importJsonTitle')}
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportPlan}
            className="hidden"
          />

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={handleSaveOnly}
            disabled={currentPlan.items.length === 0}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {t('common.save')}
          </button>

          <button
            type="button"
            onClick={handleSaveAndStart}
            disabled={currentPlan.items.length === 0}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {t('plan.startPlan')}
          </button>
        </div>
      </header>

      {toastNotice && (
        <div className="w-full text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-2xl animate-in fade-in flex-shrink-0">
          {toastNotice}
        </div>
      )}

      {/* 展开的计划库总览抽屉 */}
      {showPlanManager && (
        <div className="flex-shrink-0">
          <PlanLibraryDrawer
            storageState={storageState}
            currentPlan={currentPlan}
            onSelectPlan={handleSelectPlanFromList}
            onCreateNewBlankPlan={handleCreateNewBlankPlan}
            onClose={() => setShowPlanManager(false)}
            onToggleFavorite={handleToggleFavoriteItem}
            onDeletePlan={handleDeletePlanItem}
          />
        </div>
      )}

      {/* 核心双列/响应式编排区：占满视口剩余高度 */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 min-h-0 items-stretch">
        {/* 左侧：已编排的阶段序列与调序 */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col min-h-0 overflow-hidden">
          <PlanStageList
            currentPlan={currentPlan}
            totalTrials={totalTrials}
            estimatedMin={estimatedMin}
            trialPresets={TRIAL_PRESETS}
            onBatchUpdateTrials={handleBatchUpdateTrials}
            onClearAll={handleClearAll}
            onUpdateTrials={handleUpdateTrials}
            onMoveItem={handleMoveItem}
            onRemoveItem={handleRemoveItem}
          />
        </div>

        {/* 右侧：模块添加与搜索挑选区 */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col min-h-0 overflow-hidden">
          <CardPickerPanel
            isAddingCard={isAddingCard || currentPlan.items.length === 0}
            onToggleAdding={setIsAddingCard}
            onAddItem={handleAddItem}
          />
        </div>
      </div>
    </div>
  );
}
~~~~~

### 下一步建议
1. **测试验收**：可在计划编排中加入长文本卡片（如多锚点透视、负空间拟合等），验证在任何分辨率下均不再出现横向拉伸或按钮重叠。
2. **继续实施 P1 项**：重构首页 `FilterEngine.tsx`，将学术化五维筛选降维为直观的训练目标 Tab。
