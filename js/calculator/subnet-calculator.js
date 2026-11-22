// IPv4 Subnet Calculator (codingnconcepts.com/tools/subnet-calculator/)
// Network, broadcast, usable host range, masks, class and binary for any IPv4 address and prefix,
// plus splitting a network into smaller subnets.

const ipToInt = (ip) => ip.split('.').reduce((acc, o) => acc * 256 + Number(o), 0);
const intToIp = (n) => [24, 16, 8, 0].map((s) => Math.floor(n / 2 ** s) % 256).join('.');
const prefixToMaskInt = (prefix) => (prefix === 0 ? 0 : (2 ** 32 - 2 ** (32 - prefix)));
const toBinary = (n) => [24, 16, 8, 0].map((s) => (Math.floor(n / 2 ** s) % 256).toString(2).padStart(8, '0')).join('.');

const isValidIp = (ip) => /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(ip) &&
  ip.split('.').every((o) => Number(o) <= 255 && String(Number(o)) === o);

// "255.255.255.0" -> 24, or null if not a valid contiguous mask
const maskToPrefix = (mask) => {
  if (!isValidIp(mask)) return null;
  const bits = toBinary(ipToInt(mask)).replace(/\./g, '');
  return /^1*0*$/.test(bits) ? bits.indexOf('0') === -1 ? 32 : bits.indexOf('0') : null;
};

const ipClass = (firstOctet) => {
  if (firstOctet < 128) return 'A';
  if (firstOctet < 192) return 'B';
  if (firstOctet < 224) return 'C';
  if (firstOctet < 240) return 'D (multicast)';
  return 'E (reserved)';
};

const addressType = (n) => {
  const inRange = (cidr) => {
    const [base, p] = cidr.split('/');
    const mask = prefixToMaskInt(Number(p));
    return Math.floor(n / 2 ** (32 - p)) === Math.floor(ipToInt(base) / 2 ** (32 - p)) && mask >= 0;
  };
  if (['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'].some(inRange)) return 'Private (RFC 1918)';
  if (inRange('127.0.0.0/8')) return 'Loopback';
  if (inRange('169.254.0.0/16')) return 'Link-local (APIPA)';
  if (inRange('100.64.0.0/10')) return 'Shared address space (carrier-grade NAT)';
  if (inRange('224.0.0.0/4')) return 'Multicast';
  if (inRange('240.0.0.0/4')) return 'Reserved';
  if (inRange('0.0.0.0/8')) return '"This network"';
  return 'Public';
};

// text like "192.168.1.10/24", "192.168.1.10 255.255.255.0" or ip + separate prefix
const parseInput = (text, prefixOverride) => {
  const t = String(text).trim();
  if (!t) return { ok: false, message: '' };
  const m = /^(\d{1,3}(?:\.\d{1,3}){3})\s*(?:\/\s*(\d{1,2})|\s+(\d{1,3}(?:\.\d{1,3}){3}))?$/.exec(t);
  if (!m) return { ok: false, message: 'Enter an IPv4 address like 192.168.1.10/24 or 10.0.0.5 255.255.255.0.' };
  const ip = m[1];
  if (!isValidIp(ip)) return { ok: false, message: `${ip} is not a valid IPv4 address. Each part must be a number from 0 to 255, without leading zeros.` };
  let prefix;
  if (m[2] !== undefined) prefix = Number(m[2]);
  else if (m[3] !== undefined) {
    prefix = maskToPrefix(m[3]);
    if (prefix === null) return { ok: false, message: `${m[3]} is not a valid subnet mask. Mask bits must be all 1s followed by all 0s.` };
  } else prefix = prefixOverride;
  if (!(prefix >= 0 && prefix <= 32)) return { ok: false, message: 'The prefix length must be from /0 to /32.' };
  return { ok: true, ip, prefix };
};

const calculate = (ip, prefix) => {
  const n = ipToInt(ip);
  const size = 2 ** (32 - prefix);
  const network = Math.floor(n / size) * size;
  const broadcast = network + size - 1;
  const mask = prefixToMaskInt(prefix);
  let first, last, usable;
  if (prefix === 32) { first = last = network; usable = 1; }
  else if (prefix === 31) { first = network; last = broadcast; usable = 2; }
  else { first = network + 1; last = broadcast - 1; usable = size - 2; }
  return {
    ip, prefix,
    network: intToIp(network),
    broadcast: prefix >= 31 ? 'None' : intToIp(broadcast),
    firstHost: intToIp(first),
    lastHost: intToIp(last),
    usableHosts: usable,
    totalAddresses: size,
    mask: intToIp(mask),
    wildcard: intToIp(2 ** 32 - 1 - mask),
    cidr: `${intToIp(network)}/${prefix}`,
    ipClass: ipClass(Number(ip.split('.')[0])),
    type: addressType(n),
    binaryIp: toBinary(n),
    binaryMask: toBinary(mask),
    binaryNetwork: toBinary(network),
    networkInt: network,
    note: prefix === 31 ? '/31 is used for point-to-point links (RFC 3021): both addresses are usable and there is no broadcast address.'
      : prefix === 32 ? '/32 identifies a single host, for example a loopback or a host route.' : ''
  };
};

