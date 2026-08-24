import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getProducts, type ShopifyProduct } from "./lib/shopify";

function formatPrice(product: ShopifyProduct) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: product.priceRange.minVariantPrice.currencyCode,
  }).format(Number(product.priceRange.minVariantPrice.amount));
}

export default function App() {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>huevos</Text>
      <Text style={styles.subtitle}>
        Huevos frescos y ovoproductos, directo a tu casa.
      </Text>

      {loading && <ActivityIndicator style={styles.spinner} />}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>
            La tienda todavía no está conectada a Shopify.
          </Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && !error && products.length === 0 && (
        <Text style={styles.subtitle}>Aún no hay productos publicados.</Text>
      )}

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.featuredImage && (
              <Image
                source={{ uri: item.featuredImage.url }}
                style={styles.image}
                resizeMode="cover"
              />
            )}
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardPrice}>{formatPrice(item)}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#737373",
    marginTop: 4,
    marginBottom: 12,
  },
  spinner: {
    marginTop: 24,
  },
  errorBox: {
    backgroundColor: "#fffbeb",
    borderColor: "#fcd34d",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorTitle: {
    fontWeight: "600",
    color: "#78350f",
  },
  errorText: {
    color: "#78350f",
    marginTop: 4,
    fontSize: 12,
  },
  list: {
    paddingBottom: 24,
  },
  row: {
    gap: 12,
  },
  card: {
    flex: 1,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f5f5f5",
  },
  cardTitle: {
    fontWeight: "500",
    marginTop: 8,
    marginHorizontal: 8,
  },
  cardPrice: {
    color: "#737373",
    marginBottom: 8,
    marginHorizontal: 8,
  },
});
