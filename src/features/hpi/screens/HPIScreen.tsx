// src/features/hpi/screens/HPIScreen.tsx

import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useHPI } from "../hooks/useHPI";
import { useAIAdaptiveSections } from "../hooks/useAIAdaptiveSections";

// Selectors (all default exports)
import ChiefComplaintInput from "../components/ChiefComplaintInput";
import OnsetSelector from "../components/OnsetSelector";
import DurationSelector from "../components/DurationSelector";
import ProgressionSelector from "../components/ProgressionSelector";
import SymptomSelector from "../components/SymptomSelector";
import SeveritySelector from "../components/SeveritySelector";
import ImpactSelector from "../components/ImpactSelector";
import TreatmentsTriedSelector from "../components/TreatmentsTriedSelector";

export default function HPIScreen() {
  const { hpi, updateField } = useHPI();
  const sections = useAIAdaptiveSections(hpi);


  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* Chief Complaint */}
      {sections.includes("chiefComplaint") && (
        <View style={styles.section}>
          <ChiefComplaintInput
            value={hpi.chiefComplaint}
            onChange={(v) => updateField("chiefComplaint", v)}
          />
        </View>
      )}

      {/* Onset */}
      {sections.includes("onset") && (
        <View style={styles.section}>
          <OnsetSelector
            value={hpi.onset}
            onChange={(v) => updateField("onset", v)}
          />
        </View>
      )}

      {/* Duration */}
      {sections.includes("duration") && (
        <View style={styles.section}>
          <DurationSelector
            value={hpi.duration}
            onChange={(v) => updateField("duration", v)}
          />
        </View>
      )}

      {/* Progression */}
      {sections.includes("progression") && (
        <View style={styles.section}>
          <ProgressionSelector
            value={hpi.progression}
            onChange={(v) => updateField("progression", v)}
          />
        </View>
      )}

      {/* Associated Symptoms */}
      {sections.includes("associatedSymptoms") && (
        <View style={styles.section}>
          <SymptomSelector
            value={hpi.associatedSymptoms}
            onChange={(v) => updateField("associatedSymptoms", v)}
          />
        </View>
      )}

      {/* Severity */}
      {sections.includes("severity") && (
        <View style={styles.section}>
          <SeveritySelector
            value={hpi.severity}
            onChange={(v) => updateField("severity", v)}
          />
        </View>
      )}

      {/* Impact on Life */}
      {sections.includes("impactOnLife") && (
        <View style={styles.section}>
          <ImpactSelector
            value={hpi.impactOnLife}
            onChange={(v) => updateField("impactOnLife", v)}
          />
        </View>
      )}

      {/* Treatments Tried */}
      {sections.includes("treatmentsTried") && (
        <View style={styles.section}>
          <TreatmentsTriedSelector
            value={hpi.treatmentsTried}
            onChange={(v) => updateField("treatmentsTried", v)}
          />
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
});
