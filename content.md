好的，我将生成一个 `[WIP]` 计划，移除卡片选择面板的折叠切换按钮让其常驻显示，并为已添加到当前计划阶段中的卡片提供专属的高亮视觉反馈（绿色主题与添加计数徽章）。

## [WIP] feat: 常驻卡片选择面板并高亮已添加阶段

### 用户需求
1. **取消折叠按钮，常驻展示**：移除“添加训练阶段”的切换折叠按钮，让右侧的卡片筛选与选择面板在训练计划编排器中始终保持可见。
2. **已添加状态高亮反馈**：让当前计划中已经添加了的卡片胶囊转变为绿色高亮样式（包含高亮边框、背景及已选计数指示），便于直观对照和快速查漏补缺。

### 评论
这是一个非常自然的 UX 改进。在桌面端或平板大屏下，计划编排器的核心任务就是“左边看序列、右边挑卡片”，始终常驻选择面板不仅减少了一次多余的点击，而且通过动态绿色高亮反馈（带添加频次角标），可以让用户瞬间看清“哪些模块已加入本轮训练计划、各添加了几次”，大幅降低心智负担。

### 目标
1. 重构 `CardPickerPanel.tsx`，移除 `isAddingCard` 及其切换按钮逻辑，直接常驻渲染筛选器与卡片库列表。
2. 接收 `addedCardIds`（或 `addedCardCounts`）属性，动态判定每张卡片的已选状态：
   - 未添加卡片：保持经典的 Slate / Indigo 悬停交互风格。
   - 已添加卡片：渲染为 Emerald 翡翠绿主题（绿色浅底、绿色边框、绿色图标底块），并展示已添加阶段次数的醒目标签。
3. 清理 `PlanEditorView.tsx` 中冗余的 `isAddingCard` 状态与传参。

### 基本原理
通过将计划阶段列表（`currentPlan.items`）中的 `cardId` 投影为频次哈希字典（`Map<cardId, count>`），以 $O(1)$ 时间复杂度在卡片渲染循环中匹配高亮状态；保持加号操作可多次点击追加阶段，同时给与即时的绿色高亮视觉响应。

### 标签
#intent/build #flow/ready #priority/high #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/plan-editor-card-picker #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 重构 `CardPickerPanel.tsx` 支持常驻显示与已选绿色高亮

支持常驻展现并根据当前计划中的添加记录动态渲染翡翠绿高亮样式与已选频次徽章。

~~~~~act
write_file
src/components/plan/editor/CardPickerPanel.tsx
~~~~~
~~~~~typescript
import { Check, Plus, Sparkles } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { getCardDesc, getCardTitle, useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import type { CardQueryOptions } from '../../../types/card';
import { FilterEngine } from '../../discovery/FilterEngine';

interface CardPickerPanelProps {
  addedCardIds?: string[];
  onAddItem: (cardId: string) => void;
}

export function CardPickerPanel({ addedCardIds = [], onAddItem }: CardPickerPanelProps) {
  const { t } = useTranslation();
  const [filterQuery, setFilterQuery] = useState<CardQueryOptions>({});

  const availableCards = registry.queryCards(filterQuery);

  // 统计各 cardId 在当前计划中的已添加频次
  const addedCountsMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const id of addedCardIds) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    return counts;
  }, [addedCardIds]);

  return (
    <div className="flex flex-col h-full space-y-3 min-h-0">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-xs font-extrabold text-slate-700">
            {t('plan.selectCardPrompt')}
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {t('home.matchedModules', { count: availableCards.length })}
        </span>
      </div>

      {/* 嵌入紧凑变体的完整五维筛选引擎 */}
      <FilterEngine
        variant="compact"
        query={filterQuery}
        totalMatches={availableCards.length}
        onChange={setFilterQuery}
      />

      {/* 模块列表：自适应拉伸并滚动 */}
      {availableCards.length === 0 ? (
        <div className="flex-1 min-h-[160px] flex items-center justify-center p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          {t('plan.noCardMatched')}
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto pr-1 min-h-0 content-start">
          {availableCards.map((card) => {
            const Icon = card.icon;
            const cardTitle = getCardTitle(card, t);
            const cardDesc = getCardDesc(card, t);
            const addedCount = addedCountsMap.get(card.id) || 0;
            const isAdded = addedCount > 0;

            const cardBgStyle = isAdded
              ? 'bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-300 hover:border-emerald-400 shadow-xs'
              : 'bg-slate-50 hover:bg-indigo-50/60 border-slate-200/80 hover:border-indigo-300';

            const iconBgStyle = isAdded
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-indigo-600 shadow-xs group-hover:scale-105';

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
                          isAdded ? 'text-emerald-950' : 'text-slate-800'
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
          })}
        </div>
      )}
    </div>
  );
}
~~~~~

