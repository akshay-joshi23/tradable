import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
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
  const { setRole, role: currentRole } = useRole();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Step 1: when a session arrives, persist the role (non-blocking)
  useEffect(() => {
    if (!loading && session && currentRole !== role) {
      setRole(role).catch(() => {});
    }
  }, [loading, session]);

  // Step 2: navigate only after the role state has actually committed to context,
  // eliminating the race where RoleGuard sees null role and redirects back to /login.
  useEffect(() => {
    if (session && currentRole === role) {
      router.replace(role === "pro" ? "/pro" : "/customer");
    }
  }, [session, currentRole]);

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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          {role === "pro" ? "Sign in to your pro account" : "Sign in to get started"}
        </Text>
      </View>

      <View style={styles.card}>
        <Button
          mode="contained"
          loading={googleLoading}
          onPress={handleGoogleSignIn}
          icon="google"
          style={styles.googleButton}
          contentStyle={styles.buttonContent}
          buttonColor="#1a4d3a"
        >
          Continue with Google
        </Button>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Or use email</Text>
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
          outlineColor="#e5e5e5"
          activeOutlineColor="#1a4d3a"
        />

        <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>

        {message ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>✓ {message}</Text>
          </View>
        ) : null}

        <Button
          mode="outlined"
          loading={sending}
          onPress={handleSendLink}
          style={styles.submitButton}
          contentStyle={styles.buttonContent}
          textColor="#1a4d3a"
        >
          Continue with email
        </Button>
      </View>

      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>Back to role selection</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    width: "100%",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  googleButton: {
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
    backgroundColor: "#e5e5e5",
  },
  dividerText: {
    color: "#6B7280",
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
    marginTop: 12,
    borderRadius: 12,
    borderColor: "#1a4d3a",
  },
  backButton: {
    marginTop: 20,
    padding: 8,
  },
  backText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
  },
});
