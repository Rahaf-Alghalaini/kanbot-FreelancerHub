import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { projectsApi } from '../../api/projects';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { PageLoader } from '../../components/Loader';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { projectKeys, useProjectsQuery } from '../../hooks/useProjects';
import { rich, t, tp } from '../../i18n';
import { ProjectFormModal } from './ProjectFormModal';
import type { CreateProjectRequest, ProjectWithStats } from '../../types/api';

export function ProjectsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error, refetch } = useProjectsQuery();
  const projects = data?.projects ?? [];
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectWithStats | null>(null);
  const [deleting, setDeleting] = useState<ProjectWithStats | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: projectKeys.all });

  const create = useMutation({
    mutationFn: projectsApi.create, // PRJ-2
    onSuccess: async ({ project }) => {
      await refresh();
      toast(t('project.created'), 'success');
      nav(`/projects/${project.id}/board`);
    },
  });
  const update = useMutation({
    mutationFn: (v: { id: string; body: CreateProjectRequest }) => projectsApi.update(v.id, v.body), // PRJ-3
    onSuccess: async () => {
      await refresh();
      toast(t('project.updated'), 'success');
    },
  });
  const remove = useMutation({
    mutationFn: projectsApi.remove, // PRJ-4
    onSuccess: async (_, id) => {
      qc.removeQueries({ queryKey: projectKeys.one(id) });
      await refresh();
      setDeleting(null);
      toast(t('project.deleted'), 'success');
    },
  });

  const openCreate = () => { setEditing(null); setFormOpen(true); };

  return (
    <>
      <div className="toolbar">
        <p>{tp('n.project', projects.length)}</p>
        <Button onClick={openCreate}><Plus size={16} /> {t('project.new')}</Button>
      </div>

      {isLoading && <PageLoader label={t('project.loading')} />}
      {error && (
        <div className="banner" role="alert">
          {error.message}
          <Button variant="ghost" onClick={() => refetch()}>{t('common.tryAgain')}</Button>
        </div>
      )}
      {!isLoading && !error && projects.length === 0 && (
        <EmptyState
          title={t('project.createFirst')}
          description={t('project.createFirstDesc')}
          action={<Button onClick={openCreate}><Plus size={16} /> {t('project.new')}</Button>}
        />
      )}

      <div className="grid">
        {projects.map((p) => (
          <article key={p.id} className="card">
            <div className="card-top">
              <span className="pill">{p.key}</span>
              {p.stats.activeSprint && <span className="pill"><span className="dot" />{p.stats.activeSprint.name}</span>}
            </div>
            <h3>{p.name}</h3>
            <p>{p.description}</p>
            <div className="card-stats">
              <span>{tp('n.task', p.stats.totalTodos)}</span>
              <span>{t('project.inBacklog', { n: p.stats.backlogCount })}</span>
            </div>
            <div className="card-actions">
              <Link className="btn btn-primary" to={`/projects/${p.id}/board`}>{t('project.open')}</Link>
              <span className="spacer" />
              <button className="icon-btn" aria-label={t('common.edit', { name: p.name })} onClick={() => { setEditing(p); setFormOpen(true); }}><Pencil size={16} /></button>
              <button className="icon-btn" aria-label={t('common.deleteName', { name: p.name })} onClick={() => setDeleting(p)}><Trash2 size={16} /></button>
            </div>
          </article>
        ))}
      </div>

      <ProjectFormModal
        open={formOpen}
        project={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={async (body) => {
          if (editing) await update.mutateAsync({ id: editing.id, body });
          else await create.mutateAsync(body);
        }}
      />

      <Modal open={!!deleting} title={t('project.deleteTitle')} onClose={() => setDeleting(null)}>
        <p>{rich(t('project.deleteQ', { name: deleting?.name ?? '' }))}</p>
        {remove.error && <div className="banner" role="alert" style={{ marginTop: 12 }}>{remove.error.message}</div>}
        <div className="form-actions" style={{ marginTop: 18 }}>
          <Button variant="ghost" onClick={() => setDeleting(null)}>{t('common.cancel')}</Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id)}>{t('project.deleteTitle')}</Button>
        </div>
      </Modal>
    </>
  );
}
