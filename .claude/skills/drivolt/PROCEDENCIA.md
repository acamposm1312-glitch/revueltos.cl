# Por qué esta skill vive en el repositorio

La skill DRIVOLT existe también como skill sincronizada de la cuenta. Esa copia
es **de solo lectura** desde la sesión: cuando el contenedor se recicla, vuelve a
bajar la versión guardada en el servidor y se pierde cualquier mejora hecha
durante la conversación. Pasó el 22-sep-2026 y se fueron de una vez la vista de
clientes consolidada del regenerador, el producto nuevo del verificador, las
rutas corregidas y tres secciones de documentación.

El repositorio sí persiste: se clona de nuevo en cada sesión y queda versionado.
Por eso la copia de trabajo es ésta. Si en algún momento se puede volver a
guardar en la skill sincronizada, hay que subir estos archivos allá; mientras
tanto, **ésta es la versión buena**.

## Qué se recuperó acá

- `scripts/regenerar_derivadas.py` — reapuntado a la vista Clientes consolidada
  (Mejores clientes, Clientes foco, Ficha, Todos los clientes) en vez de las
  cuatro vistas separadas que ya no existen. Además la frase «Orden de visita
  sugerido» se arma desde la misma lista de comunas que ordena los bloques, así
  que no pueden contradecirse, y avisa al terminar si alguna comuna con clientes
  quedó fuera del trazado de su ruta.
- `scripts/verificar_facturas.py` — con `PipenoBidon`, el envase de 5 L que se
  vende por unidad.
- `references/panel.md` — el modelo de caja y cobranza que reemplazó a la
  conciliación derivada, y la guardia de los seis lugares donde vive el total
  del mes.
- `references/negocio.md` — la advertencia de margen del bidón.
- `SKILL.md` — la regla de que el saldo de la cuenta se informa, no se deduce.

## Lo que no se pudo recuperar

- `scripts/tablas_vivas.py`, que inyectó el orden y filtrado de tablas. Su
  resultado ya está dentro del panel publicado, así que no hace falta para
  operar; haría falta sólo para reconstruir el panel desde cero.
- Los `ventas_DDmmm.json` de respaldo de las facturas 553 a 576. Los montos,
  clientes y estados están en el panel; el desglose de cajas por documento se
  perdió, aunque su efecto ya está aplicado al inventario.
