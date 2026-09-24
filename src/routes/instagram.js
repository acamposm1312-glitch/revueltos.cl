import config from '../config.js';
import { hayCredenciales, piezasPendientes, textoDePieza } from '../core/instagram.js';
import { cabeceraHtml, esc } from './comunes.js';

const ESTILOS = `
:root{--fondo:#f6f7f9;--tarjeta:#fff;--texto:#16191d;--suave:#5f6975;--borde:#e3e6ea;--acento:#1731ef;--ok:#0a7c3f;--falta:#b42318;--aviso:#9a6700}
@media(prefers-color-scheme:dark){:root{--fondo:#0f1115;--tarjeta:#181b21;--texto:#e8eaed;--suave:#9aa4b2;--borde:#272b33;--acento:#6f8bff;--ok:#4ade80;--falta:#ff6b6b;--aviso:#e3b341}}
*{box-sizing:border-box}
body{margin:0;background:var(--fondo);color:var(--texto);font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:0 0 48px}
header{background:var(--acento);color:#fff;padding:18px 16px}
header h1{margin:0;font-size:20px}
header p{margin:4px 0 0;opacity:.85;font-size:13px}
main{max-width:760px;margin:0 auto;padding:16px}
h2{font-size:15px;text-transform:uppercase;letter-spacing:.8px;color:var(--suave);margin:26px 0 10px}
.caja{background:var(--tarjeta);border:1px solid var(--borde);border-radius:10px;padding:14px;margin-bottom:12px}
.caja.ok{border-left:4px solid var(--ok)} .caja.falta{border-left:4px solid var(--falta)}
.caja.aviso{border-left:4px solid var(--aviso)}
.boton{display:inline-block;background:var(--acento);color:#fff;border:0;border-radius:10px;
  padding:13px 18px;font-size:16px;font-weight:600;text-decoration:none;cursor:pointer}
.pasos{background:var(--tarjeta);border:1px solid var(--borde);border-radius:10px;padding:14px 14px 14px 32px;margin:0 0 12px}
.pasos li{margin-bottom:10px}
.nota{color:var(--suave);font-size:14px}
.pieza{background:var(--tarjeta);border:1px solid var(--borde);border-radius:10px;padding:12px 14px;margin-bottom:8px}
.pieza b{display:block}
.pieza .meta{color:var(--suave);font-size:13px;margin-top:3px}
.sinfoto{color:var(--aviso);font-weight:600;font-size:13px}
pre{background:var(--tarjeta);border:1px solid var(--borde);border-radius:10px;padding:12px;
  overflow:auto;font-size:12px;max-height:280px;white-space:pre-wrap;word-break:break-word}
a.volver{display:inline-block;margin-top:22px;color:var(--acento);font-weight:600;text-decoration:none}
`;

/** Pagina de Instagram: estado de las credenciales, prueba y cola de publicaciones. */
export function renderInstagram(token = '', cuenta = null, error = '') {
  const sufijo = token ? `?token=${encodeURIComponent(token)}` : '';
  const listo = hayCredenciales();

  const estado = listo
    ? `<div class="caja ok"><b>Credenciales cargadas.</b>
         <div class="nota">Se leen de IG_USER_ID e IG_TOKEN en Render. Nunca se muestran acá.</div></div>`
    : `<div class="caja falta"><b>Faltan las credenciales.</b>
         <div class="nota">Sin ellas esta página no llama a Meta. Los pasos están más abajo.</div></div>`;

  const autopublicacion = listo
    ? (config.instagram.autoPublicar
      ? `<div class="caja ok"><b>Publicación automática encendida.</b>
           <div class="nota">La rutina de cada mañana publica lo que corresponda ese día.</div></div>`
      : `<div class="caja aviso"><b>Publicación automática apagada.</b>
           <div class="nota">Nada sale solo. Para encenderla, pon <b>IG_AUTOPUBLICAR</b> en <b>1</b>
           en Render. Conviene dejarla apagada hasta que una prueba salga bien.</div></div>`)
    : '';

  const aviso = error
    ? `<div class="caja falta"><b>No resultó.</b><pre>${esc(error)}</pre></div>`
    : '';

  const cuentaOk = cuenta
    ? `<div class="caja ok"><b>Conexión verificada.</b>
         <div class="nota">Cuenta <b>@${esc(cuenta.usuario || 'sin nombre')}</b>${cuenta.nombre ? ` · ${esc(cuenta.nombre)}` : ''} · id ${esc(cuenta.id)}</div></div>`
    : '';

  const boton = listo
    ? `<form method="post" action="/api/instagram/probar${sufijo}">
         <button class="boton" type="submit">Probar la conexión</button>
       </form>
       <p class="nota">Solo consulta el nombre de la cuenta. No publica nada.</p>`
    : '';

  let cola = '';
  if (listo) {
    const pendientes = piezasPendientes();
    cola = `<h2>Esperando publicación</h2>` + (pendientes.length
      ? pendientes.map((p) => `
        <div class="pieza">
          <b>${esc(p.titulo)}</b>
          <div class="meta">${esc(p.fecha)} · ${esc(p.formato)}</div>
          ${p.imagen_url
            ? `<div class="meta">Imagen: ${esc(p.imagen_url)}</div>`
            : '<div class="sinfoto">Sin imagen. Instagram descarga la foto desde sus servidores, así que necesita una dirección https pública.</div>'}
          <div class="meta">${esc(textoDePieza(p).slice(0, 140))}…</div>
        </div>`).join('')
      : '<div class="caja"><b>Nada pendiente para hoy.</b></div>');
  }

  const pasos = listo ? '' : `
  <h2>Cómo conseguir las credenciales</h2>
  <ol class="pasos">
    <li>Pasa <b>@${esc(config.negocio.instagram)}</b> a cuenta <b>profesional</b> y vincúlala a una página de Facebook.</li>
    <li>En <b>developers.facebook.com</b>, crea una app. <b>Déjala en modo desarrollo</b>: para publicar solo en tu propia cuenta no necesitas la revisión de Meta.</li>
    <li>Agrega tu cuenta de Instagram como <b>probador</b> (Instagram Tester) y acepta la invitación desde Instagram.</li>
    <li>Pide los permisos <b>instagram_business_basic</b> e <b>instagram_business_content_publish</b> y genera un token.</li>
    <li>En <b>Render → Environment</b>, agrega <b>IG_USER_ID</b> y <b>IG_TOKEN</b>.</li>
  </ol>
  <p class="nota">Pega el token directo en Render, no por chat. Y ojo: los tokens de Meta
     vencen. Cuando deje de funcionar, esta página te lo va a decir con el error de Meta completo.</p>`;

  return `${cabeceraHtml(`Instagram · ${config.negocio.nombre}`, token, ESTILOS)}
  <header>
    <h1>Publicar en Instagram</h1>
    <p>${esc(config.negocio.nombre)} · @${esc(config.negocio.instagram)}</p>
  </header>
  <main>
    ${aviso}
    ${cuentaOk}
    ${estado}
    ${autopublicacion}
    ${boton}
    ${cola}
    ${pasos}
    <a class="volver" href="/${sufijo}">← Volver al panel</a>
  </main>
  </body></html>`;
}
