import { ApiError } from '../api/client';
import { t } from '../i18n';
import { Button } from './Button';

/** Error message with an optional Retry button (AI-5). Shows field details when the server sent them. */
export function ErrorBanner({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const details = error instanceof ApiError ? error.details : undefined;
  return (
    <div className="banner" role="alert">
      <span>
        {error.message}
        {details?.length ? ` (${details.map((d) => `${d.path}: ${d.message}`).join('; ')})` : ''}
      </span>
      {onRetry && <Button variant="ghost" onClick={onRetry}>{t('common.tryAgain')}</Button>}
    </div>
  );
}
