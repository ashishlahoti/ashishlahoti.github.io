// Exam Passing Score Calculator (codingnconcepts.com/tools/exam-passing-score-calculator/)
// How many questions you must get right (and can get wrong) to pass a certification exam.

const questionsNeeded = (total, percent) => Math.ceil(total * percent / 100 - 1e-9);

const parseMinutes = (text) => {
  const t = String(text || '').toLowerCase();
  const h = /(\d+(?:\.\d+)?)\s*hours?/.exec(t);
  const m = /(\d+)\s*min/.exec(t);
  if (h) return Math.round(parseFloat(h[1]) * 60) + (m && t.indexOf(m[0]) > t.indexOf(h[0]) ? parseInt(m[1], 10) : 0);
  if (m) return parseInt(m[1], 10);
  return null;
};

const passNote = (exam) => {
  switch (exam.passKind) {
    case 'exact': return `Official pass mark: ${exam.passText}.`;
    case 'target': return `${exam.passText}. The vendor doesn't publish a percentage, so this uses the target shown.`;
    case 'scaled': return `Official pass mark: ${exam.passText}. This is a scaled score, not a percentage of questions, and questions can carry different weights, so ${exam.passPercent}% (pass mark ÷ top of the scale) is only a rough guide. Aim higher to be safe.`;
    default: return `${exam.passText || 'The pass mark isn\'t published'}. 70% is used as a sensible target; change it if you like.`;
  }
};

const evaluate = (total, percent, correct) => {
  if (!(total > 0) || !(percent > 0 && percent <= 100)) return null;
  const need = questionsNeeded(total, percent);
  const res = { need, canMiss: total - need };
  if (correct !== null && correct !== undefined && correct !== '' && correct >= 0 && correct <= total) {
    const score = correct / total * 100;
    res.practice = { score, passed: correct >= need, margin: correct - need };
  }
  return res;
};

// ---------- page wiring ----------
if (typeof document !== 'undefined') {
  const byId = (id) => document.getElementById(id);
  let exams = [];
  let current = null;
  let spinTimer = null;
  const spin = () => {
    const icon = document.querySelector('.converter-icon img');
    if (!icon) return;
    icon.classList.add('spinning');
    clearTimeout(spinTimer);
    spinTimer = setTimeout(() => icon.classList.remove('spinning'), 600);
  };
  const label = (e) => `${e.name} — ${e.provider}`;

  const showExam = (exam) => {
    current = exam;
    const facts = byId('exam-facts');
    if (!exam) { facts.innerHTML = ''; return; }
    byId('total').value = exam.qMax || '';
    byId('percent').value = exam.passPercent || 70;
    const mins = parseMinutes(exam.time);
    const perQ = mins && exam.qMax ? ` (about ${(mins / exam.qMax).toFixed(1)} minutes per question)` : '';
    facts.innerHTML =
      `<table><tbody>` +
      `<tr><th>Exam</th><td>${exam.name}</td></tr>` +
      `<tr><th>Questions</th><td>${exam.questionsText || 'Not published'}</td></tr>` +
      `<tr><th>Time</th><td>${exam.time || 'Not published'}${perQ}</td></tr>` +
      `<tr><th>Pass mark</th><td>${exam.passText || 'Not published'}</td></tr>` +
      `</tbody></table>` +
      `<p class="exam-links"><a href="${exam.post}">Free ${exam.name} practice questions</a> · <a href="${exam.practice}" rel="noopener">Timed online practice exam</a></p>`;
    if (!exam.qMax) facts.innerHTML += '<p class="converter-message is-info">This exam doesn\'t have a fixed number of multiple-choice questions (for example, hands-on tasks), so enter a number yourself to estimate.</p>';
    render();
  };

  const render = () => {
    spin();
    const total = parseInt(byId('total').value, 10);
    const percent = parseFloat(byId('percent').value);
    const correctText = byId('correct').value.trim();
    const correct = correctText === '' ? null : parseInt(correctText, 10);
    const out = byId('score-result');
    const r = evaluate(total, percent, correct);
    if (!r) { out.innerHTML = '<p class="converter-message">Enter the number of questions and the pass percentage.</p>'; byId('pass-note').textContent = current ? passNote(current) : ''; return; }
    let html = `<p class="score-big">You need <strong>${r.need} of ${total}</strong> correct</p>` +
      `<p>You can get up to <strong>${r.canMiss}</strong> question${r.canMiss === 1 ? '' : 's'} wrong and still reach ${percent}%.</p>`;
    if (correct !== null && !Number.isNaN(correct)) {
      if (!r.practice) html += `<p class="converter-message is-error">Your practice score must be from 0 to ${total}.</p>`;
      else {
        const p = r.practice;
        html += p.passed
          ? `<p class="score-pass">Your practice score: ${correct}/${total} = ${p.score.toFixed(1)}%, which passes with ${p.margin} question${p.margin === 1 ? '' : 's'} to spare.</p>`
          : `<p class="score-fail">Your practice score: ${correct}/${total} = ${p.score.toFixed(1)}%. You need ${-p.margin} more correct answer${p.margin === -1 ? '' : 's'} to pass.</p>`;
      }
    }
    out.innerHTML = html;
    byId('pass-note').textContent = current ? passNote(current) : '';
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!byId('examScoreCalculator')) return;
    ['total', 'percent', 'correct'].forEach((id) => byId(id).addEventListener('input', render));
    const search = byId('exam-search');
    fetch('/data/exam-facts.json').then((r) => r.json()).then((data) => {
      exams = data;
      const list = byId('exam-list');
      exams.forEach((e) => { const o = document.createElement('option'); o.value = label(e); list.appendChild(o); });
      byId('exam-count').textContent = exams.length;
      const pick = () => {
        const v = search.value.trim().toLowerCase();
        const exam = exams.find((e) => label(e).toLowerCase() === v) ||
          (v.length > 2 ? exams.find((e) => e.slug === v || e.name.toLowerCase() === v) : null);
        if (exam) showExam(exam);
      };
      search.addEventListener('input', pick);
      search.addEventListener('change', pick);
      const params = new URLSearchParams(window.location.search);
      const start = exams.find((e) => e.slug === params.get('exam'));
      if (start) { search.value = label(start); showExam(start); } else render();
    }).catch(() => { byId('exam-facts').innerHTML = '<p class="converter-message is-error">Couldn\'t load the exam list. You can still enter the numbers yourself.</p>'; render(); });
  });
}

if (typeof module !== 'undefined') {
  module.exports = { questionsNeeded, parseMinutes, evaluate, passNote };
}
