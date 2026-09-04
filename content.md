现在进入治理路线图的**阶段二：i18n 一致性与数据信任链落地（P1）**。

## [WIP] refactor: 收敛 i18n 边缘调用与落实分析层数据信任链

### 用户需求

解决国际化调用过程中的双翻译实例冗余、模块顶层静态求值导致的词条冻结、Canvas 绘图文案硬编码问题，并落实分析层轻量类型收窄（方案 B），移除无谓的运行时数据清洗防御代码。

### 评论

在第一阶段消除了底层算法判题漏洞之后，阶段二的治理重点是**系统调用纯度与国际化闭环**。
通过移除重叠的 Hook、将静态常量改造为响应式 Getter / 工厂函数、解耦 Canvas 绘图中的自然语言标签，系统将支持完全彻底的动态双语切换；同时，在底层不再丢弃 `details` 的前提下，卡片分析层可以安全信任持久化结构，显著提升代码可读性与执行性能。

### 目标

1. 清理 `persp_prop_division`、`persp_prop_migration` 与 `persp_structure_3d` 中 `cardT` + `commonT` 双翻译实例，统一使用 `useCardTranslation`。
2. 将 `src/storage/planStorage.ts` 中的 `EMPTY_TRAINING_PLAN` 动态化，避免模块加载期静态求值导致的语言冻结。
3. 参数化解耦 `fractal_edge_roughness/utils/charts.ts` 与 `drawColorRing.ts` 中的硬编码中英文。
4. 移除 `color_hue/analytics.tsx` 与 `star_single/analytics.tsx` 中低效的运行时数组解析守卫（如 `parseHsvTuple`），采用卡片私有接口类型断言。

### 基本原理

1. `useCardTranslation` 自身具备全局前缀拦截穿透能力，单实例即可覆盖卡片私有与系统通用词条。
2. 通过 JavaScript Object Getter，`EMPTY_TRAINING_PLAN.name` 在被任何地方访问时都会动态调用当前的 `i18n.t`，实现透明响应。
3. 在 IndexedDB 存储完整性得到保障后，卡片分析层无需进行多层 `typeof` / `Array.isArray` 防御，直接使用私有强类型接口，符合“在边界验证，在内部信任”的现代前端实践。

### 标签

#intent/refine #flow/ready #priority/high
#comp/runtime #comp/interfaces #concept/ui #scope/dx #scope/ux
#ai/instruct
#task/domain/core-architecture
#task/object/i18n-and-analytics-typing
#task/action/refactor
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 清理三处卡片视图中的双翻译 Hook 实例

统一收敛为单个 `const { t } = useCardTranslation(cardId)`，直接复用其自带的全局词典委托能力。

~~~~~act
patch_file
src/cards/persp_prop_division/PerspPropDivisionView.tsx
~~~~~
~~~~~ts.old
import { Badge } from '../../components/ui/badge';
import { useCardTranslation, useTranslation } from '../../core/i18n';
import type { Point } from '../../types';
import type { PerspPropDivisionHitResult, PerspPropDivisionQuestion } from './types';
import { PERSPECTIVE_CANVAS_SIZE, drawProportionCanvas } from './utils/generator';

