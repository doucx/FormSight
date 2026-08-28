好的，我将为你彻底解决移动端触控点击后的“焦点黏滞（Sticky Focus / Sticky Hover）”问题。

## [WIP] fix(discovery): 消除移动端触控后的标签焦点与黏滞边框残留

### 用户需求
在手机端触摸点击标签并再次点击取消后，标签完全不保留任何 focus 轮廓或伪类边框残留。

### 错误分析
在触控设备（iOS Safari / Android WebKit）上，用户手指抬起后不会触发 `mouseleave`，导致浏览器产生两个黏滞现象：
1. **Sticky Focus（焦点黏滞）**：点击按钮使元素获得并保持 DOM Focus。
2. **Sticky Hover（悬停黏滞）**：触控后移动端引擎将该按钮持续标记为 `:hover` 激活态，触发 `hover:border-...` 边框高亮，直到用户点击屏幕别处。

### 目标
1. 在所有标签胶囊按钮上添加 `onPointerDown={(e) => e.preventDefault()}`，从事件源头阻断浏览器获取 Focus，同时确保 `click` 事件正常顺畅派发。
2. 收敛未选中态的边框样式，去除 `hover:border-xxx` 的动态突变，杜绝移动端的 Sticky Hover 边框残留。

### 基本原理
- 在 `pointerdown` 阶段调用 `preventDefault()` 是 Web 领域消除按钮聚焦（Focus）的标准方案：它既完全保留了无障碍点击语义和 `onClick` 回调，又彻底阻止了浏览器为按钮建立 DOM Focus，完美解决移动端与桌面端的边框滞留问题。

### 标签
#intent/fix #flow/ready #priority/high #comp/discovery #concept/ui #scope/ux #ai/instruct #task/domain/discovery #task/object/mobile-sticky-focus #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 彻底阻断 `FilterEngine.tsx` 标签在移动端的 Focus 与 Hover 黏滞

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~tsx.old
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectPack(undefined)}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
                !query.packId
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 hover:border-slate-300'
              }`}
            >
              {!query.packId && <Check className="w-3 h-3" />}
              <span>{t('home.allPacks')}</span>
            </button>
            {packs.map((p) => {
              const isSelected = query.packId === p.packId;
              const packTitle = t(`packs.${p.packId}.meta.title`) || p.meta.title || p.packId;
              return (
                <button
                  type="button"
                  key={p.packId}
                  onClick={() => handleSelectPack(isSelected ? undefined : p.packId)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  <span>{packTitle}</span>
                  <span
                    className={`text-[10px] font-mono px-1 rounded ${
                      isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {p.cards.length}
                  </span>
                </button>
              );
            })}
          </div>
~~~~~
~~~~~tsx.new
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => handleSelectPack(undefined)}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
                !query.packId
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
              }`}
            >
              {!query.packId && <Check className="w-3 h-3" />}
              <span>{t('home.allPacks')}</span>
            </button>
            {packs.map((p) => {
              const isSelected = query.packId === p.packId;
              const packTitle = t(`packs.${p.packId}.meta.title`) || p.meta.title || p.packId;
              return (
                <button
                  type="button"
                  key={p.packId}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectPack(isSelected ? undefined : p.packId)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  <span>{packTitle}</span>
                  <span
                    className={`text-[10px] font-mono px-1 rounded ${
                      isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {p.cards.length}
                  </span>
                </button>
              );
            })}
          </div>
