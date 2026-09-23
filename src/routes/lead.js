import config from '../config.js';
import { cabeceraHtml, esc } from './comunes.js';
import { porId, eventosDe } from '../core/leads.js';
import { ETAPAS, etapa as buscarEtapa } from '../core/pipeline.js';
import { formatearTelefono } from '../core/telefono.js';
import { clp } from '../core/catalogo.js';
import { enlaceWhatsapp } from '../core/whatsapp.js';
import { mensajeWhatsapp } from '../core/plantillas.js';
import { listarPlantillas } from '../core/plantillas.js';
import { db } from '../core/db.js';

const ESTILOS = `
:root{--fondo:#f6f7f9;--tarjeta:#fff;--texto:#16191d;--suave:#5f6975;--borde:#e3e6ea;--acento:#075e54;--wa:#25d366;--alerta:#b42318}
@media(prefers-color-scheme:dark){:root{--fondo:#0f1115;--tarjeta:#181b21;--texto:#e8eaed;--suave:#9aa4b2;--borde:#272b33;--acento:#25d366;--wa:#25d366;--alerta:#ff6b6b}}
*{box-sizing:border-box}
body{margin:0;background:var(--fondo);color:var(--texto);font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:0 0 48px}
header{background:var(--acento);color:#fff;padding:calc(18px + env(safe-area-inset-top,0px)) 16px 18px}
header h1{margin:0;font-size:21px}
header p{margin:4px 0 0;opacity:.88;font-size:14px}
main{max-width:720px;margin:0 auto;padding:16px}
h2{font-size:14px;text-transform:uppercase;letter-spacing:.8px;color:var(--suave);margin:24px 0 10px}
.tarjeta{background:var(--tarjeta);border:1px solid var(--borde);border-radius:12px;padding:14px;margin-bottom:12px}
.dato{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--borde);font-size:15px}
.dato:last-child{border-bottom:0}
.dato span{color:var(--suave)}
.dato a{color:var(--acento);text-decoration:none;font-weight:600}
a.boton,button{border:0;border-radius:10px;padding:13px 16px;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;display:block;text-align:center;width:100%;margin-bottom:8px}
a.wa{background:var(--wa);color:#04140d}
button.sec{background:var(--borde);color:var(--texto)}
button.peligro{background:transparent;color:var(--alerta);border:1px solid var(--borde)}
select{width:100%;padding:12px;border:1px solid var(--borde);border-radius:9px;font-size:16px;margin-bottom:8px;background:var(--fondo);color:var(--texto)}
pre{white-space:pre-wrap;word-break:break-word;background:var(--fondo);border:1px solid var(--borde);border-radius:8px;padding:11px;font:13px/1.5 ui-monospace,Menlo,monospace;margin:0 0 10px;max-height:240px;overflow:auto}
ol.historial{list-style:none;padding:0;margin:0;font-size:14px}
ol.historial li{padding:8px 0;border-bottom:1px solid var(--borde);display:flex;gap:10px}
ol.historial li:last-child{border-bottom:0}
ol.historial time{color:var(--suave);white-space:nowrap;font-variant-numeric:tabular-nums}
a.volver{display:inline-block;margin-top:20px;color:var(--acento);font-weight:600;text-decoration:none}
`;

