// src/features/aiAssistant/components/ChatLoadingIndicator.js

import { MotiView } from "moti";
import { StyleSheet, View } from "react-native";
import { theme } from "../../../theme";

export const ChatLoadingIndicator = () => {
  return (
    <View style={styles.container}>
      {[0, 1, 2].map((i) => (
        <MotiView
          key={i}
          from={{ opacity: 0.3, translateY: 0 }}
          animate={{ opacity: 1, translateY: -4 }}
          transition={{
            delay: i * 150,
            repeat: Infinity,
            repeatReverse: true,
            duration: 500,
          }}
          style={styles.dot}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    marginHorizontal: 4,
  },
});
