import { t } from '../i18n';

export function Loader({ size = 20 }: { size?: number }) {
  return <span className="spinner" role="status" aria-label={t('common.loading')} style={{ width: size, height: size }} />;
}

export function PageLoader({ label = t('common.loading') }: { label?: string }) {
  return (
    <div className="page-loader">
      <Loader size={28} />
      <span>{label}</span>
    </div>
  );
}
