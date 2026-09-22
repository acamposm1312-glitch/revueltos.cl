import config from '../config.js';
import { leerAjuste, guardarAjuste } from './db.js';
import { generarTareas } from './tareas.js';
import { correrSecuencias } from './secuencias.js';

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria del negocio, no en UTC. */
export function hoyLocal(referencia = new Date(), zona = config.negocio.zonaHoraria) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(referencia);
}

/** Hora local (0-23) en la zona horaria del negocio. */
export function horaLocal(referencia = new Date(), zona = config.negocio.zonaHoraria) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: zona, hour: '2-digit', hour12: false }).format(referencia));
}

/**
 * Corre la rutina diaria una sola vez por dia: arma la cola de trabajo y envia
 * los correos de postventa que corresponden.
 *
 * Se ejecuta dentro del mismo proceso del servidor a proposito. Un cron externo
 * correria en otro contenedor, sin acceso al disco donde vive la base de datos.
 *
 * @param {{referencia?:Date, forzar?:boolean}} opciones
 */
export async function correrRutinaDiaria({ referencia = new Date(), forzar = false } = {}) {
  const hoy = hoyLocal(referencia);

  if (!forzar) {
    if (leerAjuste('ultima_rutina') === hoy) return { corrio: false, motivo: 'ya corrio hoy' };
    if (horaLocal(referencia) < config.servidor.horaRutina) return { corrio: false, motivo: 'aun no es la hora' };
  }

  const tareas = generarTareas(referencia);
  const correos = await correrSecuencias({ referencia });
  guardarAjuste('ultima_rutina', hoy);

  return {
    corrio: true,
    fecha: hoy,
    tareasCreadas: tareas.creadas,
    correosEnviados: correos.filter((c) => c.enviado).length,
    correosPendientes: correos.filter((c) => !c.enviado && !c.simulado).length,
  };
}

/**
 * Deja la rutina corriendo sola. Revisa cada 15 minutos porque el servidor
 * puede reiniciarse o dormirse y perderse la hora exacta.
 */
export function iniciarProgramador(intervaloMs = 15 * 60 * 1000) {
  const tic = async () => {
    try {
      const r = await correrRutinaDiaria();
      if (r.corrio) {
        console.log(`[rutina ${r.fecha}] ${r.tareasCreadas} tareas creadas, ${r.correosEnviados} correos enviados`);
      }
    } catch (e) {
      console.error('[rutina] error:', e.message);
    }
  };
  tic();
  const temporizador = setInterval(tic, intervaloMs);
  temporizador.unref?.();
  return temporizador;
}
