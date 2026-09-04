我已经制定了实施方案的第一步与第二步，并编写了用于全量卡片迁移的自动化重构脚本。

我们将按顺序执行：
1. **重构核心契约 (`src/core/cardContract.ts` 与 `src/card-sdk/index.ts`)**：声明独立的 `CardEngineContract`（计算领域层）与 `CardUIContract`（表现层），并升级 `CardManifest` 以双轨兼容方式同时支持新旧字段；
2. **适配宿主消费侧 (`src/core/registry.ts`、`src/views/GenericTrainingView.tsx` 与 `src/components/modals/SettingsModal.tsx`)**：解耦表现层与计算层，优先消费 `engine` 与 `ui` 属性；
3. **编写并执行自动化迁移脚本 (`scripts/migrate-card-manifests.mjs`)**：精准重构 `src/cards/*/index.tsx` 中的所有 32 张卡片，将 Manifest 全量无缝升级至 `engine + ui` 架构。

## [WIP] refactor: 解耦 CardManifest 领域逻辑与表现层并实施卡片自动迁移

### 用户需求
实施步骤一（重构核心领域契约）与步骤二（适配宿主消费端），并编写一个自动化迁移脚本来处理步骤三（将所有卡片 Manifest 平滑迁移到 `engine` + `ui` 新解耦结构）。

### 评论
当前架构中，卡片 Manifest 内部将业务计算（出题、判题、分数抽样）与 UI 渲染（`icon`、`renderCanvas`、`renderSettings`）混排，导致领域层跨界耦合了 Preact 渲染机制。通过双轨兼容的渐进式重构，既保持卡片即插即用的自包含优势，又在接口和语义边界上划清了领域计算与视图表现；同时借助脚本批量重构，避免手工修改 32 张卡片可能引入的格式或人为疏漏。

### 目标
1. 在 `src/core/cardContract.ts` 中解耦定义 `CardEngineContract` 与 `CardUIContract`，更新 `CardManifest` 契约，并在 `src/card-sdk/index.ts` 导出相应类型。
2. 更新 `src/core/registry.ts`、`src/views/GenericTrainingView.tsx` 与 `src/components/modals/SettingsModal.tsx`，优先读取 `engine` 与 `ui` 属性，保持对老字段的回退兼容。
3. 编写 `scripts/migrate-card-manifests.mjs` 并在环境中运行，自动将 `src/cards/` 目录下全部卡片升级为 `engine` + `ui` 结构。

### 基本原理
通过在契约层提供联合/兼容类型（`engine?: ...`, `ui?: ...`, `training?: ...`），宿主消费端使用 Nullish Coalescing 操作符 (`manifest.engine ?? manifest.training!`) 进行平滑回退，使得重构期间系统不会产生任何破坏性中断。随后利用基于语法闭合深度扫描（Balanced Brackets Scanner）的 Node.js 脚本，对 32 个卡片的 `index.tsx` 进行自底向上倒序替换，精确分离出纯领域逻辑与视图回调，确保代码格式和语法绝对安全。

### 标签
#intent/refine #flow/ready #priority/high #comp/core #concept/executor #scope/core #scope/api #ai/instruct #task/domain/architecture #task/object/card-manifest-decoupling #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 重构契约层以支持 engine 与 ui 解耦 (`src/core/cardContract.ts`)

在核心契约中抽象出专司出题与判题计算的 `CardEngineContract` 以及专司渲染绑定的 `CardUIContract`，在 `CardManifest` 中建立标准结构并对旧属性保持向后兼容。

~~~~~act
patch_file
src/core/cardContract.ts
~~~~~
~~~~~typescript.old
export interface CardManifest<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  /** 1. 全局唯一标识与分类标签 */
  id: string;
  domain: VisualDomainTag;
  tags: CardTags;
  icon: (props: { className?: string }) => ComponentChildren;

  /** 2. 个性化设置项定义与默认值 */
  renderSettings?: (props: {
    settings: TSettings;
    updateSettings: (patch: Partial<TSettings>) => void;
  }) => ComponentChildren;
  defaultSettings?: Partial<TSettings>;

  /** 3. 自包含多语言词典 */
  locales?: {
    'zh-CN': Record<string, unknown>;
    'en-US': Record<string, unknown>;
  };

  /** 4. 训练引擎核心逻辑闭环 */
  training: {
    isTargeting?: (settings: TSettings) => boolean;
    generateQuestion: (level: number, settings: TSettings) => TQuestion;
    evaluateAnswer: (userVal: TAnswerVal, question: TQuestion) => THitResult;
    isHit: (hitResult: THitResult) => boolean;
    getQuestionLevel?: (question: TQuestion) => number;
    extractRecordDetails?: (
      question: TQuestion,
      hitResult: THitResult,
      userVal: TAnswerVal,
    ) => Record<string, unknown>;
    renderCanvas: (
      props: CardCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings>,
    ) => ComponentChildren;
  };

  /** 5. 专属能力分析视图 (可选) */
  analytics?: {
    views: CardAnalyticsView[];
    fetchRecords?: (cardId: string) => Promise<UnifiedTrialRecord[]>;
  };
}
~~~~~
~~~~~typescript.new
/**
 * 纯领域计算与规则契约 (0 UI 依赖理念，仅负责出题、判分与数据提取)
 */
