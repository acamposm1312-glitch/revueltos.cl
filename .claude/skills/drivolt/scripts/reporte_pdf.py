#!/usr/bin/env python3
"""Chrome validado para los PDF que Nicolás recibe por WhatsApp.

Los reportes de DRIVOLT ya tienen una forma: franja roja arriba, logo y fecha, una fila
de cifras grandes, y después secciones de tablas donde cada cliente es una fila con su
dirección puesta como enlace a Google Maps. Nicolás la abre en el teléfono, en la calle,
con una mano. Todo lo de este archivo existe para no volver a resolver eso desde cero
—y para no repetir los tres errores que costaron una versión cada uno:

  · el número grande se montaba sobre su etiqueta porque el `leading` era menor que el
    `fontSize`. Por eso BIG lleva leading 21 sobre fontSize 17;
  · envolver bloques grandes en KeepTogether abría media página en blanco. Las tablas
    largas van con repeatRows=1 y sólo el encabezado viaja pegado a la tabla;
  · "1 pedidos". Usa `plural()`.

Se puede usar de dos formas. Como módulo, importando los estilos y `documento()` y
armando los flowables a mano, que es lo habitual cuando el reporte tiene una forma nueva.
O desde la línea de comandos con una especificación JSON, para los reportes que ya son
sólo "esta lista de clientes, agrupada así":

    python reporte_pdf.py spec.json

Estructura del JSON (ver `EJEMPLO` al final del archivo):
    {"salida": "...pdf", "titulo": "...", "subtitulo": "...", "cintillo": "...",
     "pie": "...", "cifras": [["$9.3M","venta en juego"], ...],
     "secciones": [{"titulo": "...", "nota": "...", "columnas": [...],
                    "anchos": [...], "filas": [[...], ...]}]}
Una celda puede ser un texto, o `{"texto": "...", "link": "https://..."}` para que quede
enlazada, o `{"texto": "...", "nota": "..."}` para agregar una segunda línea en gris.
"""
import json, sys, urllib.parse
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (BaseDocTemplate, Frame, Image, PageTemplate,
                                Paragraph, Spacer, Table, TableStyle)

# --- paleta de la casa
INK = colors.HexColor('#191A1C')
MUT = colors.HexColor('#6E7175')
RULE = colors.HexColor('#DCDCD6')
SUNK = colors.HexColor('#EFEFEB')
ACC = colors.HexColor('#C41230')
VERDE = colors.HexColor('#1F6146')
AMB = colors.HexColor('#8F5A0A')
GRIS = colors.HexColor('#8A7E82')

W, H = A4
M = 17 * mm


def S(n, **k):
    d = dict(name=n, fontName='Helvetica', fontSize=9, leading=12, textColor=INK,
             alignment=TA_LEFT)
    d.update(k)
    return ParagraphStyle(**d)


H1 = S('H1', fontName='Helvetica-Bold', fontSize=21, leading=24)
H2 = S('H2', fontName='Helvetica-Bold', fontSize=12.5, leading=15)
H3 = S('H3', fontName='Helvetica-Bold', fontSize=10.5, leading=13)
SUB = S('SUB', fontSize=10, leading=13, textColor=MUT)
BODY = S('BODY', fontSize=9.5, leading=13)
SMALL = S('SMALL', fontSize=8, leading=10, textColor=MUT)
CD = S('CD', fontSize=8.2, leading=10.5, textColor=MUT)
NUM = S('NUM', fontSize=9, leading=11.5)
TH = S('TH', fontName='Helvetica-Bold', fontSize=7.3, leading=9, textColor=MUT)
# leading > fontSize, o el número se come su etiqueta
BIG = S('big', fontName='Helvetica-Bold', fontSize=17, leading=21)

