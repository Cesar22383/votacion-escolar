/* ============================================================
   COMPUTADORA CENTRAL — recibe los reportes de las 5 mesas
   ============================================================ */
(() => {
const S = { secret:null, data:null, timer:null };
const show = id => { $$('.screen').forEach(s=>s.classList.toggle('on', s.id===id)); window.scrollTo(0,0); };

async function init(){
  $('#artCen').innerHTML = ART.central; chartDefaults();
  await loadConfig();
  if (!API) $('#demoBanner').style.display = 'block';
  hideLoader(); setTimeout(()=>$('#secret').focus(),60);
}

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault(); const msg = $('#loginMsg'); msg.className='msg';
  const code = $('#secret').value.trim(); if (!code){ msg.className='msg err'; msg.textContent='Escribe el código secreto.'; return; }
  const b = $('#btnLogin'); b.disabled = true; b.textContent = 'Verificando…';
  try { const r = await api('computo', { codigo:code }); S.secret = code; $('#secret').value=''; show('s-central'); fillCfg(); loadPins(); render(r); S.timer = setInterval(refresh, 20000); }
  catch(err){ msg.className='msg err'; msg.textContent = err.message; }
  finally { b.disabled = false; b.textContent = 'Entrar ›'; }
});
async function refresh(){ if (!S.secret) return; try { render(await api('computo', { codigo:S.secret })); } catch(err){ toast(err.message); } }
$('#btnRefresh').onclick = refresh;
$('#btnExit').onclick = () => { S.secret = null; S.data = null; clearInterval(S.timer); show('s-login'); };
$$('.tab').forEach(t => t.onclick = () => {
  $$('.tab').forEach(x => x.classList.toggle('on', x===t)); $$('.pane').forEach(p => p.classList.toggle('on', p.id === 'p-' + t.dataset.tab));
  Object.values(CHARTS).forEach(ch => ch.resize());
});

const sum = o => { const t = { c1:0, c2:0, blanco:0, viciado:0, votantes:0, padron:0 }; Object.values(o).forEach(r => r && Object.keys(t).forEach(k => t[k] += (r[k]||0))); return t; };
const emit = x => x.c1 + x.c2 + x.blanco + x.viciado;

