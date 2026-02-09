// src/features/profile/components/ProfileHeader.tsx

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

import { theme } from "../../../theme";

export const ProfileHeader = ({
  name,
  dob,
  phone,
  onEdit,
}: {
  name: string;
  dob?: string | null;
  phone?: string | null;
  onEdit?: () => void;
}) => {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <View style={styles.container}>
      {/* Edit Button */}
      {onEdit && (
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <Feather name="edit-2" size={16} color={theme.colors.brand} />
        </TouchableOpacity>
      )}

      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.initials}>{initials}</Text>
      </View>

      {/* User info */}
      <Text style={styles.name}>{name}</Text>
      {dob && <Text style={styles.sub}>{`DOB: ${dob}`}</Text>}
      {phone && <Text style={styles.sub}>{`Phone: ${phone}`}</Text>}
    </View>
  );
};

/* ------------------------------ Styles ------------------------------ */

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: theme.spacing.xl,
    position: "relative",
  },
  editBtn: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: 8,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: theme.colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
  },
  initials: {
    color: theme.colors.brand,
    fontSize: 34,
    fontWeight: "700",
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
});
