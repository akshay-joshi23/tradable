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
    padding: 20,
    backgroundColor: "#F7FDF9",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
});
