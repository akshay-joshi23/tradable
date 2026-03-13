import { Redirect, useRouter } from "expo-router";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";

import { useAuth } from "../lib/auth";
import { useRole } from "../lib/role";

export default function LoginScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();

  if (!authLoading && !roleLoading && session && role) {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>🔧</Text>
        <Text style={styles.title}>Tradable</Text>
        <Text style={styles.tagline}>Expert help, right on your screen.</Text>
      </View>

      <View style={styles.cards}>
        <Text style={styles.prompt}>How are you using Tradable?</Text>

        <TouchableOpacity style={styles.card} onPress={() => router.push("/login/customer")} activeOpacity={0.85}>
          <Text style={styles.cardEmoji}>🏠</Text>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>I'm a Customer</Text>
            <Text style={styles.cardSubtitle}>Get remote help from a vetted pro</Text>
          </View>
          <Text style={styles.cardArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, styles.cardPro]} onPress={() => router.push("/login/pro")} activeOpacity={0.85}>
          <Text style={styles.cardEmoji}>🛠️</Text>
          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, { color: "#FFFFFF" }]}>I'm a Pro</Text>
            <Text style={[styles.cardSubtitle, { color: "#A7F3D0" }]}>Take jobs and grow your business</Text>
          </View>
          <Text style={[styles.cardArrow, { color: "#FFFFFF" }]}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FDF9",
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 16,
  },
  logo: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    color: "#064E3B",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: "#475569",
    marginTop: 6,
  },
  cards: {
    padding: 24,
    paddingBottom: 48,
  },
  prompt: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  cardPro: {
    backgroundColor: "#064E3B",
    borderColor: "#064E3B",
  },
  cardEmoji: {
    fontSize: 28,
    marginRight: 16,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#475569",
    marginTop: 2,
  },
  cardArrow: {
    fontSize: 20,
    color: "#94A3B8",
    fontWeight: "300",
  },
});
