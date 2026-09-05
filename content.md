我现在将为你实施**方案一：在数据加载与存储层实现“自愈（Self-healing）”机制**。

当从 IndexedDB 读取所有训练计划时，系统会自动比对并过滤掉在 `registry` 中已被删除或注销的卡片阶段，同时静默更新数据库，并保证编辑器及各视图在加载时即刻同步更新为真实阶段数。

## [WIP] fix: 实现训练计划加载时的失效卡片自愈清洗机制

### 错误分析

1. **根因定位**：当用户在代码或注册表中移除某张卡片时，持久化在 IndexedDB 中的 `training_plans` 依然保留着该卡片的 `cardId` 引用记录。
2. **脱节原因**：原有系统中的 `sanitizePlan` 清洗函数仅挂载在手动触发的保存按钮逻辑上。在常规的 `loadPlanStorageState` 启动与加载阶段，系统未对历史记录做有效性校验，导致未被用户重新编辑保存的旧计划一直保留失效阶段，使得总阶段数依然显示为 31（而非实际可用的 30）。

### 用户需求

在删除某张卡片后，系统在读取训练计划时能够自动识别并清除该卡片的失效训练阶段，使统计数值、卡片列表以及编辑器状态自动自愈回到正确的阶段数（如 30 个），无需用户手动重新保存。

### 评论

数据自愈模式（Self-healing Pattern）是客户端离线存储与动态元数据解耦的标准做法。在加载边界做被动自愈既不侵入卡片生命周期的管理，又能彻底消除幽灵数据条目，防止阶段序号跳号与题量统计虚高。

### 目标

1. 在 `src/storage/planStorage.ts` 中引入 `registry` 并于 `loadPlanStorageState` 中加入有效性校验。
2. 当检测到含有已失效卡片的阶段项时，自动在内存与 IndexedDB 中清洗更新。
3. 在 `src/components/plan/editor/usePlanEditorState.ts` 中，确保加载完成后编辑器状态与自愈后的计划内容保持同步。

### 基本原理

在 `loadPlanStorageState` 中读取数据库全部计划后，通过 `registry.getCardById(item.cardId)` 对阶段项进行即时过滤。若过滤后数组长度变动（即发现孤儿项），自动调用 `savePlanStorageState` 异步回写修复数据库。同时，在编辑器的 `useEffect` 加载逻辑中同步刷新 `currentPlan`，确保 UI 与真实数据完全对齐。

### 标签

#intent/fix #flow/ready #priority/high #concept/state #scope/core #ai/instruct #task/domain/storage #task/object/plan-storage #task/action/self-healing #task/state/begin

---

### Script

#### Acts 1: 在 `planStorage.ts` 中增加自愈清洗与异步回写逻辑

我们将引入 `registry`，并在从 IndexedDB 加载训练计划及根据模板创建计划时，自动剔除已注销的卡片引用。

~~~~~act
patch_file
src/storage/planStorage.ts
~~~~~
~~~~~typescript
import { DEFAULT_PLAN_TEMPLATES } from '../config/planTemplates';
import { i18n } from '../core/i18n';
import type { PlanItem, PlanStorageState, PlanTemplate, TrainingPlan } from '../types/plan';
import { getDB } from './db/schema';
~~~~~
~~~~~typescript
import { DEFAULT_PLAN_TEMPLATES } from '../config/planTemplates';
import { i18n } from '../core/i18n';
import { registry } from '../core/registry';
import type { PlanItem, PlanStorageState, PlanTemplate, TrainingPlan } from '../types/plan';
import { getDB } from './db/schema';
~~~~~

~~~~~act
patch_file
src/storage/planStorage.ts
~~~~~
~~~~~typescript
function createPlanFromTemplateInternal(
  template: PlanTemplate,
  isBuiltin = false,
  isFavorite = true,
): TrainingPlan {
  const items: PlanItem[] = template.items.map((item, idx) => ({
    id: `item_${template.id}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
    cardId: item.cardId,
    targetTrials: item.targetTrials,
  }));
~~~~~
~~~~~typescript
function createPlanFromTemplateInternal(
  template: PlanTemplate,
  isBuiltin = false,
  isFavorite = true,
): TrainingPlan {
  const items: PlanItem[] = template.items
    .filter((item) => Boolean(registry.getCardById(item.cardId)))
    .map((item, idx) => ({
      id: `item_${template.id}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      cardId: item.cardId,
      targetTrials: item.targetTrials,
    }));
~~~~~

~~~~~act
patch_file
src/storage/planStorage.ts
~~~~~
~~~~~typescript
    if (!activePlanId || !plans.some((p) => p.id === activePlanId)) {
      activePlanId = plans[0].id;
      await db.put('app_metadata', activePlanId, 'active_plan_id');
    }

    cachedPlanState = {
      activePlanId,
      plans,
    };
    return cachedPlanState;
~~~~~
~~~~~typescript
    let hasDanglingItem = false;
    const sanitizedPlans = plans.map((p) => {
      const validItems = (p.items || []).filter((item) =>
        Boolean(registry.getCardById(item.cardId)),
      );
      if (validItems.length !== (p.items || []).length) {
        hasDanglingItem = true;
        return {
          ...p,
          items: validItems,
          updatedAt: Date.now(),
        };
      }
      return p;
    });

    if (!activePlanId || !sanitizedPlans.some((p) => p.id === activePlanId)) {
      activePlanId = sanitizedPlans[0].id;
      await db.put('app_metadata', activePlanId, 'active_plan_id');
    }

    cachedPlanState = {
      activePlanId,
      plans: sanitizedPlans,
    };

    if (hasDanglingItem) {
      savePlanStorageState(cachedPlanState).catch((err) => {
        console.error('Failed to auto-heal sanitized plans to IndexedDB:', err);
      });
    }

    return cachedPlanState;
~~~~~

#### Acts 2: 更新 `usePlanEditorState.ts` 以响应加载后的自愈状态

当编辑器载入自愈后的计划状态时，同步刷新 `currentPlan`，确保编辑界面的阶段列表与题量统计保持一致。

~~~~~act
patch_file
src/components/plan/editor/usePlanEditorState.ts
~~~~~
~~~~~typescript
  useEffect(() => {
    loadPlanStorageState().then((state) => {
      setStorageState(state);
    });
  }, []);
~~~~~
~~~~~typescript
  useEffect(() => {
    loadPlanStorageState().then((state) => {
      setStorageState(state);
      const synced = state.plans.find((p) => p.id === currentPlan.id);
      if (synced && synced.items.length !== currentPlan.items.length) {
        setCurrentPlan(synced);
      }
    });
  }, []);
~~~~~

### 下一步建议

1. **测试验证**：重新刷新应用，进入包含已被删除卡片的训练计划，验证首页和编辑器顶部的阶段总数是否已经从 31 恢复为 30。
2. **考虑提交**：若验证无误且显示正常，可执行 Git 提交保存该修复。
