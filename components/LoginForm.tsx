import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { ActivityIndicator, Button, HelperText, Text, TextInput } from "react-native-paper";

import { Screen } from "./Screen";
import { getAuthRedirectUri, signInWithGoogle } from "../lib/auth-helpers";
import { useAuth } from "../lib/auth";
import { useRole, Role } from "../lib/role";
import { supabase } from "../lib/supabase";

type Props = {
  role: Role;
  title: string;
  subtitle: string;
};

export function LoginForm({ role, title, subtitle }: Props) {
  const router = useRouter();
  const { session, loading } = useAuth();
  const { setRole } = useRole();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) {
      setRole(role).then(() => router.replace("/"));
    }
  }, [loading, session]);

  if (!loading && session) {
    return (
      <Screen centered>
        <ActivityIndicator />
      </Screen>
    );
  }

  const handleSendLink = async () => {
    setError(null);
    setMessage(null);
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    setSending(true);
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: getAuthRedirectUri() },
    });
    setSending(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    setMessage("Magic link sent! Check your email to finish signing in.");
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.card}>
        <Button
          mode="outlined"
          loading={googleLoading}
          onPress={handleGoogleSignIn}
          icon="google"
          style={styles.googleButton}
          contentStyle={styles.buttonContent}
        >
          Continue with Google
        </Button>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          label="Email address"
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          mode="outlined"
          style={styles.input}
        />

        <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>

        {message ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>✓ {message}</Text>
          </View>
        ) : null}

        <Button
          mode="contained"
          loading={sending}
          onPress={handleSendLink}
          style={styles.submitButton}
          contentStyle={styles.buttonContent}
        >
          Send magic link
        </Button>
      </View>

      <Button mode="text" onPress={() => router.back()} style={styles.backButton}>
        ← Back
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 16,
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#064E3B",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 6,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  googleButton: {
    borderColor: "#D1FAE5",
    borderRadius: 12,
  },
  buttonContent: {
    height: 48,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    color: "#94A3B8",
    fontSize: 13,
  },
  input: {
    backgroundColor: "#FFFFFF",
  },
  successBanner: {
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  successText: {
    color: "#059669",
    fontSize: 14,
    fontWeight: "500",
  },
  submitButton: {
    marginTop: 16,
    borderRadius: 12,
  },
  backButton: {
    marginTop: 16,
    alignSelf: "center",
  },
});
