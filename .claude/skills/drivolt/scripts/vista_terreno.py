#!/usr/bin/env python3
"""Reconstruye la vista «Terreno» del panel con lo que Nicolás informó en su app.

Por qué existe: Nicolás escribe en la base de datos de su propia página (Ruta Drivolt) y
Alejandro no tiene por qué abrir dos cosas para verlo. Cada artefacto tiene su propia base
de datos y una página no puede leer la de otra, así que el puente lo hace Claude: vuelca
las dos colecciones a disco con `ArtifactData` (`out_dir`) y corre este script, que reescribe
la vista dentro del HTML del panel.

    ArtifactData list facturas --out_dir terreno/
    ArtifactData list visitas  --out_dir terreno/
    python vista_terreno.py Panel_Control_DRIVOLT.html terreno/ --hoy 2026-09-26

La vista no es en vivo: muestra el estado del último volcado, y lo dice en pantalla con la
hora. Refrescarla es correr esto de nuevo.
"""
import argparse, datetime, glob, json, os, re, sys

MES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
PAGO = {'efectivo':('💵 Efectivo','green'), 'fiado':('🤝 Fiado','gold'),
        'transferencia':('🏦 Transferencia','blue'), 'cheque':('📄 Cheque','gold')}


def esc(t):
    return str(t).replace('&', '&amp;').replace('<', '&lt;')


def mon(v):
    return '$' + f"{int(v):,}".replace(',', '.')


def dia(iso):
    if not iso or '-' not in str(iso):
        return '—'
    a, m, d = str(iso).split('-')[:3]
    return '%d-%s' % (int(d), MES[int(m) - 1])


def cargar(carpeta, col):
    out = []
    for f in sorted(glob.glob(os.path.join(carpeta, col, '*.json'))):
        try:
            d = json.load(open(f, encoding='utf-8'))
        except Exception:
            continue
        out.append(d.get('data', d))
    return out


def clientes_panel(h):
    """El array maestro del panel, para saber quién más había en la comuna."""
    import json
    a = h.find('const CLIENTS')
    a = h.find('[', a)
    d = 0
    for i in range(a, len(h)):
        if h[i] == '[':
            d += 1
        elif h[i] == ']':
            d -= 1
            if d == 0:
                return json.loads(h[a:i + 1])
    return []


