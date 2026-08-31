经过对系统设置与主题响应链路的排查，我们定位到了问题原因：`GlobalSettingsModal`（全局设置弹窗）内部维护了独立的 `settings` state，在修改主题配置后仅将数据写入了 `localStorage` 并触发了异步的 `onDataChanged`（`refreshProfiles`），但并未通过类似 `SettingsModal` 的 `onSave` 回调将最新配置即时向上同步给顶层 `App` 组件的 `settings` 状态。这导致顶层的 `useTheme(settings)` 钩子无法在点击瞬间捕获到主题变更，`document.documentElement` 上的 `dark` 类未能被即时移除，从而出现了“弹出了切换成功 Toast，但日间明亮主题未被应用”的现象。

下面我们制定并执行修复计划。

## [WIP] fix: 修复全局设置中日间模式切换未即时生效的主题响应链路

### 错误分析
1. **状态流转割裂**: `GlobalSettingsModal` 在调用 `handleUpdateGlobal({ theme: 'light' })` 时，仅执行了本地 state 更新和 `localStorage` 写入，未将变更实时同步至根组件 `App` 的 `settings` 状态。
2. **异步刷新延迟与缺乏即时回调**: `GlobalSettingsModal` 仅调用了异步的 `refreshProfiles()`，导致顶层组件依赖的 `useTheme` 钩子无法在微任务周期内立即接收到最新的主题模式。
3. **`useTheme` 回落保护缺失**: 在 `useTheme` 的同步 effect 中，当 `externalSettings?.global?.theme` 为 `undefined` 时未能统一兜底到 `'system'`，削弱了主题状态同步的稳健性。

### 用户需求
用户在全局设置面板中点击切换为日间模式（浅色模式）时，界面应即时移除暗色主题类名并渲染浅色明亮风格，确保 Toast 提示与实际视觉呈现完全一致。

### 评论
主题模式的即时视觉反馈直接决定了基础用户体验与沉浸感。通过将全局设置弹窗的状态与根组件状态单向数据流打通，不仅解决了日间模式切换失效的问题，还能使语言切换、音效开关等其他全局偏好在各级组件间无缝即时响应。

### 目标
1. 增强 `useTheme` 钩子，使外部 `settings` 变更能以更高的容错性驱动 `themeMode` 与 `document.documentElement` 的 class 切换。
2. 为 `GlobalSettingsModal` 增加 `settings` 与 `onSave` 属性支持，在用户切换设置项时立即通过回调更新根组件 state。
3. 在 `app.tsx` 中向 `GlobalSettingsModal` 注入 `settings` 与 `onSave={(newSettings) => setSettings(newSettings)}`。

### 基本原理
将 `GlobalSettingsModal` 与 `App` 组件的配置流调整为受控单向数据流模式。当用户在设置面板中点击“浅色”按钮时，`handleUpdateGlobal` 会在写入持久化存储的同时调用 `onSave`，直接触发 `App` 组件 state 更新；`App` 重新渲染使 `useTheme(settings)` 接收到 `theme = 'light'`，进而触发内部 effect 执行 `document.documentElement.classList.remove('dark')`，完成即时主题切换。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #concept/config #scope/ux #ai/instruct #task/domain/ui #task/object/theme-mode #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 增强 `useTheme` 钩子中的外部设置同步稳健性

~~~~~act
patch_file
src/hooks/useTheme.ts
~~~~~
~~~~~typescript
  // 同步外部设置传入的变更
  useEffect(() => {
    if (externalSettings?.global?.theme && externalSettings.global.theme !== themeMode) {
      setThemeMode(externalSettings.global.theme);
    }
  }, [externalSettings?.global?.theme, themeMode]);
~~~~~
~~~~~typescript
  // 同步外部设置传入的变更
  useEffect(() => {
    const nextTheme = externalSettings?.global?.theme ?? 'system';
    if (nextTheme !== themeMode) {
      setThemeMode(nextTheme);
    }
  }, [externalSettings?.global?.theme, themeMode]);
~~~~~

#### Acts 2: 让 `GlobalSettingsModal` 支持接收外部配置与即时 `onSave` 同步回调

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
interface GlobalSettingsModalProps {
  onClose: () => void;
  onDataChanged: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}

export function GlobalSettingsModal({
  onClose,
  onDataChanged,
  showToast,
}: GlobalSettingsModalProps) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  const handleUpdateGlobal = (patch: Partial<GlobalSettings>) => {
    const updated: UserSettings = {
      ...settings,
      global: {
        ...settings.global,
        ...patch,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };
~~~~~
~~~~~typescript
interface GlobalSettingsModalProps {
  settings?: UserSettings;
  onClose: () => void;
  onSave?: (newSettings: UserSettings) => void;
  onDataChanged: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}

export function GlobalSettingsModal({
  settings: externalSettings,
  onClose,
  onSave,
  onDataChanged,
  showToast,
}: GlobalSettingsModalProps) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<UserSettings>(() => externalSettings || loadSettings());

  useEffect(() => {
    if (externalSettings) {
      setSettings(externalSettings);
    }
  }, [externalSettings]);

  const handleUpdateGlobal = (patch: Partial<GlobalSettings>) => {
    const updated: UserSettings = {
      ...settings,
      global: {
        ...settings.global,
        ...patch,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onSave?.(updated);
    onDataChanged();
  };
~~~~~

#### Acts 3: 在 `App` 根组件中为 `GlobalSettingsModal` 传递 `settings` 与 `onSave`

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
          showToast={showToast}
        />
      )}
~~~~~
~~~~~typescript
      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          settings={settings}
          onClose={() => setIsGlobalSettingsOpen(false)}
          onSave={(newSettings) => setSettings(newSettings)}
          onDataChanged={refreshProfiles}
          showToast={showToast}
        />
      )}
~~~~~

### 下一步建议
1. **本地视觉验证**: 执行以上变更后，打开全局设置弹窗，分别点击“浅色”、“深色”以及“跟随系统”，验证页面是否能毫秒级平滑切换主题。
2. **测试用例验证**: 运行 `npm test` 确认各模块测试通过无回归问题。
3. **提交代码**: 验证无误后，由用户发起提交请求生成 `[COMMIT]` 计划归档此次修复。
