import type { HitResult, Point, QuestionData } from '../../types';
import type { StarSettings } from '../../utils/settings';
import { StarCanvas } from '../../components/StarCanvas';
import { type QuestionGenerateOptions, checkHit, generateQuestion } from '../../utils/geometry';
import type { TrainingPlugin } from '../trainingPlugins';

export const starPlugin: TrainingPlugin<
  QuestionData,
  HitResult,
  { clickPoint: Point; hitResult: HitResult },
  StarSettings
> = {
  domain: 'star',
  title: '寻星练习',
  getModeBadge: (mode) => mode,
  isTargeting: (_mode, settings) => settings.targetingMode === 'manual',
  generateQuestion: (mode, level, settings) => {
    const opts: QuestionGenerateOptions = {
      targetingMode: settings.targetingMode,
      targetSectors: settings.manualTargetSectors,
      gridSize: settings.gridSize,
    };
    return generateQuestion(mode as any, level, opts);
  },
  evaluateAnswer: (userVal) => userVal.hitResult,
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult) => ({
    anchorA: [q.anchorA.x, q.anchorA.y],
    anchorC: q.anchorC ? [q.anchorC.x, q.anchorC.y] : undefined,
    targetB: [q.targetB.x, q.targetB.y],
    userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
    angleDegree: q.angleDegree,
    distanceRatio: q.distanceRatio,
    errorPixelDistance: hitResult.errorDistance,
  }),
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
    <StarCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={
        userAnswer ? { clickPoint: userAnswer.nearestGridPoint, hitResult: userAnswer } : null
      }
      onAnswer={(clickPoint) => {
        const hitRes = checkHit(clickPoint, question.targetB, question.distractorPoints);
        if (hitRes.isWithinRange) {
          onAnswer({ clickPoint, hitResult: hitRes });
        }
      }}
      disabled={disabled}
    />
  ),
};