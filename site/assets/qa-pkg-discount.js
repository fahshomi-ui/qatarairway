/* Package pages discount (admin toggle). Shows the official price struck in red and the discounted price,
   on every package price (.ibecurr), filter / sort price labels and the package booking summaries. */
(function () {
  'use strict';
  var KEY = 'qa_disc_v1';
  var S = { on: false, rate: 0.35 };
  try {
    var cached = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (cached) { S.on = cached.on === true; if (cached.rate > 0 && cached.rate < 1) S.rate = cached.rate; }
  } catch (e) {}

  function rate() { return S.on ? S.rate : 0; }
  window.__qaDiscOn = function () { return S.on === true; };
  window.__qaDiscRate = rate;
  window.__qaDiscAmt = function (x) { var r = rate(); x = Number(x) || 0; return r > 0 && r < 1 ? x / (1 - r) - x : 0; };

  var AR = '٠١٢٣٤٥٦٧٨٩';
  var NUM = /[0-9٠-٩][0-9٠-٩,٬]*(?:[.٫][0-9٠-٩]+)?/;
  var CUR = /(QAR|USD|EUR|GBP|KWD|SAR|AED|BHD|OMR|EGP|JOD|INR|TRY|ر\.ق|د\.ك)/;
  function western(s) { return s.replace(/[٠-٩]/g, function (d) { return String(AR.indexOf(d)); }).replace(/٬/g, ',').replace(/٫/g, '.'); }
  function arabic(s) { return s.replace(/[0-9]/g, function (d) { return AR.charAt(+d); }).replace(/,/g, '٬').replace(/\./g, '٫'); }

  // Rewrites the first amount inside `text` by `factor`, keeping its digits / separators / decimals style.
  function scaleText(text, factor) {
    text = String(text == null ? '' : text);
    var m = text.match(NUM);
    if (!m) return null;
    var tok = m[0], isAr = /[٠-٩]/.test(tok), w = western(tok);
    var dec = (w.split('.')[1] || '').length;
    var val = Number(w.replace(/,/g, ''));
    if (!isFinite(val) || val <= 0) return null;
    var out = (val * factor).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (w.indexOf(',') < 0) out = out.replace(/,/g, '');
    if (isAr) out = arabic(out);
    return text.slice(0, m.index) + out + text.slice(m.index + tok.length);
  }
  window.__qaDiscText = function (text) { var r = rate(); return r ? (scaleText(text, 1 - r) || text) : text; };
  window.__qaDiscUndoText = function (text) { var r = rate(); return r ? (scaleText(text, 1 / (1 - r)) || text) : text; };
  window.__qaDiscToOfficial = function (v) { var r = rate(), n = Number(v); return r && isFinite(n) && n > 0 ? Math.round(n / (1 - r)) : v; };
  window.__qaDiscFromOfficial = function (v) { var r = rate(), n = Number(v); return r && isFinite(n) && n > 0 ? Math.round(n * (1 - r)) : v; };

  var css = document.createElement('style');
  css.textContent = '.qa-disc-was{color:#d32f2f!important;text-decoration:line-through!important;font-weight:400!important;font-size:.78em!important;margin-inline-end:6px;white-space:nowrap;display:inline-block}' +
    '.bf_price .qa-disc-was,.bf_basket_total .qa-disc-was,.nbf_total .qa-disc-was,.bf_basket_totalrow_last .qa-disc-was,.bf_displayprice .qa-disc-was{display:block;margin:0 0 2px}' +
    '.qa-disc-row .bf_line_label,.qa-disc-row .bf_line_item{color:#d32f2f!important}.qa-disc-section{border-top:0!important}' +
    '.qa-disc-badge{display:inline-block;background:#d32f2f;color:#fff;border-radius:4px;font-size:11px;line-height:16px;padding:0 6px;margin:2px 0;font-weight:600}';
  (document.head || document.documentElement).appendChild(css);

  // Price nodes that get the struck original price; text-only labels just get the discounted amount.
  var PRICE_SEL = '.ibecurr, #qa-bi-mobile-booking-amount, [data-qa-disc-price]';
  var LABEL_SEL = '.bf_cst, .bf_sortcost';

  function wasFor(el) {
    var p = el.previousElementSibling;
    return p && p.classList && p.classList.contains('qa-disc-was') ? p : null;
  }
  function noStruck(el) {
    return !!el.closest('option, select, .bf_cst, .bf_sortcost, .qa-disc-was, [data-qa-disc-nostrike], .leaflet-marker-icon, .qa-hm-pin');
  }
  function processPrice(el, r) {
    if (el.closest('.qa-disc-was')) return;
    var txt = el.textContent;
    if (el.getAttribute('data-qa-disc-new') === txt) {
      if (!noStruck(el) && !wasFor(el) && el.getAttribute('data-qa-disc-orig')) addWas(el, el.getAttribute('data-qa-disc-orig'));
      return;
    }
    if (!CUR.test(txt) && !el.classList.contains('ibecurr')) return;
    var nt = scaleText(txt, 1 - r);
    if (!nt) return;
    el.setAttribute('data-qa-disc-orig', txt);
    el.setAttribute('data-qa-disc-new', nt);
    el.textContent = nt;
    if (!noStruck(el)) addWas(el, txt);
  }
  function addWas(el, orig) {
    var w = wasFor(el);
    if (!w) {
      w = document.createElement('s');
      w.className = 'qa-disc-was';
      w.setAttribute('aria-label', 'السعر قبل الخصم');
      el.parentNode.insertBefore(w, el);
    }
    if (w.textContent !== orig) w.textContent = orig;
  }
  function processLabel(el, r) {
    if (el.querySelector('.ibecurr')) return;
    var txt = el.textContent;
    if (el.getAttribute('data-qa-disc-new') === txt || !CUR.test(txt)) return;
    var nt = scaleText(txt, 1 - r);
    if (!nt) return;
    el.setAttribute('data-qa-disc-orig', txt);
    el.setAttribute('data-qa-disc-new', nt);
    el.textContent = nt;
  }
  function restoreAll() {
    document.querySelectorAll('.qa-disc-was').forEach(function (w) { w.remove(); });
    document.querySelectorAll('.qa-disc-section').forEach(function (w) { w.remove(); });
    document.querySelectorAll('[data-qa-disc-orig]').forEach(function (el) {
      if (el.getAttribute('data-qa-disc-new') === el.textContent) el.textContent = el.getAttribute('data-qa-disc-orig');
      el.removeAttribute('data-qa-disc-orig'); el.removeAttribute('data-qa-disc-new');
    });
  }
  function amountOf(t) { var m = western(String(t || '')).replace(/,/g, '').match(/[0-9]+(?:\.[0-9]+)?/); return m ? Number(m[0]) : NaN; }
  var EN = /(^|[?&])lang=en(&|$)/.test(location.search) || /^en/i.test(document.documentElement.getAttribute('lang') || '');
  // "Total discount 35%" line right above the booking total of the package summaries.
  function discountRow(sec, r) {
    var tot = sec.querySelector('.ibecurr[data-qa-disc-orig]');
    if (!tot) return;
    var o = amountOf(tot.getAttribute('data-qa-disc-orig')), n = amountOf(tot.getAttribute('data-qa-disc-new'));
    if (!(o > n)) return;
    var dec = (western(tot.getAttribute('data-qa-disc-new')).replace(/,/g, '').match(/\.([0-9]+)/) || [0, ''])[1].length;
    var cur = tot.getAttribute('data-curr') || (tot.textContent.match(/[A-Z]{3}/) || ['QAR'])[0];
    var value = '- ' + cur + '\u00a0' + (o - n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    var label = (EN ? 'Total discount ' : 'إجمالي الخصم ') + Math.round(r * 100) + '%';
    var box = sec.previousElementSibling;
    if (!box || !box.classList.contains('qa-disc-section')) {
      box = document.createElement('div');
      box.className = 'bf_payment_productsection qa-disc-section';
      box.innerHTML = '<div class="bf_payment_labelledrow qa-disc-row"><div class="bf_line_label"></div><div class="bf_line_item cost"></div></div>';
      sec.parentNode.insertBefore(box, sec);
    }
    var l = box.querySelector('.bf_line_label'), v = box.querySelector('.bf_line_item');
    if (l.textContent !== label) l.textContent = label;
    if (v.textContent !== value) v.textContent = value;
  }
  var applied = false;
  function run() {
    scheduled = false;
    var r = rate();
    if (!r) { if (applied) { applied = false; restoreAll(); } return; }
    applied = true;
    document.querySelectorAll(PRICE_SEL).forEach(function (el) { processPrice(el, r); });
    document.querySelectorAll(LABEL_SEL).forEach(function (el) { processLabel(el, r); });
    document.querySelectorAll('.bf_payment_productsection.bf_basket_total').forEach(function (sec) { discountRow(sec, r); });
  }
  var scheduled = false;
  function schedule() { if (scheduled) return; scheduled = true; (window.requestAnimationFrame || setTimeout)(run); }
  window.__qaDiscRefresh = schedule;

  function start() {
    run();
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  function apply(d) {
    if (!d || typeof d.enabled !== 'boolean') return;
    var on = d.enabled, rt = d.rate > 0 && d.rate < 1 ? d.rate : 0.35;
    var changed = on !== S.on || rt !== S.rate;
    if (changed && applied) { restoreAll(); applied = false; }
    S.on = on; S.rate = rt;
    try { localStorage.setItem(KEY, JSON.stringify({ on: on, rate: rt })); } catch (e) {}
    if (changed) { schedule(); try { window.dispatchEvent(new CustomEvent('qa-discount-change', { detail: { on: on, rate: rt } })); } catch (e) {} }
  }
  try {
    var base = window.__QR_LIVE_BASE || '/qr-api';
    fetch(base + '/api/discount', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(apply).catch(function () {});
  } catch (e) {}
})();