function render(r){
  S.data = r; const tot = sum(r.porMesa); const mesas = Object.keys(r.porMesa);
  kpis('#kpis', tot);
  winnerBox('#winner', tot, 'Va ganando la elección');
  $('#progTxt').textContent = `${tot.votantes} de ${tot.padron} estudiantes ya votaron (${pct(tot.votantes, tot.padron)}) · faltan ${Math.max(tot.padron - tot.votantes, 0)}`;
  $('#progFill').style.width = (tot.padron ? tot.votantes*100/tot.padron : 0) + '%';

  donut('chDonut', tot);
  upsertChart('chPart', { type:'bar',
    data:{ labels: mesas.map(m => 'Mesa ' + m), datasets:[{ label:'% que votó', data: mesas.map(m => { const x = r.porMesa[m]; return x.padron ? +(x.votantes*100/x.padron).toFixed(1) : 0; }), backgroundColor:'#0ea5e9', borderRadius:6, borderSkipped:'start', maxBarThickness:48 }] },
    options:{ maintainAspectRatio:false, plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label: x => { const m = mesas[x.dataIndex], d = r.porMesa[m]; return ` ${x.raw}% · ${d.votantes} de ${d.padron}`; } } } }, scales:{ y:{ ...gridY, max:100, ticks:{ callback: v => v + '%' } }, x:gridX } } });
  upsertChart('chMesas', { type:'bar',
    data:{ labels: mesas.map(m => 'Mesa ' + m), datasets: TIPOS.map(t => ({ label: tipoNombre(t), data: mesas.map(m => r.porMesa[m][t]), backgroundColor: COL[t], borderColor:'#fff', borderWidth:{ top:2 }, borderRadius:4, borderSkipped:false, maxBarThickness:70 })) },
    options:{ maintainAspectRatio:false, interaction:{ mode:'index', intersect:false }, plugins:{ legend:{ position:'top' } }, scales:{ x:{ ...gridX, stacked:true }, y:{ ...gridY, stacked:true } } } });
  lineaHoras('chHoras', r.porHora);

  const row = (label, x, cls='') => `<tr class="${cls}"><td>${label}</td><td>${x.c1}</td><td>${x.c2}</td><td>${x.blanco}</td><td>${x.viciado}</td><td>${emit(x)}</td><td>${x.c1+x.c2}</td><td>${x.votantes}/${x.padron}</td></tr>`;
  const head = `<thead><tr><th>Mesa</th><th>${esc(CFG.c1.nombre)}</th><th>${esc(CFG.c2.nombre)}</th><th>Blanco</th><th>Viciado</th><th>Emitidos</th><th>Válidos</th><th>Votaron</th></tr></thead>`;
  $('#mesaTable').innerHTML = head + '<tbody>' + mesas.map(m => row('Mesa ' + m, r.porMesa[m])).join('') + row('TOTAL', tot, 'total') + '</tbody>';

  // reportes recibidos
  const reps = r.reportes || {};
  $('#reports').innerHTML = mesas.map(m => {
    const rp = reps[m], live = r.porMesa[m];
    if (!rp) return `<div class="glass rep"><h5><span>Mesa ${m}</span></h5><div class="st pend">○ Reporte pendiente</div><div class="row"><span>En vivo</span><span>${emit(live)} votos</span></div><div class="row"><span>Votaron</span><span>${live.votantes}/${live.padron}</span></div></div>`;
    const nuevos = emit(live) - emit(rp);
    return `<div class="glass rep ${nuevos > 0 ? 'old' : 'ok'}"><h5><span>Mesa ${m}</span></h5>
      <div class="st">${nuevos > 0 ? '⚠ ' + nuevos + ' voto(s) después del reporte' : '✔ Reporte recibido'} · ${esc(horaCorta(rp.hora))}</div>
      <div class="row"><span>${esc(CFG.c1.nombre)}</span><span>${rp.c1}</span></div><div class="row"><span>${esc(CFG.c2.nombre)}</span><span>${rp.c2}</span></div>
      <div class="row"><span>En blanco</span><span>${rp.blanco}</span></div><div class="row"><span>Viciados</span><span>${rp.viciado}</span></div>
      <div class="row"><span>Votaron</span><span>${rp.votantes}/${rp.padron}</span></div></div>`;
  }).join('');
  const recibidos = mesas.filter(m => reps[m]);
  const totRep = sum(Object.fromEntries(recibidos.map(m => [m, reps[m]])));
  $('#repTable').innerHTML = head + '<tbody>' + mesas.map(m => reps[m] ? row(`Mesa ${m} · ${horaCorta(reps[m].hora)}`, reps[m]) : `<tr><td>Mesa ${m}</td><td colspan="7" style="text-align:center;color:var(--mute)">Pendiente</td></tr>`).join('')
    + row(`TOTAL REPORTADO (${recibidos.length}/${mesas.length} mesas)`, totRep, 'total') + '</tbody>';

  // votantes
  const f = $('#votFilter'); const cur = f.value || 'all';
  f.innerHTML = '<option value="all">Todas las mesas</option>' + mesas.map(m => `<option value="${m}">Mesa ${m}</option>`).join('');
  f.value = cur; renderVotantes();
  $('#padGrid').innerHTML = mesas.map(m => `<div class="glass mg"><div class="k">MESA ${m}</div><div class="v">${r.porMesa[m].padron}</div><div class="small">estudiantes</div></div>`).join('');
  renderPadron();
  $('#upd').textContent = `Actualizado: ${now()} · reportes recibidos: ${recibidos.length} de ${mesas.length} · se actualiza solo cada 20 s`;
}