// Split network/prefix into subnets of newPrefix (returns first `limit`)
const split = (networkInt, prefix, newPrefix, limit = 64) => {
  if (newPrefix <= prefix || newPrefix > 32) return { count: 0, subnets: [] };
  const count = 2 ** (newPrefix - prefix);
  const size = 2 ** (32 - newPrefix);
  const subnets = [];
  for (let i = 0; i < Math.min(count, limit); i++) {
    const net = networkInt + i * size;
    const r = calculate(intToIp(net), newPrefix);
    subnets.push({ cidr: r.cidr, range: `${r.firstHost} – ${r.lastHost}`, broadcast: r.broadcast });
  }
  return { count, subnets };
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
  const FIELDS = ['network', 'broadcast', 'firstHost', 'lastHost', 'usableHosts', 'totalAddresses', 'mask', 'wildcard', 'cidr', 'ipClass', 'type'];
  let current = null;

  const render = (animate) => {
    if (animate !== false) spin();
    const parsed = parseInput(byId('ip-input').value, Number(byId('prefix').value));
    const msg = byId('subnet-message');
    msg.textContent = parsed.message || '';
    msg.className = 'converter-message' + (parsed.message ? ' is-error' : '');
    if (!parsed.ok) { current = null; FIELDS.forEach((f) => { byId('out-' + f).textContent = '–'; }); byId('binary').textContent = ''; byId('subnet-note').textContent = ''; renderSplit(); return; }
    if (byId('prefix').value !== String(parsed.prefix)) byId('prefix').value = String(parsed.prefix);
    const r = calculate(parsed.ip, parsed.prefix);
    current = r;
    FIELDS.forEach((f) => { byId('out-' + f).textContent = typeof r[f] === 'number' ? r[f].toLocaleString('en-US') : r[f]; });
    byId('binary').textContent = `IP address    ${r.binaryIp}\nSubnet mask   ${r.binaryMask}\nNetwork       ${r.binaryNetwork}`;
    byId('subnet-note').textContent = r.note;
    renderSplit();
  };

  const renderSplit = () => {
    const out = byId('split-output');
    if (!current) { out.innerHTML = ''; return; }
    const newPrefix = Number(byId('split-prefix').value);
    if (!(newPrefix > current.prefix)) { out.innerHTML = `<p class="converter-message">Pick a prefix longer than /${current.prefix} to split this network.</p>`; return; }
    const { count, subnets } = split(current.networkInt, current.prefix, newPrefix);
    out.innerHTML = `<p>${current.cidr} splits into <strong>${count.toLocaleString('en-US')}</strong> subnets of /${newPrefix}` +
      (count > subnets.length ? ` (first ${subnets.length} shown)` : '') + ':</p>' +
      '<div class="table-scroll"><table><thead><tr><th>Subnet</th><th>Usable hosts</th><th>Broadcast</th></tr></thead><tbody>' +
      subnets.map((s) => `<tr><td>${s.cidr}</td><td>${s.range}</td><td>${s.broadcast}</td></tr>`).join('') + '</tbody></table></div>';
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!byId('subnetCalculator')) return;
    const prefixSel = byId('prefix'), splitSel = byId('split-prefix');
    for (let p = 32; p >= 0; p--) {
      const mask = intToIp(prefixToMaskInt(p));
      prefixSel.add(new Option(`/${p}  (${mask})`, String(p)));
      splitSel.add(new Option(`/${p}`, String(p)));
    }
    prefixSel.value = '24'; splitSel.value = '26';
    byId('ip-input').addEventListener('input', render);
    prefixSel.addEventListener('change', () => {
      // a prefix picked from the list replaces one typed in the box
      byId('ip-input').value = byId('ip-input').value.replace(/\s*(\/\s*\d{1,2}|\s+\d{1,3}(\.\d{1,3}){3})\s*$/, '') + '/' + prefixSel.value;
      render();
    });
    splitSel.addEventListener('change', renderSplit);
    const params = new URLSearchParams(window.location.search);
    if (params.get('ip')) byId('ip-input').value = params.get('ip');
    render(false);
  });
}

if (typeof module !== 'undefined') {
  module.exports = { ipToInt, intToIp, maskToPrefix, parseInput, calculate, split, addressType };
}