# Comunas que en el registro del SII vienen sin tilde. Google Maps las encuentra igual,
# pero el reporte lo lee una persona.
ACENTOS = {'Vilcun': 'Vilcún', 'Pucon': 'Pucón', 'Curacautin': 'Curacautín',
           'Traiguen': 'Traiguén', 'Puren': 'Purén', 'Tolten': 'Toltén',
           'Pitrufquen': 'Pitrufquén', 'Cholchol': 'Chol Chol',
           'Padre Las Casas': 'Padre Las Casas', 'Melipeuco': 'Melipeuco'}


def comuna(k):
    return ACENTOS.get(k, k)


def mon(v):
    return '$' + f"{int(round(v)):,}".replace(',', '.')


def plural(n, sing, plur=None):
    """"1 pedido", "2 pedidos". Salió a la luz en la primera versión impresa."""
    return f"{n} {sing if n == 1 else (plur or sing + 's')}"


def maps(direccion, com):
    """Enlace de búsqueda de Google Maps, o None si no hay dirección que buscar."""
    if direccion in ('-', '', None) or com in ('-', '', None):
        return None
    q = urllib.parse.quote(f"{direccion}, {comuna(com)}, Chile", safe='')
    return "https://www.google.com/maps/search/?api=1&query=" + q


def enlace(texto, url, estilo=CD):
    if not url:
        return Paragraph(texto, estilo)
    return Paragraph(f'<link href="{url}" color="#1F6146"><u>{texto}</u></link>', estilo)


def documento(salida, titulo_pdf, cintillo, pie, subject=''):
    """Arma el BaseDocTemplate con la franja roja y el pie de página de la casa."""
    def deco(canv, doc):
        canv.saveState()
        canv.setFillColor(ACC)
        canv.rect(0, H - 9 * mm, W, 9 * mm, stroke=0, fill=1)
        canv.setFont('Helvetica-Bold', 7.5)
        canv.setFillColor(colors.white)
        canv.drawString(M, H - 6.2 * mm, 'DRIVOLT SPA  ·  DISTRIBUCIÓN')
        canv.drawRightString(W - M, H - 6.2 * mm, cintillo.upper())
        canv.setStrokeColor(RULE)
        canv.setLineWidth(.5)
        canv.line(M, 12 * mm, W - M, 12 * mm)
        canv.setFont('Helvetica', 7.3)
        canv.setFillColor(MUT)
        canv.drawString(M, 8.6 * mm, pie)
        canv.drawRightString(W - M, 8.6 * mm, 'Página %d' % doc.page)
        canv.restoreState()

    doc = BaseDocTemplate(salida, pagesize=A4, leftMargin=M, rightMargin=M,
                          topMargin=15 * mm, bottomMargin=16 * mm,
                          title=titulo_pdf, author='DRIVOLT SPA', subject=subject)
    doc.addPageTemplates([PageTemplate(id='p', frames=[
        Frame(M, 16 * mm, W - 2 * M, H - 31 * mm, id='f', leftPadding=0, rightPadding=0,
              topPadding=0, bottomPadding=0)], onPage=deco)])
    return doc


def cabecera(titulo, subtitulo, logo=None, fecha=''):
    e = []
    if logo:
        e.append(Table([[Image(logo, width=26 * mm, height=26 * mm * 0.30),
                         Paragraph(fecha, S('x', fontSize=8.5, leading=11, textColor=MUT))]],
                       colWidths=[30 * mm, W - 2 * M - 30 * mm],
                       style=TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                                         ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
                                         ('LEFTPADDING', (0, 0), (-1, -1), 0),
                                         ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                                         ('BOTTOMPADDING', (0, 0), (-1, -1), 6)])))
    e.append(Paragraph(titulo, H1))
    if subtitulo:
        e.append(Spacer(1, 3))
        e.append(Paragraph(subtitulo, SUB))
    e.append(Spacer(1, 9))
    return e


