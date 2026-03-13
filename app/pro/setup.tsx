import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Image, Linking, ScrollView, TouchableOpacity, View } from "react-native";
import { Button, HelperText, RadioButton, Text, TextInput } from "react-native-paper";

import { AuthGate } from "../../components/AuthGate";
import { RoleGuard } from "../../components/RoleGuard";
import { Screen } from "../../components/Screen";
import { saveProProfile } from "../../lib/api";
import { supabase } from "../../lib/supabase";

const trades = ["Plumbing", "Electrical", "HVAC", "Appliance", "Handyman"];
const radiusOptions = [5, 10, 25, 50, 100];

export default function ProSetupScreen() {
  const router = useRouter();

  // Identity
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Professional
  const [trade, setTrade] = useState(trades[0]);
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [certifications, setCertifications] = useState("");

  // Cal.com
  const [calUsername, setCalUsername] = useState("");
  const [consultationPrice, setConsultationPrice] = useState("");

  // Location
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"pending" | "granted" | "denied">("pending");
  const [radiusMiles, setRadiusMiles] = useState(25);

  // Form
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== "granted") {
        setLocationStatus("denied");
        return;
      }
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocationStatus("granted");
      });
    });
  }, []);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("Photo library permission is required to set a profile photo.");
      return;
    }

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

    const yoe = yearsOfExperience.trim() ? Number(yearsOfExperience.trim()) : undefined;
    const priceNum = parseFloat(consultationPrice.trim()) || 50;

    router.replace("/pro/dashboard");
    return;

    setSubmitting(true);
    try {
      await saveProProfile({
        fullName: fullName.trim() || "Test Pro",
        email: email.trim() || "test@test.com",
        phone: phone.trim() || "0000000000",
        trade,
        calUsername: calUsername.trim() || "test",
        consultationPriceCents: Math.round(priceNum * 100),
        photoUrl: photoUrl ?? undefined,
        yearsOfExperience: yoe,
        businessNumber: businessNumber.trim() || undefined,
        certifications: certifications.trim() || undefined,
        location: location ?? undefined,
        serviceRadiusMiles: radiusMiles,
      });
      router.replace("/pro/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGate>
      <RoleGuard requiredRole="pro">
        <Screen>
          <ScrollView>
            <Text variant="headlineSmall">Set up your pro profile</Text>
            <Text style={{ marginTop: 8, marginBottom: 24, opacity: 0.7 }}>
              Tell us about yourself so customers can trust you.
            </Text>

            {/* ── Profile photo ── */}
            <Text variant="titleMedium" style={{ marginBottom: 8 }}>Profile photo</Text>
            <TouchableOpacity onPress={pickPhoto} disabled={uploadingPhoto}>
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 8 }}
                />
              ) : (
                <View
                  style={{
                    width: 96, height: 96, borderRadius: 48,
                    backgroundColor: "#D1FAE5", marginBottom: 8,
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Text style={{ opacity: 0.5, fontSize: 12, textAlign: "center" }}>
                    {uploadingPhoto ? "Uploading…" : "Tap to add\nphoto"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* ── Identity ── */}
            <Text variant="titleMedium" style={{ marginTop: 16, marginBottom: 8 }}>Personal info</Text>
            <TextInput
              label="Full legal name"
              value={fullName}
              onChangeText={setFullName}
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={{ marginBottom: 12 }}
            />

            {/* ── Professional ── */}
            <Text variant="titleMedium" style={{ marginTop: 8, marginBottom: 4 }}>Your trade</Text>
            <RadioButton.Group onValueChange={setTrade} value={trade}>
              {trades.map((item) => (
                <RadioButton.Item key={item} label={item} value={item} />
              ))}
            </RadioButton.Group>

            <TextInput
              label="Years of experience"
              value={yearsOfExperience}
              onChangeText={setYearsOfExperience}
              keyboardType="number-pad"
              style={{ marginTop: 12, marginBottom: 12 }}
            />
            <TextInput
              label="Business number (optional)"
              value={businessNumber}
              onChangeText={setBusinessNumber}
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Certifications (optional)"
              value={certifications}
              onChangeText={setCertifications}
              placeholder="e.g. EPA 608, Red Seal"
              style={{ marginBottom: 12 }}
            />

            {/* ── Service radius ── */}
            <Text variant="titleMedium" style={{ marginTop: 8, marginBottom: 4 }}>Service radius</Text>
            <Text style={{ marginBottom: 8, opacity: 0.7, fontSize: 13 }}>
              You'll only see requests within this distance from your location.
            </Text>
            {locationStatus === "denied" ? (
              <Text style={{ color: "#DC2626", marginBottom: 12, fontSize: 13 }}>
                Location permission denied. Please enable it in Settings.
              </Text>
            ) : locationStatus === "granted" ? (
              <Text style={{ marginBottom: 8, fontSize: 13, opacity: 0.6 }}>Location captured.</Text>
            ) : (
              <Text style={{ marginBottom: 8, fontSize: 13, opacity: 0.6 }}>Getting your location…</Text>
            )}
            <RadioButton.Group
              onValueChange={(v) => setRadiusMiles(Number(v))}
              value={String(radiusMiles)}
            >
              {radiusOptions.map((miles) => (
                <RadioButton.Item key={miles} label={`${miles} miles`} value={String(miles)} />
              ))}
            </RadioButton.Group>

            {/* ── Cal.com ── */}
            <Text variant="titleMedium" style={{ marginTop: 16, marginBottom: 4 }}>
              Cal.com username
            </Text>
            <Text style={{ marginBottom: 8, opacity: 0.7, fontSize: 13 }}>
              Your Cal.com username so customers can book onsite visits with you.
            </Text>
            <Button
              mode="text"
              compact
              onPress={() => Linking.openURL("https://cal.com")}
              style={{ alignSelf: "flex-start", marginBottom: 8 }}
            >
              Don't have an account? Sign up at cal.com
            </Button>
            <TextInput
              label="Cal.com username"
              value={calUsername}
              onChangeText={setCalUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="e.g. john-smith"
              style={{ marginBottom: 16 }}
            />

            <Text variant="titleMedium" style={{ marginBottom: 4 }}>Consultation fee</Text>
            <Text style={{ marginBottom: 8, opacity: 0.7, fontSize: 13 }}>
              What you charge per video consultation. Tradable takes a 5% platform fee.
            </Text>
            <TextInput
              label="Price (USD)"
              value={consultationPrice}
              onChangeText={setConsultationPrice}
              keyboardType="decimal-pad"
              placeholder="e.g. 75"
              left={<TextInput.Affix text="$" />}
              style={{ marginBottom: 16 }}
            />

            <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>

            <View style={{ marginTop: 8, marginBottom: 32 }}>
              <Button mode="contained" loading={submitting} onPress={handleSave}>
                Save and continue
              </Button>
            </View>
          </ScrollView>
        </Screen>
      </RoleGuard>
    </AuthGate>
  );
}
