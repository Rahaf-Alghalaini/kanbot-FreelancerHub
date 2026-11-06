import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { todosApi } from '../../api/todos';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { useRefreshTodos } from '../../hooks/useTodos';
import { t } from '../../i18n';
import { TYPE_LABEL } from '../../lib/todo';
import { TODO_TYPES, type TodoType } from '../../types/api';

/** BL-2: POST /projects/:id/todos straight into the backlog. */
export function QuickCreate({ projectId }: { projectId: string }) {
  const toast = useToast();
  const refresh = useRefreshTodos();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TodoType>('task');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => todosApi.create(projectId, { title: title.trim(), type, sprintId: null }),
    onSuccess: async ({ todo }) => {
      await refresh();
      toast(t('quick.added', { key: todo.key }), 'success');
      setTitle('');
    },
    onError: (e) => setError(e.message),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = title.trim();
    if (!text) return setError(t('v.title'));
    if (text.length > 200) return setError(t('v.maxChars', { n: 200 }));
    setError(null);
    create.mutate();
  };

  return (
    <form className="quick" onSubmit={submit} noValidate>
      <div className="quick-row">
        <input aria-label={t('quick.aria')} placeholder={t('quick.placeholder')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <select aria-label={t('common.type')} value={type} onChange={(e) => setType(e.target.value as TodoType)}>
          {TODO_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
        <Button type="submit" loading={create.isPending}><Plus size={16} /> {t('quick.add')}</Button>
      </div>
      {error && <span className="error" role="alert">{error}</span>}
    </form>
  );
}
