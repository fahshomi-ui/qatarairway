(() => {
  'use strict';

  const COUNTRY_CURRENCY = Object.freeze({
    ae: 'AED', am: 'AMD', ao: 'AOA', ar: 'ARS', at: 'EUR', au: 'AUD', az: 'AZN',
    ba: 'BAM', bd: 'BDT', be: 'EUR', bg: 'BGN', bh: 'BHD', br: 'BRL', bw: 'BWP',
    ca: 'CAD', cd: 'CDF', ch: 'CHF', ci: 'XOF', cn: 'CNY', cy: 'EUR', cz: 'CZK',
    de: 'EUR', dj: 'DJF', dk: 'DKK', dz: 'DZD', eg: 'EGP', es: 'EUR', et: 'ETB',
    fi: 'EUR', fr: 'EUR', gb: 'GBP', ge: 'GEL', gh: 'GHS', gr: 'EUR', hk: 'HKD',
    hr: 'EUR', hu: 'HUF', id: 'IDR', ie: 'EUR', in: 'INR', iq: 'IQD', ir: 'IRR',
    it: 'EUR', jo: 'JOD', jp: 'JPY', ke: 'KES', kh: 'KHR', kr: 'KRW', kw: 'KWD',
    la: 'LAK', lb: 'LBP', lk: 'LKR', ma: 'MAD', mk: 'MKD', mm: 'MMK', mv: 'MVR',
    my: 'MYR', mz: 'MZN', na: 'NAD', ng: 'NGN', nl: 'EUR', no: 'NOK', np: 'NPR',
    nz: 'NZD', om: 'OMR', ph: 'PHP', pk: 'PKR', pl: 'PLN', pt: 'EUR', qa: 'QAR',
    ro: 'RON', rs: 'RSD', ru: 'RUB', rw: 'RWF', sa: 'SAR', sc: 'SCR', sd: 'SDG',
    se: 'SEK', sg: 'SGD', sn: 'XOF', th: 'THB', tn: 'TND', tr: 'TRY', tw: 'TWD',
    tz: 'TZS', ua: 'UAH', ug: 'UGX', us: 'USD', uz: 'UZS', vn: 'VND', za: 'ZAR',
    zm: 'ZMW', zw: 'ZWG'
  });
  const SUPPORTED_CURRENCIES = new Set(Object.values(COUNTRY_CURRENCY));
  const ENGLISH_TEXT = Object.freeze(Object.assign({
    'اكتشف': 'Explore', 'احجز': 'Book', 'الرحلات': 'Flights', 'نادي الامتياز': 'Privilege Club',
    'المساعدة': 'Help', 'تسجيل الدخول': 'Log in', '| اشترك الآن': '| Sign up now', 'اشترك الآن': 'Sign up now',
    'احجز الآن': 'Book now', 'عطلة الصيف بانتظارك مع رحلاتنا الموسمية': 'Summer holiday awaits you with our seasonal flights',
    'احجز رحلة طيران': 'Book a flight', 'الباقات / التوقف المؤقت': 'Packages / Stopover',
    'إدارة الحجز / تسجيل الدخول': 'Manage booking / Log in', 'حالة الرحلة': 'Flight status',
    'رحلة ذهاب وعودة': 'Round trip', 'اتجاه واحد': 'One way', 'وجهات متعددة': 'Multi-city',
    'من': 'From', 'إلى': 'To', 'رحلة المغادرة': 'Departure', 'المسافرون / درجة السفر': 'Passengers / Cabin class',
    '1 المسافر الدرجة السياحية': '1 passenger Economy', 'احجز باستخدام نقاط أفيوس': 'Book using Avios',
    'إضافة رمز ترويجي': 'Add promo code', 'ابحث عن الرحلات': 'Search flights', 'احصل على الإلهام': 'Get inspired',
    'اعرف المزيد': 'Learn more', 'انضم الآن': 'Join now', 'أحدث العروض على تذاكر رحلات الطيران': 'Latest flight offers',
    'الدرجة السياحية من': 'Economy from', 'السياحية': 'Economy', 'عرض المزيد': 'View more',
    'الخطوط الجوية القطرية قطر': 'Qatar Airways Qatar'
  }, window.__QA_ENGLISH_TRANSLATIONS || {}));

  const ENGLISH_FOOTER = Object.freeze([
    Object.freeze({ heading: 'Qatar Airways', selector: '.qaairways', links: ['About us', 'Careers', 'Press releases', 'Sponsorship', 'Al Darb Qatarisation', 'Annual reports', 'Environmental sustainability'] }),
    Object.freeze({ heading: 'Group companies', selector: '.groups', links: ['Hamad International Airport', 'Qatar Executive', 'Qatar Duty Free', 'Qatar Airways Cargo', 'Internal Media Services', 'Design Organisation', 'Group companies'] }),
    Object.freeze({ heading: 'Business solutions', selector: '.bsolutions', links: ['Corporate travel', 'Beyond Business', 'Group travel', 'QMICE Meetings and Events'] }),
    Object.freeze({ heading: 'Business partners', selector: '.bpartners', links: ['Affiliate marketing', 'e-Procurement and Supplier Registration', 'Trade partners'] }),
    Object.freeze({ heading: 'Help', selector: '.respgethelp', links: ['Contact us', 'Browse FAQs', 'Travel alerts'] }),
  ]);
  const ENGLISH_POLICY_LINKS = Object.freeze([
    'Cookie policy', 'Legal', 'Privacy', 'Accessibility', 'Combating human trafficking',
    'Customer service commitment', 'Conditions of carriage', 'Optional services and fees',
    'Tarmac delay plan', 'Sitemap',
  ]);

  function captureFooterOriginal() {
    const footer = document.querySelector('footer.customFooter');
    if (!footer || footer.__qaOriginalFooterHTML || !footerMarkupReady(footer)) return;
    footer.__qaOriginalFooterHTML = footer.innerHTML;
  }

  function rebuildFooterLinks(holder, labels) {
    if (!holder) return;
    const sourceAnchors = Array.from(holder.querySelectorAll('a')).map((anchor) => anchor.cloneNode(true));
    const fallback = sourceAnchors[sourceAnchors.length - 1] || document.createElement('a');
    holder.innerHTML = '';
    const list = document.createElement('ul');
    list.className = 'list-unstyled';
    labels.forEach((label, index) => {
      const anchor = (sourceAnchors[index] || fallback).cloneNode(true);
      anchor.textContent = label;
      const item = document.createElement('li');
      item.appendChild(anchor);
      list.appendChild(item);
    });
    holder.appendChild(list);
  }

  function renderEnglishFooter(isArabic) {
    const footer = document.querySelector('footer.customFooter');
    if (!footer) return;
    if (!footerMarkupReady(footer)) {
      if (!footerRenderTimer) footerRenderTimer = window.setTimeout(() => { footerRenderTimer = 0; renderEnglishFooter(isArabic); }, 250);
      return;
    }
    captureFooterOriginal();
    if (isArabic) {
      if (footer.dataset.qaEnglishFooter === '1' && footer.__qaOriginalFooterHTML) {
        footer.innerHTML = footer.__qaOriginalFooterHTML;
        delete footer.dataset.qaEnglishFooter;
      }
      return;
    }
    if (footer.dataset.qaEnglishFooter === '1') return;
    if (footer.__qaOriginalFooterHTML) footer.innerHTML = footer.__qaOriginalFooterHTML;
    const desktopHeadings = footer.querySelectorAll('.desktopnav .footernav-expand h2');
    const columns = footer.querySelectorAll('#collapsednav .respfooter');
    ENGLISH_FOOTER.forEach((column, index) => {
      if (desktopHeadings[index]) desktopHeadings[index].textContent = column.heading;
      const columnRoot = footer.querySelector(`#collapsednav ${column.selector}`) || columns[index];
      if (!columnRoot) return;
      const mobileHeading = columnRoot.querySelector('.title .mt-3');
      if (mobileHeading) mobileHeading.textContent = column.heading;
      rebuildFooterLinks(columnRoot.querySelector('.links-container'), column.links);
    });
    footer.querySelectorAll('.qaawards img[data-src]').forEach((image) => {
      const source = image.getAttribute('data-src');
      if (source && !image.getAttribute('src')) image.setAttribute('src', source);
      image.setAttribute('alt', 'Award');
      image.setAttribute('loading', 'eager');
    });
    const policyLinks = footer.querySelector('.policyinfo.d-lg-block .policy-links');
    rebuildFooterLinks(policyLinks?.querySelector('ul'), ENGLISH_POLICY_LINKS);
    const cookieButton = policyLinks?.querySelector('.cookie-ft-btn');
    if (cookieButton) {
      cookieButton.textContent = 'Cookie Consent';
      cookieButton.setAttribute('aria-label', 'Cookie Consent');
    }
    footer.dataset.qaEnglishFooter = '1';
  }

  function applyAirportLabels(isArabic) {
    const list = window.cityListJSON;
    const labels = window.QA_AIRPORTS_EN;
    if (!Array.isArray(list) || !labels) return;
    list.forEach((entry) => {
      const code = String(entry.shorthand || '').toUpperCase();
      const english = labels[code];
      if (!english) return;
      if (!entry.__qaOriginalAirportData) {
        entry.__qaOriginalAirportData = {
          airport: entry.airport,
          city: entry.city,
          country: entry.country,
        };
      }
      if (isArabic) {
        Object.assign(entry, entry.__qaOriginalAirportData);
        return;
      }
      const cityCountry = String(english.c || '').split(',');
      entry.city = cityCountry.shift()?.trim() || entry.__qaOriginalAirportData.city;
      entry.country = cityCountry.join(',').trim() || entry.__qaOriginalAirportData.country;
      entry.airport = english.n || entry.__qaOriginalAirportData.airport;
    });
    const input = document.getElementById('newsLetterFrom-new');
    if (input) input.setAttribute('dir', isArabic ? 'rtl' : 'ltr');
  }

  const clean = (value) => String(value || '').replace(/^"|"$/g, '').trim().toLowerCase();
  const safeRead = (key) => { try { return window.localStorage.getItem(key) || ''; } catch { return ''; } };
  const safeWrite = (key, value) => { try { window.localStorage.setItem(key, value); } catch {} };
  const normalizeLanguage = (value) => /^[a-z]{2}$/.test(clean(value)) ? clean(value) : 'ar';
  const appLanguage = (siteLanguage) => siteLanguage === 'ar' ? 'ar' : 'en';

  function scheduleAirportLabels(isArabic) {
    if (airportRefreshTimer) {
      window.clearInterval(airportRefreshTimer);
      airportRefreshTimer = 0;
    }
    applyAirportLabels(isArabic);
    if (isArabic) return;
    let attempts = 0;
    airportRefreshTimer = window.setInterval(() => {
      applyAirportLabels(false);
      attempts += 1;
      const airportLabelsReady = window.QA_AIRPORTS_EN && Object.keys(window.QA_AIRPORTS_EN).length > 0;
      if ((Array.isArray(window.cityListJSON) && window.cityListJSON.length && airportLabelsReady && attempts >= 2) || attempts >= 50) {
        window.clearInterval(airportRefreshTimer);
        airportRefreshTimer = 0;
      }
    }, 200);
  }

  function readLocale(link) {
    const parts = String(link?.dataset.code || '').split('/').filter(Boolean);
    const country = clean(parts[0] || 'qa');
    const siteLang = normalizeLanguage(parts[1] || 'en');
    const currency = String(COUNTRY_CURRENCY[country] || 'QAR').toUpperCase();
    return { country, siteLang, lang: appLanguage(siteLang), currency, path: link?.dataset.path || '' };
  }

  function readStoredLocale() {
    let pref = {};
    try { pref = JSON.parse(safeRead('jzPref') || '{}') || {}; } catch { pref = {}; }
    const country = clean(pref.country || safeRead('jz_country') || 'qa');
    const siteLang = normalizeLanguage(pref.siteLang || safeRead('jz_site_lang') || pref.lang || safeRead('jz_lang') || 'ar');
    const currency = String(pref.currency || safeRead('jz_currency') || COUNTRY_CURRENCY[country] || 'QAR').toUpperCase();
    return { country, siteLang, lang: appLanguage(siteLang), currency, path: pref.path || safeRead('jz_path') || '' };
  }

  function localeFromCurrentPath(links) {
    const pathname = String(window.location.pathname || '').replace(/\/+$/, '');
    const link = links.find((candidate) => {
      const path = String(candidate.dataset.path || '').replace(/\/+$/, '');
      return path && pathname === `${path}/homepage.html`;
    });
    if (link) return { locale: readLocale(link), link };

    // The locale route itself is authoritative on a fresh load. Do not let a
    // previous Arabic localStorage preference override /en-xx/homepage.html.
    const match = pathname.match(/^\/(en|ar)-([a-z]{2})\/homepage\.html$/i);
    if (!match) return null;
    const siteLang = match[1].toLowerCase();
    const country = match[2].toLowerCase();
    const path = `/${siteLang}-${country}`;
    const routeLink = links.find((candidate) => {
      const candidateLocale = readLocale(candidate);
      return candidateLocale.country === country && candidateLocale.siteLang === siteLang;
    });
    return {
      locale: { country, siteLang, lang: appLanguage(siteLang), currency: String(COUNTRY_CURRENCY[country] || 'QAR').toUpperCase(), path },
      link: routeLink || null,
    };
  }

  let applyingTextLanguage = false;
  let englishObserver = null;
  let englishRefreshTimer = 0;
  let airportRefreshTimer = 0;
  let footerRenderTimer = 0;

  function footerMarkupReady(footer) {
    return !!footer && footer.querySelectorAll('#collapsednav .respfooter').length >= 5 && footer.querySelectorAll('.qaawards > ul > li').length >= 4 && !!footer.querySelector('.policyinfo.d-lg-block .policy-links > ul');
  }

  function applyTextLanguage(isArabic) {
    if (applyingTextLanguage) return;
    applyingTextLanguage = true;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (node.parentElement && ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentElement.tagName)) return;
      const raw = node.nodeValue || '';
      if (!node.__qaOriginalText) node.__qaOriginalText = raw;
      const source = node.__qaOriginalText;
      const trimmed = source.trim();
      if (!trimmed) return;
      node.nodeValue = isArabic ? source : (ENGLISH_TEXT[trimmed] ? source.replace(trimmed, ENGLISH_TEXT[trimmed]) : source);
    });
    const attrs = ['aria-label', 'title', 'placeholder', 'alt'];
    document.querySelectorAll('*').forEach((element) => {
      attrs.forEach((attr) => {
        if (!element.hasAttribute(attr)) return;
        const key = `data-qa-original-${attr}`;
        if (!element.hasAttribute(key)) element.setAttribute(key, element.getAttribute(attr) || '');
        const source = element.getAttribute(key) || '';
        const trimmed = source.trim();
        if (!trimmed) return;
        element.setAttribute(attr, isArabic ? source : (ENGLISH_TEXT[trimmed] || source));
      });
    });
    document.title = isArabic ? 'الخطوط الجوية القطرية قطر | الخطوط الجوية القطرية' : 'Book Flights - Book & Fly from Qatar | Qatar Airways';
    document.documentElement.dataset.qaContentLanguage = isArabic ? 'ar' : 'en';
    applyingTextLanguage = false;
  }

  function watchDynamicEnglish(isArabic) {
    if (isArabic) {
      if (englishObserver) { englishObserver.disconnect(); englishObserver = null; }
      if (englishRefreshTimer) { clearTimeout(englishRefreshTimer); englishRefreshTimer = 0; }
      return;
    }
    if (englishObserver || !document.body) return;
    englishObserver = new MutationObserver(() => {
      if (applyingTextLanguage || englishRefreshTimer) return;
      englishRefreshTimer = window.setTimeout(() => {
        englishRefreshTimer = 0;
        applyTextLanguage(false);
        applyEnglishHero(false);
        renderEnglishFooter(false);
      }, 120);
    });
    englishObserver.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'title', 'placeholder', 'alt'] });
  }

  function applyEnglishHero(isArabic) {
    const hero = document.querySelector('#mainfocus.hero-image-new');
    if (!hero) return;
    const images = hero.querySelectorAll('picture img');
    const headings = hero.querySelectorAll('.hero-image-teaser h1');
    const links = hero.querySelectorAll('.hero-image-teaser a.knowmore');
    if (!isArabic) {
      const image = 'https://dmassets.qatarairways.com/adobe/assets/urn:aaid:aem:d49b80a5-14f8-4974-ba0b-ec758161fafc/as/hn-qatari-students.jpg?quality=95&width=1600';
      images.forEach((img) => { img.src = image; img.srcset = image; img.alt = 'Switch to travel mode'; });
      headings.forEach((heading) => { heading.textContent = 'Switch to travel mode'; });
      links.forEach((link) => { link.textContent = 'Join now'; link.href = '/en-qa/homepage.html#student-club'; link.setAttribute('aria-label', 'Aim for the skies with Student Club'); });
    }
  }

  function updatePageLocale(locale, selectedLink, localeLinks) {
    const siteLang = normalizeLanguage(locale.siteLang);
    const isArabic = siteLang === 'ar';
    document.documentElement.lang = `${siteLang}-${locale.country}`;
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
    document.documentElement.classList.toggle('ar', isArabic);
    document.documentElement.classList.toggle('en', !isArabic);
    if (document.body) {
      document.body.dir = isArabic ? 'rtl' : 'ltr';
      document.body.classList.toggle('newhome-ar', isArabic);
      document.body.classList.toggle('newhome-en', !isArabic);
    }
    document.documentElement.dataset.qaLocale = `${locale.country}-${siteLang}`;
    document.documentElement.dataset.qaAppLanguage = appLanguage(siteLang);
    scheduleAirportLabels(isArabic);

    const triggers = Array.from(document.querySelectorAll('.changeRegionMobile, #change-language-trigger-desktop'));
    const label = selectedLink?.getAttribute('aria-label') || `${locale.country} - ${siteLang}`;
    triggers.forEach((trigger) => {
      trigger.setAttribute('aria-label', label);
      trigger.setAttribute('title', 'Change language / location');
      trigger.dataset.locale = `${locale.country}-${siteLang}`;
      trigger.dataset.language = siteLang;
      const languageLabel = trigger.querySelector('[data-id="languageID"]');
      if (languageLabel) languageLabel.textContent = siteLang;
      const flag = trigger.querySelector('img');
      if (flag) {
        flag.src = `https://www.qatarairways.com/content/dam/assets/config/flag-icons/${locale.country}.png`;
        flag.alt = `${locale.country} flag`;
      }
    });

    const countryInput = document.getElementById('countryCodeVal');
    const languageInput = document.getElementById('languageCodeVal');
    if (countryInput) countryInput.value = locale.country;
    if (languageInput) languageInput.value = siteLang;
    localeLinks.forEach((link) => {
      const current = readLocale(link);
      const selected = current.country === locale.country && current.siteLang === siteLang;
      link.classList.toggle('active', selected);
      link.classList.toggle('notselected', !selected);
      link.setAttribute('aria-current', selected ? 'page' : 'false');
    });
    applyTextLanguage(isArabic);
    applyEnglishHero(isArabic);
    renderEnglishFooter(isArabic);
    watchDynamicEnglish(isArabic);
  }

  function persistLocale(locale, selectedLink, localeLinks) {
    const currency = String(locale.currency || COUNTRY_CURRENCY[locale.country] || 'QAR').toUpperCase();
    const normalized = {
      country: locale.country,
      lang: appLanguage(locale.siteLang),
      siteLang: normalizeLanguage(locale.siteLang),
      currency: SUPPORTED_CURRENCIES.has(currency) ? currency : 'QAR',
      curr: SUPPORTED_CURRENCIES.has(currency) ? currency : 'QAR',
      path: locale.path || selectedLink?.dataset.path || ''
    };
    safeWrite('jzPref', JSON.stringify(normalized));
    safeWrite('jz_lang', normalized.lang);
    safeWrite('jz_currency', normalized.currency);
    safeWrite('jz_country', normalized.country);
    safeWrite('jz_site_lang', normalized.siteLang);
    safeWrite('jz_path', normalized.path);
    safeWrite('lang', normalized.lang);
    safeWrite('jzPrevLang', JSON.stringify(normalized.lang));
    updatePageLocale(normalized, selectedLink, localeLinks);
    const detail = { ...normalized };
    window.dispatchEvent(new CustomEvent('qa:locale-change', { detail }));
    document.dispatchEvent(new CustomEvent('qa:locale-change', { detail }));
    return normalized;
  }

  function closeNativeDialog() {
    const close = document.querySelector('#change-language-menu-desktop .dismissDropdown');
    if (close) close.click();
  }

  function navigateLocally(locale) {
    const path = locale.path || (locale.siteLang === 'ar' ? '/ar-qa' : '/en-qa');
    const target = `${window.location.origin}${path.replace(/\/+$/, '')}/homepage.html`;
    if (window.location.pathname !== new URL(target).pathname) window.location.assign(target);
  }

  function bindStaticNoNavigation() {
    if (document.documentElement.dataset.qaStaticNoNavigation === '1') return;
    document.addEventListener('click', (event) => {
      const target = event.target.closest('#header .main-menu > li > button.nav-link, #header .helpLink a.nav-link, #header a.searchicon, #header #loginMenuHeader, #header #header-signuplink, #mainfocus .hero-image-teaser a.knowmore');
      if (!target) return;
      if (target.matches('#mainfocus .hero-image-teaser a.knowmore[href*="#student-club"], #mainfocus .hero-image-teaser a.knowmore[href="#latest-flight-offers"]')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
    document.documentElement.dataset.qaStaticNoNavigation = '1';
  }

  function bind() {
    bindStaticNoNavigation();
    const dialog = document.getElementById('change-language-menu-desktop');
    captureFooterOriginal();
    if (!dialog || dialog.dataset.qaLinksBound === '1') return;
    dialog.dataset.qaLinksBound = '1';
    const localeLinks = Array.from(dialog.querySelectorAll('a[data-code][data-path]'));
    const current = localeFromCurrentPath(localeLinks);
    const initial = current || { locale: readStoredLocale(), link: null };
    const initialLink = initial.link || localeLinks.find((link) => {
      const candidate = readLocale(link);
      return candidate.country === initial.locale.country && candidate.siteLang === initial.locale.siteLang;
    });
    persistLocale({ ...initial.locale, path: initial.locale.path || initialLink?.dataset.path || '' }, initialLink, localeLinks);

    dialog.addEventListener('click', (event) => {
      const link = event.target.closest('a[data-code][data-path]');
      if (!link || !dialog.contains(link)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const locale = persistLocale(readLocale(link), link, localeLinks);
      closeNativeDialog();
      navigateLocally(locale);
    }, true);

    dialog.querySelectorAll('a[href*="q=global/"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const match = String(link.href).match(/[?&]q=global\/(ar|en)/i);
        if (!match) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const siteLang = normalizeLanguage(match[1]);
        const locale = persistLocale({ country: 'qa', siteLang, currency: 'QAR', path: siteLang === 'ar' ? '/ar-qa' : '/en-qa' }, link, localeLinks);
        closeNativeDialog();
        navigateLocally(locale);
      }, true);
    });
    document.documentElement.dataset.qaRegionLinks = 'ready';
  }

  bind();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  new MutationObserver(bind).observe(document.documentElement, { childList: true, subtree: true });
})();
