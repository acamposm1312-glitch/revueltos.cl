# DRIVOLT — datos del negocio

## Catálogo, costos y precios

Valores **brutos, con impuestos incluidos**, tal como los definió Alejandro en agosto de 2026.
El vino paga IVA 19% + ILA 20,5%; los destilados, IVA 19% + ILA 31,5%.

| Producto | Formato | Bot/caja | L/caja | Costo bot. | Venta bot. | Margen | Margen % | Caja |
|---|---|---|---|---|---|---|---|---|
| CV Cabernet Sauvignon | 1,5 L | 6 | 9 | $1.800 | $2.300 | $500 | 21,7% | $13.800 |
| CV Carmenere | 1,5 L | 6 | 9 | $1.800 | $2.300 | $500 | 21,7% | $13.800 |
| CV Merlot | 1,5 L | 6 | 9 | $1.800 | $2.300 | $500 | 21,7% | $13.800 |
| Vino Cepas de Maica Tinto | 1,5 L | 6 | 9 | $1.300 | $1.800 | $500 | **27,8%** | $10.800 |
| Vino Pipeño Cerro Colorado | 2 L | 8 | 16 | $1.950 | $2.550 | $600 | 23,5% | $20.400 |
| Vino Horizonte | 4,5 L | 6 | — | $1.780 | $2.350 | $570 | 24,3% | $14.100 |
| Gin Carpintero Negro | 700 cc | 6 | 4,2 | $9.500 | $10.800 | $1.300 | **12,0%** | $64.800 |
| Aperitivo Rosso | 4,5 L | 6 | — | $6.500 | $8.500 | $2.000 | 23,5% | $51.000 |

"CV" y "Cantos del Viñedo" son lo mismo: la marca de las tres cepas. En las facturas de venta
la línea "CANTOS DEL VIÑEDO LOGISTICA EMBALAJE Y SERVICIO" declara el total de cajas de esa
familia; lo mismo "Cerro Colorado Logística" para el pipeño, "Cepas de Maica Logística" y
"GIN CN LOGISTICA".

**El modelo de costos está validado contra factura de compra real.** La factura 402 de
Comercializadora Almendra (6-sep-2026) por 370 cajas dio exactamente $3.996.000, el mismo
resultado que multiplicar cajas por estos costos. No es un supuesto.

**El margen del mes varía por mezcla de producto, no por descuentos.** Todas las facturas
revisadas salen a precio de lista exacto: hoy no existe el descuento por volumen. Un mes con
gin baja el margen; uno con Cepas de Maica lo sube.

## Proveedores

- **Comercializadora Almendra SPA** (RUT 77.800.876-9, Linares) — los vinos. Vende a crédito.
- **Ginebra SPA** — el gin.

## Comunas: distancia desde Temuco y costo de flete

Kilómetros de ida. El costo de combustible se calcula sobre **ida y vuelta a $90/km**, que sale
de diésel a $900/L dividido por un rendimiento de 10 km/L. **Es un valor provisional**: Alejandro
tiene que entregar el gasto real de combustible para reemplazarlo, y cuando lo haga hay que
recalcular todas las rentabilidades y los pedidos mínimos.

| Comuna | km | Comuna | km | Comuna | km |
|---|---|---|---|---|---|
| Padre Las Casas | 6 | Carahue | 62 | Melipeuco | 90 |
| Freire | 25 | Loncoche | 62 | Tolten | 90 |
| Vilcún | 30 | Ercilla | 65 | Lumaco | 90 |
| Lautaro | 30 | Teodoro Schmidt | 75 | Collipulli | 90 |
| Chol Chol | 30 | Victoria | 76 | Los Sauces | 100 |
| Nueva Imperial | 32 | Saavedra | 82 | Lanco | 100 |
| Pitrufquén | 34 | Curacautín | 85 | Pucón | 110 |
| Galvarino | 45 | Villarrica | 87 | Angol | 110 |
| Gorbea | 47 | Purén | 115 | Panguipulli | 128 |
| Perquenco | 47 | Curarrehue | 145 | Los Ángeles | 165 |
| Cunco | 48 | Traiguén | 60 | | |

Fuera de ruta: Santiago (670 km) y Viña del Mar (780 km) — se atienden por despacho, no por
camioneta, y por eso no cargan flete en el cálculo de rentabilidad.

## Rentabilidad por cliente

```
Rentabilidad del pedido = Margen bruto − Costo de reparto

Margen bruto   = Σ (cajas × botellas/caja × margen unitario)
Costo reparto  = (km ida y vuelta × $90) ÷ N° de clientes de esa comuna
```

El flete se reparte entre **todos** los clientes de la comuna, no entre los visitados ese día:
la densidad es lo que hace rentable una zona. Por eso Curarrehue rinde 17,9% a 145 km con
7 clientes, mientras que un pedido chico en una comuna con 2 clientes puede dar pérdida.

**Casos reales con pérdida:** Marsil en Pucón, una caja de pipeño ($20.400) → −$150.
CFM en Panguipulli, una caja de pipeño → −$2.880.

