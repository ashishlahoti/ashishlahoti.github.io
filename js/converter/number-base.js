// Binary, Hex, Decimal and Octal Converter (codingnconcepts.com/tools/number-base-converter/)
// Type in any box and the others update as you type. Uses BigInt, so very large numbers are exact.

const BASES = { bin: 2, oct: 8, dec: 10, hex: 16 };
const PREFIX = { bin: /^0b/i, oct: /^0o/i, hex: /^0x/i, dec: null };
const DIGITS = { bin: /^[01]+$/, oct: /^[0-7]+$/, dec: /^\d+$/, hex: /^[0-9a-f]+$/i };
const NAMES = { bin: 'Binary uses only 0 and 1', oct: 'Octal uses only 0–7', dec: 'Decimal uses only 0–9', hex: 'Hex uses only 0–9 and A–F' };

const parseIn = (text, base) => {
  let t = String(text).trim().replace(/[\s_,]/g, '');
  if (t === '') return { ok: false, message: '' };
  let neg = false;
  if (t.startsWith('-')) { neg = true; t = t.slice(1); }
  if (PREFIX[base]) t = t.replace(PREFIX[base], '');
  if (!DIGITS[base].test(t)) return { ok: false, message: NAMES[base] + (base === 'dec' ? ' (and a leading minus sign).' : '.') };
  const radix = BASES[base];
  let v = 0n;
  for (const c of t.toLowerCase()) v = v * BigInt(radix) + BigInt(parseInt(c, 16));
  return { ok: true, value: neg ? -v : v };
};

const formatOut = (value, base, group = true) => {
  const neg = value < 0n;
  let s = (neg ? -value : value).toString(BASES[base]);
  if (base === 'hex') s = s.toUpperCase();
  if (group) {
    const size = base === 'bin' ? 4 : base === 'hex' ? 4 : base === 'dec' ? 3 : 3;
    const sep = base === 'dec' ? ',' : ' ';
    if (base === 'bin') s = s.padStart(Math.ceil(s.length / 4) * 4, '0');
    s = s.replace(new RegExp(`\\B(?=(.{${size}})+$)`, 'g'), sep);
  }
  return (neg ? '-' : '') + s;
};

// Two's complement of a (possibly negative) value in the given bit width
const twosComplement = (value, bits) => {
  const min = -(1n << BigInt(bits - 1)), max = (1n << BigInt(bits - 1)) - 1n;   // signed range
  if (value < min || value > max) return null;
  const v = value < 0n ? (1n << BigInt(bits)) + value : value;
  return v.toString(2).padStart(bits, '0');
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
  const KEYS = ['dec', 'hex', 'bin', 'oct'];
  let lastValue = null;

  const showExtras = () => {
    const box = byId('base-extra');
    if (lastValue === null) { box.innerHTML = ''; return; }
    const bits = Number(byId('bit-width').value);
    const tc = twosComplement(lastValue, bits);
    const bitLen = (lastValue < 0n ? -lastValue : lastValue).toString(2).length;
    box.innerHTML =
      `<tr><th>Bits needed</th><td>${lastValue === 0n ? 1 : bitLen}${lastValue < 0n ? ' (plus a sign)' : ''}</td></tr>` +
      `<tr><th>${bits}-bit signed (two's complement)</th><td>${tc ? tc.replace(/\B(?=(.{4})+$)/g, ' ') : `Out of range for ${bits}-bit signed (${(-(1n << BigInt(bits - 1))).toLocaleString('en-US')} to ${((1n << BigInt(bits - 1)) - 1n).toLocaleString('en-US')})`}</td></tr>` +
      (lastValue >= 0n && lastValue <= 0x10FFFFn ? `<tr><th>Character (Unicode)</th><td>${lastValue >= 32n && !(lastValue >= 0xD800n && lastValue <= 0xDFFFn) ? String.fromCodePoint(Number(lastValue)).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])) + ` (U+${lastValue.toString(16).toUpperCase().padStart(4, '0')})` : 'Control character'}</td></tr>` : '');
  };

  const onInput = (key) => () => {
    spin(key !== 'dec');
    const r = parseIn(byId('in-' + key).value, key);
    const msg = byId('base-message');
    msg.textContent = r.message || '';
    msg.className = 'converter-message' + (r.message ? ' is-error' : '');
    if (!r.ok) { if (!r.message) { KEYS.forEach((k) => { if (k !== key) byId('in-' + k).value = ''; }); lastValue = null; showExtras(); } return; }
    lastValue = r.value;
    const group = byId('group-digits').checked;
    KEYS.forEach((k) => { if (k !== key) byId('in-' + k).value = formatOut(r.value, k, group); });
    showExtras();
  };
  const copy = (key) => {
    const v = byId('in-' + key).value;
    if (!v) { alertNotification('Nothing to copy'); return; }
    copyToClipboard(v.replace(/[\s,]/g, ''));
    alertNotification('Copied to clipboard: ' + v.replace(/[\s,]/g, ''));
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!byId('baseConverter')) return;
    KEYS.forEach((k) => {
      byId('in-' + k).addEventListener('input', onInput(k));
      byId('copy-' + k).addEventListener('click', () => copy(k));
    });
    byId('bit-width').addEventListener('change', showExtras);
    byId('group-digits').addEventListener('change', () => {
      if (lastValue === null) return;
      KEYS.forEach((k) => { byId('in-' + k).value = formatOut(lastValue, k, byId('group-digits').checked); });
    });
    byId('in-dec').value = '255';
    onInput('dec')();
  });
}

if (typeof module !== 'undefined') {
  module.exports = { parseIn, formatOut, twosComplement };
}
