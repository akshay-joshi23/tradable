import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { Screen } from "../../../components/Screen";
import { listProCalls, ProCall } from "../../../lib/api";

const TRADE_COLOR: Record<string, string> = {
  Plumbing: "#0EA5E9",
  Electrical: "#F59E0B",
  HVAC: "#6366F1",
  Appliance: "#EC4899",
  Handyman: "#059669",
};

function CallRow({ call, onPress }: { call: ProCall; onPress: () => void }) {
  const color = TRADE_COLOR[call.trade] ?? "#059669";
  const date = new Date(call.created_at).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
  const hasOutcome = Boolean(call.outcome);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.tradeAccent, { backgroundColor: color }]} />
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.tradeName}>{call.trade}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>
        <Text style={styles.description} numberOfLines={1}>{call.description}</Text>
        <View style={styles.rowBottom}>
          {hasOutcome ? (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Completed</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, styles.statusBadgePending]}>
              <Text style={[styles.statusText, styles.statusTextPending]}>No summary</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function HomeTab() {
  const router = useRouter();
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
        <Screen>
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadCalls} tintColor="#059669" />}
          >
            <Text style={styles.heading}>Consultations</Text>
            <Text style={styles.subheading}>Your completed sessions</Text>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#059669" size="small" />
              </View>
            ) : calls.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No consultations yet</Text>
                <Text style={styles.emptySubtitle}>Completed jobs will appear here.</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {calls.map((call, index) => (
                  <CallRow
                    key={call.id}
                    call={call}
                    onPress={() => router.push(`/pro/call-detail/${call.id}`)}
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
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.5,
    marginTop: 4,
  },
  subheading: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  errorText: { color: "#DC2626", fontSize: 14 },
  loadingContainer: { alignItems: "center", paddingVertical: 60 },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 6,
    textAlign: "center",
  },
  list: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 32,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tradeAccent: {
    width: 3,
    alignSelf: "stretch",
  },
  rowContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 4,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tradeName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  date: {
    fontSize: 12,
    color: "#94A3B8",
  },
  description: {
    fontSize: 14,
    color: "#475569",
  },
  rowBottom: {
    flexDirection: "row",
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  statusBadgePending: {
    backgroundColor: "#F8FAFC",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
  },
  statusTextPending: {
    color: "#94A3B8",
  },
  chevron: {
    fontSize: 20,
    color: "#CBD5E1",
    paddingRight: 14,
  },
});
