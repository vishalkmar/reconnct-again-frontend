import api from './api';

/*
  The same no-auth /api/public/* surface the mobile app's Home screen reads
  (App/reconnct/src/api/client.js). Each call unwraps the `{ success, data }`
  envelope and returns `data`, mirroring the app's request() helper, so the
  landing page can follow the app's data rules line for line.
*/
const clean = (params = {}) => Object.fromEntries(
  Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
);
const get = (url, params) => api.get(url, { params: clean(params) }).then((r) => r.data?.data ?? null);

export const publicApi = {
  listExperiences: (filters = {}) => get('/public/experiences', filters),
  getExperience: (idOrSlug) => get(`/public/experiences/${encodeURIComponent(idOrSlug)}`),
  taxonomy: () => get('/public/taxonomy'),
  types: (categoryIds) => get('/public/types', {
    categoryIds: Array.isArray(categoryIds) ? categoryIds.join(',') : categoryIds,
  }),
  cities: () => get('/public/cities'),
  offerBanners: () => get('/public/offer-banners'),
  geoLocate: (lat, lon) => get('/public/geo/locate', { lat, lon }),
  nearbyExperiences: (lat, lon, params = {}) => get('/public/geo/nearby-experiences', { lat, lon, ...params }),
  placeImage: (city, place, area) => get('/public/geo/place-image', { city, place, area }),
};

export default publicApi;
