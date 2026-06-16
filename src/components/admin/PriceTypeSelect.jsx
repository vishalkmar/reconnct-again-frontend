import { PRICE_TYPE_OPTIONS } from '../../utils/priceType.js';

/**
 * Price-type picker shown right after the Currency field in every pricing
 * section. On "Custom" it reveals a title input (the label shown next to the
 * price on the website).
 *
 * Props:
 *   priceType     — current type (string)
 *   priceLabel    — custom label (string, used when priceType === 'custom')
 *   onType        — (type:string) => void
 *   onLabel       — (label:string) => void
 *   label         — field label (default "Price type")
 */
export default function PriceTypeSelect({ priceType, priceLabel, onType, onLabel, label = 'Price type' }) {
  const type = priceType || 'per_night';
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={type} onChange={(e) => onType(e.target.value)}>
        {PRICE_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {type === 'custom' && (
        <input
          className="input mt-2"
          value={priceLabel || ''}
          onChange={(e) => onLabel(e.target.value)}
          placeholder="Custom label (e.g. per session, per couple) — shown next to the price"
        />
      )}
    </div>
  );
}
