import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import type { ProjectWithStats } from '../types/api';

// ['projects'] is a prefix of ['projects', id], so invalidating it refreshes the list and every project.
export const projectKeys = { all: ['projects'] as const, one: (id: string) => ['projects', id] as const };

export const useProjectsQuery = () => useQuery({ queryKey: projectKeys.all, queryFn: projectsApi.list }); // PRJ-1

export const useProjectQuery = (id?: string) =>
  useQuery({ queryKey: projectKeys.one(id ?? ''), queryFn: () => projectsApi.get(id!), enabled: !!id }); // PRJ-5

export type ProjectContext = { project: ProjectWithStats };
/** The loaded project, available inside any page under /projects/:projectId. */
export const useProject = () => useOutletContext<ProjectContext>().project;
