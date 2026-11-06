import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { sprintsApi } from '../../api/sprints';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { useRefreshSprints, useSprintsQuery } from '../../hooks/useSprints';
import { rich, t, tp } from '../../i18n';
import type { Sprint } from '../../types/api';

type Props = { sprint: Sprint | null; projectId: string; onClose: () => void };

/** SPR-6: POST /sprints/:id/complete. Unfinished tasks go to the backlog or to a planned sprint. */
export function CompleteSprintDialog({ sprint, projectId, onClose }: Props) {
  return (
    <Modal open={!!sprint} title={sprint ? t('sprint.completeTitle', { name: sprint.name }) : ''} onClose={onClose}>
      {sprint && <Body key={sprint.id} sprint={sprint} projectId={projectId} onClose={onClose} />}
    </Modal>
  );
}

function Body({ sprint, projectId, onClose }: Props & { sprint: Sprint }) {
  const nav = useNavigate();
  const toast = useToast();
  const refresh = useRefreshSprints();
  const planned = (useSprintsQuery(projectId).data?.sprints ?? []).filter((s) => s.status === 'planned');
  const [dest, setDest] = useState('backlog');
  const { totalTodos, doneTodos } = sprint.stats;
  const unfinished = totalTodos - doneTodos;

  const complete = useMutation({
    mutationFn: () => sprintsApi.complete(sprint.id, { moveUnfinishedTo: dest }),
    onSuccess: async () => {
      await refresh();
      toast(t('sprint.completed', { name: sprint.name }), 'success');
      onClose();
      nav(`/projects/${projectId}/sprints/${sprint.id}`);
    },
  });

  return (
    <>
      {complete.error && <div className="banner" role="alert">{complete.error.message}</div>}
      <p>{rich(t('sprint.doneOf', { done: doneTodos, total: totalTodos }))}</p>
      {unfinished > 0 ? (
        <label className="field" style={{ marginTop: 14 }}>
          <span className="field-label">{tp('sprint.moveUnfinished', unfinished)}</span>
          <select value={dest} onChange={(e) => setDest(e.target.value)}>
            <option value="backlog">{t('nav.backlog')}</option>
            {planned.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      ) : (
        <p className="hint" style={{ marginTop: 8 }}>{t('sprint.allDone')}</p>
      )}
      <div className="form-actions" style={{ marginTop: 18 }}>
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button loading={complete.isPending} onClick={() => complete.mutate()}>{t('sprint.complete')}</Button>
      </div>
    </>
  );
}
