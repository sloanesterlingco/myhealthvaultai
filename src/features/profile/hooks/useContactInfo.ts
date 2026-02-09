import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { patientService } from "../../../services/patientService";
import { useLoading } from "../../../hooks/useLoading";
import { useToast } from "../../../hooks/useToast";

export type ContactInfo = {
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

const emptyInfo: ContactInfo = {
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
};

export function useContactInfo() {
  const [info, setInfo] = useState<ContactInfo>(emptyInfo);
  const { showLoading, hideLoading } = useLoading();
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      showLoading();
      const profile = await patientService.getPatientProfile();
      if (profile) {
        setInfo({
          phone: profile.phone ?? "",
          address: profile.address ?? "",
          city: profile.city ?? "",
          state: profile.state ?? "",
          zip: profile.zip ?? "",
        });
      }
    } catch (e) {
      console.log("Contact info load error:", e);
      showError("Failed to load contact info.");
    } finally {
      hideLoading();
    }
  };

  const setField = (key: keyof ContactInfo, value: string) => {
    setInfo((prev) => ({ ...prev, [key]: value }));
  };

  const saveContactInfo = async () => {
    try {
      showLoading();
      await patientService.updatePatientProfile({
        phone: info.phone,
        address: info.address,
        city: info.city,
        state: info.state,
        zip: info.zip,
      });
      showSuccess("Contact information saved.");
    } catch (e) {
      console.log("Save contact info error:", e);
      Alert.alert("Error", "Could not save contact information.");
    } finally {
      hideLoading();
    }
  };

  return {
    info,
    setField,
    saveContactInfo,
  };
}
