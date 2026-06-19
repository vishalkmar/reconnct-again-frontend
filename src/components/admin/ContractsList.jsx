import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Loader2, FileText, FileType2, ScrollText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

// Download an authenticated file (blob) — opening the URL directly wouldn't send
// the admin Authorization header.
const download = async (url, fallbackName) => {
  const res = await api.get(url, { responseType: 'blob' });
  const cd = res.headers['content-disposition'] || '';
  const m = cd.match(/filename="?([^"]+)"?/);
  const name = m ? m[1] : fallbackName;
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(href);
};

export default function ContractsList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/contracts');
      setItems(res.data?.data?.items || []);
    } catch {
      toast.error('Could not load contracts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id, name) => {
    if (!window.confirm(`Delete contract "${name}"? This cannot be undone.`)) return;
    try { await api.delete(`/contracts/${id}`); toast.success('Deleted'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const grab = async (id, kind) => {
    try { await download(`/contracts/${id}/${kind}`, `contract-${id}.${kind === 'pdf' ? 'pdf' : 'doc'}`); }
    catch { toast.error('Download failed'); }
  };

  const countItems = (c) => (Array.isArray(c.items) ? c.items.filter((i) => i.include !== false && Number(i.b2bPrice) > 0).length : 0);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm text-ink-muted">Generate &amp; manage B2B agreements with your suppliers.</p>
        <button onClick={() => navigate('/admin/contracts/new')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105">
          <Plus size={18} /> New contract
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-brand/10 text-brand items-center justify-center mb-4"><ScrollText size={26} /></div>
          <h2 className="font-semibold text-lg">No contracts yet</h2>
          <p className="text-sm text-ink-muted mt-1">Create a B2B contract for a supplier.</p>
          <button onClick={() => navigate('/admin/contracts/new')} className="inline-block mt-5 px-5 py-2.5 rounded-lg bg-brand text-ink font-semibold">New contract</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <div className="hidden md:grid grid-cols-12 px-5 py-3 bg-surface-alt text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <div className="col-span-4">Title</div>
            <div className="col-span-3">Supplier</div>
            <div className="col-span-2">Activities</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>
          <ul className="divide-y divide-slate-100">
            {items.map((c) => (
              <li key={c.id} className="grid grid-cols-12 gap-2 px-4 sm:px-5 py-3.5 items-center">
                <div className="col-span-12 md:col-span-4 min-w-0">
                  <div className="font-semibold text-ink truncate">{c.title}</div>
                  <div className="text-[11px] text-ink-muted">{new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
                <div className="col-span-6 md:col-span-3 text-sm text-ink-muted truncate">{c.supplier?.companyName || '—'}</div>
                <div className="col-span-6 md:col-span-2 text-sm text-ink-muted">{countItems(c)} priced</div>
                <div className="col-span-12 md:col-span-3 flex items-center justify-end gap-1">
                  <IconBtn title="Download PDF" onClick={() => grab(c.id, 'pdf')}><FileText size={15} /></IconBtn>
                  <IconBtn title="Download Word" onClick={() => grab(c.id, 'word')}><FileType2 size={15} /></IconBtn>
                  <IconBtn title="Edit" onClick={() => navigate(`/admin/contracts/${c.id}/edit`)}><Pencil size={15} /></IconBtn>
                  <IconBtn title="Delete" danger onClick={() => remove(c.id, c.title)}><Trash2 size={15} /></IconBtn>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function IconBtn({ title, onClick, children, danger }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={`p-2 rounded-lg transition ${danger ? 'text-rose-500 hover:bg-rose-50' : 'text-ink-muted hover:bg-surface-alt hover:text-brand'}`}>
      {children}
    </button>
  );
}
