import config from '../config.js';
import { db, ahora } from './db.js';
import { PRODUCTOS, RUBROS, buscarProducto, clp, urlProducto, productosPorCategoria } from './catalogo.js';

/** Dias de publicacion: 1=lunes ... 5=viernes. */
export const DIAS_PUBLICACION = [1, 3, 5];

export const HASHTAGS = {
  base: ['#TUU', '#APPOS', '#BoletaElectronica', '#SII', '#EmprendimientoChile'],
  rubro: {
    almacen: ['#Almacen', '#Minimarket', '#BarrioChile'],
    restaurante: ['#Restaurante', '#Cafeteria', '#Gastronomia'],
    feria: ['#FeriaLibre', '#Emprendedores', '#Delivery'],
    retail: ['#Retail', '#TiendaChile'],
    servicios: ['#Peluqueria', '#Servicios'],
    'comida-rapida': ['#ComidaRapida', '#FoodTruck'],
  },
  pago: ['#PagoConTarjeta', '#PuntoDeVenta', '#POS'],
};

/** Contenido educativo: es lo que genera confianza y posiciona a APPOS como el que sabe. */
export const PILDORAS_EDUCATIVAS = [
  {
    titulo: 'Sin firma electrónica no hay boleta',
    cuerpo: 'Mucha gente compra la máquina y se queda pegada el primer día. El SII exige firma electrónica simple para emitir documentos tributarios electrónicos. Sin ella el equipo cobra, pero no emite boleta.\n\nLa firma se compra aparte y dura 1, 2 o 3 años. Si no la tienes, te la agrego a la compra y llegas con todo listo.',
    productos: ['firma-electronica-simple-1-anio'],
  },
  {
    titulo: 'La boleta electrónica no es lo mismo que el voucher',
    cuerpo: 'El voucher es el comprobante de que la tarjeta se cobró. La boleta es el documento tributario que exige el SII.\n\nSon dos cosas distintas, y te pueden cursar una multa por no entregar la segunda. Las máquinas TUU emiten las dos en la misma impresión.',
    productos: ['pro-2'],
  },
  {
    titulo: 'Cuánto papel térmico gastas realmente',
    cuerpo: 'Un negocio con 40 ventas al día se come un rollo cada dos o tres días. Un pack de 20 rollos rinde mes y medio.\n\nQuedarse sin papel es quedarse sin poder entregar boleta, y eso te para la venta. Conviene tener el pack de repuesto antes de que se acabe.',
    productos: ['50-rollos-papel-termico-tuu'],
  },
  {
    titulo: 'Comprar con distribuidor oficial no te cuesta más caro',
    cuerpo: 'El precio es el mismo que comprando directo. La diferencia es que quedas con alguien a quien preguntarle.\n\nYo te ingreso, hago la compra a tu nombre, TUU despacha y te acompaña en la activación. Y si después algo no te resulta, me escribes a mí, no a una fila de soporte.',
    productos: [],
  },
  {
    titulo: 'Tres errores al elegir tu primera máquina',
    cuerpo: '1. Comprar la más cara sin necesitarla. Si no escaneas código de barras, no necesitas el modelo con lector.\n2. Olvidar la firma electrónica y no poder emitir boleta el primer día.\n3. No cargar los productos con precio, y terminar tecleando cada monto a mano.\n\nCuéntame tu rubro y te digo cuál te sirve, aunque sea la más barata.',
    productos: [],
  },
  {
    titulo: 'El cierre de caja que nadie te explica',
    cuerpo: 'Al final del día el equipo te muestra cuánto vendiste, cuánto fue efectivo y cuánto tarjeta. Si no lo revisas, la diferencia aparece recién a fin de mes y ya no sabes de dónde salió.\n\nTómate dos minutos al cerrar. Es la costumbre que más plata le ha salvado a mis clientes.',
    productos: [],
  },
];