export interface PerspPropDivisionViewProps {
  question: PerspPropDivisionQuestion;
  showAnswer: boolean;
  userAnswer: PerspPropDivisionHitResult | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PerspPropDivisionView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PerspPropDivisionViewProps) {
  const { t: cardT } = useCardTranslation('persp_prop_division');
  const { t: commonT } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
~~~~~
~~~~~ts.new
import { Badge } from '../../components/ui/badge';
import { useCardTranslation } from '../../core/i18n';
import type { Point } from '../../types';
import type { PerspPropDivisionHitResult, PerspPropDivisionQuestion } from './types';
import { PERSPECTIVE_CANVAS_SIZE, drawProportionCanvas } from './utils/generator';

export interface PerspPropDivisionViewProps {
  question: PerspPropDivisionQuestion;
  showAnswer: boolean;
  userAnswer: PerspPropDivisionHitResult | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PerspPropDivisionView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PerspPropDivisionViewProps) {
  const { t } = useCardTranslation('persp_prop_division');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_division/PerspPropDivisionView.tsx
~~~~~
~~~~~ts.old
  return (
    <QuestionCardShell
      hintText={cardT('hint')}
      hintIcon={Disc}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      footer={
        showAnswer ? (
          <div className="w-full pt-2 border-t border-border/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {cardT('targetRatio')}{' '}
              <span className="font-bold text-foreground font-mono">
                {((question.targetRatio ?? 0) * 100).toFixed(1)}%
              </span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              {cardT('userPosition', {
                pos: ((userAnswer?.ratioProgress ?? 0) * 100).toFixed(1),
                error: ((userAnswer?.errorValue ?? 0) * 100).toFixed(1),
              })}
            </span>
          </div>
        ) : null
      }
    >
      <div className="w-full bg-accent/80 border border-border/60 dark:border-border rounded-2xl py-2 px-4 flex items-center justify-center shadow-xs">
        <span className="text-2xl font-black text-primary font-black dark:text-indigo-200 font-mono tracking-widest">
          {question.targetRatioName ?? '1/2'}
        </span>
      </div>

      <div className="w-full bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex flex-col items-center gap-2">
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleMouseLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label={cardT('title')}
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card touch-none select-none transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair md:cursor-none hover:border-indigo-400 hover:shadow-md'
          }`}
        />
        <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <Badge
              variant="accent"
              size="sm"
              className="w-2.5 h-2.5 p-0 rounded-full border-2 border-indigo-600 bg-indigo-600"
            />
            <span>{commonT('common.startPercent')}</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <Badge
              variant="secondary"
              size="sm"
              className="w-2 h-2 p-0 rounded-full border-none bg-muted-foreground"
            />
            <span>{commonT('common.endPercent')}</span>
          </span>
        </div>
      </div>
    </QuestionCardShell>
  );
~~~~~
~~~~~ts.new
  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Disc}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      footer={
        showAnswer ? (
          <div className="w-full pt-2 border-t border-border/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {t('targetRatio')}{' '}
              <span className="font-bold text-foreground font-mono">
                {((question.targetRatio ?? 0) * 100).toFixed(1)}%
              </span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              {t('userPosition', {
                pos: ((userAnswer?.ratioProgress ?? 0) * 100).toFixed(1),
                error: ((userAnswer?.errorValue ?? 0) * 100).toFixed(1),
              })}
            </span>
          </div>
        ) : null
      }
    >
      <div className="w-full bg-accent/80 border border-border/60 dark:border-border rounded-2xl py-2 px-4 flex items-center justify-center shadow-xs">
        <span className="text-2xl font-black text-primary font-black dark:text-indigo-200 font-mono tracking-widest">
          {question.targetRatioName ?? '1/2'}
        </span>
      </div>

      <div className="w-full bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex flex-col items-center gap-2">
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleMouseLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label={t('title')}
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card touch-none select-none transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair md:cursor-none hover:border-indigo-400 hover:shadow-md'
          }`}
        />
        <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <Badge
              variant="accent"
              size="sm"
              className="w-2.5 h-2.5 p-0 rounded-full border-2 border-indigo-600 bg-indigo-600"
            />
            <span>{t('common.startPercent')}</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <Badge
              variant="secondary"
              size="sm"
              className="w-2 h-2 p-0 rounded-full border-none bg-muted-foreground"
            />
            <span>{t('common.endPercent')}</span>
          </span>
        </div>
      </div>
    </QuestionCardShell>
  );
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_migration/PerspPropMigrationView.tsx
~~~~~
~~~~~ts.old
import { Badge } from '../../components/ui/badge';
import { useCardTranslation, useTranslation } from '../../core/i18n';
import type { Point } from '../../types';
import type { PerspPropMigrationHitResult, PerspPropMigrationQuestion } from './types';
import {
  PERSPECTIVE_CANVAS_SIZE,
  drawHorizontalReferenceCanvas,
  drawProportionCanvas,
} from './utils/generator';

