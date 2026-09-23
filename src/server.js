import { createServer } from 'node:http';
import config from './config.js';
import { db } from './core/db.js';
import { guardarLead } from './core/leads.js';
import { crearTarea, completarTarea, colaDeHoy } from './core/tareas.js';
import { moverEtapa, borrarLead } from './core/leads.js';
import { firmaValida, tokenDeRutaValido, yaProcesado, procesarWebhook } from './core/shopify.js';
import { mensajeWhatsapp } from './core/plantillas.js';
import { renderPanel } from './routes/panel.js';
import { renderDiagnostico } from './routes/diagnostico.js';
import { renderWidgetJs } from './routes/widget.js';
import { renderComision } from './routes/comision.js';
import { renderLead } from './routes/lead.js';
import { renderRespuestas } from './routes/respuestas.js';
import { manifiesto, paginaNoAutorizado } from './routes/comunes.js';
import { generarIcono } from './core/icono.js';
import { iniciarProgramador, correrRutinaDiaria } from './core/programador.js';

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

// Dibujar el icono cuesta unos milisegundos; se guarda tras la primera vez.
const iconos = new Map();
function iconoCacheado(lado) {
  if (!iconos.has(lado)) iconos.set(lado, generarIcono(lado));
  return iconos.get(lado);
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

/** Respuesta cuando falta la llave: distingue "no la trae" de "no coincide". */
function sinLlave(res, url) {
  res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
  return res.end(paginaNoAutorizado(url.searchParams.has('token')));
}

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

/**
 * El panel exige token. Sin token configurado solo se permite el acceso desde la
 * propia maquina, para que un despliegue sin PANEL_TOKEN no quede abierto.
 *
 * `tokenEsperado` se puede inyectar en las pruebas: config se lee al importar el
 * modulo, asi que cambiar process.env despues no tendria efecto.
 */
export function panelAutorizado(req, url, tokenEsperado = config.servidor.panelToken) {
  if (!tokenEsperado) {
    const ip = req.socket?.remoteAddress ?? '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  }
  const token = url.searchParams.get('token') || req.headers['x-panel-token'];
  return token === tokenEsperado;
}

async function manejar(req, res) {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const ruta = url.pathname;
  const cors = cabecerasCors(req.headers.origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    return res.end();
  }

  // /salud es publico porque Render lo usa como health check, asi que responde
  // lo minimo. Los contadores solo se entregan a quien trae el token del panel:
  // cuantos clientes tiene el negocio no es informacion para cualquiera.
  if (ruta === '/salud') {
    const base = { ok: true, hora: new Date().toISOString() };
    if (!panelAutorizado(req, url)) return json(res, 200, base);
    try {
      return json(res, 200, {
        ...base,
        webhooksRecibidos: db().prepare('SELECT COUNT(*) AS n FROM webhooks_vistos').get().n,
        leads: db().prepare('SELECT COUNT(*) AS n FROM leads').get().n,
        tareasPendientes: db().prepare("SELECT COUNT(*) AS n FROM tareas WHERE estado = 'pendiente'").get().n,
      });
    } catch {
      return json(res, 200, base);
    }
  }

  // --- Recursos de la aplicacion instalable ---
  const icono = ruta.match(/^\/icono-(192|512)\.png$/);
  if (icono && req.method === 'GET') {
    const png = iconoCacheado(Number(icono[1]));
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': png.length,
      'Cache-Control': 'public, max-age=604800',
    });
    return res.end(png);
  }

  if (ruta === '/manifest.webmanifest' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    });
    return res.end(JSON.stringify(manifiesto(url.searchParams.get('token') ?? '')));
  }

  // El widget se sirve como JavaScript para que instalarlo en el tema sea una
  // sola linea y los cambios posteriores no obliguen a editar Shopify de nuevo.
  if (ruta === '/widget.js' && req.method === 'GET') {
    const base = config.servidor.panelUrl || `https://${req.headers.host}`;
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    });
    return res.end(renderWidgetJs(base.replace(/\/$/, '')));
  }

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
    const topicCrudo = String(req.headers['x-shopify-topic'] ?? 'sin-topic');
    if (!autorizado) {
      // Se registra el rechazo a proposito: sin esto es imposible distinguir
      // "el webhook nunca llego" de "llego y lo rechazamos", que es justo lo
      // que hay que saber cuando la integracion no funciona.
      console.log(`[webhook ${topicCrudo}] RECHAZADO por ${via === 'token' ? 'token invalido' : 'firma invalida'}`);
      return json(res, 401, { error: via === 'token' ? 'token invalido' : 'firma invalida' });
    }

    const webhookId = req.headers['x-shopify-webhook-id'];
    if (yaProcesado(webhookId)) {
      console.log(`[webhook ${topicCrudo}] repetido, ya estaba procesado`);
      return json(res, 200, { ok: true, repetido: true });
    }

    const topic = String(req.headers['x-shopify-topic'] ?? '');
    let payload;
    try { payload = JSON.parse(crudo); } catch { return json(res, 400, { error: 'json invalido' }); }

    try {
      const r = procesarWebhook(topic, payload);
      console.log(`[webhook ${topic}] ${r.accion}${r.leadId ? ` · lead #${r.leadId}` : ''} · via ${via}`);
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

  if (ruta === '/api/probar-correo' && req.method === 'POST') {
    if (!panelAutorizado(req, url)) return json(res, 403, { error: 'no autorizado' });
    const { probarCorreo } = await import('./core/email.js');
    const r = await probarCorreo(config);
    console.log(`[panel] prueba de correo · ${r.mensaje}`);
    const t = url.searchParams.get('token');
    const partes = [t ? `token=${encodeURIComponent(t)}` : '', `aviso=${encodeURIComponent(r.mensaje)}`].filter(Boolean);
    res.writeHead(303, { Location: `/diagnostico?${partes.join('&')}` });
    return res.end();
  }

  // Permite correr la rutina a demanda, sin esperar a las 9:00. Sirve para
  // verificar la configuracion del correo y para el dia en que el servidor
  // estuvo caido a la hora que correspondia.
  if (ruta === '/api/rutina' && req.method === 'POST') {
    if (!panelAutorizado(req, url)) return json(res, 403, { error: 'no autorizado' });
    const t = url.searchParams.get('token');
    let aviso;
    try {
      const r = await correrRutinaDiaria({ forzar: true });
      const { plural } = await import('./core/resumen.js');
      const tareas = `${r.tareasCreadas} ${plural(r.tareasCreadas, 'tarea nueva', 'tareas nuevas')}`;
      aviso = r.resumen.enviado
        ? `Rutina lista: ${tareas} y resumen enviado a ${config.negocio.correo}.`
        : `Rutina lista: ${tareas}. Resumen no enviado (${r.resumen.motivo ?? 'sin motivo'}).`;
      console.log(`[panel] rutina forzada · ${aviso}`);
    } catch (e) {
      aviso = `La rutina fallo: ${e.message}`;
      console.error('[panel] rutina forzada fallo:', e);
    }
    const partes = [t ? `token=${encodeURIComponent(t)}` : '', `aviso=${encodeURIComponent(aviso)}`].filter(Boolean);
    res.writeHead(303, { Location: `/?${partes.join('&')}` });
    return res.end();
  }

  const borrado = ruta.match(/^\/api\/leads\/(\d+)\/borrar$/);
  if (borrado && req.method === 'POST') {
    if (!panelAutorizado(req, url)) return json(res, 403, { error: 'no autorizado' });
    const borrado_ok = borrarLead(Number(borrado[1]));
    console.log(`[panel] lead #${borrado[1]} ${borrado_ok ? 'borrado' : 'no existia'}`);
    const t = url.searchParams.get('token');
    res.writeHead(303, { Location: `/${t ? `?token=${encodeURIComponent(t)}` : ''}` });
    return res.end();
  }

  const cambio = ruta.match(/^\/api\/leads\/(\d+)\/etapa$/);
  if (cambio && req.method === 'POST') {
    if (!panelAutorizado(req, url)) return json(res, 403, { error: 'no autorizado' });
    const crudo = await leerCuerpo(req);
    const tipo = String(req.headers['content-type'] ?? '');

    // El panel manda un formulario y las integraciones mandan JSON. Se aceptan
    // los dos para que la ficha pueda usar un <form> normal, sin JavaScript.
    let datos;
    if (tipo.includes('application/json')) {
      try { datos = JSON.parse(crudo); } catch { return json(res, 400, { error: 'json invalido' }); }
    } else {
      datos = Object.fromEntries(new URLSearchParams(crudo));
    }

    try {
      const lead = moverEtapa(Number(cambio[1]), datos.etapa, datos.detalle ?? 'cambio desde el panel');
      if (tipo.includes('application/json')) return json(res, 200, { ok: true, lead });
      const t = url.searchParams.get('token');
      res.writeHead(303, { Location: `/lead/${cambio[1]}${t ? `?token=${encodeURIComponent(t)}` : ''}` });
      return res.end();
    } catch (e) {
      return json(res, 400, { error: e.message });
    }
  }

  if (ruta === '/api/cola' && req.method === 'GET') {
    if (!panelAutorizado(req, url)) return json(res, 403, { error: 'no autorizado' });
    return json(res, 200, { cola: colaDeHoy() });
  }

  const fichaLead = ruta.match(/^\/lead\/(\d+)$/);
  if (fichaLead && req.method === 'GET') {
    if (!panelAutorizado(req, url)) return sinLlave(res, url);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(renderLead(Number(fichaLead[1]), url.searchParams.get('token') ?? ''));
  }

  if (ruta === '/respuestas' && req.method === 'GET') {
    if (!panelAutorizado(req, url)) return sinLlave(res, url);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(renderRespuestas(url.searchParams.get('token') ?? ''));
  }

  if (ruta === '/comision' && req.method === 'GET') {
    if (!panelAutorizado(req, url)) return sinLlave(res, url);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(renderComision(url.searchParams.get('token') ?? '', {
      ticket: url.searchParams.get('ticket'),
      ventas: url.searchParams.get('ventas'),
      primerMes: url.searchParams.get('primerMes'),
    }));
  }

  if (ruta === '/diagnostico' && req.method === 'GET') {
    if (!panelAutorizado(req, url)) return sinLlave(res, url);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(renderDiagnostico(url.searchParams.get('token') ?? '', url.searchParams.get('aviso') ?? ''));
  }

  // --- Panel ---
  if (ruta === '/' && req.method === 'GET') {
    if (!panelAutorizado(req, url)) return sinLlave(res, url);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(renderPanel(url.searchParams.get('token') ?? '', url.searchParams.get('aviso') ?? ''));
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
