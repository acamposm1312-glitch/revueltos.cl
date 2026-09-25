---
name: drivolt
description: Lleva el panel de control y la operación de DRIVOLT SPA, la distribuidora de vinos de Alejandro Campos en Temuco. Úsala siempre que aparezcan facturas de venta o de compra de DRIVOLT (fotos, PDF o números de folio), o cuando se hable de su panel, clientes, cartera, rutas de reparto, inventario, rentabilidad por cliente, alertas de recompra, conciliación bancaria, punto de equilibrio o del vendedor Nicolás. También cuando se pida un reporte para terreno o actualizar cualquier cifra del negocio. Actívala aunque el mensaje sea solo imágenes de facturas sin texto, o tan corto como "actualiza el panel".
---

# DRIVOLT — operación y panel de control

DRIVOLT SPA (RUT 78.290.719-0) distribuye vino al por mayor desde Temuco a botillerías,
supermercados y minimarkets de La Araucanía y Malleco. Bodega en Paula Jaraquemada 02661,
Barrio Inglés. La lleva **Alejandro Campos**; **Nicolás** es el vendedor en terreno y maneja
la distribución.

Alejandro manda las facturas por chat —fotos o PDF— y espera que el panel quede actualizado
en todas sus secciones sin que él tenga que revisar. Lo dijo textual: *"La idea es no tener
que revisar cada vez que suba facturas y confiar en la actualización."* Esa confianza es el
contrato de esta skill: si algo no cuadra, se dice; si algo se actualiza, se actualiza completo.

## Los artefactos vivos

| Documento | URL |
|---|---|
| Panel de Gestión | `https://claude.ai/code/artifact/93725b99-65af-42f2-b35c-4768535b1787` |
| Hoja de ruta (11 recorridos + enlaces Maps) | `https://claude.ai/code/artifact/e414c2f3-7ac4-4547-911a-2de3c4d34d0f` |
| Cobertura comuna por comuna | `https://claude.ai/code/artifact/1c3532fe-4473-4d57-b391-8d7181fee665` |
| Pauta de definiciones para Nicolás | `https://claude.ai/code/artifact/28ce565c-5890-462c-b429-0f46937c5442` |
| Expediente del Agente Comercial | `https://claude.ai/code/artifact/64a3d66a-c4cb-499d-8512-ce435a5fff9a` |
| **Ruta Drivolt** — la app de terreno de Nicolás | `https://claude.ai/artifact/Ep3EeUQosYPGqxynbym2RR` |

El panel es un HTML de ~290 KB con los datos embebidos. Se republica con `Artifact` pasando
la misma `url` para conservar el enlace. Antes de escribir hay que **descargar la versión viva**
y trabajar sobre ella: el archivo local puede estar viejo. Ver `references/panel.md`.

## Ruta Drivolt — lo que informa Nicolás

Desde el 25-sep-2026 Nicolás tiene su propia página, aparte del panel: **Ruta Drivolt**
(`https://claude.ai/artifact/Ep3EeUQosYPGqxynbym2RR`). No ve costos, márgenes, saldos ni punto
de equilibrio — sólo sus clientes por ruta, sus visitas y la forma de pago. Guarda en la base de
datos del artefacto, que se lee y escribe con `ArtifactData` pasando esa url.

**`facturas/{folio}`** — `{folio (número), fecha, cliente, monto, pago, cheque, obs}`.
`pago` es `""`, `efectivo`, `fiado`, `transferencia` o `cheque`; `cheque` guarda la fecha de
cobro cuando corresponde. **Al cargar facturas nuevas al panel hay que sembrar acá una fila por
cada una con `pago: ""`**, para que le aparezcan en «Por informar». Y **antes de preguntarle a
Alejandro cómo se pagó una factura, se lee esta colección**: para eso existe.

**`visitas/{fecha}__{rut}`** — `{fecha, rut, cliente, comuna, ruta, visitado, obs, ts}`.
`visitado` es `si` o `no`. Sirve para saber quién quedó sin atender en una corrida y por qué,
sin preguntarle nada.

La página lleva los 203 clientes embebidos, agrupados en las 11 rutas. **Cuando entra un cliente
nuevo o cambia una dirección hay que republicarla**, porque ese lado es estático: se regenera
con `build_ruta.py` a partir del array `CLIENTS` del panel.

**Alejandro abre una sola cosa: el panel.** Cada artefacto tiene su propia base de datos y una
página no puede leer la de otra, así que el puente lo hace esta skill. En cada actualización del
panel, después de cargar las facturas:

```
ArtifactData list facturas --out_dir terreno/     (url de Ruta Drivolt)
ArtifactData list visitas  --out_dir terreno/
python scripts/vista_terreno.py Panel_Control_DRIVOLT.html terreno/ --hoy DD-mes-AAAA
```

