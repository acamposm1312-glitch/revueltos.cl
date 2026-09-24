#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';
import { createRequire } from 'node:module';

/**
 * Recorta el fondo blanco de una foto de producto y deja un PNG transparente.
 *
 * Las fotos oficiales de TUU vienen sobre blanco de estudio. Para montarlas
 * sobre el azul de la marca hay que sacarles ese fondo, y los servicios que lo
 * hacen no alcanzan el CDN de la tienda ni aceptan archivos locales desde aca.
 * Esto lo resuelve sin salir a internet.
 *
 * No usa un umbral global, que tambien borraria los brillos blancos del propio
 * equipo. Rellena desde los bordes hacia adentro, asi que solo desaparece el
 * blanco que esta conectado con el borde de la foto.
 *
 * Uso:
 *   node bin/recortar.js --foto entrada.jpg --salida carpeta/
 */

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const valor = (nombre, porDefecto) => {
  const i = args.indexOf(`--${nombre}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : porDefecto;
};

const entrada = valor('foto', '');
const salida = valor('salida', 'out');
const tolerancia = Number(valor('tolerancia', '18'));
const margen = Number(valor('margen', '12'));
// Por defecto el fondo es el blanco de estudio de las fotos de producto. Con
// --fondo se recorta sobre otro color plano, como el azul del logo de TUU.
const fondo = valor('fondo', '#ffffff');

const aRgb = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) { console.error(`Color invalido: ${hex}. Usa formato #rrggbb.`); process.exit(1); }
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const fondoRgb = aRgb(fondo);

if (!entrada || !existsSync(entrada)) {
  console.error('Falta --foto con la ruta a la imagen.');
  process.exit(1);
}

const { chromium } = require('playwright-core');
const CHROMIUM = process.env.CHROMIUM
  ?? ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium']
    .find((r) => existsSync(r));

const tipo = extname(entrada).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
const fuente = `data:${tipo};base64,${readFileSync(entrada).toString('base64')}`;

const navegador = await chromium.launch({
  ...(CHROMIUM ? { executablePath: CHROMIUM } : {}),
  args: ['--no-sandbox'],
});
const pagina = await navegador.newPage();

const resultado = await pagina.evaluate(async ({ src, tolerancia, margen, fondoRgb }) => {
  const img = new Image();
  img.src = src;
  await img.decode();

  const lienzo = document.createElement('canvas');
  lienzo.width = img.width;
  lienzo.height = img.height;
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);

  const datos = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
  const px = datos.data;
  const { width: an, height: al } = lienzo;

  // Distancia al color de fondo. El JPEG y los degradados suaves del render
  // dejan ruido, de ahi la tolerancia.
  const esFondo = (i) => Math.abs(px[i] - fondoRgb[0]) <= tolerancia
    && Math.abs(px[i + 1] - fondoRgb[1]) <= tolerancia
    && Math.abs(px[i + 2] - fondoRgb[2]) <= tolerancia;

  // Relleno desde los bordes. Una pila explicita en vez de recursion: con 2576
  // por 1929 pixeles, la recursion revienta el stack.
  const marca = new Uint8Array(an * al);
  const pila = [];
  for (let x = 0; x < an; x++) { pila.push(x, x + (al - 1) * an); }
  for (let y = 0; y < al; y++) { pila.push(y * an, an - 1 + y * an); }

  while (pila.length) {
    const p = pila.pop();
    if (marca[p]) continue;
    if (!esFondo(p * 4)) continue;
    marca[p] = 1;
    const x = p % an, y = (p / an) | 0;
    if (x > 0) pila.push(p - 1);
    if (x < an - 1) pila.push(p + 1);
    if (y > 0) pila.push(p - an);
    if (y < al - 1) pila.push(p + an);
  }

  // Suaviza el filo: un pixel del equipo que linda con el fondo y quedo muy
  // claro es mezcla de los dos, y dejarlo opaco produce una orla blanca.
  const alfa = new Uint8ClampedArray(an * al);
  for (let p = 0; p < an * al; p++) {
    if (marca[p]) { alfa[p] = 0; continue; }
    const x = p % an, y = (p / an) | 0;
    const linda = (x > 0 && marca[p - 1]) || (x < an - 1 && marca[p + 1])
      || (y > 0 && marca[p - an]) || (y < al - 1 && marca[p + an]);
    if (!linda) { alfa[p] = 255; continue; }
    const i = p * 4;
    const dist = Math.max(
      Math.abs(px[i] - fondoRgb[0]),
      Math.abs(px[i + 1] - fondoRgb[1]),
      Math.abs(px[i + 2] - fondoRgb[2]),
    ) / 255;
    // Cerca del color de fondo el pixel es mezcla; dejarlo opaco deja una orla.
    alfa[p] = dist >= 0.2 ? 255 : 255 * (dist / 0.2);
  }
  for (let p = 0; p < an * al; p++) px[p * 4 + 3] = alfa[p];

  // Recorta al rectangulo que ocupa el equipo, para que llene el cuadro.
  let x0 = an, y0 = al, x1 = -1, y1 = -1;
  for (let y = 0; y < al; y++) {
    for (let x = 0; x < an; x++) {
      if (px[(y * an + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { error: 'La imagen quedo entera transparente: el fondo no era del color indicado.' };

  x0 = Math.max(0, x0 - margen); y0 = Math.max(0, y0 - margen);
  x1 = Math.min(an - 1, x1 + margen); y1 = Math.min(al - 1, y1 + margen);

  ctx.putImageData(datos, 0, 0);
  const recorte = document.createElement('canvas');
  recorte.width = x1 - x0 + 1;
  recorte.height = y1 - y0 + 1;
  recorte.getContext('2d').drawImage(lienzo, x0, y0, recorte.width, recorte.height,
    0, 0, recorte.width, recorte.height);

  const fondoQuitado = marca.reduce((n, v) => n + v, 0);
  return {
    png: recorte.toDataURL('image/png'),
    ancho: recorte.width,
    alto: recorte.height,
    pctQuitado: (100 * fondoQuitado / (an * al)).toFixed(1),
  };
}, { src: fuente, tolerancia, margen, fondoRgb });

await navegador.close();

if (resultado.error) {
  console.error(resultado.error);
  process.exit(1);
}

const destino = resolve(salida, `${basename(entrada, extname(entrada))}-recortada.png`);
writeFileSync(destino, Buffer.from(resultado.png.split(',')[1], 'base64'));
console.log(`Fondo quitado: ${resultado.pctQuitado}% de la foto.`);
console.log(`Recortada a ${resultado.ancho}x${resultado.alto}: ${destino}`);
