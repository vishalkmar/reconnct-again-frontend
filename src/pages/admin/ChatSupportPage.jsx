import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle, Search, Send, Paperclip, FileText, Check, CheckCheck, ArrowLeft, X, Loader2, Mic,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api.js';
import { connectSupport, disconnectSupport } from '../../services/supportSocket.js';
import { useVoiceRecorder } from '../../utils/voiceRecorder.js';

const QUEUES = [
  { key: 'user', label: 'User Support' },
  { key: 'supplier', label: 'Supplier Support' },
];

/* ── helpers ── */
const initialsOf = (name) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const fmtTime = (d) =>
  new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

const fmtListTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (sameDay) return fmtTime(d);
  if (date.toDateString() === yest.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const dayLabel = (d) => {
  const date = new Date(d);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (date.toDateString() === yest.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const upsertConv = (list, c) => {
  const without = list.filter((x) => x.id !== c.id);
  return [c, ...without].sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
};

export default function ChatSupportPage() {
  const [queue, setQueue] = useState('user');
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [unread, setUnread] = useState({ user: 0, supplier: 0 });
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [pendingAttach, setPendingAttach] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [typingPeer, setTypingPeer] = useState(false);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef(null);
  const activeIdRef = useRef(null);
  const queueRef = useRef('user');
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const typingSentRef = useRef(false);
  const typingTimerRef = useRef(null);
  const hadConnectedRef = useRef(false);
  const unreadMapRef = useRef({});

  activeIdRef.current = activeId;
  queueRef.current = queue;
  const activeConv = conversations.find((c) => c.id === activeId) || null;

  const refreshUnread = useCallback(async () => {
    try {
      const { data } = await api.get('/support/admin/unread');
      const u = data.data || data.unread || { user: 0, supplier: 0 };
      setUnread(u);
      window.dispatchEvent(new CustomEvent('support-unread', { detail: u }));
    } catch { /* ignore */ }
  }, []);

  const loadConversations = useCallback(async (q, query = '') => {
    setLoadingConvs(true);
    try {
      const { data } = await api.get('/support/admin/conversations', { params: { queue: q, q: query } });
      setConversations(data.data?.conversations || data.conversations || []);
    } catch {
      toast.error('Could not load conversations');
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  /* ── socket wiring (once) ── */
  useEffect(() => {
    const s = connectSupport('admin');
    socketRef.current = s;
    if (!s) return undefined;

    const onConnect = () => {
      setConnected(true);
      if (hadConnectedRef.current) {
        // reconnected → resync the list + the open thread (fill any gap)
        loadConversations(queueRef.current, '');
        const id = activeIdRef.current;
        if (id) {
          s.emit('support:join', { conversationId: id });
          api.get(`/support/admin/conversations/${id}/messages`)
            .then(({ data }) => setMessages(data.data?.messages || data.messages || []))
            .catch(() => {});
        }
      }
      hadConnectedRef.current = true;
    };
    const onDisconnect = () => setConnected(false);
    const onMessage = (m) => {
      if (m.conversationId !== activeIdRef.current) return;
      setMessages((prev) => {
        if (m.tempId && prev.some((x) => x.id === m.tempId)) return prev.map((x) => (x.id === m.tempId ? m : x));
        if (prev.some((x) => x.id === m.id)) return prev;
        return [...prev, m];
      });
      s.emit('support:read', { conversationId: m.conversationId });
    };
    const onConversation = (c) => {
      const prevU = unreadMapRef.current[c.id] || 0;
      unreadMapRef.current[c.id] = c.unreadAdmin || 0;
      if (c.queue === queueRef.current) setConversations((prev) => upsertConv(prev, c));
      // Toast only on a genuinely new incoming message (unread went up) for a
      // conversation we're not currently viewing.
      if ((c.unreadAdmin || 0) > prevU && c.id !== activeIdRef.current && c.lastSenderRole !== 'admin') {
        toast(`New message from ${c.subjectLabel || 'a user'}`, { icon: '💬' });
      }
      refreshUnread();
    };
    const onRead = ({ conversationId, by }) => {
      if (conversationId === activeIdRef.current && by === 'party') {
        setMessages((prev) => prev.map((x) => (x.senderRole === 'admin' ? { ...x, readByParty: true } : x)));
      }
    };
    const onTyping = ({ conversationId, role, typing }) => {
      if (conversationId === activeIdRef.current && role !== 'admin') setTypingPeer(!!typing);
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('support:message', onMessage);
    s.on('support:conversation', onConversation);
    s.on('support:read', onRead);
    s.on('support:typing', onTyping);
    setConnected(s.connected);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('support:message', onMessage);
      s.off('support:conversation', onConversation);
      s.off('support:read', onRead);
      s.off('support:typing', onTyping);
    };
  }, [refreshUnread, loadConversations]);

  useEffect(() => () => disconnectSupport(), []);

  /* ── initial + tab load ── */
  useEffect(() => { refreshUnread(); }, [refreshUnread]);
  useEffect(() => {
    setActiveId(null); setMessages([]);
    loadConversations(queue, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  /* ── debounced search ── */
  useEffect(() => {
    const t = setTimeout(() => loadConversations(queueRef.current, search), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  /* ── auto scroll ── */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typingPeer]);

  const openConversation = async (conv) => {
    setActiveId(conv.id);
    setMessages([]); setPendingAttach([]); setTypingPeer(false);
    setLoadingMsgs(true);
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unreadAdmin: 0 } : c)));
    try {
      const { data } = await api.get(`/support/admin/conversations/${conv.id}/messages`);
      setMessages(data.data?.messages || data.messages || []);
      socketRef.current?.emit('support:join', { conversationId: conv.id });
      refreshUnread();
    } catch {
      toast.error('Could not load messages');
    } finally {
      setLoadingMsgs(false);
    }
  };

  const emitTyping = (typing) => {
    const s = socketRef.current;
    if (!s || !activeId) return;
    s.emit('support:typing', { conversationId: activeId, typing });
  };
  const onInput = (v) => {
    setText(v);
    if (!typingSentRef.current) { typingSentRef.current = true; emitTyping(true); }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => { typingSentRef.current = false; emitTyping(false); }, 1200);
  };

  const send = (overrideAttachments) => {
    const body = text.trim();
    const attachments = overrideAttachments || pendingAttach;
    if ((!body && attachments.length === 0) || !activeId) return;
    const s = socketRef.current;
    const tempId = `tmp-${Date.now()}`;
    const optimistic = {
      id: tempId, tempId, conversationId: activeId, senderRole: 'admin',
      body, attachments, readByAdmin: true, readByParty: false,
      createdAt: new Date().toISOString(), _pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText(''); setPendingAttach([]);
    clearTimeout(typingTimerRef.current); typingSentRef.current = false; emitTyping(false);

    const settle = (real) => setMessages((prev) => prev.map((m) => (m.id === tempId ? real : m)));
    const failMark = () => setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, _pending: false, _failed: true } : m)));

    if (s && s.connected) {
      s.emit('support:message', { conversationId: activeId, body, attachments, tempId }, (res) => {
        if (res?.error) { toast.error('Message failed'); failMark(); }
        else if (res?.message) settle(res.message);
      });
    } else {
      api.post(`/support/admin/conversations/${activeId}/messages`, { body, attachments })
        .then(({ data }) => settle(data.data?.message || data.message))
        .catch(() => { toast.error('Message failed'); failMark(); });
    }
  };

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await api.post('/support/attachments', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const att = data.data || data;
      if (att?.url) setPendingAttach((prev) => [...prev, att]);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Voice note — hold the mic button, release to upload + send immediately.
  const sendVoice = async (blob) => {
    if (!activeId) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', blob, `voice-${Date.now()}.webm`);
    try {
      const { data } = await api.post('/support/attachments', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const att = data.data || data;
      if (att?.url) send([att]);
    } catch {
      toast.error('Voice message failed to upload');
    } finally {
      setUploading(false);
    }
  };
  const { recording, start: startRecording, stop: stopRecording } = useVoiceRecorder({
    onRecorded: sendVoice,
    onError: () => toast.error('Microphone access is needed to record a voice message.'),
  });

  /* ── render ── */
  return (
    <div className="flex h-[calc(100vh-1.25rem)] bg-white rounded-lg shadow-soft overflow-hidden border border-slate-200">
        {/* ── Left: list ── */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col ${activeId ? 'hidden md:flex' : 'flex'}`}>
          {/* tabs */}
          <div className="flex p-2 gap-1 border-b border-slate-100">
            {QUEUES.map((t) => (
              <button
                key={t.key}
                onClick={() => setQueue(t.key)}
                className={`flex-1 relative px-3 py-2 text-sm font-medium rounded-lg transition ${
                  queue === t.key ? 'bg-brand text-ink' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {t.label}
                {unread[t.key] > 0 && (
                  <span className="absolute top-1 right-2 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-500 text-white flex items-center justify-center">
                    {unread[t.key] > 99 ? '99+' : unread[t.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* search */}
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 h-9">
              <Search size={15} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name…"
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          {/* conversations */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex justify-center py-10 text-slate-400"><Loader2 className="animate-spin" size={20} /></div>
            ) : conversations.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-10">No conversations yet.</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openConversation(c)}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-left border-b border-slate-50 hover:bg-slate-50 transition ${
                    activeId === c.id ? 'bg-amber-50' : ''
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-amber-100 text-brand-dark font-bold flex items-center justify-center shrink-0">
                    {initialsOf(c.subjectLabel)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-ink truncate">{c.subjectLabel || 'User'}</span>
                      <span className="text-[11px] text-slate-400 shrink-0">{fmtListTime(c.lastMessageAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500 truncate">
                        {c.lastSenderRole === 'admin' ? 'You: ' : ''}{c.lastMessageText || '—'}
                      </span>
                      {c.unreadAdmin > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-brand text-ink flex items-center justify-center shrink-0">
                          {c.unreadAdmin > 99 ? '99+' : c.unreadAdmin}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Right: thread ── */}
        <div className={`flex-1 flex-col ${activeId ? 'flex' : 'hidden md:flex'}`}>
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
              <MessageCircle size={40} className="opacity-40" />
              <p className="text-sm">Select a conversation to start replying.</p>
            </div>
          ) : (
            <>
              {/* header */}
              <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-200 bg-slate-50">
                <button className="md:hidden text-slate-500" onClick={() => setActiveId(null)}><ArrowLeft size={20} /></button>
                <div className="w-10 h-10 rounded-full bg-amber-100 text-brand-dark font-bold flex items-center justify-center">
                  {initialsOf(activeConv.subjectLabel)}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-ink truncate">{activeConv.subjectLabel || 'User'}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {typingPeer
                      ? 'typing…'
                      : [activeConv.subjectEmail, activeConv.subjectPhone].filter(Boolean).join('  ·  ')
                        || (activeConv.queue === 'supplier' ? 'Supplier' : 'User')}
                  </div>
                </div>
              </div>

              {/* messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 bg-[#F7F7F5] space-y-1">
                {loadingMsgs ? (
                  <div className="flex justify-center py-10 text-slate-400"><Loader2 className="animate-spin" size={20} /></div>
                ) : (
                  messages.map((m, i) => {
                    const prev = messages[i - 1];
                    const showDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
                    const mine = m.senderRole === 'admin';
                    return (
                      <div key={m.id}>
                        {showDay && (
                          <div className="flex justify-center my-3">
                            <span className="text-[11px] bg-white/80 text-slate-500 px-3 py-1 rounded-full shadow-sm">{dayLabel(m.createdAt)}</span>
                          </div>
                        )}
                        <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                            mine ? 'bg-brand text-white rounded-br-md' : 'bg-white text-ink rounded-bl-md'
                          } ${m._failed ? 'opacity-60 ring-1 ring-red-300' : ''}`}>
                            {(m.attachments || []).map((a, idx) => (
                              <Attachment key={idx} att={a} />
                            ))}
                            {m.body ? <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p> : null}
                            <div className={`flex items-center gap-1 justify-end mt-1 text-[10px] ${mine ? 'text-white/80' : 'text-slate-400'}`}>
                              <span>{fmtTime(m.createdAt)}</span>
                              {mine && !m._pending && !m._failed && (
                                m.readByParty ? <CheckCheck size={13} className="text-blue-200" /> : <Check size={13} />
                              )}
                              {m._pending && <Loader2 size={11} className="animate-spin" />}
                              {m._failed && <span className="text-red-500">failed</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {typingPeer && (
                  <div className="flex justify-start"><div className="bg-white text-slate-400 text-xs rounded-2xl px-3 py-2 shadow-sm">typing…</div></div>
                )}
              </div>

              {/* pending attachments */}
              {pendingAttach.length > 0 && (
                <div className="flex gap-2 px-4 py-2 border-t border-slate-100 bg-white overflow-x-auto">
                  {pendingAttach.map((a, idx) => (
                    <div key={idx} className="relative shrink-0">
                      {a.type === 'image' ? (
                        <img src={fileUrl(a.url)} alt="" className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg border border-slate-200 flex flex-col items-center justify-center bg-slate-50 text-slate-500">
                          <FileText size={18} /><span className="text-[8px] mt-0.5">PDF</span>
                        </div>
                      )}
                      <button
                        onClick={() => setPendingAttach((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center"
                      ><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* composer */}
              <div className="flex items-center gap-2 p-3 border-t border-slate-200/70 bg-white">
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onPickFile} />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 shrink-0"
                  title="Attach photo or PDF"
                >
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                </button>
                <textarea
                  value={text}
                  onChange={(e) => onInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  rows={1}
                  placeholder="Type a reply…"
                  className="flex-1 resize-none max-h-28 bg-slate-500/10 rounded-full px-4 py-2.5 text-sm outline-none"
                />
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={() => recording && stopRecording()}
                  onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                  onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                  disabled={uploading}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 select-none disabled:opacity-40 ${recording ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:bg-slate-100'}`}
                  title="Hold to record a voice message"
                ><Mic size={18} /></button>
                <button
                  onClick={() => send()}
                  disabled={!text.trim() && pendingAttach.length === 0}
                  className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center shrink-0 disabled:opacity-40"
                  title="Send"
                ><Send size={18} /></button>
              </div>
            </>
          )}
        </div>
      </div>
  );
}

function Attachment({ att }) {
  if (att.type === 'image') {
    return (
      <a href={fileUrl(att.url)} target="_blank" rel="noreferrer" className="block mb-1">
        <img src={fileUrl(att.url)} alt={att.name || ''} className="max-w-[220px] max-h-56 rounded-lg object-cover" />
      </a>
    );
  }
  if (att.type === 'audio') {
    return <audio controls preload="metadata" src={fileUrl(att.url)} className="mb-1 max-w-[240px] h-10" />;
  }
  return (
    <a
      href={fileUrl(att.url)} target="_blank" rel="noreferrer"
      className="flex items-center gap-2 mb-1 bg-black/5 rounded-lg px-3 py-2 hover:bg-black/10 transition"
    >
      <FileText size={20} className="text-red-500 shrink-0" />
      <span className="text-xs truncate max-w-[180px]">{att.name || 'Document.pdf'}</span>
    </a>
  );
}
