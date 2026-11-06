import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type Pending = { id: number; text: string };

type ChatContextValue = {
  open: boolean;
  openChat: () => void;
  closeChat: () => void;
  /** Opens the chat drawer and sends `text` as the next user message. */
  askChat: (text: string) => void;
  /** A message waiting to be sent by the chat panel (internal: used by AskAiDrawer). */
  pending: Pending | null;
  consume: (id: number) => void;
};

const noop = () => {};
const ChatContext = createContext<ChatContextValue>({ open: false, openChat: noop, closeChat: noop, askChat: noop, pending: null, consume: noop });

/** Lets any page open the AI chat, optionally with a ready-made message ("Improve this todo", "Estimate"). */
export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const nextId = useRef(0);

  const openChat = useCallback(() => setOpen(true), []);
  const closeChat = useCallback(() => setOpen(false), []);
  const askChat = useCallback((text: string) => {
    setPending({ id: ++nextId.current, text });
    setOpen(true);
  }, []);
  const consume = useCallback((id: number) => setPending((p) => (p && p.id === id ? null : p)), []);

  const value = useMemo(() => ({ open, openChat, closeChat, askChat, pending, consume }), [open, openChat, closeChat, askChat, pending, consume]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export const useChat = () => useContext(ChatContext);
