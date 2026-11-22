// Roman Numeral Converter (codingnconcepts.com/tools/number-to-roman/)
// Converts as you type in both directions, validates input, supports large numbers
// with the vinculum (overline = x1000) and converts dates.

const ROMAN_SYMBOLS = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
];
const ROMAN_VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
const STANDARD_ROMAN = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
const OVERLINE = '̅';   // combining overline: the letter before it is multiplied by 1,000
const MAX_STANDARD = 3999;
const MAX_LARGE = 3999999;

const formatNumber = (n) => n.toLocaleString('en-US');

// 1..3999 -> standard Roman numeral
const toRoman = (number) => {
  let roman = '';
  for (const [value, symbol] of ROMAN_SYMBOLS) {
    while (number >= value) {
      roman += symbol;
      number -= value;
    }
  }
  return roman;
};

const overline = (text) => text.split('').map((c) => c + OVERLINE).join('');

// 1..3,999,999 -> Roman numeral, using the vinculum for the thousands above 3,999
const toRomanLarge = (number) => {
  if (number <= MAX_STANDARD) return toRoman(number);
  return overline(toRoman(Math.floor(number / 1000))) + toRoman(number % 1000);
};

// Value of a standard Roman numeral (already validated)
const romanValue = (roman) => {
  let total = 0;
  for (let i = 0; i < roman.length; i++) {
    const current = ROMAN_VALUES[roman[i]];
    const next = ROMAN_VALUES[roman[i + 1]] || 0;
    total += current < next ? -current : current;
  }
  return total;
};

// Number text typed by the user -> { ok, roman, message }
const convertNumber = (text) => {
  const cleaned = String(text).trim().replace(/[,_\s]/g, '');
  if (cleaned === '') return { ok: false, roman: '', message: '' };
  if (/^-/.test(cleaned)) return { ok: false, roman: '', message: 'Roman numerals have no negative numbers. Enter a whole number from 1 to 3,999,999.' };
  if (/^\d*\.\d+$|^\d+\.\d*$/.test(cleaned)) return { ok: false, roman: '', message: 'Roman numerals only write whole numbers. Remove the decimal part.' };
  if (!/^\d+$/.test(cleaned)) return { ok: false, roman: '', message: 'Enter digits only, for example 2026.' };
  const number = parseInt(cleaned, 10);
  if (number === 0) return { ok: false, roman: '', message: 'There is no Roman numeral for zero. Medieval scribes sometimes wrote N, for "nulla" (none).' };
  if (number > MAX_LARGE) return { ok: false, roman: '', message: 'That is too large. This converter goes up to 3,999,999.' };
  const roman = toRomanLarge(number);
  const message = number > MAX_STANDARD
    ? `${formatNumber(number)} is above 3,999, so the thousands are written with a bar on top (vinculum), which multiplies a letter by 1,000.`
    : '';
  return { ok: true, roman, message };
};

// Roman numeral text typed by the user -> { ok, value, message }
const convertRoman = (text) => {
  const cleaned = String(text).trim().replace(/\s/g, '').toUpperCase()
    .replace(/[‾¯]/g, OVERLINE);          // treat a typed macron/overline like the combining overline
  if (cleaned === '') return { ok: false, value: null, message: '' };
  const letters = cleaned.replace(new RegExp(OVERLINE, 'g'), '');
  const invalid = letters.replace(/[IVXLCDM]/g, '');
  if (invalid) {
    const unique = [...new Set(invalid.split(''))];
    const what = unique.length === 1 ? `"${unique[0]}" is not a Roman numeral letter` : `"${unique.join('", "')}" are not Roman numeral letters`;
    return { ok: false, value: null, message: `${what}. Use only I, V, X, L, C, D and M.` };
  }

  // Split the barred (x1000) part from the plain part
  let barred = '', plain = '', i = 0;
  while (i < cleaned.length && cleaned[i + 1] === OVERLINE) { barred += cleaned[i]; i += 2; }
  plain = cleaned.slice(i);
  if (plain.includes(OVERLINE)) return { ok: false, value: null, message: 'Put the bar only on the leading letters (the thousands), for example V̅CC = 5,200.' };

  const plainOk = plain === '' || STANDARD_ROMAN.test(plain);
  const barredOk = barred === '' || STANDARD_ROMAN.test(barred);
  if (plainOk && barredOk) {
    const value = (barred ? romanValue(barred) * 1000 : 0) + (plain ? romanValue(plain) : 0);
    if (barred && value <= MAX_STANDARD) {
      return { ok: false, value: null, message: `Numbers up to 3,999 are written without a bar: ${toRoman(value)}.` };
    }
    return { ok: true, value, message: '' };
  }

  // Not standard: work out what was probably meant and suggest the standard form
  const loose = (s) => s.split('').reduce((t, c, k, a) => {
    const cur = ROMAN_VALUES[c], nxt = ROMAN_VALUES[a[k + 1]] || 0;
    return t + (cur < nxt ? -cur : cur);
  }, 0);
  const guess = (barred ? loose(barred) * 1000 : 0) + loose(plain);
  const suggestion = guess >= 1 && guess <= MAX_LARGE ? toRomanLarge(guess) : '';
  const shown = text.trim().toUpperCase();
  return {
    ok: false,
    value: null,
    message: suggestion && suggestion !== cleaned
      ? `${shown} is not a standard Roman numeral. Did you mean ${suggestion} (${formatNumber(guess)})?`
      : `${shown} is not a standard Roman numeral.`,
    suggestion
  };
};

