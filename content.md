## [WIP] fix: 修复 useCardTranslation 局部翻译 Hook 对全局词典键的回退解析

### 错误分析

`useCardTranslation` 仅将以 `cards.` 或 `global.` 开头的键判定为全局键，其他所有键都会被无条件加上 `cards.<cardId>.` 前缀。当组件尝试使用 `common.*` 等全局词汇时，无法命中卡片词典且缺乏全局回退机制，导致前端界面直接展示未翻译的原始 Key 字符串。

### 用户需求

修复 `useCardTranslation` 的多语言解析逻辑，使卡片既能优先访问私有词典，又能在使用 `common.*` 等全局词汇或未命中私有词典时自动回退至全局语言包。

### 目标

1. 增强 `src/core/i18n.ts` 中的 `useCardTranslation`：
   - 识别 `common.`、`tags.`、`nav.` 等常见全局命名空间；
   - 实现“**卡片私有优先 -> 全局词典兜底**”的两级渐进回退机制。
2. 运行并补充相关测试，确保所有卡片组件的标题、提示词和候选标签均能被正确解析。

### 基本原理

在 `useCardTranslation` 中，当键不属于显式全局键时，优先查询 `cards.<cardId>.<key>`；若查表结果与查询 key 相同（表示卡片词典未命中该键），则自动降级查询全局 `key`，从而完美支持 `t('common.candidateN')`、`t('views.hint')` 等各种调用形态。

### 标签

#intent/fix #flow/ready #priority/high #comp/core #concept/parser #scope/core #scope/ux #ai/instruct #task/domain/i18n #task/object/card-translation-fallback #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 升级 `useCardTranslation` 查表与回退机制

我们更新 `src/core/i18n.ts` 中的 `useCardTranslation`，支持全局空间前缀识别和两级回退兜底。

~~~~~act
patch_file
src/core/i18n.ts
~~~~~
~~~~~typescript
/**
 * 卡片局部翻译 Hook，支持纯相对 key 自动补全为 `cards.<cardId>.<key>`
 */
export function useCardTranslation(cardId: string) {
  const { t: baseT, locale, setLocale } = useTranslation();

  const cardT = (key: string, params?: Record<string, string | number>) => {
    const isGlobal = key.startsWith('cards.') || key.startsWith('global.');
    const fullKey = isGlobal ? key : `cards.${cardId}.${key.replace(/^\./, '')}`;
    return baseT(fullKey, params);
  };

  return { t: cardT, locale, setLocale };
}
~~~~~
~~~~~typescript
/**
 * 卡片局部翻译 Hook，优先查找 `cards.<cardId>.<key>`，未命中时自动回退到全局词典
 */
export function useCardTranslation(cardId: string) {
  const { t: baseT, locale, setLocale } = useTranslation();

  const cardT = <T = string>(key: string, params?: Record<string, string | number>): T => {
    const isExplicitGlobal =
      key.startsWith('cards.') ||
      key.startsWith('common.') ||
      key.startsWith('global.') ||
      key.startsWith('tags.') ||
      key.startsWith('nav.') ||
      key.startsWith('settings.') ||
      key.startsWith('stats.') ||
      key.startsWith('plan.') ||
      key.startsWith('home.');

    if (isExplicitGlobal) {
      return baseT<T>(key, params);
    }

    const cardKey = `cards.${cardId}.${key.replace(/^\./, '')}`;
    const result = baseT<T>(cardKey, params);

    // 若未在卡片局部命名空间查找到（返回了原始拼装 key），回退尝试直接查全局
    if (typeof result === 'string' && result === cardKey) {
      return baseT<T>(key, params);
    }

    return result;
  };

  return { t: cardT, locale, setLocale };
}
~~~~~

### 下一步建议

- 启动开发服务或刷新页面，验证「色彩矢量迁移」和「补色残像调和」中的候选按钮标题已正常显示为“候选 1”、“候选 2”等文本。
- 执行 `vitest run` 确保所有多语言与组件测试通过。
