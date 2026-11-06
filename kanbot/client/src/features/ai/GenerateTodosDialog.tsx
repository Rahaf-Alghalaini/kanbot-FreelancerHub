import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiApi } from '../../api/ai';
import { todosApi } from '../../api/todos';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { useRefreshTodos } from '../../hooks/useTodos';
import { rich, t, tp } from '../../i18n';
import { PRIORITY_LABEL, TYPE_LABEL } from '../../lib/todo';
import { PointsSelect } from '../todos/PointsSelect';
import { TODO_PRIORITIES, TODO_TYPES, type AiSource, type DraftTodo, type TodoPriority, type TodoType } from '../../types/api';
import { SourceTag } from './AiBadge';

type Draft = DraftTodo & { uid: number; include: boolean };
type Props = { open: boolean; projectId: string; onClose: () => void };

/** AI-2: describe a feature, tick/untick and edit the drafts, then save only the ticked ones in one request. */
export function GenerateTodosDialog({ open, projectId, onClose }: Props) {
  return (
    <Modal open={open} title={t('gen.title')} wide onClose={onClose}>
      <Body projectId={projectId} onClose={onClose} />
    </Modal>
  );
}

function Body({ projectId, onClose }: Omit<Props, 'open'>) {
  const toast = useToast();
  const refresh = useRefreshTodos();
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(5);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [source, setSource] = useState<AiSource>('mock');
  const [titleError, setTitleError] = useState(false);
  const chosen = (drafts ?? []).filter((d) => d.include);

  const generate = useMutation({
    mutationFn: () => aiApi.generateTodos(projectId, { prompt: prompt.trim(), count }),
    onSuccess: (r) => {
      setDrafts(r.todos.map((t, i) => ({ ...t, uid: i, include: true })));
      setSource(r.source);
      setTitleError(false);
    },
  });

  const save = useMutation({
    mutationFn: () =>
      todosApi.bulkCreate(projectId, {
        todos: chosen.map((d) => ({ title: d.title.trim(), description: d.description, type: d.type, priority: d.priority, storyPoints: d.storyPoints })),
      }),
    onSuccess: async (r) => {
      await refresh();
      toast(tp('gen.added', r.todos.length), 'success');
      onClose();
    },
  });

  const run = () => {
    if (prompt.trim().length < 3) return setPromptError(t('gen.promptShort'));
    setPromptError(null);
    generate.mutate();
  };
  const patch = (uid: number, change: Partial<Draft>) => setDrafts((d) => d?.map((x) => (x.uid === uid ? { ...x, ...change } : x)) ?? null);
  const saveAll = () => {
    if (chosen.some((d) => !d.title.trim())) return setTitleError(true);
    setTitleError(false);
    save.mutate();
  };

  if (!drafts) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); run(); }} noValidate>
        {generate.error && <ErrorBanner error={generate.error} onRetry={run} />}
        <label className="field">
          <span className="field-label">{t('gen.whatBuild')}</span>
          <textarea rows={4} maxLength={2000} placeholder={t('gen.placeholder')} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          {promptError && <span className="error" role="alert">{promptError}</span>}
        </label>
        <label className="field" style={{ maxWidth: 160 }}>
          <span className="field-label">{t('gen.howMany')}</span>
          <input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Math.min(10, Math.max(1, Number(e.target.value) || 1)))} />
        </label>
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={generate.isPending}>{generate.isPending ? t('gen.generating') : t('gen.generate')}</Button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="draft-head">
        <p>{rich(t('gen.selected', { n: chosen.length, total: drafts.length }))}</p>
        <SourceTag source={source} />
      </div>
      {titleError && <div className="banner" role="alert">{t('gen.needTitle')}</div>}
      {generate.error && <ErrorBanner error={generate.error} onRetry={run} />}
      {save.error && <ErrorBanner error={save.error} onRetry={saveAll} />}
      <ul className="drafts">
        {drafts.map((d) => (
          <li key={d.uid} className={`draft ${d.include ? '' : 'off'}`}>
            <div className="draft-row">
              <input type="checkbox" aria-label={t('gen.include', { n: d.uid + 1 })} checked={d.include} onChange={(e) => patch(d.uid, { include: e.target.checked })} />
              <input aria-label={t('common.title')} maxLength={200} value={d.title} onChange={(e) => patch(d.uid, { title: e.target.value })} />
            </div>
            <textarea aria-label={t('common.description')} rows={2} maxLength={5000} value={d.description} onChange={(e) => patch(d.uid, { description: e.target.value })} />
            <div className="draft-opts">
              <select aria-label={t('common.type')} value={d.type} onChange={(e) => patch(d.uid, { type: e.target.value as TodoType })}>{TODO_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select>
              <select aria-label={t('common.priority')} value={d.priority} onChange={(e) => patch(d.uid, { priority: e.target.value as TodoPriority })}>{TODO_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select>
              <PointsSelect aria-label={t('common.storyPoints')} value={d.storyPoints} onChange={(v) => patch(d.uid, { storyPoints: v })} />
            </div>
          </li>
        ))}
      </ul>
      <div className="form-actions split">
        <Button variant="ghost" onClick={() => { setDrafts(null); generate.reset(); save.reset(); }}>{t('common.back')}</Button>
        <span className="spacer" />
        <Button variant="ghost" loading={generate.isPending} onClick={run}>{t('gen.regenerate')}</Button>
        <Button loading={save.isPending} disabled={chosen.length === 0} onClick={saveAll}>{tp('gen.save', chosen.length)}</Button>
      </div>
    </div>
  );
}
