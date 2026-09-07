我将为沙盒模式下的题目检查器（Inspector）抽屉右上角添加一键复制按钮。

点击后会自动将当前题目的完整结构化 JSON 写入剪贴板，并提供 2 秒的对勾（Check）反馈状态，方便开发者快速捕获极端样本或调试数据。

## [WIP] feat(inspector): 为 Inspector 抽屉添加 JSON 复制按钮

### 用户需求
在沙盒模式的 Inspector（题目检查器）抽屉右上角添加复制按钮，方便快速将当前题目的参数复制到剪贴板。

### 评论
该功能进一步提升了沙盒模式的开发者体验（DX），便于将出题引擎生成的边界样本、异常题目或算法参数直接粘贴到测试脚本或 Issue 中。

### 目标
1. 在 `TrainingShell.tsx` 中引入 `Copy` 与 `Check` 图标，并维护 `isCopied` 临时状态。
2. 在 Inspector 顶部控制栏中添加带有点击反馈的复制操作按钮。

### 基本原理
利用浏览器的 `navigator.clipboard.writeText` 异步写入格式化的 `JSON.stringify(currentQuestion, null, 2)`，并在触发后提供轻量的视觉确认状态，2 秒后自动恢复初始图标。

### 标签
#intent/build #flow/ready #priority/medium #comp/runtime #concept/ui #scope/dx #ai/instruct #task/domain/runtime #task/object/inspector-copy #task/action/implementation #task/state/continue

---

### Script

#### Acts 1: 在 `TrainingShell.tsx` 中增加 Inspector 复制逻辑与按钮组件

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
import {
  ArrowLeft,
  Clock,
  Code,
  Eye,
  FastForward,
  HelpCircle,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import {
  ArrowLeft,
  Check,
  Clock,
  Code,
  Copy,
  Eye,
  FastForward,
  HelpCircle,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useCallback, useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);

  const isSandbox = sessionType === 'sandbox';
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
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => setShowInspector?.(false)}
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
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

---

### 下一步建议
可在沙盒模式下按 `I` 键打开 Inspector，点击右上角的 `Copy` 按钮，然后直接在文本编辑器中粘贴，验证结构化 JSON 是否能够被完整、格式化地提取。
