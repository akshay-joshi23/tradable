import { Image, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { useRole } from "../../../lib/role";
import { useAuth } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";
import { uploadAvatar } from "../../../lib/api";

type MenuSection = {
  section: string;
  items: { icon: string; label: string; sublabel?: string; onPress?: () => void }[];
};

const MENU: MenuSection[] = [
  {
    section: "Legal",
    items: [
      { icon: "shield-outline", label: "Privacy Policy", onPress: () => Linking.openURL("https://jointradable.com/privacypolicy") },
    ],
  },
];

export default function CustomerProfileTab() {
  const { clearRole } = useRole();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    session?.user?.user_metadata?.avatar_url ?? null
  );

  const email = session?.user?.email ?? "";
  const name = session?.user?.user_metadata?.full_name ?? email;
  const initials = name.slice(0, 2).toUpperCase();

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const userId = session?.user?.id;
    if (!userId) return;

    setUploadingPhoto(true);
    try {
      const url = await uploadAvatar(result.assets[0].uri, userId);
      await supabase.auth.updateUser({ data: { avatar_url: url } });
      setAvatarUrl(url);
    } catch (err) {
      console.error("Photo upload failed:", err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      await clearRole();
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <AuthGate>
      <RoleGuard requiredRole="customer">
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile header */}
          <View style={styles.profileHeader}>
            <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8} style={styles.avatarWrapper}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              {uploadingPhoto ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator size="small" color="#FFF" />
                </View>
              ) : (
                <View style={styles.avatarEditBadge}>
                  <MaterialCommunityIcons name="camera" size={12} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{name}</Text>
              <Text style={styles.profileEmail}>{email}</Text>
            </View>
          </View>

          {/* Menu sections */}
          {MENU.map((section, i) => (
            <View key={i} style={styles.menuSection}>
              <Text style={styles.sectionLabel}>{section.section}</Text>
              <View style={styles.menuCard}>
                {section.items.map((item, j) => (
                  <TouchableOpacity
                    key={j}
                    style={[
                      styles.menuRow,
                      j < section.items.length - 1 && styles.menuRowBorder,
                    ]}
                    onPress={item.onPress}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuIconBox}>
                      <MaterialCommunityIcons name={item.icon as any} size={18} color="#1A4230" />
                    </View>
                    <View style={styles.menuText}>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                      {item.sublabel && <Text style={styles.menuSublabel}>{item.sublabel}</Text>}
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#9A9A9A" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Log out */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleSignOut}
            disabled={signingOut}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="logout" size={18} color="#CC2C2C" />
            <Text style={styles.logoutText}>{signingOut ? "Signing out…" : "Log out"}</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Tradable v1.0.0</Text>
        </ScrollView>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F2EE",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 32,
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    flexShrink: 0,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1A4230",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarOverlay: {
    position: "absolute",
    inset: 0,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1A4230",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#F4F2EE",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFF",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.44,
    color: "#111",
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    fontWeight: "400",
    color: "#5A5A5A",
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.77,
    textTransform: "uppercase",
    color: "#9A9A9A",
    marginBottom: 10,
  },
  menuCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#EDF2EF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111",
  },
  menuSublabel: {
    fontSize: 12,
    fontWeight: "400",
    color: "#9A9A9A",
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    marginBottom: 24,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#CC2C2C",
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    color: "#9A9A9A",
  },
});
