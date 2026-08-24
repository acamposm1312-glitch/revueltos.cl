import Link from "next/link";
import Image from "next/image";
import { getProducts, type ShopifyProduct } from "@/lib/shopify";

function formatPrice(product: ShopifyProduct) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: product.priceRange.minVariantPrice.currencyCode,
  }).format(Number(product.priceRange.minVariantPrice.amount));
}

export default async function HomePage() {
  let products: ShopifyProduct[] = [];
  let error: string | null = null;

  try {
    products = await getProducts();
  } catch (e) {
    error = e instanceof Error ? e.message : "Error desconocido al cargar productos.";
  }

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold">huevos</h1>
        <p className="text-neutral-500">Huevos frescos y ovoproductos, directo a tu casa.</p>
      </header>

      {error && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <p className="font-medium">La tienda todavía no está conectada a Shopify.</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {!error && products.length === 0 && (
        <p className="text-neutral-500">Aún no hay productos publicados.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/productos/${product.handle}`}
            className="group rounded-xl border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="aspect-square bg-neutral-100 relative">
              {product.featuredImage && (
                <Image
                  src={product.featuredImage.url}
                  alt={product.featuredImage.altText ?? product.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              )}
            </div>
            <div className="p-3">
              <h2 className="font-medium">{product.title}</h2>
              <p className="text-neutral-500">{formatPrice(product)}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
