#!/usr/bin/env python3
"""Arma la app de terreno de Nicolás leyendo el array CLIENTS del panel.

La lista de clientes se extrae del panel en cada corrida, a propósito: la primera versión
la leía de un JSON aparte y ese archivo se quedó viejo — dos clientes nuevos de Gorbea
entraron al panel y la app siguió mostrando 6 donde había 8. Una sola fuente, un solo paso.

    python build_ruta.py [Panel_Control_DRIVOLT.html]
"""
import io, json, sys, urllib.parse

PANEL = sys.argv[1] if len(sys.argv) > 1 else 'Panel_Control_DRIVOLT.html'

ACENTOS = {'Vilcun': 'Vilcún', 'Pucon': 'Pucón', 'Curacautin': 'Curacautín',
           'Traiguen': 'Traiguén', 'Puren': 'Purén', 'Tolten': 'Toltén',
           'Pitrufquen': 'Pitrufquén', 'Cholchol': 'Chol Chol',
           'Los Angeles': 'Los Ángeles', 'Vina Del Mar': 'Viña del Mar'}

RUTAS = [('R1', 'Sur cercano', ['Padre Las Casas', 'Freire', 'Pitrufquen', 'Gorbea'], 96),
         ('R2', 'Sur lejano', ['Loncoche', 'Lanco', 'Panguipulli'], 235),
         ('R3', 'Costa sur', ['Teodoro Schmidt', 'Tolten'], 187),
         ('R4', 'Costa poniente', ['Carahue', 'Saavedra'], 169),
         ('R5', 'Chol Chol', ['Cholchol', 'Galvarino', 'Nueva Imperial'], 122),
         ('R6', 'Malleco poniente',
          ['Traiguen', 'Lumaco', 'Puren', 'Los Sauces', 'Angol'], 278),
         ('R7', 'Lagos', ['Villarrica', 'Pucon', 'Curarrehue'], 292),
         ('R8', 'Cordillera', ['Vilcun', 'Cunco', 'Melipeuco'], 194),
         ('R9', 'Norte Ruta 5',
          ['Perquenco', 'Victoria', 'Ercilla', 'Collipulli', 'Renaico'], 205),
         ('R10', 'Lautaro y Curacautín', ['Lautaro', 'Curacautin'], 170),
         ('R11', 'Temuco urbano', ['Temuco'], 35)]


def clientes_del_panel(html):
    a = html.find('const CLIENTS')
    a = html.find('[', a)
    d = 0
    for i in range(a, len(html)):
        if html[i] == '[':
            d += 1
        elif html[i] == ']':
            d -= 1
            if d == 0:
                return json.loads(html[a:i + 1])
    sys.exit('no se encontró el array CLIENTS en ' + PANEL)


def maps(direccion, comuna):
    if direccion in ('', '-', 'S/D', None) or comuna in ('', '-', 'Sin dirección', None):
        return ''
    q = urllib.parse.quote('%s, %s, Chile' % (direccion, ACENTOS.get(comuna, comuna)), safe='')
    return 'https://www.google.com/maps/search/?api=1&query=' + q


def datos():
    html = io.open(PANEL, encoding='utf-8').read()
    cl = []
    for c in clientes_del_panel(html):
        cl.append({'id': c[0], 'n': c[1], 'k': ACENTOS.get(c[10], c[10]), 'kr': c[10],
                   'd': '' if c[11] in ('S/D', '-', '') else c[11],
                   'm': maps(c[11], c[10]), 'a': 1 if c[8] == 'Activo' else 0,
                   'u': c[7] if c[7] not in ('-', '') else '',
                   'v': int(str(c[2]).replace('$', '').replace('.', '') or 0),
                   'dd': c[9] if isinstance(c[9], int) else 0})
    rutas = [{'id': r, 'n': n, 'km': km,
              'comunas': [ACENTOS.get(x, x) for x in cs], 'ck': cs} for r, n, cs, km in RUTAS]
    en_ruta = {k for _, _, cs, _ in RUTAS for k in cs}
    fuera = sorted({c['kr'] for c in cl if c['kr'] not in en_ruta})
    if fuera:
        rutas.append({'id': 'RX', 'n': 'Fuera de ruta', 'km': 0,
                      'comunas': [ACENTOS.get(x, x) for x in fuera], 'ck': fuera})
    huerfanas = [k for k in fuera]
    if huerfanas:
        print('aviso · comunas sin ruta asignada:', ', '.join(huerfanas))
    print('%d clientes · %d comunas · %d rutas' %
          (len(cl), len({c['kr'] for c in cl}), len(rutas)))
    return json.dumps({'rutas': rutas, 'clientes': cl}, ensure_ascii=False,
                      separators=(',', ':'))


