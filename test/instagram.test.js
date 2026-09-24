import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { baseEnMemoria, db, ahora } from '../src/core/db.js';
import config from '../src/config.js';
import { textoDePieza, publicarImagen, publicarPieza, piezasPendientes, ErrorInstagram } from '../src/core/instagram.js';

/** Finge las dos respuestas de Meta y anota las llamadas que se hicieron. */
function fetchFalso(respuestas) {
  const llamadas = [];
  const impl = async (url, opciones = {}) => {
    llamadas.push({ url, cuerpo: opciones.body ?? '', metodo: opciones.method ?? 'GET' });
    const r = respuestas.shift() ?? { ok: true, json: {} };
    return {
      ok: r.ok !== false,
      status: r.status ?? (r.ok === false ? 400 : 200),
      text: async () => JSON.stringify(r.json ?? {}),
    };
  };
  impl.llamadas = llamadas;
  return impl;
}

const guardarPieza = (extra = {}) => {
  db().prepare(`INSERT INTO publicaciones (fecha, canal, formato, producto_handle, titulo, copy, hashtags, imagen_url, estado, creado)
    VALUES (?, 'instagram', 'post', ?, ?, ?, ?, ?, 'planificada', ?)`)
    .run(extra.fecha ?? '2026-01-01', extra.handle ?? 'pro-2', 'Titulo', 'Cuerpo del aviso',
      '#TUU #APPOS', extra.imagen ?? 'https://cdn.ejemplo.cl/a.png', ahora());
  return db().prepare('SELECT * FROM publicaciones ORDER BY id DESC LIMIT 1').get();
};

beforeEach(() => {
  baseEnMemoria();
  config.instagram.igUserId = '1784';
  config.instagram.token = 'token-de-prueba';
  config.instagram.base = 'https://graph.instagram.com/v21.0';
});

describe('publicacion en Instagram', () => {
  test('el texto junta copy y hashtags separados por una linea', () => {
    assert.equal(textoDePieza({ copy: 'Hola', hashtags: '#TUU' }), 'Hola\n\n#TUU');
    assert.equal(textoDePieza({ copy: 'Hola', hashtags: '' }), 'Hola');
    assert.equal(textoDePieza({ copy: '', hashtags: '' }), '');
  });

  test('publicar son dos llamadas: primero el contenedor y despues la publicacion', async () => {
    const impl = fetchFalso([{ json: { id: 'contenedor-1' } }, { json: { id: 'publicacion-9' } }]);
    const id = await publicarImagen(
      { imagenUrl: 'https://cdn.ejemplo.cl/a.png', texto: 'Hola' },
      { fetchImpl: impl },
    );
    assert.equal(id, 'publicacion-9');
    assert.equal(impl.llamadas.length, 2);
    assert.match(impl.llamadas[0].url, /1784\/media$/);
    assert.match(impl.llamadas[1].url, /1784\/media_publish$/);
    // El segundo paso tiene que referirse al contenedor que devolvio el primero.
    assert.match(impl.llamadas[1].cuerpo, /creation_id=contenedor-1/);
  });

  test('rechaza una imagen que no sea https publica', async () => {
    // Instagram descarga la foto desde sus servidores: una ruta local nunca le
    // va a llegar, y conviene avisarlo antes de gastar la llamada.
    for (const mala of ['/tmp/a.png', 'http://ejemplo.cl/a.png', 'data:image/png;base64,AA']) {
      await assert.rejects(
        () => publicarImagen({ imagenUrl: mala, texto: 'x' }, { fetchImpl: fetchFalso([]) }),
        ErrorInstagram,
      );
    }
  });

  test('un error de Meta llega completo, no recortado a "fallo"', async () => {
    const impl = fetchFalso([{ ok: false, status: 400, json: { error: { message: 'Invalid OAuth access token' } } }]);
    await assert.rejects(
      () => publicarImagen({ imagenUrl: 'https://cdn.ejemplo.cl/a.png', texto: 'x' }, { fetchImpl: impl }),
      (e) => e.message.includes('Invalid OAuth access token'),
    );
  });

  test('una pieza publicada queda marcada con el identificador de Instagram', async () => {
    const pieza = guardarPieza();
    const impl = fetchFalso([{ json: { id: 'c1' } }, { json: { id: 'ig-777' } }]);
    const r = await publicarPieza(pieza, { fetchImpl: impl });
    assert.equal(r.publicada, true);
    const fila = db().prepare('SELECT * FROM publicaciones WHERE id = ?').get(pieza.id);
    assert.equal(fila.estado, 'publicada');
    assert.equal(fila.referencia_externa, 'ig-777');
  });

  test('una pieza sin imagen no se marca fallida: sigue esperando', async () => {
    const pieza = guardarPieza({ imagen: '' });
    const r = await publicarPieza(pieza, { fetchImpl: fetchFalso([]) });
    assert.equal(r.publicada, false);
    assert.equal(r.motivo, 'sin imagen');
    assert.equal(db().prepare('SELECT estado FROM publicaciones WHERE id = ?').get(pieza.id).estado, 'planificada');
  });

  test('si Meta falla, la pieza queda fallida y no se reintenta sola', async () => {
    const pieza = guardarPieza();
    const impl = fetchFalso([{ ok: false, status: 400, json: { error: { message: 'boom' } } }]);
    const r = await publicarPieza(pieza, { fetchImpl: impl });
    assert.equal(r.publicada, false);
    assert.equal(db().prepare('SELECT estado FROM publicaciones WHERE id = ?').get(pieza.id).estado, 'fallida');
    assert.deepEqual(piezasPendientes(new Date('2026-06-01')).map((p) => p.id), []);
  });

  test('solo entran las piezas cuya fecha ya llego', () => {
    guardarPieza({ fecha: '2026-01-01', handle: 'a' });
    guardarPieza({ fecha: '2026-12-31', handle: 'b' });
    const pendientes = piezasPendientes(new Date('2026-06-15T12:00:00Z'));
    assert.deepEqual(pendientes.map((p) => p.fecha), ['2026-01-01']);
  });
});
