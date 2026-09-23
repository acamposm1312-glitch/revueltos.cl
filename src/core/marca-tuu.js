import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../config.js';

/**
 * Acceso al material de marca que TUU entrega a sus distribuidores.
 *
 * Los archivos no estan en el repositorio, que es publico: ese material esta
 * licenciado a APPOS como distribuidor autorizado, no liberado. Viven en
 * assets/tuu, que esta en .gitignore, y se reponen desde el Drive segun
 * assets/tuu/LEEME.md.
 *
 * Todo lo de aca devuelve cadena vacia cuando el archivo falta. Las piezas
 * salen sin foto y sin lockup, que es como salian antes: pierden calidad, no se
 * rompen.
 */

export const CARPETA = process.env.TUU_ASSETS ?? resolve(ROOT, 'assets', 'tuu');

/**
 * Render oficial de cada producto del catalogo.
 *
 * Se elige el angulo que mejor cuenta el producto en vertical, no el mas
 * bonito: la Pro 2 de tres cuartos porque muestra la pantalla cobrando, que es
 * lo que la gente quiere ver.
 */
const RENDERS = {
  'pro-2': 'pro-2-left-side.png',
  'pro-2-s-tuu': 'pro-2-left-side.png',
  'punto-de-venta-tuu-cl': 'pro2-top.png',
};

export const LOCKUP = 'logo-recortada.png';

const TIPOS = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

/** Un archivo de la carpeta como data URI, o cadena vacia si no esta. */
export function comoDataUri(archivo) {
  if (!archivo) return '';
  const ruta = resolve(CARPETA, archivo);
  if (!existsSync(ruta)) return '';
  const ext = (archivo.match(/\.[a-z]+$/i) ?? [''])[0].toLowerCase();
  return `data:${TIPOS[ext] ?? 'image/png'};base64,${readFileSync(ruta).toString('base64')}`;
}

/** Render del producto, o cadena vacia si no hay una para ese handle. */
export const renderDe = (handle) => comoDataUri(RENDERS[handle]);

/** Lockup de distribuidor autorizado, listo para incrustar. */
export const lockup = () => comoDataUri(LOCKUP);

/** Para el diagnostico: que hay y que falta. */
export function inventario() {
  const archivos = [...new Set([LOCKUP, ...Object.values(RENDERS)])];
  return archivos.map((a) => ({ archivo: a, presente: existsSync(resolve(CARPETA, a)) }));
}