const fechaCorta = (iso) => {
  try {
    return new Intl.DateTimeFormat('es-CL', {
      timeZone: config.negocio.zonaHoraria, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch { return iso.slice(0, 16).replace('T', ' '); }
};

export function renderLead(id, token = '') {
  const lead = porId(id);
  const q = token ? `?token=${encodeURIComponent(token)}` : '';
  if (!lead) {
    return `${cabeceraHtml('Lead no encontrado', token, ESTILOS)}
      <main><div class="tarjeta">Ese lead ya no existe. Puede que lo hayas borrado.</div>
      <a class="volver" href="/${q}">&larr; Volver al panel</a></main></body></html>`;
  }

  const e = buscarEtapa(lead.etapa);
  const tel = formatearTelefono(lead.telefono);
  const plantillas = listarPlantillas('whatsapp');
  // La plantilla que corresponde a su etapa va primero: es la que toca enviar.
  const sugerida = e?.plantilla && plantillas.includes(e.plantilla) ? e.plantilla : plantillas[0];
  const mensaje = lead.telefono ? mensajeWhatsapp(sugerida, lead) : '';

  const tareas = db().prepare(
    "SELECT * FROM tareas WHERE lead_id = ? AND estado = 'pendiente' ORDER BY vence",
  ).all(lead.id);

  const dato = (etiqueta, valor, enlace) => valor
    ? `<div class="dato"><span>${esc(etiqueta)}</span>${enlace ? `<a href="${esc(enlace)}">${esc(valor)}</a>` : `<strong>${esc(valor)}</strong>`}</div>`
    : '';

  return `${cabeceraHtml(lead.nombre || 'Lead', token, ESTILOS)}
<header>
  <h1>${esc(lead.nombre || tel || lead.email || 'Sin nombre')}</h1>
  <p>${esc(e?.nombre ?? lead.etapa)}${lead.rubro ? ` · ${esc(lead.rubro)}` : ''}</p>
</header>
<main>
  ${lead.telefono ? `<a class="boton wa" href="${esc(enlaceWhatsapp(lead.telefono, mensaje))}" target="_blank" rel="noopener">Abrir WhatsApp con el mensaje listo</a>` : ''}
  ${lead.telefono ? `<details class="tarjeta"><summary style="cursor:pointer;color:var(--suave);font-size:14px">Ver el mensaje antes de enviarlo</summary><pre style="margin-top:10px">${esc(mensaje)}</pre></details>` : ''}

  <h2>Datos</h2>
  <div class="tarjeta">
    ${dato('Teléfono', tel, tel ? `tel:+${lead.telefono}` : '')}
    ${dato('Correo', lead.email, lead.email ? `mailto:${lead.email}` : '')}
    ${dato('Rubro', lead.rubro)}
    ${dato('Comuna', lead.comuna)}
    ${dato('Origen', lead.origen)}
    ${dato('Valor estimado', lead.valor_estimado ? clp(lead.valor_estimado) : '')}
    ${dato('En esta etapa desde', fechaCorta(lead.etapa_desde))}
    ${dato('Primer contacto', fechaCorta(lead.creado))}
  </div>

  ${lead.interes ? `<h2>Qué pidió</h2><div class="tarjeta"><pre>${esc(lead.interes)}</pre></div>` : ''}

  ${tareas.length ? `<h2>Pendientes</h2><div class="tarjeta">${tareas.map((t) => `
    <div class="dato"><span>${esc(t.titulo)}</span>
      <form method="post" action="/api/tareas/${t.id}/hecha${q}" style="display:inline">
        <button class="sec" type="submit" style="width:auto;padding:6px 12px;margin:0">Hecha</button>
      </form>
    </div>`).join('')}</div>` : ''}

  <h2>Mover de etapa</h2>
  <form class="tarjeta" method="post" action="/api/leads/${lead.id}/etapa${q}">
    <select name="etapa">
      ${ETAPAS.map((x) => `<option value="${x.clave}" ${x.clave === lead.etapa ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}
    </select>
    <button class="sec" type="submit">Guardar etapa</button>
  </form>

  <h2>Historial</h2>
  <div class="tarjeta">
    <ol class="historial">
      ${eventosDe(lead.id, 40).map((ev) => `<li><time>${esc(fechaCorta(ev.creado))}</time><span>${esc(ev.tipo)}${ev.detalle ? ` · ${esc(ev.detalle)}` : ''}</span></li>`).join('') || '<li>Sin movimientos todavía.</li>'}
    </ol>
  </div>

  <form method="post" action="/api/leads/${lead.id}/borrar${q}"
        onsubmit="return confirm('Borrar este lead y todo su historial? No se puede deshacer.')">
    <button class="peligro" type="submit">Borrar este lead</button>
  </form>

  <a class="volver" href="/${q}">&larr; Volver al panel</a>
</main></body></html>`;
}
