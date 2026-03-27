import { Redirect, useRouter } from "expo-router";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAuth } from "../lib/auth";
import { useRole } from "../lib/role";
import { supabase } from "../lib/supabase";

const DEV_USERS = [
  { label: "Customer", email: "test-customer@tradable.dev", role: "customer" as const },
  { label: "Pro", email: "test-pro@tradable.dev", role: "pro" as const },
];

export default function LoginScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, setRole } = useRole();

  const handleDevLogin = async (email: string, userRole: "customer" | "pro") => {
    await supabase.auth.signInWithPassword({ email, password: "testpass123" });
    await setRole(userRole);
  };

  if (!authLoading && !roleLoading && session && role) {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Tradable</Text>
        <Text style={styles.tagline}>Get a real diagnosis in minutes.</Text>
      </View>

      {/* Dev quick-login (visible only in dev builds) */}
      <View style={styles.devRow}>
        <Text style={styles.devLabel}>DEV</Text>
        {DEV_USERS.map((u) => (
          <TouchableOpacity
            key={u.role}
            style={styles.devPill}
            onPress={() => handleDevLogin(u.email, u.role)}
            activeOpacity={0.75}
          >
            <Text style={styles.devPillText}>{u.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.cards}>
        <TouchableOpacity style={styles.card} onPress={() => router.push("/login/customer")} activeOpacity={0.85}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="account-outline" size={28} color="#1a4d3a" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>I need help</Text>
            <Text style={styles.cardSubtitle}>Get expert advice from tradespeople</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push("/login/pro")} activeOpacity={0.85}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="wrench-outline" size={28} color="#1a4d3a" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>I'm a tradesperson</Text>
            <Text style={styles.cardSubtitle}>Connect with customers who need you</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  hero: {
    alignItems: "center",
    marginBottom: 64,
  },
  title: {
    fontSize: 42,
    fontWeight: "800",
    color: "#1a4d3a",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: "#6B7280",
  },
  cards: {
    width: "100%",
    gap: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: "#e5e5e5",
    gap: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(26,77,58,0.08)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  devRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 32,
  },
  devLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#9A9A9A",
  },
  devPill: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  devPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5A5A5A",
  },
});
