# El panel de control por dentro

Archivo único de ~290 KB, HTML + CSS + JS con los datos embebidos. Sin dependencias externas.

## Las 15 vistas

En el orden del menú lateral: `resumen`, `clientes-activos`, **`alertas`**, `ventas`, `facturas`,
`inventario`, `conciliacion`, `compras`, `clientes` (mejores), `frecuencia`, `inactivos`,
`captacion`, `resultados`, `fichas`, `rutas`.

Cada una es un `<div class="view" id="view-NOMBRE">` y le corresponde un
`<div class="nav-item" data-view="NOMBRE" onclick="showView('NOMBRE')">`. Si agregas una vista,
agrega su ítem de menú: son 15 y 15, y conviene verificarlo.

## El array maestro `CLIENTS`

Vive en el `<script>` final como `const CLIENTS = [[...]];`. **Es la única fuente de verdad
de clientes.** Ordenado por monto descendente.

| # | Campo | Ejemplo | Notas |
|---|---|---|---|
| 0 | RUT | `"76940739-1"` | sin puntos, con guion |
| 1 | Nombre | `"Supermercados Aranda Y Compañía Limitada"` | |
| 2 | Total comprado | `"$4.589.056"` | string con puntos de miles |
| 3 | N° de pedidos | `6` | entero |
| 4 | % del total | `"8.6%"` | **calculado** — no lo escribas a mano |
| 5 | Frecuencia | `"41d"` | **calculado**; `"3 pedidos"` marca que no hay primera compra |
| 6 | Primera compra | `"2025-12-09"` | o `"-"` |
| 7 | Última compra | `"2026-06-30"` | o `"-"` |
| 8 | Estado | `"Activo"` / `"Inactivo"` | **calculado**, corte 60 días |
| 9 | Días sin comprar | `50` | **calculado** contra la fecha de corte |
| 10 | Comuna | `"Freire"` | |
| 11 | Dirección | `"Lynch 202"` | `"-"` si falta |
| 12 | Zona de ruta | `"Sur (Panamericana / 5 Sur)"` | |
| 13 | Rentabilidad | `"+$67.312 (factura 504, 1 visita con detalle)"` | opcional |

La suma del campo 2 menos **$2.100** de ajuste de cuadratura contra el SII da las ventas
facturadas del panel. Ese ajuste viene de una diferencia histórica ya conciliada; no lo toques.

`frecuencia = (última − primera) / (pedidos − 1)`. Con primera o última en `"-"` no se puede
estimar, y la celda dice `"3 pedidos"` en vez de un número: es el aviso de que falta la fecha,
no un error que haya que limpiar.

Los cuatro campos marcados como calculados los rehace `scripts/regenerar_derivadas.py` en cada
corrida. Envejecen solos —basta que cambie la fecha de corte para que los días queden mal, o una
factura nueva para que la frecuencia guardada contradiga a las fechas que están dos columnas más
allá— y de hecho al escribir el script se encontraron 19 frecuencias viejas en el array. Dos
excepciones que el script respeta a propósito: las frecuencias escritas como `"3 pedidos"`, y el
estado de los clientes sin ninguna fecha de compra, que es un criterio comercial de Alejandro y
no algo deducible.

## Secciones derivadas — todas salen de `CLIENTS`

Regenéralas con `scripts/regenerar_derivadas.py` cada vez que el array cambie:

- Tabla maestra "Los N clientes"
- Mejores clientes (top 20 con barra relativa)
- Frecuencia de compra (top 20 más frecuentes)
- Clientes inactivos (todos, con días)
- Lista de fichas (el `clientList` estático que ve el usuario al abrir la vista)
- Mejores comunas (top 15, con barra de dos tonos: venta total vs venta viva)
- Zonas de ruta y las 4 tarjetas de ruta con sus bloques por comuna
- Captación por mes: fila de KPI, gráfico de barras y sobrevivencia por camada
- La vista completa de **Alertas de recompra** (las cinco tablas y la prioridad por ruta)
- Los contadores de cada encabezado (`Top 20 de N`, `Los N clientes completos`, `N de M
  clientes`), los KPI de activos/inactivos del dashboard y el % de cartera inactiva —
  precisamente los que se olvidan al parchar a mano

