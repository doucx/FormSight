我将为你创建并执行卡片依赖路径批量重构脚本。在执行脚本前，我们先在 `src/card-sdk/index.ts` 中补齐卡片分析视图（如扇区罗盘图、热力图、色相偏差图）和局部放大镜（Loupe）所需的辅助能力，随后运行自动化重构脚本将所有卡片内部对宿主的相对依赖全面替换为 `@formsight/card-sdk`。

## [WIP] refactor: 自动化重构 cards 目录深层路径为 SDK 统一导入

### 用户需求
1. 补齐 `src/card-sdk/index.ts` 中部分卡片分析图表及放大镜 Hook 等必要导出。
2. 编写独立 Node.js 自动化重构脚本 `scripts/migrate-cards-sdk.mjs`，递归遍历 `src/cards/` 下的所有源码文件。
3. 准确识别跨越卡片边界指向宿主（`core/`、`utils/`、`components/`、`storage/`、`hooks/`、全局 `types/`）的相对路径，将其安全合并并重定向为从 `@formsight/card-sdk` 引入。
4. 保持卡片私有目录内（如 `./types`、`../types`、`./utils/generator`、`./locales/*.json`）的相对依赖不变。
5. 执行该迁移脚本，完成全部卡片的物理路径解耦。

### 评论
手动修改 20+ 个卡片及其子目录的几十个文件不仅耗时且极易引入命名遗漏或格式冲突。采用自动化 AST/正则词法提取与依赖归并脚本，能确保导入语句的整洁性、无重名与一致性。

### 目标
1. 在 `src/card-sdk/index.ts` 中导出 `UnifiedTrialRecord`、`SectorStat`、`renderCompassCanvas`、`renderHeatmapCanvas`、`usePointLoupe` 等宿主特性。
2. 创建 `scripts/migrate-cards-sdk.mjs` 并在项目中执行，自动化更新 `src/cards/` 下所有文件。

### 基本原理
通过 Node.js 文件系统递归遍历 `src/cards/`，使用匹配宿主跨边界路径的正则过滤出所有的 import 语句，将导入的具体标识符区分为类型导入（`type`）与值导入，提取并去重后重新生成指向 `@formsight/card-sdk` 的规范引入，彻底斩断卡片对宿主物理目录层级的知识依赖。

### 标签
#intent/refine #flow/ready #priority/high #comp/interfaces #concept/config #scope/dx #scope/core #ai/instruct #task/domain/architecture #task/object/card-sdk #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 补齐 Card SDK 的分析视图与放大镜 Hook 导出

在执行迁移前，确保卡片分析图表和点阵做答时所需的放大镜及分析类型在 SDK 中可用。

~~~~~act
write_file
src/card-sdk/index.ts
~~~~~
~~~~~typescript
/**
 * ============================================================================
 * 🚀 FormSight Card Developer SDK
 * ============================================================================
 * 所有独立卡片 (src/cards/*) 应通过本 SDK 引入宿主能力，严禁使用脆弱的深层相对路径穿透访问宿主内部实现。
 */

// ----------------------------------------------------------------------------
// 1. 核心数学算法与噪声 (Math & Procedural Noise)
// ----------------------------------------------------------------------------
export { expDecayInterpolate, createShuffledChoices } from '../core/math/mathUtils';
export {
  createNoise2D,
  fbm2D,
  calculateOtsuThreshold,
  type Noise2DFunction,
} from '../core/math/noiseUtils';

// ----------------------------------------------------------------------------
// 2. 空间几何与离散网格计算 (Geometry & Point Grid)
// ----------------------------------------------------------------------------
export {
  calcPointDistance,
  findNearestPointInGrid,
  evaluatePointGridHit,
  type NearestGridPointResult,
  type PointHitDetectionResult,
} from '../core/geometry/pointGrid';

