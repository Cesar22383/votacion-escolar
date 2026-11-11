/* ============================================================
   COMPUTADORA DE CONTEO DE MESA — conteoN.html define window.MESA = N
   ============================================================ */
(() => {
const MESA = Number(window.MESA);
const S = { pin:null, last:null, timer:null };
const show = id => { $$('.screen').forEach(s=>s.classList.toggle('on', s.id===id)); window.scrollTo(0,0); };

async function init(){
  $('#artMon').innerHTML = ART.monitor; chartDefaults();
  await loadConfig();
  if (!API) $('#demoBanner').style.display = 'block';
  hideLoader(); setTimeout(()=>$('#pin').focus(),60);
}

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault(); const msg = $('#loginMsg'); msg.className='msg';
  const pin = $('#pin').value.trim(); if (!pin){ msg.className='msg err'; msg.textContent='Escribe el PIN de la mesa.'; return; }
  const b = $('#btnLogin'); b.disabled = true; b.textContent = 'Verificando…';
  try { const r = await api('resultadosMesa', { mesa:MESA, pin, tipo:'conteo' }); S.pin = pin; window.CHAT_AUTH = { tipo:'mesa', mesa:MESA, pin }; $('#pin').value=''; show('s-dash'); render(r); loadPadron(); S.timer = setInterval(refresh, 15000); }
  catch(err){ msg.className='msg err'; msg.textContent = err.message; }
  finally { b.disabled = false; b.textContent = 'Ver conteo ›'; }
});
async function refresh(){ if (!S.pin) return; try { const c = await api('config'); CFG = { ...CFG, ...c }; $('#hTitle').textContent = CFG.titulo; $('#hSchool').textContent = CFG.colegio; render(await api('resultadosMesa', { mesa:MESA, pin:S.pin, tipo:'conteo' })); loadPadron(); } catch(err){ if (/PIN de conteo/.test(err.message)){ S.pin = null; window.CHAT_AUTH = null; clearInterval(S.timer); show('s-login'); $('#loginMsg').className='msg err'; $('#loginMsg').textContent='El PIN de conteo fue cambiado por la central. Ingresa el nuevo PIN.'; } else toast(err.message); } }
$('#btnRefresh').onclick = refresh;
$('#btnExit').onclick = () => { S.pin = null; window.CHAT_AUTH = null; clearInterval(S.timer); show('s-login'); };

function render(r){
  const c = r.resultados; S.last = r;
  kpis('#kpis', c);
  winnerBox('#winner', c, 'Gana en esta mesa');
  $('#progTxt').textContent = `${c.votantes} de ${c.padron} estudiantes de la Mesa ${MESA} ya votaron · faltan ${Math.max(c.padron - c.votantes, 0)}`;
  $('#progFill').style.width = (c.padron ? c.votantes*100/c.padron : 0) + '%';
  donut('chDonut', c); barTipos('chBar', c); lineaHoras('chHoras', r.porHora);
  const total = TIPOS.reduce((a,t)=>a+c[t],0);
  $('#tabla').innerHTML = `<thead><tr><th>Opción</th><th>Votos</th><th>% del total</th></tr></thead><tbody>`
    + TIPOS.map(t => `<tr><td>${esc(tipoNombre(t))}</td><td>${c[t]}</td><td>${pct(c[t], total)}</td></tr>`).join('')
    + `<tr class="total"><td>Total emitidos</td><td>${total}</td><td>100%</td></tr></tbody>`;
  const rep = r.ultimoReporte;
  if (rep){
    const dif = total - (rep.c1+rep.c2+rep.blanco+rep.viciado);
    $('#repState').innerHTML = `✔ Último reporte enviado a la central a las <b>${esc(horaCorta(rep.hora))}</b>` + (dif > 0 ? ` · <b style="color:var(--warn)">hay ${dif} voto(s) nuevo(s) desde entonces: vuelve a enviar el reporte.</b>` : ' · está al día.');
  } else $('#repState').innerHTML = 'Aún no se ha enviado ningún reporte a la central. Envíalo al cerrar la mesa (puedes enviarlo varias veces; la central toma el último).';
  $('#upd').textContent = 'Actualizado: ' + now() + ' · se actualiza solo cada 15 s';
}

