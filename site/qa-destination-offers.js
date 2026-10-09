(() => {
  'use strict';

  const OFFERS = {
    LHR: {
      'ONE_WAY|ECONOMY': ['2026-09-17', '', 1800],
      'ONE_WAY|PREMIUM': ['2026-09-17', '', 7860],
      'RETURN|ECONOMY': ['2026-09-15', '2026-09-19', 3610],
      'RETURN|PREMIUM': ['2027-02-05', '2027-02-09', 13760]
    },
    HKT: {
      'ONE_WAY|ECONOMY': ['2026-09-05', '', 2530],
      'ONE_WAY|PREMIUM': ['2026-09-02', '', 6900],
      'RETURN|ECONOMY': ['2026-09-05', '2026-09-17', 4110],
      'RETURN|PREMIUM': ['2026-09-02', '2026-09-06', 9060]
    },
    CAI: {
      'ONE_WAY|ECONOMY': ['2026-09-01', '', 750],
      'ONE_WAY|PREMIUM': ['2026-09-02', '', 2650],
      'RETURN|ECONOMY': ['2026-09-01', '2026-09-16', 1330],
      'RETURN|PREMIUM': ['2026-09-01', '2026-09-06', 3160]
    },
    AMM: {
      'ONE_WAY|ECONOMY': ['2026-09-01', '', 650],
      'ONE_WAY|PREMIUM': ['2026-08-25', '', 3330],
      'RETURN|ECONOMY': ['2026-09-01', '2026-09-08', 1570],
      'RETURN|PREMIUM': ['2026-08-25', '2026-09-06', 5530]
    },
    BEY: {
      'ONE_WAY|ECONOMY': ['2026-09-01', '', 1180],
      'ONE_WAY|PREMIUM': ['2026-08-25', '', 2900],
      'RETURN|ECONOMY': ['2026-09-01', '2026-09-08', 1960],
      'RETURN|PREMIUM': ['2026-08-25', '2026-09-08', 4370]
    },
    NCE: {
      'ONE_WAY|ECONOMY': ['2026-09-09', '', 1890],
      'ONE_WAY|PREMIUM': ['2026-09-09', '', 8660],
      'RETURN|ECONOMY': ['2026-09-06', '2026-09-09', 3200],
      'RETURN|PREMIUM': ['2026-09-09', '2026-09-21', 14020]
    },
    KUL: {
      'ONE_WAY|ECONOMY': ['2026-08-27', '', 2590],
      'ONE_WAY|PREMIUM': ['2026-09-03', '', 6710],
      'RETURN|ECONOMY': ['2026-08-27', '2026-09-19', 4170],
      'RETURN|PREMIUM': ['2026-09-03', '2026-09-28', 10750]
    }
  };

  const ORDER = ['LHR', 'HKT', 'CAI', 'AMM', 'BEY', 'NCE', 'KUL'];
  const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTHS_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DESTINATIONS_EN = { LHR: 'London', HKT: 'Phuket', CAI: 'Cairo', AMM: 'Amman', BEY: 'Beirut', NCE: 'Nice', KUL: 'Kuala Lumpur' };
  function isEnglish() { return document.body.classList.contains('newhome-en') || document.documentElement.lang.toLowerCase().startsWith('en'); }
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

  function init() {
    const section = document.querySelector('.destinationpricecomponent');
    if (!section || section.dataset.qaOfferSync === 'ready') return;
    const tripLinks = [...section.querySelectorAll('.dpc-triptype a[data-value]')];
    const cabinButton = section.querySelector('#cabinClass');
    const cabinOptions = [...section.querySelectorAll('.dpc-cabinclass .dropdown-item[data-value]')];
    const wrapper = section.querySelector('.post-content-wrapper');
    if (tripLinks.length < 2 || !cabinButton || !wrapper) return;

    section.dataset.qaOfferSync = 'ready';
    let trip = tripLinks.find(link => link.classList.contains('selected'))?.dataset.value === 'oneway' ? 'ONE_WAY' : 'RETURN';
    let cabin = cabinButton.dataset.value === 'premium' ? 'PREMIUM' : 'ECONOMY';

    function apply() {
      const cards = [...wrapper.querySelectorAll('.componentcards')].slice(0, ORDER.length);
      if (cards.length < ORDER.length) return;
      const key = `${trip}|${cabin}`;
      const english = isEnglish();
      section.dataset.qaOfferState = key;
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
      if (cabinButton) cabinButton.textContent = english ? (cabin === 'PREMIUM' ? 'First/Business' : 'Economy') : (cabin === 'PREMIUM' ? 'الأولى/الأعمال' : 'السياحية');
      cards.forEach((card, index) => {
        const code = ORDER[index];
        const offer = OFFERS[code][key];
        if (!offer) return;
        const [outbound, inbound, fare] = offer;
        const destination = card.querySelector('.destination-title');
        const image = card.querySelector('img');
        const duration = card.querySelector('.duration');
        const classType = card.querySelector('.cardclasstype');
        const cost = card.querySelector('.cardcost');
        const book = card.querySelector('.offer-button-book');
        const discover = card.querySelector('.offer-button-discover');
        if (destination && english) destination.textContent = DESTINATIONS_EN[code] || destination.textContent;
        if (image && english) image.alt = DESTINATIONS_EN[code] || image.alt;
        if (duration) duration.textContent = inbound ? `${formatDate(outbound)} - ${formatDate(inbound)}` : formatDate(outbound);
        if (classType) classType.textContent = english ? (cabin === 'PREMIUM' ? 'First/Business from' : 'Economy from') : (cabin === 'PREMIUM' ? 'الدرجة الأولى و درجة رجال الأعمال من' : 'الدرجة السياحية من');
        if (cost) cost.textContent = `QAR ${fare}`;
        if (book) { book.href = bookingUrl(code, trip, cabin, outbound, inbound); book.textContent = english ? 'Book now' : 'احجز الآن'; }
        if (discover) {
          discover.textContent = english ? 'Explore' : 'اكتشف';
          discover.removeAttribute('href');
          discover.setAttribute('aria-disabled', 'true');
          discover.setAttribute('tabindex', '-1');
        }
      });
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
        apply();
        return;
      }

      const option = event.target.closest('.dpc-cabinclass .dropdown-item[data-value]');
      if (option && section.contains(option)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        cabin = option.dataset.value === 'premium' ? 'PREMIUM' : 'ECONOMY';
        cabinButton.dataset.value = option.dataset.value;
        cabinButton.value = cabin === 'PREMIUM' ? 'Premium' : 'Economy';
        cabinButton.textContent = option.textContent.trim();
        cabinButton.setAttribute('aria-expanded', 'false');
        section.querySelectorAll('.dpc-cabinclass .dropdown-item[data-value]').forEach(item => item.setAttribute('aria-selected', item === option ? 'true' : 'false'));
        section.querySelector('.dpc-cabinclass .dropdown-menu')?.classList.remove('show');
        apply();
      }
    }, true);


    apply();
    window.setTimeout(apply, 300);
    window.setTimeout(apply, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
