import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { baseEnMemoria } from '../src/core/db.js';
import { estadoDelSistema } from '../src/core/estado.js';
import { renderDiagnostico } from '../src/routes/diagnostico.js';
import { guardarLead } from '../src/core/leads.js';
import { crearTarea } from '../src/core/tareas.js';

beforeEach(() => { baseEnMemoria(); });

describe('estado del sistema', () => {
  test('marca como criticas solo WhatsApp y los webhooks', () => {
    const e = estadoDelSistema();
    const criticas = e.revisiones.filter((r) => r.critico).map((r) => r.clave);
    assert.deepEqual(criticas.sort(), ['webhooks', 'whatsapp']);
  });

  test('detecta el numero de relleno como no configurado', () => {
    const whatsapp = estadoDelSistema().revisiones.find((r) => r.clave === 'whatsapp');
    assert.equal(whatsapp.ok, false);
    assert.equal(whatsapp.valor, 'sin configurar');
  });

  test('cuenta leads, clientes y tareas', () => {
    const { lead } = guardarLead({ nombre: 'Ana', telefono: '987654321', etapa: 'activo' });
    guardarLead({ nombre: 'Luis', telefono: '911111111' });
    crearTarea({ leadId: lead.id, tipo: 'sla_nuevo', titulo: 'x' });
    const d = estadoDelSistema().datos;
    assert.equal(d.leads, 2);
    assert.equal(d.clientes, 1);
    assert.equal(d.tareasPendientes, 1);
  });

  test('avisa que la rutina no ha corrido', () => {
    assert.equal(estadoDelSistema().datos.ultimaRutina, 'todavia no ha corrido');
  });
});

describe('pagina de diagnostico', () => {
  test('nunca expone el valor de un secreto', () => {
    process.env.SHOPIFY_WEBHOOK_SECRET = 'SECRETO-QUE-NO-DEBE-SALIR';
    process.env.EMAIL_API_KEY = 'CLAVE-QUE-NO-DEBE-SALIR';
    process.env.PANEL_TOKEN = 'TOKEN-QUE-NO-DEBE-SALIR';
    const html = renderDiagnostico('TOKEN-QUE-NO-DEBE-SALIR');
    assert.doesNotMatch(html, /SECRETO-QUE-NO-DEBE-SALIR/);
    assert.doesNotMatch(html, /CLAVE-QUE-NO-DEBE-SALIR/);
    delete process.env.SHOPIFY_WEBHOOK_SECRET;
    delete process.env.EMAIL_API_KEY;
    delete process.env.PANEL_TOKEN;
  });

  test('explica que hacer con cada cosa que falta', () => {
    const html = renderDiagnostico('');
    assert.match(html, /FALTA/);
    assert.match(html, /Define APPOS_WHATSAPP/);
    assert.match(html, /Define SHOPIFY_WEBHOOK_SECRET/);
    assert.match(html, /Webhooks recibidos/);
  });

  test('escapa el contenido para no romper el HTML', () => {
    const html = renderDiagnostico('<script>alert(1)</script>');
    assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  });
});

describe('probar el correo', () => {
  test('en modo consola explica que el proveedor no envia', async () => {
    const { probarCorreo } = await import('../src/core/email.js');
    const config = (await import('../src/config.js')).default;
    const r = await probarCorreo(config);
    assert.equal(r.ok, false);
    assert.match(r.mensaje, /No se pudo enviar/);
    assert.match(r.mensaje, /consola/);
  });

  test('la pagina ofrece el boton y muestra el aviso', async () => {
    const { renderDiagnostico } = await import('../src/routes/diagnostico.js');
    const html = renderDiagnostico('t', 'Correo de prueba enviado.');
    assert.match(html, /\/api\/probar-correo\?token=t/);
    assert.match(html, /Correo de prueba enviado\./);
  });

  test('el aviso se escapa', async () => {
    const { renderDiagnostico } = await import('../src/routes/diagnostico.js');
    assert.doesNotMatch(renderDiagnostico('t', '<script>alert(1)</script>'), /<script>alert\(1\)<\/script>/);
  });
});
