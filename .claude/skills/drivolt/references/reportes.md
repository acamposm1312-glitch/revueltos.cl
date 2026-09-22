# Reportes para terreno

Nicolás no usa Claude. Todo lo que sea para él tiene que abrirse en un teléfono cualquiera, sin
cuenta ni aplicación: **PDF** o **texto plano para pegar en WhatsApp**. Las páginas publicadas
son para Alejandro.

## Principios

**Las direcciones son enlaces de Google Maps.** En el teléfono se tocan y abre la navegación;
impresas siguen legibles. Enlace de un punto:

```
https://www.google.com/maps/search/?api=1&query=<dirección, comuna, Chile url-encoded>
```

Un recorrido con paradas (**máximo 9 waypoints por enlace** — por eso las rutas largas van
partidas en un enlace por comuna):

```
https://www.google.com/maps/dir/?api=1&origin=<A>&destination=<B>&waypoints=<C>%7C<D>&travelmode=driving
```

Origen de las rutas: `Paula Jaraquemada 02661, Temuco, Araucania, Chile`.

**Agrupa por ruta, no alfabéticamente.** Es como trabaja.

**Ordena por monto dentro de cada grupo.** Si el día se acorta, que lo que quede afuera sea lo
chico. No hay coordenadas de los clientes, así que el orden dentro de una comuna no puede
optimizarse por cercanía: dilo, y recuerda que en Maps se pueden arrastrar las paradas.

**Marca la confianza de lo que estás afirmando.** Un ciclo de compra calculado con 2 pedidos es
un intervalo, no un hábito. Ponerlo con una advertencia al lado es mejor que dejar que llegue
con una certeza falsa.

**Explica el criterio en una línea, con sus palabras.** "Si compra cada 30 días y lleva 60, va
2 veces atrasado" vale más que cualquier tabla de umbrales.

## Los PDF

Se generan con `reportlab` (`pip install reportlab` si no está). **`scripts/reporte_pdf.py` ya
trae este formato armado**: la paleta, los estilos, la franja, el pie, los enlaces de Maps, las
cajas de cifras y las tablas. Impórtalo como módulo cuando el reporte tenga una forma nueva, o
pásale una especificación JSON cuando sea sólo "esta lista de clientes agrupada así"
(córrelo sin argumentos y te imprime un ejemplo). El formato, para entender qué hace:

- A4, márgenes de 17 mm
- Franja roja `#C41230` arriba con el nombre de la empresa y el título del reporte
- Logo de DRIVOLT en la cabecera (`logo_drivolt.png`, extraíble del panel)
- Recuadro de tres cifras grandes con `leading` mayor que el `fontSize` — si no, el número
  se encima con su etiqueta
- Tablas con `repeatRows=1` para que el encabezado se repita al cortar página
- Franja de color al costado de cada fila para codificar severidad
- `KeepTogether` solo en bloques chicos: en los grandes fuerza saltos de página y deja huecos
- Colores semánticos: verde `#1F6146`, ámbar `#8F5A0A`, rojo `#B0202F`, azul `#2B5580`

Cuida el plural: `"1 pedidos"` salió impreso una vez. Usa `plural()` del módulo.

Revisa siempre el resultado rasterizando las páginas con `pymupdf` y **mirándolas**: los problemas
de maquetación no aparecen en el texto extraído. `pypdf` está roto en este entorno (le falta
`_cffi_backend` y revienta el intérprete), así que usa `pymupdf` para todo — contar páginas,
contar enlaces y rasterizar.

## Reportes que ya existen

**Clientes que toca visitar** — los activos que se pasaron de su ciclo, agrupados por ruta, con
ritmo, días, atraso en veces, fecha esperada y venta histórica. Encabezado con prioridad por
ruta. Solo activos: mezclar los perdidos diluye la urgencia.

**Cartera dormida** — los inactivos, separados en dos grupos que no se trabajan igual: los que
compraron dos o más veces (relación real, con su ciclo) y los que compraron una sola vez
(conversación de cliente nuevo). Ordenados por monto dentro de cada ruta, con barra de color por
antigüedad. Abre recordando que ocho clientes volvieron en tres salidas, uno con 231 días: la
antigüedad prioriza, no descarta.

**Hoja de ruta** — los 11 recorridos con enlaces de Maps por ruta y por comuna, tiempos, y la
lista de clientes de cada parada.