**Ojo con el bidón de 5 L** (desde el 16-sep-2026): margina $700 sobre $4.200, o sea 16,7%. Un
pedido chico de puros bidones da pérdida en cualquier comuna lejana — en Curarrehue el flete por
cliente es $1.864, así que se necesitan 3 bidones sólo para empatar.

## Pedido mínimo por comuna

Lo que necesita facturar un cliente para que su visita se pague sola, asumiendo margen de vino
(22,5%). **Con gin el piso se dispara**, porque margina 12%: en Purén pasa de $46.000 a $86.250.

| Comuna | Piso | Comuna | Piso |
|---|---|---|---|
| Padre Las Casas | $600 | Curarrehue | $16.571 |
| Pitrufquén | $3.022 | Pucón · Angol | $22.000 |
| Cunco · Nueva Imperial | $4.267 | Lumaco · Melipeuco · Traiguén | $24.000 |
| Teodoro Schmidt · Victoria | $6.700 | **Purén** | **$46.000** |
| Villarrica | $9.943 | Panguipulli | $51.200 |
| Toltén · Collipulli | $12.000 | Los Ángeles | $132.000 |

Recalcula estos pisos cuando cambie el número de clientes de una comuna: el denominador se mueve.

## Las 11 rutas

Cada una cabe en una jornada y se corre dos veces al mes: 22 días de trabajo, 127 horas y
3.966 km al mes. Supuestos: 10 minutos por cliente y 60 km/h promedio.

| Ruta | Recorrido | km |
|---|---|---|
| R1 Sur cercano | P. Las Casas → Freire → Pitrufquén → Gorbea | 96 |
| R2 Sur lejano | Loncoche → Lanco → Panguipulli | 235 |
| R3 Costa sur | Teodoro Schmidt → Toltén | 187 |
| R4 Costa poniente | Carahue → Saavedra | 169 |
| R5 Chol Chol | Chol Chol → Galvarino → Nueva Imperial | 122 |
| R6 Malleco poniente | Traiguén → Lumaco → Purén → Los Sauces → Angol | 278 |
| R7 Lagos | Villarrica → Pucón → Curarrehue | 292 |
| R8 Cordillera | Vilcún → Cunco → Melipeuco | 194 |
| R9 Norte Ruta 5 | Perquenco → Victoria → Ercilla → Collipulli | 205 |
| R10 | Lautaro → Curacautín | 170 |
| R11 | Temuco urbano | 35 |

R1 y R5 concentran el 40% de la venta histórica en los recorridos más cortos: son las que hay
que proteger. R2 y R6 son las de peor rendimiento por kilómetro.

**Zonas en el panel** (campo 12 del array): `Sur (Panamericana / 5 Sur)`, `Costa/Poniente`,
`Cordillera / Lagos`, `Norte`, `Temuco / Otros`.

**Perquenco está mal asignada**: figura en Costa/Poniente pero geográficamente está en la Ruta 5
entre Lautaro y Victoria. Como desvío no da; en el camino, sí. Queda pendiente que Alejandro
confirme el cambio.

## Estado de resultados

- **Gastos fijos: $2.100.000/mes** — sueldo vendedor $1.200.000, arriendo bodega $500.000,
  combustible $300.000, otros $100.000.
- **Punto de equilibrio: $9.955.946/mes**, calculado con margen bruto de 21,1%.
- **Agosto 2026 fue el primer mes en superarlo**: $10.209.838, es decir $253.892 por encima,
  con resultado operacional de +$134.608. Los ocho meses anteriores quedaron todos abajo.
- Diciembre 2025 a junio 2026 tienen **costo estimado** aplicando el margen de julio+agosto sobre
  el ingreso real. Julio y desde agosto en adelante usan costo real.

Un mes en curso se muestra con ingreso, costo y margen reales, pero con los gastos fijos y el
resultado en "—": devengarlos completos contra unos pocos días de venta produce una pérdida
ficticia que se lee mal.

## Aprendizajes de cobertura

**La distancia no mata una comuna, la densidad sí.** Curarrehue a 145 km tiene 5 de 7 clientes
activos; Vilcún a 30 km llegó a tener cero.

**Las rutas se acortan sin que nadie lo registre.** La Ruta Cordillera dejó de recorrer sus tres
puntas —Vilcún, Melipeuco y Panguipulli— mientras el tramo del medio seguía fresco. Se detecta
comparando los días sin venta de las comunas de una misma ruta.

**Un cliente dormido vuelve si pasa el camión, sin importar cuánto lleve.** En tres salidas
volvieron ocho clientes inactivos, incluido uno con 231 días. La antigüedad no sirve para
descartar: sirve para priorizar.

**Cuando el camión pasa y el cliente grande no compra, el problema no es la ruta.** Ese patrón
—especialmente en clientes de alta frecuencia que se cortan de golpe— suele significar que
entró otro proveedor. Se arregla con una llamada, no con otra visita.
