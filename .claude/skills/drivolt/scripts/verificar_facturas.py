#!/usr/bin/env python3
"""Valida un JSON de ventas DRIVOLT antes de cargarlo al panel.

Comprueba tres cosas por documento:
  1. neto + IVA + ILA == total          (la aritmética del propio documento)
  2. cajas x precio de lista == total   (que las cajas se leyeron bien)
  3. las claves de producto existen     (que no se coló un typo)

La primera sólo corre si el documento trae el desglose de impuestos. Los JSON
antiguos guardan sólo neto y total; ahí se verifica en cambio que la relación
total/neto caiga en el rango que permiten IVA 19% + ILA (1,19 a 1,32).

La segunda es la importante: es la que detecta que se confundieron litros con cajas,
que faltó una línea o que se leyó mal un dígito.

La tolerancia crece con el número de líneas porque el SII redondea a peso el neto,
el IVA y el ILA de CADA línea por separado: una factura de cinco familias arrastra
cinco veces más redondeo que una de una sola. La 536 (5 familias, 40 cajas) difiere
$47 y está perfecta. El margen es amplio a propósito y aun así no deja pasar un error
real: la caja más barata del catálogo vale $10.800, dos órdenes de magnitud más que
cualquier redondeo posible.

Uso:
    python verificar_facturas.py ventas_04sep.json [otro.json ...]

Sale con código 1 si algo no cuadra, para que el llamador se detenga.
"""
import json, sys

# 'PipenoBidon' es la excepción del catálogo: se vende por unidad, un envase de
# 5 L, no por caja. El precio y el costo de abajo son los de UN bidón, así que en
# el JSON de ventas su "cajas" cuenta bidones sueltos.
PRECIO = {'Cabernet': 13800, 'Carmenere': 13800, 'Merlot': 13800,
          'Pipeno': 20400, 'PipenoBidon': 4200, 'Maica': 10800, 'Gin': 64800,
          'Horizonte': 14100, 'Rosso': 51000}
COSTO  = {'Cabernet': 10800, 'Carmenere': 10800, 'Merlot': 10800,
          'Pipeno': 15600, 'PipenoBidon': 3500, 'Maica': 7800, 'Gin': 57000,
          'Horizonte': 10680, 'Rosso': 39000}
MARGEN = {k: PRECIO[k] - COSTO[k] for k in PRECIO}
TOL_BASE = 40
TOL_POR_LINEA = 30


def tolerancia(cajas):
    """Redondeo admisible: crece con las líneas del documento (ver docstring)."""
    return TOL_BASE + TOL_POR_LINEA * len(cajas)


def mon(v):
    return '$' + f"{int(v):,}".replace(',', '.')


def verificar(docs, etiqueta=''):
    problemas = []
    vig = [d for d in docs if d.get('cajas')]
    print(f"{'Doc':>6} {'Cliente':<38}{'Comuna':<14}{'Pago':<9}"
          f"{'Total':>11}{'Lista':>11}{'dif':>6}{'Margen':>10}{'%':>7}")
    for d in docs:
        n = str(d.get('n', '?'))
        cajas = d.get('cajas') or {}
        if not cajas:
            print(f"{n:>6} {d.get('cliente','')[:36]:<38}"
                  f"{'':<14}{'':<9}{mon(d.get('total',0)):>11}"
                  f"{'—':>11}{'—':>6}{'—':>10}{'—':>7}   {d.get('estado','sin cajas')}")
            continue

        desconocidas = set(cajas) - set(PRECIO)
        if desconocidas:
            problemas.append(f"doc {n}: producto desconocido {sorted(desconocidas)}")
            continue

        lista = sum(PRECIO[k] * q for k, q in cajas.items())
        margen = sum(MARGEN[k] * q for k, q in cajas.items())
        total = d['total']
        dif = lista - total

        neto = d.get('neto', 0)
        tiene_desglose = any(k in d for k in ('iva', 'ila', 'ila_licores'))
        if tiene_desglose:
            impuestos = neto + d.get('iva', 0) + d.get('ila', 0) + d.get('ila_licores', 0)
            if impuestos != total:
                problemas.append(
                    f"doc {n}: neto+IVA+ILA = {mon(impuestos)} pero el total dice {mon(total)}")
        elif neto:
            r = total / neto
            if not 1.185 <= r <= 1.325:
                problemas.append(
                    f"doc {n}: el total es {r:.3f} veces el neto y con IVA 19% + ILA "
                    f"debería estar entre 1,19 y 1,32. Revisa el neto o el total.")
        if abs(dif) > tolerancia(cajas):
            problemas.append(
                f"doc {n}: las cajas dan {mon(lista)} a precio de lista y el total dice "
                f"{mon(total)} — diferencia de {mon(abs(dif))}. Revisa los litros por caja.")

        print(f"{n:>6} {d.get('cliente','')[:36]:<38}{d.get('comuna','')[:12]:<14}"
              f"{d.get('pago',''):<9}{mon(total):>11}{mon(lista):>11}{dif:>6}"
              f"{mon(margen):>10}{margen/total*100:>6.1f}%")

    if vig:
        tot = sum(d['total'] for d in vig)
        cj = {}
        for d in vig:
            for k, q in d['cajas'].items():
                cj[k] = cj.get(k, 0) + q
        costo = sum(COSTO[k] * q for k, q in cj.items() if k in COSTO)
        contado = sum(d['total'] for d in vig if d.get('pago', '').lower().startswith('conta'))
        credito = tot - contado
        print(f"\n{etiqueta}{len(vig)} documentos vigentes · {mon(tot)}")
        print(f"  contado {mon(contado)} · crédito {mon(credito)}")
        print(f"  cajas: {dict(sorted(cj.items()))} — total {sum(cj.values())}")
        print(f"  costo de mercadería {mon(costo)} · margen {mon(tot-costo)} "
              f"({(tot-costo)/tot*100:.1f}%)")
    return problemas


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    todos = []
    for ruta in argv[1:]:
        docs = json.load(open(ruta, encoding='utf-8'))
        if isinstance(docs, dict):
            docs = [docs]
        print(f"\n=== {ruta} ===")
        todos += verificar(docs)
    if todos:
        print("\nPROBLEMAS ENCONTRADOS — no cargues esto al panel:")
        for p in todos:
            print("  ·", p)
        return 1
    print("\nTodo cuadra: aritmética de impuestos y cajas contra precio de lista.")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