DATOS = datos()

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

/* ---------- selector de comunas ---------- */
.sel{margin-top:9px}
.sel-head{width:100%;display:flex;align-items:center;gap:8px;padding:9px 11px;
  border:1px solid var(--line);border-radius:var(--r);background:var(--surface);
  cursor:pointer;text-align:left}
.sel-head .txt{flex:1;min-width:0;font-size:14px;font-weight:600;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap}
.sel-head .txt.vacio{font-weight:400;color:var(--muted)}
.sel-head .n{font-size:11.5px;color:var(--muted);white-space:nowrap}
.sel-head .chev{font-size:10px;color:var(--muted);transition:transform .15s}
.sel[data-open="1"] .sel-head .chev{transform:rotate(180deg)}
.sel-panel{margin-top:7px;padding:10px 11px;border:1px solid var(--line);
  border-radius:var(--r);background:var(--surface)}
.sel-panel h4{margin:0 0 6px;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;
  color:var(--muted);font-weight:600}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chips button{padding:6px 10px;border:1px solid var(--line);border-radius:99px;
  background:var(--surface2);font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap}
.chips button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);
  color:var(--accent-ink);font-weight:600}
.chips button .cn{opacity:.6;font-size:11px;margin-left:3px}
.chips.rutas button{font-size:11.5px;padding:5px 9px}
.sel-panel .sep{height:1px;background:var(--line);margin:10px -11px}
.sel-panel .limpiar{background:none;border:0;color:var(--accent);font-size:12px;
  font-weight:600;cursor:pointer;padding:6px 0 0}

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
const KR = [...new Set(D.clientes.map(c => c.kr))];
const NOMBRE = {}; D.clientes.forEach(c => { NOMBRE[c.kr] = c.k; });
const CUANTOS = {}; KR.forEach(k => { CUANTOS[k] = D.clientes.filter(c => c.kr === k).length; });

let db = null, unsubV = null, unsubF = null, pend = 0, prefRef = null;
const st = { vista:'ruta', comunas:[], fecha:hoyISO(), visitas:{}, facturas:[], q:'',
             abierto:false, tocado:false };
