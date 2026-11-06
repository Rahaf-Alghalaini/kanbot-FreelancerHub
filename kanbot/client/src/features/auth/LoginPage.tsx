import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from './AuthContext';
import { AuthShell } from './AuthShell';
import { Field, Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { applyServerError } from '../../lib/forms';
import { t } from '../../i18n';
import { REDIRECT_PARAM, safeRedirect } from '../../lib/redirect';

const makeSchema = () => z.object({ email: z.string().email(t('v.email')), password: z.string().min(1, t('v.password')) });
type Values = z.infer<ReturnType<typeof makeSchema>>;

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get(REDIRECT_PARAM));
  const search = params.toString() ? `?${params}` : '';
  const [formError, setFormError] = useState<string | null>(null);
  const schema = useMemo(makeSchema, []);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await login(v);
      nav(redirect, { replace: true });
    } catch (e) {
      setFormError(applyServerError(e, setError));
    }
  });

  return (
    <AuthShell title={t('auth.signIn')}>
      <form onSubmit={onSubmit} noValidate>
        {formError && <div className="banner" role="alert">{formError}</div>}
        <Field label={t('common.email')} error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label={t('common.password')} error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register('password')} />
        </Field>
        <Button type="submit" loading={isSubmitting}>{t('auth.signIn')}</Button>
      </form>
      <p className="auth-switch">{t('auth.newTo')} <Link to={`/register${search}`}>{t('auth.createAccountLink')}</Link></p>
    </AuthShell>
  );
}
