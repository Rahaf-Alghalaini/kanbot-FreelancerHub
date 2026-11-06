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

const makeSchema = () =>
  z.object({
    name: z.string().trim().min(1, t('v.name')).max(80, t('v.maxChars', { n: 80 })),
    email: z.string().email(t('v.email')),
    password: z.string().min(8, t('v.minChars', { n: 8 })).max(200, t('v.maxChars', { n: 200 })),
  });
type Values = z.infer<ReturnType<typeof makeSchema>>;

export function RegisterPage() {
  const { register: signUp } = useAuth();
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
      await signUp(v);
      nav(redirect, { replace: true });
    } catch (e) {
      setFormError(applyServerError(e, setError, 'email'));
    }
  });

  return (
    <AuthShell title={t('auth.createYour')}>
      <form onSubmit={onSubmit} noValidate>
        {formError && <div className="banner" role="alert">{formError}</div>}
        <Field label={t('common.name')} error={errors.name?.message}><Input autoComplete="name" {...register('name')} /></Field>
        <Field label={t('common.email')} error={errors.email?.message}><Input type="email" autoComplete="email" {...register('email')} /></Field>
        <Field label={t('common.password')} error={errors.password?.message} hint={t('auth.passwordHint')}>
          <Input type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        <Button type="submit" loading={isSubmitting}>{t('auth.createAccount')}</Button>
      </form>
      <p className="auth-switch">{t('auth.haveAccount')} <Link to={`/login${search}`}>{t('auth.signIn')}</Link></p>
    </AuthShell>
  );
}
