// src/features/profile/screens/EmergencyContactsScreen.tsx
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from "react-native";

import { ScreenContainer } from "../../../ui/ScreenContainer";
import { Input } from "../../../ui/Input";
import { Button } from "../../../ui/Button";
import { Card } from "../../../ui/Card";
import { theme } from "../../../theme";

import { usePatientProfile } from "../hooks/usePatientProfile";

export default function EmergencyContactsScreen() {
  const { profile, addEmergencyContact, deleteEmergencyContact, save } = usePatientProfile();

  const [newContact, setNewContact] = useState({
    name: "",
    phone: "",
    relationship: "",
  });

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Emergency Contacts</Text>

        <Card>
          {profile.emergencyContacts.length === 0 ? (
            <Text style={styles.empty}>No contacts added yet.</Text>
          ) : (
            profile.emergencyContacts.map((c, i) => (
              <View key={i} style={styles.contactItem}>
                <Text style={styles.name}>{c.name}</Text>
                <Text style={styles.value}>{c.phone}</Text>
                <Text style={styles.value}>{c.relationship}</Text>

                <TouchableOpacity onPress={() => deleteEmergencyContact(i)}>
                  <Text style={styles.delete}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </Card>

        <Text style={styles.subtitle}>Add New Contact</Text>

        <Card>
          <Input
            label="Name"
            value={newContact.name}
            onChangeText={(t) => setNewContact({ ...newContact, name: t })}
          />

          <Input
            label="Phone"
            value={newContact.phone}
            keyboardType="phone-pad"
            onChangeText={(t) => setNewContact({ ...newContact, phone: t })}
          />

          <Input
            label="Relationship"
            value={newContact.relationship}
            onChangeText={(t) => setNewContact({ ...newContact, relationship: t })}
          />

          <Button
            label="Add Contact"
            onPress={() => {
              addEmergencyContact(newContact);
              save();
              setNewContact({ name: "", phone: "", relationship: "" });
            }}
          />
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  title: { fontSize: 26, fontWeight: "700", marginBottom: theme.spacing.lg },
  subtitle: { fontSize: 20, fontWeight: "600", marginTop: theme.spacing.lg },
  empty: { color: theme.colors.textSecondary },
  contactItem: { marginBottom: theme.spacing.md },
  name: { fontSize: 16, fontWeight: "700" },
  value: { color: theme.colors.textSecondary },
  delete: { color: theme.colors.danger, marginTop: 4 },
});
