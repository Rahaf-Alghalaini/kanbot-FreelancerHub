export const REDIRECT_PARAM = 'redirect';

/** Only follow in-app paths: no external URLs ("//evil.com") and no loops back to the auth pages. */
export const safeRedirect = (value: string | null) =>
  value && value.startsWith('/') && !value.startsWith('//') && !/^\/(login|register)(\/|\?|$)/.test(value) ? value : '/projects';