export interface CardEngineContract<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  isTargeting?: (settings: TSettings) => boolean;
  generateQuestion: (level: number, settings: TSettings) => TQuestion;
  evaluateAnswer: (userVal: TAnswerVal, question: TQuestion) => THitResult;
  isHit: (hitResult: THitResult) => boolean;
  getQuestionLevel?: (question: TQuestion) => number;
  extractRecordDetails?: (
    question: TQuestion,
    hitResult: THitResult,
    userVal: TAnswerVal,
  ) => Record<string, unknown>;
}

/**
 * 表现层绑定契约 (声明 Web 视图渲染、图标与设置弹窗组件注入)
 */
export interface CardUIContract<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  icon: (props: { className?: string }) => ComponentChildren;
  renderCanvas: (
    props: CardCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings>,
  ) => ComponentChildren;
  renderSettings?: (props: {
    settings: TSettings;
    updateSettings: (patch: Partial<TSettings>) => void;
  }) => ComponentChildren;
}

export interface CardManifest<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  /** 1. 全局唯一标识与分类标签 */
  id: string;
  domain: VisualDomainTag;
  tags: CardTags;
  defaultSettings?: Partial<TSettings>;

  /** 2. 自包含多语言词典 */
  locales?: {
    'zh-CN': Record<string, unknown>;
    'en-US': Record<string, unknown>;
  };

  /** 3. 核心领域逻辑 (推荐) */
  engine?: CardEngineContract<TQuestion, THitResult, TAnswerVal, TSettings>;

  /** 4. 表现层绑定 (推荐) */
  ui?: CardUIContract<TQuestion, THitResult, TAnswerVal, TSettings>;

  /** 5. 专属能力分析视图 (可选) */
  analytics?: {
    views: CardAnalyticsView[];
    fetchRecords?: (cardId: string) => Promise<UnifiedTrialRecord[]>;
  };

  // --- 兼容旧字段 (过渡期向后兼容) ---
  icon?: (props: { className?: string }) => ComponentChildren;
  renderSettings?: (props: {
    settings: TSettings;
    updateSettings: (patch: Partial<TSettings>) => void;
  }) => ComponentChildren;
  training?: CardEngineContract<TQuestion, THitResult, TAnswerVal, TSettings> & {
    renderCanvas: (
      props: CardCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings>,
    ) => ComponentChildren;
  };
}
~~~~~

#### Acts 2: 在 SDK 中导出新增的引擎与 UI 契约类型 (`src/card-sdk/index.ts`)

将解耦出来的 `CardEngineContract` 与 `CardUIContract` 暴露给卡片 SDK，供各个卡片按需类型约束。

~~~~~act
patch_file
src/card-sdk/index.ts
~~~~~
~~~~~typescript.old
export type {
  CardManifest,
  CardCanvasProps,
  CardAnalyticsView,
} from '../core/cardContract';
~~~~~
~~~~~typescript.new
export type {
  CardManifest,
  CardCanvasProps,
  CardAnalyticsView,
  CardEngineContract,
  CardUIContract,
} from '../core/cardContract';
~~~~~

#### Acts 3: 适配注册中心中的 CardDefinition 提取 (`src/core/registry.ts`)

在 `registerCard` 时优先从 `card.ui?.icon` 获取卡片图标，平滑兼容 `card.icon`。

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
    // 2. 构建标准 CardDefinition
    const cardDef: CardDefinition = {
      id: card.id,
      domain: card.domain,
      icon: card.icon,
      tags: card.tags,
      hasWeaknessAnalytics: Boolean(card.analytics?.views?.length),
      defaultSettings: card.defaultSettings,
    };
~~~~~
~~~~~typescript.new
    // 2. 构建标准 CardDefinition
    const icon = card.ui?.icon ?? card.icon!;
    const cardDef: CardDefinition = {
      id: card.id,
      domain: card.domain,
      icon,
      tags: card.tags,
      hasWeaknessAnalytics: Boolean(card.analytics?.views?.length),
      defaultSettings: card.defaultSettings,
    };
