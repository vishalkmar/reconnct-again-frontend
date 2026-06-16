import { GST_OPTIONS } from '../../utils/gst.js';

/**
 * GST rate picker shown next to any price field. Default "Off" (0 = no GST).
 * The selected percent is added to the price and auto-calculated at checkout.
 *
 * Props:
 *   value    — current rate (number, 0 = Off)
 *   onChange — (rate:number) => void
 *   label    — optional field label (default "GST")
 *   compact  — tighter width for inline rows
 */
export default function GstSelect({ value, onChange, label = 'GST', compact = false, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <select
        className={`input ${compact ? 'w-28' : ''}`}
        value={Number(value) || 0}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {GST_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
