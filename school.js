/* School tab: Due Soon list + course grades.
   Data comes from the HuskyCT Sync extension when installed (live),
   otherwise from the saved snapshot in school-data.js. */
window.renderSchool = function (host) {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const H = 'https://lms.uconn.edu/ultra/';
  const palette = ['#4ade80', '#2dd4bf', '#f472b6', '#c084fc', '#fbbf24', '#60a5fa', '#fb923c', '#f87171'];
  const CMD = 'Refresh my school data from HuskyCT: read every course gradebook, update school-data.js with upcoming assignments (with direct links) and current grades.';
  let live = null, liveError = '', syncing = false, notice = '';
  const OWNER = 'eddietoomuchmoney', REPO = 'dashboard-data';
  const getTok = () => { try { return localStorage.getItem('dash.ghToken') || ''; } catch (e) { return ''; } };
  async function loadRemote() {
    const tok = getTok(); if (!tok) return false;
    try {
      const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/data.json`,
        { headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github.raw+json' }, cache: 'no-store' });
      if (!r.ok) throw new Error('GitHub answered ' + r.status);
      const j = await r.json();
      if (j && j.courses && (!live || (j.syncedAt || 0) > (live.syncedAt || 0))) live = j;
      liveError = ''; draw(); return true;
    } catch (e) { liveError = 'Could not load online data (' + e.message + ')'; draw(); return false; }
  }

  function parseTitle(t) {
    const m = t.match(/^([A-Z]{2,5})-(\d{4}\w?)-(.+)-SEC(\w+)-\d+$/);
    return m ? { code: m[1] + ' ' + m[2], name: m[3], sec: m[4] } : { code: '', name: t.replace(/\s*\(.*\)$/, ''), sec: '' };
  }
  function fromExtension(h) {
    const count = {}; h.courses.forEach(c => { const p = parseTitle(c.title); count[p.code] = (count[p.code] || 0) + 1; });
    const courses = {};
    h.courses.forEach((c, i) => {
      const p = parseTitle(c.title);
      courses[c.id] = { name: p.name, code: p.code ? p.code + (count[p.code] > 1 && p.sec ? ' · ' + p.sec : '') : '',
        grade: c.grade || '—', color: palette[i % palette.length], url: H + 'courses/' + c.id + '/grades' };
    });
    const assignments = h.assignments.filter(a => courses[a.courseId])
      .map(a => ({ c: a.courseId, t: a.title, due: a.due, url: a.url || courses[a.courseId].url }));
    return { synced: new Date(h.syncedAt).toISOString().slice(0, 10), syncedAt: h.syncedAt, courses, assignments };
  }
  const data = () => (live ? fromExtension(live) : window.SCHOOL_DATA);
  window.getSchoolData = data;

  function draw() {
    const D = data() || { synced: '', courses: {}, assignments: [] };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
    const days = a => Math.round((parse(a.due) - today) / 864e5);
    const list = D.assignments.slice().sort((a, b) => a.due.localeCompare(b.due));
    const bucket = a => { const n = days(a); return n < 0 ? 'Overdue' : n === 0 ? 'Due today' : n <= 7 ? 'This week' : n <= 14 ? 'Next week' : 'Later'; };
    const order = ['Overdue', 'Due today', 'This week', 'Next week', 'Later'];
    const groups = {}; list.forEach(a => (groups[bucket(a)] = groups[bucket(a)] || []).push(a));
    const when = a => {
      const n = days(a), lbl = parse(a.due).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      return `<b>${lbl}</b><small>${n < 0 ? -n + 'd late' : n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + 'd'}</small>`;
    };
    const rows = order.filter(k => groups[k]).map(k => `
      <div class="due-group ${k === 'Overdue' ? 'late' : ''}"><h3>${k}</h3>
      ${groups[k].map(a => { const c = D.courses[a.c]; return `
        <a class="due-row" href="${esc(a.url)}" target="_blank" rel="noopener" style="--cc:${c.color}">
          <span class="due-dot"></span>
          <span class="due-main"><span class="due-t">${esc(a.t)}</span><span class="due-c">${esc([c.code, c.name].filter(Boolean).join(' · '))}</span></span>
          <span class="due-when">${when(a)}</span>
        </a>`; }).join('')}</div>`).join('') || '<p class="hint">Nothing due. Enjoy it.</p>';
    const cards = Object.values(D.courses).map(c => `
      <a class="course-card" href="${esc(c.url)}" target="_blank" rel="noopener" style="--cc:${c.color}">
        <span class="cc-grade">${esc(c.grade)}</span><span class="cc-code">${esc(c.code)}</span><span class="cc-name">${esc(c.name)}</span>
      </a>`).join('');
    const next = list.filter(a => days(a) >= 0).length;
    const age = live ? 'synced ' + new Date(live.syncedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                     : (D.synced ? 'saved snapshot from ' + parse(D.synced).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'no school data yet — tap “Link online data” below');
    const label = syncing ? 'Syncing… a HuskyCT tab opens briefly' : 'Refresh from HuskyCT';
    host.innerHTML = `
      <div class="page-head"><h1>School</h1><p>${next} assignments coming up · ${age}</p>
        ${liveError ? `<p class="hint" style="color:#ff7aa8">Last sync problem: ${esc(liveError)}</p>` : ''}</div>
      <div class="school-grid">
        <article class="card due-card"><h2>Due Soon</h2>${rows}</article>
        <article class="card"><h2>Courses &amp; Grades</h2><div class="course-grid">${cards || '<p class="hint">No courses yet.</p>'}</div>
          <a class="tile wide" href="https://lms.uconn.edu/ultra/stream" target="_blank" rel="noopener"><span class="ic">↗</span>Open HuskyCT</a>
          <button class="tile wide" id="refreshSchool"><span class="ic">⟳</span><span>${esc(notice || label)}</span></button>
          <button class="tile wide" id="linkGh"><span class="ic">☁</span><span>${getTok() ? 'Online data linked — change' : 'Link online data (for phone)'}</span></button>
          <p class="hint">${live ? 'Updates only when you press Refresh.' : 'Install the HuskyCT Sync extension to make this automatic.'}</p>
        </article>
      </div>`;
    host.querySelector('#refreshSchool').addEventListener('click', onRefresh);
    host.querySelector('#linkGh').addEventListener('click', () => {
      const t = prompt('Paste your GitHub read-only token for the dashboard-data repo (it stays on this device):', '');
      if (t === null) return;
      try { localStorage.setItem('dash.ghToken', t.trim()); } catch (e) {}
      loadRemote();
    });
    window.dispatchEvent(new Event('school-updated'));
  }

  function say(t, ms) { notice = t; draw(); setTimeout(() => { notice = ''; draw(); }, ms); }
  function onRefresh() {
    let acked = false;
    const h = e => { if (e.data && e.data.type === 'HUSKY_ACK') acked = true; };
    window.addEventListener('message', h);
    window.postMessage({ type: 'HUSKY_SYNC_NOW' }, '*');
    setTimeout(async () => {
      window.removeEventListener('message', h);
      if (acked) { syncing = true; draw(); setTimeout(() => { if (syncing) { syncing = false; draw(); } }, 120000); return; }
      if (getTok()) { const ok2 = await loadRemote(); say(ok2 ? 'Reloaded your latest saved data (HuskyCT refreshes run from your Mac)' : 'Could not reach online data', 5000); return; }
      let ok = false;
      try { await navigator.clipboard.writeText(CMD); ok = true; } catch (e) {}
      say(ok ? 'Extension not found — command copied, paste it to Claude' : 'Extension not found — tell Claude to refresh', 5000);
    }, 700);
  }

  window.addEventListener('message', e => {
    const m = e.data; if (!m || m.source !== 'husky-bridge' || m.type !== 'HUSKYCT_DATA') return;
    liveError = m.error || '';
    if (m.data) live = m.data;
    syncing = false; draw();
  });
  window.postMessage({ type: 'HUSKY_REQUEST' }, '*');
  draw();
  loadRemote();
};