Eso reescribe la vista **Terreno** del panel con lo que Nicolás marcó. No es en vivo y la propia
vista lo dice: muestra el estado del último volcado. Si Alejandro pregunta «¿ya informó?», se
vuelve a correr y se republica.

## El ciclo cuando llegan facturas

Sigue estos pasos en orden. Los primeros dos son los que evitan cargar basura al panel.

**1. Extraer y verificar cada documento.** De cada factura saca: folio, fecha, RUT, cliente,
giro, dirección, comuna, forma de pago (contado/crédito), neto, IVA, impuesto adicional, total
y las cajas por producto. Las cajas se deducen de los litros, no se adivinan: Cantos del Viñedo
y Cepas de Maica vienen en cajas de 6 botellas de 1,5 L (9 L por caja), el Pipeño Cerro Colorado
en cajas de 8 botellas de 2 L (16 L por caja) y el Gin en cajas de 6 de 700 cc (4,2 L por caja).
Las líneas de "logística y embalaje" declaran la cantidad de cajas de cada familia y sirven para
cuadrar.

Después corre `scripts/verificar_facturas.py` sobre el JSON. Comprueba que
neto + IVA + impuesto adicional dé exactamente el total, y que las cajas por precio de lista
den el total dentro del redondeo que admite el SII —que crece con el número de líneas, porque
redondea a peso cada línea por separado. El margen es holgado y aun así no deja pasar un error
real: la caja más barata vale $10.800, cien veces más que cualquier redondeo. Si algo no
cuadra, **no cargues nada** y pregunta. Una factura mal leída contamina el inventario, la rentabilidad y la conciliación
al mismo tiempo, y desarmar eso después cuesta mucho más que preguntar.

**2. Guardar el JSON.** Un archivo por día de venta en el scratchpad (`ventas_DDmmm.json`).
Formato en `references/panel.md`. Sirve de respaldo y permite recalcular sin volver a leer las
imágenes.

**3. Actualizar el array maestro.** `const CLIENTS = [[...]]` dentro del HTML es la única
fuente de verdad de clientes. Toca sólo lo que es dato: suma el monto, incrementa pedidos, mueve
la última compra, escribe la primera si el cliente es nuevo (o si se está reactivando y no la
tenía), pon comuna, dirección, zona y la rentabilidad del pedido. El % del total, la frecuencia,
los días sin comprar y el estado activo/inactivo no los escribas: son cuentas, y el script del
paso 4 las rehace.

**4. Regenerar TODAS las secciones derivadas** con
`python scripts/regenerar_derivadas.py Panel_Control_DRIVOLT.html --hoy AAAA-MM-DD`. No las
edites a mano. Esta es la regla que más caro salió: durante semanas fui parchando el maestro y
dejando el ranking, la frecuencia, los inactivos y las comunas con datos viejos, hasta que
Alejandro notó que "Mejores clientes" no estaba actualizado. La auditoría encontró 11 de 20 filas
malas, un conteo de inactivos equivocado y un "Resultado operacional −$28,2M" fósil que
contradecía al −$8,2M real de otra sección. Todo lo que se puede calcular desde `CLIENTS`
se calcula desde `CLIENTS`, siempre, aunque parezca que ese pedido no lo movió.

El script es idempotente —correrlo dos veces da el mismo archivo— y al terminar imprime el
recuento: cartera, activos, inactivos, quién toca visitar por ruta y cuántos campos viejos
corrigió. Léelo. Si el número de activos o el total no es el que esperabas, el problema está
en `CLIENTS` y hay que arreglarlo ahí, no en el HTML.

**5. Parchar las cifras estáticas** que no salen del array: KPIs de cabecera, gráfico mensual,
detalle mensual, inventario, conciliación, estado de resultados, resumen del período. Usa el
patrón `rep(viejo, nuevo, n)` con verificación de conteo (`references/panel.md`) — falla ruidoso
si el texto no aparece exactamente n veces, en vez de reemplazar de más en silencio.

**6. Auditar antes de publicar.** Cuenta filas contra el array, suma columnas contra los totales,
confirma que la conciliación cierra y **busca las cifras viejas**: si el número anterior sigue
apareciendo en el HTML, algo quedó sin actualizar.

**7. Publicar y contar qué cambió.** Republica con la misma `url` y después escribe en el chat
lo que se movió y, sobre todo, **lo que llama la atención**: un quiebre de stock, un cliente
grande que no compró, un pedido con pérdida.

## Las reglas que se ganaron a golpes

**Varias facturas al mismo cliente el mismo día son una sola visita.** El flete se cobra una
vez, no una por documento. Cargarlo dos veces subestima la rentabilidad de ese cliente.

**Nunca descuentes dos veces las notas de crédito.** La cifra de ventas del reporte del SII ya
viene neta. Alejandro fue explícito: *"las notas de crédito nunca las subí acá, si las subo y
descuentas sería un error."*

