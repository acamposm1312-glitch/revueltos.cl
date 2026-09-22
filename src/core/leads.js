import { db, ahora } from './db.js';
import { esEtapaValida, etapa as buscarEtapa } from './pipeline.js';
import { normalizarTelefono } from './telefono.js';

const CAMPOS_EDITABLES = ['nombre', 'telefono', 'email', 'rubro', 'comuna', 'origen', 'interes', 'valor_estimado', 'notas', 'shopify_customer_id', 'shopify_order_id'];

export function registrarEvento(leadId, tipo, detalle = '') {
  db().prepare('INSERT INTO eventos (lead_id, tipo, detalle, creado) VALUES (?, ?, ?, ?)')
    .run(leadId, tipo, detalle, ahora());
}

export function porId(id) {
  return db().prepare('SELECT * FROM leads WHERE id = ?').get(id) ?? null;
}

export function porTelefono(telefono) {
  const t = normalizarTelefono(telefono);
  if (!t) return null;
  return db().prepare('SELECT * FROM leads WHERE telefono = ?').get(t) ?? null;
}

export function porEmail(email) {
  if (!email) return null;
  return db().prepare('SELECT * FROM leads WHERE email = ? COLLATE NOCASE ORDER BY id LIMIT 1').get(String(email).trim()) ?? null;
}

/**
 * Crea el lead o actualiza el existente si ya conocemos su telefono o correo.
 * Nunca pisa un dato guardado con un valor vacio.
 * @returns {{lead: object, creado: boolean}}
 */
export function guardarLead(datos) {
  const t = normalizarTelefono(datos.telefono);
  const email = (datos.email ?? '').trim();
  const existente = (t && porTelefono(t)) || (email && porEmail(email)) || null;
  const momento = ahora();

  if (existente) {
    const cambios = {};
    for (const campo of CAMPOS_EDITABLES) {
      const valor = campo === 'telefono' ? t : datos[campo];
      if (valor === undefined || valor === null || valor === '') continue;
      if (String(existente[campo] ?? '') === String(valor)) continue;
      cambios[campo] = valor;
    }
    if (Object.keys(cambios).length) {
      const sets = Object.keys(cambios).map((c) => `${c} = ?`).join(', ');
      db().prepare(`UPDATE leads SET ${sets}, actualizado = ? WHERE id = ?`)
        .run(...Object.values(cambios), momento, existente.id);
      registrarEvento(existente.id, 'actualizado', Object.keys(cambios).join(', '));
    }
    return { lead: porId(existente.id), creado: false };
  }

  const info = db().prepare(`
    INSERT INTO leads (nombre, telefono, email, rubro, comuna, origen, etapa, interes, valor_estimado, notas,
                       shopify_customer_id, shopify_order_id, creado, actualizado, etapa_desde)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    datos.nombre ?? '', t, email, datos.rubro ?? '', datos.comuna ?? '',
    datos.origen ?? 'web', esEtapaValida(datos.etapa) ? datos.etapa : 'nuevo',
    datos.interes ?? '', Number(datos.valor_estimado ?? 0) || 0, datos.notas ?? '',
    datos.shopify_customer_id ?? '', datos.shopify_order_id ?? '', momento, momento, momento,
  );
  const id = Number(info.lastInsertRowid);
  registrarEvento(id, 'creado', `origen: ${datos.origen ?? 'web'}`);
  return { lead: porId(id), creado: true };
}

/** Mueve el lead de etapa y reinicia el reloj del SLA. */
export function moverEtapa(id, nuevaEtapa, detalle = '') {
  if (!esEtapaValida(nuevaEtapa)) throw new Error(`Etapa desconocida: ${nuevaEtapa}`);
  const lead = porId(id);
  if (!lead) throw new Error(`Lead ${id} no existe`);
  if (lead.etapa === nuevaEtapa) return lead;
  const momento = ahora();
  db().prepare('UPDATE leads SET etapa = ?, etapa_desde = ?, actualizado = ? WHERE id = ?')
    .run(nuevaEtapa, momento, momento, id);
  registrarEvento(id, 'etapa', `${lead.etapa} -> ${nuevaEtapa}${detalle ? ` (${detalle})` : ''}`);
  return porId(id);
}

/** Avanza a la etapa siguiente definida en el pipeline. */
export function avanzar(id, detalle = '') {
  const lead = porId(id);
  if (!lead) throw new Error(`Lead ${id} no existe`);
  const e = buscarEtapa(lead.etapa);
  if (!e?.siguiente) return lead;
  return moverEtapa(id, e.siguiente, detalle);
}

export function listar({ etapa, limite = 200 } = {}) {
  if (etapa) {
    return db().prepare('SELECT * FROM leads WHERE etapa = ? ORDER BY etapa_desde ASC LIMIT ?').all(etapa, limite);
  }
  return db().prepare('SELECT * FROM leads ORDER BY actualizado DESC LIMIT ?').all(limite);
}

export function eventosDe(id, limite = 50) {
  return db().prepare('SELECT * FROM eventos WHERE lead_id = ? ORDER BY id DESC LIMIT ?').all(id, limite);
}

export function resumenPorEtapa() {
  return db().prepare('SELECT etapa, COUNT(*) AS total FROM leads GROUP BY etapa').all();
}
