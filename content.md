我将弱化 `SettingsModal.tsx` 中沙盒调试入口的视觉层级。

去除抢眼的紫色大背景（`bg-purple-50`）与亮紫色高突按钮，转而采用与上方其他通用配置项（如“自动翻页开关”、“自适应算子模式”）完全一致的**标准排版结构**：
- 左侧：标准字阶的标题（`text-sm font-semibold text-foreground`）与辅助说明（`text-xs text-muted-foreground`）
- 右侧：标准次级按钮（`variant="outline"` 或 `variant="secondary"`）
- 保持整体素雅内敛，不再喧宾夺主。

## [WIP] style(settings): 弱化 SettingsModal 沙盒调试入口的视觉层级

### 用户需求
弱化卡片设置弹窗（`SettingsModal`）中沙盒入口的视觉强度（去除紫色强调背景和亮色按钮），使其样式与弹窗内其他通用配置项协调统一。

### 评论
原有的全宽亮紫色容器在偏好设置弹窗中过于抢眼。采用统一的行级排版后，沙盒模式既可随时访问，又不会干扰用户的常规训练参数配置心智。

### 目标
1. 移除紫色背景边框（`bg-purple-50`、`border-purple-200` 等）。
2. 将文字样式统一为 `text-sm font-semibold text-foreground` 与 `text-xs text-muted-foreground`。
3. 将主按钮调整为系统标准的次级轮廓按钮（`variant="outline"`，尺寸紧凑），与周围 UI 保持视觉对齐。

### 基本原理
对齐全局设置项的标准栅格与排版规范，恢复常规层级对比。

### 标签
#intent/tune #flow/ready #priority/low #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/settings-modal #task/action/style-tune #task/state/continue

---

### Script

#### Acts 1: 重构 `SettingsModal.tsx` 中沙盒调试入口样式

~~~~~act
patch_file
src/components/modals/SettingsModal.tsx
~~~~~
~~~~~typescript
        {/* 进入沙盒调试模式入口 */}
        <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-3 bg-purple-50/60 dark:bg-purple-950/30 p-3.5 rounded-2xl border border-purple-200/60 dark:border-purple-800/40">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <span>{t('settingsModal.sandboxSectionTitle')}</span>
            </div>
            <div className="text-xs text-purple-700/80 dark:text-purple-300/70 mt-0.5 leading-relaxed">
              {t('settingsModal.sandboxSectionDesc')}
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={onEnterSandbox}
            className="flex-shrink-0 bg-purple-600 hover:bg-purple-700 text-white shadow-none h-auto py-2 px-3 text-xs font-bold"
          >
            {t('settingsModal.enterSandbox')}
          </Button>
        </div>
~~~~~
~~~~~typescript
        {/* 进入沙盒调试模式入口 */}
        <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t('settingsModal.sandboxSectionTitle')}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {t('settingsModal.sandboxSectionDesc')}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onEnterSandbox}
            className="flex-shrink-0 border-border text-foreground hover:bg-accent hover:text-primary h-auto py-2 px-3 text-xs font-semibold"
          >
            {t('settingsModal.enterSandbox')}
          </Button>
        </div>
~~~~~

---

### 下一步建议
重新打开卡片偏好设置弹窗，查看沙盒模式入口是否已经与上方“自动翻页开关”、“自适应算子模式”等通用项风格融为一体、层次分明。