~~~~~

#### Acts 4: 适配训练运行视图的逻辑与画布调度 (`src/views/GenericTrainingView.tsx`)

让通用训练视图 `GenericTrainingView` 明确区分出 `engine`（领域规则）与 `renderCanvas`（视图渲染回调），优先消费新契约。

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript.old
  const domain = card.domain;
  const training = manifest.training;

  const session = useTrainingSession<TQuestion, THitResult, TAnswerVal>({
    domain,
    cardId: card.id,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    targetLimitTrials,
    onTargetLimitReached,
    onIdleChange,
    onIdleResume,
    generateQuestion: (level) => training.generateQuestion(level, settings),
    evaluateAnswer: (userVal, q) => training.evaluateAnswer(userVal, q),
    isHit: (hitResult) => training.isHit(hitResult),
    saveTrialRecord: async ({
      sessionId,
      question: q,
      hitResult,
      responseTimeMs,
      userVal,
      currentProfileLevel,
    }) => {
      const qLevel =
        training.getQuestionLevel?.(q) ??
        (q as { difficultyLevel?: number })?.difficultyLevel ??
        initialLevel;

      await saveTrialRecord(
        {
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sessionId,
          cardId: card.id,
          domain,
          timestamp: Date.now(),
          difficultyLevel: qLevel,
          isHit: training.isHit(hitResult),
          responseTimeMs,
          details: training.extractRecordDetails?.(q, hitResult, userVal) ?? {},
        },
        currentProfileLevel,
      );
    },
    saveSession: async ({
      sessionId,
      totalTrials: t,
      hitTrials: h,
      ended,
      startTimestamp,
      endLevel,
    }) => {
      await saveSession({
        id: sessionId,
        cardId: card.id,
        domain,
        type: sessionType,
        startTimestamp,
        endTimestamp: ended ? Date.now() : undefined,
        totalTrials: t,
        hitTrials: h,
        startLevel: initialLevel,
        endLevel,
      });
    },
    onExit,
  });

  const isTargeting = training.isTargeting ? training.isTargeting(settings) : false;

  const currentLevel = session.question
    ? (training.getQuestionLevel?.(session.question) ??
      (session.question as { difficultyLevel?: number })?.difficultyLevel ??
      initialLevel)
    : initialLevel;

  return (
    <TrainingShell
      card={card}
      sessionType={sessionType}
      currentLevel={currentLevel}
      isTargeting={isTargeting}
      autoNext={settings.autoNext}
      session={session}
      showExitButton={showExitButton}
      showTimer={showTimer}
      onExit={onExit}
    >
      {({ disabled, isIdle }) =>
        training.renderCanvas({
          question: session.question,
          showAnswer: session.showAnswer,
          userAnswer: session.userAnswer,
          onAnswer: session.handleAnswer,
          disabled,
          isIdle,
          settings: {
            ...settings,
            sliderHitMargin:
              globalSettings?.sliderHitMargin ??
              (settings.sliderHitMargin as number | undefined) ??
              12,
            showCanvasHints:
              globalSettings?.showCanvasHints ??
              (settings.showCanvasHints as boolean | undefined) ??
              true,
          },
        })
      }
    </TrainingShell>
  );
