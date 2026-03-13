import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { Screen } from "../../../components/Screen";
import { listCustomerCalls, CustomerCall } from "../../../lib/api";

const TRADE_EMOJI: Record<string, string> = {
  Plumbing: "🚿",
  Electrical: "⚡",
  HVAC: "❄️",
  Appliance: "🔌",
  Handyman: "🔧",
};

function CallRow({ call, onPress }: { call: CustomerCall; onPress: () => void }) {
  const emoji = TRADE_EMOJI[call.trade] ?? "🔧";
  const date = new Date(call.created_at).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <View style={styles.tradeTag}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.trade}>{call.trade}</Text>
        </View>
        <Text style={styles.description} numberOfLines={1}>{call.description}</Text>
        {call.outcome ? (
          <Text style={styles.diagnosis} numberOfLines={1}>{call.outcome.diagnosis}</Text>
        ) : (
          <Text style={styles.noOutcome}>No outcome recorded</Text>
        )}
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function CustomerBookingsTab() {
  const router = useRouter();
  const [calls, setCalls] = useState<CustomerCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCalls = useCallback(async () => {
    setError(null);
    try {
      const data = await listCustomerCalls();
      setCalls(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load call history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCalls(); }, []);

  return (
    <AuthGate>
      <RoleGuard requiredRole="customer">
        <Screen>
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadCalls} tintColor="#065F46" />}
          >
            <Text style={styles.heading}>Bookings</Text>
            <Text style={styles.subheading}>Your past consultations</Text>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#065F46" />
              </View>
            ) : calls.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={styles.emptyTitle}>No consultations yet</Text>
                <Text style={styles.emptySubtitle}>Your completed calls will appear here.</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {calls.map((call) => (
                  <CallRow
                    key={call.id}
                    call={call}
                    onPress={() => router.push(`/customer/call-detail/${call.id}`)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </Screen>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 26, fontWeight: "700", color: "#064E3B", letterSpacing: -0.5, marginTop: 8 },
  subheading: { fontSize: 14, color: "#475569", marginTop: 2, marginBottom: 20 },
  errorBanner: { backgroundColor: "#FEF2F2", borderRadius: 12, padding: 14, marginBottom: 16 },
  errorText: { color: "#DC2626", fontSize: 14 },
  loadingContainer: { alignItems: "center", paddingVertical: 60 },
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: "#0F172A" },
  emptySubtitle: { fontSize: 14, color: "#475569", marginTop: 4, textAlign: "center", paddingHorizontal: 32 },
  list: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1FAE5",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0FDF4",
  },
  rowLeft: { flex: 1, gap: 4 },
  rowRight: { alignItems: "flex-end", gap: 6, marginLeft: 12 },
  tradeTag: { flexDirection: "row", alignItems: "center", gap: 5 },
  emoji: { fontSize: 13 },
  trade: { fontSize: 13, fontWeight: "600", color: "#065F46" },
  description: { fontSize: 14, color: "#334155" },
  diagnosis: { fontSize: 12, color: "#475569" },
  noOutcome: { fontSize: 12, color: "#94A3B8", fontStyle: "italic" },
  date: { fontSize: 12, color: "#94A3B8" },
  chevron: { fontSize: 20, color: "#A7F3D0", lineHeight: 22 },
});
