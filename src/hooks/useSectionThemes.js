import { useEffect, useState } from 'react';
import api from '../services/api';

const DEFAULTS = {
  clientReviews:        { bg: '#ffffff', card: '#ffffff', text: '#0f172a', accent: '#0d9488' },
  videoBand:            { bg: '#0f172a', card: '#1e293b', text: '#ffffff', accent: '#0d9488' },
  testimonialsCarousel: { bg: '#f8fafc', card: '#ffffff', text: '#0f172a', accent: '#0d9488' },
  testimonialsGrid:     { bg: '#f8fafc', card: '#ffffff', text: '#0f172a', accent: '#0d9488' },
};

// Module-level memo so multiple components share one network round-trip.
let cache = null;
let pending = null;

/**
 * Fetch the section-theme settings from the backend. Falls back to the
 * built-in DEFAULTS if the API is unreachable, so the public site never
 * renders an unstyled section.
 */
export default function useSectionThemes() {
  const [themes, setThemes] = useState(cache || DEFAULTS);

  useEffect(() => {
    if (cache) return;
    if (!pending) {
      pending = api.get('/section-themes')
        .then((res) => {
          const remote = res.data?.data?.themes || {};
          const merged = {};
          Object.keys(DEFAULTS).forEach((k) => {
            merged[k] = { ...DEFAULTS[k], ...(remote[k] || {}) };
          });
          cache = merged;
          return merged;
        })
        .catch(() => {
          cache = DEFAULTS;
          return DEFAULTS;
        });
    }
    pending.then((merged) => setThemes(merged));
  }, []);

  return themes;
}