// ----------------------------------------------------------------------------
// 3. 色彩感知与 OKLab 均匀空间 (Color Models & OKLab/OKLCH)
// ----------------------------------------------------------------------------
export {
  hsvToHex,
  generateColorQuestion,
  checkColorHit,
  getToleranceSpan,
  type ColorMode,
  type ColorQuestionData,
  type ColorHitResult,
  type ToleranceSpan,
  type ColorQuestionGenerateOptions,
} from '../core/color/colorUtils';
export {
  hsvToOkLab,
  calcDeltaEOk,
  getOkChroma,
  getTargetDeltaEForLevel,
  okLabToHsv,
  isOkLabInGamut,
  hasGamutMargin,
  getDistractorDistanceForLevel,
  generateTetrahedralDistractors,
} from '../core/color/oklchUtils';

// ----------------------------------------------------------------------------
// 4. Canvas 高清渲染、图元工具与分析图表 (Canvas HiDPI & Primitives & Charts)
// ----------------------------------------------------------------------------
export {
  setupHiDpiCanvas,
  setup2DCanvas,
  initSquareHiDpiCanvas,
  type InitSquareCanvasResult,
} from '../core/canvas/hidpi';
export {
  renderInteractivePointGrid,
  getGridMinSpacing,
  getDynamicDotRadius,
  getDynamicCrosshairMetrics,
  drawDot,
  type RenderInteractivePointGridOptions,
} from '../core/canvas/drawPointGrid';
export { drawPolygonCanvas, type DrawPolygonOptions } from '../core/canvas/drawPolygon';
export { renderCompassCanvas, type SectorStat } from '../core/canvas/charts/drawCompass';
export { renderHueRingCanvas } from '../core/canvas/charts/drawColorRing';
export {
  calcSignedHueBias,
  renderHueBiasChartCanvas,
} from '../core/canvas/charts/drawHueBiasChart';
export { renderHeatmapCanvas } from '../core/canvas/charts/drawHeatmap';

// ----------------------------------------------------------------------------
// 5. 交互 Hook (Interactive Hooks)
// ----------------------------------------------------------------------------
export {
  LOUPE_DIAMETER,
  usePointLoupe,
  type UsePointLoupeOptions,
} from '../hooks/usePointLoupe';

// ----------------------------------------------------------------------------
// 6. 国际化与契约规范 (I18n & Card Contracts)
// ----------------------------------------------------------------------------
export {
  useCardTranslation,
  createScopedTranslator,
  getCardTitle,
  getCardDesc,
  type ScopedTranslator,
} from '../core/i18n';
export type {
  CardManifest,
  CardCanvasProps,
  CardAnalyticsView,
} from '../core/cardContract';
export {
  calculateBasicOverallStats,
  type BaseInteractiveCardProps,
} from '../core/contracts';

// ----------------------------------------------------------------------------
// 7. 主题 Token、样式与时间工具 (Theme, Styling & Formatting)
// ----------------------------------------------------------------------------
export {
  CANVAS_THEME,
  PALETTE,
  HUE_SPECTRUM_GRADIENT,
  hexToRgba,
  getAccuracyColor,
  getAccuracyFillColor,
  getAccuracyBadgeClass,
  isDarkMode,
  getCurrentResolvedTheme,
  getCanvasTheme,
  type CanvasThemeTokens,
} from '../utils/theme';
export { cn } from '../utils/cn';
export { formatSecondsToTimer } from '../utils/time';

// ----------------------------------------------------------------------------
// 8. 共享数据类型与存储模型 (Data Types & Storage Models)
// ----------------------------------------------------------------------------
export type { Point, Size, Rect, HSVTuple, OKLabTuple } from '../types';
export type {
  BaseModuleSettings,
  StarSettings,
  ColorSenseSettings,
  RelativeColorSettings,
  NegativeSpaceSettings,
  AbstractionSettings,
  StepGranularity,
  AdaptiveMode,
  TargetingMode,
} from '../storage/settings';
export type { UnifiedTrialRecord } from '../storage/db/schema';
export type {
  CardDefinition,
  CardTags,
  VisualDomainTag,
  CognitivePathTag,
  MentalChallengeTag,
  InteractionTag,
  CardStatusTag,
} from '../types/card';

