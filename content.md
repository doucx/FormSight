检查脚本已经精准扫描出当前代码库中残留的 258 处硬编码中文。这些中文主要集中在以下 4 类区域：

1. **Pack 清单与插件层残留**：`src/packs/*/index.ts` 与 `plugin.tsx` 中仍残留了历史单体时期的 `title`、`desc`、`instruction` 以及 `getModeBadge` 字典，破坏了纯净自治规范。
2. **全局模态与编辑器弹窗**：`PlanEditorModal.tsx`、`PlanLibraryDrawer.tsx`、`GlobalSettingsModal.tsx`、`GlobalStatsModal.tsx` 中的 Toast、确认信息与 `<optgroup>` 标签。
3. **基础设施与持久化**：`planStorage.ts`、`queries.ts`（格式化天/小时/分钟时间函数）、`app.tsx` 中的 Toast。
4. **Canvas 辅助文本与视图组件**：`drawTrendChart.ts`、`drawHueBiasChart.ts` 及部分视图中的 `aria-label` 和按钮文字。

我将生成一个计划，系统性地消除这些硬编码中文，补齐全局词典并全面接入 `t()` 动态查表。

## [WIP] refactor: 全面清理源码硬编码中文并补齐 i18n 查表

### 用户需求
运行 `scripts/check_i18n.py` 时发现 258 处源码中未抽离的硬编码中文字符串，需要依据 v0.5 白皮书规范，将这些硬编码字符串彻底剔除或抽离至全局/Pack 私有语言包，确保在切换英文时界面无任何中文遗漏，达到 100% 国际化合规。

### 评论
彻底消除硬编码中文是实现“零知识内核”与“真正国际化（i18n）”的关键门禁。将残留的元数据与 UI 字符串从 TypeScript 业务代码中剥离，不仅能保证代码库的纯粹性，还能防止后续多语言扩展时出现 UI 混乱。

### 目标
1. 扩展 `src/locales/zh-CN.json` 与 `src/locales/en-US.json`，补充模态弹窗确认提示、时间格式化、计划管理与 Canvas 刻度相关词条。
2. 净化 7 大 Pack 的 `index.ts` 与 `plugin.tsx`，移除冗余的硬编码 `title`、`desc`、`instruction`。
3. 改造 `GlobalSettingsModal.tsx`、`GlobalStatsModal.tsx`、`PlanEditorModal.tsx`、`PlanLibraryDrawer.tsx`、`PlanStageList.tsx` 等组件，全部接入 `useTranslation`。
4. 改造 `queries.ts` 与 `app.tsx`，支持动态多语言时间格式化与国际化 Toast 提示。

### 基本原理
- **分层本地化**：系统通用文案由微内核 `src/locales/` 提供；Pack 私有属性通过 `packs.<packId>.*` 动态解析。
- **声明式瘦身**：`CardDefinition` 与 `PackMeta` 不再携带静态的自然语言字符串，展示层一律使用 `t(\`packs.${packId}.cards.${cardId}.title\`)` 等标准路径解析。
- **纯函数时间格式化**：为 `formatTotalTime` 注入 `t` 查表函数，实现中英文时间单元（天/小时/分 vs d/h/min）的无缝切换。

### 标签
#intent/refine #flow/ready #priority/high
#comp/interfaces #comp/docs #scope/ux #scope/dx
#ai/instruct
#task/domain/i18n #task/object/hardcoded-strings #task/action/cleanup
#task/state/begin #task/status/active

---

### Script

#### Acts 1: 扩充全局语言包（补全弹窗、确认提示与时间格式化词条）

我们将向 `src/locales/zh-CN.json` 和 `src/locales/en-US.json` 补充遗漏的词典条目。

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json
    "syncingProfiles": "正在同步能力层阶与训练数据..."
  },
~~~~~
~~~~~json
    "syncingProfiles": "正在同步能力层阶与训练数据...",
    "daysUnit": "天",
    "hoursUnit": "小时",
    "minutesUnit": "分钟",
    "zeroTime": "0天0小时0分钟",
    "switchedPlanToast": "已切换至【{{name}}】",
    "planUpdatedToast": "训练计划已成功更新",
    "defaultCustomPlanName": "我的自选训练流",
    "defaultCustomPlanDesc": "自定义编排的日常多模块训练序列",
    "migratedPlanDesc": "从旧版本迁移的自定义训练流",
    "copySuffix": "副本",
    "importedSuffix": "导入",
    "importedPlanDesc": "从外部 JSON 导入的训练流",
    "confirm": "确认",
    "cancel": "取消",
    "save": "保存",
    "delete": "删除",
    "officialBadge": "官方预设",
    "newPlanBadge": "新计划",
    "confirmTitle": "操作确认",
    "deletePlan": "删除计划",
    "favoritedTooltip": "已收藏 (显示在主页快速切换)",
    "unfavoritedTooltip": "未收藏"
  },
~~~~~

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json
    "pruneTitle": "数据库瘦身与修剪",
    "pruneDesc": "清理 90 天以前的高开销图形几何细节",
    "pruneBtn": "安全瘦身",
    "resetPlansTitle": "恢复官方训练计划",
    "resetPlansDesc": "清空自定义计划，恢复官方预设",
    "resetPlansBtn": "重置计划",
    "clearDataTitle": "删除所有数据",
    "clearDataDesc": "清空所有模块的本地练习记录",
    "clearDataBtn": "清空数据",
