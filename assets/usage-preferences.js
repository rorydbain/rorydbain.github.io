(() => {
  const key = 'tiny-stats-choice-v3';
  const trackerUrl = 'https://photos.roryba.in/_stats/script.js';
  const privacyUrl = location.hostname === 'photos.roryba.in' ? '/privacy' : '/privacy/';
  const styles = document.createElement('style');
  styles.textContent='.tiny-stats-banner{position:fixed;z-index:10000;bottom:16px;left:16px;right:16px;box-sizing:border-box;max-width:820px;max-height:calc(100dvh - 32px);overflow:auto;margin:0 auto;padding:20px;background:#fff;color:#26362e;border:1px solid #cbd5cb;border-radius:12px;box-shadow:0 6px 32px #0003;font:14px/1.5 system-ui,sans-serif;text-align:left}.tiny-stats-banner p{margin:8px 0}.tiny-stats-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px}.tiny-stats-banner button{font:inherit;min-height:44px;padding:10px 16px;border:1px solid #527b60;border-radius:6px;background:#eef3ee;color:#26362e;cursor:pointer}.tiny-stats-banner button:disabled{opacity:.6;cursor:default}.tiny-stats-banner a{color:#26362e;text-decoration:underline}.tiny-stats-preferences{position:fixed;z-index:9999;bottom:calc(12px + env(safe-area-inset-bottom));left:12px;font:13px/1.4 system-ui,sans-serif;padding:9px 12px;border:1px solid #cbd5cb;border-radius:6px;background:#fff;color:#26362e;box-shadow:0 2px 8px #0002;cursor:pointer}.tiny-stats-banner[hidden],.tiny-stats-preferences[hidden]{display:none!important}.tiny-stats-banner button:focus-visible,.tiny-stats-banner a:focus-visible,.tiny-stats-preferences:focus-visible{outline:3px solid #527b60;outline-offset:3px}@media(max-width:540px){.tiny-stats-banner{bottom:calc(8px + env(safe-area-inset-bottom));left:8px;right:8px;padding:16px}.tiny-stats-actions button{flex:1 1 auto}}';
  document.body.append(styles);
  const panel = document.createElement('div');
  panel.className='tiny-stats-banner';
  panel.id='tiny-stats-preference-panel';
  panel.setAttribute('role','region');
  panel.setAttribute('aria-label','Optional usage counts');
  const title = document.createElement('strong');title.textContent='May I count your visit?';
  const text = document.createElement('p');
  text.textContent='Optional usage counts help me improve this site. Daily page counts and long-term monthly totals; no visitor profiles. Counting is off until you allow it.';
  const status = document.createElement('p');status.setAttribute('aria-live','polite');
  const allow = document.createElement('button');allow.textContent='Allow counts';
  const deny = document.createElement('button');deny.textContent='No thanks';
  const link = document.createElement('a');link.href=privacyUrl;link.textContent='Privacy';
  const actions = document.createElement('div');actions.className='tiny-stats-actions';actions.append(allow,deny,link);
  panel.append(title,text,actions,status);document.body.append(panel);
  const preferences = document.createElement('button');preferences.className='tiny-stats-preferences';preferences.textContent='Usage preferences';
  preferences.setAttribute('aria-controls',panel.id);document.body.append(preferences);
  function show(open) {
    panel.hidden=!open;preferences.hidden=open;preferences.setAttribute('aria-expanded',String(open));
  }
  preferences.addEventListener('click',()=>{show(true);allow.focus?.();});
  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      if(value?.version===3 && ['yes','no'].includes(value.choice) && Date.now()-value.at<180*86400000 && value.at<=Date.now()) return value.choice;
    } catch {}
    return null;
  }
  let loaded=false;
  function update() {
    const optedIn = read()==='yes';
    const blocked = navigator.doNotTrack==='1' || navigator.globalPrivacyControl;
    allow.disabled=Boolean(blocked);
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
    try {localStorage.setItem(key,JSON.stringify({version:3,choice,at:Date.now()}));}
    catch {status.textContent='Your browser cannot save the preference. Counting stays off.';return;}
    update();show(false);preferences.focus?.();
  }
  allow.addEventListener('click',()=>choose('yes'));
  deny.addEventListener('click',()=>choose('no'));
  addEventListener('storage',event=>{if(event.key===key){update();show(read()===null && navigator.doNotTrack!=='1' && !navigator.globalPrivacyControl);}});
  update();show(read()===null && navigator.doNotTrack!=='1' && !navigator.globalPrivacyControl);
})();
