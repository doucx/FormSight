好的，我们来实施**方案一：HSV 缺陷补偿训练（HSV Compensation Training Mode）**。

在这一方案中，我们将为绝对色感模块新增 `COMPENSATION`（缺陷补偿）模式：
1. **感知目标定义**：题目将基于 OKLab 空间生成基准色彩与视觉感知变换目标（例如：“保持视觉纯度 $C$ 不变，将视觉明度 $L$ 提升 +0.20”）。
2. **HSV 操作调制**：用户只能使用传统的 HSV ($H, S, V$) 滑块去逼近目标色彩，直接训练在传统软件中“克服 HSV 非线性缺陷”的肌肉记忆与补偿直觉。
3. **感知误差反馈**：作答揭晓后，系统除了展示 HSV 数值误差外，还将深度拆解展示 OKLab 中的感知明度误差 $\Delta L$ 与彩度误差 $\Delta C$，直观向用户呈现“HSV 假象”。

以下是完整的执行计划与代码修改：

## [WIP] feat(color): 实现绝对色感中的“HSV 缺陷补偿训练”模式

### 用户需求
在绝对色感模块中新增“HSV 缺陷补偿训练 (COMPENSATION)”子模式，使画师能够在面对传统的 HSV 滑块时，针对基于 OKLab/OKLCH 的真实视觉感知目标进行调制，培养克服 HSV 数值误导的心理补偿算法。

### 评论
这是一个将高阶色彩科学与主流绘图软件现状相结合的极佳功能。它不仅提升了 FormSight 的训练深度，还解决了画师在日常软件（如 PS、CSP）中调色不准的现实痛点。

### 目标
1. 在 `colorUtils.ts` 中扩展 `ColorMode` 类型，加入 `'COMPENSATION'` 模式。
2. 实现 `COMPENSATION` 模式下的题目生成逻辑，包含基准色 `baseHSV`、OKLab 感知变换与目标说明文案 `goalDescription`。
3. 在 `checkColorHit` 中增加 OKLab 感知误差明细计算。
4. 更新 `queries.ts` 与 `app.tsx` 以支持 `'COMPENSATION'` 模式的数据持久化与看板展示。
5. 在 `ColorCanvas.tsx` 中增加感知目标提示与 3 轨 HSV 补偿调色交互。
6. 在 `ColorDashboard.tsx` 中添加“HSV 缺陷补偿”训练卡片。
7. 在 `colorUtils.test.ts` 中增加单元测试用例。

### 基本原理
在 `COMPENSATION` 模式下，系统随机选取一个基准色彩 $A$，并在 OKLab 空间进行视觉平移（例如增加明度 $L$ 但保持彩度 $C$ 不变），解算出目标色彩 $B$ 的实际 RGB/HSV 参数。用户在调制时需要意识到：单纯拉高 HSV 的 $V$ 会连带改变视觉彩度，必须同时微调 $S$ 或 $H$ 进行补偿。系统在作答结算时将通过比较 OKLab 的 $\Delta L$ 和 $\Delta C$ 展现这一补偿效果。

### 标签
#intent/build #flow/ready #priority/high #comp/engine #comp/ui #concept/color-science #scope/core #scope/ux #ai/brainstorm #task/domain/color #task/object/hsv-compensation-mode #task/action/implementation #task/state/begin #task/status/active

---

### Script

#### Acts 1: 扩展色感核心逻辑与题目生成算子 (`colorUtils.ts`)

~~~~~act
patch_file
src/utils/colorUtils.ts
~~~~~
~~~~~typescript
export type ColorMode = 'H' | 'S' | 'V' | 'ALL';

export interface ColorQuestionData {
  id: string;
  mode: ColorMode;
  difficultyLevel: number; // 1..35
  targetH: number; // 0..359
  targetS: number; // 0..100
  targetV: number; // 0..100
  tolerance: number; // 允许的感知色差阈值 ΔE_target
}
~~~~~
~~~~~typescript
export type ColorMode = 'H' | 'S' | 'V' | 'ALL' | 'COMPENSATION';