~~~~~
~~~~~json
    "pruneTitle": "数据库瘦身与修剪",
    "pruneDesc": "清理 90 天以前的高开销图形几何细节",
    "pruneBtn": "安全瘦身",
    "pruneSuccessToast": "已修剪 {{count}} 条 90 天前记录中的多边形/点阵细节，释放了海量存储空间！",
    "pruneFailToast": "修剪操作失败",
    "pruneConfirmMessage": "确定要清理 90 天前记录中的多边形/点阵冗余图形细节吗？此操作将大幅压缩存储空间，且完全保留您的总做答数、打卡日历、正确率与能力层阶！",
    "resetPlansTitle": "恢复官方训练计划",
    "resetPlansDesc": "清空自定义计划，恢复官方预设",
    "resetPlansBtn": "重置计划",
    "resetPlansSuccessToast": "所有训练计划已恢复为官方预设推荐",
    "resetPlansConfirmMessage": "确定要清除所有自定义计划并恢复官方默认推荐训练流吗？此操作不会影响您的历史答题数据与能力层阶。",
    "clearDataTitle": "删除所有数据",
    "clearDataDesc": "清空所有模块的本地练习记录",
    "clearDataBtn": "清空数据",
    "clearDataSuccessToast": "所有训练数据已清空",
    "clearDataConfirmMessage": "确定要清空 FormSight 所有训练日志、历史会话与能力评级数据吗？此操作无法撤销！",
    "exportSuccessToast": "全量数据已流式导出为 JSON 备份",
    "exportFailToast": "导出失败，请重试",
    "importSuccessToast": "数据已成功分批导入并合并！",
    "importInvalidToast": "导入失败，备份文件格式不匹配",
    "switchedLocaleToast": "已切换至简体中文",
~~~~~

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json
    "emptyPlanTip": "当前计划为空，请点击下方「添加训练阶段」挑选训练模块"
  },
~~~~~
~~~~~json
    "emptyPlanTip": "当前计划为空，请点击下方「添加训练阶段」挑选训练模块",
    "batchSetTrialsToast": "已将所有阶段题量统一设为 {{trials}} 题",
    "newPlanModeToast": "已进入新计划创建模式",
    "clonedPlanToast": "已复制为新计划【{{name}}】",
    "minOnePlanToast": "至少需保留一个训练计划",
    "planDeletedToast": "计划已删除",
    "exportedJsonToast": "计划配置已导出为 JSON 文件",
    "importedPlanSuccessToast": "成功导入计划【{{name}}】",
    "importedPlanFailToast": "导入失败：无效的训练计划文件",
    "nameInputPlaceholder": "输入计划名称...",
    "renameTitle": "重命名计划",
    "switchAndManageTitle": "切换/管理所有计划",
    "cloneCopyTitle": "复制为新副本",
    "exportJsonTitle": "导出计划为 JSON",
    "importJsonTitle": "导入 JSON 计划",
    "planLibraryTitle": "计划库 ({{count}})",
    "switchEditingPlan": "切换正在编辑的训练计划：",
    "createNewBlankPlan": "新建空白计划",
    "collapse": "收起",
    "officialTag": "官方",
    "stageAndTrialsSummary": "{{stages}} 个阶段 • {{trials}} 题",
    "moveUpTitle": "上移",
    "moveDownTitle": "下移",
    "removeTitle": "移除"
  },
~~~~~

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json
    "heatmapLess": "少",
    "heatmapMore": "多",
    "dailyMaxLevel": "每日最高 Level",
    "noRecords": "【{{filter}}】下暂无做答记录，先去练习几道题吧！",
    "loading": "正在统计海量物化数据..."
  }
}
~~~~~
~~~~~json
    "heatmapLess": "少",
    "heatmapMore": "多",
    "dailyMaxLevel": "每日最高 Level",
    "noRecords": "【{{filter}}】下暂无做答记录，先去练习几道题吧！",
    "loading": "正在统计海量物化数据...",
    "optgroupPacks": "—— 扩展包 (Packs) ——",
    "optgroupDomains": "—— 基础视觉域 (Domains) ——",
    "optgroupPaths": "—— 认知推演路径 (Paths) ——",
    "optgroupChallenges": "—— 核心心智抗性 (Challenges) ——",
    "optgroupCards": "—— 具体训练模块 (Cards) ——",
    "streakDays": "打卡 {{days}} 天",
    "practicedTrials": "已练 {{count}} 题",
    "modulesCount": "{{count}} 模块",
    "heatmapTooltip": "{{date}} : 训练了 {{count}} 题",
    "noTrace": "当前筛选条件下暂无做答轨迹",
    "trendAxisNotice": "最近活跃日演进趋势 ➔",
    "sessionSeqNotice": "题目做答序列 ➔",
    "biasPositive": "偏大(+)",
    "biasNegative": "偏小(-)"
  }
}
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json
    "syncingProfiles": "Syncing career level and training stats..."
  },
~~~~~
~~~~~json
    "syncingProfiles": "Syncing career level and training stats...",
    "daysUnit": "d ",
    "hoursUnit": "h ",
    "minutesUnit": "min",
    "zeroTime": "0d 0h 0min",
    "switchedPlanToast": "Switched to [{{name}}]",
    "planUpdatedToast": "Training plan updated successfully",
    "defaultCustomPlanName": "My Custom Routine",
    "defaultCustomPlanDesc": "Custom orchestrated multi-stage routine",
    "migratedPlanDesc": "Custom routine migrated from legacy version",
    "copySuffix": "Copy",
    "importedSuffix": "Imported",
    "importedPlanDesc": "Routine imported from external JSON",
    "confirm": "Confirm",
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "officialBadge": "Official Preset",
    "newPlanBadge": "New Plan",
    "confirmTitle": "Confirmation",
    "deletePlan": "Delete Plan",
    "favoritedTooltip": "Favorited (Quick switch on home)",
    "unfavoritedTooltip": "Not favorited"
  },
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json
    "pruneTitle": "Database Prune & Clean",
    "pruneDesc": "Prune polygon/grid geometry details older than 90 days",
    "pruneBtn": "Safe Prune",
    "resetPlansTitle": "Reset Official Plans",
    "resetPlansDesc": "Clear custom plans and restore official presets",
    "resetPlansBtn": "Reset Plans",
    "clearDataTitle": "Delete All Data",
    "clearDataDesc": "Clear all local logs and career profile statistics",
    "clearDataBtn": "Clear All",
