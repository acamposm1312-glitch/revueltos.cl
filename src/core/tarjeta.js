import config from '../config.js';
import { buscarProducto, clp } from './catalogo.js';

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const VERDE = '#075e54';
const VERDE_CLARO = '#0a7d70';
const CREMA = '#f4f1e8';

// Cierre para las piezas sin producto: el gancho solo no basta, hay que decir
// que hacer con el. Cambia segun el formato para no repetir "te sirve" tres
// veces en la misma tarjeta (etiqueta, titulo y cierre) en los reels.
const INVITA = {
  reel: 'Cuéntame tu caso y te oriento.',
  carrusel: 'Escríbeme y te digo cuál te sirve.',
};
const INVITA_POR_DEFECTO = 'Escríbeme y te digo cuál te sirve.';

/**
 * Genera el HTML de una imagen cuadrada para Instagram.
 *
 * Se arma como pagina y se fotografia con Chromium a 1080x1080. Es la unica via
 * sin dependencias: dibujar texto pixel a pixel exigiria rasterizar tipografias
 * a mano, y las fotos de catalogo vienen en webp y png de 460 px, formatos y
 * tamanos que Instagram no acepta.
 *
 * @param {{formato:string, titulo:string, producto_handle?:string, copy:string}} pieza
 */
export function htmlDeTarjeta(pieza) {
  const producto = pieza.producto_handle ? buscarProducto(pieza.producto_handle) : null;

  // La primera linea del copy es el gancho; es lo unico que alcanza a leerse
  // mientras alguien pasa el dedo por su muro.
  const lineas = pieza.copy.split('\n').map((l) => l.trim()).filter(Boolean);
  const gancho = producto ? (lineas[0] ?? pieza.titulo) : pieza.titulo;
  const apoyo = producto ? (producto.resumen ?? '') : (lineas[1] ?? lineas[0] ?? '');

  const etiqueta = { post: 'Producto', carrusel: 'Lo que hay que saber', reel: '¿Cuál te sirve?' }[pieza.formato] ?? '';
  const tamano = gancho.length > 95 ? 52 : (gancho.length > 60 ? 62 : 74);
  const invita = INVITA[pieza.formato] ?? INVITA_POR_DEFECTO;
  const canal = `Instagram @${config.negocio.instagram} · WhatsApp · ${config.negocio.sitio.replace(/^https?:\/\//, '')}`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { margin: 0 }
  *{margin:0;padding:0;box-sizing:border-box}
  /* El pie va anclado al borde inferior en vez de depender del flujo: con flex,
     un gancho largo empujaba el pie fuera de los 1080 px y quedaba cortado al
     fotografiar la pagina. */
  html,body{width:1080px;height:1080px;overflow:hidden}
  body{position:relative;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;
    background:${VERDE};color:${CREMA}}
  .marco{position:absolute;inset:0 0 132px 0;display:flex;flex-direction:column;
    padding:76px 76px 44px}
  .etiqueta{font-size:26px;letter-spacing:3px;text-transform:uppercase;
    opacity:.62;font-weight:700;margin-bottom:36px}
  .gancho{font-size:${tamano}px;line-height:1.14;font-weight:800;letter-spacing:-1.5px;max-width:900px}
  .apoyo{margin-top:32px;font-size:30px;line-height:1.45;opacity:.82;max-width:850px;font-weight:400}
  .precio{margin-top:auto;font-size:76px;font-weight:800;letter-spacing:-2px;color:#fff;line-height:1.05}
  .precio small{display:block;font-size:24px;font-weight:600;
    text-transform:uppercase;opacity:.6;margin-bottom:8px;letter-spacing:3px}
  /* Sin producto no hay bloque de precio, y la mitad de abajo quedaba vacia.
     El cierre ocupa ese espacio con lo unico que importa cuando alguien ya
     leyo el gancho: a quien le escribe. */
  .cierre{margin-top:auto}
  .cierre .invita{font-size:44px;font-weight:800;line-height:1.2;letter-spacing:-1px;max-width:880px}
  .cierre .canal{margin-top:22px;font-size:29px;font-weight:600;opacity:.78}
  .pie{position:absolute;left:0;right:0;bottom:0;height:132px;background:${VERDE_CLARO};
    padding:0 76px;display:flex;align-items:center;justify-content:space-between}
  .marca{display:flex;align-items:center;gap:18px}
  .marca .a{width:52px;height:52px}
  .marca .nombre{font-size:34px;font-weight:800;letter-spacing:1px}
  .pie .oficial{font-size:23px;opacity:.85;text-align:right;line-height:1.35;font-weight:500}
  </style></head><body>
  <div class="marco">
    ${etiqueta ? `<div class="etiqueta">${esc(etiqueta)}</div>` : ''}
    <div class="gancho">${esc(gancho)}</div>
    ${apoyo ? `<div class="apoyo">${esc(apoyo)}</div>` : ''}
    ${producto
      ? `<div class="precio"><small>${esc(producto.titulo)}</small>${esc(clp(producto.precio))}</div>`
      : `<div class="cierre">
          <div class="invita">${esc(invita)}</div>
          <div class="canal">${esc(canal)}</div>
        </div>`}
  </div>
  <div class="pie">
    <div class="marca">
      <svg class="a" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M50 12 L88 88 L68 88 L50 48 L32 88 L12 88 Z" fill="${CREMA}"/>
        <rect x="34" y="62" width="32" height="13" fill="${CREMA}"/>
      </svg>
      <span class="nombre">${esc(config.negocio.nombre)}</span>
    </div>
    <div class="oficial">Distribuidor oficial TUU<br>${esc(config.negocio.sitio.replace(/^https?:\/\//, ''))}</div>
  </div>
  </body></html>`;
}
