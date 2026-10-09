(function () {
  'use strict';

  var scheduled = false;
  var BAGGAGE_IMAGE = '/assets/qa-extras-baggage.jpg';
  var SEAT_IMAGE = '/assets/qa-extras-seat.jpg';
  var BAGGAGE_KEY = 'qaExtraBaggage';
  var weights = [0, 10, 20, 30, 50];
  var state = {
    selectedByLeg: {},
    draftByLeg: {},
    activeLeg: 0,
    weightListOpen: false,
    trayOpen: false,
    traySwipeAt: 0,
    panel: '',
    isAr: true
  };

  function mobile() {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  function readLang() {
    try {
      var pref = JSON.parse(localStorage.getItem('jzPref') || '{}') || {};
      var lang = String(pref.siteLang || localStorage.getItem('jz_site_lang') || pref.lang || localStorage.getItem('jz_lang') || localStorage.getItem('lang') || 'ar').replace(/"/g, '').toLowerCase();
      return lang === 'en' ? 'en' : 'ar';
    } catch (error) {
      return 'ar';
    }
  }

  function readJson(key, fallback) {
    try {
      var value = JSON.parse(localStorage.getItem(key) || 'null');
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function text(element, value) {
    if (element && element.textContent.trim() !== value) element.textContent = value;
  }

  function money(value) {
    var source = String(value || '').trim();
    var match = source.match(/^(.*?)([\d,]+(?:\.\d+)?)$/);
    if (!match) return null;
    return {
      prefix: match[1],
      amount: Number(match[2].replace(/,/g, '')),
      decimals: (match[2].split('.')[1] || '').length
    };
  }

  function formatLike(reference, amount) {
    var parsed = money(reference);
    if (!parsed || !Number.isFinite(amount)) return reference;
    return parsed.prefix + amount.toLocaleString('en-US', {
      minimumFractionDigits: parsed.decimals,
      maximumFractionDigits: parsed.decimals
    });
  }

  function currencyInfo(page) {
    var nativePrice = page && page.querySelector('.qr-mkt-insurance-price strong');
    var source = nativePrice ? nativePrice.textContent.trim() : 'QAR 328.00';
    var parsed = money(source) || { prefix: 'QAR ', amount: 328, decimals: 2 };
    return {
      reference: source,
      rate: parsed.amount > 0 ? parsed.amount / 328 : 1
    };
  }

  function formatQar(page, qarAmount) {
    var info = currencyInfo(page);
    return formatLike(info.reference, qarAmount * info.rate);
  }

  function currentPriceQar(kg) {
    return Number(kg || 0) * 22.5;
  }

  function oldPriceQar(kg) {
    return Number(kg || 0) * 50;
  }

  function routeData() {
    var flight = readJson('selectedFlight', {});
    return {
      flight: flight,
      legs: Array.isArray(flight.legs) ? flight.legs : []
    };
  }

  function passengerData() {
    var passengers = readJson('passengerData', []);
    var passenger = Array.isArray(passengers) && passengers[0] ? passengers[0] : {};
    var first = String(passenger.firstName || passenger.givenName || passenger.name || (state.isAr ? 'مسافر' : 'Passenger'));
    var last = String(passenger.lastName || passenger.surname || '');
    var title = String(passenger.titleEn || passenger.title || 'Mr.');
    var name = (title + ' ' + first + ' ' + last).replace(/\s+/g, ' ').trim();
    var initials = ((first.charAt(0) || 'P') + (last.charAt(0) || '')).toUpperCase();
    return { name: name, initials: initials || 'P' };
  }

  function city(leg, code) {
    if (!leg) return code || '';
    return leg.places && leg.places[code] && leg.places[code].city ? leg.places[code].city : (code || '');
  }

  function routeLabel(leg) {
    return city(leg, leg && leg.origin) + ' to ' + city(leg, leg && leg.destination);
  }

  function dateLabel(value) {
    if (!value) return '';
    try {
      var date = new Date(String(value).slice(0, 10) + 'T12:00:00');
      if (Number.isNaN(date.getTime())) return value;
      var week = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return week[date.getDay()] + ', ' + date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
    } catch (error) {
      return value;
    }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function icon(name) {
    var icons = {
      diamond: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 11l5-6h12l5 6-11 16L5 11Zm0 0h22M10 5l6 22M22 5l-6 22M10 5l6 6 6-6"/></svg>',
      checked: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="6" y="8" width="20" height="19" rx="2"/><path d="M10 8V5h12v3M12 13v9M16 13v9M20 13v9M4 13h4M24 13h4"/></svg>',
      cabin: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="10" width="22" height="17" rx="2"/><path d="M10 10V6h12v4M5 16h22M11 20v3M16 20v3M21 20v3"/></svg>',
      bag: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="7" y="5" width="18" height="22" rx="3"/><path d="M12 5V3h8v2M11 11v11M16 11v11M21 11v11M5 12h2M25 12h2"/></svg>',
      chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
      up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15l7-7 7 7"/></svg>',
      down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9l7 7 7-7"/></svg>',
      close: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 7l18 18M25 7L7 25"/></svg>',
      back: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M20 6l-10 10 10 10"/></svg>'
    };
    return icons[name] || '';
  }

  function suitcaseIllustration() {
    return '<svg class="qa-bag-dimension-art" viewBox="0 0 430 520" role="img" aria-label="Baggage dimensions">' +
      '<defs><style>.qa-line{fill:none;stroke:#17191f;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.qa-dash{fill:none;stroke:#3536a6;stroke-width:3;stroke-dasharray:7 8;stroke-linecap:round}.qa-label{fill:#3536a6;font:700 25px Arial}</style></defs>' +
      '<path class="qa-dash" d="M102 64h226M76 102v310M354 102v310"/><path class="qa-line" d="M151 90h130c24 0 43 19 43 43v303c0 22-18 40-40 40H147c-22 0-40-18-40-40V133c0-24 20-43 44-43Z"/>' +
      '<path class="qa-line" d="M176 90v-25h78v25M133 133l32-22h118l19 22M138 143v264M163 143v264M189 143v264M251 143v264M277 143v264M301 143v264"/>' +
      '<path class="qa-line" d="M324 184h30v77h-30M324 312h30v77h-30M141 476v22M286 476v22M126 498h30M271 498h30"/>' +
      '<path class="qa-line" d="M199 279c36-24 71-38 105-47M209 292c18 4 38 6 60 5M211 308c11 5 24 9 39 10"/>' +
      '<text class="qa-label" x="87" y="47">Depth</text><text class="qa-label" x="270" y="47">Width</text><text class="qa-label" transform="translate(397 335) rotate(-90)">Height</text>' +
      '</svg>';
  }

  function ensureHeader(page, isAr) {
    var head = page.querySelector('.qr-mkt-head-inner');
    if (!head) return;
    var brand = head.querySelector('.qa-extras-mobile-brand');
    if (mobile()) {
      page.classList.add('qa-extras-mobile');
      if (!brand) {
        brand = document.createElement('a');
        brand.className = 'qa-extras-mobile-brand';
        brand.href = '/';
        brand.setAttribute('aria-label', 'Qatar Airways home');
        brand.innerHTML = '<img class="qa-extras-qatar-logo" src="/assets/qa-extras-qatar-logo.svg" alt="Qatar Airways">' +
          '<img class="qa-extras-oneworld-logo" src="/assets/qa-extras-oneworld.svg" alt="oneworld">';
        head.appendChild(brand);
      }
      brand.setAttribute('dir', isAr ? 'rtl' : 'ltr');
    } else {
      page.classList.remove('qa-extras-mobile');
      if (brand) brand.remove();
    }
  }

  function ensureBaggageCard(page, isAr) {
    var main = page.querySelector('.qr-mkt-main');
    if (!main) return;
    var card = main.querySelector('.qa-baggage-card');
    if (!card) {
      card = document.createElement('article');
      card.className = 'qa-baggage-card';
      card.innerHTML = '<div class="qa-baggage-image-wrap"><img class="qa-baggage-image" src="' + BAGGAGE_IMAGE + '" alt=""><span class="qa-baggage-promo"></span></div>' +
        '<div class="qa-baggage-copy"><h2></h2><p></p><div class="qa-baggage-price"><span class="qa-baggage-old"></span><span class="qa-baggage-current"></span><small></small></div><button type="button" class="qa-baggage-allowance" data-qa-bag-action="allowance"></button></div>' +
        '<button type="button" class="qa-baggage-add" data-qa-bag-action="picker"></button>';
      var firstCard = main.querySelector('.qr-mkt-insurance-card');
      main.insertBefore(card, firstCard || null);
    }
    card.setAttribute('dir', isAr ? 'rtl' : 'ltr');
    var selection = selectedQar() > 0;
    text(card.querySelector('.qa-baggage-promo'), isAr ? 'عرض ترويجي' : 'Promotional offer');
    text(card.querySelector('h2'), isAr ? 'وزن إضافي للأمتعة' : 'Extra baggage');
    text(card.querySelector('.qa-baggage-copy > p'), isAr ? 'احمل معك المزيد من الأمتعة خلال رحلتك.' : 'Take more baggage with you on your journey.');
    text(card.querySelector('.qa-baggage-old'), formatQar(page, 500));
    text(card.querySelector('.qa-baggage-current'), formatQar(page, 225));
    text(card.querySelector('.qa-baggage-price small'), isAr ? 'من' : 'From');
    text(card.querySelector('.qa-baggage-allowance'), isAr ? 'عرض الوزن المسموح به' : 'View baggage allowance');
    text(card.querySelector('.qa-baggage-add'), selection ? (isAr ? 'مضاف' : 'Added') : (isAr ? 'إضافة' : 'Add'));
    card.querySelector('.qa-baggage-add').classList.toggle('is-added', selection);
    card.querySelector('.qa-baggage-image').alt = isAr ? 'خدمة الوزن الإضافي للأمتعة' : 'Extra baggage service';
  }

  function ensureSeatImage(page, isAr) {
    var seatCard = page.querySelector('.qr-mkt-service-card:not(.qr-mkt-esim-card)');
    var seatImage = seatCard && seatCard.querySelector('img');
    if (!seatImage) return;
    if (!seatImage.dataset.qaOriginalSrc) {
      seatImage.dataset.qaOriginalSrc = seatImage.getAttribute('src') || '';
      seatImage.dataset.qaOriginalAlt = seatImage.getAttribute('alt') || '';
    }
    if (mobile()) {
      seatImage.src = SEAT_IMAGE;
      seatImage.alt = isAr ? 'مقاعد على متن الطائرة' : 'Seats on board';
    } else if (seatImage.dataset.qaOriginalSrc) {
      seatImage.src = seatImage.dataset.qaOriginalSrc;
      seatImage.alt = seatImage.dataset.qaOriginalAlt || '';
    }
  }

  function selectionTotal(selection) {
    return Object.keys(selection || {}).reduce(function (total, key) {
      return total + currentPriceQar(Number(selection[key]) || 0);
    }, 0);
  }

  function selectedQar() {
    return selectionTotal(state.selectedByLeg);
  }

  function selectedKilograms() {
    return Object.keys(state.selectedByLeg || {}).reduce(function (total, key) {
      return total + (Number(state.selectedByLeg[key]) || 0);
    }, 0);
  }

  function syncNativeSummaryBaggage(page, isAr) {
    var summary = page && page.querySelector('.qr-mkt-summary');
    var grand = summary && summary.querySelector('.qr-mkt-summary-total strong');
    if (!summary || !grand) return;

    var currentText = grand.textContent.trim();
    var lastRendered = grand.dataset.qaBagRenderedText || '';
    if (!grand.dataset.qaBagBaseText || (lastRendered && currentText !== lastRendered)) {
      grand.dataset.qaBagBaseText = currentText;
    }
    var baseText = grand.dataset.qaBagBaseText || currentText;
    var base = money(baseText);
    var info = currencyInfo(page);
    var baggageQar = selectedQar();
    var baggageAmount = baggageQar * info.rate;
    var kilograms = selectedKilograms();
    var services = summary.querySelector('.qr-mkt-added-services');
    var line = summary.querySelector('.qa-baggage-summary-line');

    if (baggageQar > 0) {
      if (!services) {
        services = document.createElement('section');
        services.className = 'qr-mkt-added-services qa-baggage-summary-services';
        services.setAttribute('aria-label', isAr ? 'الخدمات الإضافية' : 'Additional services');
        services.innerHTML = '<h3>' + (isAr ? 'الخدمات الإضافية' : 'Additional services') + '</h3>';
        var totalRow = summary.querySelector('.qr-mkt-summary-total');
        summary.insertBefore(services, totalRow || null);
      }
      if (!line) {
        line = document.createElement('button');
        line.type = 'button';
        line.className = 'qr-mkt-added-line qa-baggage-summary-line';
        line.setAttribute('data-qa-bag-action', 'picker');
        services.appendChild(line);
      }
      line.setAttribute('aria-label', isAr ? 'تعديل الوزن الإضافي للأمتعة' : 'Edit extra baggage');
      line.innerHTML = '<span>' + (isAr ? 'وزن إضافي للأمتعة' : 'Extra baggage') + ' <b>(' + kilograms + ' ' + (isAr ? 'كجم' : 'kg') + ')</b></span><strong>' + escapeHtml(formatLike(info.reference, baggageAmount)) + '</strong>';
    } else {
      if (line) line.remove();
      if (services && services.classList.contains('qa-baggage-summary-services') && !services.querySelector('.qr-mkt-added-line')) services.remove();
    }

    if (base) {
      var rendered = formatLike(baseText, base.amount + baggageAmount);
      text(grand, rendered);
      grand.dataset.qaBagRenderedText = rendered;
    }
  }

  function syncTraySummary(page, tray, grandText, baggageAmount) {
    var source = page.querySelector('.qr-mkt-summary');
    var host = tray.querySelector('.qa-extras-trip-summary');
    if (!source || !host) return;
    var signature = [source.textContent.replace(/\s+/g, ' ').trim(), readLang(), baggageAmount].join('|');
    if (host.dataset.signature === signature) return;
    var clone = source.cloneNode(true);
    clone.classList.add('qa-extras-summary-clone');
    clone.removeAttribute('style');
    var nativeButtons = Array.prototype.slice.call(source.querySelectorAll('button'));
    Array.prototype.slice.call(clone.querySelectorAll('button')).forEach(function (button, index) {
      button.type = 'button';
      button.setAttribute('data-qa-bag-action', 'summary-native');
      button.setAttribute('data-native-index', String(index));
    });
    var clonedContinue = clone.querySelector('.qr-mkt-continue');
    if (clonedContinue) clonedContinue.remove();
    var cloneGrand = clone.querySelector('.qr-mkt-summary-total strong');
    var parsedGrand = money(grandText);
    if (cloneGrand && parsedGrand) cloneGrand.textContent = formatLike(grandText, parsedGrand.amount + baggageAmount);
    host.replaceChildren(clone);
    host.dataset.signature = signature;
    tray.dataset.nativeButtonCount = String(nativeButtons.length);
  }

  function setTrayOpen(open) {
    var tray = document.querySelector('.qa-extras-mobile-tray');
    if (!tray) return;
    state.trayOpen = !!open;
    tray.classList.toggle('is-open', state.trayOpen);
    var toggle = tray.querySelector('.qa-extras-tray-toggle');
    if (toggle) {
      toggle.setAttribute('aria-expanded', state.trayOpen ? 'true' : 'false');
      toggle.setAttribute('aria-label', state.trayOpen ? (state.isAr ? 'إغلاق ملخص الرحلة' : 'Close trip summary') : (state.isAr ? 'فتح ملخص الرحلة' : 'Open trip summary'));
    }
    document.documentElement.classList.toggle('qa-extras-summary-open', state.trayOpen);
    var scrim = document.querySelector('.qa-extras-tray-scrim');
    if (state.trayOpen && !scrim) {
      scrim = document.createElement('button');
      scrim.type = 'button';
      scrim.className = 'qa-extras-tray-scrim';
      scrim.setAttribute('data-qa-bag-action', 'summary-close');
      scrim.setAttribute('aria-label', state.isAr ? 'إغلاق الملخص' : 'Close summary');
      document.body.appendChild(scrim);
    } else if (!state.trayOpen && scrim) {
      scrim.remove();
    }
  }

  function bindTrayGestures(tray) {
    if (!tray || tray.dataset.gesturesBound === '1') return;
    tray.dataset.gesturesBound = '1';
    var startY = 0;
    var active = false;
    tray.addEventListener('touchstart', function (event) {
      if (!event.touches || !event.touches[0]) return;
      if (!event.target.closest('.qa-extras-tray-toggle')) return;
      startY = event.touches[0].clientY;
      active = true;
    }, { passive: true });
    tray.addEventListener('touchend', function (event) {
      if (!active || !event.changedTouches || !event.changedTouches[0]) return;
      var distance = event.changedTouches[0].clientY - startY;
      active = false;
      if (Math.abs(distance) < 35) return;
      setTrayOpen(distance < 0);
    }, { passive: true });
  }

  function ensureTray(page, isAr) {
    var tray = document.querySelector('.qa-extras-mobile-tray');
    if (!mobile()) {
      if (tray) tray.remove();
      var oldScrim = document.querySelector('.qa-extras-tray-scrim');
      if (oldScrim) oldScrim.remove();
      document.documentElement.classList.remove('qa-extras-summary-open');
      return;
    }
    if (!tray) {
      tray = document.createElement('section');
      tray.className = 'qa-extras-mobile-tray';
      tray.innerHTML = '<button type="button" class="qa-extras-tray-toggle" data-qa-bag-action="summary-toggle" aria-expanded="false"><span class="qa-extras-tray-handle" aria-hidden="true"></span></button><div class="qa-extras-trip-summary"></div><div class="qa-extras-total-row"><span class="qa-extras-total-label"></span><span class="qa-extras-total-values"><span class="qa-extras-added-amount"></span><strong class="qa-extras-grand-total"></strong></span></div><button type="button" class="qa-extras-tray-continue" data-qa-bag-action="continue"></button>';
      document.body.appendChild(tray);
    }
    tray.setAttribute('dir', isAr ? 'rtl' : 'ltr');
    tray.setAttribute('aria-label', isAr ? 'ملخص الرحلة والمبلغ' : 'Trip and amount summary');
    text(tray.querySelector('.qa-extras-total-label'), isAr ? 'المبلغ الإجمالي' : 'Total amount');
    text(tray.querySelector('.qa-extras-tray-continue'), isAr ? 'متابعة' : 'Continue');
    var toggle = tray.querySelector('.qa-extras-tray-toggle');
    if (toggle) toggle.setAttribute('aria-label', isAr ? 'فتح ملخص الرحلة' : 'Open trip summary');

    var grandSource = page.querySelector('.qr-mkt-summary-total strong');
    var fareSource = page.querySelector('.qr-mkt-summary-flight > span');
    var grandText = grandSource ? (grandSource.dataset.qaBagBaseText || grandSource.textContent.trim()) : '';
    var fareText = fareSource ? fareSource.textContent.trim() : '';
    var grand = money(grandText);
    var fare = money(fareText);
    var info = currencyInfo(page);
    var nativeExtras = grand && fare ? Math.max(0, grand.amount - fare.amount) : 0;
    var baggage = selectedQar() * info.rate;
    text(tray.querySelector('.qa-extras-added-amount'), formatLike(grandText || fareText || info.reference, nativeExtras + baggage));
    text(tray.querySelector('.qa-extras-grand-total'), formatLike(grandText || info.reference, (grand ? grand.amount : 0) + baggage));
    syncTraySummary(page, tray, grandText, baggage);
    bindTrayGestures(tray);
    setTrayOpen(state.trayOpen);
  }

  function persistSelection() {
    var page = document.querySelector('.qr-mkt');
    var totalQar = selectedQar();
    if (totalQar > 0) {
      var info = currencyInfo(page);
      localStorage.setItem(BAGGAGE_KEY, JSON.stringify({
        byLeg: state.selectedByLeg,
        priceQAR: totalQar,
        amountCurrent: totalQar * info.rate,
        currencyReference: info.reference,
        labelAr: 'وزن إضافي للأمتعة',
        labelEn: 'Extra baggage'
      }));
    } else {
      localStorage.removeItem(BAGGAGE_KEY);
    }
  }

  function mergeMarketplaceExtras() {
    var bag = readJson(BAGGAGE_KEY, null);
    var extras = readJson('marketplaceExtras', {});
    extras = extras && typeof extras === 'object' ? extras : {};
    var previous = extras.extraBaggage || {};
    var baseQar = Math.max(0, Number(extras.totalQAR || 0) - Number(previous.priceQAR || 0));
    var baseCurrent = Math.max(0, Number(extras.total || 0) - Number(previous.amountCurrent || 0));
    if (!bag || !bag.priceQAR) {
      delete extras.extraBaggage;
      extras.totalQAR = baseQar;
      extras.total = baseCurrent;
      localStorage.setItem('marketplaceExtras', JSON.stringify(extras));
      return;
    }
    extras.extraBaggage = bag;
    extras.totalQAR = baseQar + Number(bag.priceQAR || 0);
    extras.total = baseCurrent + Number(bag.amountCurrent || bag.priceQAR || 0);
    localStorage.setItem('marketplaceExtras', JSON.stringify(extras));
  }

  function nativeContinue(page) {
    persistSelection();
    var nativeButton = page.querySelector('.qr-mkt-continue');
    if (nativeButton) {
      nativeButton.click();
      setTimeout(mergeMarketplaceExtras, 0);
    }
  }

  function panelShell(kind, isAr, body) {
    return '<div class="qa-bag-backdrop" data-qa-bag-action="close"></div>' +
      '<section class="qa-bag-sheet qa-bag-sheet--' + kind + '" dir="' + (isAr ? 'rtl' : 'ltr') + '" role="dialog" aria-modal="true">' +
        '<div class="qa-bag-handle" aria-hidden="true"></div>' + body +
      '</section>';
  }

  function promoCard(isAr) {
    return '<button type="button" class="qa-bag-benefit" data-qa-bag-action="benefit"><span class="qa-bag-benefit-icon">' + icon('diamond') + '</span><span class="qa-bag-benefit-copy"><strong>' + (isAr ? 'مزايا لأعضاء نادي الامتياز' : 'Privilege Club member benefits') + '</strong><small>' + (isAr ? 'اطلع على وزن الأمتعة الإضافي المسموح به لفئتك.' : 'View the extra baggage allowance for your tier.') + '</small></span><span class="qa-bag-benefit-arrow">' + icon('chevron') + '</span></button>';
  }

  function allowanceLeg(leg, index, isAr, passenger) {
    return '<article class="qa-bag-allowance-leg">' +
      '<header><h3>' + escapeHtml(routeLabel(leg)) + '</h3><p>' + escapeHtml(dateLabel(leg && leg.date)) + '</p></header>' +
      '<div class="qa-bag-passenger"><span class="qa-bag-avatar">' + escapeHtml(passenger.initials) + '</span><span><strong>' + escapeHtml(passenger.name) + '</strong><small>' + (isAr ? 'بالغ | الدرجة السياحية' : 'Adult | Economy Class') + '</small></span></div>' +
      '<div class="qa-bag-allowance-line"><span class="qa-bag-line-icon">' + icon('checked') + '</span><span>' + (isAr ? 'الأمتعة المسجلة: 30kg' : 'Checked baggage: 30kg') + '</span></div>' +
      '<div class="qa-bag-allowance-line"><span class="qa-bag-line-icon">' + icon('cabin') + '</span><span>' + (isAr ? 'حقائب اليد: piece 1, 7kg' : 'Cabin baggage: 1 piece, 7kg') + '</span></div>' +
    '</article>';
  }

  function renderAllowance(layer, isAr) {
    var data = routeData();
    var passenger = passengerData();
    var legs = data.legs.length ? data.legs : [{ origin: 'DOH', destination: 'AMM', date: '' }];
    var body = '<header class="qa-bag-sheet-header"><button type="button" class="qa-bag-close" data-qa-bag-action="close" aria-label="' + (isAr ? 'إغلاق' : 'Close') + '">' + icon('close') + '</button><h2>' + (isAr ? 'وزن الأمتعة المسموح به' : 'Baggage allowance') + '</h2></header>' +
      '<div class="qa-bag-scroll">' + promoCard(isAr) + '<div class="qa-bag-allowance-list">' + legs.map(function (leg, index) { return allowanceLeg(leg, index, isAr, passenger); }).join('') + '</div></div>';
    layer.innerHTML = panelShell('allowance', isAr, body);
  }

  function weightRows(page, isAr, legIndex) {
    var current = Number(state.draftByLeg[legIndex]) || 0;
    return weights.map(function (kg) {
      if (kg === 0) {
        return '<button type="button" class="qa-bag-weight-row' + (current === 0 ? ' is-selected' : '') + '" data-qa-bag-action="weight" data-leg="' + legIndex + '" data-kg="0"><span>' + (isAr ? 'لا يوجد وزن إضافي' : 'No extra baggage') + '</span></button>';
      }
      return '<button type="button" class="qa-bag-weight-row' + (current === kg ? ' is-selected' : '') + '" data-qa-bag-action="weight" data-leg="' + legIndex + '" data-kg="' + kg + '"><span>' + kg + ' ' + (isAr ? 'كجم' : 'kg') + '</span><span class="qa-bag-weight-prices"><del>' + escapeHtml(formatQar(page, oldPriceQar(kg))) + '</del><strong>' + escapeHtml(formatQar(page, currentPriceQar(kg))) + '</strong></span></button>';
    }).join('');
  }

  function pickerLeg(page, leg, index, isAr, passenger) {
    var open = state.activeLeg === index;
    var listOpen = open && state.weightListOpen;
    var currentKg = Number(state.draftByLeg[index]) || 0;
    var selectorText = currentKg > 0 ? currentKg + ' ' + (isAr ? 'كجم' : 'kg') : (isAr ? 'حدد الوزن' : 'Select weight');
    return '<article class="qa-bag-picker-leg' + (open ? ' is-open' : '') + (listOpen ? ' is-list-open' : '') + '">' +
      '<button type="button" class="qa-bag-leg-trigger" data-qa-bag-action="leg" data-leg="' + index + '"><span class="qa-bag-leg-toggle">' + icon(open ? 'up' : 'down') + '</span><span><strong>' + escapeHtml(routeLabel(leg)) + '</strong><small>' + escapeHtml(dateLabel(leg && leg.date)) + '</small></span></button>' +
      (open ? '<div class="qa-bag-leg-body"><div class="qa-bag-passenger"><span class="qa-bag-avatar">' + escapeHtml(passenger.initials) + '</span><span><strong>' + escapeHtml(passenger.name) + '</strong></span></div><button type="button" class="qa-bag-weight-select" data-qa-bag-action="weights" data-leg="' + index + '" aria-expanded="' + (listOpen ? 'true' : 'false') + '"><span>' + selectorText + '</span><span>' + icon(listOpen ? 'up' : 'down') + '</span></button>' + (listOpen ? '<div class="qa-bag-weight-list">' + weightRows(page, isAr, index) + '</div>' : '') + '</div>' : '') +
    '</article>';
  }

  function renderPicker(layer, page, isAr) {
    var data = routeData();
    var passenger = passengerData();
    var legs = data.legs.length ? data.legs : [{ origin: 'DOH', destination: 'AMM', date: '' }];
    if (state.activeLeg >= legs.length) state.activeLeg = 0;
    var total = formatQar(page, selectionTotal(state.draftByLeg));
    var body = '<header class="qa-bag-sheet-header"><button type="button" class="qa-bag-close" data-qa-bag-action="close" aria-label="' + (isAr ? 'إغلاق' : 'Close') + '">' + icon('close') + '</button><h2>' + (isAr ? 'وزن إضافي للأمتعة' : 'Extra baggage') + '</h2></header>' +
      '<div class="qa-bag-scroll qa-bag-picker-scroll"><button type="button" class="qa-bag-dimension-link" data-qa-bag-action="dimensions"><span class="qa-bag-dimension-icon">' + icon('bag') + '</span><span><strong>' + (isAr ? 'وزن الأمتعة والأبعاد المسموحة' : 'Baggage weight and allowed dimensions') + '</strong><small>' + (isAr ? 'يمكنك شراء ما يصل إلى 25 كجم. يرجى مراجعة أبعاد الأمتعة.' : 'You can purchase up to 25 kg. Please review the baggage dimensions.') + '</small></span><span class="qa-bag-dimension-arrow">' + icon('chevron') + '</span></button><div class="qa-bag-picker-list">' + legs.map(function (leg, index) { return pickerLeg(page, leg, index, isAr, passenger); }).join('') + '</div></div>' +
      '<footer class="qa-bag-confirm"><div><span>' + (isAr ? 'الإجمالي' : 'Total') + '</span><strong>' + escapeHtml(total) + '</strong></div><button type="button" data-qa-bag-action="confirm">' + (isAr ? 'تأكيد' : 'Confirm') + '</button></footer>';
    layer.innerHTML = panelShell('picker', isAr, body);
  }

  function renderDimensions(layer, isAr) {
    var body = '<header class="qa-bag-sheet-header qa-bag-dim-header"><button type="button" class="qa-bag-close" data-qa-bag-action="close" aria-label="' + (isAr ? 'إغلاق' : 'Close') + '">' + icon('close') + '</button><h2>' + (isAr ? 'أبعاد الحقيبة' : 'Baggage dimensions') + '</h2><button type="button" class="qa-bag-back" data-qa-bag-action="picker-back" aria-label="' + (isAr ? 'رجوع' : 'Back') + '">' + icon('back') + '</button></header>' +
      '<div class="qa-bag-dim-body"><h3>' + (isAr ? 'الحد الأقصى للأبعاد (عمق + عرض + ارتفاع)' : 'Maximum dimensions (depth + width + height)') + '</h3><p>' + (isAr ? 'يجب ألا يتجاوز إجمالي أبعاد الحقيبة 158 سم.' : 'The total baggage dimensions must not exceed 158 cm.') + '</p>' + suitcaseIllustration() + '</div>';
    layer.innerHTML = panelShell('dimensions', isAr, body);
  }

  function openPanel(kind, page) {
    var layer = document.querySelector('.qa-bag-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'qa-bag-layer';
      document.body.appendChild(layer);
    }
    state.panel = kind;
    state.isAr = readLang() === 'ar';
    document.documentElement.classList.add('qa-bag-open');
    if (kind === 'allowance') renderAllowance(layer, state.isAr);
    else if (kind === 'dimensions') renderDimensions(layer, state.isAr);
    else renderPicker(layer, page, state.isAr);
  }

  function revealWeightOptions(legIndex) {
    requestAnimationFrame(function () {
      var sheet = document.querySelector('.qa-bag-sheet--picker');
      var scroll = sheet && sheet.querySelector('.qa-bag-scroll');
      var list = sheet && sheet.querySelector('.qa-bag-weight-list');
      var confirm = sheet && sheet.querySelector('.qa-bag-confirm');
      if (!scroll || !list || !confirm) return;
      var listBottom = list.getBoundingClientRect().bottom;
      var visibleBottom = confirm.getBoundingClientRect().top - 8;
      if (listBottom > visibleBottom) scroll.scrollTop += listBottom - visibleBottom;
      var selector = sheet.querySelector('.qa-bag-weight-select[data-leg="' + legIndex + '"]');
      if (selector) selector.focus({ preventScroll: true });
    });
  }

  function closePanel() {
    var layer = document.querySelector('.qa-bag-layer');
    if (layer) layer.remove();
    state.panel = '';
    document.documentElement.classList.remove('qa-bag-open');
  }

  function handleAction(event) {
    var control = event.target.closest('[data-qa-bag-action]');
    if (!control) return;
    var action = control.getAttribute('data-qa-bag-action');
    var page = document.querySelector('.qr-mkt');
    if (!page && action !== 'close') return;
    event.preventDefault();

    if (action === 'summary-toggle') setTrayOpen(!state.trayOpen);
    else if (action === 'summary-close') setTrayOpen(false);
    else if (action === 'summary-native') {
      var nativeIndex = Number(control.getAttribute('data-native-index'));
      var nativeButtons = page ? page.querySelectorAll('.qr-mkt-summary button') : [];
      setTrayOpen(false);
      if (nativeButtons[nativeIndex]) nativeButtons[nativeIndex].click();
    } else if (action === 'allowance') openPanel('allowance', page);
    else if (action === 'picker') {
      state.draftByLeg = Object.assign({}, state.selectedByLeg);
      state.activeLeg = 0;
      state.weightListOpen = false;
      openPanel('picker', page);
    } else if (action === 'dimensions') openPanel('dimensions', page);
    else if (action === 'picker-back') openPanel('picker', page);
    else if (action === 'close') closePanel();
    else if (action === 'benefit') return;
    else if (action === 'leg') {
      var legIndex = Number(control.getAttribute('data-leg'));
      state.activeLeg = state.activeLeg === legIndex ? -1 : legIndex;
      state.weightListOpen = false;
      openPanel('picker', page);
    } else if (action === 'weights') {
      var selectorLeg = Number(control.getAttribute('data-leg')) || 0;
      if (state.activeLeg !== selectorLeg) state.activeLeg = selectorLeg;
      state.weightListOpen = !state.weightListOpen;
      openPanel('picker', page);
      if (state.weightListOpen) revealWeightOptions(selectorLeg);
    } else if (action === 'weight') {
      var weightLeg = Number(control.getAttribute('data-leg')) || 0;
      state.draftByLeg[weightLeg] = Number(control.getAttribute('data-kg')) || 0;
      state.weightListOpen = false;
      openPanel('picker', page);
    } else if (action === 'confirm') {
      state.selectedByLeg = Object.assign({}, state.draftByLeg);
      persistSelection();
      closePanel();
      schedule();
    } else if (action === 'continue') nativeContinue(page);
  }

  function cleanupOutsideExtras() {
    var tray = document.querySelector('.qa-extras-mobile-tray');
    if (tray) tray.remove();
    var scrim = document.querySelector('.qa-extras-tray-scrim');
    if (scrim) scrim.remove();
    state.trayOpen = false;
    document.documentElement.classList.remove('qa-extras-summary-open');
    closePanel();
  }

  function bindNativeContinue(page) {
    var button = page.querySelector('.qr-mkt-continue');
    if (!button || button.dataset.qaBagBound === '1') return;
    button.dataset.qaBagBound = '1';
    button.addEventListener('click', function () {
      persistSelection();
      setTimeout(mergeMarketplaceExtras, 0);
    });
  }

  function enhance() {
    scheduled = false;
    var path = location.pathname.replace(/\/$/, '');
    var page = document.querySelector('.qr-mkt');
    if (path !== '/extras') {
      cleanupOutsideExtras();
      return;
    }
    if (!page) return;

    state.isAr = readLang() === 'ar';
    var stored = readJson(BAGGAGE_KEY, null);
    if (stored && stored.byLeg && typeof stored.byLeg === 'object') state.selectedByLeg = Object.assign({}, stored.byLeg);
    else if (stored && weights.indexOf(Number(stored.kg)) !== -1) state.selectedByLeg = { 0: Number(stored.kg) };
    page.classList.add('qa-extras-enhanced');
    ensureHeader(page, state.isAr);
    ensureBaggageCard(page, state.isAr);
    ensureSeatImage(page, state.isAr);
    syncNativeSummaryBaggage(page, state.isAr);
    ensureTray(page, state.isAr);
    bindNativeContinue(page);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(enhance);
  }

  document.addEventListener('click', handleAction);
  document.addEventListener('DOMContentLoaded', schedule);
  window.addEventListener('pageshow', schedule);
  window.addEventListener('resize', schedule);
  window.addEventListener('storage', schedule);
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  schedule();
})();
