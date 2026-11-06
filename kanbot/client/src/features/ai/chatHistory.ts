import { readJson, removeKey, writeJson } from '../../lib/storage';
import type { ChatMessage } from '../../types/api';

/** Chat history is kept per project in localStorage, under `kanbot.chat.<projectId>`. */
const MAX_STORED = 50;
const keyFor = (projectId: string) => `kanbot.chat.${projectId}`;

const isMessage = (m: unknown): m is ChatMessage => {
  if (typeof m !== 'object' || m === null) return false;
  const { role, content } = m as Record<string, unknown>;
  return (role === 'user' || role === 'assistant') && typeof content === 'string';
};

export function loadChat(projectId: string): ChatMessage[] {
  const raw = readJson<unknown>(keyFor(projectId), []);
  return Array.isArray(raw) ? raw.filter(isMessage).map((m) => ({ role: m.role, content: m.content })).slice(-MAX_STORED) : [];
}

export function saveChat(projectId: string, messages: ChatMessage[]) {
  if (messages.length === 0) removeKey(keyFor(projectId));
  else writeJson(keyFor(projectId), messages.slice(-MAX_STORED));
}
