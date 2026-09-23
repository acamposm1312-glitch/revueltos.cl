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

/** Despues de estos intentos fallidos se deja de insistir con esa direccion. */
export const MAX_INTENTOS = 5;

/**
 * Un correo se considera resuelto si se envio, o si fallo tantas veces que ya no
 * vale la pena insistir.
 *
 * Antes bastaba con que existiera la fila para darlo por enviado, de modo que un
 * fallo -por ejemplo, el proveedor de correo mal configurado- quedaba registrado
 * y el correo no se reintentaba nunca. El cliente se quedaba sin su correo de
 * bienvenida y sin ninguna senal de que algo habia fallado.
 */
function yaResuelto(leadId, plantilla) {
  const fila = db().prepare('SELECT estado, intentos FROM envios WHERE lead_id = ? AND plantilla = ?')
    .get(leadId, plantilla);
  if (!fila) return false;
  return fila.estado === 'enviado' || fila.intentos >= MAX_INTENTOS;
}

function anotarEnvio(leadId, plantilla, destino, enviado, error = '') {
  db().prepare(`
    INSERT INTO envios (lead_id, canal, plantilla, destino, estado, error, creado, intentos)
    VALUES (?, 'email', ?, ?, ?, ?, ?, 1)
    ON CONFLICT(lead_id, plantilla) DO UPDATE SET
      estado = excluded.estado,
      error = excluded.error,
      creado = excluded.creado,
      intentos = envios.intentos + 1
  `).run(leadId, plantilla, destino, enviado ? 'enviado' : 'pendiente', error, ahora());
}

/** Correos que fallaron y siguen pendientes de reintento. */
export function enviosPendientes() {
  return db().prepare(
    `SELECT e.*, l.nombre FROM envios e JOIN leads l ON l.id = e.lead_id
     WHERE e.estado <> 'enviado' AND e.intentos < ? ORDER BY e.creado`,
  ).all(MAX_INTENTOS);
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
      if (yaResuelto(lead.id, paso.plantilla)) continue;

      let extra = {};
      if (paso.plantilla === 'recompra_dia30') extra = { recomendacion: bloqueRecomendacion(papel) };
      if (paso.plantilla === 'renovacion_firma') extra = { recomendacion: bloqueRecomendacion(firmas) };

      const { asunto, cuerpo } = mensajeEmail(paso.plantilla, lead, extra);

      if (simular) {
        resultados.push({ leadId: lead.id, plantilla: paso.plantilla, para: lead.email, asunto, simulado: true });
        continue;
      }

      const r = await enviarEmail({ para: lead.email, asunto, cuerpo });
      anotarEnvio(lead.id, paso.plantilla, lead.email, r.enviado, r.error ?? '');
      if (!r.enviado) console.log(`[correo] ${paso.plantilla} a ${lead.email} NO salio: ${r.error ?? 'proveedor en modo consola'}`);
      resultados.push({ leadId: lead.id, plantilla: paso.plantilla, para: lead.email, asunto, enviado: r.enviado, error: r.error });
    }
  }
  return resultados;
}
