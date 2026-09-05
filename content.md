好的，我将把“环境穿透判别”卡片揭晓答案时的背景色统一调整为绝对中性纯黑（`#000000`），彻底消除带有偏色的蓝灰（原 `slate[500]`）所引起的残像和环境干扰，使两侧在完全相同的纯黑无彩环境中直接对比中心物理明度。

## [WIP] fix: 将环境穿透判别揭晓时的背景统一为纯黑基准

### 用户需求

在“环境穿透判别”（`rel_decontextual_2afc`）中，作答揭晓后两边的背景色应保持绝对相同，避免偏色或残像干扰，调整为同样的中性纯黑背景。

### 评论

此前揭晓时使用的 `PALETTE.slate[500]`（`#64748b`）自带冷蓝调色相（Hue=215°, Sat=16%），在暖色或不同色相的中心块衬托下会产生色彩残像诱导，使人产生左右背景颜色仍有差异的错觉。同时中心色块的明度在 40%~60% 之间，中灰背景容易与中心色融色。统一采用无彩色纯黑（`#000000`）能实现最高反差的脱语境（Decontextualized）比对。

### 目标

修改 `src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx`，将揭晓答案时的背景统一置换为恒定纯黑 `#000000`。

### 标签

#intent/fix #flow/ready #priority/high #comp/ui #scope/ux #task/domain/ui #task/object/rel-decontextual-reveal-bg #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 将 RelDecontextual2AfcView 揭晓时的背景统一置为纯黑

修改 `src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx`，定义统一的绝对纯黑常量并在 A/B 容器中应用。

~~~~~act
patch_file
src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx
~~~~~
~~~~~tsx
import {
  Badge,
  ChoiceCard,
  ColorSwatch,
  PALETTE,
  QuestionCardShell,
  getChoiceCardState,
  hsvToHex,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
~~~~~
~~~~~tsx
import {
  Badge,
  ChoiceCard,
  ColorSwatch,
  QuestionCardShell,
  getChoiceCardState,
  hsvToHex,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';

/** 揭晓时剥离环境诱导的绝对中性纯黑基准背景 */
const DECONTEXTUAL_REVEAL_BG = '#000000';
~~~~~

~~~~~act
patch_file
src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx
~~~~~
~~~~~tsx
          <ColorSwatch
            color={showAnswer ? PALETTE.slate[500] : hexBgA}
            variant="container"
            className="w-full h-44 shadow-inner"
          >
            <ColorSwatch color={hexCenterA} variant="embedded" size="sm" />
          </ColorSwatch>
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs"
              >
                2
              </Badge>
              {t('common.areaB')}
            </span>

            {showAnswer && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 ${
                  isBHit
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-muted-foreground'
                }`}
              >
                {isBHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isBHit
                  ? t('physicallyBrighter', { v: question.centerColorB[2] })
                  : t('physicallyDarker', { v: question.centerColorB[2] })}
              </span>
            )}
          </div>

          <ColorSwatch
            color={showAnswer ? PALETTE.slate[500] : hexBgB}
            variant="container"
            className="w-full h-44 shadow-inner"
          >
            <ColorSwatch color={hexCenterB} variant="embedded" size="sm" />
          </ColorSwatch>
~~~~~
~~~~~tsx
          <ColorSwatch
            color={showAnswer ? DECONTEXTUAL_REVEAL_BG : hexBgA}
            variant="container"
            className="w-full h-44 shadow-inner"
          >
            <ColorSwatch color={hexCenterA} variant="embedded" size="sm" />
          </ColorSwatch>
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs"
              >
                2
              </Badge>
              {t('common.areaB')}
            </span>

            {showAnswer && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 ${
                  isBHit
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-muted-foreground'
                }`}
              >
                {isBHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isBHit
                  ? t('physicallyBrighter', { v: question.centerColorB[2] })
                  : t('physicallyDarker', { v: question.centerColorB[2] })}
              </span>
            )}
          </div>

          <ColorSwatch
            color={showAnswer ? DECONTEXTUAL_REVEAL_BG : hexBgB}
            variant="container"
            className="w-full h-44 shadow-inner"
          >
            <ColorSwatch color={hexCenterB} variant="embedded" size="sm" />
          </ColorSwatch>
~~~~~

---

### 变更说明

- 在作答阶段，左右两边依然分别呈现亮背景与暗背景（诱导产生视觉错觉）；
- 在揭晓答案阶段，两侧背景通过 `ColorSwatch` 平滑过渡统一为恒定绝对纯黑（`#000000`），剥离了任何环境诱导与冷暖色偏，使中心色块在纯黑底色上清晰显现真实的物理明度差异。
