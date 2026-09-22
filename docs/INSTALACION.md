# Instalacion paso a paso

No necesitas instalar librerias: el sistema funciona solo con Node.js 22 o superior.

## 1. Dejarlo andando en tu computador

```bash
node --version        # tiene que decir v22.5 o superior
cp .env.example .env  # y edita .env con tus datos
npm test              # confirma que todo funciona
node bin/appos.js diagnostico
```

Lo minimo que debes completar en `.env` para que sirva hoy:

- `APPOS_WHATSAPP` con tu numero real (formato `569XXXXXXXX`)
- `PANEL_TOKEN` con una clave larga inventada por ti

## 2. Levantar el servidor

```bash
npm start
```

Abre `http://localhost:3000` y veras el panel.

## 3. Conectar Shopify

### 3.1 Secreto de los webhooks

1. Shopify admin > **Configuracion** > **Notificaciones** > seccion **Webhooks**
2. Abajo de la lista aparece la **clave de firma de webhooks**. Copiala.
3. Pegala en `.env` como `SHOPIFY_WEBHOOK_SECRET`.

Sin esta clave el sistema **rechaza** todos los webhooks, a proposito: es lo que
impide que cualquiera invente ordenes falsas contra tu servidor.

### 3.2 Crear los webhooks

En la misma pantalla, **Crear webhook**. Crea estos cuatro, todos en formato JSON
apuntando a `https://TU-SERVIDOR/webhooks/shopify`:

| Evento | Para que sirve |
|---|---|
| `Creacion de pedido` | registra la venta apenas entra |
| `Pago de pedido` | dispara la tarea de ingresar al cliente en TUU |
| `Creacion de cliente` | guarda el contacto en el CRM |
| `Creacion de pago` (checkout) | recupera carritos abandonados |

> Tu servidor tiene que ser accesible desde internet. Para probar sin desplegar,
> usa un tunel (`cloudflared tunnel --url http://localhost:3000`) y pega esa
> direccion temporal en los webhooks.

### 3.3 Widget de asesoria en la tienda

1. **Tienda online** > **Temas** > `...` > **Editar codigo**
2. **Snippets** > **Agregar snippet** > nombre `appos-asesoria`
3. Pega el contenido de `shopify/appos-asesoria.liquid`
4. El archivo ya trae la direccion del servidor y el WhatsApp de APPOS
5. En el tema Horizon, agrega un bloque de **Liquid personalizado** desde el
   editor visual con una sola linea: `{% render 'appos-asesoria' %}`

El formulario acepta peticiones desde appos.cl y desde el dominio
`.myshopify.com` con que el editor de temas previsualiza la tienda. Cualquier
otro origen se rechaza.

## 4. Correo desde contacto@appos.cl

Mientras `EMAIL_PROVIDER=consola`, los correos **no se envian**: solo se muestran.
Es el modo seguro para revisar los textos antes de que salgan.

Para enviar de verdad, crea una cuenta en Resend o Brevo, verifica el dominio
`appos.cl` (te van a pedir agregar unos registros DNS) y completa:

```
EMAIL_PROVIDER=resend
EMAIL_API_KEY=tu_clave
```

Verificar el dominio no es opcional: sin eso tus correos se van a spam.

## 5. Instagram (opcional)

Publicar automaticamente en Instagram exige:

- cuenta **Instagram Business o Creator** (no personal)
- vinculada a una **pagina de Facebook**
- una app en **Meta for Developers** con los permisos
  `instagram_basic` e `instagram_content_publish`

Con eso completas `IG_USER_ID` e `IG_TOKEN`. Si no lo haces, el calendario igual
se genera y publicas copiando y pegando, que es perfectamente valido para partir.

## 6. Dejarlo corriendo solo

Una vez desplegado (Render, Railway, Fly o un VPS), programa estas dos tareas:

```bash
# Cada manana a las 9: arma la cola del dia
0 9 * * *  cd /ruta/al/proyecto && node bin/appos.js generar

# Cada manana a las 9:30: envia los correos de postventa que corresponden
30 9 * * * cd /ruta/al/proyecto && node bin/appos.js secuencias
```

## Respaldo

Todo vive en `data/appos.db`. Copialo periodicamente: es tu cartera de clientes.

```bash
cp data/appos.db ~/respaldos/appos-$(date +%F).db
```
