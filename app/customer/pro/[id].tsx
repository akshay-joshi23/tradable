import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { listPros, ProSummary } from "../../../lib/api";

const TRADE_EMOJI: Record<string, string> = {
  Plumbing: "🚿",
  Electrical: "⚡",
  HVAC: "❄️",
  Appliance: "🔌",
  Handyman: "🔧",
};

export default function CustomerProDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pro, setPro] = useState<ProSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPros()
      .then((pros) => {
        const found = pros.find((p) => p.user_id === id) ?? null;
        if (!found) setError("Pro not found.");
        else setPro(found);
      })
      .catch(() => setError("Failed to load pro details."))
      .finally(() => setLoading(false));
  }, [id]);

  const emoji = pro ? (TRADE_EMOJI[pro.trade] ?? "🔧") : "";
  const name = pro ? (pro.display_name ?? pro.full_name ?? "Pro") : "";
  const price = pro ? `$${Math.round(pro.consultation_price_cents / 100)}` : "";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <AuthGate>
      <RoleGuard requiredRole="customer">
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color="#1A4230" />
              <Text style={styles.backBtnText}>Browse</Text>
            </TouchableOpacity>

            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading…</Text>
              </View>
            ) : error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : pro ? (
              <>
                {/* Hero */}
                <View style={styles.heroSection}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials || emoji}</Text>
                  </View>
                  <Text style={styles.name}>{name}</Text>
                  <View style={styles.tradeBadge}>
                    <Text style={styles.tradeText}>{emoji} {pro.trade}</Text>
                  </View>
                </View>

                {/* Price card */}
                <View style={styles.priceCard}>
                  <Text style={styles.priceAmount}>{price}</Text>
                  <Text style={styles.priceLabel}>per consultation</Text>
                </View>

                {/* Details */}
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>Details</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Specialty</Text>
                    <Text style={styles.detailValue}>{pro.trade}</Text>
                  </View>
                  {pro.years_of_experience != null && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Experience</Text>
                        <Text style={styles.detailValue}>{pro.years_of_experience} years</Text>
                      </View>
                    </>
                  )}
                  {pro.certifications ? (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Certifications</Text>
                        <Text style={[styles.detailValue, styles.detailValueRight]}>
                          {pro.certifications}
                        </Text>
                      </View>
                    </>
                  ) : null}
                </View>

                {/* Book button */}
                {pro.cal_username ? (
                  <View style={styles.bookSection}>
                    <TouchableOpacity
                      style={styles.bookButton}
                      onPress={() => Linking.openURL(`https://cal.com/${pro.cal_username}`)}
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons name="calendar-plus" size={20} color="#FFF" />
                      <Text style={styles.bookButtonText}>Book a Consultation</Text>
                    </TouchableOpacity>
                    <Text style={styles.bookNote}>
                      You'll be taken to their booking page to pick a time.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.emptyBanner}>
                    <Text style={styles.emptyText}>This pro hasn't set up online booking yet.</Text>
                  </View>
                )}
              </>
            ) : null}
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
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  loadingText: {
    color: "#9A9A9A",
    fontSize: 14,
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
  },
  errorText: { color: "#DC2626", fontSize: 14 },
  heroSection: {
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#1A4230",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFF",
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: "#111",
  },
  tradeBadge: {
    backgroundColor: "#EDF2EF",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  tradeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A4230",
  },
  priceCard: {
    backgroundColor: "#1A4230",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -1,
  },
  priceLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 16,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: "#9A9A9A",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 14,
    color: "#5A5A5A",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  detailValueRight: {
    textAlign: "right",
    maxWidth: "55%",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  bookSection: {
    gap: 10,
    marginBottom: 32,
  },
  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A4230",
    borderRadius: 14,
    height: 52,
  },
  bookButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  bookNote: {
    fontSize: 13,
    color: "#9A9A9A",
    textAlign: "center",
  },
  emptyBanner: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#9A9A9A",
    textAlign: "center",
  },
});
