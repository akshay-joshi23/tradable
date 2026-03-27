import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { claimRequest, getProProfile, listOpenRequests, listProCalls, ProCall } from "../../../lib/api";
import { ProProfile, Request } from "../../../lib/types";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [online, setOnline] = useState(true);
  const [profile, setProfile] = useState<ProProfile | null>(null);
  const [openRequests, setOpenRequests] = useState<Request[]>([]);
  const [calls, setCalls] = useState<ProCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [p, reqs, cs] = await Promise.all([getProProfile(), listOpenRequests(), listProCalls()]);
      setProfile(p);
      setOpenRequests(reqs);
      setCalls(cs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
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

  const displayName = profile ? (profile.display_name ?? profile.full_name ?? "Pro") : "Pro";
  const initials = displayName.slice(0, 2).toUpperCase();
  const todayStr = new Date().toDateString();
  const todayJobs = calls.filter((c) => new Date(c.created_at).toDateString() === todayStr).length;
  const weekJobs = calls.filter((c) => Date.now() - new Date(c.created_at).getTime() < 7 * 86400000).length;
  const priceLabel = profile ? `$${(profile.consultation_price_cents / 100).toFixed(0)}` : "";
  const featuredRequest = openRequests[0] ?? null;

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
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.name}>{displayName}</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>

          {/* Online Toggle */}
          <TouchableOpacity
            style={[styles.toggleCard, online ? styles.toggleOnline : styles.toggleOffline]}
            onPress={() => setOnline(!online)}
            activeOpacity={0.85}
          >
            <View style={[styles.toggleDot, { backgroundColor: online ? "#34D399" : "#9A9A9A" }]} />
            <Text style={[styles.toggleLabel, { color: online ? "#FFFFFF" : "#5A5A5A" }]}>
              {online ? "You're online — accepting jobs" : "You're offline"}
            </Text>
            <MaterialCommunityIcons
              name={online ? "toggle-switch" : "toggle-switch-off-outline"}
              size={32}
              color={online ? "#A7F3D0" : "#9A9A9A"}
            />
          </TouchableOpacity>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{todayJobs}</Text>
              <Text style={styles.statLabel}>JOBS TODAY</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{weekJobs}</Text>
              <Text style={styles.statLabel}>THIS WEEK</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statValue}>4.8</Text>
              <Text style={styles.statLabel}>RATING</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#1A4230" />
            </View>
          ) : (
            <>
              {/* New Request Card */}
              {featuredRequest && (
                <>
                  <Text style={styles.sectionLabel}>
                    NEW REQUEST{openRequests.length > 1 ? ` · ${openRequests.length} waiting` : ""}
                  </Text>
                  <View style={styles.requestCard}>
                    <View style={styles.requestCardTop}>
                      <View style={styles.requestBadge}>
                        <Text style={styles.requestBadgeText}>{featuredRequest.trade}</Text>
                      </View>
                      <View style={styles.requestTypeTag}>
                        <MaterialCommunityIcons name="video-outline" size={12} color="#A7F3D0" />
                        <Text style={styles.requestTypeText}>VIDEO</Text>
                      </View>
                    </View>
                    <Text style={styles.requestDesc} numberOfLines={3}>
                      {featuredRequest.description}
                    </Text>
                    <View style={styles.requestRate}>
                      <Text style={styles.requestRateText}>{priceLabel} consultation fee</Text>
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => setOpenRequests((prev) => prev.slice(1))}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.declineBtnText}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => handleClaim(featuredRequest.id)}
                        disabled={claimingId === featuredRequest.id}
                        activeOpacity={0.85}
                      >
                        {claimingId === featuredRequest.id ? (
                          <ActivityIndicator size={16} color="#1A4230" />
                        ) : (
                          <Text style={styles.acceptBtnText}>Accept</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}

              {/* Recent Jobs */}
              {calls.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: 24 }]}>RECENT JOBS</Text>
                  <View style={styles.recentList}>
                    {calls.slice(0, 5).map((call) => {
                      const d = new Date(call.created_at);
                      const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      const dateStr = d.toLocaleDateString([], { month: "short", day: "numeric" });
                      return (
                        <TouchableOpacity
                          key={call.id}
                          style={styles.recentCard}
                          onPress={() => router.push(`/pro/call-detail/${call.id}`)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.recentAccent} />
                          <View style={styles.recentTime}>
                            <Text style={styles.recentTimeVal}>{timeStr}</Text>
                            <Text style={styles.recentTimeSub}>{dateStr}</Text>
                          </View>
                          <View style={styles.recentDivider} />
                          <View style={styles.recentBody}>
                            <Text style={styles.recentTitle} numberOfLines={1}>{call.trade}</Text>
                            <Text style={styles.recentDesc} numberOfLines={1}>{call.description}</Text>
                          </View>
                          {call.outcome ? (
                            <View style={styles.donePill}>
                              <Text style={styles.donePillText}>DONE</Text>
                            </View>
                          ) : (
                            <View style={styles.pendingPill}>
                              <Text style={styles.pendingPillText}>PENDING</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {!featuredRequest && calls.length === 0 && (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="briefcase-outline" size={48} color="#9A9A9A" />
                  <Text style={styles.emptyTitle}>No activity yet</Text>
                  <Text style={styles.emptySub}>Accept your first job to get started.</Text>
                </View>
              )}
            </>
          )}

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    fontWeight: "400",
    color: "#9A9A9A",
    marginBottom: 2,
  },
  name: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.9,
    color: "#111111",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1A4230",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 16,
    ...CARD_SHADOW,
  },
  toggleOnline: {
    backgroundColor: "#1A4230",
  },
  toggleOffline: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  toggleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 24,
    ...CARD_SHADOW,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.66,
    color: "#111111",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.7,
    color: "#9A9A9A",
    textTransform: "uppercase",
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.7,
    color: "#9A9A9A",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  requestCard: {
    backgroundColor: "#1A4230",
    borderRadius: 20,
    padding: 20,
    marginBottom: 8,
  },
  requestCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  requestBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  requestBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  requestTypeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  requestTypeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#A7F3D0",
    letterSpacing: 0.4,
  },
  requestDesc: {
    fontSize: 15,
    fontWeight: "500",
    color: "#FFFFFF",
    lineHeight: 22,
    marginBottom: 12,
  },
  requestRate: {
    marginBottom: 16,
  },
  requestRateText: {
    fontSize: 13,
    fontWeight: "400",
    color: "rgba(255,255,255,0.65)",
  },
  requestActions: {
    flexDirection: "row",
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  acceptBtn: {
    flex: 1,
    height: 44,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A4230",
  },
  centered: {
    alignItems: "center",
    paddingVertical: 60,
  },
  recentList: {
    gap: 10,
  },
  recentCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    ...CARD_SHADOW,
  },
  recentAccent: {
    width: 3,
    backgroundColor: "#1A4230",
    alignSelf: "stretch",
  },
  recentTime: {
    width: 52,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  recentTimeVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111111",
    lineHeight: 16,
  },
  recentTimeSub: {
    fontSize: 10,
    fontWeight: "400",
    color: "#9A9A9A",
    marginTop: 2,
  },
  recentDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  recentBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.14,
    color: "#111111",
    marginBottom: 3,
  },
  recentDesc: {
    fontSize: 12,
    fontWeight: "400",
    color: "#9A9A9A",
  },
  donePill: {
    backgroundColor: "#EDF2EF",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 12,
  },
  donePillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1A4230",
    letterSpacing: 0.4,
  },
  pendingPill: {
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 12,
  },
  pendingPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9A9A9A",
    letterSpacing: 0.4,
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
    fontWeight: "400",
    color: "#9A9A9A",
    textAlign: "center",
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
  },
});