function renderVotantes(){
  if (!S.data) return;
  const m = $('#votFilter').value; const inM = x => m === 'all' || String(x.mesa) === m;
  const vot = (S.data.votantes || []).filter(inM).sort((a,b) => String(a.hora).localeCompare(String(b.hora)));
  const ya = new Set((S.data.votantes || []).map(v => norm(v.codigo)));
  const fal = (S.data.padron || []).filter(inM).filter(p => !ya.has(norm(p.codigo)));
  $('#nVot').textContent = vot.length; $('#nFal').textContent = fal.length;
  $('#listVot').innerHTML = vot.length ? vot.map(v => `<li><span><b>${esc(v.codigo)}</b>${v.nombre ? ' · ' + esc(v.nombre) : ''}</span><span>Mesa ${esc(v.mesa)} · ${esc(horaCorta(v.hora))}</span></li>`).join('') : '<div class="empty">Nadie ha votado todavía</div>';
  $('#listFal').innerHTML = fal.length ? fal.map(p => `<li><span><b>${esc(p.codigo)}</b>${p.nombre ? ' · ' + esc(p.nombre) : ''}</span><span>Mesa ${esc(p.mesa)}</span></li>`).join('') : '<div class="empty">Todos ya votaron</div>';
}
$('#votFilter').onchange = renderVotantes;

