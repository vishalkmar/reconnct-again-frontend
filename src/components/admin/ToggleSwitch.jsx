/**
 * Reusable on/off toggle switch — replaces the old "eye" publish button used
 * across every admin list. `checked` reflects the published/active state;
 * `onChange(nextBool)` is fired on click. Keep it small so it fits inside the
 * cramped action columns of list rows.
 */
export default function ToggleSwitch({
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  title,
  labelOn = 'Published',
  labelOff = 'Draft',
  showLabel = false,
}) {
  const dims = size === 'sm'
    ? { w: 'w-8', h: 'h-4.5', knob: 'h-3.5 w-3.5', on: 'translate-x-3.5' }
    : { w: 'w-10', h: 'h-5', knob: 'h-4 w-4', on: 'translate-x-5' };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        title={title || (checked ? `On — click to unpublish` : `Off — click to publish`)}
        onClick={(e) => { e.stopPropagation(); if (!disabled) onChange?.(!checked); }}
        className={`relative inline-flex ${dims.w} ${dims.h} shrink-0 items-center rounded-full transition-colors outline-none focus:ring-2 focus:ring-brand/30 ${
          checked ? 'bg-brand' : 'bg-slate-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block ${dims.knob} transform rounded-full bg-white shadow transition-transform ${
            checked ? dims.on : 'translate-x-0.5'
          }`}
        />
      </button>
      {showLabel && (
        <span className={`text-xs font-medium ${checked ? 'text-brand' : 'text-ink-muted'}`}>
          {checked ? labelOn : labelOff}
        </span>
      )}
    </span>
  );
}
