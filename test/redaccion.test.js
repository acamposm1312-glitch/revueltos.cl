import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../src/config.js';
import { PRODUCTOS, RUBROS } from '../src/core/catalogo.js';
import { PILDORAS_EDUCATIVAS, generarCalendario } from '../src/core/contenido.js';
import { renderWidgetJs } from '../src/routes/widget.js';

/**
 * Palabras que en castellano SIEMPRE llevan tilde. No se incluyen las que
 * cambian de significado segun el acento -como "como", "que" o "mas"- porque
 * ahi la forma sin tilde tambien puede ser correcta.
 */
const SIN_TILDE = [
  'electronica', 'electronico', 'termico', 'termica', 'maquina', 'maquinas',
  'telefono', 'direccion', 'activacion', 'informacion', 'recomendacion',
  'cotizacion', 'numero', 'numeros', 'codigo', 'dias', 'aqui', 'proximas',
  'proximos', 'razon', 'acrilico', 'almacen', 'cafeteria', 'peluqueria',
  'rapida', 'atencion', 'impresion', 'configuracion', 'operacion', 'automatico',
  'ano ', 'anos', 'manana', 'confianza', 'util', 'utiles',
];

/**
 * Los marcadores {{variable}} son nombres de campo y las URL llevan el handle
 * del producto sin tildes por definicion ("/products/numeros-de-mesa-en-
 * acrilico-..."). Ni uno ni otro los lee el cliente como texto, asi que se
 * quitan antes de revisar la ortografia.
 */
const buscarSinTilde = (texto) => {
  const plano = String(texto)
    .replace(/\{\{[^}]*\}\}/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .toLowerCase();
  return SIN_TILDE.filter((palabra) => new RegExp(`\\b${palabra}\\b`, 'i').test(plano));
};

function plantillasDe(canal) {
  const dir = resolve(ROOT, 'src', 'templates', canal);
  return readdirSync(dir).filter((f) => f.endsWith('.txt'))
    .map((f) => [f, readFileSync(resolve(dir, f), 'utf8')]);
}

describe('redaccion de lo que lee el cliente', () => {
  for (const canal of ['whatsapp', 'email']) {
    test(`las plantillas de ${canal} estan bien acentuadas`, () => {
      for (const [archivo, texto] of plantillasDe(canal)) {
        const errores = buscarSinTilde(texto);
        assert.deepEqual(errores, [], `${canal}/${archivo} tiene palabras sin tilde: ${errores.join(', ')}`);
      }
    });
  }

  test('los textos del catalogo estan bien acentuados', () => {
    for (const p of PRODUCTOS) {
      const texto = [p.titulo, p.resumen, ...(p.angulos ?? [])].join(' ');
      assert.deepEqual(buscarSinTilde(texto), [], `el producto ${p.handle} tiene palabras sin tilde`);
    }
    for (const [clave, r] of Object.entries(RUBROS)) {
      assert.deepEqual(buscarSinTilde(r.nombre), [], `el rubro ${clave} tiene palabras sin tilde`);
    }
  });

  test('las publicaciones estan bien acentuadas', () => {
    for (const p of PILDORAS_EDUCATIVAS) {
      assert.deepEqual(buscarSinTilde(p.titulo + ' ' + p.cuerpo), [], `la pildora "${p.titulo}" tiene palabras sin tilde`);
    }
  });

  test('el calendario generado esta bien acentuado', () => {
    // Revisar solo las pildoras dejaba fuera el texto que arma el motor
    // alrededor de ellas, que es donde se colo "Complemento util".
    const piezas = generarCalendario({ desde: new Date('2026-10-01T12:00:00Z'), cantidad: 30 });
    for (const pieza of piezas) {
      assert.deepEqual(buscarSinTilde(`${pieza.titulo} ${pieza.copy}`), [],
        `la pieza "${pieza.titulo}" tiene palabras sin tilde`);
    }
  });

  test('el widget de la tienda esta bien acentuado', () => {
    const js = renderWidgetJs('https://ejemplo.cl');
    const visibles = (js.match(/>([^<>{}]{4,120})</g) ?? []).join(' ');
    assert.deepEqual(buscarSinTilde(visibles), [], 'el widget tiene palabras sin tilde');
  });

  test('las preguntas al cliente abren con el signo correspondiente', () => {
    const js = renderWidgetJs('https://ejemplo.cl');
    const preguntas = js.match(/>([^<>]*\?)</g) ?? [];
    assert.ok(preguntas.length > 0, 'deberia haber preguntas en el formulario');
    for (const p of preguntas) {
      assert.ok(p.includes('¿'), `falta el signo de apertura en: ${p}`);
    }
  });
});
