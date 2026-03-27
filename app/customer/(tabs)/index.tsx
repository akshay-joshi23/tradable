import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { listPros, ProSummary } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";

const SERVICES = [
  { emoji: "⚡", label: "Electrical" },
  { emoji: "🔧", label: "Plumbing" },
  { emoji: "❄️", label: "HVAC" },
  { emoji: "🔌", label: "Appliance" },
  { emoji: "🪛", label: "Handyman" },
];

export default function CustomerHomeTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [pros, setPros] = useState<ProSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const email = session?.user?.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const loadPros = useCallback(async (trade?: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await listPros(trade);
      setPros(data);
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadPros(); }, []);

  const handleServicePress = (label: string) => {
    const next = selectedService === label ? null : label;
    setSelectedService(next);
    loadPros(next ?? undefined);
  };

  const filteredPros = pros.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (p.display_name ?? p.full_name ?? "").toLowerCase();
    return name.includes(q) || p.trade.toLowerCase().includes(q);
  });

  return (
    <AuthGate>
      <RoleGuard requiredRole="customer">
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadPros(selectedService ?? undefined, true)}
                tintColor="#1A4230"
              />
            }
          >
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>{greeting}</Text>
                <Text style={styles.title}>Find a pro</Text>
              </View>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>

            {/* Search */}
            <View style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={20} color="#9A9A9A" />
              <TextInput
                style={styles.searchInput}
                placeholder="Electricians, plumbers…"
                placeholderTextColor="#9A9A9A"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Get Help CTA */}
            <TouchableOpacity
              style={styles.ctaCard}
              onPress={() => router.push("/customer/new-request")}
              activeOpacity={0.85}
            >
              <View style={styles.ctaAccent} />
              <View style={styles.ctaInner}>
                <View style={styles.ctaIconBox}>
                  <MaterialCommunityIcons name="wrench-outline" size={20} color="#1A4230" />
                </View>
                <View style={styles.ctaBody}>
                  <Text style={styles.ctaLabel}>NEED SOMETHING FIXED?</Text>
                  <Text style={styles.ctaTitle}>Post a new request</Text>
                  <Text style={styles.ctaSub}>Get matched with a nearby pro</Text>
                </View>
              </View>
              <View style={styles.ctaButtonRow}>
                <View style={styles.ctaButton}>
                  <Text style={styles.ctaButtonText}>Get help now →</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Services */}
            <Text style={styles.sectionLabel}>Services</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servicesRow}
              style={styles.servicesScroll}
            >
              {SERVICES.map((s) => {
                const active = selectedService === s.label;
                return (
                  <TouchableOpacity
                    key={s.label}
                    onPress={() => handleServicePress(s.label)}
                    style={[styles.servicePill, active && styles.servicePillActive]}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.serviceEmoji}>{s.emoji}</Text>
                    <Text style={[styles.serviceLabel, active && styles.serviceLabelActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Top Pros */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Top Pros</Text>
              <TouchableOpacity onPress={() => router.push("/customer/pros")}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator color="#1A4230" />
              </View>
            ) : filteredPros.length === 0 ? (
              <View style={styles.centered}>
                <Text style={styles.emptyText}>No pros found</Text>
                <Text style={styles.emptySubtext}>Try a different trade or check back later.</Text>
              </View>
            ) : (
              <View style={styles.proList}>
                {filteredPros.map((pro) => {
                  const name = pro.display_name ?? pro.full_name ?? "Pro";
                  const proInitials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                  const price = Math.round(pro.consultation_price_cents / 100);
                  return (
                    <TouchableOpacity
                      key={pro.user_id}
                      style={styles.proCard}
                      onPress={() => router.push(`/customer/pro/${pro.user_id}`)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.proAvatar}>
                        <Text style={styles.proAvatarText}>{proInitials}</Text>
                      </View>
                      <View style={styles.proInfo}>
                        <Text style={styles.proName} numberOfLines={1}>{name}</Text>
                        <Text style={styles.proTrade}>{pro.trade}</Text>
                        {pro.years_of_experience != null && (
                          <View style={styles.metaRow}>
                            <MaterialCommunityIcons name="star" size={11} color="#C49A3C" />
                            <Text style={styles.metaText}>{pro.years_of_experience} yrs exp</Text>
                          </View>
                        )}
                        {pro.certifications && (
                          <View style={styles.tagRow}>
                            <View style={styles.tag}>
                              <Text style={styles.tagText}>Certified</Text>
                            </View>
                          </View>
                        )}
                      </View>
                      <View style={styles.proRight}>
                        <Text style={styles.proPrice}>${price}</Text>
                        <Text style={styles.proUnit}>/call</Text>
                        <View style={styles.availPill}>
                          <Text style={styles.availText}>Available</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
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
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 20,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    fontWeight: "400",
    color: "#5A5A5A",
    marginBottom: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.9,
    color: "#111",
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1A4230",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111",
  },
  ctaCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  ctaAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: "#1A4230",
  },
  ctaInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingLeft: 12,
    marginBottom: 14,
  },
  ctaIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EDF2EF",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBody: {
    flex: 1,
  },
  ctaLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.77,
    color: "#1A4230",
    marginBottom: 4,
  },
  ctaTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    marginBottom: 2,
  },
  ctaSub: {
    fontSize: 12,
    fontWeight: "400",
    color: "#5A5A5A",
  },
  ctaButtonRow: {
    paddingLeft: 12,
  },
  ctaButton: {
    backgroundColor: "#1A4230",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  ctaButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.77,
    textTransform: "uppercase",
    color: "#111",
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A4230",
    marginBottom: 12,
  },
  servicesScroll: {
    marginBottom: 24,
  },
  servicesRow: {
    gap: 8,
  },
  servicePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  servicePillActive: {
    backgroundColor: "#1A4230",
    borderColor: "#1A4230",
  },
  serviceEmoji: {
    fontSize: 14,
  },
  serviceLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111",
  },
  serviceLabelActive: {
    color: "#FFF",
  },
  proList: {
    gap: 10,
  },
  proCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  proAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EDF2EF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  proAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A4230",
  },
  proInfo: {
    flex: 1,
    gap: 2,
  },
  proName: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: "#111",
  },
  proTrade: {
    fontSize: 12,
    fontWeight: "400",
    color: "#9A9A9A",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#5A5A5A",
  },
  tagRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  tag: {
    backgroundColor: "#F9F8F6",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#9A9A9A",
  },
  proRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  proPrice: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: "#111",
  },
  proUnit: {
    fontSize: 11,
    fontWeight: "400",
    color: "#9A9A9A",
  },
  availPill: {
    backgroundColor: "#EDF2EF",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    marginTop: 4,
  },
  availText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1A4230",
  },
  centered: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#9A9A9A",
    textAlign: "center",
  },
});
