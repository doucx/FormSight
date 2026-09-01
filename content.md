现在，我将生成 Quipu 计划并执行修复。

## [WIP] fix: 修复数据导入中的 domain 规范化、设置合并与文件触发漏洞

### 错误分析

1. `src/storage/db/importExport.ts`: 导入 `dailySummaries` 时未做 `domain` 规范化映射，且从 `records` 回填重建时错误地硬编码了 `'star'` 默认值。
2. `src/storage/db/importExport.ts`: `saveSettings` 直接覆盖可能导致新增卡片缺少默认字段。
3. `src/components/settings/sections/DataGovernanceSection.tsx`: 文件读取后未清空 `input.value`，导致同名文件二次选择失效。

### 用户需求

确保系统全量备份导入与计划导入在任何场景下均能稳定执行，旧数据能正确映射至卡片一等公民的新版 `domain` 体系，且操作体验流畅可靠。

### 评论

数据备份与导入是用户数据的生命线。在向纯 Flat Card 架构演进后，数据导入层的兼容性映射与容错处理是保证用户资产安全无损迁移的核心保障。

### 目标

1. 升级 `importAllData`：在写入 `dailySummaries` 时做统一的 `cardId` 和 `domain` 修正。
2. 修复降级重建 `dailySummaries` 时的 `domain` 解析，改用 `registry.getCardById(cardId)?.domain`。
3. 导入 settings 时与系统默认配置安全合并。
4. 在文件导入回调中重置 `input.value = ''`。

### 基本原理

在数据落地 IndexedDB / LocalStorage 之前，通过 `registry` 倒排映射机制自动修复旧版标识，并确保文件输入组件的状态及时重置。

### 标签

#intent/fix #flow/ready #priority/critical #comp/runtime #concept/state #concept/sync #scope/core #scope/ux #ai/instruct #task/domain/storage #task/object/data-import #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 修复 `src/storage/db/importExport.ts` 中的导入规范化与合并逻辑

~~~~~act
patch_file
src/storage/db/importExport.ts
~~~~~
~~~~~typescript
    // 4. 写入或重新生成 daily_summaries
    if (parsed.dailySummaries && parsed.dailySummaries.length > 0) {
      const tx = db.transaction('daily_summaries', 'readwrite');
      for (const d of parsed.dailySummaries) {
        await tx.objectStore('daily_summaries').put(d);
      }
      await tx.done;
    } else if (parsed.records && parsed.records.length > 0) {
      const summaryMap = new Map<string, DailySummaryData>();
      for (const r of parsed.records) {
        const domain = (r.domain || 'star') as TrainingDomain;
        const cardId = r.cardId || r.mode;
        const date = getLocalDateString(r.timestamp);
        const summaryId = `${date}_${cardId}`;
        const respMs = Number(r.responseTimeMs) || 0;
        const level = Number(r.difficultyLevel) || 1;

        const existing = summaryMap.get(summaryId);
        if (!existing) {
          summaryMap.set(summaryId, {
            id: summaryId,
            date,
            cardId,
            domain,
            mode: r.mode,
            totalCount: 1,
            hitCount: r.isHit ? 1 : 0,
            totalTimeMs: respMs,
            maxLevel: level,
            minLevel: level,
            lastLevel: level,
            updatedAt: r.timestamp,
          });
        } else {
          existing.totalCount += 1;
          if (r.isHit) existing.hitCount += 1;
          existing.totalTimeMs += respMs;
          existing.maxLevel = Math.max(existing.maxLevel, level);
          existing.minLevel = Math.min(existing.minLevel, level);
          if (r.timestamp >= existing.updatedAt) {
            existing.lastLevel = level;
            existing.updatedAt = r.timestamp;
          }
        }
      }

      const tx = db.transaction('daily_summaries', 'readwrite');
      for (const summary of summaryMap.values()) {
        await tx.objectStore('daily_summaries').put(summary);
      }
      await tx.done;
    }

    // 5. 更新 LocalStorage
    if (parsed.settings) {
      saveSettings(parsed.settings);
    }
