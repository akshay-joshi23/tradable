import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { listCustomerCalls, CustomerCall } from "../../../lib/api";

export default function CustomerBookingsTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [calls, setCalls] = useState<CustomerCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCalls = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await listCustomerCalls();
      setCalls(data);
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadCalls(); }, []);

  const activeStatuses = ["open", "matched", "in_call"];
  const upcoming = calls.filter((c) => activeStatuses.includes(c.status));
  const past = calls.filter((c) => !activeStatuses.includes(c.status));

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const statusLabel = (status: string) => {
    if (status === "matched") return "Matched";
    if (status === "in_call") return "In call";
    if (status === "completed") return "Completed";
    if (status === "canceled") return "Canceled";
    return "Open";
  };

  return (
    <AuthGate>
      <RoleGuard requiredRole="customer">
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadCalls(true)} tintColor="#1A4230" />
          }
        >
          <Text style={styles.title}>Bookings</Text>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#1A4230" />
            </View>
          ) : calls.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconBox}>
                <MaterialCommunityIcons name="calendar-outline" size={24} color="#1A4230" />
              </View>
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptySubtitle}>Browse pros and post a request to get started.</Text>
            </View>
          ) : (
            <>
              {upcoming.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Upcoming</Text>
                  <View style={styles.list}>
                    {upcoming.map((call) => (
                      <TouchableOpacity
                        key={call.id}
                        style={styles.card}
                        onPress={() => router.push(`/customer/request/${call.id}`)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.iconBox}>
                          <MaterialCommunityIcons name="video-outline" size={20} color="#1A4230" />
                        </View>
                        <View style={styles.cardBody}>
                          <Text style={styles.cardService}>{call.trade}</Text>
                          <Text style={styles.cardDesc} numberOfLines={1}>{call.description}</Text>
                          <Text style={styles.cardDate}>{formatDate(call.created_at)}</Text>
                          <Text style={styles.cardDetail}>Video consultation</Text>
                        </View>
                        <View style={styles.cardRight}>
                          <View style={styles.statusBadgeGreen}>
                            <Text style={styles.statusTextGreen}>{statusLabel(call.status)}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {past.length > 0 && (
                <View style={[styles.section, { marginTop: 36 }]}>
                  <Text style={[styles.sectionLabel, { color: "#9A9A9A" }]}>Past</Text>
                  <View style={styles.list}>
                    {past.map((call) => (
                      <TouchableOpacity
                        key={call.id}
                        style={styles.pastCard}
                        onPress={() => router.push(`/customer/call-detail/${call.id}`)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.iconBox}>
                          <MaterialCommunityIcons
                            name={call.outcome ? "wrench-outline" : "calendar-check-outline"}
                            size={20}
                            color="#1A4230"
                          />
                        </View>
                        <View style={styles.cardBody}>
                          <Text style={[styles.cardService, { color: "#5A5A5A", fontWeight: "500" }]}>
                            {call.trade}
                          </Text>
                          <Text style={[styles.cardDesc, { color: "#5A5A5A" }]} numberOfLines={1}>
                            {call.description}
                          </Text>
                          <Text style={[styles.cardDate, { color: "#9A9A9A" }]}>
                            {formatDate(call.created_at)}
                          </Text>
                          {call.outcome && (
                            <Text style={styles.cardDetail} numberOfLines={1}>
                              {call.outcome.diagnosis}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F2EE",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.9,
    color: "#111",
    marginBottom: 28,
  },
  section: {},
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.77,
    textTransform: "uppercase",
    color: "#111",
    marginBottom: 12,
  },
  list: {
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  pastCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F9F8F6",
    borderRadius: 14,
    padding: 14,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EDF2EF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardService: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  cardDesc: {
    fontSize: 12,
    fontWeight: "400",
    color: "#5A5A5A",
  },
  cardDate: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1A4230",
  },
  cardDetail: {
    fontSize: 11,
    fontWeight: "400",
    color: "#9A9A9A",
  },
  cardRight: {
    alignItems: "flex-end",
  },
  statusBadgeGreen: {
    backgroundColor: "#EDF2EF",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusTextGreen: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1A4230",
  },
  centered: {
    alignItems: "center",
    paddingVertical: 60,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EDF2EF",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9A9A9A",
    textAlign: "center",
  },
});
