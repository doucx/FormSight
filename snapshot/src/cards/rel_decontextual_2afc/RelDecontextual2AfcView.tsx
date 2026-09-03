import { Eye } from 'lucide-preact';
import { Standard2AfcView } from '../../components/common/Standard2AfcView';
import { hsvToHex } from '../../core/color/colorUtils';
import { useCardTranslation } from '../../core/i18n';
import { PALETTE } from '../../utils/theme';
import type { HitResult, QuestionData } from './types';

export interface RelDecontextual2AfcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer?: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function RelDecontextual2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: RelDecontextual2AfcViewProps) {
  const { t } = useCardTranslation('rel_decontextual_2afc');
  const isAHit = question.largerPhysicalSide === 'A';
  const isBHit = question.largerPhysicalSide === 'B';

  const hexBgA = hsvToHex(...question.bgLeft);
  const hexBgB = hsvToHex(...question.bgRight);
  const hexCenterA = hsvToHex(...question.centerColorA);
  const hexCenterB = hsvToHex(...question.centerColorB);

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('views.hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: t('common.areaA'),
        isCorrect: isAHit,
        badge: isAHit
          ? t('views.physicallyBrighter', {
              v: question.centerColorA[2],
            })
          : t('views.physicallyDarker', {
              v: question.centerColorA[2],
            }),
        content: (
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
            style={{ backgroundColor: showAnswer ? PALETTE.slate[500] : hexBgA }}
          >
            <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterA }} />
          </div>
        ),
      }}
      optionB={{
        title: t('common.areaB'),
        isCorrect: isBHit,
        badge: isBHit
          ? t('views.physicallyBrighter', {
              v: question.centerColorB[2],
            })
          : t('views.physicallyDarker', {
              v: question.centerColorB[2],
            }),
        content: (
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
            style={{ backgroundColor: showAnswer ? PALETTE.slate[500] : hexBgB }}
          >
            <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterB }} />
          </div>
        ),
      }}
    />
  );
}
