// Unix Timestamp Converter (codingnconcepts.com/tools/unix-timestamp-converter/)
// Epoch seconds / milliseconds / microseconds / nanoseconds ⇄ human dates, in any time zone.

const UNITS = { s: 1000, ms: 1, us: 0.001, ns: 0.000001 };
const UNIT_NAMES = { s: 'seconds', ms: 'milliseconds', us: 'microseconds', ns: 'nanoseconds' };

// Guess the unit from the number of digits (ignoring a minus sign)
const detectUnit = (text) => {
  const digits = String(text).replace(/^-/, '').replace(/\..*$/, '').length;
  if (digits <= 11) return 's';
  if (digits <= 14) return 'ms';
  if (digits <= 17) return 'us';
  return 'ns';
};

const parseTimestamp = (text, unit = 'auto') => {
  const t = String(text).trim().replace(/[,_\s]/g, '');
  if (t === '') return { ok: false, message: '' };
  if (!/^-?\d+(\.\d+)?$/.test(t)) return { ok: false, message: 'Enter a number of seconds or milliseconds, for example 1767225600.' };
  const u = unit === 'auto' ? detectUnit(t) : unit;
  const ms = u === 'ns' ? Number(BigInt(t.split('.')[0]) / 1000000n) : Number(t) * UNITS[u];
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return { ok: false, message: 'That timestamp is outside the range a date can show (about ±275,000 years).' };
  return { ok: true, ms, unit: u, date };
};

const relative = (ms, now = Date.now()) => {
  const diff = ms - now;
  const abs = Math.abs(diff);
  const steps = [['year', 31557600000], ['month', 2629800000], ['week', 604800000], ['day', 86400000], ['hour', 3600000], ['minute', 60000], ['second', 1000]];
  for (const [name, size] of steps) {
    if (abs >= size || name === 'second') {
      const n = Math.round(abs / size);
      if (n === 0) return 'now';
      const label = `${n} ${name}${n === 1 ? '' : 's'}`;
      return diff < 0 ? `${label} ago` : `in ${label}`;
    }
  }
  return '';
};

// Offset of a time zone from UTC at a given instant, in ms
const tzOffset = (ms, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(new Date(ms)).reduce((o, p) => { o[p.type] = p.value; return o; }, {});
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
};

// Wall-clock date/time in a time zone -> epoch ms (handles daylight saving)
const zonedToEpoch = (y, mo, d, h, mi, s, timeZone) => {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  if (timeZone === 'UTC') return guess;
  let ms = guess - tzOffset(guess, timeZone);
  ms = guess - tzOffset(ms, timeZone);
  return ms;
};

const formatIn = (date, timeZone) => new Intl.DateTimeFormat('en-GB', {
  timeZone, weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZoneName: 'short'
}).format(date);

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
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const msg = (id, text) => { const el = byId(id); el.textContent = text; el.className = 'converter-message' + (text ? ' is-error' : ''); };

  const fromTimestamp = (animate) => {
    if (animate !== false) spin(false);
    const r = parseTimestamp(byId('ts-input').value, byId('ts-unit').value);
    msg('ts-message', r.message || '');
    const zone = byId('ts-zone').value;
    const set = (id, v) => { byId(id).textContent = v; };
    if (!r.ok) { ['out-utc', 'out-local', 'out-zone', 'out-iso', 'out-relative', 'out-unit'].forEach((id) => set(id, '–')); return; }
    set('out-unit', UNIT_NAMES[r.unit] + (byId('ts-unit').value === 'auto' ? ' (detected)' : ''));
    set('out-utc', formatIn(r.date, 'UTC'));
    set('out-local', formatIn(r.date, localZone));
    set('out-zone', formatIn(r.date, zone));
    set('out-iso', r.date.toISOString());
    set('out-relative', relative(r.ms));
  };

  const fromDate = () => {
    spin(true);
    const v = byId('date-input').value;     // "2026-01-01T00:00" or with seconds
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(v);
    if (!m) { byId('out-seconds').value = ''; byId('out-ms').value = ''; return; }
    const ms = zonedToEpoch(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] || 0), byId('date-zone').value);
    byId('out-seconds').value = Math.floor(ms / 1000);
    byId('out-ms').value = ms;
  };

  const tick = () => {
    const now = Date.now();
    byId('now-seconds').textContent = Math.floor(now / 1000);
    byId('now-ms').textContent = now;
  };
  const copy = (value) => {
    if (!value || value === '–') { alertNotification('Nothing to copy'); return; }
    copyToClipboard(String(value));
    alertNotification('Copied to clipboard: ' + value);
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!byId('timestampConverter')) return;
    const zones = (Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : ['UTC', 'Asia/Singapore', 'Asia/Kolkata', 'Europe/London', 'America/New_York', 'America/Los_Angeles']);
    ['ts-zone', 'date-zone'].forEach((id) => {
      const sel = byId(id);
      ['UTC', ...zones.filter((z) => z !== 'UTC')].forEach((z) => sel.add(new Option(z.replace(/_/g, ' '), z)));
      sel.value = id === 'ts-zone' ? 'UTC' : localZone;
      if (!sel.value) sel.value = 'UTC';
    });
    byId('local-zone').textContent = localZone.replace(/_/g, ' ');
    ['ts-input', 'ts-unit', 'ts-zone'].forEach((id) => { byId(id).addEventListener('input', fromTimestamp); byId(id).addEventListener('change', fromTimestamp); });
    ['date-input', 'date-zone'].forEach((id) => { byId(id).addEventListener('input', fromDate); byId(id).addEventListener('change', fromDate); });
    byId('use-now').addEventListener('click', () => { byId('ts-input').value = Math.floor(Date.now() / 1000); fromTimestamp(); });
    byId('copy-now').addEventListener('click', () => copy(byId('now-seconds').textContent));
    byId('copy-seconds').addEventListener('click', () => copy(byId('out-seconds').value));
    byId('copy-ms').addEventListener('click', () => copy(byId('out-ms').value));
    byId('copy-iso').addEventListener('click', () => copy(byId('out-iso').textContent));
    const params = new URLSearchParams(window.location.search);
    byId('ts-input').value = params.get('ts') || Math.floor(Date.now() / 1000);
    const d = new Date(); d.setSeconds(0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    byId('date-input').value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    tick(); setInterval(tick, 1000);
    fromTimestamp(false); fromDate();
  });
}

if (typeof module !== 'undefined') {
  module.exports = { detectUnit, parseTimestamp, relative, tzOffset, zonedToEpoch, formatIn };
}
