针对你指出的 3 处深色模式细节问题，分析与原因如下：
1. **语言/音效/提示/休眠图标背景未适配**：`GeneralPreferencesSection` 和 `DataGovernanceSection` 中图标容器硬编码了 `bg-indigo-50 text-indigo-600`，缺少 `dark:bg-indigo-950/60 dark:text-indigo-400`。
2. **阶梯精细度按钮高亮浅色**：`SettingsModal` 中的标准阶梯与精细阶梯按钮激活态仅设置了浅色的 `bg-indigo-50 text-indigo-700 border-indigo-200`，未适配暗色主题。
3. **ToggleRight 开关图标白色描边**：`ToggleRight` 图标使用了 `fill-indigo-600 text-white`，导致 SVG 的外描边（stroke）变成了白色。应将 stroke（即 `text-*`）与 fill 保持一致的靛蓝色（`fill-indigo-600 text-indigo-600 dark:fill-indigo-500 dark:text-indigo-500`），去除白色外框。

以下是修复计划：

## [WIP] fix(settings): 修复设置面板图标、阶梯高亮及开关控件的深色模式样式

### 用户需求
1. 修复偏好设置中图标缺少夜间模式类名的问题。
2. 修复难度阶梯等激活态按钮在夜间模式下为浅色高亮的问题。
3. 消除 Toggle 开关控件在深色模式下出现的白色描边光晕。

### 目标
1. 在 `GeneralPreferencesSection.tsx` 与 `DataGovernanceSection.tsx` 为各设置项图标容器补齐 `dark:bg-indigo-950/60 dark:text-indigo-400`。
2. 在 `SettingsModal.tsx` 中为阶梯精细度选项卡添加 `dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900`。
3. 在 `SettingToggleItem.tsx` 与 `SettingsModal.tsx` 中修正 `ToggleRight` 的类名，统一 fill 与 stroke 颜色，消除白色描边圈。
4. 优化 `GeneralPreferencesSection.tsx` 中休眠超时选项在暗色模式下的底色与边框。

### 基本原理
- Lucide 图标的 `text-*` 控制 `stroke` 属性，`fill-*` 控制内部填充。将 `ToggleRight` 的 `text-white` 改为 `text-indigo-600 dark:text-indigo-500` 可以使描边与填充融为一体。
- 为各个按钮与图标容器补充对应的 `dark:` 变体类名。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/refine #task/domain/ui #task/object/dark-mode-polishing #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修正 `SettingToggleItem.tsx` 与 `SettingsModal.tsx` 中的 Toggle 开关描边

~~~~~act
patch_file
src/components/settings/common/SettingToggleItem.tsx
~~~~~
~~~~~old
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="text-indigo-600 hover:opacity-80 transition-opacity"
      >
        {checked ? (
          <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
        ) : (
          <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        )}
      </button>
~~~~~
~~~~~new
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition-opacity cursor-pointer"
      >
        {checked ? (
          <ToggleRight className="w-8 h-8 fill-indigo-600 text-indigo-600 dark:fill-indigo-500 dark:text-indigo-500" />
        ) : (
          <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        )}
      </button>
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~old
          <button
            type="button"
            onClick={() => updateCardConfig({ autoNext: !cardConfig.autoNext })}
            className="text-indigo-600 hover:opacity-80 transition-opacity"
          >
            {cardConfig.autoNext ? (
              <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-slate-300" />
            )}
          </button>
~~~~~
~~~~~new
          <button
            type="button"
            onClick={() => updateCardConfig({ autoNext: !cardConfig.autoNext })}
            className="text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition-opacity cursor-pointer"
          >
            {cardConfig.autoNext ? (
              <ToggleRight className="w-8 h-8 fill-indigo-600 text-indigo-600 dark:fill-indigo-500 dark:text-indigo-500" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            )}
          </button>
~~~~~

