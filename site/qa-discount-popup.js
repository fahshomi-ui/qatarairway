/* Discount popup (admin toggle): 2s after entering the site, shows the logo, "35% off all flights" and a
   countdown (hours : minutes : seconds, left to right). Every visitor gets a random end time (< 11h) that is
   kept in localStorage, so leaving and coming back continues the same countdown. Shown once per visit. */
(function () {
  'use strict';
  if (window.__qaDiscPopup) return;
  window.__qaDiscPopup = true;

  var DISC_KEY = 'qa_disc_v1';
  var END_KEY = 'qa_disc_cd_end';
  var SEEN_KEY = 'qa_disc_pop_seen';
  var MIN_MS = 60 * 60 * 1000;                 // 1h
  var MAX_MS = 11 * 60 * 60 * 1000 - 60 * 1000; // 10h59m
  var ORIGIN = location.origin;

  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  var state = { on: false, rate: 0.35 };
  try {
    var c = JSON.parse(read(DISC_KEY) || 'null');
    if (c) { state.on = c.on === true; if (c.rate > 0 && c.rate < 1) state.rate = c.rate; }
  } catch (e) {}

  function endTime() {
    var now = Date.now();
    var end = Number(read(END_KEY));
    if (!isFinite(end) || end <= now || end - now > MAX_MS + 60000) {
      end = now + MIN_MS + Math.floor(Math.random() * (MAX_MS - MIN_MS));
      store(END_KEY, String(end));
    }
    return end;
  }

  function isEnglish() {
    var path = String(location.pathname || '');
    if (/^\/en-[a-z]{2}\//i.test(path)) return true;
    if (/^\/ar-[a-z]{2}\//i.test(path)) return false;
    try {
      var pref = JSON.parse(localStorage.getItem('jzPref') || '{}') || {};
      var sl = String(pref.siteLang || localStorage.getItem('jz_site_lang') || '').toLowerCase();
      if (sl === 'en') return true;
    } catch (e) {}
    var l = String(document.documentElement.lang || '').toLowerCase();
    return l.indexOf('en') === 0 || (document.body && document.body.classList.contains('newhome-en'));
  }

  var CSS = '' +
    '.qa-dp-ov{position:fixed;inset:0;z-index:2147483646;background:rgba(20,10,16,.62);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .25s ease}' +
    '.qa-dp-ov.qa-dp-in{opacity:1}' +
    '.qa-dp-card{position:relative;width:100%;max-width:440px;background:#fff;border-radius:18px;box-shadow:0 18px 60px rgba(0,0,0,.35);padding:30px 26px 28px;text-align:center;transform:translateY(14px) scale(.97);transition:transform .25s ease;font-family:inherit}' +
    '.qa-dp-in .qa-dp-card{transform:none}' +
    '.qa-dp-x{position:absolute;top:10px;inset-inline-end:12px;width:34px;height:34px;border:0;border-radius:50%;background:#f3eef1;color:#5c0632;font-size:22px;line-height:34px;cursor:pointer;padding:0}' +
    '.qa-dp-x:hover{background:#e8dde3}' +
    '.qa-dp-logo{display:block;height:52px;width:auto;margin:6px auto 18px}' +
    '.qa-dp-title{margin:0 0 22px;color:#5c0632;font-weight:700;line-height:1.25}' +
    '.qa-dp-t1{display:block;font-size:26px}' +
    '.qa-dp-pct{display:block;direction:ltr;unicode-bidi:isolate;color:#c8102e;font-size:56px;font-weight:800;line-height:1.1;margin:2px 0 4px}' +
    '.qa-dp-t3{display:block;font-size:22px}' +
    '.qa-dp-cd{display:flex;justify-content:center;align-items:flex-start;gap:8px;direction:ltr}' +
    '.qa-dp-u{min-width:78px}' +
    '.qa-dp-n{display:block;background:#5c0632;color:#fff;border-radius:12px;font-size:32px;font-weight:700;line-height:1;padding:14px 6px;font-variant-numeric:tabular-nums;letter-spacing:1px}' +
    '.qa-dp-l{display:block;margin-top:7px;color:#6b5a63;font-size:13px}' +
    '.qa-dp-sep{color:#5c0632;font-size:30px;font-weight:700;line-height:60px}' +
    '@media (max-width:420px){.qa-dp-card{padding:26px 16px 22px}.qa-dp-t1{font-size:23px}.qa-dp-pct{font-size:48px}.qa-dp-t3{font-size:19px}.qa-dp-u{min-width:66px}.qa-dp-n{font-size:27px;padding:12px 4px}.qa-dp-sep{line-height:52px;font-size:26px}}';

  var ov = null, timer = 0;
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function tick() {
    if (!ov) return;
    var left = endTime() - Date.now();
    if (left < 0) left = 0;
    var s = Math.floor(left / 1000);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    ov.querySelector('[data-u="h"]').textContent = pad(h);
    ov.querySelector('[data-u="m"]').textContent = pad(m);
    ov.querySelector('[data-u="s"]').textContent = pad(sec);
  }

  function close() {
    if (!ov) return;
    var el = ov; ov = null;
    clearInterval(timer);
    el.classList.remove('qa-dp-in');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  function show() {
    if (ov || !state.on) return;
    if (!document.body) { document.addEventListener('DOMContentLoaded', show); return; }
    try { if (sessionStorage.getItem(SEEN_KEY)) return; sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
    var en = isEnglish();
    var pct = Math.round(state.rate * 100) + '%';
    if (!document.getElementById('qa-dp-css')) {
      var st = document.createElement('style'); st.id = 'qa-dp-css'; st.textContent = CSS;
      document.head.appendChild(st);
    }
    ov = document.createElement('div');
    ov.className = 'qa-dp-ov';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.dir = en ? 'ltr' : 'rtl';
    var title = en
      ? '<span class="qa-dp-t1">Save</span><span class="qa-dp-pct" dir="ltr">' + pct + '</span><span class="qa-dp-t3">on all flights and packages</span>'
      : '<span class="qa-dp-t1">خصم</span><span class="qa-dp-pct" dir="ltr">' + pct + '</span><span class="qa-dp-t3">على جميع الرحلات والباقات</span>';
    var L = en ? ['Hours', 'Minutes', 'Seconds'] : ['ساعات', 'دقائق', 'ثواني'];
    ov.innerHTML =
      '<div class="qa-dp-card">' +
        '<button type="button" class="qa-dp-x" aria-label="' + (en ? 'Close' : 'إغلاق') + '">&times;</button>' +
        '<img class="qa-dp-logo" alt="Qatar Airways" src="' + ORIGIN + '/assets/qa-extras-qatar-logo.svg">' +
        '<div class="qa-dp-title">' + title + '</div>' +
        '<div class="qa-dp-cd">' +
          '<div class="qa-dp-u"><span class="qa-dp-n" data-u="h">00</span><span class="qa-dp-l">' + L[0] + '</span></div>' +
          '<span class="qa-dp-sep">:</span>' +
          '<div class="qa-dp-u"><span class="qa-dp-n" data-u="m">00</span><span class="qa-dp-l">' + L[1] + '</span></div>' +
          '<span class="qa-dp-sep">:</span>' +
          '<div class="qa-dp-u"><span class="qa-dp-n" data-u="s">00</span><span class="qa-dp-l">' + L[2] + '</span></div>' +
        '</div>' +
      '</div>';
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.qa-dp-x')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(ov);
    tick();
    timer = setInterval(tick, 1000);
    requestAnimationFrame(function () { if (ov) ov.classList.add('qa-dp-in'); });
  }

  endTime(); // assign this visitor's countdown on first visit

  var ready = false, due = false;
  function maybeShow() { if (ready && due) show(); }

  setTimeout(function () { ready = true; maybeShow(); }, 4000); // slow status call: fall back to the cached state
  try {
    fetch((window.__QR_LIVE_BASE || (ORIGIN + '/qr-api')) + '/api/discount', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && typeof d.enabled === 'boolean') {
          state.on = d.enabled;
          if (d.rate > 0 && d.rate < 1) state.rate = d.rate;
          store(DISC_KEY, JSON.stringify({ on: state.on, rate: state.rate }));
          if (!state.on) close();
        }
      })
      .catch(function () {})
      .then(function () { ready = true; maybeShow(); });
  } catch (e) { ready = true; }

  // 2 seconds after the visitor opened the page (not after this script happened to load)
  var since = (window.performance && performance.now) ? performance.now() : 0;
  setTimeout(function () { due = true; maybeShow(); }, Math.max(0, 2000 - since));
})();
