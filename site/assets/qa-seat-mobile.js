(function () {
  'use strict';

  var MOBILE = '(max-width: 767px)';

  function currencyCode() {
    try {
      var selected = JSON.parse(localStorage.getItem('selectedFlight') || '{}');
      return String(localStorage.getItem('jz_currency') || selected.curCode || selected.currency || 'QAR').toUpperCase();
    } catch (error) {
      return String(localStorage.getItem('jz_currency') || 'QAR').toUpperCase();
    }
  }

  function formatAmount(amount) {
    return currencyCode() + ' ' + Number(amount).toFixed(2);
  }

  function addLegendPrice(item, amount, rtl) {
    if (!item || item.querySelector('.qa-seat-mobile-price')) return;
    var icon = item.querySelector('.qr-seat-legend-icon');
    if (!icon) return;
    var label = null;
    for (var i = 0; i < item.children.length; i += 1) {
      var child = item.children[i];
      if (child !== icon && child.tagName === 'SPAN') {
        label = child;
        break;
      }
    }
    if (!label) return;

    var copy = document.createElement('span');
    copy.className = 'qr-seat-legend-copy';
    label.parentNode.insertBefore(copy, label);
    copy.appendChild(label);

    var price = document.createElement('span');
    price.className = 'qa-seat-mobile-price';
    price.textContent = (rtl ? 'ابتداءً من ' : 'Starting from ') + formatAmount(amount);
    copy.appendChild(price);
    item.classList.add('qr-seat-legend-item--priced');
  }

  function enhance() {
    if (!window.matchMedia(MOBILE).matches) return;
    var page = document.querySelector('.qr-seat-page');
    if (!page) return;
    var rtl = page.getAttribute('dir') === 'rtl';
    addLegendPrice(document.querySelector('.qr-seat-legend-icon--extra')?.closest('.qr-seat-legend-item'), 240, rtl);
    addLegendPrice(document.querySelector('.qr-seat-legend-icon--preferred')?.closest('.qr-seat-legend-item'), 110, rtl);
  }

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      enhance();
    });
  }

  var root = document.getElementById('root') || document.documentElement;
  new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', schedule);
  schedule();
})();
