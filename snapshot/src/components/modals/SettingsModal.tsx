import { Flame, Sliders, Target } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { getCardTitle, useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
} from '../../storage/settings';
import { updateCardSettings } from '../../stores/settingsStore';
import type { CardDefinition } from '../../types/card';
import { ModalShell } from '../common/ModalShell';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';

interface SettingsModalProps {
  card: CardDefinition;
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => void;
}

export function SettingsModal({ card, settings, onClose, onSave }: SettingsModalProps) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<UserSettings>({ ...settings });
  const cardConfig = getCardSettings(current, card.id);

  const cardTitle = getCardTitle(card, t);

  const updateCardConfig = async (patch: Partial<BaseModuleSettings>) => {
    const next = await updateCardSettings(card.id, patch);
    setCurrent(next);
    onSave(next);
  };

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

        {/* 渲染卡片专属设置组件 */}
        {(() => {
          const manifest = registry.getCardManifest(card.id);
          if (manifest?.renderSettings) {
            return (
              <div className="pt-2 border-t border-border/60">
                {manifest.renderSettings({
                  settings: cardConfig as any,
                  updateSettings: (patch) => updateCardConfig(patch as any),
                })}
              </div>
            );
          }
          return null;
        })()}
      </div>
    </ModalShell>
  );
}
