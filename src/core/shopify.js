import { createHmac, timingSafeEqual } from 'node:crypto';
import config from '../config.js';
import { db, ahora } from './db.js';
import { guardarLead, moverEtapa, registrarEvento, porId } from './leads.js';
import { crearTarea } from './tareas.js';
import { mensajeWhatsapp } from './plantillas.js';
import { clp } from './catalogo.js';

/**
 * Verifica la firma HMAC que Shopify envia en la cabecera X-Shopify-Hmac-Sha256.
 * Se calcula sobre el cuerpo crudo, antes de parsear el JSON.
 */
export function firmaValida(cuerpoCrudo, firmaRecibida, secreto = config.shopify.webhookSecret) {
  if (!secreto || !firmaRecibida) return false;
  const esperado = createHmac('sha256', secreto).update(cuerpoCrudo, 'utf8').digest('base64');
  const a = Buffer.from(esperado);
  const b = Buffer.from(String(firmaRecibida));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Verificacion por ruta secreta, para los webhooks creados via API.
 *
 * Es deliberadamente mas estricta de lo necesario: exige un token de al menos
 * 32 caracteres y compara en tiempo constante. Si el token no esta configurado
 * la ruta queda cerrada, para que un despliegue sin la variable no deje el
 * endpoint abierto.
 */
export function tokenDeRutaValido(recibido, esperado = config.shopify.webhookUrlToken) {
  if (!esperado || esperado.length < 32) return false;
  if (!recibido || typeof recibido !== 'string') return false;
  const a = Buffer.from(esperado);
  const b = Buffer.from(recibido);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Evita procesar dos veces el mismo webhook si Shopify lo reintenta. */
export function yaProcesado(webhookId) {
  if (!webhookId) return false;
  const visto = db().prepare('SELECT 1 FROM webhooks_vistos WHERE id = ?').get(webhookId);
  if (visto) return true;
  db().prepare('INSERT INTO webhooks_vistos (id, creado) VALUES (?, ?)').run(webhookId, ahora());
  return false;
}

const nombreDe = (c = {}) => [c.first_name, c.last_name].filter(Boolean).join(' ').trim();

function telefonoDe(payload) {
  return payload.phone
    || payload.customer?.phone
    || payload.shipping_address?.phone
    || payload.billing_address?.phone
    || '';
}

function direccionDe(payload) {
  const d = payload.shipping_address ?? payload.billing_address;
  if (!d) return '';
  return [d.address1, d.address2, d.city, d.province].filter(Boolean).join(', ');
}

function detalleItems(payload) {
  const items = payload.line_items ?? [];
  if (!items.length) return '';
  return items.map((i) => `${i.quantity} x ${i.title}${i.variant_title && i.variant_title !== 'Default Title' ? ` (${i.variant_title})` : ''}`).join('\n');
}

/**
 * Procesa un webhook de Shopify ya verificado.
 * @param {string} topic  p.ej. 'orders/paid'
 * @param {object} payload
 * @returns {{accion:string, leadId?:number, detalle?:string}}
 */
export function procesarWebhook(topic, payload) {
  switch (topic) {
    case 'orders/create':
    case 'orders/paid':
      return procesarOrden(topic, payload);
    case 'customers/create':
      return procesarCliente(payload);
    case 'checkouts/create':
    case 'checkouts/update':
      return procesarCheckout(payload);
    default:
      return { accion: 'ignorado', detalle: topic };
  }
}

function procesarOrden(topic, payload) {
  const cliente = payload.customer ?? {};
  const { lead } = guardarLead({
    nombre: nombreDe(cliente) || payload.shipping_address?.name || '',
    telefono: telefonoDe(payload),
    email: payload.email || cliente.email || '',
    comuna: payload.shipping_address?.city ?? '',
    origen: 'shopify',
    interes: detalleItems(payload),
    valor_estimado: Math.round(Number(payload.total_price ?? 0)),
    shopify_customer_id: String(cliente.id ?? ''),
    shopify_order_id: String(payload.id ?? ''),
  });

  const pagada = topic === 'orders/paid'
    || payload.financial_status === 'paid'
    || payload.financial_status === 'partially_paid';

  if (!pagada) {
    registrarEvento(lead.id, 'orden', `orden ${payload.name ?? payload.id} creada sin pago confirmado`);
    return { accion: 'orden_sin_pago', leadId: lead.id };
  }

  const yaHabiaCompra = db().prepare("SELECT 1 FROM eventos WHERE lead_id = ? AND tipo = 'compra'").get(lead.id);
  registrarEvento(lead.id, 'compra', `orden ${payload.name ?? payload.id} por ${clp(Number(payload.total_price ?? 0))}`);

  // Solo se adelanta el pipeline; nunca se retrocede a un cliente ya despachado.
  const atras = ['nuevo', 'contactado', 'cotizado'];
  if (atras.includes(lead.etapa)) moverEtapa(lead.id, 'pagado', `orden ${payload.name ?? payload.id}`);

  const actualizado = porId(lead.id);
  const mensaje = actualizado.telefono ? mensajeWhatsapp('confirmacion_compra', actualizado) : '';

  crearTarea({
    leadId: lead.id,
    tipo: 'ingresar_tuu',
    canal: actualizado.telefono ? 'whatsapp' : 'email',
    titulo: `Ingresar en plataforma TUU y comprar por el cliente - orden ${payload.name ?? payload.id}`,
    mensaje: [
      mensaje,
      '',
      '--- datos de la orden (para la plataforma de partners TUU) ---',
      `Cliente: ${actualizado.nombre || 's/n'}`,
      `Correo: ${actualizado.email || 's/n'}`,
      `Telefono: ${actualizado.telefono || 's/n'}`,
      `Direccion: ${direccionDe(payload) || 's/n'}`,
      `Total: ${clp(Number(payload.total_price ?? 0))}`,
      'Productos:',
      detalleItems(payload) || 's/n',
    ].join('\n'),
  });

  return { accion: yaHabiaCompra ? 'compra_repetida' : 'compra', leadId: lead.id };
}

function procesarCliente(payload) {
  const { lead, creado } = guardarLead({
    nombre: nombreDe(payload),
    telefono: payload.phone ?? '',
    email: payload.email ?? '',
    origen: 'shopify',
    shopify_customer_id: String(payload.id ?? ''),
  });

  // La tarea de primer contacto se crea de inmediato, igual que con el
  // formulario de la tienda. Antes, un lead llegado por Shopify esperaba a que
  // venciera su plazo para aparecer en la cola, mientras que el mismo lead
  // llegado por el formulario aparecia al instante. No habia razon para esa
  // diferencia: en ambos casos hay alguien esperando respuesta.
  if (creado) {
    crearTarea({
      leadId: lead.id,
      tipo: 'sla_nuevo',
      canal: lead.telefono ? 'whatsapp' : 'email',
      titulo: 'Cliente nuevo en la tienda: escribirle y calificar el rubro',
      mensaje: lead.telefono ? mensajeWhatsapp('primer_contacto', lead) : '',
    });
  }

  return { accion: creado ? 'cliente_nuevo' : 'cliente_actualizado', leadId: lead.id };
}

function procesarCheckout(payload) {
  // Checkout iniciado y no completado: es un lead tibio, vale la pena escribirle.
  if (payload.completed_at) return { accion: 'checkout_completado' };

  const telefono = telefonoDe(payload);
  const email = payload.email ?? '';
  if (!telefono && !email) return { accion: 'checkout_sin_contacto' };

  const { lead } = guardarLead({
    nombre: nombreDe(payload.customer ?? {}) || payload.billing_address?.name || '',
    telefono,
    email,
    origen: 'carrito_abandonado',
    interes: detalleItems(payload),
    valor_estimado: Math.round(Number(payload.total_price ?? 0)),
  });

  if (['pagado', 'ingresado_tuu', 'despachado', 'onboarding', 'activo'].includes(lead.etapa)) {
    return { accion: 'checkout_de_cliente_existente', leadId: lead.id };
  }

  const mensaje = lead.telefono ? mensajeWhatsapp('carrito_abandonado', lead) : '';
  // Se deja vencer en 2 horas: escribirle al instante se siente invasivo.
  const vence = new Date(Date.now() + 2 * 36e5).toISOString();
  crearTarea({
    leadId: lead.id,
    tipo: 'carrito_abandonado',
    canal: lead.telefono ? 'whatsapp' : 'email',
    titulo: `Recuperar carrito abandonado (${clp(Number(payload.total_price ?? 0))})`,
    mensaje,
    vence,
  });
  return { accion: 'carrito_abandonado', leadId: lead.id };
}
