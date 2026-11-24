// Cron Expression Explainer (codingnconcepts.com/tools/cron-expression-explainer/)
// Explains a crontab expression in plain English and lists the next run times.
// Supports 5 fields (Linux crontab), 6 fields with seconds first (Spring), and @macros.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MACROS = {
  '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *'
};
const FIELDS = {
  second: { min: 0, max: 59, unit: 'second' },
  minute: { min: 0, max: 59, unit: 'minute' },
  hour: { min: 0, max: 23, unit: 'hour' },
  dom: { min: 1, max: 31, unit: 'day-of-month' },
  month: { min: 1, max: 12, unit: 'month', names: MONTHS.map((m) => m.slice(0, 3).toUpperCase()), base: 1 },
  dow: { min: 0, max: 7, unit: 'day-of-week', names: DAYS.map((d) => d.slice(0, 3).toUpperCase()), base: 0 }
};

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// Parse one field into a set of values plus a token list for the description
const parseField = (expr, name) => {
  const f = FIELDS[name];
  const toNum = (s) => {
    const up = s.toUpperCase();
    if (f.names && f.names.includes(up)) return f.names.indexOf(up) + f.base;
    if (!/^\d+$/.test(s)) throw new Error(`"${s}" is not valid in the ${f.unit} field.`);
    return parseInt(s, 10);
  };
  const values = new Set();
  const tokens = [];
  for (const part of expr.split(',')) {
    if (part === '') throw new Error(`Empty value in the ${f.unit} field.`);
    let [range, stepText] = part.split('/');
    const step = stepText === undefined ? 1 : parseInt(stepText, 10);
    if (stepText !== undefined && (!/^\d+$/.test(stepText) || step < 1)) throw new Error(`"/${stepText}" is not a valid step in the ${f.unit} field.`);
    let lo, hi, kind;
    if (range === '*' || range === '?') { lo = f.min; hi = name === 'dow' ? 6 : f.max; kind = stepText === undefined ? 'any' : 'step'; }
    else if (range.includes('-')) {
      const [a, b] = range.split('-');
      lo = toNum(a); hi = toNum(b); kind = 'range';
    } else { lo = toNum(range); hi = stepText === undefined ? lo : (name === 'dow' ? 6 : f.max); kind = stepText === undefined ? 'value' : 'from'; }
    if (lo < f.min || hi > f.max || lo > f.max) throw new Error(`${f.unit} values must be from ${f.min} to ${f.max}${f.names ? ` (or ${f.names[0]}–${f.names[f.names.length - 1]})` : ''}.`);
    if (lo > hi) throw new Error(`The range ${range} in the ${f.unit} field goes backwards.`);
    for (let v = lo; v <= hi; v += step) values.add(name === 'dow' && v === 7 ? 0 : v);
    tokens.push({ kind, lo, hi, step });
  }
  const isAny = tokens.length === 1 && tokens[0].kind === 'any';
  return { values, tokens, isAny };
};

const parseCron = (text) => {
  let t = String(text).trim().replace(/\s+/g, ' ');
  if (t === '') return { ok: false, message: '' };
  if (t.toLowerCase() === '@reboot') return { ok: true, reboot: true };
  if (t.startsWith('@')) {
    const m = MACROS[t.toLowerCase()];
    if (!m) return { ok: false, message: `Unknown macro ${t}. Use @yearly, @monthly, @weekly, @daily, @hourly or @reboot.` };
    t = m;
  }
  const parts = t.split(' ');
  let names;
  if (parts.length === 5) names = ['minute', 'hour', 'dom', 'month', 'dow'];
  else if (parts.length === 6) names = ['second', 'minute', 'hour', 'dom', 'month', 'dow'];
  else return { ok: false, message: `A cron expression has 5 fields (minute hour day-of-month month day-of-week), or 6 with seconds first; this has ${parts.length}.` };
  const fields = {};
  try {
    names.forEach((n, i) => { fields[n] = parseField(parts[i], n); });
  } catch (e) {
    return { ok: false, message: e.message };
  }
  if (!fields.second) fields.second = { values: new Set([0]), tokens: [{ kind: 'value', lo: 0, hi: 0, step: 1 }], isAny: false, implicit: true };
  return { ok: true, fields, expanded: t, sixFields: parts.length === 6 };
};

