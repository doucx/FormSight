import { Eye } from 'lucide-preact';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import { useTranslation } from '../../../core/i18n';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';

interface Decontextual2AfcViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer?: RelativeColorHitResult | null;
  selectedChoice?: 'A' | 'B' | null;
  onSelectChoice: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function Decontextual2AfcView({
  question,
  showAnswer,
  onSelectChoice,
  disabled = false,
  showCanvasHints = true,
}: Decontextual2AfcViewProps) {
  const { t } = useTranslation();
  const isAHit = question.largerPhysicalSide === 'A';
  const isBHit = question.largerPhysicalSide === 'B';

  const hexBgA = hsvToHex(...(question.bgLeft ?? [0, 0, 90]));
  const hexBgB = hsvToHex(...(question.bgRight ?? [0, 0, 10]));
  const hexCenterA = hsvToHex(...(question.centerColorA ?? [0, 0, 50]));
  const hexCenterB = hsvToHex(...(question.centerColorB ?? [0, 0, 50]));

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('packs.relative_color.views.decontextualHint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onSelectChoice}
      optionA={{
        title: t('common.areaA'),
        isCorrect: isAHit,
        badge: isAHit
          ? t('packs.relative_color.views.physicallyBrighter', { v: question.centerColorA?.[2] ?? 50 })
          : t('packs.relative_color.views.physicallyDarker', { v: question.centerColorA?.[2] ?? 50 }),
        content: (
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
            style={{ backgroundColor: showAnswer ? '#808080' : hexBgA }}
          >
            <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterA }} />
          </div>
        ),
      }}
      optionB={{
        title: t('common.areaB'),
        isCorrect: isBHit,
        badge: isBHit
          ? t('packs.relative_color.views.physicallyBrighter', { v: question.centerColorB?.[2] ?? 50 })
          : t('packs.relative_color.views.physicallyDarker', { v: question.centerColorB?.[2] ?? 50 }),
        content: (
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
            style={{ backgroundColor: showAnswer ? '#808080' : hexBgB }}
          >
            <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterB }} />
          </div>
        ),
      }}
    />
  );
}
