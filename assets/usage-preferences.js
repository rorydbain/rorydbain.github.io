(() => {
  const key = 'tiny-stats-choice-v3';
  const trackerUrl = 'https://photos.roryba.in/_stats/script.js';
  const privacyUrl = location.hostname === 'photos.roryba.in' ? '/privacy' : '/privacy/';
  const styles = document.createElement('style');
  styles.textContent='.tiny-stats-banner{position:fixed;z-index:10000;bottom:16px;left:16px;right:16px;box-sizing:border-box;max-width:720px;max-height:calc(100dvh - 32px);overflow:auto;margin:0 auto;padding:12px 16px;background:#fff;color:#26362e;border:1px solid #cbd5cb;border-radius:8px;box-shadow:0 6px 32px #0003;font:14px/1.5 system-ui,sans-serif;text-align:left;display:flex;align-items:center;justify-content:space-between;gap:16px}.tiny-stats-banner p{margin:0}.tiny-stats-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:0;flex-shrink:0}.tiny-stats-banner button{font:inherit;min-height:40px;padding:8px 12px;border:1px solid #527b60;border-radius:6px;background:#eef3ee;color:#26362e;cursor:pointer}.tiny-stats-banner button:disabled{opacity:.6;cursor:default}.tiny-stats-banner a{color:#26362e;text-decoration:underline}.tiny-stats-preferences{display:block;margin:16px auto;padding:0;border:0;background:transparent;color:inherit;font:13px/1.4 system-ui,sans-serif;text-decoration:underline;cursor:pointer}.tiny-stats-banner .tiny-stats-dismiss{min-width:32px;min-height:40px;padding:4px;border:0;background:transparent;font-size:22px;line-height:1}.tiny-stats-actions .tiny-stats-dismiss{flex:0 0 32px}.tiny-stats-banner[hidden],.tiny-stats-preferences[hidden]{display:none!important}.tiny-stats-banner button:focus-visible,.tiny-stats-banner a:focus-visible,.tiny-stats-preferences:focus-visible{outline:3px solid #527b60;outline-offset:3px}@media(max-width:540px){.tiny-stats-banner{bottom:calc(8px + env(safe-area-inset-bottom));left:8px;right:8px;padding:12px;flex-wrap:wrap;gap:10px}.tiny-stats-actions{width:100%}.tiny-stats-actions button{flex:1 1 auto}}';
  document.body.append(styles);
  const panel = document.createElement('div');
  panel.className='tiny-stats-banner';
  panel.id='tiny-stats-preference-panel';
  panel.setAttribute('role','region');
  panel.setAttribute('aria-label','Optional usage counts');
  const text = document.createElement('p');
  text.textContent='Allow anonymous page counts?';
  const allow = document.createElement('button');allow.textContent='Allow';
  const deny = document.createElement('button');deny.textContent='No thanks';
  const link = document.createElement('a');link.href=privacyUrl;link.textContent='Privacy';
  const dismiss=document.createElement('button');dismiss.className='tiny-stats-dismiss';dismiss.textContent='×';dismiss.setAttribute('aria-label','Dismiss without allowing counts');
  const actions = document.createElement('div');actions.className='tiny-stats-actions';actions.append(allow,deny,link,dismiss);
  panel.append(text,actions);document.body.append(panel);
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
    text.textContent=blocked?'Page counts blocked by your browser.':optedIn?'Page counts enabled.':'Allow anonymous page counts?';
    if(optedIn && !blocked && !loaded) {
      loaded=true;
      const script=document.createElement('script');script.src=trackerUrl;script.referrerPolicy='no-referrer';document.body.append(script);
    }
    dispatchEvent(new Event('tiny-stats-choice'));
  }
  function choose(choice) {
    try {localStorage.setItem(key,JSON.stringify({version:3,choice,at:Date.now()}));}
    catch {show(false);return;}
    update();show(false);
  }
  allow.addEventListener('click',()=>choose('yes'));
  deny.addEventListener('click',()=>choose('no'));
  dismiss.addEventListener('click',()=>choose('no'));
  panel.addEventListener('keydown',event=>{if(event.key==='Escape')choose('no');});
  addEventListener('storage',event=>{if(event.key===key){update();show(read()===null && navigator.doNotTrack!=='1' && !navigator.globalPrivacyControl);}});
  update();show(read()===null && navigator.doNotTrack!=='1' && !navigator.globalPrivacyControl);
})();
