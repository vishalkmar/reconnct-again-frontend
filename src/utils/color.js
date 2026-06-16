// Convert between Tailwind-friendly "r g b" string and hex.

export const rgbToHex = (rgb) => {
  if (!rgb) return '#000000';
  const parts = rgb.trim().split(/\s+/).map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return '#000000';
  return '#' + parts.map((n) => n.toString(16).padStart(2, '0')).join('');
};

export const hexToRgb = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}`;
};
