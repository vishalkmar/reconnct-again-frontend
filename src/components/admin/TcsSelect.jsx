import { TCS_OPTIONS } from '../../utils/tcs.js';

export default function TcsSelect({ value, onChange, label = 'TCS', compact = false, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <select
        className={`input ${compact ? 'w-28' : ''}`}
        value={Number(value) || 0}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {TCS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