#### Acts 2: 更新 `PlanEditorView.tsx` 清理多余状态并传递已选卡片列表

~~~~~act
patch_file
src/views/PlanEditorView.tsx
~~~~~
~~~~~typescript.old
  const [storageState, setStorageState] = useState<PlanStorageState>(loadPlanStorageState);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan>({ ...initialPlan });
  const [isAddingCard, setIsAddingCard] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [planNameInput, setPlanNameInput] = useState<string>(initialPlan.name);
  const [showPlanManager, setShowPlanManager] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
~~~~~
~~~~~typescript.new
  const [storageState, setStorageState] = useState<PlanStorageState>(loadPlanStorageState);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan>({ ...initialPlan });
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [planNameInput, setPlanNameInput] = useState<string>(initialPlan.name);
  const [showPlanManager, setShowPlanManager] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
~~~~~

~~~~~act
patch_file
src/views/PlanEditorView.tsx
~~~~~
~~~~~typescript.old
  const handleCreateNewBlankPlan = () => {
    const newBlank: TrainingPlan = {
      id: `custom_plan_${Date.now()}`,
      name: t('plan.newBlankPlan'),
      description: t('common.defaultCustomPlanDesc'),
      items: [],
      isFavorite: true,
      isBuiltin: false,
      updatedAt: Date.now(),
    };
    setCurrentPlan(newBlank);
    setPlanNameInput(newBlank.name);
    setIsEditingName(true);
    setIsAddingCard(true);
    setShowPlanManager(false);
    showToast(t('plan.newPlanModeToast'));
  };
~~~~~
~~~~~typescript.new
  const handleCreateNewBlankPlan = () => {
    const newBlank: TrainingPlan = {
      id: `custom_plan_${Date.now()}`,
      name: t('plan.newBlankPlan'),
      description: t('common.defaultCustomPlanDesc'),
      items: [],
      isFavorite: true,
      isBuiltin: false,
      updatedAt: Date.now(),
    };
    setCurrentPlan(newBlank);
    setPlanNameInput(newBlank.name);
    setIsEditingName(true);
    setShowPlanManager(false);
    showToast(t('plan.newPlanModeToast'));
  };
~~~~~

~~~~~act
patch_file
src/views/PlanEditorView.tsx
~~~~~
~~~~~typescript.old
        {/* 右侧：模块添加与搜索挑选区 */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col min-h-0 overflow-hidden">
          <CardPickerPanel
            isAddingCard={isAddingCard || currentPlan.items.length === 0}
            onToggleAdding={setIsAddingCard}
            onAddItem={handleAddItem}
          />
        </div>
~~~~~
~~~~~typescript.new
        {/* 右侧：模块添加与搜索挑选区 */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col min-h-0 overflow-hidden">
          <CardPickerPanel
            addedCardIds={currentPlan.items.map((it) => it.cardId)}
            onAddItem={handleAddItem}
          />
        </div>
~~~~~

### 下一步建议
1. **测试用例验证**：运行 `npm test` 确认所有单元测试与快照通过。
2. **提交封装**：确认满意后，可以发起 `[COMMIT]` 流程将训练计划编排器的优化正式提交。
