import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { submitOutcome } from "../../../lib/api";

export default function OutcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { callId } = useLocalSearchParams<{ callId: string }>();
  const [diagnosis, setDiagnosis] = useState("");
  const [estimateMin, setEstimateMin] = useState("");
  const [estimateMax, setEstimateMax] = useState("");
  const [onsiteNeeded, setOnsiteNeeded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!callId) { setError("Missing call id."); return; }
    if (!diagnosis.trim()) { setError("Please add a diagnosis."); return; }
    const minValue = estimateMin ? Number(estimateMin) : 0;
    const maxValue = estimateMax ? Number(estimateMax) : 0;
    if (Number.isNaN(minValue) || Number.isNaN(maxValue)) {
      setError("Please provide valid estimate numbers.");
      return;
    }
    setSubmitting(true);
    try {
      await submitOutcome(callId, {
        diagnosis: diagnosis.trim(),
        estimateMin: minValue,
        estimateMax: maxValue,
        onsiteNeeded,
      });
      router.replace("/pro");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit outcome.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = diagnosis.trim().length > 0;

  return (
    <AuthGate>
      <RoleGuard requiredRole="pro">
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Back button */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.replace("/pro")}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color="#1A4230" />
              <Text style={styles.backBtnText}>Dashboard</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Consultation Summary</Text>
            <Text style={styles.subtitle}>
              Share your findings so the customer can review and book next steps.
            </Text>

            {/* Diagnosis */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Diagnosis</Text>
              <TextInput
                style={styles.textarea}
                placeholder="Describe what you found and what needs to be done..."
                placeholderTextColor="#9A9A9A"
                multiline
                numberOfLines={5}
                value={diagnosis}
                onChangeText={setDiagnosis}
                textAlignVertical="top"
              />
            </View>

            {/* Estimate */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Estimate Range</Text>
              <View style={styles.estimateRow}>
                <View style={styles.estimateInputWrapper}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.estimateInput}
                    placeholder="Min"
                    placeholderTextColor="#9A9A9A"
                    keyboardType="numeric"
                    value={estimateMin}
                    onChangeText={setEstimateMin}
                  />
                </View>
                <Text style={styles.estimateDash}>–</Text>
                <View style={styles.estimateInputWrapper}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.estimateInput}
                    placeholder="Max"
                    placeholderTextColor="#9A9A9A"
                    keyboardType="numeric"
                    value={estimateMax}
                    onChangeText={setEstimateMax}
                  />
                </View>
              </View>
            </View>

            {/* Onsite toggle */}
            <View style={styles.card}>
              <View style={styles.onsiteRow}>
                <View style={styles.onsiteText}>
                  <Text style={styles.onsiteTitle}>Onsite visit needed?</Text>
                  <Text style={styles.onsiteSubtitle}>
                    Customer will be prompted to book a follow-up.
                  </Text>
                </View>
                <Switch
                  value={onsiteNeeded}
                  onValueChange={setOnsiteNeeded}
                  trackColor={{ false: "#E5E7EB", true: "#1A4230" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitButton, (!canSubmit || submitting) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit || submitting}
              activeOpacity={0.85}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? "Submitting…" : "Submit summary"}
              </Text>
            </TouchableOpacity>
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
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.9,
    color: "#111",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#5A5A5A",
    lineHeight: 20,
    marginBottom: 24,
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
    marginBottom: 12,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: "#9A9A9A",
  },
  textarea: {
    backgroundColor: "#F9F8F6",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    padding: 12,
    minHeight: 120,
    fontSize: 14,
    color: "#111",
    lineHeight: 20,
  },
  estimateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  estimateInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F8F6",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 12,
    height: 46,
  },
  currencySymbol: {
    fontSize: 15,
    color: "#5A5A5A",
    marginRight: 4,
  },
  estimateInput: {
    flex: 1,
    fontSize: 15,
    color: "#111",
  },
  estimateDash: {
    fontSize: 18,
    color: "#9A9A9A",
    fontWeight: "300",
  },
  onsiteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  onsiteText: {
    flex: 1,
    marginRight: 12,
    gap: 2,
  },
  onsiteTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  onsiteSubtitle: {
    fontSize: 12,
    color: "#5A5A5A",
    lineHeight: 17,
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
  },
  submitButton: {
    backgroundColor: "#1A4230",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
