/* ============================================================
   Funciones compartidas: tablets, conteo de mesa y central
   ============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const VC = window.VOTO_CONFIG || {};
const API = (VC.API_URL || '').trim();
let CFG = { titulo:'Elecciones Escolares', colegio:'', c1:{nombre:'Candidato 1',lema:''}, c2:{nombre:'Candidato 2',lema:''}, numMesas:5, abierta:true };

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials = n => (n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?';
const norm = s => String(s||'').trim().toUpperCase().replace(/\s+/g,'');
const validCode = c => /^[A-Z0-9_\-]{1,30}$/.test(c);
const pct = (a,b) => b ? (a*100/b).toFixed(1)+'%' : '0.0%';
const now = () => new Date().toLocaleString('es-PE');
const pad2 = n => String(n).padStart(2,'0');
const isoLocal = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
const horaCorta = h => String(h||'').slice(11,16) || '—';
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const lsSet = (k,v) => { try { v===null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };
function toast(t){ const el=$('#toast'); el.textContent=t; el.classList.add('on'); clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.remove('on'),3400); }
function modal(id,on){ $(id).classList.toggle('on',on); }
document.addEventListener('click', e => { const b = e.target.closest('[data-close]'); if (b) b.closest('.modal').classList.remove('on'); });
setInterval(()=>{ const c=$('#clock'); if (c) c.textContent = new Date().toLocaleTimeString('es-PE'); },1000);
function hideLoader(){ const l=$('#loader'); if(!l) return; l.style.opacity=0; setTimeout(()=>l.remove(),400); }
async function copy(t){ try { await navigator.clipboard.writeText(t); toast('Acta copiada al portapapeles'); } catch { toast('No se pudo copiar automáticamente.'); } }

/* ---------- ilustraciones originales (SVG) ---------- */
const ART = {
  emblema: `<svg class="emblema" viewBox="0 0 64 64" aria-label="Emblema electoral"><circle cx="32" cy="32" r="31" fill="#fff"/><circle cx="32" cy="32" r="27" fill="#e0f2fe"/><path d="M32 9l19 7v14c0 12-8 20-19 25C21 50 13 42 13 30V16z" fill="#0284c7"/><rect x="20" y="31" width="24" height="14" rx="3" fill="#fff"/><rect x="25" y="29" width="14" height="3" rx="1.5" fill="#0369a1"/><path d="M26 18h12v13H26z" fill="#fff"/><path d="M28.5 24.5l2.5 2.5 4.5-5" stroke="#0ea5e9" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  urna: `<svg viewBox="0 0 420 320" class="hero-art" aria-hidden="true">
    <defs><linearGradient id="gU" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d7f0ff"/></linearGradient>
    <linearGradient id="gF" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#0284c7"/></linearGradient></defs>
    <ellipse cx="210" cy="292" rx="150" ry="16" fill="#0284c7" opacity=".12"/>
    <circle cx="70" cy="70" r="34" fill="#7dd3fc" opacity=".35"/><circle cx="360" cy="110" r="22" fill="#38bdf8" opacity=".3"/>
    <path d="M335 40l5 12 12 5-12 5-5 12-5-12-12-5 12-5z" fill="#0ea5e9"/><path d="M60 170l3.5 8 8 3.5-8 3.5-3.5 8-3.5-8-8-3.5 8-3.5z" fill="#38bdf8"/>
    <g transform="rotate(-8 230 90)"><rect x="180" y="20" width="96" height="120" rx="10" fill="#fff" stroke="#bae6fd" stroke-width="3"/>
      <rect x="196" y="40" width="64" height="8" rx="4" fill="#e0f2fe"/><rect x="196" y="58" width="44" height="8" rx="4" fill="#e0f2fe"/>
      <rect x="196" y="82" width="26" height="26" rx="6" fill="#fff" stroke="#0284c7" stroke-width="3"/><path d="M200 86l18 18M218 86l-18 18" stroke="#0284c7" stroke-width="4" stroke-linecap="round"/>
      <rect x="232" y="86" width="28" height="7" rx="3.5" fill="#bae6fd"/><rect x="232" y="99" width="20" height="7" rx="3.5" fill="#bae6fd"/></g>
    <rect x="95" y="140" width="230" height="150" rx="18" fill="url(#gU)" stroke="#7dd3fc" stroke-width="3"/>
    <rect x="80" y="120" width="260" height="34" rx="12" fill="url(#gF)"/><rect x="160" y="131" width="100" height="10" rx="5" fill="#0b2a44" opacity=".55"/>
    <circle cx="210" cy="216" r="38" fill="#0ea5e9"/><path d="M192 216l13 13 25-27" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="210" y="278" text-anchor="middle" font-family="Orbitron,sans-serif" font-size="15" font-weight="700" fill="#0369a1" letter-spacing="3">TU VOTO CUENTA</text></svg>`,
  celebra: `<svg class="celebra" viewBox="0 0 260 220" aria-hidden="true">
    <g opacity=".9"><rect x="30" y="40" width="10" height="18" rx="3" fill="#38bdf8" transform="rotate(-25 35 49)"/><rect x="210" y="34" width="10" height="18" rx="3" fill="#e8590c" transform="rotate(30 215 43)"/>
    <rect x="44" y="150" width="9" height="16" rx="3" fill="#0f9f7f" transform="rotate(40 48 158)"/><rect x="214" y="150" width="9" height="16" rx="3" fill="#0284c7" transform="rotate(-35 218 158)"/>
    <circle cx="70" cy="22" r="6" fill="#fbbf24"/><circle cx="196" cy="190" r="6" fill="#38bdf8"/><circle cx="30" cy="110" r="5" fill="#e8590c"/><circle cx="236" cy="104" r="5" fill="#0f9f7f"/>
    <path d="M182 16l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="#0ea5e9"/><path d="M80 186l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fbbf24"/></g>
    <circle cx="130" cy="108" r="70" fill="#dcfce7"/><circle cx="130" cy="108" r="54" fill="#16a34a"/>
    <path d="M104 108l18 18 34-36" stroke="#fff" stroke-width="13" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  trofeo: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 8h28v14a14 14 0 0 1-28 0z" fill="#fde68a"/><path d="M18 12H8v4a10 10 0 0 0 10 10M46 12h10v4a10 10 0 0 1-10 10" stroke="#fde68a" stroke-width="4" fill="none"/><rect x="28" y="36" width="8" height="10" fill="#fcd34d"/><rect x="20" y="46" width="24" height="8" rx="3" fill="#fff"/><path d="M32 13l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z" fill="#f59e0b"/></svg>`,
  central: `<svg viewBox="0 0 80 80" aria-hidden="true"><rect x="6" y="10" width="68" height="46" rx="6" fill="#fff"/><rect x="14" y="36" width="8" height="12" rx="2" fill="#38bdf8"/><rect x="26" y="26" width="8" height="22" rx="2" fill="#0284c7"/><rect x="38" y="30" width="8" height="18" rx="2" fill="#7dd3fc"/><rect x="50" y="20" width="8" height="28" rx="2" fill="#0369a1"/><rect x="34" y="56" width="12" height="10" fill="#e0f2fe"/><rect x="24" y="66" width="32" height="5" rx="2.5" fill="#fff"/></svg>`,
  tablet: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="12" y="4" width="40" height="56" rx="7" fill="#0284c7"/><rect x="16" y="9" width="32" height="44" rx="3" fill="#e0f2fe"/><rect x="20" y="16" width="11" height="11" rx="2" fill="#fff" stroke="#0284c7" stroke-width="2"/><path d="M22 18l7 7M29 18l-7 7" stroke="#0284c7" stroke-width="2.4" stroke-linecap="round"/><rect x="34" y="18" width="10" height="3" rx="1.5" fill="#7dd3fc"/><rect x="20" y="33" width="11" height="11" rx="2" fill="#fff" stroke="#7dd3fc" stroke-width="2"/><rect x="34" y="35" width="10" height="3" rx="1.5" fill="#7dd3fc"/></svg>`,
  monitor: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="4" y="8" width="56" height="38" rx="5" fill="#0284c7"/><rect x="8" y="12" width="48" height="30" rx="2" fill="#e0f2fe"/><circle cx="22" cy="27" r="9" fill="#38bdf8"/><path d="M22 18a9 9 0 0 1 9 9h-9z" fill="#0369a1"/><rect x="36" y="28" width="5" height="10" fill="#0ea5e9"/><rect x="44" y="22" width="5" height="16" fill="#0369a1"/><rect x="26" y="46" width="12" height="8" fill="#7dd3fc"/><rect x="18" y="54" width="28" height="4" rx="2" fill="#0284c7"/></svg>`
};

