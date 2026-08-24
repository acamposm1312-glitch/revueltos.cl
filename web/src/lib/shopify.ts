const domain = process.env.SHOPIFY_STORE_DOMAIN;
const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const apiVersion = "2025-01";

export type ShopifyMoney = {
  amount: string;
  currencyCode: string;
};

export type ShopifyProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  featuredImage: { url: string; altText: string | null } | null;
  priceRange: { minVariantPrice: ShopifyMoney };
};

type ProductsResponse = {
  products: { edges: { node: ShopifyProduct }[] };
};

type ProductByHandleResponse = {
  productByHandle: ShopifyProduct | null;
};

async function shopifyFetch<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  if (!domain || !storefrontAccessToken) {
    throw new Error(
      "Faltan las variables de entorno SHOPIFY_STORE_DOMAIN y/o SHOPIFY_STOREFRONT_ACCESS_TOKEN. Revisa .env.local (ver .env.example)."
    );
  }

  const res = await fetch(`https://${domain}/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Shopify Storefront API respondió ${res.status}`);
  }

  const json = await res.json();

  if (json.errors) {
    throw new Error(json.errors.map((e: { message: string }) => e.message).join(", "));
  }

  return json.data as T;
}

const PRODUCT_FIELDS = /* GraphQL */ `
  id
  handle
  title
  description
  featuredImage {
    url
    altText
  }
  priceRange {
    minVariantPrice {
      amount
      currencyCode
    }
  }
`;

export async function getProducts(first = 20): Promise<ShopifyProduct[]> {
  const data = await shopifyFetch<ProductsResponse>(
    /* GraphQL */ `
      query Products($first: Int!) {
        products(first: $first) {
          edges {
            node {
              ${PRODUCT_FIELDS}
            }
          }
        }
      }
    `,
    { first }
  );

  return data.products.edges.map((edge) => edge.node);
}

export async function getProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const data = await shopifyFetch<ProductByHandleResponse>(
    /* GraphQL */ `
      query ProductByHandle($handle: String!) {
        productByHandle(handle: $handle) {
          ${PRODUCT_FIELDS}
        }
      }
    `,
    { handle }
  );

  return data.productByHandle;
}
