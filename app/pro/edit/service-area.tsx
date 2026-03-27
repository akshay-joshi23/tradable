import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { getProProfile, saveProProfile } from "../../../lib/api";
import { ProProfile } from "../../../lib/types";

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

export default function EditServiceAreaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [base, setBase] = useState<ProProfile | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"pending" | "granted" | "denied">("pending");
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProProfile().then((p) => {
      if (!p) return;
      setBase(p);
      if (p.latitude != null && p.longitude != null) {
        setLocation({ latitude: p.latitude, longitude: p.longitude });
      }
      setRadiusMiles(p.service_radius_miles ?? 25);
    }).finally(() => setLoading(false));
  }, []);

  const handleRefreshLocation = async () => {
    setLocationStatus("pending");
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") { setLocationStatus("denied"); return; }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    setLocationStatus("granted");
  };

  const handleSave = async () => {
    if (!base) return;
    setError(null);
    setSaving(true);
    try {
      await saveProProfile({
        fullName: base.full_name ?? "",
        email: base.email ?? "",
        phone: base.phone ?? "",
        trade: base.trade,
        calUsername: base.cal_username ?? undefined,
        consultationPriceCents: base.consultation_price_cents,
        photoUrl: base.photo_url ?? undefined,
        yearsOfExperience: base.years_of_experience ?? undefined,
        businessNumber: base.business_number ?? undefined,
        certifications: base.certifications ?? undefined,
        location: location ?? undefined,
        serviceRadiusMiles: radiusMiles,
      });
      setSaved(true);
      setTimeout(() => router.back(), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGate>
      <RoleGuard requiredRole="pro">
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <MaterialCommunityIcons name="arrow-left" size={18} color="#1A4230" />
              <Text style={styles.backBtnText}>Account</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Service Area</Text>
            <Text style={styles.subtitle}>
              Set your location and how far you're willing to travel for onsite visits. You'll only see requests within this radius.
            </Text>

            {loading ? (
              <Text style={styles.loadingText}>Loading…</Text>
            ) : (
              <>
                {/* Location */}
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>Your Location</Text>

                  {location ? (
                    <View style={styles.locationRow}>
                      <View style={styles.locationIconBox}>
                        <MaterialCommunityIcons name="map-marker" size={18} color="#1A4230" />
                      </View>
                      <View style={styles.locationInfo}>
                        <Text style={styles.locationCaptured}>Location captured</Text>
                        <Text style={styles.locationCoords}>
                          {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                        </Text>
                      </View>
                      <View style={styles.locationDot} />
                    </View>
                  ) : (
                    <View style={styles.locationRow}>
                      <View style={[styles.locationIconBox, styles.locationIconBoxGray]}>
                        <MaterialCommunityIcons name="map-marker-off-outline" size={18} color="#9A9A9A" />
                      </View>
                      <Text style={styles.locationMissing}>No location set</Text>
                    </View>
                  )}

                  {locationStatus === "denied" ? (
                    <View style={styles.warningRow}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#D97706" />
                      <Text style={styles.warningText}>
                        Location permission denied. Enable it in Settings.
                      </Text>
                    </View>
                  ) : null}

                  <TouchableOpacity style={styles.refreshBtn} onPress={handleRefreshLocation} activeOpacity={0.75}>
                    <MaterialCommunityIcons name="crosshairs-gps" size={15} color="#1A4230" />
                    <Text style={styles.refreshBtnText}>
                      {locationStatus === "pending" ? "Getting location…" : "Refresh my location"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Radius */}
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>Service Radius</Text>
                  <Text style={styles.helperText}>
                    You'll only be shown requests within this distance from your location.
                  </Text>
                  <View style={styles.radiusGrid}>
                    {RADIUS_OPTIONS.map((miles) => (
                      <TouchableOpacity
                        key={miles}
                        style={[styles.radiusPill, radiusMiles === miles && styles.radiusPillActive]}
                        onPress={() => setRadiusMiles(miles)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.radiusPillText, radiusMiles === miles && styles.radiusPillTextActive]}>
                          {miles} mi
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.radiusNote}>
                    <MaterialCommunityIcons name="information-outline" size={14} color="#9A9A9A" />
                    <Text style={styles.radiusNoteText}>
                      Requests without a location are always shown regardless of radius.
                    </Text>
                  </View>
                </View>

                {error && <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>}

                <TouchableOpacity
                  style={[styles.saveButton, (saving || saved) && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving || saved}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveButtonText}>
                    {saved ? "Saved!" : saving ? "Saving…" : "Save changes"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F2EE" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: 12, gap: 12 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 4 },
  backBtnText: { fontSize: 14, fontWeight: "600", color: "#1A4230" },
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.9, color: "#111" },
  subtitle: { fontSize: 14, color: "#5A5A5A", lineHeight: 20, marginBottom: 8 },
  loadingText: { color: "#9A9A9A", fontSize: 14 },
  card: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2, gap: 12 },
  sectionLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.7, textTransform: "uppercase", color: "#9A9A9A" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#EDF2EF", borderRadius: 10, padding: 12 },
  locationIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  locationIconBoxGray: { backgroundColor: "#F4F2EE" },
  locationInfo: { flex: 1 },
  locationCaptured: { fontSize: 13, fontWeight: "600", color: "#1A4230" },
  locationCoords: { fontSize: 11, color: "#9A9A9A", marginTop: 1 },
  locationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#1A4230", flexShrink: 0 },
  locationMissing: { flex: 1, fontSize: 13, color: "#9A9A9A" },
  warningRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  warningText: { fontSize: 12, color: "#D97706", flex: 1 },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: "#1A4230" },
  refreshBtnText: { fontSize: 13, fontWeight: "500", color: "#1A4230" },
  helperText: { fontSize: 13, color: "#9A9A9A", lineHeight: 18, marginTop: -4 },
  radiusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  radiusPill: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999, backgroundColor: "#F9F8F6", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" },
  radiusPillActive: { backgroundColor: "#1A4230", borderColor: "#1A4230" },
  radiusPillText: { fontSize: 13, fontWeight: "500", color: "#5A5A5A" },
  radiusPillTextActive: { color: "#FFF", fontWeight: "600" },
  radiusNote: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  radiusNoteText: { flex: 1, fontSize: 12, color: "#9A9A9A", lineHeight: 17 },
  errorBanner: { backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12 },
  errorText: { color: "#DC2626", fontSize: 13 },
  saveButton: { backgroundColor: "#1A4230", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
