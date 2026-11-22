// PX ⇄ REM Converter (codingnconcepts.com/tools/pixel-to-rem/)
// Converts as you type in both directions for any root font size.

const round = (n, places = 4) => +(Math.round(n + 'e+' + places) + 'e-' + places);
const pxToRem = (px, base = 16) => round(px / base);
const remToPx = (rem, base = 16) => round(rem * base);

const parseNumber = (text, unit) => {
  const cleaned = String(text).trim().toLowerCase().replace(new RegExp(unit + '$'), '').trim();
  if (cleaned === '') return { ok: false, message: '' };
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return { ok: false, message: `Enter a number, for example ${unit === 'px' ? '24' : '1.5'}.` };
  if (n < 0) return { ok: false, message: 'Font sizes can\'t be negative.' };
  return { ok: true, value: n, message: '' };
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
    const el = byId('rem-message');
    el.textContent = text;
    el.className = 'converter-message' + (text ? ' is-error' : '');
  };
  const base = () => {
    const b = parseNumber(byId('defaultFontSize').value, 'px');
    return b.ok && b.value > 0 ? b.value : null;
  };

  const fromPx = () => {
    spin(false);
    const b = base(); if (!b) { message('Enter a root font size above 0, usually 16px.'); return; }
    const px = parseNumber(byId('pixel').value, 'px');
    message(px.message);
    byId('rem').value = px.ok ? pxToRem(px.value, b) + 'rem' : '';
  };
  const fromRem = () => {
    spin(true);
    const b = base(); if (!b) { message('Enter a root font size above 0, usually 16px.'); return; }
    const rem = parseNumber(byId('rem').value, 'rem');
    message(rem.message);
    byId('pixel').value = rem.ok ? remToPx(rem.value, b) : '';
  };
  const copy = (id, suffix) => {
    let value = byId(id).value.trim();
    if (!value) { alertNotification('Nothing to copy'); return; }
    if (suffix && !value.endsWith(suffix)) value += suffix;
    copyToClipboard(value);
    alertNotification('Copied to clipboard: ' + value);
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!byId('pxToRemConverter')) return;
    byId('pixel').addEventListener('input', fromPx);
    byId('rem').addEventListener('input', fromRem);
    byId('defaultFontSize').addEventListener('input', () => (byId('pixel').value ? fromPx() : fromRem()));
    byId('copy-px').addEventListener('click', () => copy('pixel', 'px'));
    byId('copy-rem').addEventListener('click', () => copy('rem', 'rem'));
  });
}

if (typeof module !== 'undefined') {
  module.exports = { pxToRem, remToPx, parseNumber };
}
