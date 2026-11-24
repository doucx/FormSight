import { BookOpen, Coffee } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import { MAX_REST_SECONDS, MIN_REST_SECONDS } from '../../../core/plan/stages';
import type { MessageStageItem, RestStageItem } from '../../../types/plan';
import { ModalShell } from '../../common/ModalShell';
import { Button } from '../../ui/button';

export type StageEditPatch =
  | {
      kind: 'message';
      title: string;
      content: string;
      actionLabel?: string;
    }
  | {
      kind: 'rest';
      durationSeconds: number;
      allowSkip: boolean;
      tips?: string;
    };

interface StageEditorModalProps {
  item: MessageStageItem | RestStageItem;
  onSave: (patch: StageEditPatch) => void;
  onClose: () => void;
}

export function StageEditorModal({ item, onSave, onClose }: StageEditorModalProps) {
  const { t } = useTranslation();
  const isMessage = item.type === 'message';

  const [title, setTitle] = useState(isMessage ? item.title : '');
  const [content, setContent] = useState(isMessage ? item.content : '');
  const [actionLabel, setActionLabel] = useState(isMessage ? (item.actionLabel ?? '') : '');
  const [durationSeconds, setDurationSeconds] = useState(isMessage ? 60 : item.durationSeconds);
  const [allowSkip, setAllowSkip] = useState(isMessage ? true : item.allowSkip !== false);
  const [tips, setTips] = useState(isMessage ? '' : (item.tips ?? ''));

  const handleSave = () => {
    if (isMessage) {
      onSave({
        kind: 'message',
        title: title.trim(),
        content,
        actionLabel: actionLabel.trim() || undefined,
      });
      return;
    }

    const seconds = Number.isFinite(durationSeconds)
      ? Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, Math.round(durationSeconds)))
      : MIN_REST_SECONDS;
    onSave({
      kind: 'rest',
      durationSeconds: seconds,
      allowSkip,
      tips: tips.trim() || undefined,
    });
  };

  return (
    <ModalShell
      title={isMessage ? t('plan.editMessageTitle') : t('plan.editRestTitle')}
      subTitle={isMessage ? t('plan.editMessageSubtitle') : t('plan.editRestSubtitle')}
      icon={isMessage ? BookOpen : Coffee}
      maxWidth="max-w-xl"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="default" onClick={handleSave}>
            {t('common.save')}
          </Button>
        </div>
      }
    >
      {isMessage ? (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">{t('plan.stageTitleLabel')}</span>
            <input
              value={title}
              onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
              placeholder={t('plan.stageTitlePlaceholder')}
              className="w-full bg-muted/60 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">{t('plan.stageContentLabel')}</span>
            <textarea
              value={content}
              onInput={(e) => setContent((e.target as HTMLTextAreaElement).value)}
              rows={8}
              placeholder={t('plan.stageContentPlaceholder')}
              className="w-full bg-muted/60 border border-border rounded-xl px-3 py-2 text-xs text-foreground leading-relaxed resize-y focus:outline-none focus:border-primary"
            />
          </label>
          <p className="text-xs text-muted-foreground leading-relaxed">{t('plan.markdownHint')}</p>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">
              {t('plan.stageActionLabelLabel')}
            </span>
            <input
              value={actionLabel}
              onInput={(e) => setActionLabel((e.target as HTMLInputElement).value)}
              placeholder={t('plan.stageActionLabelPlaceholder')}
              className="w-full bg-muted/60 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">{t('plan.restDurationLabel')}</span>
            <input
              type="number"
              min={MIN_REST_SECONDS}
              max={MAX_REST_SECONDS}
              step={5}
              value={durationSeconds}
              onInput={(e) => setDurationSeconds(Number((e.target as HTMLInputElement).value))}
              className="w-full bg-muted/60 border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
            />
            <span className="block text-xs text-muted-foreground">
              {t('plan.restDurationHint', {
                min: MIN_REST_SECONDS,
                max: MAX_REST_SECONDS,
              })}
            </span>
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <input
              type="checkbox"
              checked={allowSkip}
              onChange={(e) => setAllowSkip((e.target as HTMLInputElement).checked)}
              className="w-4 h-4 accent-indigo-600"
            />
            <span>{t('plan.restAllowSkipLabel')}</span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">{t('plan.restTipsLabel')}</span>
            <textarea
              value={tips}
              onInput={(e) => setTips((e.target as HTMLTextAreaElement).value)}
              rows={4}
              placeholder={t('plan.restTipsPlaceholder')}
              className="w-full bg-muted/60 border border-border rounded-xl px-3 py-2 text-xs text-foreground leading-relaxed resize-y focus:outline-none focus:border-primary"
            />
          </label>
        </div>
      )}
    </ModalShell>
  );
}
