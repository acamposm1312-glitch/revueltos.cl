/**
 * Normaliza numeros chilenos a formato internacional sin signos: 56912345678.
 * Acepta "+56 9 1234 5678", "912345678", "9 1234 5678", "56912345678", "0912345678".
 * Devuelve '' si no logra interpretarlo como numero chileno valido.
 */
export function normalizarTelefono(entrada) {
  if (!entrada) return '';
  let d = String(entrada).replace(/\D/g, '');
  if (!d) return '';

  // 0056... -> 56...
  if (d.startsWith('00')) d = d.slice(2);
  // 0 9 1234 5678 -> 9 1234 5678
  if (d.length === 10 && d.startsWith('0')) d = d.slice(1);

  if (d.startsWith('56')) {
    const resto = d.slice(2);
    // movil: 9 + 8 digitos | fijo: 8 digitos
    if (resto.length === 9 && resto.startsWith('9')) return '56' + resto;
    if (resto.length === 8) return '56' + resto;
    return '';
  }
  // movil sin prefijo pais
  if (d.length === 9 && d.startsWith('9')) return '56' + d;
  // movil sin el 9 inicial ni pais (8 digitos) -> se asume movil
  if (d.length === 8) return '569' + d;
  return '';
}

/** 56912345678 -> "+56 9 1234 5678" */
export function formatearTelefono(e164) {
  const n = normalizarTelefono(e164);
  if (!n) return '';
  const resto = n.slice(2);
  if (resto.length === 9) return `+56 ${resto[0]} ${resto.slice(1, 5)} ${resto.slice(5)}`;
  return `+56 ${resto}`;
}

export function esEmailValido(valor) {
  return typeof valor === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor.trim());
}
