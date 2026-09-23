import config from '../config.js';
import { ETAPAS } from '../core/pipeline.js';
import { resumenPorEtapa, listar } from '../core/leads.js';
import { ETAPAS as TODAS_LAS_ETAPAS } from '../core/pipeline.js';
import { colaDeHoy, tareasPendientes } from '../core/tareas.js';
import { listarPublicaciones } from '../core/contenido.js';
import { formatearTelefono } from '../core/telefono.js';
import { clp } from '../core/catalogo.js';
import { cabeceraHtml } from './comunes.js';

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const ESTILOS = `
:root{--fondo:#f6f7f9;--tarjeta:#fff;--texto:#16191d;--suave:#5f6975;--borde:#e3e6ea;--acento:#075e54;--acento2:#25d366;--alerta:#b42318}
@media(prefers-color-scheme:dark){:root{--fondo:#0f1115;--tarjeta:#181b21;--texto:#e8eaed;--suave:#9aa4b2;--borde:#272b33;--acento:#25d366;--acento2:#25d366;--alerta:#ff6b6b}}
*{box-sizing:border-box}
body{margin:0;background:var(--fondo);color:var(--texto);font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:0 0 48px}
header{background:var(--acento);color:#fff;padding:20px 16px calc(18px + env(safe-area-inset-bottom,0px));padding-top:calc(20px + env(safe-area-inset-top,0px))}
header h1{margin:0;font-size:19px;letter-spacing:.3px}
header p{margin:3px 0 0;opacity:.85;font-size:13px}
.titulares{display:flex;gap:10px;margin-top:16px}
.titular{flex:1;background:rgba(255,255,255,.14);border-radius:10px;padding:10px 12px}
.titular b{display:block;font-size:24px;line-height:1.1}
.titular span{font-size:11px;opacity:.9;text-transform:uppercase;letter-spacing:.5px}
main{max-width:860px;margin:0 auto;padding:16px}
h2{font-size:15px;text-transform:uppercase;letter-spacing:.8px;color:var(--suave);margin:28px 0 12px}
.tarjeta{background:var(--tarjeta);border:1px solid var(--borde);border-radius:12px;padding:14px;margin-bottom:12px}
.fila{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}
.nombre{font-weight:600}
.meta{color:var(--suave);font-size:13px}
.etiqueta{display:inline-block;background:var(--fondo);border:1px solid var(--borde);border-radius:999px;padding:2px 10px;font-size:12px;color:var(--suave)}
pre{white-space:pre-wrap;word-break:break-word;background:var(--fondo);border:1px solid var(--borde);border-radius:8px;padding:10px;font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;margin:10px 0;max-height:190px;overflow:auto}
.acciones{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
a.boton,button{border:0;border-radius:9px;padding:10px 14px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block}
a.boton.hecha{background:var(--borde);color:var(--texto)}
a.wa{background:var(--acento2);color:#04140d}
button.hecha{background:var(--borde);color:var(--texto)}
button.borrar{background:transparent;color:var(--alerta);border:1px solid var(--borde)}
table{width:100%;border-collapse:collapse;font-size:14px}
td,th{padding:8px 6px;border-bottom:1px solid var(--borde);text-align:left;vertical-align:top}
th{color:var(--suave);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.5px}
.rejilla{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
.kpi{background:var(--tarjeta);border:1px solid var(--borde);border-radius:10px;padding:10px 12px}
.kpi b{display:block;font-size:22px}
.kpi span{color:var(--suave);font-size:12px}
.vacio{color:var(--suave);padding:20px;text-align:center;border:1px dashed var(--borde);border-radius:12px}
.aviso{background:var(--tarjeta);border:1px solid var(--acento);border-left-width:4px;border-radius:10px;padding:12px 14px;margin:0 0 14px;font-size:14px}
form{display:inline}
`;

function tarjetaTarea(t, token) {
  const tel = formatearTelefono(t.lead.telefono);
  return `
  <article class="tarjeta">
    <div class="fila">
      <a class="nombre" href="/lead/${t.leadId}${token ? `?token=${encodeURIComponent(token)}` : ''}"
         style="color:var(--acento);text-decoration:none">${esc(t.lead.nombre || tel || t.lead.email || 'Sin nombre')}</a>
      <span class="etiqueta">${esc(t.lead.etapa)}</span>
    </div>
    <div class="meta">${esc(t.titulo)}</div>
    <div class="meta">${esc([tel, t.lead.email, t.lead.rubro].filter(Boolean).join(' · '))}</div>
    ${t.mensaje ? `<pre>${esc(t.mensaje)}</pre>` : ''}
    <div class="acciones">
      ${t.enlace ? `<a class="boton wa" href="${esc(t.enlace)}" target="_blank" rel="noopener">Abrir WhatsApp</a>` : ''}
      <form method="post" action="/api/tareas/${t.id}/hecha${token ? `?token=${encodeURIComponent(token)}` : ''}">
        <button class="hecha" type="submit">Marcar hecha</button>
      </form>
      <form method="post" action="/api/leads/${t.leadId}/borrar${token ? `?token=${encodeURIComponent(token)}` : ''}"
            onsubmit="return confirm('Borrar este lead y todo su historial? No se puede deshacer.')">
        <button class="borrar" type="submit">Borrar lead</button>
      </form>
    </div>
  </article>`;
}

