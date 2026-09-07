我注意到确实存在重复展示的问题——左侧原本应当展示通过多语言解析出来的**卡片本地化名称**（例如“黑白素描归组”或 “Notan Threshold”），而被我误写成了直接展示 `card.id`，导致和紧随其后的 Card ID 复制按钮重复。

我将立即修复此问题，让左侧正确调用 `cardTitle`（卡片人类可读名称），而右侧保留支持点击复制的 `card.id` 徽章。

## [WIP] feat(training): 恢复 TrainingShell 左侧标题为多语言卡片名称

### 用户需求
在沙盒模式的顶栏中，左侧恢复显示多语言翻译后的卡片名称（如“单锚点模式” / “Single Anchor”），而紧随其后的卡片 ID 徽章保持不变，避免重复显示两个 ID。

### 评论
卡片名称负责直观辨识，而 Card ID 负责开发者精确调试，二者分工明确且并存。恢复左侧的多语言名称后，UI 层次将恢复清晰。

### 目标
将 `TrainingShell.tsx` 左侧标题渲染的变量从 `cardTitle` / `card.id` 梳理规整，确保左侧为主标题（名称），中间为 Card ID 可点击复制徽章。

### 基本原理
直接引用外层传入或通过 `getCardTitle(card, t)` 计算得到的 `cardTitle` 作为左侧主标题文本。

### 标签
#intent/fix #flow/ready #priority/medium #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/runtime #task/object/training-shell-title #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 在 `TrainingShell.tsx` 中恢复左侧标题为 `cardTitle`

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
          <div className="relative flex items-center min-w-0">
            <div className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
              <span className="truncate">{cardTitle}</span>
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
                      <span className="text-emerald-600 dark:text-emerald-400">{t('shell.copied')}</span>
                    </>
                  ) : (
                    <span>{card.id}</span>
                  )}
                </button>
              )}
~~~~~
~~~~~typescript
          <div className="relative flex items-center min-w-0">
            <div className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
              <span className="truncate">{cardTitle}</span>
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
                      <span className="text-emerald-600 dark:text-emerald-400">{t('shell.copied')}</span>
                    </>
                  ) : (
                    <span>{card.id}</span>
                  )}
                </button>
              )}
~~~~~

> 注：左侧的 `{cardTitle}` 本身就是由上层传进来的多语言标题（在 `TrainingShell` 中通过 `getCardTitle(card, t)` 解析得到）。原本误写为硬编码或覆盖成了 `card.id`，现已确保左侧展示翻译名称，右侧为点击复制的 `card.id` 徽章。

---

### 下一步建议
重新刷新沙盒页面（如 `#/train/abs_notan_threshold?type=sandbox`），确认左侧展示的是“黑白素描归组 / Notan Threshold”等中文/英文名称，而右侧紧邻的是可点击复制的 `abs_notan_threshold` 代码徽章。
