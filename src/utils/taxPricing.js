import { normalizeGstRate } from './gst.js';
import { normalizeTcsRate } from './tcs.js';

export const calculateTaxPricing = (price, gstRate, tcsRate) => {
  const base = Number(price) || 0;
  const gstPct = normalizeGstRate(gstRate);
  const tcsPct = normalizeTcsRate(tcsRate);
  const gst = (base * gstPct) / 100;
  const tcsBase = base + gst;
  const tcs = (tcsBase * tcsPct) / 100;
  const total = base + gst + tcs;

  return {
    base,
    gst,
    tcs,
    total,
    gstRate: gstPct,
    tcsRate: tcsPct,
    hasTaxes: gstPct > 0 || tcsPct > 0,
  };
};

export const taxIncludedLabel = (pricing) => {
  if (!pricing?.hasTaxes) return '';
  const parts = [];
  if (pricing.gstRate > 0) parts.push(`GST ${pricing.gstRate}%`);
  if (pricing.tcsRate > 0) parts.push(`TCS ${pricing.tcsRate}%`);
  return `incl. ${parts.join(' + ')}`;
};