~~~~~
~~~~~typescript.new
  const domain = card.domain;
  const engine = manifest.engine ?? manifest.training!;
  const renderCanvas = manifest.ui?.renderCanvas ?? manifest.training!.renderCanvas;

  const session = useTrainingSession<TQuestion, THitResult, TAnswerVal>({
    domain,
    cardId: card.id,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    targetLimitTrials,
    onTargetLimitReached,
    onIdleChange,
    onIdleResume,
    generateQuestion: (level) => engine.generateQuestion(level, settings),
    evaluateAnswer: (userVal, q) => engine.evaluateAnswer(userVal, q),
    isHit: (hitResult) => engine.isHit(hitResult),
    saveTrialRecord: async ({
      sessionId,
      question: q,
      hitResult,
      responseTimeMs,
      userVal,
      currentProfileLevel,
    }) => {
      const qLevel =
        engine.getQuestionLevel?.(q) ??
        (q as { difficultyLevel?: number })?.difficultyLevel ??
        initialLevel;

      await saveTrialRecord(
        {
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sessionId,
          cardId: card.id,
          domain,
          timestamp: Date.now(),
          difficultyLevel: qLevel,
          isHit: engine.isHit(hitResult),
          responseTimeMs,
          details: engine.extractRecordDetails?.(q, hitResult, userVal) ?? {},
        },
        currentProfileLevel,
      );
    },
    saveSession: async ({
      sessionId,
      totalTrials: t,
      hitTrials: h,
      ended,
      startTimestamp,
      endLevel,
    }) => {
      await saveSession({
        id: sessionId,
        cardId: card.id,
        domain,
        type: sessionType,
        startTimestamp,
        endTimestamp: ended ? Date.now() : undefined,
        totalTrials: t,
        hitTrials: h,
        startLevel: initialLevel,
        endLevel,
      });
    },
    onExit,
  });

  const isTargeting = engine.isTargeting ? engine.isTargeting(settings) : false;

  const currentLevel = session.question
    ? (engine.getQuestionLevel?.(session.question) ??
      (session.question as { difficultyLevel?: number })?.difficultyLevel ??
      initialLevel)
    : initialLevel;

  return (
    <TrainingShell
      card={card}
      sessionType={sessionType}
      currentLevel={currentLevel}
      isTargeting={isTargeting}
      autoNext={settings.autoNext}
      session={session}
      showExitButton={showExitButton}
      showTimer={showTimer}
      onExit={onExit}
    >
      {({ disabled, isIdle }) =>
        renderCanvas({
          question: session.question,
          showAnswer: session.showAnswer,
          userAnswer: session.userAnswer,
          onAnswer: session.handleAnswer,
          disabled,
          isIdle,
          settings: {
            ...settings,
            sliderHitMargin:
              globalSettings?.sliderHitMargin ??
              (settings.sliderHitMargin as number | undefined) ??
              12,
            showCanvasHints:
              globalSettings?.showCanvasHints ??
              (settings.showCanvasHints as boolean | undefined) ??
              true,
          },
        })
      }
    </TrainingShell>
  );
~~~~~

#### Acts 5: 适配偏好设置弹窗组件中的渲染入口 (`src/components/modals/SettingsModal.tsx`)

在 `SettingsModal` 中优先尝试获取 `manifest.ui.renderSettings`，兼容回退至顶层 `manifest.renderSettings`。

~~~~~act
patch_file
src/components/modals/SettingsModal.tsx
~~~~~
~~~~~typescript.old
        {/* 渲染卡片专属设置组件 */}
        {(() => {
          const manifest = registry.getCardManifest(card.id);
          if (manifest?.renderSettings) {
            return (
              <div className="pt-2 border-t border-border/60">
                {manifest.renderSettings({
                  settings: cardConfig,
                  updateSettings: updateCardConfig,
                })}
              </div>
            );
          }
          return null;
        })()}
~~~~~
~~~~~typescript.new
        {/* 渲染卡片专属设置组件 */}
        {(() => {
          const manifest = registry.getCardManifest(card.id);
          const renderSettings = manifest?.ui?.renderSettings ?? manifest?.renderSettings;
          if (renderSettings) {
            return (
              <div className="pt-2 border-t border-border/60">
                {renderSettings({
                  settings: cardConfig,
                  updateSettings: updateCardConfig,
                })}
              </div>
            );
          }
          return null;
        })()}
~~~~~

#### Acts 6: 创建卡片 Manifest 自动化迁移脚本 (`scripts/migrate-card-manifests.mjs`)

编写自动化重构脚本。该脚本基于语法闭合深度扫描，精准提取每张卡片 `index.tsx` 中的 `icon`、`renderSettings`、`training` 与其内部的 `renderCanvas`，将其重构成符合最新架构规范的 `engine` 与 `ui` 属性块，并倒序安全替换。

~~~~~act
write_file
scripts/migrate-card-manifests.mjs
~~~~~
~~~~~javascript
import fs from 'node:fs';
import path from 'node:path';

function extractProperty(source, propName) {
  const regex = new RegExp(`(^|\\n)([ \\t]*)${propName}\\s*:\\s*`, 'm');
  const match = regex.exec(source);
  if (!match) return null;
  const startIndex = match.index + match[1].length;
  const valueStartIndex = match.index + match[0].length;
  const indent = match[2];

  let i = valueStartIndex;
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let inString = false;
  let stringChar = '';

  while (i < source.length) {
    const ch = source[i];
    const prev = source[i - 1];

    if (inString) {
      if (ch === stringChar && prev !== '\\') {
        inString = false;
      }
    } else {
      if (ch === '"' || ch === "'" || ch === '`') {
        inString = true;
        stringChar = ch;
      } else if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth--;
      else if (ch === '{') braceDepth++;
      else if (ch === '}') {
        if (braceDepth === 0 && parenDepth === 0 && bracketDepth === 0) {
          break;
        }
        braceDepth--;
      } else if (ch === '[') bracketDepth++;
      else if (ch === ']') bracketDepth--;
      else if (ch === ',' && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
        i++;
        break;
      }
    }
    i++;
  }

  let endIndex = i;
  if (source[endIndex] === '\n') endIndex++;

  const rawValue = source.slice(valueStartIndex, i).trim().replace(/,\s*$/, '');

  return {
    startIndex,
    endIndex,
    indent,
    rawValue,
  };
}