// ----------------------------------------------------------------------------
// 9. 基础通用交互组件 (UI Primitives & Common Views)
// ----------------------------------------------------------------------------
export { CanvasView, type CanvasViewProps } from '../components/common/CanvasView';
export { DualViewportContainer } from '../components/common/DualViewportContainer';
export { PointClickCanvas, type PointClickCanvasProps } from '../components/common/PointClickCanvas';
export { HsvTrackSlider, type HsvTrackSliderProps } from '../components/common/HsvTrackSlider';
export { QuestionCardShell } from '../components/common/QuestionCardShell';
export {
  Choice2AfcContainer,
  type Choice2AfcOption,
} from '../components/common/Choice2AfcContainer';
export {
  ChoiceNafcContainer,
  type ChoiceNafcOption,
} from '../components/common/ChoiceNafcContainer';
export {
  ChoiceCard,
  getChoiceCardState,
  type ChoiceCardState,
  type ChoiceCardProps,
} from '../components/ui/choice-card';
export { Button, type ButtonProps } from '../components/ui/button';
export { Badge, type BadgeProps } from '../components/ui/badge';
export { Callout, type CalloutProps } from '../components/ui/callout';
export { SettingToggleItem } from '../components/settings/common/SettingToggleItem';
export { SliderMarginGroup } from '../components/settings/common/SliderMarginGroup';

// ----------------------------------------------------------------------------
// 10. 废弃标记的过渡视图包装器 (Deprecated Standard Views for Graceful Migration)
// ----------------------------------------------------------------------------
/** @deprecated 建议优先使用组合排版与原子 Hook，后续将移除此包装器 */
export {
  StandardSliderView,
  type StandardSliderViewProps,
} from '../components/common/StandardSliderView';

/** @deprecated 建议优先使用组合排版与原子 Hook，后续将移除此包装器 */
export {
  Standard2AfcView,
  type Standard2AfcViewProps,
} from '../components/common/Standard2AfcView';

/** @deprecated 建议优先使用组合排版与原子 Hook，后续将移除此包装器 */
export {
  StandardNafcView,
  type StandardNafcViewProps,
} from '../components/common/StandardNafcView';
~~~~~

#### Acts 2: 编写自动化依赖重构脚本 `scripts/migrate-cards-sdk.mjs`

该脚本将递归分析 `src/cards/` 下的每一个 TypeScript 文件，自动归集宿主 import 并替换为 `@formsight/card-sdk`。

~~~~~act
write_file
scripts/migrate-cards-sdk.mjs
~~~~~
~~~~~javascript
import fs from 'node:fs';
import path from 'node:path';

const CARDS_DIR = path.resolve('src/cards');
const SDK_MODULE = '@formsight/card-sdk';

/**
 * 判断 importPath 是否跨出了卡片自身目录并指向了宿主内部实现
 */
function isHostImportPath(importPath) {
  // 匹配指向宿主内部系统的相对路径
  if (
    importPath.includes('/core/') ||
    importPath.includes('/utils/') ||
    importPath.includes('/components/') ||
    importPath.includes('/storage/') ||
    importPath.includes('/hooks/')
  ) {
    return true;
  }

  // 匹配指向全局 src/types 的相对路径 (至少两个 ../，排除卡片私有的 ./types 与 ../types)
  if (/^\.\.\/(\.\.\/)+types(\.ts)?$/.test(importPath)) {
    return true;
  }

  return false;
}

/**
 * 递归收集指定目录下的所有 .ts / .tsx 文件
 */
