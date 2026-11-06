import { Menu, Sparkles } from 'lucide-react';
import { t } from '../i18n';
import { Button } from './Button';
import { AiBadge } from '../features/ai/AiBadge';

type Props = { title: string; subtitle?: string; onMenu: () => void; onAskAi: () => void };

export function Header({ title, subtitle, onMenu, onAskAi }: Props) {
  return (
    <header className="header">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label={t('nav.openMenu')}><Menu size={20} /></button>
      <div className="header-text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <AiBadge />
      <Button onClick={onAskAi}><Sparkles size={16} /> {t('ai.ask')}</Button>
    </header>
  );
}
