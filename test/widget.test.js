import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { baseEnMemoria } from '../src/core/db.js';
import { renderWidgetJs } from '../src/routes/widget.js';
import { RUBROS } from '../src/core/catalogo.js';

beforeEach(() => { baseEnMemoria(); });

describe('widget servido como javascript', () => {
  test('es JavaScript valido', () => {
    const js = renderWidgetJs('https://ejemplo.cl');
    assert.doesNotThrow(() => new Function(js), 'el navegador debe poder ejecutarlo');
  });

  test('apunta al servidor que se le indica', () => {
    assert.match(renderWidgetJs('https://appos-tn6s.onrender.com'), /var API = "https:\/\/appos-tn6s\.onrender\.com"/);
  });

  test('ofrece todos los rubros del catalogo', () => {
    const js = renderWidgetJs('https://ejemplo.cl');
    for (const [clave, rubro] of Object.entries(RUBROS)) {
      assert.ok(js.includes(`value="${clave}"`), `falta el rubro ${clave}`);
      assert.ok(js.includes(rubro.nombre), `falta el nombre de ${clave}`);
    }
  });

  test('lleva la trampa anti-spam y el enlace de WhatsApp', () => {
    const js = renderWidgetJs('https://ejemplo.cl');
    assert.match(js, /name="sitio_web"/);
    assert.match(js, /wa\.me/);
  });

  test('no se monta dos veces si el script se carga repetido', () => {
    assert.match(renderWidgetJs('https://ejemplo.cl'), /data-appos-montado/);
  });

  test('detecta la pagina de producto para saber de donde vino el lead', () => {
    const js = renderWidgetJs('https://ejemplo.cl');
    assert.match(js, /producto:/);
    const origenActual = new Function(`
      var location = { pathname: '/products/pro-2' };
      ${js.slice(js.indexOf('function origenActual'), js.indexOf('function montar'))}
      return origenActual();
    `);
    assert.equal(origenActual(), 'producto:pro-2');
  });

  test('en una pagina que no es de producto el origen es generico', () => {
    const js = renderWidgetJs('https://ejemplo.cl');
    const origenActual = new Function(`
      var location = { pathname: '/pages/contacto' };
      ${js.slice(js.indexOf('function origenActual'), js.indexOf('function montar'))}
      return origenActual();
    `);
    assert.equal(origenActual(), 'web');
  });
});
