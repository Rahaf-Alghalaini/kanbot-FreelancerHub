import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '../api/client';
import { t } from '../i18n';

/** Maps backend VALIDATION_ERROR details onto form fields; returns a message for anything else. */
export function applyServerError<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  conflictField?: string, // field to blame when the server answers 409 CONFLICT
): string | null {
  if (!(err instanceof ApiError)) return t('err.tryAgain');
  if (err.code === 'CONFLICT' && conflictField) {
    setError(conflictField as Path<T>, { message: err.message });
    return null;
  }
  if (err.code === 'VALIDATION_ERROR' && err.details?.length) {
    err.details.forEach((d) => setError(d.path as Path<T>, { message: d.message }));
    return null;
  }
  return err.message;
}
