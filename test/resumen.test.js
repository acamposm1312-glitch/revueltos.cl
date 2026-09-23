import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { baseEnMemoria, db } from '../src/core/db.js';
import { guardarLead, moverEtapa } from '../src/core/leads.js';
import { crearTarea } from '../src/core/tareas.js';
import { procesarWebhook } from '../src/core/shopify.js';
import { construirResumen, enviarResumenDiario } from '../src/core/resumen.js';

beforeEach(() => { baseEnMemoria(); });

function leadCon(nombre, telefono, tipo, titulo = 'pendiente') {
  const { lead } = guardarLead({ nombre, telefono });
  crearTarea({ leadId: lead.id, tipo, titulo });
  return lead;
}

describe('resumen diario', () => {
  test('pone primero a quien ya pago', () => {
    leadCon('Luis Pardo', '911111111', 'sla_nuevo');
    leadCon('Ana Soto', '922222222', 'ingresar_tuu');
    leadCon('Rosa Diaz', '933333333', 'recompra_papel');

    const r = construirResumen();
    assert.equal(r.total, 3);
    assert.equal(r.grupos[0].clave, 'cobrado');
    assert.match(r.grupos[0].titulo, /PAGARON/);
    assert.match(r.texto.split('\n')[0], /PAGARON/);
  });

  test('cuenta como urgente solo lo cobrado y los leads nuevos', () => {
    leadCon('Ana', '922222222', 'ingresar_tuu');
    leadCon('Luis', '911111111', 'sla_nuevo');
    leadCon('Rosa', '933333333', 'recompra_papel');
    assert.equal(construirResumen().urgentes, 2);
  });

  test('ninguna tarea se pierde, aunque su tipo no este clasificado', () => {
    leadCon('Ana', '922222222', 'tipo_inventado');
    const r = construirResumen();
    assert.equal(r.total, 1);
    assert.equal(r.grupos.at(-1).clave, 'otros');
    assert.match(r.texto, /Ana/);
  });

  test('cada persona aparece con su nombre y su contacto', () => {
    const { lead } = guardarLead({ nombre: 'Ana Soto', telefono: '987654321', rubro: 'almacen' });
    crearTarea({ leadId: lead.id, tipo: 'ingresar_tuu', titulo: 'x' });
    assert.match(construirResumen().texto, /Ana Soto \(\+56 9 8765 4321\) · almacen/);
  });

  test('no manda correo cuando no hay nada pendiente', async () => {
    const r = await enviarResumenDiario({ forzar: true });
    assert.equal(r.enviado, false);
    assert.equal(r.motivo, 'sin pendientes');
  });

  test('el asunto dice cuantos pendientes hay y cuantos son urgentes', async () => {
    leadCon('Ana', '922222222', 'ingresar_tuu');
    leadCon('Rosa', '933333333', 'recompra_papel');
    const r = await enviarResumenDiario({ forzar: true, simular: true });
    assert.match(r.asunto, /2 pendientes para hoy \(1 urgentes\)/);
    assert.doesNotMatch(r.cuerpo, /\{\{/, 'no deben quedar variables sin reemplazar');
  });

  test('no se repite el mismo dia', async () => {
    leadCon('Ana', '922222222', 'ingresar_tuu');
    db().prepare("INSERT INTO ajustes (clave, valor) VALUES ('ultimo_resumen', ?)")
      .run(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()));
    const r = await enviarResumenDiario();
    assert.equal(r.enviado, false);
    assert.equal(r.motivo, 'ya se envio hoy');
  });

  test('una compra real aparece en el grupo de los que pagaron', () => {
    procesarWebhook('orders/paid', {
      id: 991, name: '#1050', email: 'ana@correo.cl', total_price: '39900', financial_status: 'paid',
      customer: { id: 1, first_name: 'Ana', last_name: 'Soto', phone: '987654321' },
      shipping_address: { address1: 'Prat 1234', city: 'Temuco' },
      line_items: [{ quantity: 1, title: 'Pro 2', variant_title: 'ENTEL / BASICO (GRATIS)' }],
    });
    const r = construirResumen();
    assert.equal(r.grupos[0].clave, 'cobrado');
    assert.match(r.texto, /Ana Soto/);
  });
});

describe('la rutina y el resumen del mismo dia', () => {
  test('las tareas creadas en la corrida entran en el resumen de esa misma corrida', async () => {
    const { correrRutinaDiaria } = await import('../src/core/programador.js');
    const { guardarLead } = await import('../src/core/leads.js');

    const { lead } = guardarLead({ nombre: 'Ana Soto', telefono: '987654321', rubro: 'almacen' });
    db().prepare('UPDATE leads SET etapa_desde = ? WHERE id = ?')
      .run(new Date(Date.now() - 5 * 36e5).toISOString(), lead.id);

    const r = await correrRutinaDiaria({ forzar: true });
    assert.equal(r.corrio, true);
    assert.equal(r.tareasCreadas, 1, 'la tarea se crea');
    assert.ok(
      r.resumen.pendientes > 0,
      'el resumen debe ver la tarea recien creada, no esperar al dia siguiente',
    );
  });

  test('la tarea queda visible en la cola con la hora de la corrida', async () => {
    const { generarTareas, colaDeHoy } = await import('../src/core/tareas.js');
    const { guardarLead } = await import('../src/core/leads.js');

    const { lead } = guardarLead({ nombre: 'Luis', telefono: '911111111' });
    db().prepare('UPDATE leads SET etapa_desde = ? WHERE id = ?')
      .run(new Date(Date.now() - 5 * 36e5).toISOString(), lead.id);

    const referencia = new Date();
    generarTareas(referencia);
    assert.equal(colaDeHoy({ referencia }).length, 1, 'la cola con la misma referencia debe verla');
  });
});

describe('correr la rutina a demanda', () => {
  test('el panel muestra el aviso de lo que paso', async () => {
    const { renderPanel } = await import('../src/routes/panel.js');
    const html = renderPanel('t', 'Rutina lista: 3 tareas nuevas y resumen enviado.');
    assert.match(html, /Rutina lista: 3 tareas nuevas/);
    assert.match(html, /\/api\/rutina\?token=t/);
    assert.match(html, /confirm\(/, 'debe pedir confirmacion antes de correrla');
  });

  test('el aviso se escapa antes de mostrarlo', async () => {
    const { renderPanel } = await import('../src/routes/panel.js');
    assert.doesNotMatch(renderPanel('t', '<script>alert(1)</script>'), /<script>alert\(1\)<\/script>/);
  });

  test('sin aviso no aparece el recuadro', async () => {
    const { renderPanel } = await import('../src/routes/panel.js');
    assert.doesNotMatch(renderPanel('t'), /class="aviso"/);
  });
});

describe('por que no se envio el resumen', () => {
  test('en modo consola dice que el proveedor no envia, no queda en blanco', async () => {
    const { enviarResumenDiario } = await import('../src/core/resumen.js');
    const { guardarLead } = await import('../src/core/leads.js');
    const { crearTarea } = await import('../src/core/tareas.js');
    const { lead } = guardarLead({ nombre: 'Ana', telefono: '987654321' });
    crearTarea({ leadId: lead.id, tipo: 'sla_nuevo', titulo: 'escribir' });

    const r = await enviarResumenDiario({ forzar: true });
    assert.equal(r.enviado, false);
    assert.ok(r.motivo, 'siempre debe haber un motivo cuando no se envia');
    assert.match(r.motivo, /consola/, 'debe decir que el proveedor esta en modo consola');
  });

  test('sin pendientes tambien trae motivo', async () => {
    const { enviarResumenDiario } = await import('../src/core/resumen.js');
    const r = await enviarResumenDiario({ forzar: true });
    assert.equal(r.motivo, 'sin pendientes');
  });
});
