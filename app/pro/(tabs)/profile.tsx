import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { Screen } from "../../../components/Screen";
import { getProProfile } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
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
  const priceFormatted = profile
    ? `$${(profile.consultation_price_cents / 100).toFixed(0)} / consultation`
    : "";

  return (
    <AuthGate>
      <RoleGuard requiredRole="pro">
        <Screen>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.heading}>Profile</Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#065F46" />
              </View>
            ) : profile ? (
              <>
                <View style={styles.avatar}>
                  <Text style={styles.avatarEmoji}>{emoji}</Text>
                </View>
                <Text style={styles.name}>{profile.display_name ?? profile.full_name ?? "Pro"}</Text>
                <Text style={styles.trade}>{profile.trade}</Text>

                <View style={styles.card}>
                  <InfoRow label="Email" value={profile.email ?? "—"} />
                  <View style={styles.divider} />
                  <InfoRow label="Phone" value={profile.phone ?? "—"} />
                  <View style={styles.divider} />
                  <InfoRow label="Rate" value={priceFormatted} />
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
                >
                  Edit Profile
                </Button>
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>👤</Text>
                <Text style={styles.emptyTitle}>Profile not set up</Text>
                <Button
                  mode="contained"
                  onPress={() => router.push("/pro/setup")}
                  style={styles.setupButton}
                  contentStyle={styles.buttonContent}
                >
                  Complete Setup
                </Button>
              </View>
            )}

            <Button
              mode="text"
              onPress={handleSignOut}
              loading={signingOut}
              style={styles.signOutButton}
              labelStyle={styles.signOutLabel}
              icon="logout"
            >
              Sign Out
            </Button>
          </ScrollView>
        </Screen>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 26, fontWeight: "700", color: "#064E3B", letterSpacing: -0.5, marginTop: 8, marginBottom: 20 },
  loadingContainer: { alignItems: "center", paddingVertical: 60 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  avatarEmoji: { fontSize: 32 },
  name: { fontSize: 20, fontWeight: "700", color: "#0F172A", textAlign: "center" },
  trade: { fontSize: 14, color: "#065F46", fontWeight: "600", textAlign: "center", marginBottom: 24, marginTop: 2 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    overflow: "hidden",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: { fontSize: 14, color: "#475569" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#0F172A", maxWidth: "60%", textAlign: "right" },
  divider: { height: 1, backgroundColor: "#F0FDF4" },
  editButton: { borderRadius: 10, borderColor: "#D1FAE5", marginBottom: 8 },
  buttonContent: { height: 46 },
  emptyContainer: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, color: "#475569" },
  setupButton: { borderRadius: 10, marginTop: 4 },
  signOutButton: { marginTop: 16, marginBottom: 8 },
  signOutLabel: { color: "#DC2626", fontSize: 14 },
});