function tarjetaPublicacion(p) {
  return `
  <article class="tarjeta">
    <div class="fila">
      <span class="nombre">${esc(p.titulo)}</span>
      <span class="etiqueta">${esc(p.fecha)} · ${esc(p.formato)}</span>
    </div>
    <pre>${esc(p.copy)}\n\n${esc(p.hashtags)}</pre>
  </article>`;
}

/** Saludo segun la hora de Chile, para que el panel se sienta del dia. */
function saludoDelDia() {
  const hora = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: config.negocio.zonaHoraria, hour: '2-digit', hour12: false,
  }).format(new Date()));
  const momento = hora < 12 ? 'Buenos días' : (hora < 20 ? 'Buenas tardes' : 'Buenas noches');
  const fecha = new Intl.DateTimeFormat('es-CL', {
    timeZone: config.negocio.zonaHoraria, weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date());
  return `${momento}, ${config.negocio.vendedor} · ${fecha}`;
}

function listaDeLeads(token) {
  const filas = listar({ limite: 60 });
  if (!filas.length) return '<p class="vacio">Todavia no hay leads.</p>';
  const sufijo = token ? `?token=${encodeURIComponent(token)}` : '';
  const nombreEtapa = new Map(TODAS_LAS_ETAPAS.map((e) => [e.clave, e.nombre]));
  return `<div class="tarjeta"><table>
    <tr><th>Nombre</th><th>Contacto</th><th>Etapa</th><th></th></tr>
    ${filas.map((l) => `<tr>
      <td><a href="/lead/${l.id}${sufijo}" style="color:var(--acento);font-weight:600;text-decoration:none">${esc(l.nombre || 'sin nombre')}</a>${l.rubro ? `<br><span class="meta">${esc(l.rubro)}</span>` : ''}</td>
      <td>${esc(formatearTelefono(l.telefono) || l.email || '-')}</td>
      <td>${esc(nombreEtapa.get(l.etapa) ?? l.etapa)}</td>
      <td><form method="post" action="/api/leads/${l.id}/borrar${sufijo}"
                onsubmit="return confirm('Borrar a ${esc((l.nombre || l.telefono || 'este lead').replace(/'/g, ''))} y todo su historial? No se puede deshacer.')">
        <button class="borrar" type="submit">Borrar</button></form></td>
    </tr>`).join('')}
  </table></div>`;
}

export function renderPanel(token = '', aviso = '') {
  const cola = colaDeHoy({ limite: 40 });
  const resumen = new Map(resumenPorEtapa().map((r) => [r.etapa, r.total]));
  const publicaciones = listarPublicaciones(120)
    .filter((p) => p.estado === 'planificada')
    .slice(0, 6);
  const enJuego = listar({ limite: 500 }).filter((l) => !['activo', 'perdido'].includes(l.etapa));
  const valorEnJuego = enJuego.reduce((s, l) => s + (l.valor_estimado || 0), 0);

  const kpis = ETAPAS.filter((e) => e.clave !== 'perdido')
    .map((e) => `<div class="kpi"><b>${resumen.get(e.clave) ?? 0}</b><span>${esc(e.nombre)}</span></div>`)
    .join('');

  return `${cabeceraHtml(`Panel ${config.negocio.nombre}`, token, ESTILOS)}
<header>
  <h1>${esc(config.negocio.nombre)}</h1>
  <p>${esc(saludoDelDia())}</p>
  <div class="titulares">
    <div class="titular"><b>${cola.length}</b><span>Por hacer hoy</span></div>
    <div class="titular"><b>${enJuego.length}</b><span>Negocios abiertos</span></div>
    <div class="titular"><b>${esc(clp(valorEnJuego))}</b><span>En juego</span></div>
  </div>
</header>
<main>
  ${aviso ? `<p class="aviso">${esc(aviso)}</p>` : ''}

  <h2>Cola de hoy</h2>
  ${cola.length ? cola.map((t) => tarjetaTarea(t, token)).join('') : '<p class="vacio">Nada pendiente. Todo al dia.</p>'}

  <h2>Pipeline</h2>
  <div class="rejilla">${kpis}</div>

  <h2>Todos los leads</h2>
  ${listaDeLeads(token)}

  <h2>Herramientas</h2>
  <p class="acciones">
    <a class="boton wa" href="/comision${token ? `?token=${encodeURIComponent(token)}` : ''}">Calcular comisión del cliente</a>
    <a class="boton hecha" href="/respuestas${token ? `?token=${encodeURIComponent(token)}` : ''}">Respuestas listas para copiar</a>
    <a class="boton hecha" href="/reels${token ? `?token=${encodeURIComponent(token)}` : ''}">Reels con video</a>
    <a class="boton hecha" href="/diagnostico${token ? `?token=${encodeURIComponent(token)}` : ''}">Diagnóstico del sistema</a>
  </p>
  <form method="post" action="/api/rutina${token ? `?token=${encodeURIComponent(token)}` : ''}"
        onsubmit="return confirm('Correr la rutina ahora? Arma la cola del día y envía el resumen a tu correo.')">
    <button class="hecha" type="submit">Correr la rutina ahora</button>
  </form>
  <p class="meta">Normalmente corre sola a las 9:00. Úsalo para probar el correo o si el servidor estuvo caído a esa hora.</p>

  <h2>Proximas publicaciones</h2>
  ${publicaciones.length ? publicaciones.map(tarjetaPublicacion).join('') : '<p class="vacio">No hay calendario generado. Corre: npm run cli contenido generar</p>'}
</main></body></html>`;
}
