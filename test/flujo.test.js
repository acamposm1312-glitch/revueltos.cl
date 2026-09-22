import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { baseEnMemoria, db } from '../src/core/db.js';
import { guardarLead, moverEtapa, avanzar, porId, porTelefono, resumenPorEtapa, registrarEvento } from '../src/core/leads.js';
import { generarTareas, colaDeHoy, completarTarea, crearTarea } from '../src/core/tareas.js';
import { normalizarTelefono } from '../src/core/telefono.js';
import { slaVencido } from '../src/core/pipeline.js';

beforeEach(() => { baseEnMemoria(); });

describe('leads', () => {
  test('crea un lead y lo deja en etapa nuevo', () => {
    const { lead, creado } = guardarLead({ nombre: 'Ana Soto', telefono: '+56 9 8765 4321', rubro: 'almacen' });
    assert.equal(creado, true);
    assert.equal(lead.etapa, 'nuevo');
    assert.equal(lead.telefono, '56987654321');
  });

  test('no duplica cuando vuelve el mismo telefono en otro formato', () => {
    guardarLead({ nombre: 'Ana', telefono: '987654321' });
    const { lead, creado } = guardarLead({ telefono: '+56 9 8765 4321', rubro: 'feria' });
    assert.equal(creado, false);
    assert.equal(lead.rubro, 'feria', 'debe completar el dato que faltaba');
    assert.equal(lead.nombre, 'Ana', 'no debe borrar el nombre ya guardado');
    assert.equal(db().prepare('SELECT COUNT(*) AS n FROM leads').get().n, 1);
  });

  test('reconoce al mismo cliente por correo cuando no hay telefono', () => {
    guardarLead({ nombre: 'Luis', email: 'luis@correo.cl' });
    const { creado } = guardarLead({ email: 'luis@correo.cl', rubro: 'restaurante' });
    assert.equal(creado, false);
  });

  test('avanzar sigue el orden del pipeline y reinicia el reloj', () => {
    const { lead } = guardarLead({ nombre: 'Ana', telefono: '987654321' });
    assert.equal(avanzar(lead.id).etapa, 'contactado');
    assert.equal(avanzar(lead.id).etapa, 'cotizado');
    assert.equal(moverEtapa(lead.id, 'pagado').etapa, 'pagado');
  });

  test('rechaza una etapa inventada', () => {
    const { lead } = guardarLead({ telefono: '987654321' });
    assert.throws(() => moverEtapa(lead.id, 'facturado'), /Etapa desconocida/);
  });
});

describe('cola de trabajo', () => {
  test('saca a la cola al lead que lleva mas horas que su SLA', () => {
    const { lead } = guardarLead({ nombre: 'Ana Soto', telefono: '987654321', rubro: 'almacen' });
    const hace5h = new Date(Date.now() - 5 * 36e5).toISOString();
    db().prepare('UPDATE leads SET etapa_desde = ? WHERE id = ?').run(hace5h, lead.id);

    const { creadas } = generarTareas();
    assert.equal(creadas, 1);

    const cola = colaDeHoy();
    assert.equal(cola.length, 1);
    assert.match(cola[0].mensaje, /Hola Ana/);
    assert.match(cola[0].enlace, /^https:\/\/wa\.me\/56987654321\?text=/);
  });

  test('no repite la tarea si la generacion corre dos veces', () => {
    const { lead } = guardarLead({ nombre: 'Ana', telefono: '987654321' });
    db().prepare('UPDATE leads SET etapa_desde = ? WHERE id = ?')
      .run(new Date(Date.now() - 5 * 36e5).toISOString(), lead.id);
    assert.equal(generarTareas().creadas, 1);
    assert.equal(generarTareas().creadas, 0);
    assert.equal(colaDeHoy().length, 1);
  });

  test('un lead recien creado no entra a la cola', () => {
    guardarLead({ nombre: 'Ana', telefono: '987654321' });
    assert.equal(generarTareas().creadas, 0);
    assert.equal(colaDeHoy().length, 0);
  });

  test('completar una tarea la saca de la cola y deja huella', () => {
    const { lead } = guardarLead({ nombre: 'Ana', telefono: '987654321' });
    crearTarea({ leadId: lead.id, tipo: 'sla_nuevo', titulo: 'Escribir' });
    const [tarea] = colaDeHoy();
    completarTarea(tarea.id, 'le escribi');
    assert.equal(colaDeHoy().length, 0);
    const ev = db().prepare("SELECT * FROM eventos WHERE tipo = 'tarea_hecha'").all();
    assert.equal(ev.length, 1);
  });

  test('genera recompra de papel a los 40 dias de la compra', () => {
    const { lead } = guardarLead({ nombre: 'Ana', telefono: '987654321', etapa: 'activo' });
    db().prepare("UPDATE leads SET shopify_order_id = '1234' WHERE id = ?").run(lead.id);
    registrarEvento(lead.id, 'compra', 'orden 1234');
    db().prepare("UPDATE eventos SET creado = ? WHERE lead_id = ? AND tipo = 'compra'")
      .run(new Date(Date.now() - 45 * 864e5).toISOString(), lead.id);

    generarTareas();
    const cola = colaDeHoy();
    const recompra = cola.find((t) => t.tipo === 'recompra_papel');
    assert.ok(recompra, 'debe existir la tarea de recompra');
    assert.match(recompra.mensaje, /papel termico/i);
    assert.match(recompra.mensaje, /rollos/i);
  });
});

describe('telefonos', () => {
  test('normaliza los formatos que llegan en la practica', () => {
    assert.equal(normalizarTelefono('+56 9 8765 4321'), '56987654321');
    assert.equal(normalizarTelefono('987654321'), '56987654321');
    assert.equal(normalizarTelefono('56987654321'), '56987654321');
    assert.equal(normalizarTelefono('0056987654321'), '56987654321');
    assert.equal(normalizarTelefono('hola'), '');
    assert.equal(normalizarTelefono('123'), '');
  });
});

describe('sla', () => {
  test('una etapa sin plazo nunca vence', () => {
    assert.equal(slaVencido({ etapa: 'activo', etapa_desde: '2020-01-01T00:00:00.000Z' }), false);
  });
});
