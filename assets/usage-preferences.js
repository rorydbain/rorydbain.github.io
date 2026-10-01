(() => {
  const key = 'tiny-stats-choice-v2';
  const trackerUrl = 'https://photos.roryba.in/_stats/script.js';
  const privacyUrl = location.hostname === 'photos.roryba.in' ? '/privacy' : '/privacy/';
  const panel = document.createElement('div');
  panel.setAttribute('role','group');
  panel.setAttribute('aria-label','Optional usage counts');
  panel.style.cssText='max-width:1080px;margin:24px auto;padding:16px;font:14px/1.5 system-ui,sans-serif;border-top:1px solid #d6d8ce;color:inherit';
  const text = document.createElement('p');
  text.textContent='Optional usage counts help me improve this site. Only daily page totals; no visitor profiles. Counting is off until you allow it.';
  const status = document.createElement('p');status.setAttribute('aria-live','polite');
  const allow = document.createElement('button');allow.textContent='Allow counts';
  const deny = document.createElement('button');deny.textContent='No thanks';
  for(const button of [allow,deny]) button.style.cssText='font:inherit;padding:8px 12px;margin:0 8px 8px 0;border:1px solid #999;border-radius:5px;background:transparent;color:inherit;cursor:pointer';
  const link = document.createElement('a');link.href=privacyUrl;link.textContent='Privacy';
  panel.append(text,allow,deny,link,status);document.body.append(panel);
  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      if(value?.version===2 && ['yes','no'].includes(value.choice) && Date.now()-value.at<180*86400000 && value.at<=Date.now()) return value.choice;
    } catch {}
    return 'no';
  }
  let loaded=false;
  function update() {
    const optedIn = read()==='yes';
    const blocked = navigator.doNotTrack==='1' || navigator.globalPrivacyControl;
    allow.setAttribute('aria-pressed',String(optedIn));deny.setAttribute('aria-pressed',String(!optedIn));
    deny.textContent=optedIn?'Stop counting':'No thanks';
    status.textContent=blocked?'Counting is off: your browser privacy signal is respected.':optedIn?'Counting is on. You can stop it here at any time.':'Counting is off.';
    if(optedIn && !blocked && !loaded) {
      loaded=true;
      const script=document.createElement('script');script.src=trackerUrl;script.referrerPolicy='no-referrer';document.body.append(script);
    }
    dispatchEvent(new Event('tiny-stats-choice'));
  }
  function choose(choice) {
    try {localStorage.setItem(key,JSON.stringify({version:2,choice,at:Date.now()}));}
    catch {status.textContent='Your browser cannot save the preference. Counting stays off.';return;}
    update();
  }
  allow.addEventListener('click',()=>choose('yes'));
  deny.addEventListener('click',()=>choose('no'));
  addEventListener('storage',event=>{if(event.key===key)update();});
  update();
})();
