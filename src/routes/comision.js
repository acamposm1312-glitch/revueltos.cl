import config from '../config.js';
import { compararEsquemas, explicarParaCliente, TRAMOS, PRIMER_MES, ticketDeEquilibrio } from '../core/comisiones.js';
import { clp } from '../core/catalogo.js';

import { cabeceraHtml, esc } from './comunes.js';

const ESTILOS = `
:root{--fondo:#f6f7f9;--tarjeta:#fff;--texto:#16191d;--suave:#5f6975;--borde:#e3e6ea;--acento:#075e54;--ok:#0a7c3f}
@media(prefers-color-scheme:dark){:root{--fondo:#0f1115;--tarjeta:#181b21;--texto:#e8eaed;--suave:#9aa4b2;--borde:#272b33;--acento:#25d366;--ok:#4ade80}}
*{box-sizing:border-box}
body{margin:0;background:var(--fondo);color:var(--texto);font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:0 0 48px}
header{background:var(--acento);color:#fff;padding:18px 16px}
header h1{margin:0;font-size:20px} header p{margin:4px 0 0;opacity:.85;font-size:13px}
main{max-width:720px;margin:0 auto;padding:16px}
h2{font-size:15px;text-transform:uppercase;letter-spacing:.8px;color:var(--suave);margin:26px 0 10px}
.tarjeta{background:var(--tarjeta);border:1px solid var(--borde);border-radius:12px;padding:16px;margin-bottom:14px}
label{display:block;font-size:14px;color:var(--suave);margin-bottom:4px}
input[type=number]{width:100%;padding:12px;border:1px solid var(--borde);border-radius:8px;font-size:17px;margin-bottom:12px;background:var(--fondo);color:var(--texto)}
label.check{display:flex;align-items:center;gap:8px;font-size:15px;color:var(--texto);margin-bottom:14px}
button{width:100%;padding:13px;border:0;border-radius:9px;background:var(--acento);color:#fff;font-size:15px;font-weight:600;cursor:pointer}
.veredicto{font-size:22px;font-weight:700;color:var(--ok);margin:0 0 4px}
.detalle{color:var(--suave);font-size:14px}
table{width:100%;border-collapse:collapse;font-size:14px;margin-top:6px}
td,th{padding:7px 4px;border-bottom:1px solid var(--borde);text-align:left}
th{color:var(--suave);font-size:12px;text-transform:uppercase;letter-spacing:.4px}
td.num{text-align:right;font-variant-numeric:tabular-nums}
tr.gana td{font-weight:700;color:var(--ok)}
pre{white-space:pre-wrap;background:var(--fondo);border:1px solid var(--borde);border-radius:8px;padding:12px;font:13px/1.5 ui-monospace,Menlo,monospace;margin:10px 0 0}
a.volver{display:inline-block;margin-top:20px;color:var(--acento);font-weight:600;text-decoration:none}
`;

export function renderComision(token = '', params = {}) {
  const ticket = Number(params.ticket) || 0;
  const ventas = Number(params.ventas) || 0;
  const primerMes = params.primerMes === '1';
  const sufijo = token ? `?token=${encodeURIComponent(token)}` : '';

  let resultado = '';
  if (ticket > 0 && ventas > 0) {
    const r = compararEsquemas({ ticketPromedio: ticket, ventasMensuales: ventas, primerMes });
    const texto = explicarParaCliente({ ticketPromedio: ticket, ventasMensuales: ventas, primerMes });
    resultado = `
    <div class="tarjeta">
      <p class="veredicto">Le conviene la comisión ${r.conviene.toUpperCase()}</p>
      <p class="detalle">${esc(r.tramo.nombre)} · unas ${r.transacciones} ventas al mes · equilibrio en ${esc(clp(r.equilibrio))}</p>
      <table>
        <tr><th>Esquema</th><th class="num">Por venta</th><th class="num">Al mes</th><th class="num">Con IVA</th></tr>
        <tr class="${r.conviene === 'fija' ? 'gana' : ''}"><td>Fija</td><td class="num">${esc(clp(r.fija.porVenta))}</td><td class="num">${esc(clp(r.fija.mensual))}</td><td class="num">${esc(clp(r.fija.mensualConIva))}</td></tr>
        <tr class="${r.conviene === 'mixta' ? 'gana' : ''}"><td>Mixta</td><td class="num">${esc(clp(r.mixta.porVenta))}</td><td class="num">${esc(clp(r.mixta.mensual))}</td><td class="num">${esc(clp(r.mixta.mensualConIva))}</td></tr>
      </table>
      <p class="detalle" style="margin-top:10px">Elegir bien le ahorra <strong>${esc(clp(r.ahorroMensual))} al mes</strong>, unos ${esc(clp(r.ahorroAnual))} al año.</p>
    </div>
    <h2>Para copiar y mandarle</h2>
    <div class="tarjeta"><pre>${esc(texto)}</pre></div>`;
  }

  const tabla = [...TRAMOS, PRIMER_MES].map((t) => `<tr>
    <td>${esc(t.nombre)}</td>
    <td class="num">${t.fija}%</td>
    <td class="num">${t.mixta.porcentaje}% + $${t.mixta.fijo}</td>
    <td class="num">${esc(clp(ticketDeEquilibrio(t)))}</td>
  </tr>`).join('');

  return `${cabeceraHtml(`Comisiones TUU · ${config.negocio.nombre}`, token, ESTILOS)}
<header>
  <h1>¿Qué comisión le conviene?</h1>
  <p>Depende del ticket promedio, no del volumen</p>
</header>
<main>
  <form class="tarjeta" method="get" action="/comision">
    ${token ? `<input type="hidden" name="token" value="${esc(token)}">` : ''}
    <label for="ticket">¿Cuánto le compra en promedio una persona?</label>
    <input id="ticket" name="ticket" type="number" inputmode="numeric" min="1" placeholder="15000" value="${ticket || ''}" required>
    <label for="ventas">¿Cuánto vende al mes?</label>
    <input id="ventas" name="ventas" type="number" inputmode="numeric" min="1" placeholder="8000000" value="${ventas || ''}" required>
    <label class="check"><input type="checkbox" name="primerMes" value="1" ${primerMes ? 'checked' : ''}> Es su primer mes</label>
    <button type="submit">Calcular</button>
  </form>

  ${resultado}

  <h2>Tabla de comisiones TUU</h2>
  <div class="tarjeta"><table>
    <tr><th>Rango de ventas</th><th class="num">Fija</th><th class="num">Mixta</th><th class="num">Equilibrio</th></tr>
    ${tabla}
  </table>
  <p class="detalle" style="margin-top:10px">Bajo el ticket de equilibrio conviene la fija. Sobre él, la mixta. Todas las comisiones son + IVA.</p>
  </div>

  <a class="volver" href="/${sufijo}">&larr; Volver al panel</a>
</main></body></html>`;
}
