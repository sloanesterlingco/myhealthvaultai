// src/features/providers/components/CodePicker.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { searchIcd10, searchCpt, CodeResult } from "../services/codeLookupService";
import { theme } from "../../../theme";

type CodeSystem = "icd10" | "cpt";

interface CodePickerProps {
  system: CodeSystem;
  label: string;
  valueCode?: string;
  valueDisplay?: string;
  onChange: (result: CodeResult) => void;
}

export const CodePicker: React.FC<CodePickerProps> = ({
  system,
  label,
  valueCode,
  valueDisplay,
  onChange,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CodeResult[]>([]);
  const [touched, setTouched] = useState(false);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    const res =
      system === "icd10" ? await searchIcd10(text) : await searchCpt(text);
    setResults(res);
  };

  const currentLabel =
    valueCode && valueDisplay ? `${valueCode} • ${valueDisplay}` : "None selected";

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.currentBadge}>
        <Text style={styles.currentText}>{currentLabel}</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder={
          system === "icd10"
            ? "Search ICD-10 code or diagnosis"
            : "Search CPT code or procedure"
        }
        placeholderTextColor={theme.colors.placeholder}
        value={query}
        onChangeText={handleSearch}
        onBlur={() => setTouched(true)}
      />

      {touched && query.length > 0 && results.length === 0 && (
        <Text style={styles.helper}>No codes found. Try different words.</Text>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => `${item.system}:${item.code}`}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              onChange(item);
              setResults([]);
              setQuery("");
            }}
          >
            <Text style={styles.itemCode}>{item.code}</Text>
            <Text style={styles.itemDesc}>{item.display}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: theme.spacing.md },
  label: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  currentBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  currentText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  helper: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  list: {
    marginTop: 8,
    maxHeight: 200,
  },
  item: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemCode: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  itemDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
});