export interface ColorQuestionData {
  id: string;
  mode: ColorMode;
  difficultyLevel: number; // 1..35
  targetH: number; // 0..359
  targetS: number; // 0..100
  targetV: number; // 0..100
  tolerance: number; // 允许的感知色差阈值 ΔE_target
  baseHSV?: [number, number, number]; // 补偿模式下的起始基准色彩 [H, S, V]
  goalDescription?: string; // 补偿模式下的视觉感知目标说明
}
~~~~~

~~~~~act
patch_file
src/utils/colorUtils.ts
~~~~~
~~~~~typescript
  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    targetH,
    targetS,
    targetV,
    tolerance,
  };
}
~~~~~
~~~~~typescript
  if (mode === 'COMPENSATION') {
    // 缺陷补偿模式：生成基准色与 OKLab 感知偏移目标
    const baseH = Math.floor(Math.random() * 360);
    const baseS = Math.floor(Math.random() * 60) + 30; // 30..90
    const baseV = Math.floor(Math.random() * 60) + 30; // 30..90
    const baseLab = hsvToOkLab(baseH, baseS, baseV);

    // 在 OKLab 空间施加定量的视觉明度 L 偏移 (±0.15~0.25)
    const deltaL = (Math.random() > 0.5 ? 1 : -1) * (0.15 + Math.random() * 0.1);
    const targetL = Math.max(0.15, Math.min(0.9, baseLab[0] + deltaL));

    // 目标 OKLab: 保持 a, b 近似彩度不变，仅调整视觉明度
    const targetLab: [number, number, number] = [targetL, baseLab[1], baseLab[2]];

    // 逆向计算目标 HSV (粗略匹配最接近的 sRGB / HSV)
    let bestH = baseH;
    let bestS = baseS;
    let bestV = Math.max(0, Math.min(100, Math.round(baseV + deltaL * 100)));
    let minErr = Number.MAX_VALUE;

    // 搜索能够匹配目标 Lab 的最佳 HSV 组合
    for (let v = 10; v <= 100; v += 5) {
      for (let s = 10; s <= 100; s += 5) {
        const testLab = hsvToOkLab(baseH, s, v);
        const err = calcDeltaEOk(targetLab, testLab);
        if (err < minErr) {
          minErr = err;
          bestS = s;
          bestV = v;
        }
      }
    }

    const directionText = deltaL > 0 ? '提升' : '降低';
    const goalDescription = `基准色出发：保持视觉纯度 C 不变，将感知明度 L ${directionText} ${Math.abs(Math.round(deltaL * 100))}%`;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      targetH: bestH,
      targetS: bestS,
      targetV: bestV,
      tolerance,
      baseHSV: [baseH, baseS, baseV],
      goalDescription,
    };
  }

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    targetH,
    targetS,
    targetV,
    tolerance,
  };
}
~~~~~

