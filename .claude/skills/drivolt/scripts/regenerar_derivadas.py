#!/usr/bin/env python3
"""Reconstruye TODAS las secciones derivadas del panel DRIVOLT a partir de CLIENTS.

Por qué existe: en el panel hay una sola fuente de verdad, el array `const CLIENTS`
del final del HTML. Todo lo demás — ranking, frecuencia, inactivos, comunas, zonas,
tarjetas de ruta, captación, alertas de recompra y los contadores de cada encabezado —
son vistas de ese array escritas como HTML estático. Editar una a mano y olvidar otra
es exactamente el error que produjo, en una auditoría, once filas equivocadas en
"Mejores clientes" y un conteo de inactivos que no coincidía con la propia tabla.

La regla que se sigue de eso: después de tocar CLIENTS, no se corrige nada a mano.
Se corre este script y se regenera todo de una vez.

Uso:
    python regenerar_derivadas.py Panel_Control_DRIVOLT.html [--hoy 2026-09-08] [--sin-backup]

Sin --hoy toma la última compra más reciente que aparezca en CLIENTS, que es la fecha
de corte natural del panel. Guarda un respaldo junto al archivo antes de escribir.

Al terminar imprime un resumen para comparar contra lo que uno esperaba ver. Si el
número de activos o el total de la cartera no es el que esperabas, el problema está
en CLIENTS, no aquí.
"""
import argparse, collections, datetime, json, re, shutil, sys

# ---------------------------------------------------------------- utilidades

def esc(t):
    return str(t).replace('&', '&amp;').replace('<', '&lt;')

def mon(v):
    return '$' + f"{int(round(v)):,}".replace(',', '.')

def val(c):
    return int(str(c[2]).replace('$', '').replace('.', '') or 0)

def fecha(s):
    return None if s in ('-', '', None) else datetime.date.fromisoformat(s)