// Orden canónico: como van quedando en el recorrido, no alfabético.
const ORDEN = D.rutas.flatMap(r => r.ck);
const ordenar = ks => ks.slice().sort((a, b) => {
  const ia = ORDEN.indexOf(a), ib = ORDEN.indexOf(b);
  return (ia < 0 ? 1e6 : ia) - (ib < 0 ? 1e6 : ib);
});
st.comunas = ordenar(D.rutas[0].ck.filter(k => D.clientes.some(c => c.kr === k)));
try {
  const g = JSON.parse(localStorage.getItem('drivolt.comunas') || 'null');
  if (Array.isArray(g) && g.length) st.comunas = ordenar(g);
} catch (e) {}
// El teléfono es el lugar frágil: dentro del visor, y sobre todo en iPhone por el acceso
// directo, el almacenamiento local se pierde entre visitas. Se escribe en los dos lados —
// el local para que la página abra al instante, la base de datos para que sobreviva— y en
// un rincón privado del vendedor, que nadie más ve.
let t_pref;
function guardarSel(){
  st.tocado = true;
  try { localStorage.setItem('drivolt.comunas', JSON.stringify(st.comunas)); } catch (e) {}
  if (!prefRef) return;
  clearTimeout(t_pref);
  const copia = st.comunas.slice();
  t_pref = setTimeout(() => {
    prefRef.set({ comunas: copia, ts: new Date().toISOString() }).catch(() => {});
  }, 400);
}

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
    const n = D.clientes.filter(x => st.comunas.includes(x.kr)).length;
    c.innerHTML = `<div class="pickers">
      <label><span>Fecha de la corrida</span><input type="date" id="selFecha" value="${st.fecha}"></label>
    </div>
    <div class="sel" data-open="${st.abierto ? 1 : 0}">
      <button type="button" class="sel-head" id="btnSel" aria-expanded="${st.abierto}">
        <span class="txt${st.comunas.length ? '' : ' vacio'}">${st.comunas.length
          ? esc(st.comunas.map(k => NOMBRE[k] || k).join(' · ')) : 'Elige dónde vas hoy'}</span>
        <span class="n">${n} ${n === 1 ? 'cliente' : 'clientes'}</span>
        <span class="chev">▼</span>
      </button>
      <div class="sel-panel" id="panelSel"${st.abierto ? '' : ' hidden'}>
        <h4>Comunas — toca las que vas a recorrer</h4>
        <div class="chips" id="chipsK">${ordenar(KR).map(k =>
          `<button type="button" data-k="${esc(k)}" aria-pressed="${st.comunas.includes(k)}">${
            esc(NOMBRE[k] || k)}<span class="cn">${CUANTOS[k]}</span></button>`).join('')}</div>
        <div class="sep"></div>
        <h4>O carga una ruta entera</h4>
        <div class="chips rutas" id="chipsR">${D.rutas.filter(r => r.id !== 'RX').map(r =>
          `<button type="button" data-r="${r.id}">${esc(r.id)} · ${esc(r.n)}</button>`).join('')}</div>
        <button type="button" class="limpiar" id="limpiarSel">Quitar todas</button>
      </div>
    </div>
    <div class="progress"><div class="bar"><i id="barra" style="width:0%"></i></div><b id="avance">0 de 0</b></div>`;
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
function gruposSel(){
  return st.comunas.map(k => {
    const ls = D.clientes.filter(c => c.kr === k).sort((a,b) => b.v - a.v);
    return ls.length ? [k, NOMBRE[k] || k, ls] : null;
  }).filter(Boolean);
}
function rutaDe(c){
  return (D.rutas.find(r => r.ck.includes(c.kr)) || {id:'—'}).id;
}
function pintarRuta(){
  const grupos = gruposSel();
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
    ? `<p class="nota">${fmtLargo(st.fecha)} · ${grupos.length === 1 ? 'una comuna' : grupos.length + ' comunas'} · marca cada cliente al salir de su puerta. Se guarda solo.</p>${html}`
    : `<div class="vacio">Toca <b>Elige dónde vas hoy</b> y marca una o varias comunas.</div>`;
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
  const ruta = c => rutaDe(c);
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
  if (e.target.closest('#btnSel')){
    st.abierto = !st.abierto; pintarCtl(); return;
  }
  const ck = e.target.closest('#chipsK button');
  if (ck){
    const k = ck.dataset.k;
    st.comunas = st.comunas.includes(k)
      ? st.comunas.filter(x => x !== k) : ordenar(st.comunas.concat(k));
    guardarSel(); pintarCtl(); pintarRuta(); return;
  }
  const cr = e.target.closest('#chipsR button');
  if (cr){
    const r = D.rutas.find(x => x.id === cr.dataset.r);
    st.comunas = ordenar(r.ck.filter(k => CUANTOS[k]));
    guardarSel(); pintarCtl(); pintarRuta(); return;
  }
  if (e.target.closest('#limpiarSel')){
    st.comunas = []; guardarSel(); pintarCtl(); pintarRuta(); return;
  }
  const bv = e.target.closest('.acts button');
  if (bv){
    const card = bv.closest('.c'), id = card.dataset.id;
    const c = D.clientes.find(x => x.id === id);
    const valor = card.dataset.v === bv.dataset.v ? '' : bv.dataset.v;
    const rutaReal = rutaDe(c);
    const obs = card.querySelector('textarea').value;
    if (valor) card.dataset.v = valor; else delete card.dataset.v;
    card.querySelector('textarea').hidden = !valor;
    const cuerpo = { fecha:st.fecha, rut:id, cliente:c.n, comuna:c.k, ruta:rutaReal,
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
      const rr = rutaDe(c);
      const cuerpo = { fecha:st.fecha, rut:id, cliente:c.n, comuna:c.k, ruta:rr,
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

  // Los ajustes viven bajo data/users/<id>, que es privado de cada quien.
  try {
    const usuario = await claude.use('user');
    const uid = usuario ? await usuario.id() : null;
    if (uid){
      prefRef = db.doc(`data/users/${uid}/ajustes`);
      const snap = await prefRef.get();
      const guardado = snap.exists ? snap.data() : null;
      if (!st.tocado && guardado && Array.isArray(guardado.comunas) && guardado.comunas.length){
        st.comunas = ordenar(guardado.comunas.filter(k => CUANTOS[k]));
        pintarCtl(); pintarRuta();
      } else if (!snap.exists && st.comunas.length){
        guardarSel();          // deja sembrada la selección con que abrió
      }
    }
  } catch (e) { /* sin ajustes guardados: queda el local */ }
}
arrancar();
</script>
'''

io.open('Ruta_Drivolt.html', 'w', encoding='utf-8').write(HTML.replace('__DATOS__', DATOS))
print('escrito · bytes', len(HTML) - 11 + len(DATOS))
