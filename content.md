## [WIP] 清理 `DynamicDomainSettings.tsx` 中的技术债务

### 计划说明
在 `src/components/settings/DynamicDomainSettings.tsx` 中，`resolveText` 函数原本包含一段使用 `split('.').slice(2)` 的防御性解包逻辑，用于在国际化键解析失败时尝试剥离 `cards.<cardId>.` 前缀。随着系统已统一由 `qualifySchemas` 规范化注册并通过 `useCardTranslation` / `i18n` 进行标准命名空间多语言查表，这段回退逻辑已不再需要。

我将修改 `resolveText` 函数，直接通过标准多语言查表 `t(text)`，未命中时直接返回原始 Key，从而消除无意义的字符串拼接切片补丁。

~~~~~act
patch_file
src/components/settings/DynamicDomainSettings.tsx
~~~~~
~~~~~typescript.old
  const resolveText = (text?: string): string => {
    if (!text) return '';
    const translated = t(text);
    if (translated !== text) return translated;
    if (text.startsWith('cards.')) {
      const parts = text.split('.');
      if (parts.length >= 3) {
        return parts.slice(2).join('.');
      }
    }
    return text;
  };
~~~~~
~~~~~typescript.new
  const resolveText = (text?: string): string => {
    if (!text) return '';
    const translated = t(text);
    return translated !== text ? translated : text;
  };
~~~~~
