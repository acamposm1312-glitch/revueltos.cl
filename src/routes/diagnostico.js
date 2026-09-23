import config from '../config.js';
import { estadoDelSistema } from '../core/estado.js';

import { cabeceraHtml, esc } from './comunes.js';

const ESTILOS = `
:root{--fondo:#f6f7f9;--tarjeta:#fff;--texto:#16191d;--suave:#5f6975;--borde:#e3e6ea;--acento:#075e54;--ok:#0a7c3f;--falta:#b42318;--aviso:#9a6700}
@media(prefers-color-scheme:dark){:root{--fondo:#0f1115;--tarjeta:#181b21;--texto:#e8eaed;--suave:#9aa4b2;--borde:#272b33;--acento:#25d366;--ok:#4ade80;--falta:#ff6b6b;--aviso:#e3b341}}
*{box-sizing:border-box}
body{margin:0;background:var(--fondo);color:var(--texto);font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:0 0 48px}
header{background:var(--acento);color:#fff;padding:18px 16px}
header h1{margin:0;font-size:20px}
header p{margin:4px 0 0;opacity:.85;font-size:13px}
main{max-width:760px;margin:0 auto;padding:16px}
h2{font-size:15px;text-transform:uppercase;letter-spacing:.8px;color:var(--suave);margin:26px 0 10px}
.item{background:var(--tarjeta);border:1px solid var(--borde);border-left-width:4px;border-radius:10px;padding:12px 14px;margin-bottom:10px}
.item.ok{border-left-color:var(--ok)}
.item.falta{border-left-color:var(--falta)}
.item.aviso{border-left-color:var(--aviso)}
.fila{display:flex;justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap}
.nombre{font-weight:600}
.marca{font-size:13px;font-weight:700}
.marca.ok{color:var(--ok)} .marca.falta{color:var(--falta)} .marca.aviso{color:var(--aviso)}
.valor{color:var(--suave);font-size:14px;margin-top:2px;word-break:break-word}
.pista{color:var(--falta);font-size:13px;margin-top:8px}
.item.aviso .pista{color:var(--aviso)}
.rejilla{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.kpi{background:var(--tarjeta);border:1px solid var(--borde);border-radius:10px;padding:10px 12px}
.kpi b{display:block;font-size:20px}
.kpi span{color:var(--suave);font-size:12px}
.aviso-caja{background:var(--tarjeta);border:1px solid var(--borde);border-radius:10px;padding:14px;color:var(--suave);font-size:14px}
.aviso{background:var(--tarjeta);border:1px solid var(--acento);border-left-width:4px;border-radius:10px;padding:12px 14px;margin:0 0 14px;font-size:14px}
a.volver{display:inline-block;margin-top:22px;color:var(--acento);font-weight:600;text-decoration:none}
`;

export function renderDiagnostico(token = '', aviso = '') {
  const e = estadoDelSistema();
  const sufijo = token ? `?token=${encodeURIComponent(token)}` : '';

  const items = e.revisiones.map((r) => {
    const clase = r.ok ? 'ok' : (r.critico ? 'falta' : 'aviso');
    const marca = r.ok ? 'LISTO' : (r.critico ? 'FALTA' : 'PENDIENTE');
    return `
    <div class="item ${clase}">
      <div class="fila">
        <span class="nombre">${esc(r.etiqueta)}</span>
        <span class="marca ${clase}">${marca}</span>
      </div>
      <div class="valor">${esc(r.valor)}</div>
      ${r.ok ? '' : `<div class="pista">${esc(r.pista)}</div>`}
    </div>`;
  }).join('');

  const d = e.datos;
  const kpis = [
    ['Leads', d.leads], ['Clientes', d.clientes], ['Tareas pendientes', d.tareasPendientes],
    ['Webhooks recibidos', d.webhooksRecibidos], ['Correos enviados', d.correosEnviados],
    ['Publicaciones', d.publicaciones],
  ].map(([k, v]) => `<div class="kpi"><b>${v}</b><span>${esc(k)}</span></div>`).join('');

  const titular = e.faltantesCriticas
    ? `${e.faltantesCriticas} cosa${e.faltantesCriticas > 1 ? 's' : ''} sin configurar que el sistema necesita`
    : 'Todo lo esencial esta configurado';

  return `${cabeceraHtml(`Diagnostico ${config.negocio.nombre}`, token, ESTILOS)}
<header>
  <h1>Diagnostico del sistema</h1>
  <p>${esc(titular)}</p>
</header>
<main>
  ${aviso ? `<p class="aviso">${esc(aviso)}</p>` : ''}

  <h2>Configuracion</h2>
  ${items}

  <h2>Probar el correo</h2>
  <form class="aviso-caja" method="post" action="/api/probar-correo${sufijo}">
    <p style="margin:0 0 12px">Envía un correo real a ${esc(config.negocio.correo)} y te dice si salió o cuál fue el error.
    Saber que una clave "está definida" no dice si funciona: una clave mal copiada se ve igual que una correcta.</p>
    <button type="submit" style="width:100%;padding:12px;border:0;border-radius:9px;background:var(--acento);color:#fff;font-size:15px;font-weight:600;cursor:pointer">Enviar correo de prueba</button>
  </form>

  <h2>Datos</h2>
  <div class="rejilla">${kpis}</div>

  <h2>Operacion</h2>
  <div class="aviso-caja">
    Rutina diaria a las ${e.negocio.horaRutina}:00 (${esc(e.negocio.zonaHoraria)}).<br>
    Ultima vez que corrio: <strong>${esc(d.ultimaRutina)}</strong>.<br><br>
    <em>Webhooks recibidos</em> cuenta las entregas de Shopify aceptadas. Si despues
    de una compra de prueba sigue en 0, el problema esta en los webhooks de Shopify,
    no en el sistema.
  </div>

  <a class="volver" href="/${sufijo}">&larr; Volver al panel</a>
</main></body></html>`;
}
