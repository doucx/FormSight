我已定位问题原因并完成修复方案设计。

## [WIP] fix(color): 修复非答题参考轨道在揭晓答案时错误显示作答反馈标线的问题

### 错误分析
1. **参考轨道错误接收了目标维度的作答值**：
   - 在明度（V）或饱和度（S）练习模式下，色相（H）轨仅作为已知参考条件，用户并未对 H 轨作答。
   - 但在 `ColorCanvas.tsx` 中，H 轨无条件传入了 `userVal={userAnswer?.userValue}` 和 `isHit={userAnswer?.isHit}`。
   - 这导致当 V 题答完后，用户在 V 轨选择的值（如 80%）被直接当成了 H 轨的提交值（解析为 80°），同时触发了 H 轨的答案揭晓状态。
2. **`HsvTrackSlider` 未隔离参考轨的答案状态**：
   - `HsvTrackSlider` 只要在 `showAnswer === true` 时，如果接收到 `userVal`，就会无差别绘制真理位（绿色）和提交位（红/绿）两条标线。
   - 对于非作答的纯参考轨，在答题结束揭晓时应保持正常的参考值黑色标线与中性文字颜色。

### 用户需求
在单维度练习模式（如明度 V 模式、饱和度 S 模式）下，仅有当前正在练习的目标轨道在作答后显示真理位与用户提交位标线，其余作为已知条件的参考轨道（如 H 轨）应始终保持静态参考展示。

### 评论
该问题属于单维度复用统一滑块组件时的 Props 传递污染。明确将 `userVal` 与 `isHit` 限制在 `mode === targetMode` 下传递，并在滑块内部严格校验作答数据，能够彻底解决参考轨道的视觉污染。

### 目标
1. 在 `ColorCanvas.tsx` 中对单维度模式下的 H、S、V 轨道的 `userVal` 与 `isHit` 增加条件判断，仅当当前练习模式与轨道对应时才传递。
2. 在 `HsvTrackSlider.tsx` 中优化 `showAnswer` 渲染条件：只有存在有效 `userVal` 的作答轨道才绘制揭晓指示线，参考轨继续保持静态标线。

### 基本原理
- **精确按需传参**：只有当前正在训练的维度才具备 `userVal` 与 `isHit`，非训练维度传入 `undefined`。
- **纯参考轨语义化保持**：若轨道没有 `userVal`，即使整体处于 `showAnswer` 状态，该轨道仍作为只读参考轨渲染基准黑色细线与当前颜色参数。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/track-slider #task/action/bug-fix #task/state/continue #task/status/active

---

### Script

#### Acts 1: 修正 `ColorCanvas.tsx` 单维度轨道的作答状态传递

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
            {/* 单维度模式 H 轨 */}
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={targetH}
              max={360}
              unit="°"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetH}
              userVal={userAnswer?.userValue}
              isHit={userAnswer?.isHit}
              isInteractiveTarget={mode === 'H'}
              onCommit={(v) => {
                if (mode === 'H' && !showAnswer && !disabled) onAnswer(v);
              }}
              disabled={disabled || mode !== 'H'}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand && mode === 'H'}
            />

            {/* 单维度模式 S 轨 */}
            {mode === 'S' && (
              <HsvTrackSlider
                label="S"
                gradient={satGradient}
                val={targetS}
                max={100}
                unit="%"
                targetHSV={targetHSV}
                difficultyLevel={difficultyLevel}
                showAnswer={showAnswer}
                targetVal={targetS}
                userVal={userAnswer?.userValue}
                isHit={userAnswer?.isHit}
                isInteractiveTarget={true}
                onCommit={(v) => {
                  if (!showAnswer && !disabled) onAnswer(v);
                }}
                disabled={disabled}
                hitMargin={hitMargin}
                showToleranceBand={showToleranceBand}
              />
            )}

            {/* 单维度模式 V 轨 */}
            {(mode === 'V' || mode === 'S') && (
              <HsvTrackSlider
                label="V"
                gradient={valGradient}
                val={targetV}
                max={100}
                unit="%"
                targetHSV={targetHSV}
                difficultyLevel={difficultyLevel}
                showAnswer={showAnswer}
                targetVal={targetV}
                userVal={mode === 'V' ? userAnswer?.userValue : targetV}
                isHit={mode === 'V' ? userAnswer?.isHit : undefined}
                isInteractiveTarget={mode === 'V'}
                onCommit={(v) => {
                  if (mode === 'V' && !showAnswer && !disabled) onAnswer(v);
                }}
                disabled={disabled || mode !== 'V'}
                hitMargin={hitMargin}
                showToleranceBand={showToleranceBand && mode === 'V'}
              />
            )}
