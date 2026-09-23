import { clp } from './catalogo.js';

export const IVA = 0.19;

/**
 * Comisiones de TUU por rango de ventas mensuales.
 *
 * Hay dos esquemas y la gracia esta en que no gana siempre el mismo:
 * la mixta cobra menos porcentaje pero suma un cargo fijo por transaccion,
 * asi que cual conviene depende del TICKET PROMEDIO, no del volumen.
 *
 * `fija` y `mixta.porcentaje` estan en por ciento. `mixta.fijo` en pesos.
 * Todos los valores son netos: el IVA se aplica sobre la comision.
 */
export const TRAMOS = [
  { clave: 'hasta_5m', nombre: 'Hasta $5.000.000', desde: 0, hasta: 5_000_000, fija: 1.99, mixta: { porcentaje: 0.99, fijo: 65 } },
  { clave: 'de_5m_a_10m', nombre: 'De $5.000.000 a $10.000.000', desde: 5_000_000, hasta: 10_000_000, fija: 1.69, mixta: { porcentaje: 0.89, fijo: 65 } },
  { clave: 'sobre_10m', nombre: 'Sobre $10.000.000', desde: 10_000_000, hasta: Infinity, fija: 1.49, mixta: { porcentaje: 0.79, fijo: 65 } },
];

/** El primer mes se cobra siempre con la tarifa mas baja, sea cual sea el volumen. */
export const PRIMER_MES = { clave: 'primer_mes', nombre: 'Primer mes', fija: 1.49, mixta: { porcentaje: 0.79, fijo: 65 } };

export function tramoPara(ventasMensuales, primerMes = false) {
  if (primerMes) return PRIMER_MES;
  const v = Number(ventasMensuales) || 0;
  return TRAMOS.find((t) => v > t.desde && v <= t.hasta) ?? TRAMOS[0];
}

/**
 * Ticket en el que los dos esquemas cuestan lo mismo.
 *
 *   fija% * t  =  mixta% * t + fijo     =>     t = fijo / (fija% - mixta%)
 *
 * Bajo ese ticket conviene la fija; sobre el, la mixta. El IVA no altera el
 * punto porque se aplica igual a las dos.
 */
export function ticketDeEquilibrio(tramo) {
  const diferencia = (tramo.fija - tramo.mixta.porcentaje) / 100;
  if (diferencia <= 0) return Infinity;
  return tramo.mixta.fijo / diferencia;
}

/**
 * Compara los dos esquemas para un negocio concreto.
 * @param {{ticketPromedio:number, ventasMensuales:number, primerMes?:boolean}} datos
 */
export function compararEsquemas({ ticketPromedio, ventasMensuales, primerMes = false }) {
  const ticket = Number(ticketPromedio) || 0;
  const ventas = Number(ventasMensuales) || 0;
  if (ticket <= 0 || ventas <= 0) throw new Error('Se necesitan el ticket promedio y las ventas mensuales.');

  const tramo = tramoPara(ventas, primerMes);
  const transacciones = ventas / ticket;

  const fijaPorVenta = ticket * (tramo.fija / 100);
  const mixtaPorVenta = ticket * (tramo.mixta.porcentaje / 100) + tramo.mixta.fijo;

  const fijaMensual = fijaPorVenta * transacciones;
  const mixtaMensual = mixtaPorVenta * transacciones;

  const conviene = mixtaMensual < fijaMensual ? 'mixta' : 'fija';
  const ahorroMensual = Math.abs(fijaMensual - mixtaMensual);

  const conIva = (n) => n * (1 + IVA);

  return {
    tramo,
    transacciones: Math.round(transacciones),
    equilibrio: ticketDeEquilibrio(tramo),
    fija: { porVenta: fijaPorVenta, mensual: fijaMensual, mensualConIva: conIva(fijaMensual) },
    mixta: { porVenta: mixtaPorVenta, mensual: mixtaMensual, mensualConIva: conIva(mixtaMensual) },
    conviene,
    ahorroMensual,
    ahorroAnual: ahorroMensual * 12,
    ahorroMensualConIva: conIva(ahorroMensual),
  };
}

/** Explicacion en texto plano, lista para mandar por WhatsApp. */
export function explicarParaCliente(datos) {
  const r = compararEsquemas(datos);
  const ganador = r.conviene === 'mixta' ? 'mixta' : 'fija';
  const perdedor = r.conviene === 'mixta' ? 'fija' : 'mixta';

  return [
    `Con un ticket promedio de ${clp(datos.ticketPromedio)} y ventas por ${clp(datos.ventasMensuales)} al mes:`,
    '',
    `Tu tramo: ${r.tramo.nombre}`,
    `- Comisión fija: ${r.tramo.fija}% + IVA`,
    `- Comisión mixta: ${r.tramo.mixta.porcentaje}% + $${r.tramo.mixta.fijo} por transacción, + IVA`,
    '',
    `Te conviene la comisión ${ganador.toUpperCase()}.`,
    '',
    `Sobre unas ${r.transacciones} ventas al mes, pagarías cerca de ${clp(r[ganador].mensual)} con la ${ganador} y ${clp(r[perdedor].mensual)} con la ${perdedor}, antes de IVA.`,
    `Elegir bien te ahorra alrededor de ${clp(r.ahorroMensual)} al mes, unos ${clp(r.ahorroAnual)} al año.`,
    '',
    `La regla simple: bajo ${clp(r.equilibrio)} de ticket promedio conviene la fija, sobre eso conviene la mixta.`,
  ].join('\n');
}
