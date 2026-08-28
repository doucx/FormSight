我们来修复刷新后页面语言未保持为持久化语言的问题。

## [WIP] fix: 修复页面刷新后未能以持久化语言初始化的 Bug

### 错误分析
在刷新页面时，`I18nManager` 实例在单例构造时固定将 `currentLocale` 初始化为 `'zh-CN'`。各个组件在初次挂载时调用的 `useTranslation()` 获取到的均是硬编码的 `'zh-CN'`。
虽然我们在 `GlobalSettingsModal` 中将 `locale` 存储到了 `localStorage`（因而设置弹窗读取到了 `english`），但在 `I18nManager` 构造与模块加载阶段，并未从 `localStorage` 同步该 `locale`，且在 `app.tsx` 的挂载钩子中遗漏了对 `i18n.setLocale()` 的实际调用，导致主界面依旧以 `'zh-CN'` 字典渲染。

**解决方案**：
1. 在 `I18nManager` 的构造器中，自动从 `localStorage` 安全读取用户已持久化的 `locale`。
2. 在 `src/app.tsx` 中显式挂载 `useTranslation()` 并在全局状态同步时确保 `i18n.setLocale(savedLocale)` 被正确激活。

### 用户需求
确保用户在选择英语（`en-US`）或其他语言后，刷新页面能够立即且完整地以用户选择的语言渲染所有界面元素。

### 评论
该修复使 `I18nManager` 在应用生命周期的最早期（模块加载与构造期）即可获取用户的语言偏好，彻底消除首屏语言闪烁与刷新后语系状态不同步的问题。

### 目标
1. 修改 `src/core/i18n.ts`，在构造器中自动解析本地存储中的 `locale` 配置。
2. 确保在 `setLocale` 触发时通知所有订阅组件更新。
3. 在 `src/app.tsx` 中补全语言同步逻辑。

### 基本原理
浏览器端在执行 JavaScript 脚本时，模块的顶层单例 `i18n` 初始化发生于组件渲染之前。通过在 `I18nManager` 构造阶段即从 `localStorage`（通过 `formsight_user_settings`）提取持久化的 `locale`，保证了所有组件在首次渲染（SSR/CSR 初始挂载）时 `useTranslation()` 直接拿到正确的语言代码和字典分支。

### 标签
#intent/fix #flow/ready #priority/high #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/i18n-persistence #task/action/bug-fix #task/state/continue #task/status/active

---

### Script

#### Acts 1: 在 `I18nManager` 构造器中自动加载持久化语言

~~~~~act
patch_file
src/core/i18n.ts
~~~~~
~~~~~typescript.old
  constructor() {
    this.registerGlobalLocales({
      'zh-CN': zhCNGlobal as LocaleDictionary,
      'en-US': enUSGlobal as LocaleDictionary,
    });
  }
~~~~~
~~~~~typescript.new
  constructor() {
    this.registerGlobalLocales({
      'zh-CN': zhCNGlobal as LocaleDictionary,
      'en-US': enUSGlobal as LocaleDictionary,
    });

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('formsight_user_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.global?.locale) {
            this.currentLocale = parsed.global.locale;
          }
        }
      } catch {}
    }
  }
~~~~~

#### Acts 2: 在 `app.tsx` 中同步语言状态

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
  useEffect(() => {
    const savedLocale = loadSettings().global.locale;
    if (savedLocale) {
      registry; // ensure eager scanning
      // initialize locale from persistent settings
    }
    refreshProfiles();
  }, [refreshProfiles]);
~~~~~
~~~~~typescript.new
  const { locale: currentLocale, setLocale } = useTranslation();

  useEffect(() => {
    const savedLocale = loadSettings().global.locale;
    if (savedLocale && savedLocale !== currentLocale) {
      setLocale(savedLocale);
    }
    refreshProfiles();
  }, [refreshProfiles, currentLocale, setLocale]);
~~~~~

### 下一步建议
1. **刷新页面验证**：切换为 English 后刷新浏览器，验证整个主页（标题、标语、按钮、发现大盘筛选标签、卡片标题与描述）是否均完整保持为英文。
2. **切回中文验证**：在全局设置中切回“中文”，再次刷新，验证双向切换与持久化均完美无误。