/* cabecera con insignia del colegio (si existe el archivo) o emblema */
function renderBrand(){
  const b = $('#brandArt'); if (!b) return;
  const src = (VC.INSIGNIA || '').trim();
  if (src){
    const img = new Image(); img.className = 'insignia'; img.alt = 'Insignia del colegio';
    img.onerror = () => { b.innerHTML = ART.emblema; $$('.ins-big').forEach(e => e.remove()); };
    img.onload = () => $$('.ins-big').forEach(e => { e.innerHTML = `<img src="${src}" alt="Insignia del colegio">`; });
    img.src = src; b.innerHTML = ''; b.appendChild(img);
  } else { b.innerHTML = ART.emblema; $$('.ins-big').forEach(e => e.remove()); }
}

/* ---------- conexión con el servidor (Google Apps Script) ---------- */
async function api(action, payload={}){
  if (!API) return demoApi(action, payload);
  let res;
  try { res = await fetch(API, { method:'POST', body: JSON.stringify({ action, ...payload }) }); }
  catch { throw new Error('Sin conexión con el servidor. Revisa el internet.'); }
  let out; try { out = await res.json(); } catch { throw new Error('Respuesta inválida del servidor. Revisa la URL de Apps Script.'); }
  if (!out.ok) throw new Error(out.error || 'Error del servidor');
  return out;
}
async function loadConfig(){
  renderBrand();
  if (!API) $('#modeChip').innerHTML = '<span class="dot warn"></span><span>Modo demo</span>';
  try {
    const c = await api('config'); CFG = { ...CFG, ...c };
    if (API) $('#modeChip').innerHTML = '<span class="dot"></span><span>Conectado</span>';
  } catch(e){ $('#modeChip').innerHTML = '<span class="dot off"></span><span>Sin conexión</span>'; toast(e.message); }
  $('#hTitle').textContent = CFG.titulo; $('#hSchool').textContent = CFG.colegio;
}