/* padrón: los códigos se asignan automáticamente */
function fillPadControls(){
  const ms = Array.from({length:CFG.numMesas}, (_,i) => i+1);
  const pm = $('#padMesa').value || 'sorteo', pf = $('#padFilter').value || 'all';
  $('#padMesa').innerHTML = '<option value="sorteo">Sorteo al azar (mezcla grados, partes iguales)</option><option value="auto">En el orden de la lista (partes iguales)</option>' + ms.map(m => `<option value="${m}">Todos a la Mesa ${m}</option>`).join('');
  $('#padFilter').innerHTML = '<option value="all">Todas las mesas</option>' + ms.map(m => `<option value="${m}">Mesa ${m}</option>`).join('');
  $('#padMesa').value = pm; $('#padFilter').value = pf;
}
function genCode(mesa, taken){
  let c; do { c = String(mesa) + String(Math.floor(Math.random()*100000)).padStart(5,'0'); } while (taken.has(c));
  taken.add(c); return c;
}
const padSel = () => { const f = $('#padFilter').value; return (S.data.padron || []).filter(p => f === 'all' || String(p.mesa) === f); };
function renderPadron(){
  if (!S.data) return; fillPadControls();
  const ya = new Set((S.data.votantes || []).map(v => norm(v.codigo)));
  const list = padSel().slice().sort((a,b) => a.mesa - b.mesa || String(a.nombre).localeCompare(String(b.nombre), 'es'));
  $('#padTable').innerHTML = '<thead><tr><th>Código</th><th>DNI</th><th>Nombre</th><th>Grado y sección</th><th>Mesa</th><th>Estado</th><th></th></tr></thead><tbody>' +
    (list.length ? list.map(p => { const v = ya.has(norm(p.codigo)); return `<tr><td>${esc(p.codigo)}</td><td>${esc(p.dni||'')}</td><td style="font-family:'Exo 2'">${esc(p.nombre)}</td><td style="font-family:'Exo 2'">${esc([p.grado,p.seccion].filter(Boolean).join(' '))}</td><td>Mesa ${esc(p.mesa)}</td><td><span class="pill ${v?'si':'no'}">${v?'Ya votó':'Pendiente'}</span></td><td>${v ? '' : `<button class="xbtn" data-quitar="${esc(p.codigo)}" title="Quitar del padrón">✕</button>`}</td></tr>`; }).join('')
      : '<tr><td colspan="7" class="empty" style="text-align:center">Aún no hay estudiantes. Agrégalos arriba.</td></tr>') + '</tbody>';
  $('#padInfo').textContent = `${(S.data.padron||[]).length} estudiantes en el padrón`;
}
$('#padFilter').onchange = renderPadron;
const padPorMesa = () => { const f = $('#padFilter').value, o = {}; for (let m=1;m<=CFG.numMesas;m++) if (f === 'all' || String(m) === f) o[m] = (S.data.padron||[]).filter(p => Number(p.mesa) === m); return o; };
$('#btnPadPrintList').onclick = () => { if (S.data) imprimirPadron(padPorMesa()); };
$('#btnPadXls').onclick = () => { if (S.data) descargarPadronExcel(padPorMesa(), $('#padFilter').value === 'all' ? 'Padron_todas_las_mesas.xlsx' : `Padron_Mesa_${$('#padFilter').value}.xlsx`); };
async function guardarLista(filas, okMsg){
  await api('guardarPadron', { codigo:S.secret, filas: filas.map(f => ({ codigo:f.codigo, nombre:f.nombre, mesa:f.mesa, dni:f.dni||'', grado:f.grado||'', seccion:f.seccion||'' })) });
  toast(okMsg); await refresh();
}
/* convierte líneas pegadas en [{nombre, mesa}] */
function leerLineas(lines){
  const N = CFG.numMesas, out = [];
  for (const l of lines){
    const parts = l.split(/[;\t]|,(?=\s*\d+\s*$)/).map(x => x.trim()).filter(Boolean);
    let nombre, mesa = null; const last = Number(parts[parts.length-1]);
    if (parts.length >= 2 && Number.isInteger(last) && last >= 1 && last <= N){ mesa = last; nombre = parts.slice(0,-1).join(' '); }
    else nombre = parts.join(' ');
    nombre = nombre.replace(/\s+/g,' ').slice(0,80);
    if (!nombre || /^\d+$/.test(nombre)) throw new Error(`Revisa la línea "${l.slice(0,40)}": falta el nombre.`);
    out.push({ nombre, mesa });
  }
  return out;
}
/* lector de CSV con comillas (exportado de Supabase o Excel) */
function parseCSV(txt){
  txt = txt.replace(/^﻿/, ''); const sep = (txt.split('\n')[0].match(/;/g)||[]).length > (txt.split('\n')[0].match(/,/g)||[]).length ? ';' : ',';
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < txt.length; i++){
    const c = txt[i];
    if (q){ if (c === '"'){ if (txt[i+1] === '"'){ f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === sep){ row.push(f); f = ''; }
    else if (c === '\n' || c === '\r'){ if (c === '\r' && txt[i+1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length){ row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
function leerCSV(txt){
  const rows = parseCSV(txt); if (!rows.length) throw new Error('El archivo está vacío.');
  const h = rows[0].map(x => x.trim().toLowerCase());
  const col = re => h.findIndex(x => re.test(x));
  let iN = col(/nombre|apellido|estudiante|alumno/), iG = col(/grado/), iS = col(/secci/), iM = col(/^mesa$/), iD = col(/dni|documento/), iC = col(/^c[oó]digo/);
  let data = rows.slice(1);
  if (iN < 0){ data = rows; iN = rows[0].findIndex(x => x.trim() && !/^\d+$/.test(x.trim())); iG = iS = iM = iD = iC = -1; }
  if (iN < 0) throw new Error('No encontré la columna de nombres en el archivo.');
  return data.map(r => {
    const v = i => i >= 0 ? String(r[i]||'').trim() : '';
    const nombre = v(iN).replace(/\s+/g,' ').slice(0,80);
    const m = iM >= 0 ? Number(r[iM]) : NaN;
    return { nombre, dni: v(iD), grado: v(iG), seccion: v(iS), codigo: norm(v(iC)), mesa: Number.isInteger(m) && m >= 1 && m <= CFG.numMesas ? m : null };
  }).filter(x => x.nombre && !/^\d+$/.test(x.nombre));
}
/* asigna mesa (sorteo / orden / fija) y código único, y guarda */
async function asignar(leidos){
  if (!S.data) return;
  if (!leidos.length){ toast('No hay estudiantes para agregar.'); return; }
  const reemplazar = $('#padReplace').checked;
  if (reemplazar && (S.data.votantes||[]).length){ toast('Ya hay estudiantes que votaron: no se puede borrar el padrón. Desmarca la casilla para solo agregar.'); return; }
  const N = CFG.numMesas, base = reemplazar ? [] : (S.data.padron || []).map(p => ({ ...p }));
  const taken = new Set(base.map(p => norm(p.codigo)).concat((S.data.votantes||[]).map(v => norm(v.codigo))));
  const cuenta = {}; for (let m=1;m<=N;m++) cuenta[m] = 0; base.forEach(p => { if (cuenta[p.mesa] !== undefined) cuenta[p.mesa]++; });
  const sel = $('#padMesa').value;
  leidos.forEach(x => { if (!x.mesa && /^\d+$/.test(sel)) x.mesa = Number(sel); if (x.mesa) cuenta[x.mesa]++; });
  let libres = leidos.filter(x => !x.mesa);
  if (sel === 'sorteo'){ // barajado al azar (Fisher-Yates con números aleatorios seguros)
    const rnd = n => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
    for (let i = libres.length - 1; i > 0; i--){ const j = rnd(i + 1); [libres[i], libres[j]] = [libres[j], libres[i]]; }
  }
  libres.forEach(x => { x.mesa = Object.keys(cuenta).map(Number).sort((a,b) => cuenta[a]-cuenta[b] || (sel === 'sorteo' ? Math.random()-.5 : a-b))[0]; cuenta[x.mesa]++; });
  const pedido = c => c && /^[A-Z0-9_\-]{1,30}$/.test(c) && !taken.has(c) ? (taken.add(c), c) : null;
  const nuevos = leidos.map(x => ({ codigo: pedido(x.codigo) || genCode(x.mesa, taken), nombre: x.nombre, mesa: x.mesa, dni: x.dni||'', grado: x.grado||'', seccion: x.seccion||'' }));
  const b = $('#btnPad'); b.disabled = true; b.textContent = 'Asignando códigos…';
  try {
    await guardarLista(base.concat(nuevos), `Se asignaron ${nuevos.length} códigos${sel === 'sorteo' ? ' por sorteo' : ''}. Total: ${base.length + nuevos.length} estudiantes.`);
    $('#padText').value = ''; $('#padReplace').checked = false;
  } catch(err){ toast(err.message); }
  finally { b.disabled = false; b.textContent = 'Asignar códigos y guardar'; }
}
$('#btnPad').onclick = () => {
  const lines = $('#padText').value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length){ toast('Escribe al menos un nombre, o usa "Importar archivo CSV".'); return; }
  try { asignar(leerLineas(lines)); } catch(err){ toast(err.message); }
};
$('#padCsv').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { const lista = leerCSV(await f.text()); toast(`Archivo leído: ${lista.length} estudiantes. Asignando mesas y códigos…`); await asignar(lista); }
  catch(err){ toast(err.message); }
};
$('#padTable').addEventListener('click', async e => {
  const x = e.target.closest('[data-quitar]'); if (!x || !S.data) return;
  const code = x.dataset.quitar; const p = (S.data.padron||[]).find(q => q.codigo === code);
  x.disabled = true;
  try { await guardarLista((S.data.padron||[]).filter(q => q.codigo !== code), `Se quitó a ${p ? p.nombre : code} del padrón.`); }
  catch(err){ toast(err.message); x.disabled = false; }
});
$('#btnPadCopy').onclick = () => {
  if (!S.data) return;
  const t = 'Mesa\tCódigo\tDNI\tEstudiante\tGrado\tSección\n' + padSel().slice().sort((a,b) => a.mesa-b.mesa || String(a.nombre).localeCompare(String(b.nombre),'es')).map(p => `${p.mesa}\t${p.codigo}\t${p.dni||''}\t${p.nombre}\t${p.grado||''}\t${p.seccion||''}`).join('\n');
  navigator.clipboard.writeText(t).then(() => toast('Lista copiada: pégala en Excel.'), () => toast('No se pudo copiar automáticamente.'));
};
$('#btnPadPrint').onclick = () => {
  if (!S.data) return; const list = padSel().slice().sort((a,b) => a.mesa - b.mesa || String(a.nombre).localeCompare(String(b.nombre)));
  if (!list.length){ toast('No hay estudiantes para imprimir.'); return; }
  const ins = document.querySelector('.insignia'); const img = ins ? `<img src="${ins.src}" alt="">` : '';
  $('#printArea').className = 'cards';
  $('#printArea').innerHTML = list.map(p => `<div class="tcard"><div class="top">${img}<span>${esc(CFG.titulo)}</span></div><div class="nm">${esc(p.nombre)}</div><div class="ms">${esc([p.grado,p.seccion].filter(Boolean).join(' '))}${p.grado ? ' · ' : ''}Vota en la MESA ${esc(p.mesa)}</div><div class="cd">${esc(p.codigo)}</div><div class="nt">Tu código personal. Úsalo una sola vez y no lo compartas.</div></div>`).join('');
  try { window.print(); } catch {}
  setTimeout(() => toast('Si no se abrió la ventana de impresión, abre la central desde los archivos descargados en Chrome.'), 800);
};

/* candidatos y configuración */
/* imágenes de candidatos: se reducen en el navegador para que ocupen poco */
const IMG = { c1_foto:'', c1_logo:'', c2_foto:'', c2_logo:'' };
function showSlot(k){ $('#pv_' + k).innerHTML = IMG[k] ? `<img src="${IMG[k]}" alt="">` : '<span>Sin imagen</span>'; }
function reducir(file){
  return new Promise((res, rej) => {
    const r = new FileReader(); r.onerror = () => rej(new Error('No se pudo leer la imagen'));
    r.onload = () => { const im = new Image(); im.onerror = () => rej(new Error('El archivo no es una imagen válida'));
      im.onload = () => {
        for (const [lado, q] of [[320,.85],[280,.8],[240,.75],[200,.7],[160,.6]]){
          const k = Math.min(1, lado / Math.max(im.width, im.height)); const c = document.createElement('canvas');
          c.width = Math.round(im.width*k); c.height = Math.round(im.height*k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          let url = c.toDataURL('image/webp', q); if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/png');
          if (url.length < 45000) return res(url);
        }
        rej(new Error('La imagen es demasiado grande, prueba con otra.'));
      }; im.src = r.result; };
    r.readAsDataURL(file);
  });
}
document.addEventListener('change', async e => {
  const inp = e.target.closest('input[data-slot]'); if (!inp || !inp.files[0]) return;
  try { IMG[inp.dataset.slot] = await reducir(inp.files[0]); showSlot(inp.dataset.slot); toast('Imagen lista. Toca "Guardar cambios" para enviarla a las tablets.'); }
  catch(err){ toast(err.message); } finally { inp.value = ''; }
});
document.addEventListener('click', e => { const b = e.target.closest('[data-quitar-img]'); if (!b) return; IMG[b.dataset.quitarImg] = ''; showSlot(b.dataset.quitarImg); });

function fillCfg(){
  IMG.c1_foto = CFG.c1.foto || ''; IMG.c1_logo = CFG.c1.logo || ''; IMG.c2_foto = CFG.c2.foto || ''; IMG.c2_logo = CFG.c2.logo || '';
  Object.keys(IMG).forEach(showSlot);
  $('#cfTitulo').value = CFG.titulo || ''; $('#cfColegio').value = CFG.colegio || '';
  $('#cfN1').value = CFG.c1.nombre || ''; $('#cfL1').value = CFG.c1.lema || '';
  $('#cfN2').value = CFG.c2.nombre || ''; $('#cfL2').value = CFG.c2.lema || '';
  setAbierta(CFG.abierta !== false);
}
function setAbierta(on){ $('#cfAbierta').classList.toggle('on', on); $('#cfAbiertaTxt').textContent = on ? 'Votación abierta' : 'Votación cerrada (las tablets no aceptan votos)'; }
$('#cfAbierta').onclick = () => setAbierta(!$('#cfAbierta').classList.contains('on'));
$('#cfAbierta').onkeydown = e => { if (e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); $('#cfAbierta').click(); } };
$('#btnCfg').onclick = async () => {
  const config = { titulo:$('#cfTitulo').value, colegio:$('#cfColegio').value, c1_nombre:$('#cfN1').value, c1_lema:$('#cfL1').value, c2_nombre:$('#cfN2').value, c2_lema:$('#cfL2').value, ...IMG, abierta:$('#cfAbierta').classList.contains('on') };
  if (!config.c1_nombre.trim() || !config.c2_nombre.trim()){ toast('Escribe el nombre de los dos candidatos.'); return; }
  const b = $('#btnCfg'); b.disabled = true; b.textContent = 'Guardando…';
  try {
    const c = await api('guardarConfig', { codigo:S.secret, config }); CFG = { ...CFG, ...c };
    $('#hTitle').textContent = CFG.titulo; $('#hSchool').textContent = CFG.colegio;
    fillCfg(); toast('Cambios guardados. Ya llegan a todas las mesas.'); if (S.data) render(S.data);
  } catch(err){ toast(err.message); }
  finally { b.disabled = false; b.textContent = 'Guardar cambios'; }
};

/* códigos de acceso de las mesas */
async function loadPins(){
  try {
    const r = await api('verPins', { codigo:S.secret });
    $('#pinRows').innerHTML = Object.keys(r.pins).map(m => `<tr><td>Mesa ${m}</td><td><input data-m="${m}" data-t="tablet" maxlength="12" value="${esc(r.pins[m].tablet)}" aria-label="PIN de la tablet de la mesa ${m}"></td><td><input data-m="${m}" data-t="conteo" maxlength="12" value="${esc(r.pins[m].conteo)}" aria-label="PIN de conteo de la mesa ${m}"></td></tr>`).join('');
  } catch(err){ toast(err.message); }
}
$('#btnPinsGen').onclick = () => $$('#pinRows input').forEach(i => { i.value = String(Math.floor(100000 + Math.random()*900000)); });
$('#btnPins').onclick = async () => {
  const pins = {};
  for (const i of $$('#pinRows input')){
    const v = i.value.trim();
    if (!/^[A-Za-z0-9]{4,12}$/.test(v)){ i.focus(); toast(`Mesa ${i.dataset.m}: cada PIN debe tener de 4 a 12 letras o números.`); return; }
    (pins[i.dataset.m] = pins[i.dataset.m] || {})[i.dataset.t] = v;
  }
  const b = $('#btnPins'); b.disabled = true; b.textContent = 'Guardando…';
  try { await api('guardarPins', { codigo:S.secret, pins }); toast('Códigos guardados. Entrega los nuevos PIN a cada mesa.'); await loadPins(); }
  catch(err){ toast(err.message); }
  finally { b.disabled = false; b.textContent = 'Guardar códigos'; }
};

/* borrar datos de prueba */
$('#btnReset').onclick = () => {
  const d = S.data || {}; const v = TIPOS.reduce((a,t) => a + Object.values(d.porMesa||{}).reduce((x,m) => x + m[t], 0), 0);
  $('#rstText').innerHTML = `Se borrarán <b>${v} votos</b>, <b>${(d.votantes||[]).length} estudiantes que votaron</b> y los reportes de las mesas` + ($('#rstPadron').checked ? `, además del <b>padrón completo (${(d.padron||[]).length} estudiantes y sus códigos)</b>` : '') + '. No se puede deshacer. Escribe <b>BORRAR</b> para confirmar.';
  $('#rstIn').value = ''; $('#rstMsg').textContent = ''; modal('#mReset', true); setTimeout(()=>$('#rstIn').focus(), 60);
};
$('#btnResetGo').onclick = async () => {
  if ($('#rstIn').value.trim().toUpperCase() !== 'BORRAR'){ $('#rstMsg').textContent = 'Escribe BORRAR para confirmar.'; return; }
  const b = $('#btnResetGo'); b.disabled = true; b.textContent = 'Borrando…';
  try { await api('reiniciar', { codigo:S.secret, padron:$('#rstPadron').checked }); modal('#mReset', false); $('#rstPadron').checked = false; toast('Datos de prueba borrados. Todo quedó en cero.'); await refresh(); }
  catch(err){ $('#rstMsg').textContent = err.message; }
  finally { b.disabled = false; b.textContent = 'Sí, borrar'; }
};

/* acta general */
$('#btnCopy').onclick = () => {
  if (!S.data) return; const pm = S.data.porMesa, reps = S.data.reportes || {};
  let t = actaTexto('ACTA DE CÓMPUTO GENERAL', sum(pm)) + '\n\nDETALLE POR MESA';
  Object.keys(pm).forEach(m => { const x = pm[m]; t += `\nMesa ${m}: ${CFG.c1.nombre} ${x.c1} · ${CFG.c2.nombre} ${x.c2} · Blanco ${x.blanco} · Viciado ${x.viciado} · Votaron ${x.votantes}/${x.padron} · Reporte: ${reps[m] ? horaCorta(reps[m].hora) : 'pendiente'}`; });
  copy(t);
};

init();
})();
