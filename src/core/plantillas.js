import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import config from '../config.js';
import { ROOT } from '../config.js';
import { clp, recomendarPara, buscarProducto, urlProducto } from './catalogo.js';

const DIR = resolve(ROOT, 'src', 'templates');

/** Reemplaza {{clave}} por su valor. Las claves sin valor quedan vacias. */
export function render(texto, datos = {}) {
  return texto.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, clave) => {
    const valor = datos[clave];
    return valor === undefined || valor === null ? '' : String(valor);
  }).replace(/[ \t]+\n/g, '\n').trim();
}

export function cargarPlantilla(canal, nombre) {
  const archivo = resolve(DIR, canal, `${nombre}.txt`);
  if (!existsSync(archivo)) throw new Error(`Plantilla no encontrada: ${canal}/${nombre}`);
  return readFileSync(archivo, 'utf8');
}

export function listarPlantillas(canal) {
  const dir = resolve(DIR, canal);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.txt')).map((f) => f.replace(/\.txt$/, ''));
}

/** Primer nombre, con mayuscula inicial. "juan perez soto" -> "Juan" */
export function nombreCorto(nombre) {
  const primero = String(nombre ?? '').trim().split(/\s+/)[0] ?? '';
  if (!primero) return '';
  return primero.charAt(0).toUpperCase() + primero.slice(1).toLowerCase();
}

/**
 * Bloque de recomendacion en texto plano, usado por las plantillas de cotizacion,
 * recompra y renovacion.
 */
export function bloqueRecomendacion(handles) {
  const productos = handles.map(buscarProducto).filter(Boolean);
  if (!productos.length) return '';
  return productos
    .map((p) => `- ${p.titulo}: ${clp(p.precio)}\n  ${p.resumen}\n  ${urlProducto(p.handle, config.negocio.sitio)}`)
    .join('\n\n');
}

export function recomendacionPorRubro(rubro) {
  const r = recomendarPara(rubro);
  const equipos = r.equipos.slice(0, 2).map((p) => p.handle);
  const complementos = r.complementos.slice(0, 2).map((p) => p.handle);
  return bloqueRecomendacion([...equipos, ...complementos]);
}

/** Variables disponibles en toda plantilla. */
export function variablesBase(lead = {}, extra = {}) {
  const corto = nombreCorto(lead.nombre);
  return {
    nombre: lead.nombre ?? '',
    nombre_corto: corto,
    saludo: corto ? `Hola ${corto}` : 'Hola',
    rubro: lead.rubro || 'tu negocio',
    negocio: config.negocio.nombre,
    vendedor: config.negocio.vendedor,
    sitio: config.negocio.sitio,
    correo: config.negocio.correo,
    whatsapp: config.negocio.whatsapp,
    instagram: config.negocio.instagram,
    recomendacion: lead.rubro ? recomendacionPorRubro(lead.rubro) : '',
    ...extra,
  };
}

/** Renderiza una plantilla de WhatsApp para un lead. */
export function mensajeWhatsapp(nombrePlantilla, lead, extra = {}) {
  return render(cargarPlantilla('whatsapp', nombrePlantilla), variablesBase(lead, extra));
}

/**
 * Renderiza una plantilla de correo. El archivo empieza con "asunto: ..." y luego "---".
 * @returns {{asunto: string, cuerpo: string}}
 */
export function mensajeEmail(nombrePlantilla, lead, extra = {}) {
  const crudo = cargarPlantilla('email', nombrePlantilla);
  const separador = crudo.indexOf('\n---');
  let asuntoCrudo = '';
  let cuerpoCrudo = crudo;
  if (separador !== -1) {
    asuntoCrudo = crudo.slice(0, separador).replace(/^asunto:\s*/i, '');
    cuerpoCrudo = crudo.slice(separador + 4);
  }
  const datos = variablesBase(lead, extra);
  return { asunto: render(asuntoCrudo, datos), cuerpo: render(cuerpoCrudo, datos) };
}
