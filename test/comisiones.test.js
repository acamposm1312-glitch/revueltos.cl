import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAMOS, PRIMER_MES, IVA, tramoPara, ticketDeEquilibrio,
  compararEsquemas, explicarParaCliente,
} from '../src/core/comisiones.js';

describe('tramos de comision', () => {
  test('ubica cada volumen de ventas en su tramo', () => {
    assert.equal(tramoPara(3_000_000).clave, 'hasta_5m');
    assert.equal(tramoPara(5_000_000).clave, 'hasta_5m', 'el limite pertenece al tramo de abajo');
    assert.equal(tramoPara(5_000_001).clave, 'de_5m_a_10m');
    assert.equal(tramoPara(10_000_000).clave, 'de_5m_a_10m');
    assert.equal(tramoPara(10_000_001).clave, 'sobre_10m');
  });

  test('el primer mes usa la tarifa mas baja, sea cual sea el volumen', () => {
    assert.equal(tramoPara(1_000_000, true).clave, 'primer_mes');
    assert.equal(tramoPara(50_000_000, true).clave, 'primer_mes');
    assert.equal(PRIMER_MES.fija, 1.49);
  });
});

describe('punto de equilibrio', () => {
  test('coincide con el calculo a mano de cada tramo', () => {
    assert.equal(Math.round(ticketDeEquilibrio(TRAMOS[0])), 6500);
    assert.equal(Math.round(ticketDeEquilibrio(TRAMOS[1])), 8125);
    assert.equal(Math.round(ticketDeEquilibrio(TRAMOS[2])), 9286);
  });

  test('justo en el equilibrio las dos cuestan lo mismo', () => {
    const t = TRAMOS[0];
    const ticket = ticketDeEquilibrio(t);
    const r = compararEsquemas({ ticketPromedio: ticket, ventasMensuales: 3_000_000 });
    assert.ok(Math.abs(r.fija.mensual - r.mixta.mensual) < 0.01, 'deberian empatar');
  });
});

describe('que esquema conviene', () => {
  test('ticket bajo: conviene la fija', () => {
    const r = compararEsquemas({ ticketPromedio: 3500, ventasMensuales: 3_000_000 });
    assert.equal(r.conviene, 'fija');
    assert.ok(r.ahorroMensual > 0);
  });

  test('ticket alto: conviene la mixta', () => {
    const r = compararEsquemas({ ticketPromedio: 15000, ventasMensuales: 8_000_000 });
    assert.equal(r.conviene, 'mixta');
  });

  test('los montos cuadran con el calculo directo', () => {
    const r = compararEsquemas({ ticketPromedio: 15000, ventasMensuales: 8_000_000 });
    assert.equal(r.transacciones, 533);
    // 1,69% de 15.000 = 253,5 por venta
    assert.ok(Math.abs(r.fija.porVenta - 253.5) < 0.01);
    // 0,89% de 15.000 + 65 = 198,5 por venta
    assert.ok(Math.abs(r.mixta.porVenta - 198.5) < 0.01);
    // El mensual es por venta por la cantidad de transacciones
    assert.ok(Math.abs(r.fija.mensual - 253.5 * (8_000_000 / 15000)) < 0.01);
  });

  test('el IVA se aplica sobre la comision', () => {
    const r = compararEsquemas({ ticketPromedio: 15000, ventasMensuales: 8_000_000 });
    assert.ok(Math.abs(r.mixta.mensualConIva - r.mixta.mensual * (1 + IVA)) < 0.01);
  });

  test('el ahorro anual son doce meses del mensual', () => {
    const r = compararEsquemas({ ticketPromedio: 3500, ventasMensuales: 3_000_000 });
    assert.ok(Math.abs(r.ahorroAnual - r.ahorroMensual * 12) < 0.01);
  });

  test('exige los dos datos', () => {
    assert.throws(() => compararEsquemas({ ticketPromedio: 0, ventasMensuales: 100 }), /ticket promedio/);
    assert.throws(() => compararEsquemas({ ticketPromedio: 100, ventasMensuales: 0 }), /ventas mensuales/);
  });
});

describe('explicacion para el cliente', () => {
  test('nombra el esquema que gana y el ahorro', () => {
    const texto = explicarParaCliente({ ticketPromedio: 15000, ventasMensuales: 8_000_000 });
    assert.match(texto, /comisión MIXTA/);
    assert.match(texto, /te ahorra alrededor de/);
    assert.match(texto, /\$8\.125/, 'debe mencionar el equilibrio de su tramo');
  });

  test('no deja numeros sin formato chileno', () => {
    const texto = explicarParaCliente({ ticketPromedio: 3500, ventasMensuales: 3_000_000 });
    assert.match(texto, /\$3\.000\.000/);
    assert.doesNotMatch(texto, /\$\d{4,}(?!\.)/, 'los miles deben ir con punto');
  });
});