**Regla de captación**: el mes se asigna por fecha de primera compra; si no hay pero el cliente
tiene un solo pedido, la última compra ES la primera; si tiene dos o más pedidos y no hay fecha,
queda indeterminable. No caigas en usar la última compra para clientes con varios pedidos —
infla los clientes nuevos del mes.

## Secciones que se parchan a mano

No salen del array y hay que actualizarlas explícitamente:

- KPIs de cabecera: ventas totales, documentos, activos, inactivos
- **El total del mes en curso aparece en SEIS lugares**, y es el error que más se repite: el párrafo
  de alerta del dashboard lo dice dos veces —una en «al DD-mmm hay N documentos por $X» y otra más
  abajo al narrar las corridas—, el gráfico mensual lo trae en `title=` (×2, resumen y ventas), la
  fila del detalle mensual, el párrafo del estado de resultados y el del punto de equilibrio. Parchar
  el segundo y olvidar el primero deja el dashboard contradiciendo al resto. Antes de publicar:
  `grep -c` del monto viejo debe dar 0.
- Gráfico de barras mensual (**aparece en 3 lugares**: resumen, ventas y captación; los dos
  primeros son de venta y el tercero de clientes nuevos)
- Detalle mensual y estado de resultados
- Inventario
- Conciliación bancaria
- Compras y pagos a proveedores
- Detalle de facturas
- Resumen del período

## El patrón de edición verificada

El archivo es grande y un `replace` ciego puede tocar más de lo que crees. Usa siempre:

```python
import sys
path='Panel_Control_DRIVOLT.html'
html=open(path,encoding='utf-8').read()

def rep(old,new,n=1):
    global html
    c=html.count(old)
    if c!=n:
        print("MISMATCH (%d, esperaba %d): %r"%(c,n,old[:130])); sys.exit(1)
    html=html.replace(old,new)

# ... todos los rep() ...
open(path,'w',encoding='utf-8').write(html)   # escribe solo si ninguno falló
```

La escritura va al final a propósito: si un `rep` no encuentra su texto, el script muere antes
de tocar el disco y el archivo queda intacto.

## Auditoría antes de publicar

```python
# filas contra el array
p=html.index('<h3>👥 Los 195 clientes</h3>'); a=html.index('<tbody',p); b=html.index('</tbody>',a)
assert html[a:b].count('<tr>')==len(C)

# la conciliación cierra
assert ventas_facturadas - egresos - saldo_real == cxc + efectivo_no_depositado - 2100

# las cifras viejas desaparecieron
for v in ['$52.748.439','96 de 195','$105.921']:
    assert html.count(v)==0, v

# el marcado sigue balanceado (quitando script y style)
```

## Protocolo de publicación

Republica con `Artifact` pasando la **misma `url`** para conservar el enlace.

Si la publicación se rechaza con *"You hadn't viewed the live version"*, el mensaje deja la
fuente viva en un archivo local. Ese archivo trae inyectada una primera línea larga de runtime
(`<!doctype html>...frame-runtime...`) y un `</body></html>` de más al final: quítalos, aplica
tus cambios sobre ese contenido y republica. Nunca reconstruyas el panel de memoria.

Conviene además diferenciar la versión viva contra la local antes de escribir: si aparecen
cambios que no hiciste tú, alguien más publicó y hay que integrarlos en vez de pisarlos.

Las suscripciones de aviso (`watch`) no funcionan desde sesiones remotas: si alguien comenta un
artefacto, no llega notificación. Díselo al usuario en vez de prometer que estarás pendiente.

## Formato del JSON de ventas

