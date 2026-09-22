/**
 * Etapas del pipeline, calcadas del flujo real de APPOS:
 * el cliente pide informacion -> se cotiza -> paga -> Alejandro lo ingresa en la
 * plataforma de partners de TUU y compra por el -> TUU despacha y hace onboarding
 * -> el cliente sigue preguntandole a quien le vendio.
 *
 * `slaHoras` es el tiempo maximo que un lead deberia quedarse en esa etapa antes
 * de que el sistema lo saque a la cola de trabajo del dia.
 */
export const ETAPAS = [
  { clave: 'nuevo', nombre: 'Nuevo', slaHoras: 2, siguiente: 'contactado', accion: 'Escribirle por WhatsApp y calificar el rubro', plantilla: 'primer_contacto' },
  { clave: 'contactado', nombre: 'Contactado', slaHoras: 24, siguiente: 'cotizado', accion: 'Enviar recomendacion de equipo y precio', plantilla: 'cotizacion' },
  { clave: 'cotizado', nombre: 'Cotizado', slaHoras: 48, siguiente: 'pagado', accion: 'Seguimiento de la cotizacion', plantilla: 'seguimiento_cotizacion' },
  { clave: 'pagado', nombre: 'Pagado', slaHoras: 4, siguiente: 'ingresado_tuu', accion: 'Ingresar al cliente en la plataforma de partners TUU y comprar por el', plantilla: 'confirmacion_compra' },
  { clave: 'ingresado_tuu', nombre: 'Ingresado en TUU', slaHoras: 72, siguiente: 'despachado', accion: 'Confirmar que TUU despacho y avisarle al cliente', plantilla: 'aviso_despacho' },
  { clave: 'despachado', nombre: 'Despachado', slaHoras: 96, siguiente: 'onboarding', accion: 'Confirmar recepcion del equipo', plantilla: 'recepcion_equipo' },
  { clave: 'onboarding', nombre: 'En onboarding', slaHoras: 168, siguiente: 'activo', accion: 'Revisar que quedo operando y ofrecer ayuda', plantilla: 'checkin_onboarding' },
  { clave: 'activo', nombre: 'Activo', slaHoras: null, siguiente: null, accion: 'Postventa y recompra de insumos', plantilla: null },
  { clave: 'perdido', nombre: 'Perdido', slaHoras: null, siguiente: null, accion: 'Sin accion', plantilla: null },
];

const porClave = new Map(ETAPAS.map((e) => [e.clave, e]));

export const etapa = (clave) => porClave.get(clave) ?? null;
export const esEtapaValida = (clave) => porClave.has(clave);
export const clavesEtapas = () => ETAPAS.map((e) => e.clave);

/** Etapas en las que el lead todavia esta en juego comercialmente. */
export const ETAPAS_ABIERTAS = ['nuevo', 'contactado', 'cotizado', 'pagado', 'ingresado_tuu', 'despachado', 'onboarding'];

/**
 * Indica si un lead lleva mas tiempo del permitido en su etapa.
 * @param {{etapa:string, etapa_desde:string}} lead
 * @param {Date} [referencia]
 */
export function slaVencido(lead, referencia = new Date()) {
  const e = etapa(lead.etapa);
  if (!e || e.slaHoras == null) return false;
  const desde = new Date(lead.etapa_desde);
  if (Number.isNaN(desde.getTime())) return false;
  const horas = (referencia.getTime() - desde.getTime()) / 36e5;
  return horas >= e.slaHoras;
}

/** Horas que lleva el lead detenido en su etapa actual. */
export function horasEnEtapa(lead, referencia = new Date()) {
  const desde = new Date(lead.etapa_desde);
  if (Number.isNaN(desde.getTime())) return 0;
  return Math.max(0, (referencia.getTime() - desde.getTime()) / 36e5);
}
