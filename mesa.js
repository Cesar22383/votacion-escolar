/* ============================================================
   TABLET DE VOTACIÓN — cada archivo mesaN.html define window.MESA = N
   ============================================================ */
(() => {
const MESA = Number(window.MESA);
const LS_PIN = 'voto-tablet-pin-' + MESA;
const S = { pin:null, code:null, name:'', s1:false, s2:false, busy:false, timer:null };

function show(id){ $$('.screen').forEach(s=>s.classList.toggle('on', s.id===id)); $('#fab').style.display = S.pin ? 'block' : 'none'; window.scrollTo(0,0); }

async function init(){
  $$('.art').forEach(a => a.innerHTML = ART.urna);
  $('#celebra').innerHTML = ART.celebra;
  await loadConfig(); applyCfg();
  if (!API) $('#demoBanner').style.display = 'block';
  S.pin = lsGet(LS_PIN);
  home(); hideLoader();
}
function applyCfg(){
  $('#hTitle').textContent = CFG.titulo; $('#hSchool').textContent = CFG.colegio;
  $('#name1').textContent = CFG.c1.nombre; $('#name2').textContent = CFG.c2.nombre;
  $('#slog1').textContent = CFG.c1.lema || ''; $('#slog2').textContent = CFG.c2.lema || '';
  [1,2].forEach(n => {
    const c = CFG['c'+n], em = $('#em'+n), lg = $('#lg'+n);
    em.textContent = initials(c.nombre); em.classList.toggle('photo', !!c.foto); em.style.backgroundImage = c.foto ? `url("${c.foto}")` : '';
    if (c.logo){ if (lg.getAttribute('src') !== c.logo) lg.src = c.logo; lg.classList.add('on'); } else { lg.classList.remove('on'); lg.removeAttribute('src'); }
  });
  $('#closedBanner').style.display = CFG.abierta ? 'none' : 'block';
  $('#btnEnter').disabled = !CFG.abierta;
}
// toma los cambios hechos en la central (candidatos, abrir/cerrar) sin recargar
async function refreshCfg(){ try { const c = await api('config'); CFG = { ...CFG, ...c }; applyCfg(); } catch {} }
setInterval(() => { if ($('#s-access').classList.contains('on') || $('#s-setup').classList.contains('on')) refreshCfg(); }, 30000);
// si la central cambió el PIN, la tablet vuelve a pedir activación
function pinCambiado(err){
  if (!/PIN de la tablet/.test(err.message)) return false;
  S.pin = null; lsSet(LS_PIN, null); S.code = null; home();
  $('#setupMsg').className = 'msg err big-err'; $('#setupMsg').textContent = 'El PIN de esta mesa fue cambiado por la central. Pide el nuevo PIN al comité y activa la tablet otra vez.';
  return true;
}
function home(){ if (S.pin){ show('s-access'); setTimeout(()=>$('#code').focus(),60); } else { show('s-setup'); setTimeout(()=>$('#mesaPin').focus(),60); } }

/* activar la tablet */
$('#setupForm').addEventListener('submit', async e => {
  e.preventDefault(); const msg = $('#setupMsg'); msg.className='msg';
  const pin = $('#mesaPin').value.trim();
  if (!pin){ msg.className='msg err'; msg.textContent='Escribe el PIN de la mesa.'; return; }
  const b = $('#btnSetup'); b.disabled = true; b.textContent = 'Verificando…';
  try { await api('mesaLogin', { mesa:MESA, pin, tipo:'tablet' }); S.pin = pin; lsSet(LS_PIN, pin); $('#mesaPin').value=''; toast('Tablet de la Mesa ' + MESA + ' activada'); home(); }
  catch(err){ msg.className='msg err'; msg.textContent = err.message; }
  finally { b.disabled = false; b.textContent = 'Activar mesa ›'; }
});

/* ingreso del estudiante */
$('#code').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase(); $('#accessMsg').textContent=''; $('#accessMsg').className='msg'; });
$('#accessForm').addEventListener('submit', async e => {
  e.preventDefault(); const msg = $('#accessMsg'); msg.className='msg';
  const code = norm($('#code').value);
  if (!code){ msg.className='msg err'; msg.textContent='Escribe tu código de estudiante.'; return; }
  if (!validCode(code)){ msg.className='msg err'; msg.textContent='El código solo puede tener letras, números y guiones.'; return; }
  const b = $('#btnEnter'); b.disabled = true; b.textContent = 'Verificando…';
  try {
    const r = await api('verificar', { mesa:MESA, pin:S.pin, codigo:code });
    S.code = code; S.name = r.nombre || ''; S.s1 = S.s2 = false;
    $('#voterCode').textContent = code; $('#voterName').textContent = S.name ? ' · ' + S.name : '';
    renderBallot(); show('s-ballot');
  } catch(err){ if (pinCambiado(err)) return; msg.className='msg err big-err'; msg.textContent = '✕ ' + err.message; }
  finally { b.disabled = !CFG.abierta; b.textContent = 'Ingresar ›'; }
});

