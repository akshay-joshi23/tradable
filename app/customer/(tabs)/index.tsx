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

const TRADES = ["All", "Plumbing", "Electrical", "HVAC", "Appliance", "Handyman"];

function ProCard({ pro, onPress }: { pro: ProSummary; onPress: () => void }) {
  const emoji = TRADE_EMOJI[pro.trade] ?? "🔧";
  const name = pro.display_name ?? pro.full_name ?? "Pro";
  const price = `$${Math.round(pro.consultation_price_cents / 100)}`;
  const exp = pro.years_of_experience != null ? `${pro.years_of_experience} yrs exp` : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardAvatar}>
        <Text style={styles.cardAvatarEmoji}>{emoji}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{name}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardTrade}>{pro.trade}</Text>
          {exp ? <Text style={styles.cardDot}>·</Text> : null}
          {exp ? <Text style={styles.cardExp}>{exp}</Text> : null}
        </View>
        {pro.certifications ? (
          <Text style={styles.cardCerts} numberOfLines={1}>{pro.certifications}</Text>
        ) : null}
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardPrice}>{price}</Text>
        <Text style={styles.cardPriceLabel}>/ call</Text>
        <Text style={styles.cardChevron}>›</Text>
      </View>
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
            refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadPros(selectedTrade === "All" ? undefined : selectedTrade)} tintColor="#065F46" />}
          >
            <Text style={styles.heading}>Find a Pro</Text>
            <Text style={styles.subheading}>Browse verified professionals</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {TRADES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.filterChip, selectedTrade === t && styles.filterChipActive]}
                  onPress={() => handleTradeSelect(t)}
                  activeOpacity={0.7}
                >
                  {t !== "All" ? <Text style={styles.filterEmoji}>{TRADE_EMOJI[t]}</Text> : null}
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
                <ActivityIndicator color="#065F46" />
                <Text style={styles.loadingText}>Finding pros...</Text>
              </View>
            ) : pros.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🔍</Text>
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
  heading: { fontSize: 26, fontWeight: "700", color: "#064E3B", letterSpacing: -0.5, marginTop: 8 },
  subheading: { fontSize: 14, color: "#475569", marginTop: 2, marginBottom: 16 },
  filterScroll: { marginBottom: 20 },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#FFFFFF", borderRadius: 20, paddingVertical: 8,
    paddingHorizontal: 14, marginRight: 8,
    borderWidth: 1.5, borderColor: "#D1FAE5",
  },
  filterChipActive: { backgroundColor: "#D1FAE5", borderColor: "#065F46" },
  filterEmoji: { fontSize: 13 },
  filterLabel: { fontSize: 13, fontWeight: "600", color: "#94A3B8" },
  filterLabelActive: { color: "#065F46" },
  errorBanner: { backgroundColor: "#FEF2F2", borderRadius: 12, padding: 14, marginBottom: 16 },
  errorText: { color: "#DC2626", fontSize: 14 },
  loadingContainer: { alignItems: "center", paddingVertical: 60, gap: 12 },
  loadingText: { color: "#475569", fontSize: 14 },
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: "#0F172A" },
  emptySubtitle: { fontSize: 14, color: "#475569", marginTop: 4, textAlign: "center", paddingHorizontal: 32 },
  list: {
    borderRadius: 16, backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "#D1FAE5", overflow: "hidden",
  },
  card: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#F0FDF4",
  },
  cardAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "#D1FAE5", alignItems: "center",
    justifyContent: "center", marginRight: 14,
  },
  cardAvatarEmoji: { fontSize: 22 },
  cardBody: { flex: 1, gap: 3 },
  cardName: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  cardTrade: { fontSize: 12, fontWeight: "600", color: "#065F46" },
  cardDot: { fontSize: 12, color: "#A7F3D0" },
  cardExp: { fontSize: 12, color: "#475569" },
  cardCerts: { fontSize: 12, color: "#94A3B8" },
  cardRight: { alignItems: "flex-end", gap: 2, marginLeft: 8 },
  cardPrice: { fontSize: 16, fontWeight: "700", color: "#064E3B" },
  cardPriceLabel: { fontSize: 11, color: "#94A3B8" },
  cardChevron: { fontSize: 20, color: "#A7F3D0", lineHeight: 24, marginTop: 2 },
});
