## [WIP] refactor: 彻底废弃 TargetingSection 抽象黑洞，实现卡片专属设置的完全自治与精准多语言路由

### 错误分析

在之前的实现中，`TargetingSection.tsx` 作为公共组件调用了全局的 `useTranslation()`。由于 `star_*` 及 `color_hue` 卡片的扇区文案（如 `sectors.ne`、`sectors.red`）以及靶向标题均定义在各自卡片私有的 `locales` 命名空间中，全局 `useTranslation` 无法解析这些局部 Key，导致最终渲染出来的文本直接暴露了原始字面量（如 `sectors.ne`）。

### 用户需求

按照“配置即组件 (Configuration by Component)”与卡片自治的架构哲学，**彻底删除 `TargetingSection.tsx` 抽象黑洞**，将靶向强化与网格选择逻辑直接在各自主权卡片内部实现，并使用各自的 `useCardTranslation` 挂载私有命名空间，确保所有私有文案与全局文案被精准转译。

### 评论

这是彻底消灭“共享组件过度封装”的典范操作。卡片私有的配置 UI 应当由卡片自己完全掌控，不仅代码更加直观易读，也彻底根除了多语言命名空间路径错乱的顽疾。

### 目标

1. 删除 `src/components/settings/common/TargetingSection.tsx`。
2. 在 `star_single`、`star_double_h`、`star_double_r` 和 `color_hue` 四张卡片的 `index.tsx` 中内联靶向设置交互组件，并使用卡片自有的 `useCardTranslation`。

### 基本原理

通过将靶向选择组件内联化，组件可以直接访问当前卡片上下文的 `t()` 函数。`useCardTranslation` 具备“私有词典优先、全局词典兜底”的双向查找能力，从而保证 `sectors.*` 能够被正确解析，而 `settingsModal.*` 也能正确回退到全局翻译。

### 标签

#intent/refine #flow/ready #priority/high #comp/ui #concept/config #scope/core #scope/dx #ai/refine #task/domain/core #task/object/targeting-section #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 删除 TargetingSection 抽象黑洞组件

~~~~~act
delete_file
src/components/settings/common/TargetingSection.tsx
~~~~~

#### Acts 2: 在 star_single 中内联自治靶向组件

~~~~~act
patch_file
src/cards/star_single/index.tsx
~~~~~
~~~~~typescript.old
import { Target } from 'lucide-preact';
import { TargetingSection } from '../../components/settings/common/TargetingSection';
import { Button } from '../../components/ui/button';
import type { CardManifest } from '../../core/cardContract';
import { useCardTranslation } from '../../core/i18n';
~~~~~
~~~~~typescript.new
import { Crosshair, Target } from 'lucide-preact';
import { Button } from '../../components/ui/button';
import type { CardManifest } from '../../core/cardContract';
import { useCardTranslation } from '../../core/i18n';
~~~~~

~~~~~act
patch_file
src/cards/star_single/index.tsx
~~~~~
~~~~~tsx.old
        <TargetingSection
          title={t('settings.targetingTitle')}
          subTitle={t('settings.targetingSubTitle')}
          mode={settings.targetingMode ?? 'off'}
          onModeChange={(m) => updateSettings({ targetingMode: m })}
          sectors={SECTOR_KEYS}
          selectedSectors={settings.manualTargetSectors ?? []}
          onToggleSector={(idx) => {
            const current = settings.manualTargetSectors ?? [];
            const next = current.includes(idx)
              ? current.filter((s) => s !== idx)
              : [...current, idx];
            updateSettings({ manualTargetSectors: next });
          }}
          gridCols="grid-cols-4"
        />
      </div>
    );
  },
~~~~~
~~~~~tsx.new
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
              <div className="grid grid-cols-4 gap-1.5">
                {SECTOR_KEYS.map((name, idx) => {
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

#### Acts 3: 在 star_double_h 中内联自治靶向组件

~~~~~act
patch_file
src/cards/star_double_h/index.tsx
~~~~~
~~~~~typescript.old
import { Crosshair } from 'lucide-preact';
import { TargetingSection } from '../../components/settings/common/TargetingSection';
import { Button } from '../../components/ui/button';
import type { CardManifest } from '../../core/cardContract';
import { useCardTranslation } from '../../core/i18n';
~~~~~
~~~~~typescript.new
import { Crosshair } from 'lucide-preact';
import { Button } from '../../components/ui/button';
import type { CardManifest } from '../../core/cardContract';
import { useCardTranslation } from '../../core/i18n';
~~~~~

~~~~~act
patch_file
src/cards/star_double_h/index.tsx
~~~~~
~~~~~tsx.old
        <TargetingSection
          title={t('settings.targetingTitle')}
          subTitle={t('settings.targetingSubTitle')}
          mode={settings.targetingMode ?? 'off'}
          onModeChange={(m) => updateSettings({ targetingMode: m })}
          sectors={SECTOR_KEYS}
          selectedSectors={settings.manualTargetSectors ?? []}
          onToggleSector={(idx) => {
            const current = settings.manualTargetSectors ?? [];
            const next = current.includes(idx)
              ? current.filter((s) => s !== idx)
              : [...current, idx];
            updateSettings({ manualTargetSectors: next });
          }}
          gridCols="grid-cols-4"
        />
      </div>
    );
  },
~~~~~
~~~~~tsx.new
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
              <div className="grid grid-cols-4 gap-1.5">
                {SECTOR_KEYS.map((name, idx) => {
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

#### Acts 4: 在 star_double_r 中内联自治靶向组件

~~~~~act
patch_file
src/cards/star_double_r/index.tsx
~~~~~
~~~~~typescript.old
import { RotateCw } from 'lucide-preact';
import { TargetingSection } from '../../components/settings/common/TargetingSection';
import { Button } from '../../components/ui/button';
import type { CardManifest } from '../../core/cardContract';
import { useCardTranslation } from '../../core/i18n';
~~~~~
~~~~~typescript.new
import { Crosshair, RotateCw } from 'lucide-preact';
import { Button } from '../../components/ui/button';
import type { CardManifest } from '../../core/cardContract';
import { useCardTranslation } from '../../core/i18n';
~~~~~

~~~~~act
patch_file
src/cards/star_double_r/index.tsx
~~~~~
~~~~~tsx.old
        <TargetingSection
          title={t('settings.targetingTitle')}
          subTitle={t('settings.targetingSubTitle')}
          mode={settings.targetingMode ?? 'off'}
          onModeChange={(m) => updateSettings({ targetingMode: m })}
          sectors={SECTOR_KEYS}
          selectedSectors={settings.manualTargetSectors ?? []}
          onToggleSector={(idx) => {
            const current = settings.manualTargetSectors ?? [];
            const next = current.includes(idx)
              ? current.filter((s) => s !== idx)
              : [...current, idx];
            updateSettings({ manualTargetSectors: next });
          }}
          gridCols="grid-cols-4"
        />
      </div>
    );
  },
~~~~~
~~~~~tsx.new
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
              <div className="grid grid-cols-4 gap-1.5">
                {SECTOR_KEYS.map((name, idx) => {
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

- 彻底删除了共享抽象 `TargetingSection.tsx` 之后，各个卡片（`star_single`、`star_double_h`、`star_double_r`、`color_hue`）现在各自拥有对靶向选区和多语言的完全独立掌控权。
- 扇区文案现在会通过 `useCardTranslation` 自动正确解析为本地语言（如 `东北`、`NE`、红、橙等）。建议打开浏览器重新查看设置弹窗，确认所有扇区标签转译正常。
