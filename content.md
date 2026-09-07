我将把沙盒模式中新引入的 `Copied` 状态文案接入 i18n 国际化多语言系统（支持中英文自动切换）。

## [WIP] feat(i18n): 将沙盒 Inspector 的 Copied 反馈文案接入多语言系统

### 用户需求
将沙盒 Inspector 复制成功后的 `Copied` 提示文本接入 i18n 体系，使系统支持简体中文与英文无缝切换。

### 评论
国际化规范要求所有向用户展示的界面文本均需通过词典托管，接入 i18n 后能确保中英文环境下的体验一致性。

### 目标
1. 在 `src/locales/zh-CN.json` 和 `src/locales/en-US.json` 中增加 `copied` 键。
2. 在 `TrainingShell.tsx` 中使用 `t('shell.copied')` 替换硬编码字符串。

### 基本原理
利用系统现有的 `useTranslation` / `useCardTranslation` 多语言管理器，动态解析 `shell.copied`。

### 标签
#intent/refine #flow/ready #priority/low #comp/runtime #concept/ui #scope/dx #ai/instruct #task/domain/runtime #task/object/i18n-copied #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 在中英文词典中注册 `shell.copied`

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json
    "sandbox": "沙盒演练",
    "regenerate": "换一题",
    "revealAnswer": "直接揭晓",
    "inspector": "题目检查器",
    "experimental": "实验性模块",
~~~~~
~~~~~json
    "sandbox": "沙盒演练",
    "regenerate": "换一题",
    "revealAnswer": "直接揭晓",
    "inspector": "题目检查器",
    "copied": "已复制",
    "experimental": "实验性模块",
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json
    "sandbox": "Sandbox",
    "regenerate": "New Question",
    "revealAnswer": "Reveal",
    "inspector": "Question Inspector",
    "experimental": "Experimental",
~~~~~
~~~~~json
    "sandbox": "Sandbox",
    "regenerate": "New Question",
    "revealAnswer": "Reveal",
    "inspector": "Question Inspector",
    "copied": "Copied",
    "experimental": "Experimental",
~~~~~

#### Acts 2: 在 `TrainingShell.tsx` 中使用 `t('shell.copied')`

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
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
~~~~~

---

### 下一步建议
切换系统的语言设置（中文/English），测试点击卡片 ID 或 Inspector 复制按钮时显示的 `已复制` / `Copied` 反馈是否能随语言即时切换。
