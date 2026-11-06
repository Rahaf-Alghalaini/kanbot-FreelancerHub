import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiApi } from '../../api/ai';
import { sprintsApi } from '../../api/sprints';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { PageLoader } from '../../components/Loader';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { useRefreshSprints } from '../../hooks/useSprints';
import { useTodosQuery } from '../../hooks/useTodos';
import { rich, t, tpb } from '../../i18n';
import { TypeIcon } from '../todos/TypeIcon';
import type { PlanSprintResponse, Todo } from '../../types/api';
import { SourceTag } from './AiBadge';

type Props = { open: boolean; projectId: string; onClose: () => void };

/** AI-3: capacity (+ optional focus) → suggested goal and backlog tasks → create the sprint with them. */
export function PlanSprintDialog({ open, projectId, onClose }: Props) {
  return (
    <Modal open={open} title={t('plan.title')} wide onClose={onClose}>
      <Body projectId={projectId} onClose={onClose} />
    </Modal>
  );
}

function Body({ projectId, onClose }: Omit<Props, 'open'>) {
  const toast = useToast();
  const refreshSprints = useRefreshSprints();
  const backlog = useTodosQuery(projectId, { sprintId: 'backlog' });
  const [capacity, setCapacity] = useState('20');
  const [focus, setFocus] = useState('');
  const [capError, setCapError] = useState<string | null>(null);
  const [result, setResult] = useState<PlanSprintResponse | null>(null);
  const [goal, setGoal] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const plan = useMutation({
    mutationFn: () => aiApi.planSprint(projectId, { capacity: Number(capacity), focus: focus.trim() || undefined }),
    onSuccess: (r) => {
      setResult(r);
      setGoal(r.goal.slice(0, 300));
      setSelected(r.todoIds);
    },
  });

  const create = useMutation({
    mutationFn: () => sprintsApi.create(projectId, { goal, todoIds: selected }),
    onSuccess: async () => {
      await refreshSprints();
      toast(t('plan.created'), 'success');
      onClose();
    },
  });

  const run = () => {
    const n = Number(capacity);
    if (!Number.isInteger(n) || n < 1 || n > 200) return setCapError(t('plan.capacityErr'));
    setCapError(null);
    plan.mutate();
  };

  if (!result) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); run(); }} noValidate>
        {plan.error && <ErrorBanner error={plan.error} onRetry={run} />}
        <label className="field" style={{ maxWidth: 220 }}>
          <span className="field-label">{t('plan.capacity')}</span>
          <input type="number" min={1} max={200} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          {capError && <span className="error" role="alert">{capError}</span>}
        </label>
        <label className="field">
          <span className="field-label">{t('plan.focus')}</span>
          <input maxLength={300} placeholder={t('plan.focusPh')} value={focus} onChange={(e) => setFocus(e.target.value)} />
        </label>
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={plan.isPending}>{plan.isPending ? t('plan.planning') : t('plan.suggest')}</Button>
        </div>
      </form>
    );
  }

  // Resolve the suggested ids against the backlog, keeping the suggested order
  const byId = new Map((backlog.data?.todos ?? []).map((t) => [t.id, t]));
  const suggested = result.todoIds.map((id) => byId.get(id)).filter((t): t is Todo => !!t);
  const chosen = suggested.filter((t) => selected.includes(t.id));
  const points = chosen.reduce((n, t) => n + (t.storyPoints ?? 0), 0);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div>
      <div className="draft-head">
        <p>{result.reasoning}</p>
        <SourceTag source={result.source} />
      </div>
      {backlog.isLoading && <PageLoader label={t('backlog.loading')} />}
      {backlog.error && <ErrorBanner error={backlog.error} onRetry={() => backlog.refetch()} />}
      {create.error && <ErrorBanner error={create.error} onRetry={() => create.mutate()} />}

      <label className="field">
        <span className="field-label">{t('plan.goal')}</span>
        <input maxLength={300} value={goal} onChange={(e) => setGoal(e.target.value)} />
      </label>

      {backlog.data && suggested.length === 0 && <p className="drop-empty">{t('plan.noneSuggested')}</p>}
      <ul className="plan-list">
        {suggested.map((t) => (
          <li key={t.id}>
            <label className="plan-item">
              <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} />
              <TypeIcon type={t.type} />
              <span className="todo-key">{t.key}</span>
              <span className="todo-title">{t.title}</span>
              <span className="points">{t.storyPoints ?? '–'}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className={`plan-total ${points > Number(capacity) ? 'over' : ''}`}>
        {rich(tpb('n.task', chosen.length))} · {rich(t('plan.pointsOf', { points: `<b>${points}</b>`, cap: capacity }))}
        {points > Number(capacity) && ` ${t('plan.over')}`}
      </p>

      <div className="form-actions split">
        <Button variant="ghost" onClick={() => { setResult(null); plan.reset(); create.reset(); }}>{t('common.back')}</Button>
        <span className="spacer" />
        <Button variant="ghost" loading={plan.isPending} onClick={run}>{t('plan.replan')}</Button>
        <Button loading={create.isPending} disabled={backlog.isLoading} onClick={() => create.mutate()}>{t('sprint.create')}</Button>
      </div>
    </div>
  );
}
