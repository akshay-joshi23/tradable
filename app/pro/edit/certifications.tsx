import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { getProProfile, saveProProfile } from "../../../lib/api";
import { ProProfile } from "../../../lib/types";

export default function EditCertificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [base, setBase] = useState<ProProfile | null>(null);
  const [certifications, setCertifications] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProProfile().then((p) => {
      if (!p) return;
      setBase(p);
      setCertifications(p.certifications ?? "");
      setBusinessNumber(p.business_number ?? "");
    }).finally(() => setLoading(false));
  }, []);

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
        businessNumber: businessNumber.trim() || undefined,
        certifications: certifications.trim() || undefined,
        location: base.latitude != null && base.longitude != null
          ? { latitude: base.latitude, longitude: base.longitude }
          : undefined,
        serviceRadiusMiles: base.service_radius_miles ?? undefined,
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
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <MaterialCommunityIcons name="arrow-left" size={18} color="#1A4230" />
              <Text style={styles.backBtnText}>Account</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Certifications</Text>
            <Text style={styles.subtitle}>
              Add your credentials to build trust with customers. These appear on your public profile.
            </Text>

            {loading ? (
              <Text style={styles.loadingText}>Loading…</Text>
            ) : (
              <>
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>Your Credentials</Text>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Certifications</Text>
                    <TextInput
                      style={styles.textarea}
                      value={certifications}
                      onChangeText={setCertifications}
                      placeholder="e.g. EPA 608, Red Seal, HVAC Excellence Certified"
                      placeholderTextColor="#9A9A9A"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                    <Text style={styles.fieldHint}>Separate multiple certifications with commas.</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Business / License number</Text>
                    <TextInput
                      style={styles.input}
                      value={businessNumber}
                      onChangeText={setBusinessNumber}
                      placeholder="e.g. BN123456789"
                      placeholderTextColor="#9A9A9A"
                    />
                    <Text style={styles.fieldHint}>Optional — used for verification purposes.</Text>
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
  field: { gap: 6 },
  fieldLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", color: "#9A9A9A" },
  input: { fontSize: 15, color: "#111", paddingVertical: 4 },
  textarea: { fontSize: 14, color: "#111", backgroundColor: "#F9F8F6", borderRadius: 10, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", padding: 12, minHeight: 80, lineHeight: 20 },
  fieldHint: { fontSize: 12, color: "#9A9A9A", lineHeight: 17 },
  divider: { height: 1, backgroundColor: "rgba(0,0,0,0.06)" },
  errorBanner: { backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12 },
  errorText: { color: "#DC2626", fontSize: 13 },
  saveButton: { backgroundColor: "#1A4230", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
