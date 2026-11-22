// RGB ⇄ Hex Color Converter (codingnconcepts.com/tools/rgb-to-hex/)
// Converts as you type in both directions, accepts rgb() strings and 3/6-digit hex,
// and includes a color picker and HSL output.

const clamp255 = (n) => Math.min(255, Math.max(0, n));
const toHex2 = (n) => clamp255(Math.round(n)).toString(16).padStart(2, '0').toUpperCase();

const rgbToHex = (r, g, b) => '#' + toHex2(r) + toHex2(g) + toHex2(b);

// "#1a2b3c", "1A2B3C", "#abc" -> { ok, r, g, b, message }
const parseHex = (text) => {
  let hex = String(text).trim().replace(/^#/, '');
  if (hex === '') return { ok: false, message: '' };
  if (!/^[0-9a-fA-F]+$/.test(hex)) return { ok: false, message: 'Hex codes use only 0–9 and A–F, for example #FF6347.' };
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length !== 6) return { ok: false, message: 'Enter 3 or 6 hex digits, for example #F63 or #FF6347.' };
  return { ok: true, r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), message: '' };
};

// "rgb(255, 99, 71)" or "255,99,71" or "255 99 71" -> { ok, r, g, b }
const parseRgbString = (text) => {
  const m = /^\s*(?:rgba?\s*\()?\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*(?:[,/]\s*[\d.]+%?\s*)?\)?\s*$/i.exec(String(text));
  if (!m) return { ok: false };
  const [r, g, b] = [m[1], m[2], m[3]].map(Number);
  if ([r, g, b].some((v) => v > 255)) return { ok: false };
  return { ok: true, r, g, b };
};

const rgbToHsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
};

// ---------- page wiring ----------
if (typeof document !== 'undefined') {
  const byId = (id) => document.getElementById(id);
  let spinTimer = null;
  const spin = (reverse) => {
    const icon = document.querySelector('.converter-icon img');
    if (!icon) return;
    icon.classList.toggle('reverse', !!reverse);
    icon.classList.add('spinning');
    clearTimeout(spinTimer);
    spinTimer = setTimeout(() => icon.classList.remove('spinning'), 600);
  };
  const message = (text) => {
    const el = byId('color-message');
    el.textContent = text;
    el.className = 'converter-message' + (text ? ' is-error' : '');
  };
  const showColor = (r, g, b, skip) => {
    const hex = rgbToHex(r, g, b);
    if (skip !== 'rgb') { byId('valueR').value = r; byId('valueG').value = g; byId('valueB').value = b; }
    if (skip !== 'hex') byId('hex').value = hex;
    if (skip !== 'picker') byId('colorPicker').value = hex.toLowerCase();
    byId('colorDisplay').style.backgroundColor = hex;
    byId('rgbText').value = `rgb(${r}, ${g}, ${b})`;
    byId('hslText').value = rgbToHsl(r, g, b);
  };

  const onRgbInput = (e) => {
    spin(false);
    // allow pasting "rgb(255, 99, 71)" into any of the three boxes
    const pasted = parseRgbString(e && e.target ? e.target.value : '');
    if (pasted.ok && /[,\s(]/.test(e.target.value)) { message(''); showColor(pasted.r, pasted.g, pasted.b); return; }
    const vals = ['valueR', 'valueG', 'valueB'].map((id) => byId(id).value.trim());
    if (vals.some((v) => v === '')) { message(''); return; }
    const nums = vals.map(Number);
    if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) { message('Each of R, G and B must be a whole number from 0 to 255.'); return; }
    message('');
    showColor(nums[0], nums[1], nums[2], 'rgb');
  };
  const onHexInput = () => {
    spin(true);
    const result = parseHex(byId('hex').value);
    message(result.message);
    if (result.ok) showColor(result.r, result.g, result.b, 'hex');
  };
  const onPicker = () => {
    spin(false);
    const result = parseHex(byId('colorPicker').value);
    message('');
    if (result.ok) showColor(result.r, result.g, result.b, 'picker');
  };
  const copy = (id) => {
    const value = byId(id).value;
    if (!value) { alertNotification('Nothing to copy'); return; }
    copyToClipboard(value);
    alertNotification('Copied to clipboard: ' + value);
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!byId('rgbToHexConverter')) return;
    ['valueR', 'valueG', 'valueB'].forEach((id) => byId(id).addEventListener('input', onRgbInput));
    byId('hex').addEventListener('input', onHexInput);
    byId('colorPicker').addEventListener('input', onPicker);
    byId('copy-hex').addEventListener('click', () => copy('hex'));
    byId('copy-rgb').addEventListener('click', () => copy('rgbText'));
    byId('copy-hsl').addEventListener('click', () => copy('hslText'));
    // click a row in the color table to load it
    document.querySelectorAll('.color-table tbody tr').forEach((tr) => {
      tr.style.cursor = 'pointer';
      tr.title = 'Click to load this color';
      tr.addEventListener('click', () => {
        const hexCell = [...tr.cells].map((c) => c.textContent.trim()).find((t) => /^#[0-9a-f]{6}$/i.test(t));
        const result = hexCell && parseHex(hexCell);
        if (result && result.ok) { spin(true); message(''); showColor(result.r, result.g, result.b); byId('rgbToHexConverter').scrollIntoView({ behavior: 'smooth' }); }
      });
    });
    const params = new URLSearchParams(window.location.search);
    const start = parseHex(params.get('hex') || '');
    if (start.ok) showColor(start.r, start.g, start.b);
  });
}

if (typeof module !== 'undefined') {
  module.exports = { rgbToHex, parseHex, parseRgbString, rgbToHsl };
}
