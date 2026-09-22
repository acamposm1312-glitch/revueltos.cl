import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Carga .env sin dependencias. No sobrescribe variables ya presentes en el entorno. */
function loadDotEnv() {
  const file = resolve(ROOT, '.env');
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadDotEnv();

const env = (key, fallback = '') => process.env[key] ?? fallback;

export const config = {
  negocio: {
    nombre: env('APPOS_NOMBRE', 'APPOS'),
    sitio: env('APPOS_SITIO', 'https://www.appos.cl'),
    correo: env('APPOS_CORREO', 'contacto@appos.cl'),
    // Formato internacional sin +, sin espacios. Ej: 56912345678
    whatsapp: env('APPOS_WHATSAPP', '56900000000'),
    instagram: env('APPOS_INSTAGRAM', 'apposchile'),
    vendedor: env('APPOS_VENDEDOR', 'Alejandro'),
    zonaHoraria: env('APPOS_TZ', 'America/Santiago'),
  },
  shopify: {
    dominio: env('SHOPIFY_SHOP_DOMAIN', 'www.appos.cl'),
    // Secreto de firma de los webhooks (Shopify admin > Notificaciones > Webhooks).
    // Es la forma preferida: prueba que el contenido no fue alterado.
    webhookSecret: env('SHOPIFY_WEBHOOK_SECRET', ''),
    // Alternativa mas debil para cuando los webhooks se crean por API y quedan
    // firmados con el secreto de otra aplicacion, que no podemos conocer: se
    // acepta la entrega por una ruta secreta larga. No prueba integridad del
    // contenido, solo que quien llama conoce la ruta. Migrar a webhookSecret.
    webhookUrlToken: env('SHOPIFY_WEBHOOK_URL_TOKEN', ''),
  },
  email: {
    // 'resend' | 'brevo' | 'consola'  ('consola' solo imprime, no envia)
    proveedor: env('EMAIL_PROVIDER', 'consola'),
    apiKey: env('EMAIL_API_KEY', ''),
    remitente: env('EMAIL_FROM', env('APPOS_CORREO', 'contacto@appos.cl')),
    remitenteNombre: env('EMAIL_FROM_NAME', 'APPOS'),
  },
  whatsapp: {
    // 'links'  -> genera enlaces wa.me para enviar desde la app WhatsApp Business (modo actual)
    // 'cloud'  -> envia solo si algun dia activas WhatsApp Cloud API de Meta
    modo: env('WHATSAPP_MODE', 'links'),
    phoneNumberId: env('WHATSAPP_PHONE_NUMBER_ID', ''),
    token: env('WHATSAPP_TOKEN', ''),
  },
  instagram: {
    // Opcional: cuenta Instagram Business vinculada a una pagina de Facebook
    igUserId: env('IG_USER_ID', ''),
    token: env('IG_TOKEN', ''),
  },
  servidor: {
    puerto: Number(env('PORT', '3000')),
    // Protege el panel y los endpoints de accion. Obligatorio fuera de localhost.
    panelToken: env('PANEL_TOKEN', ''),
    // Hora local a la que se arma la cola del dia y salen los correos de postventa.
    horaRutina: Number(env('HORA_RUTINA', '9')),
    // Poner en '0' para desactivar la rutina automatica dentro del servidor.
    rutinaAutomatica: env('RUTINA_AUTOMATICA', '1') !== '0',
    // Direccion publica del panel, para enlazarla en el correo resumen.
    panelUrl: env('PANEL_URL', ''),
    // Poner en '0' para no recibir el correo resumen de cada manana.
    resumenDiario: env('RESUMEN_DIARIO', '1') !== '0',
  },
  db: {
    ruta: env('DB_PATH', resolve(ROOT, 'data', 'appos.db')),
  },
};

export default config;
