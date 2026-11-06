import { Languages, Moon, Sun } from 'lucide-react';
import { t, useI18n } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';

/** Light/dark toggle and English/Arabic switch. Used in the sidebar and on the sign-in pages. */
export function Preferences() {
  const { theme, toggle } = useTheme();
  const { lang, setLang } = useI18n();
  const themeLabel = theme === 'dark' ? t('pref.toLight') : t('pref.toDark');
  return (
    <div className="prefs">
      <button type="button" className="icon-btn" onClick={toggle} aria-label={themeLabel} title={themeLabel}>
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <button type="button" className="pref-lang" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} aria-label={t('pref.language')} title={t('pref.language')}>
        <Languages size={16} />
        <span lang={lang === 'en' ? 'ar' : 'en'}>{t('pref.langName')}</span>
      </button>
    </div>
  );
}