// "YYYY-MM-DD" -> Roman date, e.g. XXII.XI.MMXXVI
const convertDate = (iso, order = 'DMY', separator = '.') => {
  const m = /^(\d{1,4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return { ok: false, roman: '', message: '' };
  const [year, month, day] = [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
  if (year < 1 || year > MAX_STANDARD) return { ok: false, roman: '', message: 'Pick a year from 1 to 3999.' };
  const parts = { D: toRoman(day), M: toRoman(month), Y: toRoman(year) };
  return { ok: true, roman: order.split('').map((k) => parts[k]).join(separator), message: '' };
};

// ---------- page wiring ----------
if (typeof document !== 'undefined') {
  const byId = (id) => document.getElementById(id);
  const show = (id, message, isError) => {
    const el = byId(id);
    if (!el) return;
    el.textContent = message;
    el.className = 'converter-message' + (message ? (isError ? ' is-error' : ' is-info') : '');
  };
  const copy = (value, label) => {
    if (!value) { alertNotification(`No ${label} to copy`); return; }
    copyToClipboard(value);
    alertNotification('Copied to clipboard: ' + value);
  };

  const onNumberInput = () => {
    const result = convertNumber(byId('decimal-number').value);
    byId('roman-number').value = result.roman;
    show('roman-message', '', false);
    show('number-message', result.message, !result.ok);
  };
  const onRomanInput = () => {
    const result = convertRoman(byId('roman-number').value);
    byId('decimal-number').value = result.ok ? formatNumber(result.value) : '';
    show('number-message', '', false);
    show('roman-message', result.message, !result.ok);
  };
  const onDateInput = () => {
    const result = convertDate(byId('date-input').value, byId('date-order').value, byId('date-separator').value);
    byId('date-roman').value = result.roman;
    show('date-message', result.message, !result.ok);
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!byId('decimal-number')) return;
    byId('decimal-number').addEventListener('input', onNumberInput);
    byId('roman-number').addEventListener('input', onRomanInput);
    byId('copy-number').addEventListener('click', () => copy(byId('decimal-number').value, 'number'));
    byId('copy-roman').addEventListener('click', () => copy(byId('roman-number').value, 'Roman numeral'));
    ['date-input', 'date-order', 'date-separator'].forEach((id) => byId(id).addEventListener('input', onDateInput));
    byId('date-order').addEventListener('change', onDateInput);
    byId('date-separator').addEventListener('change', onDateInput);
    byId('copy-date').addEventListener('click', () => copy(byId('date-roman').value, 'Roman date'));

    // Optional deep link: /tools/number-to-roman/?n=2026 or ?r=MMXXVI
    const params = new URLSearchParams(window.location.search);
    if (params.get('n')) { byId('decimal-number').value = params.get('n'); onNumberInput(); }
    else if (params.get('r')) { byId('roman-number').value = params.get('r'); onRomanInput(); }
  });
}

if (typeof module !== 'undefined') {
  module.exports = { toRoman, toRomanLarge, romanValue, convertNumber, convertRoman, convertDate };
}
