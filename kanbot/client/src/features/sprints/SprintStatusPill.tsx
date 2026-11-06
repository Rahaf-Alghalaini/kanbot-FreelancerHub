import { t } from '../../i18n';
import type { SprintStatus } from '../../types/api';

export const SprintStatusPill = ({ status }: { status: SprintStatus }) => <span className={`pill status-${status}`}>{t(`sprint.status.${status}`)}</span>;
