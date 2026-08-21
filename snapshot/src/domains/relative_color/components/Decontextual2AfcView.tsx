import { Eye } from 'lucide-preact';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { hsvToHex } from '../../../core/color/colorUtils';
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
  const isAHit = question.largerPhysicalSide === 'A';
  const isBHit = question.largerPhysicalSide === 'B';

  const hexBgA = hsvToHex(...(question.bgLeft ?? [0, 0, 90]));
  const hexBgB = hsvToHex(...(question.bgRight ?? [0, 0, 10]));
  const hexCenterA = hsvToHex(...(question.centerColorA ?? [0, 0, 50]));
  const hexCenterB = hsvToHex(...(question.centerColorB ?? [0, 0, 50]));

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText="穿透背景视错觉，判别哪一侧中心色块「客观物理明度更高」"
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onSelectChoice}
      optionA={{
        title: '区域 A',
        isCorrect: isAHit,
        badge: isAHit
          ? `物理明度更高 (V: ${question.centerColorA?.[2]}%)`
          : `物理更暗 (V: ${question.centerColorA?.[2]}%)`,
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
        title: '区域 B',
        isCorrect: isBHit,
        badge: isBHit
          ? `物理明度更高 (V: ${question.centerColorB?.[2]}%)`
          : `物理更暗 (V: ${question.centerColorB?.[2]}%)`,
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