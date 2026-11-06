import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Field, Input, Textarea } from '../../components/Input';
import { t } from '../../i18n';
import { applyServerError } from '../../lib/forms';
import type { CreateProjectRequest, ProjectWithStats } from '../../types/api';

const makeSchema = () =>
  z.object({
    name: z.string().trim().min(1, t('v.projectName')).max(80, t('v.maxChars', { n: 80 })),
    key: z.string().regex(/^([A-Za-z]{2,6})?$/, t('v.key')),
    description: z.string().max(500, t('v.maxChars', { n: 500 })),
  });
type Values = z.infer<ReturnType<typeof makeSchema>>;

type Props = {
  open: boolean;
  project?: ProjectWithStats | null; // present = edit mode
  onClose: () => void;
  onSubmit: (body: CreateProjectRequest) => Promise<void>;
};

export function ProjectFormModal({ open, project, onClose, onSubmit }: Props) {
  const [formError, setFormError] = useState<string | null>(null);
  const schema = useMemo(makeSchema, []);
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', key: '', description: '' },
  });

  useEffect(() => {
    if (open) {
      setFormError(null);
      reset({ name: project?.name ?? '', key: project?.key ?? '', description: project?.description ?? '' });
    }
  }, [open, project, reset]);

  const submit = handleSubmit(async (v) => {
    setFormError(null);
    const body: CreateProjectRequest = { name: v.name, description: v.description };
    const key = v.key.toUpperCase();
    if (key && key !== project?.key) body.key = key;
    try {
      await onSubmit(body);
      onClose();
    } catch (e) {
      setFormError(applyServerError(e, setError, 'key'));
    }
  });

  return (
    <Modal open={open} onClose={onClose} title={project ? t('project.edit') : t('project.new')}>
      <form onSubmit={submit} noValidate>
        {formError && <div className="banner" role="alert">{formError}</div>}
        <Field label={t('common.name')} error={errors.name?.message}><Input {...register('name')} /></Field>
        <Field
          label={t('project.key')}
          error={errors.key?.message}
          hint={project ? t('project.keyHintEdit') : t('project.keyHintNew')}
        >
          <Input maxLength={6} style={{ textTransform: 'uppercase' }} {...register('key')} />
        </Field>
        <Field label={t('common.description')} error={errors.description?.message}><Textarea rows={3} {...register('description')} /></Field>
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={isSubmitting}>{project ? t('common.saveChanges') : t('project.create')}</Button>
        </div>
      </form>
    </Modal>
  );
}
