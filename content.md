好的，我将为你修复点击标签取消后遗留彩色边框（焦点残留）的问题。

## [WIP] fix(discovery): 消除标签胶囊点击后的焦点边框残留问题

### 用户需求
点击一个 tag 胶囊再取消点击时，不能有彩色边框滞留在 tag 上，消除直到点击别处才消失的焦点残留。

### 错误分析
这是由于浏览器对 `<button>` 元素的原生 `:focus` / `:focus-visible` 行为导致的：
1. 鼠标点击标签时，浏览器会将焦点（Focus）置于该按钮上。
2. 取消选中后，虽然按钮状态变为未激活，但该 DOM 元素仍处于 `:focus` 状态，因此会一直保留焦点轮廓与焦点伪类样式，直到用户点击页面其他区域触发 `blur`。
3. 且按钮缺少 `focus:outline-none` 与针对键盘辅助访问的专用 `focus-visible:` 隔离。

### 目标
1. 在 `FilterEngine.tsx` 和 `CardPickerPanel.tsx` 的所有标签与分类胶囊按钮上添加 `focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30` 规范。
2. 在鼠标点击事件触发后主动执行 `(e.currentTarget as HTMLElement).blur()`，确保鼠标点击交互后立即释放焦点，彻底消除边框残留。

### 基本原理
- 区分指针设备（鼠标/触控）与键盘导航：鼠标点击时立即 `blur()` 释放焦点，杜绝伪类滞留；键盘用户使用 `Tab` 键切换时仍由 `focus-visible` 提供合规的可访问性光标反馈。

### 标签
#intent/fix #flow/ready #priority/medium #comp/discovery #concept/ui #scope/ux #ai/instruct #task/domain/discovery #task/object/tag-focus-state #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 消除 `FilterEngine.tsx` 中标签胶囊的焦点边框残留

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~tsx.old
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectPack(undefined)}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                !query.packId
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-600 border border-slate-200/80 hover:border-indigo-300'
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
                  className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-600 border border-slate-200/80 hover:border-indigo-300'
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
              onClick={(e) => {
                (e.currentTarget as HTMLElement).blur();
                handleSelectPack(undefined);
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${
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
                  onClick={(e) => {
                    (e.currentTarget as HTMLElement).blur();
                    handleSelectPack(isSelected ? undefined : p.packId);
                  }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${
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
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                        : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-600 border border-slate-200/80 hover:border-indigo-300'
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
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                        : 'bg-slate-50 hover:bg-emerald-50/60 text-slate-600 border border-slate-200/80 hover:border-emerald-300'
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
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-sm shadow-rose-200'
                        : 'bg-slate-50 hover:bg-rose-50/60 text-slate-600 border border-slate-200/80 hover:border-rose-300'
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
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-sm shadow-amber-200'
                        : 'bg-slate-50 hover:bg-amber-50/60 text-slate-600 border border-slate-200/80 hover:border-amber-300'
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
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? st === 'stable'
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                          : 'bg-purple-600 text-white shadow-sm shadow-purple-200'
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
                    onClick={(e) => {
                      (e.currentTarget as HTMLElement).blur();
                      toggleDomain(d);
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${
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
                    onClick={(e) => {
                      (e.currentTarget as HTMLElement).blur();
                      togglePath(p);
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 ${
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
                    onClick={(e) => {
                      (e.currentTarget as HTMLElement).blur();
                      toggleChallenge(c);
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30 ${
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
                    onClick={(e) => {
                      (e.currentTarget as HTMLElement).blur();
                      toggleInteraction(i);
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 ${
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
                    onClick={(e) => {
                      (e.currentTarget as HTMLElement).blur();
                      toggleStatus(st);
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30 ${
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

#### Acts 2: 消除 `CardPickerPanel.tsx` 中分类胶囊的焦点边框残留

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
~~~~~
~~~~~tsx.new
      {/* Pack 与视觉域快速筛选行 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-shrink-0">
        <button
          type="button"
          onClick={(e) => {
            (e.currentTarget as HTMLElement).blur();
            setSelectedDomain('all');
            setSelectedPackId('all');
          }}
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${
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
              onClick={(e) => {
                (e.currentTarget as HTMLElement).blur();
                setSelectedPackId(selectedPackId === p.packId ? 'all' : p.packId);
                setSelectedDomain('all');
              }}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${
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
            onClick={(e) => {
              (e.currentTarget as HTMLElement).blur();
              setSelectedDomain(selectedDomain === domain ? 'all' : domain);
              setSelectedPackId('all');
            }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${
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

### 下一步建议
1. **测试验收**：点击任意标签将其选中，再次点击取消选中；验证在鼠标移开后，标签上不再有任何残留的高亮/彩色边框。
2. **键盘无障碍验证**：使用键盘 `Tab` 键轮转聚焦各个标签，验证 `focus-visible` 环依然可以正常呈现并指示当前聚焦位置。
