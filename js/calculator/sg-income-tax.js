// Singapore Income Tax Calculator (codingnconcepts.com/tools/singapore-income-tax/)
// Resident progressive rates for YA 2024 onwards, non-resident employment income
// (higher of 15% flat or resident rates, no personal reliefs) and the 60-day exemption.

const RESIDENT_BANDS = [            // [upper limit of band, rate %]
  [20000, 0], [30000, 2], [40000, 3.5], [80000, 7], [120000, 11.5], [160000, 15],
  [200000, 18], [240000, 19], [280000, 19.5], [320000, 20], [500000, 22],
  [1000000, 23], [Infinity, 24]
];
const NON_RESIDENT_FLAT_RATE = 15;

const money = (n) => '$' + (Math.round(n * 100) / 100).toLocaleString('en-SG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// Progressive tax with a per-band breakdown
const residentTax = (chargeable) => {
  let tax = 0, lower = 0;
  const bands = [];
  for (const [upper, rate] of RESIDENT_BANDS) {
    if (chargeable > lower) {
      const portion = Math.min(chargeable, upper) - lower;
      const bandTax = portion * rate / 100;
      tax += bandTax;
      bands.push({ from: lower, to: Math.min(chargeable, upper), rate, tax: bandTax });
    }
    lower = upper;
  }
  return { tax, bands };
};

// Earned Income Relief by age (age as of 31 Dec of the previous year)
const earnedIncomeRelief = (age) => {
  if (!(age >= 1)) return 0;
  if (age < 55) return 1000;
  if (age <= 59) return 6000;
  return 8000;
};

// inputs: { residency: 'resident'|'non-resident'|'short-term', salary, bonus, taxSaving, relief } (yearly amounts)
const calculateTax = (inputs) => {
  const income = Math.max(0, (inputs.salary || 0) + (inputs.bonus || 0));
  if (inputs.residency === 'short-term') {
    return { chargeable: 0, tax: 0, bands: [], note: 'Employment in Singapore for 60 days or less in a calendar year is exempt from tax (this does not apply to company directors, public entertainers or professionals).' };
  }
  if (inputs.residency === 'non-resident') {
    const flat = income * NON_RESIDENT_FLAT_RATE / 100;
    const progressive = residentTax(income);
    const useFlat = flat >= progressive.tax;
    return {
      chargeable: income,
      tax: Math.max(flat, progressive.tax),
      bands: useFlat ? [{ from: 0, to: income, rate: NON_RESIDENT_FLAT_RATE, tax: flat, flat: true }] : progressive.bands,
      note: `As a non-resident, your employment income is taxed at the higher of 15% flat (${money(flat)}) or the resident rates (${money(progressive.tax)}), and you can't claim personal reliefs. The ${useFlat ? '15% flat rate applies' : 'resident rates apply'} here.`
    };
  }
  const chargeable = Math.max(0, income - (inputs.taxSaving || 0) - (inputs.relief || 0));
  const { tax, bands } = residentTax(chargeable);
  return { chargeable, tax, bands, note: '' };
};

// ---------- page wiring ----------
if (typeof document !== 'undefined') {
  const byId = (id) => document.getElementById(id);
  const amount = (id, periodId) => {
    const v = parseFloat(String(byId(id).value).replace(/[,$\s]/g, ''));
    if (!(v > 0)) return 0;
    return periodId && byId(periodId).value === 'monthly' ? v * 12 : v;
  };

  // Spin the calculator icon briefly while recalculating
  let spinTimer = null;
  const spin = () => {
    const icon = document.querySelector('.converter-icon img');
    if (!icon) return;
    icon.classList.add('spinning');
    clearTimeout(spinTimer);
    spinTimer = setTimeout(() => icon.classList.remove('spinning'), 600);
  };

  const render = (animate) => {
    if (animate !== false) spin();
    const residency = byId('residency').value;
    const resident = residency === 'resident';
    ['tax-saving-row', 'age-row', 'tax-relief-row'].forEach((id) => { byId(id).style.display = resident ? '' : 'none'; });
    const result = calculateTax({
      residency,
      salary: amount('salary', 'salary-period'),
      bonus: amount('bonus', 'bonus-period'),
      taxSaving: amount('tax-saving', 'tax-saving-period'),
      relief: amount('tax-relief')
    });
    const income = amount('salary', 'salary-period') + amount('bonus', 'bonus-period');
    byId('taxable-income').value = money(result.chargeable);
    byId('income-tax').value = money(result.tax);
    byId('monthly-tax').value = money(result.tax / 12);
    byId('effective-rate').value = income > 0 ? (result.tax / income * 100).toFixed(2) + '%' : '0%';
    byId('tax-note').textContent = result.note;
    byId('tax-breakdown').innerHTML = result.bands.length && income > 0
      ? '<table><thead><tr><th>Income band</th><th>Rate</th><th>Tax</th></tr></thead><tbody>' +
        result.bands.map((b) => `<tr><td>${b.flat ? 'All employment income' : money(b.from) + ' – ' + money(b.to)}</td><td>${b.rate}%</td><td>${money(b.tax)}</td></tr>`).join('') +
        `</tbody><tfoot><tr><th>Total</th><th></th><th>${money(result.tax)}</th></tr></tfoot></table>`
      : '';
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!byId('singaporeIncomeTaxCalculator')) return;
    ['residency', 'salary', 'salary-period', 'bonus', 'bonus-period', 'tax-saving', 'tax-saving-period', 'tax-relief']
      .forEach((id) => { byId(id).addEventListener('input', render); byId(id).addEventListener('change', render); });
    byId('age').addEventListener('input', () => { byId('tax-relief').value = earnedIncomeRelief(parseInt(byId('age').value, 10)) || ''; render(); });
    render(false);
  });
}

if (typeof module !== 'undefined') {
  module.exports = { residentTax, calculateTax, earnedIncomeRelief };
}
