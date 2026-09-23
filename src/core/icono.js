import { deflateSync } from 'node:zlib';

/**
 * Generador de iconos PNG sin dependencias.
 *
 * iOS exige PNG para el icono de la pantalla de inicio: no acepta SVG de forma
 * confiable. Como el proyecto no usa librerias externas, se dibujan los pixeles
 * a mano y se codifica el PNG con el deflate que trae Node.
 */

const FIRMA = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const tablaCrc = (() => {
  const tabla = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c;
  }
  return tabla;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = tablaCrc[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloque(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}

/** Codifica pixeles RGBA (Uint8Array de lado*lado*4) como PNG. */
export function codificarPng(pixeles, lado) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8;   // 8 bits por canal
  ihdr[9] = 6;   // RGBA
  ihdr[10] = 0;  // compresion deflate
  ihdr[11] = 0;  // filtro adaptativo
  ihdr[12] = 0;  // sin entrelazado

  // Cada linea va precedida por su byte de filtro, aqui siempre 0 (sin filtro).
  const conFiltro = Buffer.alloc(lado * (lado * 4 + 1));
  for (let y = 0; y < lado; y++) {
    conFiltro[y * (lado * 4 + 1)] = 0;
    Buffer.from(pixeles.buffer, y * lado * 4, lado * 4)
      .copy(conFiltro, y * (lado * 4 + 1) + 1);
  }

  return Buffer.concat([
    FIRMA,
    bloque('IHDR', ihdr),
    bloque('IDAT', deflateSync(conFiltro, { level: 9 })),
    bloque('IEND', Buffer.alloc(0)),
  ]);
}

/** ¿Esta el punto dentro del triangulo dado? Coordenadas en fraccion del lado. */
function enTriangulo(x, y, [ax, ay], [bx, by], [cx, cy]) {
  const signo = (px, py, qx, qy, rx, ry) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
  const d1 = signo(x, y, ax, ay, bx, by);
  const d2 = signo(x, y, bx, by, cx, cy);
  const d3 = signo(x, y, cx, cy, ax, ay);
  const negativo = d1 < 0 || d2 < 0 || d3 < 0;
  const positivo = d1 > 0 || d2 > 0 || d3 > 0;
  return !(negativo && positivo);
}

/**
 * Icono de APPOS: una "A" blanca sobre el verde de la marca, con las esquinas
 * redondeadas. Se dibuja con supermuestreo para que los bordes no queden
 * dentados.
 */
export function generarIcono(lado = 512) {
  const px = new Uint8Array(lado * lado * 4);
  const fondo = [7, 94, 84];       // #075e54
  const tinta = [255, 255, 255];
  const radio = 0.22;              // esquinas redondeadas, en fraccion del lado
  const muestras = 3;              // supermuestreo 3x3

  const dentroDeLaTarjeta = (x, y) => {
    const dx = Math.max(radio - x, 0, x - (1 - radio));
    const dy = Math.max(radio - y, 0, y - (1 - radio));
    return dx * dx + dy * dy <= radio * radio;
  };

  /**
   * La "A" se arma restando dos huecos al triangulo exterior:
   *  - el contrapunzon de arriba, el hueco cerrado del vertice
   *  - la abertura de abajo, entre las dos patas
   * Lo que queda entre ambos es el travesano. Sin el segundo hueco la letra se
   * lee como un triangulo, no como una A.
   */
  const dentroDeLaLetra = (x, y) => {
    if (!enTriangulo(x, y, [0.5, 0.15], [0.14, 0.87], [0.86, 0.87])) return false;
    if (enTriangulo(x, y, [0.5, 0.33], [0.415, 0.58], [0.585, 0.58])) return false;
    if (enTriangulo(x, y, [0.5, 0.68], [0.28, 0.87], [0.72, 0.87])) return false;
    return true;
  };

  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let dentroTarjeta = 0;
      let dentroLetra = 0;
      for (let sy = 0; sy < muestras; sy++) {
        for (let sx = 0; sx < muestras; sx++) {
          const fx = (x + (sx + 0.5) / muestras) / lado;
          const fy = (y + (sy + 0.5) / muestras) / lado;
          if (dentroDeLaTarjeta(fx, fy)) dentroTarjeta++;
          if (dentroDeLaLetra(fx, fy)) dentroLetra++;
        }
      }
      const total = muestras * muestras;
      const alfaTarjeta = dentroTarjeta / total;
      const alfaLetra = (dentroLetra / total) * alfaTarjeta;

      const i = (y * lado + x) * 4;
      for (let c = 0; c < 3; c++) {
        px[i + c] = Math.round(fondo[c] * (1 - alfaLetra) + tinta[c] * alfaLetra);
      }
      px[i + 3] = Math.round(255 * alfaTarjeta);
    }
  }

  return codificarPng(px, lado);
}
