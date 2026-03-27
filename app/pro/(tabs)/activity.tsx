import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { claimRequest, listOpenRequests, listProCalls, ProCall } from "../../../lib/api";
import { Request } from "../../../lib/types";

const TRADE_COLOR: Record<string, string> = {
  Plumbing: "#0EA5E9",
  Electrical: "#F59E0B",
  HVAC: "#6366F1",
  Appliance: "#EC4899",
  Handyman: "#059669",
};

export default function ActivityTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"available" | "my">("available");
  const [requests, setRequests] = useState<Request[]>([]);
  const [calls, setCalls] = useState<ProCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    setError(null);
    if (isRefresh) setRefreshing(true);
    try {
      const [reqs, cs] = await Promise.all([listOpenRequests(), listProCalls()]);
      setRequests(reqs);
      setCalls(cs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const handleClaim = async (requestId: string) => {
    setClaimingId(requestId);
    try {
      const claimed = await claimRequest(requestId);
      router.push(`/call/${claimed.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept job.");
      setClaimingId(null);
    }
  };

  return (
    <AuthGate>
      <RoleGuard requiredRole="pro">
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#1A4230" />
          }
        >
          <Text style={styles.heading}>Jobs</Text>

          {/* Tab Pills */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabPill, tab === "available" && styles.tabPillActive]}
              onPress={() => setTab("available")}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabPillText, tab === "available" && styles.tabPillTextActive]}>
                Available{requests.length > 0 ? ` ${requests.length}` : ""}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabPill, tab === "my" && styles.tabPillActive]}
              onPress={() => setTab("my")}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabPillText, tab === "my" && styles.tabPillTextActive]}>
                My Jobs
              </Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#1A4230" />
            </View>
          ) : tab === "available" ? (
            requests.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="briefcase-outline" size={48} color="#9A9A9A" />
                <Text style={styles.emptyTitle}>No open jobs right now</Text>
                <Text style={styles.emptySub}>Pull to refresh when you're ready for work.</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {requests.map((req) => {
                  const color = TRADE_COLOR[req.trade] ?? "#059669";
                  const timeStr = new Date(req.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const dateStr = new Date(req.created_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  });
                  return (
                    <View key={req.id} style={styles.jobCard}>
                      <View style={styles.jobCardTop}>
                        <View style={[styles.tradeBadge, { backgroundColor: color + "18" }]}>
                          <View style={[styles.tradeDot, { backgroundColor: color }]} />
                          <Text style={[styles.tradeText, { color }]}>{req.trade}</Text>
                        </View>
                        <View style={styles.typePill}>
                          <MaterialCommunityIcons name="video-outline" size={11} color="#1A4230" />
                          <Text style={styles.typePillText}>VIDEO</Text>
                        </View>
                      </View>

                      <Text style={styles.jobDesc} numberOfLines={3}>{req.description}</Text>

                      <View style={styles.jobMeta}>
                        <MaterialCommunityIcons name="clock-outline" size={13} color="#9A9A9A" />
                        <Text style={styles.jobMetaText}>{dateStr} · {timeStr}</Text>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.jobActions}>
                        <TouchableOpacity
                          style={styles.declineBtn}
                          onPress={() => setRequests((prev) => prev.filter((r) => r.id !== req.id))}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.declineBtnText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.acceptBtn}
                          onPress={() => handleClaim(req.id)}
                          disabled={claimingId === req.id}
                          activeOpacity={0.85}
                        >
                          {claimingId === req.id ? (
                            <ActivityIndicator size={16} color="#FFFFFF" />
                          ) : (
                            <Text style={styles.acceptBtnText}>Accept</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )
          ) : (
            calls.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={48} color="#9A9A9A" />
                <Text style={styles.emptyTitle}>No completed jobs yet</Text>
                <Text style={styles.emptySub}>Accepted jobs will appear here.</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {calls.map((call) => {
                  const dateStr = new Date(call.created_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  });
                  return (
                    <TouchableOpacity
                      key={call.id}
                      style={styles.myJobCard}
                      onPress={() => router.push(`/pro/call-detail/${call.id}`)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.myJobAccent} />
                      <View style={styles.myJobBody}>
                        <View style={styles.myJobRow}>
                          <Text style={styles.myJobTitle} numberOfLines={1}>{call.trade}</Text>
                          <Text style={styles.myJobDate}>{dateStr}</Text>
                        </View>
                        <Text style={styles.myJobDesc} numberOfLines={2}>{call.description}</Text>
                        <View style={styles.myJobFooter}>
                          <View style={styles.typePill}>
                            <MaterialCommunityIcons name="video-outline" size={11} color="#1A4230" />
                            <Text style={styles.typePillText}>VIDEO</Text>
                          </View>
                          {call.outcome ? (
                            <View style={styles.completedBadge}>
                              <Text style={styles.completedBadgeText}>COMPLETED</Text>
                            </View>
                          ) : (
                            <View style={styles.pendingBadge}>
                              <Text style={styles.pendingBadgeText}>PENDING</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          )}
        </ScrollView>
      </RoleGuard>
    </AuthGate>
  );
}

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 2,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F2EE",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  heading: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.9,
    color: "#111111",
    marginBottom: 20,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
  },
  tabPillActive: {
    backgroundColor: "#1A4230",
    borderColor: "transparent",
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111111",
  },
  tabPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  centered: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
  },
  emptySub: {
    fontSize: 13,
    color: "#9A9A9A",
    textAlign: "center",
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
  },
  list: {
    gap: 12,
  },
  jobCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    gap: 10,
    ...CARD_SHADOW,
  },
  jobCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tradeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tradeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tradeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EDF2EF",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1A4230",
    letterSpacing: 0.4,
  },
  jobDesc: {
    fontSize: 14,
    fontWeight: "400",
    color: "#5A5A5A",
    lineHeight: 20,
  },
  jobMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  jobMetaText: {
    fontSize: 12,
    color: "#9A9A9A",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  jobActions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 2,
  },
  declineBtn: {
    flex: 1,
    height: 40,
    backgroundColor: "#F4F2EE",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5A5A5A",
  },
  acceptBtn: {
    flex: 2,
    height: 40,
    backgroundColor: "#1A4230",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  myJobCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    ...CARD_SHADOW,
  },
  myJobAccent: {
    width: 3,
    backgroundColor: "#1A4230",
    alignSelf: "stretch",
  },
  myJobBody: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  myJobRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  myJobTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
    flex: 1,
    marginRight: 8,
  },
  myJobDate: {
    fontSize: 12,
    color: "#9A9A9A",
  },
  myJobDesc: {
    fontSize: 12,
    color: "#9A9A9A",
    lineHeight: 17,
  },
  myJobFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  completedBadge: {
    backgroundColor: "#EDF2EF",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1A4230",
    letterSpacing: 0.4,
  },
  pendingBadge: {
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9A9A9A",
    letterSpacing: 0.4,
  },
});
