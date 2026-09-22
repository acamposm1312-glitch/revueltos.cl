import config from '../config.js';
import { marcarPublicada } from './contenido.js';

const API = 'https://graph.facebook.com/v21.0';

/**
 * Publica en Instagram via Graph API. Requiere:
 *  - cuenta de Instagram Business o Creator
 *  - vinculada a una pagina de Facebook
 *  - IG_USER_ID e IG_TOKEN en el .env
 *  - la imagen accesible en una URL publica (sirve la del producto en Shopify)
 *
 * Si no esta configurado, devuelve {publicado:false} sin romper nada: el
 * calendario igual queda listo para publicar a mano.
 */
export async function publicarEnInstagram({ imagenUrl, copy, hashtags }) {
  const { igUserId, token } = config.instagram;
  if (!igUserId || !token) return { publicado: false, error: 'Instagram no configurado (IG_USER_ID / IG_TOKEN)' };
  if (!imagenUrl) return { publicado: false, error: 'falta imagen_url publica' };

  const caption = [copy, '', hashtags].filter(Boolean).join('\n');

  try {
    const contenedor = await fetch(`${API}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imagenUrl, caption, access_token: token }),
    });
    if (!contenedor.ok) return { publicado: false, error: `contenedor HTTP ${contenedor.status}: ${await contenedor.text()}` };
    const { id: creationId } = await contenedor.json();

    const publicacion = await fetch(`${API}/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: token }),
    });
    if (!publicacion.ok) return { publicado: false, error: `publish HTTP ${publicacion.status}: ${await publicacion.text()}` };
    const { id } = await publicacion.json();
    return { publicado: true, id };
  } catch (e) {
    return { publicado: false, error: e.message };
  }
}

/** Publica las piezas cuya fecha ya llego y que tengan imagen definida. */
export async function publicarPendientes(piezas) {
  const resultados = [];
  for (const p of piezas) {
    if (p.canal !== 'instagram') continue;
    const r = await publicarEnInstagram({ imagenUrl: p.imagen_url, copy: p.copy, hashtags: p.hashtags });
    if (r.publicado) marcarPublicada(p.id, r.id);
    resultados.push({ id: p.id, fecha: p.fecha, titulo: p.titulo, ...r });
  }
  return resultados;
}
