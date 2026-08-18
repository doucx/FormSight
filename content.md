现在我们对 `generateDecontextual2AfcQuestion` 中的决定性漏洞进行彻底修复，将背景明暗与中心色物理明度解耦为两个完全正交的独立随机维度。

## [WIP] fix(relative-color): 解耦环境穿透判别 2AFC 的背景与物理明度线性共线漏洞

### 错误分析
在 `src/utils/relativeColorUtils.ts` 的 `generateDecontextual2AfcQuestion` 生成逻辑中：
- 错误地将 `bgLeftVal` 与 `bgRightVal` 的明暗赋值直接与 `largerPhysicalSide === 'A'` 进行了三元表达式硬编码绑定。
- 这导致在所有题目中，**物理更亮的中心色恒定出现在更亮的背景中**。
- 用户无需关注中心色，仅凭背景明暗即可实现 100% 正确作答，使视错觉判别训练完全失效。

### 用户需求
修复 `DECONTEXTUAL_2AFC` 题型生成算法，消除“看背景亮度即得正确答案”的漏洞，使背景明暗与中心色块物理明度完全正交独立。

### 评论
修复后，“仅看背景”的作弊策略期望正确率将降至 50%（纯随机硬币概率）。题目将以各 50% 的概率出现“逆向陷阱题（物理更亮在亮底上被压暗）”与“顺向诱导题（物理更亮在暗底上被提亮）”，真正迫使用户调动对中心色物理明度的穿透识别直觉。

### 目标
在 `src/utils/relativeColorUtils.ts` 的 `generateDecontextual2AfcQuestion` 函数中：
1. 独立随机决定左右背景明暗关系（`isLeftBgBright`）。
2. 独立随机决定左右中心色物理更亮的一侧（`largerPhysicalSide`）。
3. 确保两者构成完全正交的 2×2 实验矩阵。

### 基本原理
解除变量共线后：
- 当 `isLeftBgBright === true` 且 `largerPhysicalSide === 'A'` 时为逆向错觉陷阱题（A 在亮底看起来显暗，但物理更亮）；
- 当 `isLeftBgBright === true` 且 `largerPhysicalSide === 'B'` 时为顺向强化题（B 在暗底看起来极亮，物理也更亮）。
两种情境概率均等，彻底消除单边作弊可能。

### 标签
#intent/fix #flow/ready #priority/critical #comp/runtime #concept/state #scope/core #ai/instruct #task/domain/color #task/object/albers-2afc-orthogonality #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `src/utils/relativeColorUtils.ts` 中的 2AFC 生成算法

~~~~~act
patch_file
src/utils/relativeColorUtils.ts
~~~~~
~~~~~typescript
/**
 * 生成环境穿透判别二选一题目 (DECONTEXTUAL_2AFC)
 */
export function generateDecontextual2AfcQuestion(level: number): RelativeColorQuestionData {
  const id = `adc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  // 物理明度差异：Level 1 为 18%，Level 35 为 1.5%
  const t = (clampedLevel - 1) / 34;
  const diffPercent = Math.max(1.5, Math.round((18 * (1.5 / 18) ** t) * 10) / 10);

  const largerPhysicalSide: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';

  // 构造视错觉陷阱：物理更亮的一侧放在更亮的背景上（被压暗），物理更暗的一侧放在暗背景上（被提亮）
  const brightBgVal = Math.floor(Math.random() * 15) + 80;
  const darkBgVal = Math.floor(Math.random() * 15) + 10;

  const bgLeftVal = largerPhysicalSide === 'A' ? brightBgVal : darkBgVal;
  const bgRightVal = largerPhysicalSide === 'B' ? brightBgVal : darkBgVal;

  const baseHue = Math.floor(Math.random() * 360);
  const baseSat = Math.floor(Math.random() * 20);

  const bgLeft: [number, number, number] = [baseHue, baseSat, bgLeftVal];
  const bgRight: [number, number, number] = [baseHue, baseSat, bgRightVal];

  const baseCenterVal = Math.floor(Math.random() * 20) + 40;
  const valA = largerPhysicalSide === 'A' ? baseCenterVal + diffPercent : baseCenterVal - diffPercent;
  const valB = largerPhysicalSide === 'B' ? baseCenterVal + diffPercent : baseCenterVal - diffPercent;

  const centerColorA: [number, number, number] = [baseHue, baseSat, Math.round(valA)];
  const centerColorB: [number, number, number] = [baseHue, baseSat, Math.round(valB)];

  return {
    id,
    mode: 'DECONTEXTUAL_2AFC',
    difficultyLevel: clampedLevel,
    colorA: bgLeft,
    colorB: centerColorA,
    colorC: bgRight,
    targetD: centerColorB,
    bgLeft,
    bgRight,
    centerColorA,
    centerColorB,
    largerPhysicalSide,
    physicalValueDiff: diffPercent,
    tolerance: diffPercent,
  };
}
~~~~~
~~~~~typescript
/**
 * 生成环境穿透判别二选一题目 (DECONTEXTUAL_2AFC)
 */
export function generateDecontextual2AfcQuestion(level: number): RelativeColorQuestionData {
  const id = `adc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  // 物理明度差异：Level 1 为 18%，Level 35 为 1.5%
  const t = (clampedLevel - 1) / 34;
  const diffPercent = Math.max(1.5, Math.round((18 * (1.5 / 18) ** t) * 10) / 10);

  // 1. 独立随机决定：哪一侧背景更亮（完全独立于中心色，A 亮与 B 亮各 50% 概率）
  const isLeftBgBright = Math.random() < 0.5;
  const brightBgVal = Math.floor(Math.random() * 15) + 80;
  const darkBgVal = Math.floor(Math.random() * 15) + 10;
  const bgLeftVal = isLeftBgBright ? brightBgVal : darkBgVal;
  const bgRightVal = isLeftBgBright ? darkBgVal : brightBgVal;

  const baseHue = Math.floor(Math.random() * 360);
  const baseSat = Math.floor(Math.random() * 20);

  const bgLeft: [number, number, number] = [baseHue, baseSat, bgLeftVal];
  const bgRight: [number, number, number] = [baseHue, baseSat, bgRightVal];

  // 2. 独立随机决定：哪一侧中心色物理上更亮（与背景明暗完全正交）
  const largerPhysicalSide: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';

  const baseCenterVal = Math.floor(Math.random() * 20) + 40;
  const valA = largerPhysicalSide === 'A' ? baseCenterVal + diffPercent : baseCenterVal - diffPercent;
  const valB = largerPhysicalSide === 'B' ? baseCenterVal + diffPercent : baseCenterVal - diffPercent;

  const centerColorA: [number, number, number] = [baseHue, baseSat, Math.round(valA)];
  const centerColorB: [number, number, number] = [baseHue, baseSat, Math.round(valB)];

  return {
    id,
    mode: 'DECONTEXTUAL_2AFC',
    difficultyLevel: clampedLevel,
    colorA: bgLeft,
    colorB: centerColorA,
    colorC: bgRight,
    targetD: centerColorB,
    bgLeft,
    bgRight,
    centerColorA,
    centerColorB,
    largerPhysicalSide,
    physicalValueDiff: diffPercent,
    tolerance: diffPercent,
  };
}
~~~~~

### 下一步建议
1. 在本地启动界面进行多轮“环境穿透判别”测试，验证：
   - 亮背景下既可能出现物理更亮的色块（逆向陷阱题），也可能出现物理更暗的色块（顺向诱导题）。
   - 用户无法再依靠背景明暗进行单一规则猜测。
2. 确认各项测试正常后可组织下一步的优化或提交。
