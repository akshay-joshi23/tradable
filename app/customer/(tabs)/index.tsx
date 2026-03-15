import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { Screen } from "../../../components/Screen";
import { listPros, ProSummary } from "../../../lib/api";

const TRADE_EMOJI: Record<string, string> = {
  Plumbing: "🚿",
  Electrical: "⚡",
  HVAC: "❄️",
  Appliance: "🔌",
  Handyman: "🔧",
};

const TRADE_COLOR: Record<string, string> = {
  Plumbing: "#0EA5E9",
  Electrical: "#F59E0B",
  HVAC: "#6366F1",
  Appliance: "#EC4899",
  Handyman: "#059669",
};

const TRADES = ["All", "Plumbing", "Electrical", "HVAC", "Appliance", "Handyman"];

function ProCard({ pro, onPress }: { pro: ProSummary; onPress: () => void }) {
  const emoji = TRADE_EMOJI[pro.trade] ?? "🔧";
  const color = TRADE_COLOR[pro.trade] ?? "#059669";
  const name = pro.display_name ?? pro.full_name ?? "Pro";
  const price = `$${Math.round(pro.consultation_price_cents / 100)}`;
  const exp = pro.years_of_experience != null ? `${pro.years_of_experience} yr exp` : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.avatar, { backgroundColor: color + "18" }]}>
        <Text style={styles.avatarEmoji}>{emoji}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{name}</Text>
        <View style={styles.cardMeta}>
          <View style={[styles.tradeDot, { backgroundColor: color }]} />
          <Text style={[styles.cardTrade, { color }]}>{pro.trade}</Text>
          {exp ? <Text style={styles.separator}>·</Text> : null}
          {exp ? <Text style={styles.cardExp}>{exp}</Text> : null}
        </View>
        {pro.certifications ? (
          <Text style={styles.cardCerts} numberOfLines={1}>{pro.certifications}</Text>
        ) : null}
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardPrice}>{price}</Text>
        <Text style={styles.cardPriceLabel}>per call</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function CustomerHomeTab() {
  const router = useRouter();
  const [pros, setPros] = useState<ProSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState("All");

  const loadPros = useCallback(async (trade?: string) => {
    setError(null);
    setLoading(true);
    try {
      const data = await listPros(trade === "All" ? undefined : trade);
      setPros(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pros.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPros(); }, []);

  const handleTradeSelect = (trade: string) => {
    setSelectedTrade(trade);
    loadPros(trade === "All" ? undefined : trade);
  };

  return (
    <AuthGate>
      <RoleGuard requiredRole="customer">
        <Screen>
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadPros(selectedTrade === "All" ? undefined : selectedTrade)} tintColor="#059669" />}
          >
            <Text style={styles.heading}>Find a Pro</Text>
            <Text style={styles.subheading}>Browse verified professionals</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
              {TRADES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.filterChip, selectedTrade === t && styles.filterChipActive]}
                  onPress={() => handleTradeSelect(t)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterLabel, selectedTrade === t && styles.filterLabelActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#059669" size="small" />
              </View>
            ) : pros.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No pros found</Text>
                <Text style={styles.emptySubtitle}>Try a different trade or check back later.</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {pros.map((pro) => (
                  <ProCard
                    key={pro.user_id}
                    pro={pro}
                    onPress={() => router.push(`/customer/pro/${pro.user_id}`)}
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
    marginBottom: 20,
  },
  filterScroll: {
    marginBottom: 20,
    flexGrow: 0,
  },
  filterContent: {
    gap: 8,
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  filterLabelActive: {
    color: "#FFFFFF",
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarEmoji: { fontSize: 20 },
  cardBody: { flex: 1, gap: 3 },
  cardName: { fontSize: 15, fontWeight: "600", color: "#0F172A" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  tradeDot: { width: 5, height: 5, borderRadius: 3 },
  cardTrade: { fontSize: 12, fontWeight: "600" },
  separator: { fontSize: 12, color: "#CBD5E1" },
  cardExp: { fontSize: 12, color: "#64748B" },
  cardCerts: { fontSize: 12, color: "#94A3B8" },
  cardRight: { alignItems: "flex-end", gap: 1 },
  cardPrice: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  cardPriceLabel: { fontSize: 11, color: "#94A3B8" },
  chevron: { fontSize: 20, color: "#CBD5E1", marginLeft: -4 },
});
