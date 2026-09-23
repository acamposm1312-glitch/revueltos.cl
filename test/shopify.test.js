import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { baseEnMemoria, db } from '../src/core/db.js';
import { firmaValida, procesarWebhook, yaProcesado } from '../src/core/shopify.js';
import { porId, guardarLead, moverEtapa } from '../src/core/leads.js';
import { colaDeHoy } from '../src/core/tareas.js';

const SECRETO = 'secreto-de-prueba';
const firmar = (cuerpo) => createHmac('sha256', SECRETO).update(cuerpo, 'utf8').digest('base64');

const ordenPagada = {
  id: 5550001, name: '#1042', email: 'ana@correo.cl', total_price: '48400', financial_status: 'paid',
  customer: { id: 991, first_name: 'Ana', last_name: 'Soto', phone: '+56 9 8765 4321' },
  shipping_address: { name: 'Ana Soto', address1: 'Av. Siempre Viva 742', city: 'Temuco', province: 'Araucania', phone: '+56987654321' },
  line_items: [
    { quantity: 1, title: 'Pro 2', variant_title: 'ENTEL / BASICO (GRATIS)' },
    { quantity: 1, title: 'Firma electronica simple 1 ano', variant_title: 'Default Title' },
  ],
};

beforeEach(() => { baseEnMemoria(); });

describe('firma de webhooks', () => {
  test('acepta la firma correcta', () => {
    const cuerpo = JSON.stringify(ordenPagada);
    assert.equal(firmaValida(cuerpo, firmar(cuerpo), SECRETO), true);
  });
  test('rechaza una firma alterada, un cuerpo alterado y la falta de secreto', () => {
    const cuerpo = JSON.stringify(ordenPagada);
    assert.equal(firmaValida(cuerpo, 'otracosa', SECRETO), false);
    assert.equal(firmaValida(cuerpo + ' ', firmar(cuerpo), SECRETO), false);
    assert.equal(firmaValida(cuerpo, firmar(cuerpo), ''), false);
  });
});

describe('orden pagada', () => {
  test('crea el lead, lo deja en pagado y genera la tarea de ingresar en TUU', () => {
    const r = procesarWebhook('orders/paid', ordenPagada);
    assert.equal(r.accion, 'compra');

    const lead = porId(r.leadId);
    assert.equal(lead.etapa, 'pagado');
    assert.equal(lead.telefono, '56987654321');
    assert.equal(lead.email, 'ana@correo.cl');
    assert.equal(lead.shopify_order_id, '5550001');
    assert.equal(lead.valor_estimado, 48400);

    const tarea = colaDeHoy().find((t) => t.tipo === 'ingresar_tuu');
    assert.ok(tarea, 'debe existir la tarea de ingresar en TUU');
    assert.match(tarea.mensaje, /Av\. Siempre Viva 742, Temuco/);
    assert.match(tarea.mensaje, /1 x Pro 2 \(ENTEL \/ BASICO \(GRATIS\)\)/);
    assert.match(tarea.mensaje, /RUT del titular/);
    assert.match(tarea.enlace, /^https:\/\/wa\.me\/56987654321/);
  });

  test('no retrocede a un cliente que ya estaba despachado', () => {
    const { lead } = guardarLead({ nombre: 'Ana', telefono: '987654321', email: 'ana@correo.cl' });
    moverEtapa(lead.id, 'despachado');
    procesarWebhook('orders/paid', ordenPagada);
    assert.equal(porId(lead.id).etapa, 'despachado');
  });

  test('una orden sin pago no dispara la tarea de TUU', () => {
    const r = procesarWebhook('orders/create', { ...ordenPagada, financial_status: 'pending' });
    assert.equal(r.accion, 'orden_sin_pago');
    assert.equal(porId(r.leadId).etapa, 'nuevo');
    assert.equal(colaDeHoy().filter((t) => t.tipo === 'ingresar_tuu').length, 0);
  });

  test('el reintento del mismo webhook no se procesa dos veces', () => {
    assert.equal(yaProcesado('wh-1'), false);
    assert.equal(yaProcesado('wh-1'), true);
  });
});

describe('carrito abandonado', () => {
  test('crea la tarea de recuperacion diferida dos horas', () => {
    const r = procesarWebhook('checkouts/create', {
      id: 77, email: 'luis@correo.cl', total_price: '59900', completed_at: null,
      customer: { first_name: 'Luis', last_name: 'Pardo', phone: '912345678' },
      line_items: [{ quantity: 1, title: 'Pro 2 S', variant_title: 'Default Title' }],
    });
    assert.equal(r.accion, 'carrito_abandonado');
    assert.equal(colaDeHoy().length, 0, 'todavia no debe aparecer en la cola');
    const futuro = new Date(Date.now() + 3 * 36e5);
    const cola = colaDeHoy({ referencia: futuro });
    assert.equal(cola.length, 1);
    assert.match(cola[0].mensaje, /a medio camino con tu compra/);
  });

  test('un checkout ya completado no genera nada', () => {
    assert.equal(procesarWebhook('checkouts/create', { completed_at: '2026-09-01T10:00:00Z' }).accion, 'checkout_completado');
  });
});