export interface PerspPropMigrationViewProps {
  question: PerspPropMigrationQuestion;
  showAnswer: boolean;
  userAnswer: PerspPropMigrationHitResult | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PerspPropMigrationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PerspPropMigrationViewProps) {
  const { t: cardT } = useCardTranslation('persp_prop_migration');
  const { t: commonT } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
~~~~~
~~~~~ts.new
import { Badge } from '../../components/ui/badge';
import { useCardTranslation } from '../../core/i18n';
import type { Point } from '../../types';
import type { PerspPropMigrationHitResult, PerspPropMigrationQuestion } from './types';
import {
  PERSPECTIVE_CANVAS_SIZE,
  drawHorizontalReferenceCanvas,
  drawProportionCanvas,
} from './utils/generator';

export interface PerspPropMigrationViewProps {
  question: PerspPropMigrationQuestion;
  showAnswer: boolean;
  userAnswer: PerspPropMigrationHitResult | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PerspPropMigrationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PerspPropMigrationViewProps) {
  const { t } = useCardTranslation('persp_prop_migration');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_migration/PerspPropMigrationView.tsx
~~~~~
~~~~~ts.old
  return (
    <QuestionCardShell
      hintText={cardT('hint')}
      hintIcon={ArrowRightLeft}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      footer={
        showAnswer ? (
          <div className="w-full pt-2 border-t border-border/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {cardT('targetRatio')}{' '}
              <span className="font-bold text-foreground font-mono">
                {((question.targetRatio ?? 0) * 100).toFixed(1)}%
              </span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              {cardT('userPosition', {
                pos: ((userAnswer?.ratioProgress ?? 0) * 100).toFixed(1),
                error: ((userAnswer?.errorValue ?? 0) * 100).toFixed(1),
              })}
            </span>
          </div>
        ) : null
      }
    >
      <div className="w-full bg-muted/60 border border-border rounded-2xl p-2.5 flex justify-center shadow-inner">
        <CanvasView
          width={280}
          height={48}
          className="w-full max-w-[280px] h-[48px] bg-card rounded-xl border border-border shadow-sm"
          draw={(canvas) => {
            drawHorizontalReferenceCanvas(canvas, question.targetRatio ?? 0.5, 280, 48);
          }}
          deps={[question.targetRatio]}
        />
      </div>

      <div className="w-full bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex flex-col items-center gap-2">
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleMouseLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label={cardT('title')}
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card touch-none select-none transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair md:cursor-none hover:border-indigo-400 hover:shadow-md'
          }`}
        />
        <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <Badge
              variant="accent"
              size="sm"
              className="w-2.5 h-2.5 p-0 rounded-full border-2 border-indigo-600 bg-indigo-600"
            />
            <span>{commonT('common.startPercent')}</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <Badge
              variant="secondary"
              size="sm"
              className="w-2 h-2 p-0 rounded-full border-none bg-muted-foreground"
            />
            <span>{commonT('common.endPercent')}</span>
          </span>
        </div>
      </div>
    </QuestionCardShell>
  );
~~~~~
~~~~~ts.new
  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={ArrowRightLeft}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      footer={
        showAnswer ? (
          <div className="w-full pt-2 border-t border-border/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {t('targetRatio')}{' '}
              <span className="font-bold text-foreground font-mono">
                {((question.targetRatio ?? 0) * 100).toFixed(1)}%
              </span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              {t('userPosition', {
                pos: ((userAnswer?.ratioProgress ?? 0) * 100).toFixed(1),
                error: ((userAnswer?.errorValue ?? 0) * 100).toFixed(1),
              })}
            </span>
          </div>
        ) : null
      }
    >
      <div className="w-full bg-muted/60 border border-border rounded-2xl p-2.5 flex justify-center shadow-inner">
        <CanvasView
          width={280}
          height={48}
          className="w-full max-w-[280px] h-[48px] bg-card rounded-xl border border-border shadow-sm"
          draw={(canvas) => {
            drawHorizontalReferenceCanvas(canvas, question.targetRatio ?? 0.5, 280, 48);
          }}
          deps={[question.targetRatio]}
        />
      </div>

      <div className="w-full bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex flex-col items-center gap-2">
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleMouseLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label={t('title')}
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card touch-none select-none transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair md:cursor-none hover:border-indigo-400 hover:shadow-md'
          }`}
        />
        <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <Badge
              variant="accent"
              size="sm"
              className="w-2.5 h-2.5 p-0 rounded-full border-2 border-indigo-600 bg-indigo-600"
            />
            <span>{t('common.startPercent')}</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <Badge
              variant="secondary"
              size="sm"
              className="w-2 h-2 p-0 rounded-full border-none bg-muted-foreground"
            />
            <span>{t('common.endPercent')}</span>
          </span>
        </div>
      </div>
    </QuestionCardShell>
  );
~~~~~

~~~~~act
patch_file
src/cards/persp_structure_3d/PerspStructure3DView.tsx
~~~~~
~~~~~ts.old
import { drawDot, getDynamicDotRadius } from '../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { findNearestPointInGrid } from '../../core/geometry/pointGrid';
import { useCardTranslation, useTranslation } from '../../core/i18n';
import { LOUPE_DIAMETER, usePointLoupe } from '../../hooks/usePointLoupe';
import type { Point } from '../../types';
import { CANVAS_THEME } from '../../utils/theme';
import type { PerspStructure3DHitResult, PerspStructure3DQuestion } from './types';
import { PERSPECTIVE_CANVAS_SIZE, draw3DCubeWireframe } from './utils/generator';

