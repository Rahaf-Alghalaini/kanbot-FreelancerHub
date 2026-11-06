import { Fragment, type ReactNode } from 'react';

/** Turns `<b>text</b>` in a translated string into <strong>. Nothing else is interpreted. */
export function rich(text: string): ReactNode {
  return text.split(/<b>(.*?)<\/b>/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>));
}
