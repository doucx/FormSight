import { Eye } from 'lucide-preact';
import { hsvToHex } from '../../utils/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../utils/relativeColor';
import { AnswerDiagnosticBar } from '../common/AnswerDiagnosticBar';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';

interface Decontextual2AfcViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  selectedChoice: 'A' | 'B' | null;
  onSelectChoice: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function Decontextual2AfcView({
  question,
  showAnswer,
  userAnswer,
  selectedChoice,
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
    <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Eye className="w-3.5 h-3.5 text-indigo-600" />
          穿透背景视错觉，判别哪一侧中心色块「客观物理明度更高」
        </div>
      )}

      <Choice2AfcContainer
        optionA={{
          key: 'A',
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
          key: 'B',
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
        selectedChoice={selectedChoice}
        showAnswer={showAnswer}
        disabled={disabled}
        onSelect={onSelectChoice}
      />

      {showAnswer && (
        <AnswerDiagnosticBar
          isHit={Boolean(userAnswer?.isHit)}
          successTitle="成功穿透背景视错觉！"
          failTitle="受背景诱导产生了认知偏差"
          subText={`(已统一切换至中性灰背景对比，物理明度差 ΔV = ${question.physicalValueDiff}%)`}
        />
      )}
    </div>
  );
}