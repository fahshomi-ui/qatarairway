(function(){
  'use strict';

  var API_BASE = window.__QR_LIVE_BASE || '/qr-api';
  var STORAGE_KEY = 'qaPackageSearch';
  var params = new URLSearchParams(location.search);
  var lang = params.get('lang') === 'en' ? 'en' : 'ar';
  var product = ['stopover','flight-hotel','hotel'].indexOf(params.get('product')) >= 0 ? params.get('product') : 'stopover';
  var resume = params.get('resume') === '1';
  var retryTimer = null;
  var activeToken = '';
  var requestPayload = null;
  var latestData = null;
  var detailsPanel = null;
  var detailsEscapeHandler = null;
  var selectionPanel = null;
  var selectionInProgress = false;
  var tourPanel = null;
  var tourEscapeHandler = null;
  var tourSelectionInProgress = false;
  var pageLoading = false;
  var hotelRatesLoading = new WeakSet();
  var inlineHotelSelectionInProgress = false;
  var activeSortMode = 'sort_price';
  var activePriceMode = product==='stopover'||product==='flight-hotel'?'t':'pp';
  var activeCurrency = 'QAR';
  var activeFilterState = {};
  var activePriceFrom = '';
  var activePriceTo = '';
  var activeHotelName = '';
  var filterApplyTimer = null;
  var stopoverTourImageRepairs = new Map();

  var copy = {
    ar:{loadingTitle:'جارٍ البحث عن أفضل الخيارات المتاحة',loadingBody:'',errorTitle:'تعذر تحميل النتائج',errorBody:'يرجى المحاولة مرة أخرى أو تعديل البحث.',retry:'إعادة المحاولة',back:'العودة إلى البحث',officialData:'الأسعار والتوفر من Qatar Airways Holidays',missing:'تعذر استعادة بيانات البحث. يرجى العودة وإجراء البحث مرة أخرى.',searching:'لا يزال البحث جاريًا. سيتم تحديث النتائج تلقائيًا.',count:'{count} نتيجة',noFiltered:'لا توجد نتائج مطابقة للفلاتر المحددة.',detailsLoading:'يتم تحميل التفاصيل',detailsError:'تعذر تحميل التفاصيل',allResults:'جميع النتائج',select:'اختر',selecting:'يتم تثبيت اختيارك',selectionTitle:'إضافات الرحلة الجوية',selectionHeading:'جاري الاختيار',selectionWait:'يرجى الانتظار، نحن نؤكد رحلتك الجوية',selectionError:'عذرًا، كانت هناك مشكلة أثناء معالجة اختيارك.',tourTitle:'اختر باقة التوقف المؤقت',tourLoading:'يتم تحميل خيارات الباقة',tourSelecting:'جاري الاختيار',tourWait:'يرجى الانتظار، نحن نؤكد باقة التوقف المؤقت',hotelSelectionTitle:'اختيار الفندق',hotelSelectionWait:'يرجى الانتظار، نحن نؤكد فندق التوقف المؤقت',firstPage:'الصفحة الأولى',previousPage:'الصفحة السابقة',nextPage:'الصفحة التالية',lastPage:'الصفحة الأخيرة',languageCode:'en',languageAria:'Qatar - English'},
    en:{loadingTitle:'Searching for the best available options',loadingBody:'',errorTitle:'Unable to load results',errorBody:'Please try again or modify your search.',retry:'Try again',back:'Back to search',officialData:'Prices and availability from Qatar Airways Holidays',missing:'Your search details could not be restored. Please return and search again.',searching:'The search is still running. Results will update automatically.',count:'{count} results',noFiltered:'No results match the selected filters.',detailsLoading:'Loading details',detailsError:'Unable to load details',allResults:'All results',select:'Select',selecting:'Confirming your selection',selectionTitle:'Flight Extras',selectionHeading:'Selecting',selectionWait:'Please wait, we are confirming your flight',selectionError:'Sorry, there was a problem processing your selection.',tourTitle:'Choose your stopover package',tourLoading:'Loading package options',tourSelecting:'Selecting',tourWait:'Please wait, we are confirming your stopover package',hotelSelectionTitle:'Hotel selection',hotelSelectionWait:'Please wait, we are confirming your stopover hotel',firstPage:'First Page',previousPage:'Previous Page',nextPage:'Next Page',lastPage:'Last Page',languageCode:'ar',languageAria:'قطر - العربيّة'}
  }[lang];

  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.body.className = 'lang-' + lang + '-QA dir-' + (lang === 'ar' ? 'rtl' : 'ltr') + ' pb bfv3 cascade-dates';
  document.title = (lang === 'ar' ? 'نتائج البحث' : 'Search results') + ' | Qatar Airways Holidays';

  function qaProxyCss(h){try{var u=new URL(h);if(/qatarairwaysholidays\.com$/i.test(u.hostname)&&/\.php$|\/min\//i.test(u.pathname))return (window.__QR_LIVE_BASE||'/qr-api')+'/api/packages/asset?u='+encodeURIComponent(u.pathname+u.search);}catch(e){}return h;} function setHref(id,href){var node=document.getElementById(id);if(!node)return;var h=qaProxyCss(href);if(h.indexOf('/api/packages/asset')>=0)return;node.href=h;}
  var languageMenuHTMLPromise=null;
  function internalResultsPath(){return location.pathname.indexOf('package-results.html')>=0?'/package-results.html':'/packages-results';}
  function switchLanguage(target){target=target==='ar'?'ar':'en';if(requestPayload){requestPayload.lang=target;requestPayload.returnPath=target==='ar'?'/ar-qa/homepage.html':'/en-qa/homepage.html';sessionStorage.setItem('qaPackageSearch',JSON.stringify(requestPayload));}sessionStorage.removeItem('qaPackageStage');sessionStorage.removeItem('qaPackageResultToken');location.href=location.origin+internalResultsPath()+'?product='+encodeURIComponent(product)+'&lang='+target;}
  function languageMenuHTML(){if(!languageMenuHTMLPromise)languageMenuHTMLPromise=fetch('/assets/qa-language-menu.html?v=1',{cache:'force-cache'}).then(function(response){if(!response.ok)throw new Error('language_menu');return response.text();});return languageMenuHTMLPromise;}
  function closeLanguageMenu(){var menu=document.getElementById('change-language-menu-desktop'),button=document.getElementById('change-language-trigger-desktop');if(menu){menu.hidden=true;menu.classList.remove('show');menu.setAttribute('aria-hidden','true');}if(button)button.setAttribute('aria-expanded','false');document.body.classList.remove('qa-clone-language-open');}
  function syncLanguagePanels(menu,id){var panels=Array.from(menu.querySelectorAll('.countysections>div')),tabs=Array.from(menu.querySelectorAll('#myScrollspy [role="tab"]'));if(!panels.some(function(panel){return panel.id===id;}))id='gcc';panels.forEach(function(panel){var active=panel.id===id;panel.style.display=active?'block':'none';panel.setAttribute('aria-hidden',String(!active));});tabs.forEach(function(tab){var active=tab.getAttribute('aria-controls')===id;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});}
  function localiseLanguageMenu(menu){var labels=lang==='ar'?{heading:'اختر منطقتك',americas:'الأمريكيتين',europe:'أوروبا',africa:'أفريقيا',gcc:'الشرق الأوسط',asia:'آسيا',close:'إغلاق قائمة اللغة والمنطقة'}:{heading:'Choose your region',americas:'Americas',europe:'Europe',africa:'Africa',gcc:'Middle East',asia:'Asia',close:'Close language and location dialog'};var heading=menu.querySelector('#change-language-menu-heading');if(heading)heading.textContent=labels.heading;Object.keys(labels).forEach(function(id){if(id==='heading'||id==='close')return;var tab=menu.querySelector('#'+id+'-tab'),panelHeading=menu.querySelector('#'+id+'-heading');if(tab)tab.textContent=labels[id];if(panelHeading)panelHeading.textContent=labels[id];});var close=menu.querySelector('.dismissDropdown');if(close)close.setAttribute('aria-label',labels.close);menu.querySelectorAll('[data-qa-language]').forEach(function(link){link.classList.toggle('active',link.getAttribute('data-qa-language')===lang);});syncLanguagePanels(menu,'gcc');}
  function positionLanguageMenu(header,menu){if(!header||!menu)return;var rect=header.getBoundingClientRect();menu.style.top=Math.max(0,Math.round(rect.bottom+window.scrollY))+'px';}
  function installHeaderLanguage(header){if(!header)return;var old=document.getElementById('change-language-menu-desktop');if(old)old.remove();var host=header.querySelector('#storefrontSwitcher-wrap')||header.querySelector('#header-col2');if(!host)return;host.classList.add('qa-clone-language-wrap');host.innerHTML='<button id="change-language-trigger-desktop" class="nav-link mobile-link changeRegionMobile ml-auto qa-clone-language" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="change-language-menu-desktop" aria-label="'+copy.languageAria+'" title="Change language / location"><img src="https://www.qatarairways.com/content/dam/assets/config/flag-icons/qa.png" alt="" aria-hidden="true"><span lang="'+copy.languageCode+'" data-id="languageID">'+copy.languageCode+'</span><span class="qa-clone-language-chevron" aria-hidden="true"></span></button>';var button=host.querySelector('#change-language-trigger-desktop');if(!button)return;button.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();var existing=document.getElementById('change-language-menu-desktop');if(existing&&!existing.hidden){closeLanguageMenu();return;}if(existing)existing.remove();button.setAttribute('aria-expanded','true');languageMenuHTML().then(function(markup){if(button.getAttribute('aria-expanded')!=='true')return;var holder=document.createElement('div');holder.innerHTML=markup;var menu=holder.firstElementChild;if(!menu)throw new Error('language_menu');menu.hidden=false;menu.classList.add('show');menu.setAttribute('aria-hidden','false');document.body.appendChild(menu);localiseLanguageMenu(menu);positionLanguageMenu(header,menu);document.body.classList.add('qa-clone-language-open');menu.addEventListener('click',function(menuEvent){var close=menuEvent.target.closest('.dismissDropdown');if(close){menuEvent.preventDefault();closeLanguageMenu();return;}var tab=menuEvent.target.closest('#myScrollspy [role="tab"]');if(tab){menuEvent.preventDefault();syncLanguagePanels(menu,tab.getAttribute('aria-controls'));return;}var languageLink=menuEvent.target.closest('[data-qa-language]');if(languageLink){menuEvent.preventDefault();switchLanguage(languageLink.getAttribute('data-qa-language'));return;}var link=menuEvent.target.closest('a[href]');if(link){menuEvent.preventDefault();var url=new URL(link.getAttribute('href'),location.origin);if(url.origin===location.origin)location.href=url.pathname+url.search;}});}).catch(function(){button.setAttribute('aria-expanded','false');});});if(!document.documentElement.dataset.qaCloneLanguageBound){document.documentElement.dataset.qaCloneLanguageBound='1';document.addEventListener('click',function(event){var menu=document.getElementById('change-language-menu-desktop');if(!menu||menu.hidden||event.target.closest('#change-language-menu-desktop,#change-language-trigger-desktop'))return;closeLanguageMenu();});document.addEventListener('keydown',function(event){if(event.key==='Escape')closeLanguageMenu();});window.addEventListener('resize',function(){var menu=document.getElementById('change-language-menu-desktop');if(menu&&!menu.hidden)positionLanguageMenu(document.getElementById('qa-pr-official-header')||document.getElementById('qa-pd-official-header'),menu);});}}
  function installHeaderMobileMenu(header){
    if(!header||!window.matchMedia('(max-width: 991px)').matches)return;
    var menu=header.querySelector('#menu-wrap'),openButton=header.querySelector('#mobile-open-btn'),closeButton=header.querySelector('#mobile-close-btn'),overlay=header.querySelector('#mobile-close-overlay');
    if(!menu||!openButton)return;
    function setOpen(open){menu.classList.toggle('qa-pr-mobile-menu-open',open);menu.setAttribute('aria-hidden',String(!open));openButton.setAttribute('aria-expanded',String(open));document.body.classList.toggle('qa-pr-mobile-menu-visible',open);}
    setOpen(false);
    openButton.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();setOpen(true);});
    [closeButton,overlay].forEach(function(node){if(node)node.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();setOpen(false);});});
    document.addEventListener('keydown',function(event){if(event.key==='Escape')setOpen(false);});
  }
  function configureOfficialStyles(){
    var root='https://www.qatarairwaysholidays.com/qa-' + lang + '/';
    var stamp=lang === 'ar' ? '1788088502' : '1788088207';
    var brand=lang === 'ar' ? 'qrh_qaar' : 'qrh_qaen';
    setHref('qa-pr-font-css',root+'min/?fb=Zm9udHMvdmliZS5jc3MsY3NzL2RlZmF1bHQuY3NzLGZvbnRzL3FyaC0yMDIzLmNzcw==&ts='+(lang === 'ar' ? '1751549990' : '1785516087'));
    setHref('qa-pr-jquery-css',root+'css/jquery-ui.min.css');
    setHref('qa-pr-common-css',root+'min/g=bfv3_common_css,bfv3_results_common_css,bfv3_details_common_css,bfv3_multicentre_css&'+stamp);
    setHref('qa-pr-flight-css',root+'min/g=bfv3_flight_common_css,bfv3_flight_results_css,bfv3_flight_details_css&'+stamp);
    setHref('qa-pr-hotel-css',root+'min/g=bfv3_hotel_common_css,bfv3_hotel_results_css,bfv3_hotel_details_css&'+stamp);
    setHref('qa-pr-tour-css',root+'min/g=bfv3_tour_common_css,bfv3_tour_results_css,bfv3_tour_details_css&'+stamp);
    setHref('qa-pr-cp-css',root+'nbf/style_cp.php?type=sb3&ts='+(lang === 'ar' ? '1706800426' : '1785516085'));
    setHref('qa-pr-brand-css',root+'nbf/style.php?brand='+brand+'&ts='+(lang === 'ar' ? '1785857769' : '1785857759'));
    setHref('qa-pr-template-css',root+'nbf/style_tpl.php?tpl=default&brand='+brand+'&ts='+(lang === 'ar' ? '1781520496' : '1785773142'));
    setHref('qa-pr-slick-css',root+'js/slick-1.8.0/slick/slick.css?'+(lang === 'ar' ? '1520517473' : '1785516085'));
  }
  configureOfficialStyles();

  function applyCopy(){
    document.querySelectorAll('[data-i18n]').forEach(function(node){ var key=node.getAttribute('data-i18n'); if(copy[key]) node.textContent=copy[key]; });
  }
  function readStage(){
    try{var stage=JSON.parse(sessionStorage.getItem('qaPackageStage')||'null');var searchId=requestPayload&&String(requestPayload.searchId||'');if(!stage||stage.product!==product||stage.lang!==lang||!stage.data||!searchId||String(stage.searchId||'')!==searchId||Date.now()-Number(stage.time||0)>30*60*1000){sessionStorage.removeItem('qaPackageStage');return null;}sessionStorage.removeItem('qaPackageStage');return stage;}catch(_){sessionStorage.removeItem('qaPackageStage');return null;}
  }
  function readStored(){
    try{var stored=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||'null');return stored&&stored.product===product&&stored.lang===lang&&Array.isArray(stored.params)?stored:null;}catch(_){return null;}
  }
  function returnPath(){return requestPayload&&typeof requestPayload.returnPath==='string'&&requestPayload.returnPath.charAt(0)==='/'?requestPayload.returnPath:'/';}
  function setState(name){
    document.getElementById('qa-pr-loading').hidden=name!=='loading';
    document.getElementById('qa-pr-error').hidden=name!=='error';
    document.getElementById('qa-pr-content').hidden=name!=='content';
    document.getElementById('qa-pr-footer').hidden=name!=='content';
  }
  function showError(message){if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}var h=document.querySelector('#qa-pr-error h1');if(h)h.textContent=copy.errorTitle;var rb=document.getElementById('qa-pr-retry');if(rb)rb.hidden=false;var bk=document.getElementById('qa-pr-back');if(bk)bk.textContent=copy.back;document.getElementById('qa-pr-error-text').textContent=message||copy.errorBody;setState('error');}function qaShowNoResults(){if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}var ar=lang==='ar';var h=document.querySelector('#qa-pr-error h1');if(h)h.textContent=ar?'لا توجد نتائج مطابقة':'No matching results';document.getElementById('qa-pr-error-text').textContent=ar?'للأسف، لم يتم العثور على باقات لهذا المسار أو هذه التواريخ. بعض المسارات لا تمر عبر الدوحة، وباقات التوقف تُحجز قبل السفر بثلاثة أيام على الأقل. جرّب تواريخ أو وجهة أخرى.':'Unfortunately, no packages were found for this route or these dates. Some routes do not connect via Doha, and stopovers must be booked at least 3 days before travel. Please try other dates or another destination.';var rb=document.getElementById('qa-pr-retry');if(rb)rb.hidden=true;var bk=document.getElementById('qa-pr-back');if(bk)bk.textContent=ar?'تعديل البحث':'Modify search';setState('error');}
  function safeJSON(response){return response.text().then(function(body){var data;try{data=JSON.parse(body);}catch(_){throw new Error('bad_response');}if(!response.ok||data.error)throw new Error(data.error||('http_'+response.status));return data;});}
  function post(path,payload){return fetch(API_BASE+path,{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(payload)}).then(safeJSON);}
  function imageLoads(url){return new Promise(function(resolve){if(!/^https:\/\/www\.qatarairwaysholidays\.com\//i.test(url||'')){resolve(false);return;}var image=new Image();var done=false;var finish=function(value){if(done)return;done=true;image.onload=null;image.onerror=null;resolve(value);};image.onload=function(){finish(true);};image.onerror=function(){finish(false);};image.src=url;window.setTimeout(function(){finish(false);},12000);});}
  function firstWorkingImage(urls,index){if(index>=urls.length)return Promise.resolve('');var url=urls[index];return imageLoads(url).then(function(ok){return ok?url:firstWorkingImage(urls,index+1);});}
  function tourWhoosherImages(markup){var holder=document.createElement('div');holder.innerHTML=markup||'';var urls=[];holder.querySelectorAll('img').forEach(function(image){[image.getAttribute('src'),image.getAttribute('data-onload')].forEach(function(url){if(/^https:\/\/www\.qatarairwaysholidays\.com\/[^\s"']*\/images\//i.test(url||'')&&urls.indexOf(url)<0)urls.push(url);});});holder.querySelectorAll('[style*="background-image"]').forEach(function(node){var match=(node.getAttribute('style')||'').match(/url\(\s*["']?([^"')]+)["']?\s*\)/i),url=match&&match[1]||'';if(/^https:\/\/www\.qatarairwaysholidays\.com\/[^\s"']*\/images\//i.test(url)&&urls.indexOf(url)<0)urls.push(url);});return urls;}
  function replacementTourImage(hash){if(stopoverTourImageRepairs.has(hash))return stopoverTourImageRepairs.get(hash);var task=post('/api/packages/tour-whoosher',{token:activeToken,hash:hash}).then(function(data){if(!data||data.status!=='ready'||!data.html)return '';return firstWorkingImage(tourWhoosherImages(data.html),0);}).catch(function(){return '';});stopoverTourImageRepairs.set(hash,task);return task;}
  function saveSelectedTourImages(hash,urls){var safe=Array.isArray(urls)?urls.filter(function(url){return /^https:\/\/www\.qatarairwaysholidays\.com\/[^\s"']*\/images\//i.test(url||'');}).slice(0,30):[];if(!activeToken||!safe.length)return;try{sessionStorage.setItem('qaStopoverTourImages',JSON.stringify({token:activeToken,product:'stopover',lang:lang,hash:hash,images:safe,time:Date.now()}));}catch(_){}}
  function repairStopoverTourImages(content){if(product!=='stopover'||!latestData||latestData.resultStage!=='tour'||!activeToken)return;content.querySelectorAll('.js-bf_opentourwhoosher[data-hash].bf_image').forEach(function(node){var hash=node.getAttribute('data-hash')||'',match=(node.style.backgroundImage||'').match(/url\(["']?([^"')]+)["']?\)/i),current=match&&match[1]||'';if(!/^[0-9a-f]{32}$/i.test(hash)||!current||node.dataset.qaImageChecked==='1')return;node.dataset.qaImageChecked='1';imageLoads(current).then(function(ok){if(ok||!node.isConnected)return;return replacementTourImage(hash).then(function(url){if(url&&node.isConnected){node.style.backgroundImage='url("'+url.replace(/"/g,'%22')+'")';node.dataset.qaImageRepaired='1';}});});});}
  var routeMapLibraryPromise=null;
  function loadRouteMapLibrary(){
    if(window.L)return Promise.resolve(window.L);if(routeMapLibraryPromise)return routeMapLibraryPromise;
    routeMapLibraryPromise=new Promise(function(resolve,reject){
      if(!document.getElementById('qa-pr-leaflet-css')){var css=document.createElement('link');css.id='qa-pr-leaflet-css';css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(css);}
      var existing=document.getElementById('qa-pr-leaflet-js');if(existing){existing.addEventListener('load',function(){resolve(window.L);},{once:true});existing.addEventListener('error',reject,{once:true});return;}
      var script=document.createElement('script');script.id='qa-pr-leaflet-js';script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.crossOrigin='anonymous';script.onload=function(){resolve(window.L);};script.onerror=reject;document.head.appendChild(script);
    });return routeMapLibraryPromise;
  }
  function renderRouteMap(container,route){
    if(!container||!route||!Array.isArray(route.legs)||!route.legs.length)return;
    container.classList.add('qa-pr-route-map');
    loadRouteMapLibrary().then(function(L){
      if(!container.isConnected||container._qaMap)return;
      var map=L.map(container,{scrollWheelZoom:false,attributionControl:true});container._qaMap=map;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
      var bounds=[];(route.points||[]).forEach(function(point){if(!isFinite(point.lat)||!isFinite(point.lng))return;bounds.push([point.lat,point.lng]);L.circleMarker([point.lat,point.lng],{radius:6,color:'#151923',weight:2,fillColor:'#151923',fillOpacity:1}).bindTooltip(point.title||'',{direction:'top'}).addTo(map);});
      route.legs.forEach(function(leg){var start=leg.from,end=leg.to;if(!start||!end||![start.lat,start.lng,end.lat,end.lng].every(isFinite))return;L.polyline([[start.lat,start.lng],[end.lat,end.lng]],{color:'#0000ff',opacity:.7,weight:2}).addTo(map);var angle=Math.atan2(end.lng-start.lng,-(end.lat-start.lat))*180/Math.PI;var mid=[(start.lat+end.lat)/2,(start.lng+end.lng)/2];L.marker(mid,{interactive:false,icon:L.divIcon({className:'qa-pr-route-arrow',html:'<span style="transform:rotate('+angle+'deg)">➤</span>',iconSize:[18,18],iconAnchor:[9,9]})}).addTo(map);});
      if(bounds.length)map.fitBounds(bounds,{padding:[18,18],maxZoom:5});window.setTimeout(function(){if(container.isConnected)map.invalidateSize();},120);
    }).catch(function(){container.classList.add('qa-pr-route-map-error');});
  }
  function ensureDetailsControls(content,choice){
    var previous=content.querySelector('.bf_previouspage');if(previous&&!previous.querySelector('a,button'))previous.innerHTML='<button type="button" class="bf_l2 bf_btn qa-pr-all-results">'+copy.allResults+'</button>';
    var next=content.querySelector('.bf_nextpage');if(next&&!next.querySelector('.js-bf_selectproduct'))next.insertAdjacentHTML('beforeend','<button type="button" id="bf_flight_details_selectbtn" class="bf_l1 bf_btn bf_selectbtn js-bf_selectproduct" data-selection="'+choice+'">'+copy.select+'</button>');
    var side=content.querySelector('.bf_mpctr_details');if(side&&!side.querySelector('.js-bf_selectproduct'))side.insertAdjacentHTML('beforeend','<button type="button" class="bf_l1 bf_btn bf_selectbtn js-bf_selectproduct qa-pr-bottom-select" data-selection="'+choice+'">'+copy.select+'</button>');
  }
  function continueToSelectedStage(data){
    if(data.stage==='results'&&(data.status==='ready'||data.status==='searching'||data.status==='no_results')){sessionStorage.setItem('qaPackageStage',JSON.stringify({token:activeToken,product:product,lang:lang,searchId:requestPayload&&String(requestPayload.searchId||''),data:data,time:Date.now()}));location.href=location.origin+internalResultsPath()+'?product='+encodeURIComponent(product)+'&lang='+lang+'&resume=1';return;}
    sessionStorage.setItem('qaPackageNextStage',JSON.stringify({token:activeToken,product:product,lang:lang,data:data,time:Date.now()}));var path=(product==='stopover'&&data.stage==='payment')||product==='hotel'?'/package-information':'/package-summary';location.href=location.origin+path+'?product='+encodeURIComponent(product)+'&lang='+lang+'&stage='+encodeURIComponent(data.stage||'next');
  }
  function continueFromInlineHotelRates(data){
    if(data.stage==='results'&&(data.status==='ready'||data.status==='searching'||data.status==='no_results')){sessionStorage.setItem('qaPackageStage',JSON.stringify({token:activeToken,product:product,lang:lang,searchId:requestPayload&&String(requestPayload.searchId||''),data:data,time:Date.now()}));location.href=location.origin+internalResultsPath()+'?product='+encodeURIComponent(product)+'&lang='+lang+'&resume=1';return;}
    sessionStorage.setItem('qaPackageNextStage',JSON.stringify({token:activeToken,product:product,lang:lang,data:data,time:Date.now()}));var path=product==='flight-hotel'||product==='stopover'||product==='hotel'?'/package-information':'/package-summary';location.href=location.origin+path+'?product='+encodeURIComponent(product)+'&lang='+lang+'&stage='+encodeURIComponent(data.stage||'next');
  }
  function pollInlineHotelSelection(remaining){if(remaining<=0)return Promise.reject(new Error('selection_timeout'));return post('/api/packages/hotel-select-status',{token:activeToken}).then(function(data){if(data.status==='selecting'||data.stage==='selecting')return new Promise(function(resolve){setTimeout(resolve,1000);}).then(function(){return pollInlineHotelSelection(remaining-1);});return data;});}
  function inlineHotelSelections(holder){var selections=[];var groups=Array.from(holder.querySelectorAll('.js-bf_options'));for(var index=0;index<groups.length;index++){var value=groups[index].getAttribute('data-selectedresult')||'';if(!/^[0-9a-f-]{36}$/i.test(value))return [];selections.push(value);}return selections;}
  function selectInlineHotelRate(button){
    if(inlineHotelSelectionInProgress)return;var holder=button.closest('.qa-pr-inline-hotel-rates'),option=button.closest('.js-bf_option'),group=option&&option.closest('.js-bf_options'),input=option&&option.querySelector('.js-bf_optioninput'),hotelChoice=holder&&holder.getAttribute('data-hotel-choice')||'';if(!holder||!group||!input||!/^[0-9a-f-]{36}$/i.test(input.value)||!/^[0-9a-f-]{36}$/i.test(hotelChoice))return;
    group.querySelectorAll('.js-bf_option').forEach(function(candidate){var selected=candidate===option;candidate.classList.toggle('bf_option--selected',selected);candidate.setAttribute('data-checked',String(selected));var candidateInput=candidate.querySelector('.js-bf_optioninput');if(candidateInput){candidateInput.checked=selected;if(selected)candidateInput.setAttribute('data-type','travelresult');else candidateInput.removeAttribute('data-type');}var candidateButton=candidate.querySelector('.js-bf_choicebutton');if(candidateButton)candidateButton.textContent=selected?(lang==='ar'?'الاحتفاظ':'Keep'):(lang==='ar'?'اختر':'Select');});group.setAttribute('data-selectedresult',input.value);
    var selections=inlineHotelSelections(holder);if(!selections.length)return;inlineHotelSelectionInProgress=true;button.disabled=true;button.textContent=lang==='ar'?'جاري الاختيار':'Selecting';post('/api/packages/hotel-select',{token:activeToken,choice:hotelChoice,selections:selections}).then(function(data){return data.status==='selecting'||data.stage==='selecting'?pollInlineHotelSelection(90):data;}).then(continueFromInlineHotelRates).catch(function(){inlineHotelSelectionInProgress=false;button.disabled=false;button.textContent=lang==='ar'?'اختر':'Select';button.classList.add('qa-pr-rates-error');});
  }
  function continueFromDetails(choice,panel){
    if(!detailsPanel||detailsPanel.root!==panel)return;panel.querySelector('.bf_slidebox_content').innerHTML=detailsLoader(copy.selecting);
    post('/api/packages/select',{token:activeToken,choice:choice}).then(continueToSelectedStage).catch(function(){if(detailsPanel&&detailsPanel.root===panel)panel.querySelector('.bf_slidebox_content').innerHTML=detailsLoader(copy.detailsError);});
  }
  function selectionLoadingHTML(waitText){
    var icon='/assets/qh-loading.svg?v=1';
    return '<div class="bf_slidepanel_loading qa-pr-selection-state"><img class="bf_loadingimg" src="'+icon+'" alt=""><span class="bf_slidepanel_loadingtext bf_l1">'+copy.selectionHeading+'</span><div class="bf_slidepanel_selectingwaittext bf_l2">'+(waitText||copy.selectionWait)+'</div></div>';
  }
  function showSelectionError(panel){
    if(!selectionPanel||selectionPanel.root!==panel)return;selectionInProgress=false;panel.classList.add('qa-pr-selection-error');var progress=panel.querySelector('.bf_prgbg');if(progress)progress.style.animation='none';var content=panel.querySelector('.bf_slidebox_content');if(content)content.innerHTML='<div class="qa-pr-selection-state qa-pr-selection-error-state"><span class="bf_slidepanel_loadingtext bf_l1">'+copy.selectionError+'</span><button type="button" class="bf_btn qa-pr-selection-close">'+copy.allResults+'</button></div>';var close=panel.querySelector('.qa-pr-selection-close');if(close)close.addEventListener('click',closeSelectionPanel);
  }
  function closeSelectionPanel(){
    if(!selectionPanel||selectionInProgress)return;var panel=selectionPanel;selectionPanel=null;panel.root.classList.remove('show');panel.backdrop.classList.remove('show');window.setTimeout(function(){panel.root.remove();panel.backdrop.remove();},250);document.body.classList.remove('noscroll');
  }
  function defaultHotelSelections(markup){var holder=document.createElement('div');holder.innerHTML=markup||'';var selections=[];var groups=Array.from(holder.querySelectorAll('.js-bf_options'));for(var index=0;index<groups.length;index++){var selected=groups[index].querySelector('.js-bf_option.bf_option--selected,.js-bf_option[data-checked="true"]')||groups[index].querySelector('.js-bf_option'),input=selected&&selected.querySelector('.js-bf_optioninput');if(!input||!/^[0-9a-f-]{36}$/i.test(input.value||''))return [];selections.push(input.value);}return selections;}
  function selectFromCard(choice,directHotel){
    var supportedFlightProduct=product==='stopover'||product==='flight-hotel';
    if(selectionInProgress||!activeToken||(!directHotel&&!supportedFlightProduct)||!/^[0-9a-f-]{20,}$/i.test(choice||''))return;
    closeDetails();selectionInProgress=true;var title=directHotel?copy.hotelSelectionTitle:copy.selectionTitle;var waitText=directHotel?copy.hotelSelectionWait:copy.selectionWait;var backdrop=document.createElement('div');backdrop.className='bf_slidebox js-bf_slideboxremoveonclose qa-pr-slidebox-backdrop qa-pr-selection-backdrop show';var panel=document.createElement('section');panel.className='bf_slidebox js-bf_slideboxremoveonclose '+(lang==='ar'?'slideleft':'slideright')+' slideshort qa-pr-selection-slidebox';panel.setAttribute('aria-modal','true');panel.setAttribute('role','dialog');panel.setAttribute('aria-label',title);panel.innerHTML='<div class="bf_slidebox_header"><div class="bf_slidebox_contenttitle bf_l1">'+title+'</div></div><div class="bf_slidebox_progressbar"><div class="bf_prgbr"><div class="bf_prgbg"></div></div></div><div class="bf_slidebox_content">'+selectionLoadingHTML(waitText)+'</div>';
    document.body.prepend(panel);document.body.prepend(backdrop);document.body.classList.add('noscroll');selectionPanel={root:panel,backdrop:backdrop,choice:choice};window.requestAnimationFrame(function(){panel.classList.add('show');backdrop.classList.add('show');});
    var selectionRequest;if(directHotel&&product==='stopover'){selectionRequest=post('/api/packages/hotel-rates',{token:activeToken,choice:choice}).then(function(rates){if(!rates||rates.status!=='ready'||!rates.html)throw new Error('hotel_rates_required');var selections=defaultHotelSelections(rates.html);if(!selections.length)throw new Error('hotel_options_required');return post('/api/packages/hotel-select',{token:activeToken,choice:choice,selections:selections});}).then(function(data){return data.status==='selecting'||data.stage==='selecting'?pollInlineHotelSelection(90):data;});}else{selectionRequest=directHotel?post('/api/packages/select',{token:activeToken,choice:choice}):post('/api/packages/details',{token:activeToken,choice:choice}).then(function(details){if(!details||details.status!=='ready')throw new Error('details_required');return post('/api/packages/select',{token:activeToken,choice:choice});});}selectionRequest.then(continueToSelectedStage).catch(function(){showSelectionError(panel);});
  }
  function closeTourWhoosher(){
    if(!tourPanel||tourSelectionInProgress)return;var panel=tourPanel;tourPanel=null;if(tourEscapeHandler){document.removeEventListener('keydown',tourEscapeHandler);tourEscapeHandler=null;}panel.root.classList.remove('show');panel.backdrop.classList.remove('show');window.setTimeout(function(){panel.root.remove();panel.backdrop.remove();},250);document.body.classList.remove('noscroll');
  }
  function tourState(title,wait){return '<div class="qa-pr-slidebox-state qa-pr-tour-state"><span class="qa-pr-spinner" aria-hidden="true"></span><h2>'+title+'</h2>'+(wait?'<p>'+wait+'</p>':'')+'</div>';}
  function showTourError(panel){
    if(!tourPanel||tourPanel.root!==panel)return;tourSelectionInProgress=false;panel.classList.add('qa-pr-tour-error');var content=panel.querySelector('.bf_slidebox_content');if(content)content.innerHTML='<div class="qa-pr-slidebox-state qa-pr-tour-state"><h2>'+copy.selectionError+'</h2><button type="button" class="bf_btn qa-pr-tour-close">'+copy.allResults+'</button></div>';
  }
  function openTourWhoosher(cardHash){
    if(!activeToken||product!=='stopover'||!/^[0-9a-f]{32}$/i.test(cardHash||'')||tourPanel)return;
    closeDetails();var backdrop=document.createElement('div');backdrop.className='bf_slidebox js-bf_slideboxremoveonclose qa-pr-slidebox-backdrop qa-pr-tour-backdrop show';var sourceFlow=document.querySelector('#qa-pr-content .bf_flow');var breakpoints=sourceFlow?Array.from(sourceFlow.classList).filter(function(name){return /^bf_\d+$/.test(name);}).join(' '):'';if(window.innerWidth>=1450&&breakpoints.indexOf('bf_1450')<0)breakpoints+=' bf_1450';var panel=document.createElement('section');panel.className='bf_slidebox js-bf_slideboxremoveonclose '+(lang==='ar'?'slideleft':'slideright')+' slidelong closeable show qa-pr-details-slidebox qa-pr-tour-slidebox '+breakpoints;panel.setAttribute('aria-modal','true');panel.setAttribute('role','dialog');panel.setAttribute('aria-label',copy.tourTitle);panel.innerHTML='<button type="button" class="bf_slidebox_close qa-pr-slidebox-close qa-pr-tour-close" aria-label="'+(lang==='ar'?'إغلاق':'Close')+'"></button><div class="bf_slidebox_content">'+tourState(copy.tourLoading,'')+'</div>';
    document.body.prepend(panel);document.body.prepend(backdrop);document.body.classList.add('noscroll');tourPanel={root:panel,backdrop:backdrop,hash:cardHash};backdrop.addEventListener('click',closeTourWhoosher);panel.addEventListener('submit',function(event){event.preventDefault();});panel.addEventListener('click',function(event){var close=event.target.closest('.qa-pr-tour-close');if(close){event.preventDefault();closeTourWhoosher();return;}var option=event.target.closest('.js-bf_selectpms[data-selection]');if(option){event.preventDefault();event.stopPropagation();var selection=option.getAttribute('data-selection')||'';if(tourSelectionInProgress||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selection))return;saveSelectedTourImages(cardHash,tourPanel&&tourPanel.images||[]);tourSelectionInProgress=true;panel.querySelector('.bf_slidebox_content').innerHTML=tourState(copy.tourSelecting,copy.tourWait);post('/api/packages/tour-select',{token:activeToken,hash:cardHash,selection:selection}).then(continueToSelectedStage).catch(function(){showTourError(panel);});return;}var anchor=event.target.closest('a[href]');if(anchor){event.preventDefault();}});tourEscapeHandler=function(event){if(event.key==='Escape')closeTourWhoosher();};document.addEventListener('keydown',tourEscapeHandler);
    post('/api/packages/tour-whoosher',{token:activeToken,hash:cardHash}).then(function(data){if(!tourPanel||tourPanel.root!==panel)return;if(data.status!=='ready'||!data.html)throw new Error('missing_tour_options');var content=panel.querySelector('.bf_slidebox_content');content.innerHTML=data.html;tourPanel.images=tourWhoosherImages(data.html);content.querySelectorAll('a[target]').forEach(function(link){link.removeAttribute('target');});neutraliseExternalLinks(content);content.querySelectorAll('button').forEach(function(button){button.type='button';});initialiseTourGallery(content);if(!content.querySelector('.js-bf_selectpms[data-selection]'))throw new Error('missing_tour_selection');}).catch(function(){showTourError(panel);});
  }
  function detailsChoice(link){
    try{var url=new URL(link.href,location.origin);var value=url.searchParams.get('choice');if(value)return value;}catch(_){}
    var match=String(link.getAttribute('href')||'').match(/\/details\/[0-9a-f-]+\/([0-9a-f-]+)/i);return match?match[1]:'';
  }
  function closeDetails(){
    if(!detailsPanel)return;
    var panel=detailsPanel;detailsPanel=null;
    if(detailsEscapeHandler){document.removeEventListener('keydown',detailsEscapeHandler);detailsEscapeHandler=null;}
    panel.root.classList.remove('show');panel.backdrop.classList.remove('show');
    window.setTimeout(function(){panel.root.remove();panel.backdrop.remove();},250);
    document.body.classList.remove('noscroll');
  }
  function detailsLoader(title){return '<div class="qa-pr-slidebox-state"><span class="qa-pr-spinner" aria-hidden="true"></span><h2>'+title+'</h2></div>';}
  function openDetails(choice){
    if(!activeToken||!/^[0-9a-f-]{20,}$/i.test(choice||''))return;
    closeDetails();
    var backdrop=document.createElement('div');backdrop.id='lightbox_bg';backdrop.className='bf_slidebox js-bf_slideboxremoveonclose qa-pr-slidebox-backdrop show';
    var sourceFlow=document.querySelector('#qa-pr-content .bf_flow');var breakpoints=sourceFlow?Array.from(sourceFlow.classList).filter(function(name){return /^bf_\d+$/.test(name);}).join(' '):'';if(window.innerWidth>=1450&&breakpoints.indexOf('bf_1450')<0)breakpoints+=' bf_1450';
    var panel=document.createElement('section');panel.className='bf_slidebox js-bf_slideboxremoveonclose '+(lang==='ar'?'slideleft':'slideright')+' slidelong closeable show qa-pr-details-slidebox '+breakpoints;panel.setAttribute('aria-modal','true');panel.setAttribute('role','dialog');panel.setAttribute('aria-label',lang==='ar'?'تفاصيل الرحلة':'Flight details');
    panel.innerHTML='<button type="button" class="bf_slidebox_close qa-pr-slidebox-close" aria-label="'+(lang==='ar'?'إغلاق':'Close')+'"></button><div class="bf_slidebox_content">'+detailsLoader(copy.detailsLoading)+'</div>';
    document.body.prepend(panel);document.body.prepend(backdrop);document.body.classList.add('noscroll');detailsPanel={root:panel,backdrop:backdrop,choice:choice};
    backdrop.addEventListener('click',closeDetails);panel.querySelector('.qa-pr-slidebox-close').addEventListener('click',closeDetails);panel.addEventListener('submit',function(event){event.preventDefault();});panel.addEventListener('click',function(event){var back=event.target.closest('.bf_previouspage a,.bf_previouspage button,.qa-pr-all-results');if(back){event.preventDefault();closeDetails();return;}var select=event.target.closest('.js-bf_selectproduct');if(select){event.preventDefault();event.stopPropagation();continueFromDetails(select.getAttribute('data-selection')||choice,panel);return;}var print=event.target.closest('#bf_dtl_print');if(print){event.preventDefault();window.print();}});
    detailsEscapeHandler=function(event){if(event.key==='Escape')closeDetails();};document.addEventListener('keydown',detailsEscapeHandler);
    post('/api/packages/details-slidebox',{token:activeToken,choice:choice}).then(function(data){
      if(!detailsPanel||detailsPanel.root!==panel)return;if(data.status!=='ready'||!data.html)throw new Error('missing_details');
      var content=panel.querySelector('.bf_slidebox_content');content.innerHTML=data.html;panel.dataset.choice=choice;panel._routeMap=data.map||{};
      content.querySelectorAll('a[target]').forEach(function(link){link.removeAttribute('target');});neutraliseExternalLinks(content);
      content.querySelectorAll('.bf_displayprice.bf_p_t').forEach(function(node){node.style.display=activePriceMode==='t'?'block':'none';});
      content.querySelectorAll('.bf_displayprice.bf_p_pp').forEach(function(node){node.style.display=activePriceMode==='pp'?'block':'none';});
      ensureDetailsControls(content,choice);renderRouteMap(content.querySelector('#routemap'),data.map||{});
    }).catch(function(){if(!detailsPanel||detailsPanel.root!==panel)return;panel.querySelector('.bf_slidebox_content').innerHTML=detailsLoader(copy.detailsError);});
  }

  function fallbackFlow(){
    var direction=lang==='ar'?'dir-rtl':'dir-ltr';
    return '<div class="bf_mctr bf_flow bf_flow_results bf_flow_flight bf_flow--withoutpadding bf_1280 bf_1450 '+direction+'"><section class="bf_maincontent"><section class="bf_filters"><div class="bf_numrslt"></div></section><div class="bf_rctr"><div class="bf_flightresultscontainer"><section class="bf_results"></section></div></div></section></div>';
  }
  function plainFilterText(value){var holder=document.createElement('div');holder.innerHTML=String(value||'');return (holder.textContent||holder.innerText||'').replace(/\s+/g,' ').trim();}
  function filterLabel(value){
    value=plainFilterText(value);
    if(lang!=='ar') return value;
    var labels={Morning:'صباحًا',Afternoon:'بعد الظهر',Evening:'مساءً',Overnight:'ليلًا','Qatar Airways':'الخطوط الجوية القطرية','1 Connection':'رحلة ربط واحدة','1 x Check-in baggage':'1 أمتعة مسجلة'};
    return labels[value]||value;
  }
  function filterSubtitle(value){
    if(lang!=='ar') return value;
    return String(value||'').replace(/AM/g,'ص').replace(/PM/g,'م');
  }
  function isStopoverHotelStage(data){var filters=data&&data.filters;return product==='stopover'&&!!filters&&!!filters.supplier&&!!filters.duration&&!filters.stops;}
  function populateFilters(filters){
    if(!filters||typeof filters!=='object')return;
    var stopoverHotelStage=isStopoverHotelStage({filters:filters});
    document.querySelectorAll('#qa-pr-content ol[data-filter]').forEach(function(container){
      var name=container.getAttribute('data-filter');
      var values=filters[name];
      if(!values||Array.isArray(values)||typeof values!=='object')return;
      var entries=Object.keys(values).map(function(key){return [key,values[key]];});
      if(!entries.length)return;
      container.innerHTML='';
      entries.forEach(function(entry,index){
        var key=entry[0],meta=entry[1]||{};
        var title=filterLabel(meta.title||key),subtitle=filterSubtitle(plainFilterText(meta.subtitle||''));
        var priceAmount=Number(meta.priceAmount);if(isFinite(priceAmount)){var suffix=activePriceMode==='t'?(lang==='ar'?'المجموع':'total'):(lang==='ar'?'للشخص الواحد':'per person');subtitle=(lang==='ar'?suffix+' QAR ':'QAR ')+Math.round(priceAmount).toLocaleString('en-US')+(lang==='ar'?'':' '+suffix);}
        var li=document.createElement('li');
        li.className='bf_filteritem';
        li.setAttribute('data-num',String(index+1));
        li.innerHTML='<label><input class="pb_customcheckbox" type="checkbox"><span></span><div><div class="bf_nm bf_l2"></div><div class="bf_cst bf_l3"></div></div></label>';
        var input=li.querySelector('input');
        input.name='filter_'+name+'[]';input.value=key;input.setAttribute('data-filter',name);input.setAttribute('aria-label',title);
        var labelNode=li.querySelector('.bf_nm');if(name==='hotelrating'&&/^\d(?:\.\d)?$/.test(key)){var rating=Math.max(1,Math.min(5,Math.round(Number(key))));labelNode.textContent='★'.repeat(rating);labelNode.classList.add('qa-pr-rating-stars');input.setAttribute('aria-label',(lang==='ar'?'تصنيف النجوم: ':'Star rating: ')+key);}else labelNode.textContent=title;li.querySelector('.bf_cst').textContent=subtitle;
        container.appendChild(li);
      });
      var section=container.closest('.bf_filtersection');if(section){var minimum=product==='stopover'&&(name==='stops'||(stopoverHotelStage&&name==='duration'))?1:(product==='stopover'?2:1),visible=entries.length>=minimum;section.classList.toggle('show',visible);section.classList.toggle('collapsed',!visible);}
    });
    var count=document.querySelector('#qa-pr-content .bf_numrslt');
    if(count)count.textContent=copy.count.replace('{count}',String(latestData&&latestData.count||0));
  }
  function paginationIcon(name){return 'https://www.qatarairwaysholidays.com/qa-'+lang+'/img/svg/'+name+'.svg?a=e66625';}
  function buildPagination(data){
    var nav=document.querySelector('#qa-pr-content .bf_pgctrl');if(!nav)return;
    var current=Math.max(1,Number(data&&data.page)||1),total=Math.max(0,Number(data&&data.pageCount)||0),html='';nav.innerHTML='';if(total<=1)return;
    function icon(classes,page,name,label){return '<div class="bf_page '+classes+' bf_clickable" data-page="'+page+'" tabindex="0" role="button" aria-label="'+label+'"><img alt="'+label+'" src="'+paginationIcon(name)+'"></div>';}
    if(current>1){html+=icon('fp',1,lang==='ar'?'last':'first',copy.firstPage);html+=icon('pr',current-1,lang==='ar'?'next':'prev',copy.previousPage);}
    var shown=0;for(var page=current-2;page<=current+4;page++){if(page>0&&page<=total){html+='<div class="bf_page pn'+(page===current?' cp':'')+' bf_clickable" data-page="'+page+'" tabindex="0" role="button" aria-label="'+page+'">'+page+'</div>';shown++;if(shown===5)break;}}
    if(current<total){html+=icon('nx',current+1,lang==='ar'?'prev':'next',copy.nextPage);html+=icon('ls',total,lang==='ar'?'first':'last',copy.lastPage);}
    nav.innerHTML=html;
  }
  function collectFilterState(){var state={};document.querySelectorAll('#qa-pr-content .bf_filters input[type="checkbox"][data-filter]:checked').forEach(function(input){var name=input.getAttribute('data-filter');(state[name]||(state[name]=[])).push(input.value);});return state;}
  function currentPriceRange(){var from=document.querySelector('#qa-pr-content .bf_pricefltr input[data-filter="pricefrom"]'),to=document.querySelector('#qa-pr-content .bf_pricefltr input[data-filter="priceto"]');return {priceFrom:from?from.value.trim():'',priceTo:to?to.value.trim():''};}
  function hotelNameInput(){if(!latestData||latestData.resultStage!=='hotel')return null;return document.querySelector('#qa-pr-content .bf_filters input[type="text"][name*="hotelname" i],#qa-pr-content .bf_filters input[type="search"][name*="hotelname" i],#qa-pr-content .bf_filters input[data-filter="hotelname"]');}
  function currentHotelName(){var input=hotelNameInput();return input?input.value.trim():'';}
  function filterSignature(state,from,to,hotelName){return JSON.stringify([state||{},String(from==null?'':from),String(to==null?'':to),String(hotelName==null?'':hotelName)]);}
  function hasActiveFilters(){var range=currentPriceRange();return !!document.querySelector('#qa-pr-content .bf_filters input[type="checkbox"][data-filter]:checked')||range.priceFrom!==''||range.priceTo!==''||currentHotelName()!=='';}
  function syncFilterClear(){var active=hasActiveFilters(),clearSection=document.querySelector('#qa-pr-content .bf_clearfilters');if(clearSection){clearSection.classList.toggle('collapsed',!active);clearSection.style.display=active?'block':'none';}}
  function syncFilterControls(data){activeFilterState=data&&data.filterState||{};activePriceFrom=data&&data.priceFrom!=null?String(data.priceFrom):'';activePriceTo=data&&data.priceTo!=null?String(data.priceTo):'';activeHotelName=data&&data.hotelName!=null?String(data.hotelName):'';document.querySelectorAll('#qa-pr-content .bf_filters input[type="checkbox"][data-filter]').forEach(function(input){input.checked=Array.isArray(activeFilterState[input.getAttribute('data-filter')])&&activeFilterState[input.getAttribute('data-filter')].indexOf(input.value)>=0;});var from=document.querySelector('#qa-pr-content .bf_pricefltr input[data-filter="pricefrom"]'),to=document.querySelector('#qa-pr-content .bf_pricefltr input[data-filter="priceto"]'),hotelName=hotelNameInput();if(from)from.value=activePriceFrom;if(to)to.value=activePriceTo;if(hotelName)hotelName.value=activeHotelName;syncFilterClear();}
  function updateResultCount(){var count=document.querySelector('#qa-pr-content .bf_numrslt');if(count)count.textContent=copy.count.replace('{count}',String(latestData&&latestData.count||0));}
  function officialImagePlaceholder(){return 'https://www.qatarairwaysholidays.com/qa-'+lang+'/images/placeholder';}
  function mapEmbedURL(source){try{var parsed=new URL(source,location.href),center=(parsed.searchParams.get('center')||'').split(',').map(Number);if(center.length!==2||!center.every(isFinite))return '';var lat=center[0],lon=center[1],padLat=.045,padLon=.075;return 'https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent([lon-padLon,lat-padLat,lon+padLon,lat+padLat].join(','))+'&layer=mapnik&marker='+encodeURIComponent(lat+','+lon);}catch(_){return '';}}
  function closeHotelMap(){document.querySelectorAll('.qa-pr-map-modal,.qa-pr-map-backdrop').forEach(function(node){node.remove();});document.body.classList.remove('noscroll');}
  function openHotelMap(trigger){var source=trigger.closest('.bf_static_map')&&trigger.closest('.bf_static_map').querySelector('iframe[data-map-src]'),url=source&&source.getAttribute('data-map-src');if(!url)return;closeHotelMap();var backdrop=document.createElement('div');backdrop.className='qa-pr-map-backdrop';var panel=document.createElement('section');panel.className='qa-pr-map-modal';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',lang==='ar'?'خريطة الفنادق':'Hotel map');panel.innerHTML='<button type="button" class="qa-pr-map-close" aria-label="'+(lang==='ar'?'إغلاق':'Close')+'"></button><iframe title="'+(lang==='ar'?'خريطة الفنادق':'Hotel map')+'" sandbox="allow-scripts" referrerpolicy="no-referrer" src="'+url+'"></iframe>';document.body.prepend(panel);document.body.prepend(backdrop);document.body.classList.add('noscroll');backdrop.addEventListener('click',closeHotelMap);panel.querySelector('.qa-pr-map-close').addEventListener('click',closeHotelMap);}
  function initialiseHotelMap(root){var image=root.querySelector('.bf_static_map_image img'),host=image&&image.parentElement;if(!image||!host||host.querySelector('iframe[data-map-src]'))return;var url=mapEmbedURL(image.getAttribute('src')||'');if(!url){image.remove();return;}var frame=document.createElement('iframe');frame.setAttribute('title',lang==='ar'?'خريطة الفنادق':'Hotel map');frame.setAttribute('sandbox','allow-scripts');frame.setAttribute('referrerpolicy','no-referrer');frame.setAttribute('loading','lazy');frame.setAttribute('data-map-src',url);frame.src=url;image.replaceWith(frame);var trigger=root.querySelector('.bf_static_map_modal_link');if(trigger){trigger.setAttribute('role','button');trigger.setAttribute('tabindex','0');}}
  function installResultImageFallback(root){root.querySelectorAll('img.bf_result_image:not([data-qa-image-fallback-bound]),.bf_image>img:not([data-qa-image-fallback-bound])').forEach(function(image){if(image.closest('.qa-pr-tour-gallery'))return;image.setAttribute('data-qa-image-fallback-bound','1');function fallback(){if(image.getAttribute('data-qa-image-fallback-used')==='1'){image.remove();return;}image.setAttribute('data-qa-image-fallback-used','1');image.src=officialImagePlaceholder();image.classList.add('qa-pr-official-placeholder');}image.addEventListener('error',fallback);if(image.complete&&image.naturalWidth===0)fallback();});}
  function initialiseTourGallery(content){content.querySelectorAll('.nbf_tpl_pms_gallery').forEach(function(oldGallery){oldGallery.remove();});var gallery=content.querySelector('.gallery_image_iter');if(!gallery){installResultImageFallback(content);return;}var images=Array.from(gallery.querySelectorAll('img.gallery_image'));if(!images.length){installResultImageFallback(content);return;}gallery.classList.add('qa-pr-tour-gallery');var nav=document.createElement('div');nav.className='qa-pr-tour-gallery-nav';function liveImages(){return images.filter(function(image){return image.isConnected&&!image.classList.contains('qa-pr-tour-image-failed');});}function show(image){liveImages().forEach(function(candidate){candidate.classList.toggle('qa-pr-tour-image-active',candidate===image);});nav.querySelectorAll('button').forEach(function(button){button.classList.toggle('active',button.getAttribute('data-index')===image.getAttribute('data-qa-tour-index'));});}function removeImage(image){if(image.classList.contains('qa-pr-tour-image-failed'))return;var active=image.classList.contains('qa-pr-tour-image-active'),index=image.getAttribute('data-qa-tour-index');image.classList.add('qa-pr-tour-image-failed');image.remove();var button=nav.querySelector('button[data-index="'+index+'"]');if(button)button.remove();var remaining=liveImages();if(active&&remaining.length)show(remaining[0]);if(!remaining.length){var fallback=document.createElement('img');fallback.className='gallery_image qa-pr-tour-image-active qa-pr-official-placeholder';fallback.alt='';fallback.src=officialImagePlaceholder();gallery.appendChild(fallback);}}
    images.forEach(function(image,index){image.setAttribute('data-qa-tour-index',String(index));image.classList.toggle('qa-pr-tour-image-active',index===0);var button=document.createElement('button');button.type='button';button.setAttribute('data-index',String(index));button.setAttribute('aria-label',image.alt||copy.tourTitle);var thumb=document.createElement('img');thumb.alt='';thumb.src=image.src;button.appendChild(thumb);button.addEventListener('click',function(){show(image);});image.addEventListener('error',function(){removeImage(image);});thumb.addEventListener('error',function(){removeImage(image);});nav.appendChild(button);});gallery.insertAdjacentElement('afterend',nav);images.forEach(function(image){if(image.complete&&image.naturalWidth===0)removeImage(image);});}
  function neutraliseExternalLinks(root){root.querySelectorAll('a[href]').forEach(function(link){try{var parsed=new URL(link.getAttribute('href'),location.href);if(/^https?:$/.test(parsed.protocol)&&parsed.origin!==location.origin){link.removeAttribute('href');link.removeAttribute('target');}}catch(_){link.removeAttribute('href');}});}
  function restoreResultCards(root){root.querySelectorAll('.bf_rsitem').forEach(function(card){var image=card.querySelector('img.bf_result_image'),host=card.querySelector('.bf_image');if(image&&host){if(image.parentElement!==host)host.appendChild(image);image.classList.remove('nbf_hidden');image.style.width='100%';image.style.height='100%';image.style.objectFit='cover';image.style.display='block';}});root.querySelectorAll('a[href*="qatarairwaysholidays.com"][href*="/details/"]').forEach(function(link){link.removeAttribute('target');});neutraliseExternalLinks(root);installResultImageFallback(root);}
  function hotelDetailsURL(choice){return location.origin+'/package-details?token='+encodeURIComponent(activeToken)+'&choice='+encodeURIComponent(choice)+'&product='+encodeURIComponent(product)+'&lang='+lang;}
  function openHotelRates(trigger){
    if(!activeToken||!trigger||hotelRatesLoading.has(trigger)||latestData&&latestData.resultStage!=='hotel')return;
    var choice=trigger.getAttribute('data-results')||detailsChoice(trigger.closest('.bf_rsitem')&&trigger.closest('.bf_rsitem').querySelector('a[href*="package-details"]'));if(!/^[0-9a-f-]{36}$/i.test(choice||''))return;
    var card=trigger.closest('.bf_rsitem');if(!card)return;var existing=card.querySelector('.qa-pr-inline-hotel-rates');if(existing&&card.classList.contains('qa-pr-hotel-rates-open')){existing.remove();card.classList.remove('qa-pr-hotel-rates-open');trigger.classList.remove('bf_numrates--expanded','qa-pr-rates-error');trigger.setAttribute('aria-expanded','false');return;}if(existing)existing.remove();hotelRatesLoading.add(trigger);trigger.classList.add('qa-pr-rates-loading');trigger.setAttribute('aria-expanded','false');
    post('/api/packages/hotel-rates',{token:activeToken,choice:choice}).then(function(data){if(!data||data.status!=='ready'||!data.html)throw new Error('missing_hotel_rates');card.querySelectorAll('.qa-pr-inline-hotel-rates').forEach(function(node){node.remove();});var holder=document.createElement('div');holder.className='qa-pr-inline-hotel-rates';holder.setAttribute('data-hotel-choice',choice);holder.innerHTML=data.html;holder.querySelectorAll('a[href]').forEach(function(link){link.removeAttribute('href');link.removeAttribute('target');});holder.querySelectorAll('button').forEach(function(button){button.type='button';});holder.querySelectorAll('.js-bf_options').forEach(function(group){var selected=group.querySelector('.js-bf_option.bf_option--selected,.js-bf_option[data-checked="true"]')||group.querySelector('.js-bf_option'),input=selected&&selected.querySelector('.js-bf_optioninput');if(input&&/^[0-9a-f-]{36}$/i.test(input.value))group.setAttribute('data-selectedresult',input.value);});card.appendChild(holder);card.classList.add('qa-pr-hotel-rates-open');trigger.classList.add('bf_numrates--expanded');trigger.setAttribute('aria-expanded','true');restoreResultCards(holder);}).catch(function(){trigger.classList.add('qa-pr-rates-error');}).finally(function(){hotelRatesLoading.delete(trigger);trigger.classList.remove('qa-pr-rates-loading');});
  }
  function loadResultPage(page,state){
    if(pageLoading||!activeToken)return;state=state||{};var current=Number(latestData&&latestData.page)||1;
    var requestedSort=state.sortMode||activeSortMode,requestedPrice=state.priceMode||activePriceMode,requestedCurrency=state.currency||activeCurrency;
    var requestedFilters=state.filters!==undefined?state.filters:activeFilterState,requestedPriceFrom=state.priceFrom!==undefined?state.priceFrom:activePriceFrom,requestedPriceTo=state.priceTo!==undefined?state.priceTo:activePriceTo,requestedHotelName=state.hotelName!==undefined?state.hotelName:activeHotelName;
    var hotelStage=isStopoverHotelStage(latestData),localDuration=hotelStage&&Array.isArray(requestedFilters.duration)?requestedFilters.duration.slice():[],upstreamFilters=Object.assign({},requestedFilters);if(hotelStage)delete upstreamFilters.duration;
    if(page===current&&requestedSort===activeSortMode&&requestedPrice===activePriceMode&&requestedCurrency===activeCurrency&&filterSignature(requestedFilters,requestedPriceFrom,requestedPriceTo,requestedHotelName)===filterSignature(activeFilterState,activePriceFrom,activePriceTo,activeHotelName))return;pageLoading=true;
    var content=document.getElementById('qa-pr-content'),results=content.querySelector('.bf_results'),nav=content.querySelector('.bf_pgctrl'),toolbar=content.querySelector('.bf_srow');if(results)results.classList.add('qa-pr-page-loading');if(nav)nav.classList.add('qa-pr-page-loading');if(toolbar)toolbar.classList.add('qa-pr-toolbar-loading');
    post('/api/packages/page',{token:activeToken,page:page,sortMode:requestedSort,priceMode:requestedPrice,currency:requestedCurrency,filters:upstreamFilters,priceFrom:requestedPriceFrom,priceTo:requestedPriceTo,hotelName:requestedHotelName}).then(function(data){if(data.status!=='ready'||(!data.html&&Number(data.count)!==0))throw new Error('missing_page');if(hotelStage&&localDuration.length)data.filterState=Object.assign({},data.filterState||{},{duration:localDuration});latestData=data;activeSortMode=data.sortMode||requestedSort;activePriceMode=data.priceMode||requestedPrice;activeCurrency=data.currency||requestedCurrency;activeFilterState=data.filterState||requestedFilters;activePriceFrom=data.priceFrom!=null?String(data.priceFrom):'';activePriceTo=data.priceTo!=null?String(data.priceTo):'';activeHotelName=data.hotelName!=null?String(data.hotelName):'';results.innerHTML=data.html||'<div class="qa-pr-filter-empty">'+copy.noFiltered+'</div>';restoreResultCards(results);populateFilters(data.filters||{});buildPagination(data);syncToolbar(content,data);syncFilterControls(data);updateResultCount();var top=content.querySelector('.bf_rctr');if(top)window.scrollTo({top:Math.max(0,top.getBoundingClientRect().top+window.scrollY-24),behavior:'auto'});}).catch(function(){if(nav)nav.classList.add('qa-pr-page-error');}).finally(function(){pageLoading=false;if(results)results.classList.remove('qa-pr-page-loading');if(nav)nav.classList.remove('qa-pr-page-loading');if(toolbar)toolbar.classList.remove('qa-pr-toolbar-loading');});
  }
  function parseMinutes(text){
    var raw=String(text||'').trim();
    var match=raw.match(/(\d{1,2}):(\d{2})/);if(!match)return 0;
    var hour=Number(match[1]),minute=Number(match[2]);
    var pm=/\bPM\b|\u0645/.test(raw),am=/\bAM\b|\u0635/.test(raw);
    if(pm&&hour<12)hour+=12;if(am&&hour===12)hour=0;return hour*60+minute;
  }
  function timeBucket(text){var minutes=parseMinutes(text);if(minutes>=300&&minutes<720)return'0';if(minutes>=720&&minutes<1080)return'1';if(minutes>=1080)return'2';return'3';}
  function cardMatches(card,groups){
    var legs=card.querySelectorAll('.bf_fleginfo');
    function legTime(index,part){var leg=legs[index<0?legs.length+index:index];var node=leg&&leg.querySelector(part+' .bf_time');return node?node.textContent:'';}
    return Object.keys(groups).every(function(name){
      var selected=groups[name];if(!selected.length)return true;
      return selected.some(function(value){
        if(name==='outtimes')return timeBucket(legTime(0,'.bf_legdept'))===value;
        if(name==='arrivalouttimes')return timeBucket(legTime(0,'.bf_legarrv'))===value;
        if(name==='rettimes')return timeBucket(legTime(-1,'.bf_legdept'))===value;
        if(name==='arrivalrettimes')return timeBucket(legTime(-1,'.bf_legarrv'))===value;
        if(name==='airlines')return value==='QR'&&/Qatar Airways/i.test(card.textContent+' '+Array.from(card.querySelectorAll('img')).map(function(img){return img.alt;}).join(' '));
        if(name==='connections')return Array.from(card.querySelectorAll('.bf_cnxap')).some(function(node){return node.textContent.indexOf(value)>=0;});
        if(name==='baggage')return /baggage|\u0623\u0645\u062a\u0639\u0629/.test(card.textContent);
        if(name==='stops'||name==='outstops'||name==='retstops')return value==='1'&&card.querySelector('.bf_stps');
        return true;
      });
    });
  }
  function applyFilters(){var range=currentPriceRange();syncFilterClear();loadResultPage(1,{filters:collectFilterState(),priceFrom:range.priceFrom,priceTo:range.priceTo,hotelName:currentHotelName()});}
  function cardPrice(card){var node=card.querySelector('.ibecurr[data-amt]');return node?Number(node.getAttribute('data-amt'))||Infinity:Infinity;}
  function cardDuration(card){return Array.from(card.querySelectorAll('.bf_legduration')).reduce(function(sum,node){var t=node.textContent;var h=(t.match(/(\d+)\s*(?:hrs?|hours?|\u0633\u0627\u0639)/i)||[])[1]||0;var m=(t.match(/(\d+)\s*(?:mins?|minutes?|\u062f\u0642\u064a\u0642)/i)||[])[1]||0;return sum+Number(h)*60+Number(m);},0);}
  function sortResults(mode){
    var list=document.querySelector('#qa-pr-content .bf_results');if(!list)return;
    var cards=Array.from(list.children).filter(function(node){return node.classList&&node.classList.contains('bf_rsitem');});
    cards.sort(function(a,b){if(mode==='duration')return cardDuration(a)-cardDuration(b);if(mode==='departure')return parseMinutes((a.querySelector('.bf_fleginfo .bf_legdept .bf_time')||{}).textContent)-parseMinutes((b.querySelector('.bf_fleginfo .bf_legdept .bf_time')||{}).textContent);return cardPrice(a)-cardPrice(b);});
    cards.forEach(function(card){list.appendChild(card);});
  }
  function passengerCount(){var pair=(requestPayload&&requestPayload.params||[]).find(function(entry){return entry[0]==='numPassengers';});return Math.max(1,Number(pair&&pair[1])||1);}
  function sortMode(sort){return sort.classList.contains('dr')?'duration':sort.classList.contains('bf_sortopt_deptime')?'departure':'price';}
  function optionSortMode(option){var input=option&&option.querySelector('[name="filter_sortby"]');return input?input.value:'sort_price';}
  function populateSortCost(active,data){
    if(!active)return;var cost=active.querySelector('.bf_sortcost');if(!cost)return;var mode=optionSortMode(active),entry=data&&data.sortCosts&&data.sortCosts[mode];if(!entry){cost.textContent='';return;}
    var suffix=activePriceMode==='t'?(lang==='ar'?'المجموع':'total'):(lang==='ar'?'للشخص الواحد':'per person');
    if(activeCurrency==='AVI'&&entry.html){cost.innerHTML=entry.html+' <span class="qa-pr-price-suffix">'+suffix+'</span>';return;}
    var amount=Number(entry.amount);if(!isFinite(amount)){cost.textContent='';return;}cost.textContent='QAR '+Math.round(amount).toLocaleString(lang==='ar'?'ar-QA':'en-US')+' '+suffix;
  }
  function syncToolbar(content,data){
    activeSortMode=data&&data.sortMode||activeSortMode;activePriceMode=data&&data.priceMode||activePriceMode;activeCurrency=data&&data.currency||activeCurrency;activeFilterState=data&&data.filterState||activeFilterState;activePriceFrom=data&&data.priceFrom!=null?String(data.priceFrom):activePriceFrom;activePriceTo=data&&data.priceTo!=null?String(data.priceTo):activePriceTo;
    var sortOptions=content.querySelector('.bf_sortopts'),container=content.querySelector('.bf_sortopt_container');
    if(sortOptions&&container){sortOptions.style.visibility='visible';var dropdown=sortOptions.querySelector('.bf_sortopt_dropdown'),all=Array.from(sortOptions.querySelectorAll('.bf_sortopt')),active=all.find(function(option){return optionSortMode(option)===activeSortMode;})||all[0];if(dropdown&&active){all.forEach(function(option){var selected=option===active;option.classList.toggle('active',selected);var input=option.querySelector('[name="filter_sortby"]');if(input)input.checked=selected;if(!selected)dropdown.appendChild(option);});sortOptions.appendChild(active);container.classList.remove('open');dropdown.style.display='none';populateSortCost(active,data);}}
    var priceToggle=content.querySelector('.bf_prtgl');if(priceToggle){var total=activePriceMode==='t';priceToggle.classList.toggle('on',priceToggle.classList.contains('default_pp')?total:!total);priceToggle.setAttribute('aria-checked',String(total));priceToggle.setAttribute('role','switch');priceToggle.setAttribute('tabindex','0');var activePriceLabel=priceToggle.querySelector('[data-mode="'+activePriceMode+'"]');var priceTitle=content.querySelector('.bf_filters .bf_filterpricectr .bf_filterheader .ttl');if(priceTitle&&activePriceLabel)priceTitle.textContent=activePriceLabel.textContent.trim();}
    var selector=content.querySelector('#bf-display-price-selector');if(selector){var label=selector.querySelector('.nbf_tpl_displaypricecurrselectcontainer_selectedoption');if(label)label.setAttribute('data-curr',activeCurrency);selector.querySelectorAll('.nbf_tpl_displaypricecurrselectcontainer_option').forEach(function(option){var selected=option.getAttribute('data-curr')===activeCurrency;option.classList.toggle('nbf_tpl_displaypricecurrselectcontainer_optionselected',selected);option.setAttribute('aria-selected',String(selected));option.setAttribute('role','option');option.setAttribute('tabindex','0');});}
  }
  function initialiseSortToolbar(content){syncToolbar(content,latestData||{});}
  function applyMobileOfficialBreakpoints(content){
    if(!window.matchMedia('(max-width: 991px)').matches)return;
    document.body.classList.add('mobile','bf_web_share_api_disabled');
    var width=document.documentElement.clientWidth||window.innerWidth;
    content.querySelectorAll('.bf_flow').forEach(function(flow){[420,480,576,680,768,850,1000,1024,1280,1450].forEach(function(point){flow.classList.toggle('bf_'+point,width<=point);});});
  }
  function prepareMobileFilters(content){
    if(!window.matchMedia('(max-width: 991px)').matches)return;
    var flow=content.querySelector('.bf_flow'),filters=content.querySelector('.bf_filters'),open=content.querySelector('.bf_fltrbtn'),done=content.querySelector('.bf_fltrdn');
    if(!flow||!filters||!open||!done)return;
    filters.id='qa-pr-mobile-filters';filters.setAttribute('aria-hidden',String(!flow.classList.contains('filtering')));
    open.setAttribute('role','button');open.setAttribute('tabindex','0');open.setAttribute('aria-controls',filters.id);open.setAttribute('aria-expanded',String(flow.classList.contains('filtering')));
    done.type='button';done.setAttribute('aria-controls',filters.id);
  }
  function setMobileFilters(content,open,focusTrigger){
    if(!window.matchMedia('(max-width: 991px)').matches)return false;
    var flow=content.querySelector('.bf_flow'),filters=content.querySelector('.bf_filters'),trigger=content.querySelector('.bf_fltrbtn'),done=content.querySelector('.bf_fltrdn');
    if(!flow||!filters||!trigger||!done)return false;
    flow.classList.toggle('filtering',open);filters.setAttribute('aria-hidden',String(!open));trigger.setAttribute('aria-expanded',String(open));
    if(open)done.focus();else if(focusTrigger)trigger.focus();
    return true;
  }
  function enhanceShell(){
    var content=document.getElementById('qa-pr-content');
    applyMobileOfficialBreakpoints(content);
    var toolbar=content.querySelector('.bf_srow');if(toolbar)toolbar.classList.add('bf_srow_visible');
    initialiseSortToolbar(content);
    restoreResultCards(content);initialiseHotelMap(content);repairStopoverTourImages(content);
    var searchButton=content.querySelector('.js-bf_changesearchbtn');if(searchButton)searchButton.type='button';
    prepareMobileFilters(content);
    content.addEventListener('click',function(event){
      var openFilters=event.target.closest('.bf_fltrbtn');if(openFilters){event.preventDefault();setMobileFilters(content,true,false);return;}
      var closeFilters=event.target.closest('.bf_fltrdn');if(closeFilters){event.preventDefault();setMobileFilters(content,false,true);return;}
      var pageButton=event.target.closest('.bf_pgctrl .bf_page[data-page]');if(pageButton){event.preventDefault();loadResultPage(Number(pageButton.getAttribute('data-page')));return;}
      var mapTrigger=event.target.closest('.bf_static_map_modal_link');if(mapTrigger){event.preventDefault();openHotelMap(mapTrigger);return;}
      var priceToggle=event.target.closest('.bf_prtgl');if(priceToggle){event.preventDefault();loadResultPage(1,{priceMode:activePriceMode==='pp'?'t':'pp'});return;}
      var currencyOption=event.target.closest('#bf-display-price-selector .nbf_tpl_displaypricecurrselectcontainer_option[data-curr]');if(currencyOption){event.preventDefault();var currency=currencyOption.getAttribute('data-curr');if(currency==='QAR'||currency==='AVI')loadResultPage(1,{currency:currency});return;}
      var filterHeader=event.target.closest('.bf_filterheader');
      if(filterHeader){event.preventDefault();var section=filterHeader.closest('.bf_filtersection');if(section){section.classList.toggle('show');section.classList.toggle('collapsed');}return;}
      var clear=event.target.closest('.js-bf_clearfilters');if(clear){event.preventDefault();content.querySelectorAll('.bf_filters input[type="checkbox"]').forEach(function(input){input.checked=false;});content.querySelectorAll('.bf_pricefltr input[type="number"]').forEach(function(input){input.value='';});var hotelName=hotelNameInput();if(hotelName)hotelName.value='';applyFilters();return;}
      var edit=event.target.closest('.js-bf_changesearchbtn');if(edit){event.preventDefault();location.href=location.origin+returnPath();return;}
      var sort=event.target.closest('.bf_sortopt');if(sort){event.preventDefault();var container=sort.closest('.bf_sortopt_container'),options=sort.closest('.bf_sortopts'),dropdown=options&&options.querySelector('.bf_sortopt_dropdown');if(sort.classList.contains('active')){if(container&&dropdown){var opening=!container.classList.contains('open');container.classList.toggle('open',opening);dropdown.style.display=opening?'block':'none';}return;}if(container)container.classList.remove('open');if(dropdown)dropdown.style.display='none';loadResultPage(1,{sortMode:optionSortMode(sort)});return;}
      var tour=event.target.closest('.js-bf_opentourwhoosher[data-hash]');if(tour){event.preventDefault();event.stopPropagation();openTourWhoosher(tour.getAttribute('data-hash'));return;}
      var roomChoice=event.target.closest('.qa-pr-inline-hotel-rates .js-bf_choicebutton');if(roomChoice){event.preventDefault();event.stopPropagation();selectInlineHotelRate(roomChoice);return;}
      var showRates=event.target.closest('.js-bf_showrates[data-results]');if(showRates&&latestData&&latestData.resultStage==='hotel'&&(product==='stopover'||product==='flight-hotel'||product==='hotel')){event.preventDefault();event.stopPropagation();openHotelRates(showRates);return;}
      var select=event.target.closest('.js-bf_selectproduct[data-selection]');if(select){event.preventDefault();event.stopPropagation();var choice=select.getAttribute('data-selection');if(!activeToken||!choice)return;var flightStage=latestData&&latestData.resultStage==='flight';if((product==='stopover'||product==='flight-hotel')&&flightStage){selectFromCard(choice,false);}else if(product==='stopover'&&latestData&&latestData.resultStage==='hotel'){selectFromCard(choice,true);}else{location.href=hotelDetailsURL(choice);}return;}
      var details=event.target.closest('a[href^="/package-details"],a[href*="/package-details?"]');if(details){event.preventDefault();event.stopPropagation();var hotelButton=product==='stopover'&&latestData&&latestData.resultStage==='hotel'&&details.closest('.bf_select .bf_button');var flightDetails=(product==='stopover'||product==='flight-hotel')&&latestData&&latestData.resultStage==='flight';if(hotelButton){selectFromCard(detailsChoice(details),true);}else if(flightDetails&&!(product==='stopover'&&window.matchMedia('(max-width: 991px)').matches)){openDetails(detailsChoice(details));}else{var detailUrl=new URL(details.href,location.origin);location.href=location.origin+detailUrl.pathname+detailUrl.search;}}
    });
    content.addEventListener('change',function(event){if(event.target.matches('.bf_filters input[type="checkbox"][data-filter],.bf_pricefltr input[type="number"][data-filter]'))applyFilters();});
    content.addEventListener('input',function(event){if(event.target!==hotelNameInput())return;if(filterApplyTimer)clearTimeout(filterApplyTimer);filterApplyTimer=setTimeout(function(){filterApplyTimer=null;applyFilters();},450);});
    content.addEventListener('keydown',function(event){if(event.key==='Escape'){var filtering=content.querySelector('.bf_flow.filtering');if(filtering&&setMobileFilters(content,false,true)){event.preventDefault();return;}}if(event.key!=='Enter'&&event.key!==' ')return;var filterControl=event.target.closest&&event.target.closest('.bf_fltrbtn,.bf_fltrdn');if(filterControl){event.preventDefault();setMobileFilters(content,filterControl.classList.contains('bf_fltrbtn'),filterControl.classList.contains('bf_fltrdn'));return;}var tour=event.target.closest&&event.target.closest('.js-bf_opentourwhoosher[data-hash]');if(tour){event.preventDefault();openTourWhoosher(tour.getAttribute('data-hash'));return;}var pageButton=event.target.closest&&event.target.closest('.bf_pgctrl .bf_page[data-page]');if(pageButton){event.preventDefault();loadResultPage(Number(pageButton.getAttribute('data-page')));return;}var priceToggle=event.target.closest&&event.target.closest('.bf_prtgl');if(priceToggle){event.preventDefault();loadResultPage(1,{priceMode:activePriceMode==='pp'?'t':'pp'});return;}var currencyOption=event.target.closest&&event.target.closest('#bf-display-price-selector .nbf_tpl_displaypricecurrselectcontainer_option[data-curr]');if(currencyOption){event.preventDefault();loadResultPage(1,{currency:currencyOption.getAttribute('data-curr')});}});
    if(!document.documentElement.dataset.qaPrToolbarOutside){document.documentElement.dataset.qaPrToolbarOutside='1';document.addEventListener('click',function(event){if(event.target.closest&&event.target.closest('.bf_sortopt_container'))return;var container=document.querySelector('#qa-pr-content .bf_sortopt_container'),dropdown=container&&container.querySelector('.bf_sortopt_dropdown');if(container)container.classList.remove('open');if(dropdown)dropdown.style.display='none';});}
    document.getElementById('qa-pr-official-header').addEventListener('click',function(event){if(event.target.closest('#change-language-trigger-desktop'))return;var anchor=event.target.closest('a');if(anchor){event.preventDefault();location.href=location.origin+returnPath();return;}var button=event.target.closest('button');if(button){event.preventDefault();event.stopPropagation();}});if(!document.documentElement.dataset.qaPrMapEscape){document.documentElement.dataset.qaPrMapEscape='1';document.addEventListener('keydown',function(event){if(event.key==='Escape')closeHotelMap();});}
  }
  function qaFontsThen(link,go){var faces=[];try{Array.prototype.forEach.call(link.sheet.cssRules,function(r){if(r.type===5&&faces.length<30){var fam=(r.style.getPropertyValue('font-family')||'').replace(/["']/g,'').trim();if(fam)faces.push((r.style.getPropertyValue('font-style')||'normal')+' '+(r.style.getPropertyValue('font-weight')||'400').split(' ')[0]+' 16px "'+fam+'"');}});}catch(_){}if(!faces.length||!document.fonts||!document.fonts.load){go();return;}var done=false,once=function(){if(!done){done=true;go();}};Promise.all(faces.map(function(f){return document.fonts.load(f).catch(function(){});})).then(once,once);window.setTimeout(once,4000);}function qaRevealContent(){var content=document.getElementById('qa-pr-content'),footer=document.getElementById('qa-pr-footer'),loading=document.getElementById('qa-pr-loading');setState('content');loading.hidden=false;content.style.visibility='hidden';if(footer)footer.style.visibility='hidden';var limit=window.innerHeight*1.6+(loading.offsetHeight||0);var imgs=Array.prototype.filter.call(document.querySelectorAll('#qa-pr-official-header img,#qa-pr-content img'),function(img){if(img.complete||img.getAttribute('loading')==='lazy'||!img.getAttribute('src'))return false;var r=img.getBoundingClientRect();return r.top<limit&&r.width>0;});var done=false,finish=function(){if(done)return;done=true;loading.hidden=true;content.style.visibility='';if(footer)footer.style.visibility='';};if(!imgs.length){finish();return;}var left=imgs.length,tick=function(){left-=1;if(left<=0)finish();};imgs.forEach(function(img){img.addEventListener('load',tick,{once:true});img.addEventListener('error',tick,{once:true});});window.setTimeout(finish,3000);}var qaCssState={};function qaCssReady(cssText,id,cb){var m=String(cssText).match(/^\s*@import\s+url\(\s*["']?([^"')]+)["']?\s*\)\s*;?\s*$/);if(!m){var st=document.getElementById(id);if(!st){st=document.createElement('style');st.id=id;document.head.appendChild(st);}if(st.textContent!==cssText)st.textContent=cssText;return true;}var href=m[1],state=qaCssState[href];if(state===true)return true;if(state){state.cb=cb;return false;}state=qaCssState[href]={cb:cb};var link=document.createElement('link');link.rel='stylesheet';link.href=href;link.setAttribute('data-qa-css',id);var finished=false,finish=function(){if(finished)return;finished=true;qaCssState[href]=true;document.querySelectorAll('link[data-qa-css="'+id+'"]').forEach(function(node){if(node!==link)node.remove();});var old=document.getElementById(id);if(old&&old.tagName==='STYLE')old.remove();qaFontsThen(link,function(){try{state.cb();}catch(_){}});};link.onload=finish;link.onerror=finish;window.setTimeout(finish,12000);document.head.appendChild(link);return false;}
  function render(data){
    if(data.error){showError(copy.errorBody);return;}if(data.token)activeToken=data.token;
    if(data.status==='searching'){setState('loading');var p=document.querySelector('#qa-pr-loading p');if(p)p.textContent=copy.searching;retryTimer=setTimeout(function(){post('/api/packages/status',{token:activeToken}).then(render).catch(function(){showError(copy.errorBody);});},1800);return;}
    if(data.status==='no_results'&&!data.html){qaShowNoResults();return;}
    if((data.status!=='ready'&&data.status!=='no_results')||!data.html){showError(copy.errorBody);return;}
    latestData=data;activeSortMode=data.sortMode||activeSortMode;activePriceMode=data.priceMode||activePriceMode;activeCurrency=data.currency||activeCurrency;activeFilterState=data.filterState||{};activePriceFrom=data.priceFrom!=null?String(data.priceFrom):'';activePriceTo=data.priceTo!=null?String(data.priceTo):'';activeHotelName=data.hotelName!=null?String(data.hotelName):'';
    var shell=data.shell||{};
    if(shell.cssText&&!qaCssReady(shell.cssText,'qa-pr-source-css',function(){render(data);})){setState('loading');return;}
    var header=document.getElementById('qa-pr-official-header');if(shell.headerHtml)header.innerHTML=shell.headerHtml;installHeaderLanguage(header);installHeaderMobileMenu(header);
    var content=document.getElementById('qa-pr-content');content.innerHTML=shell.flowHtml||fallbackFlow();
    var results=content.querySelector('.bf_results');if(!results){showError(copy.errorBody);return;}results.innerHTML=data.html;
    populateFilters(data.filters||{});enhanceShell();syncFilterControls(data);buildPagination(data);qaRevealContent();
    sessionStorage.setItem('qaPackageResultToken',JSON.stringify({token:activeToken,product:product,lang:lang,time:Date.now()}));
    window.scrollTo(0,0);
  }
  function search(){if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}setState('loading');activeToken='';var searchPayload=Object.assign({},requestPayload);if(product==='stopover'||product==='flight-hotel')searchPayload.priceMode='t';post('/api/packages/search',searchPayload).then(render).catch(function(error){showError(error&&error.message==='expired_session'?copy.missing:copy.errorBody);});}

  applyCopy();
  requestPayload=readStored();
  document.getElementById('qa-pr-back').href=returnPath();
  if(!requestPayload)showError(copy.missing);else{var resumed=resume?readStage():null;if(resumed){activeToken=resumed.token||'';render(resumed.data);}else search();}
  document.getElementById('qa-pr-retry').addEventListener('click',search);
  window.addEventListener('beforeunload',function(){if(retryTimer)clearTimeout(retryTimer);});
})();
