import { useEffect, useState } from "react";
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { getProProfile, listProCalls, ProCall } from "../../../lib/api";

function getWeekDays() {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));
  const letters = ["M", "T", "W", "T", "F", "S", "S"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { letter: letters[i], date: d.getDate(), month: d.getMonth(), year: d.getFullYear(), full: d };
  });
}

export default function BookingsTab() {
  const insets = useSafeAreaInsets();
  const weekDays = getWeekDays();
  const today = new Date();
  const [selectedIdx, setSelectedIdx] = useState(
    weekDays.findIndex((d) => d.date === today.getDate() && d.month === today.getMonth()) ?? 0
  );
  const [calUsername, setCalUsername] = useState<string | null>(null);
  const [calls, setCalls] = useState<ProCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProProfile(), listProCalls()])
      .then(([profile, cs]) => {
        setCalUsername(profile?.cal_username ?? null);
        setCalls(cs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedDay = weekDays[selectedIdx];
  const dayJobs = calls.filter((c) => {
    const d = new Date(c.created_at);
    return (
      d.getDate() === selectedDay.date &&
      d.getMonth() === selectedDay.month &&
      d.getFullYear() === selectedDay.year
    );
  });

  return (
    <AuthGate>
      <RoleGuard requiredRole="pro">
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerPad}>
            <Text style={styles.heading}>Schedule</Text>
          </View>

          {/* Week Strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekStrip}
          >
            {weekDays.map((day, idx) => {
              const isSelected = idx === selectedIdx;
              const isToday =
                day.date === today.getDate() &&
                day.month === today.getMonth() &&
                day.year === today.getFullYear();
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setSelectedIdx(idx)}
                  style={styles.dayButton}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayLetter, isToday && !isSelected && { color: "#1A4230" }]}>
                    {day.letter}
                  </Text>
                  <View style={[styles.dayCircle, isSelected && styles.dayCircleActive]}>
                    <Text style={[styles.dayNum, isSelected && styles.dayNumActive, isToday && !isSelected && { color: "#1A4230", fontWeight: "700" }]}>
                      {day.date}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.padded}>
            {/* Date Label */}
            <View style={styles.dateLabelRow}>
              <Text style={styles.dateLabel}>
                {selectedDay.full.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              </Text>
              <Text style={styles.jobCount}>{dayJobs.length} jobs</Text>
            </View>

            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator color="#1A4230" />
              </View>
            ) : dayJobs.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <MaterialCommunityIcons name="calendar-blank-outline" size={32} color="#9A9A9A" />
                </View>
                <Text style={styles.emptyTitle}>No jobs scheduled</Text>
                <Text style={styles.emptySub}>Your confirmed bookings will appear here</Text>
              </View>
            ) : (
              <View style={styles.jobList}>
                {dayJobs.map((call, idx) => {
                  const d = new Date(call.created_at);
                  const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                  const [time, period] = timeStr.split(" ");
                  return (
                    <View key={call.id}>
                      {idx > 0 && (
                        <View style={styles.openSlotRow}>
                          <View style={styles.openSlotLine} />
                          <Text style={styles.openSlotText}>Open</Text>
                          <View style={styles.openSlotLine} />
                        </View>
                      )}
                      <View style={styles.jobCard}>
                        <View style={styles.timeCol}>
                          <Text style={styles.timeVal}>{time}</Text>
                          <Text style={styles.timePeriod}>{period}</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.jobBody}>
                          <Text style={styles.jobTitle} numberOfLines={1}>{call.trade}</Text>
                          <View style={styles.jobMeta}>
                            <Text style={styles.jobDesc} numberOfLines={1}>{call.description}</Text>
                            <View style={styles.typePill}>
                              <Text style={styles.typePillText}>VIDEO</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Cal.com Card */}
            {calUsername && (
              <View style={styles.calCard}>
                <Text style={styles.calLabel}>MANAGE BOOKINGS</Text>
                <Text style={styles.calTitle}>Onsite appointments</Text>
                <Text style={styles.calSub}>
                  Customer-booked in-person visits are managed on your Cal.com calendar.
                </Text>
                <TouchableOpacity
                  style={styles.calButton}
                  onPress={() => Linking.openURL("https://app.cal.com/bookings/upcoming")}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="open-in-new" size={14} color="#111111" />
                  <Text style={styles.calButtonText}>Open Cal.com</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </RoleGuard>
    </AuthGate>
  );
}

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 2,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F2EE",
  },
  headerPad: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  heading: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.9,
    color: "#111111",
  },
  weekStrip: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginBottom: 20,
    gap: 4,
  },
  dayButton: {
    width: 44,
    alignItems: "center",
    gap: 6,
    padding: 4,
  },
  dayLetter: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: "#9A9A9A",
    textTransform: "uppercase",
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleActive: {
    backgroundColor: "#1A4230",
  },
  dayNum: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
  },
  dayNumActive: {
    color: "#FFFFFF",
  },
  padded: {
    paddingHorizontal: 20,
  },
  dateLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5A5A5A",
  },
  jobCount: {
    fontSize: 13,
    fontWeight: "400",
    color: "#9A9A9A",
  },
  centered: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F9F8F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
  },
  emptySub: {
    fontSize: 13,
    color: "#9A9A9A",
    textAlign: "center",
  },
  jobList: {
    gap: 0,
    marginBottom: 24,
  },
  openSlotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    marginVertical: 8,
  },
  openSlotLine: {
    flex: 1,
    height: 1,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.12)",
    borderStyle: "dashed",
  },
  openSlotText: {
    fontSize: 11,
    color: "#9A9A9A",
  },
  jobCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#1A4230",
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    padding: 14,
    gap: 12,
    ...CARD_SHADOW,
  },
  timeCol: {
    width: 44,
    alignItems: "flex-start",
    flexShrink: 0,
  },
  timeVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
    lineHeight: 18,
  },
  timePeriod: {
    fontSize: 10,
    color: "#9A9A9A",
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  jobBody: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.14,
    color: "#111111",
    marginBottom: 4,
  },
  jobMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  jobDesc: {
    fontSize: 12,
    color: "#9A9A9A",
    flex: 1,
  },
  typePill: {
    backgroundColor: "#EDF2EF",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1A4230",
    letterSpacing: 0.4,
  },
  calCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    gap: 6,
    marginBottom: 24,
    ...CARD_SHADOW,
  },
  calLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.7,
    color: "#9A9A9A",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  calTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
  },
  calSub: {
    fontSize: 12,
    color: "#9A9A9A",
    lineHeight: 17,
  },
  calButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 999,
    marginTop: 8,
  },
  calButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111111",
  },
});
