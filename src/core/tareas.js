import { db, ahora } from './db.js';
import { ETAPAS_ABIERTAS, etapa as buscarEtapa, slaVencido, horasEnEtapa } from './pipeline.js';
import { mensajeWhatsapp, bloqueRecomendacion } from './plantillas.js';
import { enlaceWhatsapp } from './whatsapp.js';
import { consumibles } from './catalogo.js';

const DIA = 864e5;

/**
 * Crea una tarea pendiente. El indice unico (lead_id, tipo) con estado pendiente
 * evita duplicarla si la generacion corre varias veces al dia.
 * @returns {boolean} true si la creo, false si ya existia una pendiente igual.
 */
export function crearTarea({ leadId, tipo, canal = 'whatsapp', titulo, mensaje = '', vence = null }) {
  try {
    db().prepare(`
      INSERT INTO tareas (lead_id, tipo, canal, titulo, mensaje, vence, estado, creado)
      VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?)
    `).run(leadId, tipo, canal, titulo, mensaje, vence ?? ahora(), ahora());
    return true;
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return false;
    throw e;
  }
}

export function completarTarea(id, nota = '') {
  const momento = ahora();
  const tarea = db().prepare('SELECT * FROM tareas WHERE id = ?').get(id);
  if (!tarea) return null;
  db().prepare("UPDATE tareas SET estado = 'hecha', completado = ? WHERE id = ?").run(momento, id);
  db().prepare('INSERT INTO eventos (lead_id, tipo, detalle, creado) VALUES (?, ?, ?, ?)')
    .run(tarea.lead_id, 'tarea_hecha', `${tarea.tipo}${nota ? `: ${nota}` : ''}`, momento);
  return tarea;
}

export function descartarTarea(id) {
  db().prepare("UPDATE tareas SET estado = 'descartada', completado = ? WHERE id = ?").run(ahora(), id);
}

/**
 * Recorre los leads y crea las tareas que correspondan:
 *  - seguimiento por SLA vencido en la etapa actual
 *  - recompra de papel termico a los 40 dias de la compra
 *  - renovacion de firma electronica a los 11 meses
 * @returns {{creadas:number, detalle:string[]}}
 */
export function generarTareas(referencia = new Date()) {
  const detalle = [];
  let creadas = 0;

  const abiertos = db().prepare(
    `SELECT * FROM leads WHERE etapa IN (${ETAPAS_ABIERTAS.map(() => '?').join(',')})`,
  ).all(...ETAPAS_ABIERTAS);

  for (const lead of abiertos) {
    if (!slaVencido(lead, referencia)) continue;
    const e = buscarEtapa(lead.etapa);
    if (!e?.plantilla) continue;
    const horas = Math.round(horasEnEtapa(lead, referencia));
    const mensaje = lead.telefono ? mensajeWhatsapp(e.plantilla, lead) : '';
    if (crearTarea({
      leadId: lead.id,
      tipo: `sla_${lead.etapa}`,
      canal: lead.telefono ? 'whatsapp' : 'email',
      titulo: `${e.accion} (${horas} h en "${e.nombre}")`,
      mensaje,
    })) { creadas++; detalle.push(`#${lead.id} ${lead.nombre || lead.telefono}: ${e.accion}`); }
  }

  // Postventa: clientes ya activos o en onboarding con compra registrada.
  const clientes = db().prepare(
    "SELECT * FROM leads WHERE etapa IN ('onboarding','activo') AND shopify_order_id <> ''",
  ).all();

  const papel = consumibles().filter((p) => p.consumible).map((p) => p.handle);
  const firmas = consumibles().filter((p) => p.renovable).map((p) => p.handle);

  for (const lead of clientes) {
    const eventoCompra = db().prepare(
      "SELECT creado FROM eventos WHERE lead_id = ? AND tipo = 'compra' ORDER BY id LIMIT 1",
    ).get(lead.id);
    const fechaCompra = new Date(eventoCompra?.creado ?? lead.creado);
    const dias = (referencia.getTime() - fechaCompra.getTime()) / DIA;

    if (dias >= 40) {
      const mensaje = lead.telefono
        ? mensajeWhatsapp('recompra_papel', lead, { recomendacion: bloqueRecomendacion(papel.slice(0, 2)) })
        : '';
      if (crearTarea({ leadId: lead.id, tipo: 'recompra_papel', titulo: 'Ofrecer recompra de papel termico', mensaje })) {
        creadas++; detalle.push(`#${lead.id} ${lead.nombre}: recompra de papel`);
      }
    }
    if (dias >= 330) {
      const mensaje = lead.telefono
        ? mensajeWhatsapp('renovacion_firma', lead, { recomendacion: bloqueRecomendacion(firmas) })
        : '';
      if (crearTarea({ leadId: lead.id, tipo: 'renovacion_firma', titulo: 'Renovar firma electronica antes del vencimiento', mensaje })) {
        creadas++; detalle.push(`#${lead.id} ${lead.nombre}: renovacion de firma`);
      }
    }
  }

  return { creadas, detalle };
}

/**
 * Cola de trabajo: tareas pendientes vencidas, con el mensaje listo y el enlace
 * wa.me para enviarlo de una desde el celular.
 */
export function colaDeHoy({ limite = 50, referencia = new Date() } = {}) {
  const filas = db().prepare(`
    SELECT t.*, l.nombre, l.telefono, l.email, l.rubro, l.etapa, l.interes
    FROM tareas t JOIN leads l ON l.id = t.lead_id
    WHERE t.estado = 'pendiente' AND t.vence <= ?
    ORDER BY t.vence ASC
    LIMIT ?
  `).all(referencia.toISOString(), limite);

  return filas.map((f) => ({
    id: f.id,
    leadId: f.lead_id,
    tipo: f.tipo,
    canal: f.canal,
    titulo: f.titulo,
    mensaje: f.mensaje,
    vence: f.vence,
    lead: { id: f.lead_id, nombre: f.nombre, telefono: f.telefono, email: f.email, rubro: f.rubro, etapa: f.etapa, interes: f.interes },
    enlace: f.canal === 'whatsapp' ? enlaceWhatsapp(f.telefono, f.mensaje) : '',
  }));
}

export function tareasPendientes() {
  return db().prepare("SELECT COUNT(*) AS total FROM tareas WHERE estado = 'pendiente'").get().total;
}
