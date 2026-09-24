import config from '../config.js';
import { cabeceraHtml, esc } from './comunes.js';
import { listarPlantillas, cargarPlantilla } from '../core/plantillas.js';

/** Atajo sugerido para cada respuesta dentro de WhatsApp Business. */
const ATAJOS = {
  comision: '/comision',
  deposito: '/deposito',
  garantia: '/garantia',
  despacho: '/despacho',
  firma: '/firma',
  mensual: '/mensual',
  cual: '/cual',
  proceso: '/proceso',
  porque_appos: '/porque',
  boleta: '/boleta',
};

const TITULOS = {
  comision: '¿Cuánto cobran por transacción?',
  deposito: '¿En cuánto tiempo me depositan?',
  garantia: '¿Tiene garantía?',
  despacho: '¿Cuánto demora en llegar?',
  firma: '¿Qué es la firma electrónica?',
  mensual: '¿Tiene costo mensual?',
  cual: '¿Cuál máquina me conviene?',
  proceso: '¿Cómo es el proceso de compra?',
  porque_appos: '¿Por qué comprarte a ti y no directo?',
  boleta: '¿La máquina emite boleta?',
};

const ESTILOS = `
:root{--fondo:#f6f7f9;--tarjeta:#fff;--texto:#16191d;--suave:#5f6975;--borde:#e3e6ea;--acento:#075e54;--ok:#0a7c3f}
@media(prefers-color-scheme:dark){:root{--fondo:#0f1115;--tarjeta:#181b21;--texto:#e8eaed;--suave:#9aa4b2;--borde:#272b33;--acento:#25d366;--ok:#4ade80}}
*{box-sizing:border-box}
body{margin:0;background:var(--fondo);color:var(--texto);font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:0 0 48px}
header{background:var(--acento);color:#fff;padding:calc(18px + env(safe-area-inset-top,0px)) 16px 18px}
header h1{margin:0;font-size:20px} header p{margin:5px 0 0;opacity:.9;font-size:13px;line-height:1.5}
main{max-width:720px;margin:0 auto;padding:16px}
.tarjeta{background:var(--tarjeta);border:1px solid var(--borde);border-radius:12px;padding:14px;margin-bottom:12px}
.fila{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}
.pregunta{font-weight:600;font-size:15px}
.atajo{font:13px ui-monospace,Menlo,monospace;color:var(--suave);background:var(--fondo);border:1px solid var(--borde);border-radius:6px;padding:2px 8px;white-space:nowrap}
pre{white-space:pre-wrap;word-break:break-word;background:var(--fondo);border:1px solid var(--borde);border-radius:8px;padding:11px;font:13px/1.55 inherit;margin:0 0 10px;max-height:170px;overflow:auto}
button{width:100%;padding:12px;border:0;border-radius:9px;background:var(--acento);color:#fff;font-size:15px;font-weight:600;cursor:pointer}
button.listo{background:var(--ok)}
ol.pasos{padding-left:20px;margin:0;font-size:14px;color:var(--suave);line-height:1.7}
a.volver{display:inline-block;margin-top:20px;color:var(--acento);font-weight:600;text-decoration:none}
`;

export function renderRespuestas(token = '') {
  const q = token ? `?token=${encodeURIComponent(token)}` : '';
  const nombres = listarPlantillas('respuestas');

  const tarjetas = nombres.map((nombre, i) => {
    const texto = cargarPlantilla('respuestas', nombre).trim();
    return `
    <article class="tarjeta">
      <div class="fila">
        <span class="pregunta">${esc(TITULOS[nombre] ?? nombre)}</span>
        <span class="atajo">${esc(ATAJOS[nombre] ?? '/' + nombre)}</span>
      </div>
      <pre id="r${i}">${esc(texto)}</pre>
      <button type="button" data-copiar="r${i}">Copiar respuesta</button>
    </article>`;
  }).join('');

  return `${cabeceraHtml(`Respuestas · ${config.negocio.nombre}`, token, ESTILOS)}
<header>
  <h1>Respuestas listas</h1>
  <p>Para las preguntas que más se repiten. Sirven igual en WhatsApp Business y en Instagram.</p>
</header>
<main>
  <div class="tarjeta">
    <strong style="display:block;margin-bottom:8px">Cómo cargarlas en WhatsApp Business</strong>
    <ol class="pasos">
      <li>Toca <em>Copiar respuesta</em> en la que quieras</li>
      <li>En WhatsApp: <strong>Ajustes → Herramientas para la empresa → Respuestas rápidas</strong></li>
      <li><strong>+</strong> para agregar una, pega el texto y ponle el atajo que aparece al lado</li>
      <li>Después, al escribirle a un cliente, tecleas el atajo y se pega sola</li>
    </ol>
    <p style="color:var(--suave);font-size:13px;margin:12px 0 0">En Instagram es lo mismo:
    <strong>Configuración → Herramientas de empresa → Respuestas guardadas</strong>.</p>
  </div>

  ${tarjetas}

  <a class="volver" href="/${q}">&larr; Volver al panel</a>
</main>
<script>
document.addEventListener('click', function (evento) {
  var boton = evento.target.closest('[data-copiar]');
  if (!boton) return;
  var texto = document.getElementById(boton.getAttribute('data-copiar')).textContent;
  var avisar = function () {
    var antes = boton.textContent;
    boton.textContent = 'Copiado';
    boton.classList.add('listo');
    setTimeout(function () { boton.textContent = antes; boton.classList.remove('listo'); }, 1600);
  };
  // El portapapeles moderno falla fuera de HTTPS y en algunos navegadores
  // antiguos, asi que queda el metodo de respaldo por seleccion.
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(texto).then(avisar, respaldo);
  } else { respaldo(); }

  function respaldo() {
    var area = document.createElement('textarea');
    area.value = texto;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); avisar(); } catch (e) { boton.textContent = 'Selecciona y copia a mano'; }
    document.body.removeChild(area);
  }
});
</script>
</body></html>`;
}
