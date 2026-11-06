import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Sparkles } from 'lucide-react';
import { aiApi } from '../../api/ai';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Markdown } from '../../components/Markdown';
import { useToast } from '../../components/Toast';
import { sprintKeys } from '../../hooks/useSprints';
import { formatDate } from '../../lib/format';
import { t } from '../../i18n';
import type { Sprint } from '../../types/api';
import { SourceTag } from './AiBadge';

/** AI-4: POST /sprints/:id/ai/summary. The summary is saved on the sprint, so it is there next time. */
export function SprintSummaryCard({ sprint }: { sprint: Sprint }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { summary } = sprint;
  const generate = useMutation({
    mutationFn: () => aiApi.summary(sprint.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: sprintKeys.all });
      toast(t('summary.saved'), 'success');
    },
  });

  return (
    <section className="summary-card" aria-label={t('summary.title')}>
      <header className="summary-head">
        <h3><Sparkles size={16} /> {t('summary.title')}</h3>
        {summary && <SourceTag source={summary.source} />}
        {summary && <span className="due">{t('summary.generated', { date: formatDate(summary.generatedAt) })}</span>}
        <Button variant="ghost" className="summary-btn" loading={generate.isPending} onClick={() => generate.mutate()}>
          {!generate.isPending && (summary ? <RefreshCw size={14} /> : <Sparkles size={14} />)}
          {generate.isPending ? t('summary.writing') : summary ? t('summary.regenerate') : t('summary.generate')}
        </Button>
      </header>
      {generate.error && <ErrorBanner error={generate.error} onRetry={() => generate.mutate()} />}
      {summary ? <Markdown>{summary.content}</Markdown> : !generate.isPending && <p className="due">{t('summary.none')}</p>}
    </section>
  );
}