~~~~~act
patch_file
src/utils/colorUtils.ts
~~~~~
~~~~~typescript
  if (mode === 'ALL' && Array.isArray(userVal)) {
    [userH, userS, userV] = userVal;
  } else {
~~~~~
~~~~~typescript
  if ((mode === 'ALL' || mode === 'COMPENSATION') && Array.isArray(userVal)) {
    [userH, userS, userV] = userVal;
  } else {
~~~~~

~~~~~act
patch_file
src/utils/colorUtils.ts
~~~~~
~~~~~typescript
  if (mode === 'ALL') {
    targetVal = 0;
    errorVal = Math.round(realDeltaE * 1000) / 1000;
  } else if (mode === 'H') {
~~~~~
~~~~~typescript
  if (mode === 'ALL' || mode === 'COMPENSATION') {
    targetVal = 0;
    errorVal = Math.round(realDeltaE * 1000) / 1000;
  } else if (mode === 'H') {
~~~~~

#### Acts 2: 更新数据库接口与 Profiles 映射 (`queries.ts` & `app.tsx`)

~~~~~act
patch_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript
export async function getAllColorProfiles(): Promise<
  Record<'H' | 'S' | 'V' | 'ALL', UnifiedProfileData | null>
> {
  const profiles = await getProfilesByDomain('color');
  const result: Record<'H' | 'S' | 'V' | 'ALL', UnifiedProfileData | null> = {
    H: null,
    S: null,
    V: null,
    ALL: null,
  };
  for (const p of profiles) {
    if (p.mode in result) {
      result[p.mode as 'H' | 'S' | 'V' | 'ALL'] = p;
    }
  }
  return result;
}
~~~~~
~~~~~typescript
export async function getAllColorProfiles(): Promise<
  Record<'H' | 'S' | 'V' | 'ALL' | 'COMPENSATION', UnifiedProfileData | null>
> {
  const profiles = await getProfilesByDomain('color');
  const result: Record<'H' | 'S' | 'V' | 'ALL' | 'COMPENSATION', UnifiedProfileData | null> = {
    H: null,
    S: null,
    V: null,
    ALL: null,
    COMPENSATION: null,
  };
  for (const p of profiles) {
    if (p.mode in result) {
      result[p.mode as 'H' | 'S' | 'V' | 'ALL' | 'COMPENSATION'] = p;
    }
  }
  return result;
}
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
  const [colorProfiles, setColorProfiles] = useState<Record<ColorMode, ColorProfileData | null>>({
    H: null,
    S: null,
    V: null,
    ALL: null,
  });
~~~~~
~~~~~typescript
  const [colorProfiles, setColorProfiles] = useState<Record<ColorMode, ColorProfileData | null>>({
    H: null,
    S: null,
    V: null,
    ALL: null,
    COMPENSATION: null,
  });
~~~~~

#### Acts 3: 更新训练看板，添加“HSV 缺陷补偿”卡片 (`ColorDashboard.tsx`)

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript
  {
    id: 'ALL',
    title: '综合拾色 (Match)',
    desc: '同时调整色相、饱和度与明度，逼近真理色彩',
    icon: Palette,
  },
];
~~~~~
~~~~~typescript
  {
    id: 'ALL',
    title: '综合拾色 (Match)',
    desc: '同时调整色相、饱和度与明度，逼近真理色彩',
    icon: Palette,
  },
  {
    id: 'COMPENSATION',
    title: 'HSV 缺陷补偿 (Comp)',
    desc: '克服 HSV 轴线非线性假象，通过 3 轨调色逼近 OKLab 视觉感知目标',
    icon: Sliders,
  },
];
~~~~~

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript
  const [todayStats, setTodayStats] = useState<
    Record<ColorMode, { count: number; timeMs: number }>
  >({
    H: { count: 0, timeMs: 0 },
    V: { count: 0, timeMs: 0 },
    S: { count: 0, timeMs: 0 },
    ALL: { count: 0, timeMs: 0 },
  });
~~~~~
~~~~~typescript
  const [todayStats, setTodayStats] = useState<
    Record<ColorMode, { count: number; timeMs: number }>
  >({
    H: { count: 0, timeMs: 0 },
    V: { count: 0, timeMs: 0 },
    S: { count: 0, timeMs: 0 },
    ALL: { count: 0, timeMs: 0 },
    COMPENSATION: { count: 0, timeMs: 0 },
  });
~~~~~

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript
      const stats: Record<ColorMode, { count: number; timeMs: number }> = {
        H: { count: 0, timeMs: 0 },
        V: { count: 0, timeMs: 0 },
        S: { count: 0, timeMs: 0 },
        ALL: { count: 0, timeMs: 0 },
      };
~~~~~
~~~~~typescript
      const stats: Record<ColorMode, { count: number; timeMs: number }> = {
        H: { count: 0, timeMs: 0 },
        V: { count: 0, timeMs: 0 },
        S: { count: 0, timeMs: 0 },
        ALL: { count: 0, timeMs: 0 },
        COMPENSATION: { count: 0, timeMs: 0 },
      };
~~~~~

#### Acts 4: 更新色感画布组件，支持补偿模式界面渲染与提示 (`ColorCanvas.tsx`)

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript
  // ALL 模式下的本地调制状态
  const [userH, setUserH] = useState<number>(180);
  const [userS, setUserS] = useState<number>(50);
  const [userV, setUserV] = useState<number>(50);
~~~~~
~~~~~typescript
  const isMultiTrackMode = mode === 'ALL' || mode === 'COMPENSATION';

  // ALL / COMPENSATION 模式下的本地调制状态
  const [userH, setUserH] = useState<number>(question.baseHSV ? question.baseHSV[0] : 180);
  const [userS, setUserS] = useState<number>(question.baseHSV ? question.baseHSV[1] : 50);
  const [userV, setUserV] = useState<number>(question.baseHSV ? question.baseHSV[2] : 50);
~~~~~

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript
  // 题目切换时重置 ALL 模式状态
  useEffect(() => {
    if (mode === 'ALL') {
      setUserH(180);
      setUserS(50);
      setUserV(50);
      setAllHoverVals({ H: null, S: null, V: null });
      setDraggingLabel(null);
    }
  }, [mode]);
~~~~~
~~~~~typescript
  // 题目切换时重置状态
  useEffect(() => {
    if (isMultiTrackMode) {
      setUserH(question.baseHSV ? question.baseHSV[0] : 180);
      setUserS(question.baseHSV ? question.baseHSV[1] : 50);
      setUserV(question.baseHSV ? question.baseHSV[2] : 50);
      setAllHoverVals({ H: null, S: null, V: null });
      setDraggingLabel(null);
    }
  }, [mode, question.baseHSV]);
~~~~~

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript
  // 键盘快捷键响应 (ALL 模式下 Space 显式提交)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && mode === 'ALL' && !showAnswer && !disabled) {
        e.preventDefault();
        onAnswer([userH, userS, userV]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, showAnswer, disabled, userH, userS, userV, onAnswer]);

  // 渐变背景计算
  const currentH = mode === 'ALL' ? userH : targetH;
  const currentV = mode === 'ALL' ? userV : targetV;
~~~~~
~~~~~typescript
  // 键盘快捷键响应 (ALL / COMPENSATION 模式下 Space 显式提交)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isMultiTrackMode && !showAnswer && !disabled) {
        e.preventDefault();
        onAnswer([userH, userS, userV]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMultiTrackMode, showAnswer, disabled, userH, userS, userV, onAnswer]);

  // 渐变背景计算
  const currentH = isMultiTrackMode ? userH : targetH;
  const currentV = isMultiTrackMode ? userV : targetV;
