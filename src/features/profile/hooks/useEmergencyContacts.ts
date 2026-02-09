import { useState } from "react";
import { Alert } from "react-native";

export const useEmergencyContacts = () => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [newContact, setNewContact] = useState({
    name: "",
    phone: "",
    relationship: "",
  });

  const setField = (key: string, value: string) => {
    setNewContact((prev) => ({ ...prev, [key]: value }));
  };

  const addContact = () => {
    if (!newContact.name || !newContact.phone) {
      Alert.alert("Missing fields", "Name and phone are required.");
      return;
    }

    setContacts((prev) => [...prev, newContact]);
    setNewContact({ name: "", phone: "", relationship: "" });
  };

  const deleteContact = (index: number) => {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  };

  return {
    contacts,
    newContact,
    setField,
    addContact,
    deleteContact,
  };
};
