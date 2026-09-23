import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { baseEnMemoria } from '../src/core/db.js';
import { guardarLead, registrarEvento, moverEtapa } from '../src/core/leads.js';
import { crearTarea } from '../src/core/tareas.js';
import { renderLead } from '../src/routes/lead.js';
import { renderPanel } from '../src/routes/panel.js';

beforeEach(() => { baseEnMemoria(); });

function anaSoto() {
  const { lead } = guardarLead({
    nombre: 'Ana Soto', telefono: '987654321', email: 'ana@correo.cl',
    rubro: 'restaurante', comuna: 'Temuco', valor_estimado: 214900,
    interes: '1 x Punto de Venta',
  });
  return lead;
}

describe('ficha del lead', () => {
  test('muestra los datos de contacto y del negocio', () => {
    const html = renderLead(anaSoto().id, 't');
    assert.match(html, /Ana Soto/);
    assert.match(html, /\+56 9 8765 4321/);
    assert.match(html, /ana@correo\.cl/);
    assert.match(html, /Temuco/);
    assert.match(html, /\$214\.900/);
    assert.match(html, /1 x Punto de Venta/);
  });

  test('el telefono y el correo son tocables desde el celular', () => {
    const html = renderLead(anaSoto().id, 't');
    assert.match(html, /href="tel:\+56987654321"/);
    assert.match(html, /href="mailto:ana@correo\.cl"/);
  });

  test('ofrece el mensaje de WhatsApp que corresponde a su etapa', () => {
    const lead = anaSoto();
    moverEtapa(lead.id, 'pagado');
    const html = renderLead(lead.id, 't');
    assert.match(html, /wa\.me\/56987654321/);
    assert.match(html, /RUT del titular/, 'en etapa pagado toca pedir los datos para TUU');
  });

  test('lista el historial del lead', () => {
    const lead = anaSoto();
    registrarEvento(lead.id, 'compra', 'orden #1042');
    const html = renderLead(lead.id, 't');
    assert.match(html, /orden #1042/);
  });

  test('muestra los pendientes con su boton de hecha', () => {
    const lead = anaSoto();
    crearTarea({ leadId: lead.id, tipo: 'ingresar_tuu', titulo: 'Ingresar en plataforma TUU' });
    const html = renderLead(lead.id, 't');
    assert.match(html, /Ingresar en plataforma TUU/);
    assert.match(html, /\/api\/tareas\/1\/hecha\?token=t/);
  });

  test('permite mover de etapa y borrar, con confirmacion', () => {
    const html = renderLead(anaSoto().id, 't');
    assert.match(html, /\/api\/leads\/1\/etapa\?token=t/);
    assert.match(html, /\/api\/leads\/1\/borrar\?token=t/);
    assert.match(html, /confirm\(/);
  });

  test('un lead borrado no rompe la pagina', () => {
    const html = renderLead(9999, 't');
    assert.match(html, /ya no existe/);
    assert.doesNotMatch(html, /undefined/);
  });

  test('escapa los datos del lead', () => {
    const { lead } = guardarLead({ nombre: '<script>alert(1)</script>', telefono: '911111111' });
    assert.doesNotMatch(renderLead(lead.id, 't'), /<script>alert\(1\)<\/script>/);
  });

  test('un lead sin telefono no ofrece WhatsApp', () => {
    const { lead } = guardarLead({ nombre: 'Solo correo', email: 'x@y.cl' });
    assert.doesNotMatch(renderLead(lead.id, 't'), /wa\.me/);
  });
});

describe('el panel enlaza a la ficha', () => {
  test('desde la lista de leads', () => {
    const lead = anaSoto();
    assert.match(renderPanel('t'), new RegExp(`href="/lead/${lead.id}\\?token=t"`));
  });

  test('desde la cola de trabajo', () => {
    const lead = anaSoto();
    crearTarea({ leadId: lead.id, tipo: 'sla_nuevo', titulo: 'Escribirle' });
    assert.match(renderPanel('t'), new RegExp(`href="/lead/${lead.id}\\?token=t"`));
  });
});
