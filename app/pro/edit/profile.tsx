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

const TRADES = ["Plumbing", "Electrical", "HVAC", "Appliance", "Handyman"];

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [base, setBase] = useState<ProProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [trade, setTrade] = useState(TRADES[0]);
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProProfile().then((p) => {
      if (!p) return;
      setBase(p);
      setFullName(p.full_name ?? "");
      setEmail(p.email ?? "");
      setPhone(p.phone ?? "");
      setDisplayName(p.display_name ?? "");
      setTrade(p.trade ?? TRADES[0]);
      setYearsOfExperience(p.years_of_experience != null ? String(p.years_of_experience) : "");
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!base) return;
    setError(null);
    if (!fullName.trim()) { setError("Full name is required."); return; }
    if (!email.trim()) { setError("Email is required."); return; }
    if (!phone.trim()) { setError("Phone is required."); return; }

    setSaving(true);
    try {
      await saveProProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        displayName: displayName.trim() || undefined,
        trade,
        calUsername: base.cal_username ?? undefined,
        consultationPriceCents: base.consultation_price_cents,
        photoUrl: base.photo_url ?? undefined,
        yearsOfExperience: yearsOfExperience.trim() ? Number(yearsOfExperience.trim()) : undefined,
        businessNumber: base.business_number ?? undefined,
        certifications: base.certifications ?? undefined,
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

            <Text style={styles.title}>Edit Profile</Text>
            <Text style={styles.subtitle}>Update your personal and professional details.</Text>

            {loading ? (
              <Text style={styles.loadingText}>Loading…</Text>
            ) : (
              <>
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>Personal Info</Text>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Full legal name</Text>
                    <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Jane Smith" placeholderTextColor="#9A9A9A" autoCapitalize="words" />
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Display name (optional)</Text>
                    <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="e.g. Jane the Plumber" placeholderTextColor="#9A9A9A" autoCapitalize="words" />
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Email</Text>
                    <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#9A9A9A" keyboardType="email-address" autoCapitalize="none" />
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Phone number</Text>
                    <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+1 555 000 0000" placeholderTextColor="#9A9A9A" keyboardType="phone-pad" />
                  </View>
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>Trade</Text>
                  <View style={styles.tradeGrid}>
                    {TRADES.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.tradePill, trade === t && styles.tradePillActive]}
                        onPress={() => setTrade(t)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.tradePillText, trade === t && styles.tradePillTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Years of experience</Text>
                    <TextInput style={styles.input} value={yearsOfExperience} onChangeText={setYearsOfExperience} placeholder="e.g. 8" placeholderTextColor="#9A9A9A" keyboardType="number-pad" />
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
  field: { gap: 4 },
  fieldLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", color: "#9A9A9A" },
  input: { fontSize: 15, color: "#111", paddingVertical: 4 },
  divider: { height: 1, backgroundColor: "rgba(0,0,0,0.06)" },
  tradeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tradePill: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "#F9F8F6", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" },
  tradePillActive: { backgroundColor: "#1A4230", borderColor: "#1A4230" },
  tradePillText: { fontSize: 13, fontWeight: "500", color: "#5A5A5A" },
  tradePillTextActive: { color: "#FFF", fontWeight: "600" },
  errorBanner: { backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12 },
  errorText: { color: "#DC2626", fontSize: 13 },
  saveButton: { backgroundColor: "#1A4230", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
