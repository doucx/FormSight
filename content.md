为了解决设置弹窗内容过长导致整个视口出现外部滚动条、用户必须滑到底部才能看到“完成”按钮的问题，我们将对 `ModalShell` 进行视口内聚与固定操作栏（Sticky/Fixed Header & Footer）重构：

1. **弹窗高度约束与内部滚动**：将 `ModalShell` 卡片最大高度约束在 `max-h-[88vh]`，中间内容区独立滚动（`overflow-y-auto`），避免撑破全屏视口。
2. **常驻底部操作栏**：为 `ModalShell` 增加专属 `footer` 插槽，将“完成”按钮常驻在弹窗底部，用户无需滚动即可随时确认并关闭。

## [WIP] style(ui): 重构 ModalShell 为内嵌滚动与常驻底部操作栏布局

### 用户需求
在设置项较多时，设置弹窗会出现垂直滚动条且“完成”按钮被挤压至最底部。需要优化弹窗结构，使头部与“完成”按钮常驻固定在可视区域，仅中间内容区支持独立滚动。

### 评论
当前 `ModalShell` 依赖外部全屏遮罩的 `overflow-y-auto` 进行整体滚动，导致弹窗标题与底部 CTA 按钮随内容滚动而移出屏幕，不仅操作路径冗长，还破坏了对话框的视觉稳定性。采用“固定 Header + 独立滚动 Content + 常驻 Footer”的经典模态架构能显著提升交互效率。

### 目标
1. 重构 `src/components/common/ModalShell.tsx`，支持 `footer` 插槽，并将弹窗卡片设定为 `max-h-[88vh] flex flex-col`，内容区域独立滚动。
2. 更新 `src/components/modals/GlobalSettingsModal.tsx` 与 `src/components/modals/SettingsModal.tsx`，将“完成”按钮移入 `footer` 插槽。

### 基本原理
通过在弹窗卡片上使用 `flex flex-col` 与 `max-h-[88vh]`，将 Header 与 Footer 的 `flex-shrink` 设为 `0`，中间容器使用 `flex-1 overflow-y-auto`。这不仅将滚动行为限定在弹窗内部，还保证了底部主操作按钮在任何屏幕尺寸下都 100% 可见可用。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/modal-shell-layout #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 重构 `ModalShell.tsx` 支持常驻 Footer 与内嵌独立滚动

~~~~~act
patch_file
src/components/common/ModalShell.tsx
~~~~~
~~~~~typescript.old
interface ModalShellProps {
  title: string;
  subTitle?: string;
  icon?: (props: { className?: string }) => ComponentChildren;
  maxWidth?: string;
  onClose: () => void;
  headerAction?: ComponentChildren;
  children: ComponentChildren;
}

