// src/features/medications/screens/MedicationOcrReviewScreen.tsx
//
// V1 Medication OCR Review
// - User reviews/edit extracted fields
// - Save as a Medication in Firestore
// - No medical advice
//
// Fixes:
// - Firestore rejects undefined: never send undefined for optional fields
// Adds:
// - Pharmacy + Rx metadata fields (phone, rx number, ndc, quantity, refills, fill date, prescriber, patient)

import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { ScreenContainer } from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Input } from "../../../ui/Input";
import { Button } from "../../../ui/Button";
import { theme } from "../../../theme";
import { MainRoutes } from "../../../navigation/types";
import { patientService } from "../../../services/patientService";

function pickString(v: any): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

function trimOrEmpty(v: string): string {
  const t = String(v || "").trim();
  return t;
}

/**
 * Try to pull likely fields from whatever shape "result" is.
 * This is intentionally defensive because OCR payloads vary.
 */
function extractFields(result: any) {
  const r = result ?? {};

  // Core medication fields
  const name =
    pickString(r.name) ||
    pickString(r.medicationName) ||
    pickString(r.drugName) ||
    pickString(r.brandName) ||
    pickString(r.displayName) ||
    "";

  const dosage =
    pickString(r.dosage) ||
    pickString(r.dose) ||
    pickString(r.strength) ||
    pickString(r.doseText) ||
    "";

  const frequency =
    pickString(r.frequency) ||
    pickString(r.sig) ||
    pickString(r.directions) ||
    pickString(r.instructions) ||
    "";

  // Raw OCR text (store this always)
  const rawOcrText =
    pickString(r.rawOcrText) ||
    pickString(r.rawText) ||
    pickString(r.text) ||
    "";

  // Notes: default to empty (we can optionally seed with raw OCR)
  const notes =
    pickString(r.notes) ||
    "";

  // Extra label metadata (many possible keys)
  const pharmacyName =
    pickString(r.pharmacyName) ||
    pickString(r.pharmacy) ||
    pickString(r.pharmacyStore) ||
    "";

  const pharmacyPhone =
    pickString(r.pharmacyPhone) ||
    pickString(r.phone) ||
    pickString(r.storePhone) ||
    "";

  const rxNumber =
    pickString(r.rxNumber) ||
    pickString(r.rx) ||
    pickString(r.prescriptionNumber) ||
    "";

  const ndc =
    pickString(r.ndc) ||
    pickString(r.ndcNumber) ||
    "";

  const quantity =
    pickString(r.quantity) ||
    pickString(r.qty) ||
    "";

  const refills =
    pickString(r.refills) ||
    pickString(r.refill) ||
    "";

  const fillDate =
    pickString(r.fillDate) ||
    pickString(r.filledDate) ||
    pickString(r.date) ||
    "";

  const prescriber =
    pickString(r.prescriber) ||
    pickString(r.prescribedBy) ||
    pickString(r.doctor) ||
    "";

  const patientName =
    pickString(r.patientName) ||
    pickString(r.patient) ||
    pickString(r.ptName) ||
    "";

  return {
    name,
    dosage,
    frequency,
    notes,
    rawOcrText,
    pharmacyName,
    pharmacyPhone,
    rxNumber,
    ndc,
    quantity,
    refills,
    fillDate,
    prescriber,
    patientName,
  };
}

