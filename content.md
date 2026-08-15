好的！我将为综合拾色（ALL）模式增加鼠标悬停追踪机制：当鼠标悬停在 H、S 或 V 任意一条拾色滑块轨道上时，将隐藏默认光标并跟随鼠标实时渲染细黑色游标，同时让 $\Delta E$ 动态容错区间以及悬停数值随鼠标悬停位置实时更新。

下面为您生成实施计划：

## [WIP] refactor(color): 为综合拾色模式增加鼠标悬停游标跟随与实时 ΔE 动态容错联动

### 用户需求
在综合拾色（ALL）模式中：
1. 鼠标悬停在滑块条带上时，隐藏系统鼠标光标，并渲染与其他模式相同的跟随鼠标移动的细黑色竖线游标。
2. 鼠标悬停时，$\Delta E$ 动态容错区间及悬停数值实时跟随鼠标位置同步更新。

### 评论
该改动让综合拾色模式下的交互体验与单维度模式完全一致，允许用户在点击确认前通过悬停试探来直观感知当前色彩在各维度上的容错空间。

### 目标
1. 扩展 `src/components/ColorCanvas.tsx` 中 ALL 模式轨道的 `onMouseMove`、`onMouseLeave` 与 `onClick` 事件处理。
2. 引入状态（如 `allHoverVals` 或单维度悬停临时值）支持 ALL 模式下各轨道的独立悬停试探与光标隐藏。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color-recognition #task/object/comprehensive-color-hover-interaction #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 升级 ColorCanvas 支持 ALL 模式下的鼠标悬停、隐藏光标与动态容错联动

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
  const activeTrackRef = useRef<HTMLDivElement | null>(null);
  const [hoverVal, setHoverVal] = useState<number | null>(null);

  const maxVal = mode === 'H' ? 360 : 100;

  // 单维度鼠标悬停追踪
  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || !activeTrackRef.current || mode === 'ALL') return;
    const rect = activeTrackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const val = Math.round(ratio * maxVal);
    setHoverVal(val);
  };

  const handleMouseLeave = () => {
    setHoverVal(null);
  };

  // 点击单维度活动轨道
  const handleActiveTrackClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !activeTrackRef.current || mode === 'ALL') return;
    const rect = activeTrackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const selectedVal = Math.round(ratio * maxVal);

    setHoverVal(null);
    onAnswer(selectedVal);
  };
~~~~~
~~~~~typescript.new
  const activeTrackRef = useRef<HTMLDivElement | null>(null);
  const trackRefs = {
    H: useRef<HTMLDivElement | null>(null),
    S: useRef<HTMLDivElement | null>(null),
    V: useRef<HTMLDivElement | null>(null),
  };
  const [hoverVal, setHoverVal] = useState<number | null>(null);
  const [allHoverVals, setAllHoverVals] = useState<Record<'H' | 'S' | 'V', number | null>>({
    H: null,
    S: null,
    V: null,
  });

  const maxVal = mode === 'H' ? 360 : 100;

  // 鼠标悬停追踪 (支持单维度与 ALL 模式)
  const handleMouseMove = (label: 'H' | 'S' | 'V', e: MouseEvent, trackEl: HTMLDivElement | null) => {
    if (disabled || showAnswer || !trackEl) return;
    const rect = trackEl.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const currentMax = label === 'H' ? 360 : 100;
    const val = Math.round(ratio * currentMax);

    if (mode === 'ALL') {
      setAllHoverVals((prev) => ({ ...prev, [label]: val }));
    } else {
      setHoverVal(val);
    }
  };

  const handleMouseLeave = (label?: 'H' | 'S' | 'V') => {
    if (mode === 'ALL' && label) {
      setAllHoverVals((prev) => ({ ...prev, [label]: null }));
    } else {
      setHoverVal(null);
    }
  };

  // 点击活动轨道
  const handleTrackClick = (label: 'H' | 'S' | 'V', e: MouseEvent, trackEl: HTMLDivElement | null) => {
    if (disabled || showAnswer || !trackEl) return;
    const rect = trackEl.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const currentMax = label === 'H' ? 360 : 100;
    const selectedVal = Math.round(ratio * currentMax);

    if (mode === 'ALL') {
      if (label === 'H') setUserH(selectedVal);
      else if (label === 'S') setUserS(selectedVal);
      else if (label === 'V') setUserV(selectedVal);
      setAllHoverVals((prev) => ({ ...prev, [label]: null }));
    } else {
      setHoverVal(null);
      onAnswer(selectedVal);
    }
  };
~~~~~