// ---- English description ----
const label = (name, v) => {
  if (name === 'month') return MONTHS[v - 1];
  if (name === 'dow') return DAYS[v % 7];
  return String(v);
};
const joinList = (arr) => (arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1]);

const describeTokens = (field, name) => {
  const unit = FIELDS[name].unit;
  const vals = [], others = [];
  for (const tk of field.tokens) {
    if (tk.kind === 'value') vals.push(label(name, tk.lo));
    else if (tk.kind === 'any') others.push(`every ${unit}`);
    else if (tk.kind === 'step') others.push(`every ${tk.step === 1 ? '' : ordinal(tk.step) + ' '}${unit}`);
    else if (tk.kind === 'range' && tk.step === 1 && (name === 'dow' || name === 'month')) others.push(`${label(name, tk.lo)} through ${label(name, tk.hi)}`);
    else if (tk.kind === 'range') others.push(`every ${tk.step === 1 ? '' : ordinal(tk.step) + ' '}${unit} from ${label(name, tk.lo)} through ${label(name, tk.hi)}`);
    else if (tk.kind === 'from') others.push(`every ${ordinal(tk.step)} ${unit} from ${label(name, tk.lo)} through ${label(name, tk.hi)}`);
  }
  const parts = [];
  if (vals.length) parts.push((name === 'month' || name === 'dow' ? '' : unit + ' ') + joinList(vals));
  return joinList(parts.concat(others));
};

const pad2 = (n) => String(n).padStart(2, '0');

const describe = (parsed) => {
  if (parsed.reboot) return 'Once, when the system starts up (@reboot).';
  const f = parsed.fields;
  const single = (fl) => fl.tokens.length >= 1 && fl.tokens.every((t) => t.kind === 'value');
  let text;
  const secOnlyZero = f.second.implicit || (single(f.second) && f.second.values.size === 1 && f.second.values.has(0));
  if (single(f.minute) && f.minute.values.size === 1 && single(f.hour) && f.hour.values.size <= 6 && secOnlyZero) {
    const m = [...f.minute.values][0];
    text = 'At ' + joinList([...f.hour.values].sort((a, b) => a - b).map((h) => `${pad2(h)}:${pad2(m)}`));
  } else {
    let minutePart;
    if (f.minute.isAny) minutePart = 'every minute';
    else if (f.minute.tokens.length === 1 && f.minute.tokens[0].kind === 'step') minutePart = `every ${f.minute.tokens[0].step} minutes`;
    else minutePart = describeTokens(f.minute, 'minute');
    text = 'At ' + minutePart;
    if (!f.hour.isAny) text += ' past ' + describeTokens(f.hour, 'hour');
    else if (!f.minute.isAny && !(f.minute.tokens.length === 1 && f.minute.tokens[0].kind === 'step')) text += ' past every hour';
    if (!secOnlyZero) {
      const secStep = f.second.tokens.length === 1 && f.second.tokens[0].kind === 'step';
      const secPart = f.second.isAny ? 'every second' : secStep ? `every ${f.second.tokens[0].step} seconds` : describeTokens(f.second, 'second');
      text = f.minute.isAny && f.hour.isAny ? 'At ' + secPart + (secStep || f.second.isAny ? '' : ' past every minute') : 'At ' + secPart + ', ' + text.charAt(0).toLowerCase() + text.slice(1);
    }
  }
  const domR = !f.dom.isAny, dowR = !f.dow.isAny;
  if (domR && dowR) text += ` on ${describeTokens(f.dom, 'dom')} or on ${describeTokens(f.dow, 'dow')}`;
  else if (domR) text += ` on ${describeTokens(f.dom, 'dom')}`;
  else if (dowR) text += ` on ${describeTokens(f.dow, 'dow')}`;
  if (!f.month.isAny) text += ` in ${describeTokens(f.month, 'month')}`;
  return text.replace(/^At every/, 'Every').replace(/ +/g, ' ') + '.';
};

