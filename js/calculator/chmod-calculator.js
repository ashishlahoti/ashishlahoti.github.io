// Linux chmod Calculator (codingnconcepts.com/tools/chmod-calculator/)
// Octal (755, 4755) ⇄ symbolic (rwxr-xr-x) ⇄ checkboxes, including setuid, setgid and sticky bits.

const WHO = ['user', 'group', 'other'];
const PERMS = [['read', 4, 'r'], ['write', 2, 'w'], ['execute', 1, 'x']];

// state: { special: 0-7, user: 0-7, group: 0-7, other: 0-7 }
const toOctal = (st) => (st.special ? String(st.special) : '') + st.user + st.group + st.other;

const toSymbolic = (st) => {
  let out = '';
  WHO.forEach((w, i) => {
    const d = st[w];
    out += d & 4 ? 'r' : '-';
    out += d & 2 ? 'w' : '-';
    const x = d & 1;
    const specialBit = [4, 2, 1][i];          // setuid on user, setgid on group, sticky on other
    if (st.special & specialBit) out += i === 2 ? (x ? 't' : 'T') : (x ? 's' : 'S');
    else out += x ? 'x' : '-';
  });
  return out;
};

const toChmodSymbolic = (st) => {
  const part = (w, i) => {
    const d = st[w];
    let p = (d & 4 ? 'r' : '') + (d & 2 ? 'w' : '') + (d & 1 ? 'x' : '');
    if (st.special & [4, 2, 1][i]) p += i === 2 ? 't' : 's';
    return w[0] + '=' + p;
  };
  return WHO.map(part).join(',');
};

const parseOctal = (text) => {
  const t = String(text).trim();
  if (t === '') return { ok: false, message: '' };
  if (!/^[0-7]{3,4}$/.test(t)) return { ok: false, message: 'Enter 3 or 4 octal digits (0–7), for example 755 or 4755.' };
  const d = t.padStart(4, '0').split('').map(Number);
  return { ok: true, state: { special: d[0], user: d[1], group: d[2], other: d[3] } };
};

const parseSymbolic = (text) => {
  let t = String(text).trim();
  if (t === '') return { ok: false, message: '' };
  if (t.length === 10 && /^[-dlcbps]/.test(t)) t = t.slice(1);        // allow "drwxr-xr-x" from ls -l
  if (!/^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(t)) {
    return { ok: false, message: 'Enter 9 characters like rwxr-xr-x (r, w, x or -, with s/S or t/T for special bits).' };
  }
  const st = { special: 0, user: 0, group: 0, other: 0 };
  WHO.forEach((w, i) => {
    const c = t.slice(i * 3, i * 3 + 3);
    st[w] = (c[0] === 'r' ? 4 : 0) + (c[1] === 'w' ? 2 : 0) + (/[xst]/.test(c[2]) ? 1 : 0);
    if (/[sStT]/.test(c[2])) st.special += [4, 2, 1][i];
  });
  return { ok: true, state: st };
};

const describe = (st) => {
  const words = (d) => {
    const p = PERMS.filter(([, v]) => d & v).map(([n]) => n);
    return p.length ? p.join(', ') : 'no access';
  };
  const lines = [`Owner: ${words(st.user)}`, `Group: ${words(st.group)}`, `Others: ${words(st.other)}`];
  if (st.special & 4) lines.push('setuid: runs with the file owner\'s permissions');
  if (st.special & 2) lines.push('setgid: runs with the group\'s permissions (on a directory, new files inherit the group)');
  if (st.special & 1) lines.push('sticky: in a directory, only a file\'s owner can delete or rename it');
  return lines;
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
    const el = byId('chmod-message');
    el.textContent = text;
    el.className = 'converter-message' + (text ? ' is-error' : '');
  };

  const readBoxes = () => {
    const st = { special: 0, user: 0, group: 0, other: 0 };
    WHO.forEach((w) => PERMS.forEach(([n, v]) => { if (byId(`${w}-${n}`).checked) st[w] += v; }));
    [['setuid', 4], ['setgid', 2], ['sticky', 1]].forEach(([n, v]) => { if (byId(n).checked) st.special += v; });
    return st;
  };
  const show = (st, skip) => {
    WHO.forEach((w) => PERMS.forEach(([n, v]) => { byId(`${w}-${n}`).checked = !!(st[w] & v); }));
    [['setuid', 4], ['setgid', 2], ['sticky', 1]].forEach(([n, v]) => { byId(n).checked = !!(st.special & v); });
    if (skip !== 'octal') byId('octal').value = toOctal(st);
    if (skip !== 'symbolic') byId('symbolic').value = toSymbolic(st);
    const file = byId('filename').value.trim() || 'file';
    byId('cmd-octal').value = `chmod ${toOctal(st)} ${file}`;
    byId('cmd-symbolic').value = `chmod ${toChmodSymbolic(st)} ${file}`;
    byId('chmod-description').innerHTML = describe(st).map((l) => `<li>${l}</li>`).join('');
  };

  const onBoxes = () => { spin(false); message(''); show(readBoxes()); };
  const onOctal = () => {
    spin(false);
    const r = parseOctal(byId('octal').value);
    message(r.message || '');
    if (r.ok) show(r.state, 'octal');
  };
  const onSymbolic = () => {
    spin(true);
    const r = parseSymbolic(byId('symbolic').value);
    message(r.message || '');
    if (r.ok) show(r.state, 'symbolic');
  };
  const copy = (id) => {
    const value = byId(id).value;
    if (!value) { alertNotification('Nothing to copy'); return; }
    copyToClipboard(value);
    alertNotification('Copied to clipboard: ' + value);
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!byId('chmodCalculator')) return;
    document.querySelectorAll('#chmodCalculator input[type=checkbox]').forEach((c) => c.addEventListener('change', onBoxes));
    byId('octal').addEventListener('input', onOctal);
    byId('symbolic').addEventListener('input', onSymbolic);
    byId('filename').addEventListener('input', () => show(readBoxes()));
    ['octal', 'symbolic', 'cmd-octal', 'cmd-symbolic'].forEach((id) => byId('copy-' + id).addEventListener('click', () => copy(id)));
    document.querySelectorAll('.chmod-table tbody tr').forEach((tr) => {
      tr.style.cursor = 'pointer';
      tr.title = 'Click to load these permissions';
      tr.addEventListener('click', () => {
        const r = parseOctal(tr.cells[0].textContent.trim());
        if (r.ok) { spin(false); message(''); show(r.state); byId('chmodCalculator').scrollIntoView({ behavior: 'smooth' }); }
      });
    });
    const params = new URLSearchParams(window.location.search);
    const start = parseOctal(params.get('mode') || '755');
    show(start.ok ? start.state : parseOctal('755').state);
  });
}

if (typeof module !== 'undefined') {
  module.exports = { toOctal, toSymbolic, toChmodSymbolic, parseOctal, parseSymbolic, describe };
}
