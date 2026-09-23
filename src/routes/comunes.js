import config from '../config.js';

export const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const COLOR_MARCA = '#075e54';

/**
 * Cabecera comun de las paginas del panel.
 *
 * Incluye lo que iOS y Android necesitan para instalarla en la pantalla de
 * inicio: manifiesto, icono en PNG (iOS no acepta SVG de forma confiable) y las
 * etiquetas que hacen que se abra a pantalla completa, sin barra del navegador.
 *
 * El token viaja en el manifiesto para que la app instalada arranque ya
 * autenticada; de lo contrario abriria en "No autorizado".
 */
export function cabeceraHtml(titulo, token = '', estilos = '') {
  const q = token ? `?token=${encodeURIComponent(token)}` : '';
  return `<!doctype html><html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(titulo)}</title>
<link rel="manifest" href="/manifest.webmanifest${q}">
<link rel="icon" type="image/png" sizes="192x192" href="/icono-192.png">
<link rel="apple-touch-icon" href="/icono-192.png">
<meta name="theme-color" content="${COLOR_MARCA}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${esc(config.negocio.nombre)}">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<style>${estilos}</style></head><body>`;
}

/** Manifiesto de la aplicacion instalable. */
export function manifiesto(token = '') {
  const q = token ? `?token=${encodeURIComponent(token)}` : '';
  return {
    name: `${config.negocio.nombre} · panel de operación`,
    short_name: config.negocio.nombre,
    description: 'Cola de trabajo, clientes y herramientas de APPOS',
    start_url: `/${q}`,
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: COLOR_MARCA,
    theme_color: COLOR_MARCA,
    lang: 'es-CL',
    icons: [
      { src: '/icono-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
