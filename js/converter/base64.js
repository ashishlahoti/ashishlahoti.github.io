// Base64 Encoder and Decoder (codingnconcepts.com/tools/base64-encode-decode/)
// UTF-8 safe, standard and URL-safe alphabets, converts as you type in both directions.

const utf8Encode = (text) => new TextEncoder().encode(text);
const utf8Decode = (bytes) => new TextDecoder('utf-8', { fatal: true }).decode(bytes);

const bytesToBase64 = (bytes) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};
const base64ToBytes = (b64) => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const encode = (text, urlSafe = false) => {
  let b64 = bytesToBase64(utf8Encode(text));
  if (urlSafe) b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return b64;
};

// Accepts standard or URL-safe Base64, with or without padding, line breaks and spaces
const decode = (input) => {
  let s = String(input).replace(/\s+/g, '');
  if (s === '') return { ok: false, message: '' };
  if (/^data:[^,]*;base64,/.test(s)) s = s.slice(s.indexOf(',') + 1);
  if (!/^[A-Za-z0-9+/\-_]*={0,2}$/.test(s)) {
    const bad = [...new Set(s.replace(/[A-Za-z0-9+/\-_=]/g, ''))].slice(0, 5).join(' ');
    return { ok: false, message: `Not valid Base64: it contains ${bad}. Base64 uses only A–Z, a–z, 0–9, + / (or - _) and = padding.` };
  }
  s = s.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  if (s.length % 4 === 1) return { ok: false, message: 'Not valid Base64: the length is wrong (one character too many or missing).' };
  s += '='.repeat((4 - (s.length % 4)) % 4);
  let bytes;
  try { bytes = base64ToBytes(s); } catch (e) { return { ok: false, message: 'Not valid Base64.' }; }
  try {
    return { ok: true, text: utf8Decode(bytes), bytes: bytes.length, binary: false };
  } catch (e) {
    const hex = [...bytes.slice(0, 64)].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    return { ok: true, text: hex + (bytes.length > 64 ? ' …' : ''), bytes: bytes.length, binary: true };
  }
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
  const message = (text, isError) => {
    const el = byId('b64-message');
    el.textContent = text;
    el.className = 'converter-message' + (text ? (isError ? ' is-error' : ' is-info') : '');
  };
  const sizes = () => {
    const t = byId('plain').value, b = byId('encoded').value;
    byId('b64-sizes').textContent = t || b ? `Text: ${utf8Encode(t).length.toLocaleString('en-US')} bytes · Base64: ${b.length.toLocaleString('en-US')} characters` : '';
  };

  const onPlain = () => {
    spin(false);
    byId('encoded').value = encode(byId('plain').value, byId('url-safe').checked);
    message('');
    sizes();
  };
  const onEncoded = () => {
    spin(true);
    const r = decode(byId('encoded').value);
    if (!r.ok) { message(r.message, true); sizes(); return; }
    byId('plain').value = r.text;
    message(r.binary ? `This decodes to ${r.bytes} bytes of binary data (not text), shown as hex.` : '', false);
    sizes();
  };
  const copy = (id) => {
    const value = byId(id).value;
    if (!value) { alertNotification('Nothing to copy'); return; }
    copyToClipboard(value);
    alertNotification('Copied to clipboard');
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!byId('base64Converter')) return;
    byId('plain').addEventListener('input', onPlain);
    byId('encoded').addEventListener('input', onEncoded);
    byId('url-safe').addEventListener('change', onPlain);
    byId('copy-plain').addEventListener('click', () => copy('plain'));
    byId('copy-encoded').addEventListener('click', () => copy('encoded'));
    byId('swap-clear').addEventListener('click', () => { byId('plain').value = ''; byId('encoded').value = ''; message(''); sizes(); });
  });
}

if (typeof module !== 'undefined') {
  module.exports = { encode, decode };
}