export interface PerspStructure3DViewProps {
  question: PerspStructure3DQuestion;
  showAnswer: boolean;
  userAnswer: PerspStructure3DHitResult | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PerspStructure3DView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PerspStructure3DViewProps) {
  const { t: cardT } = useCardTranslation('persp_structure_3d');
  const { t: commonT } = useTranslation();
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
~~~~~
~~~~~ts.new
import { drawDot, getDynamicDotRadius } from '../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { findNearestPointInGrid } from '../../core/geometry/pointGrid';
import { useCardTranslation } from '../../core/i18n';
import { LOUPE_DIAMETER, usePointLoupe } from '../../hooks/usePointLoupe';
import type { Point } from '../../types';
import { CANVAS_THEME } from '../../utils/theme';
import type { PerspStructure3DHitResult, PerspStructure3DQuestion } from './types';
import { PERSPECTIVE_CANVAS_SIZE, draw3DCubeWireframe } from './utils/generator';

export interface PerspStructure3DViewProps {
  question: PerspStructure3DQuestion;
  showAnswer: boolean;
  userAnswer: PerspStructure3DHitResult | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PerspStructure3DView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PerspStructure3DViewProps) {
  const { t } = useCardTranslation('persp_structure_3d');
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
~~~~~

~~~~~act
patch_file
src/cards/persp_structure_3d/PerspStructure3DView.tsx
~~~~~
~~~~~ts.old
  return (
    <QuestionCardShell
      hintText={cardT('hint')}
      hintIcon={Box}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full items-center">
        {/* 左侧三视图正交切面预览 */}
        <div className="bg-muted/60 p-4 rounded-2xl border border-border flex flex-col gap-3">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">
            {commonT('common.viewTriAxis')}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-muted-foreground">
            {/* 顶视图 (X-Z) */}
            <div className="flex flex-col items-center gap-1 bg-card p-2 rounded-xl border border-border">
              <span className="text-muted-foreground font-bold">{commonT('common.topView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 dark:border-indigo-900 rounded grid relative bg-muted/40"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.x + 0.5) / dim) * 100}%`,
                      top: `${((targetPt3D.z + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* 正视图 (X-Y) */}
            <div className="flex flex-col items-center gap-1 bg-card p-2 rounded-xl border border-border">
              <span className="text-muted-foreground font-bold">{commonT('common.frontView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 dark:border-indigo-900 rounded grid relative bg-muted/40"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.x + 0.5) / dim) * 100}%`,
                      top: `${((dim - 1 - targetPt3D.y + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* 侧视图 (Z-Y) */}
            <div className="flex flex-col items-center gap-1 bg-card p-2 rounded-xl border border-border">
              <span className="text-muted-foreground font-bold">{commonT('common.sideView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 dark:border-indigo-900 rounded grid relative bg-muted/40"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.z + 0.5) / dim) * 100}%`,
                      top: `${((dim - 1 - targetPt3D.y + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧 3D 立方体透视交互点阵 */}
        <div
          ref={containerRef}
          className="relative flex justify-center w-full max-w-[340px] aspect-square mx-auto select-none"
        >
          <canvas
            ref={canvasRef}
            width={PERSPECTIVE_CANVAS_SIZE}
            height={PERSPECTIVE_CANVAS_SIZE}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
            }}
            tabIndex={0}
            role="button"
            aria-label={cardT('hint')}
            className={`w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner touch-none transition-all block ${
              disabled || showAnswer
                ? 'cursor-default'
                : hoverPoint
                  ? 'cursor-none hover:border-primary/60 hover:shadow-indigo-50/50'
                  : 'cursor-crosshair hover:border-primary/60 hover:shadow-indigo-50/50'
            }`}
          />
~~~~~
~~~~~ts.new
  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Box}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full items-center">
        {/* 左侧三视图正交切面预览 */}
        <div className="bg-muted/60 p-4 rounded-2xl border border-border flex flex-col gap-3">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">
            {t('common.viewTriAxis')}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-muted-foreground">
            {/* 顶视图 (X-Z) */}
            <div className="flex flex-col items-center gap-1 bg-card p-2 rounded-xl border border-border">
              <span className="text-muted-foreground font-bold">{t('common.topView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 dark:border-indigo-900 rounded grid relative bg-muted/40"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.x + 0.5) / dim) * 100}%`,
                      top: `${((targetPt3D.z + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* 正视图 (X-Y) */}
            <div className="flex flex-col items-center gap-1 bg-card p-2 rounded-xl border border-border">
              <span className="text-muted-foreground font-bold">{t('common.frontView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 dark:border-indigo-900 rounded grid relative bg-muted/40"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.x + 0.5) / dim) * 100}%`,
                      top: `${((dim - 1 - targetPt3D.y + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* 侧视图 (Z-Y) */}
            <div className="flex flex-col items-center gap-1 bg-card p-2 rounded-xl border border-border">
              <span className="text-muted-foreground font-bold">{t('common.sideView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 dark:border-indigo-900 rounded grid relative bg-muted/40"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.z + 0.5) / dim) * 100}%`,
                      top: `${((dim - 1 - targetPt3D.y + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧 3D 立方体透视交互点阵 */}
        <div
          ref={containerRef}
          className="relative flex justify-center w-full max-w-[340px] aspect-square mx-auto select-none"
        >
          <canvas
            ref={canvasRef}
            width={PERSPECTIVE_CANVAS_SIZE}
            height={PERSPECTIVE_CANVAS_SIZE}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
            }}
            tabIndex={0}
            role="button"
            aria-label={t('hint')}
            className={`w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner touch-none transition-all block ${
              disabled || showAnswer
                ? 'cursor-default'
                : hoverPoint
                  ? 'cursor-none hover:border-primary/60 hover:shadow-indigo-50/50'
                  : 'cursor-crosshair hover:border-primary/60 hover:shadow-indigo-50/50'
            }`}
          />
~~~~~

#### Acts 2: 动态化 `EMPTY_TRAINING_PLAN` 消除模块加载期求值冻结

添加 `createEmptyTrainingPlan` 工厂函数，并为 `EMPTY_TRAINING_PLAN` 的文本属性配置动态 Getter。

~~~~~act
patch_file
src/storage/planStorage.ts
~~~~~
~~~~~ts.old
export const EMPTY_TRAINING_PLAN: TrainingPlan = {
  id: 'custom_plan_default',
  name: i18n.t('common.defaultCustomPlanName'),
  description: i18n.t('common.defaultCustomPlanDesc'),
  items: [],
  isFavorite: true,
  isBuiltin: false,
  updatedAt: Date.now(),
};
~~~~~
~~~~~ts.new
export function createEmptyTrainingPlan(): TrainingPlan {
  return {
    id: 'custom_plan_default',
    name: i18n.t('common.defaultCustomPlanName'),
    description: i18n.t('common.defaultCustomPlanDesc'),
    items: [],
    isFavorite: true,
    isBuiltin: false,
    updatedAt: Date.now(),
  };
}

export const EMPTY_TRAINING_PLAN: TrainingPlan = {
  id: 'custom_plan_default',
  get name() {
    return i18n.t('common.defaultCustomPlanName');
  },
  get description() {
    return i18n.t('common.defaultCustomPlanDesc');
  },
  items: [],
  isFavorite: true,
  isBuiltin: false,
  updatedAt: Date.now(),
};
~~~~~

#### Acts 3: 解耦 Canvas 2D 绘图中的硬编码文案

为 `fractal_edge_roughness` 私有语言包扩充图注文案键，并更新图表绘图纯函数使用 `i18n.t(...)` 解析动态词条；更新色相环绘图函数。

~~~~~act
patch_file
src/cards/fractal_edge_roughness/locales/zh-CN.json
~~~~~
~~~~~json.old
  "targetEdge": "目标边缘 (Target Edge)",
  "userEdge": "你的调制 (Your Adjustment)",
  "hurstExponent": "Hurst 指数 (H)",
  "extremeRough": "极度粗糙 (H=0.1)",
  "smooth": "平滑圆润 (H=1.0)"
}
~~~~~
~~~~~json.new
  "targetEdge": "目标边缘 (Target Edge)",
  "userEdge": "你的调制 (Your Adjustment)",
  "hurstExponent": "Hurst 指数 (H)",
  "extremeRough": "极度粗糙 (H=0.1)",
  "smooth": "平滑圆润 (H=1.0)",
  "chartBiasUnder": "↑ 低估粗糙度 (感知偏平滑)",
  "chartBiasOver": "↓ 高估粗糙度 (对毛刺敏感)",
  "chartAvgDelta": "均差 ΔH {{val}}"
}
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/locales/en-US.json
~~~~~
~~~~~json.old
  "targetEdge": "Target Edge",
  "userEdge": "Your Edge Adjustment",
  "hurstExponent": "Hurst Exponent (H)",
  "extremeRough": "Extremely Rough (H=0.1)",
  "smooth": "Smooth (H=1.0)"
}
~~~~~
~~~~~json.new
  "targetEdge": "Target Edge",
  "userEdge": "Your Edge Adjustment",
  "hurstExponent": "Hurst Exponent (H)",
  "extremeRough": "Extremely Rough (H=0.1)",
  "smooth": "Smooth (H=1.0)",
  "chartBiasUnder": "↑ Underestimate roughness (Perceives smoother)",
  "chartBiasOver": "↓ Overestimate roughness (Hypersensitive to jitter)",
  "chartAvgDelta": "Avg ΔH {{val}}"
}
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/utils/charts.ts
~~~~~
~~~~~ts.old
import { setupHiDpiCanvas } from '../../../core/canvas/hidpi';
import type { UnifiedTrialRecord } from '../../../storage/db/schema';
import { CANVAS_THEME, getAccuracyColor, hexToRgba } from '../../../utils/theme';
import { getRoughnessSectorIdx } from './generator';

const SECTOR_NAMES = [
  '高碎裂带 (H 0.10-0.40)',
  '中度纹理带 (H 0.40-0.70)',
  '平滑流线带 (H 0.70-1.00)',
];
~~~~~
~~~~~ts.new
import { setupHiDpiCanvas } from '../../../core/canvas/hidpi';
import { i18n } from '../../../core/i18n';
import type { UnifiedTrialRecord } from '../../../storage/db/schema';
import { CANVAS_THEME, getAccuracyColor, hexToRgba } from '../../../utils/theme';
import { getRoughnessSectorIdx } from './generator';

const SECTOR_KEYS = [
  'cards.fractal_edge_roughness.sectors.highFrequency',
  'cards.fractal_edge_roughness.sectors.mediumFrequency',
  'cards.fractal_edge_roughness.sectors.lowFrequency',
];
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/utils/charts.ts
~~~~~
~~~~~ts.old
  // 极性说明文字
  ctx.font = '10px sans-serif';
  ctx.fillStyle = CANVAS_THEME.status.warning;
  ctx.textAlign = 'left';
  ctx.fillText('↑ 低估粗糙度 (感知偏平滑)', padding.left, 14);

  ctx.fillStyle = CANVAS_THEME.status.accent;
  ctx.textAlign = 'right';
  ctx.fillText('↓ 高估粗糙度 (对毛刺敏感)', width - padding.right, 14);
~~~~~
~~~~~ts.new
  // 极性说明文字
  ctx.font = '10px sans-serif';
  ctx.fillStyle = CANVAS_THEME.status.warning;
  ctx.textAlign = 'left';
  ctx.fillText(i18n.t('cards.fractal_edge_roughness.chartBiasUnder'), padding.left, 14);

  ctx.fillStyle = CANVAS_THEME.status.accent;
  ctx.textAlign = 'right';
  ctx.fillText(i18n.t('cards.fractal_edge_roughness.chartBiasOver'), width - padding.right, 14);
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/utils/charts.ts
~~~~~
~~~~~ts.old
    // 频段标签
    ctx.fillStyle = CANVAS_THEME.text.primary;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(SECTOR_NAMES[i], 16, y);

    // 题目样本与误差信息
    ctx.fillStyle = CANVAS_THEME.text.muted;
    ctx.font = '11px ui-monospace, monospace';
    ctx.fillText(`${b.total} 题${b.total > 0 ? ` · 均差 ΔH ${avgErr}` : ''}`, 16, y + 18);
~~~~~
~~~~~ts.new
    // 频段标签
    ctx.fillStyle = CANVAS_THEME.text.primary;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(i18n.t(SECTOR_KEYS[i]), 16, y);

    // 题目样本与误差信息
    ctx.fillStyle = CANVAS_THEME.text.muted;
    ctx.font = '11px ui-monospace, monospace';
    const trialsUnit = i18n.t('common.trialsUnit');
    const errInfo =
      b.total > 0
        ? ` · ${i18n.t('cards.fractal_edge_roughness.chartAvgDelta', { val: avgErr })}`
        : '';
    ctx.fillText(`${b.total} ${trialsUnit}${errInfo}`, 16, y + 18);
~~~~~

~~~~~act
patch_file
src/core/canvas/charts/drawColorRing.ts
~~~~~
~~~~~ts.old
import { CANVAS_THEME, getAccuracyFillColor, hexToRgba } from '../../../utils/theme';
import { hsvToHex } from '../../color/colorUtils';
import { initSquareHiDpiCanvas } from '../hidpi';
import type { SectorStat } from './drawCompass';
~~~~~
~~~~~ts.new
import { CANVAS_THEME, getAccuracyFillColor, hexToRgba } from '../../../utils/theme';
import { hsvToHex } from '../../color/colorUtils';
import { i18n } from '../../i18n';
import { initSquareHiDpiCanvas } from '../hidpi';
import type { SectorStat } from './drawCompass';
~~~~~

~~~~~act
patch_file
src/core/canvas/charts/drawColorRing.ts
~~~~~
~~~~~ts.old
  ctx.fillStyle = CANVAS_THEME.text.primary;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Hue', cx, cy - 5);
  ctx.fillStyle = CANVAS_THEME.text.secondary;
  ctx.font = '9px sans-serif';
  ctx.fillText('Accuracy', cx, cy + 8);
}
~~~~~
~~~~~ts.new
  ctx.fillStyle = CANVAS_THEME.text.primary;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(i18n.t('cards.color_hue.title'), cx, cy - 5);
  ctx.fillStyle = CANVAS_THEME.text.secondary;
  ctx.font = '9px sans-serif';
  ctx.fillText(i18n.t('common.accuracy'), cx, cy + 8);
}
~~~~~

#### Acts 4: 践行方案 B，清理分析层防御性类型清洗代码

在 `color_hue` 与 `star_single` 的分析逻辑中声明私有扩展接口，移除循环体内部无谓的防御性解包。

~~~~~act
patch_file
src/cards/color_hue/analytics.tsx
~~~~~
~~~~~ts.old
const COLOR_SECTOR_KEYS = [
  'sectors.red',
  'sectors.orange',
  'sectors.yellow',
  'sectors.yellowGreen',
  'sectors.green',
  'sectors.cyanGreen',
  'sectors.cyan',
  'sectors.blue',
  'sectors.blueViolet',
  'sectors.violet',
  'sectors.magenta',
  'sectors.rose',
];

/**
 * 运行时安全守卫：将未知的试炼记录字段转换为合法的 HSV 三元组
 */
function parseHsvTuple(
  raw: unknown,
  fallback: [number, number, number] = [0, 0, 0],
): [number, number, number] {
  if (Array.isArray(raw) && raw.length === 3) {
    return [Number(raw[0]) || 0, Number(raw[1]) || 0, Number(raw[2]) || 0];
  }
  return fallback;
}

/**
 * 聚合 12 个色相扇区的样本量、命中数与平均误差统计
 */
function calculateHueSectorStats(records: UnifiedTrialRecord[]): SectorStat[] {
  const sectorBuckets = Array.from({ length: 12 }, () => ({
    total: 0,
    hits: 0,
    sumError: 0,
  }));

  for (const r of records) {
    const tHsv = parseHsvTuple(r.targetHSV);
    const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
    sectorBuckets[idx].total += 1;
    if (r.isHit) sectorBuckets[idx].hits += 1;
    sectorBuckets[idx].sumError += Number(r.errorValue ?? 0);
  }
~~~~~
~~~~~ts.new
const COLOR_SECTOR_KEYS = [
  'sectors.red',
  'sectors.orange',
  'sectors.yellow',
  'sectors.yellowGreen',
  'sectors.green',
  'sectors.cyanGreen',
  'sectors.cyan',
  'sectors.blue',
  'sectors.blueViolet',
  'sectors.violet',
  'sectors.magenta',
  'sectors.rose',
];

interface ColorHueTrialRecord extends UnifiedTrialRecord {
  targetHSV?: [number, number, number];
  userHSV?: [number, number, number];
}

/**
 * 聚合 12 个色相扇区的样本量、命中数与平均误差统计
 */
function calculateHueSectorStats(records: UnifiedTrialRecord[]): SectorStat[] {
  const sectorBuckets = Array.from({ length: 12 }, () => ({
    total: 0,
    hits: 0,
    sumError: 0,
  }));

  for (const rec of records) {
    const r = rec as ColorHueTrialRecord;
    const tHsv = r.targetHSV || [0, 0, 0];
    const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
    sectorBuckets[idx].total += 1;
    if (r.isHit) sectorBuckets[idx].hits += 1;
    sectorBuckets[idx].sumError += Number(r.errorValue ?? 0);
  }
~~~~~

~~~~~act
patch_file
src/cards/color_hue/analytics.tsx
~~~~~
~~~~~ts.old
        for (const r of records) {
          const tHsv = parseHsvTuple(r.targetHSV);
          const uHsv = parseHsvTuple(r.userHSV, tHsv);
          const bias = calcSignedHueBias(tHsv[0], uHsv[0]);
          sumSignedBias += bias;

          const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
          sectorBuckets[idx].total += 1;
          if (r.isHit) sectorBuckets[idx].hits += 1;
          sectorBuckets[idx].sumBias += bias;
        }
~~~~~
~~~~~ts.new
        for (const rec of records) {
          const r = rec as ColorHueTrialRecord;
          const tHsv = r.targetHSV || [0, 0, 0];
          const uHsv = r.userHSV || tHsv;
          const bias = calcSignedHueBias(tHsv[0], uHsv[0]);
          sumSignedBias += bias;

          const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
          sectorBuckets[idx].total += 1;
          if (r.isHit) sectorBuckets[idx].hits += 1;
          sectorBuckets[idx].sumBias += bias;
        }
~~~~~

~~~~~act
patch_file
src/cards/star_single/analytics.tsx
~~~~~
~~~~~ts.old
const SECTOR_KEYS = [
  'sectors.e',
  'sectors.ne',
  'sectors.n',
  'sectors.nw',
  'sectors.w',
  'sectors.sw',
  'sectors.s',
  'sectors.se',
];

export function createStarSingleAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'spatial_bias',
      tabLabel: 'analytics.spatialBias.tabLabel',
      title: 'analytics.spatialBias.title',
      subTitle: 'analytics.spatialBias.subTitle',
      icon: Target,
      renderVisualizer: (canvas, records) => {
        const totalCount = records.length;
        let sumDx = 0;
        let sumDy = 0;
        for (const r of records) {
          const uClick: [number, number] =
            Array.isArray(r.userClick) && r.userClick.length === 2
              ? [Number(r.userClick[0]), Number(r.userClick[1])]
              : [0, 0];
          const tB: [number, number] =
            Array.isArray(r.targetB) && r.targetB.length === 2
              ? [Number(r.targetB[0]), Number(r.targetB[1])]
              : [0, 0];
          sumDx += uClick[0] - tB[0];
          sumDy += uClick[1] - tB[1];
        }
        const avgDx = totalCount > 0 ? Math.round((sumDx / totalCount) * 10) / 10 : 0;
        const avgDy = totalCount > 0 ? Math.round((sumDy / totalCount) * 10) / 10 : 0;
        renderHeatmapCanvas(canvas, records, avgDx, avgDy, totalCount);
      },
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        let sumDx = 0;
        let sumDy = 0;
        let sumDist = 0;
        for (const r of records) {
          const uClick: [number, number] =
            Array.isArray(r.userClick) && r.userClick.length === 2
              ? [Number(r.userClick[0]), Number(r.userClick[1])]
              : [0, 0];
          const tB: [number, number] =
            Array.isArray(r.targetB) && r.targetB.length === 2
              ? [Number(r.targetB[0]), Number(r.targetB[1])]
              : [0, 0];
          sumDx += uClick[0] - tB[0];
          sumDy += uClick[1] - tB[1];
          sumDist += Number(r.errorPixelDistance || 0);
        }
~~~~~
~~~~~ts.new
const SECTOR_KEYS = [
  'sectors.e',
  'sectors.ne',
  'sectors.n',
  'sectors.nw',
  'sectors.w',
  'sectors.sw',
  'sectors.s',
  'sectors.se',
];

interface StarSingleTrialRecord extends UnifiedTrialRecord {
  userClick?: [number, number];
  targetB?: [number, number];
  errorPixelDistance?: number;
}

export function createStarSingleAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'spatial_bias',
      tabLabel: 'analytics.spatialBias.tabLabel',
      title: 'analytics.spatialBias.title',
      subTitle: 'analytics.spatialBias.subTitle',
      icon: Target,
      renderVisualizer: (canvas, records) => {
        const totalCount = records.length;
        let sumDx = 0;
        let sumDy = 0;
        for (const rec of records) {
          const r = rec as StarSingleTrialRecord;
          const uClick = r.userClick || [0, 0];
          const tB = r.targetB || [0, 0];
          sumDx += uClick[0] - tB[0];
          sumDy += uClick[1] - tB[1];
        }
        const avgDx = totalCount > 0 ? Math.round((sumDx / totalCount) * 10) / 10 : 0;
        const avgDy = totalCount > 0 ? Math.round((sumDy / totalCount) * 10) / 10 : 0;
        renderHeatmapCanvas(canvas, records, avgDx, avgDy, totalCount);
      },
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        let sumDx = 0;
        let sumDy = 0;
        let sumDist = 0;
        for (const rec of records) {
          const r = rec as StarSingleTrialRecord;
          const uClick = r.userClick || [0, 0];
          const tB = r.targetB || [0, 0];
          sumDx += uClick[0] - tB[0];
          sumDy += uClick[1] - tB[1];
          sumDist += Number(r.errorPixelDistance || 0);
        }
~~~~~

### 下一步建议

阶段二中有关 i18n 边缘调用收敛、动态求值与数据信任链落地的重构已全部实施完毕。系统各卡片的类型与语言一致性得到大幅提升。
建议推进**阶段三：交互层组件解耦与逻辑复用（P2）**：
1. 增强 `PointClickCanvas` 组件（例如扩展前景/背景自定义 Canvas 绘制钩子），消除 `neg_vertex_fitting` 与 `persp_structure_3d` 中各自拷贝的逾百行触摸与放大镜逻辑。
2. 提取 `useLineProjection` 自定义 Hook，统一收敛 `persp_prop_division` 与 `persp_prop_migration` 中完全重合的倾斜线段正交投影数学算法。