const cardsDir = path.resolve('src/cards');
const cardDirs = fs.readdirSync(cardsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

let migratedCount = 0;

for (const cardName of cardDirs) {
  const indexPath = path.join(cardsDir, cardName, 'index.tsx');
  if (!fs.existsSync(indexPath)) continue;

  let content = fs.readFileSync(indexPath, 'utf-8');

  // 如果已经包含 engine: 和 ui:，跳过
  if (content.includes('engine:') && content.includes('ui:')) {
    console.log(`[SKIP] Already migrated: ${cardName}`);
    continue;
  }

  const iconProp = extractProperty(content, 'icon');
  const renderSettingsProp = extractProperty(content, 'renderSettings');
  const trainingProp = extractProperty(content, 'training');

  if (!iconProp || !trainingProp) {
    console.warn(`[WARN] Missing icon or training in: ${cardName}`);
    continue;
  }

  // 从 training 中抽离 renderCanvas
  const trainingVal = trainingProp.rawValue; // "{ ... }"
  if (!trainingVal.startsWith('{') || !trainingVal.endsWith('}')) {
    console.warn(`[WARN] Unexpected training value structure in: ${cardName}`);
    continue;
  }

  const innerTraining = trainingVal.slice(1, -1);
  const renderCanvasProp = extractProperty(innerTraining, 'renderCanvas');

  if (!renderCanvasProp) {
    console.warn(`[WARN] Missing renderCanvas inside training in: ${cardName}`);
    continue;
  }

  const remainingInner = (
    innerTraining.slice(0, renderCanvasProp.startIndex) +
    innerTraining.slice(renderCanvasProp.endIndex)
  ).trim();

  // 格式化 engine 内容
  const baseIndent = trainingProp.indent;
  const engineBlock = `${baseIndent}engine: {\n${remainingInner
    .split('\n')
    .map((line) => (line.trim() ? line : ''))
    .join('\n')}\n${baseIndent}},`;

  // 格式化 ui 内容
  const innerIndent = `${baseIndent}  `;
  const uiItems = [];
  uiItems.push(`${innerIndent}icon: ${iconProp.rawValue},`);
  if (renderSettingsProp) {
    uiItems.push(`${innerIndent}renderSettings: ${renderSettingsProp.rawValue},`);
  }
  uiItems.push(`${innerIndent}renderCanvas: ${renderCanvasProp.rawValue},`);

  const uiBlock = `${baseIndent}ui: {\n${uiItems.join('\n')}\n${baseIndent}},`;

  // 倒序替换源文件，确保前面的 offset 不被改动
  const replacements = [];
  replacements.push({
    start: iconProp.startIndex,
    end: iconProp.endIndex,
    replacement: '',
  });

  if (renderSettingsProp) {
    replacements.push({
      start: renderSettingsProp.startIndex,
      end: renderSettingsProp.endIndex,
      replacement: '',
    });
  }

  replacements.push({
    start: trainingProp.startIndex,
    end: trainingProp.endIndex,
    replacement: `${engineBlock}\n${uiBlock}\n`,
  });

  replacements.sort((a, b) => b.start - a.start);

  for (const rep of replacements) {
    content = content.slice(0, rep.start) + rep.replacement + content.slice(rep.end);
  }

  // 清理多余连续空行
  content = content.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(indexPath, content, 'utf-8');
  console.log(`[OK] Successfully migrated: ${cardName}`);
  migratedCount++;
}

console.log(`\nMigration completed: ${migratedCount} cards processed.`);
~~~~~

### 下一步建议
- **执行构建与类型检查**：运行 `npm run build` 或 `npx tsc --noEmit`，验证 32 张卡片及其类型定义是否全部顺利通过 TypeScript 类型检查。
- **清理过渡脚本**：在验证迁移结果无误后，删除临时工具文件 `scripts/migrate-card-manifests.mjs`。
- **添加 ESLint 纯洁性守护规则**：在 `eslint.config.js` 中配置禁止 `src/cards/*/utils/**` 导入 Preact/JSX 相关依赖的规则，永久防止表现层逻辑倒流侵入纯算法层。
