# Playbook comercial APPOS

Guia de como operar el sistema. Los mensajes viven en `src/templates/` y los
puedes editar cuando quieras: son archivos de texto, no codigo.

## El correo de cada manana

A las 9:00 te llega a contacto@appos.cl un resumen de lo que hay que hacer,
ordenado por urgencia. Arriba siempre va lo mismo: **quienes ya pagaron y estan
esperando que los ingreses en TUU**. Esa plata ya entro y el cliente esta
esperando, asi que no compite con nada.

El asunto te dice el total y cuantos son urgentes, para que decidas sin abrir:
`4 pendientes para hoy (2 urgentes)`.

Si no hay nada pendiente, **no te llega nada**. Es a proposito: un correo diario
que dice "no hay novedades" se empieza a ignorar, y con el se ignoran los dias
que si importan.

## Tu rutina diaria (10 minutos)

```bash
node bin/appos.js hoy
```

Te muestra, en orden de urgencia, a quien tienes que escribirle, con el mensaje
ya redactado y el enlace de WhatsApp listo. Tocas el enlace, se abre el chat con
el texto cargado, presionas enviar. Despues:

```bash
node bin/appos.js hecha <numero de tarea>
```

Desde el celular es mas comodo el panel: `https://TU-SERVIDOR/?token=TU_TOKEN`.

## El embudo, etapa por etapa

| Etapa | Que significa | Plazo antes de que el sistema te avise |
|---|---|---|
| `nuevo` | Dejo sus datos, nadie le ha escrito | 30 minutos |
| `contactado` | Ya le escribiste, falta la recomendacion | 24 horas |
| `cotizado` | Tiene precio y equipo sugerido | 48 horas |
| `pagado` | Pago en appos.cl | 4 horas |
| `ingresado_tuu` | Lo ingresaste en la plataforma de partners | 72 horas |
| `despachado` | TUU despacho el equipo | 96 horas |
| `onboarding` | Esta activando el equipo | 7 dias |
| `activo` | Operando. Aqui empieza la postventa | sin plazo |
| `perdido` | No avanzo | sin plazo |

Los 30 minutos en `nuevo` no son un capricho: en venta de equipos el que
responde primero se queda con la venta, y tu competencia es la pagina de TUU
abierta en otra pestana. La tarea ademas se crea apenas entra el lead, venga del
formulario de la tienda o de Shopify, asi que no hay que esperar nada para verla
en la cola.

## Lo que pasa solo

**Cuando alguien compra en appos.cl** el sistema crea el lead, lo pasa a
`pagado` y te arma la tarea de ingresarlo en TUU **con todos los datos de la
orden juntos** (nombre, direccion completa, productos, total) para que copies y
pegues en la plataforma de partners sin abrir Shopify.

**Cuando alguien abandona el carrito**, a las 2 horas aparece en tu cola con un
mensaje que no suena a robot de cobranza.

**Despues de la compra** salen solos los correos desde contacto@appos.cl:

| Cuando | Correo |
|---|---|
| dia 0 | Confirmacion y explicacion de como sigue el proceso |
| dia 1 | Los 4 pasos para dejar el equipo operativo |
| dia 7 | Check-in: las dudas tipicas de la primera semana |
| dia 30 | Recompra de papel termico |
| dia 330 | Renovacion de firma electronica antes de que venza |

Y a ti te llega el resumen de pendientes cada manana.

Los dos ultimos son los que te generan ingreso recurrente sin vender nada nuevo.
El papel se acaba y la firma vence: son ventas que ya estan, solo hay que
acordarse. El sistema se acuerda por ti.

## El argumento que nadie mas le da

Las comisiones de TUU tienen dos esquemas, y cual conviene **depende del ticket
promedio del cliente, no de cuanto venda**:

| Rango de ventas | Fija | Mixta | Ticket de equilibrio |
|---|---|---|---|
| Hasta $5.000.000 | 1,99% | 0,99% + $65 | $6.500 |
| $5.000.000 a $10.000.000 | 1,69% | 0,89% + $65 | $8.125 |
| Sobre $10.000.000 | 1,49% | 0,79% + $65 | $9.286 |
| Primer mes | 1,49% | 0,79% + $65 | $9.286 |

Bajo el ticket de equilibrio conviene la fija; sobre el, la mixta. Todas + IVA.

Un almacen con ticket de $3.500 que elige mal pierde unos $300.000 al ano. Un
restaurante con ticket de $15.000 que elige mal pierde unos $350.000.

Pregunta siempre **"cuanto te compra en promedio una persona"** y calcula:

```bash
node bin/appos.js comision --ticket 15000 --ventas 8000000
```

O desde el celular, con el cliente al telefono: el boton **Calcular comision del
cliente** en el panel. Te entrega el veredicto y el texto listo para mandarle.

Comprando directo en TUU nadie le explica esto. Es la razon mas concreta para
comprarte a ti.

## Respuestas listas

Las diez preguntas que mas se repiten estan escritas en
`src/templates/respuestas/`. Se ven con:

```bash
node bin/appos.js respuestas            # lista
node bin/appos.js respuestas comision   # una en particular
```

Cargalas como **respuestas rapidas** en WhatsApp Business y como **respuestas
guardadas** o **preguntas frecuentes** en Instagram. Es el mismo texto para los
dos canales.

## Tu ventaja frente a comprar directo en TUU

El precio es el mismo. Lo unico que te diferencia es que quedas tu como persona
a quien preguntarle. Eso se nota en cosas concretas:

- Recomendar la maquina **mas barata** cuando la cara no aporta. Te hace perder
  margen en una venta y te gana las tres siguientes por recomendacion.
- Avisar de la firma electronica **antes** de que compre. Es el error mas comun
  y el que mas frustra el primer dia.
- Responder la duda de la semana 2, que es cuando el soporte generico ya se
  desentendio.

## Publicaciones

```bash
node bin/appos.js contenido --cantidad 12   # genera un mes de calendario
node bin/appos.js calendario                # ver los copys listos
node bin/appos.js exportar > calendario.csv # abrirlo en planilla
```

El calendario rota tres tipos de contenido a proposito:

1. **Producto** (un equipo con su angulo de venta)
2. **Educativo** (boleta electronica, firma, SII, papel)
3. **Rubro** (que le sirve a un almacen, a un restaurante)

Una cuenta que solo publica catalogo no la sigue nadie. El contenido educativo
es el que hace que te escriban preguntando, y esa pregunta es el lead.

Se publican lunes, miercoles y viernes. Es sostenible; publicar todos los dias
una semana y despues desaparecer un mes es peor que no publicar.

## Que hacer cuando alguien pregunta por Instagram

El DM no esta automatizado (Instagram no lo permite sin app aprobada), pero el
flujo es el mismo: pide el rubro, y cargalo con

```bash
node bin/appos.js nuevo --nombre "Ana Soto" --telefono 987654321 --rubro almacen --origen instagram
```

Desde ahi el sistema lo toma y te va recordando el seguimiento.