/* cédula */
const voteType = () => S.s1 && S.s2 ? 'viciado' : S.s1 ? 'c1' : S.s2 ? 'c2' : 'blanco';
const typeLabel = t => ({ c1:'Voto válido por ' + CFG.c1.nombre, c2:'Voto válido por ' + CFG.c2.nombre, blanco:'Voto en blanco', viciado:'Voto viciado' })[t];
function renderBallot(){
  $('#cand1').classList.toggle('sel', S.s1); $('#cand2').classList.toggle('sel', S.s2);
  const t = voteType(); $('#verdict').textContent = typeLabel(t); $('#verdict').style.color = COL[t];
}
$('#cand1').onclick = () => { S.s1 = !S.s1; renderBallot(); };
$('#cand2').onclick = () => { S.s2 = !S.s2; renderBallot(); };
$('#btnCancel').onclick = backToStart;
$('#btnVote').onclick = () => {
  const t = voteType();
  const extra = t==='blanco' ? ' No marcaste a ningún candidato.' : t==='viciado' ? ' Marcaste a los dos candidatos.' : '';
  $('#confirmText').textContent = 'Tu voto se registrará como: ' + typeLabel(t) + '.' + extra + ' Una vez emitido no podrás cambiarlo.';
  modal('#mConfirm', true);
};
$('#btnConfirm').onclick = async () => {
  if (S.busy || !S.code) return;
  S.busy = true; const b = $('#btnConfirm'); b.disabled = true; b.textContent = 'Registrando…';
  try {
    const r = await api('votar', { mesa:MESA, pin:S.pin, codigo:S.code, c1:S.s1, c2:S.s2 });
    modal('#mConfirm', false);
    $('#receipt').textContent = 'Mesa ' + MESA + ' · Constancia N° ' + r.constancia;
    show('s-thanks'); countdown();
  } catch(err){ modal('#mConfirm', false); if (!pinCambiado(err)) toast(err.message); }
  finally { S.busy = false; b.disabled = false; b.textContent = 'Sí, emitir voto'; }
};
function countdown(){ let n = 6; $('#countdown').textContent = n; clearInterval(S.timer); S.timer = setInterval(() => { n--; $('#countdown').textContent = n; if (n <= 0) backToStart(); }, 1000); }
function backToStart(){ clearInterval(S.timer); refreshCfg(); S.code=null; S.name=''; S.s1=S.s2=false; $('#code').value=''; $('#accessMsg').textContent=''; home(); }

/* desactivar tablet (con PIN) */
$('#fab').onclick = () => { $('#pinIn').value=''; $('#pinMsg').textContent=''; modal('#mPin', true); setTimeout(()=>$('#pinIn').focus(),60); };
$('#pinIn').addEventListener('keydown', e => { if (e.key==='Enter') $('#btnPin').click(); });
$('#btnPin').onclick = () => {
  if ($('#pinIn').value.trim() !== String(S.pin)){ $('#pinMsg').textContent='PIN incorrecto.'; return; }
  modal('#mPin', false); S.pin = null; lsSet(LS_PIN, null); toast('Tablet desactivada'); home();
};

init();
})();
