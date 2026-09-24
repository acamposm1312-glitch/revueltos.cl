import config from '../config.js';

/**
 * Cliente de RunAPI para generar los reels a partir de las fotos de producto.
 *
 * Existe porque es la unica via que resuelve el problema de fondo: RunAPI
 * descarga la imagen desde SU servidor, asi que alcanza cdn.shopify.com, que ni
 * este entorno ni el conector de Adobe pueden leer. La foto real de la maquina
 * entra al video sin pasar por aca.
 *
 * Todo lo que sale a internet vive en este archivo. Las paginas solo muestran
 * lo que devuelve.
 */

const TIEMPO_LIMITE_MS = 30_000;

export class ErrorRunapi extends Error {
  constructor(mensaje, { estado = 0, cuerpo = '' } = {}) {
    super(mensaje);
    this.name = 'ErrorRunapi';
    this.estado = estado;
    this.cuerpo = cuerpo;
  }
}

export function hayLlave() {
  return Boolean(config.runapi.llave);
}

/**
 * Llama a RunAPI y devuelve la respuesta ya parseada, mas el texto crudo.
 *
 * Se guarda el crudo a proposito: todavia no conocemos la forma exacta de las
 * respuestas de este proveedor, y adivinarla en el codigo produce un parseo que
 * falla en silencio. Mientras no este confirmada, la pagina muestra lo que
 * llego tal cual.
 */
export async function llamar(ruta, { metodo = 'GET', cuerpo = null, fetchImpl = fetch } = {}) {
  if (!hayLlave()) throw new ErrorRunapi('No hay RUNAPI_API_KEY configurada');

  const url = `${config.runapi.base.replace(/\/$/, '')}/${ruta.replace(/^\//, '')}`;
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS);

  let respuesta;
  try {
    respuesta = await fetchImpl(url, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${config.runapi.llave}`,
        'Content-Type': 'application/json',
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: control.signal,
    });
  } catch (e) {
    throw new ErrorRunapi(
      e.name === 'AbortError'
        ? `RunAPI no respondio en ${TIEMPO_LIMITE_MS / 1000} segundos`
        : `No se pudo llegar a RunAPI: ${e.message}`,
    );
  } finally {
    clearTimeout(reloj);
  }

  const texto = await respuesta.text();
  let datos = null;
  try { datos = JSON.parse(texto); } catch { /* algunos errores vuelven en texto plano */ }

  if (!respuesta.ok) {
    throw new ErrorRunapi(
      `RunAPI respondio ${respuesta.status}`,
      { estado: respuesta.status, cuerpo: texto.slice(0, 2000) },
    );
  }
  return { datos, texto };
}

/**
 * Saca de la respuesta de /models los que sirven para animar una foto.
 *
 * El catalogo no tiene un formato documentado que podamos dar por seguro, asi
 * que se recorre cualquier arreglo que venga adentro y se filtra por el nombre.
 * Si el formato no calza, devuelve lista vacia y la pagina muestra el crudo.
 */
export function modelosDeVideo(datos) {
  const candidatos = Array.isArray(datos) ? datos
    : [datos?.data, datos?.models, datos?.results].find(Array.isArray) ?? [];

  return candidatos
    .filter((m) => m && typeof m === 'object')
    .map((m) => ({
      id: String(m.id ?? m.model ?? m.name ?? m.slug ?? ''),
      precio: m.price ?? m.pricing ?? m.cost ?? null,
      descripcion: String(m.description ?? m.summary ?? ''),
    }))
    .filter((m) => m.id && /wan/i.test(m.id))
    // Un modelo de texto a video ignora la foto y dibuja una maquina que no
    // existe. Para lo que necesitamos, solo sirven los de imagen a video.
    .map((m) => ({ ...m, imagenAVideo: /image[-_]?to[-_]?video|i2v/i.test(`${m.id} ${m.descripcion}`) }))
    .sort((a, b) => Number(b.imagenAVideo) - Number(a.imagenAVideo));
}

/** Catalogo completo de modelos, para la pagina de reels. */
export async function listarModelos(opciones = {}) {
  const { datos, texto } = await llamar('models', opciones);
  return { modelos: modelosDeVideo(datos), crudo: texto };
}
