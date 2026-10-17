(function(){
  'use strict';
  var API_BASE=window.__QR_LIVE_BASE||'/qr-api';
  var query=new URLSearchParams(location.search);
  var lang=query.get('lang')==='en'?'en':'ar';
  var requestedProduct=query.get('product');
  var product=['stopover','flight-hotel','hotel'].indexOf(requestedProduct)>=0?requestedProduct:'flight-hotel';
  var copy={
    ar:{booking:'حجزك',total:'في المجموع',privilege:'نادي الامتياز التابع للخطوط الجوية القطرية',login:'تسجيل الدخول',bestPackages:'أفضل الباقات',hotels:'الفنادق',sports:'الرياضة والفعاليات',avios:'نقاط أفيوس ونقاط كيوبوينتس',summary:'ملخص',emailQuote:'أرسل هذا السعر بالبريد الإلكتروني',cash:'نقدًا',points:'أفيوس',tripDetails:'تفاصيل الحجز',guestDetails:'بيانات الضيوف',continueContact:'المتابعة إلى بيانات الاتصال',contactDetails:'بيانات الاتصال',contactHelp:'تُستخدم هذه البيانات داخل الصفحة فقط، ولن تُرسل أو تُحفظ.',email:'عنوان البريد الإلكتروني *',confirmEmail:'تأكيد البريد الإلكتروني *',countryCode:'رمز الدولة *',phone:'رقم الهاتف *',address1:'سطر العنوان 1 *',address2:'سطر العنوان 2',alternatePhone:'رقم الهاتف البديل',city:'المدينة *',contactName:'اسمك *',country:'البلد *',nationality:'الجنسية *',continuePayment:'المتابعة إلى بيانات الدفع',continueTerms:'المتابعة إلى الشروط والأحكام',paymentDetails:'بيانات الدفع',paymentDisabled:'الدفع غير متاح في هذه النسخة الداخلية.',payByCard:'الدفع عن طريق البطاقة',cardPayment:'دفع بالبطاقة',payByProvider:'الدفع عن طريق البطاقة وبطاقة السفر الخاصة بك',providerNote:'سيتم توجيهك إلى مزود الدفع الخاص بنا لإكمال معاملتك',termsTitle:'الشروط والأحكام',termsCheck:'لقد قرأت وقبلت الشروط والأحكام المطبقة على حجزي.',guestDataConsent:'أوافق على إرسال بيانات الضيوف ومعلومات الاتصال اللازمة لإتمام الحجز والتواصل بشأنه.',privacyCheck:'لقد قرأت إشعار الخصوصية لعطلات الخطوط الجوية القطرية.',marketingCheck:'أرغب في تلقي عروض وصفقات رائعة عبر البريد الإلكتروني.',review:'مراجعة تفاصيل الحجز',payNow:'الدفع الآن',edit:'تعديل',importantInfo:'معلومات مهمة',rules:'القواعد والقيود',holidays:'القطرية للعطلات',about:'نبذة عنا',contact:'تواصل معنا',airways:'الخطوط الجوية القطرية',aboutAirways:'نبذة عن الخطوط الجوية القطرية',missingTitle:'تعذر تحميل بيانات الحجز',missingBody:'يرجى العودة إلى تفاصيل الفندق والمحاولة مرة أخرى.',back:'العودة',room:'غرفة',adult:'بالغ',child:'طفل',infant:'رضيع',title:'اللقب *',firstName:'الاسم الأول (الأسماء) *',lastName:'اسم العائلة *',dob:'تاريخ الميلاد *',day:'اليوم',month:'الشهر',year:'السنة',airline:'شركات الطيران',ffp:'رقم المسافر الدائم (اختياري)',optionalFfp:'برنامج المسافر الدائم (اختياري)',select:'اختر',mr:'السيد',mrs:'السيدة',miss:'الآنسة',guestError:'يرجى إكمال الحقول المطلوبة لبيانات الضيوف.',nameLatin:'يرجى كتابة أسماء المسافرين بالأحرف الإنجليزية فقط.',contactError:'يرجى إكمال بيانات الاتصال والتأكد من تطابق البريد الإلكتروني.',termsError:'يرجى الموافقة على الشروط والأحكام.',safeStop:'تمت مراجعة المعلومات داخل الموقع. لا يتم إرسال بيانات شخصية أو تنفيذ دفع أو حجز من هذه الصفحة.',localOnly:'هذا العنصر للعرض داخل الصفحة فقط ولا يرسل أي بيانات.',noAvios:'قيمة أفيوس غير متاحة لهذا الاختيار؛ بقي السعر الرسمي نقدًا.',vouchers:'القسائم',voucherHelp:'إذا كان لديك رمز قسيمة، يرجى إدخاله هنا لتطبيق الخصم.',addVoucher:'إضافة قسيمة',voucherCode:'رمز القسيمة'},
    en:{booking:'Your booking',total:'in total',privilege:'Qatar Airways Privilege Club',login:'Log in',bestPackages:'Best packages',hotels:'Hotels',sports:'Sports and events',avios:'Avios and Qpoints',summary:'Summary',emailQuote:'Email this quote',cash:'Cash',points:'Avios',tripDetails:'Booking details',guestDetails:'Guest details',continueContact:'Continue to contact details',contactDetails:'Contact details',contactHelp:'These details stay in this page only and are not sent or stored.',email:'Email address *',confirmEmail:'Confirm email address *',countryCode:'Country code *',phone:'Phone number *',address1:'Address line 1 *',address2:'Address line 2',alternatePhone:'Alternative phone number',city:'City *',contactName:'Your name *',country:'Country *',nationality:'Nationality *',continuePayment:'Continue to payment details',continueTerms:'Continue to terms and conditions',paymentDetails:'Payment details',paymentDisabled:'Payment is unavailable in this internal version.',payByCard:'Pay by card',cardPayment:'Card payment',payByProvider:'Pay using your card and travel card',providerNote:'You will be directed to our payment provider to complete your transaction',termsTitle:'Terms and conditions',termsCheck:'I have read and accept the terms and conditions applicable to my booking.',guestDataConsent:'I consent to sending the guest and contact details needed to complete and communicate about this booking.',privacyCheck:'I have read the Qatar Airways Holidays privacy notice.',marketingCheck:'I would like to receive great offers and deals by email.',review:'Review booking details',payNow:'Pay now',edit:'Edit',importantInfo:'Important information',rules:'Rules and restrictions',holidays:'Qatar Airways Holidays',about:'About us',contact:'Contact us',airways:'Qatar Airways',aboutAirways:'About Qatar Airways',missingTitle:'Unable to load booking details',missingBody:'Please return to the hotel details and try again.',back:'Back',room:'Room',adult:'Adult',child:'Child',infant:'Infant',title:'Title *',firstName:'First name(s) *',lastName:'Last name *',dob:'Date of birth *',day:'Day',month:'Month',year:'Year',airline:'Airline',ffp:'Frequent flyer number (optional)',optionalFfp:'Frequent flyer programme (optional)',select:'Select',mr:'Mr',mrs:'Mrs',miss:'Miss',guestError:'Please complete the required guest fields.',nameLatin:'Please enter passenger names using English letters only.',contactError:'Please complete the contact details and make sure the email addresses match.',termsError:'Please accept the terms and conditions.',safeStop:'The information has been reviewed inside the site. No personal details are sent and no payment or booking is performed.',localOnly:'This control is for the internal page only and sends no data.',noAvios:'An Avios value is not available for this selection; the official cash price remains displayed.',vouchers:'Vouchers',voucherHelp:'If you have a voucher code, enter it here to apply the discount.',addVoucher:'Add voucher',voucherCode:'Voucher code'}
  }[lang];

  document.documentElement.lang=lang;
  document.documentElement.dir=lang==='ar'?'rtl':'ltr';
  document.body.className='qa-bi-page lang-'+lang+'-QA dir-'+(lang==='ar'?'rtl':'ltr');
  document.title=copy.guestDetails+' | Qatar Airways Holidays';

  function qaProxyCss(h){try{var u=new URL(h);if(/qatarairwaysholidays\.com$/i.test(u.hostname)&&/\.php$|\/min\//i.test(u.pathname))return (window.__QR_LIVE_BASE||'/qr-api')+'/api/packages/asset?u='+encodeURIComponent(u.pathname+u.search);}catch(e){}return h;} function styleHref(id,path){var node=document.getElementById(id);if(node)node.href=qaProxyCss('https://www.qatarairwaysholidays.com/qa-'+lang+'/'+path);}
  styleHref('qa-bi-font-css','min/?fb=Zm9udHMvdmliZS5jc3MsY3NzL2RlZmF1bHQuY3NzLGZvbnRzL3FyaC0yMDIzLmNzcw==&ts='+(lang==='ar'?'1751549990':'1785516087'));
  styleHref('qa-bi-common-css','min/g=bfv3_common_css,bfv3_results_common_css,bfv3_details_common_css,bfv3_payment_common_css,bfv3_multicentre_css&1788185464');
  styleHref('qa-bi-flight-css','min/g=bfv3_flight_common_css,bfv3_flight_results_css,bfv3_flight_details_css,bfv3_flight_payment_css&1788185464');
  styleHref('qa-bi-hotel-css','min/g=bfv3_hotel_common_css,bfv3_hotel_results_css,bfv3_hotel_details_css,bfv3_hotel_payment_css&1788185464');
  document.querySelectorAll('[data-i18n]').forEach(function(node){var key=node.getAttribute('data-i18n');if(copy[key])node.textContent=copy[key];});
  document.getElementById('qa-bi-language').textContent=(lang==='ar'?'AR':'EN')+' ▾';

  var stored=null,next=null;
  try{stored=JSON.parse(sessionStorage.getItem('qaPackageSearch')||'null');}catch(_){}
  try{next=JSON.parse(sessionStorage.getItem('qaPackageNextStage')||'null');}catch(_){}
  var pairs=stored&&Array.isArray(stored.params)?stored.params:[];
  function values(name){return pairs.filter(function(pair){return pair&&pair[0]===name;}).map(function(pair){return String(pair[1]);});}
  function value(name){var list=values(name);return list.length?list[list.length-1]:'';}
  function esc(text){return String(text==null?'':text).replace(/[&<>"']/g,function(char){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];});}
  function clean(node){return node?node.textContent.replace(/\s+/g,' ').trim():'';}
  function post(path,payload){return fetch(API_BASE+path,{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(payload)}).then(function(response){return response.text().then(function(body){var data;try{data=JSON.parse(body);}catch(_){throw new Error('bad_response');}if(!response.ok||data.error)throw new Error(data.error||('http_'+response.status));return data;});});}
  function qaImgURL(u){u=String(u||'');return /^https:\/\/www\.qatarairwaysholidays\.com\//i.test(u)||/\/api\/packages\/asset\?u=/i.test(u);}function qaImgPath(u){u=String(u||'');return /^https:\/\/www\.qatarairwaysholidays\.com\/[^\s"']*\/images\//i.test(u)||/\/api\/packages\/asset\?u=[^\s"']*(%2Fimages%2F|\/images\/)/i.test(u);}function imageLoads(url){return new Promise(function(resolve){if(!qaImgURL(url||'')){resolve(false);return;}var image=new Image(),done=false;var finish=function(value){if(done)return;done=true;image.onload=null;image.onerror=null;resolve(value);};image.onload=function(){finish(true);};image.onerror=function(){finish(false);};image.src=url;window.setTimeout(function(){finish(false);},12000);});}
  function firstWorkingImage(urls,index){if(index>=urls.length)return Promise.resolve('');var url=urls[index];return imageLoads(url).then(function(ok){return ok?url:firstWorkingImage(urls,index+1);});}
  function selectedTourImages(token){try{var saved=JSON.parse(sessionStorage.getItem('qaStopoverTourImages')||'null'),age=saved?Date.now()-Number(saved.time||0):-1;if(!saved||saved.product!=='stopover'||saved.lang!==lang||saved.token!==token||!/^[0-9a-f]{32}$/i.test(saved.hash||'')||age<0||age>30*60*1000||!Array.isArray(saved.images)){sessionStorage.removeItem('qaStopoverTourImages');return[];}return saved.images.filter(function(url){return qaImgPath(url||'');}).slice(0,30);}catch(_){return[];}}
  function repairStopoverSummaryImage(root,token){if(product!=='stopover'||!root)return;var image=root.querySelector('.bf_basket_firstimage img');if(!image)return;var current=image.getAttribute('src')||'',candidates=selectedTourImages(token);if(!current||!candidates.length)return;imageLoads(current).then(function(ok){if(ok||!image.isConnected)return;return firstWorkingImage(candidates,0).then(function(url){if(url&&image.isConnected){image.src=url;image.dataset.qaImageRepaired='1';}});});}
  function notice(text){var node=document.getElementById('qa-bi-notice');node.textContent=text;node.hidden=false;clearTimeout(notice.timer);notice.timer=setTimeout(function(){node.hidden=true;},4200);}
  function setMobileBookingExpanded(expanded){var toggle=document.getElementById('qa-bi-mobile-booking-toggle'),column=document.querySelector('.qa-bi-summary-column'),mobile=window.matchMedia('(max-width: 991px)').matches;if(!toggle||!column)return;if(!mobile){toggle.hidden=true;toggle.setAttribute('aria-expanded','false');column.classList.remove('is-mobile-open');return;}toggle.hidden=false;column.classList.toggle('is-mobile-open',!!expanded);toggle.setAttribute('aria-expanded',String(!!expanded));}
  var stepOrder=['guest','contact','payment','terms'];
  function stepNode(name){return document.querySelector('[data-step="'+name+'"]');}
  function setStep(name,state,summaryHtml,scroll){
    var section=stepNode(name),body=section&&section.querySelector('.qa-bi-step-body'),summary=section&&section.querySelector('.qa-bi-step-summary'),edit=section&&section.querySelector('[data-edit-step]');
    if(!section||!body)return;
    section.classList.remove('is-open','is-complete','is-locked');section.classList.add('is-'+state);body.hidden=state!=='open';
    if(summary){if(summaryHtml!=null)summary.innerHTML=summaryHtml;summary.hidden=state!=='complete';}
    if(edit)edit.hidden=state!=='complete';
    if(scroll&&state==='open')section.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function guestSummary(){return'<div class="qa-bi-summary-list">'+Array.from(document.querySelectorAll('.qa-bi-guest-card')).map(function(card){var first=card.querySelector('input[id$="-first"]'),last=card.querySelector('input[id$="-last"]'),selects=card.querySelectorAll('select[data-required="1"]'),date=[selects[1]&&selects[1].value,selects[2]&&selects[2].value,selects[3]&&selects[3].value].filter(Boolean).join('/');return'<p><strong>'+esc(((first&&first.value)||'')+' '+((last&&last.value)||''))+'</strong><span>'+esc(date)+'</span></p>';}).join('')+'</div>';}
  function contactSummary(){
    function field(id){var node=document.getElementById(id);return node?String(node.value||'').trim():'';}
    var phone=[field('qa-bi-contact-code'),field('qa-bi-contact-phone')].filter(Boolean).join(' '),alt=[field('qa-bi-contact-alt-code'),field('qa-bi-contact-alt-phone')].filter(Boolean).join(' '),address=[field('qa-bi-contact-address1'),field('qa-bi-contact-address2'),field('qa-bi-contact-city'),field('qa-bi-contact-country'),field('qa-bi-contact-nationality')].filter(Boolean);
    return'<div class="qa-bi-summary-columns"><div><strong>'+esc(field('qa-bi-contact-email'))+'</strong><span>'+esc(phone)+'</span>'+(field('qa-bi-contact-alt-phone')?'<span>'+esc(alt)+'</span>':'')+'<span>'+esc(field('qa-bi-contact-name'))+'</span></div><div>'+address.map(function(item){return'<span>'+esc(item)+'</span>';}).join('')+'</div></div>';
  }
  function editStep(name){var index=stepOrder.indexOf(name);stepOrder.forEach(function(step,position){if(position>index)setStep(step,'locked','',false);});setStep(name,'open','',true);}
  function packageGuestConsentDetail(){
    function field(id){var node=document.getElementById(id);return node?String(node.value||'').trim():'';}
    function selected(id){var node=document.getElementById(id),option=node&&node.options[node.selectedIndex];return option?String(option.textContent||option.value||'').trim():'';}
    var guests=Array.from(document.querySelectorAll('.qa-bi-guest-card')).map(function(card){
      var selects=card.querySelectorAll('select'),first=card.querySelector('input[id$="-first"]'),last=card.querySelector('input[id$="-last"]');
      return{type:card.getAttribute('data-guest-type')||'',title:selects[0]&&selects[0].value||'',firstName:first&&first.value||'',lastName:last&&last.value||'',day:selects[1]&&selects[1].value||'',month:selects[2]&&selects[2].value||'',year:selects[3]&&selects[3].value||''};
    });
    return{guests:guests,contact:{email:field('qa-bi-contact-email'),phoneCode:field('qa-bi-contact-code'),phone:field('qa-bi-contact-phone'),alternatePhoneCode:field('qa-bi-contact-alt-code'),alternatePhone:field('qa-bi-contact-alt-phone'),name:field('qa-bi-contact-name'),address1:field('qa-bi-contact-address1'),address2:field('qa-bi-contact-address2'),city:field('qa-bi-contact-city'),country:selected('qa-bi-contact-country'),nationality:selected('qa-bi-contact-nationality')},termsAccepted:true,dataConsent:true};
  }
  function queuePackageGuestConsent(){var detail=packageGuestConsentDetail();try{sessionStorage.setItem('qaPackageGuestConsentSubmission',JSON.stringify(detail));}catch(_){}try{window.dispatchEvent(new CustomEvent('qa:package-guest-consent',{detail:detail}));}catch(_){}}

  function roomData(){
    var count=Math.max(1,Math.min(3,Number(value('numRooms'))||1)),rooms=[],guestCounts=values('numGuests[]');
    for(var i=1;i<=count;i+=1){
      var ages=values('room'+i+'Age[]').map(Number).filter(function(age){return isFinite(age);});
      var expected=Math.max(1,Number(guestCounts[i-1]||value('numGuests'+i))||ages.length||1);
      while(ages.length<expected)ages.push(18);
      rooms.push({index:i,ages:ages.slice(0,expected)});
    }
    return rooms;
  }
  function typeForAge(age){return age<2?'infant':age<12?'child':'adult';}
  function option(valueText,label){return'<option value="'+esc(valueText)+'">'+esc(label)+'</option>';}
  function dobOptions(){
    var days=option('',copy.day),months=option('',copy.month),years=option('',copy.year),now=new Date().getFullYear();
    for(var i=1;i<=31;i+=1)days+=option(i,i);
    for(var m=1;m<=12;m+=1)months+=option(m,m);
    for(var y=now;y>=now-100;y-=1)years+=option(y,y);
    return{days:days,months:months,years:years};
  }
  var dateOptions=dobOptions(),officialAirlines=[],officialPhoneCodes=[],officialCountries=[],officialNationalities=[],packagePaymentContext=null;
  function officialOptions(list,selectedValue){return list.map(function(item){var valueText=String(item&&item.value||''),label=String(item&&item.label||'');return label?'<option value="'+esc(valueText)+'"'+(valueText===selectedValue?' selected':'')+'>'+esc(label)+'</option>':'';}).join('');}
  function airlineOptions(){var list=officialAirlines.length?officialAirlines:[{value:'QR',label:'Privilege Club (Qatar Airways)'}];return officialOptions(list,'QR');}
  function populateOfficialContactOptions(){
    var phone=officialPhoneCodes.length?officialPhoneCodes:[{value:'974',label:'+974'}],countries=officialCountries.length?officialCountries:[{value:'QA',label:'Qatar'}],nationalities=officialNationalities.length?officialNationalities:[{value:'',label:copy.select}];
    ['qa-bi-contact-code','qa-bi-contact-alt-code'].forEach(function(id){var select=document.getElementById(id);if(select)select.innerHTML=officialOptions(phone,'974');});
    var country=document.getElementById('qa-bi-contact-country'),nationality=document.getElementById('qa-bi-contact-nationality');
    if(country)country.innerHTML=officialOptions(countries,'QA');
    if(nationality)nationality.innerHTML=officialOptions(nationalities,'QA');
  }
  function guestCard(type,index){
    var label=copy[type],id=type+'-'+index+'-'+Math.random().toString(36).slice(2,7);
    return'<article class="qa-bi-guest-card" data-guest-type="'+type+'"><h3>'+esc(label)+' '+index+'</h3><div class="qa-bi-field-grid">'+
      '<label><span>'+esc(copy.title)+'</span><select data-required="1" aria-label="'+esc(copy.title)+'">'+option('',copy.select)+option('mr',copy.mr)+option('mrs',copy.mrs)+option('miss',copy.miss)+'</select></label>'+
      '<label><span>'+esc(copy.firstName)+'</span><input type="text" autocomplete="off" spellcheck="false" dir="ltr" maxlength="60" pattern="[A-Za-z][A-Za-z -]*" data-name-latin="1" data-required="1" id="'+id+'-first"></label>'+
      '<label><span>'+esc(copy.lastName)+'</span><input type="text" autocomplete="off" spellcheck="false" dir="ltr" maxlength="60" pattern="[A-Za-z][A-Za-z -]*" data-name-latin="1" data-required="1" id="'+id+'-last"></label>'+
      '<label class="qa-bi-dob"><span>'+esc(copy.dob)+'</span><select data-required="1" aria-label="'+esc(copy.day)+'">'+dateOptions.days+'</select><select data-required="1" aria-label="'+esc(copy.month)+'">'+dateOptions.months+'</select><select data-required="1" aria-label="'+esc(copy.year)+'">'+dateOptions.years+'</select></label>'+
      '<label class="qa-bi-ffp-airline"><span>'+esc(copy.airline)+'</span><select data-official-options="airlines">'+airlineOptions()+'</select></label>'+
      '<label class="qa-bi-ffp-number"><span>'+esc(copy.ffp)+'</span><input type="text" autocomplete="off"></label>'+
      '</div></article>';
  }
  function renderGuests(roomNodes,hotelName){
    var rooms=roomData(),host=document.getElementById('qa-bi-guest-forms');
    host.innerHTML=rooms.map(function(room,roomIndex){
      var counts={adult:0,child:0,infant:0},cards=room.ages.map(function(age){var type=typeForAge(age);counts[type]+=1;return guestCard(type,counts[type]);}).join('');
      var roomText=roomNodes[roomIndex]?clean(roomNodes[roomIndex]):'',roomDetail=roomText.replace(/^\S+\s+\d+\s*/,'').replace(/^[\s·:–—-]+/,'').trim();
      return'<section class="qa-bi-guest-room" data-room="'+room.index+'"><div class="qa-bi-room-heading"><h2>'+esc(hotelName||copy.hotels)+'</h2><p><strong>'+esc(copy.room)+' '+room.index+'</strong>'+ (roomDetail?' · '+esc(roomDetail):'')+'</p></div>'+cards+'</section>';
    }).join('');
  }
  function connectFlightTimelines(root){
    var groups=Array.from(root.querySelectorAll('.bf_basket_flight_legs'));
    function update(){
      groups.forEach(function(group){
        var termini=Array.from(group.querySelectorAll('.bf_legterminus')).filter(function(node){return !node.closest('.bf_hidden');});
        if(termini.length<2)return;
        var groupBox=group.getBoundingClientRect(),startBox=termini[0].getBoundingClientRect(),endBox=termini[termini.length-1].getBoundingClientRect();
        group.classList.add('qa-bi-flight-timeline-group');
        group.style.setProperty('--qa-bi-timeline-top',(startBox.top-groupBox.top+startBox.height/2)+'px');
        group.style.setProperty('--qa-bi-timeline-bottom',(groupBox.bottom-endBox.top-endBox.height/2)+'px');
      });
    }
    requestAnimationFrame(update);
    root.querySelectorAll('img').forEach(function(image){if(!image.complete)image.addEventListener('load',update,{once:true});});
    window.addEventListener('load',update,{once:true});
    setTimeout(update,500);
    if('ResizeObserver' in window){var observer=new ResizeObserver(update);groups.forEach(function(group){observer.observe(group);});}
  }
  function localiseSourceEnglish(root){
    if(lang!=='en'||!root)return;
    var phrases=[
      ['باقة التوقف المؤقت القياسية','Standard stopover package'],['السعر الكلي','Total price'],['المتابعة للحجز','Continue booking'],['تصنيف النجوم','Star rating'],['شارك','Share'],['التكلفة الإجمالية للعطلة','Total holiday cost'],['بما في ذلك جميع الرحلات الجوية والفنادق','including all flights and hotel'],['بما في ذلك ضرائب ورسوم المطار','including airport taxes and fees'],
      ['رحلة ربط واحدة','1 stop'],['رحلتا ربط','2 stops'],['رحلات ربط','stops'],['رحلة جوية','Flight'],['فئة اقتصادية','Economy'],['درجة رجال الأعمال','Business class'],['الدرجة الأولى','First class'],
      ['الوقت الكلي للرحلة، مع','Total journey time, with'],['الوقت الكلي للرحلة','Total journey time'],['محطة الطيران','Terminal'],['احجز الآن ووفر الكثير','Book now and save more'],['أمتعة مسجلة','checked baggage'],['غير قابل للاسترداد','Non-refundable'],['سعر الباقة','Package rate'],['غرفة فقط','Room only'],['إفطار مجاني','Free breakfast'],['بوفيه إفطار','Breakfast buffet'],['إفطار لشخصين','Breakfast for two'],['واي فاي مجانًا','Free Wi-Fi'],
      ['هيلتون','Hilton'],['إسطنبول','Istanbul'],['اسطنبول','Istanbul'],['بومونتي','Bomonti'],['هوتل','Hotel'],['كونفرنس','Conference'],['سنتر','Center'],['آند','and'],['اند','and'],['مجموعتان من الأسرة المفردة المتماثلة','Two sets of matching single beds'],['غرفة بسريرين منفصلين بتجهيزات أساسية','Basic twin room'],['سريران منفصلان بتجهيزات أساسية','Two separate beds with basic facilities'],['تجهيزات أساسية','Basic facilities'],['منظر للمدينة','City view'],['بمنظر للبحر','Sea view'],['منظر للبحر','Sea view'],['سريران فرديان منفصلان','Two separate single beds'],['سرير ملكي واحد','One king bed'],['سرير كوين سايز','Queen-size bed'],['سرير أريكة واحد','One sofa bed'],['أسرة','beds'],
      ['غرفة ديلوكس','Deluxe room'],['جناح لرجال الأعمال','Executive suite'],['جناح مريح','Comfort suite'],['جناح','Suite'],['غرفة مزدوجة','Double room'],['غرفة قياسية','Standard room'],
      ['المجموع الجزئي','Subtotal'],['رسوم الدفع','Payment Fee'],['الإجمالي','Total Booking Value'],['الضرائب','Taxes'],['في المجموع','in total'],['الجمعة','Friday'],['الخميس','Thursday'],['الأربعاء','Wednesday'],['الثلاثاء','Tuesday'],['الاثنين','Monday'],['الأحد','Sunday'],['السبت','Saturday'],
      ['يناير','January'],['فبراير','February'],['مارس','March'],['أبريل','April'],['مايو','May'],['يونيو','June'],['يوليو','July'],['أغسطس','August'],['سبتمبر','September'],['أكتوبر','October'],['نوفمبر','November'],['ديسمبر','December'],
      ['مطار حمد الدولي - الدوحة','Doha - Hamad International Airport'],['مطار حمد الدولي','Hamad International Airport'],['حمد الدولي - الدوحة','Doha - Hamad International Airport'],['الدوحة','Doha'],['أتاتورك','Atatürk'],['اتاتورك','Atatürk'],['مطار دولي','International Airport'],['المطار الدولي','International Airport'],['مطار','Airport'],
      ['ساعات','hours'],['ساعة','hour'],['دقائق','minutes'],['دقيقة','minute']
    ];
    var arabicMap={'ا':'a','أ':'a','إ':'i','آ':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','ة':'a','و':'w','ؤ':'w','ي':'y','ى':'a','ئ':'y','ء':'','َ':'','ً':'','ُ':'','ٌ':'','ِ':'','ٍ':'','ْ':'','ّ':''};
    function noArabic(text){return String(text||'').replace(/[\u0600-\u06ff]/g,function(char){return arabicMap[char]!==undefined?arabicMap[char]:' ';}).replace(/\s+/g,' ').trim();}
    var airportMap=window.QA_AIRPORT_LOCALISATION_BY_CODE||{},airportPhrases=[];
    values('products[flight][iataFrom][]').concat(values('products[flight][iataTo][]')).forEach(function(code){
      var entry=airportMap[String(code||'').toUpperCase()];
      if(!entry)return;
      if(entry[0]&&entry[2])airportPhrases.push([entry[0],entry[2]]);
      if(entry[1]&&entry[3])airportPhrases.push([entry[1],entry[3]]);
      var arCity=String(entry[0]||'').split(',')[0].trim(),enCity=String(entry[2]||'').split(',')[0].trim();
      if(arCity&&enCity)airportPhrases.push([arCity,enCity]);
    });
    airportPhrases.sort(function(a,b){return b[0].length-a[0].length;});
    var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[],node;
    while((node=walker.nextNode()))nodes.push(node);
    nodes.forEach(function(textNode){
      var text=textNode.nodeValue||'';
      text=text.replace(/غرفة واحدة\s*(\d+)/g,'Room $1');
      airportPhrases.forEach(function(pair){text=text.split(pair[0]).join(pair[1]);});
      phrases.forEach(function(pair){text=text.split(pair[0]).join(pair[1]);});
      text=text.replace(/،/g,',').replace(/(^|\s)ص(?=\s|$)/g,'$1AM').replace(/(^|\s)م(?=\s|$)/g,'$1PM');
      if(/[\u0600-\u06ff]/.test(text))text=noArabic(text);
      text=text.replace(/\b1\s+1 stop\b/gi,'1 stop').replace(/\b2\s+2 stops\b/gi,'2 stops').replace(/\b([2-9]|[1-9]\d+) minute\b/gi,'$1 minutes').replace(/\b([2-9]|[1-9]\d+) hour\b/gi,'$1 hours').replace(/(minute|minutes|hour|hours)(?=\d)/gi,'$1 · ').replace(/(\d)(?=(?:stop|stops|minute|minutes|hour|hours)\b)/gi,'$1 ').replace(/\s+/g,' ');
      textNode.nodeValue=text;
    });
    root.setAttribute('dir','ltr');
  }
  function validOptions(list){return Array.isArray(list)?list.filter(function(item){return item&&typeof item.value==='string'&&typeof item.label==='string'&&item.label.trim();}).slice(0,300):[];}
  function prepareSummary(html,data){
    officialAirlines=validOptions(data&&data.airlines);officialPhoneCodes=validOptions(data&&data.phoneCodes);officialCountries=validOptions(data&&data.countries);officialNationalities=validOptions(data&&data.nationalities);populateOfficialContactOptions();
    var temp=document.createElement('div');temp.innerHTML=html;
    localiseSourceEnglish(temp);
    temp.querySelectorAll('script,form,input,select,textarea,button').forEach(function(node){node.remove();});
    temp.querySelectorAll('a').forEach(function(link){link.removeAttribute('href');link.removeAttribute('target');});
    var flight=temp.querySelector('.bf_basket_flight'),hotel=temp.querySelector('.bf_basket_hotel'),total=temp.querySelector('.bf_basket_total')||temp.querySelector('.bf_basket_totalrow_last'),tour=product==='stopover'?(Array.from(temp.querySelectorAll('.bf_basket_item_product')).find(function(item){return !item.querySelector('.bf_basket_hotel')&&!item.querySelector('.bf_basket_flight')&&item.querySelector('.bf_basket_heading');})||null):null;
    if(!hotel||(product!=='hotel'&&!flight))throw new Error('missing_booking_products');
    var hotelName=clean(hotel.querySelector('h3.bf_basket_heading'))||clean(hotel.querySelector('.bf_basket_heading'))||copy.hotels;
    var roomNodes=Array.from(hotel.querySelectorAll('.bf_eachroomdetails'));
    var flightClone=flight&&flight.cloneNode(true),hotelClone=hotel.cloneNode(true),tourClone=tour&&tour.cloneNode(true),totalSource=total&&(total.classList.contains('bf_basket_totalrow')?total:(total.closest('.bf_basket_item')||total.parentElement)),totalClone=totalSource&&totalSource.cloneNode(true);
    var officialTotalNode=total&&(total.querySelector('.nbf_total .ibecurr')||total.querySelector('.nbf_total')||total.querySelector('.ibecurr')),officialTotal=clean(officialTotalNode).replace(/\s+/g,' ').trim(),mobileAmount=document.getElementById('qa-bi-mobile-booking-amount');if(mobileAmount)mobileAmount.textContent=officialTotal;
    var origins=values('products[flight][iataFrom][]'),destinations=values('products[flight][iataTo][]'),dates=values('products[flight][outboundDate][]'),legs=[];
    origins.forEach(function(origin,index){var destination=destinations[index]||'';if(/^[A-Z]{3}$/.test(origin)&&/^[A-Z]{3}$/.test(destination))legs.push(origin+' → '+destination);});
    if(product==='stopover'&&!legs.length){var stopoverFrom=value('iataFrom'),stopoverTo=value('iataTo'),stopoverOut=value('outboundDate'),stopoverReturn=value('returnDate');if(/^[A-Z]{3}$/.test(stopoverFrom)&&/^[A-Z]{3}$/.test(stopoverTo)){legs.push(stopoverFrom+' → '+stopoverTo);if(value('oneway')!=='1'&&/^\d{2}\/\d{2}\/\d{4}$/.test(stopoverReturn))legs.push(stopoverTo+' → '+stopoverFrom);}dates=[stopoverOut,stopoverReturn];}
    if(/^[A-Z]{3}\s*[0-9][0-9,.]*$/.test(officialTotal)&&product==='hotel'){var hotelDates=[value('arrDate'),value('depDate')].filter(function(date){return /^\d{2}\/\d{2}\/\d{4}$/.test(date);});packagePaymentContext={source:'hotel',createdAt:Date.now(),lang:lang,type:lang==='ar'?'فندق':'Hotel',route:hotelName,dates:hotelDates.join(' · '),total:officialTotal};}else{packagePaymentContext=/^[A-Z]{3}\s*[0-9][0-9,.]*$/.test(officialTotal)&&legs.length?{source:product==='stopover'?'stopover-package':'flight-hotel-package',createdAt:Date.now(),lang:lang,type:product==='stopover'?(lang==='ar'?'توقف مؤقت في قطر':'Qatar Stopover'):(lang==='ar'?'رحلة + فندق':'Flight + Hotel'),route:legs.join(' · '),dates:dates.filter(function(date){return /^\d{2}\/\d{2}\/\d{4}$/.test(date);}).join(' · '),total:officialTotal}:null;}
    if(flightClone)flightClone.querySelectorAll('.bf_basket_producttotalline').forEach(function(node){node.remove();});
    [flightClone,hotelClone,tourClone,totalClone].filter(Boolean).forEach(function(clone){clone.querySelectorAll('img').forEach(function(image){var src=image.getAttribute('src')||image.getAttribute('data-src')||image.getAttribute('data-lazy');if(src)image.setAttribute('src',src);});});
    var flightDetails=document.getElementById('qa-bi-flight-details'),flightCard=flightDetails.closest('.qa-bi-trip-card');flightDetails.replaceChildren();if(flightClone){flightDetails.appendChild(flightClone);if(flightCard)flightCard.hidden=false;connectFlightTimelines(flightDetails);}else if(flightCard)flightCard.hidden=true;
    var hotelDetails=document.getElementById('qa-bi-hotel-details');hotelDetails.replaceChildren(hotelClone);if(tourClone){hotelDetails.appendChild(tourClone);repairStopoverSummaryImage(tourClone,data&&data.token||'');}
    document.getElementById('qa-bi-price-details').innerHTML=totalClone?totalClone.outerHTML:'<strong>'+esc(clean(hotel.querySelector('.bf_basket_producttotalline'))||'')+'</strong>';
    renderGuests(roomNodes,hotelName);
  }
  function validate(container){
    var first=null,nameError=false;
    container.querySelectorAll('[data-required="1"]').forEach(function(field){var text=String(field.value||'').trim(),bad=field.type==='checkbox'?!field.checked:!text;if(field.getAttribute('data-name-latin')==='1'&&text&&!/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/.test(text)){bad=true;nameError=true;}field.classList.toggle('qa-bi-required-error',bad);if(bad&&!first)first=field;});
    if(first){first.focus();first.scrollIntoView({behavior:'smooth',block:'center'});return{nameError:nameError};}return null;
  }
  function load(){
    var token=next&&next.product===product&&next.token||'';
    if(!/^[0-9a-f]{32}$/i.test(token)){document.getElementById('qa-bi-error').hidden=false;return;}
    var loader=document.createElement('div');loader.className='qa-bi-loading';loader.innerHTML='<span class="qa-bi-spinner" aria-hidden="true"></span>';document.querySelector('.qa-bi-shell').prepend(loader);
    post('/api/packages/summary',{token:token}).then(function(data){if(data.status!=='ready'||data.stage!=='summary'||!data.html)throw new Error('missing_summary');prepareSummary(data.html,data);setMobileBookingExpanded(false);loader.remove();document.getElementById('qa-bi-content').hidden=false;window.scrollTo(0,0);}).catch(function(){loader.remove();document.getElementById('qa-bi-error').hidden=false;});
  }

  document.addEventListener('input',function(event){var field=event.target;if(!field||field.getAttribute('data-name-latin')!=='1')return;var cleaned=String(field.value||'').replace(/[^A-Za-z -]/g,'').replace(/\s+/g,' ').replace(/^[ -]+/,'');if(field.value!==cleaned){field.value=cleaned;notice(copy.nameLatin);}field.setCustomValidity('');});
  document.querySelectorAll('.qa-bi-nav a,.qa-bi-logo,.qa-bi-footer a').forEach(function(link){link.addEventListener('click',function(event){event.preventDefault();location.href=location.origin+(lang==='ar'?'/ar-qa/homepage.html':'/en-qa/homepage.html');});});
  document.getElementById('qa-bi-language').addEventListener('click',function(){query.set('lang',lang==='ar'?'en':'ar');location.href=location.origin+'/package-information?'+query.toString();});
  document.getElementById('qa-bi-error-back').addEventListener('click',function(){history.back();});
  document.getElementById('qa-bi-mobile-booking-toggle').addEventListener('click',function(){setMobileBookingExpanded(this.getAttribute('aria-expanded')!=='true');});
  window.addEventListener('resize',function(){var toggle=document.getElementById('qa-bi-mobile-booking-toggle');setMobileBookingExpanded(!!toggle&&toggle.getAttribute('aria-expanded')==='true');});
  document.getElementById('qa-bi-email-quote').addEventListener('click',function(){notice(copy.localOnly);});
  document.getElementById('qa-bi-price-toggle').addEventListener('click',function(){var on=this.getAttribute('aria-checked')!=='true';this.setAttribute('aria-checked',String(on));notice(copy.noAvios);});
  document.getElementById('qa-bi-voucher-code').setAttribute('aria-label',copy.voucherCode);
  document.getElementById('qa-bi-voucher-add').addEventListener('click',function(){notice(copy.localOnly);});
  document.querySelectorAll('[data-local-notice]').forEach(function(button){button.addEventListener('click',function(){notice(copy.localOnly);});});
  document.querySelectorAll('[data-edit-step]').forEach(function(button){button.addEventListener('click',function(){editStep(button.getAttribute('data-edit-step'));});});
  document.querySelectorAll('[data-payment-choice]').forEach(function(button){button.addEventListener('click',function(){document.querySelectorAll('[data-payment-choice]').forEach(function(choice){var selected=choice===button;choice.classList.toggle('is-selected',selected);choice.setAttribute('aria-pressed',String(selected));});});});
  document.getElementById('qa-bi-continue-contact').addEventListener('click',function(){var guestValidation=validate(document.getElementById('qa-bi-guest-forms'));if(guestValidation){notice(guestValidation.nameError?copy.nameLatin:copy.guestError);return;}var firstGuest=document.querySelector('.qa-bi-guest-card'),nameField=document.getElementById('qa-bi-contact-name');if(firstGuest&&nameField&&!nameField.value){var first=firstGuest.querySelector('input[id$="-first"]'),last=firstGuest.querySelector('input[id$="-last"]');nameField.value=[first&&first.value,last&&last.value].filter(Boolean).join(' ');}setStep('guest','complete',guestSummary(),false);setStep('contact','open','',true);setStep('payment','locked','',false);setStep('terms','locked','',false);});
  document.getElementById('qa-bi-continue-payment').addEventListener('click',function(){var section=document.getElementById('qa-bi-contact-section');if(validate(section)){notice(copy.contactError);return;}setStep('contact','complete',contactSummary(),false);setStep('payment','open','',true);setStep('terms','locked','',false);});
  document.getElementById('qa-bi-continue-terms').addEventListener('click',function(){var selected=document.querySelector('[data-payment-choice].is-selected'),label=selected?clean(selected.querySelector('b')):copy.cardPayment;setStep('payment','complete','<div class="qa-bi-payment-summary">'+esc(label)+'</div>',false);setStep('terms','open','',true);});
  document.getElementById('qa-bi-finish').addEventListener('click',function(){var terms=document.getElementById('qa-bi-terms-section');if(validate(terms)){notice(copy.termsError);return;}if(!packagePaymentContext){notice(copy.missingBody);return;}queuePackageGuestConsent();try{var pref=JSON.parse(localStorage.getItem('jzPref')||'{}')||{};pref.lang=lang;pref.siteLang=lang;localStorage.setItem('jzPref',JSON.stringify(pref));localStorage.setItem('jz_lang',lang);localStorage.setItem('lang',lang);localStorage.setItem('jzPrevLang',JSON.stringify(lang));var payCtx=Object.assign({},packagePaymentContext);var discRate=window.__qaDiscRate?window.__qaDiscRate():0;if(discRate>0&&window.__qaDiscText){payCtx.originalTotal=payCtx.total;payCtx.total=window.__qaDiscText(payCtx.total);payCtx.discountRate=discRate;}sessionStorage.setItem('qaPackagePaymentContext',JSON.stringify(payCtx));}catch(_){}location.href=location.origin+'/credit-card-payment?source=package';});
  document.addEventListener('input',function(event){if(event.target.matches('[data-required="1"]'))event.target.classList.remove('qa-bi-required-error');});
  document.addEventListener('change',function(event){if(event.target.matches('[data-required="1"]'))event.target.classList.remove('qa-bi-required-error');});
  load();
})();
