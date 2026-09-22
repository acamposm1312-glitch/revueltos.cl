import { db, ahora } from './db.js';
import { mensajeEmail, bloqueRecomendacion } from './plantillas.js';
import { enviarEmail } from './email.js';
import { consumibles } from './catalogo.js';
import { esEmailValido } from './telefono.js';

const DIA = 864e5;

/**
 * Secuencia de correos posterior a la compra. `dias` se cuenta desde el evento
 * 'compra' del lead. Cada plantilla se envia una sola vez por cliente: lo
 * garantiza el indice unico (lead_id, plantilla) de la tabla envios.
 */
export const SECUENCIA_POSTVENTA = [
  { plantilla: 'bienvenida', dias: 0 },
  { plantilla: 'onboarding_dia1', dias: 1 },
  { plantilla: 'checkin_dia7', dias: 7 },
  { plantilla: 'recompra_dia30', dias: 30 },
  { plantilla: 'renovacion_firma', dias: 330 },
];

function yaEnviado(leadId, plantilla) {
  return !!db().prepare('SELECT 1 FROM envios WHERE lead_id = ? AND plantilla = ?').get(leadId, plantilla);
}

function anotarEnvio(leadId, plantilla, destino, estado, error = '') {
  try {
    db().prepare('INSERT INTO envios (lead_id, canal, plantilla, destino, estado, error, creado) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(leadId, 'email', plantilla, destino, estado, error, ahora());
  } catch (e) {
    if (!String(e.message).includes('UNIQUE')) throw e;
  }
}

/** Fecha de compra del lead: el primer evento 'compra', o su fecha de creacion. */
export function fechaCompra(leadId, leadCreado) {
  const ev = db().prepare("SELECT creado FROM eventos WHERE lead_id = ? AND tipo = 'compra' ORDER BY id LIMIT 1").get(leadId);
  return new Date(ev?.creado ?? leadCreado);
}

/**
 * Recorre los clientes con compra y envia los correos de la secuencia que ya
 * corresponden por fecha y todavia no se han enviado.
 * @param {{referencia?:Date, simular?:boolean}} opciones
 */
export async function correrSecuencias({ referencia = new Date(), simular = false } = {}) {
  const clientes = db().prepare(
    "SELECT * FROM leads WHERE shopify_order_id <> '' OR etapa IN ('pagado','ingresado_tuu','despachado','onboarding','activo')",
  ).all();

  const resultados = [];
  const papel = consumibles().filter((p) => p.consumible).map((p) => p.handle).slice(0, 2);
  const firmas = consumibles().filter((p) => p.renovable).map((p) => p.handle);

  for (const lead of clientes) {
    if (!esEmailValido(lead.email)) continue;
    const dias = (referencia.getTime() - fechaCompra(lead.id, lead.creado).getTime()) / DIA;

    for (const paso of SECUENCIA_POSTVENTA) {
      if (dias < paso.dias) continue;
      if (yaEnviado(lead.id, paso.plantilla)) continue;

      let extra = {};
      if (paso.plantilla === 'recompra_dia30') extra = { recomendacion: bloqueRecomendacion(papel) };
      if (paso.plantilla === 'renovacion_firma') extra = { recomendacion: bloqueRecomendacion(firmas) };

      const { asunto, cuerpo } = mensajeEmail(paso.plantilla, lead, extra);

      if (simular) {
        resultados.push({ leadId: lead.id, plantilla: paso.plantilla, para: lead.email, asunto, simulado: true });
        continue;
      }

      const r = await enviarEmail({ para: lead.email, asunto, cuerpo });
      anotarEnvio(lead.id, paso.plantilla, lead.email, r.enviado ? 'enviado' : 'pendiente', r.error ?? '');
      resultados.push({ leadId: lead.id, plantilla: paso.plantilla, para: lead.email, asunto, enviado: r.enviado, error: r.error });
    }
  }
  return resultados;
}
