// JWT Decoder (codingnconcepts.com/tools/jwt-decoder/)
// Decodes the header and payload of a JSON Web Token in the browser and explains the claims.
// It does not verify the signature.

const b64urlToText = (part) => {
  let s = part.replace(/-/g, '+').replace(/_/g, '/');
  s += '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
};

const CLAIMS = {
  iss: 'Issuer: who created and signed the token',
  sub: 'Subject: who the token is about (usually a user ID)',
  aud: 'Audience: who the token is meant for',
  exp: 'Expires at',
  nbf: 'Not valid before',
  iat: 'Issued at',
  jti: 'JWT ID: a unique identifier for this token',
  scope: 'Permissions (OAuth 2.0 scopes)',
  scp: 'Permissions (scopes)',
  azp: 'Authorized party: the client the token was issued to',
  name: 'Full name', email: 'Email address', email_verified: 'Whether the email address is verified',
  roles: 'Roles', groups: 'Groups', tid: 'Tenant ID (Microsoft Entra ID)', oid: 'Object ID (Microsoft Entra ID)',
  nonce: 'Nonce: links the token to the login request', auth_time: 'Time the user authenticated', sid: 'Session ID'
};
const HEADER = {
  alg: 'Signing algorithm', typ: 'Token type', kid: 'Key ID: which key signed the token', cty: 'Content type', x5t: 'Certificate thumbprint', jku: 'URL of the signing keys (JWK Set)'
};
const ALGS = { HS256: 'HMAC with SHA-256 (shared secret)', HS384: 'HMAC with SHA-384 (shared secret)', HS512: 'HMAC with SHA-512 (shared secret)', RS256: 'RSA signature with SHA-256 (public/private key)', RS384: 'RSA with SHA-384', RS512: 'RSA with SHA-512', ES256: 'ECDSA P-256 with SHA-256', ES384: 'ECDSA P-384 with SHA-384', ES512: 'ECDSA P-521 with SHA-512', PS256: 'RSA-PSS with SHA-256', EdDSA: 'Edwards-curve signature (Ed25519)', none: 'No signature: the token can be forged' };
const TIME_CLAIMS = ['exp', 'nbf', 'iat', 'auth_time'];

const decodeJwt = (token, nowSec = Math.floor(Date.now() / 1000)) => {
  let t = String(token).trim().replace(/^Bearer\s+/i, '');
  if (t === '') return { ok: false, message: '' };
  const parts = t.split('.');
  if (parts.length === 5) return { ok: false, message: 'This looks like an encrypted JWT (JWE, 5 parts). Its payload can only be read with the decryption key.' };
  if (parts.length !== 3) return { ok: false, message: `A JWT has 3 parts separated by dots (header.payload.signature); this has ${parts.length}.` };
  const out = { ok: true, warnings: [] };
  for (const [i, name] of [[0, 'header'], [1, 'payload']]) {
    if (!/^[A-Za-z0-9_-]+$/.test(parts[i])) return { ok: false, message: `The ${name} is not valid Base64URL.` };
    let text;
    try { text = b64urlToText(parts[i]); } catch (e) { return { ok: false, message: `The ${name} could not be decoded from Base64URL.` }; }
    try { out[name] = JSON.parse(text); } catch (e) { return { ok: false, message: `The ${name} decoded, but it is not valid JSON.` }; }
  }
  out.signature = parts[2];
  const p = out.payload;
  if (typeof p.exp === 'number') out.expired = p.exp < nowSec;
  if (out.expired) out.warnings.push(`Expired ${new Date(p.exp * 1000).toUTCString()}.`);
  if (typeof p.nbf === 'number' && p.nbf > nowSec) out.warnings.push(`Not valid until ${new Date(p.nbf * 1000).toUTCString()}.`);
  if (typeof p.exp !== 'number') out.warnings.push('No expiry (exp) claim: this token never expires on its own.');
  if (String(out.header.alg).toLowerCase() === 'none') out.warnings.push('alg is "none": the token is unsigned and must never be trusted.');
  if (!parts[2] && String(out.header.alg).toLowerCase() !== 'none') out.warnings.push('The signature part is empty.');
  return out;
};

