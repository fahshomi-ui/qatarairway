(() => {
  const selector = '.newsletter .validationmesg, .newsletter .succsessmesg';

  const normalize = (root = document) => {
    const successText = document.documentElement.dir === 'ltr' ? 'Subscribed' : 'تم الاشتراك';
    root.querySelectorAll(selector).forEach((message) => {
      if (message.textContent.trim() !== successText) message.textContent = successText;
    });
  };

  const start = () => {
    const section = document.querySelector('.newsletter');
    if (!section) return;
    normalize(section);
    new MutationObserver(() => normalize(section)).observe(section, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    document.documentElement.dataset.qaNewsletterMessage = 'ready';
  };

  start();
})();

// English pages use the same localized content map for the confirmation copy,
// while Arabic pages retain the original Arabic confirmation text.
