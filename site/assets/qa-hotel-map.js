/* Hotel maps for the packages pages.
 * - Sidebar: keeps the official Google static map image, loaded without a referrer
 *   (the official key rejects our domain as referrer but accepts requests without one).
 * - "View map": interactive Leaflet map (self-hosted) with a price pin per hotel.
 */
(function () {
  'use strict';
  if (window.qaHotelMap) return;
  var BASE = '/assets/vendor/leaflet/';
  // Esri street map (Arabic + English labels, no key/referrer needed); OpenStreetMap as automatic fallback.
  var TILE_SOURCES = [
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      options: {
        maxZoom: 19,
        maxNativeZoom: 18,
        attribution: 'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a> &mdash; Esri, HERE, Garmin, USGS, &copy; OpenStreetMap contributors'
      }
    },
    {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
      }
    }
  ];
  var loading = null;
  var currentMap = null;

  var CSS = [
    '.qa-hm-backdrop{position:fixed;inset:0;background:rgba(23,0,13,.65);z-index:990}',
    '.qa-hm-modal{position:fixed;z-index:991;inset:4vh 4vw;background:#fff;border-radius:6px;box-shadow:0 22px 70px rgba(23,0,13,.4);overflow:hidden;display:flex;flex-direction:column;font-family:inherit}',
    '@media (max-width:767px){.qa-hm-modal{inset:0;border-radius:0}}',
    '.qa-hm-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-bottom:1px solid #e6e6ea;background:#fff}',
    '.qa-hm-head h2{margin:0;font-size:18px;font-weight:700;color:#5c0632;line-height:1.3}',
    '.qa-hm-close{position:relative;flex:0 0 auto;width:40px;height:40px;border:0;border-radius:50%;background:#f3f3f5;cursor:pointer}',
    '.qa-hm-close:hover{background:#e9e9ee}',
    '.qa-hm-close::before,.qa-hm-close::after{content:"";position:absolute;left:10px;top:19px;width:20px;height:2px;background:#1f2227;transform:rotate(45deg)}',
    '.qa-hm-close::after{transform:rotate(-45deg)}',
    '.qa-hm-canvas{position:relative;flex:1 1 auto;min-height:300px;background:#eef0f3}',
    '.qa-hm-msg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#555;font-size:15px}',
    '.qa-hm-pin{background:none!important;border:0!important;width:auto!important;height:auto!important}',
    '.qa-hm-pin span{position:absolute;left:0;top:0;transform:translate(-50%,calc(-100% - 9px));white-space:nowrap;background:#5c0632;color:#fff;font-size:13px;font-weight:700;line-height:1;padding:7px 10px;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,.3);cursor:pointer;direction:ltr}',
    '.qa-hm-pin span::after{content:"";position:absolute;left:50%;bottom:-6px;margin-left:-6px;border:6px solid transparent;border-bottom:0;border-top-color:#5c0632}',
    '.qa-hm-pin.qa-hm-pin-dot span{width:14px;height:14px;padding:0;border-radius:50%;border:3px solid #fff}',
    '.qa-hm-pin:hover span,.qa-hm-pin.qa-hm-active span{background:#8e1a52;z-index:2}',
    '.qa-hm-pin:hover span::after,.qa-hm-pin.qa-hm-active span::after{border-top-color:#8e1a52}',
    '.qa-hm-pop{display:flex;flex-direction:column;gap:6px;min-width:170px;font-family:inherit}',
    '.qa-hm-pop strong{font-size:15px;color:#5c0632}',
    '.qa-hm-stars{color:#d8a400;letter-spacing:1px;font-size:14px}',
    '.qa-hm-price{font-size:14px;font-weight:700;color:#1f2227;direction:ltr;text-align:start}',
    '.qa-hm-view{margin-top:4px;align-self:flex-start;border:0;border-radius:18px;background:#5c0632;color:#fff;font-weight:700;font-size:13px;padding:8px 14px;cursor:pointer}',
    '.qa-hm-view:hover{background:#8e1a52}',
    '.bf_static_map_image img.qa-static-map{display:block!important;width:100%!important;height:auto!important;max-width:none!important}',
    '.qa-pr-card-flash{outline:3px solid #8e1a52!important;outline-offset:2px;transition:outline-color .3s}'
  ].join('\n');

  function injectCss() {
    if (document.getElementById('qa-hm-style')) return;
    var st = document.createElement('style');
    st.id = 'qa-hm-style';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function centerFrom(src) {
    try {
      var u = new URL(src || '', location.href);
      var c = (u.searchParams.get('center') || '').split(',').map(Number);
      if (c.length === 2 && c.every(isFinite)) return c;
    } catch (_) {}
    return null;
  }

  function loadLeaflet() {
    if (window.L && window.L.map) return Promise.resolve(window.L);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      if (!document.querySelector('link[data-qa-leaflet]')) {
        var css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = BASE + 'leaflet.css';
        css.setAttribute('data-qa-leaflet', '1');
        document.head.appendChild(css);
      }
      var sc = document.createElement('script');
      sc.src = BASE + 'leaflet.js';
      sc.onload = function () {
        window.L && window.L.map ? resolve(window.L) : reject(new Error('leaflet'));
      };
      sc.onerror = function () {
        loading = null;
        reject(new Error('leaflet'));
      };
      document.head.appendChild(sc);
    });
    return loading;
  }

  // Keep the official static map, but request it without a referrer so Google accepts the key.
  function fixStatic(root, lang) {
    injectCss();
    if (!root) return;
    root.querySelectorAll('.bf_static_map_image').forEach(function (host) {
      host.querySelectorAll('iframe[data-map-src]').forEach(function (f) { f.remove(); });
      var image = host.querySelector('img');
      if (!image) {
        var c = host.getAttribute('data-qa-src');
        if (!c) return;
        image = document.createElement('img');
        image.setAttribute('src', c);
        host.appendChild(image);
      }
      var src = image.getAttribute('src') || '';
      if (!/maps\.googleapis\.com\/maps\/api\/staticmap/i.test(src)) return;
      if (image.getAttribute('data-qa-static') === '1') {
        // Already requested without a referrer by the server markup; retry once with a fresh URL if it failed.
        host.setAttribute('data-qa-src', src);
        var retry = function () {
          if (image.getAttribute('data-qa-retried') === '1') return;
          image.setAttribute('data-qa-retried', '1');
          image.setAttribute('referrerpolicy', 'no-referrer');
          image.src = src + (src.indexOf('?') >= 0 ? '&' : '?') + 'qa_nr=' + Date.now();
        };
        if (image.complete && !image.naturalWidth) retry();
        else image.addEventListener('error', retry, { once: true });
        return;
      }
      host.setAttribute('data-qa-src', src);
      var fresh = document.createElement('img');
      fresh.setAttribute('referrerpolicy', 'no-referrer');
      try { fresh.referrerPolicy = 'no-referrer'; } catch (_) {}
      fresh.setAttribute('data-qa-static', '1');
      fresh.setAttribute('data-qa-retried', '1');
      fresh.className = 'qa-static-map';
      fresh.alt = lang === 'ar' ? 'خريطة الفنادق' : 'Hotel map';
      // A new URL so the browser does not reuse the earlier rejected (referrer) response from its image cache.
      fresh.src = src + (src.indexOf('?') >= 0 ? '&' : '?') + 'qa_nr=1';
      image.replaceWith(fresh);
    });
    root.querySelectorAll('.bf_static_map_modal_link').forEach(function (t) {
      t.setAttribute('role', 'button');
      t.setAttribute('tabindex', '0');
    });
  }

  function close() {
    if (currentMap) {
      try { currentMap.remove(); } catch (_) {}
      currentMap = null;
    }
    document.querySelectorAll('.qa-hm-modal,.qa-hm-backdrop').forEach(function (n) { n.remove(); });
    document.body.classList.remove('noscroll');
  }

  function stars(n) {
    n = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
    return n ? new Array(n + 1).join('\u2605') : '';
  }

  // opts: {lang, title, points:[{id,name,lat,lon,rating,price,viewable}], center:[lat,lon], onView(point)}
  function open(opts) {
    opts = opts || {};
    injectCss();
    close();
    var ar = opts.lang !== 'en';
    var title = opts.title || (ar ? 'خريطة الفنادق' : 'Hotel map');
    var backdrop = document.createElement('div');
    backdrop.className = 'qa-hm-backdrop';
    var panel = document.createElement('section');
    panel.className = 'qa-hm-modal';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', title);
    panel.dir = ar ? 'rtl' : 'ltr';
    panel.innerHTML =
      '<header class="qa-hm-head"><h2>' + esc(title) + '</h2><button type="button" class="qa-hm-close" aria-label="' +
      (ar ? 'إغلاق' : 'Close') + '"></button></header><div class="qa-hm-canvas"><div class="qa-hm-msg">' +
      (ar ? 'جارٍ تحميل الخريطة...' : 'Loading map...') + '</div></div>';
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
    document.body.classList.add('noscroll');
    backdrop.addEventListener('click', close);
    panel.querySelector('.qa-hm-close').addEventListener('click', close);

    loadLeaflet()
      .then(function (L) {
        if (!panel.isConnected) return;
        var canvas = panel.querySelector('.qa-hm-canvas');
        canvas.innerHTML = '';
        canvas.dir = 'ltr';
        var map = L.map(canvas, { zoomControl: true, attributionControl: true, worldCopyJump: true });
        currentMap = map;
        var addTiles = function (index) {
          var src = TILE_SOURCES[index];
          var layer = L.tileLayer(src.url, src.options);
          var loaded = 0, failed = 0;
          layer.on('tileload', function () { loaded++; });
          layer.on('tileerror', function () {
            failed++;
            if (!loaded && failed >= 3 && index + 1 < TILE_SOURCES.length && currentMap === map) {
              map.removeLayer(layer);
              addTiles(index + 1);
            }
          });
          layer.addTo(map);
        };
        addTiles(0);
        var pts = (opts.points || []).filter(function (p) {
          return p && isFinite(p.lat) && isFinite(p.lon) && (Number(p.lat) || Number(p.lon));
        });
        var latlngs = [];
        pts.forEach(function (p) {
          var label = p.price || '';
          var icon = L.divIcon({
            className: 'qa-hm-pin' + (label ? '' : ' qa-hm-pin-dot'),
            html: '<span>' + esc(label) + '</span>',
            iconSize: null
          });
          var ll = [Number(p.lat), Number(p.lon)];
          latlngs.push(ll);
          var m = L.marker(ll, { icon: icon, title: p.name || '', riseOnHover: true }).addTo(map);
          var html =
            '<div class="qa-hm-pop" dir="' + (ar ? 'rtl' : 'ltr') + '"><strong>' + esc(p.name) + '</strong>' +
            (stars(p.rating) ? '<span class="qa-hm-stars">' + stars(p.rating) + '</span>' : '') +
            (label ? '<span class="qa-hm-price">' + esc(label) + '</span>' : '') +
            (opts.onView && p.viewable ? '<button type="button" class="qa-hm-view">' + (ar ? 'عرض الفندق' : 'View hotel') + '</button>' : '') +
            '</div>';
          m.bindPopup(html, { autoPanPadding: [40, 40] });
          m.on('popupopen', function (e) {
            var el = m.getElement && m.getElement();
            if (el) el.classList.add('qa-hm-active');
            var b = e.popup.getElement() && e.popup.getElement().querySelector('.qa-hm-view');
            if (b) b.addEventListener('click', function () { close(); opts.onView(p); });
          });
          m.on('popupclose', function () {
            var el = m.getElement && m.getElement();
            if (el) el.classList.remove('qa-hm-active');
          });
        });
        if (latlngs.length > 1) map.fitBounds(latlngs, { padding: [60, 60], maxZoom: 15 });
        else if (latlngs.length === 1) map.setView(latlngs[0], 15);
        else map.setView(opts.center || [25.2854, 51.531], opts.center ? 12 : 11);
        setTimeout(function () { try { map.invalidateSize(); } catch (_) {} }, 60);
      })
      .catch(function () {
        var canvas = panel.querySelector('.qa-hm-canvas');
        if (canvas) canvas.innerHTML = '<div class="qa-hm-msg">' + (ar ? 'تعذر تحميل الخريطة.' : 'Unable to load the map.') + '</div>';
      });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.querySelector('.qa-hm-modal')) close();
  });

  injectCss();
  window.qaHotelMap = { fixStatic: fixStatic, open: open, close: close, centerFrom: centerFrom, load: loadLeaflet };
})();
