import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, Trash2, Image as ImageIcon, Tag, MapPin,
  Calendar, DollarSign, ListChecks, HelpCircle, User, Settings,
  Utensils, Sparkles, Hotel, Plus, Shield, RefreshCcw,
  XCircle, BookOpen, Heart, Award, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import { onlyStateLocations } from '../../utils/indianStates.js';
import MultiSelectChips from '../../components/admin/MultiSelectChips.jsx';
import CheckboxChips from '../../components/admin/CheckboxChips.jsx';
import { ItineraryEditor, FaqEditor } from '../../components/admin/KeyValueListEditor.jsx';
import Dropzone from '../../components/admin/Dropzone.jsx';
import RichTextEditor from '../../components/admin/RichTextEditor.jsx';
import GstSelect from '../../components/admin/GstSelect.jsx';
import TcsSelect from '../../components/admin/TcsSelect.jsx';
import PriceTypeSelect from '../../components/admin/PriceTypeSelect.jsx';
import usePersistedForm from '../../hooks/usePersistedForm.js';
import DatePicker from '../../components/common/DatePicker.jsx';
import { priceUnitLabel } from '../../utils/priceType.js';

const MEAL_OPTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Drinks', 'Tea / Coffee'];
const DIET_OPTIONS = [
  'Dairy-free', 'Egg-free', 'Gluten Free', 'Halal', 'Kosher',
  'Low fat', 'Nut-allergy-friendly', 'Organic', 'Vegan', 'Vegetarian',
];
const FACILITY_OPTIONS = [
  'A/C rooms', 'Free Wifi', 'Free parking', 'Garden', 'Laundry', 'Pool',
  'Restaurant', 'Spa', 'Terrace', 'Yoga Shala/Deck', 'Gym', 'Sauna',
  'Hot tub', 'Beach access', 'Lake access', 'Library', 'Cafe',
];

const blankForm = {
  name: '', slug: '',
  shortDescription: '', description: '',
  videoUrl: '',
  cityId: '', cityName: '', locationId: '', locationDetail: '',
  primaryImageUrl: '', hostImageUrl: '', galleryUrls: [],
  durationDays: 1, durationNights: 0, timing: '',
  availableAllYear: true, startDate: '', endDate: '',
  minGroupSize: 1, maxGroupSize: 30,
  priceFrom: 0, priceOriginal: '', gstRate: 0, tcsRate: 0, priceType: 'per_person', priceLabel: '', currency: 'INR',
  freeCancellation: true, isRefundable: true, isGoldHost: false,
  isFeatured: false, isPopular: false, isActive: true,
  richContent: '',
  highlightsRich: '', inclusionsRich: '', exclusionsRich: '',
  termsConditions: '', refundsPolicy: '', cancellationPolicy: '',
  bookingTerms: '', retreatExperience: '', whatMakesSpecial: '',
  fullProgramTiming: '',
  food: '', meals: [], diets: [],
  benefits: '',
  facilities: [],
  itinerary: [], faqs: [],
  hostName: '', hostBio: '',
  // Check-Availability assignment
  pwaOwnerId: '', pwaSalespersonId: '',
  ownerContactName: '', ownerContactEmail: '', ownerContactPhone: '',
  metaTitle: '', metaDescription: '',
  sortOrder: 0,
  categoryIds: [], problemIds: [], activityIds: [],
  nearbyPlaceIds: [], areaIds: [], cultureIds: [],
  trainerIds: [],
};

function Section({ icon: Icon, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card mb-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
            <Icon size={18} />
          </div>
          <h3 className="font-display font-semibold">{title}</h3>
        </div>
        <span className="text-ink-muted text-xs">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && <div className="px-5 pb-5 border-t pt-5 space-y-4">{children}</div>}
    </div>
  );
}

