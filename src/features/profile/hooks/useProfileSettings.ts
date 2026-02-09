import { useState } from "react";
import { Alert } from "react-native";

export const useProfileSettings = () => {
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    emailUpdates: true,
    smsAlerts: false,
    darkMode: false,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveSettings = () => {
    Alert.alert("Saved", "Your profile settings have been updated.");
    return true;
  };

  const resetSettings = () => {
    setSettings({
      notificationsEnabled: true,
      emailUpdates: true,
      smsAlerts: false,
      darkMode: false,
    });
    Alert.alert("Reset", "Settings restored to default.");
  };

  return { settings, toggleSetting, saveSettings, resetSettings };
};