def vista(facturas, visitas, hoy, clientes):
    sin = sorted([f for f in facturas if not f.get('pago')],
                 key=lambda f: -int(f.get('folio') or 0))
    con = sorted([f for f in facturas if f.get('pago')],
                 key=lambda f: -int(f.get('folio') or 0))[:25]
    # la corrida más reciente que Nicolás haya marcado
    fechas = sorted({v.get('fecha') for v in visitas if v.get('fecha')}, reverse=True)
    ult = fechas[0] if fechas else None
    dia_v = [v for v in visitas if v.get('fecha') == ult]
    si = [v for v in dia_v if v.get('visitado') == 'si']
    no = [v for v in dia_v if v.get('visitado') == 'no']
    obs = [v for v in dia_v if (v.get('obs') or '').strip()]

    def fila_f(f):
        et, col = PAGO.get(f.get('pago'), ('⏳ Por informar', 'red'))
        extra = ''
        if f.get('pago') == 'cheque' and f.get('cheque'):
            extra = ' <span style="color:var(--muted);font-size:11px">cobro %s</span>' % dia(f['cheque'])
        nota = ''
        if (f.get('obs') or '').strip():
            nota = ('<span style="color:var(--muted);font-size:11px"> · %s</span>'
                    % esc(f['obs']))
        return ('<tr><td class="fw-600">%s</td><td>%s</td><td>%s%s</td>'
                '<td class="num">%s</td><td><span class="badge badge-%s">%s</span>%s</td></tr>'
                % (esc(f.get('folio', '—')), dia(f.get('fecha')), esc(f.get('cliente', '—')),
                   nota, mon(f.get('monto', 0)), col, et, extra))

    tot_sin = sum(int(f.get('monto') or 0) for f in sin)
    bloques = []

    bloques.append(
      '<div class="kpi-row">'
      '<div class="kpi-card kpi-%s"><div class="kpi-body"><div><div class="kpi-num">%d</div>'
      '<div class="kpi-lbl">Facturas por informar</div></div><div class="kpi-ic">⏳</div></div></div>'
      '<div class="kpi-card kpi-teal"><div class="kpi-body"><div><div class="kpi-num">%s</div>'
      '<div class="kpi-lbl">Monto sin forma de pago</div></div><div class="kpi-ic">💵</div></div></div>'
      '<div class="kpi-card kpi-green"><div class="kpi-body"><div><div class="kpi-num">%d</div>'
      '<div class="kpi-lbl">Visitas marcadas%s</div></div><div class="kpi-ic">✅</div></div></div>'
      '<div class="kpi-card kpi-gold"><div class="kpi-body"><div><div class="kpi-num">%d</div>'
      '<div class="kpi-lbl">No estaban%s</div></div><div class="kpi-ic">🚪</div></div></div>'
      '</div>' % ('red' if sin else 'green', len(sin), mon(tot_sin),
                  len(si), ' el %s' % dia(ult) if ult else '',
                  len(no), ' el %s' % dia(ult) if ult else ''))

    if sin:
        bloques.append(
          '<div class="card"><div class="card-header"><h3>⏳ Esperando que Nicolás informe</h3>'
          '<span class="tag">%s en %d %s</span></div><div class="card-body" style="padding:0">'
          '<table><thead><tr><th>N° Factura</th><th>Fecha</th><th>Cliente</th>'
          '<th class="num">Monto</th><th>Forma de pago</th></tr></thead><tbody>%s</tbody></table>'
          '</div></div>' % (mon(tot_sin), len(sin), 'factura' if len(sin) == 1 else 'facturas',
                            ''.join(fila_f(f) for f in sin)))
    else:
        bloques.append(
          '<div class="card"><div class="card-header"><h3>⏳ Esperando que Nicolás informe</h3>'
          '<span class="tag">nada pendiente</span></div><div class="card-body">'
          '<p style="margin:0;font-size:13px;color:var(--muted)">Todas las facturas cargadas '
          'tienen su forma de pago. Cuando suban facturas nuevas aparecen acá hasta que él '
          'las marque en terreno.</p></div></div>')

    if con:
        bloques.append(
          '<div class="card"><div class="card-header"><h3>✅ Forma de pago informada</h3>'
          '<span class="tag">últimas %d facturas</span></div><div class="card-body" style="padding:0">'
          '<table><thead><tr><th>N° Factura</th><th>Fecha</th><th>Cliente</th>'
          '<th class="num">Monto</th><th>Forma de pago</th></tr></thead><tbody>%s</tbody></table>'
          '</div></div>' % (len(con), ''.join(fila_f(f) for f in con)))

    if ult:
        # La comuna completa, no sólo los marcados: lo que interesa es quién quedó fuera.
        marca = {v.get('rut'): v for v in dia_v}
        comunas = sorted({v.get('comuna') for v in dia_v if v.get('comuna')})
        sin_marcar = []
        secciones = []
        for k in comunas:
            en_k = [c for c in clientes if len(c) > 10 and c[10] == k]
            en_k.sort(key=lambda c: -int(str(c[2]).replace('$', '').replace('.', '') or 0))
            filas = []
            for c in en_k:
                v = marca.get(c[0])
                if v is None:
                    et, col = 'Sin marcar', 'red'
                    sin_marcar.append(c)
                elif v.get('visitado') == 'si':
                    et, col = ('Compró', 'green') if 'factura' in (v.get('obs') or '') \
                        else ('Visitado, sin venta', 'blue')
                elif v.get('visitado') == 'no':
                    et, col = 'No estaba', 'gold'
                else:
                    et, col = 'Sin marcar', 'red'
                    sin_marcar.append(c)
                nota = ''
                if v and (v.get('obs') or '').strip():
                    nota = (' <span style="color:var(--muted);font-size:11px">%s</span>'
                            % esc(v['obs']))
                filas.append(
                  '<tr><td class="fw-600">%s</td><td>%s</td><td class="num">%s</td>'
                  '<td class="num">%s</td><td><span class="badge badge-%s">%s</span>%s</td></tr>'
                  % (esc(c[1]), dia(c[7]), c[9] if len(c) > 9 else '—',
                     mon(str(c[2]).replace('$', '').replace('.', '') or 0), col, et, nota))
            secciones.append(
              '<div class="card"><div class="card-header"><h3>🚚 %s — la corrida del %s</h3>'
              '<span class="tag">%d de %d con venta</span></div>'
              '<div class="card-body" style="padding:0"><table><thead><tr><th>Cliente</th>'
              '<th>Última compra</th><th class="num">Días</th><th class="num">Venta histórica</th>'
              '<th>Qué pasó</th></tr></thead><tbody>%s</tbody></table></div></div>'
              % (esc(k), dia(ult),
                 sum(1 for c in en_k if 'factura' in ((marca.get(c[0]) or {}).get('obs') or '')),
                 len(en_k), ''.join(filas)))
        if sin_marcar:
            dormida = sum(int(str(c[2]).replace('$', '').replace('.', '') or 0)
                          for c in sin_marcar)
            secciones.insert(0,
              '<div class="alert-box alert-danger"><b>%d %s de la comuna quedaron sin '
              'explicación.</b> No compraron y Nicolás todavía no marca si pasó por ahí. '
              'Suman <b>%s</b> de venta histórica: %s. Eso es lo que hay que preguntarle — '
              'o esperar a que lo marque en su app.</div>'
              % (len(sin_marcar), 'clientes' if len(sin_marcar) != 1 else 'cliente',
                 mon(dormida), esc(', '.join(c[1] for c in sin_marcar))))
        bloques.extend(secciones)
    else:
        bloques.append(
          '<div class="card"><div class="card-header"><h3>🚚 Última corrida marcada</h3>'
          '<span class="tag">sin marcas todavía</span></div><div class="card-body">'
          '<p style="margin:0;font-size:13px;color:var(--muted)">Nicolás aún no marca visitas '
          'en su app. Cuando lo haga, acá aparece a quién visitó, a quién no encontró y lo que '
          'haya anotado de cada uno.</p></div></div>')

    return (
      '<h1 class="page-title">Terreno</h1>'
      '<div class="alert-box"><b>Lo que informa Nicolás desde su app.</b> Él tiene su propia '
      'página —rutas, clientes y forma de pago—, sin acceso a costos, márgenes, saldos ni '
      'resultados. Lo que marca ahí se refleja acá para no tener que preguntarle por WhatsApp. '
      '<b>No es en vivo:</b> esta vista muestra el estado del último cierre, %s. Se refresca '
      'cada vez que se actualiza el panel, o cuando lo pidas.</div>%s'
      % (hoy, ''.join(bloques)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('panel')
    ap.add_argument('carpeta')
    ap.add_argument('--hoy', default='')
    a = ap.parse_args()

    facturas = cargar(a.carpeta, 'facturas')
    visitas = cargar(a.carpeta, 'visitas')
    sello = a.hoy or datetime.date.today().isoformat()
    h = open(a.panel, encoding='utf-8').read()
    cuerpo = vista(facturas, visitas, sello, clientes_panel(h))
    marca = '<div class="view" id="view-terreno">'
    if marca in h:
        i = h.find(marca) + len(marca)
        j = h.find('\n    </div>', i)
        if j < 0:
            sys.exit('no se encontró el cierre de la vista terreno')
        h = h[:i] + '\n      ' + cuerpo + h[j:]
    else:
        # primera vez: se crea la vista y su entrada en el menú
        nav = ('<div class="nav-item " data-view="rutas" onclick="showView(\'rutas\')">'
               '<span class="ic">🗺️</span>Rutas y cobertura</div>')
        if h.count(nav) != 1:
            sys.exit('no se encontró dónde colgar el menú')
        h = h.replace(nav, nav + '<div class="nav-item " data-view="terreno" '
                      'onclick="showView(\'terreno\')"><span class="ic">🚚</span>Terreno</div>')
        anc = '\n    <!-- ===== INVENTARIO ===== -->'
        if h.count(anc) != 1:
            sys.exit('no se encontró dónde insertar la vista')
        h = h.replace(anc, '\n\n    <!-- ===== TERRENO (lo informa Nicolás) ===== -->\n'
                      '    <div class="view" id="view-terreno">\n      ' + cuerpo +
                      '\n    </div>' + anc)

    open(a.panel, 'w', encoding='utf-8').write(h)
    print('vista Terreno · %d facturas (%d por informar) · %d visitas'
          % (len(facturas), sum(1 for f in facturas if not f.get('pago')), len(visitas)))


if __name__ == '__main__':
    main()