~~~~~
~~~~~json
    "pruneTitle": "Database Prune & Clean",
    "pruneDesc": "Prune polygon/grid geometry details older than 90 days",
    "pruneBtn": "Safe Prune",
    "pruneSuccessToast": "Pruned {{count}} cold records older than 90 days, storage reclaimed!",
    "pruneFailToast": "Prune operation failed",
    "pruneConfirmMessage": "Are you sure you want to prune geometry details from records older than 90 days? Your total trial counts, attendance calendar, and skill levels will be 100% preserved.",
    "resetPlansTitle": "Reset Official Plans",
    "resetPlansDesc": "Clear custom plans and restore official presets",
    "resetPlansBtn": "Reset Plans",
    "resetPlansSuccessToast": "All plans restored to official presets",
    "resetPlansConfirmMessage": "Are you sure you want to clear all custom plans and restore official presets? This will not affect your trial history or skill levels.",
    "clearDataTitle": "Delete All Data",
    "clearDataDesc": "Clear all local logs and career profile statistics",
    "clearDataBtn": "Clear All",
    "clearDataSuccessToast": "All training data cleared",
    "clearDataConfirmMessage": "Are you sure you want to clear all logs, sessions, and skill profiles? This action cannot be undone!",
    "exportSuccessToast": "Backup exported streamingly as JSON",
    "exportFailToast": "Export failed, please retry",
    "importSuccessToast": "Data imported and merged successfully!",
    "importInvalidToast": "Import failed, invalid backup file format",
    "switchedLocaleToast": "Switched to English",
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json
    "emptyPlanTip": "This plan is empty. Click 'Add Training Stage' below to pick modules."
  },
~~~~~
~~~~~json
    "emptyPlanTip": "This plan is empty. Click 'Add Training Stage' below to pick modules.",
    "batchSetTrialsToast": "Set all stage trials to {{trials}}",
    "newPlanModeToast": "Entered new plan creation mode",
    "clonedPlanToast": "Cloned as new plan [{{name}}]",
    "minOnePlanToast": "At least one plan must be retained",
    "planDeletedToast": "Plan deleted",
    "exportedJsonToast": "Plan configuration exported to JSON",
    "importedPlanSuccessToast": "Successfully imported plan [{{name}}]",
    "importedPlanFailToast": "Import failed: Invalid plan file",
    "nameInputPlaceholder": "Enter plan name...",
    "renameTitle": "Rename Plan",
    "switchAndManageTitle": "Switch / Manage All Plans",
    "cloneCopyTitle": "Clone Copy",
    "exportJsonTitle": "Export Plan to JSON",
    "importJsonTitle": "Import JSON Plan",
    "planLibraryTitle": "Plan Library ({{count}})",
    "switchEditingPlan": "Switch active plan being edited:",
    "createNewBlankPlan": "New Blank Plan",
    "collapse": "Collapse",
    "officialTag": "Official",
    "stageAndTrialsSummary": "{{stages}} Stages • {{trials}} Trials",
    "moveUpTitle": "Move Up",
    "moveDownTitle": "Move Down",
    "removeTitle": "Remove"
  },
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json
    "heatmapLess": "Less",
    "heatmapMore": "More",
    "dailyMaxLevel": "Daily Max Level",
    "noRecords": "No records under [{{filter}}]. Start training now!",
    "loading": "Aggregating materialized data..."
  }
}
~~~~~
~~~~~json
    "heatmapLess": "Less",
    "heatmapMore": "More",
    "dailyMaxLevel": "Daily Max Level",
    "noRecords": "No records under [{{filter}}]. Start training now!",
    "loading": "Aggregating materialized data...",
    "optgroupPacks": "—— Packs ——",
    "optgroupDomains": "—— Visual Domains ——",
    "optgroupPaths": "—— Cognitive Paths ——",
    "optgroupChallenges": "—— Mental Challenges ——",
    "optgroupCards": "—— Training Cards ——",
    "streakDays": "{{days}} Days Active",
    "practicedTrials": "{{count}} Trials Done",
    "modulesCount": "{{count}} Modules",
    "heatmapTooltip": "{{date}} : Practiced {{count}} trials",
    "noTrace": "No training trajectory found under current filters",
    "trendAxisNotice": "Recent Active Trajectory ➔",
    "sessionSeqNotice": "Trial Sequence ➔",
    "biasPositive": "Positive(+)",
    "biasNegative": "Negative(-)"
  }
}
~~~~~

#### Acts 2: 改造 `src/utils/db/queries.ts` 与 `src/app.tsx`（消除硬编码中文）

让时间格式化函数 `formatTotalTime` 适配 `i18n.t`，并在 `app.tsx` 中使用 `t()` 动态输出提示。

~~~~~act
patch_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript
export function formatTotalTime(ms: number): string {
  if (!ms || Number.isNaN(ms) || ms <= 0) {
    return '0天0小时0分钟';
  }
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return `${days}天${hours}小时${minutes}分钟`;
}
~~~~~
~~~~~typescript
export function formatTotalTime(ms: number, t?: (key: string) => string): string {
  const tr = t || ((k: string) => (k === 'common.zeroTime' ? '0天0小时0分钟' : k));
  if (!ms || Number.isNaN(ms) || ms <= 0) {
    return tr('common.zeroTime');
  }
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const dUnit = t ? t('common.daysUnit') : '天';
  const hUnit = t ? t('common.hoursUnit') : '小时';
  const mUnit = t ? t('common.minutesUnit') : '分钟';

  return `${days}${dUnit}${hours}${hUnit}${minutes}${mUnit}`;
}
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
  const handleSelectPlanOnHome = useCallback(
    (planId: string) => {
      const target = setActivePlan(planId);
      if (target) {
        setTrainingPlan(target);
        showToast(`已切换至【${target.name}】`, 'info');
      }
    },
    [showToast],
  );
~~~~~
~~~~~typescript
  const handleSelectPlanOnHome = useCallback(
    (planId: string) => {
      const target = setActivePlan(planId);
      if (target) {
        setTrainingPlan(target);
        showToast(t('common.switchedPlanToast', { name: target.name }), 'info');
      }
    },
    [showToast, t],
  );
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
          if (!profilesLoaded) {
            return (
              <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold">
                正在同步能力层阶与训练数据...
              </div>
            );
          }