const explainClaims = (obj, dict, nowSec = Math.floor(Date.now() / 1000)) => Object.keys(obj).map((k) => {
  let value = obj[k];
  let note = dict[k] || '';
  if (TIME_CLAIMS.includes(k) && typeof value === 'number') {
    const d = new Date(value * 1000);
    const diff = value - nowSec;
    const rel = Math.abs(diff) < 60 ? 'now' : (diff < 0 ? `${humanDuration(-diff)} ago` : `in ${humanDuration(diff)}`);
    note += `: ${d.toUTCString()} (${rel})`;
  }
  if (k === 'alg' && ALGS[value]) note += `: ${ALGS[value]}`;
  return { key: k, value: typeof value === 'object' ? JSON.stringify(value) : String(value), note };
});

const humanDuration = (sec) => {
  const units = [['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
  for (const [n, s] of units) if (sec >= s) { const v = Math.floor(sec / s); return `${v} ${n}${v === 1 ? '' : 's'}`; }
  return '0 seconds';
};

// ---------- page wiring ----------
if (typeof document !== 'undefined') {
  const byId = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let spinTimer = null;
  const spin = () => {
    const icon = document.querySelector('.converter-icon img');
    if (!icon) return;
    icon.classList.add('spinning');
    clearTimeout(spinTimer);
    spinTimer = setTimeout(() => icon.classList.remove('spinning'), 600);
  };
  const table = (rows) => '<div class="table-scroll"><table class="jwt-claims"><thead><tr><th>Claim</th><th>Value</th><th>Meaning</th></tr></thead><tbody>' +
    rows.map((r) => `<tr><td><code>${esc(r.key)}</code></td><td class="jwt-value">${esc(r.value)}</td><td>${esc(r.note)}</td></tr>`).join('') + '</tbody></table></div>';

  const render = (animate) => {
    if (animate !== false) spin();
    const token = byId('jwt-input').value;
    const r = decodeJwt(token);
    const msg = byId('jwt-message');
    msg.textContent = r.ok ? '' : (r.message || '');
    msg.className = 'converter-message' + (!r.ok && r.message ? ' is-error' : '');
    // colour the three parts
    const parts = token.trim().replace(/^Bearer\s+/i, '').split('.');
    byId('jwt-colored').innerHTML = token.trim() && parts.length === 3
      ? `<span class="jwt-h">${esc(parts[0])}</span>.<span class="jwt-p">${esc(parts[1])}</span>.<span class="jwt-s">${esc(parts[2])}</span>` : '';
    if (!r.ok) { ['jwt-header', 'jwt-payload'].forEach((id) => { byId(id).textContent = ''; }); byId('jwt-header-claims').innerHTML = ''; byId('jwt-payload-claims').innerHTML = ''; byId('jwt-status').innerHTML = ''; return; }
    byId('jwt-header').textContent = JSON.stringify(r.header, null, 2);
    byId('jwt-payload').textContent = JSON.stringify(r.payload, null, 2);
    byId('jwt-header-claims').innerHTML = table(explainClaims(r.header, HEADER));
    byId('jwt-payload-claims').innerHTML = table(explainClaims(r.payload, CLAIMS));
    const status = r.expired === true ? '<span class="jwt-bad">Expired</span>' : r.expired === false ? '<span class="jwt-good">Not expired</span>' : '<span class="jwt-warn">No expiry</span>';
    byId('jwt-status').innerHTML = `${status} · Signature not verified` + (r.warnings.length ? '<ul>' + r.warnings.map((w) => `<li>${esc(w)}</li>`).join('') + '</ul>' : '');
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!byId('jwtDecoder')) return;
    byId('jwt-input').addEventListener('input', render);
    byId('jwt-sample').addEventListener('click', () => {
      // sample token: HS256, sub 1234567890, expires 1 Jan 2030 (signature is a placeholder)
      byId('jwt-input').value = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsZXggVGFuIiwicm9sZXMiOlsiYWRtaW4iXSwiaWF0IjoxNzY0OTAwMDAwLCJleHAiOjE4OTM0NTYwMDB9.c2lnbmF0dXJlLXBsYWNlaG9sZGVy';
      render();
    });
    byId('copy-payload').addEventListener('click', () => {
      const v = byId('jwt-payload').textContent;
      if (!v) { alertNotification('Nothing to copy'); return; }
      copyToClipboard(v); alertNotification('Payload JSON copied');
    });
    render(false);
  });
}

if (typeof module !== 'undefined') {
  module.exports = { decodeJwt, explainClaims, b64urlToText };
}
