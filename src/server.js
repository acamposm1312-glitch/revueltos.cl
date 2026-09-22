import { createServer } from 'node:http';
import config from './config.js';
import { db } from './core/db.js';
import { guardarLead } from './core/leads.js';
import { crearTarea, completarTarea, colaDeHoy } from './core/tareas.js';
import { moverEtapa } from './core/leads.js';
import { firmaValida, tokenDeRutaValido, yaProcesado, procesarWebhook } from './core/shopify.js';
import { mensajeWhatsapp } from './core/plantillas.js';
import { renderPanel } from './routes/panel.js';
import { iniciarProgramador } from './core/programador.js';

const ORIGENES_PERMITIDOS = new Set([
  'https://www.appos.cl',
  'https://appos.cl',
  `https://${config.shopify.dominio}`,
]);

/**
 * El formulario de la tienda se sirve desde appos.cl, pero el editor de temas de
 * Shopify lo previsualiza desde el dominio .myshopify.com. Sin aceptar ese
 * origen, la prueba desde el editor falla con un error de CORS que no dice nada.
 */
export function origenPermitido(origen) {
  if (!origen) return false;
  if (ORIGENES_PERMITIDOS.has(origen)) return true;
  try {
    const { protocol, hostname } = new URL(origen);
    return protocol === 'https:' && hostname.endsWith('.myshopify.com');
  } catch {
    return false;
  }
}

const leerCuerpo = (req, limite = 1_000_000) => new Promise((resolve, reject) => {
  let datos = '';
  let largo = 0;
  req.on('data', (c) => {
    largo += c.length;
    if (largo > limite) { reject(new Error('cuerpo demasiado grande')); req.destroy(); return; }
    datos += c;
  });
  req.on('end', () => resolve(datos));
  req.on('error', reject);
});

function json(res, codigo, cuerpo, cabeceras = {}) {
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', ...cabeceras });
  res.end(JSON.stringify(cuerpo));
}