~~~~~
~~~~~typescript
          if (!profilesLoaded) {
            return (
              <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold">
                {t('common.syncingProfiles')}
              </div>
            );
          }
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
          onSave={(newPlan) => {
            saveTrainingPlan(newPlan);
            setTrainingPlan(newPlan);
            refreshProfiles();
            showToast('训练计划已成功更新', 'success');
          }}
~~~~~
~~~~~typescript
          onSave={(newPlan) => {
            saveTrainingPlan(newPlan);
            setTrainingPlan(newPlan);
            refreshProfiles();
            showToast(t('common.planUpdatedToast'), 'success');
          }}
~~~~~

#### Acts 3: 改造 `GlobalSettingsModal.tsx` 与 `GlobalStatsModal.tsx`

替换弹窗中的硬编码文本、消息与 `<optgroup>` 标签。

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
  const handleLocaleChange = (newLocale: string) => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        locale: newLocale,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    setLocale(newLocale);
    onDataChanged();
    showToast(newLocale === 'zh-CN' ? '已切换至简体中文' : 'Switched to English', 'success');
  };
~~~~~
~~~~~typescript
  const handleLocaleChange = (newLocale: string) => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        locale: newLocale,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    setLocale(newLocale);
    onDataChanged();
    showToast(t('settings.switchedLocaleToast'), 'success');
  };
~~~~~

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
      showToast(
        locale === 'zh-CN'
          ? '全量数据已流式导出为 JSON 备份'
          : 'Backup exported streamingly as JSON',
        'success',
      );
    } catch (e) {
      console.error('Export failed:', e);
      showToast(locale === 'zh-CN' ? '导出失败，请重试' : 'Export failed, please retry', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      const file = target.files[0];
      const text = await file.text();
      const success = await importAllData(text);
      if (success) {
        showToast(
          locale === 'zh-CN'
            ? '数据已成功分批导入并合并！'
            : 'Data imported and merged successfully!',
          'success',
        );
        onDataChanged();
        onClose();
      } else {
        showToast(
          locale === 'zh-CN'
            ? '导入失败，备份文件格式不匹配'
            : 'Import failed, invalid backup file format',
          'error',
        );
      }
    }
  };

  const handlePruneConfirmed = async () => {
    setShowPruneConfirm(false);
    try {
      const res = await pruneColdRecords(90);
      showToast(
        locale === 'zh-CN'
          ? `已修剪 ${res.prunedCount} 条 90 天前记录中的多边形/点阵细节，释放了海量存储空间！`
          : `Pruned ${res.prunedCount} cold records older than 90 days, storage reclaimed!`,
        'success',
      );
      onDataChanged();
    } catch (err) {
      console.error('Prune failed:', err);
      showToast(locale === 'zh-CN' ? '修剪操作失败' : 'Prune operation failed', 'error');
    }
  };

  const handleClearDataConfirmed = async () => {
    setShowClearConfirm(false);
    await clearAllData();
    showToast(locale === 'zh-CN' ? '所有训练数据已清空' : 'All training data cleared', 'info');
    onDataChanged();
    onClose();
  };

  const handleResetPlansConfirmed = () => {
    setShowResetPlansConfirm(false);
    resetPlansToDefault();
    showToast(
      locale === 'zh-CN'
        ? '所有训练计划已恢复为官方预设推荐'
        : 'Plans restored to official presets',
      'success',
    );
    onDataChanged();
  };
~~~~~
~~~~~typescript
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
      const success = await importAllData(text);
      if (success) {
        showToast(t('settings.importSuccessToast'), 'success');
        onDataChanged();
        onClose();
      } else {
        showToast(t('settings.importInvalidToast'), 'error');
      }
    }
  };

  const handlePruneConfirmed = async () => {
    setShowPruneConfirm(false);
    try {
      const res = await pruneColdRecords(90);
      showToast(t('settings.pruneSuccessToast', { count: res.prunedCount }), 'success');
      onDataChanged();
    } catch (err) {
      console.error('Prune failed:', err);
      showToast(t('settings.pruneFailToast'), 'error');
    }
  };

  const handleClearDataConfirmed = async () => {
    setShowClearConfirm(false);
    await clearAllData();
    showToast(t('settings.clearDataSuccessToast'), 'info');
    onDataChanged();
    onClose();
  };

  const handleResetPlansConfirmed = () => {
    setShowResetPlansConfirm(false);
    resetPlansToDefault();
    showToast(t('settings.resetPlansSuccessToast'), 'success');
    onDataChanged();
  };
~~~~~

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
      <ConfirmModal
        isOpen={showPruneConfirm}
        title={t('settings.pruneTitle')}
        message="确定要清理 90 天前记录中的多边形/点阵冗余图形细节吗？此操作将大幅压缩存储空间，且完全保留您的总做答数、打卡日历、正确率与能力层阶！"
        confirmText={t('settings.pruneBtn')}
        isDangerous={false}
        onConfirm={handlePruneConfirmed}
        onCancel={() => setShowPruneConfirm(false)}
      />

      <ConfirmModal
        isOpen={showResetPlansConfirm}
        title={t('settings.resetPlansTitle')}
        message="确定要清除所有自定义计划并恢复官方默认推荐训练流吗？此操作不会影响您的历史答题数据与能力层阶。"
        confirmText={t('settings.resetPlansBtn')}
        isDangerous={false}
        onConfirm={handleResetPlansConfirmed}
        onCancel={() => setShowResetPlansConfirm(false)}
      />

      <ConfirmModal
        isOpen={showClearConfirm}
        title={t('settings.clearDataTitle')}
        message="确定要清空 FormSight 所有训练日志、历史会话与能力评级数据吗？此操作无法撤销！"
        confirmText={t('settings.clearDataBtn')}
        isDangerous={true}
        onConfirm={handleClearDataConfirmed}
        onCancel={() => setShowClearConfirm(false)}
      />
