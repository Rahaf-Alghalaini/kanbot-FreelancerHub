import { Sparkles } from 'lucide-react';
import { Loader } from '../../components/Loader';
import { useAiStatus } from '../../hooks/useAi';
import { t } from '../../i18n';

export function AiBadge() {
  const { data, isLoading, error, refetch } = useAiStatus();
  if (isLoading) return <span className="ai-badge"><Loader size={10} /> {t('ai.label')}</span>;
  if (error)
    return <button className="ai-badge warn" onClick={() => refetch()} title={error.message}>{t('ai.statusUnavailable')}</button>;
  if (!data) return null;
  return (
    <span className={`ai-badge ${data.mode}`} title={data.mode === 'mock' ? t('ai.mockTitle') : t('ai.model', { model: data.model ?? '' })}>
      <Sparkles size={12} /> {data.mode === 'mock' ? t('ai.mock') : `${t('ai.label')} · ${data.model ?? t('ai.live')}`}
    </span>
  );
}

export const SourceTag = ({ source }: { source: 'mock' | 'ai' }) => <span className={`ai-badge ${source}`}>{source === 'mock' ? t('ai.mock') : t('ai.label')}</span>;
