我们将通过优化 IndexedDB 事务写入管线来解决导入卡顿问题，并在数据管理界面加入全屏阻塞加载遮罩与状态禁用，防止数据竞态。

## [WIP] perf(storage): 优化数据导入事务管线并添加全屏阻塞加载遮罩

### 用户需求
1. 修复导入海量备份数据（如 7MB+）时速度过慢、耗时过长的问题。
2. 在导入执行期间添加全局/模态阻塞遮罩，禁用交互并提供清晰的进度指示，避免用户因无响应而重复点击或进行并发操作导致数据不一致。

### 评论
当前导入瓶颈是由 `for` 循环内部逐条 `await store.put()` 引起的事件循环阻塞。通过将事务内写入改造为原生管线并发排队（Pipeline Scheduling），可以使写入速度提升数十倍；同时配合全屏高优先级阻塞遮罩，可从根本上保障导入过程中的原子性与数据安全。

### 目标
1. 改造 `src/storage/db/importExport.ts` 中的 `importAllData` 函数，移除所有 `for` 循环内部的逐条 `await`，仅在事务结束时 `await tx.done`。
2. 在 `src/components/settings/sections/DataGovernanceSection.tsx` 中增加 `isImporting` 状态，并在导入期间呈现带有加载动画的全屏阻塞遮罩。
3. 在中英文多语言词典中补充导入中提示文案。

### 基本原理
IndexedDB 规范支持在同一个激活事务内连续同步调用 `store.put()`，浏览器内核会在底层 C++ 线程以最高效的管道并发调度磁盘写入。仅在批次结束时调用 `await tx.done` 等待事务持久化，可消解频繁在 JS 微任务队列与原生层之间上下文切换的开销。同时，在 React/Preact 组件层挂载全屏遮罩并拦截点击，可确保导入期间不会产生任何并发写冲突。

### 标签
#intent/perf #flow/ready #priority/high #comp/engine #concept/state #scope/core #scope/ux #ai/instruct #task/domain/storage #task/object/backup-import-pipeline #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 优化 `importAllData` 事务写入性能

我们将重构 `importExport.ts`，消除循环中的串行 `await`，启用事务管线批处理。