#### Acts 2: 修复 `SettingsModal.tsx` 中的阶梯精细度按钮高亮暗色样式

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~old
        {/* 难度阶梯精细度 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('settingsModal.stepGranularity')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateCardConfig({ stepGranularity: 'standard' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                cardConfig.stepGranularity === 'standard'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {t('settingsModal.stepStandard')}
            </button>
            <button
              type="button"
              onClick={() => updateCardConfig({ stepGranularity: 'fine' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                cardConfig.stepGranularity === 'fine'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {t('settingsModal.stepFine')}
            </button>
          </div>
        </div>
~~~~~
~~~~~new
        {/* 难度阶梯精细度 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('settingsModal.stepGranularity')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateCardConfig({ stepGranularity: 'standard' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                cardConfig.stepGranularity === 'standard'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {t('settingsModal.stepStandard')}
            </button>
            <button
              type="button"
              onClick={() => updateCardConfig({ stepGranularity: 'fine' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                cardConfig.stepGranularity === 'fine'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {t('settingsModal.stepFine')}
            </button>
          </div>
        </div>
~~~~~

#### Acts 3: 补全 `GeneralPreferencesSection.tsx` 与 `DataGovernanceSection.tsx` 图标及选项暗色适配

~~~~~act
patch_file
src/components/settings/sections/GeneralPreferencesSection.tsx
~~~~~
~~~~~old
      {/* 语言切换器 */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {t('settings.languageTitle')}
            </div>
            <div className="text-[11px] text-slate-400">{t('settings.languageDesc')}</div>
          </div>
        </div>

        <div className="flex items-center bg-slate-200/80 dark:bg-slate-900/80 p-0.5 rounded-xl">
          <button
            type="button"
            onClick={() => handleLocaleChange('zh-CN')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              (settings.global.locale || locale) === 'zh-CN'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t('settings.langZh')}
          </button>
          <button
            type="button"
            onClick={() => handleLocaleChange('en-US')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              (settings.global.locale || locale) === 'en-US'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t('settings.langEn')}
          </button>
        </div>
      </div>

      {/* 音效反馈开关 */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {t('settings.soundTitle')}
            </div>
            <div className="text-[11px] text-slate-400">{t('settings.soundDesc')}</div>
          </div>
        </div>
        <SettingToggleItem
          title=""
          checked={Boolean(settings.global.soundEnabled)}
          onChange={(checked) => onUpdateGlobal({ soundEnabled: checked })}
        />
      </div>

      {/* 任务指引提示开关 */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {t('settings.hintsTitle')}
            </div>
            <div className="text-[11px] text-slate-400">{t('settings.hintsDesc')}</div>
          </div>
        </div>
        <SettingToggleItem
          title=""
          checked={settings.global.showCanvasHints ?? true}
          onChange={(checked) => onUpdateGlobal({ showCanvasHints: checked })}
        />
      </div>

      {/* 闲置休眠保护 */}
      <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {t('settings.idleTitle')}
            </div>
            <div className="text-[11px] text-slate-400">{t('settings.idleDesc')}</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {[
            { label: t('settings.idleOff'), value: 0 },
            { label: t('settings.idle30s'), value: 30 },
            { label: t('settings.idle60s'), value: 60 },
            { label: t('settings.idle120s'), value: 120 },
          ].map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => onUpdateGlobal({ idleTimeout: opt.value })}
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                settings.global.idleTimeout === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
~~~~~
~~~~~new
      {/* 语言切换器 */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {t('settings.languageTitle')}
            </div>
            <div className="text-[11px] text-slate-400">{t('settings.languageDesc')}</div>
          </div>
        </div>

        <div className="flex items-center bg-slate-200/80 dark:bg-slate-900/80 p-0.5 rounded-xl">
          <button
            type="button"
            onClick={() => handleLocaleChange('zh-CN')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              (settings.global.locale || locale) === 'zh-CN'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t('settings.langZh')}
          </button>
          <button
            type="button"
            onClick={() => handleLocaleChange('en-US')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              (settings.global.locale || locale) === 'en-US'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t('settings.langEn')}
          </button>
        </div>
      </div>

      {/* 音效反馈开关 */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {t('settings.soundTitle')}
            </div>
            <div className="text-[11px] text-slate-400">{t('settings.soundDesc')}</div>
          </div>
        </div>
        <SettingToggleItem
          title=""
          checked={Boolean(settings.global.soundEnabled)}
          onChange={(checked) => onUpdateGlobal({ soundEnabled: checked })}
        />
      </div>

      {/* 任务指引提示开关 */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {t('settings.hintsTitle')}
            </div>
            <div className="text-[11px] text-slate-400">{t('settings.hintsDesc')}</div>
          </div>
        </div>
        <SettingToggleItem
          title=""
          checked={settings.global.showCanvasHints ?? true}
          onChange={(checked) => onUpdateGlobal({ showCanvasHints: checked })}
        />
      </div>

      {/* 闲置休眠保护 */}
      <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {t('settings.idleTitle')}
            </div>
            <div className="text-[11px] text-slate-400">{t('settings.idleDesc')}</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {[
            { label: t('settings.idleOff'), value: 0 },
            { label: t('settings.idle30s'), value: 30 },
            { label: t('settings.idle60s'), value: 60 },
            { label: t('settings.idle120s'), value: 120 },
          ].map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => onUpdateGlobal({ idleTimeout: opt.value })}
              className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                settings.global.idleTimeout === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
~~~~~

~~~~~act
patch_file
src/components/settings/sections/DataGovernanceSection.tsx
~~~~~
~~~~~old
      {/* 数据库瘦身与修剪 */}
      <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
              {t('settings.pruneTitle')}
            </div>
            <div className="text-[11px] text-indigo-600 dark:text-indigo-400">
              {t('settings.pruneDesc')}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPruneConfirm(true)}
          className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex-shrink-0 cursor-pointer"
        >
          {t('settings.pruneBtn')}
        </button>
      </div>
~~~~~
~~~~~new
      {/* 数据库瘦身与修剪 */}
      <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
              {t('settings.pruneTitle')}
            </div>
            <div className="text-[11px] text-indigo-600 dark:text-indigo-400">
              {t('settings.pruneDesc')}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPruneConfirm(true)}
          className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex-shrink-0 cursor-pointer"
        >
          {t('settings.pruneBtn')}
        </button>
      </div>
~~~~~

### 下一步建议
1. 打开全局偏好设置弹窗（点击左侧导航栏底部「全局设置」），检查深色模式下所有图标容器、语言/主题切换器、休眠按钮、数据备份与治理区域的视觉呈现。
2. 打开任意训练模块的个性化偏好设置（如色相、星图训练卡片），检查自动翻页开关、自适应阶梯以及弱点强化扇区在深色模式下的外观。