export default function MedicationOcrReviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const result = route?.params?.result;

  const initial = useMemo(() => extractFields(result), [result]);

  // Core
  const [name, setName] = useState(initial.name);
  const [dosage, setDosage] = useState(initial.dosage);
  const [frequency, setFrequency] = useState(initial.frequency);

  // Notes + OCR
  const [notes, setNotes] = useState(initial.notes);
  const [rawOcrText] = useState(initial.rawOcrText);

  // Extra label info
  const [pharmacyName, setPharmacyName] = useState(initial.pharmacyName);
  const [pharmacyPhone, setPharmacyPhone] = useState(initial.pharmacyPhone);
  const [rxNumber, setRxNumber] = useState(initial.rxNumber);
  const [ndc, setNdc] = useState(initial.ndc);
  const [quantity, setQuantity] = useState(initial.quantity);
  const [refills, setRefills] = useState(initial.refills);
  const [fillDate, setFillDate] = useState(initial.fillDate);
  const [prescriber, setPrescriber] = useState(initial.prescriber);
  const [patientName, setPatientName] = useState(initial.patientName);

  const [saving, setSaving] = useState(false);

  const goToMedsList = () => {
    navigation.navigate(MainRoutes.MEDICATIONS_TAB, {
      screen: MainRoutes.MEDICATIONS_LIST,
    });
  };

  const onSave = async () => {
    const n = trimOrEmpty(name);
    if (!n) {
      Alert.alert("Missing name", "Please enter the medication name.");
      return;
    }

    try {
      setSaving(true);

      // IMPORTANT: Firestore rejects undefined.
      // We send empty strings or nulls, never undefined.
      await patientService.addMedication({
        name: n,
        genericName: n, // V1 default
        dosage: trimOrEmpty(dosage) || "",       // never undefined
        frequency: trimOrEmpty(frequency) || "", // never undefined
        notes: (notes ?? "").trim(),

        // Extra label fields
        pharmacyName: trimOrEmpty(pharmacyName) || "",
        pharmacyPhone: trimOrEmpty(pharmacyPhone) || "",
        rxNumber: trimOrEmpty(rxNumber) || "",
        ndc: trimOrEmpty(ndc) || "",
        quantity: trimOrEmpty(quantity) || "",
        refills: trimOrEmpty(refills) || "",
        fillDate: trimOrEmpty(fillDate) || "",
        prescriber: trimOrEmpty(prescriber) || "",
        patientName: trimOrEmpty(patientName) || "",

        // Always keep raw OCR for audit + future improvements
        rawOcrText: trimOrEmpty(rawOcrText) || "",

        // Optional: mark active by default
        status: "active",
      } as any);

      Alert.alert("Saved", "Medication added to your list.", [
        { text: "OK", onPress: goToMedsList },
      ]);
    } catch (e: any) {
      console.log("Medication OCR review save error:", e);
      Alert.alert(
        "Save failed",
        e?.message ?? "Could not save medication. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer
      showHeader={true}
      title="Review Medication"
      headerCanGoBack={true}
      scroll={true}
      contentStyle={{ paddingTop: 0 }}
    >
      <Card style={styles.card}>
        <Text style={styles.kicker}>Confirm details</Text>

        <Input label="Name" value={name} onChangeText={setName} />
        <Input label="Dosage" value={dosage} onChangeText={setDosage} />
        <Input label="Frequency / Directions" value={frequency} onChangeText={setFrequency} />

        <Input
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />

        <View style={{ height: theme.spacing.lg }} />
        <Text style={styles.sectionTitle}>Label details (optional)</Text>

        <Input label="Pharmacy" value={pharmacyName} onChangeText={setPharmacyName} />
        <Input label="Pharmacy phone" value={pharmacyPhone} onChangeText={setPharmacyPhone} />
        <Input label="Rx number" value={rxNumber} onChangeText={setRxNumber} />
        <Input label="NDC" value={ndc} onChangeText={setNdc} />

        <View style={{ height: theme.spacing.sm }} />
        <Input label="Fill date" value={fillDate} onChangeText={setFillDate} />
        <Input label="Quantity" value={quantity} onChangeText={setQuantity} />
        <Input label="Refills" value={refills} onChangeText={setRefills} />

        <View style={{ height: theme.spacing.sm }} />
        <Input label="Prescriber" value={prescriber} onChangeText={setPrescriber} />
        <Input label="Patient name" value={patientName} onChangeText={setPatientName} />

        <View style={{ height: theme.spacing.md }} />

        <Button
          label={saving ? "Saving…" : "Save medication"}
          onPress={onSave}
          disabled={saving}
          style={styles.btnBrand}
        />

        <View style={{ height: theme.spacing.sm }} />

        <Button label="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: theme.spacing.sm,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  btnBrand: {
    backgroundColor: theme.colors.brand,
  },
});
