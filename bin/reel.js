#!/usr/bin/env node
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { buscarProducto, clp } from '../src/core/catalogo.js';
import { htmlDeFotograma, fotoComoDataUri, ANCHO, ALTO } from '../src/core/reel-html.js';

/**
 * Arma un reel vertical de Instagram con la foto real del equipo.
 *
 * No usa IA de video. Fotografia una pagina HTML con distintos valores de
 * avance y pega los fotogramas con ffmpeg. Esto importa por tres razones: sale
 * en 1080x1920 de verdad y no en la resolucion que decida un modelo, cuesta
 * cero, y sobre todo la maquina que se ve es la foto oficial sin tocar. Un
 * modelo de video la redibuja, y el cliente terminaria viendo un aparato que no
 * es el que le va a llegar.
 *
 * Uso:
 *   node bin/reel.js --foto ruta/a/la/foto.png --producto pro-2-s-tuu
 */

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const valor = (nombre, porDefecto) => {
  const i = args.indexOf(`--${nombre}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : porDefecto;
};

const foto = valor('foto', '');
const handle = valor('producto', 'pro-2-s-tuu');
const salida = valor('salida', 'out');
const segundos = Number(valor('segundos', '5'));
const fps = Number(valor('fps', '30'));
const titulo = valor('titulo', '');

if (!foto || !existsSync(foto)) {
  console.error('Falta --foto con la ruta a la foto del equipo.');
  console.error('Es la foto oficial de la tienda: sin ella el reel no muestra la maquina.');
  process.exit(1);
}

const producto = buscarProducto(handle);
if (!producto) {
  console.error(`No existe el producto "${handle}" en el catalogo.`);
  process.exit(1);
}

const { chromium } = require('playwright-core');
const ffmpeg = require('ffmpeg-static');

const CHROMIUM = process.env.CHROMIUM
  ?? ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium']
    .find((ruta) => existsSync(ruta));

const total = Math.round(segundos * fps);
const cuadros = resolve(salida, '.cuadros');
rmSync(cuadros, { recursive: true, force: true });
mkdirSync(cuadros, { recursive: true });
mkdirSync(resolve(salida), { recursive: true });

// El gancho del producto es una frase ya escrita para vender ese equipo. Se
// prefiere al titulo generico cuando no viene uno por parametro.
const encabezado = titulo || producto.angulos?.[0] || producto.resumen || producto.titulo;
const fotoBase64 = fotoComoDataUri(foto);

console.log(`Reel de ${producto.titulo} · ${ANCHO}x${ALTO} · ${segundos}s a ${fps} fps (${total} cuadros)`);

const navegador = await chromium.launch({
  ...(CHROMIUM ? { executablePath: CHROMIUM } : {}),
  args: ['--no-sandbox'],
});
const pagina = await navegador.newPage({ viewport: { width: ANCHO, height: ALTO } });

for (let i = 0; i < total; i++) {
  const t = total === 1 ? 1 : i / (total - 1);
  await pagina.setContent(htmlDeFotograma({
    t,
    fotoBase64,
    etiqueta: 'Distribuidor oficial',
    titulo: encabezado,
    producto: producto.titulo,
    precio: clp(producto.precio),
  }), { waitUntil: 'load' });
  await pagina.screenshot({ path: resolve(cuadros, `${String(i).padStart(4, '0')}.png`) });
  if (i % 15 === 0) process.stdout.write(`\r  cuadro ${i + 1}/${total}`);
}
process.stdout.write(`\r  cuadro ${total}/${total}\n`);
await navegador.close();

const destino = resolve(salida, `reel-${handle}.mp4`);
execFileSync(ffmpeg, [
  '-y', '-framerate', String(fps),
  '-i', resolve(cuadros, '%04d.png'),
  // yuv420p es lo que Instagram acepta sin recodificar; sin esto el video se ve
  // bien en el computador y falla al subirlo desde el telefono.
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow',
  '-movflags', '+faststart',
  destino,
], { stdio: ['ignore', 'ignore', 'pipe'] });

rmSync(cuadros, { recursive: true, force: true });
console.log(`Listo: ${destino}`);
