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
    zm: 'ZMW', zw: 'ZWG',
  });
  const SUPPORTED_CURRENCIES = new Set(Object.values(COUNTRY_CURRENCY));

  const clean = (value) => String(value || '').replace(/^"|"$/g, '').trim().toLowerCase();

  const safeRead = (key) => {
    try { return window.localStorage.getItem(key) || ''; } catch { return ''; }
  };

  const safeWrite = (key, value) => {
    try { window.localStorage.setItem(key, value); } catch { /* private mode */ }
  };

  const normalizeSiteLanguage = (value) => {
    const candidate = clean(value);
    return /^[a-z]{2}$/.test(candidate) ? candidate : 'ar';
  };

  const appLanguage = (siteLanguage) => siteLanguage === 'ar' ? 'ar' : 'en';

  const parseStoredPreference = () => {
    let pref = {};
    try { pref = JSON.parse(safeRead('jzPref') || '{}') || {}; } catch { pref = {}; }
    const country = clean(pref.country || safeRead('jz_country') || document.getElementById('countryCodeVal')?.value || 'qa');
    const siteLang = normalizeSiteLanguage(
      pref.siteLang || pref.language || safeRead('jz_site_lang') || pref.lang || safeRead('jz_lang') || safeRead('lang') || document.getElementById('languageCodeVal')?.value || 'ar'
    );
    const storedCurrency = String(pref.currency || pref.curr || safeRead('jz_currency') || '').toUpperCase();
    const mappedCurrency = String(COUNTRY_CURRENCY[country] || 'QAR').toUpperCase();
    const currency = SUPPORTED_CURRENCIES.has(storedCurrency) ? storedCurrency : mappedCurrency;
    return {
      country,
      siteLang,
      lang: appLanguage(siteLang),
      currency,
      path: pref.path || safeRead('jz_path') || '',
    };
  };

  const readLinkLocale = (link) => {
    const parts = String(link?.dataset.code || '').split('/').filter(Boolean);
    const country = clean(parts[0] || 'qa');
    const siteLang = normalizeSiteLanguage(parts[1] || 'en');
    const mapped = String(COUNTRY_CURRENCY[country] || 'QAR').toUpperCase();
    return {
      country,
      siteLang,
      lang: appLanguage(siteLang),
      currency: SUPPORTED_CURRENCIES.has(mapped) ? mapped : 'QAR',
      path: link?.dataset.path || '',
    };
  };

  const boot = () => {
    // Qatar's own header scripts may replace the trigger/dialog after the first
    // DOM pass. Rebind against the live nodes instead of trusting the old ready
    // flag, otherwise the visible AR button can lose its click handler.
    const previous = window.__qaRegionSelectorState;
    if (previous?.trigger?.isConnected && previous?.dialog?.isConnected) return true;

    const trigger = document.getElementById('change-language-trigger-desktop');
    const dialog = document.getElementById('change-language-menu-desktop');
    if (!trigger || !dialog) return false;

    const mobileTriggers = Array.from(document.querySelectorAll('.changeRegionMobile'))
      .filter((candidate) => candidate !== trigger);
    const triggers = [trigger, ...mobileTriggers];
    const scroller = dialog.querySelector('.scrollspy-search');
    const tabs = Array.from(dialog.querySelectorAll('[role="tab"][aria-controls]'));
    const panelById = new Map(
      Array.from(dialog.querySelectorAll('[role="tabpanel"][id]')).map((panel) => [panel.id, panel])
    );
    const panelForTab = (tab) => panelById.get(tab.getAttribute('aria-controls') || '');
    const panels = tabs.map(panelForTab).filter(Boolean);
    const localeLinks = Array.from(dialog.querySelectorAll('a[data-code][data-path]'));
    const closeButton = dialog.querySelector('.dismissDropdown');

    const setActiveTab = (activeTab) => {
      tabs.forEach((tab) => {
        const selected = tab === activeTab;
        tab.classList.toggle('active', selected);
        tab.setAttribute('aria-selected', selected ? 'true' : 'false');
        tab.setAttribute('tabindex', selected ? '0' : '-1');
      });
    };

    const showPanel = (panel) => {
      panels.forEach((candidate) => {
        candidate.style.display = candidate === panel ? '' : 'none';
      });
    };

    const scrollToPanel = (tab, smooth = true) => {
      const panel = panelForTab(tab);
      if (!panel || !scroller) return;
      showPanel(panel);
      const top = scroller.scrollTop + panel.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 12;
      scroller.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
      setActiveTab(tab);
    };

    const updateHeader = (locale, selectedLink) => {
      const siteLang = normalizeSiteLanguage(locale.siteLang || locale.lang);
      const appLang = appLanguage(siteLang);
      document.documentElement.lang = `${siteLang}-${locale.country}`;
      document.documentElement.dir = siteLang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.classList.toggle('ar', siteLang === 'ar');
      document.documentElement.classList.toggle('en', siteLang !== 'ar');
      document.documentElement.dataset.qaLocale = `${locale.country}-${siteLang}`;
      document.documentElement.dataset.qaAppLanguage = appLang;

      const flag = selectedLink?.querySelector('img')?.getAttribute('src')
        || `https://www.qatarairways.com/content/dam/assets/config/flag-icons/${locale.country}.png`;
      const regionLabel = selectedLink?.getAttribute('aria-label') || `${locale.country} - ${siteLang}`;
      triggers.forEach((candidate) => {
        candidate.setAttribute('aria-label', regionLabel);
        candidate.setAttribute('title', 'Change language / location');
        candidate.setAttribute('aria-controls', 'change-language-menu-desktop');
        const image = candidate.querySelector('img');
        if (image) {
          image.src = flag;
          image.alt = `${locale.country} flag`;
          image.setAttribute('aria-hidden', 'true');
        }
        const label = candidate.querySelector('[data-id="languageID"]');
        if (label) label.textContent = siteLang;
        candidate.dataset.locale = `${locale.country}-${siteLang}`;
        candidate.dataset.language = siteLang;
        candidate.dataset.appLanguage = appLang;
      });

      const countryInput = document.getElementById('countryCodeVal');
      const languageInput = document.getElementById('languageCodeVal');
      if (countryInput) countryInput.value = locale.country;
      if (languageInput) languageInput.value = siteLang;
      const appRoot = document.querySelector('app-root');
      if (appRoot) {
        appRoot.setAttribute('language', siteLang);
        appRoot.setAttribute('dir', siteLang === 'ar' ? 'rtl' : 'ltr');
      }

      localeLinks.forEach((link) => {
        const linkLocale = readLinkLocale(link);
        const selected = link === selectedLink || (
          !selectedLink && linkLocale.country === locale.country && linkLocale.siteLang === siteLang
        );
        link.classList.toggle('active', selected);
        link.classList.toggle('notselected', !selected);
        link.setAttribute('aria-current', selected ? 'page' : 'false');
      });
    };

    const persistLocale = (locale, selectedLink) => {
      const siteLang = normalizeSiteLanguage(locale.siteLang || locale.lang);
      const normalized = {
        country: locale.country,
        lang: appLanguage(siteLang),
        siteLang,
        currency: String(locale.currency || COUNTRY_CURRENCY[locale.country] || 'QAR').toUpperCase(),
        curr: String(locale.currency || COUNTRY_CURRENCY[locale.country] || 'QAR').toUpperCase(),
        path: locale.path || selectedLink?.dataset.path || '',
      };
      safeWrite('jzPref', JSON.stringify(normalized));
      safeWrite('jz_lang', normalized.lang);
      safeWrite('jz_currency', normalized.currency);
      safeWrite('jz_country', normalized.country);
      safeWrite('jz_site_lang', normalized.siteLang);
      safeWrite('jz_path', normalized.path);
      safeWrite('lang', normalized.lang);
      safeWrite('jzPrevLang', JSON.stringify(normalized.lang));
      updateHeader(normalized, selectedLink);
      const detail = { ...normalized };
      window.dispatchEvent(new CustomEvent('qa:locale-change', { detail }));
      document.dispatchEvent(new CustomEvent('qa:locale-change', { detail }));
      return normalized;
    };

    const openDialog = () => {
      dialog.classList.add('show');
      dialog.setAttribute('aria-hidden', 'false');
      triggers.forEach((candidate) => candidate.setAttribute('aria-expanded', 'true'));
      document.body.classList.add('qa-region-dialog-open');
      const active = tabs.find((tab) => tab.classList.contains('active')) || tabs[0];
      if (active) {
        const panel = panelForTab(active);
        if (panel) showPanel(panel);
        setActiveTab(active);
      }
      window.setTimeout(() => closeButton?.focus({ preventScroll: true }), 0);
    };

    const closeDialog = (returnFocus = true) => {
      dialog.classList.remove('show');
      dialog.setAttribute('aria-hidden', 'true');
      triggers.forEach((candidate) => candidate.setAttribute('aria-expanded', 'false'));
      document.body.classList.remove('qa-region-dialog-open');
      if (returnFocus) trigger.focus({ preventScroll: true });
    };

    const initial = parseStoredPreference();
    const initialLink = localeLinks.find((link) => {
      const candidate = readLinkLocale(link);
      return candidate.country === initial.country && candidate.siteLang === initial.siteLang;
    });
    persistLocale({ ...initial, path: initial.path || initialLink?.dataset.path || '' }, initialLink);

    triggers.forEach((candidate) => {
      candidate.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        dialog.classList.contains('show') ? closeDialog() : openDialog();
      }, true);
    });

    closeButton?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeDialog();
    }, true);

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        scrollToPanel(tab);
      }, true);
      tab.addEventListener('keydown', (event) => {
        let next = index;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          scrollToPanel(tab);
          return;
        } else return;
        event.preventDefault();
        tabs[next].focus();
        scrollToPanel(tabs[next]);
      });
    });

    if (scroller && panels.length) {
      let ticking = false;
      scroller.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          const line = scroller.getBoundingClientRect().top + 48;
          const visiblePanels = panels.filter((panel) => getComputedStyle(panel).display !== 'none');
          const current = visiblePanels.find((panel) => panel.getBoundingClientRect().top <= line) || visiblePanels[0] || panels[0];
          const tab = tabs.find((candidate) => candidate.getAttribute('aria-controls') === current.id);
          if (tab) setActiveTab(tab);
          ticking = false;
        });
      }, { passive: true });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && dialog.classList.contains('show')) closeDialog();
    });

    document.addEventListener('pointerdown', (event) => {
      if (!dialog.classList.contains('show')) return;
      if (dialog.contains(event.target) || triggers.some((candidate) => candidate.contains(event.target))) return;
      closeDialog();
    }, true);

    localeLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        persistLocale(readLinkLocale(link), link);
        closeDialog(false);
      }, true);
    });

    window.__qaRegionSelectorState = { trigger, dialog };
    document.documentElement.dataset.qaRegionSelector = 'ready';
    return true;
  };

  boot();
  const observer = new MutationObserver(() => {
    boot();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
