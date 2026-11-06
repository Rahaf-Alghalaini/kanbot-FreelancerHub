import { useMutation } from '@tanstack/react-query';
import { sprintsApi } from '../../api/sprints';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { useRefreshSprints } from '../../hooks/useSprints';
import { rich, t } from '../../i18n';
import type { Sprint } from '../../types/api';

/** SPR-2: DELETE /sprints/:id (planned sprints only). */
export function DeleteSprintDialog({ sprint, onClose }: { sprint: Sprint | null; onClose: () => void }) {
  const toast = useToast();
  const refresh = useRefreshSprints();
  const del = useMutation({
    mutationFn: (id: string) => sprintsApi.remove(id),
    onSuccess: async () => {
      await refresh();
      toast(t('sprint.deleted'), 'success');
      close();
    },
  });
  function close() {
    del.reset();
    onClose();
  }

  return (
    <Modal open={!!sprint} title={t('sprint.deleteTitle')} onClose={close}>
      <p>{rich(t('sprint.deleteQ', { name: sprint?.name ?? '' }))}</p>
      {del.error && <div className="banner" role="alert" style={{ marginTop: 12 }}>{del.error.message}</div>}
      <div className="form-actions" style={{ marginTop: 18 }}>
        <Button variant="ghost" onClick={close}>{t('common.cancel')}</Button>
        <Button variant="danger" loading={del.isPending} onClick={() => sprint && del.mutate(sprint.id)}>{t('sprint.deleteTitle')}</Button>
      </div>
    </Modal>
  );
}