describe('origenes permitidos para el formulario', () => {
  test('acepta la tienda y el editor de temas, rechaza el resto', async () => {
    const { origenPermitido } = await import('../src/server.js');
    assert.equal(origenPermitido('https://www.appos.cl'), true);
    assert.equal(origenPermitido('https://appos.cl'), true);
    assert.equal(origenPermitido('https://zsd1j4-ss.myshopify.com'), true);
    assert.equal(origenPermitido('https://otra-tienda.myshopify.com'), true);
    assert.equal(origenPermitido('https://appos.cl.malicioso.com'), false);
    assert.equal(origenPermitido('http://www.appos.cl'), false, 'http sin TLS no');
    assert.equal(origenPermitido('https://myshopify.com.malo.cl'), false);
    assert.equal(origenPermitido(''), false);
    assert.equal(origenPermitido(undefined), false);
  });
});

describe('token de ruta (webhooks creados por API)', () => {
  test('acepta el token correcto y rechaza variaciones', async () => {
    const { tokenDeRutaValido } = await import('../src/core/shopify.js');
    const token = 'a'.repeat(48);
    assert.equal(tokenDeRutaValido(token, token), true);
    assert.equal(tokenDeRutaValido('b'.repeat(48), token), false);
    assert.equal(tokenDeRutaValido(token.slice(0, 47), token), false);
    assert.equal(tokenDeRutaValido(token + 'x', token), false);
  });

  test('queda cerrado si el token no esta configurado o es corto', async () => {
    const { tokenDeRutaValido } = await import('../src/core/shopify.js');
    assert.equal(tokenDeRutaValido('cualquiera', ''), false, 'sin token configurado no se acepta nada');
    assert.equal(tokenDeRutaValido('corto', 'corto'), false, 'menos de 32 caracteres no basta');
    assert.equal(tokenDeRutaValido('', ''), false);
    assert.equal(tokenDeRutaValido(null, 'a'.repeat(48)), false);
    assert.equal(tokenDeRutaValido(undefined, 'a'.repeat(48)), false);
  });
});

describe('observabilidad y acceso', () => {
  test('sin token configurado solo se autoriza desde la propia maquina', async () => {
    const { panelAutorizado } = await import('../src/server.js');
    const url = new URL('http://x/salud');
    assert.equal(panelAutorizado({ socket: { remoteAddress: '127.0.0.1' }, headers: {} }, url, ''), true);
    assert.equal(panelAutorizado({ socket: { remoteAddress: '190.1.2.3' }, headers: {} }, url, ''), false);
  });

  test('con token configurado, se exige el token correcto', async () => {
    const { panelAutorizado } = await import('../src/server.js');
    const remoto = { socket: { remoteAddress: '190.1.2.3' }, headers: {} };
    assert.equal(panelAutorizado(remoto, new URL('http://x/salud'), 'secreto'), false);
    assert.equal(panelAutorizado(remoto, new URL('http://x/salud?token=otro'), 'secreto'), false);
    assert.equal(panelAutorizado(remoto, new URL('http://x/salud?token=secreto'), 'secreto'), true);
    assert.equal(
      panelAutorizado({ socket: { remoteAddress: '190.1.2.3' }, headers: { 'x-panel-token': 'secreto' } }, new URL('http://x/salud'), 'secreto'),
      true,
      'tambien se acepta por cabecera',
    );
    assert.equal(panelAutorizado({ socket: { remoteAddress: '127.0.0.1' }, headers: {} }, new URL('http://x/salud'), 'secreto'), false,
      'con token configurado, localhost tampoco entra sin el');
  });

  test('/salud responde ok para el health check de Render', async () => {
    const { servidor } = await import('../src/server.js');
    await new Promise((r) => servidor.listen(0, r));
    try {
      const { port } = servidor.address();
      const cuerpo = await (await fetch(`http://127.0.0.1:${port}/salud`)).json();
      assert.equal(cuerpo.ok, true);
      assert.equal(typeof cuerpo.hora, 'string');
    } finally {
      await new Promise((r) => servidor.close(r));
    }
  });
});

describe('un cliente nuevo entra a la cola de inmediato', () => {
  test('la tarea de primer contacto no espera a que venza el plazo', () => {
    const r = procesarWebhook('customers/create', {
      id: 991, email: 'nuevo@correo.cl', first_name: 'Rosa', last_name: 'Díaz', phone: '+56 9 8765 4321',
    });
    assert.equal(r.accion, 'cliente_nuevo');

    const cola = colaDeHoy();
    assert.equal(cola.length, 1, 'debe estar en la cola ya mismo, no en dos horas');
    assert.match(cola[0].mensaje, /Hola Rosa/);
    assert.match(cola[0].enlace, /^https:\/\/wa\.me\/56987654321/);
  });

  test('un cliente que ya existia no genera otra tarea', () => {
    procesarWebhook('customers/create', { id: 991, email: 'rosa@correo.cl', first_name: 'Rosa', phone: '987654321' });
    procesarWebhook('customers/create', { id: 991, email: 'rosa@correo.cl', first_name: 'Rosa', phone: '987654321' });
    assert.equal(colaDeHoy().length, 1);
  });
});
