import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-preact';
import { useTranslation } from '../../../core/i18n';
import type { MessageStageItem } from '../../../types/plan';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { MarkdownContent } from './MarkdownContent';

interface StageMessageViewProps {
  stage: MessageStageItem;
  currentStage: number;
  totalStages: number;
  onAdvance: () => void;
  onExit: () => void;
}

/** 训练流中的文字提示页（新手引导 / 领域过渡 / 结语）。 */
export function StageMessageView({
  stage,
  currentStage,
  totalStages,
  onAdvance,
  onExit,
}: StageMessageViewProps) {
  const { t } = useTranslation();
  const actionLabel = stage.actionLabel?.trim() || t('plan.messageContinueAction');

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col min-h-[calc(100dvh-2.5rem)] sm:min-h-[calc(100vh-3.5rem)] px-2 py-2 sm:px-4 sm:py-3 select-none">
      <header className="w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl bg-card/60 dark:bg-card/40 backdrop-blur-md border border-border/50 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="iconSm"
            onClick={onExit}
            className="h-7 w-7 rounded-xl text-muted-foreground hover:text-foreground flex-shrink-0"
            title={t('plan.exitPlan')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Badge
            variant="accent"
            size="sm"
            className="font-mono text-xs px-2 py-0.5 rounded-lg flex-shrink-0"
          >
            {currentStage}/{totalStages}
          </Badge>
          <span className="text-xs font-bold text-foreground truncate">
            {t('plan.stageTypeMessage')}
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-6">
        <article className="w-full bg-card border border-border rounded-3xl shadow-sm p-6 sm:p-9 space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-accent text-primary rounded-2xl flex-shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {stage.title || t('plan.messageUntitled')}
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                {t('plan.messageStageHint')}
              </p>
            </div>
          </div>

          <div className="border-t border-border/60 pt-4">
            <MarkdownContent content={stage.content} />
          </div>

          <div className="flex justify-end pt-1">
            <Button variant="default" onClick={onAdvance} className="gap-2 rounded-2xl px-5">
              <span>{actionLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </article>
      </main>
    </div>
  );
}