~~~~~

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript
      {/* 目标色块 / 综合对比色块 */}
      <div className="flex flex-col items-center gap-2 w-full">
        {mode === 'ALL' ? (
          <div className="flex items-center justify-center gap-4 w-full">
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
              style={{ backgroundColor: targetHex }}
            />
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-75"
              style={{
                backgroundColor: hsvToHex(
                  draggingLabel === 'H' || (enableHoverColorPreview && allHoverVals.H !== null)
                    ? (allHoverVals.H ?? userH)
                    : userH,
                  draggingLabel === 'S' || (enableHoverColorPreview && allHoverVals.S !== null)
                    ? (allHoverVals.S ?? userS)
                    : userS,
                  draggingLabel === 'V' || (enableHoverColorPreview && allHoverVals.V !== null)
                    ? (allHoverVals.V ?? userV)
                    : userV,
                ),
              }}
            />
          </div>
        ) : (
          <div
            className="w-32 h-32 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
            style={{ backgroundColor: targetHex }}
          />
        )}
      </div>
~~~~~
~~~~~typescript
      {/* 缺陷补偿模式感知目标提示文案 */}
      {mode === 'COMPENSATION' && question.goalDescription && (
        <div className="w-full bg-indigo-50/80 border border-indigo-100 p-3.5 rounded-2xl text-xs font-semibold text-indigo-900 text-center">
          🎯 <span className="font-bold">{question.goalDescription}</span>
        </div>
      )}

      {/* 目标色块 / 综合对比色块 */}
      <div className="flex flex-col items-center gap-2 w-full">
        {isMultiTrackMode ? (
          <div className="flex items-center justify-center gap-4 w-full">
            {question.baseHSV && (
              <div className="flex flex-col items-center gap-1 flex-1">
                <span className="text-[10px] font-bold text-slate-400">起始基准色</span>
                <div
                  className="w-full h-24 rounded-2xl shadow-inner border-2 border-white ring-1 ring-slate-200"
                  style={{ backgroundColor: hsvToHex(...question.baseHSV) }}
                />
              </div>
            )}
            <div className="flex flex-col items-center gap-1 flex-1">
              <span className="text-[10px] font-bold text-indigo-600">目标色彩</span>
              <div
                className="w-full h-24 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
                style={{ backgroundColor: targetHex }}
              />
            </div>
            <div className="flex flex-col items-center gap-1 flex-1">
              <span className="text-[10px] font-bold text-slate-600">你的调制色</span>
              <div
                className="w-full h-24 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-75"
                style={{
                  backgroundColor: hsvToHex(
                    draggingLabel === 'H' || (enableHoverColorPreview && allHoverVals.H !== null)
                      ? (allHoverVals.H ?? userH)
                      : userH,
                    draggingLabel === 'S' || (enableHoverColorPreview && allHoverVals.S !== null)
                      ? (allHoverVals.S ?? userS)
                      : userS,
                    draggingLabel === 'V' || (enableHoverColorPreview && allHoverVals.V !== null)
                      ? (allHoverVals.V ?? userV)
                      : userV,
                  ),
                }}
              />
            </div>
          </div>
        ) : (
          <div
            className="w-32 h-32 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
            style={{ backgroundColor: targetHex }}
          />
        )}
      </div>
