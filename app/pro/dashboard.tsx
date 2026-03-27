import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

export default function ProDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/pro");
  }, []);
  return <View style={{ flex: 1, backgroundColor: "#F4F2EE" }} />;
}
