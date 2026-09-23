# Material de marca de TUU

Acá van los archivos oficiales que TUU entrega a sus distribuidores: el lockup
"TUU Chile · Distribuidor Autorizado" y las renders de los equipos.

**El contenido de esta carpeta no se versiona.** Está en `.gitignore` a
propósito. Este repositorio es público, y ese material está licenciado a APPOS
como distribuidor autorizado, no liberado para que cualquiera lo descargue.
Subirlo acá sería redistribuirlo.

## Cómo reponerlo

Los archivos viven en la carpeta `TUU` del Drive de la cuenta. Se copian a esta
carpeta con estos nombres, que son los que buscan las herramientas:

| Archivo | Qué es |
| --- | --- |
| `logo-recortada.png` | Lockup de distribuidor autorizado, fondo transparente |
| `logo.png` | El mismo lockup, sobre el azul de TUU |
| `pro-2-left-side.png` | Pro 2 de tres cuartos, pantalla en uso, vertical |
| `pro2-sola.png` | Pro 2 de frente, vertical |
| `pro2-top.png` | Pro 2 desde arriba |
| `pro2-acostada.png` | Pro 2 horizontal |
| `mini-s-lado.png` | Mini S de perfil |

El lockup se obtiene del original sobre azul con:

```
node bin/recortar.js --foto assets/tuu/logo.png --fondo '#1731ef' \
  --tolerancia 30 --margen 6 --salida assets/tuu
```

## Si falta la carpeta

Las herramientas siguen funcionando: `bin/imagenes.js` arma las piezas sin foto
de producto y sin lockup, como antes. Pierden calidad, no se rompen.

## Azul oficial

`#1731ef`, muestreado del lockup. Es el color de marca de TUU, no una
aproximación.

En Shopify vive en los dos esquemas de color creados para esto,
`scheme-tuu-vibrant-blue` y `scheme-product-price-blue`:

| Ajuste | Valor |
| --- | --- |
| Fondo azul | `#1731ef` |
| Azul sobre blanco | `#1731ef`, con `#101f9e` al pasar el mouse |
| Tinte claro sobre azul | `#dfe3ff` |

El cambio está hecho en el tema **Horizon - azul TUU oficial**, que es una copia
del tema en vivo con esos ocho valores cambiados y nada más. Queda sin publicar:
poner un tema en producción se hace a mano desde el admin de Shopify, y es la
única parte de esto que no se automatiza.
