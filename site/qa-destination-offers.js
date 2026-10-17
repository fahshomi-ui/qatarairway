(() => {
  'use strict';
  // "Latest flight offers" cards — same data, layout and markup as qatarairways.com.
  // Live data: /qa-live-offers/{ar|en}.json (Netlify proxy to the official homepage JSON).
  // Instant render from the last copy (visitor cache, else the bundled snapshot), then refresh live.
  const QR = 'https://www.qatarairways.com';
  const SNAP_AT = '2026-10-17T19:35:00Z';
  const SNAP = {"ar":{"items":[{"iata":"CAN","title":"غوانزو","h2":"/content/dam/images/renditions/horizontal-2/destinations/china/guangzhou-/h2-guangzhou-resumption.jpg","sq":"/content/dam/images/renditions/square/destinations/china/guangzhou/s-guangzhou-resumption.jpg"},{"iata":"LHR","title":"لندن","h2":"/content/dam/images/renditions/horizontal-2/destinations/united-kingdom/london/h2-london-primary.jpg","sq":"/content/dam/images/renditions/square/destinations/united-kingom/london/s-london-outdoor.jpg"},{"iata":"HKT","title":"بوكيت","h2":"/content/dam/images/renditions/horizontal-2/destinations/thailand/phuket/h2-phuket.jpg","sq":"/content/dam/images/renditions/square/destinations/thailand/phuket/s-phuket.jpg"},{"iata":"CAI","title":"القاهرة","h2":"/content/dam/images/renditions/horizontal-2/destinations/egypt/cairo/h2-cairo.jpg","sq":"/content/dam/images/renditions/square/destinations/egypt/cairo/s-egypt-pyramids-camels.jpg"},{"iata":"AMM","title":"عمّان","h2":"/content/dam/images/renditions/horizontal-2/destinations/jordan-/amman/h2-amman.jpg","sq":"/content/dam/images/renditions/square/destinations/jordan-/amman/s-amman.jpg"},{"iata":"BEY","title":"بيروت","h2":"/content/dam/images/renditions/horizontal-2/destinations/lebanon/beirut/h2-beirut.jpg","sq":"/content/dam/images/renditions/square/destinations/lebanon-/s-beirut.jpg"},{"iata":"MXP","title":"ميلان","h2":"/content/dam/images/renditions/horizontal-2/destinations/italy/milan/h2-milan-culture-primary.jpg","sq":"/content/dam/images/renditions/square/destinations/italy/milan/s-milan-outdoor.jpg"},{"iata":"JFK","title":"مدينة نيويورك","h2":"/content/dam/images/renditions/horizontal-2/destinations/united-states/new-york/h2-new-york-city.jpg","sq":"/content/dam/images/renditions/square/destinations/united-states/new-york/s-new-york-city.jpg"},{"iata":"BKK","title":"بانكوك","h2":"/content/dam/images/renditions/horizontal-2/destinations/thailand/bangkok/h2-bangkok.jpg","sq":"/content/dam/images/renditions/square/destinations/thailand/bangkok-/s-bangkok.jpg"}],"fares":{"CAN":{"ONE_WAY|ECONOMY":["2026-11-07","",3420],"ONE_WAY|PREMIUM":["2026-11-16","",13580],"RETURN|ECONOMY":["2026-11-07","2026-11-23",5420],"RETURN|PREMIUM":["2026-11-15","2026-12-06",17890]},"LHR":{"ONE_WAY|ECONOMY":["2026-11-06","",1850],"ONE_WAY|PREMIUM":["2026-11-06","",7920],"RETURN|ECONOMY":["2026-10-19","2026-10-27",3690],"RETURN|PREMIUM":["2026-11-05","2026-11-29",13840]},"HKT":{"ONE_WAY|ECONOMY":["2026-11-22","",2580],"ONE_WAY|PREMIUM":["2026-11-29","",6960],"RETURN|ECONOMY":["2027-02-14","2027-02-24",4210],"RETURN|PREMIUM":["2026-11-08","2026-11-12",9180]},"CAI":{"ONE_WAY|ECONOMY":["2026-11-02","",780],"ONE_WAY|PREMIUM":["2026-11-01","",2690],"RETURN|ECONOMY":["2026-11-08","2026-12-03",1390],"RETURN|PREMIUM":["2026-11-08","2026-12-03",3240]},"AMM":{"ONE_WAY|ECONOMY":["2026-11-01","",680],"ONE_WAY|PREMIUM":["2026-10-21","",3370],"RETURN|ECONOMY":["2026-11-01","2026-11-05",1630],"RETURN|PREMIUM":["2026-10-21","2026-10-24",5610]},"BEY":{"ONE_WAY|ECONOMY":["2026-11-01","",1210],"ONE_WAY|PREMIUM":["2026-10-19","",2940],"RETURN|ECONOMY":["2026-11-01","2026-11-03",2020],"RETURN|PREMIUM":["2026-10-19","2026-10-22",4450]},"MXP":{"ONE_WAY|ECONOMY":["2026-11-13","",2280],"ONE_WAY|PREMIUM":["2026-11-01","",9230],"RETURN|ECONOMY":["2026-11-06","2026-11-11",3720],"RETURN|PREMIUM":["2026-11-01","2026-11-12",14810]},"JFK":{"ONE_WAY|ECONOMY":["2026-11-19","",3390],"ONE_WAY|PREMIUM":["2027-02-27","",11150],"RETURN|ECONOMY":["2026-10-19","2026-10-24",5440],"RETURN|PREMIUM":["2027-02-18","2027-02-27",17760]},"BKK":{"ONE_WAY|ECONOMY":["2026-11-16","",2300],"ONE_WAY|PREMIUM":["2026-11-15","",6960],"RETURN|ECONOMY":["2026-11-16","2026-11-18",3790],"RETURN|PREMIUM":["2026-11-05","2026-11-13",9180]}}},"en":{"items":[{"iata":"CAN","title":"Guangzhou","h2":"/content/dam/images/renditions/horizontal-2/destinations/china/guangzhou-/h2-guangzhou-resumption.jpg","sq":"/content/dam/images/renditions/square/destinations/china/guangzhou/s-guangzhou-resumption.jpg"},{"iata":"LHR","title":"London","h2":"/content/dam/images/renditions/horizontal-2/destinations/united-kingdom/london/h2-london-primary.jpg","sq":"/content/dam/images/renditions/square/destinations/united-kingom/london/s-london-outdoor.jpg"},{"iata":"CAI","title":"Cairo","h2":"/content/dam/images/renditions/horizontal-2/destinations/egypt/cairo/h2-cairo.jpg","sq":"/content/dam/images/renditions/square/destinations/egypt/cairo/s-egypt-pyramids-camels.jpg"},{"iata":"BKK","title":"Bangkok","h2":"/content/dam/images/renditions/horizontal-2/destinations/thailand/bangkok/h2-bangkok.jpg","sq":"/content/dam/images/renditions/square/destinations/thailand/bangkok-/s-bangkok.jpg"},{"iata":"CMB","title":"Colombo","h2":"/content/dam/images/renditions/horizontal-2/destinations/sri-lanka/colombo/h2-colombo-primary.jpg","sq":"/content/dam/images/renditions/square/destinations/sri-lanka/colombo/s-colombo-primary.jpg"},{"iata":"MNL","title":"Manila","h2":"/content/dam/images/renditions/horizontal-2/destinations/philippines/manila/h2-manila.jpg","sq":"/content/dam/images/renditions/square/destinations/philippines/manila/s-manila-primary.jpg"},{"iata":"AMM","title":"Amman","h2":"/content/dam/images/renditions/horizontal-2/destinations/jordan-/amman/h2-amman.jpg","sq":"/content/dam/images/renditions/square/destinations/jordan-/amman/s-amman.jpg"},{"iata":"MXP","title":"Milan","h2":"/content/dam/images/renditions/horizontal-2/destinations/italy/milan/h2-milan-culture-primary.jpg","sq":"/content/dam/images/renditions/square/destinations/italy/milan/s-milan-outdoor.jpg"},{"iata":"CDG","title":"Paris","h2":"/content/dam/images/renditions/horizontal-2/destinations/france/paris/h2-paris.jpg","sq":"/content/dam/images/renditions/square/destinations/france/paris-/s-paris.jpg"}],"fares":{"CAN":{"ONE_WAY|ECONOMY":["2026-11-07","",3420],"ONE_WAY|PREMIUM":["2026-11-16","",13580],"RETURN|ECONOMY":["2026-11-07","2026-11-23",5420],"RETURN|PREMIUM":["2026-11-15","2026-12-06",17890]},"LHR":{"ONE_WAY|ECONOMY":["2026-11-06","",1850],"ONE_WAY|PREMIUM":["2026-11-06","",7920],"RETURN|ECONOMY":["2026-10-19","2026-10-27",3690],"RETURN|PREMIUM":["2026-11-05","2026-11-29",13840]},"CAI":{"ONE_WAY|ECONOMY":["2026-11-02","",780],"ONE_WAY|PREMIUM":["2026-11-01","",2690],"RETURN|ECONOMY":["2026-11-08","2026-12-03",1390],"RETURN|PREMIUM":["2026-11-08","2026-12-03",3240]},"BKK":{"ONE_WAY|ECONOMY":["2026-11-16","",2300],"ONE_WAY|PREMIUM":["2026-11-15","",6960],"RETURN|ECONOMY":["2026-11-16","2026-11-18",3790],"RETURN|PREMIUM":["2026-11-05","2026-11-13",9180]},"CMB":{"ONE_WAY|ECONOMY":["2026-11-04","",1090],"ONE_WAY|PREMIUM":["2026-11-01","",2430],"RETURN|ECONOMY":["2026-11-01","2026-11-06",1970],"RETURN|PREMIUM":["2026-11-01","2026-11-04",4140]},"MNL":{"ONE_WAY|ECONOMY":["2027-01-20","",1400],"ONE_WAY|PREMIUM":["2026-11-26","",3280],"RETURN|ECONOMY":["2026-10-23","2026-10-27",2410],"RETURN|PREMIUM":["2026-11-05","2026-11-09",5340]},"AMM":{"ONE_WAY|ECONOMY":["2026-11-01","",680],"ONE_WAY|PREMIUM":["2026-10-21","",3370],"RETURN|ECONOMY":["2026-11-01","2026-11-05",1630],"RETURN|PREMIUM":["2026-10-21","2026-10-24",5610]},"MXP":{"ONE_WAY|ECONOMY":["2026-11-13","",2280],"ONE_WAY|PREMIUM":["2026-11-01","",9230],"RETURN|ECONOMY":["2026-11-06","2026-11-11",3720],"RETURN|PREMIUM":["2026-11-01","2026-11-12",14810]},"CDG":{"ONE_WAY|ECONOMY":["2026-11-07","",1870],"ONE_WAY|PREMIUM":["2026-11-07","",8150],"RETURN|ECONOMY":["2026-11-07","2026-11-12",3270],"RETURN|PREMIUM":["2026-11-06","2026-11-11",13330]}}}};
  const CACHE_KEY = 'qaLiveOffers:v2:';
  const CACHE_MAX_AGE = 3 * 24 * 3600 * 1000;
  // official layout table (/content/Qatar/common/json/variation-v1.json): [cols, teaserId, rendition]
  const H2 = 'h2', SQ = 'sq';
  const LAYOUTS = [
    [['bigcard', '', H2]],
    [['bigcard', '', H2], ['single cardtwo', '1', H2]],
    [['cardone small', '', H2], ['cardtwo small', '2', SQ], ['cardthree small', '2', SQ]],
    [['bigcard', '', H2], ['single cardtwo', '1', H2], [' single cardthree', '2', H2], ['single cardfour', '3', H2]],
    [['bigcard', '', H2], ['small cardtwo', '1', SQ], ['small cardthree', '1', SQ], ['single cardfour', '2', H2], ['single cardfive', '2', H2]],
    [['bigcard', '', H2], ['small cardtwo', '1', SQ], ['small cardthree', '1', SQ], ['single cardfour', '2', H2], ['single cardfive', '3', H2]],
    [['bigcard', '', H2], ['single cardtwo', '1', H2], ['single cardthree', '2', H2], ['small cardfour', '3', SQ], ['small cardfive', '3', SQ], ['cardsix single', '4', H2], ['cardseven single', '5', H2]],
    [['bigcard', '', H2], ['cardtwo small', '1', SQ], ['cardthree small', '1', SQ], ['cardfour single', '2', H2], ['cardfive single', '3', H2], ['cardsix small', '4', SQ], ['cardseven small', '4', SQ], ['cardeight single', '5', H2]],
    [['bigcard', '1', H2], ['cardtwo small', '2', SQ], ['cardthree small', '2', SQ], ['cardfour small', '3', SQ], ['cardfive small', '3', SQ], ['cardsix single', '4', H2], ['cardseven single', '5', H2], ['cardeight small', '6', SQ], ['cardnine small', '6', SQ]]
  ];
  const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const MONTHS_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // admin discount (same state/cache as the booking & package pages): official price struck in red + discounted price
  const DISC_KEY = 'qa_disc_v1';
  const DISC = { on: false, rate: 0.35 };
  try {
    const c = JSON.parse(localStorage.getItem(DISC_KEY) || 'null');
    if (c) { DISC.on = c.on === true; if (c.rate > 0 && c.rate < 1) DISC.rate = c.rate; }
  } catch (e) {}
  const MODAL = '<div class="modal"><div class="modal-content"><div class="modal-header"><span class="close" aria-label="Close"></span></div><div class="overlayResponsive"></div></div></div>';

  function isEnglish() { return document.body.classList.contains('newhome-en') || document.documentElement.lang.toLowerCase().startsWith('en'); }
  function lang() { return isEnglish() ? 'en' : 'ar'; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function todayIso() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function formatDate(value) {
    const [year, month, day] = value.split('-');
    const months = isEnglish() ? MONTHS_SHORT_EN : MONTHS_AR;
    return `${day} ${months[Number(month) - 1]} ${year}`;
  }
  function bookingUrl(code, trip, cabin, outbound, inbound) {
    const params = new URLSearchParams({
      tripType: trip === 'ONE_WAY' ? 'oneway' : 'round',
      origin: 'DOH',
      destination: code,
      date: outbound,
      cabin: cabin === 'PREMIUM' ? 'B' : 'E',
      adult: '1',
      child: '0',
      infant: '0'
    });
    if (inbound) params.set('returnDate', inbound);
    return `${location.origin}/flight-search?${params.toString()}`;
  }

  // official JSON -> compact { items:[{iata,title,h2,sq}], fares:{IATA:{'RETURN|ECONOMY':[out,in,fare]}} }
  function parseLive(d) {
    const raw = d && d.destnRepoData && d.destnRepoData.DOH;
    const pr = d && Array.isArray(d.pricingResponse) && d.pricingResponse[0];
    if (!Array.isArray(raw) || !raw.length || !pr || !pr.destinationFares) return null;
    const items = [];
    for (const x of raw) {
      try {
        const i = typeof x === 'string' ? JSON.parse(x.replace(/'/g, '"')) : x;
        if (i && i.destinationIata) items.push({ iata: i.destinationIata, title: i.destinationTitle || i.destinationIata, h2: i.horizontalImage2 || '', sq: i.squareImage || '' });
      } catch (e) {}
    }
    const fares = {};
    for (const [code, arr] of Object.entries(pr.destinationFares)) {
      const f = {};
      for (const e of arr || []) {
        if (!e || !e.tripType || !e.cabinClass || !e.outboundDate || !(Number(e.lowestFare) > 0)) continue;
        f[`${e.tripType}|${e.cabinClass === 'PREMIUIM' ? 'PREMIUM' : e.cabinClass}`] = [e.outboundDate, e.inboundDate || '', Math.round(Number(e.lowestFare))];
      }
      fares[code] = f;
    }
    const withFares = items.filter(i => fares[i.iata]);
    return withFares.length ? { items: withFares, fares } : null;
  }
  function readCache(l) {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY + l) || 'null');
      if (c && c.items && c.items.length && c.fares && Date.now() - c.at < CACHE_MAX_AGE && c.at > Date.parse(SNAP_AT)) return c;
    } catch (e) {}
    return null;
  }
  function writeCache(l, data) {
    try { localStorage.setItem(CACHE_KEY + l, JSON.stringify(Object.assign({ at: Date.now() }, data))); } catch (e) {}
  }

  function init() {
    const section = document.querySelector('.destinationpricecomponent');
    if (!section || section.dataset.qaOfferSync === 'ready') return;
    const tripLinks = [...section.querySelectorAll('.dpc-triptype a[data-value]')];
    const cabinButton = section.querySelector('#cabinClass');
    const wrapper = section.querySelector('.post-content-wrapper');
    if (tripLinks.length < 2 || !cabinButton || !wrapper) return;
    section.dataset.qaOfferSync = 'ready';
    let trip = tripLinks.find(link => link.classList.contains('selected'))?.dataset.value === 'oneway' ? 'ONE_WAY' : 'RETURN';
    let cabin = cabinButton.dataset.value === 'premium' ? 'PREMIUM' : 'ECONOMY';
    const data = { ar: readCache('ar') || SNAP.ar, en: readCache('en') || SNAP.en };
    const fetched = {};
    let lastSig = '';

    function labels() {
      const english = isEnglish();
      const title = section.querySelector('.title');
      if (title) title.textContent = english ? 'Latest flight offers' : 'أحدث العروض على تذاكر رحلات الطيران';
      const fromLabel = section.querySelector('label[for="destinationPrice-from"]');
      if (fromLabel?.firstChild) fromLabel.firstChild.nodeValue = english ? 'From' : 'من';
      const fromInput = section.querySelector('#destinationPrice-from');
      if (fromInput) { fromInput.value = english ? 'Doha DOH' : 'الدوحة DOH'; fromInput.dir = english ? 'ltr' : 'rtl'; }
      const autocompleteMenu = section.querySelector('.destination-autocomplete .tt-menu');
      if (autocompleteMenu) autocompleteMenu.dir = english ? 'ltr' : 'rtl';
      tripLinks.forEach(link => { link.textContent = link.dataset.value === 'oneway' ? (english ? 'One way' : 'اتجاه واحد') : (english ? 'Round trip' : 'ذهاب وعودة'); });
      const floating = section.querySelector('.dpc-cabinclass .floating-label');
      if (floating) floating.textContent = english ? 'Class' : 'الدرجة ';
      const economy = section.querySelector('.dpc-cabinclass [data-value="economy"]');
      const premium = section.querySelector('.dpc-cabinclass [data-value="premium"]');
      if (economy) economy.textContent = english ? 'Economy' : 'السياحية';
      if (premium) premium.textContent = english ? 'First/Business' : 'الأولى/الأعمال';
      cabinButton.textContent = english ? (cabin === 'PREMIUM' ? 'First/Business' : 'Economy') : (cabin === 'PREMIUM' ? 'الأولى/الأعمال' : 'السياحية');
    }

    function cardInner(item, rendition, english) {
      const fare = (data[lang()].fares[item.iata] || {})[`${trip}|${cabin}`];
      const valid = fare && fare[0] >= todayIso();
      const imgPath = rendition === SQ ? (item.sq || item.h2) : (item.h2 || item.sq);
      const img = imgPath ? QR + imgPath + (rendition === SQ && item.sq ? '?wid=360&hei=360' : '?wid=733&hei=425') : '';
      const title = esc(item.title);
      let html = `<picture><source srcset="${esc(img)}" media="(min-width: 800px)"><img src="${esc(img)}" alt="${title}"></picture>`;
      html += `<div class="overlay"><div class="carddetails"><div class="row"><div class="col-lg-6 px-0"><span class="destination-title">${title}</span></div></div>`;
      if (valid) {
        const [outbound, inbound, amount] = fare;
        const dates = inbound ? `${formatDate(outbound)} - ${formatDate(inbound)}` : formatDate(outbound);
        const fromText = english ? (cabin === 'PREMIUM' ? 'First/Business from' : 'Economy from') : (cabin === 'PREMIUM' ? 'الدرجة الأولى و درجة رجال الأعمال من' : 'الدرجة السياحية من');
        const disc = DISC.on && DISC.rate > 0 && DISC.rate < 1;
        const was = disc ? `<s class="qa-offer-was" style="display:block;color:#ff6b6b;font-size:14px;line-height:1.3;text-decoration:line-through;text-decoration-thickness:2px">QAR ${amount}</s>` : '';
        const shown = disc ? Math.round(amount * (1 - DISC.rate)) : amount;
        html += `<div class="row"><div class="col-lg-6 px-0"><div class="duration">${dates}</div></div><div class="col-lg-6 px-0 dest-fares">${was}<span class="cardclasstype">${fromText}</span> <span class="cardcost">QAR ${shown}</span></div></div>`;
        html += `<div class="btns-container col-12 px-0"><a class="offer-button-book w-100 mb-1" href="${esc(bookingUrl(item.iata, trip, cabin, outbound, inbound))}">${english ? 'Book now' : 'احجز الآن'}</a>`;
      } else {
        html += '<div class="btns-container col-12 px-0">';
      }
      html += `<a class="offer-button-discover w-100" aria-disabled="true" tabindex="-1">${english ? 'Explore' : 'اكتشف'}</a></div></div></div>`;
      return html;
    }

    function render(force) {
      const english = isEnglish();
      const d = data[lang()];
      if (!d || !d.items || !d.items.length) return;
      const items = d.items.slice(0, LAYOUTS.length);
      const sig = JSON.stringify([lang(), trip, cabin, DISC.on, DISC.rate, items, items.map(i => d.fares[i.iata])]);
      labels();
      section.dataset.qaOfferState = `${trip}|${cabin}`;
      if (!force && sig === lastSig && wrapper.querySelector('.topRow[data-qa-offers]')) return;
      lastSig = sig;
      const layout = LAYOUTS[items.length - 1];
      const row = document.createElement('div');
      row.className = 'flex-rows topRow';
      row.setAttribute('data-qa-offers', '1');
      let html = '';
      const groups = new Map();
      const order = [];
      items.forEach((item, index) => {
        const [cols, teaser, rendition] = layout[index];
        if (index === 0) {
          html += `<div class="flex-rows-child col-12 col-md-6"><div tabindex="0" class="componentcards ${cols}">${cardInner(item, rendition, english)}${MODAL}</div></div>`;
          order.push(null);
          return;
        }
        if (!groups.has(teaser)) { groups.set(teaser, []); order.push(teaser); }
        groups.get(teaser).push(`<div class="flex-rows-child flex-fill ${cols}"><div tabindex="0" class="componentcards">${cardInner(item, rendition, english)}</div>${MODAL}</div>`);
      });
      for (const t of order) {
        if (t === null) continue;
        html += `<div class="flex-rows-child "><div class="flex-rows" id="top-cards-inner-${t}">${groups.get(t).join('')}</div></div>`;
      }
      row.innerHTML = html;
      wrapper.replaceChildren(row);
      section.querySelectorAll('.skeleton-loading').forEach(el => el.classList.add('loaded'));
      section.classList.remove('no-data');
    }

    function refresh(l) {
      if (fetched[l]) return;
      fetched[l] = true;
      const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), 15000) : 0;
      fetch(`${location.origin}/qa-live-offers/${l}.json`, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
        .then(r => (r.ok ? r.json() : null))
        .then(j => {
          const live = parseLive(j);
          if (!live) return;
          data[l] = live;
          writeCache(l, live);
          if (lang() === l) render();
        })
        .catch(() => {})
        .finally(() => clearTimeout(timer));
    }

    section.addEventListener('click', event => {
      const discoverLink = event.target.closest('.offer-button-discover');
      if (discoverLink && section.contains(discoverLink)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      const tripLink = event.target.closest('.dpc-triptype a[data-value]');
      if (tripLink && section.contains(tripLink)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        trip = tripLink.dataset.value === 'oneway' ? 'ONE_WAY' : 'RETURN';
        section.querySelectorAll('.dpc-triptype a[data-value]').forEach(item => item.classList.toggle('selected', item === tripLink));
        render();
        return;
      }
      const option = event.target.closest('.dpc-cabinclass .dropdown-item[data-value]');
      if (option && section.contains(option)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        cabin = option.dataset.value === 'premium' ? 'PREMIUM' : 'ECONOMY';
        cabinButton.dataset.value = option.dataset.value;
        cabinButton.value = cabin === 'PREMIUM' ? 'Premium' : 'Economy';
        cabinButton.setAttribute('aria-expanded', 'false');
        section.querySelectorAll('.dpc-cabinclass .dropdown-item[data-value]').forEach(item => item.setAttribute('aria-selected', item === option ? 'true' : 'false'));
        section.querySelector('.dpc-cabinclass .dropdown-menu')?.classList.remove('show');
        render();
      }
    }, true);

    // keep our cards if another script replaces them, and follow the page language
    let pending = 0;
    const later = () => { clearTimeout(pending); pending = setTimeout(() => { render(); refresh(lang()); }, 50); };
    new MutationObserver(() => { if (!wrapper.querySelector('.topRow[data-qa-offers]')) later(); }).observe(wrapper, { childList: true });
    new MutationObserver(later).observe(document.body, { attributes: true, attributeFilter: ['class'] });

    render(true);
    refresh(lang());
    try {
      fetch(`${window.__QR_LIVE_BASE || (location.origin + '/qr-api')}/api/discount`, { cache: 'no-store' })
        .then(r => r.json())
        .then(d => {
          if (!d || typeof d.enabled !== 'boolean') return;
          const rt = d.rate > 0 && d.rate < 1 ? d.rate : 0.35;
          try { localStorage.setItem(DISC_KEY, JSON.stringify({ on: d.enabled, rate: rt })); } catch (e) {}
          if (d.enabled === DISC.on && rt === DISC.rate) return;
          DISC.on = d.enabled; DISC.rate = rt;
          render(true);
        })
        .catch(() => {});
    } catch (e) {}
    window.setTimeout(render, 300);
    window.setTimeout(render, 1200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
