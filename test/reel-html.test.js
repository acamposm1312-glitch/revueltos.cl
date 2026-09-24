import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { htmlDeFotograma, ANCHO, ALTO } from '../src/core/reel-html.js';

const base = {
  fotoBase64: 'data:image/png;base64,AAAA',
  etiqueta: 'Distribuidor oficial',
  titulo: 'Trae el lector adentro',
  producto: 'Pro 2 S',
  precio: '$59.900',
};

const zoomDe = (html) => Number(html.match(/scale\(([\d.]+)\)/)[1]);

describe('fotogramas del reel', () => {
  test('el lienzo es vertical de Instagram', () => {
    assert.equal(ANCHO, 1080);
    assert.equal(ALTO, 1920);
    const html = htmlDeFotograma({ t: 0, ...base });
    assert.match(html, /width:1080px;height:1920px/);
  });

  test('el acercamiento avanza y nunca retrocede', () => {
    let previo = 0;
    for (let i = 0; i <= 10; i++) {
      const zoom = zoomDe(htmlDeFotograma({ t: i / 10, ...base }));
      assert.ok(zoom >= previo, `el zoom retrocedio en t=${i / 10}`);
      previo = zoom;
    }
    // Un acercamiento fuerte deforma el equipo y delata la animacion.
    assert.ok(previo <= 1.15, `el zoom final quedo en ${previo}, demasiado`);
    assert.ok(previo > 1, 'no hubo acercamiento');
  });

  test('la foto del equipo va incrustada, no enlazada', () => {
    // Enlazada, Chromium puede fotografiar la pagina antes de que cargue y el
    // cuadro sale sin la maquina.
    const html = htmlDeFotograma({ t: 0.5, ...base });
    assert.match(html, /src="data:image\/png;base64,AAAA"/);
    assert.doesNotMatch(html, /src="https?:/);
  });

  test('al final del reel se ve todo el texto', () => {
    const html = htmlDeFotograma({ t: 1, ...base });
    for (const texto of ['Distribuidor oficial', 'Trae el lector adentro', 'Pro 2 S', '$59.900']) {
      assert.ok(html.includes(texto), `falta "${texto}"`);
    }
    // Nada puede quedar invisible en el ultimo cuadro.
    assert.doesNotMatch(html, /opacity:0\.0000/);
  });

  test('escapa el texto en vez de inyectarlo crudo', () => {
    const html = htmlDeFotograma({ t: 1, ...base, titulo: '<script>alert(1)</script>' });
    assert.doesNotMatch(html, /<script>alert/);
    assert.match(html, /&lt;script&gt;/);
  });

  test('el lockup oficial reemplaza a la pastilla de texto', () => {
    // Cuando TUU entrega su marca de distribuidor autorizado, esa es la que
    // acredita la pieza; repetir ademas una pastilla que dice lo mismo sobra.
    const conLogo = htmlDeFotograma({ t: 1, ...base, logoBase64: 'data:image/png;base64,BBBB' });
    assert.match(conLogo, /class="lockup"/);
    assert.doesNotMatch(conLogo, /class="etiqueta"/);

    const sinLogo = htmlDeFotograma({ t: 1, ...base });
    assert.match(sinLogo, /class="etiqueta"/);
    assert.doesNotMatch(sinLogo, /class="lockup"/);
  });

  test('el lockup tambien aparece de a poco y termina visible', () => {
    const inicio = htmlDeFotograma({ t: 0, ...base, logoBase64: 'data:image/png;base64,BBBB' });
    const fin = htmlDeFotograma({ t: 1, ...base, logoBase64: 'data:image/png;base64,BBBB' });
    assert.match(inicio, /\.lockup\{[^}]*opacity:0\.0000/);
    assert.match(fin, /\.lockup\{[^}]*opacity:1\.0000/);
  });
});