// ---- next run times ----
const nextRuns = (parsed, count = 5, from = new Date(), utc = false) => {
  if (parsed.reboot) return [];
  const f = parsed.fields;
  const g = (d, k) => (utc ? d['getUTC' + k]() : d['get' + k]());
  const sorted = (s) => [...s].sort((a, b) => a - b);
  const secs = sorted(f.second.values), mins = sorted(f.minute.values), hours = sorted(f.hour.values);
  const domR = !f.dom.isAny, dowR = !f.dow.isAny;
  const runs = [];
  const start = new Date(Math.floor(from.getTime() / 1000) * 1000 + 1000);
  const mk = (y, mo, d, h = 0, mi = 0, s = 0) => (utc ? new Date(Date.UTC(y, mo, d, h, mi, s)) : new Date(y, mo, d, h, mi, s));
  let day = mk(g(start, 'FullYear'), g(start, 'Month'), g(start, 'Date'));
  for (let i = 0; i < 366 * 8 && runs.length < count; i++, day = mk(g(day, 'FullYear'), g(day, 'Month'), g(day, 'Date') + 1)) {
    if (!f.month.values.has(g(day, 'Month') + 1)) continue;
    const domOk = f.dom.values.has(g(day, 'Date')), dowOk = f.dow.values.has(g(day, 'Day'));
    if (!(domR && dowR ? domOk || dowOk : domOk && dowOk)) continue;
    for (const h of hours) {
      for (const mi of mins) {
        for (const s of secs) {
          const t = mk(g(day, 'FullYear'), g(day, 'Month'), g(day, 'Date'), h, mi, s);
          if (g(t, 'Hours') !== h || g(t, 'Date') !== g(day, 'Date')) continue;   // skipped by a daylight-saving change
          if (t >= start) { runs.push(t); if (runs.length >= count) return runs; }
        }
      }
    }
  }
  return runs;
};

// ---------- page wiring ----------
if (typeof document !== 'undefined') {
  const byId = (id) => document.getElementById(id);
  let spinTimer = null;
  const spin = () => {
    const icon = document.querySelector('.converter-icon img');
    if (!icon) return;
    icon.classList.add('spinning');
    clearTimeout(spinTimer);
    spinTimer = setTimeout(() => icon.classList.remove('spinning'), 600);
  };
  const fmt = (d, utc) => new Intl.DateTimeFormat('en-GB', { timeZone: utc ? 'UTC' : undefined, weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZoneName: 'short' }).format(d);

  const render = (animate) => {
    if (animate !== false) spin();
    const parsed = parseCron(byId('cron-input').value);
    const msg = byId('cron-message');
    msg.textContent = parsed.ok ? '' : parsed.message || '';
    msg.className = 'converter-message' + (!parsed.ok && parsed.message ? ' is-error' : '');
    if (!parsed.ok) { byId('cron-english').textContent = ''; byId('cron-next').innerHTML = ''; return; }
    byId('cron-english').textContent = '“' + describe(parsed) + '”';
    const utc = byId('cron-utc').checked;
    const runs = nextRuns(parsed, 5, new Date(), utc);
    byId('cron-next').innerHTML = parsed.reboot ? '<li>Runs at every boot</li>'
      : runs.length ? runs.map((d) => `<li>${fmt(d, utc)}</li>`).join('') : '<li>No run time in the next 8 years (check the day and month, e.g. 31 February).</li>';
    byId('cron-six').textContent = parsed.sixFields ? 'Read as 6 fields with seconds first (Spring style).' : '';
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!byId('cronExplainer')) return;
    byId('cron-input').addEventListener('input', render);
    byId('cron-utc').addEventListener('change', render);
    byId('cron-zone').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
    document.querySelectorAll('.cron-examples tbody tr').forEach((tr) => {
      tr.style.cursor = 'pointer';
      tr.title = 'Click to load this expression';
      tr.addEventListener('click', () => { byId('cron-input').value = tr.cells[0].textContent.trim(); render(); byId('cronExplainer').scrollIntoView({ behavior: 'smooth' }); });
    });
    const params = new URLSearchParams(window.location.search);
    if (params.get('cron')) byId('cron-input').value = params.get('cron');
    render(false);
  });
}

if (typeof module !== 'undefined') {
  module.exports = { parseCron, describe, nextRuns };
}
