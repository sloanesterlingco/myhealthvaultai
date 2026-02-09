import React from "react";
import { Alert, View, TouchableOpacity, Image, StyleSheet, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { theme } from "../theme";

interface Props {
  uri?: string | null;
  onPress: (uri: string | null) => void;
}

export const AvatarUploader: React.FC<Props> = ({ uri, onPress }) => {
  const ensureLibraryPermission = async () => {
    const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (status === "granted") return true;

    if (!canAskAgain) {
      Alert.alert(
        "Permission needed",
        "Please enable Photos permission for MyHealthVaultAI in Android Settings to pick an avatar."
      );
      return false;
    }

    const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (req.status !== "granted") {
      Alert.alert("Permission needed", "Photos permission is required to pick an avatar.");
      return false;
    }
    return true;
  };

  const pickFromLibrary = async () => {
    const ok = await ensureLibraryPermission();
    if (!ok) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.length) {
      onPress(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status, canAskAgain } = await ImagePicker.getCameraPermissionsAsync();
    if (status !== "granted") {
      if (!canAskAgain) {
        Alert.alert(
          "Permission needed",
          "Please enable Camera permission for MyHealthVaultAI in Android Settings to take a photo."
        );
        return;
      }
      const req = await ImagePicker.requestCameraPermissionsAsync();
      if (req.status !== "granted") {
        Alert.alert("Permission needed", "Camera permission is required to take a photo.");
        return;
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.length) {
      onPress(result.assets[0].uri);
    }
  };

  const openPicker = () => {
    Alert.alert("Set avatar", "Choose a source", [
      { text: "Cancel", style: "cancel" },
      { text: "Take photo", onPress: () => void takePhoto() },
      { text: "Choose from library", onPress: () => void pickFromLibrary() },
    ]);
  };

  return (
    <TouchableOpacity onPress={openPicker} style={styles.container} activeOpacity={0.85}>
      {uri ? (
        <Image source={{ uri }} style={styles.avatar} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.plus}>+</Text>
        </View>
      )}
      <Text style={styles.caption}>{uri ? "Change photo" : "Add photo"}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { alignSelf: "center", marginBottom: theme.spacing.lg, alignItems: "center" },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  placeholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  plus: { fontSize: 36, color: theme.colors.textMuted, fontWeight: "300" },
  caption: { marginTop: 8, fontSize: 12, color: theme.colors.textSecondary ?? theme.colors.textMuted },
});