/* reporte a la central */
$('#btnSend').onclick = () => {
  if (!S.last) return; const c = S.last.resultados;
  $('#sendText').textContent = `Se enviará el conteo actual de la Mesa ${MESA}: ${CFG.c1.nombre} ${c.c1}, ${CFG.c2.nombre} ${c.c2}, en blanco ${c.blanco}, viciados ${c.viciado}. Votaron ${c.votantes} de ${c.padron} estudiantes.`;
  modal('#mSend', true);
};
$('#btnSendGo').onclick = async () => {
  const b = $('#btnSendGo'); b.disabled = true; b.textContent = 'Enviando…';
  try { const r = await api('enviarReporte', { mesa:MESA, pin:S.pin, tipo:'conteo' }); modal('#mSend', false); toast('Reporte recibido por la central a las ' + horaCorta(r.reporte.hora)); await refresh(); }
  catch(err){ toast(err.message); }
  finally { b.disabled = false; b.textContent = 'Sí, enviar'; }
};
/* padrón de esta mesa */
S.padron = [];
async function loadPadron(){
  if (!S.pin) return;
  try { const r = await api('padronMesa', { mesa:MESA, pin:S.pin, tipo:'conteo' }); S.padron = r.padron || []; renderPadron(); }
  catch(err){ if (!/PIN de conteo/.test(err.message)) toast(err.message); }
}
function renderPadron(){
  const q = norm($('#padBuscar').value), lista = ordenPadron(S.padron);
  const ya = lista.filter(p => p.voto).length;
  $('#padResumen').textContent = `${lista.length} estudiantes · ${ya} ya votaron · ${lista.length - ya} pendientes`;
  const filas = lista.map((p,i) => ({ ...p, n:i+1 })).filter(p => !q || norm(p.nombre).includes(q) || norm(p.dni).includes(q) || norm(p.codigo).includes(q));
  $('#padTable').innerHTML = '<thead><tr><th>N°</th><th>DNI</th><th>Estudiante</th><th>Grado</th><th>Sección</th><th>Código</th><th>Estado</th></tr></thead><tbody>' +
    (filas.length ? filas.map(p => `<tr><td>${p.n}</td><td>${esc(p.dni)}</td><td style="font-family:'Exo 2'">${esc(p.nombre)}</td><td style="font-family:'Exo 2'">${esc(p.grado)}</td><td>${esc(p.seccion)}</td><td style="font-weight:700;color:var(--deep);letter-spacing:.1em">${esc(p.codigo)}</td><td><span class="pill ${p.voto?'si':'no'}">${p.voto?'Ya votó':'Pendiente'}</span></td></tr>`).join('')
      : `<tr><td colspan="7" class="empty" style="text-align:center">${S.padron.length ? 'Sin resultados' : 'La central aún no ha cargado estudiantes para esta mesa.'}</td></tr>`) + '</tbody>';
  $$('#padTable td').forEach(td => td.style.textAlign = 'left'); $$('#padTable th').forEach(th => th.style.textAlign = 'left');
}
$('#padBuscar').addEventListener('input', renderPadron);
$('#btnPadPrint').onclick = () => imprimirPadron({ [MESA]: S.padron });
$('#btnPadXls').onclick = () => descargarPadronExcel({ [MESA]: S.padron }, `Padron_Mesa_${MESA}.xlsx`);

/* entregar código por DNI */
$('#entregaForm').addEventListener('submit', async e => {
  e.preventDefault();
  const dni = $('#dniIn').value.replace(/\D/g,''), out = $('#entregaRes');
  if (!dni){ out.innerHTML = '<div class="ent-warn bad">Escribe el DNI del estudiante.</div>'; return; }
  await loadPadron();
  const p = S.padron.find(x => String(x.dni).replace(/\D/g,'') === dni);
  if (!p){ out.innerHTML = `<div class="ent-warn bad">El DNI <b>${esc(dni)}</b> no figura en el padrón de la Mesa ${MESA}. Revisa el número; si es correcto, el estudiante pertenece a otra mesa.</div>`; return; }
  out.innerHTML = `<div class="ent-card ${p.voto?'ya':''}">
      <div><div class="nm">${esc(p.nombre)}</div>
      <div class="dt">DNI ${esc(p.dni)} · ${esc(p.grado)} grado · Sección ${esc(p.seccion)}</div>
      ${p.voto ? '<div class="ent-warn ok" style="margin-top:12px">Este estudiante YA VOTÓ. No se le entrega código otra vez.</div>' : '<div class="small" style="margin-top:10px">Verifica que los datos coincidan con el estudiante y entrégale este código para la tablet.</div>'}</div>
      <div class="ent-code"><small>Código</small><b>${p.voto ? '——' : esc(p.codigo)}</b></div></div>`;
  $('#dniIn').select();
});

$('#btnCopy').onclick = () => S.last && copy(actaTexto('ACTA DE MESA N° ' + MESA, S.last.resultados));

init();
})();