MES_LBL = {1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr', 5: 'May', 6: 'Jun',
           7: 'Jul', 8: 'Ago', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic'}
MES_FULL = {1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
            7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre',
            11: 'Noviembre', 12: 'Diciembre'}


def mes_largo(m):
    return f'{MES_FULL[int(m[5:7])]} {m[:4]}'

# Nombres y cadencias de las cuatro rutas. Si cambia el trazado se edita aquí,
# no en el HTML: el HTML se vuelve a escribir en cada corrida.
ZONAS = ['Sur (Panamericana / 5 Sur)', 'Cordillera / Lagos', 'Norte', 'Costa/Poniente']
NOM = {'Sur (Panamericana / 5 Sur)': 'Ruta Sur (Panamericana / Ruta 5 Sur)',
       'Costa/Poniente': 'Ruta Costa/Poniente (Galvarino-Imperial-Cholchol-Carahue-T. Schmidt)',
       'Cordillera / Lagos': 'Ruta Cordillera / Lagos (Cunco-Villarrica-Pucón)',
       'Norte': 'Ruta Norte (Lautaro-Victoria-Curacautín-Angol-Malleco)',
       'Temuco / Otros': 'Temuco / Otros', '-': 'Sin zona asignada'}
FREQ = {'Sur (Panamericana / 5 Sur)': 'Cada 2 semanas', 'Costa/Poniente': 'Cada 3 semanas',
        'Cordillera / Lagos': 'Cada 3 semanas', 'Norte': 'Cada 4 semanas',
        'Temuco / Otros': '-', '-': '-'}
CORTA = {'Sur (Panamericana / 5 Sur)': 'Sur', 'Costa/Poniente': 'Costa',
         'Cordillera / Lagos': 'Cordillera', 'Norte': 'Norte',
         'Temuco / Otros': 'Temuco', '-': '—'}
# Nombres bonitos para la frase: el array guarda las comunas sin tilde.
ACENTO = {'Curacautin': 'Curacautín', 'Puren': 'Purén', 'Traiguen': 'Traiguén',
          'Los Angeles': 'Los Ángeles', 'Pitrufquen': 'Pitrufquén', 'Tolten': 'Toltén',
          'Pucon': 'Pucón', 'Vilcun': 'Vilcún', 'Vina Del Mar': 'Viña Del Mar'}

# El recorrido de cada ruta, en orden de visita. Es la única fuente: de acá salen
# tanto el orden de los bloques como la frase, así que las dos no pueden
# contradecirse. Formato: zona -> (frecuencia, secuencia de comunas).
# Comunas con clientes que no están en el trazado de su ruta: las llena la
# función que arma las tarjetas y las avisa el resumen final.
HUERFANAS = []

ORDEN_RUTA = {
 'Sur (Panamericana / 5 Sur)': ('cada 2 semanas',
   ['Padre Las Casas', 'Freire', 'Pitrufquen', 'Gorbea', 'Loncoche', 'Lanco', 'Tolten',
    'Collipulli']),
 'Cordillera / Lagos': ('cada 3 semanas',
   ['Vilcun', 'Cunco', 'Melipeuco', 'Curarrehue', 'Pucon', 'Villarrica', 'Panguipulli']),
 'Norte': ('cada 4 semanas',
   ['Lautaro', 'Victoria', 'Curacautin', 'Ercilla', 'Traiguen', 'Lumaco', 'Puren',
    'Los Sauces', 'Angol', 'Los Angeles']),
 'Costa/Poniente': ('cada 3 semanas',
   ['Galvarino', 'Nueva Imperial', 'Cholchol', 'Carahue', 'Saavedra', 'Teodoro Schmidt',
    'Perquenco'])}


class Panel:
    """Envuelve el HTML y falla ruidosamente si un marcador no aparece exactamente una vez.

    Un reemplazo silencioso que no encuentra su ancla deja el panel con datos viejos y
    aspecto correcto, que es la peor forma de error posible aquí.
    """

    def __init__(self, html):
        self.h = html
        self.cambios = 0

    def _uno(self, marca):
        n = self.h.count(marca)
        if n != 1:
            sys.exit(f"ERROR: el marcador {marca[:70]!r} aparece {n} veces, se esperaba 1. "
                     "El panel cambió de estructura: revisa antes de seguir.")
        return self.h.index(marca)

    def tbody(self, marca, filas):
        """Reemplaza el <tbody> de la tabla que sigue al marcador."""
        p = self._uno(marca)
        a = self.h.index('>', self.h.index('<tbody', p)) + 1
        b = self.h.index('</tbody>', a)
        self.h = self.h[:a] + filas + self.h[b:]
        self.cambios += 1

    def bloque(self, desde, hasta, nuevo):
        """Reemplaza todo lo que hay entre dos marcadores, sin incluirlos."""
        a = self._uno(desde) + len(desde)
        b = self.h.index(hasta, a)
        self.h = self.h[:a] + nuevo + self.h[b:]
        self.cambios += 1

    def kpi_row(self, ancla, tarjetas):
        """Reescribe la fila de KPIs que sigue a `ancla` (el título de una vista).

        Los KPI de captación cambian de etiqueta y no sólo de número — el mejor mes se
        mueve, el mes flojo se mueve — así que se reescribe la fila entera en vez de
        parchear números sueltos.
        """
        p = self._uno(ancla)
        a = self.h.index('<div class="kpi-row">', p) + len('<div class="kpi-row">')
        b = self.h.index('</div>\n      </div>', a) + len('</div>')
        cuerpo = ''.join(
            f'\n        <div class="kpi-card kpi-{col}"><div class="kpi-body"><div>'
            f'<div class="kpi-num">{num}</div><div class="kpi-lbl">{lbl}</div></div>'
            f'<div class="kpi-ic">{ic}</div></div></div>' for col, num, lbl, ic in tarjetas)
        # h[b:] ya empieza con el salto y la sangría del cierre de la fila; agregar
        # otro deja una línea en blanco que rompe el ancla en la corrida siguiente.
        self.h = self.h[:a] + cuerpo + self.h[b:]
        self.cambios += 1

    def tag(self, marca, texto):
        """Reescribe el <span class="tag"> que sigue a un <h3>."""
        p = self._uno(marca)
        a = self.h.index('<span class="tag">', p) + len('<span class="tag">')
        b = self.h.index('</span>', a)
        self.h = self.h[:a] + esc(texto) + self.h[b:]
        self.cambios += 1

    def kpi(self, etiqueta, valor):
        """Reescribe el número del kpi-card cuya etiqueta es `etiqueta`."""
        marca = f'<div class="kpi-lbl">{etiqueta}</div>'
        p = self._uno(marca)
        b = self.h.rindex('</div>', 0, p)
        a = self.h.rindex('<div class="kpi-num">', 0, b) + len('<div class="kpi-num">')
        self.h = self.h[:a] + str(valor) + self.h[b:]
        self.cambios += 1

    def texto(self, viejo_re, nuevo):
        """Sustituye por expresión regular; exige una única coincidencia."""
        n = len(re.findall(viejo_re, self.h))
        if n != 1:
            sys.exit(f"ERROR: el patrón {viejo_re!r} coincide {n} veces, se esperaba 1.")
        self.h = re.sub(viejo_re, nuevo, self.h)
        self.cambios += 1


def leer_clients(html):
    m = re.search(r'const CLIENTS = (\[.*?\]);\n', html, re.S)
    if not m:
        sys.exit("ERROR: no encontré `const CLIENTS = [...]` en el HTML.")
    return json.loads(m.group(1)), m


# ---------------------------------------------------------------- derivadas

def ciclos(C, hoy):
    """Ciclo de recompra por cliente: promedio de días entre pedidos consecutivos.

    Sólo tiene sentido con dos o más pedidos y con ambas fechas. Con 2 pedidos hay un
    solo intervalo, que es una coincidencia más que un ritmo — por eso se etiqueta la
    confianza y Nicolás sabe cuáles mirar con pinzas.
    """
    out = []
    for c in C:
        p, u = fecha(c[6]), fecha(c[7])
        if c[3] < 2 or not p or not u:
            continue
        ciclo = (u - p).days / (c[3] - 1)
        if ciclo <= 0:
            continue
        dias = (hoy - u).days
        r = dias / ciclo
        est = ('alarma' if r >= 2.0 else 'atrasado' if r >= 1.3 else
               'ahora' if r >= 1.0 else 'proximo' if r >= 0.75 else 'aldia')
        out.append(dict(c=c, ciclo=round(ciclo), exacto=ciclo, dias=dias, r=r, est=est,
                        esp=u + datetime.timedelta(days=round(ciclo)),
                        conf='alta' if c[3] >= 4 else 'media' if c[3] == 3 else 'baja',
                        ruta=CORTA.get(c[12], '—')))
    return out


def refrescar_campos(C, hoy):
    """Recalcula los campos de CLIENTS que son derivables de los demás.

    Cuatro de las catorce columnas no son datos, son cuentas: el % del total, la
    frecuencia promedio, los días sin comprar y el estado activo/inactivo. Se guardan
    dentro del array por comodidad de la ficha, pero envejecen solos: basta que cambie
    la fecha de corte para que los días queden mal, y basta una factura nueva para que
    la frecuencia guardada deje de coincidir con las fechas que están dos columnas más
    allá. Recalcularlos aquí es lo que evita que la ficha de un cliente contradiga a la
    tabla que la resume.

    Dos cosas se dejan como están a propósito:
      · la frecuencia escrita como "3 pedidos" — es el aviso de que no hay fecha de
        primera compra y no se puede estimar ciclo; borrarla perdería esa señal;
      · el estado de quien no tiene ninguna fecha de compra — que esté activo o no es
        un criterio comercial de Alejandro, no algo que se deduzca de una fecha que
        no existe.
    """
    tot = sum(val(c) for c in C) or 1
    n_frec = n_est = n_dias = 0
    for c in C:
        c[4] = f'{val(c)/tot*100:.1f}%'
        p, u = fecha(c[6]), fecha(c[7])
        if u:
            d = (hoy - u).days
            if c[9] != d:
                c[9] = d
                n_dias += 1
            est = 'Activo' if d <= 60 else 'Inactivo'
            if c[8] != est:
                c[8] = est
                n_est += 1
        if c[3] >= 2 and p and u and (u - p).days > 0:
            fr = f'{round((u - p).days / (c[3] - 1))}d'
            if c[5] != fr:
                c[5] = fr
                n_frec += 1
    return n_frec, n_est, n_dias


def camadas(C):
    """Agrupa clientes por mes de primera compra.

    Un cliente con un solo pedido y sin fecha de primera se cuenta por su última: es
    la misma compra. Los que no tienen ninguna fecha quedan fuera y se informan, para
    que el gráfico no mienta por omisión.
    """
    g, sin_fecha = collections.defaultdict(list), 0
    for c in C:
        if c[6] not in ('-', ''):
            g[c[6][:7]].append(c)
        elif c[3] == 1 and c[7] not in ('-', ''):
            g[c[7][:7]].append(c)
        else:
            sin_fecha += 1
    return g, sin_fecha


def rango_meses(g, hoy):
    if not g:
        return []
    ini = min(g)
    y, m = int(ini[:4]), int(ini[5:7])
    fin = hoy.strftime('%Y-%m')
    out = []
    while f'{y:04d}-{m:02d}' <= fin:
        out.append(f'{y:04d}-{m:02d}')
        m += 1
        if m == 13:
            y, m = y + 1, 1
    return out


def etiqueta_mes(m, hoy, parcial=True):
    y, mm = int(m[:4]), int(m[5:7])
    lbl = f'{MES_LBL[mm]} {y}'
    if parcial and m == hoy.strftime('%Y-%m'):
        lbl += ' (parcial)'
    return lbl


# ------------------------------------------------------------ vista alertas

TH_AL = ('<thead><tr><th>Cliente</th><th>Comuna</th><th>Ruta</th><th class="num">Ciclo</th>'
         '<th>Última compra</th><th class="num">Lleva</th><th>Se esperaba</th>'
         '<th class="num">Atraso</th><th>Estado</th><th class="num">Venta histórica</th></tr></thead>')
LBL_EST = {'alarma': 'Alarma', 'atrasado': 'Atrasado', 'ahora': 'Toca ahora',
           'proximo': 'Próximo', 'aldia': 'Al día'}
CLS_EST = {'alarma': 'red', 'atrasado': 'gold', 'ahora': 'blue',
           'proximo': 'green', 'aldia': 'green'}
ORD_EST = {'alarma': 0, 'atrasado': 1, 'ahora': 2, 'proximo': 3, 'aldia': 4}


def fila_alerta(a, con_estado=True):
    c = a['c']
    falta = a['ciclo'] - a['dias']
    plazo = f"hace {abs(falta)} d" if falta < 0 else (f"en {falta} d" if falta > 0 else "hoy")
    cf = '' if a['conf'] == 'alta' else \
        f'<span style="color:var(--muted);font-size:10px"> · ciclo {a["conf"]}</span>'
    badge = (f'<span class="badge badge-{CLS_EST[a["est"]]}">{LBL_EST[a["est"]]}</span>'
             if con_estado else '')
    return (f'<tr><td class="fw-600">{esc(c[1])}{cf}</td><td>{esc(c[10])}</td><td>{a["ruta"]}</td>'
            f'<td class="num">{a["ciclo"]} d</td><td>{c[7]}</td><td class="num">{a["dias"]} d</td>'
            f'<td>{a["esp"].isoformat()}<span style="color:var(--muted);font-size:10.5px">'
            f' · {plazo}</span></td><td class="num">{a["r"]:.1f}x</td><td>{badge}</td>'
            f'<td class="num">{c[2]}</td></tr>')


def vista_alertas(C, al, hoy):
    ACT = [a for a in al if a['c'][8] == 'Activo']
    INA = sorted([a for a in al if a['c'][8] != 'Activo'], key=lambda a: -val(a['c']))
    urg = sorted([a for a in ACT if a['est'] in ('alarma', 'atrasado', 'ahora')],
                 key=lambda a: (ORD_EST[a['est']], -val(a['c'])))
    prox = sorted([a for a in ACT if a['est'] == 'proximo'], key=lambda a: a['ciclo'] - a['dias'])
    aldia = sorted([a for a in ACT if a['est'] == 'aldia'], key=lambda a: a['ciclo'] - a['dias'])
    tot_urg = sum(val(a['c']) for a in urg)

    byr = collections.defaultdict(lambda: {'n': 0, 'v': 0, 'top': None})
    for a in urg:
        b = byr[a['ruta']]
        b['n'] += 1
        b['v'] += val(a['c'])
        if b['top'] is None or val(a['c']) > val(b['top']['c']):
            b['top'] = a
    rutas = sorted(byr.items(), key=lambda t: -t[1]['v'])
    mxv = rutas[0][1]['v'] if rutas else 1

    def card(emoji, titulo, tag, lst):
        return (f'      <div class="card"><div class="card-header"><h3>{emoji} {titulo}</h3>'
                f'<span class="tag">{esc(tag)}</span></div><div class="card-body" style="padding:0">'
                f'<table>{TH_AL}<tbody>{"".join(fila_alerta(a) for a in lst)}</tbody></table></div></div>')

    h = [f'''      <h1 class="page-title">Alertas de recompra</h1>
      <div class="alert-box"><b>Cómo se calcula:</b> a cada cliente con dos o más pedidos se le mide su <b>ciclo</b> — el promedio de días entre una compra y la siguiente — y se compara con los días que lleva sin comprar. <b>Atraso 1,0x</b> significa que está justo en su ventana de recompra; sobre 2,0x es alarma. La columna <i>Se esperaba</i> es la fecha en que debería haber comprado según su propio ritmo.<br><br>El ciclo se marca como <b>medio</b> con 3 pedidos y <b>bajo</b> con 2: un solo intervalo no es un ritmo, es una coincidencia. Tómalos con pinzas. Quedan fuera {len(C)-len(al)} clientes de {len(C)} que tienen un solo pedido o no tienen fecha de primera compra, así que no se les puede estimar ciclo. Corte al {hoy.isoformat()}.</div>
      <div class="kpi-row">
        <div class="kpi-card kpi-red"><div class="kpi-body"><div><div class="kpi-num">{len([a for a in urg if a['est']=='alarma'])}</div><div class="kpi-lbl">En alarma (+2x su ciclo)</div></div><div class="kpi-ic">🔴</div></div></div>
        <div class="kpi-card kpi-gold"><div class="kpi-body"><div><div class="kpi-num">{len([a for a in urg if a['est']=='atrasado'])}</div><div class="kpi-lbl">Atrasados</div></div><div class="kpi-ic">🟠</div></div></div>
        <div class="kpi-card kpi-blue"><div class="kpi-body"><div><div class="kpi-num">{len([a for a in urg if a['est']=='ahora'])}</div><div class="kpi-lbl">Toca ahora</div></div><div class="kpi-ic">🔔</div></div></div>
        <div class="kpi-card kpi-teal"><div class="kpi-body"><div><div class="kpi-num">{mon(tot_urg)}</div><div class="kpi-lbl">Venta histórica en juego</div></div><div class="kpi-ic">💰</div></div></div>
      </div>''']
    h.append(card('🔔', 'A quién visitar — clientes activos',
                  f'{len(urg)} de {len(ACT)} activos con ciclo medible', urg))
    filas_r = ''.join(
        f'<tr><td class="fw-600">{esc(k)}</td><td class="num">{v["n"]}</td>'
        f'<td class="num">{mon(v["v"])}</td>'
        f'<td>{esc(v["top"]["c"][1] if v["top"] else "—")}</td>'
        f'<td class="bar-cell"><div class="bar-track"><div class="bar-fill" '
        f'style="width:{v["v"]/mxv*100:.1f}%"></div></div></td></tr>' for k, v in rutas)
    h.append('      <div class="card"><div class="card-header"><h3>🗺️ Qué ruta conviene correr primero</h3>'
             '<span class="tag">clientes por visitar y venta que representan</span></div>'
             '<div class="card-body" style="padding:0"><table><thead><tr><th>Ruta</th>'
             '<th class="num">Por visitar</th><th class="num">Venta histórica</th>'
             '<th>Cliente más grande esperando</th><th>Relativo</th></tr></thead><tbody>'
             + filas_r + '</tbody></table></div></div>')
    h.append(card('🟢', 'Se acercan a su fecha', f'{len(prox)} clientes entre 0,75x y 1,0x de su ciclo', prox))
    h.append(card('✅', 'Al día', f'{len(aldia)} clientes bajo 0,75x de su ciclo', aldia))
    h.append(card('⚫', 'Cartera ya perdida con ciclo conocido', f'{len(INA)} clientes inactivos', INA))
    return '\n'.join(h) + '\n', dict(urg=urg, prox=prox, aldia=aldia, ina=INA,
                                         act=ACT, rutas=rutas, juego=tot_urg)


# ---------------------------------------------------------------- principal

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('panel')
    ap.add_argument('--hoy', help='fecha de corte YYYY-MM-DD (por defecto, la última compra registrada)')
    ap.add_argument('--sin-backup', action='store_true')
    a = ap.parse_args(argv)

    html = open(a.panel, encoding='utf-8').read()
    C, _ = leer_clients(html)
    C.sort(key=lambda c: -val(c))
    hoy = datetime.date.fromisoformat(a.hoy) if a.hoy else \
        max(f for f in (fecha(c[7]) for c in C) if f)

    n_frec, n_est, n_dias = refrescar_campos(C, hoy)

    P = Panel(html)
    TOT = sum(val(c) for c in C)
    act = [c for c in C if c[8] == 'Activo']
    ina = sorted([c for c in C if c[8] != 'Activo'], key=lambda c: -val(c))
    VIVO = sum(val(c) for c in act)
    con_dir = sum(1 for c in C if c[11] not in ('-', ''))

    # --- 1. universo completo de clientes (vista Clientes consolidada)
    est = lambda c: (f'<span class="badge badge-{"green" if c[8]=="Activo" else "red"}">'
                     f'{c[8]}</span>')
    P.tbody('<h3>📋 Todos los clientes</h3>', ''.join(
        f'<tr><td class="fw-600">{esc(c[1])}</td><td>{esc(c[10])}</td>'
        f'<td>{CORTA.get(c[12], c[12])}</td><td>{est(c)}</td>'
        f'<td class="num">{c[2]}</td><td class="num">{c[3]}</td>'
        f'<td>{c[7]}</td><td class="num">{c[9]}</td></tr>' for c in C))
    P.tag('<h3>📋 Todos los clientes</h3>',
          f'{len(C)} clientes · ordena por cualquier columna, filtra escribiendo')

    # --- 2. mejores clientes: ordena por monto sin importar si siguen comprando,
    #        por eso lleva la columna Estado — que el primero esté dormido es el dato
    mx = val(C[0])
    P.tbody('<h3>🏆 Mejores clientes</h3>', ''.join(
        f'<tr><td class="num">{k}</td><td class="fw-600">{esc(c[1])}</td>'
        f'<td>{esc(c[10])}</td><td>{est(c)}</td>'
        f'<td class="num">{c[2]}</td><td class="num">{c[3]}</td>'
        f'<td class="num">{val(c)/TOT*100:.1f}%</td>'
        f'<td class="bar-cell"><div class="bar-track"><div class="bar-fill" '
        f'style="width:{val(c)/mx*100:.1f}%"></div></div></td></tr>'
        for k, c in enumerate(C[:20], 1)))
    P.tag('<h3>🏆 Mejores clientes</h3>', f'Top 20 de {len(C)} por monto comprado')

    # --- 3. frecuencia
    # La tabla de frecuencia muestra el ciclo con un decimal: 7,5 días y 8 días no son
    # lo mismo cuando se está fijando cada cuánto pasa el camión.
    frec = sorted(((f['exacto'], f['c']) for f in ciclos(C, hoy)), key=lambda t: t[0])
    P.tbody('<h3>🔁 Clientes más frecuentes</h3>', ''.join(
        f'<tr><td class="cliente-name">{esc(c[1])}</td><td class="num">{c[3]}</td>'
        f'<td>{c[6]}</td><td>{c[7]}</td><td class="num">{d:.1f} días</td></tr>'
        for d, c in frec[:20]))
    P.tag('<h3>🔁 Clientes más frecuentes</h3>', f'Top 20 de {len(frec)}')

    # --- 4. clientes foco: los inactivos por monto, de mayor a menor
    dormida = sum(val(c) for c in ina)
    mxi = val(ina[0]) if ina else 1
    P.tbody('<h3>🎯 Clientes foco — inactivos por monto</h3>', ''.join(
        f'<tr><td class="num">{k}</td><td class="fw-600">{esc(c[1])}</td>'
        f'<td>{esc(c[10])}</td><td>{CORTA.get(c[12], c[12])}</td><td>{c[7]}</td>'
        f'<td class="num">{(hoy-fecha(c[7])).days if fecha(c[7]) else "-"}</td>'
        f'<td class="num">{c[2]}</td><td class="num">{c[3]}</td>'
        f'<td class="bar-cell"><div class="bar-track"><div class="bar-fill" '
        f'style="width:{val(c)/mxi*100:.1f}%;background:var(--red)"></div></div></td></tr>'
        for k, c in enumerate(ina[:20], 1)))
    P.tag('<h3>🎯 Clientes foco — inactivos por monto</h3>',
          f'Top 20 de {len(ina)} · {mon(dormida)} dormidos')

    # --- 4b. los KPI de la vista Clientes
    P.kpi('Cartera total', len(C))
    P.kpi('Activos', len(act))
    P.kpi('Inactivos', len(ina))
    P.kpi('Venta dormida por recuperar', mon(dormida))

    # --- 5. lista lateral de fichas
    lst = ''.join(
        f'<div class="client-row" onclick="showClient({i})"><span class="dot" style="background:'
        f'{"#00A65A" if c[8]=="Activo" else "#E6143A"}"></span>'
        f'<span class="client-row-name">{esc(c[1])}</span>'
        f'<span class="client-row-total">{c[2]}</span></div>' for i, c in enumerate(C))
    P.bloque('<div class="client-list" id="clientList">', '</div>\n        </div>', lst)

    # --- 6. comunas
    com = collections.defaultdict(lambda: {'v': 0, 'va': 0, 'n': 0, 'na': 0, 'p': 0})
    for c in C:
        if c[10] in ('-', ''):
            continue
        d = com[c[10]]
        d['v'] += val(c); d['n'] += 1; d['p'] += c[3]
        if c[8] == 'Activo':
            d['va'] += val(c); d['na'] += 1
    orden = sorted(com.items(), key=lambda t: -t[1]['v'])
    mx2 = orden[0][1]['v']
    filas = ''
    for k, d in orden[:15]:
        pv = d['va'] / d['v'] * 100 if d['v'] else 0
        st = ' style="color:var(--red);font-weight:600"' if pv < 60 else ''
        filas += (f'<tr><td class="fw-600">{esc(k)}</td><td class="num">{mon(d["v"])}</td>'
                  f'<td class="num">{d["na"]} / {d["n"]}</td><td class="num">{mon(d["va"])}</td>'
                  f'<td class="num"{st}>{pv:.0f}%</td>'
                  f'<td class="num">{mon(d["v"]/d["p"]) if d["p"] else "—"}</td>'
                  f'<td class="bar-cell"><div class="cbar-track">'
                  f'<div class="cbar-tot" style="width:{d["v"]/mx2*100:.1f}%"></div>'
                  f'<div class="cbar-live" style="width:{d["va"]/mx2*100:.1f}%"></div></div></td></tr>')
    P.tbody('<h3>📍 Mejores comunas por venta</h3>', filas)
    P.tag('<h3>📍 Mejores comunas por venta</h3>', f'Top 15 de {len(com)}')

    # --- 7. zonas
    zon = collections.defaultdict(lambda: {'v': 0, 'n': 0, 'p': 0})
    for c in C:
        d = zon[c[12]]
        d['v'] += val(c); d['n'] += 1; d['p'] += c[3]
    zo = sorted(zon.items(), key=lambda t: -t[1]['v'])
    P.tbody('<h3>🗺️ Zonas de ruta sugeridas</h3>', ''.join(
        f'<tr><td class="fw-600">{esc(NOM.get(k,k))}</td><td class="num">{mon(d["v"])}</td>'
        f'<td class="num">{d["n"]}</td><td class="num">{d["p"]}</td>'
        f'<td class="num">{mon(d["v"]/d["p"]) if d["p"] else "—"}</td>'
        f'<td class="num">{d["p"]/d["n"]:.1f}</td><td>{FREQ.get(k,"-")}</td></tr>' for k, d in zo))

    # --- 8. tarjetas de ruta
    cards = ''
    for z in ZONAS:
        fr, seq = ORDEN_RUTA[z]
        cl = [c for c in C if c[12] == z]
        if not cl:
            continue
        tv = sum(val(c) for c in cl)
        tp = sum(c[3] for c in cl)
        comunas = sorted({c[10] for c in cl})
        sueltas = [x for x in sorted(comunas, key=lambda k: -com[k]['v']) if x not in seq]
        if sueltas:
            huerfanas.append((z, sueltas))
        seq = [x for x in seq if x in comunas] + sueltas
        HUERFANAS.extend((z, x) for x in sueltas)
        # la frase y los bloques salen de la misma lista: no pueden discrepar
        txt = ' → '.join(ACENTO.get(x, x) for x in seq)
        bloques = ''
        for k, cm in enumerate(seq, 1):
            sub = sorted([c for c in cl if c[10] == cm], key=lambda c: -val(c))
            v = sum(val(c) for c in sub)
            p2 = sum(c[3] for c in sub)
            mini = ''.join(f"<tr><td>{esc(c[1])}</td><td class='num'>{c[2]}</td>"
                           f"<td class='num'>{c[3]}</td></tr>" for c in sub)
            stats = (f'{mon(v)} · {len(sub)} clientes · {p2} pedidos'
                     + (f' · ticket {mon(v/p2)} · {p2/len(sub):.1f}x/cliente' if p2 else ''))
            bloques += (f'\n        <div class="comuna-block">\n          <div class="comuna-block-head">\n'
                        f'            <span class="comuna-order">{k}</span>\n'
                        f'            <span class="comuna-block-name">{esc(cm)}</span>\n'
                        f'            <span class="comuna-block-stats">{stats}</span>\n'
                        f'          </div>\n          <table class="mini-table"><tbody>{mini}</tbody></table>\n        </div>')
        cards += (f'\n    <div class="card">\n      <div class="card-header"><h3>🚚 {esc(NOM[z])}</h3>'
                  f'<span class="tag">{mon(tv)} · {len(cl)} clientes · {tp} pedidos</span></div>\n'
                  f'      <div class="card-body">\n'
                  f'        <div class="alert-box">Orden de visita sugerido: {txt}. '
                  f'Frecuencia recomendada: <b>{fr}</b>.</div>\n'
                  f'        {bloques}\n      </div>\n    </div>\n')
    i2 = P.h.index('id="view-rutas"')
    k2 = P.h.index('<h3>🚚 ', i2)
    ini = P.h.rindex('\n', 0, P.h.rindex('<div class="card">', i2, k2)) + 1
    fin = P.h.index('<div class="card"><div class="card-header"><h3>📏 Distancia', ini)
    P.h = P.h[:ini] + cards.lstrip('\n') + '\n' + P.h[fin:]
    P.cambios += 1

    # --- 9. captación
    g, sin_fecha = camadas(C)
    meses = rango_meses(g, hoy)
    mxn = max((len(g[m]) for m in meses), default=1) or 1
    def barra(m):
        n = len(g[m])
        rojo = ';background:var(--red)' if n == 0 else ''
        lbl = etiqueta_mes(m, hoy, False) + ('*' if m == hoy.strftime('%Y-%m') else '')
        return (f'<div class="mbar-item"><div class="mbar-track"><div class="mbar-fill" '
                f'style="height:{n/mxn*100:.1f}%{rojo}" title="{n} clientes nuevos"></div></div>'
                f'<div class="mbar-lbl">{lbl}</div></div>')
    P.bloque('<h3>🆕 Clientes nuevos por mes</h3><span class="tag">primera compra</span></div>\n'
             '        <div class="card-body"><div class="mchart">',
             '\n\n      <div class="card"><div class="card-header"><h3>📋 Detalle',
             ''.join(barra(m) for m in meses) + '</div></div></div>')
    filas, acum = '', 0
    for m in meses:
        cl = g[m]
        n = len(cl)
        acum += n
        lbl = etiqueta_mes(m, hoy)
        if n == 0:
            filas += (f'<tr><td class="fw-600">{lbl}</td><td class="num">0</td>'
                      f'<td class="num">{acum}</td><td class="num">—</td>'
                      f'<td class="num">0 / 0</td><td class="num">—</td></tr>')
            continue
        v = sum(val(c) for c in cl)
        vivos = sum(1 for c in cl if c[8] == 'Activo')
        r = vivos / n * 100
        st = ' style="color:var(--red);font-weight:600"' if r < 30 else ''
        filas += (f'<tr><td class="fw-600">{lbl}</td><td class="num">{n}</td>'
                  f'<td class="num">{acum}</td><td class="num">{mon(v)}</td>'
                  f'<td class="num">{vivos} / {n}</td><td class="num"{st}>{r:.0f}%</td></tr>')
    P.tbody('<h3>📋 Detalle y sobrevivencia por camada</h3>', filas)
    determinables = len(C) - sin_fecha
    P.texto(r'Cubre \d+ de los \d+ clientes; los otros \d+ no tienen',
            f'Cubre {determinables} de los {len(C)} clientes; los otros {sin_fecha} no tienen')
    mejor = max(meses, key=lambda m: len(g[m]))
    ult = meses[-2] if len(meses) >= 2 else meses[-1]
    # El mes en curso siempre va corto: no se le puede llamar "sin captación".
    vacios = [m for m in meses[:-1] if not g[m]]
    if vacios:
        peor, peor_lbl = vacios[-1], f'{mes_largo(vacios[-1])}: sin captación'
    else:
        peor = min(meses[:-1] or meses, key=lambda m: len(g[m]))
        peor_lbl = f'Mes más flojo: {mes_largo(peor)}'
    P.kpi_row('<h1 class="page-title">Captación de clientes</h1>', [
        ('teal', determinables, f'Clientes captados en {len(meses)} meses', '🆕'),
        ('green', len(g[mejor]), f'Mejor mes ({etiqueta_mes(mejor, hoy, False).lower()})', '📈'),
        ('red', len(g[peor]), peor_lbl, '⚠️'),
        ('gold', len(g[ult]), mes_largo(ult), '🔄')])

    # --- 10. alertas de recompra
    al = ciclos(C, hoy)
    vista, res = vista_alertas(C, al, hoy)
    P.bloque('<div class="view" id="view-alertas">\n', '    </div>\n\n    <!-- ===== VENTAS', vista)

    # --- 11. KPIs del dashboard
    P.kpi('Clientes activos', len(act))
    P.kpi('Clientes inactivos', len(ina))
    P.texto(r'<div class="lbl">% cartera inactiva</div><div class="val">\d+%</div>',
            f'<div class="lbl">% cartera inactiva</div>'
            f'<div class="val">{len(ina)/len(C)*100:.0f}%</div>')
    P.texto(r'<div class="lbl">Clientes georreferenciados</div><div class="val">\d+ / \d+</div>',
            f'<div class="lbl">Clientes georreferenciados</div>'
            f'<div class="val">{con_dir} / {len(C)}</div>')
    P.texto(r'A nivel global, el \d+% de la cartera está vivo\.',
            f'A nivel global, el {VIVO/TOT*100:.0f}% de la cartera está vivo.')

    # --- 12. CLIENTS reordenado (el orden del array es el de la lista de fichas)
    nuevo = 'const CLIENTS = ' + json.dumps(C, ensure_ascii=False) + ';\n'
    P.h = re.sub(r'const CLIENTS = \[.*?\];\n', lambda _: nuevo, P.h, count=1, flags=re.S)

    if not a.sin_backup:
        shutil.copy(a.panel, a.panel + '.bak')
    open(a.panel, 'w', encoding='utf-8').write(P.h)

    print(f"OK · {P.cambios+1} secciones regeneradas · corte {hoy.isoformat()}")
    if n_frec or n_est or n_dias:
        print(f"  en CLIENTS se corrigieron {n_dias} días sin comprar, "
              f"{n_est} estados y {n_frec} frecuencias que habían quedado viejas")
    print(f"  cartera   {len(C)} clientes · {mon(TOT)}")
    print(f"  activos   {len(act)} ({mon(VIVO)}, {VIVO/TOT*100:.0f}% de la cartera viva)")
    print(f"  inactivos {len(ina)} ({len(ina)/len(C)*100:.0f}%)")
    print(f"  ciclo medible en {len(al)} · por visitar {len(res['urg'])} "
          f"({mon(res['juego'])}) · próximos {len(res['prox'])} · al día {len(res['aldia'])}")
    for k, v in res['rutas']:
        print(f"    {k:<11}{v['n']:>3} por visitar {mon(v['v']):>13}  "
              f"top: {v['top']['c'][1][:34] if v['top'] else '—'}")
    print(f"  comunas {len(com)} · sin dirección {len(C)-con_dir} · "
          f"captación determinable {determinables}/{len(C)}")
    if HUERFANAS:
        print("  ojo: estas comunas tienen clientes pero no están en el trazado de su ruta,")
        print("       así que el script las puso al final por monto, no por camino:")
        for z, cm in HUERFANAS:
            print(f"         {cm} ({CORTA.get(z, z)})")
    return 0


if __name__ == '__main__':
    sys.exit(main())
