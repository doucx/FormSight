好的，我将为您实现“鼠标按住并拖动滑块时，无论 `enableHoverColorPreview` 开关状态如何，都强制实时同步更新颜色预览与数值，并且让当前调节的数值（如 `userH`）随鼠标按住拖动实时跟随，产生流畅真实的滑块拖动感”。

下面为您生成实施计划：

## [WIP] refactor(color): 支持综合拾色鼠标按住并拖动时强制实时同步更新与拖动感

### 用户需求
在综合拾色（ALL）模式中：
1. 当用户鼠标**按住并拖动**滑块时，无论偏好设置中的“综合拾色悬停颜色实时联动”开关是否关闭，都必须实时同步更新渲染颜色预览和当前数值。
2. 鼠标拖动时，当前调节的维度（如 `userH` 等）实时跟随鼠标移动，产生流畅的“拖动感”。

### 评论
拖动交互是调色板中最核心的直觉体验。通过监听鼠标按下（`onMouseDown` / `onPointerDown`）以及全局拖动事件（`onPointerMove` / `onPointerUp`），确保用户在按住拖动时获得 100% 响应的实时反馈。

### 目标
1. 扩展 `src/components/ColorCanvas.tsx`，引入拖动状态 (`isDragging`) 与指针事件监听。
2. 在拖动过程中实时更新 `userH` / `userS` / `userV` 状态并触发颜色预览联动。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color-recognition #task/object/comprehensive-color-dragging #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 为 ColorCanvas 增加指针拖动交互支持

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
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
  const [draggingLabel, setDraggingLabel] = useState<'H' | 'S' | 'V' | null>(null);

  const maxVal = mode === 'H' ? 360 : 100;

  // 计算并应用数值更新
  const updateValueFromClientX = (label: 'H' | 'S' | 'V', clientX: number, trackEl: HTMLDivElement | null) => {
    if (!trackEl) return;
    const rect = trackEl.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const currentMax = label === 'H' ? 360 : 100;
    const val = Math.round(ratio * currentMax);

    if (mode === 'ALL') {
      if (label === 'H') setUserH(val);
      else if (label === 'S') setUserS(val);
      else if (label === 'V') setUserV(val);
      setAllHoverVals((prev) => ({ ...prev, [label]: val }));
    } else {
      setHoverVal(val);
    }
  };

  // 指针按下开始拖动
  const handlePointerDown = (label: 'H' | 'S' | 'V', e: PointerEvent, trackEl: HTMLDivElement | null) => {
    if (disabled || showAnswer || !trackEl) return;
    setDraggingLabel(label);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateValueFromClientX(label, e.clientX, trackEl);
  };

  // 指针移动
  const handlePointerMove = (label: 'H' | 'S' | 'V', e: PointerEvent, trackEl: HTMLDivElement | null) => {
    if (disabled || showAnswer || !trackEl) return;
    if (draggingLabel === label) {
      updateValueFromClientX(label, e.clientX, trackEl);
    } else {
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
    }
  };

  // 指针释放结束拖动
  const handlePointerUp = (label: 'H' | 'S' | 'V', e: PointerEvent, trackEl: HTMLDivElement | null) => {
    if (draggingLabel === label) {
      setDraggingLabel(null);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      if (mode !== 'ALL' && trackEl) {
        const rect = trackEl.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const ratio = clickX / rect.width;
        const selectedVal = Math.round(ratio * maxVal);
        setHoverVal(null);
        onAnswer(selectedVal);
      }
    }
  };

  const handleMouseLeave = (label?: 'H' | 'S' | 'V') => {
    if (draggingLabel) return;
    if (mode === 'ALL' && label) {
      setAllHoverVals((prev) => ({ ...prev, [label]: null }));
    } else {
      setHoverVal(null);
    }
  };
~~~~~

#### Acts 2: 更新 renderSliderRow 的事件绑定与渲染逻辑

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

            {/* ALL 模式下的当前设定值标记 (无论是否悬停均始终显示) */}
            {mode === 'ALL' && !showAnswer && (
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
          onPointerDown={(e) => handlePointerDown(label, e, trackRefs[label].current)}
          onPointerMove={(e) => handlePointerMove(label, e, trackRefs[label].current)}
          onPointerUp={(e) => handlePointerUp(label, e, trackRefs[label].current)}
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
          className={`relative flex-1 flex items-center select-none touch-none ${
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

            {/* 当前设定值标记 (无论是否悬停均始终显示) */}
            {!showAnswer && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm z-20"
                style={{ left: getPercent(val, max) }}
              />
            )}

            {/* 容错感应区指示线 */}
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

            {/* 鼠标悬停准心 */}
            {!showAnswer && currentHoverVal !== null && currentHoverVal !== val && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 shadow-sm pointer-events-none z-30 opacity-75"
                style={{ left: getPercent(currentHoverVal, max) }}
              />
            )}
~~~~~

#### Acts 3: 调整右侧颜色预览以支持拖动时无论设置如何均强制实时联动

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-75"
              style={{
                backgroundColor: hsvToHex(
                  enableHoverColorPreview && allHoverVals.H !== null ? allHoverVals.H : userH,
                  enableHoverColorPreview && allHoverVals.S !== null ? allHoverVals.S : userS,
                  enableHoverColorPreview && allHoverVals.V !== null ? allHoverVals.V : userV,
                ),
              }}
            />
~~~~~
~~~~~typescript.new
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-75"
              style={{
                backgroundColor: hsvToHex(
                  draggingLabel === 'H' || (enableHoverColorPreview && allHoverVals.H !== null) ? (draggingLabel === 'H' ? userH : (allHoverVals.H ?? userH)) : userH,
                  draggingLabel === 'S' || (enableHoverColorPreview && allHoverVals.S !== null) ? (draggingLabel === 'S' ? userS : (allHoverVals.S ?? userS)) : userS,
                  draggingLabel === 'V' || (enableHoverColorPreview && allHoverVals.V !== null) ? (draggingLabel === 'V' ? userV : (allHoverVals.V ?? userV)) : userV,
                ),
              }}
            />
~~~~~

### 下一步建议
- **执行构建与校验**: 运行 `npm run check` 及 `npm run build` 确保指针拖动与状态联动逻辑编译通过。
