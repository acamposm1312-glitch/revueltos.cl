import json, io
DATOS = io.open('ruta_data.json', encoding='utf-8').read()

HTML = r'''<title>Ruta Drivolt</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap">
<style>
:root{
  --bg:#F3F0F0; --surface:#FFFFFF; --surface2:#FAF8F8; --ink:#1B1618; --muted:#6B6165;
  --line:#E2DBDC; --accent:#C41230; --accent-ink:#FFFFFF;
  --ok:#1F6146; --ok-bg:#E4F0EA; --warn:#8F5A0A; --warn-bg:#FBF0DD; --bad:#B0202F;
  --shadow:0 1px 2px rgba(27,22,24,.07), 0 1px 1px rgba(27,22,24,.04);
  --r:10px;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){
  color-scheme:dark;
  --bg:#141011; --surface:#1E191B; --surface2:#262022; --ink:#F3EFEF; --muted:#A2979B;
  --line:#352C2F; --accent:#FF5B73; --accent-ink:#1A0A0D;
  --ok:#5CC793; --ok-bg:#163025; --warn:#E5A84B; --warn-bg:#332512; --bad:#FF7285;
  --shadow:0 1px 2px rgba(0,0,0,.4);
}}
:root[data-theme="dark"]{
  color-scheme:dark;
  --bg:#141011; --surface:#1E191B; --surface2:#262022; --ink:#F3EFEF; --muted:#A2979B;
  --line:#352C2F; --accent:#FF5B73; --accent-ink:#1A0A0D;
  --ok:#5CC793; --ok-bg:#163025; --warn:#E5A84B; --warn-bg:#332512; --bad:#FF7285;
  --shadow:0 1px 2px rgba(0,0,0,.4);
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
  font-family:Archivo,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,sans-serif;
  font-size:15px;line-height:1.45;-webkit-text-size-adjust:100%}
h1,h2,h3{margin:0;text-wrap:balance}
a{color:inherit}
button,input,textarea,select{font:inherit;color:inherit}
.num{font-family:"IBM Plex Mono",ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums}

.wrap{max-width:580px;margin:0 auto;padding:0 16px 96px}

/* ---------- cabecera ---------- */
.top{position:sticky;top:env(safe-area-inset-top,0px);z-index:20;background:var(--bg);
  padding-block:10px 8px;border-bottom:1px solid var(--line);margin:0 -16px;padding-inline:16px}
.brand{display:flex;align-items:center;gap:9px;margin-bottom:9px}
.mark{width:22px;height:22px;border-radius:5px;background:var(--accent);color:var(--accent-ink);
  display:grid;place-items:center;font-weight:700;font-size:12px;flex-shrink:0}
.brand b{font-size:14px;font-weight:700;letter-spacing:.02em}
.brand .who{font-size:11.5px;color:var(--muted);margin-left:auto;text-align:right;line-height:1.25}
.sync{font-size:11px;color:var(--muted);display:flex;align-items:center;gap:5px;
  justify-content:flex-end}
.dot{width:7px;height:7px;border-radius:50%;background:var(--muted);flex-shrink:0}
.dot.ok{background:var(--ok)} .dot.bad{background:var(--bad)} .dot.busy{background:var(--warn)}

.pickers{display:flex;gap:8px}
.pickers label{flex:1;min-width:0;display:block}
.pickers span{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;
  color:var(--muted);margin-bottom:3px;font-weight:600}
select,input[type=date],input[type=search]{width:100%;padding:9px 10px;border:1px solid var(--line);
  border-radius:var(--r);background:var(--surface);font-size:14.5px}
select:focus-visible,input:focus-visible,textarea:focus-visible,button:focus-visible{
  outline:2px solid var(--accent);outline-offset:1px}

/* ---------- barra de avance ---------- */
.progress{display:flex;align-items:center;gap:10px;margin-top:10px}
.bar{flex:1;height:6px;border-radius:99px;background:var(--line);overflow:hidden}
.bar i{display:block;height:100%;background:var(--ok);border-radius:99px;transition:width .25s}
.progress b{font-size:12px;font-weight:600;color:var(--muted);white-space:nowrap}

/* ---------- secciones ---------- */
.comuna{display:flex;align-items:baseline;gap:8px;margin:20px 0 9px}
.comuna h2{font-size:12px;text-transform:uppercase;letter-spacing:.09em;font-weight:700}
.comuna em{font-style:normal;font-size:11.5px;color:var(--muted)}
.comuna::after{content:"";flex:1;height:1px;background:var(--line)}

.c{background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--line);
  border-radius:var(--r);box-shadow:var(--shadow);padding:12px 13px;margin-bottom:9px}
.c[data-v="si"]{border-left-color:var(--ok)}
.c[data-v="no"]{border-left-color:var(--warn)}
.c h3{font-size:15px;font-weight:600;line-height:1.25}
.c .meta{font-size:12.5px;color:var(--muted);margin:3px 0 0}
.c .meta a{color:var(--accent);text-decoration:underline;text-underline-offset:2px}
.c .stats{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}
.pill{font-size:11px;padding:2px 7px;border-radius:99px;background:var(--surface2);
  border:1px solid var(--line);color:var(--muted);white-space:nowrap}
.pill.dorm{color:var(--warn);border-color:var(--warn);background:var(--warn-bg)}
.acts{display:flex;gap:7px;margin-top:11px}
.acts button{flex:1;padding:11px 8px;border:1px solid var(--line);border-radius:var(--r);
  background:var(--surface2);font-size:13.5px;font-weight:600;cursor:pointer;
  transition:background .12s,border-color .12s}
.acts button:active{transform:translateY(1px)}
.c[data-v="si"] .acts button[data-v="si"]{background:var(--ok);border-color:var(--ok);color:#fff}
.c[data-v="no"] .acts button[data-v="no"]{background:var(--warn);border-color:var(--warn);color:#fff}
.c textarea{width:100%;margin-top:9px;padding:9px 10px;border:1px solid var(--line);
  border-radius:var(--r);background:var(--surface2);font-size:13.5px;resize:vertical;min-height:40px}

/* ---------- pagos ---------- */
.f{background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--warn);
  border-radius:var(--r);box-shadow:var(--shadow);padding:12px 13px;margin-bottom:9px}
.f.listo{border-left-color:var(--ok)}
.f-top{display:flex;align-items:baseline;gap:9px}
.f-top .folio{font-size:12px;font-weight:600;color:var(--muted);letter-spacing:.04em}
.f-top .monto{margin-left:auto;font-size:15px;font-weight:600}
.f h3{font-size:14.5px;font-weight:600;margin-top:2px;line-height:1.3}
.pagos{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:11px}
.pagos button{padding:11px 6px;border:1px solid var(--line);border-radius:var(--r);
  background:var(--surface2);font-size:13.5px;font-weight:600;cursor:pointer}
.pagos button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);
  color:var(--accent-ink)}
.extra{margin-top:9px;display:flex;gap:8px;align-items:flex-end}
.extra label{flex:1}
.extra span{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;
  color:var(--muted);margin-bottom:3px;font-weight:600}
.f textarea{width:100%;margin-top:9px;padding:9px 10px;border:1px solid var(--line);
  border-radius:var(--r);background:var(--surface2);font-size:13.5px;resize:vertical;min-height:38px}

.vacio{background:var(--surface);border:1px dashed var(--line);border-radius:var(--r);
  padding:22px 16px;text-align:center;color:var(--muted);font-size:13.5px}
.nota{font-size:12.5px;color:var(--muted);margin:0 0 12px;line-height:1.5}
.aviso{background:var(--warn-bg);border:1px solid var(--warn);border-radius:var(--r);
  padding:11px 13px;font-size:13px;color:var(--warn);margin-bottom:14px}

/* ---------- pestañas ---------- */
.tabs{position:fixed;left:0;right:0;bottom:0;z-index:30;display:flex;
  background:var(--surface);border-top:1px solid var(--line);
  padding:6px 8px calc(6px + env(safe-area-inset-bottom,0px))}
.tabs button{flex:1;padding:8px 4px;border:0;background:none;cursor:pointer;
  font-size:11.5px;font-weight:600;color:var(--muted);border-radius:8px;
  display:flex;flex-direction:column;align-items:center;gap:3px;line-height:1}
.tabs button .ic{font-size:17px;line-height:1}
.tabs button[aria-selected="true"]{color:var(--accent);background:var(--surface2)}
.badge{position:absolute;transform:translate(13px,-4px);background:var(--accent);
  color:var(--accent-ink);font-size:10px;font-weight:700;border-radius:99px;
  padding:1px 5px;min-width:16px;text-align:center}

@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
</style>

<div class="wrap">
  <div class="top">
    <div class="brand">
      <span class="mark">D</span><b>DRIVOLT</b>
      <span class="who"><span id="vistaNom">Ruta del día</span>
        <span class="sync"><span class="dot" id="dot"></span><span id="syncTxt">conectando</span></span>
      </span>
    </div>
    <div id="ctl"></div>
  </div>

  <main id="vRuta"></main>
  <main id="vPagos" hidden></main>
  <main id="vClientes" hidden></main>
</div>

<nav class="tabs" role="tablist">
  <button role="tab" data-t="ruta" aria-selected="true"><span class="ic">🚚</span>Ruta</button>
  <button role="tab" data-t="pagos" aria-selected="false"><span class="ic">💵</span>Pagos<span class="badge" id="bPagos" hidden>0</span></button>
  <button role="tab" data-t="clientes" aria-selected="false"><span class="ic">🔎</span>Clientes</button>
</nav>

<script>
const D = __DATOS__;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mon = v => '$' + Number(v).toLocaleString('es-CL');
const MES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const DIA = ['dom','lun','mar','mié','jue','vie','sáb'];
function hoyISO(){ const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset()*6e4).toISOString().slice(0,10); }
function fmt(iso){ if(!iso) return '—'; const [a,m,d] = iso.split('-'); return `${+d}-${MES[+m-1]}`; }
function fmtLargo(iso){ const [a,m,d] = iso.split('-'); const dt = new Date(+a, +m-1, +d);
  return `${DIA[dt.getDay()]} ${+d} de ${MES[+m-1]}`; }

const PAGOS = [['efectivo','Efectivo'], ['fiado','Fiado'], ['transferencia','Transferencia'], ['cheque','Cheque']];

let db = null, unsubV = null, unsubF = null, pend = 0;
const st = { vista:'ruta', ruta:'R1', fecha:hoyISO(), visitas:{}, facturas:[], q:'' };

/* ---------- estado de guardado ---------- */
let t_sync;
function sync(estado, txt){
  const d = $('#dot'); d.className = 'dot' + (estado ? ' ' + estado : '');
  $('#syncTxt').textContent = txt;
  clearTimeout(t_sync);
  if (estado === 'ok') t_sync = setTimeout(() => { $('#syncTxt').textContent = 'al día'; }, 2200);
}
async function guardar(ref, cuerpo){
  if (!db) { sync('bad', 'sin conexión'); return false; }
  sync('busy', 'guardando');
  try { await ref.set(cuerpo); sync('ok', 'guardado'); return true; }
  catch (e) { sync('bad', 'no se guardó'); return false; }
}

/* ---------- controles de la cabecera ---------- */
function pintarCtl(){
  const c = $('#ctl');
  if (st.vista === 'ruta'){
    c.innerHTML = `<div class="pickers">
      <label><span>Ruta</span><select id="selRuta">${D.rutas.map(r =>
        `<option value="${r.id}"${r.id === st.ruta ? ' selected' : ''}>${esc(r.id)} · ${esc(r.n)}</option>`).join('')}</select></label>
      <label><span>Fecha</span><input type="date" id="selFecha" value="${st.fecha}"></label>
    </div>
    <div class="progress"><div class="bar"><i id="barra" style="width:0%"></i></div><b id="avance">0 de 0</b></div>`;
    $('#selRuta').onchange = e => { st.ruta = e.target.value; pintarRuta(); };
    $('#selFecha').onchange = e => { st.fecha = e.target.value; escucharVisitas(); pintarRuta(); };
  } else if (st.vista === 'clientes'){
    c.innerHTML = `<label class="pickers"><input type="search" id="q" placeholder="Buscar cliente o comuna" value="${esc(st.q)}"></label>`;
    const q = $('#q');
    q.oninput = e => { st.q = e.target.value; pintarClientes(); };
  } else {
    c.innerHTML = '';
  }
}

/* ---------- vista: ruta ---------- */
function clientesDe(rid){
  const r = D.rutas.find(x => x.id === rid);
  const out = [];
  r.ck.forEach(k => {
    const ls = D.clientes.filter(c => c.kr === k).sort((a,b) => b.v - a.v);
    if (ls.length) out.push([k, r.comunas[r.ck.indexOf(k)] || k, ls]);
  });
  return out;
}
function pintarRuta(){
  const grupos = clientesDe(st.ruta);
  const total = grupos.reduce((n,g) => n + g[2].length, 0);
  let hechos = 0;
  const html = grupos.map(([kr, k, ls]) => {
    const filas = ls.map(c => {
      const v = st.visitas[c.id];
      if (v && v.visitado) hechos++;
      const dorm = !c.a;
      return `<article class="c" data-id="${esc(c.id)}"${v && v.visitado ? ` data-v="${v.visitado}"` : ''}>
        <h3>${esc(c.n)}</h3>
        <p class="meta">${c.m ? `<a href="${c.m}" target="_blank" rel="noopener">${esc(c.d)}</a>` : '<em>sin dirección</em>'}</p>
        <div class="stats">
          <span class="pill${dorm ? ' dorm' : ''}">${dorm ? 'Dormido' : 'Activo'} · ${c.dd} d</span>
          <span class="pill">Última ${fmt(c.u)}</span>
          <span class="pill num">${mon(c.v)}</span>
        </div>
        <div class="acts">
          <button type="button" data-v="si">Visité</button>
          <button type="button" data-v="no">No estaba</button>
        </div>
        <textarea placeholder="Observación (opcional)"${v && v.visitado ? '' : ' hidden'}>${esc(v ? (v.obs || '') : '')}</textarea>
      </article>`;
    }).join('');
    return `<div class="comuna"><h2>${esc(k)}</h2><em>${ls.length} ${ls.length === 1 ? 'cliente' : 'clientes'}</em></div>${filas}`;
  }).join('');
  $('#vRuta').innerHTML = total
    ? `<p class="nota">${fmtLargo(st.fecha)} · marca cada cliente al salir de su puerta. Se guarda solo.</p>${html}`
    : `<div class="vacio">Esta ruta no tiene clientes cargados.</div>`;
  const b = $('#barra'), a = $('#avance');
  if (b){ b.style.width = total ? (hechos / total * 100) + '%' : '0%'; a.textContent = `${hechos} de ${total}`; }
}

/* ---------- vista: pagos ---------- */
function pintarPagos(){
  const porInformar = st.facturas.filter(f => !f.pago);
  const listas = st.facturas.filter(f => f.pago);
  pend = porInformar.length;
  const b = $('#bPagos'); b.hidden = !pend; b.textContent = pend;

  const tarjeta = f => `<article class="f${f.pago ? ' listo' : ''}" data-folio="${esc(f.folio)}">
    <div class="f-top"><span class="folio num">N° ${esc(f.folio)} · ${fmt(f.fecha)}</span>
      <span class="monto num">${mon(f.monto)}</span></div>
    <h3>${esc(f.cliente)}</h3>
    <div class="pagos">${PAGOS.map(([k,n]) =>
      `<button type="button" data-p="${k}" aria-pressed="${f.pago === k}">${n}</button>`).join('')}</div>
    <div class="extra"${f.pago === 'cheque' ? '' : ' hidden'}>
      <label><span>Cheque: fecha de cobro</span><input type="date" data-campo="cheque" value="${esc(f.cheque || '')}"></label>
    </div>
    <textarea placeholder="Observación (opcional)">${esc(f.obs || '')}</textarea>
  </article>`;

  $('#vPagos').innerHTML = `
    <p class="nota">Alejandro sube las facturas del día. Marca cómo pagó cada cliente y no hace falta avisar por WhatsApp.<br>
      <b>Fiado</b> es la venta entregada a confianza, sin documento de respaldo.</p>
    <div class="comuna"><h2>Por informar</h2><em>${pend}</em></div>
    ${pend ? porInformar.map(tarjeta).join('')
           : '<div class="vacio">Nada pendiente. Cuando suban facturas nuevas aparecen acá.</div>'}
    ${listas.length ? `<div class="comuna"><h2>Ya informadas</h2><em>${listas.length}</em></div>${listas.map(tarjeta).join('')}` : ''}`;
}

/* ---------- vista: clientes ---------- */
function pintarClientes(){
  const q = st.q.trim().toLowerCase();
  const ls = (q ? D.clientes.filter(c => (c.n + ' ' + c.k).toLowerCase().includes(q)) : D.clientes)
    .slice().sort((a,b) => b.v - a.v).slice(0, 60);
  const ruta = c => (D.rutas.find(r => r.ck.includes(c.kr)) || {id:'—'}).id;
  $('#vClientes').innerHTML = `<p class="nota">${D.clientes.length} clientes en la cartera. Escribe para filtrar; se muestran los 60 más grandes de la búsqueda.</p>` +
    (ls.length ? ls.map(c => `<article class="c">
      <h3>${esc(c.n)}</h3>
      <p class="meta">${esc(c.k)} · ${ruta(c)}${c.m ? ` · <a href="${c.m}" target="_blank" rel="noopener">${esc(c.d)}</a>` : ''}</p>
      <div class="stats">
        <span class="pill${c.a ? '' : ' dorm'}">${c.a ? 'Activo' : 'Dormido'} · ${c.dd} d</span>
        <span class="pill">Última ${fmt(c.u)}</span>
        <span class="pill num">${mon(c.v)}</span>
      </div></article>`).join('')
    : '<div class="vacio">Sin resultados.</div>');
}

/* ---------- eventos ---------- */
const t_obs = {};
document.addEventListener('click', e => {
  const tab = e.target.closest('.tabs button');
  if (tab){
    st.vista = tab.dataset.t;
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b === tab));
    $('#vRuta').hidden = st.vista !== 'ruta';
    $('#vPagos').hidden = st.vista !== 'pagos';
    $('#vClientes').hidden = st.vista !== 'clientes';
    $('#vistaNom').textContent = {ruta:'Ruta del día', pagos:'Forma de pago', clientes:'Cartera'}[st.vista];
    pintarCtl();
    if (st.vista === 'clientes') pintarClientes();
    window.scrollTo(0, 0);
    return;
  }
  const bv = e.target.closest('.acts button');
  if (bv){
    const card = bv.closest('.c'), id = card.dataset.id;
    const c = D.clientes.find(x => x.id === id);
    const valor = card.dataset.v === bv.dataset.v ? '' : bv.dataset.v;
    const obs = card.querySelector('textarea').value;
    if (valor) card.dataset.v = valor; else delete card.dataset.v;
    card.querySelector('textarea').hidden = !valor;
    const cuerpo = { fecha:st.fecha, rut:id, cliente:c.n, comuna:c.k, ruta:st.ruta,
                     visitado:valor, obs, ts:new Date().toISOString() };
    st.visitas[id] = cuerpo;
    if (db) guardar(db.doc(`visitas/${st.fecha}__${id}`), cuerpo);
    pintarRuta();
    return;
  }
  const bp = e.target.closest('.pagos button');
  if (bp){
    const card = bp.closest('.f'), folio = card.dataset.folio;
    const f = st.facturas.find(x => String(x.folio) === folio);
    if (!f) return;
    f.pago = f.pago === bp.dataset.p ? '' : bp.dataset.p;
    f.ts_pago = new Date().toISOString();
    if (db) guardar(db.doc(`facturas/${folio}`), {...f});
    pintarPagos();
  }
});
document.addEventListener('input', e => {
  const ta = e.target.closest('.c textarea');
  if (ta){
    const card = ta.closest('.c'), id = card.dataset.id;
    if (!id) return;
    clearTimeout(t_obs[id]);
    t_obs[id] = setTimeout(() => {
      const c = D.clientes.find(x => x.id === id);
      const cuerpo = { fecha:st.fecha, rut:id, cliente:c.n, comuna:c.k, ruta:st.ruta,
                       visitado:card.dataset.v || '', obs:ta.value, ts:new Date().toISOString() };
      st.visitas[id] = cuerpo;
      if (db) guardar(db.doc(`visitas/${st.fecha}__${id}`), cuerpo);
    }, 700);
    return;
  }
  const tf = e.target.closest('.f textarea, .f input[data-campo]');
  if (tf){
    const card = tf.closest('.f'), folio = card.dataset.folio;
    const f = st.facturas.find(x => String(x.folio) === folio);
    if (!f) return;
    if (tf.tagName === 'TEXTAREA') f.obs = tf.value; else f.cheque = tf.value;
    clearTimeout(t_obs['f' + folio]);
    t_obs['f' + folio] = setTimeout(() => { if (db) guardar(db.doc(`facturas/${folio}`), {...f}); }, 700);
  }
});

/* ---------- datos vivos ---------- */
function escucharVisitas(){
  if (unsubV) unsubV();
  st.visitas = {};
  if (!db) return;
  unsubV = db.collection('visitas').where('fecha', '==', st.fecha).onSnapshot(
    snap => {
      st.visitas = {};
      snap.docs.forEach(d => { const x = d.data(); if (x && x.rut) st.visitas[x.rut] = x; });
      if (st.vista === 'ruta') pintarRuta();
    },
    () => sync('bad', 'sin conexión'));
}
function escucharFacturas(){
  if (!db) return;
  unsubF = db.collection('facturas').orderBy('folio', 'desc').limit(80).onSnapshot(
    snap => {
      st.facturas = snap.docs.map(d => ({...d.data()}));
      pintarPagos();
    },
    () => sync('bad', 'sin conexión'));
}

async function arrancar(){
  pintarCtl(); pintarRuta(); pintarPagos(); pintarClientes();
  db = await (window.claude?.use ? window.claude.use('db') : Promise.resolve(null));
  if (!db){
    sync('bad', 'sin guardar');
    $('#vRuta').insertAdjacentHTML('afterbegin',
      '<div class="aviso">No se pudo conectar con el servidor: puedes ver la ruta, pero las marcas no se van a guardar. Vuelve a abrir el enlace cuando tengas señal.</div>');
    return;
  }
  sync('ok', 'al día');
  escucharVisitas(); escucharFacturas();
}
arrancar();
</script>
'''

io.open('Ruta_Drivolt.html', 'w', encoding='utf-8').write(HTML.replace('__DATOS__', DATOS))
print('escrito · bytes', len(HTML) - 11 + len(DATOS))
