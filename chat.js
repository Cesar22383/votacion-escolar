/* ============================================================
   CHAT PRIVADO: computadora central <-> computadoras de conteo de las mesas
   - Cada mesa solo ve su conversación con la central.
   - La central ve las 5 mesas y puede escribir a una mesa o a todas.
   Se activa solo cuando conteo.js o central.js definen window.CHAT_AUTH al entrar.
   ============================================================ */
(() => {
const CSS = `
.chf{position:fixed;right:22px;bottom:22px;z-index:25;display:none;align-items:center;gap:10px;padding:15px 22px;border-radius:999px;background:linear-gradient(90deg,#0ea5e9,#0284c7);color:#fff;font-weight:700;font-size:15px;letter-spacing:.06em;box-shadow:0 14px 34px -10px rgba(2,132,199,.8);cursor:pointer;border:none}
.chf .bd{min-width:24px;height:24px;border-radius:12px;background:#dc2626;color:#fff;font-size:13px;display:none;place-items:center;padding:0 6px}
.chf.pulse{animation:chp 1s ease-in-out infinite}@keyframes chp{50%{transform:scale(1.08)}}
.chp{position:fixed;right:22px;bottom:90px;z-index:26;width:400px;height:540px;max-height:calc(100vh - 120px);background:#fff;border-radius:22px;box-shadow:0 30px 80px -20px rgba(3,40,70,.55);border:1px solid rgba(2,132,199,.25);display:none;flex-direction:column;overflow:hidden;font-family:"Exo 2",system-ui,sans-serif;color:#0b2a44}
.chp.on{display:flex}.chp.wide{width:760px}
.chp .ch{padding:14px 18px;background:linear-gradient(90deg,#0369a1,#0ea5e9);color:#fff;display:flex;justify-content:space-between;align-items:center}
.chp .ch b{font-family:Orbitron,sans-serif;font-size:14px;letter-spacing:.06em}.chp .ch small{display:block;font-size:11px;opacity:.85;margin-top:2px}
.chp .ch button{color:#fff;font-size:22px;background:none;border:none;cursor:pointer;line-height:1}
.chp .cb{flex:1;display:flex;min-height:0}
.chp .cl{width:220px;border-right:1px solid #e3f1fa;overflow:auto;background:#f6fbff}
.chp .ci{padding:12px 14px;border-bottom:1px solid #e3f1fa;cursor:pointer;display:flex;justify-content:space-between;gap:8px;align-items:center}
.chp .ci.on{background:#e0f2fe}.chp .ci b{font-size:14px}.chp .ci span{font-size:12px;color:#4b6a85;display:block;max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chp .ci i{font-style:normal;min-width:22px;height:22px;border-radius:11px;background:#dc2626;color:#fff;font-size:12px;display:grid;place-items:center;padding:0 6px}
.chp .ct{flex:1;display:flex;flex-direction:column;min-width:0}
.chp .cm{flex:1;overflow:auto;padding:14px;background:#f8fdff;display:flex;flex-direction:column;gap:8px}
.chp .mg{max-width:80%;padding:9px 13px;border-radius:14px;font-size:14.5px;line-height:1.35;word-wrap:break-word;box-shadow:0 2px 6px rgba(3,40,70,.08)}
.chp .mg small{display:block;font-size:10.5px;opacity:.7;margin-top:4px}
.chp .mg.yo{align-self:flex-end;background:#0284c7;color:#fff;border-bottom-right-radius:4px}
.chp .mg.otro{align-self:flex-start;background:#fff;border:1px solid #d7ecf9;border-bottom-left-radius:4px}
.chp .mg.todas{border-left:4px solid #f59e0b}
.chp .ce{color:#4b6a85;font-size:13px;text-align:center;margin:auto}
.chp form{display:flex;gap:8px;padding:10px;border-top:1px solid #e3f1fa}
.chp input{flex:1;padding:12px 14px;border-radius:12px;border:1.5px solid rgba(2,132,199,.25);outline:none;font:inherit;font-size:15px}
.chp input:focus{border-color:#0ea5e9}
.chp form button{padding:0 18px;border-radius:12px;background:#0284c7;color:#fff;font-weight:700;border:none;cursor:pointer}
.chp .cx{font-size:11px;color:#b45309;padding:0 12px 8px}
@media (max-width:820px){.chp.wide{width:calc(100vw - 30px)}.chp .cl{width:150px}}
@media print{.chf,.chp{display:none !important}}`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
const esc2 = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const btn = document.createElement('button'); btn.className = 'chf'; btn.type = 'button';
const pan = document.createElement('div'); pan.className = 'chp';
document.body.appendChild(btn); document.body.appendChild(pan);

const C = { auth:null, msgs:[], last:0, sel:1, seen:{}, open:false, timer:null, busy:false, err:'' };
const N = () => (window.CFG && CFG.numMesas) || 5;
const esCentral = () => C.auth && C.auth.tipo === 'central';
const keySeen = () => 'chat-visto-' + (esCentral() ? 'central' : 'mesa' + C.auth.mesa);
const horaC = h => String(h || '').slice(11, 16);

function cred(){ return esCentral() ? { codigo: C.auth.codigo } : { mesa: C.auth.mesa, pin: C.auth.pin, tipo: 'conteo' }; }
function pendientes(m){ // mensajes del otro lado que aún no se leen
  const visto = C.seen[m] || 0;
  return C.msgs.filter(x => x.id > visto && (esCentral() ? (x.de === 'mesa' && x.mesa === m) : x.de === 'central')).length;
}
function beep(){ try { const a = new (window.AudioContext || window.webkitAudioContext)(); const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(.15, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + .3); o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + .3); } catch {} }

function marcarVisto(){
  if (!C.open) return;
  const m = esCentral() ? C.sel : 0;
  const ult = C.msgs.reduce((a, x) => Math.max(a, x.id), 0);
  C.seen[m] = ult; try { localStorage.setItem(keySeen(), JSON.stringify(C.seen)); } catch {}
}
function pintarBoton(){
  const tot = esCentral() ? Array.from({length:N()}, (_,i) => pendientes(i+1)).reduce((a,b)=>a+b,0) : pendientes(0);
  btn.innerHTML = `💬 ${esCentral() ? 'Chat con las mesas' : 'Chat con la central'}<span class="bd" style="display:${tot ? 'grid' : 'none'}">${tot}</span>`;
  btn.classList.toggle('pulse', tot > 0 && !C.open);
}
function hilo(){
  if (!esCentral()) return C.msgs;
  if (C.sel === 0) return C.msgs.filter(x => x.mesa === 0);
  return C.msgs.filter(x => x.mesa === C.sel || x.mesa === 0);
}
function pintar(){
  pintarBoton();
  if (!C.open) return;
  const yo = esCentral() ? 'central' : 'mesa';
  const lista = hilo();
  const msgs = lista.length ? lista.map(x => `<div class="mg ${x.de === yo ? 'yo' : 'otro'} ${x.mesa === 0 ? 'todas' : ''}">${esc2(x.texto)}<small>${x.de === 'central' ? 'Central' : 'Mesa ' + x.mesa}${x.mesa === 0 ? ' → todas las mesas' : ''} · ${horaC(x.hora)}</small></div>`).join('')
    : `<div class="ce">${esCentral() ? 'Aún no hay mensajes con esta mesa.' : 'Escribe aquí para comunicarte con la central.'}</div>`;
  const cm = pan.querySelector('.cm'); const abajo = !cm || cm.scrollHeight - cm.scrollTop - cm.clientHeight < 60;
  const valor = (pan.querySelector('input') || {}).value || '';
  let izq = '';
  if (esCentral()){
    const items = [0].concat(Array.from({length:N()}, (_,i) => i+1)).map(m => {
      const ult = (m === 0 ? C.msgs.filter(x => x.mesa === 0) : C.msgs.filter(x => x.mesa === m)).slice(-1)[0];
      const p = m ? pendientes(m) : 0;
      return `<div class="ci ${C.sel === m ? 'on' : ''}" data-m="${m}"><div><b>${m ? 'Mesa ' + m : '📢 Todas las mesas'}</b><span>${ult ? esc2(ult.texto) : 'Sin mensajes'}</span></div>${p ? `<i>${p}</i>` : ''}</div>`;
    }).join('');
    izq = `<div class="cl">${items}</div>`;
  }
  const titulo = esCentral() ? (C.sel ? 'Mesa ' + C.sel : 'Aviso a todas las mesas') : 'Mesa ' + C.auth.mesa + ' ↔ Central';
  pan.innerHTML = `<div class="ch"><div><b>💬 CHAT PRIVADO</b><small>${esc2(titulo)}</small></div><button type="button" data-cerrar aria-label="Cerrar">×</button></div>
    <div class="cb">${izq}<div class="ct"><div class="cm">${msgs}</div>${C.err ? `<div class="cx">${esc2(C.err)}</div>` : ''}
    <form autocomplete="off"><input maxlength="500" placeholder="${esCentral() && C.sel === 0 ? 'Mensaje para las 5 mesas…' : 'Escribe un mensaje…'}"><button type="submit">Enviar</button></form></div></div>`;
  const inp = pan.querySelector('input'); inp.value = valor;
  const nm = pan.querySelector('.cm'); if (abajo || !cm) nm.scrollTop = nm.scrollHeight; else nm.scrollTop = cm.scrollTop;
  if (document.activeElement === document.body || !document.activeElement) inp.focus();
}
function recibir(r){
  if (r.ultimo != null && r.ultimo < C.last){ C.msgs = []; C.last = 0; } // el chat fue borrado en la central
  const nuevos = (r.mensajes || []).filter(x => x.id > C.last);
  if (!nuevos.length) return false;
  C.msgs = C.msgs.concat(nuevos); C.last = Math.max(C.last, ...nuevos.map(x => x.id));
  return nuevos.some(x => x.de !== (esCentral() ? 'central' : 'mesa'));
}
async function leer(){
  if (!C.auth || C.busy) return; C.busy = true;
  try {
    const r = await api(esCentral() ? 'chatCentralLeer' : 'chatMesaLeer', { ...cred(), desde: C.last });
    const hay = recibir(r); C.err = '';
    if (hay && C.msgs.length && C.primera === false){ beep(); if (!C.open && window.toast) toast(esCentral() ? 'Nuevo mensaje de una mesa' : 'Nuevo mensaje de la central'); }
    C.primera = false; marcarVisto(); pintar();
  } catch(e){ C.err = /Acción desconocida/.test(e.message) ? 'El chat aún no está activado en el servidor.' : e.message; pintar(); }
  finally { C.busy = false; }
}
async function enviar(texto){
  const t = texto.trim(); if (!t) return;
  const body = esCentral() ? { ...cred(), mesa: C.sel, texto: t, desde: C.last } : { ...cred(), texto: t, desde: C.last };
  const inp = pan.querySelector('input'); inp.value = ''; inp.disabled = true;
  try { recibir(await api(esCentral() ? 'chatCentralEnviar' : 'chatMesaEnviar', body)); C.err = ''; marcarVisto(); }
  catch(e){ C.err = e.message; inp.value = t; }
  finally { inp.disabled = false; pintar(); pan.querySelector('input').focus(); }
}
btn.onclick = () => { C.open = !C.open; pan.classList.toggle('on', C.open); marcarVisto(); pintar(); };
pan.addEventListener('click', e => {
  if (e.target.closest('[data-cerrar]')){ C.open = false; pan.classList.remove('on'); pintarBoton(); return; }
  const it = e.target.closest('[data-m]'); if (it){ C.sel = Number(it.dataset.m); marcarVisto(); pintar(); }
});
pan.addEventListener('submit', e => { e.preventDefault(); enviar(pan.querySelector('input').value); });

// vigila el inicio y la salida de sesión de la página (conteo o central)
setInterval(() => {
  const a = window.CHAT_AUTH || null;
  const k = a ? JSON.stringify(a) : '';
  if (k === (C.k || '')) return;
  C.k = k; C.auth = a; C.msgs = []; C.last = 0; C.primera = true; C.err = ''; clearInterval(C.timer);
  if (!a){ btn.style.display = 'none'; pan.classList.remove('on'); C.open = false; return; }
  try { C.seen = JSON.parse(localStorage.getItem(keySeen())) || {}; } catch { C.seen = {}; }
  pan.classList.toggle('wide', esCentral()); btn.style.display = 'flex';
  leer(); C.timer = setInterval(leer, 5000); pintar();
}, 500);
})();
