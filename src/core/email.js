import config from '../config.js';
import { esEmailValido } from './telefono.js';

/**
 * Envia un correo con el proveedor configurado.
 * - 'consola': no envia nada, solo devuelve el contenido. Sirve para probar sin riesgo.
 * - 'resend' | 'brevo': envio real por HTTP, sin dependencias.
 * @returns {Promise<{enviado:boolean, proveedor:string, error?:string, vistaPrevia?:object}>}
 */
export async function enviarEmail({ para, asunto, cuerpo }) {
  const proveedor = config.email.proveedor;
  if (!esEmailValido(para)) return { enviado: false, proveedor, error: 'correo invalido' };

  if (proveedor === 'consola') {
    // Se devuelve un motivo explicito: sin el, quien lee el log no distingue
    // "no hay proveedor configurado" de "el envio fallo".
    return {
      enviado: false,
      proveedor,
      motivo: 'EMAIL_PROVIDER es "consola": el correo se genera pero no se envia',
      vistaPrevia: { para, asunto, cuerpo },
    };
  }
  if (!config.email.apiKey) {
    return { enviado: false, proveedor, error: 'falta EMAIL_API_KEY' };
  }

  try {
    if (proveedor === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.email.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${config.email.remitenteNombre} <${config.email.remitente}>`,
          to: [para], subject: asunto, text: cuerpo,
        }),
      });
      if (!res.ok) return { enviado: false, proveedor, error: `HTTP ${res.status}: ${await res.text()}` };
      return { enviado: true, proveedor };
    }

    if (proveedor === 'brevo') {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': config.email.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { email: config.email.remitente, name: config.email.remitenteNombre },
          to: [{ email: para }], subject: asunto, textContent: cuerpo,
        }),
      });
      if (!res.ok) return { enviado: false, proveedor, error: `HTTP ${res.status}: ${await res.text()}` };
      return { enviado: true, proveedor };
    }

    return { enviado: false, proveedor, error: `proveedor desconocido: ${proveedor}` };
  } catch (e) {
    return { enviado: false, proveedor, error: e.message };
  }
}

/**
 * Envia un correo de prueba a la casilla del negocio y devuelve el resultado.
 *
 * Existe porque saber que una variable "esta definida" no dice nada: una clave
 * mal copiada se ve igual que una correcta en la pantalla de configuracion, y
 * el problema solo aparece cuando un correo de verdad no llega. Esto lo
 * responde en diez segundos y con el error textual del proveedor.
 */
export async function probarCorreo(config) {
  const r = await enviarEmail({
    para: config.negocio.correo,
    asunto: `Prueba de envío · ${config.negocio.nombre}`,
    cuerpo: [
      'Este es un correo de prueba enviado desde tu propio sistema.',
      '',
      'Si te llegó, el envío está bien configurado: los correos de postventa y',
      'tu resumen de cada mañana van a salir sin problema.',
      '',
      `Proveedor: ${config.email.proveedor}`,
      `Remitente: ${config.email.remitente}`,
    ].join('\n'),
  });

  if (r.enviado) return { ok: true, mensaje: `Correo de prueba enviado a ${config.negocio.correo}. Revisa tu bandeja.` };
  return { ok: false, mensaje: `No se pudo enviar: ${r.error || r.motivo || 'el proveedor rechazó el envío'}` };
}