def cifras(pares):
    """Fila de cajas con un número grande y su etiqueta debajo."""
    if not pares:
        return []
    celdas = [[Paragraph(str(n), BIG)] for n, _ in pares]
    for i, (_, lbl) in enumerate(pares):
        celdas[i].append(Paragraph(lbl, SMALL))
    ancho = (W - 2 * M) / len(pares)
    fila = [[Table([[c] for c in col], style=TableStyle([
        ('LEFTPADDING', (0, 0), (-1, -1), 7), ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, 0), 7), ('BOTTOMPADDING', (0, -1), (-1, -1), 7),
        ('TOPPADDING', (0, 1), (-1, -1), 1)])) for col in celdas]]
    t = Table(fila, colWidths=[ancho] * len(pares), style=TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SUNK), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('LINEAFTER', (0, 0), (-2, -1), 3, colors.white)]))
    return [t, Spacer(1, 11)]


def _celda(v):
    if isinstance(v, dict):
        p = enlace(v['texto'], v.get('link'), BODY if not v.get('link') else CD)
        if v.get('nota'):
            return [p, Paragraph(v['nota'], CD)]
        return p
    return Paragraph(str(v), BODY)


def seccion(titulo, columnas, filas, anchos=None, nota=''):
    """Una tabla con encabezado repetido en cada página.

    El encabezado va pegado a la tabla con KeepTogether, pero la tabla NO: envolverla
    entera fuerza un salto de página y deja media hoja vacía.
    """
    cab = [Paragraph(titulo, H2)]
    if nota:
        cab += [Spacer(1, 2), Paragraph(nota, SMALL)]
    cab.append(Spacer(1, 5))
    datos = [[Paragraph(c, TH) for c in columnas]]
    for f in filas:
        datos.append([_celda(v) for v in f])
    anchos = anchos or [(W - 2 * M) / len(columnas)] * len(columnas)
    total = sum(anchos)
    anchos = [a / total * (W - 2 * M) for a in anchos]
    tb = Table(datos, colWidths=anchos, repeatRows=1, style=TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEBELOW', (0, 0), (-1, 0), .7, INK),
        ('LINEBELOW', (0, 1), (-1, -2), .25, RULE),
        ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 5)]))
    return cab + [tb, Spacer(1, 12)]


def construir(spec):
    doc = documento(spec['salida'], spec.get('titulo_pdf', spec['titulo']),
                    spec.get('cintillo', 'DRIVOLT'), spec.get('pie', ''),
                    spec.get('subject', ''))
    e = cabecera(spec['titulo'], spec.get('subtitulo', ''),
                 spec.get('logo'), spec.get('fecha', ''))
    e += cifras(spec.get('cifras', []))
    for s in spec.get('secciones', []):
        e += seccion(s['titulo'], s['columnas'], s['filas'],
                     s.get('anchos'), s.get('nota', ''))
    doc.build(e)
    return spec['salida']


EJEMPLO = {
    "salida": "ejemplo.pdf",
    "titulo": "Clientes por visitar",
    "subtitulo": "Los que ya pasaron su fecha de recompra.",
    "cintillo": "Alertas de recompra · 8 de septiembre de 2026",
    "pie": "Generado desde el panel de control DRIVOLT",
    "cifras": [["8", "clientes por visitar"], ["$9.3M", "venta histórica en juego"]],
    "secciones": [{
        "titulo": "Ruta Costa",
        "nota": "Toca esta ruta primero: es la que más venta tiene esperando.",
        "columnas": ["Cliente", "Dirección", "Lleva"],
        "anchos": [70, 80, 25],
        "filas": [[{"texto": "Supermercado La Maravilla", "nota": "Chol Chol · 7 pedidos"},
                   {"texto": "Lazcano 285", "link": "https://maps.google.com/?q=..."},
                   "47 d"]]}]}


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        print("\nEspecificación de ejemplo:\n")
        print(json.dumps(EJEMPLO, ensure_ascii=False, indent=2))
        return 2
    spec = json.load(open(argv[1], encoding='utf-8'))
    print("PDF escrito:", construir(spec))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
