import { t } from '../../i18n';
import { STORY_POINTS, type StoryPoints } from '../../types/api';

type Props = { value: StoryPoints | null; onChange: (v: StoryPoints | null) => void; 'aria-label'?: string };

export function PointsSelect({ value, onChange, ...rest }: Props) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : (Number(e.target.value) as StoryPoints))}
      {...rest}
    >
      <option value="">{t('todo.noEstimate')}</option>
      {STORY_POINTS.map((p) => (
        <option key={p} value={p}>{p}</option>
      ))}
    </select>
  );
}