/** Generador determinista: el mismo calendario para la misma fecha de inicio. */
function aleatorio(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const iso = (fecha) => fecha.toISOString().slice(0, 10);

function proximosDias(desde, cantidad) {
  const fechas = [];
  const cursor = new Date(desde);
  cursor.setUTCHours(12, 0, 0, 0);
  while (fechas.length < cantidad) {
    if (DIAS_PUBLICACION.includes(cursor.getUTCDay())) fechas.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return fechas;
}

function hashtagsPara(rubro) {
  const set = new Set([...HASHTAGS.base, ...HASHTAGS.pago, ...(HASHTAGS.rubro[rubro] ?? [])]);
  return [...set].slice(0, 12).join(' ');
}

function copyProducto(producto, rng) {
  const angulo = producto.angulos[Math.floor(rng() * producto.angulos.length)] ?? producto.resumen;
  const rubro = producto.rubros.find((r) => r !== 'todos') ?? '';
  return {
    titulo: `${producto.titulo} - ${clp(producto.precio)}`,
    copy: [
      angulo,
      '',
      producto.resumen,
      '',
      `${producto.titulo}: ${clp(producto.precio)}`,
      '',
      `Somos distribuidor oficial TUU. Te ingresamos, TUU despacha a tu domicilio y te acompaña en la activación.`,
      '',
      `Escríbenos por WhatsApp o entra a ${urlProducto(producto.handle, config.negocio.sitio)}`,
    ].join('\n'),
    hashtags: hashtagsPara(rubro),
  };
}

function copyEducativo(pildora) {
  const producto = pildora.productos.length ? buscarProducto(pildora.productos[0]) : null;
  return {
    titulo: pildora.titulo,
    copy: [
      pildora.titulo.toUpperCase(),
      '',
      pildora.cuerpo,
      '',
      producto ? `${producto.titulo}: ${clp(producto.precio)} en ${config.negocio.sitio}` : `Más en ${config.negocio.sitio}`,
      '',
      'Consultas por WhatsApp, te respondo yo.',
    ].join('\n'),
    hashtags: hashtagsPara(''),
  };
}

function copyRubro(claveRubro, rng) {
  const rubro = RUBROS[claveRubro];
  const equipo = buscarProducto(rubro.recomendado[0]);
  const complemento = buscarProducto(rubro.complementos[0]);
  const angulo = equipo?.angulos[Math.floor(rng() * equipo.angulos.length)] ?? '';
  return {
    // Sin articulo delante del rubro: los nombres son categorias, no personas,
    // y varios son femeninos o plurales ("a un Feria / ambulante / delivery").
    titulo: `${rubro.nombre}: qué equipo te sirve`,
    copy: [
      `${rubro.nombre.toUpperCase()}: qué equipo TUU te conviene`,
      '',
      angulo,
      '',
      equipo ? `Recomendado: ${equipo.titulo} - ${clp(equipo.precio)}` : '',
      complemento ? `Complemento util: ${complemento.titulo} - ${clp(complemento.precio)}` : '',
      '',
      'Cuéntame tu caso por WhatsApp y te digo con franqueza cuál necesitas, aunque sea la opción más barata.',
    ].filter(Boolean).join('\n'),
    hashtags: hashtagsPara(claveRubro),
  };
}

/**
 * Arma el calendario editorial. Rota entre producto, educativo y rubro para que
 * la cuenta no sea solo catalogo.
 * @param {{desde?:Date, cantidad?:number, canal?:string}} opciones
 */
export function generarCalendario({ desde = new Date(), cantidad = 12, canal = 'instagram' } = {}) {
  const fechas = proximosDias(desde, cantidad);
  const rng = aleatorio(Number(iso(fechas[0]).replace(/-/g, '')));
  const dispositivos = productosPorCategoria('dispositivo');
  const accesorios = productosPorCategoria('accesorio');
  const insumos = productosPorCategoria('insumo');
  const clavesRubro = Object.keys(RUBROS);

  const piezas = [];
  for (let i = 0; i < fechas.length; i++) {
    const fecha = iso(fechas[i]);
    const turno = i % 3;
    let pieza;
    let handle = '';
    let formato = 'post';

    if (turno === 0) {
      const pool = i % 6 === 0 ? dispositivos : (i % 6 === 3 ? accesorios : insumos);
      const producto = pool[Math.floor(rng() * pool.length)] ?? dispositivos[0];
      handle = producto.handle;
      pieza = copyProducto(producto, rng);
    } else if (turno === 1) {
      const pildora = PILDORAS_EDUCATIVAS[Math.floor(rng() * PILDORAS_EDUCATIVAS.length)];
      formato = 'carrusel';
      pieza = copyEducativo(pildora);
    } else {
      const clave = clavesRubro[Math.floor(rng() * clavesRubro.length)];
      formato = 'reel';
      pieza = copyRubro(clave, rng);
    }

    piezas.push({ fecha, canal, formato, producto_handle: handle, ...pieza });
  }
  return piezas;
}

/** Guarda el calendario. El indice unico evita duplicar la misma pieza. */
export function guardarCalendario(piezas) {
  let guardadas = 0;
  for (const p of piezas) {
    try {
      db().prepare(`
        INSERT INTO publicaciones (fecha, canal, formato, producto_handle, titulo, copy, hashtags, imagen_url, estado, creado)
        VALUES (?, ?, ?, ?, ?, ?, ?, '', 'planificada', ?)
      `).run(p.fecha, p.canal, p.formato, p.producto_handle, p.titulo, p.copy, p.hashtags, ahora());
      guardadas++;
    } catch (e) {
      if (!String(e.message).includes('UNIQUE')) throw e;
    }
  }
  return guardadas;
}

export function publicacionesPendientes(hasta = new Date()) {
  return db().prepare(
    "SELECT * FROM publicaciones WHERE estado = 'planificada' AND fecha <= ? ORDER BY fecha ASC",
  ).all(hasta.toISOString().slice(0, 10));
}

export function listarPublicaciones(limite = 60) {
  return db().prepare('SELECT * FROM publicaciones ORDER BY fecha ASC LIMIT ?').all(limite);
}

export function marcarPublicada(id, referencia = '') {
  db().prepare("UPDATE publicaciones SET estado = 'publicada', referencia_externa = ? WHERE id = ?").run(referencia, id);
}

/** Exporta el calendario a CSV para abrirlo en planilla o programarlo en otra herramienta. */
export function exportarCSV(piezas) {
  const escapar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const filas = [['fecha', 'canal', 'formato', 'producto', 'titulo', 'copy', 'hashtags'].join(',')];
  for (const p of piezas) {
    filas.push([p.fecha, p.canal, p.formato, p.producto_handle, p.titulo, p.copy, p.hashtags].map(escapar).join(','));
  }
  return filas.join('\n');
}
