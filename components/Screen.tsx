import { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

type ScreenProps = PropsWithChildren<{
  centered?: boolean;
}>;

export function Screen({ children, centered }: ScreenProps) {
  return (
    <View style={[styles.container, centered && styles.centered]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: "#F8FAFC",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
});