```json
[{
  "n": 536,
  "fecha": "2026-09-04",
  "rut": "77324403-0",
  "cliente": "Supermercado R. J. P. Martinez Vargas E.I.R.L. (La Piscoteca)",
  "giro": "Venta al por menor en comercios de alimentos",
  "comuna": "Cunco",
  "dir": "V. Adrian",
  "pago": "Credito",
  "neto": 454159, "iva": 86290, "ila": 17504, "total": 557953,
  "cajas": {"Pipeno": 10, "Cabernet": 3, "Carmenere": 2, "Merlot": 5, "Maica": 20},
  "nota": "texto libre: cliente reactivado, quiebre de stock, lo que haya que recordar"
}]
```

Claves de `cajas`: `Cabernet`, `Carmenere`, `Merlot`, `Pipeno`, `PipenoBidon`, `Maica`, `Gin`,
`Horizonte`, `Rosso`. Para el gin, agrega `"ila_licores"` como campo aparte del `ila` de vinos.

`PipenoBidon` cuenta **unidades, no cajas**: es el envase de 5 L que entró el 16-sep-2026, y se
vende suelto. Cuesta $3.500 y se vende a $4.200, o sea 16,7% de margen — el más flaco del catálogo
después del gin, y bastante por debajo del 21,1% que sostiene el punto de equilibrio. Por litro
rinde $140 contra los $300 del pipeño en caja de 2 L: conviene mirarlo como producto de volumen,
no de margen.

Documentos anulados: deja el registro con `"estado": "ANULADA - reemplazada por factura NNN"`
y `"cajas": {}`, para que quede el rastro del correlativo sin que sume.

## Caja y cobranza (antes "conciliación bancaria")

Hasta el 11-sep-2026 el saldo de la cuenta se **deducía** encadenando
`Ventas facturadas − Egresos − Cuentas por cobrar − Efectivo sin depositar`. Se abandonó: cualquier
movimiento que no pasara por el chat quedaba escondido dentro del residuo, y la cobranza derivada
llegó a diferir en $420.828 de los registros de terreno, con $116.482 entrados a la cuenta sin
informar. Alejandro cortó el nudo entregando el saldo contado y pidiendo *"solo deja el registro
del efectivo que Nicolás debiera tener, lo fiado y cheques por cobrar con las cifras que yo te
informe"*.

**El modelo ahora tiene casilleros, ninguno calculado a partir de otro:**

| Casillero | De dónde sale |
|---|---|
| Saldo de la cuenta | conteo real a una fecha; se mueve sólo con los movimientos informados |
| Efectivo en caja | ventas al contado aún no depositadas, factura por factura |
| Comprometido por transferir | el cliente avisó que va a pagar; no está en el banco ni en la caja |
| Facturas a crédito por cobrar | emitidas a crédito y fuera de la lista de fiados |
| Fiado | la lista que entrega Alejandro, más las facturas que él marca como fiadas |
| Cheques por cobrar | los cheques fotografiados, menos los que avisa como cobrados |

Los casilleros vacíos se quedan en el resumen marcando $0, pero su tarjeta se retira: una tabla
sin filas no dice nada.

**Libro de movimientos.** Debajo del saldo va la lista de lo que entró y salió desde el conteo,
con fecha y origen. La suma de sus líneas tiene que dar el saldo del pie, y ése tiene que ser el
de la cartola. Hay dos clases de movimiento y conviene no confundirlas: **un cobro o una
transferencia sólo cambia la plata de casillero** y el total no se mueve, mientras que **un pago
—a proveedor o de gastos— sale del negocio** y achica el total.

**Estados de factura.** Cuando el efectivo de un período se depositó en bloque y no hay cómo saber
qué factura quedó pagada y cuál salió fiada, la factura va a **❓ Por confirmar**, no a un estado
inventado. Alejandro fue explícito: *"no marques que no tengas claro."*

**Ventas sin documento.** Ocurren: mercadería entregada y cobrada sin folio. Descuentan inventario
y entran al efectivo, porque las dos cosas pasaron de verdad, pero **no suman a ventas facturadas
ni al conteo de documentos** — esa serie cuadra contra el SII con el ajuste de $2.100 y una venta
sin folio la descuadraría. Van con su propia línea rotulada `s/d`.
