const state = {
  done: JSON.parse(localStorage.getItem('kg_done') || '{}'),
  wrong: JSON.parse(localStorage.getItem('kg_wrong') || '{}'),
  gps: JSON.parse(sessionStorage.getItem('kg_gps') || '{}')
};

function save(){
  localStorage.setItem('kg_done', JSON.stringify(state.done));
  localStorage.setItem('kg_wrong', JSON.stringify(state.wrong));
  sessionStorage.setItem('kg_gps', JSON.stringify(state.gps));
}

function normalizeAnswer(s){
  return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/\s+/g,' ');
}
async function sha256(text){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function haversine(a,b,c,d){
  const R=6371000, toRad=x=>x*Math.PI/180;
  const dLat=toRad(c-a), dLon=toRad(d-b);
  const q=Math.sin(dLat/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}
function currentRoute(){
  const h=location.hash.replace(/^#/,'');
  if(!h || h==='home') return {page:'home'};
  if(h==='first-clue') return {page:'first-clue'};
  if(h==='finale') return {page:'finale'};
  if(h.startsWith('stage/')) return {page:'stage',id:h.split('/')[1]};
  return {page:'home'};
}
function navHome(){location.hash='home'}
function getStage(id){return GAME.stages.find(s=>s.id===id)}
function shell(content){
  return `<div class="app-shell"><div class="topbar"><button class="icon-btn" onclick="navHome()">←</button><div class="brand">${GAME.title}</div><button class="icon-btn" onclick="resetGame()">↻</button></div><main class="main">${content}<div class="footer-note">Krvavý grimoár • prototyp 0.2</div></main></div>`;
}
function resetGame(){
  if(confirm('Smazat postup této hry na tomto zařízení?')){localStorage.removeItem('kg_done');localStorage.removeItem('kg_wrong');sessionStorage.removeItem('kg_gps');location.reload()}
}
function clueCount(){
  return (state.done._intro?1:0)+GAME.stages.filter(s=>state.done[s.id]).length;
}
function renderHome(){
  const doneCount=clueCount();
  const intro=GAME.firstClue;
  const introCard=`<a class="card" href="#first-clue"><div class="sigil">${intro.icon}</div><h3>${intro.nav}</h3><p>Úvodní šifra</p><div class="state">${state.done._intro?'Indicie získána':'Nevyřešeno'}</div></a>`;
  const cards=GAME.stages.map(s=>`<a class="card" href="#stage/${s.id}"><div class="sigil">${s.icon}</div><h3>${s.sub}</h3><p>${s.locationHint||'Najděte správné místo.'}</p><div class="state">${state.done[s.id]?'Pečeť získána':'Nevyřešeno'}</div></a>`).join('');
  const clueMarkers=`<div class="seal first ${state.done._intro?'got':''}"><span>${state.done._intro?'✓':'1'}</span></div>`+GAME.stages.map(s=>`<div class="seal ${state.done[s.id]?'got':''}">${state.done[s.id]?(s.seal||'✓'):'?'}</div>`).join('');
  return shell(`<article class="paper"><header class="hero"><div class="kicker">Městská hra • Kutná Hora</div><h1>${GAME.title}</h1><p>Osm indicií. Sedm pečetí. Jedna kniha, kterou neměl nikdo najít.</p></header><section class="section"><p class="lead">${GAME.intro}</p><p>${GAME.startNote}</p><div class="progress"><span style="width:${doneCount/8*100}%"></span></div><div class="small">Získáno ${doneCount} / 8 indicií</div><div class="seals">${clueMarkers}</div></section><section class="section"><h2>Rozcestník</h2><div class="grid">${introCard}${cards}</div></section><section class="section"><a class="btn btn-primary" href="#finale">Finále</a></section></article>`);
}
function gpsGate(stage){
  if(!stage.gps) return `<div class="status info">Toto stanoviště je záměrně mimo mapu. Polohu zde aplikace neověřuje.</div>`;
  if(state.gps[stage.id]==='skip') return `<div class="status info">GPS byla přeskočena. Pokračujte k úkolu a ověřte si místo vlastníma očima.</div>`;
  if(state.gps[stage.id]) return `<div class="status ok">Poloha ověřena. Můžete pokračovat.</div>`;
  return `<div id="gpsStatus" class="status info">Nejdřív ověřte, že jste skutečně na místě.</div><button class="btn btn-secondary" onclick="checkGps('${stage.id}')">📍 Ověřit polohu</button><button class="skip-link" onclick="skipGps('${stage.id}')">GPS stávkuje? Jděte k úkolu.</button>`;
}
function skipGps(id){
  state.gps[id]='skip';save();render();
}
async function checkGps(id){
  const stage=getStage(id), el=document.getElementById('gpsStatus');
  if(!navigator.geolocation){el.className='status bad';el.textContent='Tento prohlížeč nepodporuje GPS. Můžete použít nenápadný odkaz pod tlačítkem.';return;}
  el.className='status info';el.textContent='Zjišťuji polohu…';
  navigator.geolocation.getCurrentPosition(pos=>{
    const d=haversine(pos.coords.latitude,pos.coords.longitude,stage.gps.lat,stage.gps.lon);
    if(d<=stage.gps.radius){state.gps[id]='verified';save();render();}
    else{el.className='status bad';el.textContent=`Jste přibližně ${Math.round(d)} m od stanoviště. Přibližte se a zkuste to znovu.`;}
  },()=>{el.className='status bad';el.textContent='Polohu se nepodařilo získat. Povolte GPS, zkuste to znovu — nebo použijte odkaz pod tlačítkem.';},{enableHighAccuracy:true,timeout:12000,maximumAge:5000});
}
function stageBody(stage){
  const unlocked=!stage.gps || state.gps[stage.id];
  const done=state.done[stage.id];
  const wrong=(state.wrong[stage.id]||0)>0;
  return `<article class="paper"><header class="hero"><div class="kicker">${stage.internal}</div><h1 class="stage-title">${stage.latin}</h1><p>${stage.sub}</p></header>
  <section class="section"><h2>Ověření místa</h2><div class="badge">${stage.location}</div><p>${stage.locationText}</p>${gpsGate(stage)}</section>
  ${unlocked?`<section class="section"><h2>Legenda</h2><p>${stage.legend}</p></section>
  <section class="section"><h2>Úkol</h2>${stage.taskHtml||`<p>${stage.task}</p>`}${stage.image?`<figure class="figure"><img src="${stage.image}" alt="Úkol"><figcaption class="caption">Důlní bludiště</figcaption></figure>`:''}${stage.assetNote?`<div class="status info">${stage.assetNote}</div>`:''}</section>
  <section class="section"><h2>Ověření odpovědi</h2>${done?successBlock(stage):answerBlock(stage,wrong)}</section>`:''}
  <section class="section"><a class="btn btn-ghost" href="#home">← Zpět na rozcestník</a></section></article>`;
}
function answerBlock(stage,wrong){
  if(!stage.answerHash) return `<div class="status info">Ověření této etapy zatím čeká na doplnění finálního kódu před hrou.</div>${wrong?`<div class="rulebox"><strong>Nápověda:</strong> ${stage.hint}</div>`:''}`;
  return `<label class="small">${stage.answerLabel}</label><input id="answer" class="input" autocomplete="off" autocapitalize="characters"><div id="answerStatus"></div><div class="cta-row"><button class="btn btn-primary" onclick="checkAnswer('${stage.id}')">Ověřit odpověď</button></div>${wrong?`<div class="rulebox"><strong>Nápověda po chybném pokusu:</strong><p>${stage.hint}</p></div>`:''}`;
}
async function checkAnswer(id){
  const stage=getStage(id), input=document.getElementById('answer'), out=document.getElementById('answerStatus');
  const h=await sha256(normalizeAnswer(input.value));
  if(h===stage.answerHash){state.done[id]=true;save();render();}
  else{state.wrong[id]=(state.wrong[id]||0)+1;save();out.className='status bad';out.textContent='Ne. Zkuste to znovu. Nápověda se právě zpřístupnila.';setTimeout(render,650)}
}
function successBlock(stage){
  return `<div class="status ok">Pečeť získána.</div><p><strong>${stage.success}</strong></p><p>${stage.literature}</p><div class="rulebox" style="text-align:center"><div class="kicker">Pečeť</div><div style="font-size:38px;font-weight:bold;color:#6e1e17">${stage.seal||'✓'}</div></div>`;
}
function renderStage(id){const s=getStage(id);return s?shell(stageBody(s)):renderHome()}
function renderFirstClue(){
  const c=GAME.firstClue;
  return shell(`<article class="paper"><header class="hero"><div class="kicker">První stopa</div><h1 class="stage-title">${c.title}</h1><p>${c.sub}</p></header><section class="section"><h2>Úvodní šifra</h2><p>${c.text}</p><div class="clue-big">${c.cipher}</div><div class="quote">${c.hint}</div></section><section class="section"><p>${c.note}</p>${state.done._intro?`<div class="status ok">První indicii máte uloženou.</div>`:`<button class="btn btn-primary" onclick="markFirstClue()">Máme první indicii</button>`}</section><section class="section"><a class="btn btn-ghost" href="#home">← Zpět na rozcestník</a></section></article>`);
}
function markFirstClue(){state.done._intro=true;save();render();}
function renderFinale(){
  const doneCount=clueCount();
  const unlocked=doneCount===8;
  return shell(`<article class="paper"><header class="hero"><div class="kicker">Finále</div><h1 class="stage-title">ULTIMA SIGILLA</h1><p>Poslední pečeť. Poslední cesta.</p></header><section class="section">${unlocked?`<div class="status ok">První indicie i všech sedm pečetí jsou vaše.</div><p>Seřaďte získané znaky podle čísel. Jestli jste nic neztratili, dostanete místo, kde cesta končí.</p><div class="quote">IN FOVEA VERITAS — V díře je pravda.</div><p>Tož pojďme, darebáci. Dobrodružství skončilo.</p><p><strong>Ale abych nezapomněl — rundu platí ten, kdo přišel poslední.</strong></p><p><strong>A přineste mu struhadlo.</strong></p>`:`<div class="status bad">Finále je zamčené. Máte ${doneCount} / 8 indicií.</div><a class="btn btn-secondary" href="#home">Zpět k indiciím</a>`}</section></article>`);
}
function render(){
  const r=currentRoute();
  document.getElementById('app').innerHTML=r.page==='home'?renderHome():r.page==='first-clue'?renderFirstClue():r.page==='stage'?renderStage(r.id):renderFinale();
  window.scrollTo({top:0,behavior:'instant'});
}
window.addEventListener('hashchange',render);
render();
