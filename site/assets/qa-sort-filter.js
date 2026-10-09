(function () {
  'use strict';

  var state = { sort: 'default', carriers: new Set(), stops: new Set(), sequence: 0 };
  var observer;

  var copy = {
    ar: {
      desktopTitle: 'ترتيب وتصنيف', mobileTitle: 'المزيد من الخيارات', currency: 'تغيير العملة', sortBy: 'ترتيب حسب',
      default: 'مقترحة', price: 'أفضل سعر', duration: 'مدة الرحلة', departure: 'وقت المغادرة', arrival: 'وقت الوصول', avios: 'اجمع أكبر عدد من نقاط أفيوس',
      filters: 'عوامل التصنيف', clear: 'مسح الكل', airlines: 'رحلات الطيران', qatar: 'تتولى الخطوط الجوية القطرية تشغيلها',
      stopsTitle: 'محطات توقف مؤقت', direct: 'مباشرة', oneStop: 'محطة توقف مؤقت واحدة', apply: 'قدّم طلب', results: 'نتائج', close: 'إغلاق'
    },
    en: {
      desktopTitle: 'Sort & filter', mobileTitle: 'More options', currency: 'Change currency', sortBy: 'Sort by',
      default: 'Recommended', price: 'Best price', duration: 'Journey duration', departure: 'Departure time', arrival: 'Arrival time', avios: 'Earn the most Avios',
      filters: 'Filters', clear: 'Clear all', airlines: 'Airlines', qatar: 'Operated by Qatar Airways',
      stopsTitle: 'Stops', direct: 'Direct', oneStop: '1 stop', apply: 'Show', results: 'results', close: 'Close'
    }
  };

  function pageDir() {
    var page = document.querySelector('.qr-page');
    return page && page.getAttribute('dir') === 'rtl' ? 'rtl' : 'ltr';
  }

  function language() { return pageDir() === 'rtl' ? 'ar' : 'en'; }
  function text() { return copy[language()]; }
  function cards() { return Array.prototype.slice.call(document.querySelectorAll('.qr-card')); }

  function numberFrom(value) {
    var match = String(value || '').replace(/,/g, '').match(/(?:QAR|USD|EUR|GBP|AED|SAR|KWD|BHD|OMR|JOD)?\s*([0-9]+(?:\.[0-9]+)?)/i);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  }

  function minutesFromClock(value) {
    var match = String(value || '').match(/(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : Number.POSITIVE_INFINITY;
  }

  function durationOf(card) {
    var value = card.querySelector('.qr-stops')?.textContent || '';
    var hours = value.match(/(\d+)\s*h/i);
    var minutes = value.match(/(\d+)\s*m/i);
    return (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
  }

  function carrierOf(card) {
    var image = card.querySelector('.qr-op-logo');
    return String(image && image.getAttribute('alt') || '').trim().toUpperCase();
  }

  function stopsOf(card) {
    var value = String(card.querySelector('.qr-stops')?.textContent || '').toLowerCase();
    if (/بدون محطة|non\s*-?\s*stop|direct/.test(value)) return 'direct';
    if (/(^|\D)1\s*(محطة|stop)/.test(value)) return 'one';
    return 'many';
  }

  function priceOf(card) {
    var node = card.querySelector('.qa-mobile-card-price') || card.querySelector('.qr-cabin:not(.disabled) .qr-cabin__price') || card.querySelector('.qr-cabin__price');
    return numberFrom(node && node.textContent);
  }

  function clockOf(card, index) {
    var nodes = card.querySelectorAll('.qr-card__left>.flex.items-center .qr-time');
    return minutesFromClock(nodes[index] && nodes[index].textContent);
  }

  function prepareCards() {
    cards().forEach(function (card) {
      if (!card.dataset.qaSfOrder) card.dataset.qaSfOrder = String(++state.sequence);
    });
  }

  function counts() {
    var list = cards();
    return {
      total: list.length,
      qatar: list.filter(function (card) { return carrierOf(card) === 'QR'; }).length,
      direct: list.filter(function (card) { return stopsOf(card) === 'direct'; }).length,
      one: list.filter(function (card) { return stopsOf(card) === 'one'; }).length
    };
  }

  function matches(card) {
    var carrierOkay = !state.carriers.size || state.carriers.has(carrierOf(card));
    var stopsOkay = !state.stops.size || state.stops.has(stopsOf(card));
    return carrierOkay && stopsOkay;
  }

  function previewCount() { return cards().filter(matches).length; }

  function sortValue(card) {
    if (state.sort === 'price') return priceOf(card);
    if (state.sort === 'duration') return durationOf(card);
    if (state.sort === 'departure') return clockOf(card, 0);
    if (state.sort === 'arrival') return clockOf(card, 1);
    if (state.sort === 'avios') return carrierOf(card) === 'QR' ? 0 : 1;
    return Number(card.dataset.qaSfOrder || 0);
  }

  function updateResultsCount(value) {
    var node = document.querySelector('.qr-results-count');
    if (!node) return;
    node.textContent = language() === 'ar' ? value + ' نتائج' : value + ' results';
  }

  function applyFilters() {
    prepareCards();
    var list = cards();
    if (!list.length) return 0;
    var parent = list[0].parentElement;
    var banner = parent && parent.querySelector(':scope > .qr-promo-banner');
    var sorted = list.slice().sort(function (a, b) {
      var delta = sortValue(a) - sortValue(b);
      return delta || Number(a.dataset.qaSfOrder) - Number(b.dataset.qaSfOrder);
    });
    sorted.forEach(function (card) { card.style.display = matches(card) ? '' : 'none'; });
    if (parent) {
      parent.classList.add('qa-sf-sortable-list');
      var fragment = document.createDocumentFragment();
      sorted.forEach(function (card, index) {
        fragment.appendChild(card);
        if (index === 0 && banner) fragment.appendChild(banner);
      });
      parent.appendChild(fragment);
    }
    var visible = sorted.filter(matches).length;
    updateResultsCount(visible);
    return visible;
  }

  function resultLabel(value) {
    var c = text();
    return c.apply + ' (' + value + ' ' + c.results + ')';
  }

  function radio(value, label) {
    return '<label class="qa-sf-option"><input class="qa-sf-native" type="radio" name="qa-sf-sort" value="' + value + '"' + (state.sort === value ? ' checked' : '') + '><span class="qa-sf-radio" aria-hidden="true"></span><span class="qa-sf-option-text">' + label + '</span></label>';
  }

  function checkbox(group, value, label, count) {
    var selected = group === 'carrier' ? state.carriers.has(value) : state.stops.has(value);
    return '<label class="qa-sf-option"><input class="qa-sf-native" type="checkbox" data-group="' + group + '" value="' + value + '"' + (selected ? ' checked' : '') + '><span class="qa-sf-checkbox" aria-hidden="true"></span><span class="qa-sf-option-text">' + label + ' (' + count + ')</span></label>';
  }

  function panelMarkup() {
    var c = text();
    var n = counts();
    return '<section class="qa-sort-filter-panel" role="dialog" aria-modal="true" aria-labelledby="qa-sf-title" dir="' + pageDir() + '">' +
      '<header class="qa-sf-head"><button class="qa-sf-close" type="button" aria-label="' + c.close + '"></button><h2 class="qa-sf-title" id="qa-sf-title"><span class="qa-sf-title-desktop">' + c.desktopTitle + '</span><span class="qa-sf-title-mobile">' + c.mobileTitle + '</span></h2></header>' +
      '<div class="qa-sf-scroll">' +
        '<details class="qa-sf-section qa-sf-currency"><summary>' + c.currency + '</summary></details>' +
        '<details class="qa-sf-section qa-sf-sort" open><summary>' + c.sortBy + '</summary><div class="qa-sf-section-body">' +
          radio('default', c.default) + radio('price', c.price) + radio('duration', c.duration) + radio('departure', c.departure) + radio('arrival', c.arrival) + radio('avios', c.avios) +
        '</div></details>' +
        '<div class="qa-sf-filter-heading"><strong>' + c.filters + '</strong><button class="qa-sf-clear" type="button">' + c.clear + '</button></div>' +
        '<details class="qa-sf-section qa-sf-airlines" open><summary>' + c.airlines + '</summary><div class="qa-sf-section-body">' + checkbox('carrier', 'QR', c.qatar, n.qatar) + '</div></details>' +
        '<details class="qa-sf-section qa-sf-stops" open><summary>' + c.stopsTitle + '</summary><div class="qa-sf-section-body">' + checkbox('stops', 'direct', c.direct, n.direct) + checkbox('stops', 'one', c.oneStop, n.one) + '</div></details>' +
      '</div>' +
      '<footer class="qa-sf-footer"><button class="qa-sf-apply" type="button">' + resultLabel(previewCount()) + '</button></footer>' +
    '</section>';
  }

  function backdrop() {
    var node = document.getElementById('qa-sort-filter-backdrop');
    if (!node) {
      node = document.createElement('div');
      node.id = 'qa-sort-filter-backdrop';
      document.body.appendChild(node);
    }
    return node;
  }

  function refreshApply() {
    var button = document.querySelector('.qa-sf-apply');
    if (button) button.textContent = resultLabel(previewCount());
  }

  function closePanel() {
    var node = backdrop();
    node.classList.remove('is-open');
    document.body.classList.remove('qa-sort-filter-open');
    var trigger = document.querySelector('.qa-sort-filter-trigger');
    if (trigger) trigger.focus({ preventScroll: true });
  }

  function wirePanel(node) {
    var panel = node.querySelector('.qa-sort-filter-panel');
    node.addEventListener('click', function (event) { if (event.target === node) closePanel(); }, { once: true });
    panel.querySelector('.qa-sf-close').addEventListener('click', closePanel);
    panel.querySelector('.qa-sf-clear').addEventListener('click', function () {
      state.sort = 'default'; state.carriers.clear(); state.stops.clear();
      panel.querySelectorAll('input[type=checkbox]').forEach(function (input) { input.checked = false; });
      var recommended = panel.querySelector('input[name=qa-sf-sort][value=default]');
      if (recommended) recommended.checked = true;
      refreshApply();
    });
    panel.querySelectorAll('input[name=qa-sf-sort]').forEach(function (input) {
      input.addEventListener('change', function () { if (input.checked) state.sort = input.value; refreshApply(); });
    });
    panel.querySelectorAll('input[type=checkbox]').forEach(function (input) {
      input.addEventListener('change', function () {
        var target = input.dataset.group === 'carrier' ? state.carriers : state.stops;
        if (input.checked) target.add(input.value); else target.delete(input.value);
        refreshApply();
      });
    });
    panel.querySelector('.qa-sf-apply').addEventListener('click', function () { applyFilters(); closePanel(); });
    var currency = panel.querySelector('.qa-sf-currency>summary');
    if (currency) currency.addEventListener('click', function (event) {
      event.preventDefault();
      var source = document.querySelector('.qa-currency-trigger');
      closePanel();
      if (source) setTimeout(function () { source.click(); }, 40);
    });
  }

  function openPanel() {
    prepareCards();
    var node = backdrop();
    node.innerHTML = panelMarkup();
    wirePanel(node);
    document.body.classList.add('qa-sort-filter-open');
    requestAnimationFrame(function () {
      node.classList.add('is-open');
      var close = node.querySelector('.qa-sf-close');
      if (close) close.focus({ preventScroll: true });
    });
  }

  function ensureTrigger() {
    var group = document.querySelector('.qr-filter-btns');
    if (!group) return;
    var current = group.querySelectorAll('.qr-outline-btn');
    if (current[0]) current[0].classList.add('qa-more-dates-trigger');
    if (current[1]) current[1].classList.add('qa-currency-trigger');
    var button = group.querySelector('.qa-sort-filter-trigger');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = (current[1] ? current[1].className.replace(/\bqa-currency-trigger\b/g, '').trim() : 'qr-outline-btn') + ' qa-sort-filter-trigger';
      group.appendChild(button);
      button.addEventListener('click', openPanel);
    }
    button.classList.remove('qa-currency-trigger', 'qa-more-dates-trigger');
    button.classList.add('qa-sort-filter-trigger');
    var label = language() === 'ar' ? 'ترتيب وتصنيف' : 'Sort & filter';
    if (button.textContent !== label) button.textContent = label;
    button.setAttribute('aria-label', label);
  }

  document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && backdrop().classList.contains('is-open')) closePanel(); });
  document.addEventListener('DOMContentLoaded', function () {
    ensureTrigger(); prepareCards();
    observer = new MutationObserver(function () { ensureTrigger(); prepareCards(); });
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
  });
  window.addEventListener('pageshow', function () { ensureTrigger(); prepareCards(); });
})();