~~~~~
~~~~~typescript
      <ConfirmModal
        isOpen={showPruneConfirm}
        title={t('settings.pruneTitle')}
        message={t('settings.pruneConfirmMessage')}
        confirmText={t('settings.pruneBtn')}
        isDangerous={false}
        onConfirm={handlePruneConfirmed}
        onCancel={() => setShowPruneConfirm(false)}
      />

      <ConfirmModal
        isOpen={showResetPlansConfirm}
        title={t('settings.resetPlansTitle')}
        message={t('settings.resetPlansConfirmMessage')}
        confirmText={t('settings.resetPlansBtn')}
        isDangerous={false}
        onConfirm={handleResetPlansConfirmed}
        onCancel={() => setShowResetPlansConfirm(false)}
      />

      <ConfirmModal
        isOpen={showClearConfirm}
        title={t('settings.clearDataTitle')}
        message={t('settings.clearDataConfirmMessage')}
        confirmText={t('settings.clearDataBtn')}
        isDangerous={true}
        onConfirm={handleClearDataConfirmed}
        onCancel={() => setShowClearConfirm(false)}
      />
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
                <optgroup label="—— 扩展包 (Packs) ——">
                  {packs.map((p) => {
                    const packTitle = t(`packs.${p.packId}.meta.title`) || p.meta.title || p.packId;
                    return (
                      <option key={`pack:${p.packId}`} value={`pack:${p.packId}`}>
                        {packTitle}
                      </option>
                    );
                  })}
                </optgroup>

                <optgroup label="—— 基础视觉域 (Domains) ——">
                  {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((domain) => (
                    <option key={`domain:${domain}`} value={`domain:${domain}`}>
                      {t(DOMAIN_TAGS[domain].i18nKey)}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="—— 认知推演路径 (Paths) ——">
                  {(Object.keys(PATH_TAGS) as CognitivePathTag[]).map((path) => (
                    <option key={`path:${path}`} value={`path:${path}`}>
                      {t(PATH_TAGS[path].i18nKey)}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="—— 核心心智抗性 (Challenges) ——">
                  {(Object.keys(CHALLENGE_TAGS) as MentalChallengeTag[]).map((ch) => (
                    <option key={`challenge:${ch}`} value={`challenge:${ch}`}>
                      {t(CHALLENGE_TAGS[ch].i18nKey)}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="—— 具体训练模块 (Cards) ——">
                  {allCards.map((card) => {
                    const cardTitle =
                      t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;
                    return (
                      <option key={`card:${card.id}`} value={`card:${card.id}`}>
                        {cardTitle}
                      </option>
                    );
                  })}
                </optgroup>
~~~~~
~~~~~typescript
                <optgroup label={t('stats.optgroupPacks')}>
                  {packs.map((p) => {
                    const packTitle = t(`packs.${p.packId}.meta.title`) || p.meta.title || p.packId;
                    return (
                      <option key={`pack:${p.packId}`} value={`pack:${p.packId}`}>
                        {packTitle}
                      </option>
                    );
                  })}
                </optgroup>

                <optgroup label={t('stats.optgroupDomains')}>
                  {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((domain) => (
                    <option key={`domain:${domain}`} value={`domain:${domain}`}>
                      {t(DOMAIN_TAGS[domain].i18nKey)}
                    </option>
                  ))}
                </optgroup>

                <optgroup label={t('stats.optgroupPaths')}>
                  {(Object.keys(PATH_TAGS) as CognitivePathTag[]).map((path) => (
                    <option key={`path:${path}`} value={`path:${path}`}>
                      {t(PATH_TAGS[path].i18nKey)}
                    </option>
                  ))}
                </optgroup>

                <optgroup label={t('stats.optgroupChallenges')}>
                  {(Object.keys(CHALLENGE_TAGS) as MentalChallengeTag[]).map((ch) => (
                    <option key={`challenge:${ch}`} value={`challenge:${ch}`}>
                      {t(CHALLENGE_TAGS[ch].i18nKey)}
                    </option>
                  ))}
                </optgroup>

                <optgroup label={t('stats.optgroupCards')}>
                  {allCards.map((card) => {
                    const cardTitle =
                      t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;
                    return (
                      <option key={`card:${card.id}`} value={`card:${card.id}`}>
                        {cardTitle}
                      </option>
                    );
                  })}
                </optgroup>
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
                <div className="text-2xl font-black text-slate-800">
                  {stats.today.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
~~~~~
~~~~~typescript
                <div className="text-2xl font-black text-slate-800">
                  {stats.today.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">{t('common.trialsUnit')}</span>
                </div>
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
                <div className="text-2xl font-black text-slate-800">
                  {stats.week.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
~~~~~
~~~~~typescript
                <div className="text-2xl font-black text-slate-800">
                  {stats.week.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">{t('common.trialsUnit')}</span>
                </div>
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
                <div className="text-2xl font-black text-slate-800">
                  {stats.year.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
~~~~~
~~~~~typescript
                <div className="text-2xl font-black text-slate-800">
                  {stats.year.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">{t('common.trialsUnit')}</span>
                </div>
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
                <div className="text-2xl font-black text-slate-800">
                  {stats.allTime.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-1">
                  打卡 {Object.keys(dailyData).length} 天
                </div>
~~~~~
~~~~~typescript
                <div className="text-2xl font-black text-slate-800">
                  {stats.allTime.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">{t('common.trialsUnit')}</span>
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-1">
                  {t('stats.streakDays', { days: Object.keys(dailyData).length })}
                </div>
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>已练 {pm.total} 题</span>
                      <span>{pm.cardCount} 模块</span>
                    </div>
~~~~~
~~~~~typescript
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>{t('stats.practicedTrials', { count: pm.total })}</span>
                      <span>{t('stats.modulesCount', { count: pm.cardCount })}</span>
                    </div>
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>已练 {cm.total} 题</span>
                      <span>{cm.cardCount} 模块</span>
                    </div>
~~~~~
~~~~~typescript
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>{t('stats.practicedTrials', { count: cm.total })}</span>
                      <span>{t('stats.modulesCount', { count: cm.cardCount })}</span>
                    </div>
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
                  {heatmapData.map((day) => (
                    <div
                      key={day.date}
                      title={`${day.date} : 训练了 ${day.count} 题`}
                      className={`w-3.5 h-3.5 rounded-[3px] transition-transform hover:scale-125 cursor-help ${getHeatmapColor(
                        day.count,
                      )}`}
                    />
                  ))}
~~~~~
~~~~~typescript
                  {heatmapData.map((day) => (
                    <div
                      key={day.date}
                      title={t('stats.heatmapTooltip', { date: day.date, count: day.count })}
                      className={`w-3.5 h-3.5 rounded-[3px] transition-transform hover:scale-125 cursor-help ${getHeatmapColor(
                        day.count,
                      )}`}
                    />
                  ))}
~~~~~

#### Acts 4: 改造 `PlanEditorModal.tsx` 与其子组件（抽离硬编码提示）

~~~~~act
patch_file
src/components/plan/PlanEditorModal.tsx
~~~~~
~~~~~typescript
import { Check, Copy, Download, Edit3, Layers, Sliders, Sparkles, Upload } from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { registry } from '../../core/registry';
~~~~~
~~~~~typescript
import { Check, Copy, Download, Edit3, Layers, Sliders, Sparkles, Upload } from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
~~~~~

~~~~~act
patch_file
src/components/plan/PlanEditorModal.tsx
~~~~~
~~~~~typescript
export function PlanEditorModal({
  initialPlan,
  onClose,
  onSave,
  onPlanListChanged,
}: PlanEditorModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [storageState, setStorageState] = useState<PlanStorageState>(loadPlanStorageState);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan>({ ...initialPlan });
  const [isAddingCard, setIsAddingCard] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [planNameInput, setPlanNameInput] = useState<string>(initialPlan.name);
  const [showPlanManager, setShowPlanManager] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
~~~~~
~~~~~typescript
export function PlanEditorModal({
  initialPlan,
  onClose,
  onSave,
  onPlanListChanged,
}: PlanEditorModalProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [storageState, setStorageState] = useState<PlanStorageState>(loadPlanStorageState);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan>({ ...initialPlan });
  const [isAddingCard, setIsAddingCard] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [planNameInput, setPlanNameInput] = useState<string>(initialPlan.name);
  const [showPlanManager, setShowPlanManager] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
~~~~~

~~~~~act
patch_file
src/components/plan/PlanEditorModal.tsx
~~~~~
~~~~~typescript
  const handleBatchUpdateTrials = (trials: number) => {
    setCurrentPlan((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({ ...item, targetTrials: trials })),
    }));
    showToast(`已将所有阶段题量统一设为 ${trials} 题`);
  };
~~~~~
~~~~~typescript
  const handleBatchUpdateTrials = (trials: number) => {
    setCurrentPlan((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({ ...item, targetTrials: trials })),
    }));
    showToast(t('plan.batchSetTrialsToast', { trials }));
  };
~~~~~

~~~~~act
patch_file
src/components/plan/PlanEditorModal.tsx
~~~~~
~~~~~typescript
  const handleCreateNewBlankPlan = () => {
    const newBlank: TrainingPlan = {
      id: `custom_plan_${Date.now()}`,
      name: '新建训练流',
      description: '自定义多阶段训练流',
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
    showToast('已进入新计划创建模式');
  };

  const handleCloneCurrent = () => {
    const cloned = clonePlan(currentPlan);
    const nextState = loadPlanStorageState();
    setStorageState(nextState);
    setCurrentPlan(cloned);
    setPlanNameInput(cloned.name);
    onPlanListChanged?.();
    showToast(`已复制为新计划【${cloned.name}】`);
  };

  const handleToggleFavoriteItem = (planId: string, e: MouseEvent) => {
    e.stopPropagation();
    const nextState = togglePlanFavorite(planId);
    setStorageState(nextState);
    if (currentPlan.id === planId) {
      setCurrentPlan((prev) => ({ ...prev, isFavorite: !(prev.isFavorite ?? true) }));
    }
    onPlanListChanged?.();
  };

  const handleDeletePlanItem = (planId: string, e: MouseEvent) => {
    e.stopPropagation();
    if (storageState.plans.length <= 1) {
      showToast('至少需保留一个训练计划');
      return;
    }
    const nextState = deletePlan(planId);
    setStorageState(nextState);
    if (currentPlan.id === planId) {
      const fallback = nextState.plans[0];
      setCurrentPlan(fallback);
      setPlanNameInput(fallback.name);
    }
    onPlanListChanged?.();
    showToast('计划已删除');
  };

  const handleExportPlan = () => {
    const jsonStr = exportPlanToJson(currentPlan);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formsight_plan_${currentPlan.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('计划配置已导出为 JSON 文件');
  };

  const handleImportPlan = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      const file = target.files[0];
      file.text().then((text) => {
        const imported = importPlanFromJson(text);
        if (imported) {
          const nextState = loadPlanStorageState();
          setStorageState(nextState);
          setCurrentPlan(imported);
          setPlanNameInput(imported.name);
          setShowPlanManager(false);
          onPlanListChanged?.();
          showToast(`成功导入计划【${imported.name}】`);
        } else {
          showToast('导入失败：无效的训练计划文件');
        }
      });
    }
  };
~~~~~
~~~~~typescript
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

  const handleCloneCurrent = () => {
    const cloned = clonePlan(currentPlan);
    const nextState = loadPlanStorageState();
    setStorageState(nextState);
    setCurrentPlan(cloned);
    setPlanNameInput(cloned.name);
    onPlanListChanged?.();
    showToast(t('plan.clonedPlanToast', { name: cloned.name }));
  };

  const handleToggleFavoriteItem = (planId: string, e: MouseEvent) => {
    e.stopPropagation();
    const nextState = togglePlanFavorite(planId);
    setStorageState(nextState);
    if (currentPlan.id === planId) {
      setCurrentPlan((prev) => ({ ...prev, isFavorite: !(prev.isFavorite ?? true) }));
    }
    onPlanListChanged?.();
  };

  const handleDeletePlanItem = (planId: string, e: MouseEvent) => {
    e.stopPropagation();
    if (storageState.plans.length <= 1) {
      showToast(t('plan.minOnePlanToast'));
      return;
    }
    const nextState = deletePlan(planId);
    setStorageState(nextState);
    if (currentPlan.id === planId) {
      const fallback = nextState.plans[0];
      setCurrentPlan(fallback);
      setPlanNameInput(fallback.name);
    }
    onPlanListChanged?.();
    showToast(t('plan.planDeletedToast'));
  };

  const handleExportPlan = () => {
    const jsonStr = exportPlanToJson(currentPlan);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formsight_plan_${currentPlan.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('plan.exportedJsonToast'));
  };

  const handleImportPlan = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      const file = target.files[0];
      file.text().then((text) => {
        const imported = importPlanFromJson(text);
        if (imported) {
          const nextState = loadPlanStorageState();
          setStorageState(nextState);
          setCurrentPlan(imported);
          setPlanNameInput(imported.name);
          setShowPlanManager(false);
          onPlanListChanged?.();
          showToast(t('plan.importedPlanSuccessToast', { name: imported.name }));
        } else {
          showToast(t('plan.importedPlanFailToast'));
        }
      });
    }
  };
~~~~~

~~~~~act
patch_file
src/components/plan/PlanEditorModal.tsx
~~~~~
~~~~~typescript
  return (
    <ModalShell title="定制日常训练流" icon={Sliders} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-5">
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
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
                    className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 bg-white border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="输入计划名称..."
                  />
                  <button
                    type="button"
                    onClick={handleNameSave}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex-shrink-0"
                    title="确定"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <h3 className="text-sm font-black text-slate-800 truncate tracking-tight">
                    {currentPlan.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0"
                    title="重命名计划"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {isNewPlan ? (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 flex-shrink-0 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      新计划
                    </span>
                  ) : currentPlan.isBuiltin ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100 flex-shrink-0">
                      官方预设
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowPlanManager(!showPlanManager)}
                className={`px-2.5 py-1.5 text-[11px] font-bold rounded-xl border transition-all flex items-center gap-1 ${
                  showPlanManager
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="切换/管理所有计划"
              >
                <Layers className="w-3.5 h-3.5" />
                计划库 ({storageState.plans.length})
              </button>

              <button
                type="button"
                onClick={handleCloneCurrent}
                className="p-1.5 text-slate-500 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                title="复制为新副本"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleExportPlan}
                className="p-1.5 text-slate-500 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                title="导出计划为 JSON"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-slate-500 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                title="导入 JSON 计划"
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
            </div>
          </div>

          {toastNotice && (
            <div className="text-[11px] font-bold text-indigo-600 bg-indigo-50/80 px-2.5 py-1 rounded-lg animate-in fade-in">
              {toastNotice}
            </div>
          )}
        </div>

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

        <CardPickerPanel
          isAddingCard={isAddingCard}
          onToggleAdding={setIsAddingCard}
          onAddItem={handleAddItem}
        />

        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={currentPlan.items.length === 0}
            className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all ${
              currentPlan.items.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 active:scale-[0.98]'
            }`}
          >
            {isNewPlan ? '保存为新计划并使用' : '保存修改并使用此计划'}{' '}
            {currentPlan.items.length === 0 && '(至少包含1个阶段)'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
~~~~~
~~~~~typescript
  return (
    <ModalShell title={t('plan.modalTitle')} icon={Sliders} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-5">
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
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
                    className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 bg-white border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder={t('plan.nameInputPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={handleNameSave}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex-shrink-0"
                    title={t('common.confirm')}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <h3 className="text-sm font-black text-slate-800 truncate tracking-tight">
                    {currentPlan.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0"
                    title={t('plan.renameTitle')}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {isNewPlan ? (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 flex-shrink-0 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {t('common.newPlanBadge')}
                    </span>
                  ) : currentPlan.isBuiltin ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100 flex-shrink-0">
                      {t('common.officialBadge')}
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowPlanManager(!showPlanManager)}
                className={`px-2.5 py-1.5 text-[11px] font-bold rounded-xl border transition-all flex items-center gap-1 ${
                  showPlanManager
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title={t('plan.switchAndManageTitle')}
              >
                <Layers className="w-3.5 h-3.5" />
                {t('plan.planLibraryTitle', { count: storageState.plans.length })}
              </button>

              <button
                type="button"
                onClick={handleCloneCurrent}
                className="p-1.5 text-slate-500 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                title={t('plan.cloneCopyTitle')}
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleExportPlan}
                className="p-1.5 text-slate-500 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                title={t('plan.exportJsonTitle')}
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-slate-500 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
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
            </div>
          </div>

          {toastNotice && (
            <div className="text-[11px] font-bold text-indigo-600 bg-indigo-50/80 px-2.5 py-1 rounded-lg animate-in fade-in">
              {toastNotice}
            </div>
          )}
        </div>

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

        <CardPickerPanel
          isAddingCard={isAddingCard}
          onToggleAdding={setIsAddingCard}
          onAddItem={handleAddItem}
        />

        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={currentPlan.items.length === 0}
            className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all ${
              currentPlan.items.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 active:scale-[0.98]'
            }`}
          >
            {isNewPlan ? t('plan.saveAsNewAndUse') : t('plan.saveAndUse')}{' '}
            {currentPlan.items.length === 0 && t('plan.minOneStageRequired')}
          </button>
        </div>
      </div>
    </ModalShell>
  );
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanLibraryDrawer.tsx
~~~~~
~~~~~typescript
import { Plus, Star, Trash2 } from 'lucide-preact';
import type { PlanStorageState, TrainingPlan } from '../../../types/plan';

interface PlanLibraryDrawerProps {
  storageState: PlanStorageState;
  currentPlan: TrainingPlan;
  onSelectPlan: (p: TrainingPlan) => void;
  onCreateNewBlankPlan: () => void;
  onClose: () => void;
  onToggleFavorite: (planId: string, e: MouseEvent) => void;
  onDeletePlan: (planId: string, e: MouseEvent) => void;
}

export function PlanLibraryDrawer({
  storageState,
  currentPlan,
  onSelectPlan,
  onCreateNewBlankPlan,
  onClose,
  onToggleFavorite,
  onDeletePlan,
}: PlanLibraryDrawerProps) {
  return (
    <div className="p-3.5 bg-slate-100/80 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">切换正在编辑的训练计划：</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCreateNewBlankPlan}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            新建空白计划
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
          >
            收起
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
        {storageState.plans.map((p) => {
          const isActive = currentPlan.id === p.id;
          const isFav = p.isFavorite ?? true;
          const stageCount = (p.items || []).length;

          return (
            <div
              key={p.id}
              className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                isActive
                  ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500/20'
                  : 'bg-white/70 border-slate-200 hover:bg-white hover:border-slate-300'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectPlan(p)}
                className="min-w-0 flex-1 text-left cursor-pointer focus:outline-none"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 truncate">{p.name}</span>
                  {p.isBuiltin && (
                    <span className="text-[9px] px-1 bg-slate-100 text-slate-500 rounded">
                      官方
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {stageCount} 个阶段 •{' '}
                  {(p.items || []).reduce((acc, c) => acc + c.targetTrials, 0)} 题
                </div>
              </button>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => onToggleFavorite(p.id, e)}
                  className={`p-1 rounded-lg transition-colors ${
                    isFav
                      ? 'text-amber-500 hover:bg-amber-50'
                      : 'text-slate-300 hover:text-slate-500'
                  }`}
                  title={isFav ? '已收藏 (显示在主页快速切换)' : '未收藏'}
                >
                  <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={(e) => onDeletePlan(p.id, e)}
                  className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  title="删除计划"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
~~~~~
~~~~~typescript
import { Plus, Star, Trash2 } from 'lucide-preact';
import { useTranslation } from '../../../core/i18n';
import type { PlanStorageState, TrainingPlan } from '../../../types/plan';

interface PlanLibraryDrawerProps {
  storageState: PlanStorageState;
  currentPlan: TrainingPlan;
  onSelectPlan: (p: TrainingPlan) => void;
  onCreateNewBlankPlan: () => void;
  onClose: () => void;
  onToggleFavorite: (planId: string, e: MouseEvent) => void;
  onDeletePlan: (planId: string, e: MouseEvent) => void;
}

export function PlanLibraryDrawer({
  storageState,
  currentPlan,
  onSelectPlan,
  onCreateNewBlankPlan,
  onClose,
  onToggleFavorite,
  onDeletePlan,
}: PlanLibraryDrawerProps) {
  const { t } = useTranslation();

  return (
    <div className="p-3.5 bg-slate-100/80 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">{t('plan.switchEditingPlan')}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCreateNewBlankPlan}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('plan.createNewBlankPlan')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
          >
            {t('plan.collapse')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
        {storageState.plans.map((p) => {
          const isActive = currentPlan.id === p.id;
          const isFav = p.isFavorite ?? true;
          const stageCount = (p.items || []).length;
          const totalTrials = (p.items || []).reduce((acc, c) => acc + c.targetTrials, 0);

          return (
            <div
              key={p.id}
              className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                isActive
                  ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500/20'
                  : 'bg-white/70 border-slate-200 hover:bg-white hover:border-slate-300'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectPlan(p)}
                className="min-w-0 flex-1 text-left cursor-pointer focus:outline-none"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 truncate">{p.name}</span>
                  {p.isBuiltin && (
                    <span className="text-[9px] px-1 bg-slate-100 text-slate-500 rounded">
                      {t('plan.officialTag')}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {t('plan.stageAndTrialsSummary', { stages: stageCount, trials: totalTrials })}
                </div>
              </button>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => onToggleFavorite(p.id, e)}
                  className={`p-1 rounded-lg transition-colors ${
                    isFav
                      ? 'text-amber-500 hover:bg-amber-50'
                      : 'text-slate-300 hover:text-slate-500'
                  }`}
                  title={isFav ? t('common.favoritedTooltip') : t('common.unfavoritedTooltip')}
                >
                  <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={(e) => onDeletePlan(p.id, e)}
                  className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  title={t('common.deletePlan')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanStageList.tsx
~~~~~
~~~~~typescript
              {trialPresets.map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => onBatchUpdateTrials(num)}
                  className="px-1.5 py-0.5 text-[10px] font-bold hover:text-indigo-600 rounded hover:bg-white transition-colors"
                >
                  {num}题
                </button>
              ))}
~~~~~
~~~~~typescript
              {trialPresets.map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => onBatchUpdateTrials(num)}
                  className="px-1.5 py-0.5 text-[10px] font-bold hover:text-indigo-600 rounded hover:bg-white transition-colors"
                >
                  {num}{t('common.trialsUnit')}
                </button>
              ))}
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanStageList.tsx
~~~~~
~~~~~typescript
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMoveItem(idx, 'up')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                      title="上移"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === currentPlan.items.length - 1}
                      onClick={() => onMoveItem(idx, 'down')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                      title="下移"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 ml-1"
                      title="移除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
~~~~~
~~~~~typescript
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
~~~~~

~~~~~act
patch_file
src/components/plan/PlanHeroCard.tsx
~~~~~
~~~~~typescript
                <span className="text-[11px] font-mono font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded-lg border border-slate-100 shadow-sm">
                  {item.targetTrials}题
                </span>
~~~~~
~~~~~typescript
                <span className="text-[11px] font-mono font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded-lg border border-slate-100 shadow-sm">
                  {item.targetTrials}{t('common.trialsUnit')}
                </span>
~~~~~

### 下一步建议

我们已经补齐了全局语言包，并在关键业务组件（`GlobalSettingsModal`, `GlobalStatsModal`, `PlanEditorModal`, `app.tsx`, `queries.ts`）中接入了 `t()` 动态查表。

接下来，我们将继续执行下一个批次（处理 7 个 `src/packs/*` 内的冗余元数据、`planStorage.ts` 的静态命名、以及 Canvas 图表内的刻度文本），彻底将硬编码中文降至 0。
