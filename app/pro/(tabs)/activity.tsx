import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { Screen } from "../../../components/Screen";
import { claimRequest, listOpenRequests } from "../../../lib/api";
import { Request } from "../../../lib/types";

const TRADE_COLOR: Record<string, string> = {
  Plumbing: "#0EA5E9",
  Electrical: "#F59E0B",
  HVAC: "#6366F1",
  Appliance: "#EC4899",
  Handyman: "#059669",
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
  const color = TRADE_COLOR[request.trade] ?? "#059669";
  const postedAt = new Date(request.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.tradeBadge}>
          <View style={[styles.tradeDot, { backgroundColor: color }]} />
          <Text style={[styles.tradeName, { color }]}>{request.trade}</Text>
        </View>
        <Text style={styles.postedAt}>{postedAt}</Text>
      </View>
      <Text style={styles.description} numberOfLines={3}>
        {request.description}
      </Text>
      <Button
        mode="contained"
        onPress={onClaim}
        loading={claiming}
        style={styles.claimButton}
        contentStyle={styles.claimButtonContent}
        buttonColor="#059669"
      >
        Accept job
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
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRequests} tintColor="#059669" />}
          >
            <View style={styles.header}>
              <Text style={styles.heading}>Open Jobs</Text>
              {!loading && requests.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{requests.length}</Text>
                </View>
              )}
            </View>
            <Text style={styles.subheading}>New requests in your area</Text>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#059669" size="small" />
              </View>
            ) : requests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No open jobs right now</Text>
                <Text style={styles.emptySubtitle}>Pull to refresh when you're ready for work.</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {requests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onClaim={() => handleClaim(request.id)}
                    claiming={claimingId === request.id}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  countBadge: {
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
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
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
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
  list: { gap: 12, paddingBottom: 32 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  tradeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tradeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tradeName: {
    fontSize: 12,
    fontWeight: "600",
  },
  postedAt: {
    fontSize: 12,
    color: "#94A3B8",
  },
  description: {
    fontSize: 15,
    color: "#334155",
    lineHeight: 22,
    marginBottom: 16,
  },
  claimButton: {
    borderRadius: 10,
  },
  claimButtonContent: {
    height: 44,
  },
});
