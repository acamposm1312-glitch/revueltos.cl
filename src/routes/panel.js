import config from '../config.js';
import { ETAPAS } from '../core/pipeline.js';
import { resumenPorEtapa, listar } from '../core/leads.js';
import { ETAPAS as TODAS_LAS_ETAPAS } from '../core/pipeline.js';
import { colaDeHoy, tareasPendientes } from '../core/tareas.js';
import { listarPublicaciones } from '../core/contenido.js';
import { formatearTelefono } from '../core/telefono.js';
import { clp } from '../core/catalogo.js';

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const ESTILOS = `
:root{--fondo:#f6f7f9;--tarjeta:#fff;--texto:#16191d;--suave:#5f6975;--borde:#e3e6ea;--acento:#075e54;--acento2:#25d366;--alerta:#b42318}
@media(prefers-color-scheme:dark){:root{--fondo:#0f1115;--tarjeta:#181b21;--texto:#e8eaed;--suave:#9aa4b2;--borde:#272b33;--acento:#25d366;--acento2:#25d366;--alerta:#ff6b6b}}
*{box-sizing:border-box}
body{margin:0;background:var(--fondo);color:var(--texto);font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:0 0 48px}
header{background:var(--acento);color:#fff;padding:18px 16px}
header h1{margin:0;font-size:20px;letter-spacing:.3px}
header p{margin:4px 0 0;opacity:.85;font-size:13px}
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
form{display:inline}
`;

function tarjetaTarea(t, token) {
  const tel = formatearTelefono(t.lead.telefono);
  return `
  <article class="tarjeta">
    <div class="fila">
      <span class="nombre">${esc(t.lead.nombre || tel || t.lead.email || 'Sin nombre')}</span>
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

function listaDeLeads(token) {
  const filas = listar({ limite: 60 });
  if (!filas.length) return '<p class="vacio">Todavia no hay leads.</p>';
  const sufijo = token ? `?token=${encodeURIComponent(token)}` : '';
  const nombreEtapa = new Map(TODAS_LAS_ETAPAS.map((e) => [e.clave, e.nombre]));
  return `<div class="tarjeta"><table>
    <tr><th>Nombre</th><th>Contacto</th><th>Etapa</th><th></th></tr>
    ${filas.map((l) => `<tr>
      <td>${esc(l.nombre || 'sin nombre')}${l.rubro ? `<br><span class="meta">${esc(l.rubro)}</span>` : ''}</td>
      <td>${esc(formatearTelefono(l.telefono) || l.email || '-')}</td>
      <td>${esc(nombreEtapa.get(l.etapa) ?? l.etapa)}</td>
      <td><form method="post" action="/api/leads/${l.id}/borrar${sufijo}"
                onsubmit="return confirm('Borrar a ${esc((l.nombre || l.telefono || 'este lead').replace(/'/g, ''))} y todo su historial? No se puede deshacer.')">
        <button class="borrar" type="submit">Borrar</button></form></td>
    </tr>`).join('')}
  </table></div>`;
}

export function renderPanel(token = '') {
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

  return `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Panel ${esc(config.negocio.nombre)}</title><style>${ESTILOS}</style></head><body>
<header>
  <h1>${esc(config.negocio.nombre)} · panel de operacion</h1>
  <p>${tareasPendientes()} tareas pendientes · ${enJuego.length} negocios abiertos · ${esc(clp(valorEnJuego))} en juego</p>
</header>
<main>
  <h2>Cola de hoy</h2>
  ${cola.length ? cola.map((t) => tarjetaTarea(t, token)).join('') : '<p class="vacio">Nada pendiente. Todo al dia.</p>'}

  <h2>Pipeline</h2>
  <div class="rejilla">${kpis}</div>

  <h2>Todos los leads</h2>
  ${listaDeLeads(token)}

  <h2>Herramientas</h2>
  <p class="acciones">
    <a class="boton wa" href="/comision${token ? `?token=${encodeURIComponent(token)}` : ''}">Calcular comisión del cliente</a>
    <a class="boton hecha" href="/diagnostico${token ? `?token=${encodeURIComponent(token)}` : ''}">Diagnóstico del sistema</a>
  </p>

  <h2>Proximas publicaciones</h2>
  ${publicaciones.length ? publicaciones.map(tarjetaPublicacion).join('') : '<p class="vacio">No hay calendario generado. Corre: npm run cli contenido generar</p>'}
</main></body></html>`;
}
