/**
 * Catalogo TUU distribuido por APPOS.
 * Precios en CLP tal como estan publicados en www.appos.cl.
 * `angulos` alimenta el generador de contenido y los guiones de venta.
 */

export const PRODUCTOS = [
  {
    handle: 'pro-2',
    titulo: 'Pro 2',
    sku: 'TUU-PRO2',
    precio: 39900,
    categoria: 'dispositivo',
    variantes: ['ENTEL / BASICO (gratis)', 'ENTEL / PLUS ($15.000 + IVA mensual)', 'MOVISTAR / BASICO (gratis)', 'MOVISTAR / PLUS ($15.000 + IVA mensual)'],
    resumen: 'La máquina que lo hace todo: cobra con tarjeta, emite boleta electrónica, controla inventario y reservas desde un solo equipo.',
    rubros: ['almacen', 'feria', 'restaurante', 'peluqueria', 'retail', 'delivery'],
    angulos: [
      'Cobrar con tarjeta y emitir la boleta del SII en el mismo aparato, sin computador.',
      'Entra en el bolsillo del delantal: sirve igual en el local y en la feria.',
      'El plan Básico es gratis, no te amarra a una mensualidad.',
    ],
  },
  {
    handle: 'pro-2-s-tuu',
    titulo: 'Pro 2 S',
    sku: 'TUU-PRO2S',
    precio: 59900,
    categoria: 'dispositivo',
    variantes: [],
    resumen: 'Escanea, cobra e imprime sin cambiar de dispositivo. Trae lector de código de barras integrado.',
    rubros: ['almacen', 'minimarket', 'botilleria', 'retail'],
    angulos: [
      'Trae el lector adentro: no compras pistola aparte ni ocupas otro enchufe.',
      'Para un almacén con muchos productos, escanear baja el error de cobro y las filas.',
      'Un solo equipo reemplaza caja, lector e impresora.',
    ],
  },
  {
    handle: 'punto-de-venta-tuu-cl',
    titulo: 'Punto de Venta (Desk 2 + Pinpad)',
    sku: 'TUU-PDV-PACK',
    precio: 214900,
    categoria: 'dispositivo',
    variantes: [],
    resumen: 'Punto de atención completo para mesón fijo: atiende, cobra, emite boleta electrónica y controla inventario.',
    rubros: ['restaurante', 'cafeteria', 'retail', 'farmacia', 'minimarket'],
    angulos: [
      'Para un local establecido al que ya no le basta una máquina de mano.',
      'El cliente paga en su propio pinpad y el cajero nunca suelta la caja.',
      'Pantalla grande: quien recién entra al equipo aprende más rápido.',
    ],
  },
  {
    handle: 'kiosco-de-autoatencion',
    titulo: 'Kiosco de autoatención',
    sku: 'TUU-KIOSCO',
    precio: 419900,
    categoria: 'dispositivo',
    variantes: [],
    resumen: 'Tu cliente elige, paga y retira su comprobante sin pasar por un cajero.',
    rubros: ['restaurante', 'cafeteria', 'comida-rapida', 'patio-comidas'],
    angulos: [
      'Atiende más gente en hora peak sin contratar otro cajero.',
      'La fila avanza sola mientras la cocina produce.',
      'El ticket promedio sube cuando el cliente elige sin apuro.',
    ],
  },
  {
    handle: 'pinpad-tuu',
    titulo: 'Pinpad',
    sku: 'TUU-PINPAD',
    precio: 61900,
    categoria: 'accesorio',
    variantes: [],
    resumen: 'Lector de tarjetas para conectar a tu caja o computador: chip, banda y NFC.',
    rubros: ['retail', 'restaurante', 'farmacia'],
    angulos: ['Suma el cobro con tarjeta a la caja que ya tienes funcionando.'],
  },
  {
    handle: 'pistola-lector-codigo-barras-tuu',
    titulo: 'Pistola lectora de código de barras 1D/2D',
    sku: 'TUU-LECTOR-1D2D',
    precio: 15990,
    categoria: 'accesorio',
    variantes: [],
    resumen: 'Agiliza el escaneo en el punto de venta y reduce errores de cobro.',
    rubros: ['almacen', 'minimarket', 'botilleria', 'retail'],
    angulos: ['Cobrar escaneando en vez de tecleando: menos errores y menos fila.'],
  },
  {
    handle: 'impresora-termica-de-comandas-80-mm',
    titulo: 'Impresora térmica de comandas 80 mm',
    sku: 'TUU-IMP-80',
    precio: 79900,
    categoria: 'accesorio',
    variantes: [],
    resumen: 'Imprime la comanda en cocina y separa la preparación del punto de cobro.',
    rubros: ['restaurante', 'cafeteria', 'comida-rapida'],
    angulos: ['La cocina deja de depender de que el garzón grite el pedido.'],
  },
  {
    handle: 'funda-silicona-pro-2-tuu',
    titulo: 'Funda de silicona para Pro 2',
    sku: 'TUU-FUNDA-PRO2',
    precio: 8000,
    categoria: 'accesorio',
    variantes: [],
    resumen: 'Protege la Pro 2 de golpes y caídas del uso diario.',
    rubros: ['feria', 'delivery', 'almacen'],
    angulos: ['8.000 pesos para cuidar un equipo que trabaja todos los días.'],
  },
  {
    handle: 'funda-silicona-se-tuu',
    titulo: 'Funda de silicona para SE',
    sku: 'TUU-FUNDA-SE',
    precio: 6000,
    categoria: 'accesorio',
    variantes: [],
    resumen: 'Funda protectora de silicona para el dispositivo TUU SE.',
    rubros: ['feria', 'delivery'],
    angulos: ['El equipo se te cae una vez y la funda ya se pagó sola.'],
  },
  {
    handle: 'numeros-de-mesa-en-acrilico-del-1-al-10',
    titulo: 'Números de mesa en acrílico 1 al 10',
    sku: 'TUU-MESA-10',
    precio: 31900,
    categoria: 'accesorio',
    variantes: [],
    resumen: 'Identifica cada pedido y entrégalo en la mesa correcta sin preguntar.',
    rubros: ['restaurante', 'cafeteria', 'comida-rapida'],
    angulos: ['Se acaba el "¿de quién era el completo?".'],
  },
  {
    handle: 'numeros-de-mesa-en-acrilico-del-1-al-20',
    titulo: 'Números de mesa en acrílico 1 al 20',
    sku: 'TUU-MESA-20',
    precio: 44900,
    categoria: 'accesorio',
    variantes: [],
    resumen: 'Para locales con más mesas o mayor rotación.',
    rubros: ['restaurante', 'cafeteria'],
    angulos: ['Más mesas atendidas sin sumar confusión.'],
  },
  {
    handle: '20-rollos-papel-termico-tuu',
    titulo: '20 rollos de papel térmico 50 mm',
    sku: 'TUU-PAPEL-20',
    precio: 8500,
    categoria: 'insumo',
    consumible: true,
    duracionDias: 45,
    variantes: [],
    resumen: 'Pack de 20 rollos de 50 mm para los dispositivos TUU.',
    rubros: ['todos'],
    angulos: ['Quedarse sin papel es quedarse sin vender.'],
  },
  {
    handle: '50-rollos-papel-termico-tuu',
    titulo: '50 rollos de papel térmico 50 mm',
    sku: 'TUU-PAPEL-50',
    precio: 19900,
    categoria: 'insumo',
    consumible: true,
    duracionDias: 100,
    variantes: [],
    resumen: 'Pack de 50 rollos de 50 mm.',
    rubros: ['todos'],
    angulos: ['Sale más barato el rollo que comprando de a 20.'],
  },
  {
    handle: '100-rollos-papel-termico-tuu',
    titulo: '100 rollos de papel térmico 50 mm',
    sku: 'TUU-PAPEL-100',
    precio: 37900,
    categoria: 'insumo',
    consumible: true,
    duracionDias: 180,
    variantes: [],
    resumen: 'Pack de 100 rollos de 50 mm para negocios de alto flujo.',
    rubros: ['todos'],
    angulos: ['El precio por rollo más conveniente del catálogo.'],
  },
  {
    handle: '20-rollos-de-papel-termico-80-mm',
    titulo: '20 rollos de papel térmico 80 mm',
    sku: 'TUU-PAPEL80-20',
    precio: 10500,
    categoria: 'insumo',
    consumible: true,
    duracionDias: 45,
    variantes: [],
    resumen: 'Pack de 20 rollos de 80 mm para impresora de comandas y kiosco.',
    rubros: ['restaurante', 'cafeteria', 'comida-rapida'],
    angulos: ['El 80 mm es el de la comanda, no confundir con el de la boleta.'],
  },
  {
    handle: '50-rollos-de-papel-termico-80-mm',
    titulo: '50 rollos de papel térmico 80 mm',
    sku: 'TUU-PAPEL80-50',
    precio: 21900,
    categoria: 'insumo',
    consumible: true,
    duracionDias: 100,
    variantes: [],
    resumen: 'Pack de 50 rollos de 80 mm.',
    rubros: ['restaurante', 'cafeteria'],
    angulos: ['Para una cocina que imprime todo el día.'],
  },
  {
    handle: '100-rollos-de-papel-termico-80-mm',
    titulo: '100 rollos de papel térmico 80 mm',
    sku: 'TUU-PAPEL80-100',
    precio: 40900,
    categoria: 'insumo',
    consumible: true,
    duracionDias: 180,
    variantes: [],
    resumen: 'Pack de 100 rollos de 80 mm para locales de alto flujo.',
    rubros: ['restaurante', 'comida-rapida'],
    angulos: ['Compra una vez al semestre y olvídate.'],
  },
  {
    handle: 'firma-electronica-simple-1-anio',
    titulo: 'Firma electrónica simple 1 año',
    sku: 'TUU-FES-1A',
    precio: 11790,
    categoria: 'insumo',
    renovable: true,
    duracionDias: 365,
    variantes: [],
    resumen: 'Requisito del SII para emitir documentos tributarios electrónicos desde tu dispositivo.',
    rubros: ['todos'],
    angulos: ['Sin firma electrónica no puedes emitir boleta electrónica. Es el paso que a todos se les olvida.'],
  },
  {
    handle: 'firma-electronica-simple-2-anios',
    titulo: 'Firma electrónica simple 2 años',
    sku: 'TUU-FES-2A',
    precio: 16790,
    categoria: 'insumo',
    renovable: true,
    duracionDias: 730,
    variantes: [],
    resumen: 'Firma electrónica simple con vigencia de 2 años.',
    rubros: ['todos'],
    angulos: ['Dos años salen bastante más baratos por año que renovar cada 12 meses.'],
  },
  {
    handle: 'firma-electronica-simple-3-anios',
    titulo: 'Firma electrónica simple 3 años',
    sku: 'TUU-FES-3A',
    precio: 19790,
    categoria: 'insumo',
    renovable: true,
    duracionDias: 1095,
    variantes: [],
    resumen: 'Firma electrónica simple con vigencia de 3 años.',
    rubros: ['todos'],
    angulos: ['La opción que menos veces te obliga a acordarte del trámite.'],
  },
];

