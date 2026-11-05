(function () {
  const C = window.DASH_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- greeting ---------- */
  function greetWord() {
    const h = new Date().getHours();
    if (h < 5) return 'Burning the midnight oil';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }
  function typeInto(el, text, delay = 0) {
    el.textContent = '';
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch'; s.textContent = ch === ' ' ? ' ' : ch;
      s.style.animationDelay = (delay + i * 0.06) + 's';
      el.appendChild(s);
    });
  }
  const gw = greetWord();
  typeInto($('#greetWord'), gw, 0.1);
  typeInto($('#nameWord'), C.name, 0.1 + gw.length * 0.06 + 0.15);

  /* ---------- clock + day ring ---------- */
  function tick() {
    const d = new Date();
    $('#clockTime').textContent = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    $('#dateLine').textContent = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const pct = (d.getHours() * 60 + d.getMinutes()) / 1440;
    $('#ringPct').textContent = Math.round(pct * 100) + '%';
    $('#ringFg').style.strokeDashoffset = 326.7 * (1 - pct);
  }
  tick(); setInterval(tick, 15000);

  /* ---------- quotes ---------- */
  const qEl = $('#quote'); let qi = Math.floor(Math.random() * C.quotes.length);
  qEl.textContent = C.quotes[qi];
  setInterval(() => {
    qEl.classList.add('fade');
    setTimeout(() => { qi = (qi + 1) % C.quotes.length; qEl.textContent = C.quotes[qi]; qEl.classList.remove('fade'); }, 1200);
  }, (C.quoteSeconds || 20) * 1000);

  /* ---------- tabs & pages ---------- */
  const tabsEl = $('#tabs'), pagesEl = $('#pages');
  let editing = false;

  function linksFor(id, base) {
    const extra = store.get('dash.links.' + id, []);
    return [...base.map(l => ({ ...l, src: 'cfg' })), ...extra.map((l, i) => ({ ...l, src: 'local', i }))];
  }
  function tileHTML(l, id) {
    const rm = l.src === 'local' ? `<button class="rm" data-rm="${l.i}" data-tab="${id}" title="Remove">×</button>` : '';
    return `<a class="tile" href="${esc(l.url)}" target="_blank" rel="noopener"><span class="ic">${esc(l.icon || '↗')}</span>${esc(l.label)}${rm}</a>`;
  }
  const addTile = id => `<button class="tile add" data-add="${id}"><span class="ic">＋</span>Add button</button>`;

  function renderLinks(id, base, host) {
    host.innerHTML = linksFor(id, base).map(l => tileHTML(l, id)).join('') + addTile(id);
  }

  C.tabs.forEach((t, idx) => {
    const b = document.createElement('button');
    b.className = 'tab' + (idx === 0 ? ' active' : ''); b.dataset.tab = t.id; b.textContent = t.label;
    tabsEl.appendChild(b);
    if (t.id === 'welcome') return;
    const sec = document.createElement('section');
    sec.className = 'page'; sec.id = 'page-' + t.id;
    sec.innerHTML = `<div class="page-head"><h1>${esc(t.label)}</h1><p>${esc(t.blurb || '')}</p></div>
      <div class="big-grid" data-host="${t.id}"></div>
      <p class="hint">Nothing here yet — hit <b>Edit</b> up top to add buttons, or tell Claude what you want on this page.</p>`;
    pagesEl.appendChild(sec);
    if (t.id === 'school' && window.renderSchool) {
      sec.innerHTML = '<div class="school-host"></div><div class="big-grid" data-host="school"></div>';
      window.renderSchool(sec.querySelector('.school-host'));
    }
    renderLinks(t.id, t.links || [], $('.big-grid', sec));  });

  function show(id) {
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + id));
    try { history.replaceState(null, '', '#' + id); } catch {}
    window.scrollTo(0, 0);
  }
  tabsEl.addEventListener('click', e => { const b = e.target.closest('.tab'); if (b) show(b.dataset.tab); });
  const h = location.hash.slice(1); if (h && C.tabs.some(t => t.id === h)) show(h);

  /* quick launch */
  const launchHost = $('#launchGrid');
  renderLinks('quick', C.quickLaunch, launchHost);

  /* edit mode: add / remove buttons (saved in this browser) */
  $('#editToggle').addEventListener('click', e => {
    editing = !editing;
    document.body.classList.toggle('editing', editing);
    e.currentTarget.classList.toggle('on', editing);
    e.currentTarget.textContent = editing ? 'Done' : 'Edit';
  });
  function rerender(id) {
    if (id === 'quick') return renderLinks('quick', C.quickLaunch, launchHost);
    const t = C.tabs.find(x => x.id === id);
    renderLinks(id, t.links || [], $(`[data-host="${id}"]`));
  }
  document.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) {
      const label = prompt('Button name?'); if (!label) return;
      let url = prompt('Where should it go? (web address)'); if (!url) return;
      if (!/^[a-z]+:\/\//i.test(url)) url = 'https://' + url;
      const id = add.dataset.add, list = store.get('dash.links.' + id, []);
      list.push({ label, url, icon: '↗' }); store.set('dash.links.' + id, list); rerender(id);
      return;
    }
    const rm = e.target.closest('[data-rm]');
    if (rm) {
      e.preventDefault(); e.stopPropagation();
      const id = rm.dataset.tab, list = store.get('dash.links.' + id, []);
      list.splice(+rm.dataset.rm, 1); store.set('dash.links.' + id, list); rerender(id);
    }
  });
  // in edit mode, tiles shouldn't navigate away
  document.addEventListener('click', e => { if (editing && e.target.closest('a.tile')) e.preventDefault(); }, true);

  /* ---------- focus list ---------- */
  let tasks = store.get('dash.tasks', [{ t: 'Set up my dashboard', d: true }, { t: 'Decide what to add next', d: false }]);
  const listEl = $('#focusList');
  function renderTasks() {
    listEl.innerHTML = tasks.map((k, i) =>
      `<li data-smoke class="${k.d ? 'done' : ''}" data-i="${i}"><span class="box"></span><span class="t">${esc(k.t)}</span><button class="x" data-del="${i}" title="Delete">×</button></li>`).join('')
      || '<li style="cursor:default;color:var(--muted)">Nothing yet — add your first task.</li>';
    const open = tasks.filter(k => !k.d).length;
    $('#statusLine').textContent = open ? `${open} thing${open > 1 ? 's' : ''} on your plate today.` : 'All clear. Nothing pending.';
  }
  listEl.addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    if (del) { tasks.splice(+del.dataset.del, 1); }
    else { const li = e.target.closest('li[data-i]'); if (!li) return; tasks[+li.dataset.i].d = !tasks[+li.dataset.i].d; }
    store.set('dash.tasks', tasks); renderTasks();
  });
  $('#focusForm').addEventListener('submit', e => {
    e.preventDefault(); const v = $('#focusInput').value.trim(); if (!v) return;
    tasks.push({ t: v, d: false }); $('#focusInput').value = ''; store.set('dash.tasks', tasks); renderTasks();
  });
  renderTasks();

  /* ---------- up next (from school data) ---------- */
  function renderUpNext() {
    const host = $('#upNext'), D = window.getSchoolData && window.getSchoolData();
    if (!host) return;
    if (!D || !D.assignments.length) { host.innerHTML = '<div class="empty"><span>◷</span>No school data yet.<br><small>Link your online data on the School tab.</small></div>'; return; }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const p = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
    const items = D.assignments.map(a => ({ ...a, n: Math.round((p(a.due) - today) / 864e5) }))
      .filter(a => a.n >= -3).sort((a, b) => a.due.localeCompare(b.due));
    if (!items.length) { host.innerHTML = '<div class="empty"><span>✓</span>Nothing due soon.</div>'; return; }
    const rel = n => n < 0 ? -n + 'd late' : n === 0 ? 'today' : n === 1 ? 'tomorrow' : p2(n);
    const p2 = n => new Date(Date.now() + n * 864e5).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    host.innerHTML = items.slice(0, 5).map(a => { const c = D.courses[a.c]; return `<a class="up-row" href="${esc(a.url)}" target="_blank" rel="noopener" style="--cc:${c.color}"><span class="due-dot"></span><span class="due-main"><span class="due-t">${esc(a.t)}</span><span class="due-c">${esc(c.code || c.name)}</span></span><span class="due-when"><b>${rel(a.n)}</b></span></a>`; }).join('')
      + (items.length > 5 ? `<div class="up-more">+ ${items.length - 5} more on the School tab</div>` : '');
  }
  window.addEventListener('school-updated', renderUpNext);
  renderUpNext();

  /* ---------- assistant (placeholder until messaging is connected) ---------- */
  $('#chatForm').addEventListener('submit', e => {
    e.preventDefault(); const v = $('#chatInput').value.trim(); if (!v) return;
    const log = $('#chatLog');
    log.insertAdjacentHTML('beforeend', `<div class="msg me">${esc(v)}</div>`);
    $('#chatInput').value = '';
    setTimeout(() => {
      log.insertAdjacentHTML('beforeend', `<div class="msg bot">Got it — but I'm not connected to a brain or to texting yet. That's the next thing to wire up.</div>`);
      log.scrollTop = log.scrollHeight;
    }, 600);
    log.scrollTop = log.scrollHeight;
  });

  /* ---------- weather (Open-Meteo, no key needed) ---------- */
  const wx = $('#wxBody');
  const icons = {
    sun: '<svg class="wx-ico" viewBox="0 0 64 64" fill="none" stroke="#c9a4ff" stroke-width="3" stroke-linecap="round"><circle cx="32" cy="32" r="11"/><path d="M32 8v7M32 49v7M8 32h7M49 32h7M15 15l5 5M44 44l5 5M49 15l-5 5M20 44l-5 5"/></svg>',
    cloud: '<svg class="wx-ico" viewBox="0 0 64 64" fill="none" stroke="#c9a4ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 46a10 10 0 0 1-1-20 14 14 0 0 1 27-3 11 11 0 0 1 2 23z"/></svg>',
    partly: '<svg class="wx-ico" viewBox="0 0 64 64" fill="none" stroke="#c9a4ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="22" r="8"/><path d="M24 6v4M9 22h4M13 11l3 3M35 11l-3 3"/><path d="M22 52a9 9 0 0 1-1-18 12 12 0 0 1 23-2 10 10 0 0 1 1 20z"/></svg>',
    rain: '<svg class="wx-ico" viewBox="0 0 64 64" fill="none" stroke="#c9a4ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 40a10 10 0 0 1-1-20 14 14 0 0 1 27-3 11 11 0 0 1 2 23z"/><path d="M22 48l-3 8M33 48l-3 8M44 48l-3 8"/></svg>',
    snow: '<svg class="wx-ico" viewBox="0 0 64 64" fill="none" stroke="#c9a4ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 40a10 10 0 0 1-1-20 14 14 0 0 1 27-3 11 11 0 0 1 2 23z"/><path d="M22 49v.1M33 53v.1M44 49v.1M27 57v.1M39 57v.1"/></svg>',
    storm: '<svg class="wx-ico" viewBox="0 0 64 64" fill="none" stroke="#c9a4ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 38a10 10 0 0 1-1-18 14 14 0 0 1 27-3 11 11 0 0 1 2 21"/><path d="M34 34l-7 11h8l-6 12"/></svg>',
    fog: '<svg class="wx-ico" viewBox="0 0 64 64" fill="none" stroke="#c9a4ff" stroke-width="3" stroke-linecap="round"><path d="M12 24h40M8 34h44M14 44h38M20 54h28"/></svg>'
  };
  function describe(code) {
    if (code === 0) return ['Clear sky', 'sun'];
    if (code <= 2) return ['Partly cloudy', 'partly'];
    if (code === 3) return ['Overcast', 'cloud'];
    if (code <= 48) return ['Fog', 'fog'];
    if (code <= 57) return ['Drizzle', 'rain'];
    if (code <= 67) return ['Rain', 'rain'];
    if (code <= 77) return ['Snow', 'snow'];
    if (code <= 82) return ['Showers', 'rain'];
    if (code <= 86) return ['Snow showers', 'snow'];
    return ['Thunderstorm', 'storm'];
  }
  async function loadWeather(lat, lon, place) {
    const f = C.units === 'celsius' ? 'celsius' : 'fahrenheit', deg = f === 'celsius' ? 'C' : 'F', sp = f === 'celsius' ? 'km/h' : 'mph';
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m` +
      `&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max` +
      `&temperature_unit=${f}&wind_speed_unit=${f === 'celsius' ? 'kmh' : 'mph'}&timezone=auto&forecast_days=1`;
    const j = await (await fetch(url)).json();
    const c = j.current, d = j.daily, [desc, ic] = describe(c.weather_code);
    const t = s => new Date(s).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    wx.className = '';
    wx.innerHTML = `<div class="wx-main">${icons[ic]}<div>
        <div class="wx-temp">${Math.round(c.temperature_2m)}<sup>°${deg}</sup></div>
        <div class="wx-desc">${desc} · feels ${Math.round(c.apparent_temperature)}°</div>
        <div class="wx-loc">${esc(place || 'Your location')}</div></div></div>
      <div class="wx-meta">
        <div><small>High / Low</small><b>${Math.round(d.temperature_2m_max[0])}° / ${Math.round(d.temperature_2m_min[0])}°</b></div>
        <div><small>Rain</small><b>${d.precipitation_probability_max[0] ?? 0}%</b></div>
        <div><small>Wind</small><b>${Math.round(c.wind_speed_10m)} ${sp}</b></div>
        <div><small>Sunset</small><b>${t(d.sunset[0])}</b></div>
      </div>`;
  }
  async function ipLocate() {
    const r = await (await fetch('https://ipapi.co/json/')).json();
    if (!r.latitude) throw 0;
    return { lat: r.latitude, lon: r.longitude, place: [r.city, r.region_code].filter(Boolean).join(', ') };
  }
  async function placeName(lat, lon) {
    try {
      const r = await (await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)).json();
      return [r.city || r.locality, r.principalSubdivisionCode?.split('-').pop()].filter(Boolean).join(', ');
    } catch { return ''; }
  }
  async function initWeather() {
    try {
      if (C.location) return await loadWeather(C.location.lat, C.location.lon, C.location.name);
      const pos = await new Promise((res, rej) => {
        if (!navigator.geolocation) return rej();
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000, maximumAge: 3600000 });
      }).catch(() => null);
      if (pos) {
        const { latitude: lat, longitude: lon } = pos.coords;
        return await loadWeather(lat, lon, await placeName(lat, lon));
      }
      const L = await ipLocate();
      await loadWeather(L.lat, L.lon, L.place);
    } catch {
      wx.innerHTML = `Couldn't load weather. Check your connection, or set a <b>location</b> in config.js.`;
    }
  }
  initWeather();
})();
