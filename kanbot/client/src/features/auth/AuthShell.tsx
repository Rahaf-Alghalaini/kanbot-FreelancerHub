import type { ReactNode } from 'react';
import logo from '../../assets/kanbot-icon.svg';
import { Preferences } from '../../components/Preferences';
import { t } from '../../i18n';

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="auth">
      <Preferences />
      <div className="auth-card">
        <div className="brand"><img src={logo} alt="" width={40} height={40} /><span>Kanbot</span></div>
        <p className="tagline">{t('auth.tagline')}</p>
        <h1>{title}</h1>
        {children}
      </div>
    </div>
  );
}
