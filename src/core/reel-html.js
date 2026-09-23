import { readFileSync } from 'node:fs';
import config from '../config.js';
import { MARCA, INTER, FAMILIA } from './tarjeta.js';

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export const ANCHO = 1080;
export const ALTO = 1920;

/** Interpolacion con arranque y frenado suaves, para que nada entre de golpe. */
const suave = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Tramo de la animacion: 0 antes de `desde`, 1 despues de `hasta`. */
const tramo = (t, desde, hasta) => suave((t - desde) / (hasta - desde));

/**
 * Un fotograma del reel, como pagina HTML de 1080x1920.
 *
 * El video se arma fotografiando esta pagina con distintos valores de `t`, de 0
 * a 1, y pegando los fotogramas con ffmpeg. No hay IA en el medio: la foto del
 * equipo es la oficial y entra sin tocar, asi que lo que ve el cliente en el
 * reel es exactamente lo que le va a llegar a la casa.
 *
 * @param {object} opciones
 * @param {number} opciones.t Avance de la animacion, de 0 a 1.
 * @param {string} opciones.fotoBase64 Foto del equipo, ya en data URI.
 * @param {string} opciones.etiqueta Texto de la pastilla superior.
 * @param {string} opciones.titulo Titular grande.
 * @param {string} opciones.producto Nombre del equipo.
 * @param {string} opciones.precio Precio ya formateado.
 */
export function htmlDeFotograma({ t, fotoBase64, etiqueta, titulo, producto, precio }) {
  // El acercamiento es lento y constante: es lo que da sensacion de video sin
  // que el equipo se deforme ni gire, que es lo que delata una animacion falsa.
  const zoom = 1 + 0.09 * suave(t);
  const sitio = config.negocio.sitio.replace(/^https?:\/\//, '');

  const aparecer = (desde, hasta, px = 40) => {
    const p = tramo(t, desde, hasta);
    return `opacity:${p.toFixed(4)};transform:translateY(${((1 - p) * px).toFixed(2)}px)`;
  };

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
  ${INTER}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${ANCHO}px;height:${ALTO}px;overflow:hidden}
  body{position:relative;font-family:${FAMILIA};background:${MARCA.azul};
    color:${MARCA.blanco};-webkit-font-smoothing:antialiased}
  .equipo{position:absolute;left:0;right:0;top:620px;height:820px;
    display:flex;align-items:center;justify-content:center}
  .equipo img{max-width:74%;max-height:100%;object-fit:contain;
    transform:scale(${zoom.toFixed(4)});
    filter:drop-shadow(0 38px 46px rgba(0,0,0,.34))}
  .arriba{position:absolute;left:0;right:0;top:0;padding:150px 84px 0}
  .etiqueta{display:inline-block;background:${MARCA.blanco};color:${MARCA.azul};
    font-size:30px;letter-spacing:2px;text-transform:uppercase;font-weight:700;
    padding:17px 36px;border-radius:${MARCA.radioPildora}px;${aparecer(0.02, 0.22, 26)}}
  .titulo{margin-top:46px;font-size:84px;line-height:1.08;font-weight:800;
    letter-spacing:-2.5px;max-width:900px;${aparecer(0.10, 0.38)}}
  .abajo{position:absolute;left:0;right:0;bottom:200px;padding:0 84px}
  .precio{display:inline-block;background:${MARCA.blanco};color:${MARCA.azul};
    border-radius:${MARCA.radioBloque}px;padding:32px 50px 38px;${aparecer(0.42, 0.68, 46)}}
  .precio small{display:block;font-size:28px;font-weight:700;text-transform:uppercase;
    letter-spacing:2px;color:${MARCA.azulOscuro};opacity:.75;margin-bottom:10px}
  .precio b{font-size:92px;font-weight:800;letter-spacing:-3px;line-height:1}
  .pie{position:absolute;left:0;right:0;bottom:0;height:150px;background:${MARCA.blanco};
    color:${MARCA.azul};padding:0 84px;display:flex;align-items:center;justify-content:space-between}
  .marca{display:flex;align-items:center;gap:20px}
  .marca .nombre{font-size:40px;font-weight:800;letter-spacing:.5px}
  .oficial{font-size:26px;text-align:right;line-height:1.35;font-weight:600;color:${MARCA.azulOscuro}}
  </style></head><body>
  <div class="equipo"><img src="${fotoBase64}" alt=""></div>
  <div class="arriba">
    ${etiqueta ? `<div class="etiqueta">${esc(etiqueta)}</div>` : ''}
    <div class="titulo">${esc(titulo)}</div>
  </div>
  <div class="abajo">
    <div class="precio"><small>${esc(producto)}</small><b>${esc(precio)}</b></div>
  </div>
  <div class="pie">
    <div class="marca">
      <svg width="60" height="60" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M50 12 L88 88 L68 88 L50 48 L32 88 L12 88 Z" fill="${MARCA.azul}"/>
        <rect x="34" y="62" width="32" height="13" fill="${MARCA.azul}"/>
      </svg>
      <span class="nombre">${esc(config.negocio.nombre)}</span>
    </div>
    <div class="oficial">Distribuidor oficial TUU<br>${esc(sitio)}</div>
  </div>
  </body></html>`;
}

/** Lee la foto del equipo y la deja como data URI para incrustarla. */
export function fotoComoDataUri(ruta) {
  const datos = readFileSync(ruta);
  const tipo = /\.png$/i.test(ruta) ? 'image/png'
    : /\.webp$/i.test(ruta) ? 'image/webp' : 'image/jpeg';
  return `data:${tipo};base64,${datos.toString('base64')}`;
}
