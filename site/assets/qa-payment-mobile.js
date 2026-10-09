(() => {
  const MOBILE_QUERY = '(max-width: 991px)';
  const PAGE_PATH = '/credit-card-payment';
  let scheduled = false;

  const isPaymentPage = () => window.location.pathname === PAGE_PATH;
  const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;
  const readLang = () => {
    try {
      const pref = JSON.parse(window.localStorage.getItem('jzPref') || '{}') || {};
      const value = String(pref.siteLang || window.localStorage.getItem('jz_site_lang') || pref.lang || window.localStorage.getItem('jz_lang') || document.documentElement.lang || 'ar').replace(/"/g, '').trim().toLowerCase();
      return value === 'en' ? 'en' : 'ar';
    } catch (_) {
      return document.documentElement.lang === 'en' ? 'en' : 'ar';
    }
  };

  const cleanup = () => {
    document.querySelector('.qr-pay-page')?.classList.remove('qa-payment-mobile');
    document.querySelector('.qa-pay-mobile-header-logos')?.remove();
    document.querySelector('.qa-pay-mobile-total')?.remove();
  };

  const readTotal = () => {
    const row = document.querySelector('.qr-pay-trip-row--bold');
    const spans = row ? row.querySelectorAll('span') : [];
    return spans.length ? spans[spans.length - 1].textContent.replace(/\s+/g, ' ').trim() : '';
  };

  const ensureHeader = (page) => {
    const header = page.querySelector('.qr-pay-header');
    if (!header) return;
    let logos = header.querySelector('.qa-pay-mobile-header-logos');
    if (!logos) {
      logos = document.createElement('div');
      logos.className = 'qa-pay-mobile-header-logos';
      logos.setAttribute('aria-label', 'Qatar Airways');
      logos.innerHTML = '<img class="qa-pay-mobile-oneworld" src="/assets/qa-extras-oneworld.svg" alt="oneworld"><img class="qa-pay-mobile-qatar" src="/assets/qa-extras-qatar-logo.svg" alt="Qatar Airways">';
      header.insertBefore(logos, header.firstChild);
    }
  };

  const ensureTotalTray = (page, lang) => {
    let tray = document.querySelector('.qa-pay-mobile-total');
    if (!tray) {
      tray = document.createElement('div');
      tray.className = 'qa-pay-mobile-total';
      tray.setAttribute('role', 'status');
      tray.innerHTML = '<span class="qa-pay-mobile-total-handle" aria-hidden="true"></span><div class="qa-pay-mobile-total-row"><span class="qa-pay-mobile-total-label"></span><strong class="qa-pay-mobile-total-value"></strong></div>';
      page.appendChild(tray);
    }
    tray.dir = lang === 'ar' ? 'rtl' : 'ltr';
    const label = tray.querySelector('.qa-pay-mobile-total-label');
    const value = tray.querySelector('.qa-pay-mobile-total-value');
    if (label) label.textContent = lang === 'ar' ? 'المجموع الكلي' : 'Total';
    if (value) value.textContent = readTotal();
  };

  const sync = () => {
    scheduled = false;
    if (!isPaymentPage() || !isMobile()) {
      cleanup();
      return;
    }
    const page = document.querySelector('.qr-pay-page');
    if (!page) return;
    const lang = readLang();
    page.classList.add('qa-payment-mobile');
    page.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    ensureHeader(page);
    ensureTotalTray(page, lang);
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(sync);
  };

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('storage', schedule);
  document.addEventListener('DOMContentLoaded', schedule);
  schedule();
})();
