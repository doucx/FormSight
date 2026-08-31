import { Clock, Globe, HelpCircle, Monitor, Moon, Sun, Volume2 } from 'lucide-preact';
import { useTranslation } from '../../../core/i18n';
import { applyThemeToDocument } from '../../../hooks/useTheme';
import type { GlobalSettings, ThemeMode, UserSettings } from '../../../storage/settings';
import type { ToastType } from '../../common/Toast';
import { Button } from '../../ui/button';
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
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        {t('settings.preferences')}
      </div>

      {/* 外观模式切换器 */}
      <div className="flex items-center justify-between bg-muted/60 p-3.5 rounded-2xl border border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-accent text-primary rounded-xl">
            {currentTheme === 'dark' ? (
              <Moon className="w-4 h-4" />
            ) : currentTheme === 'light' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Monitor className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">{t('settings.themeTitle')}</div>
            <div className="text-xs text-muted-foreground">{t('settings.themeDesc')}</div>
          </div>
        </div>

        <div className="flex items-center bg-muted p-0.5 rounded-xl gap-0.5">
          <Button
            variant={currentTheme === 'light' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleThemeChange('light')}
            className="gap-1 h-auto py-1 px-2.5"
            title={t('settings.themeLight')}
          >
            <Sun className="w-3 h-3" />
            <span className="hidden sm:inline">{t('settings.themeLight')}</span>
          </Button>
          <Button
            variant={currentTheme === 'dark' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleThemeChange('dark')}
            className="gap-1 h-auto py-1 px-2.5"
            title={t('settings.themeDark')}
          >
            <Moon className="w-3 h-3" />
            <span className="hidden sm:inline">{t('settings.themeDark')}</span>
          </Button>
          <Button
            variant={currentTheme === 'system' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleThemeChange('system')}
            className="gap-1 h-auto py-1 px-2.5"
            title={t('settings.themeSystem')}
          >
            <Monitor className="w-3 h-3" />
            <span className="hidden sm:inline">{t('settings.themeSystem')}</span>
          </Button>
        </div>
      </div>

      {/* 语言切换器 */}
      <div className="flex items-center justify-between bg-muted/60 p-3.5 rounded-2xl border border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-accent text-primary rounded-xl">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">{t('settings.languageTitle')}</div>
            <div className="text-xs text-muted-foreground">{t('settings.languageDesc')}</div>
          </div>
        </div>

        <div className="flex items-center bg-muted p-0.5 rounded-xl gap-0.5">
          <Button
            variant={(settings.global.locale || locale) === 'zh-CN' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleLocaleChange('zh-CN')}
            className="h-auto py-1 px-2.5"
          >
            {t('settings.langZh')}
          </Button>
          <Button
            variant={(settings.global.locale || locale) === 'en-US' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleLocaleChange('en-US')}
            className="h-auto py-1 px-2.5"
          >
            {t('settings.langEn')}
          </Button>
        </div>
      </div>

      {/* 音效反馈开关 */}
      <div className="flex items-center justify-between bg-muted/60 p-3.5 rounded-2xl border border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-accent text-primary rounded-xl">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">{t('settings.soundTitle')}</div>
            <div className="text-xs text-muted-foreground">{t('settings.soundDesc')}</div>
          </div>
        </div>
        <SettingToggleItem
          title=""
          checked={Boolean(settings.global.soundEnabled)}
          onChange={(checked) => onUpdateGlobal({ soundEnabled: checked })}
        />
      </div>

      {/* 任务指引提示开关 */}
      <div className="flex items-center justify-between bg-muted/60 p-3.5 rounded-2xl border border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-accent text-primary rounded-xl">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">{t('settings.hintsTitle')}</div>
            <div className="text-xs text-muted-foreground">{t('settings.hintsDesc')}</div>
          </div>
        </div>
        <SettingToggleItem
          title=""
          checked={settings.global.showCanvasHints ?? true}
          onChange={(checked) => onUpdateGlobal({ showCanvasHints: checked })}
        />
      </div>

      {/* 闲置休眠保护 */}
      <div className="space-y-2 bg-muted/60 p-3.5 rounded-2xl border border-border/60">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-2 bg-accent text-primary rounded-xl">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">{t('settings.idleTitle')}</div>
            <div className="text-xs text-muted-foreground">{t('settings.idleDesc')}</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {[
            { label: t('settings.idleOff'), value: 0 },
            { label: t('settings.idle30s'), value: 30 },
            { label: t('settings.idle60s'), value: 60 },
            { label: t('settings.idle120s'), value: 120 },
          ].map((opt) => (
            <Button
              key={opt.value}
              variant={settings.global.idleTimeout === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onUpdateGlobal({ idleTimeout: opt.value })}
              className="py-2 h-auto"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 全局滑块外延感应区 */}
      <div className="bg-muted/60 p-3.5 rounded-2xl border border-border/60">
        <SliderMarginGroup
          title={t('settings.sliderHitMarginTitle')}
          value={settings.global.sliderHitMargin ?? 12}
          onChange={(margin) => onUpdateGlobal({ sliderHitMargin: margin })}
        />
      </div>
    </div>
  );
}