export default function PackageFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();

  const {
    value: form,
    setValue: setForm,
    hydrateFromServer,
    clearDraft,
    discardDraft,
    hasDraft,
  } = usePersistedForm(`package-form:${id || 'new'}`, blankForm, { editing });
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);

  const [replaceGallery, setReplaceGallery] = useState(false);

  const [cities, setCities] = useState([]);
  const [locationsList, setLocationsList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [problems, setProblems] = useState([]);
  const [activities, setActivities] = useState([]);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [areas, setAreas] = useState([]);
  const [cultures, setCultures] = useState([]);
  const [trainersList, setTrainersList] = useState([]);
  const [salespersons, setSalespersons] = useState([]);
  const [pwaOwners, setPwaOwners] = useState([]);

  // Load taxonomies
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [c, loc, cat, p, act, np, ar, cu, tr] = await Promise.all([
          api.get('/cities/all'),
          api.get('/locations/all'),
          api.get('/categories/all'),
          api.get('/problems/all'),
          api.get('/activities/all'),
          api.get('/nearby-places/all'),
          api.get('/areas/all'),
          api.get('/cultures/all'),
          api.get('/trainers/admin/all'),
        ]);
        setCities(c.data.data.items);
        setLocationsList(loc.data.data.items);
        setCategories(cat.data.data.items);
        setProblems(p.data.data.items);
        setActivities(act.data.data.items);
        setNearbyPlaces(np.data.data.items);
        setAreas(ar.data.data.items);
        setCultures(cu.data.data.items);
        setTrainersList(tr.data.data.items);
      } catch (err) {
        toast.error('Failed to load taxonomies');
      }

      // Salespersons + property owners for the Check-Availability section.
      // Failures here are non-fatal — the user can still save without
      // assigning anyone.
      try {
        const [spRes, ownerRes] = await Promise.all([
          api.get('/pwa/admin/salespersons'),
          api.get('/pwa/admin/owners'),
        ]);
        setSalespersons(spRes.data?.data?.items || []);
        setPwaOwners(ownerRes.data?.data?.items || []);
      } catch { /* swallow — UI shows empty dropdowns */ }
    };
    fetchAll();
  }, []);

  // Load package if editing
  const loadPkg = useCallback(async () => {
    if (!editing) return;
    setLoading(true);
    try {
      const res = await api.get(`/packages/admin/${id}`);
      const p = res.data.data.package;
      setPkg(p);
      hydrateFromServer({
        name: p.name || '',
        slug: p.slug || '',
        shortDescription: p.shortDescription || '',
        description: p.description || '',
        videoUrl: p.videoUrl || '',
        cityId: p.cityId || '',
        cityName: p.cityName || '',
        primaryImageUrl: p.primaryImage || '',
        hostImageUrl: p.hostImage || '',
        galleryUrls: [],
        locationId: p.locationId || '',
        locationDetail: p.locationDetail || '',
        durationDays: p.durationDays ?? 1,
        durationNights: p.durationNights ?? 0,
        timing: p.timing || '',
        availableAllYear: p.availableAllYear ?? true,
        startDate: p.startDate || '',
        endDate: p.endDate || '',
        minGroupSize: p.minGroupSize ?? 1,
        maxGroupSize: p.maxGroupSize ?? 30,
        priceFrom: p.priceFrom ?? 0,
        priceOriginal: p.priceOriginal ?? '',
        gstRate: p.gstRate ?? 0,
        tcsRate: p.tcsRate ?? 0,
        priceType: p.priceType || 'per_person',
        priceLabel: p.priceLabel ?? '',
        currency: p.currency || 'INR',
        freeCancellation: p.freeCancellation ?? true,
        isRefundable: p.isRefundable ?? true,
        isGoldHost: !!p.isGoldHost,
        isFeatured: !!p.isFeatured,
        isPopular: !!p.isPopular,
        isActive: p.isActive ?? true,
        richContent: p.richContent || '',
        highlightsRich: p.highlightsRich || '',
        inclusionsRich: p.inclusionsRich || '',
        exclusionsRich: p.exclusionsRich || '',
        termsConditions: p.termsConditions || '',
        refundsPolicy: p.refundsPolicy || '',
        cancellationPolicy: p.cancellationPolicy || '',
        bookingTerms: p.bookingTerms || '',
        retreatExperience: p.retreatExperience || '',
        whatMakesSpecial: p.whatMakesSpecial || '',
        fullProgramTiming: p.fullProgramTiming || '',
        food: p.food || '',
        meals: p.meals || [],
        diets: p.diets || [],
        benefits: p.benefits || '',
        facilities: p.facilities || [],
        itinerary: p.itinerary || [],
        faqs: p.faqs || [],
        hostName: p.hostName || '',
        hostBio: p.hostBio || '',
        pwaOwnerId: p.pwaOwnerId ?? '',
        pwaSalespersonId: p.pwaSalespersonId ?? '',
        ownerContactName: p.ownerContactName || '',
        ownerContactEmail: p.ownerContactEmail || '',
        ownerContactPhone: p.ownerContactPhone || '',
        metaTitle: p.metaTitle || '',
        metaDescription: p.metaDescription || '',
        sortOrder: p.sortOrder ?? 0,
        categoryIds: (p.categories || []).map((c) => c.id),
        problemIds: (p.problems || []).map((c) => c.id),
        activityIds: (p.activities || []).map((c) => c.id),
        nearbyPlaceIds: (p.nearbyPlaces || []).map((c) => c.id),
        areaIds: (p.areas || []).map((c) => c.id),
        cultureIds: (p.cultures || []).map((c) => c.id),
        trainerIds: (p.trainers || []).map((t) => t.id),
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load package');
    } finally {
      setLoading(false);
    }
  }, [editing, id]);

  useEffect(() => { loadPkg(); }, [loadPkg]);

  const change = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) return toast.error('Name is required');

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
        fd.append(k, JSON.stringify(v));
      } else {
        fd.append(k, v);
      }
    });
    // Images uploaded instantly → URLs travel in the form.
    if (editing && replaceGallery) fd.append('replaceGallery', 'true');

    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/packages/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Package saved');
        clearDraft();
      } else {
        const res = await api.post('/packages', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Package created');
        clearDraft();
        navigate(`/admin/packages/${res.data.data.package.id}/edit`, { replace: true });
        return;
      }
      loadPkg();
      change('galleryUrls', []);
      setReplaceGallery(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const removeGalleryImg = async (imageId) => {
    if (!confirm('Remove this image?')) return;
    try {
      await api.delete(`/packages/${id}/gallery/${imageId}`);
      toast.success('Image removed');
      loadPkg();
    } catch (err) {
      toast.error('Remove failed');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/admin/packages" className="p-2 rounded-lg hover:bg-surface-alt">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold">
              {editing ? 'Edit Package' : 'New Package'}
            </h1>
            {editing && pkg && (
              <p className="text-xs text-ink-muted">
                Public URL:{' '}
                <Link to={`/retreats/${pkg.slug}`} target="_blank" className="text-brand hover:underline">
                  /retreats/{pkg.slug}
                </Link>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasDraft && (
            <button
              type="button"
              onClick={() => {
                if (!confirm('Discard unsaved draft and reload from the server?')) return;
                discardDraft();
                if (editing) loadPkg();
              }}
              className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100"
              title="Discard unsaved changes and reload from the server"
            >
              Discard draft
            </button>
          )}
          <button disabled={submitting} className="btn-primary">
            <Save size={16} /> {submitting ? 'Saving…' : 'Save package'}
          </button>
        </div>
      </div>

      {/* Basic */}
      <Section icon={Tag} title="Basic info">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
          <div className="sm:col-span-2">
            <label className="label">Name *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => change('name', e.target.value)}
              placeholder="3 Day Kerala Ayurveda and Yoga Retreat"
              required
            />
          </div>
          <div>
            <label className="label">Property name</label>
            <input
              className="input"
              value={form.slug}
              onChange={(e) => change('slug', e.target.value)}
              placeholder="kerala-ayurveda-yoga"
            />
          </div>
          <div>
            <label className="label">Sort order</label>
            <input
              type="number" className="input"
              value={form.sortOrder}
              onChange={(e) => change('sortOrder', parseInt(e.target.value || 0, 10))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Short description</label>
            <RichTextEditor
              value={form.shortDescription}
              onChange={(v) => change('shortDescription', v)}
              placeholder="A short teaser shown in cards & listings — formatting and icons supported."
              minHeight={140}
            />
            <p className="text-[11px] text-ink-muted mt-1.5">
              Rich text · shown in cards, listings and the top of the detail page.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Full description</label>
            <RichTextEditor
              value={form.description}
              onChange={(v) => change('description', v)}
              placeholder="A detailed write-up about the retreat — formatting, lists, headings will render exactly as you see them."
              minHeight={180}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Overview video URL</label>
            <input
              className="input"
              value={form.videoUrl}
              onChange={(e) => change('videoUrl', e.target.value)}
              placeholder="https://… (YouTube, Vimeo, MP4)"
            />
          </div>
        </div>
      </Section>

      {/* Media */}
      <Section icon={ImageIcon} title="Media — primary image & gallery">
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="label">Primary image</label>
            <Dropzone
              accept="image/*"
              instant
              value={form.primaryImageUrl}
              onChange={(u) => change('primaryImageUrl', u || '')}
              placeholder="Drag & drop primary image, or click"
            />
          </div>

          <div>
            <label className="label">Gallery (multiple)</label>
            <Dropzone
              accept="image/*"
              multiple
              instant
              value={form.galleryUrls}
              onChange={(v) => change('galleryUrls', v || [])}
              placeholder="Drag & drop multiple images, or click"
            />
            {editing && pkg?.gallery?.length > 0 && (
              <label className="flex items-center gap-2 text-sm mt-2">
                <input type="checkbox" checked={replaceGallery} onChange={(e) => setReplaceGallery(e.target.checked)} />
                Replace existing gallery
              </label>
            )}
          </div>
        </div>

        {pkg?.gallery?.length > 0 && (
          <div>
            <label className="label">Existing gallery</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {pkg.gallery.map((g) => (
                <div key={g.id} className="relative group rounded-lg overflow-hidden border">
                  <img src={fileUrl(g.url)} className="w-full h-24 object-cover" alt="" />
                  <button
                    type="button"
                    onClick={() => removeGalleryImg(g.id)}
                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Location & timing */}
      <Section icon={MapPin} title="Location & timing">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">State</label>
            <select className="input" value={form.locationId} onChange={(e) => change('locationId', e.target.value)}>
              <option value="">— select —</option>
              {onlyStateLocations(locationsList).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <p className="text-[11px] text-ink-muted mt-1">Indian states &amp; union territories.</p>
          </div>
          <div>
            <label className="label">City (optional)</label>
            <input
              className="input"
              value={form.cityName}
              onChange={(e) => change('cityName', e.target.value)}
              placeholder="Type the city name"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Location detail (free text)</label>
            <input
              className="input"
              value={form.locationDetail}
              onChange={(e) => change('locationDetail', e.target.value)}
              placeholder="Kochi, Kerala, India"
            />
          </div>
          <div>
            <label className="label">Duration (days)</label>
            <input
              type="number" min={1} className="input"
              value={form.durationDays}
              onChange={(e) => change('durationDays', parseInt(e.target.value || 1, 10))}
            />
          </div>
          <div>
            <label className="label">Nights</label>
            <input
              type="number" min={0} className="input"
              value={form.durationNights}
              onChange={(e) => change('durationNights', parseInt(e.target.value || 0, 10))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Timing label</label>
            <input
              className="input"
              value={form.timing}
              onChange={(e) => change('timing', e.target.value)}
              placeholder="Available all year round"
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox" checked={form.availableAllYear}
              onChange={(e) => change('availableAllYear', e.target.checked)}
            />
            Available all year round (skip start/end dates)
          </label>
          {!form.availableAllYear && (
            <>
              <div>
                <label className="label">Start date</label>
                <DatePicker
                  value={form.startDate || ''}
                  onChange={(v) => change('startDate', v)}
                  placeholder="When does the retreat begin?"
                />
              </div>
              <div>
                <label className="label">End date</label>
                <DatePicker
                  value={form.endDate || ''}
                  min={form.startDate || undefined}
                  onChange={(v) => change('endDate', v)}
                  placeholder="When does it end?"
                />
              </div>
            </>
          )}
          <div>
            <label className="label">Min group size</label>
            <input
              type="number" min={1} className="input"
              value={form.minGroupSize}
              onChange={(e) => change('minGroupSize', parseInt(e.target.value || 1, 10))}
            />
          </div>
          <div>
            <label className="label">Max group size</label>
            <input
              type="number" min={1} className="input"
              value={form.maxGroupSize}
              onChange={(e) => change('maxGroupSize', parseInt(e.target.value || 30, 10))}
            />
          </div>
        </div>
      </Section>

      {/* Pricing */}
      <Section icon={DollarSign} title="Pricing">
        <div className="grid sm:grid-cols-4 gap-4">
          <div>
            <label className="label">Price from ({priceUnitLabel(form.priceType, form.priceLabel) || 'per person'}) *</label>
            <input
              type="number" min={0} step="0.01" className="input"
              value={form.priceFrom}
              onChange={(e) => change('priceFrom', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Original price (strike-through)</label>
            <input
              type="number" min={0} step="0.01" className="input"
              value={form.priceOriginal}
              onChange={(e) => change('priceOriginal', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Currency</label>
            <input
              className="input"
              value={form.currency}
              onChange={(e) => change('currency', e.target.value)}
              placeholder="INR / USD / EUR"
            />
          </div>
          <PriceTypeSelect
            priceType={form.priceType}
            priceLabel={form.priceLabel}
            onType={(v) => change('priceType', v)}
            onLabel={(v) => change('priceLabel', v)}
          />
          <GstSelect value={form.gstRate} onChange={(v) => change('gstRate', v)} />
          <TcsSelect value={form.tcsRate} onChange={(v) => change('tcsRate', v)} />
        </div>
      </Section>

      {/* Taxonomies */}
      <Section icon={Tag} title="Categories, problems, activities, areas, cultures, nearby places">
        <div>
          <label className="label">Categories</label>
          <MultiSelectChips
            options={categories}
            value={form.categoryIds}
            onChange={(v) => change('categoryIds', v)}
            color="wellness"
          />
        </div>
        <div>
          <label className="label">Problems / conditions this retreat helps</label>
          <MultiSelectChips
            options={problems}
            value={form.problemIds}
            onChange={(v) => change('problemIds', v)}
            color="wellness"
          />
        </div>
        <div>
          <label className="label">Activities included</label>
          <MultiSelectChips
            options={activities}
            value={form.activityIds}
            onChange={(v) => change('activityIds', v)}
          />
        </div>
        <div>
          <label className="label">Areas</label>
          <MultiSelectChips
            options={areas}
            value={form.areaIds}
            onChange={(v) => change('areaIds', v)}
            color="brand"
          />
          <p className="text-[11px] text-ink-muted mt-1.5">
            Manage in{' '}
            <Link to="/admin/content/areas" className="text-brand hover:underline">Areas</Link>
          </p>
        </div>
        <div>
          <label className="label">Cultures</label>
          <MultiSelectChips
            options={cultures}
            value={form.cultureIds}
            onChange={(v) => change('cultureIds', v)}
            color="wellness"
          />
          <p className="text-[11px] text-ink-muted mt-1.5">
            Manage in{' '}
            <Link to="/admin/content/cultures" className="text-brand hover:underline">Cultures</Link>
          </p>
        </div>
        <div>
          <label className="label">Nearby places (for "nearest things" filter)</label>
          <MultiSelectChips
            options={nearbyPlaces}
            value={form.nearbyPlaceIds}
            onChange={(v) => change('nearbyPlaceIds', v)}
            color="brand"
          />
          <p className="text-[11px] text-ink-muted mt-1.5">
            Manage in{' '}
            <Link to="/admin/hotels-config/nearby-places" className="text-brand hover:underline">Nearby places</Link>
          </p>
        </div>
        <div className="border-t pt-4 mt-2">
          <label className="label">Trainers leading this package</label>
          <p className="text-[11px] text-ink-muted -mt-1 mb-2">
            Select one or more trainers — their profiles will appear on the retreat detail page.
          </p>
          <MultiSelectChips
            options={trainersList.map((t) => ({ id: t.id, name: t.role ? `${t.name} · ${t.role}` : t.name }))}
            value={form.trainerIds}
            onChange={(v) => change('trainerIds', v)}
            color="brand"
          />
          <p className="text-[11px] text-ink-muted mt-1.5">
            Manage in{' '}
            <Link to="/admin/trainers" className="text-brand hover:underline">Trainer Profiles</Link>
          </p>
        </div>
      </Section>

      {/* Highlights — independent rich-text */}
      <Section icon={ListChecks} title="Highlights">
        <p className="text-xs text-ink-muted -mt-1">
          The top reasons guests should pick this retreat. Use lists, icons and bold to structure it.
        </p>
        <RichTextEditor
          value={form.highlightsRich}
          onChange={(v) => change('highlightsRich', v)}
          placeholder={'• 3 nights stay in a beachfront cottage\n• Sunrise yoga sessions\n• Personal Ayurvedic consultation'}
          minHeight={200}
        />
      </Section>

      {/* What's included — independent rich-text */}
      <Section icon={ListChecks} title="What's included">
        <p className="text-xs text-ink-muted -mt-1">
          Everything covered in the package price.
        </p>
        <RichTextEditor
          value={form.inclusionsRich}
          onChange={(v) => change('inclusionsRich', v)}
          placeholder={'• Daily yoga & meditation\n• 3 vegetarian meals/day\n• Airport transfers'}
          minHeight={200}
        />
      </Section>

      {/* What's not included — independent rich-text */}
      <Section icon={ListChecks} title="What's not included">
        <p className="text-xs text-ink-muted -mt-1">
          Things guests need to arrange or pay for separately.
        </p>
        <RichTextEditor
          value={form.exclusionsRich}
          onChange={(v) => change('exclusionsRich', v)}
          placeholder={'• Flights to/from destination\n• Travel insurance\n• Personal expenses'}
          minHeight={200}
        />
      </Section>

      {/* Benefits — rich text */}
      <Section icon={Sparkles} title="Benefits" defaultOpen={false}>
        <p className="text-xs text-ink-muted -mt-1">
          What guests can expect to gain — physically, mentally, emotionally.
        </p>
        <RichTextEditor
          value={form.benefits}
          onChange={(v) => change('benefits', v)}
          placeholder="The ideal place to unplug, slow down and reconnect…"
          minHeight={200}
        />
      </Section>

      {/* Food & diets */}
      <Section icon={Utensils} title="Food, meals & diets" defaultOpen={false}>
        <div>
          <label className="label">Food description</label>
          <RichTextEditor
            value={form.food}
            onChange={(v) => change('food', v)}
            placeholder="At our retreat we serve nourishing whole-food, vegan and vegetarian cuisine…"
            minHeight={180}
          />
        </div>
        <div>
          <label className="label">Meals provided</label>
          <CheckboxChips
            options={MEAL_OPTIONS}
            value={form.meals}
            onChange={(v) => change('meals', v)}
          />
        </div>
        <div>
          <label className="label">Diets catered</label>
          <CheckboxChips
            options={DIET_OPTIONS}
            value={form.diets}
            onChange={(v) => change('diets', v)}
          />
        </div>
      </Section>

      {/* Facilities */}
      <Section icon={Hotel} title="Facilities available" defaultOpen={false}>
        <CheckboxChips
          options={[
            ...FACILITY_OPTIONS,
            // surface any custom facilities already saved so they keep their checked state
            ...(form.facilities || []).filter((f) => !FACILITY_OPTIONS.includes(f)),
          ]}
          value={form.facilities}
          onChange={(v) => change('facilities', v)}
        />
        <CustomFacilityInput
          existing={form.facilities}
          onAdd={(name) => change('facilities', [...(form.facilities || []), name])}
        />
      </Section>

      {/* Retreat Experience — rich text */}
      <Section icon={Heart} title="Retreat Experience" defaultOpen={false}>
        <p className="text-xs text-ink-muted -mt-1">
          Walk guests through what the retreat feels like — the vibe, mood, atmosphere.
        </p>
        <RichTextEditor
          value={form.retreatExperience}
          onChange={(v) => change('retreatExperience', v)}
          placeholder="Describe the day-to-day feel of the retreat — quiet mornings, group meals, evening sound baths…"
          minHeight={200}
        />
      </Section>

      {/* What makes this retreat special */}
      <Section icon={Award} title="What makes this retreat special" defaultOpen={false}>
        <p className="text-xs text-ink-muted -mt-1">
          The unique angle that sets this retreat apart from others.
        </p>
        <RichTextEditor
          value={form.whatMakesSpecial}
          onChange={(v) => change('whatMakesSpecial', v)}
          placeholder="Our signature riverside meditation deck, the lineage of our teachers, locally-sourced organic kitchen…"
          minHeight={200}
        />
      </Section>

      {/* Full program timing */}
      <Section icon={Clock} title="Full program timing" defaultOpen={false}>
        <p className="text-xs text-ink-muted -mt-1">
          A detailed schedule — daily routines, session timings, free hours.
        </p>
        <RichTextEditor
          value={form.fullProgramTiming}
          onChange={(v) => change('fullProgramTiming', v)}
          placeholder={'06:30 — Morning yoga\n08:00 — Breakfast\n10:00 — Workshop / treatments\n13:00 — Lunch\n…'}
          minHeight={220}
        />
      </Section>

      {/* Itinerary */}
      <Section icon={Calendar} title="Itinerary" defaultOpen={false}>
        <ItineraryEditor value={form.itinerary} onChange={(v) => change('itinerary', v)} />
      </Section>

      {/* FAQs */}
      <Section icon={HelpCircle} title="Frequently asked questions" defaultOpen={false}>
        <FaqEditor value={form.faqs} onChange={(v) => change('faqs', v)} />
      </Section>

      {/* Booking terms */}
      <Section icon={BookOpen} title="Booking terms" defaultOpen={false}>
        <RichTextEditor
          value={form.bookingTerms}
          onChange={(v) => change('bookingTerms', v)}
          placeholder="How bookings are confirmed, deposit requirements, payment schedule…"
          minHeight={180}
        />
      </Section>

      {/* Cancellation policy */}
      <Section icon={XCircle} title="Cancellation policy" defaultOpen={false}>
        <RichTextEditor
          value={form.cancellationPolicy}
          onChange={(v) => change('cancellationPolicy', v)}
          placeholder="Free cancellation up to 30 days, 50% refund within 14 days…"
          minHeight={180}
        />
      </Section>

      {/* Refunds policy */}
      <Section icon={RefreshCcw} title="Refunds policy" defaultOpen={false}>
        <RichTextEditor
          value={form.refundsPolicy}
          onChange={(v) => change('refundsPolicy', v)}
          placeholder="When refunds are issued, processing time, exclusions…"
          minHeight={180}
        />
      </Section>

      {/* Terms & Conditions */}
      <Section icon={Shield} title="Terms & Conditions" defaultOpen={false}>
        <RichTextEditor
          value={form.termsConditions}
          onChange={(v) => change('termsConditions', v)}
          placeholder="The legal fine print guests should be aware of."
          minHeight={200}
        />
      </Section>

      {/* Host */}
      <Section icon={User} title="Host info" defaultOpen={false}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Host name</label>
            <input
              className="input"
              value={form.hostName}
              onChange={(e) => change('hostName', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Host image</label>
            <Dropzone
              accept="image/*"
              instant
              value={form.hostImageUrl}
              onChange={(u) => change('hostImageUrl', u || '')}
              placeholder="Drag host photo, or click"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Host bio</label>
            <RichTextEditor
              value={form.hostBio}
              onChange={(v) => change('hostBio', v)}
              placeholder="A short bio for the host…"
              minHeight={150}
            />
          </div>
        </div>
      </Section>

      {/* Check-Availability — owner + salesperson assignment */}
      <Section icon={User} title="Booking & contact (Check-Availability)" defaultOpen={false}>
        <p className="text-xs text-ink-muted -mt-2">
          When a guest hits “Check availability” on this package, the chosen owner and salesperson
          get an in-app notification + dummy voice call. Direct contact details below are also
          used to fire the call when no PWA-registered owner is linked.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Linked property owner (PWA)</label>
            <select
              className="input"
              value={form.pwaOwnerId}
              onChange={(e) => change('pwaOwnerId', e.target.value)}
            >
              <option value="">— None —</option>
              {pwaOwners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name || o.email} · {o.phone || 'no phone'}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-ink-muted mt-1">
              If the owner is registered in the PWA, link them here so leads also appear in their owner dashboard.
            </p>
          </div>
          <div>
            <label className="label">Assigned salesperson (PWA)</label>
            <select
              className="input"
              value={form.pwaSalespersonId}
              onChange={(e) => change('pwaSalespersonId', e.target.value)}
            >
              <option value="">— None —</option>
              {salespersons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.phone || s.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Owner contact name</label>
            <input
              className="input"
              value={form.ownerContactName}
              onChange={(e) => change('ownerContactName', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Owner contact email</label>
            <input
              type="email" className="input"
              value={form.ownerContactEmail}
              onChange={(e) => change('ownerContactEmail', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Owner contact phone (for voice call)</label>
            <input
              type="tel" className="input"
              value={form.ownerContactPhone}
              onChange={(e) => change('ownerContactPhone', e.target.value)}
              placeholder="+91 9XXXXXXXXX"
            />
          </div>
        </div>
      </Section>

      {/* Status / SEO / Badges */}
      <Section icon={Settings} title="Status, badges & SEO">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox" checked={form.isActive}
              onChange={(e) => change('isActive', e.target.checked)}
            />
            Published (visible on site)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox" checked={form.isFeatured}
              onChange={(e) => change('isFeatured', e.target.checked)}
            />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox" checked={form.isPopular}
              onChange={(e) => change('isPopular', e.target.checked)}
            />
            Popular
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox" checked={form.isGoldHost}
              onChange={(e) => change('isGoldHost', e.target.checked)}
            />
            Gold host badge
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox" checked={form.freeCancellation}
              onChange={(e) => change('freeCancellation', e.target.checked)}
            />
            Free cancellation
          </label>
          <label className="flex items-center gap-2 text-sm" title="When off, cancellations on this package will not refund any money regardless of the platform refund tiers.">
            <input
              type="checkbox" checked={form.isRefundable}
              onChange={(e) => change('isRefundable', e.target.checked)}
            />
            Refundable on cancellation
          </label>
          <div className="sm:col-span-2">
            <label className="label">Meta title (SEO)</label>
            <input
              className="input"
              value={form.metaTitle}
              onChange={(e) => change('metaTitle', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Meta description (SEO)</label>
            <textarea
              className="input" rows={2}
              value={form.metaDescription}
              onChange={(e) => change('metaDescription', e.target.value)}
            />
          </div>
        </div>
      </Section>

      <div className="sticky bottom-4 flex justify-end mt-6">
        <button disabled={submitting} className="btn-primary shadow-card">
          <Save size={16} /> {submitting ? 'Saving…' : 'Save package'}
        </button>
      </div>
    </form>
  );
}

function CustomFacilityInput({ existing = [], onAdd }) {
  const [value, setValue] = useState('');

  const apply = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (existing.some((f) => f.toLowerCase() === trimmed.toLowerCase())) {
      setValue('');
      return; // already there — no-op
    }
    onAdd(trimmed);
    setValue('');
  };

  return (
    <div className="mt-3 pt-3 border-t flex items-center gap-2">
      <input
        className="input flex-1"
        placeholder="Add custom facility (e.g. Bonfire pit, Meditation cave)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            apply();
          }
        }}
      />
      <button
        type="button"
        onClick={apply}
        disabled={!value.trim()}
        className="btn-primary text-sm whitespace-nowrap disabled:opacity-50"
      >
        <Plus size={14} /> Add
      </button>
    </div>
  );
}
