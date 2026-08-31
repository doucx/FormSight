import { Clock, Globe, HelpCircle, Monitor, Moon, Sun, Volume2 } from 'lucide-preact';
import { useTranslation } from '../../../core/i18n';
import { applyThemeToDocument } from '../../../hooks/useTheme';
import type { GlobalSettings, ThemeMode, UserSettings } from '../../../utils/settings';
import type { ToastType } from '../../common/Toast';
import { SettingToggleItem } from '../common/SettingToggleItem';
import { SliderMarginGroup } from '../common/SliderMarginGroup';

interface GeneralPreferencesSectionProps {
  settings: UserSettings;
  onUpdateGlobal: (patch: Partial<GlobalSettings>) => void;
  showToast: (msg: string, type?: ToastType) => void;
}

export function GeneralPreferencesSection({
  settings,
  onUpdateGlobal,
  showToast,
}: GeneralPreferencesSectionProps) {
  const { t, locale, setLocale } = useTranslation();

  const handleLocaleChange = (newLocale: string) => {
    onUpdateGlobal({ locale: newLocale });
    setLocale(newLocale);
    showToast(t('settings.switchedLocaleToast'), 'success');
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    applyThemeToDocument(newTheme);
    onUpdateGlobal({ theme: newTheme });
    const themeLabel =
      newTheme === 'dark'
        ? t('settings.themeDark')
        : newTheme === 'light'
          ? t('settings.themeLight')
          : t('settings.themeSystem');
    showToast(t('settings.switchedThemeToast', { theme: themeLabel }), 'success');
  };

  const currentTheme = settings.global.theme || 'system';

  return (
    <div className="space-y-4">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        {t('settings.preferences')}
      </div>

      {/* 外观模式切换器 */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
            {currentTheme === 'dark' ? (
              <Moon className="w-4 h-4" />
            ) : currentTheme === 'light' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Monitor className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {t('settings.themeTitle')}
            </div>
            <div className="text-[11px] text-slate-400">{t('settings.themeDesc')}</div>
          </div>
        </div>

        <div className="flex items-center bg-slate-200/80 dark:bg-slate-900/80 p-0.5 rounded-xl">
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              currentTheme === 'light'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title={t('settings.themeLight')}
          >
            <Sun className="w-3 h-3" />
            <span className="hidden sm:inline">{t('settings.themeLight')}</span>
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              currentTheme === 'dark'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title={t('settings.themeDark')}
          >
            <Moon className="w-3 h-3" />
            <span className="hidden sm:inline">{t('settings.themeDark')}</span>
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('system')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              currentTheme === 'system'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title={t('settings.themeSystem')}
          >
            <Monitor className="w-3 h-3" />
            <span className="hidden sm:inline">{t('settings.themeSystem')}</span>
          </button>
        </div>
      </div>

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

      {/* 全局滑块外延感应区 */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
        <SliderMarginGroup
          title={t('settings.sliderHitMarginTitle')}
          value={settings.global.sliderHitMargin ?? 12}
          onChange={(margin) => onUpdateGlobal({ sliderHitMargin: margin })}
        />
      </div>
    </div>
  );
}