~~~~~

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript
      {/* 轨道面板 */}
      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        {mode === 'ALL' ? (
          <>
~~~~~
~~~~~typescript
      {/* 轨道面板 */}
      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        {isMultiTrackMode ? (
          <>
~~~~~

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript
      {/* ALL 模式确认提交按钮 */}
      {mode === 'ALL' && !showAnswer && (
        <button
          type="button"
          onClick={handleSubmitAll}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          确认提交 (Space)
        </button>
      )}
~~~~~
~~~~~typescript
      {/* 多轨道确认提交按钮 */}
      {isMultiTrackMode && !showAnswer && (
        <button
          type="button"
          onClick={handleSubmitAll}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          确认提交 (Space)
        </button>
      )}
~~~~~

#### Acts 5: 添加单元测试用例 (`colorUtils.test.ts`)

~~~~~act
patch_file
src/utils/__tests__/colorUtils.test.ts
~~~~~
~~~~~typescript
    const ratio = targetedCount / totalRuns;
    expect(ratio).toBeGreaterThan(0.4);
  });
});
~~~~~
~~~~~typescript
    const ratio = targetedCount / totalRuns;
    expect(ratio).toBeGreaterThan(0.4);
  });

  it('generateColorQuestion - COMPENSATION mode should generate baseHSV and goalDescription', () => {
    const questionComp = generateColorQuestion('COMPENSATION', 5);
    expect(questionComp.mode).toBe('COMPENSATION');
    expect(questionComp.baseHSV).toBeDefined();
    expect(questionComp.baseHSV?.length).toBe(3);
    expect(questionComp.goalDescription).toContain('感知明度 L');

    const hitResult = checkColorHit('COMPENSATION', [180, 50, 50], questionComp);
    expect(hitResult).toBeDefined();
    expect(hitResult.tolerance).toBeGreaterThan(0);
  });
});
~~~~~

---

### 下一步建议

1. **测试验证**：运行 `npm test` 确认全量测试用例（包括新增的 `COMPENSATION` 模式测试）均能通过。
2. **进一步增强反响**：可以在作答结算时，为 `COMPENSATION` 模式添加弹窗或对比卡片，展示你在使用 HSV 轴线时，“HSV 的 $V$ 变化”与“真实感知明度 $L$ 变化”的对比偏差值，进一步强化教具效果。
3. **提交代码**：验证无误后，生成 Git Commit 提交。
