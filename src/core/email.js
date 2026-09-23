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