/* ---------- MODO DEMO: imita al servidor en este navegador ---------- */
const DEMO = { KEY:'voto-demo-db-v3', SECRETO:'DEMO2026', PINS:{1:'1111',2:'2222',3:'3333',4:'4444',5:'5555'} };
function demoSeed(){
  const padron = [];
  for (let m=1;m<=5;m++) for (let i=1;i<=8;i++) padron.push({ codigo:`${m}00${i}`, nombre:`Estudiante ${m}-${i}`, mesa:m });
  return { c1:[], c2:[], blanco:[], viciado:[], votantes:[], padron, reportes:[] };
}
async function demoApi(action, p){
  await new Promise(r=>setTimeout(r,180));
  const d = lsGet(DEMO.KEY) || demoSeed();
  const save = () => lsSet(DEMO.KEY, d);
  const fail = m => { throw new Error(m); };
  const pins = () => { const o={}; for(let m=1;m<=5;m++) o[m] = { tablet:DEMO.PINS[m], conteo:DEMO.PINS[m], ...((d.pins||{})[m]||{}) }; return o; };
  const mesaOk = tipo => { const m=Number(p.mesa); if(!(m>=1&&m<=5)) fail('Número de mesa inválido'); const t = tipo || (p.tipo==='conteo'?'conteo':'tablet'); if(pins()[m][t]!==String(p.pin)) fail(t==='tablet'?'PIN de la tablet incorrecto':'PIN de conteo incorrecto'); return m; };
  const demoCfg = () => ({ ok:true, numMesas:5, titulo:'Elecciones del Municipio Escolar 2026', colegio:'Modo demo', c1:{nombre:'Candidato 1',lema:'Lista 1'}, c2:{nombre:'Candidato 2',lema:'Lista 2'}, abierta:true, ...(d.config||{}) });
  const cerrada = () => { if (!demoCfg().abierta) fail('La votación está cerrada'); };
  const secretOk = () => { if (String(p.codigo) !== DEMO.SECRETO) fail('Código secreto incorrecto'); };
  const validar = (code, mesa) => {
    if (!validCode(code)) fail('El código solo puede tener letras, números y guiones');
    if (!d.padron.length) fail('El padrón electoral no está cargado. Avise al comité electoral.');
    const e = d.padron.find(x => x.codigo === code);
    if (!e) fail('Este código no está en el padrón electoral.');
    if (Number(e.mesa) !== mesa) fail(`Este estudiante pertenece a la MESA ${e.mesa}. No puede votar en esta mesa.`);
    if (d.votantes.some(v => v.codigo === code)) fail('Este código ya emitió su voto.');
    return e.nombre || '';
  };
  const contar = m => { const r={c1:0,c2:0,blanco:0,viciado:0,votantes:0,padron:0}; ['c1','c2','blanco','viciado'].forEach(t=>d[t].forEach(v=>{ if(!m||v.mesa===m) r[t]++; })); d.votantes.forEach(v=>{ if(!m||v.mesa===m) r.votantes++; }); d.padron.forEach(x=>{ if(!m||Number(x.mesa)===m) r.padron++; }); return r; };
  const porHora = m => { const h={}; d.votantes.forEach(v=>{ if(!m||v.mesa===m){ const k=String(v.hora).slice(11,13); h[k]=(h[k]||0)+1; } }); return h; };
  switch(action){
    case 'config': return demoCfg();
    case 'guardarConfig': {
      secretOk(); const c = p.config || {}; const t = v => String(v ?? '').trim().slice(0,120);
      if (!t(c.c1_nombre) || !t(c.c2_nombre)) fail('Los dos candidatos necesitan un nombre');
      const im = v => (typeof v === 'string' && v.startsWith('data:image/') && v.length <= 48000) ? v : '';
      d.config = { titulo:t(c.titulo) || 'Elecciones del Municipio Escolar 2026', colegio:t(c.colegio), c1:{nombre:t(c.c1_nombre),lema:t(c.c1_lema),foto:im(c.c1_foto),logo:im(c.c1_logo)}, c2:{nombre:t(c.c2_nombre),lema:t(c.c2_lema),foto:im(c.c2_foto),logo:im(c.c2_logo)}, abierta:!!c.abierta };
      save(); return demoCfg();
    }
    case 'mesaLogin': mesaOk(); return { ok:true };
    case 'reiniciar': { secretOk(); d.c1=[]; d.c2=[]; d.blanco=[]; d.viciado=[]; d.votantes=[]; d.reportes=[]; if (p.padron) d.padron=[]; save(); return { ok:true }; }
    case 'verPins': secretOk(); return { ok:true, pins:pins() };
    case 'guardarPins': {
      secretOk(); const np = {};
      for (let m=1;m<=5;m++){ const x=(p.pins||{})[m]||{}; np[m]={}; ['tablet','conteo'].forEach(t=>{ const v=String(x[t]||'').trim(); if(!/^[A-Za-z0-9]{4,12}$/.test(v)) fail(`Mesa ${m}: el PIN de ${t} debe tener de 4 a 12 letras o números`); np[m][t]=v; }); }
      d.pins = np; save(); return { ok:true, pins:pins() };
    }
    case 'verificar': { const m = mesaOk('tablet'); cerrada(); return { ok:true, nombre: validar(norm(p.codigo), m) }; }
    case 'votar': {
      const m = mesaOk('tablet'); cerrada(); const code = norm(p.codigo); const nombre = validar(code, m);
      const t = p.c1 && p.c2 ? 'viciado' : p.c1 ? 'c1' : p.c2 ? 'c2' : 'blanco';
      const constancia = Math.random().toString(36).slice(2,10).toUpperCase();
      d[t].push({ mesa:m, fecha:isoLocal(new Date()).slice(0,10), constancia });
      d.votantes.push({ codigo:code, nombre, mesa:m, hora:isoLocal(new Date()) }); save();
      return { ok:true, constancia };
    }
    case 'resultadosMesa': { const m = mesaOk('conteo'); const rep = d.reportes.filter(r=>r.mesa===m).pop() || null; return { ok:true, mesa:m, resultados: contar(m), porHora: porHora(m), ultimoReporte: rep }; }
    case 'padronMesa': { const m = mesaOk('conteo'); const ya = new Set(d.votantes.map(v => v.codigo)); return { ok:true, mesa:m, padron: d.padron.filter(x => Number(x.mesa) === m).map(x => ({ codigo:x.codigo, nombre:x.nombre, dni:x.dni||'', grado:x.grado||'', seccion:x.seccion||'', voto: ya.has(x.codigo) })) }; }
    case 'enviarReporte': { const m = mesaOk('conteo'); const rep = { mesa:m, hora:isoLocal(new Date()), ...contar(m) }; d.reportes.push(rep); save(); return { ok:true, reporte:rep }; }
    case 'computo': {
      secretOk();
      const porMesa = {}, reportes = {}; for (let m=1;m<=5;m++){ porMesa[m] = contar(m); reportes[m] = d.reportes.filter(r=>r.mesa===m).pop() || null; }
      return { ok:true, porMesa, reportes, porHora: porHora(0), votantes:d.votantes, padron:d.padron, hora:new Date().toISOString() };
    }
    case 'chatMesaLeer': case 'chatMesaEnviar': case 'chatCentralLeer': case 'chatCentralEnviar': case 'chatCentralBorrar': {
      d.chat = d.chat || []; let m = 0;
      if (action.startsWith('chatMesa')) m = mesaOk('conteo'); else secretOk();
      if (action === 'chatCentralBorrar') d.chat = [];
      if (action.endsWith('Enviar')){ const t = String(p.texto||'').replace(/\s+/g,' ').trim().slice(0,500); if (!t) fail('Escribe un mensaje'); const mm = m || Number(p.mesa); d.chat.push({ id: d.chat.length + 2, hora: isoLocal(new Date()), mesa: mm, de: m ? 'mesa' : 'central', texto: t }); }
      save(); const desde = Number(p.desde)||0;
      return { ok:true, ultimo: d.chat.length + 1, mensajes: d.chat.filter(x => x.id > desde && (!m || x.mesa === m || x.mesa === 0)) };
    }
    case 'guardarPadron': {
      secretOk();
      const s = v => String(v ?? '').trim().slice(0,80);
      const filas = (p.filas||[]).map(f => ({ codigo:norm(f.codigo), nombre:s(f.nombre), mesa:Number(f.mesa), dni:s(f.dni), grado:s(f.grado), seccion:s(f.seccion) }));
      if (filas.some(f => !validCode(f.codigo) || !(f.mesa>=1&&f.mesa<=5))) fail('Hay filas con código o mesa inválidos');
      d.padron = filas; save(); return { ok:true, total:filas.length };
    }
  }
  fail('Acción desconocida');
}