~~~~~
~~~~~typescript.new
            {/* 单维度模式 H 轨 */}
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={targetH}
              max={360}
              unit="°"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetH}
              userVal={mode === 'H' ? userAnswer?.userValue : undefined}
              isHit={mode === 'H' ? userAnswer?.isHit : undefined}
              isInteractiveTarget={mode === 'H'}
              onCommit={(v) => {
                if (mode === 'H' && !showAnswer && !disabled) onAnswer(v);
              }}
              disabled={disabled || mode !== 'H'}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand && mode === 'H'}
            />

            {/* 单维度模式 S 轨 */}
            {mode === 'S' && (
              <HsvTrackSlider
                label="S"
                gradient={satGradient}
                val={targetS}
                max={100}
                unit="%"
                targetHSV={targetHSV}
                difficultyLevel={difficultyLevel}
                showAnswer={showAnswer}
                targetVal={targetS}
                userVal={mode === 'S' ? userAnswer?.userValue : undefined}
                isHit={mode === 'S' ? userAnswer?.isHit : undefined}
                isInteractiveTarget={true}
                onCommit={(v) => {
                  if (!showAnswer && !disabled) onAnswer(v);
                }}
                disabled={disabled}
                hitMargin={hitMargin}
                showToleranceBand={showToleranceBand}
              />
            )}

            {/* 单维度模式 V 轨 */}
            {(mode === 'V' || mode === 'S') && (
              <HsvTrackSlider
                label="V"
                gradient={valGradient}
                val={targetV}
                max={100}
                unit="%"
                targetHSV={targetHSV}
                difficultyLevel={difficultyLevel}
                showAnswer={showAnswer}
                targetVal={targetV}
                userVal={mode === 'V' ? userAnswer?.userValue : undefined}
                isHit={mode === 'V' ? userAnswer?.isHit : undefined}
                isInteractiveTarget={mode === 'V'}
                onCommit={(v) => {
                  if (mode === 'V' && !showAnswer && !disabled) onAnswer(v);
                }}
                disabled={disabled || mode !== 'V'}
                hitMargin={hitMargin}
                showToleranceBand={showToleranceBand && mode === 'V'}
              />
            )}
~~~~~

#### Acts 2: 优化 `HsvTrackSlider.tsx` 参考轨在揭晓状态下的表现

~~~~~act
patch_file
src/components/HsvTrackSlider.tsx
~~~~~
~~~~~typescript.old
  const renderLabelText = () => {
    if (showAnswer) {
      return `${userVal !== undefined ? userVal : val}${unit}`;
    }
    if (isInteractiveTarget) {
      return hoverVal !== null ? `${hoverVal}${unit}` : '?';
    }
    return `${activeVal}${unit}`;
  };

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">{label}</span>

      <div
        {...pointerProps}
        style={
          hitMargin > 0
            ? {
                paddingLeft: `${hitMargin}px`,
                paddingRight: `${hitMargin}px`,
                marginLeft: `-${hitMargin}px`,
                marginRight: `-${hitMargin}px`,
                paddingTop: '6px',
                paddingBottom: '6px',
                marginTop: '-6px',
                marginBottom: '-6px',
              }
            : undefined
        }
        className={`relative flex-1 flex items-center select-none touch-none ${
          !showAnswer && !disabled ? 'cursor-none' : 'cursor-default'
        }`}
      >
        <div
          ref={trackRef}
          className="relative w-full h-7 rounded-xl border border-slate-200/80 shadow-inner flex items-center"
          style={{ background: gradient }}
        >
          {/* 当前设定值标记线：在非目标盲测轨道显示 */}
          {!showAnswer && !isInteractiveTarget && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm z-20"
              style={{ left: getPercent(val, max) }}
            />
          )}

          {/* 动态 ΔE 容错感应指示线 */}
          {!showAnswer &&
            showToleranceBand &&
            (hoverVal !== null || !isInteractiveTarget) &&
            (() => {
              const currentTuple: [number, number, number] = allUserHSV
                ? [
                    label === 'H' ? activeVal : allUserHSV[0],
                    label === 'S' ? activeVal : allUserHSV[1],
                    label === 'V' ? activeVal : allUserHSV[2],
                  ]
                : [
                    label === 'H' ? activeVal : targetHSV[0],
                    label === 'S' ? activeVal : targetHSV[1],
                    label === 'V' ? activeVal : targetHSV[2],
                  ];

              const span = getToleranceSpan(
                label,
                activeVal,
                targetHSV,
                difficultyLevel,
                currentTuple,
              );
              const isWrapMode = label === 'H';
              const leftVal = isWrapMode
                ? (activeVal - span.halfSpan + max) % max
                : Math.max(0, activeVal - span.halfSpan);
              const rightVal = isWrapMode
                ? (activeVal + span.halfSpan + max) % max
                : Math.min(max, activeVal + span.halfSpan);

              return (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${(leftVal / max) * 100}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${(rightVal / max) * 100}%` }}
                  />
                </>
              );
            })()}

          {/* 鼠标悬停准心线 */}
          {!showAnswer && hoverVal !== null && (isInteractiveTarget || hoverVal !== val) && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 shadow-sm pointer-events-none z-30 opacity-75"
              style={{ left: getPercent(hoverVal, max) }}
            />
          )}

          {/* 揭晓答案之后的真理位与提交位 */}
          {showAnswer && (
            <>
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-10 bg-emerald-500 border-x border-white shadow-md z-20"
                style={{ left: getPercent(actualTargetVal, max) }}
              />
              {userVal !== undefined && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-7 border-x border-white ${
                    isHit ? 'bg-emerald-500' : 'bg-rose-500'
                  } shadow-md z-10`}
                  style={{ left: getPercent(userVal, max) }}
                />
              )}
            </>
          )}
        </div>
      </div>

      <span
        className={`w-12 text-right font-mono font-bold text-xs ${
          isInteractiveTarget && !showAnswer
            ? 'text-amber-500'
            : showAnswer && isHit
              ? 'text-emerald-600'
              : showAnswer
                ? 'text-rose-600'
                : 'text-slate-700'
        }`}
      >
        {renderLabelText()}
      </span>
    </div>
  );
