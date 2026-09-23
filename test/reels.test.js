import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { modelosDeVideo } from '../src/core/reels.js';

describe('catalogo de modelos de RunAPI', () => {
  test('reconoce los modelos Wan vengan en data, models o results', () => {
    const uno = { id: 'wan-2.5-image-to-video' };
    for (const envoltorio of [{ data: [uno] }, { models: [uno] }, { results: [uno] }, [uno]]) {
      assert.equal(modelosDeVideo(envoltorio).length, 1, `no leyo ${JSON.stringify(envoltorio)}`);
    }
  });

  test('distingue imagen a video de texto a video', () => {
    // Es la distincion que importa: un modelo de texto a video ignora la foto
    // del equipo y dibuja una maquina que no existe.
    const modelos = modelosDeVideo({
      data: [
        { id: 'wan-2.7-text-to-video' },
        { id: 'wan-2.5-image-to-video' },
        { id: 'wan-i2v-turbo' },
        { id: 'veo-3-image-to-video' },
      ],
    });
    assert.deepEqual(modelos.map((m) => m.id), ['wan-2.5-image-to-video', 'wan-i2v-turbo', 'wan-2.7-text-to-video']);
    assert.equal(modelos.at(-1).imagenAVideo, false, 'el de texto a video quedo marcado como util');
    assert.ok(modelos.slice(0, 2).every((m) => m.imagenAVideo));
  });

  test('no se cae cuando el catalogo viene en un formato desconocido', () => {
    for (const basura of [null, undefined, 42, 'texto', {}, { data: 'no es lista' }]) {
      assert.deepEqual(modelosDeVideo(basura), [], `se cayo con ${JSON.stringify(basura)}`);
    }
  });

  test('acepta el id bajo cualquiera de los nombres habituales', () => {
    const modelos = modelosDeVideo({ data: [{ model: 'wan-a' }, { name: 'wan-b' }, { slug: 'wan-c' }] });
    assert.deepEqual(modelos.map((m) => m.id).sort(), ['wan-a', 'wan-b', 'wan-c']);
  });
});
