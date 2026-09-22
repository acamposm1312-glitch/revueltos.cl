import config from '../config.js';
import { normalizarTelefono } from './telefono.js';

/**
 * Enlace wa.me con el mensaje ya escrito. Al abrirlo desde el celular se abre
 * el chat con el cliente y el texto cargado: solo hay que presionar enviar.
 * Es la forma de automatizar el contacto sin WhatsApp Cloud API.
 */
export function enlaceWhatsapp(telefono, mensaje = '') {
  const t = normalizarTelefono(telefono);
  if (!t) return '';
  const base = `https://wa.me/${t}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

/** Enlace para que un cliente escriba a APPOS (para poner en la web o en Instagram). */
export function enlaceHaciaAppos(mensaje = '') {
  return enlaceWhatsapp(config.negocio.whatsapp, mensaje);
}

/**
 * Envio real por WhatsApp Cloud API. Solo funciona si algun dia activas la API
 * de Meta y defines WHATSAPP_MODE=cloud. En modo 'links' devuelve el enlace
 * para enviarlo a mano desde la app WhatsApp Business.
 * @returns {Promise<{modo:string, enviado:boolean, enlace?:string, error?:string}>}
 */
export async function enviarWhatsapp(telefono, mensaje) {
  const t = normalizarTelefono(telefono);
  if (!t) return { modo: config.whatsapp.modo, enviado: false, error: 'telefono invalido' };

  if (config.whatsapp.modo !== 'cloud') {
    return { modo: 'links', enviado: false, enlace: enlaceWhatsapp(t, mensaje) };
  }

  const { phoneNumberId, token } = config.whatsapp;
  if (!phoneNumberId || !token) {
    return { modo: 'cloud', enviado: false, error: 'faltan WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_TOKEN' };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: t, type: 'text', text: { body: mensaje } }),
    });
    if (!res.ok) return { modo: 'cloud', enviado: false, error: `HTTP ${res.status}: ${await res.text()}` };
    return { modo: 'cloud', enviado: true };
  } catch (e) {
    return { modo: 'cloud', enviado: false, error: e.message };
  }
}
