const KEY = 'kanbot.token';
const PROJECT_KEY = 'kanbot.activeProject';
export const tokenStore = {
  get: () => localStorage.getItem(KEY),
  set: (t: string) => localStorage.setItem(KEY, t),
  clear: () => localStorage.removeItem(KEY),
};
export const activeProjectStore = {
  get: () => localStorage.getItem(PROJECT_KEY),
  set: (id: string | null) => (id ? localStorage.setItem(PROJECT_KEY, id) : localStorage.removeItem(PROJECT_KEY)),
};