export const RUBROS = {
  almacen: { nombre: 'Almacén / minimarket', recomendado: ['pro-2-s-tuu', 'pro-2'], complementos: ['pistola-lector-codigo-barras-tuu', '50-rollos-papel-termico-tuu'] },
  restaurante: { nombre: 'Restaurante / cafetería', recomendado: ['punto-de-venta-tuu-cl', 'pro-2'], complementos: ['impresora-termica-de-comandas-80-mm', 'numeros-de-mesa-en-acrilico-del-1-al-10', '50-rollos-de-papel-termico-80-mm'] },
  feria: { nombre: 'Feria / ambulante / delivery', recomendado: ['pro-2'], complementos: ['funda-silicona-pro-2-tuu', '20-rollos-papel-termico-tuu'] },
  retail: { nombre: 'Tienda / retail', recomendado: ['pro-2-s-tuu', 'punto-de-venta-tuu-cl'], complementos: ['pistola-lector-codigo-barras-tuu', '50-rollos-papel-termico-tuu'] },
  servicios: { nombre: 'Peluquería / servicios', recomendado: ['pro-2'], complementos: ['20-rollos-papel-termico-tuu'] },
  'comida-rapida': { nombre: 'Comida rápida / patio de comidas', recomendado: ['kiosco-de-autoatencion', 'punto-de-venta-tuu-cl'], complementos: ['impresora-termica-de-comandas-80-mm', '50-rollos-de-papel-termico-80-mm'] },
};

const porHandle = new Map(PRODUCTOS.map((p) => [p.handle, p]));

export const buscarProducto = (handle) => porHandle.get(handle) ?? null;

export const productosPorCategoria = (categoria) => PRODUCTOS.filter((p) => p.categoria === categoria);

export const consumibles = () => PRODUCTOS.filter((p) => p.consumible || p.renovable);

/** Recomendacion de equipo + complementos segun el rubro declarado por el cliente. */
export function recomendarPara(rubroClave) {
  const rubro = RUBROS[rubroClave] ?? RUBROS.almacen;
  return {
    rubro: rubro.nombre,
    equipos: rubro.recomendado.map(buscarProducto).filter(Boolean),
    complementos: rubro.complementos.map(buscarProducto).filter(Boolean),
  };
}

/** 39900 -> "$39.900" */
export function clp(valor) {
  return '$' + Math.round(valor).toLocaleString('es-CL', { useGrouping: true }).replace(/,/g, '.');
}

export function urlProducto(handle, sitio = 'https://www.appos.cl') {
  return `${sitio.replace(/\/$/, '')}/products/${handle}`;
}
