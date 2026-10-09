(function () {
  'use strict';

  var DESKTOP_QUERY = '(min-width: 992px)';
  var MOBILE_QUERY = '(max-width: 991px)';
  var PANEL_ID = 'qa-stopover-desktop';
  var HOLIDAYS_ORIGIN = 'https://www.qatarairwaysholidays.com';
  var HOTELS_ORIGIN = 'https://hotels.qatarairways.com';
  var DAY_MS = 86400000;
  var PACKAGE_FAVICON_HREF = '/assets/qa-extras-qatar-logo.svg?v=1';

  var state = {
    view: 'stopover',
    trip: 'round',
    origin: null,
    destination: null,
    origin2: null,
    destination2: null,
    hotelDestination: null,
    departure: addDays(new Date(), 3),
    returnDate: addDays(new Date(), 9),
    departure2: addDays(new Date(), 4),
    checkin: addDays(new Date(), 3),
    checkout: addDays(new Date(), 9),
    adults: 2,
    children: 0,
    infants: 0,
    childAges: [],
    rooms: 1,
    roomData: [{ adults: 2, children: 0, infants: 0, childAges: [] }],
    cabin: 'E',
    stopoverLeg: 'outbound',
    stopoverDays: 1,
    guestOpen: false,
    cabinOpen: false,
    passengerInfoOpen: {},
    promoOpen: false,
    promo: '',
    calendarOpen: false,
    calendarKey: '',
    calendarMonth: firstOfMonth(addDays(new Date(), 3)),
    mobileCard: 'flight',
    manageTab: 'manage'
  };

  var root = null;
  var panel = null;
  var bookingBody = null;
  var topTabs = [];
  var packageTab = null;
  var observedLanguage = '';
  var hotelDestinations = { ar: null, en: null };
  var hotelLoadPromise = { ar: null, en: null };
  var browserIcon = null;
  var browserIconHref = '';
  var browserIconType = '';

  var copy = {
    ar: {
      stopover: 'التوقف المؤقت في قطر',
      flightHotel: 'رحلات الطيران + الفنادق',
      hotels: 'الفنادق',
      round: 'رحلة ذهاب وعودة',
      oneWay: 'اتجاه واحد',
      multi: 'وجهات متعددة',
      flight1: 'الرحلة 1',
      flight2: 'الرحلة 2',
      stopoverBlurb: 'استكشف قطر خلال رحلتك مع باقات توقف مذهلة تبدأ من 14 دولاراً أمريكياً للفنادق من فئة 4 نجوم و5 نجوم.',
      hotelsBlurb: 'استمتع بخيارات تشمل 200,000 فندق موزعة على أكثر من 500 وجهة عالمية',
      from: 'من',
      to: 'إلى',
      departure: 'رحلة المغادرة',
      returnDate: 'رحلة ذهاب وعودة',
      travellersRoom: 'المسافرون / غرفة',
      cabin: 'درجة السفر',
      economy: 'الدرجة السياحية',
      premium: 'الدرجة الأولى ودرجة رجال الأعمال',
      premiumTooltip: '(درجة رجال الأعمال/الدرجة الأولى)',
      business: 'درجة رجال الأعمال',
      first: 'الدرجة الأولى',
      hotelDestination: 'الوجهة الفندقية',
      destinationQuestion: 'إلى أين تنوي السفر؟',
      checkin: 'تسجيل الدخول',
      checkout: 'تسجيل الخروج',
      stopQuestion: 'حدّد تاريخ التوقف في قطر ضمن مسار رحلتك.',
      outbound: 'رحلة المغادرة',
      returnLeg: 'رحلة ذهاب وعودة',
      daysQuestion: 'كم عدد الأيام التي ستقضيها في قطر؟',
      addPromo: 'إضافة رمز ترويجي',
      promo: 'أدخل الرمز الترويجي',
      searchFlights: 'ابحث عن الرحلات',
      search: 'ابحث',
      adults: 'البالغون',
      children: 'الأطفال',
      infants: 'الرضّع',
      rooms: 'الغرف',
      room: 'غرفة',
      addRoom: 'أضف غرفة أخرى',
      removeRoom: 'حذف الغرفة',
      adultAge: '12 عاماً فما فوق',
      childYears: 'من 2 إلى 11 عاماً',
      infantYears: 'أقل من عامين',
      childInfoTitle: 'ملاحظة',
      childTooltip: 'يجب أن يسافر الأطفال الذين تتراوح أعمارهم بين 2 و5 أعوام برفقة شخص بالغ يزيد عمره عن 16 عاماً.',
      infantInfoTitle: 'ملاحظة',
      infantTooltip: 'يجب أن يسافر كل رضيع برفقة شخص بالغ. عند السفر، يجب أن يجلس الرضيع في حضن أحد والديه.',
      passenger: 'مسافر',
      passengers: 'مسافرون',
      childAge: 'عمر الطفل',
      done: 'تأكيد',
      clearDates: 'إلغاء التواريخ',
      confirmDates: 'تأكيد',
      previousMonth: 'الشهر السابق',
      nextMonth: 'الشهر التالي',
      selectAirport: 'ابدأ بكتابة مدينة أو مطار',
      loading: 'جارٍ تحميل الوجهات…',
      noResults: 'لم يتم العثور على المطار/المدينة.',
      required: 'يُرجى اختيار جميع الحقول المطلوبة من القائمة.',
      dohaNotAllowed: 'لا يمكن اختيار الدوحة كنقطة للمغادرة أو وجهة للسفر',
      invalidDates: 'يجب حجز رحلات التوقف المؤقت قبل السفر بثلاثة أيام على الأقل.',
      packages: 'باقات السفر',
      manageCard: 'إدارة الحجز / تسجيل الدخول',
      manageBooking: 'إدارة الحجز',
      checkinTab: 'تسجيل الدخول',
      bookingReference: 'رقم الحجز',
      lastName: 'اسم العائلة',
      retrieveBooking: 'استعلام عن الحجز',
      manageRequired: 'يرجى إدخال رقم الحجز واسم العائلة.',
      monthNames: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
      weekdays: ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد']
    },
    en: {
      stopover: 'Qatar Stopover',
      flightHotel: 'Flights + Hotels',
      hotels: 'Hotels',
      round: 'Return',
      oneWay: 'One way',
      multi: 'Multi-city',
      flight1: 'Flight 1',
      flight2: 'Flight 2',
      stopoverBlurb: 'Explore Qatar during your journey with amazing stopover packages starting from USD 14 pp at 4-star and 5-star hotels.',
      hotelsBlurb: 'Choose from 200,000 hotels from over 500 global destinations',
      from: 'From',
      to: 'To',
      departure: 'Departure',
      returnDate: 'Return',
      travellersRoom: 'Passengers / Room',
      cabin: 'Class',
      economy: 'Economy',
      premium: 'Premium',
      premiumTooltip: '(Business/First)',
      business: 'Business',
      first: 'First',
      hotelDestination: 'Hotel destination',
      destinationQuestion: 'Where are you going?',
      checkin: 'Check-in',
      checkout: 'Check-out',
      stopQuestion: 'When would you like to add a stop in Doha during your journey?',
      outbound: 'Departure',
      returnLeg: 'Return',
      daysQuestion: 'How many days would you like to stay in Qatar?',
      addPromo: 'Add promo code',
      promo: 'Enter promo code',
      searchFlights: 'Search flights',
      search: 'Search',
      adults: 'Adults',
      children: 'Children',
      infants: 'Infants',
      rooms: 'Rooms',
      room: 'Room',
      addRoom: 'Add another room',
      removeRoom: 'Remove room',
      adultAge: '12+ years',
      childYears: '2-11 years',
      infantYears: 'Under 2 years',
      childInfoTitle: 'Note',
      childTooltip: 'Children between 2-5 years should be accompanied by an adult over 16 years of age when travelling.',
      infantInfoTitle: 'Note',
      infantTooltip: "Each infant should be accompanied by one adult. When an infant fare is booked, the infant will be seated on the parent's lap.",
      passenger: 'Passenger',
      passengers: 'Passengers',
      childAge: 'Child age',
      done: 'Confirm',
      clearDates: 'Clear all',
      confirmDates: 'Confirm',
      previousMonth: 'Previous month',
      nextMonth: 'Next month',
      selectAirport: 'Start typing to choose a city or airport.',
      loading: 'Loading destinations…',
      noResults: 'Airport/city not found.',
      required: 'Please select all required fields from the list.',
      dohaNotAllowed: 'Doha cannot be entered as an origin or a destination',
      invalidDates: 'Stopovers must be booked at least 3 days in advance.',
      packages: 'Travel packages',
      manageCard: 'Manage booking / Check-in',
      manageBooking: 'Manage booking',
      checkinTab: 'Check-in',
      bookingReference: 'Booking reference',
      lastName: 'Last name',
      retrieveBooking: 'Retrieve booking',
      manageRequired: 'Please enter your booking reference and last name.',
      monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    }
  };

  function addDays(date, days) {
    var next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + days);
    return next;
  }

  function firstOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function sameDay(a, b) {
    return !!a && !!b && ymd(a) === ymd(b);
  }

  function isBefore(a, b) {
    return a && b && a.getTime() < b.getTime();
  }

  function isAfter(a, b) {
    return a && b && a.getTime() > b.getTime();
  }

  function isDesktop() {
    return !!(window.matchMedia && window.matchMedia(DESKTOP_QUERY).matches);
  }

  function isMobile() {
    return !!(window.matchMedia && window.matchMedia(MOBILE_QUERY).matches);
  }

  function isEnglish() {
    if (document.body && document.body.classList.contains('newhome-en')) return true;
    if (document.body && document.body.classList.contains('newhome-ar')) return false;
    return /^\/en-[a-z]{2}\//i.test(location.pathname) || document.documentElement.dir === 'ltr';
  }

  function lang() {
    return isEnglish() ? 'en' : 'ar';
  }

  function t(key) {
    var value = copy[lang()][key];
    return value == null ? key : value;
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ymd(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }

  function mmddyyyy(date) {
    return [String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0'), date.getFullYear()].join('/');
  }

  function parseYmd(value) {
    var parts = String(value || '').split('-').map(Number);
    if (parts.length !== 3) return null;
    var date = new Date(parts[0], parts[1] - 1, parts[2]);
    return isNaN(date.getTime()) ? null : date;
  }

  function formatDate(date) {
    if (!date) return '';
    try {
      return new Intl.DateTimeFormat(isEnglish() ? 'en-GB' : 'ar', {
        day: 'numeric', month: 'long', year: 'numeric'
      }).format(date);
    } catch (ignore) {
      return ymd(date);
    }
  }

  function airportCity(airport) {
    if (!airport) return '';
    var city = String(airport.c || '').split(',')[0].trim();
    return city || airport.n || '';
  }

  function formatDisplayAirport(airport) {
    if (!airport) return '';
    return String(airport.n || airportCity(airport)).trim() + ' ' + airport.k;
  }

  function getAirports() {
    var source = isEnglish() ? window.QA_AIRPORTS_EN : window.QA_AIRPORTS;
    return Array.isArray(source) ? source : [];
  }

  var INITIAL_AIRPORT_CODES_EN = ['YJC','XHJ','AAL','AES','AAR','AHJ','ABD','ABA','YXX','ZXA','ABZ','AHB','ABJ','ABI','AUH','ABV','ACA','ACC','ADA','ADD','ADL','ADF','AZR','NHR','AGA','IXA','AJI','BQN','AGU','AMD','AWZ','QXB','AJL','AJA','AXT','AKU','SCO','AKX','AHU','AKH','ABT','ULH','AKN','ABC','EEM','ALB','ALH','ABQ','ABX','ALP'];
  var INITIAL_AIRPORT_CODES_AR = ['ABD','YXX','ABI','ADF','AZR','AJI','AWZ','AJL','AJA','AKU','SCO','AKX','AKH','ABC','ALH','ABX','AHO','AOR','ALF','ZYA','XYQ','XYH','VLY','AAE','AQG','AOG','ANR','ZWE','ZYZ','AQJ','AJK','ARU','AMH','ADU','ARH','AXM','ARM','AJR','ASO','ASA','JTY','GUW','AUG','AVN','AWA','AXU','AYQ','BCM','BJZ','BPE'];

  function normalize(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function normalizeAirport(value) {
    return normalize(value)
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g, '')
      .replace(/[\u0623\u0625\u0622]/g, '\u0627')
      .replace(/\u0649/g, '\u064A')
      .replace(/\u0629/g, '\u0647')
      .replace(/\u0624/g, '\u0648')
      .replace(/\u0626/g, '\u064A')
      .trim();
  }

  function initialAirportMatches(airports) {
    var wanted = isEnglish() ? INITIAL_AIRPORT_CODES_EN : INITIAL_AIRPORT_CODES_AR;
    var byCode = {};
    airports.forEach(function (airport) { byCode[String(airport.k || '').toUpperCase()] = airport; });
    return wanted.map(function (code) { return byCode[code]; }).filter(Boolean);
  }

  function airportMatches(value) {
    var query = normalizeAirport(value);
    var airports = getAirports();
    if (!query) return initialAirportMatches(airports);
    var list = airports.filter(function (airport) {
      return normalizeAirport([airport.s, airport.c, airport.n, airport.k].join(' ')).indexOf(query) !== -1;
    });
    if (isEnglish() && Array.isArray(window.QA_AIRPORTS_EN_ORDER) && window.QA_AIRPORTS_EN_ORDER.length) {
      var order = {};
      window.QA_AIRPORTS_EN_ORDER.forEach(function (code, index) { order[code] = index; });
      list.sort(function (a, b) {
        var ai = order[a.k] === undefined ? 999999 : order[a.k];
        var bi = order[b.k] === undefined ? 999999 : order[b.k];
        return ai - bi;
      });
    }
    return list;
  }

  function highlightAirport(text, query) {
    text = String(text || '');
    if (!query || isEnglish()) return esc(text);
    var foldedText = normalizeAirport(text);
    var foldedQuery = normalizeAirport(query);
    var index = foldedText.indexOf(foldedQuery);
    if (index < 0) return esc(text);
    return esc(text.slice(0, index)) + '<b>' + esc(text.slice(index, index + foldedQuery.length)) + '</b>' + esc(text.slice(index + foldedQuery.length));
  }

  function ensureHotelDestinations() {
    var code = lang();
    if (hotelDestinations[code] || hotelLoadPromise[code]) return hotelLoadPromise[code];
    hotelLoadPromise[code] = fetch(location.origin + '/assets/qa-hotel-destinations-' + code + '.json?v=3')
      .then(function (response) {
        if (!response.ok) throw new Error('Hotel destination source failed');
        return response.json();
      })
      .then(function (items) {
        hotelDestinations[code] = Array.isArray(items) ? items : [];
        return hotelDestinations[code];
      })
      .catch(function () {
        hotelDestinations[code] = [];
        return hotelDestinations[code];
      });
    return hotelLoadPromise[code];
  }

  function getHotelDestinations() {
    return hotelDestinations[lang()] || [];
  }

  function formatHotelDestination(destination) {
    if (!destination) return '';
    return destination.city + ' (' + destination.shorthand + '), ' + destination.country;
  }

  function hotelMatches(value) {
    var query = normalize(value).trim();
    var destinations = getHotelDestinations();
    if (!query) return destinations;
    return destinations.filter(function (destination) {
      return normalize([destination.city, destination.country, destination.shorthand].join(' ')).indexOf(query) !== -1;
    });
  }

  function svgPlane() {
    return '<svg class="qa-so-plane-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 15.5 20 10.2c1-.3 1.2-1.7.3-2.3l-1.6-1c-.4-.3-1-.3-1.4-.1l-3.7 1.8-5.4-2.8c-.3-.2-.7-.2-1 0L5.4 6.5c-.7.4-.7 1.4 0 1.8l3.4 2-3.3 1.6-2.6-.9c-.3-.1-.6 0-.8.2l-.7.7c-.4.4-.3 1 .1 1.3l2 1.3c.3.2.7.3 1 .2Z"/><path d="M3 19.5h18"/></svg>';
  }

  function svgLocation() {
    return '<svg class="qa-so-location-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  }

  function svgSwap() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16l-3.5-3.5M20 15H4l3.5 3.5"/></svg>';
  }

  function svgChevron() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  }

  function airportField(key, label) {
    var selected = state[key];
    var isFrom = key === 'origin' || key === 'origin2';
    return '<div class="qa-so-field qa-so-airport ' + (isFrom ? 'is-from' : 'is-to') + '" data-airport-field="' + key + '">' +
      '<span class="qa-so-label">' + esc(label) + '</span>' +
      '<input class="qa-so-value qa-so-airport-input" data-airport-input="' + key + '" autocomplete="off" value="' + esc(formatDisplayAirport(selected)) + '" placeholder="' + esc(t('selectAirport')) + '" aria-label="' + esc(label) + '">' +
      '<div class="qa-so-airport-menu qa-so-route-airport-menu" hidden></div>' +
      '</div>';
  }

  function hotelDestinationField(label) {
    return '<div class="qa-so-field qa-so-airport qa-so-hotel-destination" data-hotel-field="hotelDestination">' +
      '<span class="qa-so-label">' + esc(label) + '</span>' +
      '<input class="qa-so-value qa-so-airport-input" data-hotel-input="hotelDestination" autocomplete="off" value="' + esc(formatHotelDestination(state.hotelDestination)) + '" placeholder="' + esc(t('destinationQuestion')) + '" aria-label="' + esc(label) + '">' +
      '<div class="qa-so-airport-menu qa-so-hotel-menu" role="listbox" hidden></div>' +
      '</div>';
  }

  function swapField(action) {
    return '<div class="qa-so-swap-wrap"><button type="button" class="qa-so-swap" data-action="' + esc(action || 'swap') + '" aria-label="Swap origin and destination">' + svgSwap() + '</button></div>';
  }

  function calendarCell(key, label) {
    return '<button type="button" class="qa-so-date-cell" data-action="open-calendar" data-calendar-key="' + key + '" aria-label="' + esc(label + ' ' + formatDate(state[key])) + '">' +
      '<span class="qa-so-label">' + esc(label) + '</span>' +
      '<strong>' + esc(formatDate(state[key])) + '</strong>' +
      '<input type="hidden" data-date-key="' + key + '" value="' + ymd(state[key]) + '">' +
      '</button>';
  }

  function calendarField(keys) {
    return '<div class="qa-so-calendar-field' + (keys.length === 1 ? ' is-single' : '') + '">' + keys.map(function (item) {
      return calendarCell(item[0], item[1]);
    }).join('') + '</div>';
  }

  function syncGuestTotals() {
    state.roomData = Array.isArray(state.roomData) && state.roomData.length ? state.roomData.slice(0, 3) : [{ adults: 2, children: 0, infants: 0, childAges: [] }];
    state.roomData.forEach(function (room) {
      room.adults = Math.max(1, Math.min(9, Number(room.adults) || 1));
      room.children = Math.max(0, Math.min(9, Number(room.children) || 0));
      room.infants = Math.max(0, Math.min(9, room.adults, Number(room.infants) || 0));
      room.childAges = Array.isArray(room.childAges) ? room.childAges.slice(0, room.children) : [];
      while (room.childAges.length < room.children) room.childAges.push(8);
    });
    state.adults = state.roomData.reduce(function (total, room) { return total + room.adults; }, 0);
    state.children = state.roomData.reduce(function (total, room) { return total + room.children; }, 0);
    state.infants = state.roomData.reduce(function (total, room) { return total + room.infants; }, 0);
    state.childAges = state.roomData.reduce(function (ages, room) { return ages.concat(room.childAges); }, []);
    state.rooms = state.roomData.length;
  }

  function totalGuests() {
    syncGuestTotals();
    return state.adults + state.children + state.infants;
  }

  function guestSummary() {
    var passengers = totalGuests();
    if (isEnglish()) {
      return passengers + ' ' + (passengers === 1 ? t('passenger') : t('passengers')) + ', ' + state.rooms + ' ' + (state.rooms === 1 ? t('room') : t('rooms'));
    }
    return passengers + ' ' + t('passengers') + '، ' + state.rooms + ' ' + (state.rooms === 1 ? t('room') : t('rooms'));
  }

  function cabinLabel() {
    return state.cabin === 'E' ? t('economy') : (t('premium') + ' ' + t('premiumTooltip'));
  }

  function passengerInfo(roomIndex, key) {
    if (key === 'adults') return '';
    var infoKey = roomIndex + '-' + key;
    var isOpen = !!state.passengerInfoOpen[infoKey];
    var title = key === 'children' ? t('childInfoTitle') : t('infantInfoTitle');
    var message = key === 'children' ? t('childTooltip') : t('infantTooltip');
    return '<button type="button" class="qa-so-passenger-info" data-action="toggle-passenger-info" data-info-key="' + infoKey + '" aria-expanded="' + isOpen + '" aria-label="' + esc(title) + '">i</button>' +
      (isOpen ? '<div class="qa-so-passenger-note"><button type="button" data-action="toggle-passenger-info" data-info-key="' + infoKey + '" aria-label="Close">×</button><strong>' + esc(title) + '</strong><p>' + esc(message) + '</p></div>' : '');
  }

  function roomStepper(room, roomIndex, key, label, sublabel) {
    var seatedGuests = state.adults + state.children;
    var decrementDisabled = key === 'adults' ? (room.adults <= 1 || room.infants >= room.adults) : room[key] <= 0;
    var incrementDisabled = room[key] >= 9;
    if (key === 'adults' || key === 'children') incrementDisabled = incrementDisabled || seatedGuests >= 9;
    if (key === 'infants') incrementDisabled = incrementDisabled || room.infants >= room.adults;
    return '<div class="qa-so-stepper"><span class="qa-so-passenger-copy"><b>' + esc(label) + '</b><small>' + esc(sublabel) + '</small></span>' +
      passengerInfo(roomIndex, key) +
      '<div class="qa-so-step-controls">' +
      '<button type="button" data-room-index="' + roomIndex + '" data-step="' + key + '" data-delta="1"' + (incrementDisabled ? ' disabled' : '') + ' aria-label="Increase count">+</button>' +
      '<strong>' + room[key] + '</strong>' +
      '<button type="button" data-room-index="' + roomIndex + '" data-step="' + key + '" data-delta="-1"' + (decrementDisabled ? ' disabled' : '') + ' aria-label="Decrease count">−</button>' +
      '</div></div>';
  }

  function childAgeFields(room, roomIndex) {
    if (!room.children) return '';
    while (room.childAges.length < room.children) room.childAges.push(8);
    room.childAges = room.childAges.slice(0, room.children);
    return '<div class="qa-so-child-ages">' + room.childAges.map(function (age, index) {
      var options = [];
      for (var i = 2; i <= 11; i += 1) options.push('<option value="' + i + '"' + (i === age ? ' selected' : '') + '>' + i + '</option>');
      return '<label><span>' + esc(t('childAge')) + ' ' + (index + 1) + '</span><select data-room-index="' + roomIndex + '" data-child-age="' + index + '">' + options.join('') + '</select></label>';
    }).join('') + '</div>';
  }

  function roomControls() {
    syncGuestTotals();
    var rooms = state.roomData.map(function (room, roomIndex) {
      return '<section class="qa-so-room" data-room="' + roomIndex + '">' +
        '<header><strong>' + esc(t('room')) + ' ' + (roomIndex + 1) + '</strong>' +
        (roomIndex ? '<button type="button" class="qa-so-remove-room" data-action="remove-room" data-room-index="' + roomIndex + '" aria-label="' + esc(t('removeRoom')) + '">×</button>' : '') + '</header>' +
        roomStepper(room, roomIndex, 'adults', t('adults'), t('adultAge')) +
        roomStepper(room, roomIndex, 'children', t('children'), t('childYears')) +
        roomStepper(room, roomIndex, 'infants', t('infants'), t('infantYears')) +
        childAgeFields(room, roomIndex) +
      '</section>';
    }).join('');
    var addDisabled = state.adults + state.children > 7;
    var addRoom = state.roomData.length < 3 ? '<button type="button" class="qa-so-add-room" data-action="add-room"' + (addDisabled ? ' disabled' : '') + '><span aria-hidden="true">+</span>' + esc(t('addRoom')) + '</button>' : '';
    return rooms + addRoom;
  }

  function guestField(includeCabin) {
    var guestLabel = includeCabin ? t('travellersRoom') : (t('passengers') + ' / ' + t('rooms'));
    var cabinPremiumLabel = t('premium') + ' ' + t('premiumTooltip');
    return '<div class="qa-so-field qa-so-guest' + (includeCabin ? ' has-cabin' : '') + (state.guestOpen ? ' is-open' : '') + (state.cabinOpen ? ' is-cabin-open' : '') + '">' +
      '<button type="button" class="qa-so-guest-trigger" data-action="toggle-guests" aria-expanded="' + state.guestOpen + '">' +
        '<span class="qa-so-label">' + esc(guestLabel) + '</span>' +
        '<strong>' + esc(guestSummary()) + '</strong>' +
        (!includeCabin ? svgChevron() : '') +
      '</button>' +
      (includeCabin ? '<button type="button" class="qa-so-cabin-trigger" data-action="toggle-cabin" aria-expanded="' + state.cabinOpen + '"><span class="qa-so-label">' + esc(t('cabin')) + '</span><strong>' + esc(cabinLabel()) + '</strong>' + svgChevron() + '</button>' : '') +
      '<div class="qa-so-guest-pop"' + (state.guestOpen ? '' : ' hidden') + '>' +
        roomControls() +
        '<button type="button" class="qa-so-pop-done" data-action="guest-done">' + esc(t('done')) + '</button>' +
      '</div>' +
      (includeCabin ? '<div class="qa-so-cabin-pop" role="listbox"' + (state.cabinOpen ? '' : ' hidden') + '><button type="button" role="option" data-action="set-cabin" data-cabin-value="E" aria-selected="' + (state.cabin === 'E') + '" class="' + (state.cabin === 'E' ? 'is-selected' : '') + '">' + esc(t('economy')) + '</button><button type="button" role="option" data-action="set-cabin" data-cabin-value="F" aria-selected="' + (state.cabin === 'F') + '" class="' + (state.cabin === 'F' ? 'is-selected' : '') + '">' + esc(cabinPremiumLabel) + '</button></div>' : '') +
      '</div>';
  }

  function tripOptions() {
    var options = [['round', t('round')], ['oneway', t('oneWay')], ['multi', t('multi')]];
    return '<div class="qa-so-trip" role="radiogroup" aria-label="Select trip type option">' + options.map(function (option) {
      return '<label><input type="radio" name="qa-so-trip" value="' + option[0] + '"' + (state.trip === option[0] ? ' checked' : '') + '><span aria-hidden="true"></span>' + esc(option[1]) + '</label>';
    }).join('') + '</div>';
  }

  function subTabs() {
    var tabs = [['stopover', t('stopover')], ['flight-hotel', t('flightHotel')], ['hotels', t('hotels')]];
    return '<div class="qa-so-subtabs" role="tablist">' + tabs.map(function (tab) {
      return '<button type="button" role="tab" data-view="' + tab[0] + '" aria-selected="' + (state.view === tab[0]) + '" class="' + (state.view === tab[0] ? 'is-active' : '') + '">' + esc(tab[1]) + '</button>';
    }).join('') + '</div>';
  }

  function packageSubTabs() {
    var tabs = [['flight-hotel', t('flightHotel')], ['hotels', t('hotels')]];
    return '<div class="qa-so-subtabs qa-so-package-tabs" role="tablist">' + tabs.map(function (tab) {
      return '<button type="button" role="tab" data-view="' + tab[0] + '" aria-selected="' + (state.view === tab[0]) + '" class="' + (state.view === tab[0] ? 'is-active' : '') + '">' + esc(tab[1]) + '</button>';
    }).join('') + '</div>';
  }

  function mobileCardIcon(name) {
    if (name === 'stopover') return '<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="13" r="8"></circle><path d="M6 13h16M14 5c2.8 2.4 4.2 5.1 4.2 8S16.8 18.6 14 21c-2.8-2.4-4.2-5.1-4.2-8S11.2 7.4 14 5Z"></path><path d="M19.7 20.2 24 24.5M21.8 22.4l2.4-2.4"></path></svg>';
    if (name === 'packages') return '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M3.5 18.5h9v6h-9zM6.5 15.5v3M9.5 15.5v3M17 11.5h7.5v13H17zM19.5 15h2.5M19.5 18.5h2.5"></path><path d="m3 8.5 9-4-2.2 6.7 4.2 2.3-1.2 2-5-1.7-3.2 2.1 1.1-4.4Z"></path></svg>';
    return '<svg viewBox="0 0 28 28" aria-hidden="true"><rect x="4" y="5.5" width="20" height="18" rx="2"></rect><path d="M8 3.5v4M20 3.5v4M4 10h20M8 14h4M8 18h7"></path></svg>';
  }

  function mobileChevron() {
    return '<svg class="qa-mobile-booking-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9.5 5 5 5-5"></path></svg>';
  }

  function mobileHeader(key, label, icon) {
    var open = state.mobileCard === key;
    return '<h4 class="qa-mobile-booking-header"><button type="button" class="qa-mobile-booking-toggle' + (open ? ' is-open' : '') + '" data-mobile-card="' + key + '" aria-expanded="' + open + '" aria-controls="qa-mobile-booking-' + key + '"><span class="qa-mobile-booking-icon">' + mobileCardIcon(icon) + '</span><span class="qa-mobile-booking-title">' + esc(label) + '</span>' + mobileChevron() + '</button></h4>';
  }

  function managePanel() {
    var manage = state.manageTab === 'manage';
    return '<div class="qa-mobile-manage-tabs" role="tablist"><button type="button" role="tab" data-manage-tab="manage" aria-selected="' + manage + '" class="' + (manage ? 'is-active' : '') + '">' + esc(t('manageBooking')) + '</button><button type="button" role="tab" data-manage-tab="checkin" aria-selected="' + (!manage) + '" class="' + (!manage ? 'is-active' : '') + '">' + esc(t('checkinTab')) + '</button></div>' +
      '<form class="qa-mobile-manage-form" data-manage-form novalidate><label><span>' + esc(t('bookingReference')) + '</span><input type="text" name="bookingReference" autocomplete="off" maxlength="13" required></label><label><span>' + esc(t('lastName')) + '</span><input type="text" name="lastName" autocomplete="family-name" maxlength="60" required></label><button type="submit">' + esc(t('retrieveBooking')) + '</button><p class="qa-mobile-manage-error" role="alert" hidden></p></form>';
  }

  function journeyRow(index, includeGuest, mode) {
    var second = index === 1;
    var originKey = second ? 'origin2' : 'origin';
    var destinationKey = second ? 'destination2' : 'destination';
    var departureKey = second ? 'departure2' : 'departure';
    var isOneWay = state.trip === 'oneway';
    var calendarKeys;
    if (mode === 'hotel') calendarKeys = [['checkin', t('checkin')], ['checkout', t('checkout')]];
    else if (second || isOneWay || state.trip === 'multi') calendarKeys = [[departureKey, t('departure')]];
    else calendarKeys = [['departure', t('departure')], ['returnDate', t('returnDate')]];

    return '<div class="qa-so-row-wrap' + (second ? ' is-second' : '') + '">' +
      (state.trip === 'multi' && mode !== 'hotel' ? '<strong class="qa-so-multi-caption">' + esc(second ? t('flight2') : t('flight1')) + '</strong>' : '') +
      '<div class="qa-so-journey' + (second ? ' qa-so-multi-second' : '') + '">' +
        '<div class="qa-so-route">' +
          airportField(originKey, t('from')) +
          swapField(second ? 'swap-second' : 'swap') +
          airportField(destinationKey, t('to')) +
        '</div>' +
        calendarField(calendarKeys) +
        (includeGuest ? guestField(true) : '') +
      '</div>' +
    '</div>';
  }

  function hotelRow(fullWidth) {
    return '<div class="qa-so-hotel-row' + (fullWidth ? ' is-full' : ' is-truncated') + '">' +
      hotelDestinationField(state.view === 'hotels' ? t('destinationQuestion') : t('hotelDestination')) +
      calendarField([['checkin', t('checkin')], ['checkout', t('checkout')]]) +
      (fullWidth ? guestField(false) : '') +
      '</div>';
  }

  function stopoverControls() {
    return '<div class="qa-so-stop-controls">' +
      '<div class="qa-so-stop-leg"><p>' + esc(t('stopQuestion')) + '</p><div role="radiogroup">' +
        '<label><input type="radio" name="qa-so-leg" value="outbound"' + (state.stopoverLeg === 'outbound' ? ' checked' : '') + '><span aria-hidden="true"></span>' + esc(t('outbound')) + '</label>' +
        '<label><input type="radio" name="qa-so-leg" value="return"' + (state.stopoverLeg === 'return' ? ' checked' : '') + (state.trip === 'oneway' ? ' disabled' : '') + '><span aria-hidden="true"></span>' + esc(t('returnLeg')) + '</label>' +
      '</div></div>' +
      '<div class="qa-so-days"><p id="qa-so-stopover-days-label">' + esc(t('daysQuestion')) + '</p><div class="qa-so-days-step" role="group" aria-labelledby="qa-so-stopover-days-label">' +
        '<button type="button" data-action="days-minus"' + (state.stopoverDays <= 1 ? ' disabled' : '') + ' aria-label="Decrease count">−</button>' +
        '<span aria-live="polite">' + state.stopoverDays + '</span>' +
        '<button type="button" data-action="days-plus"' + (state.stopoverDays >= maxStopoverDays() ? ' disabled' : '') + ' aria-label="Increase count">+</button>' +
      '</div></div>' +
      '</div>';
  }

  function promoControl() {
    if (state.promoOpen) {
      return '<div class="qa-so-promo is-open"><label><span>' + esc(t('promo')) + '</span><input type="text" data-promo value="' + esc(state.promo) + '" autocomplete="off"></label></div>';
    }
    return '<div class="qa-so-promo"><button type="button" data-action="toggle-promo" aria-label="' + esc(t('addPromo')) + '"><span class="qa-so-plus" aria-hidden="true">＋</span><span>' + esc(t('addPromo')) + '</span></button></div>';
  }

  function actions(withPromo, label) {
    return '<div class="qa-so-actions">' +
      (withPromo ? promoControl() : '') +
      '<button type="button" class="qa-so-search" data-action="search">' + esc(label) + '</button>' +
      '</div>';
  }

  function monthTitle(date) {
    return t('monthNames')[date.getMonth()] + ' ' + date.getFullYear();
  }

  function dateRangeForCalendar() {
    if (state.calendarKey === 'checkin' || state.calendarKey === 'checkout') return [state.checkin, state.checkout];
    if (state.trip === 'round' && (state.calendarKey === 'departure' || state.calendarKey === 'returnDate')) return [state.departure, state.returnDate];
    return [state[state.calendarKey], state[state.calendarKey]];
  }

  function minDateForKey(key) {
    var today = new Date();
    var base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (state.view === 'stopover') base = addDays(base, 3);
    if (key === 'returnDate') return addDays(state.departure, 1);
    if (key === 'departure2') return addDays(state.departure, 1);
    if (key === 'checkout') return addDays(state.checkin, 1);
    return base;
  }

  function calendarMonth(date) {
    var first = firstOfMonth(date);
    var mondayIndex = (first.getDay() + 6) % 7;
    var cursor = addDays(first, -mondayIndex);
    var range = dateRangeForCalendar();
    var min = minDateForKey(state.calendarKey);
    var weeks = [];
    for (var w = 0; w < 6; w += 1) {
      var days = [];
      for (var d = 0; d < 7; d += 1) {
        var current = addDays(cursor, w * 7 + d);
        var outside = current.getMonth() !== date.getMonth();
        var disabled = outside || isBefore(current, min);
        var selected = sameDay(current, range[0]) || sameDay(current, range[1]);
        var inRange = !outside && range[0] && range[1] && !isBefore(current, range[0]) && !isAfter(current, range[1]);
        days.push('<button type="button" class="qa-so-calendar-day' + (outside ? ' is-outside' : '') + (disabled ? ' is-disabled' : '') + (inRange ? ' is-range' : '') + (selected ? ' is-selected' : '') + '" data-calendar-date="' + ymd(current) + '"' + (disabled ? ' disabled' : '') + '><span>' + current.getDate() + '</span></button>');
      }
      weeks.push('<div class="qa-so-calendar-week">' + days.join('') + '</div>');
    }
    return '<section class="qa-so-calendar-month"><h3>' + esc(monthTitle(date)) + '</h3><div class="qa-so-calendar-weekdays">' + t('weekdays').map(function (day) { return '<span>' + esc(day) + '</span>'; }).join('') + '</div>' + weeks.join('') + '</section>';
  }

  function calendarPopover() {
    if (!state.calendarOpen || !state.calendarKey) return '';
    var next = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + 1, 1);
    return '<div class="qa-so-calendar-pop" role="dialog" aria-modal="false">' +
      '<div class="qa-so-calendar-nav"><button type="button" data-action="calendar-prev" aria-label="' + esc(t('previousMonth')) + '">‹</button><button type="button" data-action="calendar-next" aria-label="' + esc(t('nextMonth')) + '">›</button></div>' +
      '<div class="qa-so-calendar-months">' + calendarMonth(state.calendarMonth) + calendarMonth(next) + '</div>' +
      '<div class="qa-so-calendar-footer"><button type="button" class="qa-so-calendar-clear" data-action="calendar-clear">' + esc(t('clearDates')) + '</button><button type="button" class="qa-so-calendar-confirm" data-action="calendar-confirm">' + esc(t('confirmDates')) + '</button></div>' +
      '</div>';
  }

  function bookingPane() {
    var html = '<div class="qa-so-pane">';
    if (state.view === 'stopover') {
      html += tripOptions();
      html += '<p class="qa-so-blurb">' + esc(t('stopoverBlurb')) + '</p>';
      html += journeyRow(0, true, 'flight');
      if (state.trip === 'multi') html += journeyRow(1, false, 'flight');
      html += stopoverControls();
      html += actions(true, t('searchFlights'));
    } else if (state.view === 'flight-hotel') {
      var mobileFlightHotel = isMobile();
      html += tripOptions();
      html += journeyRow(0, !mobileFlightHotel, 'flight');
      if (state.trip === 'multi') html += journeyRow(1, false, 'flight');
      html += hotelRow(false);
      if (mobileFlightHotel) html += '<div class="qa-so-flight-hotel-guest">' + guestField(true) + '</div>';
      html += actions(false, t('search'));
    } else {
      html += '<p class="qa-so-blurb qa-so-hotel-blurb">' + esc(t('hotelsBlurb')) + '</p>';
      html += hotelRow(true);
      html += actions(false, t('search'));
    }
    return html + '<div class="qa-so-error" role="alert" hidden></div></div>';
  }

  function renderMobileView() {
    var stopoverOpen = state.mobileCard === 'stopover';
    var packagesOpen = state.mobileCard === 'packages';
    var manageOpen = state.mobileCard === 'manage';
    var html = '<div class="qa-mobile-booking-card' + (stopoverOpen ? ' is-open' : '') + '">' + mobileHeader('stopover', t('stopover'), 'stopover') + (stopoverOpen ? '<div class="qa-mobile-booking-content" id="qa-mobile-booking-stopover">' + bookingPane() + '</div>' : '') + '</div>';
    html += '<div class="qa-mobile-booking-card' + (packagesOpen ? ' is-open' : '') + '">' + mobileHeader('packages', t('packages'), 'packages') + (packagesOpen ? '<div class="qa-mobile-booking-content" id="qa-mobile-booking-packages">' + packageSubTabs() + bookingPane() + '</div>' : '') + '</div>';
    html += '<div class="qa-mobile-booking-card' + (manageOpen ? ' is-open' : '') + '">' + mobileHeader('manage', t('manageCard'), 'manage') + (manageOpen ? '<div class="qa-mobile-booking-content" id="qa-mobile-booking-manage">' + managePanel() + '</div>' : '') + '</div>';
    html += calendarPopover();
    panel.classList.add('qa-so-mobile-accordion');
    panel.innerHTML = html;
    panel.lang = lang();
    panel.dataset.qaView = state.view;
    panel.dir = isEnglish() ? 'ltr' : 'rtl';
    syncMobileFlightCard();
  }

  function syncMobileFlightCard() {
    if (!root || !bookingBody) return;
    if (!isMobile()) {
      bookingBody.hidden = false;
      root.classList.remove('qa-mobile-flight-open', 'qa-mobile-flight-closed');
      return;
    }
    var flightOpen = state.mobileCard === 'flight';
    bookingBody.hidden = !flightOpen;
    root.classList.toggle('qa-mobile-flight-open', flightOpen);
    root.classList.toggle('qa-mobile-flight-closed', !flightOpen);
  }

  function renderView() {
    if (!panel) return;
    if (isMobile()) {
      renderMobileView();
      reportBookingState();
      return;
    }
    panel.classList.remove('qa-so-mobile-accordion');
    panel.innerHTML = subTabs() + bookingPane() + calendarPopover();
    panel.lang = lang();
    panel.removeAttribute('data-view');
    panel.dataset.qaView = state.view;
    panel.dir = isEnglish() ? 'ltr' : 'rtl';
    reportBookingState();
  }

  function showPanel() {
    if (!isDesktop() || !root || !panel) return;
    root.classList.add('qa-so-active');
    panel.hidden = false;
    renderView();
  }

  function hidePanel() {
    if (!root || !panel) return;
    root.classList.remove('qa-so-active');
    panel.hidden = true;
    state.guestOpen = false;
    state.cabinOpen = false;
    state.passengerInfoOpen = {};
    state.promoOpen = false;
    state.calendarOpen = false;
  }

  function setActiveTopTab(tab) {
    topTabs.forEach(function (item) { item.classList.toggle('active', item === tab); });
  }

  function setPackageFavicon(active) {
    if (!browserIcon) {
      browserIcon = document.querySelector('link[rel~="icon"]');
      if (!browserIcon) {
        browserIcon = document.createElement('link');
        browserIcon.rel = 'icon';
        document.head.appendChild(browserIcon);
      }
      browserIconHref = browserIcon.getAttribute('href') || '';
      browserIconType = browserIcon.getAttribute('type') || '';
    }
    if (active) {
      browserIcon.type = 'image/svg+xml';
      browserIcon.href = location.origin + PACKAGE_FAVICON_HREF;
      return;
    }
    if (browserIconType) browserIcon.type = browserIconType;
    else browserIcon.removeAttribute('type');
    if (browserIconHref) browserIcon.href = browserIconHref;
  }

  function closeMenus(except) {
    if (!panel) return;
    panel.querySelectorAll('.qa-so-airport-menu').forEach(function (menu) {
      if (menu !== except) menu.hidden = true;
    });
  }

  function hidePopup(selector) {
    if (!panel) return;
    var popup = panel.querySelector(selector);
    if (popup) popup.hidden = true;
  }

  function closeOverlaysForTarget(target) {
    if (!panel || !target || typeof target.closest !== 'function') return;
    var field = target.closest('[data-airport-field], [data-hotel-field]');
    var exceptMenu = field && field.querySelector('.qa-so-airport-menu');
    closeMenus(exceptMenu || null);

    var keepGuests = !!target.closest('.qa-so-guest-trigger, .qa-so-guest-pop');
    var keepCabin = !!target.closest('.qa-so-cabin-trigger, .qa-so-cabin-pop');
    var keepCalendar = !!target.closest('[data-action="open-calendar"], .qa-so-calendar-pop');

    if (!keepGuests && state.guestOpen) {
      state.guestOpen = false;
      state.passengerInfoOpen = {};
      hidePopup('.qa-so-guest-pop');
      var guestTrigger = panel.querySelector('.qa-so-guest-trigger[aria-expanded="true"]');
      if (guestTrigger) guestTrigger.setAttribute('aria-expanded', 'false');
      var guestRoot = guestTrigger && guestTrigger.closest('.qa-so-guest');
      if (guestRoot) guestRoot.classList.remove('is-open');
    }
    if (!keepCabin && state.cabinOpen) {
      state.cabinOpen = false;
      hidePopup('.qa-so-cabin-pop');
      var cabinTrigger = panel.querySelector('.qa-so-cabin-trigger[aria-expanded="true"]');
      if (cabinTrigger) cabinTrigger.setAttribute('aria-expanded', 'false');
      var cabinRoot = cabinTrigger && cabinTrigger.closest('.qa-so-guest');
      if (cabinRoot) cabinRoot.classList.remove('is-cabin-open');
    }
    if (!keepCalendar && state.calendarOpen) {
      state.calendarOpen = false;
      hidePopup('.qa-so-calendar-pop');
    }
  }

  function drawAirportMenu(input) {
    var wrap = input.closest('.qa-so-airport');
    if (!wrap) return;
    var menu = wrap.querySelector('.qa-so-airport-menu');
    var matches = airportMatches(input.value);
    menu.innerHTML = matches.length ? matches.map(function (airport) {
      var icon = airport.t === 'c' ? svgLocation() : svgPlane();
      return '<button type="button" class="qa-so-ac-row" data-airport-code="' + esc(airport.k) + '">' + icon +
        '<span class="qa-so-ac-txt"><strong class="qa-so-ac-city">' + highlightAirport(airport.c || '', input.value) + '</strong>' +
        '<span class="qa-so-ac-name">' + highlightAirport(airport.n || '', input.value) + '</span></span>' +
        '<b class="qa-so-ac-code">' + esc(airport.k) + '</b></button>';
    }).join('') : '<p>' + esc(t('noResults')) + '</p>';
    menu.hidden = false;
    closeMenus(menu);
  }

  function hotelOptionHtml(destination, index, total) {
    return '<button type="button" role="option" class="qa-so-hotel-option" data-hotel-key="' + esc(destination.key) + '" aria-posinset="' + (index + 1) + '" aria-setsize="' + total + '"><strong>' + esc(destination.city) + '</strong><span>' + esc(destination.country) + '</span><b>' + esc(destination.shorthand) + '</b></button>';
  }

  function renderHotelMenuWindow(menu) {
    var matches = menu._qaHotelMatches || [];
    if (!matches.length) {
      menu.innerHTML = '<p>' + esc(t('noResults')) + '</p>';
      return;
    }
    var rowHeight = 72;
    var overscan = 3;
    var visibleRows = 6;
    var start = Math.max(0, Math.floor(menu.scrollTop / rowHeight) - overscan);
    var end = Math.min(matches.length, start + visibleRows + overscan * 2);
    var before = start * rowHeight;
    var after = (matches.length - end) * rowHeight;
    menu.innerHTML = '<div class="qa-so-hotel-virtual-space" style="height:' + before + 'px" aria-hidden="true"></div>' +
      matches.slice(start, end).map(function (destination, offset) {
        return hotelOptionHtml(destination, start + offset, matches.length);
      }).join('') +
      '<div class="qa-so-hotel-virtual-space" style="height:' + after + 'px" aria-hidden="true"></div>';
  }

  function bindHotelMenuScroll(menu) {
    if (menu._qaHotelScrollBound) return;
    menu._qaHotelScrollBound = true;
    menu.addEventListener('scroll', function () {
      if (menu._qaHotelFrame) return;
      menu._qaHotelFrame = requestAnimationFrame(function () {
        menu._qaHotelFrame = 0;
        renderHotelMenuWindow(menu);
      });
    }, { passive: true });
  }

  function drawHotelMenu(input) {
    var wrap = input.closest('[data-hotel-field]');
    if (!wrap) return;
    var menu = wrap.querySelector('.qa-so-hotel-menu');
    var destinations = getHotelDestinations();
    if (!destinations.length) {
      menu.innerHTML = '<p>' + esc(t('loading')) + '</p>';
      menu.hidden = false;
      closeMenus(menu);
      ensureHotelDestinations().then(function () {
        if (document.body.contains(input) && document.activeElement === input) drawHotelMenu(input);
      });
      return;
    }
    var matches = hotelMatches(input.value);
    menu._qaHotelMatches = matches;
    menu.dataset.optionCount = String(matches.length);
    menu.dataset.firstKey = matches.length ? matches[0].key : '';
    menu.dataset.lastKey = matches.length ? matches[matches.length - 1].key : '';
    menu.scrollTop = 0;
    menu.hidden = false;
    closeMenus(menu);
    bindHotelMenuScroll(menu);
    renderHotelMenuWindow(menu);
  }

  function setError(message) {
    var error = panel && panel.querySelector('.qa-so-error');
    if (!error) return;
    error.textContent = message || '';
    error.hidden = !message;
  }

  function maxStopoverDays() {
    if (state.stopoverLeg === 'return') return 4;
    var end = state.trip === 'multi' ? state.departure2 : state.returnDate;
    var diff = end ? Math.floor(Math.abs(end.getTime() - state.departure.getTime()) / DAY_MS) + 1 : 4;
    if (diff < 4) return 1;
    if (diff < 5) return 2;
    if (diff < 6) return 3;
    return 4;
  }

  function clampStopoverDays() {
    state.stopoverDays = Math.max(1, Math.min(maxStopoverDays(), state.stopoverDays));
  }

  function syncDate(key, value, rerender) {
    var date = value instanceof Date ? value : parseYmd(value);
    if (!date) return;
    state[key] = date;
    if (key === 'departure') {
      if (!state.returnDate || !isAfter(state.returnDate, date)) state.returnDate = addDays(date, 6);
      if (!state.departure2 || !isAfter(state.departure2, date)) state.departure2 = addDays(date, 1);
      if (state.view === 'flight-hotel') state.checkin = new Date(date);
    }
    if (key === 'returnDate' && state.view === 'flight-hotel') state.checkout = new Date(date);
    if (key === 'checkin') {
      if (!state.checkout || !isAfter(state.checkout, date)) state.checkout = addDays(date, 1);
    }
    clampStopoverDays();
    if (rerender !== false) renderView();
  }

  function validate(required) {
    var missing = required.filter(function (key) { return !state[key]; });
    panel.querySelectorAll('.qa-so-field').forEach(function (field) { field.classList.remove('is-invalid'); });
    missing.forEach(function (key) {
      var field = panel.querySelector('[data-airport-field="' + key + '"]') || panel.querySelector('[data-hotel-field="' + key + '"]');
      if (field) field.classList.add('is-invalid');
    });
    if (missing.length) {
      setError(t('required'));
      return false;
    }
    if (state.view === 'stopover') {
      var routeAirports = [state.origin, state.destination, state.trip === 'multi' ? state.origin2 : null, state.trip === 'multi' ? state.destination2 : null].filter(Boolean);
      if (routeAirports.some(function (airport) { return airport.k === 'DOH'; })) {
        setError(t('dohaNotAllowed'));
        return false;
      }
      if (isBefore(state.departure, addDays(new Date(), 3))) {
        setError(t('invalidDates'));
        return false;
      }
    }
    setError('');
    return true;
  }

  function holidaysStorefront() {
    return isEnglish() ? '/qa-en/' : '/qa-ar/';
  }

  function openInternalResults(product, params, summary) {
    var payload = {
      product: product,
      lang: isEnglish() ? 'en' : 'ar',
      params: Array.from(params.entries()),
      summary: summary || '',
      returnPath: location.pathname + location.search,
      searchId: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
    };
    try {
      sessionStorage.removeItem('qaPackageStage');
      sessionStorage.removeItem('qaPackageResultToken');
      sessionStorage.removeItem('qaPackageNextStage');
      sessionStorage.setItem('qaPackageSearch', JSON.stringify(payload));
    } catch (_) {
      setError(t('required'));
      return;
    }
    location.href = location.origin + '/packages-results?product=' + encodeURIComponent(product) + '&lang=' + payload.lang;
  }

  function routeSummary() {
    var first = state.origin && state.destination ? state.origin.k + ' → ' + state.destination.k : '';
    var dates = mmddyyyy(state.departure) + (state.trip === 'round' ? ' – ' + mmddyyyy(state.returnDate) : '');
    return [first, dates].filter(Boolean).join(' · ');
  }

  function bookingTrackingSnapshot() {
    syncGuestTotals();
    var snapshot = {
      product: state.view === 'hotels' ? 'hotel' : state.view,
      tripType: state.view === 'hotels' ? '' : state.trip,
      language: isEnglish() ? 'en' : 'ar',
      adults: state.adults,
      children: state.children,
      infants: state.infants,
      travellers: totalGuests(),
      rooms: state.roomData.length,
      stage: 'الرئيسية'
    };
    if (state.view !== 'hotels') {
      snapshot.origin = state.origin && state.origin.k;
      snapshot.destination = state.destination && state.destination.k;
      snapshot.departureDate = state.departure && ymd(state.departure);
      if (state.trip === 'round') snapshot.returnDate = state.returnDate && ymd(state.returnDate);
      if (state.trip === 'multi') {
        snapshot.secondOrigin = state.origin2 && state.origin2.k;
        snapshot.secondDestination = state.destination2 && state.destination2.k;
        snapshot.secondDepartureDate = state.departure2 && ymd(state.departure2);
      }
      snapshot.cabinClass = state.cabin;
    }
    if (state.view === 'stopover') {
      snapshot.stopoverLeg = state.stopoverLeg;
      snapshot.stopoverDays = state.stopoverDays;
    }
    if (state.view === 'flight-hotel' || state.view === 'hotels') {
      snapshot.hotelDestination = state.hotelDestination ? formatHotelDestination(state.hotelDestination) : '';
      snapshot.hotelCheckin = state.checkin && ymd(state.checkin);
      snapshot.hotelCheckout = state.checkout && ymd(state.checkout);
    }
    return snapshot;
  }

  function reportBookingState() {
    var snapshot = bookingTrackingSnapshot();
    window.__qaPendingBookingState = snapshot;
    if (typeof window.qaTrackBookingState === 'function') window.qaTrackBookingState(snapshot);
  }

  function addRoomAndPassengerParams(params, stopoverFormat) {
    syncGuestTotals();
    params.set('numRooms', state.roomData.length);
    if (stopoverFormat) params.set('numPassengers', totalGuests());
    state.roomData.forEach(function (room, index) {
      var roomIndex = index + 1;
      params.append(stopoverFormat ? ('numGuests' + roomIndex) : 'numGuests[]', room.adults + room.children + room.infants);
      for (var a = 0; a < room.adults; a += 1) {
        params.append('room' + roomIndex + 'Age[]', '18');
        if (stopoverFormat) params.append('passengerAge[]', '18');
      }
      for (var c = 0; c < room.children; c += 1) {
        var age = room.childAges[c] || 8;
        params.append('room' + roomIndex + 'Age[]', String(age));
        if (stopoverFormat) params.append('passengerAge[]', String(age));
      }
      for (var i = 0; i < room.infants; i += 1) {
        params.append('room' + roomIndex + 'Age[]', '1');
        if (stopoverFormat) params.append('passengerAge[]', '1');
      }
    });
  }

  function searchStopover() {
    var required = ['origin', 'destination'];
    if (state.trip === 'multi') required = required.concat(['origin2', 'destination2']);
    if (!validate(required)) return;
    var params = new URLSearchParams();
    params.set('a', 'flightsearch');
    params.set('iataFrom', state.origin.k);
    params.set('iataTo', state.destination.k);
    params.set('outboundDate', mmddyyyy(state.departure));
    if (state.trip === 'round') {
      params.set('oneway', '0');
      params.set('returnDate', mmddyyyy(state.returnDate));
    } else if (state.trip === 'oneway') {
      params.set('oneway', '1');
    } else {
      params.set('openjaw', '1');
      params.set('otherLegs[2][iataFrom]', state.origin2.k);
      params.set('otherLegs[2][iataTo]', state.destination2.k);
      params.set('leg2_outboundDate', mmddyyyy(state.departure2));
    }
    params.set('searchByAge', '1');
    addRoomAndPassengerParams(params, true);
    params.set('stopover', state.stopoverLeg === 'outbound' ? 'start' : 'end');
    params.set('stopover_nights', String(state.stopoverDays));
    params.set('stopover_iata', 'DOH');
    params.set('stopover_taggroup', 'stopoverProduct');
    params.append('stopover_suppliers[]', '1112');
    params.set('stopover_extendatend', '1');
    params.set('ss', 'stopover');
    params.set('classOfService', state.cabin === 'E' ? 'E' : 'F');
    params.set('utm_source', 'qrcom');
    params.set('utm_medium', 'referral');
    params.set('utm_campaign', 'home_widget_stopover');
    openInternalResults('stopover', params, routeSummary());
  }

  function searchFlightHotel() {
    var required = ['origin', 'destination', 'hotelDestination'];
    if (state.trip === 'multi') required = required.concat(['origin2', 'destination2']);
    if (!validate(required)) return;
    var params = new URLSearchParams();
    params.set('a', 'multicentre_bfv3');
    params.append('products[flight][iataFrom][]', state.origin.k);
    params.append('products[flight][iataTo][]', state.destination.k);
    params.append('products[flight][outboundDate][]', mmddyyyy(state.departure));
    if (state.trip === 'round') {
      params.append('products[flight][iataFrom][]', state.destination.k);
      params.append('products[flight][iataTo][]', state.origin.k);
      params.append('products[flight][outboundDate][]', mmddyyyy(state.returnDate));
      params.set('oneway', '0');
      params.set('searchform', 'multicentre_singlecentre');
    } else if (state.trip === 'oneway') {
      params.set('oneway', '1');
      params.set('searchform', 'multicentre_singlecentre');
    } else {
      params.append('products[flight][iataFrom][]', state.origin2.k);
      params.append('products[flight][iataTo][]', state.destination2.k);
      params.append('products[flight][outboundDate][]', mmddyyyy(state.departure2));
    }
    addRoomAndPassengerParams(params, false);
    params.set('searchByAge', '1');
    params.set('classOfService', state.cabin === 'E' ? 'E' : 'F');
    params.append('products[hotel][locationKey][]', state.hotelDestination.key);
    params.append('products[hotel][checkinDate][]', mmddyyyy(state.checkin));
    params.append('products[hotel][checkoutDate][]', mmddyyyy(state.checkout));
    params.set('ss', 'qrcom');
    params.set('utm_source', 'QR');
    params.set('utm_medium', 'Online');
    params.set('utm_campaign', 'home_widget_fh');
    openInternalResults('flight-hotel', params, [routeSummary(), formatHotelDestination(state.hotelDestination)].filter(Boolean).join(' · '));
  }

  function searchHotels() {
    if (!validate(['hotelDestination'])) return;
    var params = new URLSearchParams();
    params.set('a', 'hotelsearch');
    params.set('locationKey', state.hotelDestination.key);
    params.set('arrDate', mmddyyyy(state.checkin));
    params.set('depDate', mmddyyyy(state.checkout));
    addRoomAndPassengerParams(params, false);
    params.set('searchByAge', '1');
    params.set('ss', 'qrcom');
    params.set('utm_source', 'QR');
    params.set('utm_medium', 'Online');
    params.set('utm_campaign', 'home_widget_hotel');
    openInternalResults('hotel', params, [formatHotelDestination(state.hotelDestination), mmddyyyy(state.checkin) + ' – ' + mmddyyyy(state.checkout)].filter(Boolean).join(' · '));
  }

  function doSearch() {
    if (state.view === 'stopover') searchStopover();
    else if (state.view === 'flight-hotel') searchFlightHotel();
    else searchHotels();
  }

  function openCalendar(key) {
    state.calendarKey = key;
    state.calendarMonth = firstOfMonth(state[key] || new Date());
    state.calendarOpen = true;
    state.guestOpen = false;
    state.cabinOpen = false;
    state.passengerInfoOpen = {};
    renderView();
  }

  function chooseCalendarDate(value) {
    var date = parseYmd(value);
    if (!date || !state.calendarKey) return;
    var key = state.calendarKey;
    syncDate(key, date, false);
    if (key === 'departure' && state.trip === 'round' && state.view !== 'hotels') state.calendarKey = 'returnDate';
    else if (key === 'checkin') state.calendarKey = 'checkout';
    else state.calendarOpen = false;
    state.calendarMonth = firstOfMonth(date);
    renderView();
  }

  function handleClick(event) {
    var mobileCard = event.target.closest('[data-mobile-card]');
    if (mobileCard && isMobile()) {
      var cardName = mobileCard.getAttribute('data-mobile-card');
      if (state.mobileCard === cardName) return;
      state.mobileCard = cardName;
      if (state.mobileCard === 'stopover') state.view = 'stopover';
      if (state.mobileCard === 'packages' && state.view === 'stopover') {
        state.view = 'flight-hotel';
        ensureHotelDestinations();
      }
      state.guestOpen = false;
      state.cabinOpen = false;
      state.passengerInfoOpen = {};
      state.calendarOpen = false;
      renderView();
      return;
    }

    var manageTab = event.target.closest('[data-manage-tab]');
    if (manageTab && isMobile()) {
      state.manageTab = manageTab.getAttribute('data-manage-tab') === 'checkin' ? 'checkin' : 'manage';
      renderView();
      return;
    }

    var view = event.target.closest('[data-view]');
    if (view) {
      state.view = view.getAttribute('data-view');
      if (state.view !== 'stopover') ensureHotelDestinations();
      state.guestOpen = false;
      state.cabinOpen = false;
      state.passengerInfoOpen = {};
      state.promoOpen = false;
      state.calendarOpen = false;
      renderView();
      return;
    }

    var hotelOption = event.target.closest('[data-hotel-key]');
    if (hotelOption) {
      var hotelWrap = hotelOption.closest('[data-hotel-field]');
      var hotelKey = hotelOption.getAttribute('data-hotel-key');
      var hotel = getHotelDestinations().find(function (item) { return item.key === hotelKey; });
      if (hotelWrap && hotel) {
        state.hotelDestination = hotel;
        var hotelInput = hotelWrap.querySelector('[data-hotel-input]');
        if (hotelInput) hotelInput.value = formatHotelDestination(hotel);
        var hotelMenu = hotelWrap.querySelector('.qa-so-hotel-menu');
        if (hotelMenu) hotelMenu.hidden = true;
        hotelWrap.classList.remove('is-invalid');
        setError('');
        reportBookingState();
      }
      return;
    }

    var airportOption = event.target.closest('[data-airport-code]');
    if (airportOption) {
      var wrap = airportOption.closest('[data-airport-field]');
      var key = wrap && wrap.getAttribute('data-airport-field');
      var code = airportOption.getAttribute('data-airport-code');
      var airport = getAirports().find(function (item) { return item.k === code; });
      if (key && airport) {
        var nextAirportKey = key === 'origin' ? 'destination' : (key === 'origin2' ? 'destination2' : '');
        state[key] = airport;
        if (key === 'destination' && state.trip === 'multi' && !state.origin2) state.origin2 = airport;
        var input = wrap.querySelector('input');
        if (input) input.value = formatDisplayAirport(airport);
        var menu = wrap.querySelector('.qa-so-airport-menu');
        if (menu) menu.hidden = true;
        wrap.classList.remove('is-invalid');
        setError('');
        reportBookingState();
        if (nextAirportKey) {
          setTimeout(function () {
            var nextInput = panel.querySelector('[data-airport-input="' + nextAirportKey + '"]');
            if (!nextInput) return;
            nextInput.focus();
            var nextMenu = nextInput.closest('.qa-so-airport').querySelector('.qa-so-airport-menu');
            if (nextMenu && nextMenu.hidden) drawAirportMenu(nextInput);
          }, 0);
        }
      }
      return;
    }

    var airportFieldWrap = event.target.closest('[data-airport-field]');
    if (airportFieldWrap && !event.target.closest('.qa-so-airport-menu')) {
      var airportFieldInput = airportFieldWrap.querySelector('[data-airport-input]');
      if (airportFieldInput) {
        airportFieldInput.focus();
        drawAirportMenu(airportFieldInput);
      }
      return;
    }

    var calendarDate = event.target.closest('[data-calendar-date]');
    if (calendarDate) {
      chooseCalendarDate(calendarDate.getAttribute('data-calendar-date'));
      return;
    }

    var step = event.target.closest('[data-step]');
    if (step) {
      var stepKey = step.getAttribute('data-step');
      var roomIndex = Number(step.getAttribute('data-room-index')) || 0;
      var room = state.roomData[roomIndex];
      var delta = Number(step.getAttribute('data-delta')) || 0;
      if (!room || step.disabled) return;
      room[stepKey] = Math.max(stepKey === 'adults' ? 1 : 0, room[stepKey] + delta);
      if (stepKey === 'children') {
        while (room.childAges.length < room.children) room.childAges.push(8);
        room.childAges = room.childAges.slice(0, room.children);
      }
      syncGuestTotals();
      renderView();
      return;
    }

    var action = event.target.closest('[data-action]');
    if (!action) return;
    var name = action.getAttribute('data-action');
    if (name === 'swap') {
      var temp = state.origin;
      state.origin = state.destination;
      state.destination = temp;
      renderView();
    } else if (name === 'swap-second') {
      var secondTemp = state.origin2;
      state.origin2 = state.destination2;
      state.destination2 = secondTemp;
      renderView();
    } else if (name === 'toggle-guests') {
      state.guestOpen = !state.guestOpen;
      state.cabinOpen = false;
      state.calendarOpen = false;
      if (!state.guestOpen) state.passengerInfoOpen = {};
      renderView();
    } else if (name === 'toggle-cabin') {
      state.cabinOpen = !state.cabinOpen;
      state.guestOpen = false;
      state.passengerInfoOpen = {};
      state.calendarOpen = false;
      renderView();
    } else if (name === 'set-cabin') {
      var cabinValue = action.getAttribute('data-cabin-value');
      if (cabinValue === 'E' || cabinValue === 'F') state.cabin = cabinValue;
      state.cabinOpen = false;
      renderView();
    } else if (name === 'toggle-passenger-info') {
      var infoKey = action.getAttribute('data-info-key');
      if (infoKey) state.passengerInfoOpen[infoKey] = !state.passengerInfoOpen[infoKey];
      renderView();
    } else if (name === 'guest-done') {
      state.guestOpen = false;
      state.passengerInfoOpen = {};
      renderView();
    } else if (name === 'add-room') {
      event.preventDefault();
      syncGuestTotals();
      if (state.roomData.length < 3 && state.adults + state.children <= 7) {
        state.roomData.push({ adults: 2, children: 0, infants: 0, childAges: [] });
        syncGuestTotals();
        renderView();
      }
    } else if (name === 'remove-room') {
      var removeIndex = Number(action.getAttribute('data-room-index'));
      if (removeIndex > 0 && removeIndex < state.roomData.length) {
        state.roomData.splice(removeIndex, 1);
        syncGuestTotals();
        renderView();
      }
    } else if (name === 'days-minus') {
      state.stopoverDays = Math.max(1, state.stopoverDays - 1);
      renderView();
    } else if (name === 'days-plus') {
      state.stopoverDays = Math.min(maxStopoverDays(), state.stopoverDays + 1);
      renderView();
    } else if (name === 'toggle-promo') {
      state.promoOpen = true;
      renderView();
      var promoInput = panel.querySelector('[data-promo]');
      if (promoInput) promoInput.focus();
    } else if (name === 'open-calendar') {
      openCalendar(action.getAttribute('data-calendar-key'));
    } else if (name === 'calendar-prev') {
      state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() - 1, 1);
      renderView();
    } else if (name === 'calendar-next') {
      state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + 1, 1);
      renderView();
    } else if (name === 'calendar-clear') {
      state.calendarOpen = false;
      renderView();
    } else if (name === 'calendar-confirm') {
      state.calendarOpen = false;
      renderView();
    } else if (name === 'search') {
      doSearch();
    }
  }

  function handleSubmit(event) {
    var form = event.target.closest('[data-manage-form]');
    if (!form || !isMobile()) return;
    event.preventDefault();
    var reference = form.elements.bookingReference;
    var lastName = form.elements.lastName;
    var error = form.querySelector('.qa-mobile-manage-error');
    var valid = String(reference && reference.value || '').trim() && String(lastName && lastName.value || '').trim();
    if (reference) reference.classList.toggle('is-invalid', !String(reference.value || '').trim());
    if (lastName) lastName.classList.toggle('is-invalid', !String(lastName.value || '').trim());
    if (error) {
      error.textContent = valid ? '' : t('manageRequired');
      error.hidden = !!valid;
    }
  }

  function handleInput(event) {
    var hotelInput = event.target.closest('[data-hotel-input]');
    if (hotelInput) {
      state.hotelDestination = null;
      drawHotelMenu(hotelInput);
      reportBookingState();
      return;
    }
    var airportInput = event.target.closest('[data-airport-input]');
    if (airportInput) {
      state[airportInput.getAttribute('data-airport-input')] = null;
      drawAirportMenu(airportInput);
      reportBookingState();
      return;
    }
    if (event.target.matches('[data-promo]')) state.promo = event.target.value;
  }

  function handleFocus(event) {
    var hotelInput = event.target.closest('[data-hotel-input]');
    if (hotelInput) {
      drawHotelMenu(hotelInput);
      return;
    }
    var airportInput = event.target.closest('[data-airport-input]');
    if (airportInput) drawAirportMenu(airportInput);
  }

  function handleChange(event) {
    if (event.target.matches('[data-date-key]')) {
      syncDate(event.target.getAttribute('data-date-key'), event.target.value);
      return;
    }
    if (event.target.name === 'qa-so-trip') {
      state.trip = event.target.value;
      if (state.trip === 'oneway' && state.stopoverLeg === 'return') state.stopoverLeg = 'outbound';
      if (state.trip === 'multi') {
        if (!state.origin2 && state.destination) state.origin2 = state.destination;
        if (!state.departure2 || !isAfter(state.departure2, state.departure)) state.departure2 = addDays(state.departure, 1);
      }
      clampStopoverDays();
      state.calendarOpen = false;
      renderView();
      return;
    }
    if (event.target.name === 'qa-so-leg') {
      state.stopoverLeg = event.target.value;
      clampStopoverDays();
      renderView();
      return;
    }
    if (event.target.matches('[data-cabin]')) {
      state.cabin = event.target.value;
      renderView();
      return;
    }
    if (event.target.matches('[data-child-age]')) {
      var ageRoomIndex = Number(event.target.getAttribute('data-room-index')) || 0;
      var ageIndex = Number(event.target.getAttribute('data-child-age')) || 0;
      if (state.roomData[ageRoomIndex]) {
        state.roomData[ageRoomIndex].childAges[ageIndex] = Number(event.target.value);
        syncGuestTotals();
      }
    }
  }

  function syncLanguage() {
    var marker = isEnglish() ? 'en' : 'ar';
    if (marker === observedLanguage) return;
    observedLanguage = marker;
    var airports = getAirports();
    ['origin', 'destination', 'origin2', 'destination2'].forEach(function (key) {
      if (!state[key]) return;
      var translated = airports.find(function (airport) { return airport.k === state[key].k; });
      if (translated) state[key] = translated;
    });
    if (state.hotelDestination) {
      var selectedHotelKey = state.hotelDestination.key;
      ensureHotelDestinations().then(function () {
        var translatedHotel = getHotelDestinations().find(function (destination) { return destination.key === selectedHotelKey; });
        if (translatedHotel) state.hotelDestination = translatedHotel;
        if (panel && !panel.hidden) renderView();
      });
    }
    if (panel && !panel.hidden) renderView();
  }

  function init() {
    root = document.getElementById('qa-static-bw');
    if (!root || root.dataset.qaStopoverDesktop === '2') return;
    bookingBody = root.querySelector('.qbw-body');
    topTabs = Array.prototype.slice.call(root.querySelectorAll(':scope > .qbw-tabs > .qbw-tab'));
    packageTab = topTabs[1];
    if (!bookingBody || topTabs.length < 2 || !packageTab) return;

    root.dataset.qaStopoverDesktop = '2';
    panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'qa-stopover-desktop';
    panel.hidden = true;
    bookingBody.insertAdjacentElement('afterend', panel);

    panel.addEventListener('pointerdown', function (event) {
      closeOverlaysForTarget(event.target);
    }, true);
    panel.addEventListener('click', handleClick);
    panel.addEventListener('input', handleInput);
    panel.addEventListener('focusin', handleFocus);
    panel.addEventListener('change', handleChange);
    panel.addEventListener('submit', handleSubmit);

    var topTabBar = root.querySelector(':scope > .qbw-tabs');
    if (topTabBar) {
      topTabBar.addEventListener('click', function (event) {
        var tab = event.target.closest && event.target.closest('.qbw-tab');
        var index = topTabs.indexOf(tab);
        if (index < 0) return;
        window.setTimeout(function () {
          setActiveTopTab(tab);
          setPackageFavicon(index === 1);
          if (isMobile()) {
            state.mobileCard = 'flight';
            root.classList.remove('qa-so-active');
            panel.hidden = false;
            renderView();
          } else if (index === 1) showPanel();
          else hidePanel();
        }, 0);
      }, true);
    }

    document.addEventListener('click', function (event) {
      if (!panel) return;
      var path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      if (panel.contains(event.target) || path.indexOf(panel) !== -1) return;
      closeMenus();
      if (state.guestOpen || state.cabinOpen || state.calendarOpen) {
        state.guestOpen = false;
        state.cabinOpen = false;
        state.passengerInfoOpen = {};
        state.calendarOpen = false;
        if (!panel.hidden) renderView();
      }
    });

    window.addEventListener('resize', function () {
      if (isMobile()) {
        if (!state.mobileCard) state.mobileCard = 'flight';
        root.classList.remove('qa-so-active');
        panel.hidden = false;
        renderView();
      } else if (packageTab.classList.contains('active')) showPanel();
      else hidePanel();
    });

    if (isMobile()) {
      state.mobileCard = 'flight';
      panel.hidden = false;
      renderView();
    } else {
      syncMobileFlightCard();
    }

    setPackageFavicon(packageTab.classList.contains('active'));
    observedLanguage = isEnglish() ? 'en' : 'ar';
    new MutationObserver(syncLanguage).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