**Una nota de débito suma, una de crédito resta.** No es un detalle de nomenclatura. En
septiembre llegó una nota de débito emitida por el monto completo del pedido en vez de por la
corrección, lo que habría dejado al cliente facturado dos veces ante el SII. Se detectó a tiempo,
él anuló ambos documentos y reemitió. Lee siempre el encabezado rojo del documento.

**Los saldos de inventario y banco son conteos reales a una fecha.** No los ajustes hacia atrás
por facturas ya procesadas.

**El saldo de la cuenta no se deduce, se informa.** Durante semanas se encadenó
`ventas − egresos − cobranza` para llegar al saldo, y todo lo que no pasaba por el chat —un gasto,
un cobro— quedaba escondido dentro del residuo en vez de saltar a la vista. La cobranza así
derivada terminó difiriendo en $420.828 de los registros de terreno. Desde el 12-sep-2026 el saldo
es un conteo que entrega Alejandro y la cobranza son casilleros con **sus** cifras. Ver
`references/panel.md`.

**Cuando llegue una cartola, cuádrala línea por línea antes de tocar nada.** La del 17-sep
descubrió cinco cosas de una sola vez, entre ellas un abono de $100.000 que yo había cargado a un
proveedor y que en realidad era un aguinaldo al vendedor. Un monto puede calzar por casualidad;
el girador y la fecha no.

**Reevalúa Activo/Inactivo contra la fecha de hoy**, no contra la del último cierre. El corte
son 60 días sin comprar. Un cliente puede cruzar el umbral sin que ocurra ninguna venta.

**Al reactivar un cliente que tenía un solo pedido sin fecha de primera compra, esa compra
anterior ERA su primera compra** — escríbela en el campo. Si no, el cliente pierde su mes de
captación y se cae de la cohorte. Pasó con Máximo Brito y Raúl Umaña.

**No reconstruyas hacia atrás las 41 facturas agregadas de agosto.** Está decidido:
*"partamos prolijo desde septiembre."* Desde el 1 de septiembre de 2026 el registro es completo
factura por factura.

**La regla de los 60 días es ciega para los clientes rápidos y cruel con los lentos.** Un
cliente que compra cada 8 días y lleva 30 ya está perdido, pero la regla lo da por sano; uno que
compra cada 81 días y lleva 63 aparece inactivo estando en su ritmo. Por eso el panel tiene
además la vista de **Alertas de recompra**, que compara cada cliente contra su propio ciclo.
Las dos miradas conviven a propósito: la de 60 días para la cartera, la del ciclo para decidir
a quién visitar.

## Cómo trabajar con Alejandro

Escribe en español de Chile, directo y sin adornos. Él conoce su negocio: no le expliques qué
es una botillería, sí explícale de dónde sale un número.

**Cuando encuentres un problema en los datos, dilo.** Ha agradecido cada vez que se le avisó de
un descuadre, un cliente sin dirección o un pedido con pérdida. Y cuando el error es propio, se
corrige de frente y se sigue: sin rodeos ni disculpas largas.

**No lances alarmas con información incompleta.** Una vez se levantó una alerta urgente sobre un
cliente "no atendido" usando 5 de 7 facturas, cuando él había avisado que faltaban dos. Los dos
candidatos sí habían sido atendidos. Si dijo que viene más, espera.

**Nicolás no tiene Claude.** Todo lo que sea para él va en PDF o en texto plano para WhatsApp,
con las direcciones como enlaces de Google Maps. `scripts/reporte_pdf.py` trae el formato de la
casa ya armado —franja roja, cifras grandes, tablas con enlaces— y los tres errores de
composición que costaron una versión cada uno ya vienen resueltos. Ver `references/reportes.md`.

## Dónde está el resto

- **`references/negocio.md`** — catálogo con costos y precios, las 33 comunas con distancias,
  el modelo de rentabilidad por cliente, pedido mínimo por comuna, las 11 rutas, punto de
  equilibrio y gastos fijos. Léelo cuando toques precios, márgenes, fletes o rutas.
- **`references/panel.md`** — las 15 vistas del panel, la estructura exacta del array `CLIENTS`,
  el patrón de edición verificada, el protocolo de publicación de artefactos y el formato del
  JSON de ventas. Léelo antes de editar el HTML.
- **`references/reportes.md`** — cómo se arman los PDF para Nicolás y los textos para WhatsApp.
  Léelo cuando pidan un reporte para terreno.
- **`scripts/verificar_facturas.py`** — valida un JSON de ventas contra precios de lista e
  impuestos. Corre esto antes de cargar cualquier cosa.
- **`scripts/regenerar_derivadas.py`** — recalcula desde `CLIENTS` todas las secciones derivadas
  del panel. Corre esto después de tocar el array.
- **`scripts/reporte_pdf.py`** — el formato de los PDF para Nicolás, como módulo o desde la
  línea de comandos con una especificación JSON. Corriéndolo sin argumentos imprime un ejemplo.