function cabecerasCors(origen) {
  if (!origenPermitido(origen)) return {};
  return {
    'Access-Control-Allow-Origin': origen,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

/** El panel exige token salvo que se acceda desde la propia maquina. */
function panelAutorizado(req, url) {
  if (!config.servidor.panelToken) {
    const ip = req.socket.remoteAddress ?? '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  }
  const token = url.searchParams.get('token') || req.headers['x-panel-token'];
  return token === config.servidor.panelToken;
}

async function manejar(req, res) {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const ruta = url.pathname;
  const cors = cabecerasCors(req.headers.origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    return res.end();
  }

  if (ruta === '/salud') return json(res, 200, { ok: true, hora: new Date().toISOString() });

  // --- Captura de leads desde el formulario de la tienda ---
  if (ruta === '/api/lead' && req.method === 'POST') {
    let datos;
    try {
      datos = JSON.parse(await leerCuerpo(req));
    } catch {
      return json(res, 400, { error: 'json invalido' }, cors);
    }
    if (datos.sitio_web) return json(res, 200, { ok: true }, cors); // trampa anti-spam
    if (!datos.telefono && !datos.email) {
      return json(res, 400, { error: 'se necesita telefono o correo' }, cors);
    }

    const { lead, creado } = guardarLead({
      nombre: datos.nombre, telefono: datos.telefono, email: datos.email,
      rubro: datos.rubro, comuna: datos.comuna, interes: datos.mensaje,
      origen: datos.origen || 'web',
    });

    if (creado) {
      crearTarea({
        leadId: lead.id,
        tipo: 'sla_nuevo',
        canal: lead.telefono ? 'whatsapp' : 'email',
        titulo: 'Lead nuevo desde la web: escribirle y calificar el rubro',
        mensaje: lead.telefono ? mensajeWhatsapp('primer_contacto', lead) : '',
      });
    }
    return json(res, 200, { ok: true, leadId: lead.id }, cors);
  }

  // --- Webhooks de Shopify ---
  // Dos rutas: la firmada con HMAC (preferida) y la de token secreto, para los
  // webhooks creados por API que vienen firmados con el secreto de otra app.
  const rutaConToken = ruta.match(/^\/webhooks\/shopify\/([A-Za-z0-9_-]{32,128})$/);
  if ((ruta === '/webhooks/shopify' || rutaConToken) && req.method === 'POST') {
    const crudo = await leerCuerpo(req);

    let autorizado = false;
    let via = '';
    if (rutaConToken) {
      autorizado = tokenDeRutaValido(rutaConToken[1]);
      via = 'token';
    } else {
      autorizado = firmaValida(crudo, req.headers['x-shopify-hmac-sha256']);
      via = 'hmac';
    }
    if (!autorizado) return json(res, 401, { error: via === 'token' ? 'token invalido' : 'firma invalida' });

    const webhookId = req.headers['x-shopify-webhook-id'];
    if (yaProcesado(webhookId)) return json(res, 200, { ok: true, repetido: true });

    const topic = String(req.headers['x-shopify-topic'] ?? '');
    let payload;
    try { payload = JSON.parse(crudo); } catch { return json(res, 400, { error: 'json invalido' }); }

    try {
      const r = procesarWebhook(topic, payload);
      if (via === 'token') console.log(`[webhook ${topic}] aceptado por token de ruta (sin firma HMAC)`);
      return json(res, 200, { ok: true, via, ...r });
    } catch (e) {
      console.error('[webhook]', topic, e);
      return json(res, 200, { ok: false, error: e.message });
    }
  }

  // --- Acciones del panel ---
  const hecha = ruta.match(/^\/api\/tareas\/(\d+)\/hecha$/);
  if (hecha && req.method === 'POST') {
    if (!panelAutorizado(req, url)) return json(res, 403, { error: 'no autorizado' });
    completarTarea(Number(hecha[1]));
    const destino = `/${url.searchParams.get('token') ? `?token=${encodeURIComponent(url.searchParams.get('token'))}` : ''}`;
    res.writeHead(303, { Location: destino });
    return res.end();
  }

  const cambio = ruta.match(/^\/api\/leads\/(\d+)\/etapa$/);
  if (cambio && req.method === 'POST') {
    if (!panelAutorizado(req, url)) return json(res, 403, { error: 'no autorizado' });
    let datos;
    try { datos = JSON.parse(await leerCuerpo(req)); } catch { return json(res, 400, { error: 'json invalido' }); }
    try {
      return json(res, 200, { ok: true, lead: moverEtapa(Number(cambio[1]), datos.etapa, datos.detalle ?? '') });
    } catch (e) {
      return json(res, 400, { error: e.message });
    }
  }

  if (ruta === '/api/cola' && req.method === 'GET') {
    if (!panelAutorizado(req, url)) return json(res, 403, { error: 'no autorizado' });
    return json(res, 200, { cola: colaDeHoy() });
  }

  // --- Panel ---
  if (ruta === '/' && req.method === 'GET') {
    if (!panelAutorizado(req, url)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('No autorizado. Agrega ?token=... a la direccion (PANEL_TOKEN en el .env).');
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(renderPanel(url.searchParams.get('token') ?? ''));
  }

  return json(res, 404, { error: 'no encontrado' });
}

export const servidor = createServer((req, res) => {
  manejar(req, res).catch((e) => {
    console.error('[error]', e);
    if (!res.headersSent) json(res, 500, { error: 'error interno' });
    else res.end();
  });
});

const ejecutadoDirectamente = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (ejecutadoDirectamente) {
  db();
  servidor.listen(config.servidor.puerto, () => {
    console.log(`APPOS escuchando en http://localhost:${config.servidor.puerto}`);
    if (!config.servidor.panelToken) console.log('Panel abierto solo desde localhost (define PANEL_TOKEN para acceso remoto).');
    if (!config.shopify.webhookSecret && !config.shopify.webhookUrlToken) {
      console.log('Aviso: sin SHOPIFY_WEBHOOK_SECRET ni SHOPIFY_WEBHOOK_URL_TOKEN, los webhooks seran rechazados.');
    } else if (!config.shopify.webhookSecret) {
      console.log('Aviso: webhooks aceptados por token de ruta. Migra a SHOPIFY_WEBHOOK_SECRET cuando puedas.');
    }
    if (config.servidor.rutinaAutomatica) {
      iniciarProgramador();
      console.log(`Rutina diaria activa: ${config.servidor.horaRutina}:00 hora de Chile.`);
    }
  });
}