~~~~~act
patch_file
src/storage/db/importExport.ts
~~~~~
~~~~~typescript.old
    // 1. 导入 sessions
    if (parsed.sessions && parsed.sessions.length > 0) {
      const tx = db.transaction('sessions', 'readwrite');
      for (const s of parsed.sessions) {
        const cardId = s.cardId || s.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : s.domain || 'core';
        await tx.objectStore('sessions').put({ ...s, domain, cardId });
      }
      await tx.done;
    }

    // 2. 导入 profiles
    if (parsed.profiles && parsed.profiles.length > 0) {
      const tx = db.transaction('user_profiles', 'readwrite');
      for (const p of parsed.profiles) {
        const cardId = p.cardId || p.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : p.domain || 'core';
        const totalTrials = p.totalTrials ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
      }
      await tx.done;
    }

    // 3. 分批写入海量 records (每 1500 条为一个独立事务批次)
    if (parsed.records && parsed.records.length > 0) {
      const BATCH_SIZE = 1500;
      for (let i = 0; i < parsed.records.length; i += BATCH_SIZE) {
        const batch = parsed.records.slice(i, i + BATCH_SIZE);
        const tx = db.transaction('records', 'readwrite');
        const store = tx.objectStore('records');
        for (const r of batch) {
          const cardId = r.cardId || r.mode;
          const card = registry.getCardById(cardId);
          const domain = card ? card.domain : r.domain || 'core';
          await store.put({ ...r, domain, cardId });
        }
        await tx.done;
      }
    }

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
~~~~~
~~~~~typescript.new
    // 1. 导入 sessions
    if (parsed.sessions && parsed.sessions.length > 0) {
      const tx = db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      for (const s of parsed.sessions) {
        const cardId = s.cardId || s.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : s.domain || 'core';
        store.put({ ...s, domain, cardId });
      }
      await tx.done;
    }

    // 2. 导入 profiles
    if (parsed.profiles && parsed.profiles.length > 0) {
      const tx = db.transaction('user_profiles', 'readwrite');
      const store = tx.objectStore('user_profiles');
      for (const p of parsed.profiles) {
        const cardId = p.cardId || p.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : p.domain || 'core';
        const totalTrials = p.totalTrials ?? 0;
        store.put({ ...p, cardId, domain, totalTrials });
      }
      await tx.done;
    }

    // 3. 分批写入海量 records (每 2500 条为一个独立事务批次，采用管线并发排队)
    if (parsed.records && parsed.records.length > 0) {
      const BATCH_SIZE = 2500;
      for (let i = 0; i < parsed.records.length; i += BATCH_SIZE) {
        const batch = parsed.records.slice(i, i + BATCH_SIZE);
        const tx = db.transaction('records', 'readwrite');
        const store = tx.objectStore('records');
        for (const r of batch) {
          const cardId = r.cardId || r.mode;
          const card = registry.getCardById(cardId);
          const domain = card ? card.domain : r.domain || 'core';
          store.put({ ...r, domain, cardId });
        }
        await tx.done;
      }
    }

    // 4. 写入或重新生成 daily_summaries
    if (parsed.dailySummaries && parsed.dailySummaries.length > 0) {
      const tx = db.transaction('daily_summaries', 'readwrite');
      const store = tx.objectStore('daily_summaries');
      for (const d of parsed.dailySummaries) {
        const cardId = d.cardId || d.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : d.domain || 'core';
        store.put({
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
      const store = tx.objectStore('daily_summaries');
      for (const summary of summaryMap.values()) {
        store.put(summary);
      }
      await tx.done;
    }
~~~~~

#### Acts 2: 补充多语言翻译字段

在中文与英文词典中补充导入加载中的文案。

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json.old
    "dataGovernance": "数据备份与稳态治理",
    "exportStream": "流式导出 JSON",
    "exporting": "正在流式打包...",
    "importBackup": "导入 JSON 备份",
    "pruneTitle": "数据库瘦身与修剪",
~~~~~
~~~~~json.new
    "dataGovernance": "数据备份与稳态治理",
    "exportStream": "流式导出 JSON",
    "exporting": "正在流式打包...",
    "importBackup": "导入 JSON 备份",
    "importing": "正在导入...",
    "importingTitle": "正在恢复数据备份",
    "importingDesc": "正在写入海量训练记录与聚合档案，请稍候且勿关闭窗口...",
    "pruneTitle": "数据库瘦身与修剪",
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json.old
    "dataGovernance": "Data Backup & Governance",
    "exportStream": "Stream Export JSON",
    "exporting": "Streaming backup...",
    "importBackup": "Import JSON Backup",
    "pruneTitle": "Database Prune & Clean",
~~~~~
~~~~~json.new
    "dataGovernance": "Data Backup & Governance",
    "exportStream": "Stream Export JSON",
    "exporting": "Streaming backup...",
    "importBackup": "Import JSON Backup",
    "importing": "Importing...",
    "importingTitle": "Restoring Data Backup",
    "importingDesc": "Writing training records and aggregated profiles, please wait and do not close the window...",
    "pruneTitle": "Database Prune & Clean",
~~~~~

#### Acts 3: 在 `DataGovernanceSection.tsx` 中添加导入状态与全屏阻塞遮罩

添加 `isImporting` 状态，并在执行导入时展示全屏锁定遮罩，防止用户误触或并发写入。

~~~~~act
patch_file
src/components/settings/sections/DataGovernanceSection.tsx
~~~~~
~~~~~typescript.old
import { Download, RotateCcw, Scissors, Trash2, Upload } from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import {
  clearAllData,
  exportAllDataStream,
  importAllData,
  pruneColdRecords,
} from '../../../storage/index';
import { resetPlansToDefault } from '../../../storage/planStorage';
import { ConfirmModal } from '../../common/ConfirmModal';
import type { ToastType } from '../../common/Toast';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

interface DataGovernanceSectionProps {
  onDataChanged: () => void;
  onCloseModal: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}

export function DataGovernanceSection({
  onDataChanged,
  onCloseModal,
  showToast,
}: DataGovernanceSectionProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetPlansConfirm, setShowResetPlansConfirm] = useState(false);
  const [showPruneConfirm, setShowPruneConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await exportAllDataStream();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      a.download = `formsight_data_${dateStr}_${timeStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('settings.exportSuccessToast'), 'success');
    } catch (e) {
      console.error('Export failed:', e);
      showToast(t('settings.exportFailToast'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

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
~~~~~typescript.new
import { Download, Loader2, RotateCcw, Scissors, Trash2, Upload } from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import {
  clearAllData,
  exportAllDataStream,
  importAllData,
  pruneColdRecords,
} from '../../../storage/index';
import { resetPlansToDefault } from '../../../storage/planStorage';
import { ConfirmModal } from '../../common/ConfirmModal';
import type { ToastType } from '../../common/Toast';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

interface DataGovernanceSectionProps {
  onDataChanged: () => void;
  onCloseModal: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}

export function DataGovernanceSection({
  onDataChanged,
  onCloseModal,
  showToast,
}: DataGovernanceSectionProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetPlansConfirm, setShowResetPlansConfirm] = useState(false);
  const [showPruneConfirm, setShowPruneConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await exportAllDataStream();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      a.download = `formsight_data_${dateStr}_${timeStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('settings.exportSuccessToast'), 'success');
    } catch (e) {
      console.error('Export failed:', e);
      showToast(t('settings.exportFailToast'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      const file = target.files[0];
      try {
        setIsImporting(true);
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
      } catch (err) {
        console.error('Import exception:', err);
        showToast(t('settings.importInvalidToast'), 'error');
      } finally {
        setIsImporting(false);
      }
    }
  };
~~~~~

~~~~~act
patch_file
src/components/settings/sections/DataGovernanceSection.tsx
~~~~~
~~~~~typescript.old
      {/* 备份导出与导入 */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          disabled={isExporting}
          onClick={handleExport}
          className="py-3 px-4 rounded-2xl gap-2 h-auto"
        >
          <Download className="w-4 h-4 text-primary" />
          {isExporting ? t('settings.exporting') : t('settings.exportStream')}
        </Button>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="py-3 px-4 rounded-2xl gap-2 h-auto"
        >
          <Upload className="w-4 h-4 text-primary" />
          {t('settings.importBackup')}
        </Button>
        <Input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>
~~~~~
~~~~~typescript.new
      {/* 备份导出与导入 */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          disabled={isExporting || isImporting}
          onClick={handleExport}
          className="py-3 px-4 rounded-2xl gap-2 h-auto"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <Download className="w-4 h-4 text-primary" />
          )}
          {isExporting ? t('settings.exporting') : t('settings.exportStream')}
        </Button>
        <Button
          variant="outline"
          disabled={isExporting || isImporting}
          onClick={() => fileInputRef.current?.click()}
          className="py-3 px-4 rounded-2xl gap-2 h-auto"
        >
          {isImporting ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <Upload className="w-4 h-4 text-primary" />
          )}
          {isImporting ? t('settings.importing') : t('settings.importBackup')}
        </Button>
        <Input
          ref={fileInputRef}
          type="file"
          accept=".json"
          disabled={isImporting}
          onChange={handleImportFile}
          className="hidden"
        />
      </div>

      {/* 导入中全屏阻断遮罩 */}
      {isImporting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-150 p-6 text-center select-none">
          <div className="bg-card border border-border p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full animate-in zoom-in-95 duration-150">
            <div className="p-3 bg-accent text-primary rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                {t('settings.importingTitle')}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('settings.importingDesc')}
              </p>
            </div>
          </div>
        </div>
      )}
~~~~~

### 下一步建议

1. **功能验证**：可在设置中重新尝试导入 7MB+ 规模的历史 JSON 备份文件，观察全屏 Loading 遮罩展示以及数据写入秒级完成的效果。
2. **测试覆盖**：如果测试用例中涉及 `importAllData` 的单元测试，可运行自动化测试套件确保 IndexedDB 各对象表与 LocalStorage 合并逻辑均正常通过。
3. **提交变更**：测试无误后，随时告诉我，我将为你生成对应的 `[COMMIT]` 计划。
