/* Puerto Rico Grid Report Card — page logic.
   Reads window.GRID_DATA (data.js) and window.GRID_CONFIG (config.js). No libraries needed. */
(function () {
  'use strict';
  const D = window.GRID_DATA;
  const C = window.GRID_CONFIG;
  if (!D || !C) return;

  const YEARS = D.meta.years;
  const LATEST = D.meta.latestYear;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs) => { const n = document.createElementNS(SVGNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };

  /* ---------- Formatting ---------- */
  const num = (v, d = 0) => Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (v, d = 1) => `${num(v * 100, d)}%`;
  const hours = (min, d = 1) => `${num(min / 60, d)} hours`;
  const duration = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} hr ${m} min` : `${m} min`; };
  const fyStart = (fy) => Number(fy.slice(2)) - 1;
  const fyShort = (fy) => `${fyStart(fy)}–${String(fyStart(fy) + 1).slice(2)}`;
  const fyLong = (fy) => `July ${fyStart(fy)} to June ${fyStart(fy) + 1}`;
  const prevYear = (fy) => YEARS[YEARS.indexOf(fy) - 1];
  const monthName = (ym) => new Date(`${ym}-01T00:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const UNIT_TEXT = {
    saidi: (v) => `${num(v / 60, 1)} hrs`,
    saifi: (v) => num(v, 1),
    caidi: (v) => duration(v),
    veg: (v) => `${num(v)} mi`,
    calls: (v) => pct(v), estimated: (v) => pct(v), losses: (v) => pct(v), fleet: (v) => pct(v),
    asa: (v) => `${num(v, 1)} min`,
    complaints: (v) => num(v, 2), osha: (v) => num(v, 2), dart: (v) => num(v, 2),
    dispute: (v) => `${num(v)} days`,
    fatal: (v) => num(v),
    backlog: (v) => num(v)
  };
  const valueText = (key, v) => (v == null || !isFinite(v) ? '—' : (UNIT_TEXT[key] || ((x) => num(x, 1)))(v));
  const isPercentUnit = (key) => ['calls', 'estimated', 'losses', 'fleet', 'abandon'].includes(key);

  /* Compare two values. Within 5% counts as about the same, as the Energy Bureau does. */
  function compare(key, cur, ref, better) {
    if (cur == null || ref == null) return null;
    const diff = cur - ref;
    const rel = ref === 0 ? (cur === 0 ? 0 : Infinity) : diff / Math.abs(ref);
    let word = 'About the same', cls = 'tag-flat';
    if (Math.abs(rel) > 0.05) {
      const good = better === 'down' ? diff < 0 : diff > 0;
      word = good ? 'Better' : 'Worse'; cls = good ? 'tag-good' : 'tag-bad';
    }
    const sign = (x, shown) => (Number(shown) === 0 ? '' : x > 0 ? '+' : '−');
    let amount;
    if (isPercentUnit(key)) { const sh = (Math.abs(diff) * 100).toFixed(1); amount = `${sign(diff, sh)}${num(Math.abs(diff) * 100, 1)} points`; }
    else if (!isFinite(rel)) amount = `${diff > 0 ? '+' : '−'}${num(Math.abs(diff))}`;
    else { const sh = (Math.abs(rel) * 100).toFixed(0); amount = `${sign(rel, sh)}${num(Math.abs(rel) * 100, 0)}%`; }
    return { word, cls, amount };
  }

  /* ---------- Scoring ---------- */
  const metricCfg = Object.fromEntries(C.metrics.map((m) => [m.key, m]));
  const annual = (key, fy) => { const a = D.annual[key]; return a && a[fy] != null ? Number(a[fy]) : null; };

  function startAndGoal(m) {
    const b = D.baselines[m.key] || {};
    const first = annual(m.key, YEARS[0]);
    const hasBase = b.baseline != null;
    const start = hasBase ? Number(b.baseline) : first;
    const startSrc = hasBase ? 'PREPA 2019–20 baseline' : `LUMA’s first year (${fyShort(YEARS[0])})`;
    const bench = b.benchmark != null ? Number(b.benchmark) : null;
    const benchBetter = bench != null && (bench === start || (m.better === 'down' ? bench < start : bench > start));
    const goal = benchBetter ? bench : start * (m.better === 'down' ? 1 - C.defaultGoalImprovement : 1 + C.defaultGoalImprovement);
    const goalSrc = benchBetter ? 'Energy Bureau benchmark' : '25% better than starting line';
    return { start, startSrc, goal, goalSrc };
  }

  function points(v, start, goal, better) {
    if (v == null || start == null) return null;
    const P0 = C.pointsAtStart, P1 = C.pointsAtGoal, Z = C.zeroWhenWorseBy;
    if (start === 0) {
      const ok = better === 'down' ? v <= 0 : v >= 0;
      return ok ? P1 : 0;
    }
    const improving = better === 'down' ? v <= start : v >= start;
    if (improving) {
      if (goal === start) return P1;
      return Math.min(P1, P0 + (P1 - P0) * Math.abs(v - start) / Math.abs(goal - start));
    }
    const worseBy = Math.abs(v - start) / Math.abs(start);
    return Math.max(0, P0 - P0 * worseBy / Z);
  }

  const letter = (score) => (C.grades.find((g) => score >= g.min) || C.grades[C.grades.length - 1]).letter;

  function scoreYear(fy) {
    const rows = C.metrics.map((m) => {
      const v = annual(m.key, fy);
      const sg = startAndGoal(m);
      return { m, v, ...sg, pts: points(v, sg.start, sg.goal, m.better) };
    }).filter((r) => r.pts != null && r.m.weight > 0);
    const totalW = rows.reduce((s, r) => s + r.m.weight, 0);
    const overall = rows.reduce((s, r) => s + r.pts * r.m.weight, 0) / totalW;
    const areas = C.areas.map((a) => {
      const rs = rows.filter((r) => r.m.area === a.key);
      const w = rs.reduce((s, r) => s + r.m.weight, 0);
      return { ...a, weight: w / totalW, score: w ? rs.reduce((s, r) => s + r.pts * r.m.weight, 0) / w : null };
    });
    return { fy, rows, totalW, overall, letter: letter(overall), areas };
  }
  const SCORES = Object.fromEntries(YEARS.map((fy) => [fy, scoreYear(fy)]));

  function gradeMeaning(score) {
    if (score >= 90) return 'Meeting the Energy Bureau’s goals.';
    if (score >= 80) return 'Close to the Energy Bureau’s goals.';
    if (score >= 70) return 'Better than before LUMA, but still short of the Energy Bureau’s goals.';
    if (score >= 60) return 'About the same as before LUMA took over.';
    return 'Worse overall than before LUMA took over, by these measures.';
  }

  /* ---------- Report card ---------- */
  let selected = LATEST;

  function renderReport(fy, animate) {
    selected = fy;
    const s = SCORES[fy];
    const big = $('grade-big');
    big.textContent = s.letter;
    big.className = `grade-big g-${s.letter}`;
    if (animate) { void big.offsetWidth; big.classList.add('stamp'); }
    $('score-num').textContent = num(s.overall);
    $('score-words').textContent = gradeMeaning(s.overall);
    $('report-year').textContent = `${fyLong(fy)} (fiscal year ${fy.slice(2)})`;
    $('report-title').textContent = `Overall grade: ${s.letter}`;

    document.querySelectorAll('.year-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fy === fy)));

    const list = $('areas'); list.replaceChildren();
    s.areas.forEach((a) => {
      if (a.score == null) return;
      const L = letter(a.score);
      const li = el('li', `area g-${L}`);
      li.appendChild(el('span', 'area-letter', L));
      li.appendChild(el('span', 'area-name', a.name));
      li.appendChild(el('span', 'area-score', `${num(a.score)} / 100, ${num(a.weight * 100)}% of grade`));
      const bar = el('span', 'area-bar'); const fill = el('span'); fill.style.width = `${Math.max(2, a.score)}%`; bar.appendChild(fill);
      li.appendChild(bar);
      list.appendChild(li);
    });
    renderWeights(fy);
  }

  function renderHistory() {
    const row = $('history-row'); row.replaceChildren();
    YEARS.forEach((fy) => {
      const s = SCORES[fy];
      const b = el('button', `year-btn g-${s.letter}`);
      b.type = 'button'; b.dataset.fy = fy;
      b.setAttribute('aria-label', `${fyLong(fy)}: grade ${s.letter}, ${num(s.overall)} out of 100`);
      b.appendChild(el('span', 'yb-letter', s.letter));
      b.appendChild(el('span', 'yb-year', fyShort(fy)));
      b.addEventListener('click', () => renderReport(fy, true));
      row.appendChild(b);
    });
  }

  function renderHeroSummary() {
    const s = SCORES[LATEST], p = prevYear(LATEST);
    const saidi = compare('saidi', annual('saidi', LATEST), annual('saidi', p), 'down');
    const calls = compare('calls', annual('calls', LATEST), annual('calls', p), 'up');
    const outageWords = saidi.word === 'Worse' ? 'customers spent more time without power than the year before'
      : saidi.word === 'Better' ? 'customers spent less time without power than the year before'
      : 'time without power was about the same as the year before';
    const callWords = calls.word === 'Worse' ? 'fewer customer calls were answered'
      : calls.word === 'Better' ? 'more customer calls were answered' : 'call answering held steady';
    const article = /^[AEF]/.test(s.letter) ? 'an' : 'a';
    $('hero-summary').textContent = `For ${fyLong(LATEST)}, LUMA earns ${article} ${s.letter} (${num(s.overall)} out of 100). ${outageWords.charAt(0).toUpperCase() + outageWords.slice(1)}, and ${callWords}.`;
  }

  /* ---------- Facts for a typical customer ---------- */
  function compareList(key, better) {
    const ul = el('ul', 'compare');
    const cur = annual(key, LATEST), prev = annual(key, prevYear(LATEST));
    const add = (label, cmp, refText) => {
      const li = el('li');
      if (cmp) { li.appendChild(el('span', `tag ${cmp.cls}`, `${cmp.word} (${cmp.amount})`)); li.appendChild(document.createTextNode(`${label}${refText ? `, ${refText}` : ''}`)); }
      else li.textContent = label;
      ul.appendChild(li);
    };
    add(`than ${fyShort(prevYear(LATEST))}`, compare(key, cur, prev, better), `when it was ${valueText(key, prev)}`);
    const b = D.baselines[key];
    if (b && b.baseline != null) add('than before LUMA (2019–20)', compare(key, cur, b.baseline, better), `when it was ${valueText(key, b.baseline)}`);
    else add('No official 2019–20 baseline to compare with');
    return ul;
  }

  function fact(value, label, detail, key, better) {
    const f = el('article', 'fact');
    f.appendChild(el('p', 'fact-value', value));
    f.appendChild(el('p', 'fact-label', label));
    f.appendChild(el('p', 'fact-detail', detail));
    f.appendChild(compareList(key, better));
    return f;
  }

  function renderFacts() {
    $('for-you-intro').textContent = `${fyLong(LATEST)}, compared with the year before and with 2019–20, the last year before LUMA took over.`;
    const box = $('facts'); box.replaceChildren();
    const saidi = annual('saidi', LATEST), saifi = annual('saifi', LATEST), caidi = annual('caidi', LATEST), calls = annual('calls', LATEST);
    box.appendChild(fact(hours(saidi), 'without power', 'Total time the average customer was without power because of problems on the power lines.', 'saidi', 'down'));
    box.appendChild(fact(`${num(saifi, 1)} times`, 'lost power', 'How many times the average customer had an outage during the year.', 'saifi', 'down'));
    box.appendChild(fact(duration(caidi), 'per outage', 'How long it took, on average, to get the power back after an outage.', 'caidi', 'down'));
    const missed = Math.round((1 - calls) * 10);
    box.appendChild(fact(pct(calls, 0), 'of calls answered', `About ${missed} in 10 calls to LUMA went unanswered.`, 'calls', 'up'));
  }

  /* ---------- Charts ---------- */
  function barChart(container, items, opts) {
    container.replaceChildren();
    const W = Math.max(300, container.clientWidth), H = opts.height || 280;
    const m = { t: 28, r: 12, b: 34, l: 12 };
    const max = Math.max(...items.map((i) => i.value), ...(opts.refs || []).map((r) => r.value)) * 1.12;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const y = (v) => m.t + ih - (v / max) * ih;
    const step = iw / items.length, bw = Math.min(72, step * 0.6);
    svg.appendChild(svgEl('line', { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), class: 'grid-line' }));
    items.forEach((it, i) => {
      const x = m.l + step * i + (step - bw) / 2;
      svg.appendChild(svgEl('rect', { x, y: y(it.value), width: bw, height: Math.max(1, y(0) - y(it.value)), rx: 4, class: it.latest ? 'bar bar-latest' : 'bar' }));
      const v = svgEl('text', { x: x + bw / 2, y: y(it.value) - 8, 'text-anchor': 'middle', class: 'val' }); v.textContent = it.valueLabel; svg.appendChild(v);
      const l = svgEl('text', { x: x + bw / 2, y: H - 10, 'text-anchor': 'middle' }); l.textContent = it.label; svg.appendChild(l);
    });
    (opts.refs || []).forEach((r) => {
      svg.appendChild(svgEl('line', { x1: m.l, x2: W - m.r, y1: y(r.value), y2: y(r.value), class: `ref ${r.cls}` }));
    });
    container.appendChild(svg);
    if (opts.refs && opts.refs.length) {
      const lg = el('div', 'chart-legend');
      opts.refs.forEach((r) => { const s = el('span', r.legendCls); s.appendChild(el('i')); s.appendChild(document.createTextNode(r.label)); lg.appendChild(s); });
      container.appendChild(lg);
    }
  }

  function lineChart(container, pts, opts) {
    container.replaceChildren();
    if (!pts.length) return;
    const W = Math.max(300, container.clientWidth), H = opts.height || 240;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
    container.appendChild(svg);
    const ticks = opts.yTicks;
    const measure = svgEl('text', {}); svg.appendChild(measure);
    let lw = 0; ticks.forEach((t) => { measure.textContent = opts.yFmt(t); lw = Math.max(lw, measure.getComputedTextLength()); });
    const last = pts[pts.length - 1];
    measure.textContent = opts.endLabel(last.v); const ew = measure.getComputedTextLength();
    svg.removeChild(measure);
    const m = { t: 12, r: ew + 14, b: 30, l: lw + 12 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const t0 = pts[0].d.getTime(), t1 = last.d.getTime();
    const x = (d) => m.l + ((d.getTime() - t0) / (t1 - t0)) * iw;
    const yMax = ticks[ticks.length - 1], yMin = ticks[0];
    const y = (v) => m.t + ih - ((v - yMin) / (yMax - yMin)) * ih;
    ticks.forEach((t) => {
      svg.appendChild(svgEl('line', { x1: m.l, x2: m.l + iw, y1: y(t), y2: y(t), class: 'grid-line' }));
      const tx = svgEl('text', { x: m.l - 8, y: y(t) + 4, 'text-anchor': 'end' }); tx.textContent = opts.yFmt(t); svg.appendChild(tx);
    });
    const firstYear = pts[0].d.getUTCFullYear() + 1, lastYear = last.d.getUTCFullYear();
    const yrs = []; for (let yr = firstYear; yr <= lastYear; yr++) yrs.push(yr);
    const every = Math.max(1, Math.ceil(yrs.length / Math.max(2, Math.floor(iw / 60))));
    yrs.filter((_, i) => i % every === 0).forEach((yr) => {
      const d = new Date(Date.UTC(yr, 0, 1));
      if (d.getTime() < t0 || d.getTime() > t1) return;
      const tx = svgEl('text', { x: x(d), y: H - 8, 'text-anchor': 'middle' }); tx.textContent = String(yr); svg.appendChild(tx);
    });
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.d).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
    svg.appendChild(svgEl('path', { d: `${path}L${x(last.d).toFixed(1)},${y(yMin)}L${x(pts[0].d).toFixed(1)},${y(yMin)}Z`, class: 'area' }));
    svg.appendChild(svgEl('path', { d: path, class: 'line' }));
    svg.appendChild(svgEl('circle', { cx: x(last.d), cy: y(last.v), r: 4.5, class: 'dot' }));
    const lab = svgEl('text', { x: x(last.d) + 8, y: y(last.v) + 4, class: 'val' }); lab.textContent = opts.endLabel(last.v); svg.appendChild(lab);
  }

  function renderHoursChart() {
    const box = $('chart-hours');
    const items = YEARS.map((fy) => ({ label: fyShort(fy), value: annual('saidi', fy) / 60, valueLabel: `${num(annual('saidi', fy) / 60, 1)} hrs`, latest: fy === LATEST }));
    const b = D.baselines.saidi;
    barChart(box, items, {
      height: 300,
      refs: [
        { value: b.baseline / 60, cls: 'ref-base', legendCls: 'lg-base', label: `Before LUMA (2019–20): ${num(b.baseline / 60, 1)} hrs` },
        { value: b.benchmark / 60, cls: 'ref-goal', legendCls: 'lg-goal', label: `Energy Bureau goal: ${num(b.benchmark / 60, 1)} hrs` }
      ]
    });
    const cur = annual('saidi', LATEST);
    const worst = YEARS.every((fy) => annual('saidi', fy) <= cur);
    const vsBase = compare('saidi', cur, b.baseline, 'down');
    const text = `In ${fyShort(LATEST)} the average customer spent ${hours(cur)} without power${worst ? ', the most of any year since LUMA took over' : ''}. That is ${vsBase.amount.replace('−', '').replace('+', '')} ${cur > b.baseline ? 'more' : 'less'} than before LUMA, and far from the Energy Bureau’s goal.`;
    $('chart-hours-caption').textContent = text;
    box.setAttribute('aria-label', `Bar chart of hours without power per customer by fiscal year. ${items.map((i) => `${i.label}: ${i.valueLabel}`).join('; ')}.`);
  }

  /* ---------- Regions ---------- */
  const islandMinutes = annual('saidi', LATEST);
  const regions = D.regions.filter((r) => r.minutes[LATEST] != null).map((r) => ({ name: r.name, cur: r.minutes[LATEST], prev: r.minutes[prevYear(LATEST)] }));
  let selectedRegion = (regions.find((r) => r.name === 'San Juan') || regions[0] || {}).name;

  function renderRegionSelect() {
    const sel = $('region-select'); sel.replaceChildren();
    [...regions].sort((a, b) => a.name.localeCompare(b.name, 'es')).forEach((r) => {
      const o = el('option', null, r.name); o.value = r.name; sel.appendChild(o);
    });
    sel.value = selectedRegion;
    sel.addEventListener('change', () => { selectedRegion = sel.value; renderRegion(); });
  }

  function renderRegion() {
    const r = regions.find((x) => x.name === selectedRegion);
    if (!r) return;
    const ratio = r.cur / islandMinutes;
    let rel;
    if (ratio >= 1.5) rel = `${num(ratio, 1)} times the island average of ${hours(islandMinutes)}`;
    else if (ratio > 1.05) rel = `${num((ratio - 1) * 100)}% more than the island average of ${hours(islandMinutes)}`;
    else if (ratio < 0.95) rel = `${num((1 - ratio) * 100)}% less than the island average of ${hours(islandMinutes)}`;
    else rel = `about the same as the island average of ${hours(islandMinutes)}`;
    let trend = '';
    if (r.prev != null) {
      const c = compare('saidi', r.cur, r.prev, 'down');
      trend = c.word === 'About the same' ? ' That was about the same as the year before.'
        : ` That was ${c.amount.replace(/^[+−]/, '')} ${r.cur > r.prev ? 'more' : 'less'} than the year before.`;
    }
    $('region-answer').textContent = `In the ${r.name} region, the average customer spent ${hours(r.cur)} without power in ${fyShort(LATEST)}, ${rel}.${trend}`;

    const box = $('region-bars'); box.replaceChildren();
    const sorted = [...regions].sort((a, b) => b.cur - a.cur);
    const max = Math.max(...sorted.map((x) => x.cur), islandMinutes) * 1.18;
    sorted.forEach((x) => {
      const row = el('div', `rb-row${x.name === selectedRegion ? ' is-selected' : ''}`);
      row.appendChild(el('span', 'rb-name', x.name));
      const track = el('span', 'rb-track');
      const bar = el('span', 'rb-bar'); bar.style.width = `${(x.cur / max) * 100}%`; track.appendChild(bar);
      const avg = el('span', 'rb-avg'); avg.style.left = `${(islandMinutes / max) * 100}%`; avg.title = 'Island average'; track.appendChild(avg);
      const val = el('span', 'rb-val', `${num(x.cur / 60, 1)} hrs`); val.style.left = `${(x.cur / max) * 100}%`; track.appendChild(val);
      row.appendChild(track);
      box.appendChild(row);
    });
    $('region-caption').textContent = `Hours without power per customer in ${fyShort(LATEST)}, highest first. The dashed line is the island average (${hours(islandMinutes)}). Regions follow LUMA’s current service districts, which changed in 2023, so only recent years are compared.`;
  }

  /* ---------- Customer service ---------- */
  function mini(value, label, detail) {
    const m = el('article', 'mini');
    m.appendChild(el('p', 'mini-value', value));
    m.appendChild(el('p', 'mini-label', label));
    if (detail) m.appendChild(el('p', 'mini-detail', detail));
    return m;
  }
  function vsPrev(key, better) {
    const c = compare(key, annual(key, LATEST), annual(key, prevYear(LATEST)), better);
    return c ? `${c.word} than ${fyShort(prevYear(LATEST))} (${c.amount}).` : '';
  }

  function renderService() {
    const pts = D.monthly.calls.map(([ym, v]) => ({ d: new Date(`${ym}-01T00:00:00Z`), v }));
    lineChart($('chart-calls'), pts, { yTicks: [0, 0.25, 0.5, 0.75, 1], yFmt: (v) => pct(v, 0), endLabel: (v) => pct(v, 0) });
    const last = D.monthly.calls[D.monthly.calls.length - 1];
    const yearAgoKey = `${Number(last[0].slice(0, 4)) - 1}${last[0].slice(4)}`;
    const yearAgo = D.monthly.calls.find(([ym]) => ym === yearAgoKey);
    $('chart-calls-caption').textContent = `In ${monthName(last[0])}, ${pct(last[1], 0)} of calls were answered${yearAgo ? `, compared with ${pct(yearAgo[1], 0)} a year earlier` : ''}. The Energy Bureau’s goal is 100%.`;
    $('chart-calls').setAttribute('aria-label', `Line chart of the monthly share of customer calls answered, from ${monthName(D.monthly.calls[0][0])} to ${monthName(last[0])}.`);

    const box = $('service-facts'); box.replaceChildren();
    const ab = annual('abandon', LATEST);
    box.appendChild(mini(pct(ab, 0), 'of callers hung up before reaching an agent', vsPrev('abandon', 'down')));
    box.appendChild(mini(`${num(annual('asa', LATEST), 1)} min`, 'average wait to reach an agent', `${vsPrev('asa', 'down')} Before LUMA: ${num(D.baselines.asa.baseline, 1)} min.`));
    box.appendChild(mini(`${num(annual('dispute', LATEST))} days`, 'to resolve a billing dispute, on average', `${vsPrev('dispute', 'down')} The Energy Bureau’s limit is ${num(D.baselines.dispute.benchmark)} days.`));
    box.appendChild(mini(pct(annual('estimated', LATEST)), 'of bills were estimated instead of read from the meter', `${vsPrev('estimated', 'down')} Before LUMA: ${pct(D.baselines.estimated.baseline)}.`));
  }

  /* ---------- Safety and staffing ---------- */
  function renderSafety() {
    const box = $('safety-facts'); box.replaceChildren();
    const deaths = annual('fatal', LATEST);
    const history = YEARS.filter((fy) => fy !== LATEST).map((fy) => `${num(annual('fatal', fy))}\u00a0in\u00a0${fyShort(fy)}`).join(', ');
    box.appendChild(mini(num(deaths), `worker deaths reported in ${fyShort(LATEST)}`, `Earlier years: ${history}.`));
    box.appendChild(mini(num(annual('osha', LATEST), 2), 'recordable injuries per 100 full-time workers', `${vsPrev('osha', 'down')} Before LUMA: ${num(D.baselines.osha.baseline, 1)}. Energy Bureau goal: ${num(D.baselines.osha.benchmark, 1)}.`));
    const hc = annual('headcount', LATEST), hb = annual('headcount_budget', LATEST);
    box.appendChild(mini(num(hc), 'employees at the end of June', hb ? `The budget called for ${num(hb)}, so ${num(hb - hc)} positions were unfilled.` : ''));
    box.appendChild(mini(num(annual('backlog', LATEST)), 'repair and service orders still open', vsPrev('backlog', 'down')));
  }

  /* ---------- Solar ---------- */
  function renderSolar() {
    const pts = D.monthly.solar.map(([ym, v]) => ({ d: new Date(`${ym}-01T00:00:00Z`), v }));
    const max = Math.max(...pts.map((p) => p.v));
    const top = Math.ceil(max / 500) * 500;
    const ticks = []; for (let t = 0; t <= top; t += top / 4) ticks.push(t);
    lineChart($('chart-solar'), pts, { yTicks: ticks, yFmt: (v) => num(v), endLabel: (v) => `${num(v)} MW` });
    const first = D.monthly.solar[0], last = D.monthly.solar[D.monthly.solar.length - 1];
    $('chart-solar-caption').textContent = `Rooftop solar grew from ${num(first[1])} MW in ${monthName(first[0])} to ${num(last[1])} MW in ${monthName(last[0])}.`;
    $('chart-solar').setAttribute('aria-label', `Line chart of rooftop solar capacity connected to the grid, rising from ${num(first[1])} to ${num(last[1])} megawatts.`);

    const box = $('solar-facts'); box.replaceChildren();
    const grow = (key) => { const c = annual(key, LATEST), p = annual(key, prevYear(LATEST)); return `Up ${num((c / p - 1) * 100)}% in one year.`; };
    box.appendChild(mini(num(annual('solar_sites', LATEST)), 'rooftop solar systems connected', grow('solar_sites')));
    box.appendChild(mini(num(annual('bess', LATEST)), 'home battery systems installed', grow('bess')));
    box.appendChild(mini(`${num(annual('solar', LATEST))} MW`, 'of rooftop solar capacity', grow('solar')));
  }

  /* ---------- Method table ---------- */
  function renderScale() {
    const p = $('grade-scale'); p.replaceChildren();
    C.grades.forEach((g, i) => {
      const hi = i === 0 ? 100 : C.grades[i - 1].min - 1;
      const chip = el('span', `scale-chip g-${g.letter}`);
      chip.appendChild(el('b', null, g.letter));
      chip.appendChild(el('span', null, `${g.min}–${hi}`));
      p.appendChild(chip);
    });
  }

  function renderWeights(fy) {
    const s = SCORES[fy];
    $('weights-year').textContent = `${fyShort(fy)}`;
    const body = $('weights-body'); body.replaceChildren();
    C.areas.forEach((a) => {
      const rs = s.rows.filter((r) => r.m.area === a.key);
      if (!rs.length) return;
      const ar = el('tr', 'area-row'); const td = el('td', null, a.name); td.colSpan = 6; ar.appendChild(td); body.appendChild(ar);
      rs.forEach((r) => {
        const tr = el('tr');
        tr.appendChild(el('td', null, r.m.name));
        tr.appendChild(el('td', 'num', `${num((r.m.weight / s.totalW) * 100)}%`));
        const st = el('td', 'num', valueText(r.m.key, r.start)); st.appendChild(el('span', 'src', r.startSrc)); tr.appendChild(st);
        const gl = el('td', 'num', valueText(r.m.key, r.goal)); gl.appendChild(el('span', 'src', r.goalSrc)); tr.appendChild(gl);
        tr.appendChild(el('td', 'num', valueText(r.m.key, r.v)));
        const L = letter(r.pts);
        const pt = el('td', `num pts g-${L}`, num(r.pts)); pt.style.color = 'var(--grade-color)'; tr.appendChild(pt);
        body.appendChild(tr);
      });
    });
  }

  /* ---------- Boot ---------- */
  function drawCharts() { renderHoursChart(); renderService(); renderSolar(); }

  renderHistory();
  renderReport(LATEST, false);
  renderHeroSummary();
  renderFacts();
  renderRegionSelect();
  renderRegion();
  renderSafety();
  renderScale();
  drawCharts();
  $('footer-data').textContent = `Data from LUMA’s report filed in August 2026, covering ${monthName(D.meta.firstMonth)} to ${monthName(D.meta.dataThrough)}.`;

  let lastW = window.innerWidth, timer;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth; clearTimeout(timer); timer = setTimeout(drawCharts, 150);
  });
})();
