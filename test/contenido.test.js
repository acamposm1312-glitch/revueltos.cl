import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { baseEnMemoria } from '../src/core/db.js';
import { generarCalendario, guardarCalendario, listarPublicaciones, exportarCSV, DIAS_PUBLICACION } from '../src/core/contenido.js';
import { mensajeWhatsapp, mensajeEmail, render, nombreCorto } from '../src/core/plantillas.js';
import { PRODUCTOS, clp, recomendarPara, buscarProducto } from '../src/core/catalogo.js';

beforeEach(() => { baseEnMemoria(); });

describe('calendario', () => {
  test('respeta los dias de publicacion y no repite fechas', () => {
    const piezas = generarCalendario({ desde: new Date('2026-10-01T12:00:00Z'), cantidad: 9 });
    assert.equal(piezas.length, 9);
    for (const p of piezas) {
      const dia = new Date(p.fecha + 'T12:00:00Z').getUTCDay();
      assert.ok(DIAS_PUBLICACION.includes(dia), `${p.fecha} cae en dia ${dia}`);
    }
    assert.equal(new Set(piezas.map((p) => p.fecha)).size, 9);
  });

  test('mezcla formatos en vez de publicar solo catalogo', () => {
    const piezas = generarCalendario({ desde: new Date('2026-10-01T12:00:00Z'), cantidad: 9 });
    const formatos = new Set(piezas.map((p) => p.formato));
    assert.ok(formatos.size >= 3, `se esperaban varios formatos, hubo: ${[...formatos]}`);
  });

  test('es determinista: la misma fecha produce el mismo plan', () => {
    const a = generarCalendario({ desde: new Date('2026-10-01T12:00:00Z'), cantidad: 6 });
    const b = generarCalendario({ desde: new Date('2026-10-01T12:00:00Z'), cantidad: 6 });
    assert.deepEqual(a, b);
  });

  test('toda pieza trae copy, hashtags y mencion a APPOS o al sitio', () => {
    for (const p of generarCalendario({ cantidad: 9 })) {
      assert.ok(p.copy.length > 60, `copy muy corto: ${p.titulo}`);
      assert.match(p.hashtags, /#TUU/);
      assert.match(p.copy, /appos\.cl|APPOS|WhatsApp/i);
    }
  });

  test('guardar dos veces no duplica el calendario', () => {
    const piezas = generarCalendario({ desde: new Date('2026-10-01T12:00:00Z'), cantidad: 6 });
    assert.equal(guardarCalendario(piezas), 6);
    assert.equal(guardarCalendario(piezas), 0);
    assert.equal(listarPublicaciones().length, 6);
  });

  test('el CSV escapa las comillas del copy', () => {
    const csv = exportarCSV([{ fecha: '2026-10-01', canal: 'instagram', formato: 'post', producto_handle: 'pro-2', titulo: 'Con "comillas"', copy: 'linea 1\nlinea 2', hashtags: '#TUU' }]);
    assert.match(csv, /"Con ""comillas"""/);
    assert.equal(csv.split('\n')[0], 'fecha,canal,formato,producto,titulo,copy,hashtags');
  });
});

describe('plantillas', () => {
  test('saluda por el nombre y no deja "Hola ," cuando no lo hay', () => {
    assert.match(mensajeWhatsapp('primer_contacto', { nombre: 'ana soto' }), /^Hola Ana,/);
    assert.match(mensajeWhatsapp('primer_contacto', { nombre: '' }), /^Hola,/);
  });

  test('las variables sin valor no quedan a la vista', () => {
    for (const p of ['primer_contacto', 'cotizacion', 'confirmacion_compra', 'aviso_despacho', 'carrito_abandonado']) {
      const texto = mensajeWhatsapp(p, { nombre: 'Ana', rubro: 'almacen' });
      assert.doesNotMatch(texto, /\{\{/, `quedaron variables sin reemplazar en ${p}`);
    }
  });

  test('el correo separa asunto de cuerpo', () => {
    const { asunto, cuerpo } = mensajeEmail('bienvenida', { nombre: 'Ana Soto' });
    assert.match(asunto, /Ana/);
    assert.doesNotMatch(cuerpo, /^asunto:/i);
    assert.match(cuerpo, /distribuidor oficial de TUU/);
  });

  test('render deja vacia la variable desconocida', () => {
    assert.equal(render('a {{falta}} b', {}), 'a  b');
  });

  test('nombreCorto toma solo el primer nombre', () => {
    assert.equal(nombreCorto('JUAN CARLOS PEREZ'), 'Juan');
    assert.equal(nombreCorto(''), '');
  });
});

describe('catalogo', () => {
  test('los 20 productos tienen precio, handle y resumen', () => {
    assert.equal(PRODUCTOS.length, 20);
    for (const p of PRODUCTOS) {
      assert.ok(p.precio > 0, `${p.handle} sin precio`);
      assert.ok(p.handle && p.titulo && p.resumen, `${p.handle} incompleto`);
      assert.ok(['dispositivo', 'accesorio', 'insumo'].includes(p.categoria));
    }
  });

  test('no hay handles repetidos', () => {
    assert.equal(new Set(PRODUCTOS.map((p) => p.handle)).size, PRODUCTOS.length);
  });

  test('cada rubro recomienda equipos que existen en el catalogo', () => {
    for (const clave of ['almacen', 'restaurante', 'feria', 'retail', 'servicios', 'comida-rapida']) {
      const r = recomendarPara(clave);
      assert.ok(r.equipos.length > 0, `${clave} sin equipo recomendado`);
      assert.ok(r.equipos.every((e) => buscarProducto(e.handle)), `${clave} apunta a un producto inexistente`);
    }
  });

  test('los precios se muestran en formato chileno', () => {
    assert.equal(clp(39900), '$39.900');
    assert.equal(clp(419900), '$419.900');
    assert.equal(clp(8500), '$8.500');
  });
});
