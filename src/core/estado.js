import config from '../config.js';
import { db } from './db.js';
import { formatearTelefono } from './telefono.js';
import { tareasPendientes } from './tareas.js';

const contar = (sql, ...args) => {
  try { return db().prepare(sql).get(...args)?.n ?? 0; } catch { return 0; }
};

/**
 * Estado de configuracion y de datos del sistema.
 *
 * Nunca incluye el valor de un secreto: solo si esta definido o no. Esta funcion
 * alimenta tanto `appos diagnostico` como la pagina /diagnostico, que se puede
 * abrir desde el celular sin tener acceso a un terminal.
 */
export function estadoDelSistema() {
  const whatsappReal = config.negocio.whatsapp && config.negocio.whatsapp !== '56900000000';
  const correoReal = config.email.proveedor !== 'consola' && !!config.email.apiKey;

  const revisiones = [
    {
      clave: 'whatsapp',
      etiqueta: 'WhatsApp de APPOS',
      ok: !!whatsappReal,
      valor: whatsappReal ? formatearTelefono(config.negocio.whatsapp) : 'sin configurar',
      critico: true,
      pista: 'Define APPOS_WHATSAPP. Sin esto los enlaces de WhatsApp no llevan a ninguna parte.',
    },
    {
      clave: 'webhooks',
      etiqueta: 'Webhooks de Shopify',
      ok: !!(config.shopify.webhookSecret || config.shopify.webhookUrlToken),
      valor: config.shopify.webhookSecret
        ? 'firma HMAC (recomendado)'
        : (config.shopify.webhookUrlToken ? 'ruta secreta (mas debil)' : 'sin configurar'),
      critico: true,
      pista: 'Define SHOPIFY_WEBHOOK_SECRET con la clave del admin de Shopify. Sin esto se rechazan todas las ventas que lleguen.',
    },
    {
      clave: 'correo',
      etiqueta: 'Envio de correo',
      ok: correoReal,
      valor: correoReal ? `${config.email.proveedor} desde ${config.email.remitente}` : 'modo consola: no envia nada',
      critico: false,
      pista: 'Define EMAIL_PROVIDER y EMAIL_API_KEY. Sin esto no salen los correos de postventa ni tu resumen diario.',
    },
    {
      clave: 'panel',
      etiqueta: 'Acceso al panel',
      ok: !!config.servidor.panelToken,
      valor: config.servidor.panelToken ? 'protegido con token' : 'solo desde localhost',
      critico: false,
      pista: 'Define PANEL_TOKEN para abrirlo desde el celular.',
    },
    {
      clave: 'panel_url',
      etiqueta: 'Enlace en el resumen diario',
      ok: !!config.servidor.panelUrl,
      valor: config.servidor.panelUrl || 'sin configurar',
      critico: false,
      pista: 'Define PANEL_URL para que el correo de cada manana traiga el enlace al panel.',
    },
    {
      clave: 'instagram',
      etiqueta: 'Instagram (opcional)',
      ok: !!(config.instagram.igUserId && config.instagram.token),
      valor: config.instagram.igUserId && config.instagram.token ? 'conectado' : 'sin conectar',
      critico: false,
      pista: 'Opcional. Sin esto el calendario igual se genera y publicas copiando y pegando.',
    },
  ];

  let ultimaRutina = '';
  try {
    ultimaRutina = db().prepare("SELECT valor FROM ajustes WHERE clave = 'ultima_rutina'").get()?.valor ?? '';
  } catch { /* base recien creada */ }

  return {
    revisiones,
    faltantesCriticas: revisiones.filter((r) => r.critico && !r.ok).length,
    negocio: {
      nombre: config.negocio.nombre,
      sitio: config.negocio.sitio,
      correo: config.negocio.correo,
      horaRutina: config.servidor.horaRutina,
      zonaHoraria: config.negocio.zonaHoraria,
    },
    datos: {
      leads: contar('SELECT COUNT(*) AS n FROM leads'),
      clientes: contar("SELECT COUNT(*) AS n FROM leads WHERE etapa IN ('pagado','ingresado_tuu','despachado','onboarding','activo')"),
      tareasPendientes: (() => { try { return tareasPendientes(); } catch { return 0; } })(),
      publicaciones: contar('SELECT COUNT(*) AS n FROM publicaciones'),
      correosEnviados: contar("SELECT COUNT(*) AS n FROM envios WHERE estado = 'enviado'"),
      // Cuantas entregas de Shopify se han aceptado. Si esto es 0 despues de una
      // compra de prueba, el problema esta en los webhooks, no en el sistema.
      webhooksRecibidos: contar('SELECT COUNT(*) AS n FROM webhooks_vistos'),
      ultimaRutina: ultimaRutina || 'todavia no ha corrido',
    },
  };
}
