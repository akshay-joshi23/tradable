import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthGate } from "../../components/AuthGate";
import { RoleGuard } from "../../components/RoleGuard";
import { listProCalls, ProCall } from "../../lib/api";

const TRADE_EMOJI: Record<string, string> = {
  Plumbing: "🚿",
  Electrical: "⚡",
  HVAC: "❄️",
  Appliance: "🔌",
  Handyman: "🔧",
};

function CallRow({ call, onPress }: { call: ProCall; onPress: () => void }) {
  const emoji = TRADE_EMOJI[call.trade] ?? "🔧";
  const date = new Date(call.created_at).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.tradeAccent} />
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.tradeText}>{emoji} {call.trade}</Text>
          <Text style={styles.dateText}>{date}</Text>
        </View>
        <Text style={styles.description} numberOfLines={1}>{call.description}</Text>
        {call.outcome ? (
          <Text style={styles.diagnosis} numberOfLines={1}>{call.outcome.diagnosis}</Text>
        ) : (
          <Text style={styles.noOutcome}>No outcome recorded</Text>
        )}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color="#9A9A9A" />
    </TouchableOpacity>
  );
}

export default function ProCallsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [calls, setCalls] = useState<ProCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCalls = useCallback(async () => {
    setError(null);
    try {
      const data = await listProCalls();
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
      <RoleGuard requiredRole="pro">
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadCalls} tintColor="#1A4230" />}
          >
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color="#1A4230" />
              <Text style={styles.backBtnText}>Dashboard</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Call History</Text>
            <Text style={styles.subtitle}>Your completed consultations</Text>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {!loading && calls.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={styles.emptyTitle}>No calls yet</Text>
                <Text style={styles.emptySubtitle}>Completed consultations will appear here.</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {calls.map((call) => (
                  <CallRow
                    key={call.id}
                    call={call}
                    onPress={() => router.push(`/pro/call-detail/${call.id}`)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F2EE",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    paddingTop: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 20,
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A4230",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.9,
    color: "#111",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#5A5A5A",
    marginBottom: 20,
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: { color: "#DC2626", fontSize: 14 },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  emptySubtitle: {
    fontSize: 13,
    color: "#9A9A9A",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  list: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    paddingRight: 14,
  },
  tradeAccent: {
    width: 3,
    alignSelf: "stretch",
    backgroundColor: "#1A4230",
    borderRadius: 2,
    marginRight: 14,
  },
  rowContent: {
    flex: 1,
    paddingVertical: 14,
    gap: 3,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tradeText: { fontSize: 13, fontWeight: "600", color: "#111" },
  dateText: { fontSize: 12, color: "#9A9A9A" },
  description: { fontSize: 13, color: "#5A5A5A" },
  diagnosis: { fontSize: 12, color: "#9A9A9A" },
  noOutcome: { fontSize: 12, color: "#D1D5DB", fontStyle: "italic" },
});
