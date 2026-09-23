import config from '../config.js';
import { RUBROS } from '../core/catalogo.js';

/**
 * Widget de captura de leads servido como JavaScript.
 *
 * Se entrega desde el propio servidor en vez de pegarse en el tema porque asi
 * la instalacion en Shopify es una sola linea, y cualquier cambio posterior al
 * formulario no obliga a volver a editar el tema.
 *
 * @param {string} base Origen publico del servidor, para que el formulario sepa
 *                      a donde enviar sin depender de configuracion adicional.
 */
export function renderWidgetJs(base) {
  const opciones = Object.entries(RUBROS)
    .map(([clave, r]) => `<option value="${clave}">${r.nombre}</option>`)
    .join('');

  const saludo = 'Hola, vengo desde appos.cl y quiero informacion sobre las maquinas TUU';

  return `/* Widget de asesoria de ${config.negocio.nombre}. Generado por el servidor. */
(function () {
  'use strict';
  var API = ${JSON.stringify(base)};
  var WHATSAPP = ${JSON.stringify(config.negocio.whatsapp)};
  var SALUDO = ${JSON.stringify(saludo)};

  var CSS = [
    '.appos-w{border:1px solid #e3e6ea;border-radius:14px;padding:20px;margin:24px 0;max-width:520px;font-family:inherit}',
    '.appos-w h3{margin:0 0 6px;font-size:19px;line-height:1.3}',
    '.appos-w p.intro{margin:0 0 14px;color:#5f6975;font-size:14px;line-height:1.5}',
    '.appos-w input,.appos-w select,.appos-w textarea{width:100%;padding:11px 12px;margin-bottom:9px;border:1px solid #d7dbe0;border-radius:8px;font-size:16px;font-family:inherit;background:#fff;color:#16191d}',
    '.appos-w button{width:100%;padding:13px;border:0;border-radius:8px;background:#075e54;color:#fff;font-size:15px;font-weight:600;cursor:pointer}',
    '.appos-w button[disabled]{opacity:.6;cursor:progress}',
    '.appos-w .trampa{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important}',
    '.appos-w a.wa{display:block;text-align:center;margin-top:12px;color:#075e54;font-weight:600;text-decoration:none;font-size:14px}',
    '.appos-w .estado{margin:10px 0 0;font-size:14px;min-height:20px}',
    '.appos-w .estado.ok{color:#0a7c3f}',
    '.appos-w .estado.error{color:#b42318}'
  ].join('');

  var HTML = [
    '<h3>No sabes cual te sirve?</h3>',
    '<p class="intro">Somos distribuidor oficial TUU. Cuentanos tu rubro y te decimos con franqueza que equipo necesitas, aunque sea el mas barato.</p>',
    '<form novalidate>',
    '<input type="text" name="nombre" placeholder="Tu nombre" autocomplete="name">',
    '<input type="tel" name="telefono" placeholder="WhatsApp (9 1234 5678)" autocomplete="tel" inputmode="tel">',
    '<input type="email" name="email" placeholder="Correo (opcional)" autocomplete="email">',
    '<select name="rubro"><option value="">Que tipo de negocio tienes?</option>${opciones}</select>',
    '<textarea name="mensaje" rows="2" placeholder="Que necesitas resolver? (opcional)"></textarea>',
    '<input type="text" name="sitio_web" tabindex="-1" autocomplete="off" aria-hidden="true" class="trampa">',
    '<button type="submit">Quiero que me asesoren</button>',
    '<p class="estado" role="status"></p>',
    '</form>',
    '<a class="wa" target="_blank" rel="noopener">O escribenos directo por WhatsApp</a>'
  ].join('');

  function origenActual() {
    var m = String(location.pathname || '').match(/\\/products\\/([^\\/?#]+)/);
    return m ? 'producto:' + decodeURIComponent(m[1]) : 'web';
  }

  function montar() {
    var destino = document.getElementById('appos-asesoria');
    if (!destino) {
      var s = document.querySelector('script[src*="/widget.js"]');
      if (!s || !s.parentNode) return;
      destino = document.createElement('div');
      destino.id = 'appos-asesoria';
      s.parentNode.insertBefore(destino, s.nextSibling);
    }
    if (destino.getAttribute('data-appos-montado')) return;
    destino.setAttribute('data-appos-montado', '1');

    if (!document.getElementById('appos-w-css')) {
      var est = document.createElement('style');
      est.id = 'appos-w-css';
      est.textContent = CSS;
      document.head.appendChild(est);
    }

    destino.className = 'appos-w';
    destino.innerHTML = HTML;

    var form = destino.querySelector('form');
    var estado = destino.querySelector('.estado');
    var enlace = destino.querySelector('a.wa');
    enlace.href = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(SALUDO);

    form.addEventListener('submit', function (evento) {
      evento.preventDefault();
      var boton = form.querySelector('button[type=submit]');
      var datos = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (el.name) datos[el.name] = el.value;
      });
      datos.origen = origenActual();

      if (!datos.telefono && !datos.email) {
        estado.className = 'estado error';
        estado.textContent = 'Dejanos un WhatsApp o un correo para poder responderte.';
        return;
      }

      boton.disabled = true;
      estado.className = 'estado';
      estado.textContent = 'Enviando...';

      fetch(API + '/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      }).then(function (r) {
        if (!r.ok) throw new Error('respuesta ' + r.status);
        return r.json();
      }).then(function () {
        form.reset();
        estado.className = 'estado ok';
        estado.textContent = 'Listo. Te escribimos por WhatsApp dentro de las proximas horas.';
      }).catch(function () {
        estado.className = 'estado error';
        estado.textContent = 'No pudimos enviarlo. Escribenos por WhatsApp y lo vemos al tiro.';
      }).then(function () {
        boton.disabled = false;
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montar);
  } else {
    montar();
  }
})();
`;
}
