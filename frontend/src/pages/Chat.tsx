import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Loader2, Trash2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/store/auth';
import { Button } from '@/components/ui/Button';
import { UserAvatar, UserTitle } from '@/components/ui/UserChip';
import { cn } from '@/lib/cn';

interface Message {
  id: string;
  org_id: string;
  user_id: string | null;
  user_name: string;
  avatar_url: string | null;
  active_title?: string;
  active_frame?: string;
  user_level?: number | null;
  body: string;
  created_at: string;
}

function dayLabel(d: Date) {
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE, MMM d');
}

export default function Chat() {
  const me = useAuth((s) => s.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get<Message[]>('/chat/', { params: { limit: 100 } });
      setMessages(r.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Realtime: subscribe to chat:new
  useEffect(() => {
    let mounted = true;
    let socket: Awaited<ReturnType<typeof getSocket>> | null = null;

    (async () => {
      socket = await getSocket();
      if (!socket || !mounted) return;
      const onNew = (m: Message) => {
        setMessages((prev) =>
          prev.some((x) => x.id === m.id) ? prev : [...prev, m],
        );
      };
      const onDel = (e: { id: string }) => {
        setMessages((prev) => prev.filter((m) => m.id !== e.id));
      };
      socket.on('chat:new', onNew);
      socket.on('chat:deleted', onDel);
    })();

    return () => {
      mounted = false;
      if (socket) {
        socket.off('chat:new');
        socket.off('chat:deleted');
      }
    };
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText('');
    try {
      await api.post('/chat/', { body });
      // Realtime event populates the list — no need to refetch
    } catch {
      setText(body); // restore
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  async function deleteMessage(m: Message) {
    if (!confirm('Delete this message?')) return;
    try {
      await api.delete(`/chat/${m.id}`);
      toast.success('Deleted');
    } catch {
      // toast handled by interceptor
    }
  }

  // Group messages into day chunks + collapse consecutive messages by same author
  const grouped: { day: string; date: Date; items: Message[][] }[] = [];
  for (const m of messages) {
    const d = new Date(m.created_at);
    const dayKey = format(d, 'yyyy-MM-dd');
    let bucket = grouped.find((g) => format(g.date, 'yyyy-MM-dd') === dayKey);
    if (!bucket) {
      bucket = { day: dayLabel(d), date: d, items: [] };
      grouped.push(bucket);
    }
    const lastGroup = bucket.items[bucket.items.length - 1];
    if (
      lastGroup &&
      lastGroup[lastGroup.length - 1].user_id === m.user_id &&
      d.getTime() - new Date(lastGroup[lastGroup.length - 1].created_at).getTime() < 5 * 60 * 1000
    ) {
      lastGroup.push(m);
    } else {
      bucket.items.push([m]);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 bg-ink-900/40 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl grid place-items-center"
            style={{
              background:
                'linear-gradient(135deg, rgb(var(--accent)) 0%, rgb(var(--accent-2)) 100%)',
            }}
          >
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display font-semibold">Organization chat</div>
            <div className="text-xs text-white/50">Everyone in your org sees this</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-neon-violet" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="w-10 h-10 text-white/20 mx-auto mb-3" strokeWidth={1.5} />
            <div className="text-white/60 font-medium">No messages yet</div>
            <p className="text-sm text-white/40 mt-1">Be the first to say something.</p>
          </div>
        ) : (
          grouped.map((g) => (
            <div key={g.day + g.date.toISOString()}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/5" />
                <div className="text-[10px] uppercase tracking-widest text-white/40">{g.day}</div>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {g.items.map((group, idx) => (
                    <MessageGroup
                      key={group[0].id + idx}
                      messages={group}
                      isMine={group[0].user_id === me?.id}
                      canDelete={(m: Message) =>
                        m.user_id === me?.id ||
                        me?.org_role === 'owner' ||
                        me?.org_role === 'moderator'
                      }
                      onDelete={deleteMessage}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={send}
        className="border-t border-white/5 bg-ink-900/40 backdrop-blur-xl p-4"
      >
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder="Send a message..."
            rows={1}
            className="input flex-1 resize-none max-h-[120px] py-3"
            style={{
              minHeight: '46px',
              height: Math.min(120, 46 + text.split('\n').length * 18),
            }}
          />
          <Button type="submit" loading={sending} disabled={!text.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-[10px] text-white/30 text-center mt-2">
          Enter to send · Shift+Enter for newline
        </div>
      </form>
    </div>
  );
}

function MessageGroup({
  messages,
  isMine,
  canDelete,
  onDelete,
}: {
  messages: Message[];
  isMine: boolean;
  canDelete: (m: Message) => boolean;
  onDelete: (m: Message) => void;
}) {
  const first = messages[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn('flex gap-3 group', isMine ? 'flex-row-reverse' : 'flex-row')}
    >
      <Link
        to={first.user_id ? `/u/${first.user_id}` : '#'}
        className="shrink-0 mt-0.5"
        title={first.user_name}
      >
        <UserAvatar
          name={first.user_name}
          avatarUrl={first.avatar_url}
          frameCode={first.active_frame}
          size="sm"
          brandFallback={!first.active_frame}
        />
      </Link>
      <div className={cn('flex flex-col gap-1 max-w-[75%] min-w-0', isMine && 'items-end')}>
        <div className={cn('flex items-baseline gap-2 flex-wrap', isMine && 'flex-row-reverse')}>
          <span className="text-xs font-medium text-white/80">{first.user_name}</span>
          {first.active_title ? (
            <UserTitle code={first.active_title} inline />
          ) : null}
          {typeof first.user_level === 'number' ? (
            <span className="text-[10px] font-mono text-white/40 tabular-nums">
              Lv {first.user_level}
            </span>
          ) : null}
          <span className="text-[10px] text-white/40">
            {format(new Date(first.created_at), 'p')}
          </span>
        </div>
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'relative px-4 py-2.5 rounded-2xl max-w-full break-words whitespace-pre-wrap text-sm',
              isMine
                ? 'text-white rounded-br-sm'
                : 'bg-white/5 border border-white/10 text-white/90 rounded-bl-sm',
            )}
            style={
              isMine
                ? {
                    background:
                      'linear-gradient(135deg, rgb(var(--accent) / 0.85) 0%, rgb(var(--accent-2) / 0.65) 100%)',
                  }
                : undefined
            }
          >
            {m.body}
            {canDelete(m) && (
              <button
                onClick={() => onDelete(m)}
                className={cn(
                  'absolute top-1 opacity-0 group-hover:opacity-100 transition w-6 h-6 grid place-items-center rounded-md hover:bg-black/30',
                  isMine ? '-left-7' : '-right-7',
                )}
                title="Delete message"
              >
                <Trash2 className="w-3 h-3 text-white/60" />
              </button>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
