import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { getProProfile, updateConsultationFee } from "../../../lib/api";

const QUICK_AMOUNTS = [25, 50, 75, 100, 150];

export default function EditFeeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProProfile()
      .then((p) => {
        if (p && p.consultation_price_cents > 0) {
          setPrice(String(Math.round(p.consultation_price_cents / 100)));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const priceNum = parseFloat(price) || 0;
  const platformFee = priceNum * 0.05;
  const youReceive = priceNum - platformFee;

  const handleSave = async () => {
    setError(null);
    if (priceNum < 1) { setError("Please enter a valid price."); return; }
    setSaving(true);
    try {
      await updateConsultationFee(Math.round(priceNum * 100));
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

            <Text style={styles.title}>Consultation Fee</Text>
            <Text style={styles.subtitle}>
              Set what customers pay per video consultation. Tradable takes a 5% platform fee.
            </Text>

            {loading ? (
              <Text style={styles.loadingText}>Loading…</Text>
            ) : (
              <>
                {/* Price input */}
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>Your Price</Text>
                  <View style={styles.priceInputRow}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={price}
                      onChangeText={(v) => { setPrice(v); setSaved(false); }}
                      placeholder="0"
                      placeholderTextColor="#9A9A9A"
                      keyboardType="decimal-pad"
                      autoFocus
                    />
                    <Text style={styles.perLabel}>per consultation</Text>
                  </View>

                  <View style={styles.quickRow}>
                    {QUICK_AMOUNTS.map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        style={[styles.quickPill, priceNum === amt && styles.quickPillActive]}
                        onPress={() => { setPrice(String(amt)); setSaved(false); }}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.quickPillText, priceNum === amt && styles.quickPillTextActive]}>
                          ${amt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Breakdown */}
                {priceNum > 0 && (
                  <View style={styles.breakdownCard}>
                    <Text style={styles.sectionLabel}>Earnings Breakdown</Text>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Customer pays</Text>
                      <Text style={styles.breakdownValue}>${priceNum.toFixed(2)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Platform fee (5%)</Text>
                      <Text style={styles.breakdownValue}>−${platformFee.toFixed(2)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.breakdownRow}>
                      <Text style={[styles.breakdownLabel, styles.breakdownLabelBold]}>You receive</Text>
                      <Text style={[styles.breakdownValue, styles.breakdownValueGreen]}>
                        ${youReceive.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Info */}
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="information-outline" size={14} color="#9A9A9A" />
                  <Text style={styles.infoText}>
                    The industry average is $50–$100 per consultation. Price too high and customers may pass; too low and it undervalues your expertise.
                  </Text>
                </View>

                {error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.saveButton, (saving || saved || priceNum < 1) && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving || saved || priceNum < 1}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveButtonText}>
                    {saved ? "Saved!" : saving ? "Saving…" : "Save fee"}
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
  card: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2, gap: 16 },
  sectionLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.7, textTransform: "uppercase", color: "#9A9A9A" },
  priceInputRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  currencySymbol: { fontSize: 32, fontWeight: "700", color: "#111" },
  priceInput: { fontSize: 48, fontWeight: "800", color: "#111", letterSpacing: -1.5, minWidth: 80 },
  perLabel: { fontSize: 14, color: "#9A9A9A", marginLeft: 4 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickPill: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 999, backgroundColor: "#F9F8F6", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" },
  quickPillActive: { backgroundColor: "#1A4230", borderColor: "#1A4230" },
  quickPillText: { fontSize: 13, fontWeight: "500", color: "#5A5A5A" },
  quickPillTextActive: { color: "#FFF", fontWeight: "600" },
  breakdownCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  breakdownLabel: { fontSize: 14, color: "#5A5A5A" },
  breakdownLabelBold: { fontWeight: "700", color: "#111" },
  breakdownValue: { fontSize: 14, fontWeight: "600", color: "#111" },
  breakdownValueGreen: { color: "#1A4230", fontSize: 16, fontWeight: "800" },
  divider: { height: 1, backgroundColor: "rgba(0,0,0,0.06)" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 4 },
  infoText: { flex: 1, fontSize: 12, color: "#9A9A9A", lineHeight: 18 },
  errorBanner: { backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12 },
  errorText: { color: "#DC2626", fontSize: 13 },
  saveButton: { backgroundColor: "#1A4230", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