export function ModalShell({
  title,
  subTitle,
  icon: Icon,
  maxWidth = 'max-w-md',
  onClose,
  headerAction,
  children,
}: ModalShellProps) {
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 dark:bg-background/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')
        ) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full ${maxWidth} bg-card text-foreground rounded-3xl shadow-2xl border border-border/60 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="p-2 bg-accent text-primary rounded-xl">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-foreground">{title}</h2>
              {subTitle && <p className="text-xs text-muted-foreground">{subTitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            <Button
              variant="ghost"
              size="iconSm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
~~~~~
~~~~~typescript.new
interface ModalShellProps {
  title: string;
  subTitle?: string;
  icon?: (props: { className?: string }) => ComponentChildren;
  maxWidth?: string;
  onClose: () => void;
  headerAction?: ComponentChildren;
  footer?: ComponentChildren;
  children: ComponentChildren;
}

export function ModalShell({
  title,
  subTitle,
  icon: Icon,
  maxWidth = 'max-w-md',
  onClose,
  headerAction,
  footer,
  children,
}: ModalShellProps) {
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 dark:bg-background/80 backdrop-blur-sm p-4 overflow-hidden select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')
        ) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full ${maxWidth} max-h-[88vh] bg-card text-foreground rounded-3xl shadow-2xl border border-border/60 p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 my-auto`}
      >
        {/* 常驻 Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3.5 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="p-2 bg-accent text-primary rounded-xl">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-foreground">{title}</h2>
              {subTitle && <p className="text-xs text-muted-foreground">{subTitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            <Button
              variant="ghost"
              size="iconSm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 独立内嵌滚动 Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0 scrollbar-thin">
          {children}
        </div>

        {/* 常驻 Footer (如有) */}
        {footer && (
          <div className="pt-2 border-t border-border/60 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~

#### Acts 2: 调整 `GlobalSettingsModal.tsx` 使用常驻 Footer

~~~~~act
patch_file
src/components/modals/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript.old
  return (
    <ModalShell title={t('settings.title')} icon={Sliders} onClose={onClose} maxWidth="max-w-md">
      <GeneralPreferencesSection
        settings={settings}
        onUpdateGlobal={handleUpdateGlobal}
        showToast={showToast}
      />

      <DataGovernanceSection
        onDataChanged={onDataChanged}
        onCloseModal={onClose}
        showToast={showToast}
      />

      <div className="pt-2">
        <Button variant="default" onClick={onClose} className="w-full py-2.5 h-auto">
          {t('common.complete')}
        </Button>
      </div>
    </ModalShell>
  );
~~~~~
~~~~~typescript.new
  return (
    <ModalShell
      title={t('settings.title')}
      icon={Sliders}
      onClose={onClose}
      maxWidth="max-w-md"
      footer={
        <Button variant="default" onClick={onClose} className="w-full py-2.5 h-auto rounded-2xl">
          {t('common.complete')}
        </Button>
      }
    >
      <GeneralPreferencesSection
        settings={settings}
        onUpdateGlobal={handleUpdateGlobal}
        showToast={showToast}
      />

      <DataGovernanceSection
        onDataChanged={onDataChanged}
        onCloseModal={onClose}
        showToast={showToast}
      />
    </ModalShell>
  );
~~~~~

#### Acts 3: 调整 `SettingsModal.tsx` 使用常驻 Footer

~~~~~act
patch_file
src/components/modals/SettingsModal.tsx
~~~~~
~~~~~typescript.old
  return (
    <ModalShell
      title={t('settingsModal.title', { title: cardTitle })}
      icon={Sliders}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        {/* 通用配置：自动翻页开关 */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-foreground">
              {t('settingsModal.autoNext')}
            </div>
            <div className="text-xs text-muted-foreground">{t('settingsModal.autoNextDesc')}</div>
          </div>
          <Switch
            checked={cardConfig.autoNext}
            onCheckedChange={(val) => updateCardConfig({ autoNext: val })}
            aria-label={t('settingsModal.autoNext')}
          />
        </div>

        {/* 通用配置：自动翻页延迟 */}
        {cardConfig.autoNext && (
          <div className="space-y-2 bg-muted/60 p-3.5 rounded-2xl border border-border/60">
            <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
              <span>{t('settingsModal.delay')}</span>
              <span className="font-mono text-primary font-bold">
                {cardConfig.autoNextDelay} ms
              </span>
            </div>
            <Input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={cardConfig.autoNextDelay}
              onInput={(e) => {
                const val = Number.parseInt((e.target as HTMLInputElement).value, 10);
                updateCardConfig({ autoNextDelay: val });
              }}
              className="w-full accent-indigo-600 cursor-pointer p-0 h-auto bg-transparent border-none shadow-none"
            />
          </div>
        )}

        {/* 通用配置：自适应算子模式 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">
            {t('settingsModal.adaptiveMode')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={cardConfig.adaptiveMode === 'block' ? 'default' : 'outline'}
              onClick={() => updateCardConfig({ adaptiveMode: 'block' })}
              className="gap-1.5 h-auto py-2.5"
            >
              <Target className="w-3.5 h-3.5 text-inherit" />
              {t('settingsModal.modeBlock')}
            </Button>
            <Button
              variant={cardConfig.adaptiveMode === 'staircase' ? 'default' : 'outline'}
              onClick={() => updateCardConfig({ adaptiveMode: 'staircase' })}
              className="gap-1.5 h-auto py-2.5"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              {t('settingsModal.modeStaircase')}
            </Button>
          </div>
        </div>

        {/* 轮次评估配置 */}
        {cardConfig.adaptiveMode === 'block' && (
          <div className="space-y-3 bg-accent p-3.5 rounded-2xl border border-border/60">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                <span>{t('settingsModal.targetAcc')}</span>
                <span className="font-bold text-primary font-mono">
                  {Math.round(cardConfig.targetAccuracy * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.7, 0.8, 0.85, 0.9].map((acc) => (
                  <Button
                    key={acc}
                    variant={cardConfig.targetAccuracy === acc ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateCardConfig({ targetAccuracy: acc })}
                    className="h-auto py-1.5"
                  >
                    {Math.round(acc * 100)}%
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                <span>{t('settingsModal.blockSize')}</span>
                <span className="font-bold text-primary font-mono">
                  {t('settingsModal.trialsPerBlock', { size: cardConfig.blockSize })}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[10, 15, 20].map((size) => (
                  <Button
                    key={size}
                    variant={cardConfig.blockSize === size ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateCardConfig({ blockSize: size })}
                    className="h-auto py-1.5"
                  >
                    {t('settingsModal.trialsUnit', { size })}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 难度阶梯精细度 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">
            {t('settingsModal.stepGranularity')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={cardConfig.stepGranularity === 'standard' ? 'default' : 'outline'}
              onClick={() => updateCardConfig({ stepGranularity: 'standard' })}
              className="h-auto py-2.5"
            >
              {t('settingsModal.stepStandard')}
            </Button>
            <Button
              variant={cardConfig.stepGranularity === 'fine' ? 'default' : 'outline'}
              onClick={() => updateCardConfig({ stepGranularity: 'fine' })}
              className="h-auto py-2.5"
            >
              {t('settingsModal.stepFine')}
            </Button>
          </div>
        </div>

        {/* 渲染卡片专属设置 Schemas */}
        {card.settingSchemas && card.settingSchemas.length > 0 && (
          <DynamicDomainSettings
            schemas={card.settingSchemas}
            values={cardConfig}
            onChange={(patch) => updateCardConfig(patch)}
          />
        )}
      </div>

      <div className="pt-2">
        <Button variant="default" onClick={onClose} className="w-full py-2.5 h-auto">
          {t('common.complete')}
        </Button>
      </div>
    </ModalShell>
  );
~~~~~
~~~~~typescript.new
  return (
    <ModalShell
      title={t('settingsModal.title', { title: cardTitle })}
      icon={Sliders}
      onClose={onClose}
      maxWidth="max-w-md"
      footer={
        <Button variant="default" onClick={onClose} className="w-full py-2.5 h-auto rounded-2xl">
          {t('common.complete')}
        </Button>
      }
    >
      <div className="space-y-5">
        {/* 通用配置：自动翻页开关 */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-foreground">
              {t('settingsModal.autoNext')}
            </div>
            <div className="text-xs text-muted-foreground">{t('settingsModal.autoNextDesc')}</div>
          </div>
          <Switch
            checked={cardConfig.autoNext}
            onCheckedChange={(val) => updateCardConfig({ autoNext: val })}
            aria-label={t('settingsModal.autoNext')}
          />
        </div>

        {/* 通用配置：自动翻页延迟 */}
        {cardConfig.autoNext && (
          <div className="space-y-2 bg-muted/60 p-3.5 rounded-2xl border border-border/60">
            <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
              <span>{t('settingsModal.delay')}</span>
              <span className="font-mono text-primary font-bold">
                {cardConfig.autoNextDelay} ms
              </span>
            </div>
            <Input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={cardConfig.autoNextDelay}
              onInput={(e) => {
                const val = Number.parseInt((e.target as HTMLInputElement).value, 10);
                updateCardConfig({ autoNextDelay: val });
              }}
              className="w-full accent-indigo-600 cursor-pointer p-0 h-auto bg-transparent border-none shadow-none"
            />
          </div>
        )}

        {/* 通用配置：自适应算子模式 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">
            {t('settingsModal.adaptiveMode')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={cardConfig.adaptiveMode === 'block' ? 'default' : 'outline'}
              onClick={() => updateCardConfig({ adaptiveMode: 'block' })}
              className="gap-1.5 h-auto py-2.5"
            >
              <Target className="w-3.5 h-3.5 text-inherit" />
              {t('settingsModal.modeBlock')}
            </Button>
            <Button
              variant={cardConfig.adaptiveMode === 'staircase' ? 'default' : 'outline'}
              onClick={() => updateCardConfig({ adaptiveMode: 'staircase' })}
              className="gap-1.5 h-auto py-2.5"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              {t('settingsModal.modeStaircase')}
            </Button>
          </div>
        </div>

        {/* 轮次评估配置 */}
        {cardConfig.adaptiveMode === 'block' && (
          <div className="space-y-3 bg-accent p-3.5 rounded-2xl border border-border/60">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                <span>{t('settingsModal.targetAcc')}</span>
                <span className="font-bold text-primary font-mono">
                  {Math.round(cardConfig.targetAccuracy * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.7, 0.8, 0.85, 0.9].map((acc) => (
                  <Button
                    key={acc}
                    variant={cardConfig.targetAccuracy === acc ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateCardConfig({ targetAccuracy: acc })}
                    className="h-auto py-1.5"
                  >
                    {Math.round(acc * 100)}%
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                <span>{t('settingsModal.blockSize')}</span>
                <span className="font-bold text-primary font-mono">
                  {t('settingsModal.trialsPerBlock', { size: cardConfig.blockSize })}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[10, 15, 20].map((size) => (
                  <Button
                    key={size}
                    variant={cardConfig.blockSize === size ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateCardConfig({ blockSize: size })}
                    className="h-auto py-1.5"
                  >
                    {t('settingsModal.trialsUnit', { size })}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 难度阶梯精细度 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">
            {t('settingsModal.stepGranularity')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={cardConfig.stepGranularity === 'standard' ? 'default' : 'outline'}
              onClick={() => updateCardConfig({ stepGranularity: 'standard' })}
              className="h-auto py-2.5"
            >
              {t('settingsModal.stepStandard')}
            </Button>
            <Button
              variant={cardConfig.stepGranularity === 'fine' ? 'default' : 'outline'}
              onClick={() => updateCardConfig({ stepGranularity: 'fine' })}
              className="h-auto py-2.5"
            >
              {t('settingsModal.stepFine')}
            </Button>
          </div>
        </div>

        {/* 渲染卡片专属设置 Schemas */}
        {card.settingSchemas && card.settingSchemas.length > 0 && (
          <DynamicDomainSettings
            schemas={card.settingSchemas}
            values={cardConfig}
            onChange={(patch) => updateCardConfig(patch)}
          />
        )}
      </div>
    </ModalShell>
  );
~~~~~

### 下一步建议

1. **界面检查**：打开“全局设置”和任一训练模块的“偏好设置”，观察弹窗最大高度是否被自适应约束，中间设置项滚动时顶部标题与底部“完成”按钮是否常驻可见。
2. **提交变更**：如果所有调整符合预期，请告知我，我将为你生成 Git 提交计划。
