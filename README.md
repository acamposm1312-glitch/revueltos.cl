# revueltos.cl

Tienda online de huevos y ovoproductos ("huevos"), con dos frentes:

- **`web/`** — tienda web (Next.js + Shopify Storefront API).
- **`app/`** — app móvil "huevos" para App Store y Google Play (Expo / React Native).

Ambas leen el catálogo y precios desde la misma tienda Shopify.

## Requisitos

- Node.js 20+
- Una tienda Shopify con la [Storefront API](https://shopify.dev/docs/api/storefront) habilitada (Admin → Apps → Develop apps → tu app → API credentials → Storefront API access token).

## Web (`web/`)

```bash
cd web
npm install
cp .env.example .env.local   # completar SHOPIFY_STORE_DOMAIN y SHOPIFY_STOREFRONT_ACCESS_TOKEN
npm run dev
```

## App móvil (`app/`)

```bash
cd app
npm install
cp .env.example .env   # completar EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN y EXPO_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN
npm run start
```

Escanea el QR con la app Expo Go (iOS/Android) para probarla en un dispositivo real.

## Estado

- [x] Estructura del monorepo (web + app)
- [x] Integración con Shopify Storefront API (listado y detalle de producto)
- [ ] Conectar a la tienda Shopify definitiva de revueltos.cl (aún no creada)
- [ ] Carrito y checkout
- [ ] Publicación en App Store / Google Play
