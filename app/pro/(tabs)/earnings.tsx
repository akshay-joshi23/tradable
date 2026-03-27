import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { getProProfile, listProCalls, ProCall } from "../../../lib/api";
import { ProProfile } from "../../../lib/types";

type Period = "week" | "month" | "year";

export default function EarningsTab() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>("week");
  const [profile, setProfile] = useState<ProProfile | null>(null);
  const [calls, setCalls] = useState<ProCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProProfile(), listProCalls()])
      .then(([p, cs]) => {
        setProfile(p);
        setCalls(cs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pricePerCall = profile ? profile.consultation_price_cents * 0.95 : 0;

  const now = Date.now();
  const cutoff = period === "week" ? 7 * 86400000 : period === "month" ? 30 * 86400000 : 365 * 86400000;
  const periodCalls = calls.filter((c) => now - new Date(c.created_at).getTime() <= cutoff);
  const completedCalls = periodCalls.filter((c) => c.outcome);
  const totalEarnings = Math.round((completedCalls.length * pricePerCall) / 100);
  const avgPerJob = completedCalls.length > 0 ? Math.round(totalEarnings / completedCalls.length) : 0;
  const periodLabel = period === "week" ? "THIS WEEK" : period === "month" ? "THIS MONTH" : "THIS YEAR";

  const nextPayDate = (() => {
    const d = new Date();
    const friday = 5;
    const daysUntilFriday = (friday - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilFriday);
    return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  })();

  return (
    <AuthGate>
      <RoleGuard requiredRole="pro">
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>Earnings</Text>

          {/* Period Selector */}
          <View style={styles.periodRow}>
            {(["week", "month", "year"] as Period[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodPill, period === p && styles.periodPillActive]}
                onPress={() => setPeriod(p)}
                activeOpacity={0.7}
              >
                <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#1A4230" />
            </View>
          ) : (
            <>
              {/* Summary Card */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryPeriodLabel}>{periodLabel}</Text>
                <Text style={styles.summaryAmount}>${totalEarnings.toLocaleString()}</Text>
                <Text style={styles.summaryJobCount}>{completedCalls.length} jobs completed</Text>
                <View style={styles.summaryPills}>
                  <View style={styles.summaryPill}>
                    <Text style={styles.summaryPillText}>
                      Avg ${avgPerJob}/job
                    </Text>
                  </View>
                  <View style={styles.summaryPill}>
                    <Text style={styles.summaryPillText}>
                      {completedCalls.length > 0 ? "100%" : "—"} completion
                    </Text>
                  </View>
                </View>
              </View>

              {/* Breakdown */}
              <Text style={styles.sectionLabel}>BREAKDOWN</Text>
              {completedCalls.length === 0 ? (
                <View style={styles.emptyCard}>
                  <MaterialCommunityIcons name="cash-remove" size={32} color="#9A9A9A" />
                  <Text style={styles.emptyText}>No earnings for this period</Text>
                </View>
              ) : (
                <View style={styles.breakdownCard}>
                  {completedCalls.map((call, idx) => {
                    const amount = Math.round(pricePerCall / 100);
                    const date = new Date(call.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    });
                    return (
                      <View
                        key={call.id}
                        style={[styles.breakdownRow, idx < completedCalls.length - 1 && styles.breakdownRowBorder]}
                      >
                        <View>
                          <Text style={styles.breakdownTitle} numberOfLines={1}>
                            {call.trade} Consultation
                          </Text>
                          <Text style={styles.breakdownMeta}>{date}</Text>
                        </View>
                        <Text style={styles.breakdownAmount}>${amount}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Payout Card */}
              <View style={styles.payoutCard}>
                <Text style={styles.payoutLabel}>NEXT PAYOUT</Text>
                <View style={styles.payoutRow}>
                  <Text style={styles.payoutDate}>{nextPayDate}</Text>
                  <Text style={styles.payoutAmount}>${totalEarnings.toLocaleString()}.00</Text>
                </View>
                <Text style={styles.payoutSub}>
                  {profile?.stripe_onboarding_complete
                    ? "Depositing to your connected bank account"
                    : "Connect a bank account to receive payouts"}
                </Text>
                {!profile?.stripe_onboarding_complete && (
                  <View style={styles.payoutWarning}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#D97706" />
                    <Text style={styles.payoutWarningText}>
                      Go to Account → Payments to set up payouts
                    </Text>
                  </View>
                )}
              </View>
            </>
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
  periodRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  periodPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
  },
  periodPillActive: {
    backgroundColor: "#1A4230",
    borderColor: "transparent",
  },
  periodText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111111",
  },
  periodTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  centered: {
    alignItems: "center",
    paddingVertical: 60,
  },
  summaryCard: {
    backgroundColor: "#1A4230",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  summaryPeriodLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.7,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1.08,
    color: "#FFFFFF",
    marginBottom: 6,
  },
  summaryJobCount: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 16,
  },
  summaryPills: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  summaryPill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  summaryPillText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.7,
    color: "#9A9A9A",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
    ...CARD_SHADOW,
  },
  emptyText: {
    fontSize: 14,
    color: "#9A9A9A",
  },
  breakdownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 24,
    ...CARD_SHADOW,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  breakdownRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111111",
    marginBottom: 2,
    maxWidth: 220,
  },
  breakdownMeta: {
    fontSize: 11,
    color: "#9A9A9A",
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5A5A5A",
  },
  payoutCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    gap: 4,
    ...CARD_SHADOW,
  },
  payoutLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: "#9A9A9A",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  payoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  payoutDate: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
  },
  payoutAmount: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.66,
    color: "#1A4230",
  },
  payoutSub: {
    fontSize: 12,
    color: "#9A9A9A",
    marginBottom: 8,
  },
  payoutWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  payoutWarningText: {
    fontSize: 12,
    color: "#D97706",
    flex: 1,
  },
});
