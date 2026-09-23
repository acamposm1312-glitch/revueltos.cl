#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import config from '../src/config.js';
import { generarCalendario } from '../src/core/contenido.js';
import { buscarProducto, clp, RUBROS } from '../src/core/catalogo.js';

/**
 * Arma el cuaderno de prompts para generar imagenes y reels en apps de IA
 * externas (Gemini, ChatGPT, Wan, Kimi y similares).
 *
 * Ninguna de esas apps tiene conector desde aca, asi que el sistema no puede
 * llamarlas. Lo que si puede es dejar escrito, y sincronizado con el calendario
 * real, todo lo que hay que pegarles: la ficha de marca, el enlace a la foto
 * verdadera de cada equipo y el prompt exacto de cada pieza.
 *
 * Se regenera junto con el calendario, asi que nunca queda desfasado de las
 * publicaciones que el panel tiene planificadas.
 */

const args = process.argv.slice(2);
const valor = (nombre, porDefecto) => {
  const i = args.indexOf(`--${nombre}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : porDefecto;
};

const salida = valor('salida', 'out');
const cantidad = Number(valor('cantidad', '9'));

// Fotos oficiales de TUU que ya viven en la tienda. Son el insumo que separa
// una pieza que se ve real de un rectangulo de color con texto.
const FOTOS = {
  'pro-2': 'https://cdn.shopify.com/s/files/1/0758/5831/3394/files/Carrousel-0.1xm1-6n-0kxjz.webp',
  'pro-2-s-tuu': 'https://cdn.shopify.com/s/files/1/0758/5831/3394/files/Carrousel-2.0kvcxxuu2x1m7.webp',
  'punto-de-venta-tuu-cl': 'https://cdn.shopify.com/s/files/1/0758/5831/3394/files/Carrousel-0.02r19r-nhs583.webp',
  'kiosco-de-autoatencion': 'https://cdn.shopify.com/s/files/1/0758/5831/3394/files/Carrousel-0.1vd2d6zs9b-yg.webp',
  'pinpad-tuu': 'https://cdn.shopify.com/s/files/1/0758/5831/3394/files/Carrousel-3.1xks00y6oa9uc.webp',
  'pistola-lector-codigo-barras-tuu': 'https://cdn.shopify.com/s/files/1/0758/5831/3394/files/lec-complements.3vqkse15ok2r2.webp',
  'impresora-termica-de-comandas-80-mm': 'https://cdn.shopify.com/s/files/1/0758/5831/3394/files/95-original-printer_comandas_2d5ded63af.png',
  'numeros-de-mesa-en-acrilico-del-1-al-20': 'https://cdn.shopify.com/s/files/1/0758/5831/3394/files/97-original-num1_20_df21e9b640.png',
  'numeros-de-mesa-en-acrilico-del-1-al-10': 'https://cdn.shopify.com/s/files/1/0758/5831/3394/files/98-original-table_Num_3f4970a74b.png',
  '20-rollos-papel-termico-tuu': 'https://cdn.shopify.com/s/files/1/0758/5831/3394/files/thermal-paper-complements.2ys453dcgjspz.webp',
  '50-rollos-papel-termico-tuu': 'https://cdn.shopify.com/s/files/1/0758/5831/3394/files/thermal-paper-complements.2ys453dcgjspz_88401522-6fd5-4829-97f8-1cce82d44c59.webp',
  'funda-silicona-pro-2-tuu': 'https://cdn.shopify.com/s/files/1/0758/5831/3394/files/18-original-funda_pro2_cart_icon_4c8b46328c.png',
};

const FICHA = `Marca: ${config.negocio.nombre}, distribuidor oficial de TUU en Chile.
Color de fondo: azul #0052cc. Texto sobre el azul: blanco #ffffff.
Texto secundario sobre blanco: azul oscuro #003d99. Apoyo sobre azul: #e8f0ff.
Tipografia: Inter. Titulares en peso 800, cuerpo en 400.
Formas: esquinas de 14 px en bloques, pastilla completa en etiquetas.
Formato: cuadrado 1080 x 1080 px para post y carrusel, vertical 1080 x 1920 px para reel.
Tono: directo, chileno, sin jerga publicitaria. Se habla de tu a tu.
El pie siempre dice: ${config.negocio.nombre} - Distribuidor oficial TUU - ${config.negocio.sitio.replace(/^https?:\/\//, '')}`;

const REGLA = `REGLA QUE NO SE ROMPE: no inventes la maquina.
Los equipos TUU tienen una forma concreta y una IA que los dibuje de cero va a
producir un aparato que no existe. Publicar eso es mostrarle al cliente un
producto distinto del que le vas a vender. Siempre sube la foto real como
imagen de entrada y pide que la use tal cual; la IA pone el fondo, la luz y el
movimiento, nunca el equipo.`;

function promptDePieza(pieza) {
  const producto = pieza.producto_handle ? buscarProducto(pieza.producto_handle) : null;
  const foto = pieza.producto_handle ? FOTOS[pieza.producto_handle] : null;
  const lineas = pieza.copy.split('\n').map((l) => l.trim()).filter(Boolean);
  const gancho = producto ? (lineas[0] ?? pieza.titulo) : pieza.titulo;

  if (pieza.formato === 'reel') {
    // El titulo del reel arranca con el nombre del rubro, que es de donde sale
    // el equipo recomendado. Sin esa foto el reel seria texto animado sobre un
    // fondo plano, que es justo lo que hay que dejar atras.
    const rubro = Object.values(RUBROS).find((r) => pieza.titulo.startsWith(r.nombre));
    const equipo = rubro ? buscarProducto(rubro.recomendado[0]) : null;
    const fotoEquipo = rubro ? FOTOS[rubro.recomendado[0]] : null;
    return [
      `Herramienta sugerida: Wan, modo imagen a video.`,
      ``,
      `Imagen de entrada (subela tal cual, es la foto oficial):`,
      fotoEquipo ?? 'sin foto disponible',
      ``,
      `Prompt:`,
      `Video vertical 1080x1920, 6 segundos, sin personas.`,
      `Usa la ${equipo ? equipo.titulo : 'maquina'} de la foto que subi exactamente como esta:`,
      `no cambies su forma, sus colores ni lo que muestra la pantalla.`,
      `Ponla centrada sobre un fondo azul solido #0052cc, con una sombra suave debajo.`,
      `La camara se acerca muy lento durante los seis segundos, nada mas: el equipo`,
      `no gira, no flota y no se deforma.`,
      `Deja el tercio superior libre para poner texto despues.`,
      `Sin destellos, sin particulas, sin musica epica. Sobrio, como un aviso de banco.`,
      ``,
      `Despues, en la app de Instagram, escribe encima el titulo "${pieza.titulo}"`,
      `en blanco y grande, y abajo "${equipo ? `${equipo.titulo} - ${clp(equipo.precio)}` : ''}".`,
    ].join('\n');
  }

  if (pieza.formato === 'carrusel') {
    return [
      `Herramienta sugerida: Gemini o ChatGPT, generacion de imagen.`,
      ``,
      `Imagen de entrada: ninguna.`,
      ``,
      `Prompt:`,
      `Imagen cuadrada 1080x1080 para Instagram. Fondo azul solido #0052cc.`,
      `Arriba a la izquierda, una pastilla blanca con el texto "LO QUE HAY QUE SABER"`,
      `en azul #0052cc, mayusculas, tipografia Inter peso 700, tamano chico.`,
      `Debajo, el titular en blanco, Inter peso 800, muy grande, alineado a la izquierda:`,
      `"${pieza.titulo}".`,
      `Mas abajo, en color #e8f0ff y tamano medio: "${lineas[1] ?? lineas[0] ?? ''}".`,
      `Abajo del todo una franja blanca horizontal con texto en azul.`,
      `Sin fotos, sin iconos, sin degradados. Espacio en blanco generoso.`,
    ].join('\n');
  }

  return [
    `Herramienta sugerida: Gemini o ChatGPT, edicion de imagen (no generacion).`,
    ``,
    `Imagen de entrada (subela tal cual, es la foto oficial):`,
    foto ?? 'sin foto disponible para este producto',
    ``,
    `Prompt:`,
    `Toma la ${producto ? producto.titulo : 'maquina'} de la foto que subi y recortala del fondo.`,
    `No modifiques el equipo: ni su forma, ni sus colores, ni su pantalla.`,
    `Colocalo sobre un fondo azul solido #0052cc, ocupando el tercio derecho de una`,
    `imagen cuadrada de 1080x1080, con una sombra suave debajo.`,
    `En el tercio izquierdo escribe en blanco, Inter peso 800, alineado a la izquierda:`,
    `"${gancho}"`,
    `Debajo, en un bloque blanco de esquinas redondeadas de 14 px, el texto`,
    `"${producto ? producto.titulo.toUpperCase() : ''}" en azul oscuro #003d99 y chico, y bajo el`,
    `"${producto ? clp(producto.precio) : ''}" en azul #0052cc, muy grande.`,
    `Deja una franja blanca de unos 140 px en el borde inferior.`,
  ].join('\n');
}

const piezas = generarCalendario({ cantidad });

const doc = [
  `# Prompts para generar las publicaciones en apps de IA`,
  ``,
  `Generado el ${new Date().toISOString().slice(0, 10)} para ${config.negocio.nombre}.`,
  `Cubre las ${piezas.length} publicaciones que el panel tiene planificadas.`,
  ``,
  `Estas apps no tienen conector con el sistema, asi que los prompts hay que`,
  `pegarlos a mano en la app que uses. El orden que conviene: abre la app, pega`,
  `primero la FICHA DE MARCA de aca abajo, y despues el prompt de la pieza.`,
  ``,
  `---`,
  ``,
  `## ${REGLA}`,
  ``,
  `---`,
  ``,
  `## Ficha de marca`,
  ``,
  `Pegala una vez al principio de la conversacion, antes del primer prompt.`,
  ``,
  '```',
  FICHA,
  '```',
  ``,
  `---`,
  ``,
  `## Que app conviene para que`,
  ``,
  `| Necesitas | Conviene | Por que |`,
  `| --- | --- | --- |`,
  `| Poner tu maquina real sobre el fondo azul | Gemini o ChatGPT, edicion de imagen | Parten de tu foto en vez de inventar el equipo |`,
  `| Reel con movimiento desde una foto | Wan, modo imagen a video | Es lo que mejor hace: animar una foto que ya existe |`,
  `| Carrusel solo de texto | Cualquiera de las dos | No hay producto que respetar |`,
  `| Escribir o corregir el texto | Kimi o cualquiera | No genera imagen, sirve para el copy |`,
  ``,
  `Los limites gratuitos de cada app cambian seguido, asi que no los pongo aca:`,
  `revisalos en la app antes de planificar una tanda grande.`,
  ``,
  `---`,
  ``,
  `## Fotos oficiales de los equipos`,
  ``,
  `Abrelas en el telefono, mantenlas apretadas y guardalas en la galeria. Son las`,
  `mismas que muestra tu tienda, asi que el cliente ve en la publicacion lo que`,
  `despues encuentra en ${config.negocio.sitio.replace(/^https?:\/\//, '')}.`,
  ``,
  ...Object.entries(FOTOS).map(([handle, url]) => {
    const p = buscarProducto(handle);
    return `- ${p ? p.titulo : handle}: ${url}`;
  }),
  ``,
  `---`,
  ``,
  `## Las ${piezas.length} piezas`,
  ``,
].join('\n');

const cuerpo = piezas.map((pieza, i) => [
  `### ${i + 1}. ${pieza.fecha} - ${pieza.formato}`,
  ``,
  `**${pieza.titulo}**`,
  ``,
  promptDePieza(pieza),
  ``,
  `Descripcion para pegar en Instagram:`,
  ``,
  '```',
  `${pieza.copy}`,
  ``,
  `${pieza.hashtags}`,
  '```',
  ``,
].join('\n')).join('\n');

mkdirSync(resolve(salida), { recursive: true });
const ruta = resolve(salida, 'prompts-ia.md');
writeFileSync(ruta, doc + cuerpo);
console.log(`Listo: ${ruta}`);
console.log(`${piezas.length} piezas, ${Object.keys(FOTOS).length} fotos de producto.`);
