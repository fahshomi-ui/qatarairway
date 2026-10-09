(function(){
  'use strict';
  var scheduled=false;
  function mobile(){return window.matchMedia('(max-width:767px)').matches}
  function isArabic(page){return page && page.getAttribute('dir')==='rtl'}
  function autofillMarkup(ar){
    return '<button type="button" class="qa-pax-autofill-switch" role="switch" aria-checked="false" data-on="0" aria-label="'+(ar?'حفظ بيانات المسافر':'Save passenger details')+'"><span></span></button>'+
      '<span class="qa-pax-autofill-copy"><strong class="qa-pax-autofill-title">'+(ar?'احفظ بياناتك لاستخدام خاصية إدخال البيانات تلقائيًا':'Save your details to use autofill')+'</strong><span class="qa-pax-autofill-sub"><i class="qa-pax-autofill-info" aria-hidden="true">i</i><span>'+(ar?'أدخل معلوماتك بشكل أسرع':'Enter your information faster')+'</span></span></span>'+
      '<span class="qa-pax-autofill-flash" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M13.2 2.75 5.9 13.1h5.25l-.45 8.15 7.4-11.2h-5.3l.4-7.3Z" stroke="currentColor" stroke-width="1.45" stroke-linejoin="round"/></svg></span>';
  }
  function setupAutofill(page,content,ar){
    var initialCard=content.querySelector('.qr-pax-card');
    var contact=content.querySelector('.qr-contact-card');
    var old=content.querySelector('.qa-pax-autofill');
    if(!initialCard||contact){if(old)old.remove();return}
    var title=content.querySelector('.qr-pax-title');
    if(!title)return;
    var card=old;
    if(!card){card=document.createElement('div');card.className='qa-pax-autofill';title.insertAdjacentElement('afterend',card)}
    if(card.dataset.lang!==(ar?'ar':'en')){card.dataset.lang=ar?'ar':'en';card.innerHTML=autofillMarkup(ar)}
    var toggle=card.querySelector('.qa-pax-autofill-switch');
    if(toggle&&!toggle.dataset.bound){toggle.dataset.bound='1';toggle.addEventListener('click',function(){var on=toggle.dataset.on!=='1';toggle.dataset.on=on?'1':'0';toggle.setAttribute('aria-checked',String(on))})}
    if(ar){var passengerTitle=initialCard.querySelector('.qr-pax-card-title');if(passengerTitle&&/^المسافر\s+بالغ\s+رقم/.test(passengerTitle.textContent.trim()))passengerTitle.textContent=passengerTitle.textContent.replace(/^المسافر\s+بالغ/,'المسافر البالغ')}
  }
  function setupTrip(page,ar){
    var card=page.querySelector('.qr-pax-trip-card');
    if(!card)return;
    var toggle=card.querySelector('.qa-pax-trip-toggle');
    if(!toggle){toggle=document.createElement('button');toggle.type='button';toggle.className='qa-pax-trip-toggle';toggle.setAttribute('aria-expanded','false');toggle.innerHTML='<span class="qa-pax-trip-toggle-label"></span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';card.insertBefore(toggle,card.firstChild);toggle.addEventListener('click',function(){var open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));card.classList.toggle('qa-pax-trip-expanded',open)})}
    toggle.querySelector('.qa-pax-trip-toggle-label').textContent=ar?'تفاصيل الرحلة':'Trip details';
  }
  function enhance(){scheduled=false;var page=document.querySelector('.qr-pax-page');if(!page||!mobile())return;var content=page.querySelector('.qr-pax-content');if(!content)return;var ar=isArabic(page);setupAutofill(page,content,ar);setupTrip(page,ar)}
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(enhance)}
  document.addEventListener('DOMContentLoaded',schedule);
  window.addEventListener('pageshow',schedule);
  window.addEventListener('resize',schedule,{passive:true});
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  schedule();
})();
