import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Paperclip, FileText, Check, CheckCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api.js';
import { connectSupport, disconnectSupport } from '../../services/supportSocket.js';

const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
const dayLabel = (d) => {
  const date = new Date(d); const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (date.toDateString() === y.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

// Website member support — a single thread with the reconnct team. `queue`
// selects the traveller ('user') or host ('supplier') conversation; the host
// dashboard reuses this same component with queue="supplier".
export default function UserSupportPage({ queue = 'user' }) {
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [typingPeer, setTypingPeer] = useState(false);

  const socketRef = useRef(null);
  const convIdRef = useRef(null);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const typingSentRef = useRef(false);
  const typingTimerRef = useRef(null);

  const scrollEnd = useCallback(() => {
    const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get('/support/me/conversation', { params: { queue } });
        const d = data.data || data;
        if (!alive) return;
        setConv(d.conversation);
        convIdRef.current = d.conversation.id;
        setMessages(d.messages || []);
      } catch {
        toast.error('Could not open support chat');
      } finally {
        if (alive) setLoading(false);
      }

      const s = connectSupport('user');
      socketRef.current = s;
      if (!s) return;
      let hadConnected = false;
      const onConnect = () => {
        if (convIdRef.current) s.emit('support:join', { conversationId: convIdRef.current });
        if (hadConnected) {
          api.get('/support/me/conversation', { params: { queue } })
            .then(({ data }) => setMessages((data.data || data).messages || [])).catch(() => {});
        }
        hadConnected = true;
      };
      s.on('connect', onConnect);
      if (s.connected) onConnect();
      s.on('support:message', (m) => {
        if (m.conversationId !== convIdRef.current) return;
        setMessages((prev) => {
          if (m.tempId && prev.some((x) => x.id === m.tempId)) return prev.map((x) => (x.id === m.tempId ? m : x));
          if (prev.some((x) => x.id === m.id)) return prev;
          return [...prev, m];
        });
        if (m.senderRole === 'admin') s.emit('support:read', { conversationId: m.conversationId });
      });
      s.on('support:read', ({ conversationId, by }) => {
        if (conversationId === convIdRef.current && by === 'admin') {
          setMessages((prev) => prev.map((x) => (x.senderRole !== 'admin' ? { ...x, readByAdmin: true } : x)));
        }
      });
      s.on('support:typing', ({ conversationId, role, typing }) => {
        if (conversationId === convIdRef.current && role === 'admin') setTypingPeer(!!typing);
      });
    })();
    return () => { alive = false; disconnectSupport(); };
  }, []);

  useEffect(() => { scrollEnd(); }, [messages, typingPeer, scrollEnd]);

  const emitTyping = (typing) => {
    const s = socketRef.current;
    if (s && convIdRef.current) s.emit('support:typing', { conversationId: convIdRef.current, typing });
  };
  const onInput = (v) => {
    setText(v);
    if (!typingSentRef.current) { typingSentRef.current = true; emitTyping(true); }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => { typingSentRef.current = false; emitTyping(false); }, 1200);
  };

  const send = () => {
    const body = text.trim();
    const attachments = pending;
    if (!body && attachments.length === 0) return;
    const s = socketRef.current;
    const tempId = `tmp-${Date.now()}`;
    const optimistic = {
      id: tempId, tempId, conversationId: convIdRef.current, senderRole: 'user',
      body, attachments, readByAdmin: false, createdAt: new Date().toISOString(), _pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText(''); setPending([]);
    clearTimeout(typingTimerRef.current); typingSentRef.current = false; emitTyping(false);

    const settle = (real) => setMessages((prev) => prev.map((m) => (m.id === tempId ? real : m)));
    const failMark = () => setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, _pending: false, _failed: true } : m)));

    if (s && s.connected) {
      s.emit('support:message', { queue, conversationId: convIdRef.current, body, attachments, tempId }, (res) => {
        if (res?.error) { toast.error('Message failed'); failMark(); }
        else if (res?.message) settle(res.message);
      });
    } else {
      api.post('/support/me/messages', { queue, body, attachments })
        .then(({ data }) => settle((data.data || data).message))
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
      if (att?.url) setPending((prev) => [...prev, att]);
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <div className="h-[calc(100vh-1.25rem)]">
      <div className="flex flex-col h-full bg-white rounded-xl shadow-soft overflow-hidden border border-slate-200">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-slate-200 bg-slate-50">
          <div className="w-9 h-9 rounded-full bg-amber-100 text-brand-dark font-bold flex items-center justify-center">R</div>
          <div>
            <div className="font-semibold text-ink text-sm">reconnct Support</div>
            <div className="text-xs text-slate-400">{typingPeer ? 'typing…' : 'We usually reply within a day'}</div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 bg-[#f5f3ee] space-y-1">
          {loading ? (
            <div className="flex justify-center py-10 text-slate-400"><Loader2 className="animate-spin" size={20} /></div>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-10">Send a message — our team will reply here.</p>
          ) : (
            messages.map((m, i) => {
              const prev = messages[i - 1];
              const showDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
              const mine = m.senderRole !== 'admin';
              return (
                <div key={m.id}>
                  {showDay && (
                    <div className="flex justify-center my-3">
                      <span className="text-[11px] bg-white/80 text-slate-500 px-3 py-1 rounded-full shadow-sm">{dayLabel(m.createdAt)}</span>
                    </div>
                  )}
                  <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${mine ? 'bg-brand text-ink rounded-br-sm' : 'bg-white text-ink rounded-bl-sm'} ${m._failed ? 'opacity-60 ring-1 ring-red-300' : ''}`}>
                      {(m.attachments || []).map((a, idx) => <Attachment key={idx} att={a} />)}
                      {m.body ? <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p> : null}
                      <div className={`flex items-center gap-1 justify-end mt-0.5 text-[10px] ${mine ? 'text-ink/60' : 'text-slate-400'}`}>
                        <span>{fmtTime(m.createdAt)}</span>
                        {mine && !m._pending && !m._failed && (m.readByAdmin ? <CheckCheck size={13} className="text-blue-600" /> : <Check size={13} />)}
                        {m._pending && <Loader2 size={11} className="animate-spin" />}
                        {m._failed && <span className="text-red-500">failed</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {typingPeer && <div className="flex justify-start"><div className="bg-white text-slate-400 text-xs rounded-2xl px-3 py-2 shadow-sm">typing…</div></div>}
        </div>

        {pending.length > 0 && (
          <div className="flex gap-2 px-4 py-2 border-t border-slate-100 bg-white overflow-x-auto">
            {pending.map((a, idx) => (
              <div key={idx} className="relative shrink-0">
                {a.type === 'image' ? (
                  <img src={fileUrl(a.url)} alt="" className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
                ) : (
                  <div className="w-14 h-14 rounded-lg border border-slate-200 flex flex-col items-center justify-center bg-slate-50 text-slate-500">
                    <FileText size={18} /><span className="text-[8px] mt-0.5">PDF</span>
                  </div>
                )}
                <button onClick={() => setPending((p) => p.filter((_, i) => i !== idx))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700 text-white text-xs flex items-center justify-center">×</button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 p-3 border-t border-slate-200 bg-white">
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onPickFile} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 shrink-0" title="Attach">
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
          </button>
          <textarea
            value={text}
            onChange={(e) => onInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            placeholder="Type a message…"
            className="flex-1 resize-none max-h-28 bg-slate-100 rounded-2xl px-4 py-2.5 text-sm outline-none"
          />
          <button onClick={send} disabled={!text.trim() && pending.length === 0} className="w-10 h-10 rounded-full bg-brand text-ink flex items-center justify-center shrink-0 disabled:opacity-40" title="Send">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Attachment({ att }) {
  const url = fileUrl(att.url);
  if (att.type === 'image') {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block mb-1">
        <img src={url} alt={att.name || ''} className="max-w-[220px] max-h-56 rounded-lg object-cover" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 mb-1 bg-black/5 rounded-lg px-3 py-2 hover:bg-black/10 transition">
      <FileText size={20} className="text-red-500 shrink-0" />
      <span className="text-xs truncate max-w-[180px]">{att.name || 'Document.pdf'}</span>
    </a>
  );
}
