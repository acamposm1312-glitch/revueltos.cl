#!/usr/bin/env node
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { ROOT } from '../src/config.js';
import { generarCalendario } from '../src/core/contenido.js';
import { htmlDeTarjeta } from '../src/core/tarjeta.js';

/**
 * Renderiza las piezas del calendario como imagenes cuadradas para Instagram.
 *
 * Es una herramienta de desarrollo: el servidor sigue sin dependencias de
 * ejecucion. Playwright va en devDependencies porque hace falta control exacto
 * del viewport. Fotografiar con el Chromium de linea de comandos no sirve: su
 * viewport queda 87 px mas bajo que la ventana pedida, asi que el pie de la
 * tarjeta salia cortado en todas las imagenes.
 */

const require = createRequire(import.meta.url);

const CHROMIUM = process.env.CHROMIUM
  ?? ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome']
    .find((ruta) => existsSync(ruta));

const args = process.argv.slice(2);
const valor = (nombre, porDefecto) => {
  const i = args.indexOf(`--${nombre}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : porDefecto;
};

const LADO = 1080;
const cantidad = Number(valor('cantidad', 9));
const salida = resolve(valor('salida', resolve(ROOT, 'out', 'instagram')));

let chromium;
try {
  ({ chromium } = require('playwright-core'));
} catch {
  console.error('Falta playwright-core. Instalalo con:  npm install');
  process.exit(1);
}

mkdirSync(salida, { recursive: true });
const piezas = generarCalendario({ cantidad });

const navegador = await chromium.launch({
  ...(CHROMIUM ? { executablePath: CHROMIUM } : {}),
  args: ['--no-sandbox'],
});
const pagina = await navegador.newPage({ viewport: { width: LADO, height: LADO } });

console.log(`Generando ${piezas.length} imágenes de ${LADO}x${LADO} en ${salida}\n`);

for (const [i, pieza] of piezas.entries()) {
  const base = `${pieza.fecha}-${pieza.formato}`;
  await pagina.setContent(htmlDeTarjeta(pieza), { waitUntil: 'load' });
  await pagina.screenshot({ path: resolve(salida, `${base}.png`) });

  // El texto para la descripcion viaja junto a la imagen: sin el, hay que
  // volver al calendario a buscar cual copy corresponde a cual imagen.
  writeFileSync(resolve(salida, `${base}.txt`), `${pieza.copy}\n\n${pieza.hashtags}\n`);
  console.log(`  ${String(i + 1).padStart(2)}. ${base}.png  ·  ${pieza.titulo}`);
}

await navegador.close();
console.log(`\nListo. Cada imagen trae su .txt con el texto para pegar como descripción.`);
