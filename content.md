好的，我发现了这个问题。在 `SessionSummaryModal.tsx` 中，“稳态”两字被硬编码为中文，导致在英文环境下出现 `trials (0% 稳态)` 的中英混杂。我们将复用已有多语言词条 `card.statusOptimal`、`card.statusAscending` 和 `card.statusExploring` 进行动态国际化解析。

以下是修复计划。

## [WIP] fix: 修复 SessionSummaryModal 中的中文硬编码并复用稳态国际化状态

### 错误分析
在 `src/components/modals/SessionSummaryModal.tsx` 第 133 行附近，直接拼接了硬编码字符串 `"({accuracy}% 稳态)"`，导致在切换为英文（en-US）或其他非中文语系时，页面仍渲染中文字符“稳态”，违反了 i18n 多语言规范。

### 用户需求
移除硬编码的“稳态”文字，复用已在 `zh-CN.json` 和 `en-US.json` 中定义的状态词条（`card.statusOptimal`、`card.statusAscending`、`card.statusExploring`），根据结算命中率动态展示多语言算法状态。

### 评论
修复该问题不仅消除了国际化语系下的语言混杂瑕疵，而且通过动态算法状态反馈，让用户在结算时能直观了解当前会话是处在“稳态调优区 (Optimal Zone)”、“快速攀升 (Ascending)”还是“深水极限探索 (Exploring)”。

### 目标
1. 在 `SessionSummaryModal.tsx` 中编写 `getConvergenceStatusText` 辅助函数，基于 `accuracy` 返回对应多语言状态。
2. 将硬编码的 `"({accuracy}% 稳态)"` 替换为响应式的动态多语言格式 `({accuracy}% • {getConvergenceStatusText()})`。

### 基本原理
根据当前轮次总命中率判断收敛阶段：
- 70%~85% 映射为 `card.statusOptimal`（稳态调优中 / Optimal Zone）；
- >85% 映射为 `card.statusAscending`（快速攀升中 / Ascending）；
- <70% 映射为 `card.statusExploring`（深水摸索中 / Exploring）。
通过 `t(...)` 调取对应词典词条，实现完全的国际化自适应。

### 标签
#intent/fix #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/session-summary-i18n-fix #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 替换 SessionSummaryModal 中的硬编码中文为多语言稳态状态

在 `SessionSummaryModal.tsx` 中增加稳态判定解析并应用到界面渲染中。

~~~~~act
patch_file
src/components/modals/SessionSummaryModal.tsx
~~~~~
~~~~~tsx.old
  const avgResponseTimeSec =
    totalTrials > 0
      ? (history.reduce((acc, curr) => acc + curr.responseTimeMs, 0) / totalTrials / 1000).toFixed(
          1,
        )
      : '0.0';

  useEffect(() => {
~~~~~
~~~~~tsx.new
  const avgResponseTimeSec =
    totalTrials > 0
      ? (history.reduce((acc, curr) => acc + curr.responseTimeMs, 0) / totalTrials / 1000).toFixed(
          1,
        )
      : '0.0';

  const getConvergenceStatusText = () => {
    if (accuracy >= 70 && accuracy <= 85) {
      return t('card.statusOptimal');
    }
    if (accuracy > 85) {
      return t('card.statusAscending');
    }
    return t('card.statusExploring');
  };

  useEffect(() => {
~~~~~

~~~~~act
patch_file
src/components/modals/SessionSummaryModal.tsx
~~~~~
~~~~~tsx.old
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-foreground font-mono">{totalTrials}</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {t('common.trialsUnit')} ({accuracy}% 稳态)
              </span>
            </div>
~~~~~
~~~~~tsx.new
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-foreground font-mono">{totalTrials}</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {t('common.trialsUnit')} ({accuracy}% • {getConvergenceStatusText()})
              </span>
            </div>
~~~~~

### 下一步建议
1. 切换中英文语言（zh-CN / en-US）完成一轮做答，确认弹窗显示为 `trials (80% • Optimal Zone)` 和 `题 (80% • 稳态调优中)`。
