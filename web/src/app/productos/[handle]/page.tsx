import { notFound } from "next/navigation";
import Image from "next/image";
import { getProductByHandle } from "@/lib/shopify";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const product = await getProductByHandle(handle);

  if (!product) {
    notFound();
  }

  const price = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: product.priceRange.minVariantPrice.currencyCode,
  }).format(Number(product.priceRange.minVariantPrice.amount));

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 grid sm:grid-cols-2 gap-10">
      <div className="aspect-square bg-neutral-100 relative rounded-xl overflow-hidden">
        {product.featuredImage && (
          <Image
            src={product.featuredImage.url}
            alt={product.featuredImage.altText ?? product.title}
            fill
            className="object-cover"
          />
        )}
      </div>
      <div>
        <h1 className="text-2xl font-bold">{product.title}</h1>
        <p className="text-xl text-neutral-600 mt-2">{price}</p>
        <p className="mt-6 text-neutral-700 whitespace-pre-line">{product.description}</p>
      </div>
    </main>
  );
}