#### Acts 2: 更新 renderSliderRow 以支持 ALL 模式下的悬停试探与动态光标

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
  // 渲染单个 Slider 轨道行
  const renderSliderRow = (
    label: 'H' | 'S' | 'V',
    isTargetActiveMode: boolean,
    gradient: string,
    val: number,
    max: number,
    unit: string,
  ) => {
    const isInteractiveInAll = mode === 'ALL' && !showAnswer && !disabled;

    return (
      <div key={label} className="flex items-center gap-3 w-full">
        {/* Label */}
        <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">{label}</span>

        {/* Track Extended Hit Area */}
        <div
          onClick={isTargetActiveMode && mode !== 'ALL' ? handleActiveTrackClick : undefined}
          onKeyDown={
            isTargetActiveMode && mode !== 'ALL'
              ? (e) => {
                  if (
                    (e.key === 'Enter' || e.key === ' ') &&
                    hoverVal !== null &&
                    !disabled &&
                    !showAnswer
                  ) {
                    e.preventDefault();
                    onAnswer(hoverVal);
                  }
                }
              : undefined
          }
          role={isTargetActiveMode && mode !== 'ALL' ? 'button' : undefined}
          tabIndex={
            isTargetActiveMode && mode !== 'ALL' && !showAnswer && !disabled ? 0 : undefined
          }
          onMouseMove={isTargetActiveMode && mode !== 'ALL' ? handleMouseMove : undefined}
          onMouseLeave={isTargetActiveMode && mode !== 'ALL' ? handleMouseLeave : undefined}
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
          className={`relative flex-1 flex items-center ${
            isTargetActiveMode && mode !== 'ALL' && !showAnswer && !disabled
              ? 'cursor-none'
              : 'cursor-default'
          }`}
        >
          {/* Inner Track */}
          <div
            ref={isTargetActiveMode && mode !== 'ALL' ? activeTrackRef : null}
            className="relative w-full h-7 rounded-xl border border-slate-200/80 shadow-inner flex items-center"
            style={{ background: gradient }}
          >
            {/* 已知维度/单维度标记 (无边框双像素黑色竖条) */}
            {(!isTargetActiveMode || (mode !== 'ALL' && !isTargetActiveMode)) && mode !== 'ALL' && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm"
                style={{ left: getPercent(val, max) }}
              />
            )}

            {/* ALL 模式拖拽 Range Input */}
            {mode === 'ALL' && (
              <input
                type="range"
                min="0"
                max={max}
                value={val}
                disabled={disabled || showAnswer}
                onChange={(e) =>
                  handleAllSliderChange(
                    label,
                    Number.parseInt((e.target as HTMLInputElement).value, 10),
                  )
                }
                onInput={(e) =>
                  handleAllSliderChange(
                    label,
                    Number.parseInt((e.target as HTMLInputElement).value, 10),
                  )
                }
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default z-30"
              />
            )}

            {/* ALL 模式调制中的当前游标 (无边框双像素黑色竖条) */}
            {mode === 'ALL' && !showAnswer && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm z-20"
                style={{ left: getPercent(val, max) }}
              />
            )}

            {/* 容错感应区指示线 (支持单维度悬停与 ALL 模式实时调制) */}
            {!showAnswer &&
              showToleranceBand &&
              ((mode !== 'ALL' && isTargetActiveMode && hoverVal !== null) || mode === 'ALL') &&
              (() => {
                const activeVal = mode === 'ALL' ? val : (hoverVal as number);
                const currentHSVTuple: [number, number, number] | undefined =
                  mode === 'ALL' ? [userH, userS, userV] : undefined;

                const span = getToleranceSpan(label, activeVal, question, currentHSVTuple);
                const isWrapMode = label === 'H';

                const leftVal = isWrapMode
                  ? (activeVal - span.halfSpan + max) % max
                  : Math.max(0, activeVal - span.halfSpan);
                const rightVal = isWrapMode
                  ? (activeVal + span.halfSpan + max) % max
                  : Math.min(max, activeVal + span.halfSpan);

                const leftPct = (leftVal / max) * 100;
                const rightPct = (rightVal / max) * 100;

                return (
                  <>
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                      style={{ left: `${leftPct}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                      style={{ left: `${rightPct}%` }}
                    />
                  </>
                );
              })()}

            {/* 单维度悬停准心 */}
            {mode !== 'ALL' && isTargetActiveMode && !showAnswer && hoverVal !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-indigo-600/90 shadow-sm pointer-events-none z-30"
                style={{ left: getPercent(hoverVal, max) }}
              />
            )}
~~~~~
~~~~~typescript.new
  // 渲染单个 Slider 轨道行
  const renderSliderRow = (
    label: 'H' | 'S' | 'V',
    isTargetActiveMode: boolean,
    gradient: string,
    val: number,
    max: number,
    unit: string,
  ) => {
    const isInteractive = !showAnswer && !disabled;
    const currentHoverVal = mode === 'ALL' ? allHoverVals[label] : hoverVal;

    return (
      <div key={label} className="flex items-center gap-3 w-full">
        {/* Label */}
        <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">{label}</span>

        {/* Track Extended Hit Area */}
        <div
          onClick={(e) => handleTrackClick(label, e, trackRefs[label].current)}
          onKeyDown={(e) => {
            if (
              (e.key === 'Enter' || e.key === ' ') &&
              currentHoverVal !== null &&
              !disabled &&
              !showAnswer
            ) {
              e.preventDefault();
              if (mode === 'ALL') {
                if (label === 'H') setUserH(currentHoverVal);
                else if (label === 'S') setUserS(currentHoverVal);
                else if (label === 'V') setUserV(currentHoverVal);
              } else {
                onAnswer(currentHoverVal);
              }
            }
          }}
          role="button"
          tabIndex={!showAnswer && !disabled ? 0 : undefined}
          onMouseMove={(e) => handleMouseMove(label, e, trackRefs[label].current)}
          onMouseLeave={() => handleMouseLeave(label)}
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
          className={`relative flex-1 flex items-center ${
            isInteractive ? 'cursor-none' : 'cursor-default'
          }`}
        >
          {/* Inner Track */}
          <div
            ref={trackRefs[label]}
            className="relative w-full h-7 rounded-xl border border-slate-200/80 shadow-inner flex items-center"
            style={{ background: gradient }}
          >
            {/* 已知维度/单维度标记 (非活跃且非ALL模式) */}
            {(!isTargetActiveMode || (mode !== 'ALL' && !isTargetActiveMode)) && mode !== 'ALL' && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm"
                style={{ left: getPercent(val, max) }}
              />
            )}

            {/* ALL 模式下的当前滑块数值标记 (未悬停时显示当前设定值) */}
            {mode === 'ALL' && !showAnswer && allHoverVals[label] === null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm z-20"
                style={{ left: getPercent(val, max) }}
              />
            )}

            {/* 容错感应区指示线 (支持单维度与 ALL 模式悬停实时联动) */}
            {!showAnswer &&
              showToleranceBand &&
              currentHoverVal !== null &&
              (() => {
                const activeVal = currentHoverVal;
                const currentHSVTuple: [number, number, number] | undefined =
                  mode === 'ALL'
                    ? [
                        label === 'H' ? activeVal : userH,
                        label === 'S' ? activeVal : userS,
                        label === 'V' ? activeVal : userV,
                      ]
                    : undefined;

                const span = getToleranceSpan(label, activeVal, question, currentHSVTuple);
                const isWrapMode = label === 'H';

                const leftVal = isWrapMode
                  ? (activeVal - span.halfSpan + max) % max
                  : Math.max(0, activeVal - span.halfSpan);
                const rightVal = isWrapMode
                  ? (activeVal + span.halfSpan + max) % max
                  : Math.min(max, activeVal + span.halfSpan);

                const leftPct = (leftVal / max) * 100;
                const rightPct = (rightVal / max) * 100;

                return (
                  <>
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                      style={{ left: `${leftPct}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                      style={{ left: `${rightPct}%` }}
                    />
                  </>
                );
              })()}

            {/* 鼠标悬停准心 (黑色双像素竖条，支持所有模式) */}
            {!showAnswer && currentHoverVal !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 shadow-sm pointer-events-none z-30"
                style={{ left: getPercent(currentHoverVal, max) }}
              />
            )}
~~~~~

#### Acts 3: 更新右侧数值 Label 以实时反映悬停试探数值

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
        {/* 数值 Label */}
        <span
          className={`w-12 text-right font-mono font-bold text-xs ${
            isInteractiveInAll || (isTargetActiveMode && !showAnswer)
              ? showAnswer
                ? userAnswer?.isHit
                  ? 'text-emerald-600'
                  : 'text-rose-600'
                : 'text-amber-500'
              : 'text-slate-700'
          }`}
        >
          {mode === 'ALL'
            ? `${val}${unit}`
            : isTargetActiveMode && !showAnswer
              ? hoverVal !== null
                ? `${hoverVal}${unit}`
                : '?'
              : `${val}${unit}`}
        </span>
~~~~~
~~~~~typescript.new
        {/* 数值 Label */}
        <span
          className={`w-12 text-right font-mono font-bold text-xs ${
            !showAnswer && (currentHoverVal !== null || mode === 'ALL')
              ? showAnswer
                ? userAnswer?.isHit
                  ? 'text-emerald-600'
                  : 'text-rose-600'
                : 'text-amber-500'
              : 'text-slate-700'
          }`}
        >
          {!showAnswer && currentHoverVal !== null ? `${currentHoverVal}${unit}` : `${val}${unit}`}
        </span>
~~~~~

### 下一步建议
- **执行构建与校验**: 运行 `npm run check` 和 `npm run build` 确保综合拾色悬停追踪逻辑编译通过。
