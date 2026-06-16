import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Eye, EyeOff, Bed, Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import ToggleSwitch from '../../components/admin/ToggleSwitch.jsx';
import RowDetailsModal from '../../components/admin/RowDetailsModal.jsx';

export default function AvailableRoomsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const ownerType = params.get('ownerType') === 'package' ? 'package' : 'hotel';
  const hotelIdFilter = params.get('hotelId') || '';
  const packageIdFilter = params.get('packageId') || '';
  const isPackage = ownerType === 'package';

  const [rooms, setRooms] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  // Owner dropdown options
  useEffect(() => {
    api.get('/hotels/admin/all').then((r) => setHotels(r.data.data.items)).catch(() => {});
    api.get('/packages/admin/all').then((r) => setPackages(r.data.data.items || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = { ownerType };
      if (isPackage) {
        if (packageIdFilter) query.packageId = packageIdFilter;
      } else if (hotelIdFilter) {
        query.hotelId = hotelIdFilter;
      }
      const res = await api.get('/rooms/admin/all', { params: query });
      setRooms(res.data.data.items);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [ownerType, isPackage, hotelIdFilter, packageIdFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = rooms.filter((r) =>
    !search || r.name.toLowerCase().includes(search.toLowerCase())
  );

  const onOwnerTypeChange = (t) => {
    const next = new URLSearchParams();
    next.set('ownerType', t);
    setParams(next, { replace: true });
  };

  const onHotelChange = (id) => {
    const next = new URLSearchParams(params);
    next.set('ownerType', 'hotel');
    next.delete('packageId');
    if (id) next.set('hotelId', id); else next.delete('hotelId');
    setParams(next, { replace: true });
  };

  const onPackageChange = (id) => {
    const next = new URLSearchParams(params);
    next.set('ownerType', 'package');
    next.delete('hotelId');
    if (id) next.set('packageId', id); else next.delete('packageId');
    setParams(next, { replace: true });
  };

  const toggle = async (r) => {
    try {
      await api.patch(`/rooms/${r.id}/toggle`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toggle failed');
    }
  };

  const duplicate = async (r) => {
    if (duplicatingId) return;
    setDuplicatingId(r.id);
    try {
      const res = await api.post(`/rooms/${r.id}/duplicate`);
      const newId = res.data?.data?.room?.id;
      toast.success('Room duplicated — opening for edit');
      if (newId) navigate(`/admin/rooms/${newId}/edit`);
      else load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Duplicate failed');
    } finally {
      setDuplicatingId(null);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/rooms/${deleteId}`);
      toast.success('Room deleted');
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // Group by owner (hotel or package) for nicer display
  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((r) => {
      const owner = r.ownerType === 'package' ? r.package : r.hotel;
      const key = `${r.ownerType}-${owner?.id || r.packageId || r.hotelId}`;
      if (!map.has(key)) map.set(key, { owner, ownerType: r.ownerType, items: [] });
      map.get(key).items.push(r);
    });
    return Array.from(map.values());
  }, [filtered]);

  const selectedHotel = hotels.find((h) => String(h.id) === String(hotelIdFilter));
  const selectedPackage = packages.find((p) => String(p.id) === String(packageIdFilter));
  const newRoomHref = isPackage
    ? (packageIdFilter ? `/admin/rooms/new?packageId=${packageIdFilter}` : '/admin/rooms/new?ownerType=package')
    : (hotelIdFilter ? `/admin/rooms/new?hotelId=${hotelIdFilter}` : '/admin/rooms/new');

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Available Rooms</h1>
          <p className="text-ink-muted text-sm">
            Rooms belong to a hotel or a package. Pick the owner type, then a specific one to focus the list.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <input
            className="input"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input"
            value={ownerType}
            onChange={(e) => onOwnerTypeChange(e.target.value)}
            title="Owner type"
          >
            <option value="hotel">Hotels</option>
            <option value="package">Packages</option>
          </select>
          {isPackage ? (
            <select className="input" value={packageIdFilter} onChange={(e) => onPackageChange(e.target.value)}>
              <option value="">All packages</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          ) : (
            <select className="input" value={hotelIdFilter} onChange={(e) => onHotelChange(e.target.value)}>
              <option value="">All hotels</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          )}
          <Link to={newRoomHref} className="btn-primary whitespace-nowrap">
            <Plus size={18} /> New
          </Link>
        </div>
      </div>

      {selectedHotel && (
        <div className="mb-4 text-xs text-ink-muted">
          Showing rooms for <strong>{selectedHotel.name}</strong> ·{' '}
          <button type="button" onClick={() => onHotelChange('')} className="text-brand hover:underline">
            Clear filter
          </button>
        </div>
      )}
      {selectedPackage && (
        <div className="mb-4 text-xs text-ink-muted">
          Showing rooms for package <strong>{selectedPackage.name}</strong> ·{' '}
          <button type="button" onClick={() => onPackageChange('')} className="text-brand hover:underline">
            Clear filter
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Bed size={40} className="mx-auto text-ink-muted mb-3" />
          <p className="text-ink-muted">No rooms{hotelIdFilter ? ' for this hotel' : ''} yet. Click <strong>New</strong> to add one.</p>
        </div>
      ) : (
        grouped.map(({ owner, ownerType: groupType, items }) => (
          <div key={`${groupType}-${owner?.id || 'unknown'}`} className="card overflow-hidden mb-5">
            <div className="px-4 py-3 bg-surface-alt text-xs uppercase font-semibold tracking-wide text-ink-muted flex items-center justify-between">
              <span>
                {owner?.name || (groupType === 'package' ? 'Unknown package' : 'Unknown hotel')}{' '}
                <span className="text-ink-muted/70 font-normal normal-case">
                  · {groupType === 'package' ? 'Package' : 'Hotel'} · {items.length} room{items.length === 1 ? '' : 's'}
                </span>
              </span>
              {owner?.id && (
                <Link
                  to={groupType === 'package' ? `/admin/packages/${owner.id}/edit` : `/admin/hotels/${owner.id}/edit`}
                  className="text-brand hover:underline normal-case"
                >
                  Edit {groupType === 'package' ? 'package' : 'hotel'} →
                </Link>
              )}
            </div>
            <div className="grid grid-cols-12 px-4 py-2 bg-white border-t text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              <div className="col-span-1">Image</div>
              <div className="col-span-4">Name</div>
              <div className="col-span-2">Size</div>
              <div className="col-span-2">Price</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {items.map((r) => (
              <div key={r.id} className={`grid grid-cols-12 items-center px-4 py-3 border-t hover:bg-surface-alt/50 ${!r.isActive && 'opacity-60'}`}>
                <div className="col-span-1">
                  <div className="w-14 h-10 rounded-md overflow-hidden bg-slate-100 flex items-center justify-center">
                    {r.mainImage ? (
                      <img src={fileUrl(r.mainImage)} alt={r.name} className="w-full h-full object-cover" />
                    ) : (
                      <Bed size={14} className="text-ink-muted" />
                    )}
                  </div>
                </div>
                <div className="col-span-4">
                  <div className="font-medium text-sm leading-tight">{r.name}</div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    Up to {r.maxOccupancy} guests
                    {r.views?.length > 0 && (
                      <> · {r.views.map((v) => v.name).join(', ')}</>
                    )}
                  </div>
                </div>
                <div className="col-span-2 text-sm text-ink-muted">
                  {r.roomSize || '—'}
                </div>
                <div className="col-span-2 text-sm">
                  <span className="font-bold text-brand">
                    {r.currency} {Number(r.price).toLocaleString()}
                  </span>
                  {r.priceOriginal && Number(r.priceOriginal) > Number(r.price) && (
                    <div className="line-through text-ink-muted text-[11px]">
                      {Number(r.priceOriginal).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="col-span-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                    {r.isActive ? 'LIVE' : 'DRAFT'}
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  <ToggleSwitch checked={r.isActive} onChange={() => toggle(r)} size="sm" />
                  <button onClick={() => setViewItem(r)} className="p-1.5 hover:bg-surface-alt rounded" title="View details">
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => duplicate(r)}
                    disabled={duplicatingId === r.id}
                    className="p-1.5 hover:bg-surface-alt rounded disabled:opacity-50"
                    title="Duplicate"
                  >
                    <Copy size={16} />
                  </button>
                  <Link
                    to={`/admin/rooms/${r.id}/edit`}
                    className="p-1.5 hover:bg-surface-alt rounded"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </Link>
                  <button
                    onClick={() => setDeleteId(r.id)}
                    className="p-1.5 hover:bg-red-50 text-red-600 rounded"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete room?"
        message="This will permanently remove the room and its gallery. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />

      <RowDetailsModal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem?.name}
        data={viewItem}
      />
    </div>
  );
}