~~~~~
~~~~~typescript
    // 4. 写入或重新生成 daily_summaries
    if (parsed.dailySummaries && parsed.dailySummaries.length > 0) {
      const tx = db.transaction('daily_summaries', 'readwrite');
      for (const d of parsed.dailySummaries) {
        const cardId = d.cardId || d.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : d.domain || 'core';
        await tx.objectStore('daily_summaries').put({
          ...d,
          cardId,
          domain,
        });
      }
      await tx.done;
    } else if (parsed.records && parsed.records.length > 0) {
      const summaryMap = new Map<string, DailySummaryData>();
      for (const r of parsed.records) {
        const cardId = r.cardId || r.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : r.domain || 'core';
        const date = getLocalDateString(r.timestamp);
        const summaryId = `${date}_${cardId}`;
        const respMs = Number(r.responseTimeMs) || 0;
        const level = Number(r.difficultyLevel) || 1;

        const existing = summaryMap.get(summaryId);
        if (!existing) {
          summaryMap.set(summaryId, {
            id: summaryId,
            date,
            cardId,
            domain,
            mode: r.mode,
            totalCount: 1,
            hitCount: r.isHit ? 1 : 0,
            totalTimeMs: respMs,
            maxLevel: level,
            minLevel: level,
            lastLevel: level,
            updatedAt: r.timestamp,
          });
        } else {
          existing.domain = domain;
          existing.totalCount += 1;
          if (r.isHit) existing.hitCount += 1;
          existing.totalTimeMs += respMs;
          existing.maxLevel = Math.max(existing.maxLevel, level);
          existing.minLevel = Math.min(existing.minLevel, level);
          if (r.timestamp >= existing.updatedAt) {
            existing.lastLevel = level;
            existing.updatedAt = r.timestamp;
          }
        }
      }

      const tx = db.transaction('daily_summaries', 'readwrite');
      for (const summary of summaryMap.values()) {
        await tx.objectStore('daily_summaries').put(summary);
      }
      await tx.done;
    }

    // 5. 更新 LocalStorage (深度合并保障新增卡片配置)
    if (parsed.settings) {
      const current = loadSettings();
      const mergedSettings: UserSettings = {
        global: { ...current.global, ...(parsed.settings.global || {}) },
        cards: { ...current.cards, ...(parsed.settings.cards || {}) },
      };
      saveSettings(mergedSettings);
    }
~~~~~

#### Acts 2: 修复 `DataGovernanceSection.tsx` 中的文件选择重置

在读取文件后清空 `input.value`，确保同名文件重新导入能正常触发事件。

~~~~~act
patch_file
src/components/settings/sections/DataGovernanceSection.tsx
~~~~~
~~~~~typescript
  const handleImportFile = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      const file = target.files[0];
      const text = await file.text();
      const success = await importAllData(text);
      if (success) {
        showToast(t('settings.importSuccessToast'), 'success');
        onDataChanged();
        onCloseModal();
      } else {
        showToast(t('settings.importInvalidToast'), 'error');
      }
    }
  };
~~~~~
~~~~~typescript
  const handleImportFile = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      const file = target.files[0];
      const text = await file.text();
      target.value = '';
      const success = await importAllData(text);
      if (success) {
        showToast(t('settings.importSuccessToast'), 'success');
        onDataChanged();
        onCloseModal();
      } else {
        showToast(t('settings.importInvalidToast'), 'error');
      }
    }
  };
~~~~~

### 下一步建议

1. 尝试在全局设置中执行一次「流式导出 JSON」，然后执行「清空数据」，再将导出的文件重新「导入 JSON 备份」，验证以下项：
   - 今日刷题统计与累计用时是否 100% 恢复。
   - 认知档案中的热力图与各卡片等级是否正确呈现。
   - 自定义训练流计划是否完整恢复。