~~~~~
~~~~~typescript.new
  const isAnswerRevealed = showAnswer && userVal !== undefined;

  const renderLabelText = () => {
    if (isAnswerRevealed) {
      return `${userVal}${unit}`;
    }
    if (isInteractiveTarget && !showAnswer) {
      return hoverVal !== null ? `${hoverVal}${unit}` : '?';
    }
    return `${activeVal}${unit}`;
  };

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">{label}</span>

      <div
        {...pointerProps}
        style={
          hitMargin > 0
            ? {
                paddingLeft: `${hitMargin}px`,
                paddingRight: `${hitMargin}px`,
                marginLeft: `-${hitMargin}px`,
                marginRight: `-${hitMargin}px`,
                paddingTop: '6px',
                paddingBottom: '6px',
                marginTop: '-6px',
                marginBottom: '-6px',
              }
            : undefined
        }
        className={`relative flex-1 flex items-center select-none touch-none ${
          !showAnswer && !disabled ? 'cursor-none' : 'cursor-default'
        }`}
      >
        <div
          ref={trackRef}
          className="relative w-full h-7 rounded-xl border border-slate-200/80 shadow-inner flex items-center"
          style={{ background: gradient }}
        >
          {/* 当前设定值标记线：在非目标盲测轨道、或非揭晓状态的参考轨道上显示 */}
          {(!showAnswer && !isInteractiveTarget) || (showAnswer && userVal === undefined) ? (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm z-20"
              style={{ left: getPercent(val, max) }}
            />
          ) : null}

          {/* 动态 ΔE 容错感应指示线 */}
          {!showAnswer &&
            showToleranceBand &&
            (hoverVal !== null || !isInteractiveTarget) &&
            (() => {
              const currentTuple: [number, number, number] = allUserHSV
                ? [
                    label === 'H' ? activeVal : allUserHSV[0],
                    label === 'S' ? activeVal : allUserHSV[1],
                    label === 'V' ? activeVal : allUserHSV[2],
                  ]
                : [
                    label === 'H' ? activeVal : targetHSV[0],
                    label === 'S' ? activeVal : targetHSV[1],
                    label === 'V' ? activeVal : targetHSV[2],
                  ];

              const span = getToleranceSpan(
                label,
                activeVal,
                targetHSV,
                difficultyLevel,
                currentTuple,
              );
              const isWrapMode = label === 'H';
              const leftVal = isWrapMode
                ? (activeVal - span.halfSpan + max) % max
                : Math.max(0, activeVal - span.halfSpan);
              const rightVal = isWrapMode
                ? (activeVal + span.halfSpan + max) % max
                : Math.min(max, activeVal + span.halfSpan);

              return (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${(leftVal / max) * 100}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${(rightVal / max) * 100}%` }}
                  />
                </>
              );
            })()}

          {/* 鼠标悬停准心线 */}
          {!showAnswer && hoverVal !== null && (isInteractiveTarget || hoverVal !== val) && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 shadow-sm pointer-events-none z-30 opacity-75"
              style={{ left: getPercent(hoverVal, max) }}
            />
          )}

          {/* 揭晓答案之后的真理位与提交位（仅当本轨道有提交值时呈现） */}
          {isAnswerRevealed && (
            <>
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-10 bg-emerald-500 border-x border-white shadow-md z-20"
                style={{ left: getPercent(actualTargetVal, max) }}
              />
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-7 border-x border-white ${
                  isHit ? 'bg-emerald-500' : 'bg-rose-500'
                } shadow-md z-10`}
                style={{ left: getPercent(userVal, max) }}
              />
            </>
          )}
        </div>
      </div>

      <span
        className={`w-12 text-right font-mono font-bold text-xs ${
          isInteractiveTarget && !showAnswer
            ? 'text-amber-500'
            : isAnswerRevealed && isHit
              ? 'text-emerald-600'
              : isAnswerRevealed
                ? 'text-rose-600'
                : 'text-slate-700'
        }`}
      >
        {renderLabelText()}
      </span>
    </div>
  );
~~~~~

### 下一步建议
1. 运行 `npm run check` 检查代码格式及类型声明。
2. 进入明度 (V) 模式与饱和度 (S) 模式答题，确认作答后仅有当前正在练习的滑块显示绿色真理线与红/绿提交线，参考滑块（如 H 轨）保持安静的黑色参考线。
