# Despliegue

El sistema necesita estar accesible desde internet para dos cosas: que lleguen
los webhooks de Shopify y que puedas abrir el panel desde el celular.

## Lo unico que de verdad importa

Tus clientes viven en un archivo: `data/appos.db`. Cualquier hosting que borre
el disco en cada despliegue te borra la cartera. Por eso todas las opciones de
abajo montan un **disco persistente**.

Esto descarta Vercel y Cloudflare Workers para este proyecto: su
almacenamiento es efimero y habria que reescribir la persistencia.

## Opcion recomendada: Render

El repositorio ya trae `render.yaml`, asi que Render se configura solo.

1. Entra a [dashboard.render.com](https://dashboard.render.com) y crea la cuenta.
2. **New** > **Blueprint**.
3. Conecta tu GitHub y elige el repositorio `revueltos.cl`.
4. Render lee `render.yaml` y te muestra el servicio `appos` ya armado.
5. Antes de crear, te va a pedir las variables marcadas como `sync: false`:

   | Variable | Que poner |
   |---|---|
   | `APPOS_WHATSAPP` | tu numero, formato `569XXXXXXXX` |
   | `SHOPIFY_WEBHOOK_SECRET` | la clave de firma de Shopify (ver `INSTALACION.md`) |
   | `EMAIL_API_KEY` | la clave de Resend o Brevo, o dejala vacia por ahora |
   | `PANEL_URL` | dejala vacia en el primer deploy y completala despues (abajo) |

   `PANEL_TOKEN` lo genera Render solo. Lo encuentras despues en
   **Environment** > `PANEL_TOKEN`: ese es tu acceso al panel.

6. **Apply**. En unos minutos tienes una direccion tipo
   `https://appos.onrender.com`.

Con eso:

- Panel: `https://appos.onrender.com/?token=EL_TOKEN_GENERADO`
- Webhooks de Shopify: `https://appos.onrender.com/webhooks/shopify`
- Widget de la tienda: cambia `APPOS_API` en el snippet Liquid por esa direccion

Vuelve a **Environment** y completa `PANEL_URL` con esa misma direccion
(`https://appos.onrender.com`). Con eso el correo resumen de cada manana te
llega con el enlace directo al panel, ya autenticado.

### Sobre el costo

El blueprint usa el plan **Starter**, no el gratuito, a proposito: el plan
gratuito de Render **no permite disco persistente** y ademas apaga el servicio
por inactividad, lo que significa perder los primeros intentos de webhook.

Son alrededor de USD 7 al mes mas centavos por el disco de 1 GB. Confirma los
precios vigentes en Render, cambian de vez en cuando.

Si prefieres partir gratis para probar: cambia `plan: starter` por `plan: free`
y borra el bloque `disk:`. Funciona igual, pero **pierdes la base de datos en
cada despliegue**. Sirve para ver si te gusta, no para operar.

## Alternativa: Fly.io

```bash
fly launch --no-deploy          # detecta el Dockerfile solo
fly volumes create appos_datos --size 1 --region scl   # scl = Santiago
```

En `fly.toml` agrega:

```toml
[env]
  DB_PATH = "/app/data/appos.db"

[[mounts]]
  source = "appos_datos"
  destination = "/app/data"
```

Y los secretos:

```bash
fly secrets set APPOS_WHATSAPP=569XXXXXXXX \
                SHOPIFY_WEBHOOK_SECRET=... \
                PANEL_TOKEN=inventa-una-clave-larga
fly deploy
```

La region `scl` es Santiago: menos latencia para tus clientes y para Shopify.

## Alternativa: tu propio VPS

```bash
git clone <el repositorio> && cd revueltos.cl
cp .env.example .env && nano .env
docker build -t appos .
docker run -d --name appos --restart unless-stopped \
  -p 3000:3000 \
  -v /srv/appos-datos:/app/data \
  --env-file .env \
  appos
```

Pon un Caddy o Nginx delante para el certificado HTTPS. Shopify **exige** HTTPS
para entregar webhooks.

## Probar antes de desplegar

Para verificar que Shopify y tu servidor se entienden sin desplegar nada:

```bash
npm start
cloudflared tunnel --url http://localhost:3000
```

Te entrega una direccion publica temporal. Pegala en los webhooks de Shopify,
haz una compra de prueba y revisa que aparezca la tarea:

```bash
node bin/appos.js hoy
```

## Las tareas diarias

No necesitas configurar cron. Todos los dias a las 9:00 hora de Chile el
servidor arma la cola, manda los correos de postventa y te envia a ti el
resumen de pendientes.

Se hizo dentro del mismo proceso a proposito: un cron job en Render corre en
otro contenedor, que no puede montar el mismo disco, y no veria la base de
datos.

Para cambiar la hora, `HORA_RUTINA=8`. Para apagarla, `RUTINA_AUTOMATICA=0` y
corres a mano cuando quieras:

```bash
node bin/appos.js rutina --forzar
```

El resumen de cada manana se apaga aparte con `RESUMEN_DIARIO=0`. Para verlo
sin enviarlo:

```bash
node bin/appos.js resumen --simular
```

Ojo: con `EMAIL_PROVIDER=consola` el resumen **no se envia**, solo se muestra.
Para que te llegue de verdad necesitas Resend o Brevo configurado.

## Respaldo

Aunque el disco sea persistente, respalda:

```bash
# Render / Fly: abre una consola al servicio
sqlite3 /app/data/appos.db ".backup '/app/data/respaldo.db'"
```

Y bajate el archivo cada cierto tiempo. Es tu cartera de clientes.
