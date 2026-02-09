// src/ui/layout/PatientHeader.tsx

import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { theme } from "../../theme";
import { ShieldIcon } from "../branding/ShieldIcon";

interface Props {
  firstName: string;
  lastName: string;
  photoUrl?: string;
  onEditBio?: () => void;
}

export const PatientHeader: React.FC<Props> = ({
  firstName,
  lastName,
  photoUrl,
  onEditBio,
}) => {
  const fullName = `${firstName} ${lastName}`;

  return (
    <View style={styles.container}>
      {/* LEFT SIDE: Logo + Name */}
      <View style={styles.left}>
        <ShieldIcon size={28} color={theme.colors.brand} />

        <View style={{ marginLeft: theme.spacing.md }}>
          <Text style={styles.name}>{fullName}</Text>

          {onEditBio && (
            <TouchableOpacity onPress={onEditBio}>
              <Text style={styles.editBio}>Edit Bio</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* RIGHT SIDE: Avatar */}
      <TouchableOpacity
        onPress={onEditBio}
        style={styles.avatarWrap}
        activeOpacity={0.7}
      >
        <Image
          source={{
            uri:
              photoUrl ||
              `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=0C284E&color=fff`,
          }}
          style={styles.avatar}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
  },
  editBio: {
    marginTop: 2,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.brand,
    fontWeight: theme.typography.weights.medium,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: theme.colors.brandLight,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
  },
});