~~~~~

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~tsx.old
          {/* 1. 视觉域维度 (Visual Domain) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Eye className="w-3 h-3 text-indigo-500" />
              {t('home.domainSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((d) => {
                const isSelected = query.domains?.includes(d) ?? false;
                const tagMeta = DOMAIN_TAGS[d];
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleDomain(d)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. 认知路径维度 (Cognitive Path) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Compass className="w-3 h-3 text-emerald-500" />
              {t('home.pathSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(PATH_TAGS) as CognitivePathTag[]).map((p) => {
                const isSelected = query.paths?.includes(p) ?? false;
                const tagMeta = PATH_TAGS[p];
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => togglePath(p)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. 心智抗性维度 (Mental Challenge) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Brain className="w-3 h-3 text-rose-500" />
              {t('home.challengeSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CHALLENGE_TAGS) as MentalChallengeTag[]).map((c) => {
                const isSelected = query.challenges?.includes(c) ?? false;
                const tagMeta = CHALLENGE_TAGS[c];
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => toggleChallenge(c)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. 交互形态维度 (Interaction Mode) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <MousePointer className="w-3 h-3 text-amber-500" />
              {t('home.interactionSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(INTERACTION_TAGS) as InteractionTag[]).map((i) => {
                const isSelected = query.interactions?.includes(i) ?? false;
                const tagMeta = INTERACTION_TAGS[i];
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => toggleInteraction(i)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. 特性与发布状态 (Status Tag) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <FlaskConical className="w-3 h-3 text-purple-500" />
              {t('home.statusSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['stable', 'experimental'] as CardStatusTag[]).map((st) => {
                const isSelected = query.statuses?.includes(st) ?? false;
                const tagMeta = STATUS_TAGS[st];
                return (
                  <button
                    type="button"
                    key={st}
                    onClick={() => toggleStatus(st)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
                      isSelected
                        ? st === 'stable'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {st === 'stable' ? (
                      <ShieldCheck className="w-3 h-3 text-indigo-500" />
                    ) : (
                      <FlaskConical className="w-3 h-3 text-amber-500" />
                    )}
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>
~~~~~
~~~~~tsx.new
          {/* 1. 视觉域维度 (Visual Domain) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Eye className="w-3 h-3 text-indigo-500" />
              {t('home.domainSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((d) => {
                const isSelected = query.domains?.includes(d) ?? false;
                const tagMeta = DOMAIN_TAGS[d];
                return (
                  <button
                    type="button"
                    key={d}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => toggleDomain(d)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. 认知路径维度 (Cognitive Path) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Compass className="w-3 h-3 text-emerald-500" />
              {t('home.pathSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(PATH_TAGS) as CognitivePathTag[]).map((p) => {
                const isSelected = query.paths?.includes(p) ?? false;
                const tagMeta = PATH_TAGS[p];
                return (
                  <button
                    type="button"
                    key={p}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => togglePath(p)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. 心智抗性维度 (Mental Challenge) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Brain className="w-3 h-3 text-rose-500" />
              {t('home.challengeSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CHALLENGE_TAGS) as MentalChallengeTag[]).map((c) => {
                const isSelected = query.challenges?.includes(c) ?? false;
                const tagMeta = CHALLENGE_TAGS[c];
                return (
                  <button
                    type="button"
                    key={c}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => toggleChallenge(c)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. 交互形态维度 (Interaction Mode) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <MousePointer className="w-3 h-3 text-amber-500" />
              {t('home.interactionSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(INTERACTION_TAGS) as InteractionTag[]).map((i) => {
                const isSelected = query.interactions?.includes(i) ?? false;
                const tagMeta = INTERACTION_TAGS[i];
                return (
                  <button
                    type="button"
                    key={i}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => toggleInteraction(i)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. 特性与发布状态 (Status Tag) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <FlaskConical className="w-3 h-3 text-purple-500" />
              {t('home.statusSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['stable', 'experimental'] as CardStatusTag[]).map((st) => {
                const isSelected = query.statuses?.includes(st) ?? false;
                const tagMeta = STATUS_TAGS[st];
                return (
                  <button
                    type="button"
                    key={st}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => toggleStatus(st)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
                      isSelected
                        ? st === 'stable'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {st === 'stable' ? (
                      <ShieldCheck className="w-3 h-3 text-indigo-500" />
                    ) : (
                      <FlaskConical className="w-3 h-3 text-amber-500" />
                    )}
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>
~~~~~

#### Acts 2: 消除 `CardPickerPanel.tsx` 在移动端的 Focus 与 Hover 黏滞

~~~~~act
patch_file
src/components/plan/editor/CardPickerPanel.tsx
~~~~~
~~~~~tsx.old
      {/* Pack 与视觉域快速筛选行 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            setSelectedDomain('all');
            setSelectedPackId('all');
          }}
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
            selectedDomain === 'all' && selectedPackId === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
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
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
                selectedPackId === p.packId
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
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
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
              selectedDomain === domain
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            {t(DOMAIN_TAGS[domain].i18nKey)}
          </button>
        ))}
      </div>
~~~~~
~~~~~tsx.new
      {/* Pack 与视觉域快速筛选行 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-shrink-0">
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            setSelectedDomain('all');
            setSelectedPackId('all');
          }}
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
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
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                setSelectedPackId(selectedPackId === p.packId ? 'all' : p.packId);
                setSelectedDomain('all');
              }}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
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
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              setSelectedDomain(selectedDomain === domain ? 'all' : domain);
              setSelectedPackId('all');
            }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
              selectedDomain === domain
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {t(DOMAIN_TAGS[domain].i18nKey)}
          </button>
        ))}
      </div>
~~~~~

### 下一步建议
1. **真机测试**：在手机或触控模拟器中点击任意标签，再点击取消选中，确认手指抬起后没有任何残留焦点或边框高亮。
