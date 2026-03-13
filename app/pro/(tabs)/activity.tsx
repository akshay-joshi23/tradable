import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { Screen } from "../../../components/Screen";
import { claimRequest, listOpenRequests } from "../../../lib/api";
import { Request } from "../../../lib/types";

const TRADE_EMOJI: Record<string, string> = {
  Plumbing: "🚿",
  Electrical: "⚡",
  HVAC: "❄️",
  Appliance: "🔌",
  Handyman: "🔧",
};

function RequestCard({
  request,
  onClaim,
  claiming,
}: {
  request: Request;
  onClaim: () => void;
  claiming: boolean;
}) {
  const emoji = TRADE_EMOJI[request.trade] ?? "🔧";
  const timeAgo = new Date(request.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.tradeTag}>
          <Text style={styles.tradeEmoji}>{emoji}</Text>
          <Text style={styles.tradeName}>{request.trade}</Text>
        </View>
        <Text style={styles.timeAgo}>{timeAgo}</Text>
      </View>
      <Text style={styles.description} numberOfLines={2}>
        {request.description}
      </Text>
      <Button
        mode="contained"
        onPress={onClaim}
        loading={claiming}
        style={styles.claimButton}
        contentStyle={styles.claimButtonContent}
      >
        Claim this job
      </Button>
    </View>
  );
}

export default function ActivityTab() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setError(null);
    try {
      const data = await listOpenRequests();
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRequests(); }, []);

  const handleClaim = async (requestId: string) => {
    setClaimingId(requestId);
    try {
      const claimed = await claimRequest(requestId);
      router.push(`/call/${claimed.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim request.");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <AuthGate>
      <RoleGuard requiredRole="pro">
        <Screen>
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRequests} tintColor="#065F46" />}
          >
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.heading}>Activity</Text>
                <Text style={styles.subheading}>
                  {requests.length > 0 ? `${requests.length} available near you` : "Checking your area..."}
                </Text>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#065F46" />
                <Text style={styles.loadingText}>Finding nearby requests...</Text>
              </View>
            ) : requests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🛋️</Text>
                <Text style={styles.emptyTitle}>All quiet right now</Text>
                <Text style={styles.emptySubtitle}>Pull down to refresh when you're ready for a job.</Text>
              </View>
            ) : (
              requests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onClaim={() => handleClaim(request.id)}
                  claiming={claimingId === request.id}
                />
              ))
            )}
          </ScrollView>
        </Screen>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, marginTop: 8 },
  heading: { fontSize: 26, fontWeight: "700", color: "#064E3B", letterSpacing: -0.5 },
  subheading: { fontSize: 14, color: "#475569", marginTop: 2 },
  errorBanner: { backgroundColor: "#FEF2F2", borderRadius: 12, padding: 14, marginBottom: 16 },
  errorText: { color: "#DC2626", fontSize: 14 },
  loadingContainer: { alignItems: "center", paddingVertical: 60, gap: 12 },
  loadingText: { color: "#475569", fontSize: 14 },
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#0F172A" },
  emptySubtitle: { fontSize: 14, color: "#475569", marginTop: 6, textAlign: "center", paddingHorizontal: 32 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  tradeTag: { flexDirection: "row", alignItems: "center", backgroundColor: "#ECFDF5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 6 },
  tradeEmoji: { fontSize: 14 },
  tradeName: { fontSize: 13, fontWeight: "600", color: "#065F46" },
  timeAgo: { fontSize: 12, color: "#94A3B8" },
  description: { fontSize: 15, color: "#334155", lineHeight: 22, marginBottom: 16 },
  claimButton: { borderRadius: 10 },
  claimButtonContent: { height: 44 },
});
