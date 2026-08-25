# revueltos.cl — Panel de Finanzas Personales

Panel de control para seguir ingresos, gastos, tarjetas de crédito y detectar
**gastos hormiga** (esos gastos chicos y repetidos —café, delivery, apps,
suscripciones— que sumados pesan en el mes).

## Cómo funciona

- Los datos "reales" viven en [`data/finance.json`](data/finance.json).
- Le vas contando a Claude tus movimientos (ingresos, gastos, estados de
  tarjeta de crédito) en el chat, y Claude los va agregando a ese archivo y
  haciendo commit/push.
- `index.html` es el panel: lee `data/finance.json` y muestra:
  - KPIs del mes: ingresos, gastos, balance, total y % de gasto hormiga.
  - Gráfico de ingresos vs. gastos de los últimos 6 meses.
  - Gráfico de gastos por categoría.
  - Ranking de gastos hormiga (qué se repite más y cuánto costaría al año si
    no se corrige).
  - Estado de tarjetas de crédito: cupo usado, monto facturado, próximo
    vencimiento.
  - Tabla de movimientos filtrable y ordenable.
- Si `data/finance.json` no tiene movimientos todavía, el panel muestra datos
  de ejemplo (con un aviso) solo para que veas cómo se ve funcionando.

## Ver el panel localmente

No requiere build ni dependencias. Basta con servir el directorio como
archivos estáticos, por ejemplo:

```bash
python3 -m http.server 8080
# abrir http://localhost:8080
```

(Abrir `index.html` directamente con `file://` no funciona porque el
navegador bloquea el `fetch` a `data/finance.json`; necesitas un servidor,
aunque sea local.)

## Desplegar

Es un sitio 100% estático (HTML/CSS/JS + Chart.js por CDN), así que se puede
publicar tal cual en GitHub Pages, Vercel o Netlify apuntando a la raíz del
repo — no hay paso de build.

## Estructura de los datos (`data/finance.json`)

```jsonc
{
  "config": {
    "hormigaThreshold": 8000,           // monto CLP bajo el cual un gasto en una categoría "hormiga" se marca automáticamente
    "hormigaCategories": ["Cafetería", "Delivery/Comida rápida", "..."]
  },
  "categories": { "ingreso": [...], "gasto": [...] },
  "transactions": [
    {
      "id": "tx_2026_08_01",
      "date": "2026-08-01",
      "type": "gasto",              // "ingreso" | "gasto"
      "category": "Cafetería",
      "amount": 3200,
      "paymentMethod": "credito:Visa Principal",
      "description": "Café Starbucks",
      "isHormiga": true              // opcional: fuerza sí/no, si no está se calcula por categoría+monto
    }
  ],
  "creditCards": [
    {
      "id": "cc_visa",
      "name": "Visa Principal",
      "bank": "Banco Ejemplo",
      "cupoTotal": 800000,
      "cupoUtilizado": 310000,
      "montoFacturado": 245000,
      "fechaVencimiento": "2026-09-05"
    }
  ]
}
```

## Agregar movimientos desde el navegador

También puedes usar los botones **+ Movimiento** y **+ Tarjeta** del panel:
quedan guardados en `localStorage` de tu navegador (no se pierden al
refrescar) y puedes exportarlos con **Exportar JSON** para pasárselos a
Claude y que los deje definitivamente en `data/finance.json`.
