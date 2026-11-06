import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { sprintsApi } from '../../api/sprints';
import { Button } from '../../components/Button';
import { Field, Input, Textarea } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { useRefreshSprints } from '../../hooks/useSprints';
import { t } from '../../i18n';
import { applyServerError } from '../../lib/forms';
import type { Sprint, UpdateSprintRequest } from '../../types/api';

const makeSchema = () =>
  z
    .object({
      name: z.string().trim(),
      goal: z.string().max(300, t('v.maxChars', { n: 300 })),
      startDate: z.string(),
      endDate: z.string(),
    })
    .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
      path: ['endDate'],
      message: t('v.endAfterStart'),
    });
type Values = z.infer<ReturnType<typeof makeSchema>>;

type Props = { open: boolean; projectId: string; sprint?: Sprint | null; onClose: () => void };

/** SPR-1 (create) and SPR-2 (edit). */
export function SprintFormDialog({ open, projectId, sprint, onClose }: Props) {
  const toast = useToast();
  const refresh = useRefreshSprints();
  const [formError, setFormError] = useState<string | null>(null);
  const schema = useMemo(makeSchema, []);
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', goal: '', startDate: '', endDate: '' },
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    reset({ name: sprint?.name ?? '', goal: sprint?.goal ?? '', startDate: sprint?.startDate ?? '', endDate: sprint?.endDate ?? '' });
  }, [open, sprint, reset]);

  const submit = handleSubmit(async (v) => {
    setFormError(null);
    const body: UpdateSprintRequest = { goal: v.goal, startDate: v.startDate || null, endDate: v.endDate || null };
    if (v.name) body.name = v.name;
    try {
      if (sprint) await sprintsApi.update(sprint.id, body);
      else await sprintsApi.create(projectId, body);
      await refresh();
      toast(sprint ? t('sprint.updated') : t('sprint.created'), 'success');
      onClose();
    } catch (e) {
      setFormError(applyServerError(e, setError));
    }
  });

  return (
    <Modal open={open} onClose={onClose} title={sprint ? t('sprint.edit') : t('sprint.new')}>
      <form onSubmit={submit} noValidate>
        {formError && <div className="banner" role="alert">{formError}</div>}
        <Field label={t('common.name')} error={errors.name?.message} hint={sprint ? undefined : t('sprint.nameHint')}><Input {...register('name')} /></Field>
        <Field label={t('common.goal')} error={errors.goal?.message}><Textarea rows={3} {...register('goal')} /></Field>
        <div className="form-grid">
          <Field label={t('common.startDate')} error={errors.startDate?.message}><Input type="date" {...register('startDate')} /></Field>
          <Field label={t('common.endDate')} error={errors.endDate?.message}><Input type="date" {...register('endDate')} /></Field>
        </div>
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={isSubmitting}>{sprint ? t('common.saveChanges') : t('sprint.create')}</Button>
        </div>
      </form>
    </Modal>
  );
}
