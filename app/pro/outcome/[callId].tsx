import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, HelperText, Switch, Text, TextInput } from "react-native-paper";

import { AuthGate } from "../../../components/AuthGate";
import { Screen } from "../../../components/Screen";
import { RoleGuard } from "../../../components/RoleGuard";
import { submitOutcome } from "../../../lib/api";

export default function OutcomeScreen() {
  const router = useRouter();
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
    const minValue = Number(estimateMin);
    const maxValue = Number(estimateMax);
    if (Number.isNaN(minValue) || Number.isNaN(maxValue)) {
      setError("Please provide estimate numbers.");
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
      router.replace("/pro/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit outcome.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGate>
      <RoleGuard requiredRole="pro">
        <Screen>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.heading}>Consultation Summary</Text>
            <Text style={styles.subheading}>
              Share your findings so the customer can review and book next steps.
            </Text>

            <Text style={styles.sectionLabel}>Diagnosis</Text>
            <TextInput
              mode="outlined"
              placeholder="Describe what you found and what needs to be done..."
              multiline
              numberOfLines={4}
              value={diagnosis}
              onChangeText={setDiagnosis}
              style={styles.textarea}
            />

            <Text style={styles.sectionLabel}>Estimate range</Text>
            <View style={styles.estimateRow}>
              <TextInput
                mode="outlined"
                label="Min ($)"
                keyboardType="numeric"
                value={estimateMin}
                onChangeText={setEstimateMin}
                style={styles.estimateInput}
                left={<TextInput.Affix text="$" />}
              />
              <Text style={styles.estimateDash}>–</Text>
              <TextInput
                mode="outlined"
                label="Max ($)"
                keyboardType="numeric"
                value={estimateMax}
                onChangeText={setEstimateMax}
                style={styles.estimateInput}
                left={<TextInput.Affix text="$" />}
              />
            </View>

            <View style={styles.onsiteRow}>
              <View style={styles.onsiteText}>
                <Text style={styles.onsiteTitle}>Onsite visit needed?</Text>
                <Text style={styles.onsiteSubtitle}>
                  Customer will be prompted to book if enabled.
                </Text>
              </View>
              <Switch
                value={onsiteNeeded}
                onValueChange={setOnsiteNeeded}
                color="#065F46"
              />
            </View>

            <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>

            <Button
              mode="contained"
              loading={submitting}
              onPress={handleSubmit}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
            >
              Submit summary
            </Button>
          </ScrollView>
        </Screen>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: "700",
    color: "#064E3B",
    letterSpacing: -0.5,
    marginTop: 8,
  },
  subheading: {
    fontSize: 15,
    color: "#475569",
    marginTop: 4,
    marginBottom: 28,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  textarea: {
    backgroundColor: "#FFFFFF",
    marginBottom: 24,
  },
  estimateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  estimateInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  estimateDash: {
    fontSize: 18,
    color: "#94A3B8",
    fontWeight: "300",
  },
  onsiteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  onsiteText: { flex: 1, marginRight: 12 },
  onsiteTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  onsiteSubtitle: {
    fontSize: 13,
    color: "#475569",
    marginTop: 2,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 32,
    borderRadius: 12,
  },
  submitButtonContent: { height: 50 },
});
