## [WIP] fix(color_hue): 修复 color_hue 卡片遗漏内联 TargetingSection 导致的引用报错

### 错误分析

在上一轮清理 `TargetingSection.tsx` 抽象组件时，我们虽然更新了 `star_*` 系列卡片，但遗漏了 `color_hue` 卡片 (`src/cards/color_hue/index.tsx`)。该文件仍然尝试从已删除的路径引入 `TargetingSection`，导致编译或运行时报错。

### 用户需求

为 `color_hue` 卡片内联自主的色相扇区靶向强化设置组件，并使用 `useCardTranslation('color_hue')` 正确渲染 12 色相环文案。

### 评论

感谢提醒！由于 `color_hue` 拥有独占的 3 列布局色相扇区（`COLOR_SECTOR_KEYS`），将其内联化后，不仅消除了对已删除组件的死链依赖，也完美统一了所有卡片的自治架构。

### 目标

修改 `src/cards/color_hue/index.tsx`，移除 `TargetingSection` 引用并内联色相靶向选择 UI。

### 基本原理

内联组件直接消费 `COLOR_SECTOR_KEYS` 和 `useCardTranslation('color_hue')`，确保 `sectors.red` 等色相键能够准确命中 `color_hue` 的私有 locales 词典。

### 标签

#intent/fix #flow/ready #priority/high #comp/ui #concept/config #scope/core #scope/dx #ai/refine #task/domain/core #task/object/color-hue-settings #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 为 color_hue 内联自治靶向设置组件

~~~~~act
patch_file
src/cards/color_hue/index.tsx
~~~~~
~~~~~typescript.old
import { RotateCw } from 'lucide-preact';
import { SettingToggleItem } from '../../components/settings/common/SettingToggleItem';
import { TargetingSection } from '../../components/settings/common/TargetingSection';
import type { CardManifest } from '../../core/cardContract';
~~~~~
~~~~~typescript.new
import { Crosshair, RotateCw } from 'lucide-preact';
import { SettingToggleItem } from '../../components/settings/common/SettingToggleItem';
import { Button } from '../../components/ui/button';
import type { CardManifest } from '../../core/cardContract';
~~~~~

~~~~~act
patch_file
src/cards/color_hue/index.tsx
~~~~~
~~~~~tsx.old
  renderSettings: ({ settings, updateSettings }) => {
    const { t } = useCardTranslation('color_hue');
    return (
      <div className="space-y-4">
        <SettingToggleItem
          title={t('settings.showToleranceBandTitle')}
          description={t('settings.showToleranceBandDesc')}
          checked={(settings.showToleranceBand as boolean) ?? true}
          onChange={(val) => updateSettings({ showToleranceBand: val })}
        />
        <TargetingSection
          title={t('settings.targetingTitle')}
          subTitle={t('settings.targetingSubTitle')}
          mode={settings.targetingMode ?? 'off'}
          onModeChange={(m) => updateSettings({ targetingMode: m })}
          sectors={COLOR_SECTOR_KEYS}
          selectedSectors={settings.manualTargetSectors ?? []}
          onToggleSector={(idx) => {
            const current = settings.manualTargetSectors ?? [];
            const next = current.includes(idx)
              ? current.filter((s) => s !== idx)
              : [...current, idx];
            updateSettings({ manualTargetSectors: next });
          }}
          gridCols="grid-cols-3"
        />
      </div>
    );
  },
~~~~~
~~~~~tsx.new
  renderSettings: ({ settings, updateSettings }) => {
    const { t } = useCardTranslation('color_hue');
    return (
      <div className="space-y-4">
        <SettingToggleItem
          title={t('settings.showToleranceBandTitle')}
          description={t('settings.showToleranceBandDesc')}
          checked={(settings.showToleranceBand as boolean) ?? true}
          onChange={(val) => updateSettings({ showToleranceBand: val })}
        />
        <div className="space-y-2 pt-2 border-t border-border/65">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Crosshair className="w-4 h-4 text-primary" />
            {t('settings.targetingTitle')}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'off', label: t('settingsModal.targetingOff') },
              { id: 'manual', label: t('settingsModal.targetingManual') },
            ].map((m) => (
              <Button
                key={m.id}
                variant={(settings.targetingMode ?? 'off') === m.id ? 'default' : 'outline'}
                onClick={() => updateSettings({ targetingMode: m.id as 'off' | 'manual' })}
                className="py-2 h-auto"
              >
                {m.label}
              </Button>
            ))}
          </div>

          {settings.targetingMode === 'manual' && (
            <div className="bg-muted/60 p-3 rounded-2xl border border-border/60 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">{t('settings.targetingSubTitle')}</div>
              <div className="grid grid-cols-3 gap-1.5">
                {COLOR_SECTOR_KEYS.map((name, idx) => {
                  const selected = (settings.manualTargetSectors ?? []).includes(idx);
                  const label = t(name);
                  return (
                    <Button
                      key={name}
                      variant={selected ? 'accent' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const current = settings.manualTargetSectors ?? [];
                        const next = current.includes(idx)
                          ? current.filter((s) => s !== idx)
                          : [...current, idx];
                        updateSettings({ manualTargetSectors: next });
                      }}
                      className="py-1.5 px-1 text-xs h-auto"
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
~~~~~

### 下一步建议

现在 `color_hue` 也已经完成了独立内联自治。所有卡片的靶向设置和 12 色相扇区文案均已归位并能够通过各自的 `useCardTranslation` 准确转译。你可以刷新页面验证 `color_hue` 模态窗的弹出与翻译情况。
