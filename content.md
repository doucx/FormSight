你的发现非常关键。第一步清理了卡片私有词典中的 `instruction` 后，上层消费端（`TrainingShell.tsx`、`registry.ts`）以及卡片类型定义（`types/card.ts`）中仍然残留着对 `instruction` 的旧读取逻辑，导致训练界面的要领弹窗和搜索索引无法正确读取到已收敛的 `hint`。

现在我们对系统核心层进行同步重构，将消费端逻辑彻底对齐到 `hint`。

## [WIP] refactor(core): 收敛系统层对卡片 hint 字段的读取与搜索逻辑

### 用户需求
修复卡片私有词典移除 `instruction` 后，上层系统模块依然遗留对 `instruction` 的引用与查询的问题：
1. `src/components/training/TrainingShell.tsx` 仍尝试从 `cards.${card.id}.instruction` 读取操作指引。
2. `src/core/registry.ts` 搜索索引匹配仍检索 `cards.${c.id}.instruction`。
3. `src/types/card.ts` 的 `CardDefinition` 接口仍保留已废弃的 `instruction?: string` 属性。

### 评论
卡片私有词典重构必须与消费端闭环，否则会导致 `TrainingShell` 的“玩法要领”帮助气泡无法取得卡片原本的操作提示，同时搜索大盘也无法基于新的 `hint` 关键字过滤卡片。这一步重构彻底完成了全链路对 `hint` 的规范统一。

### 目标
1. 在 `TrainingShell.tsx` 中将 `instruction` 读取逻辑切换为 `t("cards.${card.id}.hint")`。
2. 在 `registry.ts` 中将搜索条件中的 `cards.${c.id}.instruction` 替换为 `cards.${c.id}.hint`。
3. 清理 `src/types/card.ts` 中废弃的 `instruction?: string` 声明。

### 基本原理
根据规范细则，“操作指引统一定名为 `hint`”。上层视图与注册表不再保留任何卡片级 `instruction` 映射，统一归口为 `hint`，保证运行时消费与多语言词典完全契合。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/core #scope/dx #ai/instruct #task/domain/testing #task/object/locales-schema #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 更新 CardDefinition 类型定义

移除 `CardDefinition` 中废弃的 `instruction?: string` 字段声明。

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~typescript
export interface CardDefinition {
  id: string;
  domain: VisualDomainTag;
  title?: string;
  desc?: string;
  instruction?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  defaultSettings?: Record<string, unknown>;
}
~~~~~
~~~~~typescript
export interface CardDefinition {
  id: string;
  domain: VisualDomainTag;
  title?: string;
  desc?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  defaultSettings?: Record<string, unknown>;
}
~~~~~

#### Acts 2: 更新注册表倒排检索中的卡片提示词键名

将搜索匹配逻辑从 `cards.${c.id}.instruction` 切换为 `cards.${c.id}.hint`。

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
          const instructionKey = `cards.${c.id}.instruction`;
          const instruction = i18n.t(instructionKey);
          if (instruction !== instructionKey && instruction.toLowerCase().includes(kw)) {
            return true;
          }
~~~~~
~~~~~typescript
          const hintKey = `cards.${c.id}.hint`;
          const hint = i18n.t(hintKey);
          if (hint !== hintKey && hint.toLowerCase().includes(kw)) {
            return true;
          }
~~~~~

#### Acts 3: 更新 TrainingShell 训练壳的玩法要领读取逻辑

在 `TrainingShell` 中读取 `cards.${card.id}.hint`，并以此驱动玩法要领气泡的内容展示。

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
  const cardTitle = getCardTitle(card, t);
  const instruction = t(`cards.${card.id}.instruction`) || card.instruction || '';
  const desc = getCardDesc(card, t);
~~~~~
~~~~~typescript
  const cardTitle = getCardTitle(card, t);
  const hint = t(`cards.${card.id}.hint`) || '';
  const desc = getCardDesc(card, t);
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
              {(instruction || desc) && (
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => setShowHelpTooltip(!showHelpTooltip)}
                  onMouseEnter={() => setShowHelpTooltip(true)}
                  onMouseLeave={() => setShowHelpTooltip(false)}
                  className="text-muted-foreground hover:text-primary p-0.5 h-6 w-6 flex-shrink-0"
                  title={t('shell.instructionTitle')}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {showHelpTooltip && (instruction || desc) && (
              <div className="absolute left-0 top-full mt-2 z-40 w-72 bg-card dark:bg-muted text-white p-3 rounded-2xl shadow-xl border border-border dark:border-border text-xs leading-relaxed animate-in fade-in zoom-in-95 duration-150">
                <div className="font-bold text-indigo-300 mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  {t('shell.instructionTitle')}
                </div>
                <p className="text-muted-foreground text-xs">{instruction || desc}</p>
              </div>
            )}
~~~~~
~~~~~typescript
              {(hint || desc) && (
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => setShowHelpTooltip(!showHelpTooltip)}
                  onMouseEnter={() => setShowHelpTooltip(true)}
                  onMouseLeave={() => setShowHelpTooltip(false)}
                  className="text-muted-foreground hover:text-primary p-0.5 h-6 w-6 flex-shrink-0"
                  title={t('shell.instructionTitle')}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {showHelpTooltip && (hint || desc) && (
              <div className="absolute left-0 top-full mt-2 z-40 w-72 bg-card dark:bg-muted text-white p-3 rounded-2xl shadow-xl border border-border dark:border-border text-xs leading-relaxed animate-in fade-in zoom-in-95 duration-150">
                <div className="font-bold text-indigo-300 mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  {t('shell.instructionTitle')}
                </div>
                <p className="text-muted-foreground text-xs">{hint || desc}</p>
              </div>
            )}
~~~~~

### 下一步建议
目前卡片词典与系统核心消费端已经完全清除对 `instruction` 的依赖并统一对齐到 `hint`。接下来建议执行**第二步（测试门禁加固）**：
- 在 `src/cards/__tests__/locales-schema.test.ts` 中将 `'instruction'` 与 `'taskHint'` 补入 `FORBIDDEN_ALIAS_KEYS` 黑名单，确保未来新增或修改卡片时无法再次引入此类废弃字段。
