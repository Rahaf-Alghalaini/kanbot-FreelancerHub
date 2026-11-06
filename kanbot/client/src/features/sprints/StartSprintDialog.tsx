import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { sprintsApi } from '../../api/sprints';
import { Button } from '../../components/Button';
import { Field, Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { useRefreshSprints } from '../../hooks/useSprints';
import { applyServerError } from '../../lib/forms';
import { addDays, todayISO } from '../../lib/format';
import { t } from '../../i18n';
import type { Sprint } from '../../types/api';

const makeSchema = () =>
  z
    .object({ startDate: z.string().min(1, t('v.pickStart')), endDate: z.string().min(1, t('v.pickEnd')) })
    .refine((v) => v.endDate >= v.startDate, { path: ['endDate'], message: t('v.endAfterStart') });
type Values = z.infer<ReturnType<typeof makeSchema>>;

type Props = { sprint: Sprint | null; projectId: string; taskCount: number; onClose: () => void };

/** SPR-3: POST /sprints/:id/start. A 409 means another sprint is already active. */
export function StartSprintDialog({ sprint, projectId, taskCount, onClose }: Props) {
  return (
    <Modal open={!!sprint} title={sprint ? t('sprint.startTitle', { name: sprint.name }) : ''} onClose={onClose}>
      {sprint && <Body key={sprint.id} sprint={sprint} projectId={projectId} taskCount={taskCount} onClose={onClose} />}
    </Modal>
  );
}

function Body({ sprint, projectId, taskCount, onClose }: Props & { sprint: Sprint }) {
  const nav = useNavigate();
  const toast = useToast();
  const refresh = useRefreshSprints();
  const [formError, setFormError] = useState<string | null>(null);
  const today = todayISO();
  const schema = useMemo(makeSchema, []);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      startDate: today,
      endDate: sprint.endDate && sprint.endDate >= today ? sprint.endDate : addDays(today, 14),
    },
  });

  const submit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await sprintsApi.start(sprint.id, v);
      await refresh();
      toast(t('sprint.started', { name: sprint.name }), 'success');
      onClose();
      nav(`/projects/${projectId}/board`);
    } catch (e) {
      setFormError(applyServerError(e, setError));
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      {formError && <div className="banner" role="alert">{formError}</div>}
      {taskCount === 0 && <p className="hint" style={{ marginBottom: 12 }}>{t('sprint.emptyStart')}</p>}
      <div className="form-grid">
        <Field label={t('common.startDate')} error={errors.startDate?.message}><Input type="date" {...register('startDate')} /></Field>
        <Field label={t('common.endDate')} error={errors.endDate?.message}><Input type="date" {...register('endDate')} /></Field>
      </div>
      <div className="form-actions">
        <Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button type="submit" loading={isSubmitting}>{t('sprint.start')}</Button>
      </div>
    </form>
  );
}
