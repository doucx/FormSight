我将根据你的 3 项精细化调整要求进行实施：
1. **Inspector 复制按钮优化**：去除“Copy”文字，仅保留图标，在点击复制成功后图标平滑变为绿色的勾（`Check`）。
2. **Card ID 交互改造**：让沙盒模式下的 Card ID 徽章支持**点击一键复制**（复制成功时图标闪烁绿勾），同时关闭系统的默认双击/划词选中（即移除 `select-all`，改为仅通过点击复制）。
3. **Inspector 标题精简**：从 Inspector 抽屉的顶栏标题中彻底移除原有的 `题目检查器 (cardId)` 文本结构。

## [WIP] feat(sandbox): 精简 Inspector 按钮、优化 Card ID 点击复制与清理标题

### 用户需求
1. Inspector 复制按钮去除文本，只保留复制图标，并在复制成功时变为绿色勾。
2. 将卡片 ID 徽章调整为**点击复制**（带有反馈），且取消其默认的文本选中行为（`select-all`）。
3. 彻底移除 Inspector 抽屉顶栏中形如“题目检查器 (cardId)”的文字标签。

### 评论
这些细节上的微调大幅提升了沙盒模式的干练度与无干扰性：卡片 ID 改为显式点击复制更符合现代 Web 开发工具的直觉，而 Inspector 移除冗余标题后显得更加紧凑。

### 目标
1. 简化 Inspector 顶栏的复制按钮为纯图标。
2. 改造 Card ID 徽章的点击事件（复用复制剪贴板与绿勾反馈逻辑），移除 `select-all` 类名。
3. 简化 Inspector 顶栏标题区。

### 基本原理
利用剪贴板 API 与状态控制，实现点击 Card ID 或复制按钮时触发短暂的动画/图标切换反馈，并移除不必要的文本框选中属性。

### 标签
#intent/refine #flow/ready #priority/medium #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/runtime #task/object/ui-tweaks #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 精简 Inspector 复制按钮为纯图标并移除冗余标题文字

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/60 text-muted-foreground font-bold">
            <span className="flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-primary" />
              {t('shell.inspector')} ({card.id})
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyQuestion}
                className="h-6 px-2 text-[11px] font-bold gap-1 text-muted-foreground hover:text-foreground"
                title="Copy JSON to clipboard"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">
                      Copied
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span className="text-[10px]">Copy</span>
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => setShowInspector?.(false)}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                title="Close"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
~~~~~
~~~~~typescript
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/60 text-muted-foreground font-bold">
            <span className="flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-primary" />
              <span>Inspector</span>
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="iconSm"
                onClick={handleCopyQuestion}
                className="h-6 w-6 text-muted-foreground hover:text-primary"
                title="Copy JSON to clipboard"
              >
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => setShowInspector?.(false)}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                title="Close"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
~~~~~

#### Acts 2: 改造 Card ID 徽章为点击复制且关闭全选，并实现卡片 ID 复制状态反馈

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const isSandbox = sessionType === 'sandbox';

  const handleCopyQuestion = useCallback(() => {
    if (!currentQuestion) return;
    const text = JSON.stringify(currentQuestion, null, 2);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy question json:', err);
      });
  }, [currentQuestion]);
~~~~~
~~~~~typescript
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isCardIdCopied, setIsCardIdCopied] = useState(false);

  const isSandbox = sessionType === 'sandbox';

  const handleCopyQuestion = useCallback(() => {
    if (!currentQuestion) return;
    const text = JSON.stringify(currentQuestion, null, 2);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy question json:', err);
      });
  }, [currentQuestion]);

  const handleCopyCardId = useCallback(() => {
    navigator.clipboard
      .writeText(card.id)
      .then(() => {
        setIsCardIdCopied(true);
        setTimeout(() => setIsCardIdCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy card id:', err);
      });
  }, [card.id]);
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
              {isSandbox && (
                <code
                  className="font-mono text-[11px] bg-muted/80 hover:bg-accent text-foreground px-1.5 py-0.5 rounded border border-border select-all cursor-text tracking-tight flex-shrink-0"
                  title="Card ID (Selectable)"
                >
                  {card.id}
                </code>
              )}
~~~~~
~~~~~typescript
              {isSandbox && (
                <button
                  type="button"
                  onClick={handleCopyCardId}
                  className="font-mono text-[11px] bg-muted/80 hover:bg-accent text-foreground px-1.5 py-0.5 rounded border border-border cursor-pointer tracking-tight flex-shrink-0 inline-flex items-center gap-1 transition-colors"
                  title="Click to copy Card ID"
                >
                  {isCardIdCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <span>{card.id}</span>
                  )}
                </button>
              )}
~~~~~

---

### 下一步建议
现在你可以进入沙盒模式：
1. 点击顶栏的卡片 ID 徽章，它会直接复制 ID 并在按钮内短暂显示绿色勾（`Copied`）。
2. 点击顶栏的 `<Code />` 打开 Inspector 检查器，右上角仅保留整洁的**纯复制图标**与**关闭按钮**，点击复制时图标瞬间变为绿色勾。
3. Inspector 抽屉顶栏已彻底移除冗余的“题目检查器”文本。
