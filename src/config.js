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
    // Opcional: cuenta Instagram profesional vinculada a una pagina de Facebook
    igUserId: env('IG_USER_ID', ''),
    token: env('IG_TOKEN', ''),
    // Meta tiene dos sabores de esta API y no usan el mismo servidor. Se deja
    // configurable para poder cambiar sin tocar codigo si el token resulta ser
    // del otro tipo: graph.facebook.com con inicio de sesion de Facebook,
    // graph.instagram.com con inicio de sesion de Instagram.
    base: env('IG_API_BASE', 'https://graph.instagram.com/v21.0'),
    // Publicar es hacia afuera: no arranca solo porque haya token.
    autoPublicar: env('IG_AUTOPUBLICAR', '0') === '1',
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
  // Generacion de video para los reels. Es opcional: si no hay llave, la pagina
  // /reels lo dice y no se llama a nadie. Se cobra por llamada, asi que el tope
  // existe para que un error en bucle no termine en una cuenta sorpresa.
  runapi: {
    llave: env('RUNAPI_API_KEY', ''),
    base: env('RUNAPI_BASE', 'https://runapi.ai/api/v1'),
    topeDiario: Number(env('RUNAPI_TOPE_DIARIO', '5')),
  },
  db: {
    ruta: env('DB_PATH', resolve(ROOT, 'data', 'appos.db')),
  },
};

export default config;