/* ---------- gráficos estadísticos (Chart.js) ---------- */
const COL = { c1:'#0284c7', c2:'#e8590c', blanco:'#0f9f7f', viciado:'#c2255c' };
const TIPOS = ['c1','c2','blanco','viciado'];
const tipoNombre = t => ({ c1:CFG.c1.nombre, c2:CFG.c2.nombre, blanco:'En blanco', viciado:'Viciados' })[t];
const CHARTS = {};
function chartDefaults(){
  if (!window.Chart) return;
  Chart.defaults.font.family = '"Exo 2", system-ui, sans-serif'; Chart.defaults.font.size = 13; Chart.defaults.color = '#4b6a85';
  Chart.defaults.plugins.tooltip.backgroundColor = '#0b2a44'; Chart.defaults.plugins.tooltip.padding = 10; Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.legend.labels.usePointStyle = true; Chart.defaults.plugins.legend.labels.pointStyle = 'rectRounded';
  Chart.defaults.animation.duration = 600;
}
function upsertChart(id, cfg){
  if (!window.Chart){ const el = document.getElementById(id); if (el) el.parentElement.innerHTML = '<div class="empty">No se pudieron cargar los gráficos (sin internet).</div>'; return; }
  const ex = CHARTS[id];
  if (ex && ex.config.type === cfg.type){ ex.data.labels = cfg.data.labels; cfg.data.datasets.forEach((ds,i) => { if (ex.data.datasets[i]) Object.assign(ex.data.datasets[i], ds); else ex.data.datasets.push(ds); }); ex.data.datasets.length = cfg.data.datasets.length; ex.update(); return; }
  if (ex) ex.destroy();
  CHARTS[id] = new Chart(document.getElementById(id), cfg);
}
const gridY = { grid:{ color:'#e3f1fa' }, border:{ display:false }, ticks:{ precision:0 }, beginAtZero:true };
const gridX = { grid:{ display:false }, border:{ color:'#cfe6f3' } };

