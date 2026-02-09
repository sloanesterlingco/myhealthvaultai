import React, { useState } from "react";
import { Alert, Image, View, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { auth, storage } from "../../../lib/firebase";
import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { theme } from "../../../theme";

import { usePatientProfile } from "../hooks/usePatientProfile";
import { patientAggregationService } from "../../aiAssistant/services/patientAggregationService";

type Side = "front" | "back";

async function uriToBlob(uri: string) {
  const res = await fetch(uri);
  return await res.blob();
}

export default function DigitalInsuranceCardScreen() {
  const { profile } = usePatientProfile();

  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [frontUploading, setFrontUploading] = useState(false);
  const [backUploading, setBackUploading] = useState(false);

  const pickImage = async (side: Side, fromCamera: boolean) => {
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (perm.status !== "granted") {
        Alert.alert("Permission needed", "Please allow access to continue.");
        return;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            quality: 0.85,
            allowsEditing: true,
            aspect: [16, 10],
          })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.85,
            allowsEditing: true,
            aspect: [16, 10],
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
          });

      if (result.canceled) return;

      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      if (side === "front") setFrontUri(uri);
      else setBackUri(uri);
    } catch (e) {
      console.log("Insurance card pick error:", e);
      Alert.alert("Error", "Could not select an image.");
    }
  };

  const uploadSide = async (side: Side) => {
    const user = auth.currentUser;
    if (!user?.uid) {
      Alert.alert("Sign in required", "Please sign in to upload your card.");
      return;
    }

    const localUri = side === "front" ? frontUri : backUri;
    if (!localUri) {
      Alert.alert("Missing image", `Please add the ${side} of your card first.`);
      return;
    }

    const setUploading = side === "front" ? setFrontUploading : setBackUploading;

    try {
      setUploading(true);

      const blob = await uriToBlob(localUri);
      const fileRef = ref(storage, `insuranceCards/${user.uid}/${side}.jpg`);
      await uploadBytes(fileRef, blob);
      const url = await getDownloadURL(fileRef);

      // Store in aggregated patient model (Firestore-backed)
      const currentDemo = patientAggregationService.getPatient().demographics as any;

      patientAggregationService.updatePatientData({
        demographics: {
          ...currentDemo,
          insuranceCard: {
            ...(currentDemo?.insuranceCard ?? {}),
            [side]: url,
            updatedAt: new Date().toISOString(),
          },
        },
      } as any);

      patientAggregationService.addNote(`Insurance card uploaded (${side}).`);
      await patientAggregationService.persistToFirestore(user.uid);

      Alert.alert("Uploaded", `${side === "front" ? "Front" : "Back"} saved.`);
    } catch (e) {
      console.log("Insurance card upload error:", e);
      Alert.alert("Upload failed", "Could not upload the image. Try again.");
    } finally {
      setUploading(false);
    }
  };

  if (!profile) {
    return (
      <ScreenContainer showHeader={true} title="Insurance Card" headerShowLogo={false} scroll={true}>
        <Card>
          <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
            No profile found yet
          </Text>
          <Text style={{ marginTop: 6, color: theme.colors.textSecondary }}>
            Please complete demographics first.
          </Text>
        </Card>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      showHeader={true}
      title="Insurance Card"
      headerShowLogo={false}
      scroll={true}
      contentStyle={{ paddingTop: 0 }}
    >
      <Card style={{ backgroundColor: theme.colors.brand, padding: 24 }}>
        <Text style={{ color: "white", fontSize: 20, fontWeight: "700" }}>
          Insurance Card
        </Text>

        <View style={{ marginTop: 20 }}>
          <Text style={{ color: "white", fontSize: 16 }}>
            {profile.insuranceProvider || "Insurance Provider"}
          </Text>
          <Text style={{ color: "white", marginTop: 6 }}>
            Member ID: {profile.memberId || "—"}
          </Text>
          {profile.groupNumber ? (
            <Text style={{ color: "white", marginTop: 6 }}>
              Group: {profile.groupNumber}
            </Text>
          ) : null}
        </View>
      </Card>

      <View style={{ height: theme.spacing.md }} />

      <Card>
        <Text style={{ color: theme.colors.text, fontWeight: "700", marginBottom: 8 }}>
          Front of card
        </Text>

        {frontUri ? (
          <Image
            source={{ uri: frontUri }}
            style={{
              width: "100%",
              height: 170,
              borderRadius: theme.radius.lg,
              marginBottom: theme.spacing.md,
            }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: theme.spacing.md }}>
            Add a photo of the front of your insurance card.
          </Text>
        )}

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button label="Camera" onPress={() => pickImage("front", true)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Library" onPress={() => pickImage("front", false)} />
          </View>
        </View>

        <Button
          label={frontUploading ? "Uploading…" : "Upload Front"}
          onPress={() => uploadSide("front")}
          loading={frontUploading}
          disabled={frontUploading || !frontUri}
          style={{ marginTop: theme.spacing.md }}
        />
      </Card>

      <View style={{ height: theme.spacing.md }} />

      <Card>
        <Text style={{ color: theme.colors.text, fontWeight: "700", marginBottom: 8 }}>
          Back of card
        </Text>

        {backUri ? (
          <Image
            source={{ uri: backUri }}
            style={{
              width: "100%",
              height: 170,
              borderRadius: theme.radius.lg,
              marginBottom: theme.spacing.md,
            }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: theme.spacing.md }}>
            Add a photo of the back of your insurance card.
          </Text>
        )}

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button label="Camera" onPress={() => pickImage("back", true)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Library" onPress={() => pickImage("back", false)} />
          </View>
        </View>

        <Button
          label={backUploading ? "Uploading…" : "Upload Back"}
          onPress={() => uploadSide("back")}
          loading={backUploading}
          disabled={backUploading || !backUri}
          style={{ marginTop: theme.spacing.md }}
        />
      </Card>

      <Text
        style={{
          marginTop: theme.spacing.md,
          color: theme.colors.textSecondary,
          fontSize: 12,
          lineHeight: 16,
        }}
      >
        Alpha note: OCR is coming later. For now we securely store images so your AI assistant can
        confirm your card is on file.
      </Text>
    </ScreenContainer>
  );
}