function getFilesRecursively(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * 处理单文件内容，将宿主相对引用转换为 SDK 引用
 */
function transformFileContent(content) {
  // 匹配所有形如 import ... from '...'; 的语句 (支持多行)
  const importRegex = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?/g;

  const valueSpecifiers = new Set();
  const typeSpecifiers = new Set();
  const retainedImportStatements = [];

  let lastIndex = 0;
  let match;
  let modified = false;

  // 逐个匹配文件顶部的 import
  while ((match = importRegex.exec(content)) !== null) {
    const fullStatement = match[0];
    const rawClause = match[1].trim();
    const sourcePath = match[2].trim();

    if (isHostImportPath(sourcePath)) {
      modified = true;
      const isWholeStatementType = rawClause.startsWith('type ');
      const innerClause = isWholeStatementType ? rawClause.slice(5).trim() : rawClause;

      // 提取大括号中的命名导出项
      const braceMatch = innerClause.match(/^\{([\s\S]*)\}$/);
      if (braceMatch) {
        const items = braceMatch[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        for (const item of items) {
          if (isWholeStatementType) {
            typeSpecifiers.add(item.replace(/^type\s+/, ''));
          } else if (item.startsWith('type ')) {
            typeSpecifiers.add(item.replace(/^type\s+/, '').trim());
          } else {
            valueSpecifiers.add(item);
          }
        }
      }
    } else {
      retainedImportStatements.push({
        start: match.index,
        end: importRegex.lastIndex,
        raw: fullStatement,
      });
    }

    lastIndex = importRegex.lastIndex;
  }

  if (!modified) {
    return null; // 无需更改
  }

  // 截取所有 import 语句之后的代码主体
  const bodyCode = content.slice(lastIndex).trimStart();

  // 构建新 import 语句列表
  const newSdkStatements = [];

  if (valueSpecifiers.size > 0) {
    const sortedValues = Array.from(valueSpecifiers).sort();
    if (sortedValues.length > 3) {
      newSdkStatements.push(
        `import {\n  ${sortedValues.join(',\n  ')},\n} from '${SDK_MODULE}';`,
      );
    } else {
      newSdkStatements.push(`import { ${sortedValues.join(', ')} } from '${SDK_MODULE}';`);
    }
  }

  if (typeSpecifiers.size > 0) {
    const sortedTypes = Array.from(typeSpecifiers).sort();
    if (sortedTypes.length > 3) {
      newSdkStatements.push(
        `import type {\n  ${sortedTypes.join(',\n  ')},\n} from '${SDK_MODULE}';`,
      );
    } else {
      newSdkStatements.push(`import type { ${sortedTypes.join(', ')} } from '${SDK_MODULE}';`);
    }
  }

  // 保留的其它 import
  const otherImports = retainedImportStatements.map((s) => s.raw).join('\n');

  const combinedHeader = [otherImports, newSdkStatements.join('\n')]
    .filter(Boolean)
    .join('\n');

  return `${combinedHeader}\n\n${bodyCode}`;
}

async function run() {
  console.log('🔍 开始扫描卡片文件:', CARDS_DIR);
  const files = getFilesRecursively(CARDS_DIR);
  console.log(`📑 找到 ${files.length} 个卡片源代码文件`);

  let transformedCount = 0;

  for (const file of files) {
    const originalContent = fs.readFileSync(file, 'utf-8');
    const transformed = transformFileContent(originalContent);

    if (transformed && transformed !== originalContent) {
      fs.writeFileSync(file, transformed, 'utf-8');
      transformedCount++;
      const relPath = path.relative(process.cwd(), file);
      console.log(`✅ 已重构: ${relPath}`);
    }
  }

  console.log(`\n🎉 重构完成！共计重构 ${transformedCount} 个文件。`);
}

run();
~~~~~

#### Acts 3: 执行自动化迁移脚本

执行脚本更新所有卡片文件中的引用。

~~~~~act
run_command
~~~~~
~~~~~
node scripts/migrate-cards-sdk.mjs
~~~~~

### 下一步建议
1. **类型与构建检查**：运行 `pnpm build` 或 `tsc --noEmit` 校验所有卡片是否均成功通过 TypeScript 编译且无类型错误。
2. **推进第二阶段重构**：针对 `StandardNafcView`、`Standard2AfcView` 等被标记为 `@deprecated` 的大视图包装器，开始逐个 Card 提炼原子 Hook 与自由组合排版。
