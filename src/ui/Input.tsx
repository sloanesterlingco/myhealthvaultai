// src/ui/Input.tsx
import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { theme } from "../theme";

type Props = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  label?: string;
  helperText?: string;
  errorText?: string;
};

export const Input: React.FC<Props> = ({
  style,
  containerStyle,
  label,
  helperText,
  errorText,
  ...props
}) => {
  const showHelper = Boolean(errorText || helperText);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TextInput
        placeholderTextColor={theme.colors.textMuted}
        style={[
          styles.input,
          errorText ? styles.inputError : null,
          style,
        ]}
        {...props}
      />

      {showHelper ? (
        <Text style={[styles.helper, errorText ? styles.helperError : null]}>
          {errorText ?? helperText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: "100%" },

  label: {
    marginBottom: 6,
    color: theme.colors.textSecondary ?? theme.colors.text,
    fontSize: 12,
    fontWeight: "600",
  },

  input: {
    width: "100%",
    backgroundColor: "#f1f5f9",
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },

  inputError: {
    borderColor: theme.colors.danger ?? theme.colors.borderLight,
  },

  helper: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  helperError: {
    color: theme.colors.danger ?? theme.colors.text,
  },
});
