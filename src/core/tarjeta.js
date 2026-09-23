import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import config, { ROOT } from '../config.js';
import { buscarProducto, clp } from './catalogo.js';

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/**
 * Identidad visual, tomada del tema de www.appos.cl.
 *
 * El tema tiene dos esquemas de color creados a mano para esto,
 * "scheme-tuu-vibrant-blue" y "scheme-product-price-blue", mas la tipografia
 * Inter en los tres pesos. De ahi salen estos valores: son los mismos que ya ve
 * un cliente que entra a la tienda, asi que la publicacion y la pagina de
 * destino se parecen.
 *
 * No es el manual de marca de TUU. Si TUU entrega uno a sus distribuidores,
 * este bloque es lo unico que hay que cambiar.
 */
export const MARCA = {
  // Azul oficial de TUU, muestreado del lockup "TUU Chile - Distribuidor
  // Autorizado" que TUU entrega a sus distribuidores. Reemplaza al #0052cc que
  // se venia usando, que salia del tema de la tienda y era una aproximacion.
  azul: '#1731ef',
  azulOscuro: '#101f9e',
  azulClaro: '#dfe3ff',
  blanco: '#ffffff',
  radioPildora: 100,
  radioBloque: 14,
};

/**
 * Inter va incrustada en base64 en vez de enlazada.
 *
 * Chromium fotografia la pagina apenas termina de cargar. Una fuente pedida por
 * red puede no haber llegado todavia y la tarjeta sale con la tipografia del
 * sistema, distinta en cada maquina. Incrustada, el resultado es identico
 * siempre. Si el paquete no esta instalado se cae a la sans del sistema en vez
 * de reventar: la imagen queda fea, no rota.
 */
function cargarInter() {
  const pesos = [400, 700, 800];
  try {
    return pesos.map((peso) => {
      const ruta = resolve(ROOT, 'node_modules/@fontsource/inter/files', `inter-latin-${peso}-normal.woff2`);
      const datos = readFileSync(ruta).toString('base64');
      return `@font-face{font-family:Inter;font-style:normal;font-weight:${peso};font-display:block;`
        + `src:url(data:font/woff2;base64,${datos}) format('woff2')}`;
    }).join('');
  } catch {
    return '';
  }
}

export const INTER = cargarInter();
export const FAMILIA = INTER ? 'Inter, sans-serif' : '"Helvetica Neue",Helvetica,Arial,sans-serif';

const ETIQUETAS = { post: 'Producto', carrusel: 'Lo que hay que saber', reel: '¿Cuál te sirve?' };

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
 * sin dependencias de ejecucion: dibujar texto pixel a pixel exigiria
 * rasterizar tipografias a mano, y las fotos de catalogo vienen en webp y png
 * de 460 px, formatos y tamanos que Instagram no acepta.
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

  const etiqueta = ETIQUETAS[pieza.formato] ?? '';
  const tamano = gancho.length > 95 ? 54 : (gancho.length > 60 ? 64 : 76);
  const invita = INVITA[pieza.formato] ?? INVITA_POR_DEFECTO;
  const sitio = config.negocio.sitio.replace(/^https?:\/\//, '');

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
  ${INTER}
  @page { margin: 0 }
  *{margin:0;padding:0;box-sizing:border-box}
  /* El pie va anclado al borde inferior en vez de depender del flujo: con flex,
     un gancho largo empujaba el pie fuera de los 1080 px y quedaba cortado al
     fotografiar la pagina. */
  html,body{width:1080px;height:1080px;overflow:hidden}
  body{position:relative;font-family:${FAMILIA};
    background:${MARCA.azul};color:${MARCA.blanco};
    -webkit-font-smoothing:antialiased}
  .marco{position:absolute;inset:0 0 140px 0;display:flex;flex-direction:column;
    padding:76px 76px 48px}
  /* La etiqueta usa la forma del boton principal de la tienda: fondo blanco,
     texto azul, esquina redonda. */
  .etiqueta{align-self:flex-start;background:${MARCA.blanco};color:${MARCA.azul};
    font-size:24px;letter-spacing:2px;text-transform:uppercase;font-weight:700;
    padding:14px 30px;border-radius:${MARCA.radioPildora}px;margin-bottom:44px}
  .gancho{font-size:${tamano}px;line-height:1.1;font-weight:800;letter-spacing:-2px;max-width:900px}
  .apoyo{margin-top:34px;font-size:31px;line-height:1.45;color:${MARCA.azulClaro};
    max-width:860px;font-weight:400}
  .precio{margin-top:auto;align-self:flex-start;background:${MARCA.blanco};
    color:${MARCA.azul};border-radius:${MARCA.radioBloque}px;padding:30px 44px 34px}
  .precio small{display:block;font-size:24px;font-weight:700;text-transform:uppercase;
    letter-spacing:2px;color:${MARCA.azulOscuro};opacity:.75;margin-bottom:10px}
  .precio b{font-size:78px;font-weight:800;letter-spacing:-3px;line-height:1}
  .cierre{margin-top:auto}
  .cierre .invita{font-size:46px;font-weight:800;line-height:1.18;letter-spacing:-1.5px;max-width:880px}
  .cierre .canal{margin-top:24px;font-size:29px;font-weight:600;color:${MARCA.azulClaro}}
  .pie{position:absolute;left:0;right:0;bottom:0;height:140px;background:${MARCA.blanco};
    color:${MARCA.azul};padding:0 76px;display:flex;align-items:center;justify-content:space-between}
  .marca{display:flex;align-items:center;gap:18px}
  .marca .a{width:54px;height:54px}
  .marca .nombre{font-size:36px;font-weight:800;letter-spacing:.5px}
  .pie .oficial{font-size:23px;text-align:right;line-height:1.35;font-weight:600;color:${MARCA.azulOscuro}}
  </style></head><body>
  <div class="marco">
    ${etiqueta ? `<div class="etiqueta">${esc(etiqueta)}</div>` : ''}
    <div class="gancho">${esc(gancho)}</div>
    ${apoyo ? `<div class="apoyo">${esc(apoyo)}</div>` : ''}
    ${producto
      ? `<div class="precio"><small>${esc(producto.titulo)}</small><b>${esc(clp(producto.precio))}</b></div>`
      : `<div class="cierre">
          <div class="invita">${esc(invita)}</div>
          <div class="canal">Instagram @${esc(config.negocio.instagram)} · WhatsApp · ${esc(sitio)}</div>
        </div>`}
  </div>
  <div class="pie">
    <div class="marca">
      <svg class="a" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M50 12 L88 88 L68 88 L50 48 L32 88 L12 88 Z" fill="${MARCA.azul}"/>
        <rect x="34" y="62" width="32" height="13" fill="${MARCA.azul}"/>
      </svg>
      <span class="nombre">${esc(config.negocio.nombre)}</span>
    </div>
    <div class="oficial">Distribuidor oficial TUU<br>${esc(sitio)}</div>
  </div>
  </body></html>`;
}
