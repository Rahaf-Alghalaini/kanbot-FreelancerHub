import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { todosApi } from '../../api/todos';
import { Button } from '../../components/Button';
import { Field, Input, Select, Textarea } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { useRefreshTodos, useTodoQuery } from '../../hooks/useTodos';
import { t } from '../../i18n';
import { applyServerError } from '../../lib/forms';
import { PRIORITY_LABEL, STATUS_LABEL, TYPE_LABEL } from '../../lib/todo';
import { TODO_PRIORITIES, TODO_STATUSES, TODO_TYPES, type StoryPoints, type Todo } from '../../types/api';
import { PointsSelect } from './PointsSelect';

const makeSchema = () =>
  z.object({
    title: z.string().trim().min(1, t('v.title')).max(200, t('v.maxChars', { n: 200 })),
    description: z.string().max(5000, t('v.maxChars', { n: 5000 })),
    type: z.enum(TODO_TYPES),
    status: z.enum(TODO_STATUSES),
    priority: z.enum(TODO_PRIORITIES),
    storyPoints: z.number().nullable(),
    labels: z.string().superRefine((v, ctx) => {
      const list = parseLabels(v);
      if (list.length > 10) ctx.addIssue({ code: 'custom', message: t('v.maxLabels') });
      else if (list.some((l) => l.length > 30)) ctx.addIssue({ code: 'custom', message: t('v.labelLen') });
    }),
    dueDate: z.string(),
  });
type Values = z.infer<ReturnType<typeof makeSchema>>;

const parseLabels = (s: string) => s.split(',').map((l) => l.trim()).filter(Boolean);
const toValues = (t: Todo): Values => ({
  title: t.title,
  description: t.description,
  type: t.type,
  status: t.status,
  priority: t.priority,
  storyPoints: t.storyPoints,
  labels: t.labels.join(', '),
  dueDate: t.dueDate ?? '',
});

export function TodoDetailsDialog({ todo, onClose }: { todo: Todo | null; onClose: () => void }) {
  return (
    <Modal open={!!todo} title={todo?.key ?? ''} wide onClose={onClose}>
      {todo && <Body key={todo.id} initial={todo} onClose={onClose} />}
    </Modal>
  );
}

function Body({ initial, onClose }: { initial: Todo; onClose: () => void }) {
  const toast = useToast();
  const refresh = useRefreshTodos();
  const { data, error } = useTodoQuery(initial.id, initial); // BL-3
  const todo = data?.todo ?? initial;
  const [confirming, setConfirming] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const schema = useMemo(makeSchema, []);

  const { register, control, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: toValues(initial),
  });
  // Re-sync only when the server copy actually changed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => reset(toValues(todo)), [todo.id, todo.updatedAt, reset]);

  const remove = useMutation({
    mutationFn: () => todosApi.remove(todo.id), // BL-4
    onSuccess: async () => {
      await refresh();
      toast(t('todo.deleted', { key: todo.key }), 'success');
      onClose();
    },
  });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await todosApi.update(todo.id, {
        title: v.title,
        description: v.description,
        type: v.type,
        status: v.status,
        priority: v.priority,
        storyPoints: v.storyPoints as StoryPoints | null,
        labels: parseLabels(v.labels),
        dueDate: v.dueDate || null,
      });
      await refresh();
      toast(t('todo.saved', { key: todo.key }), 'success');
      onClose();
    } catch (e) {
      setFormError(applyServerError(e, setError));
    }
  });

  if (error && !data)
    return (
      <>
        <div className="banner" role="alert">{error.message}</div>
        <div className="form-actions"><Button variant="ghost" onClick={onClose}>{t('common.close')}</Button></div>
      </>
    );

  return (
    <form onSubmit={onSubmit} noValidate>
      {(formError || remove.error) && <div className="banner" role="alert">{formError ?? remove.error?.message}</div>}
      <Field label={t('common.title')} error={errors.title?.message}><Input {...register('title')} /></Field>
      <Field label={t('common.description')} error={errors.description?.message}><Textarea rows={4} {...register('description')} /></Field>
      <div className="form-grid">
        <Field label={t('common.type')}><Select {...register('type')}>{TODO_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</Select></Field>
        <Field label={t('common.status')}><Select {...register('status')}>{TODO_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</Select></Field>
        <Field label={t('common.priority')}><Select {...register('priority')}>{TODO_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</Select></Field>
        <Field label={t('common.storyPoints')}>
          <Controller control={control} name="storyPoints" render={({ field }) => <PointsSelect value={field.value as StoryPoints | null} onChange={field.onChange} />} />
        </Field>
        <Field label={t('common.dueDate')} error={errors.dueDate?.message}><Input type="date" {...register('dueDate')} /></Field>
        <Field label={t('common.labels')} error={errors.labels?.message} hint={t('todo.labelsHint')}><Input {...register('labels')} /></Field>
      </div>

      <div className="form-actions split">
        {confirming ? (
          <span className="confirm">
            {t('todo.deleteQ', { key: todo.key })}
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>{t('common.no')}</Button>
            <Button type="button" variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>{t('todo.yesDelete')}</Button>
          </span>
        ) : (
          <Button type="button" variant="ghost" className="danger-text" onClick={() => setConfirming(true)}>{t('common.delete')}</Button>
        )}
        <span className="spacer" />
        <Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button type="submit" loading={isSubmitting}>{t('common.saveChanges')}</Button>
      </div>
    </form>
  );
}