function donut(id, c){
  const total = TIPOS.reduce((a,t)=>a+c[t],0);
  upsertChart(id, { type:'doughnut',
    data:{ labels: TIPOS.map(t => `${tipoNombre(t)}: ${c[t]} (${pct(c[t], total)})`), datasets:[{ data: TIPOS.map(t=>c[t]), backgroundColor: TIPOS.map(t=>COL[t]), borderColor:'#fff', borderWidth:3, hoverOffset:8 }] },
    options:{ maintainAspectRatio:false, cutout:'62%', plugins:{ legend:{ position:'right' }, tooltip:{ callbacks:{ label: x => ' ' + x.label } } } } });
}
function barTipos(id, c){
  upsertChart(id, { type:'bar',
    data:{ labels: TIPOS.map(tipoNombre), datasets:[{ label:'Votos', data: TIPOS.map(t=>c[t]), backgroundColor: TIPOS.map(t=>COL[t]), borderRadius:6, borderSkipped:'start', maxBarThickness:46 }] },
    options:{ indexAxis:'y', maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:{ x:gridY, y:gridX } } });
}
function lineaHoras(id, porHora){
  const hs = Object.keys(porHora||{}).sort();
  const labels = hs.length ? hs.map(h => h + ':00') : ['—'];
  upsertChart(id, { type:'line',
    data:{ labels, datasets:[{ label:'Estudiantes que votaron', data: hs.length ? hs.map(h=>porHora[h]) : [0], borderColor:'#0284c7', backgroundColor:'rgba(14,165,233,.15)', fill:true, tension:.35, borderWidth:2, pointRadius:4, pointBackgroundColor:'#0284c7', pointBorderColor:'#fff', pointBorderWidth:2 }] },
    options:{ maintainAspectRatio:false, interaction:{ mode:'index', intersect:false }, plugins:{ legend:{ display:false } }, scales:{ y:gridY, x:gridX } } });
}
function kpis(el, c){
  const total = TIPOS.reduce((a,t)=>a+c[t],0);
  const items = TIPOS.map(t => [tipoNombre(t), c[t], pct(c[t], total) + ' del total', COL[t], total ? c[t]*100/total : 0])
    .concat([['Votos emitidos', total, (c.c1+c.c2) + ' válidos', '#7dd3fc', 100], ['Participación', pct(c.votantes, c.padron), `${c.votantes} de ${c.padron}`, '#0ea5e9', c.padron ? c.votantes*100/c.padron : 0]]);
  $(el).innerHTML = items.map(([l,v,p,col,w]) => `<div class="glass kpi" style="--sc:${col}"><div class="k"><i></i>${esc(l)}</div><div class="v">${v}</div><div class="p">${esc(p)}</div><div class="bar" style="width:${w}%"></div></div>`).join('');
}
function winnerBox(el, c, label){
  const v = c.c1 + c.c2; let t, n, d;
  if (!v){ t = 'Aún sin votos válidos'; n = '—'; d = 'Los resultados aparecerán aquí.'; }
  else if (c.c1 === c.c2){ t = 'Empate'; n = CFG.c1.nombre + ' y ' + CFG.c2.nombre; d = `${c.c1} votos cada uno`; }
  else { const w = c.c1 > c.c2 ? 'c1' : 'c2'; t = label; n = tipoNombre(w); d = `${c[w]} votos · ${pct(c[w], v)} de los votos válidos`; }
  $(el).innerHTML = `${ART.trofeo}<div><div class="t">${t}</div><div class="name">${esc(n)}</div><div class="d">${esc(d)}</div></div>`;
}
function actaTexto(titulo, c){
  const total = TIPOS.reduce((a,t)=>a+c[t],0);
  return [titulo, CFG.titulo, CFG.colegio, 'Fecha y hora: ' + now(), '',
    `${CFG.c1.nombre}: ${c.c1} (${pct(c.c1,total)})`, `${CFG.c2.nombre}: ${c.c2} (${pct(c.c2,total)})`,
    `Votos en blanco: ${c.blanco} (${pct(c.blanco,total)})`, `Votos viciados: ${c.viciado} (${pct(c.viciado,total)})`, '',
    `Votos emitidos: ${total}`, `Votos válidos: ${c.c1 + c.c2}`, `Estudiantes que votaron: ${c.votantes} de ${c.padron||0} (${pct(c.votantes, c.padron)})`].join('\n');
}

