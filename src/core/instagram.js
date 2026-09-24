import config from '../config.js';
import { db } from './db.js';

/**
 * Publicacion automatica en Instagram.
 *
 * Publicar es siempre en dos pasos: primero se crea un contenedor con la imagen
 * y el texto, y despues se publica ese contenedor. No hay una sola llamada que
 * haga las dos cosas.
 *
 * La imagen no se sube: se entrega una direccion publica y son los servidores
 * de Instagram los que la descargan. Por eso la foto tiene que estar en un sitio
 * abierto -el CDN de la tienda sirve- y no basta con tenerla en el telefono.
 *
 * Para publicar solo en la cuenta propia no hace falta la revision de app de
 * Meta: basta una app en modo desarrollo con la cuenta agregada como probador.
 * La revision recien se necesita para publicar en cuentas de terceros.
 */

const TIEMPO_LIMITE_MS = 45_000;

export class ErrorInstagram extends Error {
  constructor(mensaje, { estado = 0, cuerpo = '' } = {}) {
    super(mensaje);
    this.name = 'ErrorInstagram';
    this.estado = estado;
    this.cuerpo = cuerpo;
  }
}

export const hayCredenciales = () =>
  Boolean(config.instagram.igUserId && config.instagram.token);

/** Texto final de la publicacion: el copy y los hashtags separados por una linea. */
export function textoDePieza(pieza) {
  return [pieza.copy, pieza.hashtags].map((t) => String(t ?? '').trim()).filter(Boolean).join('\n\n');
}

async function llamar(ruta, { metodo = 'GET', parametros = {}, fetchImpl = fetch } = {}) {
  if (!hayCredenciales()) throw new ErrorInstagram('Faltan IG_USER_ID o IG_TOKEN');

  const base = config.instagram.base.replace(/\/$/, '');
  const url = new URL(`${base}/${String(ruta).replace(/^\//, '')}`);
  const cuerpo = new URLSearchParams({ ...parametros, access_token: config.instagram.token });

  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS);

  let respuesta;
  try {
    if (metodo === 'GET') {
      for (const [k, v] of cuerpo) url.searchParams.set(k, v);
      respuesta = await fetchImpl(url.toString(), { signal: control.signal });
    } else {
      respuesta = await fetchImpl(url.toString(), {
        method: metodo,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: cuerpo.toString(),
        signal: control.signal,
      });
    }
  } catch (e) {
    throw new ErrorInstagram(
      e.name === 'AbortError'
        ? `Instagram no respondio en ${TIEMPO_LIMITE_MS / 1000} segundos`
        : `No se pudo llegar a Instagram: ${e.message}`,
    );
  } finally {
    clearTimeout(reloj);
  }

  const texto = await respuesta.text();
  let datos = null;
  try { datos = JSON.parse(texto); } catch { /* algunos errores vuelven en texto plano */ }

  if (!respuesta.ok || datos?.error) {
    // El mensaje de Meta es lo unico que permite corregir la llamada, asi que
    // viaja entero hasta la pagina en vez de quedarse en el log.
    const detalle = datos?.error?.message ?? texto.slice(0, 500);
    throw new ErrorInstagram(`Instagram respondio ${respuesta.status}: ${detalle}`,
      { estado: respuesta.status, cuerpo: texto.slice(0, 2000) });
  }
  return datos ?? {};
}

/** Comprueba que el token y el identificador sirvan. No publica nada. */
export async function verificarCuenta(opciones = {}) {
  const datos = await llamar(config.instagram.igUserId, {
    parametros: { fields: 'id,username,name' },
    ...opciones,
  });
  return { id: datos.id ?? '', usuario: datos.username ?? '', nombre: datos.name ?? '' };
}

/**
 * Publica una imagen. Devuelve el identificador de la publicacion en Instagram.
 *
 * @param {{imagenUrl:string, texto:string}} pieza
 */
export async function publicarImagen({ imagenUrl, texto }, opciones = {}) {
  if (!/^https:\/\//i.test(String(imagenUrl))) {
    throw new ErrorInstagram('La imagen necesita una direccion https publica: Instagram la descarga desde sus servidores');
  }

  const contenedor = await llamar(`${config.instagram.igUserId}/media`, {
    metodo: 'POST',
    parametros: { image_url: imagenUrl, caption: texto },
    ...opciones,
  });
  if (!contenedor.id) throw new ErrorInstagram('Instagram no devolvio el contenedor');

  const publicada = await llamar(`${config.instagram.igUserId}/media_publish`, {
    metodo: 'POST',
    parametros: { creation_id: contenedor.id },
    ...opciones,
  });
  if (!publicada.id) throw new ErrorInstagram('Instagram no devolvio la publicacion');

  return publicada.id;
}

/** Piezas del calendario que ya toca publicar y todavia tienen imagen pendiente. */
export function piezasPendientes(referencia = new Date()) {
  const hoy = referencia.toISOString().slice(0, 10);
  return db().prepare(`
    SELECT * FROM publicaciones
    WHERE canal = 'instagram' AND estado = 'planificada' AND fecha <= ?
    ORDER BY fecha ASC
  `).all(hoy);
}

/**
 * Publica una pieza guardada y deja anotado el resultado.
 *
 * Una pieza sin imagen_url no se puede publicar y no se marca como fallida:
 * sigue esperando a que alguien le cargue la imagen.
 */
export async function publicarPieza(pieza, opciones = {}) {
  if (!pieza.imagen_url) {
    return { publicada: false, motivo: 'sin imagen' };
  }
  try {
    const id = await publicarImagen({ imagenUrl: pieza.imagen_url, texto: textoDePieza(pieza) }, opciones);
    db().prepare('UPDATE publicaciones SET estado = ?, referencia_externa = ? WHERE id = ?')
      .run('publicada', id, pieza.id);
    return { publicada: true, id };
  } catch (e) {
    db().prepare('UPDATE publicaciones SET estado = ? WHERE id = ?').run('fallida', pieza.id);
    return { publicada: false, motivo: e.message };
  }
}

/**
 * Publica todo lo que corresponda hoy.
 *
 * Viene apagado: publicar es hacia afuera y no debe empezar solo porque alguien
 * puso un token. Se enciende con IG_AUTOPUBLICAR=1.
 */
export async function publicarPendientes({ referencia = new Date(), forzar = false, ...opciones } = {}) {
  if (!hayCredenciales()) return { corrio: false, motivo: 'sin credenciales', publicadas: 0 };
  if (!config.instagram.autoPublicar && !forzar) {
    return { corrio: false, motivo: 'autopublicacion apagada', publicadas: 0 };
  }

  const resultados = [];
  for (const pieza of piezasPendientes(referencia)) {
    resultados.push({ id: pieza.id, titulo: pieza.titulo, ...await publicarPieza(pieza, opciones) });
  }
  return {
    corrio: true,
    publicadas: resultados.filter((r) => r.publicada).length,
    fallidas: resultados.filter((r) => !r.publicada && r.motivo !== 'sin imagen').length,
    sinImagen: resultados.filter((r) => r.motivo === 'sin imagen').length,
    detalle: resultados,
  };
}
