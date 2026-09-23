import config from '../config.js';
import { leerAjuste, guardarAjuste } from './db.js';
import { colaDeHoy } from './tareas.js';
import { mensajeEmail } from './plantillas.js';
import { enviarEmail } from './email.js';
import { formatearTelefono } from './telefono.js';
import { hoyLocal } from './programador.js';

/**
 * Agrupa las tareas por urgencia real para el negocio. El orden importa: lo
 * primero que lee Alejandro tiene que ser la plata que ya entro y esta esperando.
 */
export const GRUPOS = [
  {
    clave: 'cobrado',
    titulo: 'PAGARON Y ESPERAN QUE LOS INGRESES EN TUU',
    tipos: ['ingresar_tuu', 'sla_pagado'],
    urgente: true,
  },
  {
    clave: 'nuevos',
    titulo: 'Leads nuevos sin contactar',
    tipos: ['sla_nuevo'],
    urgente: true,
  },
  {
    clave: 'seguimiento',
    titulo: 'Seguimientos pendientes',
    tipos: ['sla_contactado', 'sla_cotizado'],
  },
  {
    clave: 'carritos',
    titulo: 'Carritos abandonados por recuperar',
    tipos: ['carrito_abandonado'],
  },
  {
    clave: 'entrega',
    titulo: 'Entregas y onboarding por confirmar',
    tipos: ['sla_ingresado_tuu', 'sla_despachado', 'sla_onboarding'],
  },
  {
    clave: 'postventa',
    titulo: 'Postventa: recompra y renovaciones',
    tipos: ['recompra_papel', 'renovacion_firma'],
  },
];

const identificar = (lead) => lead.nombre || formatearTelefono(lead.telefono) || lead.email || 'sin nombre';

/** Concuerda la palabra con el numero: "1 pendiente", "3 pendientes". */
export const plural = (n, singular, plural_) => (Math.abs(n) === 1 ? singular : plural_);

/**
 * Arma el resumen del dia a partir de la cola de trabajo.
 * @returns {{total:number, urgentes:number, grupos:Array, texto:string}}
 */
export function construirResumen(referencia = new Date()) {
  const cola = colaDeHoy({ limite: 200, referencia });
  const usados = new Set();
  const grupos = [];

  for (const g of GRUPOS) {
    const tareas = cola.filter((t) => g.tipos.includes(t.tipo));
    tareas.forEach((t) => usados.add(t.id));
    if (tareas.length) grupos.push({ ...g, tareas });
  }

  // Cualquier tarea de un tipo que no clasificamos igual tiene que aparecer.
  const sueltas = cola.filter((t) => !usados.has(t.id));
  if (sueltas.length) grupos.push({ clave: 'otros', titulo: 'Otros pendientes', tareas: sueltas });

  const urgentes = grupos.filter((g) => g.urgente).reduce((s, g) => s + g.tareas.length, 0);

  const texto = grupos.map((g) => {
    const lineas = g.tareas.map((t) => {
      const contacto = formatearTelefono(t.lead.telefono) || t.lead.email || '';
      return `  - ${identificar(t.lead)}${contacto ? ` (${contacto})` : ''}${t.lead.rubro ? ` · ${t.lead.rubro}` : ''}`;
    });
    return `${g.titulo} (${g.tareas.length})\n${lineas.join('\n')}`;
  }).join('\n\n');

  return { total: cola.length, urgentes, grupos, texto };
}

/**
 * Envia el resumen a contacto@appos.cl. No manda nada cuando no hay pendientes:
 * un correo diario que dice "no hay nada" se termina ignorando, y con el se
 * ignoran los dias que si importan.
 *
 * @param {{referencia?:Date, forzar?:boolean, simular?:boolean}} opciones
 */
export async function enviarResumenDiario({ referencia = new Date(), forzar = false, simular = false } = {}) {
  if (!config.servidor.resumenDiario && !forzar) return { enviado: false, motivo: 'desactivado' };

  const hoy = hoyLocal(referencia);
  if (!forzar && leerAjuste('ultimo_resumen') === hoy) return { enviado: false, motivo: 'ya se envio hoy' };

  const resumen = construirResumen(referencia);
  if (!resumen.total) return { enviado: false, motivo: 'sin pendientes' };

  const panel = config.servidor.panelUrl
    ? `\nAbrir el panel:\n${config.servidor.panelUrl}${config.servidor.panelToken ? `?token=${encodeURIComponent(config.servidor.panelToken)}` : ''}\n`
    : '';

  const { asunto, cuerpo } = mensajeEmail('resumen_diario', {}, {
    total: resumen.total,
    palabra_pendientes: plural(resumen.total, 'pendiente', 'pendientes'),
    sufijo_urgente: resumen.urgentes
      ? ` (${resumen.urgentes} ${plural(resumen.urgentes, 'urgente', 'urgentes')})`
      : '',
    resumen: resumen.texto,
    enlace_panel: panel,
    hora_rutina: config.servidor.horaRutina,
  });

  if (simular) return { enviado: false, simulado: true, asunto, cuerpo, total: resumen.total };

  const r = await enviarEmail({ para: config.negocio.correo, asunto, cuerpo });
  if (r.enviado) guardarAjuste('ultimo_resumen', hoy);

  return {
    enviado: r.enviado,
    // `motivo` siempre viene con algo cuando no se envio. Antes, el fallo del
    // envio dejaba `motivo` vacio y el log decia "sin motivo", que es
    // exactamente lo que no se necesita saber cuando algo no llega.
    motivo: r.enviado ? '' : (r.error || r.motivo || 'el proveedor rechazo el envio'),
    error: r.error,
    asunto,
    total: resumen.total,
    urgentes: resumen.urgentes,
  };
}
