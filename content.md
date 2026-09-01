我们将为“清空数据”操作添加全屏阻塞遮罩（与还原备份一致的保护级别），并将整个清空与页面状态刷新链路（`refreshProfiles`）改为异步等待完成后再关闭模态框，确保数据与 UI 强一致。

## [WIP] feat(settings): 在清空数据时添加全屏阻塞遮罩并确保页面异步刷新

### 用户需求
1. 在用户确认执行“删除所有数据”时，必须阻止用户的一切操作（显示全屏 Loading 遮罩），防止并发点击。
2. 数据清空完成后，必须确保应用上下文、能力层阶、打卡统计等页面状态完整刷新。

### 评论
清空数据是一项高危操作，若在异步清空与 LocalStorage 重置期间未锁定界面，用户可能触发竞态写入。通过在清空期间挂载全屏阻断遮罩，并在 `clearAllData()` 之后显式 `await onDataChanged()` 重新拉取空状态数据，可以彻底杜绝界面残留旧数据或状态不一致的问题。

### 目标
1. 在 `DataGovernanceSection.tsx` 中增加 `isClearing` 状态，在 `handleClearDataConfirmed` 执行期间展示全屏阻断遮罩。
2. 将 `onDataChanged` 设为异步等待（`await onDataChanged()`），确保状态加载完毕后再关闭模态框并展示 Toast。
3. 在中英文语言包中增加清空数据中提示文案。

### 基本原理
将 `handleClearDataConfirmed` 改造为带状态的异步事务：触发后立即关闭确认对话框并进入 `isClearing` 全屏遮罩状态，清空数据库后调用 `await onDataChanged()` 重新触发 `useAppBootstrap` 的全局数据聚合更新，确保所有 View 消费的均为已清空后的最新响应式状态，最后安全解除遮罩并退出设置弹窗。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #concept/state #scope/ux #ai/instruct #task/domain/storage #task/object/clear-data-blocking-and-refresh #task/action/implementation #task/state/continue

---

### Script

#### Acts 1: 在中英文语言包中补充“正在清空数据”文案

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json.old
    "importBackup": "还原 JSON 备份",
    "importing": "正在还原...",
    "importingTitle": "正在还原数据备份",
    "importingDesc": "正在清空旧数据并写入备份记录与档案，请稍候且勿关闭窗口...",
    "pruneTitle": "数据库瘦身与修剪",
~~~~~
~~~~~json.new
    "importBackup": "还原 JSON 备份",
    "importing": "正在还原...",
    "importingTitle": "正在还原数据备份",
    "importingDesc": "正在清空旧数据并写入备份记录与档案，请稍候且勿关闭窗口...",
    "clearingTitle": "正在清空数据",
    "clearingDesc": "正在重置数据库与个人能力档案，请稍候且勿关闭窗口...",
    "pruneTitle": "数据库瘦身与修剪",
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json.old
    "importBackup": "Restore JSON Backup",
    "importing": "Restoring...",
    "importingTitle": "Restoring Data Backup",
    "importingDesc": "Clearing old data and writing backup records and profiles, please wait and do not close the window...",
    "pruneTitle": "Database Prune & Clean",
~~~~~
~~~~~json.new
    "importBackup": "Restore JSON Backup",
    "importing": "Restoring...",
    "importingTitle": "Restoring Data Backup",
    "importingDesc": "Clearing old data and writing backup records and profiles, please wait and do not close the window...",
    "clearingTitle": "Clearing All Data",
    "clearingDesc": "Resetting database and career profiles, please wait and do not close the window...",
    "pruneTitle": "Database Prune & Clean",
~~~~~

#### Acts 2: 更新 `GlobalSettingsModal.tsx` 的类型定义支持异步 `onDataChanged`

~~~~~act
patch_file
src/components/modals/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript.old
interface GlobalSettingsModalProps {
  settings?: UserSettings;
  onClose: () => void;
  onSave?: (newSettings: UserSettings) => void;
  onDataChanged: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}
~~~~~
~~~~~typescript.new
interface GlobalSettingsModalProps {
  settings?: UserSettings;
  onClose: () => void;
  onSave?: (newSettings: UserSettings) => void;
  onDataChanged: () => Promise<void> | void;
  showToast: (msg: string, type?: ToastType) => void;
}
~~~~~

#### Acts 3: 在 `DataGovernanceSection.tsx` 中添加清空遮罩与异步刷新机制

~~~~~act
patch_file
src/components/settings/sections/DataGovernanceSection.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
interface DataGovernanceSectionProps {
  onDataChanged: () => Promise<void> | void;
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
  const [isClearing, setIsClearing] = useState(false);
~~~~~

~~~~~act
patch_file
src/components/settings/sections/DataGovernanceSection.tsx
~~~~~
~~~~~typescript.old
  const handleClearDataConfirmed = async () => {
    setShowClearConfirm(false);
    await clearAllData();
    showToast(t('settings.clearDataSuccessToast'), 'info');
    onDataChanged();
    onCloseModal();
  };
~~~~~
~~~~~typescript.new
  const handleClearDataConfirmed = async () => {
    setShowClearConfirm(false);
    try {
      setIsClearing(true);
      await clearAllData();
      await onDataChanged();
      showToast(t('settings.clearDataSuccessToast'), 'info');
      onCloseModal();
    } catch (err) {
      console.error('Failed to clear data:', err);
    } finally {
      setIsClearing(false);
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
~~~~~
~~~~~typescript.new
      {/* 备份导出与导入 */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          disabled={isExporting || isImporting || isClearing}
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
          disabled={isExporting || isImporting || isClearing}
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
          disabled={isImporting || isClearing}
          onChange={handleImportFile}
          className="hidden"
        />
      </div>
~~~~~

~~~~~act
patch_file
src/components/settings/sections/DataGovernanceSection.tsx
~~~~~
~~~~~typescript.old
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
~~~~~typescript.new
      {/* 导入与清空中全屏阻断遮罩 */}
      {(isImporting || isClearing) && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-150 p-6 text-center select-none">
          <div className="bg-card border border-border p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full animate-in zoom-in-95 duration-150">
            <div className="p-3 bg-accent text-primary rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                {isClearing ? t('settings.clearingTitle') : t('settings.importingTitle')}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isClearing ? t('settings.clearingDesc') : t('settings.importingDesc')}
              </p>
            </div>
          </div>
        </div>
      )}
~~~~~

### 下一步建议

1. **验证清空流程**：在设置中点击“删除所有数据”并在二次确认弹窗中确认，观察全屏遮罩出现、数据清空与页面状态同步归零（今日刷题变为 0，所有卡片等级与总时长重置为初始状态）。
2. **提交代码**：若所有功能均已符合预期，请告知我，我将为你生成 Git 提交计划。
