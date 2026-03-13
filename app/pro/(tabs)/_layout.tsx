import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

function TabIcon({ name, color, size }: { name: IconName; color: string; size: number }) {
  return <MaterialCommunityIcons name={name} color={color} size={size} />;
}

export default function ProTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#065F46",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#D1FAE5",
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <TabIcon name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, size }) => <TabIcon name="calendar-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => <TabIcon name="clock-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <TabIcon name="account-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
