import config from '../config.js';
import { hayLlave } from '../core/reels.js';
import { cabeceraHtml, esc } from './comunes.js';

const ESTILOS = `
:root{--fondo:#f6f7f9;--tarjeta:#fff;--texto:#16191d;--suave:#5f6975;--borde:#e3e6ea;--acento:#0052cc;--ok:#0a7c3f;--falta:#b42318}
@media(prefers-color-scheme:dark){:root{--fondo:#0f1115;--tarjeta:#181b21;--texto:#e8eaed;--suave:#9aa4b2;--borde:#272b33;--acento:#4d8bff;--ok:#4ade80;--falta:#ff6b6b}}
*{box-sizing:border-box}
body{margin:0;background:var(--fondo);color:var(--texto);font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:0 0 48px}
header{background:var(--acento);color:#fff;padding:18px 16px}
header h1{margin:0;font-size:20px}
header p{margin:4px 0 0;opacity:.85;font-size:13px}
main{max-width:760px;margin:0 auto;padding:16px}
h2{font-size:15px;text-transform:uppercase;letter-spacing:.8px;color:var(--suave);margin:26px 0 10px}
.caja{background:var(--tarjeta);border:1px solid var(--borde);border-radius:10px;padding:14px;margin-bottom:12px}
.caja.falta{border-left:4px solid var(--falta)}
.caja.ok{border-left:4px solid var(--ok)}
.boton{display:inline-block;background:var(--acento);color:#fff;border:0;border-radius:10px;
  padding:13px 18px;font-size:16px;font-weight:600;text-decoration:none;cursor:pointer}
.modelo{background:var(--tarjeta);border:1px solid var(--borde);border-radius:10px;padding:12px 14px;margin-bottom:8px}
.modelo code{font-size:15px;font-weight:700;word-break:break-all}
.modelo .meta{color:var(--suave);font-size:13px;margin-top:4px}
.si{color:var(--ok);font-weight:700;font-size:13px}
.no{color:var(--falta);font-weight:700;font-size:13px}
pre{background:var(--tarjeta);border:1px solid var(--borde);border-radius:10px;padding:12px;
  overflow:auto;font-size:12px;max-height:340px;white-space:pre-wrap;word-break:break-word}
.pasos{background:var(--tarjeta);border:1px solid var(--borde);border-radius:10px;padding:14px 14px 14px 30px;margin:0 0 12px}
.pasos li{margin-bottom:8px}
.nota{color:var(--suave);font-size:14px}
a.volver{display:inline-block;margin-top:22px;color:var(--acento);font-weight:600;text-decoration:none}
`;

/** Pagina de reels: estado de la llave, catalogo de modelos y respuesta cruda. */
export function renderReels(token = '', resultado = null, error = '') {
  const sufijo = token ? `?token=${encodeURIComponent(token)}` : '';

  const estado = hayLlave()
    ? `<div class="caja ok"><b>Llave configurada.</b>
         <div class="nota">Se lee de la variable RUNAPI_API_KEY en Render. Nunca se muestra acá.</div>
       </div>`
    : `<div class="caja falta"><b>Falta la llave.</b>
         <div class="nota">Sin ella esta página no llama a nadie. Los pasos para conseguirla están más abajo.</div>
       </div>`;

  const pasos = hayLlave() ? '' : `
  <h2>Cómo conseguir la llave</h2>
  <ol class="pasos">
    <li>Entra a <b>runapi.ai</b> y crea una cuenta. No pide tarjeta.</li>
    <li>En el panel de RunAPI, genera una <b>API key</b> y cópiala.</li>
    <li>Entra a tu servicio en <b>Render</b> → <b>Environment</b>.</li>
    <li>Agrega la variable <b>RUNAPI_API_KEY</b> y pega la llave ahí.</li>
    <li>Guarda. Render reinicia solo y esta página se activa.</li>
  </ol>
  <p class="nota">Pega la llave directo en Render. No la mandes por chat ni por correo:
     un mensaje queda guardado, una variable de entorno no.</p>`;

  const aviso = error
    ? `<div class="caja falta"><b>No resultó.</b><div class="nota">${esc(error)}</div></div>`
    : '';

  let lista = '';
  if (resultado) {
    lista = resultado.modelos.length
      ? `<h2>Modelos Wan disponibles</h2>` + resultado.modelos.map((m) => `
        <div class="modelo">
          <code>${esc(m.id)}</code>
          <div class="meta">
            ${m.imagenAVideo
              ? '<span class="si">Sirve: acepta una foto de entrada</span>'
              : '<span class="no">No sirve: genera desde cero, se inventa la máquina</span>'}
            ${m.precio != null ? ` · Precio: ${esc(JSON.stringify(m.precio))}` : ''}
          </div>
          ${m.descripcion ? `<div class="meta">${esc(m.descripcion)}</div>` : ''}
        </div>`).join('')
      : `<h2>Modelos Wan disponibles</h2>
         <div class="caja"><b>No reconocí ningún modelo Wan en la respuesta.</b>
           <div class="nota">Puede ser que el catálogo venga en otro formato. La respuesta
           completa está abajo: mándamela y ajusto la lectura.</div></div>`;

    lista += `<h2>Respuesta completa</h2>
      <p class="nota">Esto es lo que devolvió RunAPI, tal cual. Cópialo y pásamelo.</p>
      <pre>${esc(resultado.crudo.slice(0, 20000))}</pre>`;
  }

  const boton = hayLlave()
    ? `<form method="post" action="/api/reels/modelos${sufijo}">
         <button class="boton" type="submit">Ver los modelos de RunAPI</button>
       </form>`
    : '';

  return `${cabeceraHtml('Reels', token, ESTILOS)}
  <header>
    <h1>Reels con video</h1>
    <p>${esc(config.negocio.nombre)} · genera el video desde la foto real del equipo</p>
  </header>
  <main>
    ${aviso}
    ${estado}
    ${boton}
    ${lista}
    ${pasos}
    <a class="volver" href="/${sufijo}">← Volver al panel</a>
  </main>
  </body></html>`;
}
