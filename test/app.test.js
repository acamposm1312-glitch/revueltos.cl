import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { baseEnMemoria } from '../src/core/db.js';
import { manifiesto, cabeceraHtml } from '../src/routes/comunes.js';
import { generarIcono, codificarPng } from '../src/core/icono.js';
import { renderPanel } from '../src/routes/panel.js';
import { renderDiagnostico } from '../src/routes/diagnostico.js';
import { renderComision } from '../src/routes/comision.js';
import { guardarLead } from '../src/core/leads.js';

beforeEach(() => { baseEnMemoria(); });

describe('icono', () => {
  test('produce un PNG valido', () => {
    const png = generarIcono(64);
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'firma PNG');
    assert.equal(png.subarray(12, 16).toString('ascii'), 'IHDR');
    assert.equal(png.readUInt32BE(16), 64, 'ancho');
    assert.equal(png.readUInt32BE(20), 64, 'alto');
    assert.equal(png.subarray(png.length - 8, png.length - 4).toString('ascii'), 'IEND');
  });

  test('sirve en los dos tamanos que pide la instalacion', () => {
    for (const lado of [192, 512]) {
      const png = generarIcono(lado);
      assert.equal(png.readUInt32BE(16), lado);
      assert.ok(png.length > 500, `el icono de ${lado}px parece vacio`);
    }
  });

  test('codificarPng respeta el tamano declarado', () => {
    const png = codificarPng(new Uint8Array(8 * 8 * 4), 8);
    assert.equal(png.readUInt32BE(16), 8);
  });
});

describe('manifiesto de la aplicacion', () => {
  test('se abre a pantalla completa y ya autenticada', () => {
    const m = manifiesto('mi-token');
    assert.equal(m.display, 'standalone');
    assert.equal(m.start_url, '/?token=mi-token', 'debe arrancar con el token o abriria en No autorizado');
    assert.equal(m.icons.length, 3);
    assert.ok(m.icons.some((i) => i.purpose === 'maskable'), 'Android recorta el icono si no hay maskable');
  });

  test('sin token arranca en la raiz', () => {
    assert.equal(manifiesto('').start_url, '/');
  });

  test('escapa el token en la direccion', () => {
    assert.equal(manifiesto('a b&c').start_url, '/?token=a%20b%26c');
  });
});

describe('cabecera de las paginas', () => {
  test('lleva lo que iOS necesita para instalarla', () => {
    const h = cabeceraHtml('Prueba', 't');
    assert.match(h, /rel="apple-touch-icon" href="\/icono-192\.png"/);
    assert.match(h, /apple-mobile-web-app-capable" content="yes"/);
    assert.match(h, /rel="manifest" href="\/manifest\.webmanifest\?token=t"/);
    assert.match(h, /name="theme-color"/);
  });

  test('escapa el titulo', () => {
    assert.doesNotMatch(cabeceraHtml('<script>alert(1)</script>', ''), /<script>alert\(1\)<\/script>/);
  });

  test('las tres paginas del panel son instalables', () => {
    guardarLead({ nombre: 'Ana', telefono: '987654321' });
    for (const html of [renderPanel('t'), renderDiagnostico('t'), renderComision('t', {})]) {
      assert.match(html, /rel="manifest"/);
      assert.match(html, /apple-touch-icon/);
    }
  });
});

describe('cabecera del panel', () => {
  test('muestra los tres numeros del dia', () => {
    guardarLead({ nombre: 'Ana', telefono: '987654321', valor_estimado: 39900 });
    const html = renderPanel('t');
    assert.match(html, /Por hacer hoy/);
    assert.match(html, /Negocios abiertos/);
    assert.match(html, /En juego/);
    assert.match(html, /\$39\.900/);
  });

  test('saluda segun la hora y con la fecha', () => {
    assert.match(renderPanel('t'), /Buen(os|as) (días|tardes|noches), Alejandro · /);
  });
});

describe('cuando falta la llave', () => {
  test('explica que hacer, sin hablar de archivos que el usuario no tiene', async () => {
    const { paginaNoAutorizado } = await import('../src/routes/comunes.js');
    const html = paginaNoAutorizado(false);
    assert.match(html, /Falta la llave de acceso/);
    assert.match(html, /\?token=TU_LLAVE/);
    assert.doesNotMatch(html, /\.env/, 'quien entra desde el telefono no tiene un archivo .env');
  });

  test('distingue entre no traer llave y traer una equivocada', async () => {
    const { paginaNoAutorizado } = await import('../src/routes/comunes.js');
    assert.match(paginaNoAutorizado(true), /no coincide/);
    assert.match(paginaNoAutorizado(false), /Esta página es privada/);
  });

  test('la pagina de error tambien se ve bien en el telefono', async () => {
    const { paginaNoAutorizado } = await import('../src/routes/comunes.js');
    assert.match(paginaNoAutorizado(false), /name="viewport"/);
  });
});
