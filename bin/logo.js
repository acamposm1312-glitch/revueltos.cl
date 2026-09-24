#!/usr/bin/env node
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { ROOT } from '../src/config.js';
import { MARCA } from '../src/core/tarjeta.js';
import { CARPETA, LOCKUP } from '../src/core/marca-tuu.js';

/**
 * Dibuja el logo de APPOS para la cabecera de la tienda.
 *
 * Salen dos variantes, cada una sobre el azul de TUU y sobre transparente:
 *
 *   propia  APPOS Chile, una linea divisoria y "Distribuidor autorizado TUU"
 *           escrito con la tipografia de la tienda. No reutiliza ninguna pieza
 *           grafica de TUU, solo su nombre, que es lo que un distribuidor puede
 *           decir de si mismo.
 *
 *   lockup  Reemplaza "TUU Chile" por "APPOS Chile" dentro del lockup oficial,
 *           conservando la carita y la insignia. Se ve mejor, pero es una marca
 *           de TUU alterada: casi todos los manuales lo prohiben, y el riesgo
 *           de usarla lo corre APPOS, no este programa.
 *
 * Uso:
 *   node bin/logo.js --salida out
 */

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const valor = (n, def) => {
  const i = args.indexOf(`--${n}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};

const salida = valor('salida', 'out');
const ANCHO = 1600;
const ALTO = 520;

// El lockup oficial mide 1253x261. "TUU Chile" llega hasta el pixel 391, la
// carita va de 391 a 647, el separador esta en 713 y la insignia desde 772.
const LOCKUP_ANCHO = 1253;
const LOCKUP_ALTO = 261;
const TRAS_LA_PALABRA = 391;
const ESCALA = 0.95;

const interCss = () => {
  try {
    return [400, 700, 800].map((peso) => {
      const ruta = resolve(ROOT, 'node_modules/@fontsource/inter/files', `inter-latin-${peso}-normal.woff2`);
      return `@font-face{font-family:Inter;font-weight:${peso};font-display:block;`
        + `src:url(data:font/woff2;base64,${readFileSync(ruta).toString('base64')}) format('woff2')}`;
    }).join('');
  } catch {
    return '';
  }
};

const lockupDataUri = () => {
  const ruta = resolve(CARPETA, LOCKUP);
  if (!existsSync(ruta)) return '';
  return `data:image/png;base64,${readFileSync(ruta).toString('base64')}`;
};

const INTER = interCss();
const FAMILIA = INTER ? 'Inter, sans-serif' : '"Helvetica Neue",Helvetica,Arial,sans-serif';

/** Trozo del lockup oficial a la derecha del wordmark de TUU. */
const trozoLockup = (uri) => `
  <div style="height:${LOCKUP_ALTO * ESCALA}px;width:${(LOCKUP_ANCHO - TRAS_LA_PALABRA) * ESCALA}px;
    overflow:hidden;position:relative;flex:none">
    <img src="${uri}" style="position:absolute;left:${-TRAS_LA_PALABRA * ESCALA}px;top:0;
      height:${LOCKUP_ALTO * ESCALA}px;width:${LOCKUP_ANCHO * ESCALA}px;max-width:none" alt="">
  </div>`;

const bloquePropio = `
  <div style="width:4px;height:150px;background:${MARCA.blanco};flex:none;margin:0 6px"></div>
  <div style="flex:none;text-align:left;line-height:1.05">
    <div style="font-size:46px;font-weight:700;letter-spacing:-.5px;opacity:.95">Distribuidor autorizado</div>
    <div style="font-size:86px;font-weight:800;letter-spacing:-3px;margin-top:4px">TUU</div>
  </div>`;

const pagina = (derecha, fondo) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
${INTER}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${ANCHO}px;height:${ALTO}px}
body{background:${fondo};display:flex;align-items:center;justify-content:center;
  font-family:${FAMILIA};color:${MARCA.blanco};-webkit-font-smoothing:antialiased}
.marca{display:flex;align-items:center;gap:30px}
.palabra .grande{font-size:140px;font-weight:800;letter-spacing:-5px;line-height:.86;display:block}
.palabra .chico{font-size:50px;font-weight:800;letter-spacing:-1px;display:block;
  text-align:right;margin-top:6px}
</style></head><body>
  <div class="marca">
    <div class="palabra"><span class="grande">APPOS</span><span class="chico">Chile</span></div>
    ${derecha}
  </div>
</body></html>`;

const uri = lockupDataUri();
const variantes = [['propia', bloquePropio]];
if (uri) variantes.push(['lockup', trozoLockup(uri)]);
else console.warn(`Aviso: falta ${LOCKUP} en ${CARPETA}, no genero la variante del lockup.`);

const { chromium } = require('playwright-core');
const CHROMIUM = process.env.CHROMIUM
  ?? ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium'].find((r) => existsSync(r));

mkdirSync(resolve(salida), { recursive: true });
const navegador = await chromium.launch({
  ...(CHROMIUM ? { executablePath: CHROMIUM } : {}),
  args: ['--no-sandbox'],
});
const pag = await navegador.newPage({ viewport: { width: ANCHO, height: ALTO } });

for (const [nombre, derecha] of variantes) {
  for (const [sufijo, fondo] of [['azul', MARCA.azul], ['transparente', 'transparent']]) {
    const destino = resolve(salida, `appos-logo-${nombre}-${sufijo}.png`);
    await pag.setContent(pagina(derecha, fondo), { waitUntil: 'load' });
    await pag.screenshot({ path: destino, omitBackground: fondo === 'transparent' });
    console.log(`Listo: ${destino}`);
  }
}
await navegador.close();
