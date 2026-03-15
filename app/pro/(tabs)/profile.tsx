import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { Screen } from "../../../components/Screen";
import { getProProfile } from "../../../lib/api";
import { useRole } from "../../../lib/role";
import { supabase } from "../../../lib/supabase";
import { ProProfile } from "../../../lib/types";

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ProfileTab() {
  const router = useRouter();
  const { clearRole } = useRole();
  const [profile, setProfile] = useState<ProProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    getProProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      await clearRole();
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      setSigningOut(false);
    }
  };

  const emoji = profile ? (TRADE_EMOJI[profile.trade] ?? "🔧") : "";
  const tradeColor = profile ? (TRADE_COLOR[profile.trade] ?? "#059669") : "#059669";
  const priceFormatted = profile
    ? `$${(profile.consultation_price_cents / 100).toFixed(0)}`
    : "";
  const displayName = profile ? (profile.display_name ?? profile.full_name ?? "Pro") : "";

  return (
    <AuthGate>
      <RoleGuard requiredRole="pro">
        <Screen>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.heading}>Profile</Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#059669" size="small" />
              </View>
            ) : profile ? (
              <>
                <View style={styles.profileHeader}>
                  <View style={[styles.avatar, { backgroundColor: tradeColor + "18" }]}>
                    <Text style={styles.avatarEmoji}>{emoji}</Text>
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.name}>{displayName}</Text>
                    <View style={styles.tradeBadge}>
                      <View style={[styles.tradeDot, { backgroundColor: tradeColor }]} />
                      <Text style={[styles.tradeLabel, { color: tradeColor }]}>{profile.trade}</Text>
                    </View>
                  </View>
                  <View style={styles.rateBox}>
                    <Text style={styles.rateAmount}>{priceFormatted}</Text>
                    <Text style={styles.rateLabel}>per call</Text>
                  </View>
                </View>

                <Text style={styles.sectionLabel}>Account Details</Text>
                <View style={styles.card}>
                  <InfoRow label="Email" value={profile.email ?? "—"} />
                  <View style={styles.divider} />
                  <InfoRow label="Phone" value={profile.phone ?? "—"} />
                  {profile.years_of_experience != null && (
                    <>
                      <View style={styles.divider} />
                      <InfoRow label="Experience" value={`${profile.years_of_experience} years`} />
                    </>
                  )}
                  {profile.cal_username ? (
                    <>
                      <View style={styles.divider} />
                      <InfoRow label="Cal.com" value={`@${profile.cal_username}`} />
                    </>
                  ) : null}
                  {profile.service_radius_miles != null && (
                    <>
                      <View style={styles.divider} />
                      <InfoRow label="Service radius" value={`${profile.service_radius_miles} mi`} />
                    </>
                  )}
                </View>

                <Button
                  mode="outlined"
                  onPress={() => router.push("/pro/setup")}
                  style={styles.editButton}
                  contentStyle={styles.buttonContent}
                  icon="pencil-outline"
                  textColor="#059669"
                >
                  Edit Profile
                </Button>
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Profile not set up</Text>
                <Text style={styles.emptySubtitle}>Complete your profile to start taking jobs.</Text>
                <Button
                  mode="contained"
                  onPress={() => router.push("/pro/setup")}
                  style={styles.setupButton}
                  contentStyle={styles.buttonContent}
                  buttonColor="#059669"
                >
                  Complete Setup
                </Button>
              </View>
            )}

            <View style={styles.signOutRow}>
              <Button
                mode="text"
                onPress={handleSignOut}
                loading={signingOut}
                labelStyle={styles.signOutLabel}
                icon="logout"
              >
                Sign Out
              </Button>
            </View>
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
    marginBottom: 24,
  },
  loadingContainer: { alignItems: "center", paddingVertical: 60 },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarEmoji: { fontSize: 24 },
  profileInfo: { flex: 1, gap: 4 },
  name: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  tradeBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  tradeDot: { width: 5, height: 5, borderRadius: 3 },
  tradeLabel: { fontSize: 12, fontWeight: "600" },
  rateBox: { alignItems: "flex-end" },
  rateAmount: { fontSize: 20, fontWeight: "700", color: "#0F172A" },
  rateLabel: { fontSize: 11, color: "#94A3B8" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: { fontSize: 14, color: "#64748B" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#0F172A", maxWidth: "60%", textAlign: "right" },
  divider: { height: 1, backgroundColor: "#F1F5F9" },
  editButton: {
    borderRadius: 10,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  buttonContent: { height: 46 },
  emptyContainer: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
  emptySubtitle: { fontSize: 14, color: "#64748B", textAlign: "center" },
  setupButton: { borderRadius: 10, marginTop: 8 },
  signOutRow: { alignItems: "center", marginTop: 8, marginBottom: 40 },
  signOutLabel: { color: "#94A3B8", fontSize: 14 },
});
