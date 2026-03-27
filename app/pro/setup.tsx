import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Image, Linking, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthGate } from "../../components/AuthGate";
import { RoleGuard } from "../../components/RoleGuard";
import { saveProProfile, getStripeConnectOnboardingUrl, getStripeConnectStatus } from "../../lib/api";
import { supabase } from "../../lib/supabase";

const TRADES = ["Plumbing", "Electrical", "HVAC", "Appliance", "Handyman"];
const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function FieldInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "sentences",
  prefix,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad" | "decimal-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words";
  prefix?: string;
}) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        {prefix && <Text style={styles.inputPrefix}>{prefix}</Text>}
        <TextInput
          style={[styles.input, prefix && { paddingLeft: 0 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9A9A9A"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

export default function ProSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [trade, setTrade] = useState(TRADES[0]);
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [certifications, setCertifications] = useState("");

  const [calUsername, setCalUsername] = useState("");
  const [consultationPrice, setConsultationPrice] = useState("");

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"pending" | "granted" | "denied">("pending");
  const [radiusMiles, setRadiusMiles] = useState(25);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== "granted") { setLocationStatus("denied"); return; }
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocationStatus("granted");
      });
    });
  }, []);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { setError("Photo library permission is required."); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setUploadingPhoto(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated.");
      const ext = asset.uri.split(".").pop() ?? "jpg";
      const path = `${session.user.id}/avatar.${ext}`;
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: `image/${ext}` });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo.");
      setPhotoUri(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (!phone.trim()) { setError("Please enter your phone number."); return; }
    if (!calUsername.trim()) { setError("Please enter your Cal.com username."); return; }
    if (!consultationPrice.trim()) { setError("Please set a consultation price."); return; }

    const yoe = yearsOfExperience.trim() ? Number(yearsOfExperience.trim()) : undefined;
    const priceNum = parseFloat(consultationPrice.trim()) || 50;

    setSubmitting(true);
    try {
      await saveProProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        trade,
        calUsername: calUsername.trim(),
        consultationPriceCents: Math.round(priceNum * 100),
        photoUrl: photoUrl ?? undefined,
        yearsOfExperience: yoe,
        businessNumber: businessNumber.trim() || undefined,
        certifications: certifications.trim() || undefined,
        location: location ?? undefined,
        serviceRadiusMiles: radiusMiles,
      });
      setProfileSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    setError(null);
    try {
      const url = await getStripeConnectOnboardingUrl();
      await Linking.openURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start payment setup.");
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleCheckStripeStatus = async () => {
    try {
      const status = await getStripeConnectStatus();
      if (status.connected) setStripeConnected(true);
      else setError("Payment account not yet verified. Complete the Stripe form in your browser.");
    } catch {
      setError("Could not check payment status.");
    }
  };

  const initials = fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

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
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <MaterialCommunityIcons name="arrow-left" size={18} color="#1A4230" />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Set up your profile</Text>
            <Text style={styles.subtitle}>Tell us about yourself so customers can trust you.</Text>

            {/* Photo */}
            <View style={styles.card}>
              <SectionLabel>Profile Photo</SectionLabel>
              <TouchableOpacity onPress={pickPhoto} disabled={uploadingPhoto} activeOpacity={0.8}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    {initials ? (
                      <Text style={styles.avatarInitials}>{initials}</Text>
                    ) : (
                      <MaterialCommunityIcons name="camera-plus-outline" size={28} color="rgba(255,255,255,0.8)" />
                    )}
                    <Text style={styles.avatarHint}>
                      {uploadingPhoto ? "Uploading…" : "Tap to add photo"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Personal info */}
            <View style={styles.card}>
              <SectionLabel>Personal Info</SectionLabel>
              <FieldInput label="Full legal name" value={fullName} onChangeText={setFullName} placeholder="Jane Smith" autoCapitalize="words" />
              <View style={styles.fieldDivider} />
              <FieldInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
              <View style={styles.fieldDivider} />
              <FieldInput label="Phone number" value={phone} onChangeText={setPhone} placeholder="+1 555 000 0000" keyboardType="phone-pad" />
            </View>

            {/* Trade */}
            <View style={styles.card}>
              <SectionLabel>Your Trade</SectionLabel>
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

              <View style={styles.fieldDivider} />
              <FieldInput label="Years of experience" value={yearsOfExperience} onChangeText={setYearsOfExperience} placeholder="e.g. 8" keyboardType="number-pad" />
              <View style={styles.fieldDivider} />
              <FieldInput label="Business number (optional)" value={businessNumber} onChangeText={setBusinessNumber} placeholder="e.g. BN123456" />
              <View style={styles.fieldDivider} />
              <FieldInput label="Certifications (optional)" value={certifications} onChangeText={setCertifications} placeholder="e.g. EPA 608, Red Seal" />
            </View>

            {/* Service radius */}
            <View style={styles.card}>
              <SectionLabel>Service Radius</SectionLabel>
              <Text style={styles.helperText}>
                You'll only see requests within this distance from your location.
              </Text>
              {locationStatus === "denied" ? (
                <Text style={styles.locationDenied}>
                  Location permission denied. Enable it in Settings to filter by distance.
                </Text>
              ) : (
                <Text style={styles.locationGranted}>
                  {locationStatus === "granted" ? "Location captured." : "Getting your location…"}
                </Text>
              )}
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
            </View>

            {/* Cal.com */}
            <View style={styles.card}>
              <SectionLabel>Cal.com Scheduling</SectionLabel>
              <Text style={styles.helperText}>
                Your Cal.com username lets customers book onsite visits with you.
              </Text>
              <TouchableOpacity onPress={() => Linking.openURL("https://cal.com")} activeOpacity={0.7}>
                <Text style={styles.linkText}>Don't have an account? Sign up at cal.com →</Text>
              </TouchableOpacity>
              <FieldInput
                label="Cal.com username"
                value={calUsername}
                onChangeText={setCalUsername}
                placeholder="e.g. john-smith"
                autoCapitalize="none"
              />
            </View>

            {/* Consultation fee */}
            <View style={styles.card}>
              <SectionLabel>Consultation Fee</SectionLabel>
              <Text style={styles.helperText}>
                What you charge per video consultation. Tradable takes a 5% platform fee.
              </Text>
              <FieldInput
                label="Price (USD)"
                value={consultationPrice}
                onChangeText={setConsultationPrice}
                placeholder="e.g. 75"
                keyboardType="decimal-pad"
                prefix="$"
              />
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Save / Post-save flow */}
            {!profileSaved ? (
              <TouchableOpacity
                style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
                onPress={handleSave}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>
                  {submitting ? "Saving…" : "Save and continue"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.postSaveContainer}>
                <View style={styles.successBadge}>
                  <MaterialCommunityIcons name="check-circle" size={16} color="#1A4230" />
                  <Text style={styles.successText}>Profile saved</Text>
                </View>

                {!stripeConnected ? (
                  <View style={styles.stripeCard}>
                    <Text style={styles.stripeTitle}>Connect your bank account</Text>
                    <Text style={styles.stripeSubtitle}>
                      Set up payments via Stripe so customers can pay you directly. Takes about 2 minutes.
                    </Text>
                    <TouchableOpacity
                      style={[styles.primaryButton, connectingStripe && styles.primaryButtonDisabled]}
                      onPress={handleConnectStripe}
                      disabled={connectingStripe}
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons name="bank-outline" size={18} color="#FFF" />
                      <Text style={styles.primaryButtonText}>
                        {connectingStripe ? "Opening…" : "Connect bank account"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleCheckStripeStatus} activeOpacity={0.7} style={styles.checkStatusBtn}>
                      <Text style={styles.checkStatusText}>I've completed setup — check status</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.stripeConnectedCard}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#1A4230" />
                    <View style={styles.stripeConnectedText}>
                      <Text style={styles.stripeConnectedTitle}>Payments connected</Text>
                      <Text style={styles.stripeConnectedSubtitle}>
                        You'll receive payouts directly to your bank after each consultation.
                      </Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.primaryButton, !stripeConnected && styles.outlineButton]}
                  onPress={() => router.replace("/pro")}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.primaryButtonText, !stripeConnected && styles.outlineButtonText]}>
                    {stripeConnected ? "Go to dashboard" : "Skip for now"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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
    paddingBottom: 60,
    paddingTop: 12,
    gap: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
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
  },
  subtitle: {
    fontSize: 14,
    color: "#5A5A5A",
    lineHeight: 20,
    marginBottom: 8,
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
    gap: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: "#9A9A9A",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1A4230",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFF",
  },
  avatarHint: {
    fontSize: 9,
    color: "rgba(255,255,255,0.6)",
    position: "absolute",
    bottom: 10,
  },
  fieldWrapper: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "#9A9A9A",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputPrefix: {
    fontSize: 15,
    color: "#5A5A5A",
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111",
    paddingVertical: 4,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  tradeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tradePill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#F9F8F6",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  tradePillActive: {
    backgroundColor: "#1A4230",
    borderColor: "#1A4230",
  },
  tradePillText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#5A5A5A",
  },
  tradePillTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  helperText: {
    fontSize: 13,
    color: "#9A9A9A",
    lineHeight: 18,
    marginTop: -4,
  },
  locationDenied: {
    fontSize: 13,
    color: "#DC2626",
  },
  locationGranted: {
    fontSize: 13,
    color: "#9A9A9A",
  },
  radiusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  radiusPill: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "#F9F8F6",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  radiusPillActive: {
    backgroundColor: "#1A4230",
    borderColor: "#1A4230",
  },
  radiusPillText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#5A5A5A",
  },
  radiusPillTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  linkText: {
    fontSize: 13,
    color: "#1A4230",
    fontWeight: "500",
    marginTop: -4,
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A4230",
    borderRadius: 14,
    height: 52,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#1A4230",
  },
  outlineButtonText: {
    color: "#1A4230",
  },
  postSaveContainer: {
    gap: 12,
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  successText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A4230",
  },
  stripeCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    gap: 12,
  },
  stripeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  stripeSubtitle: {
    fontSize: 13,
    color: "#5A5A5A",
    lineHeight: 19,
  },
  checkStatusBtn: {
    alignSelf: "center",
    paddingVertical: 4,
  },
  checkStatusText: {
    fontSize: 13,
    color: "#1A4230",
    fontWeight: "500",
  },
  stripeConnectedCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#EDF2EF",
    borderRadius: 14,
    padding: 16,
  },
  stripeConnectedText: {
    flex: 1,
    gap: 2,
  },
  stripeConnectedTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A4230",
  },
  stripeConnectedSubtitle: {
    fontSize: 13,
    color: "#5A5A5A",
  },
});
