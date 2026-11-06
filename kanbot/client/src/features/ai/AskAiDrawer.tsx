import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { RotateCcw, Send, X } from 'lucide-react';
import { aiApi } from '../../api/ai';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Markdown } from '../../components/Markdown';
import { t } from '../../i18n';
import type { ChatMessage } from '../../types/api';
import { AiBadge } from './AiBadge';

type Props = { open: boolean; projectId?: string; onClose: () => void };

/** Always mounted so the conversation survives closing the drawer; it resets when the project changes. */
export function AskAiDrawer({ open, projectId, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div hidden={!open} className="modal-backdrop drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer chat-drawer" role="dialog" aria-modal="true" aria-label={t('ai.ask')}>
        {projectId ? (
          <ChatPanel key={projectId} projectId={projectId} open={open} onClose={onClose} />
        ) : (
          <>
            <header className="modal-head"><div className="drawer-title"><h2>{t('ai.ask')}</h2><AiBadge /></div><button className="icon-btn" onClick={onClose} aria-label={t('common.close')}><X size={18} /></button></header>
            <EmptyState title={t('ai.openProjectFirst')} description={t('ai.openProjectDesc')} />
          </>
        )}
      </aside>
    </div>
  );
}

function ChatPanel({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const suggestions = [t('ai.sug1'), t('ai.sug2'), t('ai.sug3')];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Stateless API (AI-1): send the whole conversation every time, last 30 messages.
  const chat = useMutation({
    mutationFn: (msgs: ChatMessage[]) => aiApi.chat(projectId, { messages: msgs.slice(-30).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })) }),
    onSuccess: (r) => setMessages((m) => [...m, r.message]),
  });

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length, chat.isPending, chat.isError]);

  const send = (text: string) => {
    const msg = text.trim();
    if (!msg || chat.isPending) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: msg }];
    setMessages(next);
    setInput('');
    chat.mutate(next);
  };
  const newChat = () => { setMessages([]); chat.reset(); };

  return (
    <>
      <header className="modal-head">
        <div className="drawer-title"><h2>{t('ai.ask')}</h2><AiBadge /></div>
        <div className="drawer-actions">
          {messages.length > 0 && <button className="icon-btn" onClick={newChat} aria-label={t('ai.newChat')} title={t('ai.newChat')}><RotateCcw size={16} /></button>}
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}><X size={18} /></button>
        </div>
      </header>

      <div className="chat-log" aria-live="polite">
        {messages.length === 0 && (
          <div className="chat-intro">
            <p>{t('ai.intro')}</p>
            <div className="chat-suggestions">
              {suggestions.map((s) => <button key={s} className="chip-btn" onClick={() => send(s)}>{s}</button>)}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>{m.role === 'assistant' ? <Markdown>{m.content}</Markdown> : m.content}</div>
        ))}
        {chat.isPending && <div className="bubble assistant typing" role="status" aria-label={t('ai.typing')}><span /><span /><span /></div>}
        {chat.error && <ErrorBanner error={chat.error} onRetry={() => chat.mutate(messages)} />}
        <div ref={endRef} />
      </div>

      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <textarea
          ref={inputRef}
          rows={2}
          maxLength={4000}
          aria-label={t('ai.message')}
          placeholder={t('ai.placeholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
        />
        <Button type="submit" disabled={!input.trim()} loading={chat.isPending} aria-label={t('ai.send')}><Send size={16} className="flip-rtl" /></Button>
      </form>
    </>
  );
}
