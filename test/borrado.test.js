import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { baseEnMemoria, db } from '../src/core/db.js';
import { guardarLead, borrarLead, porId, registrarEvento } from '../src/core/leads.js';
import { crearTarea, colaDeHoy } from '../src/core/tareas.js';
import { renderPanel } from '../src/routes/panel.js';

beforeEach(() => { baseEnMemoria(); });

describe('borrar lead', () => {
  test('borra el lead y arrastra su historial completo', () => {
    const { lead } = guardarLead({ nombre: 'Prueba', telefono: '987654321' });
    registrarEvento(lead.id, 'compra', 'orden 1');
    crearTarea({ leadId: lead.id, tipo: 'sla_nuevo', titulo: 'escribir' });
    db().prepare("INSERT INTO envios (lead_id, canal, plantilla, destino, estado, creado) VALUES (?, 'email', 'bienvenida', 'a@b.cl', 'enviado', datetime())").run(lead.id);

    assert.equal(borrarLead(lead.id), true);

    assert.equal(porId(lead.id), null);
    assert.equal(db().prepare('SELECT COUNT(*) AS n FROM eventos WHERE lead_id = ?').get(lead.id).n, 0);
    assert.equal(db().prepare('SELECT COUNT(*) AS n FROM tareas WHERE lead_id = ?').get(lead.id).n, 0);
    assert.equal(db().prepare('SELECT COUNT(*) AS n FROM envios WHERE lead_id = ?').get(lead.id).n, 0);
  });

  test('la tarea desaparece de la cola', () => {
    const { lead } = guardarLead({ nombre: 'Prueba', telefono: '987654321' });
    crearTarea({ leadId: lead.id, tipo: 'sla_nuevo', titulo: 'escribir' });
    assert.equal(colaDeHoy().length, 1);
    borrarLead(lead.id);
    assert.equal(colaDeHoy().length, 0);
  });

  test('borrar un lead inexistente no rompe nada', () => {
    assert.equal(borrarLead(9999), false);
  });

  test('no toca a los demas leads', () => {
    const a = guardarLead({ nombre: 'Ana', telefono: '911111111' }).lead;
    const b = guardarLead({ nombre: 'Luis', telefono: '922222222' }).lead;
    borrarLead(a.id);
    assert.equal(porId(b.id).nombre, 'Luis');
  });
});

describe('lista de leads en el panel', () => {
  test('muestra los leads con su etapa y un boton de borrar', () => {
    guardarLead({ nombre: 'Ana Soto', telefono: '987654321', rubro: 'almacen' });
    const html = renderPanel('mi-token');
    assert.match(html, /Ana Soto/);
    assert.match(html, /Todos los leads/);
    assert.match(html, /\/api\/leads\/1\/borrar\?token=mi-token/);
    assert.match(html, /confirm\(/, 'debe pedir confirmacion antes de borrar');
  });

  test('escapa el nombre para no romper el dialogo de confirmacion', () => {
    guardarLead({ nombre: "Ana <script>alert(1)</script>", telefono: '987654321' });
    const html = renderPanel('t');
    assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  });

  test('avisa cuando todavia no hay leads', () => {
    assert.match(renderPanel(''), /Todavia no hay leads/);
  });
});
