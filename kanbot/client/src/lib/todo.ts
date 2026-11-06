import { t } from '../i18n';
import type { TodoPriority, TodoStatus, TodoType } from '../types/api';

// Getters, so the text is looked up when it is used (and follows the current language)
export const STATUS_LABEL = {
  get todo() { return t('status.todo'); },
  get in_progress() { return t('status.in_progress'); },
  get in_review() { return t('status.in_review'); },
  get done() { return t('status.done'); },
} satisfies Record<TodoStatus, string>;

export const PRIORITY_LABEL = {
  get low() { return t('priority.low'); },
  get medium() { return t('priority.medium'); },
  get high() { return t('priority.high'); },
  get urgent() { return t('priority.urgent'); },
} satisfies Record<TodoPriority, string>;

export const TYPE_LABEL = {
  get task() { return t('type.task'); },
  get story() { return t('type.story'); },
  get bug() { return t('type.bug'); },
} satisfies Record<TodoType, string>;