/* ---------- padrón por mesa: tabla, impresión y Excel ---------- */
const ordenPadron = l => l.slice().sort((a,b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
function filasPadron(lista){ return ordenPadron(lista).map((p,i) => [i+1, p.dni||'', p.nombre||'', p.grado||'', p.seccion||'', p.codigo]); }
const CAB_PADRON = ['N°','DNI','Estudiante','Grado','Sección','Código'];
/* porMesa: { 1:[...], 2:[...] } */
function imprimirPadron(porMesa){
  const area = $('#printArea'); if (!area) return;
  const ins = document.querySelector('.insignia'); const img = ins ? `<img src="${ins.src}" alt="">` : '';
  area.className = 'padron';
  area.innerHTML = Object.keys(porMesa).map(m => `<section class="ppage"><div class="phead">${img}<div><div class="pt">${esc(CFG.titulo)}</div><div class="ps">${esc(CFG.colegio)}</div></div><div class="pm">PADRÓN<br>MESA ${m}</div></div>
    <table class="ptab"><thead><tr>${CAB_PADRON.map(h => `<th>${h}</th>`).join('')}<th>Firma</th><th>Huella</th></tr></thead><tbody>${
      filasPadron(porMesa[m]).map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}<td class="pfirma"></td><td class="phuella"></td></tr>`).join('') || '<tr><td colspan="8">Sin estudiantes</td></tr>'}</tbody></table>
    <div class="pfoot">Total: ${porMesa[m].length} estudiantes · Impreso: ${esc(now())}</div></section>`).join('');
  try { window.print(); } catch {}
}
async function descargarPadronExcel(porMesa, nombreArchivo){
  if (!window.XLSX){ toast('No se pudo cargar la herramienta de Excel (revisa el internet).'); return; }
  const wb = XLSX.utils.book_new();
  Object.keys(porMesa).forEach(m => {
    const ws = XLSX.utils.aoa_to_sheet([[`${CFG.titulo} — Padrón Mesa ${m}`], [CFG.colegio], [], CAB_PADRON, ...filasPadron(porMesa[m])]);
    ws['!cols'] = [{wch:5},{wch:12},{wch:44},{wch:12},{wch:9},{wch:10}];
    XLSX.utils.book_append_sheet(wb, ws, 'Mesa ' + m);
  });
  try { XLSX.writeFile(wb, nombreArchivo); toast('Excel descargado: ' + nombreArchivo); }
  catch { toast('No se pudo descargar aquí. Abre la página desde tus archivos o desde GitHub en Chrome.'); }
}

/* chat privado central <-> mesas (solo en las computadoras de conteo y en la central) */
if (document.getElementById('s-central') || document.getElementById('padSec')){ const s = document.createElement('script'); s.src = 'chat.js'; document.body.appendChild(s); }
