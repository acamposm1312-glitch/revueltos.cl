# APPOS · automatizacion de ventas, contacto y publicaciones

Sistema operativo del negocio de **APPOS** ([www.appos.cl](https://www.appos.cl)),
distribuidor oficial de [TUU](https://www.tuu.cl) en Chile.

Automatiza las tres cosas que hoy se hacen a mano: captar y seguir clientes,
acompanarlos despues de la venta, y publicar de forma constante.

## Que resuelve

El flujo real del negocio es: el cliente compra a traves de APPOS → APPOS lo
ingresa en la plataforma de partners de TUU y compra a su nombre → TUU despacha
y hace el onboarding → el cliente sigue preguntandole a quien le vendio.

El sistema acompana ese flujo completo:

| Antes | Ahora |
|---|---|
| El lead llega por WhatsApp o Instagram y se pierde en la conversacion | Queda en el CRM con su etapa y su plazo |
| Hay que acordarse de hacer seguimiento | Aparece en la cola del dia con el mensaje escrito |
| Una compra en Shopify obliga a abrir el admin para sacar los datos | Llega la tarea con nombre, direccion y productos listos para la plataforma TUU |
| La postventa depende de la memoria | Correos automaticos en los dias 1, 7, 30 y 330 |
| Hay que acordarse de revisar si hay algo pendiente | Llega un correo cada manana con lo del dia, ordenado por urgencia |
| Publicar en Instagram cuesta empezar de cero cada vez | Calendario con los copys ya redactados |

## Como se usa

```bash
node bin/appos.js hoy          # que tengo que hacer hoy, con los mensajes listos
node bin/appos.js pipeline     # como viene el embudo
node bin/appos.js contenido    # genera el calendario de publicaciones
node bin/appos.js comision --ticket 15000 --ventas 8000000   # que comision le conviene
node bin/appos.js respuestas   # respuestas listas para WhatsApp e Instagram
node bin/appos.js diagnostico  # revisa que este todo configurado
```

Y el panel web, pensado para el celular:

```bash
npm start   # luego abre http://localhost:3000
```

Cada tarjeta trae un boton **Abrir WhatsApp** que abre el chat del cliente con
el mensaje ya cargado. Solo hay que presionar enviar.

## Sobre WhatsApp

Hoy APPOS usa la **app WhatsApp Business**, que no permite enviar mensajes por
API. Por eso el sistema no finge automatizar el envio: prepara el mensaje
correcto para la persona correcta en el momento correcto, y genera el enlace
`wa.me` para mandarlo de una.

Si algun dia se activa **WhatsApp Cloud API** de Meta, basta cambiar
`WHATSAPP_MODE=cloud` en el `.env` y los mismos mensajes empiezan a salir solos.
No hay que reescribir nada.

## Instalacion

No tiene dependencias. Solo necesita **Node.js 22 o superior**.

```bash
cp .env.example .env    # completa tus datos
npm test
npm start
```

El paso a paso completo, incluida la conexion con Shopify, esta en
[`docs/INSTALACION.md`](docs/INSTALACION.md). Para dejarlo corriendo en internet,
[`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md): el repositorio trae `render.yaml`, asi
que Render lo configura solo.

Una vez desplegado no hay que programar nada mas: el servidor arma la cola del
dia, envia los correos de postventa y te manda el resumen de pendientes todos
los dias a las 9:00 hora de Chile.

## Documentacion

- [`docs/INSTALACION.md`](docs/INSTALACION.md) — conectar Shopify, correo e Instagram
- [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md) — dejarlo corriendo en internet
- [`docs/PLAYBOOK.md`](docs/PLAYBOOK.md) — como operarlo dia a dia y por que cada plazo
- [`shopify/appos-asesoria.liquid`](shopify/appos-asesoria.liquid) — version en Liquid del widget, para pegarla dentro del tema

El widget de captura se instala con una sola linea en el editor del tema:
`<script src="https://TU-SERVIDOR/widget.js" defer></script>`

## Estructura

```
bin/appos.js              CLI: es la forma principal de usarlo
src/server.js             Servidor: panel, webhooks de Shopify y captura de leads
src/core/
  catalogo.js             Los 20 productos TUU con precios y angulos de venta
  pipeline.js             Las etapas del embudo y sus plazos
  leads.js                CRM: alta, deduplicacion y avance de etapas
  tareas.js               Cola de trabajo diaria
  secuencias.js           Correos de postventa
  resumen.js              Correo resumen diario de pendientes
  programador.js          Rutina diaria dentro del servidor
  contenido.js            Calendario editorial y generacion de copys
  comisiones.js           Comparador de esquemas de comision TUU
  shopify.js              Webhooks firmados: ordenes, clientes y carritos
  whatsapp.js             Enlaces wa.me y soporte para Cloud API
  instagram.js            Publicacion via Graph API (opcional)
src/templates/            Los mensajes, en texto plano y editables
test/                     Pruebas del flujo completo
```

## Pruebas

```bash
npm test
```
