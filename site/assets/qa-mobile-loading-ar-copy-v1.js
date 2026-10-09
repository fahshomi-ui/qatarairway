(function () {
  'use strict';

  var FIXED_CLASS = 'qa-flight-loading-ar-copy-fixed';

  function isMobile() {
    return window.matchMedia('(max-width: 700px)').matches;
  }

  function hasStoredArabic() {
    try {
      var pref = JSON.parse(window.localStorage.getItem('jzPref') || '{}');
      return pref.siteLang === 'ar' || pref.lang === 'ar' ||
        window.localStorage.getItem('jz_lang') === 'ar' ||
        window.localStorage.getItem('lang') === 'ar';
    } catch (error) {
      return false;
    }
  }

  function isArabic() {
    var body = document.body;
    var root = document.documentElement;
    return Boolean(
      (body && body.classList.contains('newhome-ar')) ||
      /^\/ar-[a-z]{2}\/homepage\.html$/i.test(window.location.pathname) ||
      root.dir === 'rtl' ||
      /^ar(?:-|$)/i.test(root.lang || '') ||
      hasStoredArabic()
    );
  }

  function makeFixedCopy() {
    var copy = document.createElement('div');
    copy.className = 'qa-flight-loading-copy ' + FIXED_CLASS;
    copy.dir = 'rtl';
    copy.setAttribute('aria-live', 'polite');
    copy.style.cssText = [
      'display:none',
      'width:calc(100% - 44px)',
      'box-sizing:border-box',
      'flex:0 0 auto',
      'margin:0',
      'padding:18px 0 0',
      'background:transparent',
      'align-items:center',
      'justify-content:flex-start',
      'flex-direction:column',
      'text-align:center',
      'direction:rtl',
      'color:#4b5360',
      'z-index:2147483647'
    ].join('!important;') + '!important;';

    var title = document.createElement('h1');
    title.textContent = 'إنها التفاصيل التي تجعل من الرحلة مثالية';
    title.style.cssText = 'margin:0!important;max-width:100%!important;color:#525a66!important;font:400 clamp(22px,5.8vw,34px)/1.25 Arial,sans-serif!important;white-space:normal!important;';

    var status = document.createElement('p');
    status.textContent = 'نقوم بالبحث عن الرحلات...';
    status.style.cssText = 'margin:4px 0 0!important;color:#8a9098!important;font:400 clamp(13px,3.3vw,18px)/1.4 Arial,sans-serif!important;';

    copy.appendChild(title);
    copy.appendChild(status);
    return copy;
  }

  function ensureCopy() {
    var overlay = document.getElementById('qa-flight-loading');
    if (!overlay) return;

    var showArabicCopy = isMobile() && isArabic();
    var stages = overlay.querySelectorAll('.qa-flight-loading-stage');

    stages.forEach(function (stage) {
      var fixed = stage.querySelector('.' + FIXED_CLASS);
      if (!fixed) {
        fixed = makeFixedCopy();
        var mobilePhoto = stage.querySelector('.qa-flight-loading-mobile-photo');
        if (mobilePhoto && mobilePhoto.parentNode === stage) {
          mobilePhoto.insertAdjacentElement('afterend', fixed);
        } else {
          stage.appendChild(fixed);
        }
      }

      var state = showArabicCopy ? 'arabic-mobile' : 'other';
      if (stage.getAttribute('data-qa-fixed-copy-state') === state) return;

      var oldCopies = stage.querySelectorAll('.qa-flight-loading-copy:not(.' + FIXED_CLASS + ')');
      if (showArabicCopy) {
        stage.style.setProperty('padding-top', '14px', 'important');
        oldCopies.forEach(function (oldCopy) {
          oldCopy.style.setProperty('display', 'none', 'important');
        });
        fixed.style.setProperty('display', 'flex', 'important');
      } else {
        stage.style.removeProperty('padding-top');
        oldCopies.forEach(function (oldCopy) {
          oldCopy.style.removeProperty('display');
        });
        fixed.style.setProperty('display', 'none', 'important');
      }
      stage.setAttribute('data-qa-fixed-copy-state', state);
    });
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function () {
      queued = false;
      ensureCopy();
    });
  }

  function start() {
    ensureCopy();
    new MutationObserver(schedule).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'dir', 'lang']
    });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('pageshow', schedule);
    window.addEventListener('storage', schedule);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
