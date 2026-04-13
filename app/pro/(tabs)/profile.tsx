import { useRouter, useFocusEffect } from "expo-router";
import { Linking } from "react-native";
import { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import {
  getProProfile,
  getStripeConnectOnboardingUrl,
  getStripeConnectStatus,
  listProCalls,
  saveProProfile,
  uploadAvatar,
  updateProPhotoUrl,
} from "../../../lib/api";
import { useRole } from "../../../lib/role";
import { useAuth } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";
import { ProProfile } from "../../../lib/types";

type MenuRow = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  sub?: string;
  onPress: () => void;
};

function MenuSection({ title, rows }: { title: string; rows: MenuRow[] }) {
  return (
    <View style={styles.menuSection}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.menuCard}>
        {rows.map((row, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.menuRow, idx < rows.length - 1 && styles.menuRowBorder]}
            onPress={row.onPress}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name={row.icon} size={16} color="#9A9A9A" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.menuRowLabel}>{row.label}</Text>
              {row.sub && <Text style={styles.menuRowSub}>{row.sub}</Text>}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={16} color="#9A9A9A" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function ProfileTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clearRole } = useRole();
  const { session } = useAuth();
  const [profile, setProfile] = useState<ProProfile | null>(null);
  const [callCount, setCallCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const loadProfile = useCallback(() => {
    setLoading(true);
    Promise.all([getProProfile(), listProCalls()])
      .then(([p, cs]) => {
        setProfile(p);
        setCallCount(cs.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(loadProfile);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const userId = session?.user?.id;
    if (!userId) return;

    setUploadingPhoto(true);
    try {
      const url = await uploadAvatar(result.assets[0].uri, userId);
      await updateProPhotoUrl(url);
      setProfile((prev) => prev ? { ...prev, photo_url: url } : prev);
    } catch (err) {
      console.error("Photo upload failed:", err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleConnectStripe = async () => {
    try {
      const url = await getStripeConnectOnboardingUrl();
      await Linking.openURL(url);
    } catch {
      // handled silently; user stays on screen
    }
  };

  const handleDevFill = async () => {
    try {
      await saveProProfile({
        fullName: "Akshay Joshi",
        displayName: "Test Pro",
        email: "test-pro@tradable.dev",
        phone: "+15550000002",
        trade: "Plumbing",
        calUsername: "akshay-joshi-g4ybmy",
        consultationPriceCents: 7500,
        yearsOfExperience: 10,
        certifications: "Master Plumber · Licensed & Insured",
        serviceRadiusMiles: 25,
      });
      loadProfile();
    } catch {}
  };

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

  const displayName = profile ? (profile.display_name ?? profile.full_name ?? "Pro") : "Pro";
  const initials = displayName.slice(0, 2).toUpperCase();
  const yearsExp = profile?.years_of_experience;

  const consultationPriceLabel = profile?.consultation_price_cents
    ? `$${Math.round(profile.consultation_price_cents / 100)} / consultation`
    : undefined;

  const profileRows: MenuRow[] = [
    { icon: "pencil-outline", label: "Edit profile", onPress: () => router.push("/pro/edit/profile") },
    { icon: "certificate-outline", label: "Certifications", sub: profile?.certifications ?? undefined, onPress: () => router.push("/pro/edit/certifications") },
    { icon: "map-marker-radius-outline", label: "Service area", sub: profile?.service_radius_miles ? `${profile.service_radius_miles} mi radius` : undefined, onPress: () => router.push("/pro/edit/service-area") },
    { icon: "currency-usd", label: "Consultation fee", sub: consultationPriceLabel, onPress: () => router.push("/pro/edit/fee") },
  ];

  const paymentRows: MenuRow[] = [
    {
      icon: "bank-outline",
      label: "Bank account",
      sub: profile?.stripe_onboarding_complete ? "Connected" : "Not connected",
      onPress: handleConnectStripe,
    },
  ];

  const legalRows: MenuRow[] = [
    {
      icon: "shield-outline",
      label: "Privacy Policy",
      onPress: () => Linking.openURL("https://jointradable.com/privacypolicy"),
    },
  ];

  return (
    <AuthGate>
      <RoleGuard requiredRole="pro">
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#1A4230" />
            </View>
          ) : (
            <>
              {/* Profile Header */}
              <View style={styles.profileHeader}>
                <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8} style={styles.avatarWrapper}>
                  {profile?.photo_url ? (
                    <Image source={{ uri: profile.photo_url }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                  )}
                  {uploadingPhoto ? (
                    <View style={styles.avatarOverlay}>
                      <ActivityIndicator size="small" color="#FFF" />
                    </View>
                  ) : (
                    <View style={styles.avatarEditBadge}>
                      <MaterialCommunityIcons name="camera" size={12} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
                <View style={styles.profileInfo}>
                  <Text style={styles.displayName}>{displayName}</Text>
                  <Text style={styles.trade}>{profile?.trade ?? ""}</Text>
                  <Text style={styles.email}>{profile?.email ?? ""}</Text>
                </View>
              </View>

              {/* Dev autofill */}
              <TouchableOpacity style={styles.devBanner} onPress={handleDevFill} activeOpacity={0.8}>
                <Text style={styles.devBannerText}>⚡ Autofill profile with test data</Text>
              </TouchableOpacity>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>4.8</Text>
                  <Text style={styles.statLabel}>RATING</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{callCount}</Text>
                  <Text style={styles.statLabel}>JOBS</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{yearsExp != null ? `${yearsExp}yr` : "—"}</Text>
                  <Text style={styles.statLabel}>EXPERIENCE</Text>
                </View>
              </View>

              {/* Pro Status Card */}
              <View style={styles.statusCard}>
                <Text style={styles.sectionLabel}>PRO STATUS</Text>
                <Text style={styles.statusTitle}>
                  {profile?.stripe_onboarding_complete ? "Active & Verified" : "Setup incomplete"}
                </Text>
                <Text style={styles.statusSub}>
                  {profile?.stripe_onboarding_complete
                    ? "License verified · Background checked · Insured"
                    : "Complete bank setup to start receiving payouts"}
                </Text>
              </View>

              <MenuSection title="MY PROFILE" rows={profileRows} />
              <MenuSection title="PAYMENTS" rows={paymentRows} />
              <MenuSection title="LEGAL" rows={legalRows} />

              {/* Log Out */}
              <TouchableOpacity
                style={styles.logoutCard}
                onPress={handleSignOut}
                disabled={signingOut}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutText}>{signingOut ? "Signing out…" : "Log out"}</Text>
              </TouchableOpacity>

              <Text style={styles.version}>Tradable v1.0</Text>
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
  centered: {
    alignItems: "center",
    paddingVertical: 80,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingBottom: 24,
    marginBottom: 4,
  },
  avatarWrapper: {
    width: 56,
    height: 56,
    flexShrink: 0,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1A4230",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarOverlay: {
    position: "absolute",
    inset: 0,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1A4230",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#F4F2EE",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  displayName: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.44,
    color: "#111111",
  },
  trade: {
    fontSize: 13,
    fontWeight: "400",
    color: "#5A5A5A",
  },
  email: {
    fontSize: 12,
    fontWeight: "400",
    color: "#9A9A9A",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#F9F8F6",
    borderRadius: 14,
    marginBottom: 24,
    overflow: "hidden",
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
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
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    gap: 4,
    ...CARD_SHADOW,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.7,
    color: "#9A9A9A",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A4230",
  },
  statusSub: {
    fontSize: 12,
    color: "#9A9A9A",
  },
  menuSection: {
    marginBottom: 24,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    ...CARD_SHADOW,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  menuRowLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111111",
  },
  menuRowSub: {
    fontSize: 12,
    color: "#9A9A9A",
    marginTop: 1,
  },
  logoutCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    marginBottom: 12,
    ...CARD_SHADOW,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#CC2C2C",
  },
  version: {
    textAlign: "center",
    fontSize: 10,
    color: "#9A9A9A",
    paddingBottom: 8,
  },
  devBanner: {
    backgroundColor: "#FFF9C4",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F0E060",
  },
  devBannerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7A6500",
  },
});
