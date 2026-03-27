import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getRequest } from "../../../lib/api";
import { Request } from "../../../lib/types";

export default function CallCompleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [request, setRequest] = useState<Request | null>(null);

  useEffect(() => {
    if (!id) return;
    getRequest(id).then(setRequest).catch(() => setRequest(null));
  }, [id]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success icon */}
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="check" size={44} color="#1A4230" />
        </View>

        <Text style={styles.title}>Call complete</Text>
        <Text style={styles.subtitle}>
          Your consultation has ended. The pro will submit their diagnosis shortly.
        </Text>

        {request && (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Trade</Text>
              <View style={styles.tradeBadge}>
                <Text style={styles.tradeBadgeText}>{request.trade}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.cardSection}>
              <Text style={styles.cardLabel}>Your issue</Text>
              <Text style={styles.cardValue}>{request.description}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Status</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Awaiting diagnosis</Text>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.hint}>
          You'll be able to view the pro's diagnosis and book a follow-up from your Bookings tab.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.replace("/customer")}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="home-outline" size={20} color="#FFFFFF" />
          <Text style={styles.homeButtonText}>Back to home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F2EE",
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: "center",
    paddingTop: 32,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#EDF2EF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.7,
    color: "#111",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#5A5A5A",
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 8,
    marginBottom: 32,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 24,
    overflow: "hidden",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  cardLabel: {
    fontSize: 13,
    color: "#9A9A9A",
  },
  cardValue: {
    fontSize: 14,
    color: "#111",
    lineHeight: 21,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  tradeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#EDF2EF",
  },
  tradeBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A4230",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
  },
  statusText: {
    fontSize: 13,
    color: "#F59E0B",
    fontWeight: "500",
  },
  hint: {
    fontSize: 13,
    color: "#9A9A9A",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    backgroundColor: "#F4F2EE",
  },
  homeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A4230",
    borderRadius: 14,
    height: 52,
  },
  homeButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
