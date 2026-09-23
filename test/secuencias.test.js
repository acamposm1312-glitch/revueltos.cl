import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { baseEnMemoria, db } from '../src/core/db.js';
import { guardarLead, registrarEvento, moverEtapa } from '../src/core/leads.js';
import { correrSecuencias, enviosPendientes, MAX_INTENTOS } from '../src/core/secuencias.js';

const hace = (dias) => new Date(Date.now() - dias * 864e5).toISOString();

function clienteConCompra(dias) {
  const { lead } = guardarLead({ nombre: 'Ana Soto', telefono: '987654321', email: 'ana@correo.cl' });
  moverEtapa(lead.id, 'activo');
  db().prepare("UPDATE leads SET shopify_order_id = '5001' WHERE id = ?").run(lead.id);
  registrarEvento(lead.id, 'compra', 'orden 5001');
  db().prepare("UPDATE eventos SET creado = ? WHERE lead_id = ? AND tipo = 'compra'").run(hace(dias), lead.id);
  return lead;
}

beforeEach(() => { baseEnMemoria(); });

describe('secuencias de postventa', () => {
  test('manda los correos que ya corresponden por fecha', async () => {
    clienteConCompra(8);
    const r = await correrSecuencias({ simular: true });
    const plantillas = r.map((x) => x.plantilla);
    assert.deepEqual(plantillas, ['bienvenida', 'onboarding_dia1', 'checkin_dia7']);
    assert.ok(!plantillas.includes('recompra_dia30'), 'a los 8 dias todavia no toca la recompra');
  });

  test('un correo que falla se reintenta en la corrida siguiente', async () => {
    const lead = clienteConCompra(0);

    // Con EMAIL_PROVIDER en modo consola el envio no se concreta.
    await correrSecuencias();
    const fila = db().prepare("SELECT * FROM envios WHERE lead_id = ? AND plantilla = 'bienvenida'").get(lead.id);
    assert.equal(fila.estado, 'pendiente');
    assert.equal(fila.intentos, 1);

    await correrSecuencias();
    const segunda = db().prepare("SELECT * FROM envios WHERE lead_id = ? AND plantilla = 'bienvenida'").get(lead.id);
    assert.equal(segunda.intentos, 2, 'debe haberlo reintentado, no darlo por enviado');
  });

  test('deja de insistir despues del maximo de intentos', async () => {
    const lead = clienteConCompra(0);
    for (let i = 0; i < MAX_INTENTOS + 3; i++) await correrSecuencias();
    const fila = db().prepare("SELECT * FROM envios WHERE lead_id = ? AND plantilla = 'bienvenida'").get(lead.id);
    assert.equal(fila.intentos, MAX_INTENTOS, 'no debe seguir sumando intentos indefinidamente');
  });

  test('un correo enviado no se repite', async () => {
    const lead = clienteConCompra(0);
    db().prepare(`INSERT INTO envios (lead_id, canal, plantilla, destino, estado, error, creado, intentos)
                  VALUES (?, 'email', 'bienvenida', 'ana@correo.cl', 'enviado', '', ?, 1)`).run(lead.id, hace(0));
    const r = await correrSecuencias();
    assert.ok(!r.some((x) => x.plantilla === 'bienvenida'), 'no debe reenviar lo ya enviado');
  });

  test('los pendientes quedan a la vista para poder revisarlos', async () => {
    clienteConCompra(0);
    await correrSecuencias();
    const pendientes = enviosPendientes();
    assert.ok(pendientes.length > 0);
    assert.equal(pendientes[0].estado, 'pendiente');
    assert.equal(pendientes[0].nombre, 'Ana Soto');
  });

  test('no se le escribe a un lead sin correo valido', async () => {
    const { lead } = guardarLead({ nombre: 'Sin correo', telefono: '911111111' });
    moverEtapa(lead.id, 'activo');
    assert.equal((await correrSecuencias()).length, 0);
  });
});
