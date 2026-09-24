#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';
import { createRequire } from 'node:module';

/**
 * Pinta un logo de otro color, respetando los bordes suavizados.
 *
 * Un logo plano no se puede recolorear cambiando pixel por pixel el color
 * exacto: los bordes son mezcla del trazo y del fondo, y si solo se reemplaza
 * el tono puro queda un contorno del color viejo. Aca se usa la opacidad de
 * cada pixel -o su distancia al color de origen- como mascara, y se pinta
 * encima. El filo queda igual de limpio que en el original.
 *
 * Modos:
 *   por defecto  Pinta del color nuevo todo lo que no sea transparente.
 *   --de <hex>   Pinta solo lo que se parezca a ese color, y deja el resto.
 *   --tono       Conserva la luminosidad de cada pixel en vez de aplanarla.
 *                Sirve para logos con degradado o sombras.
 *
 * Uso:
 *   node bin/recolorear.js --foto logo.png --a '#1731ef' --salida out/
 */

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const bandera = (n) => args.includes(`--${n}`);
const valor = (n, def) => {
  const i = args.indexOf(`--${n}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};

const entrada = valor('foto', '');
const destino = valor('a', '');
const origen = valor('de', '');
const salida = valor('salida', 'out');
const tolerancia = Number(valor('tolerancia', '60'));
const conservarTono = bandera('tono');

const aRgb = (hex, etiqueta) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) { console.error(`${etiqueta} invalido: "${hex}". Usa formato #rrggbb.`); process.exit(1); }
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

if (!entrada || !existsSync(entrada)) { console.error('Falta --foto con la ruta a la imagen.'); process.exit(1); }
if (!destino) { console.error('Falta --a con el color nuevo, por ejemplo --a "#1731ef".'); process.exit(1); }

const destinoRgb = aRgb(destino, 'Color de destino');
const origenRgb = origen ? aRgb(origen, 'Color de origen') : null;

const { chromium } = require('playwright-core');
const CHROMIUM = process.env.CHROMIUM
  ?? ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium'].find((r) => existsSync(r));

const tipo = extname(entrada).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
const fuente = `data:${tipo};base64,${readFileSync(entrada).toString('base64')}`;

const navegador = await chromium.launch({
  ...(CHROMIUM ? { executablePath: CHROMIUM } : {}),
  args: ['--no-sandbox'],
});
const pagina = await navegador.newPage();

const resultado = await pagina.evaluate(async ({ src, destinoRgb, origenRgb, tolerancia, conservarTono }) => {
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
  let pintados = 0;

  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 8) continue;

    if (origenRgb) {
      const d = Math.max(
        Math.abs(px[i] - origenRgb[0]),
        Math.abs(px[i + 1] - origenRgb[1]),
        Math.abs(px[i + 2] - origenRgb[2]),
      );
      if (d > tolerancia) continue;
    }

    if (conservarTono) {
      // La luminosidad del pixel modula el color nuevo, asi que los degradados
      // y las sombras del logo original se mantienen.
      const l = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
      px[i] = Math.round(destinoRgb[0] * l);
      px[i + 1] = Math.round(destinoRgb[1] * l);
      px[i + 2] = Math.round(destinoRgb[2] * l);
    } else {
      px[i] = destinoRgb[0];
      px[i + 1] = destinoRgb[1];
      px[i + 2] = destinoRgb[2];
    }
    pintados++;
  }

  ctx.putImageData(datos, 0, 0);
  return {
    png: lienzo.toDataURL('image/png'),
    ancho: lienzo.width,
    alto: lienzo.height,
    pct: (100 * pintados / (px.length / 4)).toFixed(1),
  };
}, { src: fuente, destinoRgb, origenRgb, tolerancia, conservarTono });

await navegador.close();

mkdirSync(resolve(salida), { recursive: true });
const ruta = resolve(salida, `${basename(entrada, extname(entrada))}-${destino.replace('#', '')}.png`);
writeFileSync(ruta, Buffer.from(resultado.png.split(',')[1], 'base64'));
console.log(`Pintado el ${resultado.pct}% de la imagen (${resultado.ancho}x${resultado.alto}).`);
console.log(`Listo: ${ruta}`);
