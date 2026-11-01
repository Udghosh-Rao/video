/* Lecture Library — vanilla JS, official YouTube IFrame Player API.
 * Edit the LECTURES list below to change titles. Do not change the video IDs. */
(() => {
  'use strict';

  // ---------- Content (edit titles here) ----------
  const VIDEO_IDS = [
    'XhdqMAk9cL4', 'YKQppyW-pG8', 'KLVqzlqxLm0', 'D9s_jmEt5_A', 'K_his24kTWY',
    'oOcAh5EON5w', 'tKxJz07cCJI', 'OJute6x47cg', '8tIep96rBP0', '1YhzlR240lU'
  ];
  // Placeholder titles: replace each string with the real lecture title.
  const TITLES = [
    'Lecture 1', 'Lecture 2', 'Lecture 3', 'Lecture 4', 'Lecture 5',
    'Lecture 6', 'Lecture 7', 'Lecture 8', 'Lecture 9', 'Lecture 10'
  ];
  const LECTURES = VIDEO_IDS.map((id, i) => ({ n: i + 1, id, title: TITLES[i] || 'Lecture ' + (i + 1) }));

  // ---------- Helpers ----------
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const thumb = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (sec) => {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  };
  const CHECK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>';

  // ---------- Local progress (optional, stays in this browser) ----------
  const KEY = 'lectureLibrary.v1';
  let store = { last: null, pos: {}, done: {} };
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s === 'object') store = { last: s.last || null, pos: s.pos || {}, done: s.done || {} };
  } catch (e) { /* storage unavailable: progress simply won't persist */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} };
  const posOf = (l) => store.pos[l.id] || 0;
  const isDone = (l) => !!store.done[l.id];
  const statusOf = (l) => (isDone(l) ? 'Completed' : posOf(l) >= 5 ? 'In progress · ' + fmt(posOf(l)) : '');

  // ---------- State ----------
  let query = '';
  let current = 0;      // lecture number being watched (1-based), 0 = library view
  let player = null, playerReady = false, readyTimer = null, tick = null, cuedId = null;

  // ---------- Search ----------
  function matches(l) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    if (/^\d+$/.test(q)) return l.n === +q || l.title.toLowerCase().includes(q);
    return ('lecture ' + l.n + ' ' + l.title).toLowerCase().includes(q);
  }
  const announce = (t) => { $('#live').textContent = t; };

  // ---------- Library view ----------
  function renderOverall() {
    const d = LECTURES.filter(isDone).length;
    $('#overall').textContent = d ? `${d} of ${LECTURES.length} lectures completed` : '';
  }
  function renderResume() {
    const box = $('#resume-banner');
    const l = LECTURES.find((x) => x.id === store.last);
    if (!l) { box.hidden = true; return; }
    const p = posOf(l);
    box.innerHTML = `<p><strong>Continue where you left off</strong><span>${esc(l.title)}${p >= 5 ? ' &middot; ' + fmt(p) : ''}</span></p>
      <a class="btn btn-primary" href="#/lecture/${l.n}">Continue lecture</a>`;
    box.hidden = false;
  }
  function renderGrid() {
    const list = LECTURES.filter(matches);
    $('#grid').innerHTML = list.map((l) => {
      const st = statusOf(l);
      return `<li class="card">
        <a class="card-thumb" href="#/lecture/${l.n}" tabindex="-1" aria-hidden="true">
          <img src="${thumb(l.id)}" alt="" width="480" height="360" loading="lazy" decoding="async">
          <span class="num">${l.n}</span>${isDone(l) ? `<span class="done-badge">${CHECK}Done</span>` : ''}
        </a>
        <div class="card-body">
          <h3>${esc(l.title)}</h3>
          <p class="meta">${esc(st)}</p>
          <a class="btn btn-primary" href="#/lecture/${l.n}" aria-label="Watch ${esc(l.title)}">Watch Lecture</a>
        </div></li>`;
    }).join('');
    $('#grid').hidden = !list.length;
    $('#empty').hidden = list.length > 0;
    $('#empty-q').textContent = query;
    announce(query ? `${list.length} lecture${list.length === 1 ? '' : 's'} found` : '');
    renderOverall(); renderResume();
  }

  // ---------- Watch view ----------
  function renderPlaylist() {
    const list = LECTURES.filter(matches);
    $('#playlist').innerHTML = list.map((l) => {
      const st = statusOf(l);
      return `<li><a class="pl-item" href="#/lecture/${l.n}"${l.n === current ? ' aria-current="true"' : ''}>
        <span class="pl-thumb"><img src="${thumb(l.id)}" alt="" width="480" height="360" loading="lazy" decoding="async"><span class="num">${l.n}</span></span>
        <span class="pl-text"><b>${esc(l.title)}</b><small${isDone(l) ? ' class="ok"' : ''}>${esc(st || 'Not started')}</small></span></a></li>`;
    }).join('');
    $('#pl-empty').hidden = list.length > 0;
    $('#pl-count').textContent = `${LECTURES.filter(isDone).length} of ${LECTURES.length} completed`;
  }
  function renderControls() {
    const l = LECTURES[current - 1];
    $('#lecture-title').textContent = l.title;
    document.title = `${l.title} · Lecture Library`;
    $('#prev').disabled = current <= 1;
    $('#next').disabled = current >= LECTURES.length;
    const c = $('#complete');
    c.setAttribute('aria-pressed', String(isDone(l)));
    c.textContent = isDone(l) ? 'Completed (undo)' : 'Mark as completed';
    $('#yt-link').href = watchUrl(l.id);
    $('#err-yt').href = watchUrl(l.id);
    const r = $('#resume'), p = posOf(l);
    r.hidden = p < 5;
    r.textContent = 'Resume from ' + fmt(p);
  }

  // ---------- Player ----------
  let apiPromise = null;
  function loadApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      window.onYouTubeIframeAPIReady = resolve;
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => { apiPromise = null; s.remove(); reject(new Error('load')); };
      document.head.appendChild(s);
      setTimeout(() => { if (!(window.YT && window.YT.Player)) { apiPromise = null; s.remove(); reject(new Error('timeout')); } }, 15000);
    });
    return apiPromise;
  }
  const setLoading = (on) => { $('#player-loading').hidden = !on; };
  function setError(msg, canRetry) {
    $('#player-error').hidden = !msg;
    if (msg) { $('#err-msg').textContent = msg; $('#retry').hidden = !canRetry; setLoading(false); }
  }
  const ERRORS = {
    2: 'YouTube reports that this video link is invalid.',
    5: 'The player ran into a playback problem. Try again, or watch on YouTube.',
    100: 'This video could not be found. It may have been removed or made private.',
    101: 'The owner has turned off embedding for this video. You can still watch it on YouTube.',
    150: 'The owner has turned off embedding for this video. You can still watch it on YouTube.'
  };

  function savePos() {
    if (!player || !playerReady || !cuedId) return;
    try {
      const t = player.getCurrentTime(), d = player.getDuration();
      if (!(t >= 0)) return;
      store.pos[cuedId] = d && t > d - 10 ? 0 : Math.floor(t);
      save();
    } catch (e) {}
  }
  const stopTick = () => { clearInterval(tick); tick = null; };
  const startTick = () => { stopTick(); tick = setInterval(savePos, 5000); };

  function cueCurrent() {
    const l = LECTURES[current - 1];
    if (!l || !playerReady) return;
    cuedId = l.id;
    setError(null); setLoading(true);
    player.cueVideoById({ videoId: l.id, startSeconds: 0 });   // cue only: never autoplays
    try { player.getIframe().title = `YouTube video player: ${l.title}`; } catch (e) {}
  }

  function createPlayer() {
    $('#player-host').innerHTML = '<div id="yt-player"></div>';
    playerReady = false;
    const vars = { autoplay: 0, rel: 0, playsinline: 1 };
    if (/^https?:$/.test(location.protocol)) vars.origin = location.origin;
    player = new YT.Player('yt-player', {
      width: '100%', height: '100%', playerVars: vars,
      events: {
        onReady: () => { clearTimeout(readyTimer); playerReady = true; cueCurrent(); },
        onStateChange: (e) => {
          const S = YT.PlayerState;
          if ([S.CUED, S.PLAYING, S.PAUSED, S.ENDED].includes(e.data)) setLoading(false);
          if (e.data === S.PLAYING) { store.last = cuedId; save(); startTick(); return; }
          stopTick();
          if (e.data === S.PAUSED || e.data === S.ENDED) { savePos(); if (e.data === S.ENDED) { store.pos[cuedId] = 0; save(); } renderControls(); }
        },
        onError: (e) => setError(ERRORS[e.data] || 'This video could not be played here. You can watch it on YouTube instead.', false)
      }
    });
    clearTimeout(readyTimer);
    readyTimer = setTimeout(() => {
      if (!playerReady) setError('The player is taking too long to load. Check your connection and try again.', true);
    }, 15000);
  }

  async function loadCurrent() {
    setError(null); setLoading(true);
    try { await loadApi(); }
    catch (e) { setError('The YouTube player could not load. Check your connection or any content blocker, then try again.', true); return; }
    if (!player) createPlayer();
    else if (playerReady) cueCurrent();
  }

  function stopPlayback() {           // never leave a player running out of sight
    stopTick();
    if (player && playerReady) { savePos(); try { player.pauseVideo(); } catch (e) {} }
  }

  // ---------- Routing ----------
  function setView(name) {
    $('#view-library').hidden = name !== 'library';
    $('#view-watch').hidden = name !== 'watch';
    $('#nav-home').removeAttribute('aria-current');
    $('#nav-all').removeAttribute('aria-current');
  }
  function route() {
    $('#header-panel').classList.remove('open');
    $('#menu-btn').setAttribute('aria-expanded', 'false');
    const m = location.hash.match(/^#\/lecture\/(\d+)$/);
    const n = m ? +m[1] : 0;
    if (n >= 1 && n <= LECTURES.length) {
      const changed = n !== current;
      if (changed) stopPlayback();
      current = n;
      store.last = LECTURES[n - 1].id; save();
      setView('watch'); renderControls(); renderPlaylist();
      window.scrollTo(0, 0);
      if (changed) { $('#lecture-title').focus({ preventScroll: true }); loadCurrent(); }
    } else {
      stopPlayback();
      current = 0;
      document.title = 'Lecture Library';
      setView('library'); renderGrid();
      const all = location.hash === '#/lectures';
      (all ? $('#nav-all') : $('#nav-home')).setAttribute('aria-current', 'page');
      if (all) $('#grid').scrollIntoView(); else window.scrollTo(0, 0);
    }
  }

  // ---------- Events ----------
  function setQuery(q) {
    query = q;
    $('#q-clear').hidden = !q;
    if (current) { renderPlaylist(); announce(`${LECTURES.filter(matches).length} lectures found`); } else renderGrid();
  }
  const input = $('#q');
  input.addEventListener('input', () => setQuery(input.value));
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape' && input.value) { input.value = ''; setQuery(''); } });
  $('#search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (current) return;
    const g = $('#grid'); if (!g.hidden) g.scrollIntoView();
  });
  const clear = () => { input.value = ''; setQuery(''); input.focus(); };
  $('#q-clear').addEventListener('click', clear);
  $('#empty-clear').addEventListener('click', clear);
  $('#menu-btn').addEventListener('click', () => {
    const open = $('#header-panel').classList.toggle('open');
    $('#menu-btn').setAttribute('aria-expanded', String(open));
  });
  $('#grid').addEventListener('error', (e) => { if (e.target.tagName === 'IMG') e.target.classList.add('broken'); }, true);
  $('#playlist').addEventListener('error', (e) => { if (e.target.tagName === 'IMG') e.target.classList.add('broken'); }, true);

  $('#prev').addEventListener('click', () => { if (current > 1) location.hash = '#/lecture/' + (current - 1); });
  $('#next').addEventListener('click', () => { if (current < LECTURES.length) location.hash = '#/lecture/' + (current + 1); });
  $('#complete').addEventListener('click', () => {
    const l = LECTURES[current - 1];
    if (store.done[l.id]) delete store.done[l.id]; else store.done[l.id] = true;
    save(); renderControls(); renderPlaylist();
  });
  $('#resume').addEventListener('click', () => {   // a deliberate click by the visitor
    if (!playerReady) return;
    const l = LECTURES[current - 1];
    try { player.seekTo(posOf(l), true); player.playVideo(); } catch (e) {}
  });
  $('#retry').addEventListener('click', () => {
    if (player) { try { player.destroy(); } catch (e) {} player = null; playerReady = false; }
    loadCurrent();
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden) savePos(); });
  window.addEventListener('pagehide', savePos);
  window.addEventListener('hashchange', route);
  route();
})();
