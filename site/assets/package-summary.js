(function(){
  'use strict';
  var API_BASE=window.__QR_LIVE_BASE||'/qr-api';
  var query=new URLSearchParams(location.search);
  var product=['stopover','flight-hotel','hotel'].indexOf(query.get('product'))>=0?query.get('product'):'stopover';
  var lang=query.get('lang')==='en'?'en':'ar';
  var copy={
    ar:{book:'احجز',manage:'إدارة الحجز',help:'المساعدة',back:'العودة',stepResults:'النتائج',stepDetails:'التفاصيل',stepSummary:'الملخص',packages:'الباقات والتوقف المؤقت',title:'ملخص الاختيار',loading:'يتم تحميل ملخص اختيارك',error:'تعذر تحميل الملخص. ارجع إلى نتائج الفنادق وحاول مرة أخرى.',ready:'تم تثبيت اختيارك في جلسة Qatar Holidays الرسمية',body:'اكتمل اختيار الباقة ووصلت إلى صفحة الملخص داخل موقعنا.',results:'العودة إلى النتائج',officialData:'الأسعار والتوفر من Qatar Airways Holidays'},
    en:{book:'Book',manage:'Manage booking',help:'Help',back:'Back',stepResults:'Results',stepDetails:'Details',stepSummary:'Summary',packages:'Packages / Stopover',title:'Selection summary',loading:'Loading your selection summary',error:'Unable to load the summary. Please return to the hotel results and try again.',ready:'Your selection is confirmed in the official Qatar Holidays session',body:'The package selection is complete and has reached the summary page on our site.',results:'Back to results',officialData:'Prices and availability from Qatar Airways Holidays'}
  }[lang];
  document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';document.body.className='qa-ps-page lang-'+lang+'-QA dir-'+(lang==='ar'?'rtl':'ltr')+' pb bfv3';document.title=copy.title+' | Qatar Airways';
  function qaProxyCss(h){try{var u=new URL(h);if(/qatarairwaysholidays\.com$/i.test(u.hostname)&&/\.php$|\/min\//i.test(u.pathname))return (window.__QR_LIVE_BASE||'/qr-api')+'/api/packages/asset?u='+encodeURIComponent(u.pathname+u.search);}catch(e){}return h;} function styleHref(id,path){var node=document.getElementById(id);if(node)node.href=qaProxyCss('https://www.qatarairwaysholidays.com/qa-'+lang+'/'+path);}
  var brand=lang==='ar'?'qrh_qaar':'qrh_qaen',stamp=lang==='ar'?'1788185464':'1788185464';
  styleHref('qa-ps-font-css','min/?fb=Zm9udHMvdmliZS5jc3MsY3NzL2RlZmF1bHQuY3NzLGZvbnRzL3FyaC0yMDIzLmNzcw==&ts='+(lang==='ar'?'1751549990':'1785516087'));
  styleHref('qa-ps-common-css','min/g=bfv3_common_css,bfv3_results_common_css,bfv3_details_common_css,bfv3_multicentre_css&'+stamp);
  styleHref('qa-ps-addprod-css','min/g=bfv3_addprod_common_css&'+stamp);
  styleHref('qa-ps-flight-css','min/g=bfv3_flight_common_css,bfv3_flight_results_css,bfv3_flight_details_css,bfv3_flight_addprod_css&'+stamp);
  styleHref('qa-ps-hotel-css','min/g=bfv3_hotel_common_css,bfv3_hotel_results_css,bfv3_hotel_details_css,bfv3_hotel_addprod_css&'+stamp);
  styleHref('qa-ps-brand-css','nbf/style.php?brand='+brand+'&ts='+(lang==='ar'?'1785857770':'1785857759'));
  styleHref('qa-ps-template-css','nbf/style_tpl.php?tpl=default&brand='+brand+'&ts='+(lang==='ar'?'1781520496':'1785773142'));
  document.querySelectorAll('[data-i18n]').forEach(function(node){var key=node.getAttribute('data-i18n');if(copy[key])node.textContent=copy[key];});
  var stored=null,next=null;try{stored=JSON.parse(sessionStorage.getItem('qaPackageSearch')||'null');}catch(_){}try{next=JSON.parse(sessionStorage.getItem('qaPackageNextStage')||'null');}catch(_){}
  document.getElementById('qa-ps-query').textContent=stored&&stored.summary?stored.summary:'';
  function show(name){document.getElementById('qa-ps-loading').hidden=name!=='loading';document.getElementById('qa-ps-error').hidden=name!=='error';document.getElementById('qa-ps-official-summary').hidden=name!=='summary';document.getElementById('qa-ps-generic').hidden=name!=='generic';}
  function post(path,payload){return fetch(API_BASE+path,{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(payload)}).then(function(response){return response.text().then(function(body){var data;try{data=JSON.parse(body);}catch(_){throw new Error('bad_response');}if(!response.ok||data.error)throw new Error(data.error||('http_'+response.status));return data;});});}
  function load(){var token=next&&next.product===product&&next.lang===lang&&next.token||'';if(product!=='flight-hotel'){show(next&&next.product===product&&next.lang===lang?'generic':'error');return;}if(!/^[0-9a-f]{32}$/i.test(token)){show('error');return;}show('loading');post('/api/packages/summary',{token:token}).then(function(data){if(data.status!=='ready'||data.stage!=='summary'||!data.html)throw new Error('missing_summary');var host=document.getElementById('qa-ps-official-summary');host.innerHTML=data.html;host.querySelectorAll('script,form,input,select,textarea,button').forEach(function(node){node.remove();});host.querySelectorAll('a').forEach(function(link){link.removeAttribute('href');link.removeAttribute('target');});show('summary');window.scrollTo(0,0);}).catch(function(){show('error');});}
  document.getElementById('qa-ps-back').addEventListener('click',function(){history.back();});document.getElementById('qa-ps-results').addEventListener('click',function(){history.back();});document.querySelectorAll('.qa-pr-header a').forEach(function(link){link.addEventListener('click',function(event){event.preventDefault();location.href=location.origin+(lang==='ar'?'/ar-qa/homepage.html':'/en-qa/homepage.html');});});
  load();
})();
