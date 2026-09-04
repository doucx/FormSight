## [WIP] fix(lint): 修复 Biome 静态检查发现的 prototype 原型方法、表达式赋值及显式 any 警告

### 错误分析

静态检查工具 (Biome) 发现了以下三处违反代码规范的代码：
1. **`lint/suspicious/noPrototypeBuiltins`**：在 `scripts/check-i18n.mjs` 中直接调用了对象实例的 `hasOwnProperty` 方法，现代规范推荐使用更安全的 `Object.hasOwn()`。
2. **`lint/suspicious/noAssignInExpressions`**：在 `scripts/check-i18n.mjs` 中使用了 `while ((match = T_CALL_REGEX.exec(content)) !== null)` 将正则匹配赋值放在了表达式内，可以通过现代的 `content.matchAll()` 循环优雅替代。
3. **`lint/suspicious/noExplicitAny`**：在 `SettingsModal.tsx` 中向 `manifest.renderSettings` 传参时使用了 `as any` 类型断言，应当使用更严谨的 `Record<string, unknown>`。

### 用户需求

清理上述三类 Lint 警告，确保整个代码库符合现代 JavaScript/TypeScript 严格静态规范。

### 评论

严格遵守 Lint 规范有助于提高代码的健壮性与可维护性。消除这些警告后，项目的代码质量将达到更高的标准。

### 目标

1. 重构 `scripts/check-i18n.mjs`，改用 `Object.hasOwn` 和 `matchAll`。
2. 重构 `src/components/modals/SettingsModal.tsx`，将 `any` 断言替换为 `Record<string, unknown>` 与 `Partial<BaseModuleSettings>`。

### 基本原理

利用现代 JS 语言特性 (`Object.hasOwn`, `matchAll`) 替代陈旧的副作用表达式和原型方法；在 TypeScript 中通过精确的窄化类型转换替代 `any`，保持类型系统健康。

### 标签

#intent/refine #flow/ready #priority/medium #comp/build #concept/config #scope/dx #ai/refine #task/domain/core #task/object/lint-fixes #task/action/refactor #task/state/end

---

### Script

#### Acts 1: 清理 check-i18n.mjs 中的原形方法与表达式赋值警告

~~~~~act
patch_file
scripts/check-i18n.mjs
~~~~~
~~~~~javascript.old
function checkKeyExists(key, cardId, vGlobal) {
  if (cardId && !isExplicitGlobal(key)) {
    const cardKey = `cards.${cardId}.${key.replace(/^\./, '')}`;
    if (vGlobal.hasOwnProperty(cardKey)) return true;
  }
  return vGlobal.hasOwnProperty(key);
}
~~~~~
~~~~~javascript.new
function checkKeyExists(key, cardId, vGlobal) {
  if (cardId && !isExplicitGlobal(key)) {
    const cardKey = `cards.${cardId}.${key.replace(/^\./, '')}`;
    if (Object.hasOwn(vGlobal, cardKey)) return true;
  }
  return Object.hasOwn(vGlobal, key);
}
~~~~~

~~~~~act
patch_file
scripts/check-i18n.mjs
~~~~~
~~~~~javascript.old
  let match;
  while ((match = T_CALL_REGEX.exec(content)) !== null) {
    const key = match[2];
    if (key.includes('${') || !key.trim()) continue;
    addMissing(relativePath, key, cardId);
  }
~~~~~
~~~~~javascript.new
  for (const match of content.matchAll(T_CALL_REGEX)) {
    const key = match[2];
    if (key.includes('${') || !key.trim()) continue;
    addMissing(relativePath, key, cardId);
  }
~~~~~


#### Acts 2: 消除 SettingsModal.tsx 中的显式 any 声明

~~~~~act
patch_file
src/components/modals/SettingsModal.tsx
~~~~~
~~~~~tsx.old
        {/* 渲染卡片专属设置组件 */}
        {(() => {
          const manifest = registry.getCardManifest(card.id);
          if (manifest?.renderSettings) {
            return (
              <div className="pt-2 border-t border-border/60">
                {manifest.renderSettings({
                  settings: cardConfig as any,
                  updateSettings: (patch) => updateCardConfig(patch as any),
                })}
              </div>
            );
          }
          return null;
        })()}
~~~~~
~~~~~tsx.new
        {/* 渲染卡片专属设置组件 */}
        {(() => {
          const manifest = registry.getCardManifest(card.id);
          if (manifest?.renderSettings) {
            return (
              <div className="pt-2 border-t border-border/60">
                {manifest.renderSettings({
                  settings: cardConfig as Record<string, unknown>,
                  updateSettings: (patch) => updateCardConfig(patch as Partial<BaseModuleSettings>),
                })}
              </div>
            );
          }
          return null;
        })()}
~~~~~

### 下一步建议

- 所有的 Lint 警告已全部清理完毕。你可以重新运行 `pnpm lint` 或相应的检查脚本验证当前代码库是否能 100% 通过静态检查。
