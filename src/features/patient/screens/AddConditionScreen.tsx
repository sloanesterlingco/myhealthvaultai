import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { theme } from "../../../theme";

import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";

import {
  searchIcd10Cms,
  CodeResult,
} from "../../providers/services/codeLookupCmsService";

type ConditionForm = {
  term: string;
  selectedCode?: CodeResult | null;
};

export default function AddConditionScreen() {
  const [form, setForm] = useState<ConditionForm>({ term: "" });
  const [results, setResults] = useState<CodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const onChangeTerm = (text: string) => {
    setForm((prev) => ({ ...prev, term: text, selectedCode: undefined }));
    setSearchError(null);
  };

  const onSearch = useCallback(async () => {
    const q = form.term.trim();
    if (!q) return;

    try {
      setLoading(true);
      setSearchError(null);
      const codes = await searchIcd10Cms(q);
      setResults(codes);
    } catch (e: any) {
      console.log("ICD-10 search error:", e);
      setSearchError("Could not search codes. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [form.term]);

  const onSelectCode = (code: CodeResult) => {
    setForm((prev) => ({ ...prev, selectedCode: code }));
  };

  const onSave = () => {
    // TODO: wire this into your EMR / patientAggregationService.addCondition
    // For now this keeps the screen compiling and gives you a clean spot to hook in.
    console.log("Saving condition:", form);
  };

  const canSave =
    !!form.term.trim() && !!form.selectedCode && !loading;

  return (
    <ScreenContainer
      scroll={false}
      showHeader
      title="Add condition"
      headerCanGoBack
      contentStyle={styles.content}
    >
      <View style={styles.section}>
        <Text style={styles.label}>Condition</Text>
        <Input
          value={form.term}
          onChangeText={onChangeTerm}
          placeholder="e.g. Hypertension"
          autoCapitalize="none"
          autoCorrect
        />
      </View>

      <View style={styles.section}>
        <Button
          label={loading ? "Searching..." : "Search ICD-10 codes"}
          onPress={onSearch}
          loading={loading}
        />

        {searchError ? (
          <Text style={styles.errorText}>{searchError}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Matches</Text>

        <FlatList
          data={results}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const selected = form.selectedCode?.code === item.code;
            return (
              <TouchableOpacity
                style={[
                  styles.resultRow,
                  selected && styles.resultRowSelected,
                ]}
                onPress={() => onSelectCode(item)}
              >
                <Text style={styles.resultCode}>{item.code}</Text>
                <Text style={styles.resultText}>{item.display}</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            !loading && !searchError ? (
              <Text style={styles.emptyText}>
                Type a condition name and tap search to see ICD-10 matches.
              </Text>
            ) : null
          }
        />
      </View>

      <View style={styles.footer}>
        <Button
          label="Save condition"
          onPress={onSave}
          disabled={!canSave}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  errorText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.danger,
    fontSize: 12,
  },
  resultRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.card,
    marginBottom: 8,
  },
  resultRowSelected: {
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.brandTint,
  },
  resultCode: {
    fontWeight: "600",
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: 2,
  },
  resultText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  emptyText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  footer: {
    marginTop: "auto",
    paddingVertical: theme.spacing.md,
  },
});
