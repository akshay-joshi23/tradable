import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listPros, ProSummary } from "../../lib/api";

export default function AllProsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pros, setPros] = useState<ProSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPros = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await listPros();
      setPros(data);
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadPros(); }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.title}>All Pros</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadPros(true)} tintColor="#1A4230" />
        }
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#1A4230" />
          </View>
        ) : pros.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No pros found</Text>
            <Text style={styles.emptySubtext}>Check back later.</Text>
          </View>
        ) : (
          <View style={styles.proList}>
            {pros.map((pro) => {
              const name = pro.display_name ?? pro.full_name ?? "Pro";
              const proInitials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
              const price = Math.round(pro.consultation_price_cents / 100);
              return (
                <TouchableOpacity
                  key={pro.user_id}
                  style={styles.proCard}
                  onPress={() => router.push(`/customer/pro/${pro.user_id}`)}
                  activeOpacity={0.75}
                >
                  <View style={styles.proAvatar}>
                    <Text style={styles.proAvatarText}>{proInitials}</Text>
                  </View>
                  <View style={styles.proInfo}>
                    <Text style={styles.proName} numberOfLines={1}>{name}</Text>
                    <Text style={styles.proTrade}>{pro.trade}</Text>
                    {pro.years_of_experience != null && (
                      <View style={styles.metaRow}>
                        <MaterialCommunityIcons name="star" size={11} color="#C49A3C" />
                        <Text style={styles.metaText}>{pro.years_of_experience} yrs exp</Text>
                      </View>
                    )}
                    {pro.certifications && (
                      <View style={styles.tagRow}>
                        <View style={styles.tag}>
                          <Text style={styles.tagText}>Certified</Text>
                        </View>
                      </View>
                    )}
                  </View>
                  <View style={styles.proRight}>
                    <Text style={styles.proPrice}>${price}</Text>
                    <Text style={styles.proUnit}>/call</Text>
                    <View style={styles.availPill}>
                      <Text style={styles.availText}>Available</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F2EE",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  centered: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#9A9A9A",
    textAlign: "center",
  },
  proList: {
    gap: 10,
  },
  proCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  proAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EDF2EF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  proAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A4230",
  },
  proInfo: {
    flex: 1,
    gap: 2,
  },
  proName: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: "#111",
  },
  proTrade: {
    fontSize: 12,
    fontWeight: "400",
    color: "#9A9A9A",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#5A5A5A",
  },
  tagRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  tag: {
    backgroundColor: "#F9F8F6",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#9A9A9A",
  },
  proRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  proPrice: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: "#111",
  },
  proUnit: {
    fontSize: 11,
    fontWeight: "400",
    color: "#9A9A9A",
  },
  availPill: {
    backgroundColor: "#EDF2EF",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    marginTop: 4,
  },
  availText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1A4230",
  },
});
