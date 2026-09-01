这个问题是由于 `settingSchemas` 中的选项文本（如 `'4x4'`）在注册时被 `qualifySchemas` 自动拼上了 `cards.<cardId>.` 命名空间前缀，而在多语言词典中未命中该 key 时，`i18n.t` 直接返回了未解析的完整 key 路径。

我将生成一个计划，在设置渲染的文本解析回退逻辑中，当翻译未命中时自动剥离 `cards.<cardId>.` 前缀还原为原始字面量，从而正确显示 `'4x4'`。

## [WIP] fix: 修复卡片设置选项中字面量文本显示为完整未翻译 key 的问题

### 错误分析
1. **前缀修饰机制**: 在 `src/core/registry.ts` 的 `qualifySchemas` 中，所有卡片设置项的字符串（包括 `buttonGroup` 选项的 `label: '4x4'`）都会被 `qualifyCardKey` 自动拼装为 `cards.${cardId}.${key}` 格式（即 `cards.star_double_h.4x4`）。
2. **翻译回退失效**: `DynamicDomainSettings.tsx` 中的 `resolveText` 函数使用 `t(text)` 查找翻译；当字典中不存在该 key 时，`t()` 将原样返回传入的 key（即 `'cards.star_double_h.4x4'`）。此时 `resolveText` 中的 `translated !== text` 断言为 `false`，导致直接回退输出了带前缀的完整 key。
3. **连带位置**: `TargetingSection.tsx` 中扇区 label 同样直接使用 `t(name) || name`，未对未命中翻译的带前缀 key 做还原保护。

### 用户需求
卡片设置中的选项标签（如 `2x2`, `3x3`, `4x4`, `5x5`）应正确显示为字面量本身，而不是未翻译的内部 key 路径 `cards.star_double_h.4x4`。

### 评论
这是一个在组件与多语言 key 自动命名空间映射中的典型边界问题。通过在文本解析解析器中加入前缀剥离保护，既能保留开发者使用相对 i18n key 的能力，又能完美支持直接使用英文/数字等纯字面量选项。

### 目标
1. 在 `src/components/settings/DynamicDomainSettings.tsx` 的 `resolveText` 中增加对 `cards.` 前缀的未命中回退处理。
2. 在 `src/components/settings/common/TargetingSection.tsx` 的扇区名称解析中增加相同的安全回退保护。

### 基本原理
当 `t(text)` 的返回值与 `text` 相同（说明多语言表中未找到该 key 的条目）时，检查 `text` 是否以 `cards.` 开头。如果是，则将其开头的 `cards.<cardId>.` 命名空间剥离，还原为定义设置项时所填写的原始字符串 `4x4`。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #concept/config #scope/ux #ai/instruct #task/domain/ui #task/object/setting-labels #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 优化 `DynamicDomainSettings.tsx` 中的 `resolveText` 逻辑

在翻译未命中时，自动剥离 `cards.<cardId>.` 命名空间前缀，还原原始字面量文本。

~~~~~act
patch_file
src/components/settings/DynamicDomainSettings.tsx
~~~~~
~~~~~typescript.old
  const resolveText = (text?: string): string => {
    if (!text) return '';
    const translated = t(text);
    return translated !== text ? translated : text;
  };
~~~~~
~~~~~typescript.new
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

#### Acts 2: 增强 `TargetingSection.tsx` 中的扇区文本安全回退

确保扇区标签在未命中词典时也能安全还原。

~~~~~act
patch_file
src/components/settings/common/TargetingSection.tsx
~~~~~
~~~~~typescript.old
            {sectors.map((name, idx) => {
              const selected = selectedSectors.includes(idx);
              const label = t(name) || name;
              return (
                <Button
                  key={name}
                  variant={selected ? 'accent' : 'outline'}
                  size="sm"
                  onClick={() => onToggleSector(idx)}
                  className="py-1.5 px-1 text-xs h-auto"
                >
                  {label}
                </Button>
              );
            })}
~~~~~
~~~~~typescript.new
            {sectors.map((name, idx) => {
              const selected = selectedSectors.includes(idx);
              const translated = t(name);
              const label =
                translated !== name
                  ? translated
                  : name.startsWith('cards.')
                    ? name.split('.').slice(2).join('.')
                    : name;
              return (
                <Button
                  key={name}
                  variant={selected ? 'accent' : 'outline'}
                  size="sm"
                  onClick={() => onToggleSector(idx)}
                  className="py-1.5 px-1 text-xs h-auto"
                >
                  {label}
                </Button>
              );
            })}
~~~~~

### 下一步建议
- 执行该计划后，打开卡片设置弹窗，验证 `2x2`, `3x3`, `4x4`, `5x5` 按钮组以及其他设置项是否均正常渲染。
- 确认无误后可进行下一步测试或准备生成 Git 提交。
